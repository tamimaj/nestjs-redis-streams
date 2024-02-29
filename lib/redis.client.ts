import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices';
import { Injectable, Logger } from '@nestjs/common';
import { CONNECT_EVENT, ERROR_EVENT } from '@nestjs/microservices/constants';
import { ClientConstructorOptions, RedisInstance } from './interfaces';
import { createRedisConnection } from './redis.utils';
import { RequestsMap } from './requests-map';
import { deserialize, generateCorrelationId, serialize } from './streams.utils';
import { RedisStreamContext } from './stream.context';
import { firstValueFrom, share } from 'rxjs';

@Injectable()
export class RedisStreamClient extends ClientProxy {
  protected readonly logger = new Logger(RedisStreamClient.name);

  private redis: RedisInstance; // server instance for listening on response streams.

  private client: RedisInstance; // client instance for publishing streams.

  protected connection: Promise<any>; // client connection logic is required by framework.

  private streamsToListenOn: string[] = []; // response streams to listen on.

  private requestsMap: RequestsMap<string, any>; // hold the correlationIds and the observers.
  // To forward the response to the correct observer.

  constructor(private readonly options: ClientConstructorOptions) {
    super();
    this.requestsMap = new RequestsMap();
    this.streamsToListenOn = this.options?.responseStreams ?? [];
    this.connectServerInstance();
  }

  public async connectServerInstance() {
    try {
      this.redis = createRedisConnection(this.options?.connection);
      this.handleError(this.redis);

      // when server instance connect, bind handlers.
      this.redis.on(CONNECT_EVENT, () => {
        this.logger.log(
          'Redis Client Responses Listener connected successfully on ' +
            (this.options.connection?.url ??
              this.options.connection.host +
                ':' +
                this.options.connection.port),
        );

        this.initListener();
      });
    } catch (error) {
      this.logger.error('Could not initialize the listener instance.');
      this.logger.error(error);
      this.close();
    }
  }

  /**
   * @description
   * the framework will call this whenever needs to send or emit a message,
   * if an instance is found should be returned otherwise a new one should be created,
   * the server instance should be already connected, before this connect happens.
   */
  public async connect(): Promise<any> {
    // framework logic, if we have connection client instances, return it.
    if (this.client) {
      return this.connection;
    }

    this.client = createRedisConnection(this.options?.connection);
    this.connection = await firstValueFrom(
      this.connect$(this.client, ERROR_EVENT, CONNECT_EVENT).pipe(share()),
    );
    this.handleError(this.client);
    return this.connection;
  }

  /**
        partialPacket {pattern: 'client-streams-test', data: {
        data: { name: 'tamim' }, // inner, will be JSON.stringify.
        correlationId: '1234', // override the correlationId, if you want to use your own. Default is uuid.
        anyOtherHeadersKey: 'anyOtherHeadersValue' // any other headers you want to add to the stream.
        }
    */
  private getOrGenerateCorrelationId(partialPacket: ReadPacket): {
    correlationId: string;
    fromPacket: boolean;
  } {
    const payload = partialPacket.data; // outer data object nest convention.

    if (payload?.correlationId) {
      return {
        correlationId: payload.correlationId,
        fromPacket: true, // easier to know if the correlationId is from the packet or generated.
      };
    }

    return {
      correlationId: generateCorrelationId(),
      fromPacket: false,
    };
  }

  public async handleXadd(stream: string, serializedPayloadArray: any[]) {
    try {
      let response = await this.client.xadd(
        stream,
        '*',
        ...serializedPayloadArray,
      );
      return response;
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async publishStream(partialPacket: ReadPacket) {
    try {
      const stream = partialPacket.pattern;

      // placeholder outgoing context.
      let ctx = new RedisStreamContext([
        stream, // stream
        null, // messageId
        null, // consumer group
        null, // consumer
      ]);

      const payload = partialPacket.data; // will have {data, correlationId, anyOtherHeadersKey}

      // the headers are all keys except data key.
      const headers = {
        ...payload,
      };
      delete headers?.data;

      // default serializer will call getMessageHeaders().
      ctx.setMessageHeaders(headers);

      // 3. Serialize the payload. or use user defined serializer.
      let serializedEntries: string[];

      // if custom serializer is provided.
      if (typeof this.options?.serialization?.serializer === 'function') {
        serializedEntries = await this.options.serialization.serializer(
          payload,
          ctx,
        );
      } else {
        serializedEntries = await serialize(payload, ctx);
      }

      // handle xadd.
      let response = await this.handleXadd(stream, serializedEntries);
      return response;
    } catch (error) {
      this.logger.error(error);
    }
  }

  // framework method, will be called on emit from user-land, without waiting for response.
  protected dispatchEvent<T = any>(
    partialPacket: ReadPacket<any>,
  ): Promise<any> {
    const { correlationId, fromPacket } =
      this.getOrGenerateCorrelationId(partialPacket);
    if (!fromPacket) {
      partialPacket.data.correlationId = correlationId;
    }
    return new Promise(() => this.publishStream(partialPacket));
  }

  // framework method, will be called on send from user-land, and user will get a observable to subscribe to.
  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => void,
  ): any {
    try {
      const { correlationId, fromPacket } =
        this.getOrGenerateCorrelationId(partialPacket);

      // if the correlationId is not from the packet, add it to the packet, later the serializer will extract it.
      if (!fromPacket) {
        partialPacket.data.correlationId = correlationId;
      }

      this.requestsMap.addEntry(correlationId, callback);

      this.publishStream(partialPacket);
    } catch (error) {
      this.logger.error(error);
    }
  }

  // listener logic.

  private async initListener() {
    try {
      if (this.streamsToListenOn.length === 0) {
        this.logger.warn('No response streams to listen on.');
        return;
      } else {
        // create consumer group if not exist.
        await Promise.all(
          this.streamsToListenOn.map(async (stream) => {
            await this.createConsumerGroup(
              stream,
              this.options.streams.consumerGroup,
            );
          }),
        );

        // // start listening.
        this.listenOnStreams();
      }
    } catch (error) {
      this.logger.error(
        'Error while initializing the Redis Streams Listener from the client.',
        error,
      );
    }
  }

  private async createConsumerGroup(stream: string, consumerGroup: string) {
    try {
      await this.redis.xgroup('CREATE', stream, consumerGroup, '$', 'MKSTREAM');

      return true;
    } catch (error) {
      // if group exist for this stream. log debug.
      if (error?.message.includes('BUSYGROUP')) {
        this.logger.debug(
          'Consumer Group "' +
            consumerGroup +
            '" already exists for stream: ' +
            stream,
        );
        return true;
      } else {
        this.logger.error(error);
        return false;
      }
    }
  }

  private async listenOnStreams() {
    try {
      let results: any[];

      results = await this.redis.xreadgroup(
        'GROUP',
        this.options?.streams?.consumerGroup || undefined,
        this.options?.streams?.consumer || undefined, // need to make it throw an error.
        'BLOCK',
        this.options?.streams?.block || 0,
        'STREAMS',
        ...this.streamsToListenOn,
        ...this.streamsToListenOn.map(() => '>'),
      );

      // if BLOCK time ended, and results are null, listen again.
      if (!results) return this.listenOnStreams();

      for (let result of results) {
        let [stream, messages] = result;
        await this.notifyHandlers(stream, messages);
      }

      return this.listenOnStreams();
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async notifyHandlers(stream: string, messages: any[]) {
    try {
      await Promise.all(
        messages.map(async (message) => {
          // for each message, deserialize and get the handler.

          let ctx = new RedisStreamContext([
            stream,
            message[0], // message id needed for ACK.
            this.options?.streams?.consumerGroup,
            this.options?.streams?.consumer,
          ]);

          let parsedPayload: any;

          // if custom deserializer is provided.
          if (typeof this.options?.serialization?.deserializer === 'function') {
            parsedPayload = await this.options.serialization.deserializer(
              message,
              ctx,
            );
          } else {
            parsedPayload = await deserialize(message, ctx);
          }

          const { correlationId } = ctx.getMessageHeaders();

          // if no correlationId, could be that this message was not meant for this service.
          // just ack it.
          if (!correlationId) {
            await this.handleAck(ctx);
            return;
          } else {
            await this.deliverToHandler(correlationId, parsedPayload, ctx);
          }
        }),
      );
    } catch (error) {
      this.logger.error(error);
    }
  }

  // after message
  private async deliverToHandler(
    correlationId,
    parsedPayload,
    ctx: RedisStreamContext,
  ) {
    try {
      // get the callback from the map.
      const callback: (packet: WritePacket) => void =
        this.requestsMap.getEntry(correlationId);

      // if no callback, could be that the message was not meant for this service,
      // or the message was fired by this service using the emit method, and not the send method, to fire
      // and forget. so no callback was provided.
      if (!callback) {
        await this.handleAck(ctx);

        this.logger.debug(
          'No callback found for a message with correlationId: ' +
            correlationId,
        );
        return;
      }

      // 2. check if the parsed payload has error key. return an error callback.
      if (parsedPayload?.error) {
        callback({
          err: parsedPayload.error,
          response: null,
          isDisposed: true,
          status: 'error',
        });
      } else {
        // 3. if no error, return a success callback.
        callback({
          err: null,
          response: parsedPayload,
          isDisposed: true,
          status: 'success',
        });
      }

      await this.handleAck(ctx);

      // remove the entry from the requests map.
      this.requestsMap.removeEntry(correlationId);
    } catch (error) {
      this.logger.error(
        'Error while delivering the message to the handler.',
        error,
      );
    }
  }

  private async handleAck(inboundContext: RedisStreamContext) {
    try {
      await this.client.xack(
        inboundContext.getStream(),
        inboundContext.getConsumerGroup(),
        inboundContext.getMessageId(),
      );

      return true;
    } catch (error) {
      this.logger.error(error);
      return false;
    }
  }

  public async close(): Promise<void> {
    this.redis && this.redis.disconnect(); // listener instance.
    this.client && this.client.disconnect(); // publisher instance.

    this.client = null;
    this.redis = null;
    this.connection = null;
  }

  public handleError(stream: any) {
    stream.on(ERROR_EVENT, (err: any) => {
      this.logger.error('Redis Streams Client ' + err);
      this.close();
    });
  }
}

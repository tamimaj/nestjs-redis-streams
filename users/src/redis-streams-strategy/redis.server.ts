import { Server, CustomTransportStrategy } from '@nestjs/microservices';
import {
  ConstructorOptions,
  RedisInstance,
  RedisStreamPattern,
  StreamResponse,
  StreamResponseObject,
} from './interfaces';

import { createRedisConnection } from './redis.utils';
import { CONNECT_EVENT, ERROR_EVENT } from '@nestjs/microservices/constants';
import { deserialize, serialize } from './streams.utils';
import { RedisStreamContext } from './stream.context';
import { interval, Observable } from 'rxjs';

export class RedisServer extends Server implements CustomTransportStrategy {
  // a list of streams the redis listner will be listening on.
  private streamsList = [];

  private streamLastReadIdMap = {};

  private streamHandlerMap = {};

  private redis: RedisInstance;

  private client: RedisInstance;

  constructor(private readonly options: ConstructorOptions) {
    super();
  }

  /**
   * listen() is required by `CustomTransportStrategy` It's called by the
   * framework when the transporter is instantiated, and kicks off a lot of
   * the machinery.
   */
  public listen(callback: () => void) {
    console.log('REDIS STREAMS STRATEGY STARTED LISTENING...');

    // initilize redis connection.
    this.redis = createRedisConnection(this.options?.connection);

    this.client = createRedisConnection(this.options?.connection);

    // collect handlers from code, and register streams.
    this.redis.on(CONNECT_EVENT, () => {
      console.log('REDIS CONNECTED');
      // call bind handlers here.
      // to ensure creating consumer groups happens
      // after a redis connection is established.

      this.bindHandlers();
    });
  }

  public async bindHandlers() {
    // await all the patterns of the handleres to be filtered and registered
    // before spinning up the server listner.
    await Promise.all(
      Array.from(this.messageHandlers.keys()).map(async (pattern: string) => {
        let response = await this.registerStream(pattern);
        // console.log(response);
      }),
    );

    this.listenOnStreams();
    this.addTestEntries();
  }

  /// TEST FOR ADDING ENTRIES
  private async streamSingleEntry(): Promise<void> {
    const ranNum = Math.round(Math.random() * 5000).toString();

    let fakeUserObj = {
      id: ranNum.toString(),
      firstName: 'Tamim',
      lastName: 'Abbas',
    };

    let response = await this.redis.xadd(
      'users:create',
      '*',
      'correlationId',
      '12345687987',
      'authToken',
      'asiwi2i2i2i2i2i',
      'data',
      JSON.stringify(fakeUserObj),
    );
    console.log('xAdd response: ', response);
  }
  /// TEST FOR ADDING ENTRIES
  private async addTestEntries() {
    try {
      setInterval(this.streamSingleEntry.bind(this), 10000);
    } catch (error) {
      console.log(error);
    }
  }

  private async registerStream(pattern: string) {
    try {
      // check if the passed pattern is stringified object, and parse it. to check
      // isRedisStreamHandler property.
      let parsedPattern: RedisStreamPattern = JSON.parse(pattern);

      // if is not marked with isRedisStreamHandler to true, dont register it.
      if (!parsedPattern.isRedisStreamHandler) return false;

      // register stream locally.
      let { stream } = parsedPattern;

      // for streams array
      this.streamsList.push(stream);

      // for stream lastId Map
      this.streamLastReadIdMap[stream] = '$';

      // for stream handler map.
      this.streamHandlerMap[stream] = this.messageHandlers.get(pattern);

      // if using Xread, retun here dont create consumer group.
      if (this.options?.streams?.useXread) return true;

      // if using XreadGroup, create consumer group here.
      let consumerGroupCreated = await this.createConsumerGroup(
        stream,
        this.options?.streams?.consumerGroup,
      );

      if (!consumerGroupCreated) return false;

      return true;
    } catch (error) {
      return false;
    }
  }

  // create consumer group for each stream, if it does not exist.
  private async createConsumerGroup(stream: string, consumerGroup: string) {
    try {
      let response = await this.redis.xgroup(
        'CREATE',
        stream,
        consumerGroup,
        '$',
        'MKSTREAM',
      );

      console.log(response);

      return true;
    } catch (error) {
      // if group exist for this stream. pass it.
      if (error?.message.includes('BUSYGROUP')) {
        console.log(
          'group',
          consumerGroup,
          'already existent for stream: ',
          stream,
        );
        return true;
      } else {
        this.logger.error(error);
        return false;
      }
    }
  }

  private async publishResponses(
    responses: StreamResponseObject[],
    inboundContext: RedisStreamContext,
  ) {
    try {
      console.log(responses, inboundContext);
      await Promise.all(
        responses.map(async (responseObj: StreamResponseObject) => {
          let serializedEntries: string[];

          // if custom serializer is provided.
          if (typeof this.options?.serialization?.serializer === 'function') {
            serializedEntries = await this.options.serialization.serializer(
              responseObj?.payload,
              inboundContext,
            );
          } else {
            serializedEntries = await serialize(
              responseObj?.payload,
              inboundContext,
            );
          }

          let addStreamResponse = await this.client.xadd(
            responseObj.stream,
            '*',
            ...serializedEntries,
          );
        }),
      );
      // at this point all streams must be published.
      return true;
    } catch (error) {
      console.log('Error from publish', error);
      return false;
    }
  }

  private async handleAck(inboundContext: RedisStreamContext) {
    try {
      // use the inbound context to Xack.
      let response = await this.client.xack(
        inboundContext.getStream(),
        inboundContext.getConsumerGroup(),
        inboundContext.getMessageId(),
      );

      console.log('RESPONSE FROM XACK: ', response);

      return true;
    } catch (error) {
      console.log('Error from handle Ack', error);
      return false;
    }
  }

  private async handleRespondBack({
    response,
    inboundContext,
    isDisposed,
  }: {
    response: StreamResponse;
    inboundContext: RedisStreamContext;
    isDisposed: boolean;
  }) {
    try {
      // if null or undefined, do not ACK, neither publish anything.
      if (!response) return;

      // if response is empty array then, only ACK.
      if (Array.isArray(response) && response.length === 0) {
        // only ACK here.
        console.log('Will ACK only');
        await this.handleAck(inboundContext);
        return;
      }

      if (Array.isArray(response) && response.length >= 1) {
        // will loop and publish all payloads,
        // then will ACK

        console.log('Will publish payloads, then ACK here.');
        let publishedResponses = await this.publishResponses(
          response,
          inboundContext,
        );

        if (!publishedResponses) {
          throw new Error('Could not Xadd response streams.');
        }

        await this.handleAck(inboundContext);
      }
    } catch (error) {
      console.log('Error from respond back function: ', error);
    }
  }

  private async notifyHandlers(stream: string, messages: any[]) {
    try {
      const handler = this.streamHandlerMap[stream];

      await Promise.all(
        messages.map(async (message) => {
          // create context
          let ctx = new RedisStreamContext([
            stream,
            message[0], // message id needed for ACK.
            this.options?.streams?.consumerGroup,
            this.options?.streams?.consumer,
          ]);

          let parsedPayload: any;

          // if custom desrializer is provided.
          if (typeof this.options?.serialization?.deserializer === 'function') {
            parsedPayload = await this.options.serialization.deserializer(
              message,
              ctx,
            );
          } else {
            parsedPayload = await deserialize(message, ctx);
          }

          // the staging function, should attach the inbound context to keep track of
          //  the message id for ACK, group name, stream name, etc.
          const stageRespondBack = (responseObj: any) => {
            // 1- will receive the nestJs response obj => {response, isDisposed}
            // 2- attach the inbound context on the responseObj "ctx".
            // 3- call the main respond back responsible function.
            responseObj.inboundContext = ctx;
            this.handleRespondBack(responseObj);
          };

          const response$ = this.transformToObservable(
            await handler(parsedPayload, ctx),
          ) as Observable<any>;

          response$ && this.send(response$, stageRespondBack);

          // await handler(payload, ctx);
        }),
      );
    } catch (error) {
      console.log('Error from notifying handlers.', error);
    }
  }

  private updateStreamLastReadId(stream: string, messages: any[]) {
    this.streamLastReadIdMap[stream] = messages[messages.length - 1][0];
  }

  private async listenOnStreams() {
    try {
      let results: any[];

      if (this.options?.streams?.useXread) {
        console.log('Started Xread Listning...');

        results = await this.redis.xread(
          'BLOCK',
          this.options?.streams?.block || 0,
          'STREAMS',
          ...(Object.keys(this.streamLastReadIdMap) as string[]),
          ...(Object.values(this.streamLastReadIdMap) as string[]),
        );
      } else {
        console.log('Started XreadGroup Listning...');

        results = await this.redis.xreadgroup(
          'GROUP',
          this.options?.streams?.consumerGroup || undefined,
          this.options?.streams?.consumer || undefined, // need to make it throw an error.
          'BLOCK',
          this.options?.streams?.block || 0,
          'STREAMS',
          ...this.streamsList,
          ...this.streamsList.map((stream) => '>'),
          // '>', // this needed for xreadgroup
        );
      }

      console.log('Results ', results);

      // if BLOCK finished and results are null
      if (!results) return this.listenOnStreams();

      const [key, messages] = results[0];

      await this.notifyHandlers(key, messages);

      // if using Xread, need to update the last Id map.
      if (this.options?.streams?.useXread) {
        this.updateStreamLastReadId(key, messages);
        console.log('Updated the streams.', this.streamLastReadIdMap);
      }

      return this.listenOnStreams();
    } catch (error) {
      this.logger.error(error);
    }
  }

  public close() {
    this.redis && this.redis.quit();
  }
}

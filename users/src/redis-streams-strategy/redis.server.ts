import { Server, CustomTransportStrategy } from '@nestjs/microservices';
import {
  ConstructorOptions,
  RedisInstance,
  RedisStreamPattern,
} from './interfaces';

import { createRedisConnection } from './redis.utils';
import { CONNECT_EVENT, ERROR_EVENT } from '@nestjs/microservices/constants';
import { deserialize } from './streams.utils';
import { RedisStreamContext } from './stream.context';

export class RedisServer extends Server implements CustomTransportStrategy {
  // a list of streams the redis listner will be listening on.
  private streamsList = [];

  private streamLastReadIdMap = {};

  private streamHandlerMap = {};

  private redis: RedisInstance;

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
      'user',
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

  private async notifyHandlers(stream: string, messages: any[]) {
    try {
      const handler = this.streamHandlerMap[stream];

      await Promise.all(
        messages.map(async (message) => {
          let response = await deserialize(message);
          // create context
          let ctx = new RedisStreamContext([
            stream,
            message,
            this.options?.streams?.consumerGroup,
            this.options?.streams?.consumer,
            this.options?.streams?.useXread ? 'Xread' : 'XreadGroup', // the command used to read
          ]);

          await handler(response, ctx);
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

import { Server, CustomTransportStrategy } from '@nestjs/microservices';
import {
  ConstructorOptions,
  RedisInstance,
  RedisStreamPattern,
} from './interfaces';

import { createRedisConnection } from './redis.utils';
import { CONNECT_EVENT, ERROR_EVENT } from '@nestjs/microservices/constants';

export class RedisServer extends Server implements CustomTransportStrategy {
  // a list of streams the redis listner will be listening on.
  private streamsList = [];

  private streamsLastReadIdMap = {};

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

    // at the end of the loop, after registering the all the redis patterns.
    console.log('STREAM LIST', this.streamsList);
    console.log('STREAM Last ID MAP', this.streamsLastReadIdMap);
    console.log('Simulating: The server now can start listening.');

    this.listenOnStreams();
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

      this.streamsList.push(stream);

      this.streamsLastReadIdMap[stream] = '$';

      // create consumer group here. if it does not exist for the stream.
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
        console.log('CREATING CONSUMER GROUP ERROR:', error);
        return false;
      }
    }
  }

  private async listenOnStreams() {
    // read the streams from the list
    // use the optional block if exist else.
    // have a function that handle the BLOCK replace if the it doesnt exit from options.
    // have a function that create a CONSUMER GROUP IF IT DOES NOT EXIT
    // start recursive listner.
    try {
      console.log('Started XreadGroup Listning...');
      const results = await this.redis.xreadgroup(
        'GROUP',
        this.options?.streams?.consumerGroup,
        this.options?.streams?.consumer,
        'BLOCK',
        this.options?.streams?.block || 0,
        'STREAMS',
        ...this.streamsList,
        ...this.streamsList.map((stream) => '>'),
        // '>', // this needed for xreadgroup
      );

      console.log(results);
    } catch (error) {
      console.log('ERROR from listener', error);
    }
  }

  public close() {
    this.redis && this.redis.quit();
    console.log('REDIS STRATEGY CLOSED');
  }
}

import {
  Server,
  CustomTransportStrategy,
  ReadPacket,
} from '@nestjs/microservices';
import { RedisStreamPattern } from './interfaces';

export class RedisServer extends Server implements CustomTransportStrategy {
  // a list of streams the redis listner will be listening on.
  private streamsList = [];

  private streamsLastReadIdMap = {};

  constructor(private readonly options: any) {
    super();

    console.log(options);
    // super class establishes the serializer and deserializer; sets up
    // defaults unless overridden via `options`
    // this.initializeSerializer(options);
    // this.initializeDeserializer(options);
  }

  /**
   * listen() is required by `CustomTransportStrategy` It's called by the
   * framework when the transporter is instantiated, and kicks off a lot of
   * the machinery.
   */
  public listen(callback: () => void) {
    console.log('REDIS STREAMS STRATEGY STARTED LISTENING...');
    this.bindHandlers();
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
  }

  private async registerStream(pattern: string) {
    try {
      // check if the passed pattern is stringified object, and parse it. to check
      // isRedisStreamHandler property.
      let parsedPattern: RedisStreamPattern = JSON.parse(pattern);

      // if is not marked with isRedisStreamHandler to true, dont register it.
      if (!parsedPattern.isRedisStreamHandler) return false;

      // register stream
      let { stream } = parsedPattern;

      this.streamsList.push(stream);

      this.streamsLastReadIdMap[stream] = '$';

      return true;
    } catch (error) {
      return false;
    }
  }

  public close() {
    console.log('REDIS STRATEGY CLOSED');
  }
}

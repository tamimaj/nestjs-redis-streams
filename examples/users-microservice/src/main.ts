import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  RedisStreamStrategy,
  RawStreamMessage,
  RedisStreamContext,
} from '@tamimaj/nestjs-redis-streams';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {
    strategy: new RedisStreamStrategy({
      connection: {
        url: '0.0.0.0:6379',
      },
      streams: {
        block: 5000,
        consumer: 'users-1',
        consumerGroup: 'users',
      },

      // serialization: {
      //   deserializer: async (
      //     rawMessage: RawStreamMessage,
      //     inboundContext: RedisStreamContext,
      //   ) => {
      //     console.log('Raw message from the custom deserializer: ', rawMessage);

      //     /**
      //      * Extract your data from the rawMessage coming from Redis Stream.
      //      * You can additionally, extract your headers from the rawMessage,
      //      * and add them to the inboundContext via inboundContext.setMessageHeaders(header).
      //      * Then you can access those headers in your serializer and attach them back,
      //      * to the response message that will be sent to Redis Stream. So your user-land handler,
      //      * is cleaner, and you can always inject the context in your handlers and access
      //      * those headers, or set them there too.
      //      *
      //      * return to user-land the parsed payload as you like.
      //      * what you will return here is the what you can access in the user-land
      //      * by injecting '@Payload'
      //      */

      //     return { id: 2, name: 'Tamim' };
      //   },

      //   serializer: async (
      //     payloadObj: any, // your returned payload object from user-land.
      //     inboundContext: RedisStreamContext,
      //   ) => {
      //     /**
      //      * The context is created when the inbound message arrived.
      //      * it contains the essential data like the messageId, consumer group name,
      //      * consumer name. We use those data for the automatic ACK.
      //      *
      //      * You can retrieve your headers from your context you set in the deserializer,
      //      * inboundContext.getMessageHeaders()
      //      *
      //      * Then you can attach them back to your response message and will be on Redis Streams again.
      //      */

      //     console.log('My response payload object: ', payloadObj);
      //     console.log('The inbound message context: ', inboundContext);

      //     // your serialization logic here....

      //     // Your must return an array of [key1, value1, key2, value2]
      //     return [
      //       'key1',
      //       'value 1',
      //       'key2',
      //       'value 2',
      //       'data',
      //       'Some Stringified data structure...',
      //     ];
      //   },
      // },
    }),
  });

  await app.listen();
}
bootstrap();

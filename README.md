# nestjs-redis-streams

<p align="center">
  <a href="http://nestjs.com/" target="blank">
    <img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" />
  </a>
</p>

<h3 align="center">
  Redis Streams Transport Strategy for <a href="http://nestjs.com/">NestJS</a> using <a href="https://github.com/luin/ioredis">ioredis</a> library.
</h3>

<br>
<br>

<h3 style="color:red; font-weight:bold" >NOTICE</h3>

The lib is ready to use in a NestJS Microservice as "subscriber". However, client side of the strategy is not implemented yet. You still can use any client module like
<a href="https://www.npmjs.com/package/@nestjs-modules/ioredis" >@nestjs-modules/ioredis</a> to XADD streams as "publisher".

<br>

## Features

- Coded in TypeScript.

- Easy way to listen on streams. PLug your handlers in your controllers, and your streams messages will land there. Under the hood uses XREADGROUP command from Redis.

- Automatic Consumer Group creation for your streams, on bootstrap before start listening.

- Easy way to respond back a stream (or multiple streams).

- Automatic XACK and inbound message id tracking. The lib allow you to respond back then Acknowledge, or just Acknowledge directly.

- Built-in Serialization and Deserialization.

- Custom plug-able Serialization and Deserialization.

<br>

## Installation

### with npm

```sh
npm install --save nestjs-redis-streams
```

### with yarn

```sh
yarn add nestjs-redis-streams
```

<br>

## How to use?

### In your main.ts. Initialize the custom strategy like this:

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RedisStreamStrategy } from 'nestjs-redis-streams';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {
    strategy: new RedisStreamStrategy({
      // optional. All ioredis options + url.
      connection: {
        url: '0.0.0.0:6379',
        // host: 'localhost',
        // port: 6379,
        // password: '123456',
        // etc...
      },
      // mandatory.
      streams: {
        block: 5000,
        consumer: 'users-1',
        consumerGroup: 'users',
      },
      // optional. See our example main.ts file for more details...
      // serialization: {},
    }),
  });

  await app.listen();
}
bootstrap();
```

<br>

### In one of your controllers where you want to handle the messages coming from a stream.

<p> Use our decorator @RedisStreamHandler("users-1") to tell the lib to register this handler and listen on that "users-1" stream and whenever it receive a message, this handler will be called with the data and a created message context.
</p>

```ts
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import {
  RedisStreamHandler,
  StreamResponse,
  RedisStreamContext,
} from 'nestjs-redis-streams';

export class UsersEventHandlers {
  @RedisStreamHandler('users:create') // stream name.
  async handleUserCreate(@Payload() data: any, @Ctx() ctx: RedisStreamContext) {
    console.log('Handler users:create called with payload: ', data);
    console.log('Headers: ', ctx.getMessageHeaders());

    return [
      {
        payload: {
          // optional headers to override or add new headers keys.
          // everything except data is considered headers for our serialization.
          correlationId: 'THE BEST CORRELATION ID EVER',
          extraKey: 'Whatever1234',

          // data is the only mandatory key. for our serializer/deserializer.
          data: { name: 'Tamim', lastName: 'Abbas' },
        },

        stream: 'user:created',
      },
    ] as StreamResponse;

    // return [] as StreamResponse;

    // return null;
  }
}
```

<br>

### What you return from your handler tells the lib what to do:

- If you don't return anything or return null: The lib will not publish any stream back, neither will Acknowledge the received stream message.

- If you return an empty array: The lib will only Acknowledge the received stream message.

- If you return an array of one or more payloads: The lib will publish those payloads as streams, then will Acknowledge the received stream message.

<br>

### How our default serialization/deserialization work?

<p> We have designed our serialization/deserialization logic to be useful for enterprise microservices architecture. We kept in mind the use-case of headers and metadata, for authentication tokens, or to uniquely trace a message from a logging service like Datadog. So, we have designed the message to be two parts. The headers part, and the data part.
</p>

<P> The headers part of the message is just key/value strings that stored without any serialization. That's is intended for better search for the ids in a logging service.
</P>

<P> The data part, is a single key "data", that has an object as a value where you can store whatever data you like. Similar to the body of a post request. This data value gets JSON stringified and stored in a stream message. And, when we receive a message our deserializer JSON parse it and forward it to the handler.
</P>

<br>

### Step-by-Step of the lib flow and our serialization/deserialization.

1. A message is received when listening.
2. A context is created, where the id of that inbound message is stored, consumer group, consumer, and stream name. We call it the inboundContext.
3. The raw message and the inbound context is forwarded to our deserializer or your custom deserializer.
4. Our deserializer take those keys/values, and consider everything as headers except the "data" key.
5. The deserializer stores all the headers in the inbound context by calling inboundContext.setMessageHeaders(headers);
6. Then the deserializer, parse the stringified JSON of the "data" value and return it. We call it payload.
7. Now the payload arrive to the correspondent stream handler as returned from the deserializer.
8. The stream handler has access to the payload + the inbound context in case you need to read the headers you stored, the consumer group, the inbound message id, etc.
9. The handler should do some business logic then return:

   - If the handler returns null or does not return anything, the flow will end here. No Acknowledge will take place neither any stream will be published as a response back.

   - If the handler returns an empty array, the lib will only Acknowledge the inbound message but, will not publish any streams as a response back.

   - If the handler return an array of one or more payloads, the lib will publish those streams, then will Acknowledge the inbound message. Continue the flow below...

10. The handler return an array of one or more payloads.
11. Now each payload object is passed to our serializer or your serializer with the inbound context too.
12. Our serializer take the payload object and extract the data key, and consider any other keys as headers. Those headers override the headers saved in the inbound context or extend them.
13. The serializer merge the headers from the inbound context with any optional headers returned from the handler.
14. The serializer will stringify the object of the data key and keep it ready.

15. Then, the serializer will stringify all the headers keys/values and make everything in the Redis Stream accepted format which is [headersKey1, headersValue1, key2, value2, ..., data, stringifiedJSON].

16. will return back the ready array to the lib.

17. The lib will publish each payload to its correspondent stream, via XADD command from Redis.

18. Then, will Acknowledge the inbound message via XACK command from Redis.

19. End of the flow. Get back to listening...

<P style="font-weight:bold"> Check our example to see how we read the data and context in the handler and the syntax of the returned payloads.
</P>

<br>

### Use your custom serializer/deserializer?

<p>
 We defined holes in our flow mentioned above to use your custom serializer/deserializer. You can provide them when initializing the strategy in the main.ts file. You use the key of the options you pass to the constructor: serialization: {serializer, deserializer}

</p>

- The deserializer receive two parameters, the row message as its received from Redis, and the inbound context so you can store your headers there.

- The serializer receive two parameters, the payload returned from the stream handler, and the inbound context to extract your headers from it and attach them back to response message before publishing it.

<P style="font-weight:bold">  Check our example main.ts file, we have commented some boiler plate on using custom serialization.
</p>

<br>

## License

MIT

## Author

<a href="https://github.com/tamimaj/" >Tamim Abbas Aljuratli</a>

## Co-author

<a href="https://github.com/Ali-Meh" >Ali Mahdavi</a>

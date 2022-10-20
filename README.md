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
      // optional. See below in details how to use them.
      // serialization: {},
    }),
  });

  await app.listen();
}
bootstrap();
```

<br>

### In one of your controllers where you want to handle the messages coming from a stream.

#### Use our decorator @RedisStreamHandler("users-1") to tell the lib to register this handler and listen on that "users-1" stream and whenever it receive a message, this handler will be called with the data and a created message context.

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

-- to be continued...
<br>

## Use your custom serializer/deserializer?

-- to be continued...
<br>

## License

MIT

## Author

<a href="https://github.com/tamimaj/" >Tamim Abbas Aljuratli</a>

## Co-author

<a href="https://github.com/Ali-Meh" >Ali Mahdavi</a>

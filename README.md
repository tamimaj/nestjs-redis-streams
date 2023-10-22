# @tamimaj/nestjs-redis-streams

<p align="center">
  <a href="http://nestjs.com/" target="blank">
    <img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" />
  </a>

</p>

<h3 align="center">
  Redis Streams Transport Strategy for <a href="http://nestjs.com/">NestJS</a> using <a href="https://github.com/luin/ioredis">ioredis</a> library.
</h3>

<div align="center">

![Codecov](https://img.shields.io/codecov/c/github/tamimaj/nestjs-redis-streams?color=green)
![npm](https://img.shields.io/npm/dt/@tamimaj/nestjs-redis-streams)
![npm](https://img.shields.io/npm/v/@tamimaj/nestjs-redis-streams)
![GitHub issues](https://img.shields.io/github/issues-raw/tamimaj/nestjs-redis-streams)
![GitHub Repo stars](https://img.shields.io/github/stars/tamimaj/nestjs-redis-streams?style=social)
![GitHub forks](https://img.shields.io/github/forks/tamimaj/nestjs-redis-streams?style=social)

</div>

<br>
<br>

<br>

## Features

- Built-in support for TypeScript.

- Client and server-side transport strategy.

- Client-side supports sending streams and receiving responses. It can also emit streams as fire-and-forget operations.

- Server-side can listen on streams, acknowledge received messages, and respond with streams.

- Simplified stream listening by plugging handlers into controllers.

- Automatic creation of consumer groups for streams during bootstrap.

- Convenient methods for responding with streams or multiple streams.

- Built-in serialization and deserialization support.

- Customizable serialization and deserialization with plug-able functionality.

<br>
<br>

## Installation

### with npm

```sh
npm install --save @tamimaj/nestjs-redis-streams
```

### with yarn

```sh
yarn add @tamimaj/nestjs-redis-streams
```

<br>

## How to use?

<br>

## Server Side (Receiver app)

<br>

### In your main.ts. Initialize the custom strategy like this:

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RedisStreamStrategy } from '@tamimaj/nestjs-redis-streams';

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
import { Ctx, Payload } from '@nestjs/microservices';
import {
  RedisStreamHandler,
  StreamResponse,
  RedisStreamContext,
} from '@tamimaj/nestjs-redis-streams';

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

### Handling Responses in Your Handler

The behavior of the library depends on what you return from your handler function. The return value instructs the library on what actions to take:

- If you don't return anything or return `null`: The library will not publish any streams in response and will not acknowledge the received stream message.

- If you return an empty array: The library will only acknowledge the received stream message without publishing any streams in response.

- If you return an array of one or more payloads: The library will publish each payload as a stream and then acknowledge the received stream message.

By controlling the return value of your handler, you can customize the library's behavior and determine whether to publish streams, acknowledge messages, or perform both actions based on your application's needs.

<br>

## Client Side (Requestor app)

First you have to import the client module into your app module, or any other module you want to use it in. There is two ways to use the client module: sync and async. We will explain both.

<br>

### Sync (register / forRoot)

When you have your redis connection config, streams config, etc, beforehand and you want to pass them to the client module, you can use the sync way.

In your app.module.ts or any other module you want to use the client to publish streams:

```ts
import { Module } from '@nestjs/common';
import { RedisStreamClientModule } from '@tamimaj/nestjs-redis-streams';

@Module({
  imports: [
    RedisStreamClientModule.register({
      connection: { url: '0.0.0.0:6379' },
      streams: { consumer: 'api-1', block: 5000, consumerGroup: 'api' },
      responseStreams: ['users:created', 'users:created:copy'],
    }),
  ],
})
export class AppModule {}
```

<br>

### Async (registerAsync / forRootAsync)

When you don't have your redis connection config, streams config, beforehand, or you want to use the nestjs config module to load them from .env file, you can use the async way.

In your app.module.ts or any other module you want to use the client to publish streams:

```ts
import { Module } from '@nestjs/common';
import { RedisStreamClientModule } from '@tamimaj/nestjs-redis-streams';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  // more examples about useClass, useFactory, in the example client app.
  imports: [
    RedisStreamClientModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: configService.get('REDIS_CONNECTION'),
        streams: configService.get('REDIS_STREAMS'),
        responseStreams: configService.get('REDIS_RESPONSE_STREAMS'),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

<br>

### NestJS will manage to inject the client into your service or controller.

Check the example app to see how to use the client to publish streams.

<br>

## Send a message and get a response.

In your service or controller:

```ts
import { Controller, Get } from '@nestjs/common';
import { RedisStreamClient } from '@tamimaj/nestjs-redis-streams';
import { lastValueFrom } from 'rxjs';

@Controller()
export class AppController {
  constructor(private readonly redisStreamClient: RedisStreamClient) {} // inject the client.

  @Get('/send')
  async sendMessage(): Promise<any> {
    // send a message and get a response.

    const observable = this.redisStreamClient.send('stream:name:here', {
      data: { name: 'tamim' }, // will be JSON.stringify() and stored in the data key.
      anyOtherHeadersKey: 'anyOtherHeadersValue', // header key, will be kept as key/value.
    });

    const response = await lastValueFrom(observable); // get the last value from the observable.

    console.log('response from the stream: ', response);

    return JSON.stringify(response);
  }
}
```

<br>

## Emit a message without waiting for a response. (fire and forget)

In your service or controller:

```ts
import { Controller, Get } from '@nestjs/common';
import { RedisStreamClient } from '@tamimaj/nestjs-redis-streams';

@Controller()
export class AppController {
  constructor(private readonly redisStreamClient: RedisStreamClient) {} // inject the client.

  @Get('/emit')
  async emitMessage(): Promise<any> {
    // emit a message and don't wait for a response.
    // fire and forget.

    this.redisStreamClient.emit('stream:name:here', {
      data: { name: 'tamim', fireAndForgetEvent: true }, // main key.
      anyOtherHeadersKey: 'anyOtherHeadersValue', // header key, will  be kept as key/value.
    });

    return 'Message Sent.';
  }
}
```

<br>

## How our default serialization/deserialization work?

In our library, we provide default serialization and deserialization logic that is tailored for enterprise microservices architecture. Our approach takes into consideration the use of headers and metadata, which can be valuable for various purposes such as authentication tokens or message tracing in logging services like Datadog.

### Headers

The headers part of the message comprises key/value pairs that store important information. One crucial header is the correlationId, which serves as a unique identifier for a request. By including the correlationId in the headers section, we ensure that responses carry the same correlationId. This enables us to accurately map responses to their corresponding handlers based on the correlationId stored during the initial request. Having a consistent correlationId throughout the request-response cycle allows for effective tracking and correlation of messages, facilitating seamless communication and response handling.

### Data

The data part of the message is represented by a single key, "data", which contains an object as its value. This structure resembles the body of a POST request, allowing you to include any desired data within it. Before sending the message, the data value is transformed into a JSON string using JSON.stringify() and then stored in a stream message. Upon receiving a message, our deserializer parses the JSON and forwards the data to the designated handler.

This default serialization/deserialization mechanism ensures seamless communication and interoperability within an enterprise microservices architecture while providing flexibility and easy integration with existing systems.

<br>
<br>

## Use your custom serializer/deserializer?

We defined holes in our flow to use your custom serializer/deserializer. You can provide them when initializing the strategy (server side) in the main.ts file. Also, you can define your custom serializer/deserializer in the client side, when initializing the client module. You use the key of the options you pass to the constructor: serialization: {serializer, deserializer}

- The deserializer receive two parameters, the row message as its received from Redis, and the inbound context so you can store your headers there.

- The serializer receive two parameters, the payload from user-land (your controller, service, etc.), and the inbound context to extract your headers from it and attach them back to response message before publishing it (server side responding to a received message scenario)

<P style="font-weight:bold">  Check our example main.ts file, we have commented some boiler plate on using custom serialization.
</p>

<br>

## Custom Serialization/Deserialization

In addition to our default serialization/deserialization logic, we provide the flexibility for you to use your own custom serializer and deserializer. This allows you to tailor the serialization and deserialization process to meet your specific requirements.

<br>

### Server-Side Customization

To use your custom serializer/deserializer on the server side, you can pass them as options when initializing the strategy in the `main.ts` file. By specifying the `serialization` key in the options, you can provide your custom serializer and deserializer.

The deserializer function takes two parameters: the raw message as received from Redis, and the inbound context. You can use the inbound context to store any headers or metadata related to the message.

The serializer function also takes two parameters: the payload from the user-land (e.g., your controller or service), and the inbound context. You can extract headers from the inbound context and attach them to the response message before publishing it.

For detailed usage examples and implementation details, you can refer to our example `main.ts` file. We have included commented boilerplate code that demonstrates how to utilize custom serialization.

Please note that using custom serialization/deserialization gives you full control over the message format and allows for seamless integration with your existing systems and infrastructure.

<br>

### Client-Side Customization

Along with server-side customization, we also provide the ability to customize serialization and deserialization on the client side. When initializing the client module, you can specify various options, including custom serializer and deserializer functions.

To customize serialization and deserialization on the client side, include the `serialization` key in the options object when initializing the client module. Within the `serialization` object, you can provide your own serializer and deserializer functions.

- The serializer function also takes two parameters: the payload from the user-land (e.g., your controller or service), and the outbound context (placeholder at that point the message have not been published).

- The deserializer function takes two parameters: the raw message as received from Redis (when a stream response arrive) and the inbound context. You can use the inbound context to store any headers or metadata related to the message and just return the parsed message to the user-land.

By plugging in your custom serializer and deserializer functions, you can tailor the serialization and deserialization process to meet your specific needs and seamlessly integrate with your existing systems. When utilizing client-side customization, you have full control over how messages are serialized and deserialized, ensuring compatibility and efficient communication with your microservices ecosystem.

<br>
<br>

## License

MIT

## Author

<a href="https://github.com/tamimaj/" >Tamim Abbas Aljuratli</a>

## Co-author

<a href="https://github.com/Ali-Meh" >Ali Mahdavi</a>

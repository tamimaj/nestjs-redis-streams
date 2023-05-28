import { Controller, Get } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { RedisStreamClient } from '@tamimaj/nestjs-redis-streams';

@Controller()
export class AppController {
  constructor(private readonly redisStreamClient: RedisStreamClient) {}

  @Get()
  async getHello(): Promise<any> {
    // send a message and get a response.

    const observable = this.redisStreamClient.send('users:create', {
      data: { name: 'tamim' }, // this will be the data of the stream, and will be serialized to JSON,
      // if you use the default serializer.

      // correlationId: '1234', // override the correlationId, if you want to use your own. Default is uuid.
      // will be used to map the response to the correct observer.

      anyOtherHeadersKey: 'anyOtherHeadersValue', // any other headers you want to add to the stream.
      // headers are key value pairs, and will NOT be serialized to JSON, if you use the default serializer.
    });

    const response = await lastValueFrom(observable); // get the last value from the observable.

    console.log('response from the stream: ', response);

    return JSON.stringify(response);
  }

  @Get('/emit')
  async getHelloEmit(): Promise<any> {
    // emit a message and don't wait for a response.
    // fire and forget.

    const observable = this.redisStreamClient.emit('users:create', {
      data: { name: 'tamim', fireAndForgetEvent: true }, // this will be the data of the stream, and will be serialized to JSON,
      // if you use the default serializer.

      // correlationId: '1234', // override the correlationId, if you want to use your own. Default is uuid.
      // will be used to map the response to the correct observer.

      anyOtherHeadersKey: 'anyOtherHeadersValue', // any other headers you want to add to the stream.
      // headers are key value pairs, and will NOT be serialized to JSON, if you use the default serializer.
    });

    return 'Message Sent.';
  }
}

import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import {
  RedisStreamHandler,
  StreamResponse,
  RedisStreamContext,
} from 'nestjs-redis-streams';

// @Controller()
export class UsersEventHandlers {
  // NOTE when calling Ctx need to call Payload too, or data will be undefined.
  @RedisStreamHandler('users:create')
  async handleCreate1(@Payload() data: any, @Ctx() ctx: RedisStreamContext) {
    console.log('Handler users:create called with payload: ', data);
    console.log('Headers: ', ctx.getMessageHeaders());

    return [
      {
        payload: {
          // optinal headers to override or add new headers keys.
          // everything except data is considered headers.
          correlationId: 'THE BEST BEST CORRELATION ID EVER',
          extraKey: 'hola que tal',

          // data is the only mandatory key. for our serialzer/deserializer.
          data: { name: 'Tamim', lastName: 'Abbas' },
        },

        stream: 'user:created',
      },

      {
        payload: {
          // no headers, will use the original headers of the req from inbound context.
          data: { name: 'Tamim', lastName: 'Abbas' },
        },

        stream: 'user:created:copy',
      },
    ] as StreamResponse;

    // return [] as StreamResponse;

    // return null;
  }

  @RedisStreamHandler('users:test')
  async doDifferentThingsForTheSameStream(payload) {
    console.log('STREAM SECOND EVENT HANDLER GOT CALLED  =>', payload);
    return 'hola';
  }

  @RedisStreamHandler('users:update')
  async handleUserUpdate(payload) {
    console.log('STREAM SECOND EVENT HANDLER GOT CALLED  =>', payload);
    return 'hola';
  }

  @MessagePattern('irrelevent-handler')
  async handleMessageHola() {
    return 'hola';
  }
}

import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { RedisStreamHandler } from 'src/redis-streams-strategy/decorators';
import { StreamResponse } from 'src/redis-streams-strategy/interfaces';
import { RedisStreamContext } from 'src/redis-streams-strategy/stream.context';

// @Controller()
export class UsersEventHandlers {
  // NOTE when calling Ctx need to call Payload too, or data will be undefined.
  @RedisStreamHandler('users:create')
  async handleCreate1(@Payload() data: any, @Ctx() ctx: RedisStreamContext) {
    console.log('Handler 1 of users:create called Payload: ', data);
    console.log('Handler 1 of users:create CTX: ', ctx.getMessage());

    return [
      {
        payload: {
          headers: {
            // optinal headers to override or add new headers keys.
            correlationId: 'THE BEST BEST CORRELATION ID EVER',
            extraKey: 'hola que tal',
          },
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

  // @RedisStreamHandler('users:create')
  // async handleCreate2({ id, key, value }) {
  //   console.log('Handler 2 of users:create called: ', value);
  //   return 'hola 2';
  // }

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

  @MessagePattern('hola-message')
  async handleMessageHola() {
    return 'hola-message';
  }
}

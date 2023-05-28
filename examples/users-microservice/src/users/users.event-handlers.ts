import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import {
  RedisStreamHandler,
  StreamResponse,
  RedisStreamContext,
} from '@tamimaj/nestjs-redis-streams';

export class UsersEventHandlers {
  // NOTICE when calling @Ctx need to call @Payload too, or data will be undefined.
  @RedisStreamHandler('users:create')
  async handleCreate1(@Payload() data: any, @Ctx() ctx: RedisStreamContext) {
    console.log('Handler users:create called with payload: ', data);
    console.log('Headers: ', ctx.getMessageHeaders());
    console.log('messageId: ', ctx.getMessageId());

    return [
      {
        payload: {
          // optional headers to override or add new headers keys.
          // everything except data is considered headers.
          correlationId:
            'Any new correlationId thats override the inbound message one.',
          extraKey: 'Any extra key',

          // data is the only mandatory key. for our serializer/deserializer.
          data: { name: 'Ali', lastName: 'Mahdavi' },
        },

        stream: 'users:created',
      },

      {
        payload: {
          // no headers, will use the original headers of the inbound stream message, if they exist.
          data: { name: 'John', lastName: 'Smith' },
        },

        stream: 'users:created:copy',
      },
    ] as StreamResponse;

    // return [] as StreamResponse;

    // return null;
  }

  @RedisStreamHandler('users:update')
  async handleUserUpdate(payload: any) {
    console.log('Handler users:update called with payload', payload);
    return [] as StreamResponse; // Won't publish anything back, only ACK.
  }

  // this handler won't be registered for any streams listening.
  @MessagePattern('irrelevant-handler')
  async irrelevantHandlerForStreams() {
    return 'Hello World.';
  }
}

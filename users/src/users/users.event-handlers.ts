import { Controller } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
} from '@nestjs/microservices';
import { RedisStreamHandler } from 'src/redis-streams-strategy/decorators';
import { StreamPayload } from 'src/redis-streams-strategy/interfaces';
import { RedisStreamContext } from 'src/redis-streams-strategy/stream.context';

// @Controller()
export class UsersEventHandlers {
  // NOTE when calling Ctx need to call Payload too, or data will be undefined.
  @RedisStreamHandler('users:create')
  async handleCreate1(
    @Payload() payload: StreamPayload,
    @Ctx() ctx: RedisStreamContext,
  ) {
    console.log('Handler 1 of users:create called Payload: ', payload);
    console.log('Handler 1 of users:create CTX: ', ctx);
    console.log('Handler 1 stream from context', ctx.getStream());
    return 'hola';
  }

  @RedisStreamHandler('users:create')
  async handleCreate2({ id, key, value }) {
    console.log('Handler 2 of users:create called: ', value);
    return 'hola 2';
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

  @MessagePattern('hola-message')
  async handleMessageHola() {
    return 'hola-message';
  }
}

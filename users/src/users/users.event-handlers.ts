import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern } from '@nestjs/microservices';
import { RedisStreamHandler } from 'src/redis-streams-strategy/decorators';

// @Controller()
export class UsersEventHandlers {
  @RedisStreamHandler('users:create')
  async handleCreate1(data) {
    console.log('Handler 1 of users:create called: ', data);
    return 'hola';
  }

  @RedisStreamHandler('users:create')
  async handleCreate2(data) {
    console.log('Handler 2 of users:create called: ', data);
    return 'hola 2';
  }

  @RedisStreamHandler('users:test')
  async doDifferentThingsForTheSameStream(data) {
    console.log('STREAM SECOND EVENT HANDLER GOT CALLED  =>', data);
    return 'hola';
  }

  @RedisStreamHandler('users:update')
  async handleUserUpdate(data) {
    console.log('STREAM SECOND EVENT HANDLER GOT CALLED  =>', data);
    return 'hola';
  }

  @MessagePattern('hola-message')
  async handleMessageHola() {
    return 'hola-message';
  }
}

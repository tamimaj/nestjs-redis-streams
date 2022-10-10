import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern } from '@nestjs/microservices';
import { RedisStreamHandler } from 'src/redis-streams-strategy/decorators';

// @Controller()
export class UsersEventHandlers {
  //  @RedisStreamHandler("users:create"). it will be mapped to the object below.

  @RedisStreamHandler('users:create')
  async handleEventHola(data) {
    console.log('STREAM EVENT HANDLER CALLED BBBBB', data);
    return 'hola';
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

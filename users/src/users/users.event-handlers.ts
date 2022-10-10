import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern } from '@nestjs/microservices';

// @Controller()
export class UsersEventHandlers {
  //  @RedisStreamHandler("users:create"). it will be mapped to the object below.

  @EventPattern({ isRedisStreamHandler: true, stream: 'users:create' })
  // replace with custom decorator, that append isRedisStreamHandler automatically.
  async handleEventHola(data) {
    console.log('STREAM EVENT HANDLER CALLED BBBBB', data);
    return 'hola';
  }

  @EventPattern({ isRedisStreamHandler: true, stream: 'users:create' })
  // replace with custom decorator, that append isRedisStreamHandler automatically.
  async doDifferentThingsForTheSameStream(data) {
    console.log('STREAM SECOND EVENT HANDLER GOT CALLED  =>', data);
    return 'hola';
  }

  @EventPattern({ isRedisStreamHandler: true, stream: 'users:update' })
  // replace with custom decorator, that append isRedisStreamHandler automatically.
  async handleUserUpdate(data) {
    console.log('STREAM SECOND EVENT HANDLER GOT CALLED  =>', data);
    return 'hola';
  }

  @MessagePattern('hola-message')
  async handleMessageHola() {
    return 'hola-message';
  }
}

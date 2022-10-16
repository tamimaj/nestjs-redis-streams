import { EventPattern, MessagePattern } from '@nestjs/microservices';

// decorator factory, that return the native EventPattern.
// It Is unreplacable. This custom decorator just syntax sugar.
export const RedisStreamHandler = (stream: string) => {
  return MessagePattern({ stream, isRedisStreamHandler: true });
};

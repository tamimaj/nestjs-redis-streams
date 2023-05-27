import { MessagePattern } from '@nestjs/microservices';

// decorator factory, that return the native MessagePattern.
// It Is unreplaceable. This custom decorator just syntax sugar.
export const RedisStreamHandler = (stream: string) => {
  return MessagePattern({ stream, isRedisStreamHandler: true });
};

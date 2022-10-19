import { Module } from '@nestjs/common';
import { RedisModule as RedisClientModule } from '@nestjs-modules/ioredis';
import { Global } from '@nestjs/common/decorators';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
@Global()
@Module({
  imports: [
    RedisClientModule.forRootAsync({
      useFactory: () => ({
        config: {
          url: REDIS_URL,
        },
      }),
    }),
  ],

  exports: [RedisClientModule],
})
export class RedisModule {}

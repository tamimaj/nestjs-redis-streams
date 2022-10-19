import { Module } from '@nestjs/common';
import { RedisModule } from './users/redis/redis.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [RedisModule, UsersModule],
  controllers: [],
  providers: [UsersModule],
})
export class AppModule {}

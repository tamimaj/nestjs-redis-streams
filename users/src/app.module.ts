import { Module } from '@nestjs/common';

import { RedisModule } from './users/redis/redis.module';
import { DatabaseModule } from './users/database/database.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [RedisModule, DatabaseModule, UsersModule],
  controllers: [],
  providers: [UsersModule],
})
export class AppModule {}

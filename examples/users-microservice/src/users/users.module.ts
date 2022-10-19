import { Module } from '@nestjs/common';
import { UsersEventHandlers } from './users.event-handlers';

@Module({
  controllers: [UsersEventHandlers],
  providers: [],
})
export class UsersModule {}

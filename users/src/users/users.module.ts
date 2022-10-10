import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersEventHandlers } from './users.event-handlers';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, UsersEventHandlers],
  providers: [UsersService],
})
export class UsersModule {}

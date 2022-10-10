import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database/database.service';
import { User, Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: DatabaseService) {}

  // // testing prisma in private method, to avoid more routing for ease of gRPC test.
  // private async createUser(data: Prisma.UserCreateInput): Promise<User> {
  //   return await this.prisma.user.create({ data });
  // }

  // greet(name: string): GreetResponse {
  //   console.log('GREET METHOD CALLED');
  //   this.createUser({ name });
  //   return { greetingMessage: `Hola ${name}, how are you?` };
  // }
}

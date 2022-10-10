import { Controller } from '@nestjs/common';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';

import {
  CreateUserRequest,
  CreateUserResponse,
  GetUserByAuthIdRequest,
  GetUserByAuthIdResponse,
  GetUserByIdRequest,
  GetUserByIdResponse,
  GetUsersRequest,
  GetUsersResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  UsersServiceControllerMethods,
} from 'sona-proto';

import { GrpcMethod } from '@nestjs/microservices';
import { UsersService } from './users.service';

@Controller()
@UsersServiceControllerMethods()
export class UsersController {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly usersService: UsersService,
  ) {}

  private wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Testing Redis, in private method, to avoid more routing for ease of gRPC test.
  private async streamABunchOfData(): Promise<void> {
    for (let i = 1; i <= 1000; i++) {
      const ranNum = Math.round(Math.random() * 5000).toString();

      let response = await this.redis.xadd(
        'mystream',
        '*',
        'name',
        'Tamim--' + ranNum,
      );

      console.log('response of stream add command: ' + response);
      await this.wait(0);
    }
  }

  private async streamSingleEntry(): Promise<void> {
    const ranNum = Math.round(Math.random() * 5000).toString();

    let fakeUserObj = {
      id: ranNum.toString(),
      firstName: 'Tamim',
      lastName: 'Abbas',
    };

    let response = await this.redis.xadd(
      'users:created',
      '*',
      'user',
      JSON.stringify(fakeUserObj),
    );
    // let response = await this.redis.xadd(
    //   'mystream',
    //   '*',
    //   'name',
    //   'Tamim--' + ranNum,
    // );
    console.log('response of stream add command: ' + response);
  }

  getUserById(data: GetUserByIdRequest): GetUserByIdResponse {
    console.log(data);
    return { user: { firstName: 'Tamim' } };
    // return null;
  }

  getUserByAuthId(data: GetUserByAuthIdRequest): GetUserByAuthIdResponse {
    console.log(data);
    return { user: { firstName: 'Tamim' } };
    // return null;
  }

  // test redis streams
  getUsers(data: GetUsersRequest): GetUsersResponse {
    console.log(data);
    this.streamSingleEntry();

    return { users: [{ firstName: 'Tamim' }, { firstName: 'Ahmad' }] };
  }

  createUser(data: CreateUserRequest): CreateUserResponse {
    console.log(data);
    this.streamSingleEntry();
    return { user: { firstName: 'Tamim' } };
  }

  updateUser(data: UpdateUserRequest): UpdateUserResponse {
    console.log(data);
    return { user: { firstName: 'Tamim' } };
  }
}

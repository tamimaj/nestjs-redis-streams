/* eslint-disable */
import { GrpcMethod, GrpcStreamMethod } from "@nestjs/microservices";
import { Observable } from "rxjs";

export interface User {
  id?: number;
  authId?: string;
  email?: string;
  role?: string;
  walletAddress?: string;
  emailVerified?: boolean;
  signInProvider?: string;
  isBlocked?: boolean;
  lastAppLaunch?: string;
  createdAt?: string;
  updatedAt?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phoneNumber?: string;
  avatar?: string;
  isSubscribed?: boolean;
}

export interface GetUserByIdRequest {
  id?: number;
}

export interface GetUserByIdResponse {
  user?: User;
}

export interface GetUserByAuthIdRequest {
  authId?: string;
}

export interface GetUserByAuthIdResponse {
  user?: User;
}

export interface GetUsersRequest {
}

export interface GetUsersResponse {
  users?: User[];
}

export interface CreateUserRequest {
  authId?: string;
  email?: string;
}

export interface CreateUserResponse {
  user?: User;
}

export interface UpdateUserRequest {
  user?: User;
}

export interface UpdateUserResponse {
  user?: User;
}

export const USERS_PACKAGE_NAME = "users";

export interface UsersServiceClient {
  getUserById(request: GetUserByIdRequest): Observable<GetUserByIdResponse>;

  getUserByAuthId(request: GetUserByAuthIdRequest): Observable<GetUserByAuthIdResponse>;

  getUsers(request: GetUsersRequest): Observable<GetUsersResponse>;

  createUser(request: CreateUserRequest): Observable<CreateUserResponse>;

  updateUser(request: UpdateUserRequest): Observable<UpdateUserResponse>;
}

export interface UsersServiceController {
  getUserById(
    request: GetUserByIdRequest,
  ): Promise<GetUserByIdResponse> | Observable<GetUserByIdResponse> | GetUserByIdResponse;

  getUserByAuthId(
    request: GetUserByAuthIdRequest,
  ): Promise<GetUserByAuthIdResponse> | Observable<GetUserByAuthIdResponse> | GetUserByAuthIdResponse;

  getUsers(request: GetUsersRequest): Promise<GetUsersResponse> | Observable<GetUsersResponse> | GetUsersResponse;

  createUser(
    request: CreateUserRequest,
  ): Promise<CreateUserResponse> | Observable<CreateUserResponse> | CreateUserResponse;

  updateUser(
    request: UpdateUserRequest,
  ): Promise<UpdateUserResponse> | Observable<UpdateUserResponse> | UpdateUserResponse;
}

export function UsersServiceControllerMethods() {
  return function (constructor: Function) {
    const grpcMethods: string[] = ["getUserById", "getUserByAuthId", "getUsers", "createUser", "updateUser"];
    for (const method of grpcMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcMethod("UsersService", method)(constructor.prototype[method], method, descriptor);
    }
    const grpcStreamMethods: string[] = [];
    for (const method of grpcStreamMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcStreamMethod("UsersService", method)(constructor.prototype[method], method, descriptor);
    }
  };
}

export const USERS_SERVICE_NAME = "UsersService";

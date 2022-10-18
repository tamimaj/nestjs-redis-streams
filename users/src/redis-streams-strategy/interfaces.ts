import * as Redis from 'ioredis';

export type RedisConnectionOptions = Redis.RedisOptions & { url?: string };

export type RedisInstance = Redis.Redis;

export interface RedisStreamPattern {
  isRedisStreamHandler: boolean;
  stream: string;
}

interface RedisStreamOptionsBase {
  block?: number;
}

// using XreadGroup type
interface RedisStreamOptionsXreadGroup extends RedisStreamOptionsBase {
  useXread?: false | undefined;
  consumerGroup: string;
  consumer: string;
}

// using Xread type
interface RedisStreamOptionsXread extends RedisStreamOptionsBase {
  useXread: true;
  consumerGroup?: string;
  consumer?: string;
}

export type RedisStreamOptions =
  | RedisStreamOptionsXreadGroup
  | RedisStreamOptionsXread;

export interface Serialization {
  serializer?: (data: any) => string;
  deserializer?: (data: string) => any;
}

export interface ConstructorOptions {
  connection?: RedisConnectionOptions;
  streams: RedisStreamOptions;
  serialization?: Serialization;
}

export interface StreamResponseObject {
  payload: {
    headers?: any;
    data: any;
  };
  stream: string;
}

export type StreamResponse = StreamResponseObject[] | [] | null | undefined;

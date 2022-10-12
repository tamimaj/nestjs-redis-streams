import * as Redis from 'ioredis';

export type RedisConnectionOptions = Redis.RedisOptions & { url?: string };
export interface RedisStreamPattern {
  isRedisStreamHandler: boolean;
  stream: string;
}

export interface RedisStreamOptions {
  consumerGroup?: string;
  consumer?: string;
  block?: number;
}

export interface Serialization {
  serializer?: (data: any) => string;
  deserializer?: (data: string) => any;
}

export interface ConstructorOptions {
  connection?: RedisConnectionOptions;
  streams?: RedisStreamOptions;
  serialization?: Serialization;
}

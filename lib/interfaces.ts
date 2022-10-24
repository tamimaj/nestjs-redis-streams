import * as Redis from 'ioredis';
import { RedisStreamContext } from './stream.context';

export type RedisConnectionOptions = Redis.RedisOptions & { url?: string };

export type RedisInstance = Redis.Redis;

export interface RedisStreamPattern {
  isRedisStreamHandler: boolean;
  stream: string;
}

interface RedisStreamOptionsXreadGroup {
  block?: number;
  consumerGroup: string;
  consumer: string;
}

export type RedisStreamOptions = RedisStreamOptionsXreadGroup;

// [id, [key, value, key, value]]
export type RawStreamMessage = [id: string, payload: string[]];

export interface Serialization {
  deserializer?: (
    rawMessage: RawStreamMessage,
    inboundContext: RedisStreamContext,
  ) => any | Promise<any>;

  serializer?: (
    parsedPayload: any,
    inboundContext: RedisStreamContext,
  ) => string[] | Promise<string[]>;
}

export interface ConstructorOptions {
  connection?: RedisConnectionOptions;
  streams: RedisStreamOptions;
  serialization?: Serialization;
}

export interface StreamResponseObject {
  payload: {
    [key: string]: any; // any extra keys goes as headers.
    data: any;
  };
  stream: string;
}

export type StreamResponse = StreamResponseObject[] | [] | null | undefined;

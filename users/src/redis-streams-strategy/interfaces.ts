export interface RedisStreamPattern {
  isRedisStreamHandler: boolean;
  stream: string;
}

export interface RedisConnectionOptions {
  url?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  db?: number;
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

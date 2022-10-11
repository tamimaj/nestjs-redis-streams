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

export interface ConstructorOptions {
  connection?: RedisConnectionOptions;
  streams?: RedisStreamOptions;
}

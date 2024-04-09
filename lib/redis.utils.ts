import Redis from 'ioredis';

import { RedisConnectionOptions, RedisInstance } from './interfaces';

export function createRedisConnection(
  connection?: RedisConnectionOptions,
): RedisInstance {
  // connection obj is optional, ioredis handle the default connection to localhost:6379
  if (connection?.url) {
    return new Redis(connection?.url, connection);
  } else {
    return new Redis(connection!);
  }
}

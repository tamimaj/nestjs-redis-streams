import Redis from 'ioredis';

import { RedisConnectionOptions, RedisInstance } from './interfaces';

export function createRedisConnection(
  connection?: RedisConnectionOptions,
): RedisInstance {
  // connection obj is optional, ioredis handle the default connection to localhost:6379

  // if url is supplied, use it as path, and the rest as extra config.
  if (connection?.url) {
    return new Redis(connection?.url, connection);
  } else {
    // use destructured properties, host, port, etc.
    return new Redis(connection);
  }
}

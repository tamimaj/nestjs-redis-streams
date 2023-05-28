// @ts-nocheck
import Redis from 'ioredis';
import { createRedisConnection } from '../lib/redis.utils';

jest.mock('ioredis');

describe('createRedisConnection', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should create a Redis instance with default connection when no connection is provided', () => {
    const redisMock = jest.fn().mockReturnValue({
      options: {
        host: 'localhost',
        port: 6379,
      },
    });
    Redis = jest.fn().mockImplementation(redisMock);

    const redis = createRedisConnection();

    expect(redisMock).toHaveBeenCalledTimes(1);
    expect(redisMock).toHaveBeenCalledWith(undefined);

    expect(redis.options.host).toBe('localhost');
    expect(redis.options.port).toBe(6379);
  });

  it('should create a Redis instance with provided connection options', () => {
    const connectionOptions = {
      host: 'notlocalhost.com',
      port: 1234,
    };

    const redisMock = jest.fn().mockImplementation((connection) => {
      return {
        options: connection,
      };
    });

    Redis = jest.fn().mockImplementation(redisMock);

    const redis = createRedisConnection(connectionOptions);

    expect(redisMock).toHaveBeenCalledTimes(1);
    expect(redisMock).toHaveBeenCalledWith(connectionOptions);

    expect(redis.options.host).toBe(connectionOptions.host);
    expect(redis.options.port).toBe(connectionOptions.port);
  });

  it('should create a Redis instance with provided connection URL', () => {
    const redisMock = jest.fn().mockImplementation((connection) => {
      return {
        options: connection,
      };
    });

    Redis = jest.fn().mockImplementation(redisMock);

    const connectionOptions = {
      url: 'redis://localhost:6379',
      anotherOption: 'anotherValue',
    };

    createRedisConnection(connectionOptions);

    expect(redisMock).toHaveBeenCalledTimes(1);
    expect(redisMock).toHaveBeenCalledWith(
      connectionOptions.url,
      connectionOptions,
    );
  });
});

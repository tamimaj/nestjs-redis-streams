// @ts-nocheck
import Redis from 'ioredis';
import { deserialize, serialize } from '../lib/streams.utils';
import { RedisStreamStrategy } from '../lib/redis.server';
import { ConstructorOptions, RedisInstance } from '../lib/interfaces';
import { createRedisConnection } from '../lib/redis.utils';
import { RedisStreamContext } from '../lib/stream.context';

const constructorOptions: ConstructorOptions = {
  connection: { url: 'redis://localhost' },
  streams: { consumerGroup: 'group', consumer: 'consumer' },
};

jest.mock('../lib/redis.utils');
jest.mock('ioredis');

describe('RedisStreamStrategy', () => {
  let server: RedisStreamStrategy;
  let options: ConstructorOptions;
  let redis: RedisInstance;
  let client: RedisInstance;
  let streamHandlerMap = {};

  beforeEach(() => {
    jest.clearAllMocks();
    server = new RedisStreamStrategy(constructorOptions);
    redis = server.redis;
    client = server.client;
    streamHandlerMap = server.streamHandlerMap;
    options = server.options;

    createRedisConnection.mockReturnValue({
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'connect') {
          callback();
        }
      }),
    });
  });

  describe('listen', () => {
    it('should log a message, bind handlers, and call the provided callback when redis connection is established', () => {
      server.logger.log = jest.fn().mockReturnThis(); // mock the method
      server.bindHandlers = jest.fn().mockReturnThis(); // mock the method
      const callback = jest.fn();
      server.listen(callback);
      expect(server.logger.log).toHaveBeenCalled();
      expect(server.bindHandlers).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledTimes(1);
    });
    it('should NOT log a message, bind handlers, or call the provided callback if redis connection is NOT established', () => {
      // mock the error only.
      createRedisConnection.mockReturnValue({
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'error') {
            callback();
          }
        }),
        quit: jest.fn().mockReturnThis(),
      });
      server.logger.log = jest.fn().mockReturnThis(); // mock the method
      server.bindHandlers = jest.fn().mockReturnThis(); // mock the method
      const callback = jest.fn();
      server.listen(callback);
      expect(server.logger.log).not.toHaveBeenCalled();
      expect(server.bindHandlers).not.toHaveBeenCalled();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('bindHandlers', () => {
    it('should register streams and listen on them', async () => {
      // define mock message handler and pattern
      const streamCallbackHandler = jest.fn();
      const pattern = 'testPattern';

      // mock registerStream
      server.registerStream = jest.fn().mockResolvedValue(true);

      // mock listenOnStreams
      server.listenOnStreams = jest.fn().mockReturnThis();

      // register mock handler with server
      server.addHandler(pattern, streamCallbackHandler);

      // bind handlers and wait for them to be registered
      await server.bindHandlers();

      const streamCallBack = server.messageHandlers.get(pattern);

      expect(streamCallBack).not.toBeNull();
      expect(server.registerStream).toHaveBeenCalledWith(pattern);
      expect(server.listenOnStreams).toHaveBeenCalled();
    });

    it('should log and re-throw errors', async () => {
      // mock error to be thrown during stream registration
      const mockError = new Error('test error');
      server.registerStream = jest.fn().mockRejectedValueOnce(mockError);

      // mock message handler and pattern
      const streamCallbackHandler = jest.fn();
      const pattern = 'testPattern';
      // register mock handler with server
      server.addHandler(pattern, streamCallbackHandler);

      // mock logger
      server.logger.error = jest.fn().mockReturnThis();

      // mock the listenOnStreams method
      server.listenOnStreams = jest.fn().mockReturnThis();

      // Call bindHandlers and expect it to throw the error
      await expect(async () => {
        await server.bindHandlers();
      }).rejects.toThrow(mockError);

      // Ensure the error was logged
      expect(server.logger.error).toHaveBeenCalledWith(mockError);

      // Ensure listenOnStreams was not called
      expect(server.listenOnStreams).not.toHaveBeenCalled();
    });
  });

  describe('registerStream', () => {
    it('should return false if the pattern is not a Redis stream handler', async () => {
      const pattern = JSON.stringify({ isRedisStreamHandler: false });

      const result = await server['registerStream'](pattern);

      expect(result).toBe(false);
    });

    it('should add the message handler to the stream handler map and return true', async () => {
      const mockStream = 'mystream';

      // mock get message handler
      server.messageHandlers.get = jest.fn().mockReturnValue(() => true);

      const patternObj = JSON.stringify({
        isRedisStreamHandler: true,
        stream: mockStream,
      });

      const result = await server['registerStream'](patternObj);

      expect(result).toBe(true);
      expect(server.streamHandlerMap['mystream']).toBeDefined();
    });

    it('should catch and log any errors thrown by JSON.parse', async () => {
      const pattern = 'invalid pattern';
      // mock logger
      server.logger.debug = jest.fn().mockReturnThis();

      const result = await server['registerStream'](pattern);

      expect(result).toBe(false);
      expect(server['logger']['debug']).toHaveBeenCalled();
    });

    it('should call createConsumerGroup with the correct arguments', async () => {
      const pattern = JSON.stringify({
        isRedisStreamHandler: true,
        stream: 'mystream',
      });

      const mockCreateConsumerGroup = (server['createConsumerGroup'] =
        jest.fn());

      await server['registerStream'](pattern);

      expect(mockCreateConsumerGroup).toHaveBeenCalledWith(
        'mystream',
        server['options']?.streams?.consumerGroup,
      );
    });
  });

  describe('createConsumerGroup', () => {
    it('should create a new consumer group for the given stream and return true', async () => {
      const mockXgroup = jest.fn().mockResolvedValueOnce('OK');

      server.redis = {
        xgroup: mockXgroup,
      };

      const stream = 'mystream';
      const consumerGroup = 'mygroup';

      const result = await server['createConsumerGroup'](stream, consumerGroup);

      expect(result).toBe(true);
      expect(mockXgroup).toHaveBeenCalledWith(
        'CREATE',
        stream,
        consumerGroup,
        '$',
        'MKSTREAM',
      );
    });

    it('should log a debug message and return true if the consumer group already exists', async () => {
      const mockXgroup = jest
        .fn()
        .mockRejectedValueOnce(new Error('BUSYGROUP'));

      server.redis = {
        xgroup: mockXgroup,
      };

      const mockDebug = jest
        .spyOn(server['logger'], 'debug')
        .mockImplementation();

      const stream = 'mystream';
      const consumerGroup = 'mygroup';

      const result = await server['createConsumerGroup'](stream, consumerGroup);

      expect(result).toBe(true);
      expect(mockXgroup).toHaveBeenCalledWith(
        'CREATE',
        stream,
        consumerGroup,
        '$',
        'MKSTREAM',
      );
      expect(mockDebug).toHaveBeenCalledWith(
        'Consumer Group "' +
          consumerGroup +
          '" already exists for stream: ' +
          stream,
      );
    });

    it('should log an error and return false if an error other than BUSYGROUP is thrown', async () => {
      const mockXgroup = jest.fn().mockImplementation(() => {
        throw new Error('Some other error');
      });

      server.redis = {
        xgroup: mockXgroup,
      };

      const mockError = jest
        .spyOn(server['logger'], 'error')
        .mockImplementation();

      const stream = 'mystream';
      const consumerGroup = 'mygroup';

      const result = await server['createConsumerGroup'](stream, consumerGroup);

      expect(result).toBe(false);
      expect(mockXgroup).toHaveBeenCalledWith(
        'CREATE',
        stream,
        consumerGroup,
        '$',
        'MKSTREAM',
      );
      expect(mockError).toHaveBeenCalledWith(new Error('Some other error'));
    });
  });

  describe('listenOnStreams', () => {
    it('should call xreadgroup with the correct arguments and notify handlers if messages are received', async () => {
      // IMPORTANT to throw error at some point to stop the recursion.
      const mockXreadgroup = jest
        .fn()
        .mockResolvedValueOnce([['mystream', [['1-0', { message: 'hello' }]]]])
        .mockRejectedValueOnce(
          new Error('JUST ERROR TO STOP THE LISTENING RECURSION'),
        );

      server.redis = {
        xreadgroup: mockXreadgroup,
      };

      // mock handler map.
      server['streamHandlerMap'] = {
        mystream: jest.fn().mockReturnThis(),
      };

      // mock streams options.
      server.options.streams = {
        consumerGroup: 'mygroup',
        consumer: 'myconsumer',
        block: 100,
      };

      const mockNotifyHandlers = jest
        .spyOn(server, 'notifyHandlers')
        .mockResolvedValue();

      const result = await server['listenOnStreams']();

      expect(result).toBeUndefined();

      expect(mockXreadgroup).toHaveBeenCalledWith(
        'GROUP',
        'mygroup',
        'myconsumer',
        'BLOCK',
        100,
        'STREAMS',
        'mystream',
        '>',
      );

      expect(mockNotifyHandlers).toHaveBeenCalledWith('mystream', [
        ['1-0', { message: 'hello' }],
      ]);
    });

    it('should call itself again if no messages are received and BLOCK time ended', async () => {
      // IMPORTANT to throw error at some point to stop the recursion.
      const mockXreadgroup = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(
          new Error('JUST ERROR TO STOP THE LISTENING RECURSION'),
        );

      server.redis = {
        xreadgroup: mockXreadgroup,
      };

      // mock streams options.
      server.options.streams = {
        consumerGroup: 'mygroup',
        consumer: 'myconsumer',
        block: 100,
      };

      const mockNotifyHandlers = jest
        .spyOn(server, 'notifyHandlers')
        .mockResolvedValue();

      const result = await server['listenOnStreams']();

      expect(result).toBeUndefined();
      expect(mockNotifyHandlers).not.toHaveBeenCalled();
    });

    it('should log an error if xreadgroup throws an error', async () => {
      const mockXreadgroup = jest
        .fn()
        .mockRejectedValueOnce(new Error('Some error'));

      server.redis = {
        xreadgroup: mockXreadgroup,
      };
      // mock streams options.
      server.options.streams = {
        consumerGroup: 'mygroup',
        consumer: 'myconsumer',
        block: 100,
      };

      // mock handler map.
      server['streamHandlerMap'] = {
        mystream: jest.fn().mockReturnThis(),
      };

      const mockError = jest
        .spyOn(server['logger'], 'error')
        .mockImplementation();

      const result = await server['listenOnStreams']();
      expect(result).toBeUndefined();
      expect(mockXreadgroup).toHaveBeenCalledWith(
        'GROUP',
        'mygroup',
        'myconsumer',
        'BLOCK',
        100,
        'STREAMS',
        'mystream',
        '>',
      );
      expect(mockError).toHaveBeenCalledWith(new Error('Some error'));
    });
  });

  describe('notifyHandlers', () => {
    it('should call the stream handler for each message', async () => {
      const stream = 'myStream';
      const payload1 = { foo: 'bar' };
      const payload2 = { baz: 'qux' };
      const messages = [
        ['1', payload1],
        ['2', payload2],
      ];

      // mock stream handler map.
      const handler = jest.fn().mockImplementation(() => {});
      server['streamHandlerMap'] = {
        [stream]: handler,
      };

      // mock deserialize function.
      const mockDeserialize = jest
        .fn()
        .mockImplementation((payload: any) => payload[1]);

      deserialize = mockDeserialize;

      // mock the transform to observable function.
      const mockTransformToObservable = jest
        .spyOn(server, 'transformToObservable')
        .mockImplementation(async (callback) =>
          jest.fn().mockRejectedValueOnce(),
        );

      await server.notifyHandlers('myStream', messages);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith(
        payload1,
        expect.any(RedisStreamContext),
      );
      expect(handler).toHaveBeenCalledWith(
        payload2,
        expect.any(RedisStreamContext),
      );
    });

    it("should use user provided deserialize function if it's defined", async () => {
      const stream = 'myStream';
      const payload1 = { foo: 'bar' };
      const payload2 = { baz: 'qux' };
      const messages = [
        ['1', payload1],
        ['2', payload2],
      ];

      // mock stream handler map.
      const handler = jest.fn().mockImplementation(() => {});
      server['streamHandlerMap'] = {
        [stream]: handler,
      };

      // mock deserialize function.
      const mockDeserialize = jest
        .fn()
        .mockImplementation((payload: any) => payload[1]);

      deserialize = mockDeserialize;

      // mock user provided deserialize function.
      const mockUserDeserialize = jest.fn().mockReturnValue(() => {});

      server.options = {
        serialization: {
          deserializer: mockUserDeserialize,
        },
      };

      await server.notifyHandlers('myStream', messages);

      expect(mockDeserialize).not.toHaveBeenCalled();
      expect(mockUserDeserialize).toHaveBeenCalledTimes(2);
    });

    it('should send the response from the handler to the send function', async () => {
      const stream = 'myStream';
      const payload1 = { foo: 'bar' };

      const messages = [['1', payload1]];

      // mock stream handler map.
      const handler = jest.fn().mockImplementation(() => {
        return [{ data: { foo: 'bar' }, stream: 'responseStream' }];
      });
      server['streamHandlerMap'] = {
        [stream]: handler,
      };

      // mock deserialize function.
      const mockDeserialize = jest
        .fn()
        .mockImplementation((payload: any) => payload[1]);

      deserialize = mockDeserialize;

      // mock the transform to observable function.
      const mockTransformToObservable = jest
        .spyOn(server, 'transformToObservable')
        .mockImplementation(async (callback) =>
          jest
            .fn()
            .mockResolvedValue([
              { data: { foo: 'bar' }, stream: 'responseStream' },
            ]),
        );

      // mock the send function.
      const mockSend = jest.fn();
      server['send'] = mockSend;

      await server.notifyHandlers('myStream', messages);

      expect(handler).toHaveBeenCalledTimes(1);

      expect(mockSend).toHaveBeenCalledTimes(1);
    });
    it('should handle errors by logging them', async () => {
      const messages = [['1', { foo: 'bar' }]];

      // mock the stream handler to throw an error.
      server.streamHandlerMap = {
        myStream: jest.fn().mockImplementation(() => {
          throw new Error('Boom!');
        }),
      };

      // mock the logger.
      server.logger = {
        error: jest.fn(),
      };

      await expect(
        server.notifyHandlers('myStream', messages),
      ).resolves.toBeUndefined();

      expect(server.logger.error).toHaveBeenCalledTimes(1);
      expect(server.logger.error).toHaveBeenCalledWith(new Error('Boom!'));
    });
  });

  describe('handleRespondBack', () => {
    it('should not ACK or publish anything if response is null', async () => {
      const response = null;
      const inboundContext = {};
      const isDisposed = false;
      const spyAck = jest.spyOn(server, 'handleAck');

      let result = await server.handleRespondBack({
        response,
        inboundContext,
        isDisposed,
      });

      expect(spyAck).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should only ACK if response is an empty array', async () => {
      const response = [];
      const inboundContext = {};
      const isDisposed = false;
      const spyAck = jest.spyOn(server, 'handleAck');

      await server.handleRespondBack({
        response,
        inboundContext,
        isDisposed,
      });

      expect(spyAck).toHaveBeenCalled();
    });

    it('should publish response and ACK if response is an array with one or more items', async () => {
      const response = [
        { id: 1, message: 'test' },
        { id: 2, message: 'test2' },
      ];
      const inboundContext = {};
      const isDisposed = false;
      const spyAck = jest.spyOn(server, 'handleAck');
      const spyPublishResponses = jest
        .spyOn(server, 'publishResponses')
        .mockResolvedValue(true);

      await server.handleRespondBack({
        response,
        inboundContext,
        isDisposed,
      });

      expect(spyPublishResponses).toHaveBeenCalledWith(
        response,
        inboundContext,
      );
      expect(spyAck).toHaveBeenCalled();
    });

    it('should throw an error if publishing responses fails', async () => {
      const response = [{ id: 1, message: 'test' }];
      const inboundContext = {};
      const isDisposed = false;

      const spyPublishResponses = jest.fn().mockResolvedValueOnce(false);
      server.publishResponses = spyPublishResponses;

      // mock logger
      server.logger = {
        error: jest.fn(),
      };

      await server.handleRespondBack({ response, inboundContext, isDisposed });

      expect(spyPublishResponses).toHaveBeenCalledWith(
        response,
        inboundContext,
      );

      expect(server.logger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('publishResponses', () => {
    const responseObj1 = {
      stream: 'stream-1',
      payload: {
        id: 1,
        message: 'test',
      },
    };

    const responseObj2 = {
      stream: 'stream-2',
      payload: {
        id: 2,
        message: 'test2',
      },
    };

    it('should publish responses to Redis streams', async () => {
      const responses = [responseObj1, responseObj2];
      const inboundContext = {};

      const xaddSpy = jest.fn().mockResolvedValue(true);
      server.client = {
        xadd: xaddSpy,
      };

      // mock serializer
      const serializerSpy = jest.fn().mockResolvedValueOnce(['test1', 'test2']);
      serialize = serializerSpy;

      await server.publishResponses(responses, inboundContext);

      expect(xaddSpy).toHaveBeenCalledTimes(1);
      expect(xaddSpy).toHaveBeenCalledWith(
        responseObj1.stream,
        '*',
        'test1',
        'test2',
      );
    });

    it('should use custom serializer if provided', async () => {
      const responses = [responseObj1];
      const inboundContext = {};

      const userSerializerSpy = jest.fn(() => ['test1']);

      server.options = {
        serialization: {
          serializer: userSerializerSpy,
        },
      };

      await server.publishResponses(responses, inboundContext);

      expect(userSerializerSpy).toHaveBeenCalledWith(
        responseObj1.payload,
        inboundContext,
      );
    });

    it('should return true if all responses are successfully published', async () => {
      const responses = [responseObj1];
      const inboundContext = {};

      const xaddSpy = jest.fn().mockResolvedValue(true);
      server.client = {
        xadd: xaddSpy,
      };

      // mock serializer
      const serializerSpy = jest.fn().mockResolvedValueOnce(['test1', 'test2']);
      serialize = serializerSpy;

      const result = await server.publishResponses(responses, inboundContext);

      expect(result).toBe(true);
    });

    it('should return false if publishing responses fails', async () => {
      const responses = [responseObj1];
      const inboundContext = {};

      const xaddSpy = jest.fn().mockImplementation(() => {
        throw new Error('Failed to publish response');
      });

      server.client = {
        xadd: xaddSpy,
      };

      // mock serializer
      const serializerSpy = jest.fn().mockResolvedValueOnce(['test1', 'test2']);
      serialize = serializerSpy;

      const result = await server.publishResponses(responses, inboundContext);

      expect(result).toBe(false);
    });
  });

  describe('handleAck', () => {
    it('should call client.xack with the correct arguments', async () => {
      const inboundContext = {
        getStream: jest.fn(() => 'test-stream'),
        getConsumerGroup: jest.fn(() => 'test-group'),
        getMessageId: jest.fn(() => '123'),
      };
      const xackSpy = jest.fn().mockResolvedValue(true);

      server.client = {
        xack: xackSpy,
      };

      await server.handleAck(inboundContext);

      expect(xackSpy).toHaveBeenCalledWith('test-stream', 'test-group', '123');
    });

    it('should return true if xack succeeds', async () => {
      const inboundContext = {
        getStream: jest.fn(() => 'test-stream'),
        getConsumerGroup: jest.fn(() => 'test-group'),
        getMessageId: jest.fn(() => '123'),
      };
      const xackSpy = jest.fn().mockResolvedValue(true);

      server.client = {
        xack: xackSpy,
      };

      const result = await server.handleAck(inboundContext);

      expect(result).toBe(true);
    });

    it('should return false if xack fails', async () => {
      const inboundContext = {
        getStream: jest.fn(() => 'test-stream'),
        getConsumerGroup: jest.fn(() => 'test-group'),
        getMessageId: jest.fn(() => '123'),
      };
      const xackSpy = jest.fn().mockRejectedValueOnce(false);

      server.client = {
        xack: xackSpy,
      };

      const result = await server.handleAck(inboundContext);

      expect(result).toBe(false);
    });
  });

  describe('handleError', () => {
    it('should call logger.error and close the stream when an error occurs', () => {
      const mockLogger = {
        error: jest.fn(),
      };

      const closeSpy = jest.fn();

      server.close = closeSpy;

      const ERROR_EVENT = 'error';

      const stream = {
        on: jest.fn((event: string, callback: Function) => {
          if (event === ERROR_EVENT) {
            callback(new Error('Test error'));
          }
        }),
      };

      server.logger = mockLogger;

      server.handleError(stream);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Redis instance error: Error: Test error',
      );
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should call quit method on redis and client if they exist', () => {
      const quitSpy = jest.fn();

      server.redis = {
        quit: quitSpy,
      };
      server.client = {
        quit: quitSpy,
      };

      server.close();

      expect(quitSpy).toHaveBeenCalledTimes(2);
    });

    it('should not call quit method on redis and client if they do not exist', () => {
      const quitSpy = jest.fn();

      server.redis = null;
      server.client = null;

      server.close();

      expect(quitSpy).not.toHaveBeenCalled();
    });
  });
});

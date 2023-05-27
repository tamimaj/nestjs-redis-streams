// @ts-nocheck
import { RedisStreamStrategy } from '../lib/redis.server';
import {
  ClientConstructorOptions,
  ConstructorOptions,
  RedisInstance,
} from '../lib/interfaces';
import { createRedisConnection } from '../lib/redis.utils';
import Redis from 'ioredis';
import { RedisStreamContext } from '../lib/stream.context';
import { deserialize, generateCorrelationId } from '../lib/streams.utils';
import { RedisStreamClient } from '../lib/redis.client';
import { firstValueFrom } from 'rxjs';

const constructorOptions: ClientConstructorOptions = {
  connection: { url: 'redis://localhost' },
  streams: { consumerGroup: 'group', consumer: 'consumer' },
  responseStreams: ['response-stream'],
};

jest.mock('../lib/redis.utils');
jest.mock('../lib/streams.utils');
jest.mock('ioredis');
jest.mock('rxjs');

describe('RedisStreamClient', () => {
  let client: RedisStreamClient; // class client

  beforeEach(() => {
    jest.clearAllMocks();
    // Create a new instance of RedisStreamClient before each test
    client = new RedisStreamClient(constructorOptions);
  });

  afterEach(async () => {
    // Close the client connection after each test
    await client.close();
  });

  describe('constructor', () => {
    it('should create a new instance of RedisStreamClient', () => {
      expect(client).toBeDefined();
    });

    it('should create a new instance of RedisStreamClient with default options', () => {
      const client = new RedisStreamClient();
      expect(client).toBeDefined();
    });

    it('should initialize the requestsMap', () => {
      expect(client.requestsMap).toBeDefined();
    });
  });

  describe('connect', () => {
    it('should return the existing connection if it already exists', async () => {
      const existingConnection = {
        status: 'ready',
        disconnect: jest.fn(),
      }; // Mock the existing connection

      client['connection'] = existingConnection;
      client['client'] = existingConnection;

      const connection = await client.connect();

      expect(connection).toBe(existingConnection); // Assert that the existing connection is returned
    });

    it('should create a new Redis connection and return the connection', async () => {
      // make client resolve to undefined
      client['client'] = undefined;
      client['connection'] = undefined;

      expect(client['client']).toBeUndefined();

      // mock the createRedisConnection
      createRedisConnection = jest.fn().mockReturnValue({
        status: 'ready',
        disconnect: jest.fn(),
        on: jest.fn(),
      });

      // mock the firstValueFrom
      firstValueFrom = jest.fn().mockReturnValue({
        status: 'ready',
        disconnect: jest.fn(),
        on: jest.fn(),
      });

      // mock the connect$
      client['connect$'] = jest.fn().mockReturnValue({
        status: 'ready',
        disconnect: jest.fn(),
        pipe: jest.fn().mockReturnThis(),
      });

      const connection = await client.connect();

      expect(client['client']).toBeDefined();
      expect(connection).toBeDefined();
    });
  });

  describe('getOrGenerateCorrelationId', () => {
    it('should use the correlationId from the packet if it exists', () => {
      const partialPacket = {
        pattern: 'client-streams-test',
        data: {
          data: { name: 'tamim' },
          correlationId: '1234',
          anyOtherHeadersKey: 'anyOtherHeadersValue',
        },
      };

      const result = client['getOrGenerateCorrelationId'](partialPacket);

      expect(result.correlationId).toBe('1234'); // Assert that the correlationId is taken from the packet
      expect(result.fromPacket).toBe(true); // Assert that the fromPacket flag is set to true
    });

    it('should generate a new correlationId if the packet does not have one', () => {
      const partialPacket = {
        pattern: 'client-streams-test',
        data: {
          data: { name: 'tamim' },
          anyOtherHeadersKey: 'anyOtherHeadersValue',
        },
      };

      generateCorrelationId = jest.fn().mockReturnValue('s123'); // Mock the generateCorrelationId function

      const result = client['getOrGenerateCorrelationId'](partialPacket);

      expect(result.correlationId).toBeTruthy(); // Assert that a correlationId is generated
      expect(result.fromPacket).toBe(false); // Assert that the fromPacket flag is set to false
    });
  });

  describe('handleXadd', () => {
    it('should call client.xadd with the correct arguments and return the response', async () => {
      const stream = 'my-stream';
      const serializedPayloadArray = ['field1', 'value1', 'field2', 'value2'];

      client['client'] = {
        xadd: jest.fn().mockResolvedValue('1234'),
        disconnect: jest.fn().mockReturnThis(),
      };

      const response = await client['handleXadd'](
        stream,
        serializedPayloadArray,
      );

      expect(client['client'].xadd).toHaveBeenCalledWith(
        stream,
        '*',
        'field1',
        'value1',
        'field2',
        'value2',
      );
      // Assert that xadd is called with the correct arguments
      expect(response).toBeDefined();
    });

    it('should log an error if an error occurs during xadd', async () => {
      const stream = 'my-stream';
      const serializedPayloadArray = ['field1', 'value1', 'field2', 'value2'];

      const error = new Error('XADD error');

      client['client'] = {
        xadd: jest.fn().mockRejectedValue(error),
        disconnect: jest.fn().mockReturnThis(),
      };

      const loggerErrorSpy = jest.spyOn(client.logger, 'error'); // Spy on the logger.error method

      await client['handleXadd'](stream, serializedPayloadArray);

      expect(client['client'].xadd).toHaveBeenCalledWith(
        stream,
        '*',
        'field1',
        'value1',
        'field2',
        'value2',
      ); // Assert that xadd is called with the correct arguments
      expect(loggerErrorSpy).toHaveBeenCalledWith(error); // Assert that the error is logged correctly
    });
  });

  describe('createConsumerGroup', () => {
    it('should create a new consumer group for the given stream and return true', async () => {
      const mockXgroup = jest.fn().mockResolvedValueOnce('OK');

      client.redis = {
        xgroup: mockXgroup,
        disconnect: jest.fn().mockReturnThis(),
      };

      const stream = 'mystream';
      const consumerGroup = 'mygroup';

      const result = await client['createConsumerGroup'](stream, consumerGroup);

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

      client.redis = {
        xgroup: mockXgroup,
        disconnect: jest.fn().mockReturnThis(),
      };

      const mockDebug = jest
        .spyOn(client['logger'], 'debug')
        .mockImplementation();

      const stream = 'mystream';
      const consumerGroup = 'mygroup';

      const result = await client['createConsumerGroup'](stream, consumerGroup);

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

      client.redis = {
        xgroup: mockXgroup,
        disconnect: jest.fn().mockReturnThis(),
      };

      const mockError = jest
        .spyOn(client['logger'], 'error')
        .mockImplementation();

      const stream = 'mystream';
      const consumerGroup = 'mygroup';

      const result = await client['createConsumerGroup'](stream, consumerGroup);

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

      client.redis = {
        xreadgroup: mockXreadgroup,
        disconnect: jest.fn().mockReturnThis(),
      };

      client['streamsToListenOn'] = ['mystream'];

      // mock streams options.
      client.options.streams = {
        consumerGroup: 'mygroup',
        consumer: 'myconsumer',
        block: 100,
      };

      const mockNotifyHandlers = jest
        .spyOn(client, 'notifyHandlers')
        .mockResolvedValue();

      const result = await client['listenOnStreams']();

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

      client.redis = {
        xreadgroup: mockXreadgroup,
        disconnect: jest.fn().mockReturnThis(),
      };

      // mock streams options.
      client.options.streams = {
        consumerGroup: 'mygroup',
        consumer: 'myconsumer',
        block: 100,
      };

      const mockNotifyHandlers = jest
        .spyOn(client, 'notifyHandlers')
        .mockResolvedValue();

      const result = await client['listenOnStreams']();

      expect(result).toBeUndefined();
      expect(mockNotifyHandlers).not.toHaveBeenCalled();
    });

    it('should log an error if xreadgroup throws an error', async () => {
      const mockXreadgroup = jest
        .fn()
        .mockRejectedValueOnce(new Error('Some error'));

      client.redis = {
        xreadgroup: mockXreadgroup,
        disconnect: jest.fn().mockReturnThis(),
      };
      // mock streams options.
      client.options.streams = {
        consumerGroup: 'mygroup',
        consumer: 'myconsumer',
        block: 100,
      };

      // mock handler map.
      client['streamsToListenOn'] = ['mystream'];

      const mockError = jest
        .spyOn(client['logger'], 'error')
        .mockImplementation();

      const result = await client['listenOnStreams']();
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

  describe('handleAck', () => {
    it('should call client.xack with the correct arguments', async () => {
      const inboundContext = {
        getStream: jest.fn(() => 'test-stream'),
        getConsumerGroup: jest.fn(() => 'test-group'),
        getMessageId: jest.fn(() => '123'),
      };
      const xackSpy = jest.fn().mockResolvedValue(true);

      client.client = {
        xack: xackSpy,
        disconnect: jest.fn().mockReturnThis(),
      };

      await client.handleAck(inboundContext);

      expect(xackSpy).toHaveBeenCalledWith('test-stream', 'test-group', '123');
    });

    it('should return true if xack succeeds', async () => {
      const inboundContext = {
        getStream: jest.fn(() => 'test-stream'),
        getConsumerGroup: jest.fn(() => 'test-group'),
        getMessageId: jest.fn(() => '123'),
      };
      const xackSpy = jest.fn().mockResolvedValue(true);

      client.client = {
        xack: xackSpy,
        disconnect: jest.fn().mockReturnThis(),
      };

      const result = await client.handleAck(inboundContext);

      expect(result).toBe(true);
    });

    it('should return false if xack fails', async () => {
      const inboundContext = {
        getStream: jest.fn(() => 'test-stream'),
        getConsumerGroup: jest.fn(() => 'test-group'),
        getMessageId: jest.fn(() => '123'),
      };
      const xackSpy = jest.fn().mockRejectedValueOnce(false);

      client.client = {
        xack: xackSpy,
        disconnect: jest.fn().mockReturnThis(),
      };

      const result = await client.handleAck(inboundContext);

      expect(result).toBe(false);
    });
  });

  describe('handleError', () => {
    it('should call logger.error and close the stream when an error occurs', () => {
      const mockLogger = {
        error: jest.fn(),
      };

      const closeSpy = jest.fn();

      client.close = closeSpy;

      const ERROR_EVENT = 'error';

      const stream = {
        on: jest.fn((event: string, callback: Function) => {
          if (event === ERROR_EVENT) {
            callback(new Error('Test error'));
          }
        }),
      };

      client.logger = mockLogger;

      client.handleError(stream);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Redis Streams Client Error: Test error',
      );
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should call quit method on redis and client if they exist', () => {
      const quitSpy = jest.fn();

      client.redis = {
        quit: quitSpy,
        disconnect: quitSpy,
      };
      client.client = {
        quit: quitSpy,
        disconnect: quitSpy,
      };

      client.close();

      expect(quitSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('initListener', () => {
    it('should initialize the Redis Streams Listener and create consumer groups for streams', async () => {
      const createConsumerGroupSpy = jest
        .spyOn(client as any, 'createConsumerGroup')
        .mockResolvedValue(true);
      const listenOnStreamsSpy = jest.spyOn(client as any, 'listenOnStreams');

      await client.initListener();

      expect(createConsumerGroupSpy).toHaveBeenCalledTimes(
        client.streamsToListenOn.length,
      );
      expect(createConsumerGroupSpy).toHaveBeenCalledWith(
        expect.any(String),
        client.options.streams.consumerGroup,
      );
      expect(listenOnStreamsSpy).toHaveBeenCalled();
    });
  });

  it('should not create consumer groups or start listening when there are no response streams', async () => {
    client.streamsToListenOn = []; // Set the streamsToListenOn to an empty array

    const createConsumerGroupSpy = jest.spyOn(
      client as any,
      'createConsumerGroup',
    );
    const listenOnStreamsSpy = jest.spyOn(client as any, 'listenOnStreams');

    await client.initListener();

    expect(createConsumerGroupSpy).not.toHaveBeenCalled();
    expect(listenOnStreamsSpy).not.toHaveBeenCalled();
  });

  it('should log an error when initializing the listener encounters an error', async () => {
    const error = new Error('Listener initialization error');

    client.streamsToListenOn = ['stream1'];

    jest
      .spyOn(client as any, 'createConsumerGroup')
      .mockRejectedValueOnce(error);
    const loggerErrorSpy = jest.spyOn(client.logger, 'error');

    await client.initListener();

    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Error while initializing the Redis Streams Listener from the client.',
      error,
    );
  });

  describe('notifyHandlers', () => {
    it('should process a single message with no correlationId and default deserializer', async () => {
      const stream = 'test-stream';
      const messageId = 'message1';
      const messagePayload = ['data', 'payload1'];

      const messages = [[messageId, messagePayload]];

      deserialize = jest.fn().mockResolvedValue('parsedPayload');

      const deserializeSpy = deserialize as jest.Mock;

      const getMessageHeadersSpy = jest
        .spyOn(RedisStreamContext.prototype, 'getMessageHeaders')
        .mockReturnValue({});

      const handleAckSpy = jest
        .spyOn(client as any, 'handleAck')
        .mockResolvedValue(true);

      const deliverToHandlerSpy = jest
        .spyOn(client as any, 'deliverToHandler')
        .mockResolvedValue(true);

      await client.notifyHandlers(stream, messages);

      expect(deserializeSpy).toHaveBeenCalledTimes(1); // Expect the deserialize method to be called once
      expect(deserializeSpy).toHaveBeenCalledWith(
        [messageId, messagePayload],
        expect.any(RedisStreamContext),
      );

      expect(getMessageHeadersSpy).toHaveBeenCalledTimes(1); // Expect the getMessageHeaders method to be called once

      expect(handleAckSpy).toHaveBeenCalledTimes(1); // Expect the handleAck method to be called once
      expect(handleAckSpy).toHaveBeenCalledWith(expect.any(RedisStreamContext));

      expect(deliverToHandlerSpy).not.toHaveBeenCalled(); // Expect the deliverToHandler method not to be called
    });
  });
});

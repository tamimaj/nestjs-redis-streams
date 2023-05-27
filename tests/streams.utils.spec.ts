import { RedisStreamContext } from '../lib/stream.context';
import {
  deserialize,
  serialize,
  stringifyMessage,
  parseRawMessage,
} from '../lib/streams.utils';

describe('[Stream Utils]', () => {
  let data: {};
  let rawPayload: string[];
  let ctx: RedisStreamContext;

  beforeAll(() => {
    data = {
      key1: 'value1',
      key2: 'value2',
      key3: 'value3',
      key4: 'value4',
      key5: 'value5',
    };
    rawPayload = [
      'head1',
      'head1value',
      'head2',
      'head2value',
      'data',
      '{"key1":"value1","key2":"value2","key3":"value3","key4":"value4","key5":"value5"}',
    ];
    ctx = new RedisStreamContext(['stream', '0-0', 'group', 'consumer']);
    ctx.setMessageHeaders({
      head1: 'head1value',
      head2: 'head2value',
    });
  });
  describe('[Serialize]', () => {
    test('Should panic if there is no data field on payload', async () => {
      try {
        let r = await serialize(data, ctx);
        throw new Error("didn't throw for non existing data");
      } catch (error) {
        expect(error.toString()).toContain(
          "Could not find the 'data' key in the payload.",
        );
      }
    });
    test('Should Serialize Payload with the context ', async () => {
      let serialized = await serialize({ data }, ctx);
      // console.log(serialized)
      expect(serialized[serialized.length - 1]).toEqual(JSON.stringify(data));

      let i = 0;
      let headers = ctx.getMessageHeaders();
      for (const k in headers) {
        expect(k).toEqual(serialized[i]);
        expect(headers[k]).toEqual(serialized[i + 1]);
        i += 2;
      }
    });
  });
  describe('[Deserialize]', () => {
    let ctx: RedisStreamContext;
    beforeEach(() => {
      ctx = new RedisStreamContext(['stream', '0-0', 'group', 'consumer']);
    });
    test('Should fail if there is no data set', async () => {
      try {
        let payload = await deserialize(
          [[], rawPayload.slice(0, rawPayload.length - 2)],
          ctx,
        );
        throw new Error("didn't throw for non existing data");
      } catch (error) {
        expect(error.toString()).toContain(
          "Could not find the 'data' key in the message.",
        );
      }
    });
    test('Should Deserialize and set headers to payload', async () => {
      expect(ctx.getMessageHeaders()).toBeFalsy();
      let payload = await deserialize([[], rawPayload], ctx);
      expect(ctx.getMessageHeaders()).toBeTruthy();
      expect(payload).toEqual(data);
    });
  });

  describe('stringifyMessage', () => {
    test('returns an array with the correct keys and values', () => {
      const expectedOutput = [
        'key1',
        'value1',
        'key2',
        'value2',
        'key3',
        'value3',
        'key4',
        'value4',
        'key5',
        'value5',
      ];
      const output = stringifyMessage(data);
      expect(output).toEqual(expectedOutput);
    });

    test('returns null and logs an error for invalid input', () => {
      const invalidInput = null;

      const output = stringifyMessage(invalidInput);
      expect(output).toEqual([]);
    });
  });

  describe('parseRawMessage', () => {
    it('parses a valid raw message', () => {
      const rawMessage = [
        'id',
        [
          'head1',
          'head1value',
          'head2',
          'head2value',
          'data',
          '{"key1":"value1","key2":"value2"}',
        ],
      ];

      const expectedOutput = {
        head1: 'head1value',
        head2: 'head2value',
        data: '{"key1":"value1","key2":"value2"}',
      };

      const output = parseRawMessage(rawMessage);

      expect(output).toEqual(expectedOutput);
    });

    it('returns an empty object if raw message has no payload', () => {
      const rawMessage = ['id', []];

      const expectedOutput = {};

      const output = parseRawMessage(rawMessage);

      expect(output).toEqual(expectedOutput);
    });
  });
});

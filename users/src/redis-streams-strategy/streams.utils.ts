import { RedisStreamContext } from './stream.context';

export async function deserialize(
  rawMessage: any,
  inboundContext: RedisStreamContext,
) {
  try {
    let parsedMessageObj = parseRawMessage(rawMessage);

    if (!!!parsedMessageObj?.data)
      throw new Error("Could not find the 'data' key in the message.");

    // prepare headers
    let headers = { ...parsedMessageObj };
    delete headers.data; // remove data and keep anything left as headers.
    inboundContext.setMessageHeaders(headers); // add them to context.

    // parse data. it's JSON.
    let data = await parseJson(parsedMessageObj.data); // if cannot parse it will return it as it is.

    // pass only data to handlers.
    return data;
  } catch (error) {
    console.log('Error deserialize: ', error);
  }
}

export async function serialize(
  payload: any,
  inboundContext: RedisStreamContext,
): Promise<string[]> {
  try {
    if (!!!payload?.data)
      throw new Error("Could not find the 'data' key in the payload.");

    let contextHeaders = inboundContext.getMessageHeaders();

    // if headers are exists in the payload. will use them to override
    // the headers in the inbound context. or to add new keys as headers.

    // response final headers.
    let responseObj = {
      ...contextHeaders, // headers from context
      ...payload, // headers from payload + data.
    };

    // stringify the data from object to JSON string.
    responseObj.data = JSON.stringify(payload?.data);

    let stringifiedResponse = stringifyMessage(responseObj);

    return stringifiedResponse;
  } catch (error) {
    console.log('Error serialize: ', error);
  }
}

export async function parseJson(data: string): Promise<any> {
  try {
    let parsed = JSON.parse(data);
    return parsed;
  } catch (error) {
    console.log('Could not parse JSON at deserialize', error);
    return data;
  }
}

export function extractHeadersObjFromMessage(rawMessage: any) {
  try {
    let headersObj = {};
    let payload = rawMessage[1]; // is array of [key, value, key, value]
    let headersPrefix = 'headers.';

    for (let i = 0; i < payload.length; i++) {
      if ((payload[i] as string).startsWith(headersPrefix)) {
        // assign the key without prefix to the headersObj and its value.
        headersObj[(payload[i] as string).replace(headersPrefix, '')] =
          payload[i + 1];
      }
    }

    return headersObj ?? {};
  } catch (error) {
    console.log('ERROR from extracting headers object: ', error);
  }
}

// return an object of the raw message of Redis Stream.
function parseRawMessage(rawMessage: any): any {
  try {
    let payload = rawMessage[1]; // is array of [key, value, key, value]

    let obj = {};

    for (let i = 0; i < payload.length; i += 2) {
      obj[payload[i]] = payload[i + 1];
    }

    return obj;
  } catch (error) {
    console.log('ERROR from parsing the raw message: ', error);
  }
}

// return an object of the raw message of Redis Stream.
function stringifyMessage(messageObj: any): any {
  try {
    let finalArray = [];

    for (let key in messageObj) {
      finalArray.push(key);

      // push its value
      finalArray.push(messageObj[key]);
    }

    return finalArray;
  } catch (error) {
    console.log('ERROR from stringifying the message Obj: ', error);
  }
}

import { RedisStreamContext } from './stream.context';

export async function deserialize(rawMessage: any) {
  try {
    let dataStrValue = extractDataStrFromMessage(rawMessage);

    if (!dataStrValue)
      throw new Error("Could not find the 'data' key in the message.");

    let data = await parseJson(dataStrValue); // if cannot parse it will return it as it is.

    /// TEST
    let headers = extractHeadersObjFromMessage(rawMessage);
    console.log('TEST HEADERS', headers);

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
    let contextHeaders = inboundContext.getMessageHeaders();

    let payloadHeaders = payload?.headers ?? {};

    // if headers are exists in the payload. use them to override
    // the headers in the inbound context. or to add new keys to the headers.

    // response final headers.
    let responseHeaders = {
      ...contextHeaders,
      ...payloadHeaders,
    };

    let headersArray = constructHeadersArray(responseHeaders);

    let dataStr = JSON.stringify(payload?.data);

    return [...headersArray, 'data', dataStr];
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

function extractDataStrFromMessage(rawMessage: any) {
  try {
    let payload = rawMessage[1]; // is array of [key, value, key, value]
    let dataKey = 'data';
    let dataValue: string;

    for (let i = 0; i < payload.length; i++) {
      if (payload[i] === dataKey) {
        dataValue = payload[i + 1];
      }
    }

    return dataValue || null;
  } catch (error) {
    console.log('ERROR from extracting the data from message: ', error);
  }
}

function constructHeadersArray(headersObj: any) {
  try {
    let finalArray = [];

    let headersPrefix = 'headers.';

    for (let key in headersObj) {
      finalArray.push(`${headersPrefix}${key}`);

      // push its value
      finalArray.push(headersObj[key]);
    }

    return finalArray;
  } catch (error) {
    console.log('ERROR from constructing headers array: ', error);
  }
}

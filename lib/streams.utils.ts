import { RedisStreamContext } from './stream.context';
import { Logger } from '@nestjs/common';

let logger = new Logger('RedisStreams/streams-utils');

export async function deserialize(
  rawMessage: any,
  inboundContext: RedisStreamContext,
) {
  try {
    let parsedMessageObj = parseRawMessage(rawMessage);

    if (!!!parsedMessageObj?.data)
      throw new Error("Could not find the 'data' key in the message.");

    let headers = { ...parsedMessageObj };
    delete headers.data;
    inboundContext.setMessageHeaders(headers);

    let data = await parseJson(parsedMessageObj.data);

    return data;
  } catch (error) {
    logger.error(error);
    return null;
  }
}

export async function serialize(
  payload: any,
  inboundContext: RedisStreamContext,
): Promise<string[]> {
  if (!!!payload.data)
    throw new Error("Could not find the 'data' key in the payload.");

  try {
    let contextHeaders = inboundContext.getMessageHeaders();

    let responseObj = {
      ...contextHeaders,
      ...payload,
    };

    responseObj.data = JSON.stringify(payload?.data);

    let stringifiedResponse = stringifyMessage(responseObj);

    return stringifiedResponse;
  } catch (error) {
    logger.error(error);
    return null;
  }
}

export async function parseJson(data: string): Promise<any> {
  try {
    let parsed = JSON.parse(data);
    return parsed;
  } catch (error) {
    logger.verbose(error);
    return data;
  }
}

function parseRawMessage(rawMessage: any): any {
  try {
    let payload = rawMessage[1];

    let obj = {};

    for (let i = 0; i < payload.length; i += 2) {
      obj[payload[i]] = payload[i + 1];
    }

    return obj;
  } catch (error) {
    logger.error(error);
    return null;
  }
}

function stringifyMessage(messageObj: any): any {
  try {
    let finalArray = [];

    for (let key in messageObj) {
      finalArray.push(key);
      finalArray.push(messageObj[key]);
    }

    return finalArray;
  } catch (error) {
    logger.error(error);
    return null;
  }
}

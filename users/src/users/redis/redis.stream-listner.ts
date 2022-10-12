const path = require('path');
import Redis from 'ioredis';
import { streamTopics } from './constants';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let counter = 1;

export default async function listenForMessage(lastId = '$') {
  let pub = new Redis(REDIS_URL); // differnt client connection. PUBLISHER
  let sub = new Redis(REDIS_URL); // differnt client connection. SUBSCRIBER/LISTNER
  let date = new Date();
  let time = date.toLocaleTimeString();
  let mill = date.getMilliseconds();

  console.log('Awaiting for', counter, 'call started at', time, mill);

  const results = await sub.xread(
    'BLOCK',
    0,
    'STREAMS',
    'users:microservice:test',
    lastId,
  );

  const [key, messages] = results[0];

  messages.forEach(async (message) => {
    console.log('MESSAGE: ', message);
    console.log('key: ', key);

    // let parsedMessage = JSON.parse(message[1][1]);

    console.log(message);

    // let response = await graqphQLPubSub.publish(key, {
    //   header: { correlationId: '123456789' },
    //   data: parsedMessage,
    // });
  });

  ++counter;

  /**
   *
   * WE NEED TO DECIDE WHICH TIMEOUT FUNCTION TO GO FOR OR WITHOUT ANYTHING. LATER ON REAL REDIS CLIENT IMPLEMENTATION.
   */

  // setTimeout(async () => {
  //   await listenForMessage(messages[messages.length - 1][0]);
  // }, 1000);

  // setImmediate(async () => {
  //   await listenForMessage(messages[messages.length - 1][0]);
  // });

  // process.nextTick(async () => {
  //   await listenForMessage(messages[messages.length - 1][0]);
  // });

  await listenForMessage(messages[messages.length - 1][0]);
}

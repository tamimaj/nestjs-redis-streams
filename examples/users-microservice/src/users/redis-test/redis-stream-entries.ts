import Redis from 'ioredis';

async function streamSingleEntry(redis: Redis): Promise<void> {
  try {
    const ranNum = Math.round(Math.random() * 5000).toString();

    let fakeUserObj = {
      id: ranNum.toString(),
      firstName: 'Tamim',
      lastName: 'Abbas',
    };

    let response = await redis.xadd(
      'users:create',
      '*',
      'correlationId',
      '12345687987',
      'authToken',
      'auth123Token123456789',
      'data',
      JSON.stringify(fakeUserObj),
    );

    console.log(' => Streamed one test entry with Id: ', response);
  } catch (error) {
    console.error(error);
  }
}

export async function streamTestEntries(url: string, seconds = 10000) {
  try {
    let redis = new Redis(url);

    setInterval(streamSingleEntry, seconds, redis);
  } catch (error) {
    console.error(error);
  }
}

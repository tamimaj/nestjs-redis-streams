import { lastValueFrom, Observable, of, throwError as _throw } from 'rxjs';
import * as sinon from 'sinon';
import { RedisInstance, RedisStreamStrategy } from '.';

describe('[Redis Server]', () => {
  const server = new RedisStreamStrategy({
    connection: { url: "redis://localhost" },
    streams: { consumerGroup: "group", consumer: "consumer" }
  });
  const objectToMap = obj =>
    new Map(Object.keys(obj).map(key => [key, obj[key]]) as any);

  it("should setup 2 redis clients responding", async () => {
    server.listen(() => { });
    expect((server as any).redis).toBeTruthy()
    expect((server as any).client).toBeTruthy()

    let res = await ((server as any).redis as RedisInstance).ping();
    expect(res).toEqual("PONG")
    res = await ((server as any).client as RedisInstance).ping();
    expect(res).toEqual("PONG")
  })


  describe('[handleConnection]', () => {

    it('should add handler ', async () => {
      const pattern = 'test';
      const handler = sinon.spy();
      (server as any).messageHandlers = objectToMap({
        [pattern]: handler,
      });
      await server.bindHandlers();
      expect(server.getHandlerByPattern("test")).toBeTruthy()
      let handlers = server.getHandlers()
      expect(handlers.has("test")).toBeTruthy()

    });
  });

});

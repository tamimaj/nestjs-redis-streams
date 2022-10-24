import { RedisStreamContext } from ".";

describe("[Stream Context Tests]", () => {
  let test_ctx: RedisStreamContext;
  const headers = { key: "value" }
  beforeAll(() => {
    test_ctx = new RedisStreamContext([
      "stream",
      "message_id", // message id needed for ACK.
      "group",
      "consumer",
    ]);
  })


  test("Get stream key", async () => {
    expect(test_ctx).not.toBeNull()
    expect(test_ctx.getStream()).toEqual('stream')
  })

  test("Get message id", async () => {
    expect(test_ctx).not.toBeNull()
    expect(test_ctx.getMessageId()).toEqual('message_id')
  })
  test("Get consumer group", async () => {
    expect(test_ctx).not.toBeNull()
    expect(test_ctx.getConsumerGroup()).toEqual('group')
  })
  test("Get consumer name", async () => {
    expect(test_ctx).not.toBeNull()
    expect(test_ctx.getConsumer()).toEqual('consumer')
  })
  test("Header is empty after initialization", async () => {
    expect(test_ctx).not.toBeNull()
    expect(test_ctx.getMessageHeaders()).toBeFalsy()
  })
  test("Set context header", async () => {
    expect(test_ctx).not.toBeNull()
    expect(test_ctx.setMessageHeaders(headers)).toEqual(headers)
  })
  test("Header is set", async () => {
    expect(test_ctx).not.toBeNull()
    expect(test_ctx.setMessageHeaders(headers)).toEqual(headers)
  })
})
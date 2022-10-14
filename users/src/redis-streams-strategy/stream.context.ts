import { BaseRpcContext } from '@nestjs/microservices/ctx-host/base-rpc.context';

declare type RedisStreamContextArgs = string[];

export class RedisStreamContext extends BaseRpcContext<RedisStreamContextArgs> {
  constructor(args: RedisStreamContextArgs) {
    super(args);
  }

  getStream(): string {
    return this.args[0];
  }

  getMessage(): string {
    return this.args[1];
  }

  getConsumerGroup(): string {
    return this.args[2];
  }

  getConsumer(): string {
    return this.args[3];
  }

  getReadCommand(): string {
    return this.args[4];
  }
}

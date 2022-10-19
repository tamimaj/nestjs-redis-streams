import { BaseRpcContext } from '@nestjs/microservices/ctx-host/base-rpc.context';

declare type RedisStreamContextArgs = string[];

export class RedisStreamContext extends BaseRpcContext<RedisStreamContextArgs> {
  private headers: any;

  constructor(args: RedisStreamContextArgs) {
    super(args);
  }

  getStream(): string {
    return this.args[0];
  }

  getMessageId(): string {
    return this.args[1];
  }

  getMessageHeaders(): any {
    return this.headers;
  }

  setMessageHeaders(headers: any) {
    this.headers = headers;
    return this.headers;
  }

  getConsumerGroup(): string {
    return this.args[2];
  }

  getConsumer(): string {
    return this.args[3];
  }
}

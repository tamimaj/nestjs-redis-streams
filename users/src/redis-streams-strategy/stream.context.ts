import { BaseRpcContext } from '@nestjs/microservices/ctx-host/base-rpc.context';
import { extractHeadersObjFromMessage } from './streams.utils';

declare type RedisStreamContextArgs = string[];

export class RedisStreamContext extends BaseRpcContext<RedisStreamContextArgs> {
  constructor(args: RedisStreamContextArgs) {
    super(args);
  }

  getStream(): string {
    return this.args[0];
  }

  // RAW MESSAGE for custom serialization.
  getMessage(): string {
    return this.args[1];
  }

  getMessageId(): string {
    return this.args[1][0];
  }

  getMessageHeaders(): any {
    return extractHeadersObjFromMessage(this.getMessage());
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

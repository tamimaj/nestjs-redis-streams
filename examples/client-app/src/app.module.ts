import { Module } from '@nestjs/common';
import {
  ClientConstructorOptions,
  RedisStreamClientModule,
} from '@tamimaj/nestjs-redis-streams';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Any class that implements createRedisStreamClientModuleOptions method.
// ConfigService is a good candidate.
// to be used with registerAsync, useClass.
class ClassOptions {
  createRedisStreamClientModuleOptions(): ClientConstructorOptions {
    return {
      streams: { consumer: 'api-1', block: 5000, consumerGroup: 'api' },
      connection: { url: '0.0.0.0:6379' },
      responseStreams: ['users:created', 'users:created:copy'],
    };
  }
}

@Module({
  imports: [
    // Register / forRoot.
    RedisStreamClientModule.register({
      connection: { url: '0.0.0.0:6379' },
      streams: { consumer: 'api-1', block: 5000, consumerGroup: 'api' },
      responseStreams: ['users:created', 'users:created:copy'],
    }),

    // registerAsync / forRootAsync.

    //////////////////////
    // Use Factory.     //
    //////////////////////

    // RedisStreamClientModule.registerAsync({
    //   useFactory: async () => {
    //     return {
    //       connection: { url: '0.0.0.0:6379' },
    //       streams: { consumer: 'api-1', block: 5000, consumerGroup: 'api' },
    //       responseStreams: ['users:created', 'users:created:copy'],
    //     };
    //   },
    // }),

    //////////////////////
    // Use Class.       //
    //////////////////////

    // RedisStreamClientModule.forRootAsync({
    //   useClass: ClassOptions,
    // }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

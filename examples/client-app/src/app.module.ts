import { Module } from '@nestjs/common';
import {
  ClientConstructorOptions,
  RedisStreamClientModule,
} from '@tamimaj/nestjs-redis-streams';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Any class that implements createRedisStreamClientModuleOptions method.
// ConfigService is a good candidate.
// to be used with registerAsync, useClass.
class ClassOptions {
  createRedisStreamClientModuleOptions(): ClientConstructorOptions {
    return {
      streams: {
        consumer: 'api-1',
        block: 5000,
        consumerGroup: 'api',
        // maxLen: 100,
      },
      connection: { url: '0.0.0.0:6379' },
      responseStreams: ['users:created', 'users:created:copy'],
    };
  }
}

@Module({
  imports: [
    ///////////////////////////////////
    // SYNC CONFIGURATION
    ///////////////////////////////////

    // RedisStreamClientModule.forRoot({
    //   connection: { url: '0.0.0.0:6379' },
    //   streams: { consumer: 'api-1', block: 5000, consumerGroup: 'api' },
    //   responseStreams: ['users:created', 'users:created:copy'],
    // }),

    ///////////////////////////////////////////
    // ASYNC CONFIGURATION with ConfigModule
    ///////////////////////////////////////////

    ConfigModule.forRoot(),
    RedisStreamClientModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          connection: {
            url: configService.get('REDIS_URL'),
          },
          streams: {
            consumer: configService.get('REDIS_CONSUMER'),
            consumerGroup: configService.get('REDIS_CONSUMER_GROUP'),
            block: configService.get('REDIS_MAX_BLOCK_TIME_MS'),
          },
          responseStreams: ['users:created', 'users:created:copy'],
        };
      },
      inject: [ConfigService],
    }),

    ///////////////////////////////////////////
    // ASYNC CONFIGURATION with useFactory
    ///////////////////////////////////////////

    // RedisStreamClientModule.registerAsync({
    //   useFactory: async () => {
    //     return {
    //       connection: { url: '0.0.0.0:6379' },
    //       streams: { consumer: 'api-1', block: 5000, consumerGroup: 'api' },
    //       responseStreams: ['users:created', 'users:created:copy'],
    //     };
    //   },
    // }),

    ///////////////////////////////////////////////////////////////////////////
    // ASYNC CONFIGURATION with useClass
    // class must implement createRedisStreamClientModuleOptions method.
    ///////////////////////////////////////////////////////////////////////////

    // RedisStreamClientModule.forRootAsync({
    //   useClass: ClassOptions,
    // }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module, DynamicModule, Provider, Global } from '@nestjs/common';
import {
  ClientConstructorOptions,
  RedisStreamClientModuleOptionsFactory,
  RedisStreamModuleAsyncOptions,
} from './interfaces';
import { RedisStreamClient } from './redis.client';

const REDIS_STREAM_CLIENT_MODULE_OPTIONS = 'REDIS_STREAM_CLIENT_MODULE_OPTIONS';

@Global()
@Module({})
export class RedisStreamClientCoreModule {
  static forRoot(options: ClientConstructorOptions): DynamicModule {
    return {
      module: RedisStreamClientCoreModule,
      providers: [
        {
          provide: RedisStreamClient,
          useValue: new RedisStreamClient(options),
        },
      ],
      exports: [RedisStreamClient],
    };
  }

  /* forRootAsync */
  public static forRootAsync(
    options: RedisStreamModuleAsyncOptions,
  ): DynamicModule {
    const redisStreamClientProvider: Provider = {
      provide: RedisStreamClient,
      useFactory: (options: ClientConstructorOptions) => {
        return new RedisStreamClient(options);
      },
      inject: [REDIS_STREAM_CLIENT_MODULE_OPTIONS],
    };

    return {
      module: RedisStreamClientCoreModule,
      imports: options.imports,
      providers: [
        ...this.createAsyncProviders(options),
        redisStreamClientProvider,
      ],
      exports: [redisStreamClientProvider],
    };
  }

  /* createAsyncProviders */
  public static createAsyncProviders(
    options: RedisStreamModuleAsyncOptions,
  ): Provider[] {
    if (!(options.useExisting || options.useFactory || options.useClass)) {
      throw new Error(
        'Invalid configuration. Must provide useFactory, useClass or useExisting',
      );
    }

    const providers: Provider[] = [this.createAsyncClientProvider(options)];

    if (!options.useExisting && !options.useFactory && options.useClass) {
      providers.push({ provide: options.useClass, useClass: options.useClass });
    }

    return providers
  }

  /* createAsyncOptionsProvider */
  public static createAsyncClientProvider(
    options: RedisStreamModuleAsyncOptions,
  ): Provider {
    if (!(options.useExisting || options.useFactory || options.useClass)) {
      throw new Error(
        'Invalid configuration. Must provide useFactory, useClass or useExisting',
      );
    }

    // if is a useFactory, get options then return the RedisStreamClient
    if (options.useFactory) {
      return {
        provide: REDIS_STREAM_CLIENT_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    const inject = options.useClass
      ? [options.useClass]
      : options.useExisting
      ? [options.useExisting]
      : []

    return {
      provide: REDIS_STREAM_CLIENT_MODULE_OPTIONS,
      useFactory: async (
        optionsFactory: RedisStreamClientModuleOptionsFactory,
      ) => optionsFactory.createRedisStreamClientModuleOptions(),
      inject,
    };
  }
}

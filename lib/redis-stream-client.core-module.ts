import { Module, DynamicModule, Provider, Global } from '@nestjs/common';
import {
  ClientConstructorOptions,
  RedisStreamClientModuleOptionsFactory,
  RedisStreamModuleAsyncOptions,
} from './interfaces';
import { RedisStreamClient } from './redis.client';

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
    console.log('forRootAsync options', options);

    return {
      module: RedisStreamClientCoreModule,
      imports: options.imports,
      providers: [...this.createAsyncProviders(options)], // here we let the logic to create the provider pending on the type of the
      // useFactory, useClass or useExisting
      exports: [RedisStreamClient], // this means we will export the RedisStreamClient provider
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

    if (options.useExisting || options.useFactory) {
      return [this.createAsyncClientProvider(options)];
    }

    return [
      this.createAsyncClientProvider(options),
      { provide: options.useClass, useClass: options.useClass },
    ];
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
        provide: RedisStreamClient,
        useFactory: async () => {
          const clientOptions = await options.useFactory();
          return new RedisStreamClient(clientOptions);
        },
        inject: options.inject || [],
      };
    }

    // if is a useClass or useExisting,
    // get the options from the ProvidedClass.createRedisStreamClientModuleOptions()
    // that must be implemented by the provided class.
    return {
      provide: RedisStreamClient,
      async useFactory(
        optionsFactory: RedisStreamClientModuleOptionsFactory,
      ): Promise<RedisStreamClient> {
        const options =
          await optionsFactory.createRedisStreamClientModuleOptions();
        return new RedisStreamClient(options);
      },
      inject: [options.useClass || options.useExisting],
    };
  }
}

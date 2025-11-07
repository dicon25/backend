import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { envValidationSchema } from '@/common/validation';

@Global()
@Module({ imports: [
  NestConfigModule.forRoot({
    isGlobal:    true,
    envFilePath: [
      '../../.env', '../../.env.local', '.env', '.env.local',
    ],
    validationSchema:  envValidationSchema,
    validationOptions: {
      allowUnknown: true,
      abortEarly:   false,
    },
  }),
] })
export class ConfigModule {
}

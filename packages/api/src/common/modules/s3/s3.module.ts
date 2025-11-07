import { S3Client } from '@aws-sdk/client-s3';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { LogModule } from '../log';
import { S3Service } from './s3.service';

export const S3_CLIENT = 'S3_CLIENT';

@Module({
  imports: [
    CacheModule.register(),
    LogModule,
  ],
  providers: [
    {
      provide:    S3_CLIENT,
      useFactory: () => {
        return new S3Client({
          region:      process.env.S3_REGION,
          credentials: {
            accessKeyId:     process.env.S3_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
          },
          endpoint:       process.env.S3_ENDPOINT || '',
          forcePathStyle: true,
        });
      },
    },
    S3Service,
  ],
  exports: [S3_CLIENT, S3Service],
})
export class S3Module {
}

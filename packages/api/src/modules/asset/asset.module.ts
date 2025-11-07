import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { S3Module } from '@/common/modules/s3';
import {
  DeleteAssetHandler,
  GetPresignedUrlHandler,
  UploadAssetHandler,
  UploadMultipleAssetsHandler,
} from './application/commands';
import { AssetFacade } from './application/facades';
import { CheckAssetExistsHandler, GetAssetDetailHandler } from './application/queries';
import { AssetRepository } from './infrastructure/persistence';
import { AssetController } from './presentation/controllers';

const commandHandlers = [
  UploadAssetHandler,
  UploadMultipleAssetsHandler,
  DeleteAssetHandler,
  GetPresignedUrlHandler,
];

const queryHandlers = [
  CheckAssetExistsHandler,
  GetAssetDetailHandler,
];

@Module({
  imports:   [CqrsModule, S3Module],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    AssetFacade,
    AssetRepository,
  ],
  controllers: [AssetController],
  exports:     [AssetFacade, AssetRepository],
})
export class AssetModule {
}


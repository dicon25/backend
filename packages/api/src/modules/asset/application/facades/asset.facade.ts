import { AssetDirectory } from '@modules/asset/domain/enums';
import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  DeleteAssetCommand,
  GetPresignedUrlCommand,
  GetPresignedUrlResult,
  UploadAssetCommand,
  UploadAssetResult,
  UploadMultipleAssetsCommand,
  UploadMultipleAssetsResult,
} from '../commands';
import {
  CheckAssetExistsQuery,
  CheckAssetExistsResult,
  GetAssetDetailQuery,
  GetAssetDetailResult,
} from '../queries';

@Injectable()
export class AssetFacade {
  constructor(private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus) {
  }

  async uploadAsset(file: Express.Multer.File,
    directory?: AssetDirectory | string): Promise<UploadAssetResult> {
    return this.commandBus.execute(UploadAssetCommand.from({
      file,
      path: directory,
    }));
  }

  async uploadMultipleAssets(files: Express.Multer.File[],
    directory?: AssetDirectory | string): Promise<UploadMultipleAssetsResult> {
    return this.commandBus.execute(UploadMultipleAssetsCommand.from({
      files,
      path: directory,
    }));
  }

  async deleteAsset(id: string): Promise<void> {
    return this.commandBus.execute(DeleteAssetCommand.from({ id }));
  }

  async getPresignedUrl(id: string,
    expiresIn?: number): Promise<GetPresignedUrlResult> {
    return this.commandBus.execute(GetPresignedUrlCommand.from({
      id, expiresIn,
    }));
  }

  async checkAssetExists(id?: string, key?: string): Promise<CheckAssetExistsResult> {
    return this.queryBus.execute(CheckAssetExistsQuery.from({
      id, key,
    }));
  }

  async getAssetDetail(id: string): Promise<GetAssetDetailResult> {
    return this.queryBus.execute(GetAssetDetailQuery.from({ id }));
  }
}

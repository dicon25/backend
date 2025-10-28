import { AssetEntity } from '@modules/asset/domain/entities';
import type { Asset } from '@scholub/database';

export class AssetMapper {
  static toDomain(asset: Asset): AssetEntity {
    return AssetEntity.from(asset);
  }

  static toDomainList(assets: Asset[]): AssetEntity[] {
    return assets.map(asset => this.toDomain(asset));
  }
}


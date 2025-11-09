import { AssetModule } from '@modules/asset';
import { ChatModule } from '@modules/chat';
import { DiscussionModule } from '@modules/discussion';
import { NotificationModule } from '@modules/notification';
import { PaperModule } from '@modules/paper';
import { PreferenceModule } from '@modules/preference';
import { ReactionModule } from '@modules/reaction';
import { SubscriptionModule } from '@modules/subscription';
import { UserModule } from '@modules/user';
import { Module } from '@nestjs/common';

const features = [
  AssetModule,
  UserModule,
  PaperModule,
  ReactionModule,
  DiscussionModule,
  ChatModule,
  NotificationModule,
  SubscriptionModule,
  PreferenceModule,
];

@Module({
  imports: [...features],
  exports: [...features],
})
export class FeatureModule {
}


import { AssetModule } from '@modules/asset';
import { UserModule } from '@modules/user';
import { PaperModule } from '@modules/paper';
import { ReactionModule } from '@modules/reaction';
import { DiscussionModule } from '@modules/discussion';
import { ChatModule } from '@modules/chat';
import { NotificationModule } from '@modules/notification';
import { SubscriptionModule } from '@modules/subscription';
import { PreferenceModule } from '@modules/preference';
import { AnalyticsModule } from '@modules/analytics';
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
  AnalyticsModule,
];

@Module({
  imports: [...features],
  exports: [...features],
})
export class FeatureModule {
}


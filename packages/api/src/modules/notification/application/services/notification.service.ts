import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@scholub/database';
import { PrismaService } from '@/common/modules/prisma';

export interface CreateNotificationOptions {
  userId:               string;
  type:                 NotificationType;
  message:              string;
  relatedPaperId?:      string;
  relatedDiscussionId?: string;
  relatedUserId?:       string;
}

export interface CreateBulkNotificationsOptions {
  userIds:              string[];
  type:                 NotificationType;
  message:              string;
  relatedPaperId?:      string;
  relatedDiscussionId?: string;
  relatedUserId?:       string;
}

/**
 * 통합 Notification 서비스
 * - 알림 생성 및 발송
 * - 향후 이메일, 푸시 알림 등 확장 가능
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {
  }

  /**
   * 단일 사용자에게 알림 생성
   */
  async createNotification(options: CreateNotificationOptions): Promise<void> {
    try {
      await this.prisma.notification.create({ data: {
        userId:               options.userId,
        type:                 options.type,
        message:              options.message,
        relatedPaperId:       options.relatedPaperId,
        relatedDiscussionId: options.relatedDiscussionId,
        relatedUserId:        options.relatedUserId,
      } });

      this.logger.debug(`Notification created for user ${options.userId}: ${options.type}`);

      // TODO: 향후 이메일 발송 로직 추가
      // await this.sendEmailNotification(options);
    } catch (error) {
      this.logger.error(`Failed to create notification for user ${options.userId}`, error);

      throw error;
    }
  }

  /**
   * 여러 사용자에게 동일한 알림 일괄 생성
   */
  async createBulkNotifications(options: CreateBulkNotificationsOptions): Promise<void> {
    if (options.userIds.length === 0) {
      return;
    }

    try {
      await this.prisma.notification.createMany({ data: options.userIds.map(userId => ({
        userId:               userId,
        type:                 options.type,
        message:              options.message,
        relatedPaperId:       options.relatedPaperId,
        relatedDiscussionId: options.relatedDiscussionId,
        relatedUserId:        options.relatedUserId,
      })) });

      this.logger.log(`Bulk notifications created for ${options.userIds.length} users: ${options.type}`);

      // TODO: 향후 이메일 일괄 발송 로직 추가
      // await this.sendBulkEmailNotifications(options);
    } catch (error) {
      this.logger.error(`Failed to create bulk notifications for ${options.userIds.length} users`, error);

      throw error;
    }
  }

  // TODO: 이메일 발송 로직 (향후 구현)
  // private async sendEmailNotification(options: CreateNotificationOptions): Promise<void> {
  //   // 이메일 발송 로직
  // }

  // private async sendBulkEmailNotifications(options: CreateBulkNotificationsOptions): Promise<void> {
  //   // 이메일 일괄 발송 로직
  // }
}


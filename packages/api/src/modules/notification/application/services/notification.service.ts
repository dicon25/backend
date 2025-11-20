import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType } from '@scholub/database';
import { EmailService } from '@/common/modules/email';
import { PrismaService } from '@/common/modules/prisma';
import { S3Service } from '@/common/modules/s3';

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

  constructor(private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService) {
  }

  /**
   * 단일 사용자에게 알림 생성
   */
  async createNotification(options: CreateNotificationOptions): Promise<void> {
    try {
      await this.prisma.notification.create({ data: {
        userId:              options.userId,
        type:                options.type,
        message:             options.message,
        relatedPaperId:      options.relatedPaperId,
        relatedDiscussionId: options.relatedDiscussionId,
        relatedUserId:       options.relatedUserId,
      } });

      this.logger.debug(`Notification created for user ${options.userId}: ${options.type}`);

      // 비동기로 이메일 전송 (실패해도 알림 생성은 성공)
      this.sendEmailNotification(options).catch(error => {
        this.logger.error(`Failed to send email notification for user ${options.userId}`, error);
      });
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
        userId:              userId,
        type:                options.type,
        message:             options.message,
        relatedPaperId:      options.relatedPaperId,
        relatedDiscussionId: options.relatedDiscussionId,
        relatedUserId:       options.relatedUserId,
      })) });

      this.logger.log(`Bulk notifications created for ${options.userIds.length} users: ${options.type}`);

      // 비동기로 이메일 일괄 전송 (실패해도 알림 생성은 성공)
      this.sendBulkEmailNotifications(options).catch(error => {
        this.logger.error(`Failed to send bulk email notifications for ${options.userIds.length} users`, error);
      });
    } catch (error) {
      this.logger.error(`Failed to create bulk notifications for ${options.userIds.length} users`, error);

      throw error;
    }
  }

  /**
   * 단일 사용자에게 이메일 알림 전송
   * 논문 관련 알림(RECOMMENDED_PAPER, SIMILAR_PAPER, OPPOSING_PAPER)만 이메일 전송
   */
  private async sendEmailNotification(options: CreateNotificationOptions): Promise<void> {
    // 논문 관련 알림이 아니면 이메일 전송하지 않음
    if (!options.relatedPaperId || !this.isPaperRecommendationType(options.type)) {
      return;
    }

    try {
      // 사용자 정보 조회
      const user = await this.prisma.user.findUnique({
        where:  { id: options.userId },
        select: {
          email: true, name: true,
        },
      });

      if (!user || !user.email) {
        this.logger.warn(`User ${options.userId} not found or has no email`);

        return;
      }

      // 논문 정보 조회
      const paper = await this.prisma.paper.findUnique({
        where:   { id: options.relatedPaperId },
        include: { thumbnail: true },
      });

      if (!paper) {
        this.logger.warn(`Paper ${options.relatedPaperId} not found`);

        return;
      }

      // 논문 썸네일 URL 생성
      let thumbnailUrl: string | undefined;

      if (paper.thumbnailId && paper.thumbnail) {
        thumbnailUrl = this.s3Service.getPublicUrl(paper.thumbnail.key);
      }

      // 논문 URL 생성
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const paperUrl = `${frontendUrl}/papers/${paper.id}`;
      const discussionCount = await this.prisma.discussion.count({ where: { paperId: paper.id } });

      // 카테고리 (첫 번째 카테고리 사용, 없으면 첫 번째 해시태그)
      const category = paper.categories.length > 0
        ? paper.categories[0]
        : (paper.hashtags.length > 0 ? paper.hashtags[0] : '논문');

      // 요약 (번역된 요약이 있으면 사용, 없으면 원본 요약)
      const summary = paper.translatedSummary || paper.summary;

      // 이메일 전송
      await this.emailService.sendPaperRecommendationEmail(user.email, {
        userName:       user.name,
        userEmail:      user.email,
        paperTitle:     paper.title,
        paperCategory:  category,
        paperSummary:   summary,
        paperThumbnail: thumbnailUrl,
        paperUrl,
        likeCount:      paper.likeCount,
        commentCount:   discussionCount,
      });

      this.logger.debug(`Email sent to ${user.email} for paper ${paper.id}`);
    } catch (error) {
      this.logger.error('Failed to send email notification', error);

      // 에러를 throw하지 않음 - 이메일 전송 실패가 알림 생성 실패로 이어지지 않도록
    }
  }

  /**
   * 여러 사용자에게 이메일 알림 일괄 전송
   */
  private async sendBulkEmailNotifications(options: CreateBulkNotificationsOptions): Promise<void> {
    // 논문 관련 알림이 아니면 이메일 전송하지 않음
    if (!options.relatedPaperId || !this.isPaperRecommendationType(options.type)) {
      return;
    }

    // 각 사용자에게 비동기로 이메일 전송
    await Promise.allSettled(options.userIds.map(userId => this.sendEmailNotification({
      userId:              userId,
      type:                options.type,
      message:             options.message,
      relatedPaperId:      options.relatedPaperId,
      relatedDiscussionId: options.relatedDiscussionId,
      relatedUserId:       options.relatedUserId,
    })));
  }

  /**
   * 논문 추천 관련 알림 타입인지 확인
   */
  private isPaperRecommendationType(type: NotificationType): boolean {
    return type === 'RECOMMENDED_PAPER' || type === 'SIMILAR_PAPER' || type === 'OPPOSING_PAPER';
  }
}


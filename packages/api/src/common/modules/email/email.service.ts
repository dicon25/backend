import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface SendEmailOptions {
  to:      string;
  subject: string;
  html:    string;
  from?:   string;
}

export interface PaperRecommendationEmailData {
  userName:        string;
  userEmail?:      string;
  paperTitle:      string;
  paperCategory:   string;
  paperSummary:    string;
  paperThumbnail?: string;
  paperUrl:        string;
  likeCount:       number;
  commentCount:    number;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend:    Resend;
  private readonly fromEmail: string;
  private readonly fromName:  string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY is not set. Email service will not work.');
    }

    this.resend = new Resend(apiKey);

    this.fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';

    this.fromName = this.configService.get<string>('RESEND_FROM_NAME') || 'Scholub';
  }

  /**
   * 이메일 전송 (비동기)
   * 실패해도 에러를 throw하지 않고 로그만 남김
   */
  async sendEmail(options: SendEmailOptions): Promise<void> {
    try {
      const result = await this.resend.emails.send({
        from:    options.from || `${this.fromName} <${this.fromEmail}>`,
        to:      [options.to],
        subject: options.subject,
        html:    options.html,
      });

      if (result.data) {
        this.logger.debug(`Email sent successfully to ${options.to}. ID: ${result.data.id}`);
      } else {
        this.logger.debug(`Email sent successfully to ${options.to}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);

      // 이메일 전송 실패가 전체 프로세스를 막지 않도록 에러를 throw하지 않음
    }
  }

  /**
   * 논문 추천 이메일 전송
   */
  async sendPaperRecommendationEmail(to: string, data: PaperRecommendationEmailData): Promise<void> {
    const html = this.generatePaperRecommendationTemplate(data);

    await this.sendEmail({
      to,
      subject: `📚 ${data.paperTitle}`,
      html,
    });
  }

  /**
   * 논문 추천 이메일 HTML 템플릿 생성
   */
  private generatePaperRecommendationTemplate(data: PaperRecommendationEmailData): string {
    const {
      userName,
      userEmail,
      paperTitle,
      paperCategory,
      paperSummary,
      paperThumbnail,
      paperUrl,
      likeCount,
      commentCount,
    } = data;

    // 요약이 너무 길면 잘라내기 (3줄 정도)
    const truncatedSummary = paperSummary.length > 200
      ? `${paperSummary.substring(0, 200)}...`
      : paperSummary;

    // 로고를 base64로 인코딩
    const logoBase64 = this.getLogoBase64();

    // HTML 템플릿 (Figma 디자인 기반)
    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>인기 논문</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9f9f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; padding: 32px 0;">
    <tr>
      <td align="center">
        <!-- Header Card -->
        <table width="700" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #ededed; border-radius: 16px 16px 0 0; margin-bottom: 14px;">
          <tr>
            <td style="padding: 20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <!-- Logo -->
                    <img src="data:image/svg+xml;base64,${logoBase64}" alt="Scholub" style="height: 29px; width: auto; display: block;" />
                  </td>
                  <td align="right" valign="middle">
                    <!-- User Info -->
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="right" style="padding-right: 10px;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 17px; font-weight: 500; line-height: 24px; color: #000000; padding-bottom: 2px;">
                                ${userName}
                              </td>
                            </tr>
                            <tr>
                              <td style="font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 500; line-height: 20px; color: #7d7d7d;">
                                ${userEmail || ''}
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td>
                          <!-- Avatar Placeholder -->
                          <div style="width: 40px; height: 40px; background-color: #e5e7eb; border-radius: 50%; display: inline-block; vertical-align: middle; text-align: center; line-height: 40px; font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 500; color: #6b7280;">
                            ${userName.charAt(0).toUpperCase()}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Content Card -->
        <table width="700" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #ededed; border-radius: 0 0 16px 16px;">
          <tr>
            <td style="padding: 20px 24px;">
              <!-- Title -->
              <h1 style="margin: 0 0 20px 0; font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: 700; line-height: 30px; color: #000000;">
                인기 논문
              </h1>

              <!-- Paper Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <!-- Left Column: Content -->
                        <td style="vertical-align: top; padding-right: 24px;">
                          <!-- Category Badge -->
                          <div style="margin-bottom: 4px;">
                            <span style="display: inline-block; font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 500; line-height: 16px; color: #f7971d;">
                              ${paperCategory}
                            </span>
                          </div>

                          <!-- Paper Title -->
                          <h2 style="margin: 0 0 12px 0; font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 500; line-height: 24px; color: #000000;">
                            <a href="${paperUrl}" style="color: #000000; text-decoration: none;">${paperTitle}</a>
                          </h2>

                          <!-- Paper Summary -->
                          <div style="margin-bottom: 12px; font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 500; line-height: 20px; color: #7d7d7d;">
                            ${truncatedSummary}
                          </div>

                          <!-- Engagement Metrics -->
                          <table cellpadding="0" cellspacing="0" style="margin-top: 12px;">
                            <tr>
                              <td style="padding-right: 10px;">
                                <table cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="padding-right: 4px; vertical-align: middle;">
                                      <span style="font-size: 14px; line-height: 14px;">❤️</span>
                                    </td>
                                    <td style="font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 500; line-height: 20px; color: #151515;">
                                      ${likeCount}
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td>
                                <table cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="padding-right: 4px; vertical-align: middle;">
                                      <span style="font-size: 14px; line-height: 14px;">💬</span>
                                    </td>
                                    <td style="font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 500; line-height: 20px; color: #151515;">
                                      ${commentCount}
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>

                        <!-- Right Column: Thumbnail -->
                        ${paperThumbnail
                          ? `
                        <td style="vertical-align: top; width: 170px;">
                          <img src="${paperThumbnail}" alt="${paperTitle}" style="width: 170px; height: 96px; object-fit: cover; border-radius: 8px; display: block;" />
                        </td>
                        `
                          : ''}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table width="700" cellpadding="0" cellspacing="0" style="margin-top: 14px;">
          <tr>
            <td align="center" style="padding: 24px 0;">
              <div style="font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 500; line-height: 16px; color: #7d7d7d; text-align: center;">
                <p style="margin: 0 0 4px 0;">Sent by Scholub</p>
                <p style="margin: 0;">33-4, Wonhyo-ro 97-gil, Yongsan-gu, Seoul, Korea</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    return html;
  }

  /**
   * 로고를 base64로 인코딩
   */
  private getLogoBase64(): string {
    const logoSvg = '<svg width="120" height="21" viewBox="0 0 120 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.2694 0L0 7L13.2694 14L24.1262 8.27167V16.3333H26.5388V7M4.82523 11.8767V16.5433L13.2694 21L21.7136 16.5433V11.8767L13.2694 16.3333L4.82523 11.8767Z" fill="#F7971D"/><path d="M39.8526 2.657C41.4904 2.657 42.8629 2.92833 43.9699 3.471C44.3036 3.63233 44.5159 3.87433 44.6069 4.197C44.6978 4.51967 44.6524 4.84233 44.4704 5.165C44.2884 5.50233 44.0533 5.715 43.7652 5.803C43.4771 5.87633 43.1738 5.847 42.8553 5.715C42.37 5.50967 41.9075 5.37033 41.4677 5.297C41.0279 5.209 40.5047 5.165 39.8981 5.165C39.3977 5.165 38.9579 5.22367 38.5788 5.341C38.2148 5.44367 37.9039 5.59033 37.6461 5.781C37.3883 5.957 37.1912 6.16233 37.0547 6.397C36.9334 6.617 36.8727 6.84433 36.8727 7.079V7.211C36.8727 7.48967 36.9182 7.73167 37.0092 7.937C37.1153 8.14233 37.2897 8.333 37.5324 8.509C37.7902 8.67033 38.139 8.82433 38.5788 8.971C39.0185 9.103 39.5872 9.235 40.2848 9.367C42.1805 9.74833 43.5377 10.313 44.3566 11.061C45.1755 11.809 45.585 12.7697 45.585 13.943V14.141C45.585 15.6517 45.077 16.803 44.0609 17.595C43.0449 18.387 41.5435 18.783 39.5569 18.783C38.6167 18.783 37.6992 18.673 36.8045 18.453C35.9249 18.2183 35.1818 17.9177 34.5752 17.551C34.2112 17.331 34.0065 17.0523 33.961 16.715C33.9155 16.363 33.9989 16.033 34.2112 15.725C34.4235 15.4023 34.6814 15.2043 34.9846 15.131C35.288 15.0577 35.614 15.1163 35.9628 15.307C36.4936 15.6003 37.0774 15.835 37.7144 16.011C38.3513 16.1723 39.011 16.253 39.6934 16.253C40.7398 16.253 41.498 16.077 41.9681 15.725C42.4383 15.3583 42.6733 14.9037 42.6733 14.361V14.207C42.6733 13.591 42.4231 13.1143 41.9226 12.777C41.4374 12.425 40.6488 12.1463 39.5569 11.941C38.6015 11.765 37.775 11.5597 37.0774 11.325C36.3798 11.0903 35.796 10.797 35.3259 10.445C34.8709 10.0783 34.5297 9.64567 34.3022 9.147C34.0899 8.63367 33.9838 8.01033 33.9838 7.277V7.123C33.9838 6.507 34.1051 5.92767 34.3477 5.385C34.6055 4.84233 34.9846 4.373 35.4851 3.977C35.9855 3.56633 36.5997 3.24367 37.3276 3.009C38.0556 2.77433 38.8972 2.657 39.8526 2.657Z" fill="#F7971D"/><path d="M53.5234 6.595C54.4333 6.595 55.1991 6.69033 55.8209 6.881C56.4426 7.07167 56.9734 7.30633 57.4132 7.585C57.7165 7.77567 57.8909 8.03233 57.9364 8.355C57.9819 8.67767 57.8985 8.98567 57.6862 9.279C57.5042 9.52833 57.2691 9.697 56.981 9.785C56.708 9.873 56.4199 9.829 56.1166 9.653C55.3735 9.22767 54.5091 9.015 53.5234 9.015C52.5831 9.015 51.8779 9.29367 51.4078 9.851C50.9529 10.3937 50.7254 11.237 50.7254 12.381V12.931C50.7254 14.031 50.9681 14.867 51.4533 15.439C51.9386 15.9963 52.6362 16.275 53.5461 16.275C54.6077 16.275 55.5327 16.0623 56.3213 15.637C56.6246 15.4757 56.9279 15.4317 57.2312 15.505C57.5497 15.5637 57.7923 15.7397 57.9591 16.033C58.1259 16.3263 58.1866 16.6343 58.1411 16.957C58.1108 17.2797 57.9364 17.5437 57.6179 17.749C57.1478 18.0423 56.5564 18.277 55.8436 18.453C55.146 18.629 54.3726 18.717 53.5234 18.717C51.7339 18.717 50.3387 18.2403 49.3378 17.287C48.3369 16.3337 47.8365 14.8817 47.8365 12.931V12.381C47.8365 10.4303 48.3293 8.97833 49.3151 8.025C50.316 7.07167 51.7187 6.595 53.5234 6.595Z" fill="#F7971D"/><path d="M61.8568 2.217C62.2056 2.217 62.5165 2.31233 62.7894 2.503C63.0776 2.679 63.2216 2.95767 63.2216 3.339V8.245H63.2671C63.4491 7.96633 63.6766 7.72433 63.9495 7.519C64.2225 7.299 64.5182 7.123 64.8367 6.991C65.1703 6.859 65.5191 6.76367 65.8831 6.705C66.247 6.63167 66.6034 6.595 66.9522 6.595C68.2867 6.595 69.3483 6.97633 70.1369 7.739C70.9255 8.487 71.3197 9.60167 71.3197 11.083V17.507C71.3197 17.903 71.1757 18.1963 70.8875 18.387C70.5994 18.5777 70.2658 18.673 69.8867 18.673C69.5227 18.673 69.1891 18.5777 68.8858 18.387C68.5976 18.1963 68.4536 17.903 68.4536 17.507V11.677C68.4536 11.149 68.3929 10.7163 68.2716 10.379C68.1503 10.027 67.9834 9.75567 67.7711 9.565C67.5588 9.35967 67.301 9.22033 66.9977 9.147C66.7096 9.059 66.3987 9.015 66.0651 9.015C65.7769 9.015 65.4736 9.059 65.1552 9.147C64.8367 9.235 64.541 9.389 64.268 9.609C64.0102 9.829 63.7903 10.1223 63.6083 10.489C63.4415 10.8557 63.3581 11.3103 63.3581 11.853V17.507C63.3581 17.903 63.214 18.1963 62.9259 18.387C62.6378 18.5777 62.3041 18.673 61.925 18.673C61.5611 18.673 61.2274 18.5777 60.9241 18.387C60.636 18.1963 60.4919 17.903 60.4919 17.507V3.339C60.4919 2.95767 60.6284 2.679 60.9014 2.503C61.1895 2.31233 61.508 2.217 61.8568 2.217Z" fill="#F7971D"/><path d="M79.8295 6.595C81.6796 6.595 83.1203 7.08633 84.1515 8.069C85.1827 9.037 85.6983 10.4743 85.6983 12.381V12.931C85.6983 14.8377 85.1827 16.2823 84.1515 17.265C83.1203 18.233 81.6796 18.717 79.8295 18.717C77.9793 18.717 76.5387 18.233 75.5074 17.265C74.4762 16.2823 73.9606 14.8377 73.9606 12.931V12.381C73.9606 10.4743 74.4762 9.037 75.5074 8.069C76.5387 7.08633 77.9793 6.595 79.8295 6.595ZM79.8295 9.015C78.7982 9.015 78.04 9.28633 77.5547 9.829C77.0846 10.3717 76.8495 11.237 76.8495 12.425V12.887C76.8495 14.075 77.0846 14.9403 77.5547 15.483C78.04 16.0257 78.7982 16.297 79.8295 16.297C80.8607 16.297 81.6114 16.0257 82.0815 15.483C82.5667 14.9403 82.8094 14.075 82.8094 12.887V12.425C82.8094 11.237 82.5667 10.3717 82.0815 9.829C81.6114 9.28633 80.8607 9.015 79.8295 9.015Z" fill="#F7971D"/><path d="M89.8929 2.217C90.2721 2.217 90.6057 2.31233 90.8938 2.503C91.182 2.69367 91.326 2.99433 91.326 3.405V17.485C91.326 17.8957 91.182 18.1963 90.8938 18.387C90.6057 18.5777 90.2721 18.673 89.8929 18.673C89.5138 18.673 89.1802 18.5777 88.892 18.387C88.6039 18.1963 88.4598 17.8957 88.4598 17.485V3.405C88.4598 2.99433 88.6039 2.69367 88.892 2.503C89.1802 2.31233 89.5138 2.217 89.8929 2.217Z" fill="#F7971D"/><path d="M96.0659 6.727C96.4298 6.727 96.7559 6.82233 97.044 7.013C97.3473 7.20367 97.499 7.497 97.499 7.893V13.657C97.499 14.185 97.5596 14.625 97.6809 14.977C97.8023 15.3143 97.9691 15.5857 98.1814 15.791C98.3937 15.9817 98.6439 16.121 98.9321 16.209C99.2202 16.2823 99.5311 16.319 99.8647 16.319C100.153 16.319 100.449 16.275 100.752 16.187C101.07 16.099 101.358 15.945 101.616 15.725C101.874 15.505 102.086 15.2117 102.253 14.845C102.435 14.4783 102.526 14.0237 102.526 13.481V7.893C102.526 7.497 102.67 7.20367 102.958 7.013C103.246 6.82233 103.58 6.727 103.959 6.727C104.323 6.727 104.649 6.82233 104.937 7.013C105.241 7.20367 105.392 7.497 105.392 7.893V17.551C105.392 17.9323 105.248 18.2183 104.96 18.409C104.687 18.585 104.376 18.673 104.027 18.673C103.679 18.673 103.36 18.585 103.072 18.409C102.799 18.2183 102.663 17.9323 102.663 17.551V17.089H102.617C102.435 17.3823 102.208 17.6317 101.935 17.837C101.662 18.0423 101.358 18.211 101.025 18.343C100.706 18.475 100.365 18.5703 100.001 18.629C99.6524 18.7023 99.3112 18.739 98.9775 18.739C97.6582 18.739 96.6042 18.365 95.8156 17.617C95.0271 16.8543 94.6328 15.7323 94.6328 14.251V7.893C94.6328 7.497 94.7768 7.20367 95.065 7.013C95.3531 6.82233 95.6867 6.727 96.0659 6.727Z" fill="#F7971D"/><path d="M110.241 2.217C110.62 2.217 110.954 2.31233 111.242 2.503C111.53 2.69367 111.674 2.987 111.674 3.383V8.047C111.872 7.76833 112.114 7.53367 112.402 7.343C112.706 7.15233 113.009 7.00567 113.312 6.903C113.631 6.78567 113.942 6.705 114.245 6.661C114.563 6.617 114.851 6.595 115.109 6.595C116.762 6.595 117.991 7.08633 118.794 8.069C119.598 9.037 120 10.467 120 12.359V12.931C120 13.8843 119.879 14.7277 119.636 15.461C119.393 16.1797 119.052 16.781 118.612 17.265C118.173 17.749 117.642 18.1157 117.02 18.365C116.413 18.5997 115.731 18.717 114.973 18.717C114.139 18.717 113.441 18.5703 112.88 18.277C112.319 17.9837 111.894 17.6023 111.606 17.133H111.538V17.551C111.538 17.9323 111.394 18.2183 111.106 18.409C110.833 18.585 110.522 18.673 110.173 18.673C109.824 18.673 109.506 18.585 109.218 18.409C108.945 18.2183 108.808 17.9323 108.808 17.551V3.383C108.808 2.987 108.952 2.69367 109.24 2.503C109.544 2.31233 109.877 2.217 110.241 2.217ZM114.541 8.971C113.585 8.971 112.857 9.24233 112.357 9.785C111.872 10.313 111.629 10.995 111.629 11.831V13.877C111.629 14.185 111.705 14.4857 111.856 14.779C112.008 15.0723 112.213 15.3363 112.471 15.571C112.728 15.8057 113.039 15.9963 113.403 16.143C113.767 16.2897 114.169 16.363 114.609 16.363C116.307 16.363 117.157 15.197 117.157 12.865V12.425C117.157 11.281 116.959 10.423 116.565 9.851C116.171 9.26433 115.496 8.971 114.541 8.971Z" fill="#F7971D"/></svg>';

    return Buffer.from(logoSvg).toString('base64');
  }
}

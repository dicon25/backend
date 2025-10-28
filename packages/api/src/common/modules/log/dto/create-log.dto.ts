import type { LogLevel } from '@scholub/database';

export class CreateLogDto {
  level:   LogLevel;
  service: string;
  message: string;

  stackTrace?: string;
  context?:    Record<string, unknown>;

  userId?:    string;
  requestId?: string;
  ip?:        string;
  userAgent?: string;
}

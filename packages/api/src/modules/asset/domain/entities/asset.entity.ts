import { DataClass } from 'dataclasses';

export class AssetEntity extends DataClass {
  id: string;

  filename:         string;
  originalFilename: string;
  contentType:      string;
  fileSize:         bigint;
  key:              string;

  createdAt: Date;

  get url(): string {
    const endpoint = process.env.S3_ENDPOINT || '';
    const bucket = process.env.S3_BUCKET_NAME || '';

    if (endpoint.endsWith('/')) {
      return `${endpoint}${bucket}/${this.key}`;
    }

    return `${endpoint}/${bucket}/${this.key}`;
  }

  get sizeInMB(): number {
    return Number(this.fileSize) / (1024 * 1024);
  }

  get sizeInKB(): number {
    return Number(this.fileSize) / 1024;
  }

  isImage(): boolean {
    return this.contentType.startsWith('image/');
  }

  isVideo(): boolean {
    return this.contentType.startsWith('video/');
  }

  isPDF(): boolean {
    return this.contentType === 'application/pdf';
  }
}

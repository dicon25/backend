import {
  CompletedPart,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CacheTTL } from '@nestjs/cache-manager';
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { lookup } from 'mime-types';
import { v4 as uuid } from 'uuid';
import { LogService } from '../log';

interface UploadOptions {
  file:       Buffer;
  filename:   string;
  mimeType?:  string;
  directory?: string;
}

interface PresignedUrlOptions {
  expiresIn?: number;
  type?:      'download' | 'view';
}

@Injectable()
export class S3Service {
  private readonly bucket = process.env.S3_BUCKET_NAME || '';
  private readonly endpoint = process.env.S3_ENDPOINT || '';
  private readonly publicUrl = process.env.S3_PUBLIC_URL || '';

  constructor(@Inject('S3_CLIENT') private readonly s3: S3Client,
    private readonly logger: LogService) {
  }

  async upload(options: UploadOptions): Promise<string> {
    const {
      file,
      filename,
      mimeType,
      directory,
    } = options;

    const ext = filename.split('.').pop();
    const uniqueFilename = `${uuid()}.${ext}`;
    const key = directory ? `${directory}/${uniqueFilename}` : uniqueFilename;
    const contentType = mimeType || lookup(filename) || 'application/octet-stream';

    try {
      await this.s3.send(new PutObjectCommand({
        Bucket:      this.bucket,
        Key:         key,
        Body:        file,
        ContentType: contentType,
      }));

      return key;
    } catch (err) {
      this.logger.error('S3', `Upload Failed: ${key}`, err);

      throw new InternalServerErrorException('Failed to upload file to S3');
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.s3.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key:    key,
      }));
    } catch (err) {
      if (this.isNotFoundError(err)) {
        this.logger.warn('S3', `File not found during delete: ${key}`, err);

        return;
      }

      this.logger.error('S3', `Delete Failed: ${key}`, err);

      throw new InternalServerErrorException('Failed to delete from S3');
    }
  }

  async deleteFolder(prefix: string): Promise<{
    deletedObjectsCount: number;
  }> {
    try {
      const folderPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;

      let continuationToken: string | undefined;
      let totalDeletedObjects = 0;

      do {
        const listResponse = await this.s3.send(new ListObjectsV2Command({
          Bucket:            this.bucket,
          Prefix:            folderPrefix,
          ContinuationToken: continuationToken,
          MaxKeys:           1000,
        }));

        if (!listResponse.Contents || listResponse.Contents.length === 0) {
          break;
        }

        const objectsToDelete = listResponse.Contents.filter(obj => obj.Key).map(obj => ({ Key: obj.Key! }));

        if (objectsToDelete.length > 0) {
          const deleteResponse = await this.s3.send(new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: {
              Objects: objectsToDelete,
              Quiet:   false,
            },
          }));

          totalDeletedObjects += deleteResponse.Deleted?.length || 0;

          if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
            this.logger.warn('S3', `Some objects failed to delete: ${JSON.stringify(deleteResponse.Errors)}`);
          }
        }

        continuationToken = listResponse.NextContinuationToken;
      } while (continuationToken);

      return { deletedObjectsCount: totalDeletedObjects };
    } catch (err) {
      this.logger.error('S3', `Delete Folder Failed: ${prefix}`, err);

      throw new InternalServerErrorException('Failed to delete folder from S3');
    }
  }

  getPublicUrl(key: string): string {
    if (this.publicUrl) {
      if (this.publicUrl.endsWith('/')) {
        return `${this.publicUrl}${key}`;
      }
      return `${this.publicUrl}/${key}`;
    }

    // Fallback to endpoint if publicUrl is not set
    if (this.endpoint.endsWith('/')) {
      return `${this.endpoint}${this.bucket}/${key}`;
    }

    return `${this.endpoint}/${this.bucket}/${key}`;
  }

  @CacheTTL(3600)
  async getPresignedUrl(key: string, options: PresignedUrlOptions = {}): Promise<string> {
    const { expiresIn = 3600, type = 'download' } = options;
    const contentType = lookup(key.split('/').pop() || key) || 'application/octet-stream';

    const command = new GetObjectCommand({
      Bucket:                     this.bucket,
      Key:                        key,
      ResponseContentDisposition: type === 'download' ? 'attachment' : 'inline',
      ResponseContentType:        contentType,
    });

    try {
      return await getSignedUrl(this.s3, command, { expiresIn });
    } catch (err) {
      this.logger.error('S3', `Get Presigned URL Failed: ${key}`, err);

      throw new InternalServerErrorException('Failed to generate presigned URL');
    }
  }

  @CacheTTL(600)
  async getUploadPresignedUrl(key: string,
    expiresIn = 600): Promise<{
    key: string; url: string; contentType: string;
  }> {
    const contentType = lookup(key) || 'application/octet-stream';

    const command = new PutObjectCommand({
      Bucket:      this.bucket,
      Key:         key,
      ContentType: contentType,
    });

    try {
      const url = await getSignedUrl(this.s3, command, { expiresIn });

      return {
        key, url, contentType,
      };
    } catch (err) {
      this.logger.error('S3', `Get Upload Presigned URL Failed: ${key}`, err);

      throw new InternalServerErrorException('Failed to get presigned URL for upload');
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key:    key,
      }));

      return true;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return false;
      }

      this.logger.error('S3', `Check File Exists Failed: ${key}`, error);

      throw new InternalServerErrorException('Failed to check file existence in S3');
    }
  }

  async initiateMultipartUpload(key: string) {
    const command = new CreateMultipartUploadCommand({
      Bucket: this.bucket,
      Key:    key,
    });

    return this.s3.send(command);
  }

  async uploadPart(key: string, uploadId: string, body: Buffer, partNumber: number) {
    const command = new UploadPartCommand({
      Bucket:     this.bucket,
      Key:        key,
      Body:       body,
      UploadId:   uploadId,
      PartNumber: partNumber,
    });

    return this.s3.send(command);
  }

  async completeMultipartUpload(key: string, uploadId: string, parts: CompletedPart[]) {
    const command = new CompleteMultipartUploadCommand({
      Bucket:          this.bucket,
      Key:             key,
      UploadId:        uploadId,
      MultipartUpload: { Parts: parts },
    });

    return this.s3.send(command);
  }

  private isNotFoundError(error: unknown): boolean {
    if (error instanceof Error && 'name' in error && error.name === 'NotFound') {
      return true;
    }

    if (typeof error === 'object' && error !== null && '$metadata' in error) {
      const metadata = (error as {
        $metadata?: {
          httpStatusCode?: number;
        };
      }).$metadata;

      return metadata?.httpStatusCode === 404;
    }

    return false;
  }
}

import { Temporal } from '@js-temporal/polyfill';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@scholub/database';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import type { Request, Response } from 'express';
import { APIResponseDto, type HttpMethod } from '../dto/response.dto';
import { LogService } from '../modules/log/log.service';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LogService) {
  }

  @SentryExceptionCaptured()
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let details = 'An unexpected database error occurred.';

    switch (exception.code) {
      case 'P2000':

        status = HttpStatus.BAD_REQUEST;

        details = 'Input value is too long. Please use a shorter value.';

        break;

      case 'P2002':

        status = HttpStatus.CONFLICT;

        details = `The value for '${(exception.meta?.target as string[])?.[0] || 'field'}' already exists. Please use a different one.`;

        break;

      case 'P2003':

        status = HttpStatus.BAD_REQUEST;

        details = `Invalid reference: related record for '${exception.meta?.field_name || 'foreign key'}' does not exist.`;

        break;

      case 'P2010':

        status = HttpStatus.BAD_REQUEST;

        details = 'Invalid query or parameters. Please contact support.';

        break;

      case 'P2014':

        status = HttpStatus.BAD_REQUEST;

        details = 'Data integrity error. Please verify related records.';

        break;

      case 'P2023':

        status = HttpStatus.BAD_REQUEST;

        details = 'Invalid data format. Please check your JSON data.';

        break;

      case 'P2025':

        status = HttpStatus.NOT_FOUND;

        details = 'The requested record could not be found. It may have been deleted.';

        break;

      default:

        details = 'An unexpected database error occurred.';

        break;
    }

    const apiResponse = APIResponseDto.create({
      status,
      method:   request.method as HttpMethod,
      instance: request.url,
      details,
      data:     null,
    });

    response.status(apiResponse.status).json(apiResponse);

    this.logDetailedError(exception, request);
  }

  private logDetailedError(exception: Prisma.PrismaClientKnownRequestError, request: Request) {
    const timestamp = Temporal.Now.instant().toString();

    const errorDetails = {
      timestamp,
      exception: {
        name:    exception.name,
        code:    exception.code,
        message: exception.message,
        meta:    exception.meta,
        stack:   exception.stack?.split('\n').slice(0, 10)
          .join('\n'),
      },
      request: {
        method:  request.method,
        url:     request.url,
        headers: request.headers,
        body:    request.body,
      },
    };

    this.logger.error('PrismaException',
      `🚨 Prisma Exception Log\n${JSON.stringify(errorDetails, null, 2)}`);
  }
}

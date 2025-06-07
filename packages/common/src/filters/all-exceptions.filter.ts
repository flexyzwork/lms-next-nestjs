import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ZodError } from 'zod';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | object;
    let error: string;

    if (exception instanceof HttpException) {
      // HTTP 예외 처리
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || exception.name;
      } else {
        message = exceptionResponse;
        error = exception.name;
      }
    } else if (exception instanceof ZodError) {
      // Zod 검증 에러 처리
      status = HttpStatus.BAD_REQUEST;
      error = 'Validation Error';

      const zodErrors = exception.errors.map((err) => {
        const path = err.path.length > 0 ? err.path.join('.') : 'root';
        return `${path}: ${err.message}`;
      });

      message = {
        message: '입력 데이터 검증에 실패했습니다',
        errors: zodErrors,
        details: exception.errors,
      };
    } else if (exception instanceof PrismaClientKnownRequestError) {
      // Prisma 에러 처리
      status = HttpStatus.BAD_REQUEST;

      switch (exception.code) {
        case 'P2002':
          message = '이미 존재하는 데이터입니다';
          error = 'Duplicate Entry';
          break;
        case 'P2025':
          message = '요청한 데이터를 찾을 수 없습니다';
          error = 'Record Not Found';
          status = HttpStatus.NOT_FOUND;
          break;
        case 'P2003':
          message = '관련된 데이터가 존재하여 삭제할 수 없습니다';
          error = 'Foreign Key Constraint';
          break;
        default:
          message = '데이터베이스 오류가 발생했습니다';
          error = 'Database Error';
      }
    } else {
      // 기타 예외 처리
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = '서버 내부 오류가 발생했습니다';
      error = 'Internal Server Error';
    }

    // 에러 로깅
    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : exception,
    );

    const errorResponse = {
      success: false,
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // 개발 환경에서만 스택 트레이스 포함
    if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
      (errorResponse as any).stack = exception.stack;
    }

    response.status(status).json(errorResponse);
  }
}

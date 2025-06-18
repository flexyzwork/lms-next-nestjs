import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/binary';
import { Request, Response } from 'express';
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
    let details: string | undefined;

    if (exception instanceof HttpException) {
      // HTTP 예외 처리
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        error = responseObj.error || exception.name;
        details = responseObj.details;
      } else {
        message = exceptionResponse;
        error = exception.name;
      }

      // UnauthorizedException 특별 처리 (JWT 인증 에러 등)
      if (exception instanceof UnauthorizedException) {
        const responseObj = exceptionResponse as any;
        
        // 구조화된 에러 응답이 있는 경우 (JWT Guard에서 온 경우)
        if (responseObj && typeof responseObj === 'object' && responseObj.details) {
          message = responseObj.message;
          error = responseObj.error;
          details = responseObj.details;
        } else {
          // 기본 UnauthorizedException인 경우
          message = message || '인증이 필요합니다';
          error = error || 'Unauthorized';
          details = '유효한 인증 토큰을 제공해주세요.';
        }
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
          details = '중복된 값이 감지되었습니다. 다른 값을 사용해주세요.';
          break;
        case 'P2025':
          message = '요청한 데이터를 찾을 수 없습니다';
          error = 'Record Not Found';
          status = HttpStatus.NOT_FOUND;
          details = '해당하는 데이터가 존재하지 않습니다.';
          break;
        case 'P2003':
          message = '관련된 데이터가 존재하여 삭제할 수 없습니다';
          error = 'Foreign Key Constraint';
          details = '참조하는 다른 데이터가 있어 삭제할 수 없습니다.';
          break;
        default:
          message = '데이터베이스 오류가 발생했습니다';
          error = 'Database Error';
          details = process.env.NODE_ENV === 'development' 
            ? `Prisma Error Code: ${exception.code}` 
            : '데이터베이스 처리 중 문제가 발생했습니다.';
      }
    } else {
      // 기타 예외 처리
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = '서버 내부 오류가 발생했습니다';
      error = 'Internal Server Error';
      details = process.env.NODE_ENV === 'development' 
        ? (exception as Error)?.message || '알 수 없는 오류'
        : '서버에서 예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }

    // 에러 로깅
    const logMessage = `${request.method} ${request.url}`;
    const logContext = {
      statusCode: status,
      error,
      message,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
      userId: (request as any).user?.userId || 'anonymous',
    };

    if (status >= 500) {
      this.logger.error(logMessage, exception instanceof Error ? exception.stack : exception, logContext);
    } else if (status === 401 || status === 403) {
      this.logger.warn(logMessage, logContext);
    } else {
      this.logger.debug(logMessage, logContext);
    }

    const errorResponse: any = {
      success: false,
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // details가 있으면 추가
    if (details) {
      errorResponse.details = details;
    }

    // 개발 환경에서만 스택 트레이스 포함
    if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    // CORS 헤더 설정 (에러 응답에도 적용)
    response.header('Access-Control-Allow-Origin', request.get('Origin') || '*');
    response.header('Access-Control-Allow-Credentials', 'true');

    response.status(status).json(errorResponse);
  }
}

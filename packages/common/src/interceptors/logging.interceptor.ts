import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const expressRequest = request as Request & {
      ip?: string;
      get?: (header: string) => string | undefined;
    };

    const method = request.method || 'UNKNOWN';
    const url = request.url || 'unknown';
    const ip = expressRequest.ip || '';
    const userAgent = expressRequest.get?.('User-Agent') || '';
    const startTime = Date.now();

    this.logger.log(`--> ${method} ${url} ${ip} ${userAgent}`);

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        const duration = Date.now() - startTime;

        this.logger.log(
          `<-- ${method} ${url} ${statusCode} ${duration}ms`,
        );
      }),
    );
  }
}

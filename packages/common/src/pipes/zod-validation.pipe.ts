import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException, Logger } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  private readonly logger = new Logger(ZodValidationPipe.name);

  constructor(private schema: ZodSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    try {
      // 빈 객체나 null 값 처리
      if (!value || typeof value !== 'object') {
        throw new BadRequestException('요청 본문이 필요합니다');
      }

      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        this.logger.error(`Validation failed for ${metadata.type}:`, {
          errors: error.errors,
          receivedData: JSON.stringify(value)
        });

        const errorMessages = error.errors.map((err) => {
          const field = err.path.join('.') || 'root';
          let message = err.message;
          
          // 한국어 에러 메시지 개선
          if (err.code === 'invalid_type') {
            if (err.expected === 'string' && err.received === 'undefined') {
              message = '필수 입력 항목입니다';
            } else {
              message = `${err.expected} 타입이 필요하지만 ${err.received} 타입을 받았습니다`;
            }
          } else if (err.code === 'too_small') {
            if (err.type === 'string') {
              message = `최소 ${err.minimum}자 이상 입력해주세요`;
            }
          } else if (err.code === 'too_big') {
            if (err.type === 'string') {
              message = `최대 ${err.maximum}자까지 입력 가능합니다`;
            }
          } else if (err.code === 'invalid_string') {
            if (err.validation === 'email') {
              message = '올바른 이메일 형식이 아닙니다';
            }
          }

          return {
            field,
            message,
            code: err.code,
            received: err.code === 'invalid_type' ? err.received : undefined,
          };
        });

        const errorResponse = {
          message: '입력 데이터 검증에 실패했습니다',
          errors: errorMessages,
          timestamp: new Date().toISOString(),
        };

        throw new BadRequestException(errorResponse);
      }
      
      this.logger.error('Unexpected validation error:', error);
      throw new BadRequestException('데이터 검증 중 오류가 발생했습니다');
    }
  }
}

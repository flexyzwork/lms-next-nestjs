import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException, Logger } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  private readonly logger = new Logger(ZodValidationPipe.name);

  constructor(private schema: ZodSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    try {
      // 스키마가 없는 경우 원본 값 반환 (개발 중 안전장치)
      if (!this.schema) {
        this.logger.warn(`⚠️ 스키마가 정의되지 않았습니다 - ${metadata.type}:${metadata.metatype?.name}`);
        return value;
      }

      // GET 요청의 경우 빈 쿼리 객체도 허용
      if (metadata.type === 'query' && (!value || Object.keys(value).length === 0)) {
        const parsedValue = this.schema.parse({});
        return parsedValue;
      }

      // 빈 객체나 null 값 처리 (POST/PUT 요청용)
      if (metadata.type === 'body' && (!value || typeof value !== 'object')) {
        throw new BadRequestException('요청 본문이 필요합니다');
      }

      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        this.logger.error(`데이터 검증 실패 - ${metadata.type}:`);
        this.logger.error('수신된 데이터:', JSON.stringify(value, null, 2));
        this.logger.error('검증 오류 상세:');
        error.errors.forEach((err, index) => {
          this.logger.error(`  ${index + 1}. 필드: ${err.path.join('.') || 'root'}`);
          this.logger.error(`     코드: ${err.code}`);
          this.logger.error(`     메시지: ${err.message}`);
          if (err.code === 'invalid_type') {
            this.logger.error(`     예상: ${err.expected}, 수신: ${err.received}`);
          }
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
            } else if (err.validation === 'uuid') {
              message = '올바른 UUID 형식이 아닙니다';
            }
          } else if (err.code === 'custom') {
            // CUID2 검증 실패 등 커스텀 검증 오류
            if (err.message.includes('CUID2')) {
              message = '올바른 ID 형식이 아닙니다 (CUID2 26자, 예: cm1a2b3c4d5e6f7g8h9i0j1k2l)';
            } else if (err.message.includes('ID 형식')) {
              message = err.message;
            }
          }

          return {
            field,
            message,
            code: err.code,
            received: err.code === 'invalid_type' ? err.received : undefined,
          };
        });

        // 단일 오류인 경우 간단한 메시지를 사용
        if (errorMessages.length === 1) {
          throw new BadRequestException(errorMessages[0].message);
        }
        
        // 여러 오류인 경우 상세 정보 제공
        const errorResponse = {
          message: '입력 데이터 검증에 실패했습니다',
          errors: errorMessages,
          timestamp: new Date().toISOString(),
        };

        throw new BadRequestException(errorResponse);
      }
      
      this.logger.error('Unexpected validation error:');
      this.logger.error('Error details:', {
        name: error.constructor.name,
        message: error.message,
        stack: error.stack,
        metadata,
        receivedValue: value
      });
      throw new BadRequestException('데이터 검증 중 오류가 발생했습니다');
    }
  }
}

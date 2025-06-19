# ⚠️ 이 디렉토리는 더 이상 사용되지 않습니다

모든 스키마는 `@packages/schemas`로 이동되었습니다.

## 사용법

```typescript
// ✅ 올바른 방법
import { LoginDto, registerSchema } from '@packages/schemas';
import { CourseDto, createCourseSchema } from '@packages/schemas';
import { PaginationDto, paginationSchema } from '@packages/schemas';

// ❌ 더 이상 사용하지 마세요
import { LoginDto } from '@packages/common';
```

## 백업 파일들

이 디렉토리의 `.backup` 파일들은 마이그레이션 참고용으로만 유지됩니다.
리팩토링이 완료되면 삭제할 예정입니다.

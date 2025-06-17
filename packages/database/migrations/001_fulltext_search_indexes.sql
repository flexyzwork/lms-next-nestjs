-- PostgreSQL 전체 텍스트 검색 인덱스 생성
-- Prisma의 @@fulltext가 지원되지 않으므로 직접 SQL로 구현

-- 1. 강의 테이블 전체 텍스트 검색 인덱스
-- GIN 인덱스를 사용한 한국어/영어 혼합 검색 지원
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_fulltext_search 
ON courses USING gin(
  to_tsvector('simple', 
    COALESCE(title, '') || ' ' || 
    COALESCE(description, '') || ' ' ||
    COALESCE("teacherName", '') || ' ' ||
    COALESCE(category, '')
  )
);

-- 2. 섹션 테이블 전체 텍스트 검색 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sections_fulltext_search 
ON sections USING gin(
  to_tsvector('simple', 
    COALESCE("sectionTitle", '') || ' ' || 
    COALESCE("sectionDescription", '')
  )
);

-- 3. 챕터 테이블 전체 텍스트 검색 인덱스  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chapters_fulltext_search 
ON chapters USING gin(
  to_tsvector('simple', 
    COALESCE(title, '') || ' ' || 
    COALESCE(content, '')
  )
);

-- 4. 한국어 검색을 위한 추가 인덱스 (trigram 유사도 검색)
-- pg_trgm 확장이 필요함
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 강의 제목의 trigram 인덱스 (유사 검색용)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_title_trigram 
ON courses USING gin(title gin_trgm_ops);

-- 강의 설명의 trigram 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_description_trigram 
ON courses USING gin(description gin_trgm_ops);

-- 5. 검색 성능을 위한 함수 생성
CREATE OR REPLACE FUNCTION search_courses(search_term TEXT)
RETURNS TABLE(
  "courseId" TEXT,
  title TEXT,
  description TEXT,
  "teacherName" TEXT,
  category TEXT,
  price INTEGER,
  level TEXT,
  status TEXT,
  rank REAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c."courseId",
    c.title,
    c.description,
    c."teacherName", 
    c.category,
    c.price,
    c.level::TEXT,
    c.status::TEXT,
    -- 검색 랭킹 계산 (제목 가중치 높음)
    (
      ts_rank(to_tsvector('simple', COALESCE(c.title, '')), plainto_tsquery('simple', search_term)) * 2.0 +
      ts_rank(to_tsvector('simple', COALESCE(c.description, '')), plainto_tsquery('simple', search_term)) * 1.0 +
      similarity(c.title, search_term) * 1.5
    ) AS rank
  FROM courses c
  WHERE 
    c.status = 'Published' AND
    (
      -- 전체 텍스트 검색
      to_tsvector('simple', 
        COALESCE(c.title, '') || ' ' || 
        COALESCE(c.description, '') || ' ' ||
        COALESCE(c."teacherName", '') || ' ' ||
        COALESCE(c.category, '')
      ) @@ plainto_tsquery('simple', search_term)
      OR
      -- trigram 유사도 검색 (한국어 대응)
      similarity(c.title, search_term) > 0.3
      OR
      similarity(c.description, search_term) > 0.2
    )
  ORDER BY rank DESC, c."createdAt" DESC;
END;
$$;

-- 6. 댓글 검색을 위한 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_text_trigram 
ON comments USING gin(text gin_trgm_ops);

-- 7. 성능 통계 업데이트
ANALYZE courses;
ANALYZE sections;
ANALYZE chapters;
ANALYZE comments;

-- 성공 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ PostgreSQL 전체 텍스트 검색 인덱스 생성 완료!';
  RAISE NOTICE '🔍 다음 함수를 사용하여 검색: SELECT * FROM search_courses(''검색어'');';
  RAISE NOTICE '📊 생성된 인덱스:';
  RAISE NOTICE '   - idx_courses_fulltext_search (GIN)';
  RAISE NOTICE '   - idx_sections_fulltext_search (GIN)';
  RAISE NOTICE '   - idx_chapters_fulltext_search (GIN)';
  RAISE NOTICE '   - idx_courses_title_trigram (trigram)';
  RAISE NOTICE '   - idx_courses_description_trigram (trigram)';
  RAISE NOTICE '   - idx_comments_text_trigram (trigram)';
END;
$$;

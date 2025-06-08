#!/bin/bash

# 🧪 간단한 CUID2 시드 테스트

echo "🧪 CUID2 시드 간단 테스트"
echo "========================"

cd packages/database

echo "🔄 Prisma 클라이언트 생성..."
npx prisma generate

echo "📊 직접 시드 실행..."
npx tsx seeds/seed.ts

echo "✅ 테스트 완료!"

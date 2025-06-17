import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 🔧 orderIndex 필드 초기화 스크립트
 * 
 * 기존 데이터에 대해 orderIndex 값을 설정합니다:
 * - Section: createdAt 순서대로 0, 1, 2, ... 설정
 * - Chapter: 각 섹션 내에서 createdAt 순서대로 0, 1, 2, ... 설정
 */
async function initializeOrderIndex() {
  console.log('🚀 orderIndex 초기화 시작...\n');

  try {
    // 1️⃣ 모든 강의별로 섹션 orderIndex 설정
    const courses = await prisma.course.findMany({
      select: {
        courseId: true,
        title: true,
        sections: {
          select: {
            sectionId: true,
            sectionTitle: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    console.log(`📚 ${courses.length}개 강의의 섹션 orderIndex 설정 중...`);
    
    for (const course of courses) {
      console.log(`\n  📖 강의: ${course.title}`);
      
      for (let i = 0; i < course.sections.length; i++) {
        const section = course.sections[i];
        await prisma.section.update({
          where: { sectionId: section.sectionId },
          data: { orderIndex: i },
        });
        console.log(`    ✅ 섹션 "${section.sectionTitle}" -> orderIndex: ${i}`);
      }
    }

    // 2️⃣ 모든 섹션별로 챕터 orderIndex 설정
    const sections = await prisma.section.findMany({
      select: {
        sectionId: true,
        sectionTitle: true,
        chapters: {
          select: {
            chapterId: true,
            title: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    console.log(`\n📑 ${sections.length}개 섹션의 챕터 orderIndex 설정 중...`);
    
    for (const section of sections) {
      console.log(`\n  📑 섹션: ${section.sectionTitle}`);
      
      for (let i = 0; i < section.chapters.length; i++) {
        const chapter = section.chapters[i];
        await prisma.chapter.update({
          where: { chapterId: chapter.chapterId },
          data: { orderIndex: i },
        });
        console.log(`    ✅ 챕터 "${chapter.title}" -> orderIndex: ${i}`);
      }
    }

    // 3️⃣ 결과 확인
    const totalSections = await prisma.section.count();
    const totalChapters = await prisma.chapter.count();
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 orderIndex 초기화 완료!');
    console.log('='.repeat(50));
    console.log(`📊 처리된 데이터:`);
    console.log(`  • 강의: ${courses.length}개`);
    console.log(`  • 섹션: ${totalSections}개`);
    console.log(`  • 챕터: ${totalChapters}개`);
    console.log('\n✨ 이제 UserCourseProgressService의 orderBy 오류가 해결됩니다!');
    
  } catch (error) {
    console.error('❌ orderIndex 초기화 중 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeOrderIndex()
    .then(() => {
      console.log('\n🚀 스크립트 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export default initializeOrderIndex;

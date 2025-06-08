import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { createId } from '@paralleldrive/cuid2';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const prisma = new PrismaClient();

// ES 모듈에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CUID2 ID 생성 함수
function generateId(): string {
  const id = createId();
  
  if (id.length !== 24) {
    console.warn(`⚠️ 생성된 ID 길이가 비정상입니다: ${id} (길이: ${id.length})`);
    throw new Error(`CUID2 생성 오류: 예상 길이 24자, 실제 ${id.length}자`);
  }
  
  return id;
}

// 시드 데이터 파일 경로
const SEED_DATA_PATH = path.join(__dirname, './data');

/**
 * 🗑️ 모든 테이블 데이터 삭제 (외래키 제약 고려)
 */
async function clearAllTables() {
  console.log('🗑️ 기존 데이터 삭제 중...');
  
  try {
    await prisma.userCourseProgress.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.chapter.deleteMany();
    await prisma.section.deleteMany();
    await prisma.course.deleteMany();
    await prisma.socialAccount.deleteMany();
    await prisma.userSettings.deleteMany();
    await prisma.userProfile.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.loginHistory.deleteMany();
    await prisma.user.deleteMany();
    
    console.log('✅ 기존 데이터 삭제 완료');
  } catch (error) {
    console.error('❌ 데이터 삭제 중 오류:', error);
    throw error;
  }
}

/**
 * 📄 JSON 파일에서 데이터 로드
 */
function loadJsonData<T>(filename: string): T[] {
  const filePath = path.join(SEED_DATA_PATH, filename);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ 파일을 찾을 수 없습니다: ${filename}`);
    return [];
  }
  
  const rawData = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(rawData);
}

/**
 * 👥 사용자 데이터 시드
 */
async function seedUsers() {
  console.log('👥 사용자 데이터 시드 중...');
  
  const users = loadJsonData<any>('users.json');
  const profiles = loadJsonData<any>('userProfiles.json');
  const settings = loadJsonData<any>('userSettings.json');
  
  for (const user of users) {
    try {
      // 비밀번호 해시화 (평문인 경우에만)
      let hashedPassword;
      if (user.password) {
        if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
          // 이미 해시된 비밀번호
          hashedPassword = user.password;
        } else {
          // 평문 비밀번호 해시화
          console.log(`🔐 비밀번호 해시화: ${user.email}`);
          hashedPassword = await bcrypt.hash(user.password, 12);
        }
      } else {
        // 기본 비밀번호 설정
        console.log(`🔐 기본 비밀번호 설정: ${user.email}`);
        hashedPassword = await bcrypt.hash('password123', 12);
      }
      
      // 해당 사용자의 프로필과 설정 찾기
      const userProfile = profiles.find(p => p.userId === user.id);
      const userSettings = settings.find(s => s.userId === user.id);
      
      await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          password: hashedPassword,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          role: user.role,
          isActive: user.isActive,
          isVerified: user.isVerified,
          lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
          passwordChangedAt: user.passwordChangedAt ? new Date(user.passwordChangedAt) : null,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
          
          // 프로필 생성
          profile: userProfile ? {
            create: {
              id: userProfile.id,
              bio: userProfile.bio,
              location: userProfile.location,
              website: userProfile.website,
              dateOfBirth: userProfile.dateOfBirth ? new Date(userProfile.dateOfBirth) : null,
              phone: userProfile.phone,
              createdAt: new Date(userProfile.createdAt),
              updatedAt: new Date(userProfile.updatedAt),
            }
          } : {
            create: {
              id: generateId(),
            }
          },
          
          // 설정 생성
          settings: userSettings ? {
            create: {
              id: userSettings.id,
              theme: userSettings.theme,
              language: userSettings.language,
              timezone: userSettings.timezone,
              emailNotifications: userSettings.emailNotifications,
              pushNotifications: userSettings.pushNotifications,
              smsNotifications: userSettings.smsNotifications,
              twoFactorEnabled: userSettings.twoFactorEnabled,
              createdAt: new Date(userSettings.createdAt),
              updatedAt: new Date(userSettings.updatedAt),
            }
          } : {
            create: {
              id: generateId(),
            }
          }
        }
      });
      
      console.log(`✅ 사용자 생성: ${user.email}`);
    } catch (error) {
      console.error(`❌ 사용자 생성 실패 (${user.email}):`, error);
    }
  }
  
  console.log('✅ 사용자 데이터 시드 완료');
}

/**
 * 📚 강의 데이터 시드
 */
async function seedCourses() {
  console.log('📚 강의 데이터 시드 중...');
  
  const courses = loadJsonData<any>('courses.json');
  
  for (const course of courses) {
    try {
      await prisma.course.create({
        data: {
          courseId: course.courseId,
          teacherId: course.teacherId,
          teacherName: course.teacherName,
          title: course.title,
          description: course.description,
          category: course.category,
          image: course.image,
          price: course.price,
          level: course.level,
          status: course.status,
          createdAt: new Date(course.createdAt),
          updatedAt: new Date(course.updatedAt),
        }
      });
      
      console.log(`✅ 강의 생성: ${course.title}`);
    } catch (error) {
      console.error(`❌ 강의 생성 실패 (${course.title}):`, error);
    }
  }
  
  console.log('✅ 강의 데이터 시드 완료');
}

/**
 * 📖 섹션 데이터 시드
 */
async function seedSections() {
  console.log('📖 섹션 데이터 시드 중...');
  
  const sections = loadJsonData<any>('sections.json');
  
  for (const section of sections) {
    try {
      await prisma.section.create({
        data: {
          sectionId: section.sectionId,
          courseId: section.courseId,
          sectionTitle: section.sectionTitle,
          sectionDescription: section.sectionDescription,
          createdAt: new Date(section.createdAt),
          updatedAt: new Date(section.updatedAt),
        }
      });
      
      console.log(`✅ 섹션 생성: ${section.sectionTitle}`);
    } catch (error) {
      console.error(`❌ 섹션 생성 실패 (${section.sectionTitle}):`, error);
    }
  }
  
  console.log('✅ 섹션 데이터 시드 완료');
}

/**
 * 📝 챕터 데이터 시드
 */
async function seedChapters() {
  console.log('📝 챕터 데이터 시드 중...');
  
  const chapters = loadJsonData<any>('chapters.json');
  
  for (const chapter of chapters) {
    try {
      await prisma.chapter.create({
        data: {
          chapterId: chapter.chapterId,
          sectionId: chapter.sectionId,
          type: chapter.type,
          title: chapter.title,
          content: chapter.content,
          video: chapter.video || null,
          createdAt: new Date(chapter.createdAt),
          updatedAt: new Date(chapter.updatedAt),
        }
      });
      
      console.log(`✅ 챕터 생성: ${chapter.title}`);
    } catch (error) {
      console.error(`❌ 챕터 생성 실패 (${chapter.title}):`, error);
    }
  }
  
  console.log('✅ 챕터 데이터 시드 완료');
}

/**
 * 💳 트랜잭션 데이터 시드
 */
async function seedTransactions() {
  console.log('💳 트랜잭션 데이터 시드 중...');
  
  const transactions = loadJsonData<any>('transactions.json');
  
  for (const transaction of transactions) {
    try {
      await prisma.transaction.create({
        data: {
          transactionId: transaction.transactionId,
          userId: transaction.userId,
          dateTime: new Date(transaction.dateTime),
          courseId: transaction.courseId,
          paymentProvider: transaction.paymentProvider,
          amount: transaction.amount,
        }
      });
      
      console.log(`✅ 트랜잭션 생성: ${transaction.transactionId}`);
    } catch (error) {
      console.error(`❌ 트랜잭션 생성 실패 (${transaction.transactionId}):`, error);
    }
  }
  
  console.log('✅ 트랜잭션 데이터 시드 완료');
}

/**
 * 📋 등록 데이터 시드
 */
async function seedEnrollments() {
  console.log('📋 등록 데이터 시드 중...');
  
  const enrollments = loadJsonData<any>('enrollments.json');
  
  for (const enrollment of enrollments) {
    try {
      await prisma.enrollment.create({
        data: {
          userId: enrollment.userId,
          courseId: enrollment.courseId,
          enrolledAt: new Date(enrollment.enrolledAt),
          createdAt: new Date(enrollment.createdAt),
          updatedAt: new Date(enrollment.updatedAt),
        }
      });
      
      console.log(`✅ 등록 생성: ${enrollment.userId} -> ${enrollment.courseId}`);
    } catch (error) {
      console.error(`❌ 등록 생성 실패 (${enrollment.userId} -> ${enrollment.courseId}):`, error);
    }
  }
  
  console.log('✅ 등록 데이터 시드 완료');
}

/**
 * 📊 학습 진도 데이터 시드
 */
async function seedUserCourseProgress() {
  console.log('📊 학습 진도 데이터 시드 중...');
  
  const progressData = loadJsonData<any>('userCourseProgress.json');
  
  for (const progress of progressData) {
    try {
      await prisma.userCourseProgress.create({
        data: {
          userId: progress.userId,
          courseId: progress.courseId,
          enrollmentDate: new Date(progress.enrollmentDate),
          overallProgress: progress.overallProgress,
          lastAccessedTimestamp: new Date(progress.lastAccessedTimestamp),
          sections: progress.sections,
        }
      });
      
      console.log(`✅ 학습 진도 생성: ${progress.userId} -> ${progress.courseId}`);
    } catch (error) {
      console.error(`❌ 학습 진도 생성 실패 (${progress.userId} -> ${progress.courseId}):`, error);
    }
  }
  
  console.log('✅ 학습 진도 데이터 시드 완료');
}

/**
 * 🌱 메인 시드 함수
 */
async function main() {
  console.log('🌱 PostgreSQL 데이터베이스 시드 시작');
  console.log('🆔 모든 ID는 CUID2 형식을 사용합니다');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    await clearAllTables();
    
    await seedUsers();
    await seedCourses();
    await seedSections();
    await seedChapters();
    await seedTransactions();
    await seedEnrollments();
    await seedUserCourseProgress();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 데이터베이스 시드 완료!');
    console.log('');
    console.log('✨ 테스트용 계정 정보:');
    console.log('  📧 강사1: instructor1@example.com (비밀번호: password123)');
    console.log('  📧 강사2: instructor2@example.com (비밀번호: password123)');
    console.log('  📧 학생1: student1@example.com (비밀번호: password123)');
    console.log('  📧 학생2: student2@example.com (비밀번호: password123)');
    console.log('  📧 관리자: admin@example.com (비밀번호: password123)');
    
  } catch (error) {
    console.error('❌ 시드 과정에서 오류 발생:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 시드 스크립트 실행
main().catch((error) => {
  console.error('💥 시드 스크립트 실행 실패:', error);
  process.exit(1);
});

export default main;

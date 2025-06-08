import bcrypt from 'bcryptjs';

/**
 * 🔐 비밀번호 해시 테스트 스크립트
 */

async function testPasswordHash() {
  console.log('🔐 비밀번호 해시 테스트');
  console.log('===================');
  
  const plainPassword = 'password123';
  const existingHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewLGnEO.xGXq2kma';
  
  console.log('📝 테스트할 비밀번호:', plainPassword);
  console.log('🔒 기존 해시:', existingHash);
  console.log('');
  
  // 기존 해시 검증
  const isValidExisting = await bcrypt.compare(plainPassword, existingHash);
  console.log('✅ 기존 해시 검증:', isValidExisting ? '성공' : '실패');
  
  if (!isValidExisting) {
    console.log('');
    console.log('🔧 새로운 해시 생성 중...');
    
    // 새로운 해시 생성 (여러 round 테스트)
    for (const rounds of [10, 12]) {
      const newHash = await bcrypt.hash(plainPassword, rounds);
      const isValid = await bcrypt.compare(plainPassword, newHash);
      
      console.log(`Round ${rounds}:`);
      console.log(`  해시: ${newHash}`);
      console.log(`  검증: ${isValid ? '성공' : '실패'}`);
      console.log('');
    }
  } else {
    console.log('✅ 기존 해시가 올바릅니다!');
  }
}

testPasswordHash().catch(console.error);

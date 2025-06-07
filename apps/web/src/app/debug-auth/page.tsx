'use client';

import { useAuthStore } from '@/stores/authStore';
import { useEffect, useState } from 'react';

// JWT 디코딩 함수 (클라이언트용)
function decodeJWT(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('JWT 디코딩 오류:', error);
    return null;
  }
}

export default function DebugAuthPage() {
  const { user, accessToken } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [decodedToken, setDecodedToken] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (accessToken) {
      const decoded = decodeJWT(accessToken);
      setDecodedToken(decoded);
    }
  }, [accessToken]);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  const isTokenExpired = decodedToken && decodedToken.exp && Date.now() >= decodedToken.exp * 1000;
  
  // userId 불일치 검사 (토큰의 userId와 저장된 userId 비교)
  const tokenUserId = decodedToken?.userId || decodedToken?.sub;
  const storedUserId = user?.userId;
  const userIdMismatch = tokenUserId && storedUserId && tokenUserId !== storedUserId;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔍 인증 상태 디버깅</h1>
      
      <div className="space-y-6">
        {/* 현재 인증 상태 */}
        <div className="bg-card p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">📊 현재 인증 상태</h2>
          <div className="space-y-2">
            <p><strong>로그인 여부:</strong> {user ? '✅ 로그인됨' : '❌ 로그인되지 않음'}</p>
            <p><strong>토큰 여부:</strong> {accessToken ? '✅ 토큰 있음' : '❌ 토큰 없음'}</p>
            <p><strong>토큰 만료:</strong> {
              decodedToken 
                ? (isTokenExpired ? '❌ 만료됨' : '✅ 유효함')
                : '❓ 확인 불가'
            }</p>
            <p><strong>userId 일치:</strong> {
              userIdMismatch 
                ? '❌ 불일치' 
                : (tokenUserId && storedUserId ? '✅ 일치' : '❓ 확인 불가')
            }</p>
          </div>
        </div>

        {/* userId 불일치 경고 */}
        {userIdMismatch && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-3 text-red-800">⚠️ 심각한 문제 발견</h2>
            <div className="space-y-2 text-red-700">
              <p><strong>저장된 userId:</strong> {storedUserId}</p>
              <p><strong>토큰의 userId:</strong> {tokenUserId}</p>
              <p className="font-bold">두 값이 다릅니다! 이것이 403 에러의 원인입니다.</p>
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/signin';
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded mt-2"
              >
                로그아웃 후 재로그인
              </button>
            </div>
          </div>
        )}

        {/* JWT 토큰 분석 */}
        {accessToken && (
          <div className="bg-card p-4 rounded-lg border">
            <h2 className="text-lg font-semibold mb-3">🔐 JWT 토큰 분석</h2>
            {decodedToken ? (
              <div className="space-y-3">
                <div>
                  <p><strong>토큰 userId:</strong> {tokenUserId || '없음'}</p>
                  <p><strong>토큰 sub:</strong> {decodedToken.sub || '없음'}</p>
                  <p><strong>이메일:</strong> {decodedToken.email || '없음'}</p>
                  <p><strong>역할:</strong> {decodedToken.role || '없음'}</p>
                  <p><strong>발행 시간:</strong> {
                    decodedToken.iat 
                      ? new Date(decodedToken.iat * 1000).toLocaleString('ko-KR')
                      : '없음'
                  }</p>
                  <p><strong>만료 시간:</strong> {
                    decodedToken.exp 
                      ? new Date(decodedToken.exp * 1000).toLocaleString('ko-KR')
                      : '없음'
                  }</p>
                  <p><strong>현재 시간:</strong> {new Date().toLocaleString('ko-KR')}</p>
                  {isTokenExpired && (
                    <p className="text-red-600 font-bold">⚠️ 토큰이 만료되었습니다!</p>
                  )}
                </div>
                <div>
                  <p><strong>전체 페이로드:</strong></p>
                  <pre className="bg-muted p-2 rounded text-sm overflow-auto max-h-40">
                    {JSON.stringify(decodedToken, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-red-600">❌ JWT 토큰을 디코딩할 수 없습니다.</p>
            )}
          </div>
        )}

        {/* 사용자 정보 */}
        <div className="bg-card p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">👤 저장된 사용자 정보</h2>
          {user ? (
            <div className="space-y-2">
              <p><strong>userId:</strong> {user.userId || '❌ 없음'}</p>
              <p><strong>id:</strong> {user.id || '❌ 없음'}</p>
              <p><strong>email:</strong> {user.email || '❌ 없음'}</p>
              <p><strong>name:</strong> {user.name || '❌ 없음'}</p>
              <p><strong>role:</strong> {user.role || '❌ 없음'}</p>
              <p><strong>provider:</strong> {user.provider || '❌ 없음'}</p>
              <p><strong>picture:</strong> {user.picture || '❌ 없음'}</p>
              <p><strong>created_at:</strong> {user.created_at || '❌ 없음'}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">사용자 정보가 없습니다.</p>
          )}
        </div>

        {/* API 테스트 버튼들 */}
        <div className="bg-card p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">🧪 API 테스트</h2>
          <div className="space-y-3 flex flex-wrap gap-2">
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/debug/jwt-verify', {
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json',
                    },
                  });
                  
                  const responseText = await response.text();
                  console.log('JWT Verify 응답:', response.status, responseText);
                  alert(`JWT Verify 응답: ${response.status}\n${responseText}`);
                } catch (error) {
                  console.error('JWT Verify 오류:', error);
                  alert('JWT Verify 오류: ' + error);
                }
              }}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
              disabled={!accessToken}
            >
              🔍 JWT 검증 테스트
            </button>

            <button
              onClick={async () => {
                try {
                  // Auth 서비스 JWT 설정 확인
                  const authResponse = await fetch('/api/auth/debug/jwt-config');
                  const authData = await authResponse.json();
                  
                  // API 게이트웨이 JWT 설정 확인
                  const apiResponse = await fetch('/api/debug/jwt-verify', {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                  });
                  const apiData = await apiResponse.json();
                  
                  const authSecret = authData.data?.accessSecret_preview || 'ERROR';
                  const apiSecret = apiData.secret_preview || 'ERROR';
                  const isMatch = authSecret === apiSecret;
                  
                  console.log('JWT 설정 비교:', { authSecret, apiSecret, isMatch });
                  alert(`JWT 시크릿 비교:\n\nAuth 서비스: ${authSecret}\nAPI 게이트웨이: ${apiSecret}\n\n결과: ${isMatch ? '✅ 일치' : '❌ 불일치'}`);
                } catch (error) {
                  console.error('JWT 설정 비교 오류:', error);
                  alert('JWT 설정 비교 오류: ' + error);
                }
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
            >
              ⚙️ JWT 설정 비교
            </button>

            <button
              onClick={async () => {
                if (!user?.userId) {
                  alert('userId가 없습니다!');
                  return;
                }
                
                try {
                  const response = await fetch(`/api/transactions?userId=${user.userId}`, {
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json',
                    },
                  });
                  
                  const responseText = await response.text();
                  console.log('Transactions API 응답:', response.status, responseText);
                  alert(`Transactions API 응답: ${response.status}\n${responseText}`);
                } catch (error) {
                  console.error('Transactions API 오류:', error);
                  alert('Transactions API 오류: ' + error);
                }
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              disabled={!user?.userId || !accessToken}
            >
              💳 Transactions API
            </button>

            <button
              onClick={async () => {
                if (!user?.userId) {
                  alert('userId가 없습니다!');
                  return;
                }
                
                try {
                  const response = await fetch(`/api/users/course-progress/${user.userId}/enrolled-courses`, {
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json',
                    },
                  });
                  
                  const responseText = await response.text();
                  console.log('Enrolled Courses API 응답:', response.status, responseText);
                  alert(`Enrolled Courses API 응답: ${response.status}\n${responseText}`);
                } catch (error) {
                  console.error('Enrolled Courses API 오류:', error);
                  alert('Enrolled Courses API 오류: ' + error);
                }
              }}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              disabled={!user?.userId || !accessToken}
            >
              📚 Enrolled Courses API
            </button>

            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/auth/refresh', {
                    method: 'POST',
                    credentials: 'include',
                  });
                  
                  const responseText = await response.text();
                  console.log('Token Refresh 응답:', response.status, responseText);
                  alert(`Token Refresh 응답: ${response.status}\n${responseText}`);
                  
                  if (response.ok) {
                    window.location.reload();
                  }
                } catch (error) {
                  console.error('Token Refresh 오류:', error);
                  alert('Token Refresh 오류: ' + error);
                }
              }}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
            >
              🔄 토큰 새로고침
            </button>

            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/signin';
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              🚪 로그아웃 후 재로그인
            </button>
          </div>
        </div>

        {/* 문제 진단 */}
        <div className="bg-card p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">🔧 문제 진단</h2>
          <div className="space-y-2">
            {!user && (
              <p className="text-red-600">❌ 사용자 정보가 없습니다. 로그인이 필요합니다.</p>
            )}
            {user && !user.userId && (
              <p className="text-red-600">❌ userId 필드가 없습니다. 인증 응답 구조를 확인하세요.</p>
            )}
            {!accessToken && (
              <p className="text-red-600">❌ 액세스 토큰이 없습니다. 로그인 과정을 확인하세요.</p>
            )}
            {isTokenExpired && (
              <p className="text-red-600">❌ 토큰이 만료되었습니다. 새로고침하거나 다시 로그인하세요.</p>
            )}
            {userIdMismatch && (
              <p className="text-red-600">❌ 저장된 userId와 토큰의 userId가 다릅니다. (403 에러의 주요 원인)</p>
            )}
            {user && user.userId && accessToken && !isTokenExpired && !userIdMismatch && (
              <p className="text-green-600">✅ 모든 필수 정보가 올바릅니다. API 호출이 정상 작동해야 합니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

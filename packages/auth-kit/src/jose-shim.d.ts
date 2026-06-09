// jose 최소 ambient 선언 — 정적 'jose' 미설치 환경에서도 타입체크가 통과하도록(런타임은 동적 import).
// 소비 앱이 실제 jose 를 설치하면 그 타입이 우선한다(이 shim 은 폴백 표면만 제공).
declare module 'jose' {
  export function createRemoteJWKSet(url: URL): any;
  export function jwtVerify(
    token: string,
    key: any,
    options?: { issuer?: string | string[]; audience?: string | string[] }
  ): Promise<{ payload: Record<string, any> }>;
}

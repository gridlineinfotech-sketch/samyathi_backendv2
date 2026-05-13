import {
  buildCorsOptions,
  isAllowedCorsOrigin,
  resolveTrustProxy,
  shouldSkipRateLimit,
  splitOrigins,
} from './cors.config';

describe('cors config', () => {
  it('splits and normalizes configured origins', () => {
    expect(
      splitOrigins(' https://app.example.com/, https://admin.example.com '),
    ).toEqual(['https://app.example.com', 'https://admin.example.com']);
  });

  it('allows configured frontend origins', () => {
    const env = {
      FRONTEND_URL: 'https://app.example.com',
      CORS_ORIGINS: 'https://admin.example.com',
    } as NodeJS.ProcessEnv;

    expect(isAllowedCorsOrigin('https://app.example.com', env)).toBe(true);
    expect(isAllowedCorsOrigin('https://admin.example.com', env)).toBe(true);
  });

  it('allows localhost development origins by default', () => {
    const env = {} as NodeJS.ProcessEnv;

    expect(isAllowedCorsOrigin('http://localhost:5173', env)).toBe(true);
    expect(isAllowedCorsOrigin('https://127.0.0.1:4173', env)).toBe(true);
  });

  it('rejects unknown origins', () => {
    expect(
      isAllowedCorsOrigin(
        'https://unknown.example.com',
        {} as NodeJS.ProcessEnv,
      ),
    ).toBe(false);
  });

  it('builds a preflight-friendly cors delegate', (done) => {
    const options = buildCorsOptions({
      FRONTEND_URL: 'https://app.example.com',
    } as NodeJS.ProcessEnv);
    const originDelegate = options.origin as (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => void;

    originDelegate('https://app.example.com', (error, allow) => {
      expect(error).toBeNull();
      expect(allow).toBe(true);
      done();
    });
  });

  it('skips rate limiting for options requests', () => {
    expect(shouldSkipRateLimit('OPTIONS')).toBe(true);
    expect(shouldSkipRateLimit('GET')).toBe(false);
  });

  it('trusts the first proxy hop by default', () => {
    expect(resolveTrustProxy()).toBe(1);
    expect(resolveTrustProxy('false')).toBe(false);
    expect(resolveTrustProxy('2')).toBe(2);
  });
});

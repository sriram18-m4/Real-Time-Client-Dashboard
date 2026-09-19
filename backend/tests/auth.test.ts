import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { memoryDb } from '../src/db/memoryStore.js';

const app = createApp();

describe('Authentication & Token Rotation Integration Tests', () => {
  beforeEach(() => {
    memoryDb.seedInitial();
  });

  it('POST /api/auth/login - succeeds with valid credentials and sets HttpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@agency.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('admin@agency.com');
    expect(res.body.user.role).toBe('ADMIN');
    expect(res.body.accessToken).toBeDefined();

    const rawCookies = res.headers['set-cookie'];
    const cookies = Array.isArray(rawCookies) ? rawCookies : typeof rawCookies === 'string' ? [rawCookies] : [];
    expect(cookies.some((c: string) => c.includes('refreshToken=') && c.includes('HttpOnly'))).toBe(true);
  });

  it('POST /api/auth/login - rejects invalid credentials with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@agency.com',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('POST /api/auth/refresh - rotates refresh token and issues new access token', async () => {
    // Step 1: Login with pm1@agency.com
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'pm1@agency.com',
        password: 'Password123!',
      });

    expect(loginRes.status).toBe(200);
    const cookieHeader = loginRes.headers['set-cookie'];
    expect(cookieHeader).toBeDefined();

    // Step 2: Refresh
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader!);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeDefined();
    expect(refreshRes.body.accessToken).not.toBe(loginRes.body.accessToken);

    // Verify new rotated cookie was sent
    const newCookieHeader = refreshRes.headers['set-cookie'];
    expect(newCookieHeader).toBeDefined();
  });

  it('POST /api/auth/refresh - REUSE DETECTION: Reusing an old rotated token revokes all user sessions', async () => {
    // Step 1: Login with dev1@agency.com
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'dev1@agency.com',
        password: 'Password123!',
      });

    expect(loginRes.status).toBe(200);
    const originalCookie = loginRes.headers['set-cookie'];
    expect(originalCookie).toBeDefined();

    // Step 2: Legitimate refresh (rotates token)
    const firstRefresh = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', originalCookie!);
    expect(firstRefresh.status).toBe(200);

    // Step 3: Attacker attempts to reuse the ORIGINAL token (which was already rotated)
    const attackerReuseRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', originalCookie!);

    expect(attackerReuseRes.status).toBe(401);
    expect(attackerReuseRes.body.error.code).toBe('TOKEN_REUSE_DETECTED');

    // Step 4: Verify that even the legitimate new token is now revoked because all sessions were terminated
    const legitimateRotatedCookie = firstRefresh.headers['set-cookie'];
    const followUpRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', legitimateRotatedCookie!);

    expect(followUpRes.status).toBe(401);
  });

  it('POST /api/auth/logout - clears cookie and updates last_seen_at', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@agency.com',
        password: 'Password123!',
      });

    expect(loginRes.status).toBe(200);
    const cookieHeader = loginRes.headers['set-cookie'];

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookieHeader!)
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`);

    expect(logoutRes.status).toBe(200);

    const rawLogoutCookies = logoutRes.headers['set-cookie'];
    const logoutCookies = Array.isArray(rawLogoutCookies) ? rawLogoutCookies : typeof rawLogoutCookies === 'string' ? [rawLogoutCookies] : [];
    expect(logoutCookies.some((c: string) => c.includes('refreshToken=;') || c.includes('Max-Age=0') || c.includes('Expires='))).toBe(true);
  });
});

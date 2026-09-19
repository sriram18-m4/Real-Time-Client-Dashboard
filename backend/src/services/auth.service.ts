import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { userRepository } from '../repositories/user.repository.js';
import { refreshTokenRepository } from '../repositories/refreshToken.repository.js';
import { AppError } from '../errors/AppError.js';
import { Role, User } from '@prisma/client';
import { logger } from '../logger/logger.js';

export interface TokenPayload {
  sub: string;
  email: string;
  role: Role;
  name: string;
}

export class AuthService {
  /**
   * Generates a 15-minute access token (stored in frontend memory only)
   */
  generateAccessToken(user: { id: string; email: string; role: Role; name: string }): string {
    const payload: TokenPayload & { jti: string } = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      jti: crypto.randomUUID(),
    };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
    });
  }

  /**
   * Generates a random opaque 7-day refresh token and its SHA-256 hash
   */
  generateRefreshToken(): { rawToken: string; tokenHash: string; expiresAt: Date } {
    const rawToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
    return { rawToken, tokenHash, expiresAt };
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async login(params: {
    email: string;
    password: string;
  }): Promise<{ user: User; accessToken: string; refreshToken: string; expiresAt: Date }> {
    const { email, password } = params;

    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw AppError.unauthorized('Account has been deactivated. Please contact an administrator.', 'ACCOUNT_INACTIVE');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const { rawToken, tokenHash, expiresAt } = this.generateRefreshToken();

    // Store refresh token hash in DB
    await refreshTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // Update lastSeenAt on login
    await userRepository.updateLastSeen(user.id, new Date());

    logger.info({ userId: user.id, role: user.role }, 'User successfully logged in');

    return {
      user,
      accessToken,
      refreshToken: rawToken,
      expiresAt,
    };
  }

  async refresh(rawToken: string): Promise<{ user: User; accessToken: string; newRefreshToken: string; expiresAt: Date }> {
    if (!rawToken) {
      throw AppError.unauthorized('Refresh token is required', 'MISSING_REFRESH_TOKEN');
    }

    const tokenHash = this.hashToken(rawToken);
    const tokenRecord = await refreshTokenRepository.findByTokenHash(tokenHash);

    if (!tokenRecord) {
      throw AppError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }

    // Reuse Detection: If token is already revoked, an attacker may have compromised this session!
    if (tokenRecord.isRevoked) {
      logger.warn({ userId: tokenRecord.userId }, 'REUSE OF REVOKED REFRESH TOKEN DETECTED! Revoking all sessions.');
      await refreshTokenRepository.revokeAllForUser(tokenRecord.userId);
      throw AppError.unauthorized('Refresh token reuse detected. All sessions terminated.', 'TOKEN_REUSE_DETECTED');
    }

    // Check expiration
    if (new Date(tokenRecord.expiresAt) < new Date()) {
      await refreshTokenRepository.revoke(tokenRecord.id);
      throw AppError.unauthorized('Refresh token has expired', 'REFRESH_TOKEN_EXPIRED');
    }

    // Load active user
    const user = await userRepository.findById(tokenRecord.userId);
    if (!user || !user.isActive) {
      await refreshTokenRepository.revoke(tokenRecord.id);
      throw AppError.unauthorized('User not found or deactivated', 'USER_INACTIVE');
    }

    // Token Rotation: revoke old token and issue new pair
    await refreshTokenRepository.revoke(tokenRecord.id);

    const accessToken = this.generateAccessToken(user);
    const { rawToken: newRefreshToken, tokenHash: newTokenHash, expiresAt } = this.generateRefreshToken();

    await refreshTokenRepository.create({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt,
    });

    return {
      user,
      accessToken,
      newRefreshToken,
      expiresAt,
    };
  }

  async logout(rawToken?: string, userId?: string): Promise<void> {
    if (rawToken) {
      const tokenHash = this.hashToken(rawToken);
      const tokenRecord = await refreshTokenRepository.findByTokenHash(tokenHash);
      if (tokenRecord) {
        await refreshTokenRepository.revoke(tokenRecord.id);
      }
    }

    if (userId) {
      // Update last seen on logout
      await userRepository.updateLastSeen(userId, new Date());
      logger.info({ userId }, 'User logged out and last_seen_at recorded');
    }
  }

  async getMe(userId: string): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('User not found or inactive', 'USER_NOT_FOUND');
    }
    return user;
  }
}

export const authService = new AuthService();

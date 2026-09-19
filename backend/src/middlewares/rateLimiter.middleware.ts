import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 login/refresh requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // Disables proxy validation checks behind Cloud Run / Nginx
  skip: () => process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST), // Skip in automated test runs
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
      details: [],
    },
    requestId: `rate-limit-${Date.now()}`,
  },
});

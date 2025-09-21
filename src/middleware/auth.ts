import { Request, Response, NextFunction } from 'express';
import { Database } from '../config/database.js';
import { UnauthorizedError } from '../models/types.js';

export interface AuthenticatedRequest extends Request {
  apiKey?: string;
}

export class AuthMiddleware {
  private static db = Database.getInstance();

  /**
   * Middleware to validate API key authentication
   */
  static async validateApiKey(
    req: AuthenticatedRequest, 
    res: Response, 
    next: NextFunction
  ): Promise<void> {
    try {
      // Extract API key from headers
      const apiKey = req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        throw new UnauthorizedError('API key is required. Please provide X-API-Key header.');
      }

      // Validate API key format
      if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        throw new UnauthorizedError('Invalid API key format.');
      }

      // Check if API key exists and is active
      const result = await AuthMiddleware.db.query(
        'SELECT key, name, is_active FROM api_keys WHERE key = $1 AND is_active = true',
        [apiKey]
      ) as { key: string; name: string; is_active: boolean }[];

      if (result.length === 0) {
        throw new UnauthorizedError('Invalid or inactive API key.');
      }

      // Update last used timestamp
      await AuthMiddleware.db.query(
        'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE key = $1',
        [apiKey]
      );

      // Attach API key to request for potential logging/auditing
      req.apiKey = apiKey;
      
      next();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        res.status(401).json({
          error: 'Unauthorized',
          message: error.message,
          code: 'UNAUTHORIZED',
        });
      } else {
        console.error('Auth middleware error:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Authentication validation failed',
          code: 'INTERNAL_ERROR',
        });
      }
    }
  }

  /**
   * Middleware to extract and validate idempotency key
   */
  static extractIdempotencyKey(
    req: Request, 
    res: Response, 
    next: NextFunction
  ): void {
    const idempotencyKey = req.headers['idempotency-key'] as string;
    
    if (idempotencyKey) {
      // Validate idempotency key format
      if (typeof idempotencyKey !== 'string' || idempotencyKey.trim().length === 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Idempotency-Key header must be a non-empty string',
          code: 'INVALID_IDEMPOTENCY_KEY',
        });
        return;
      }

      if (idempotencyKey.length > 255) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Idempotency-Key header must not exceed 255 characters',
          code: 'INVALID_IDEMPOTENCY_KEY',
        });
        return;
      }

      // Store in request for use by controllers
      (req as any).idempotencyKey = idempotencyKey;
    }
    
    next();
  }

  /**
   * Request logging middleware for audit trail
   */
  static logRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    
    // Log request
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
      apiKey: req.apiKey ? `${req.apiKey.substring(0, 8)}...` : 'none',
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      contentLength: req.headers['content-length'],
    });

    // Log response when it finishes
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });

    next();
  }

  /**
   * Error handling middleware for authentication errors
   */
  static handleAuthErrors(
    error: Error, 
    req: Request, 
    res: Response, 
    next: NextFunction
  ): void {
    if (error instanceof UnauthorizedError) {
      res.status(401).json({
        error: 'Unauthorized',
        message: error.message,
        code: error.code,
      });
    } else {
      next(error);
    }
  }

  /**
   * Rate limiting middleware (basic implementation)
   */
  static rateLimit = (() => {
    const requests = new Map<string, { count: number; resetTime: number }>();
    const WINDOW_SIZE = 60 * 1000; // 1 minute
    const MAX_REQUESTS = 100; // requests per minute

    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      const key = req.apiKey || req.ip || 'anonymous';
      const now = Date.now();
      
      // Clean up old entries
      for (const [k, v] of requests.entries()) {
        if (now > v.resetTime) {
          requests.delete(k);
        }
      }

      // Get or create rate limit entry
      let entry = requests.get(key);
      if (!entry || now > entry.resetTime) {
        entry = { count: 0, resetTime: now + WINDOW_SIZE };
        requests.set(key, entry);
      }

      entry.count++;

      // Check rate limit
      if (entry.count > MAX_REQUESTS) {
        res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Maximum ${MAX_REQUESTS} requests per minute.`,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        });
        return;
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
      res.setHeader('X-RateLimit-Remaining', MAX_REQUESTS - entry.count);
      res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

      next();
    };
  })();
}


import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ENV, validateEnv } from './config/env.js';
import { Database } from './config/database.js';
import { AuthMiddleware } from './middleware/auth.js';
import apiRoutes from './routes/index.js';

// Validate environment variables on startup
validateEnv();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting (applied globally)
app.use(AuthMiddleware.rateLimit);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (log ALL requests)
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Log incoming request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    apiKey: req.headers['x-api-key'] ? `${(req.headers['x-api-key'] as string).substring(0, 8)}...` : 'none',
    idempotencyKey: req.headers['idempotency-key'] || 'none',
    contentLength: req.headers['content-length'],
  });

  // Log response when it finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: ENV.NODE_ENV,
    database: 'connected',
  });
});

// API documentation endpoint (no auth required)
app.get('/', (req, res) => {
  res.json({
    name: 'Double-Entry Ledger API',
    version: '1.0.0',
    description: 'A minimal double-entry ledger backend that records financial events as journal entries',
    documentation: {
      authentication: 'Required for all API endpoints. Use X-API-Key header.',
      idempotency: 'Supported for POST operations. Use Idempotency-Key header.',
      currency: ENV.DEFAULT_CURRENCY,
      precision: 'All amounts stored as integer minor units (cents/paise)',
    },
    endpoints: {
      accounts: [
        'POST /accounts - Create account',
        'GET /accounts - List accounts (filter by type)',
        'GET /accounts/:code - Get account details',
        'GET /accounts/:code/info - Get account info with metadata',
      ],
      journal_entries: [
        'POST /journal-entries - Create journal entry (idempotent)',
        'GET /journal-entries/:id - Get journal entry',
        'GET /journal-entries - List journal entries (paginated)',
        'POST /journal-entries/:id/reverse - Create reversal entry',
      ],
      balances: [
        'GET /accounts/:code/balance - Get account balance (with as_of)',
        'GET /accounts/:code/activity - Check account activity',
      ],
      reports: [
        'GET /reports/trial-balance - Trial balance report (from/to dates)',
        'GET /reports/balance-summary - Balance summary by account type',
        'GET /reports/accounting-equation - Validate accounting equation',
        'GET /balances/all - All account balances',
      ],
    },
    health: '/health',
  });
});

// API routes (with authentication)
app.use('/', apiRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation Error',
      message: err.message,
    });
    return;
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: ENV.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  const db = Database.getInstance();
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  const db = Database.getInstance();
  await db.close();
  process.exit(0);
});

// Start server
const server = app.listen(ENV.PORT, () => {
  console.log(`🚀 Server running on port ${ENV.PORT}`);
  console.log(`📊 Environment: ${ENV.NODE_ENV}`);
  console.log(`💰 Default currency: ${ENV.DEFAULT_CURRENCY}`);
});

export default app;

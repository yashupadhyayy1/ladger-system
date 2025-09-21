# Deployment Guide - Double-Entry Ledger System

Production deployment guide for the double-entry ledger backend system.

## 🎯 Deployment Overview

This guide covers deploying the ledger system to production environments with proper security, performance, and reliability configurations.

## 🛠️ Production Requirements

### System Requirements
- **Node.js**: 18.0.0 or higher
- **PostgreSQL**: 12.0 or higher (recommended: 15+)
- **Memory**: Minimum 512MB RAM (recommended: 2GB+)
- **Storage**: 10GB+ for database growth
- **Network**: HTTPS/TLS termination

### Environment Setup
- **Load balancer** with SSL termination
- **Database** with automated backups
- **Monitoring** and logging infrastructure
- **Secret management** system

## 🔐 Security Configuration

### Environment Variables (Production)
```bash
# Database
DATABASE_URL=postgresql://ledger_user:SECURE_PASSWORD@prod-db-host:5432/ledger_db

# Server
PORT=3000
NODE_ENV=production

# Security - Generate secure random API keys
API_KEYS=prod-key-abc123,admin-key-def456,client-key-ghi789

# Application
DEFAULT_CURRENCY=INR
TIMEZONE=UTC

# Additional Production Settings
DATABASE_SSL=true
TRUST_PROXY=true
LOG_LEVEL=info
```

### API Key Security
```bash
# Generate secure API keys (32+ characters)
openssl rand -base64 32

# Example secure keys
API_KEYS=k8s9mQ7vN2pL4xR6wE1tY3uI0oP5aS8dF7gH9jK2lM1nB,r9sQ2vK8xL1mP4oE7wT6yU3iA5dG0hJ1cV9bN2fM8sR
```

### Database Security
```sql
-- Create production database with restricted access
CREATE USER ledger_prod WITH PASSWORD 'SECURE_RANDOM_PASSWORD';
CREATE DATABASE ledger_prod OWNER ledger_prod;

-- Grant minimal required permissions
GRANT CONNECT ON DATABASE ledger_prod TO ledger_prod;
GRANT USAGE ON SCHEMA public TO ledger_prod;
GRANT CREATE ON SCHEMA public TO ledger_prod;

-- Enable SSL
ALTER SYSTEM SET ssl = on;
```

## 🐳 Docker Deployment

### Production Dockerfile
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN npm run build

FROM node:18-alpine AS production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S ledger -u 1001

WORKDIR /app

COPY --from=builder --chown=ledger:nodejs /app/dist ./dist
COPY --from=builder --chown=ledger:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=ledger:nodejs /app/package.json ./package.json

USER ledger

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["npm", "start"]
```

### Docker Compose (Production)
```yaml
version: '3.8'

services:
  app:
    build: 
      context: .
      target: production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://ledger_prod:${DB_PASSWORD}@db:5432/ledger_prod
      - API_KEYS=${API_KEYS}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=ledger_prod
      - POSTGRES_USER=ledger_prod
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ledger_prod"]
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

## ☁️ Cloud Platform Deployment

### AWS Deployment

#### Using AWS ECS
```json
{
  "family": "ledger-system",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "ledger-app",
      "image": "your-registry/ledger-system:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:database-url"
        },
        {
          "name": "API_KEYS",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:api-keys"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/ledger-system",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### Using AWS Lambda (Serverless)
```typescript
// serverless.ts
import type { AWS } from '@serverless/typescript';

const serverlessConfiguration: AWS = {
  service: 'ledger-system',
  frameworkVersion: '3',
  provider: {
    name: 'aws',
    runtime: 'nodejs18.x',
    region: 'us-east-1',
    environment: {
      NODE_ENV: 'production',
      DATABASE_URL: '${ssm:/ledger/database-url}',
      API_KEYS: '${ssm:/ledger/api-keys}',
    },
  },
  functions: {
    api: {
      handler: 'dist/lambda.handler',
      events: [
        {
          httpApi: {
            path: '/{proxy+}',
            method: 'ANY',
          },
        },
      ],
    },
  },
};

module.exports = serverlessConfiguration;
```

### Google Cloud Platform

#### Using Cloud Run
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ledger-system
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/cloudsql-instances: "project:region:instance"
    spec:
      containerConcurrency: 100
      containers:
      - image: gcr.io/project/ledger-system:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-url
              key: url
        resources:
          limits:
            cpu: 1000m
            memory: 512Mi
```

### Heroku Deployment

#### Procfile
```
web: npm start
```

#### Heroku Configuration
```bash
# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set API_KEYS="secure-key-1,secure-key-2"

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:standard-0

# Deploy
git push heroku main

# Run migrations
heroku run npm run migrate
heroku run npm run seed
```

## 🔧 Reverse Proxy Configuration

### Nginx Configuration
```nginx
upstream ledger_backend {
    server app:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/certificate.crt;
    ssl_certificate_key /etc/ssl/certs/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://ledger_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint (no rate limiting)
    location /health {
        access_log off;
        proxy_pass http://ledger_backend;
    }
}
```

## 📊 Monitoring & Logging

### Application Monitoring
```typescript
// monitoring.ts
import { Request, Response, NextFunction } from 'express';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Send metrics to monitoring service
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    }));
  });
  
  next();
};
```

### Health Check Endpoint
```typescript
// Enhanced health check
app.get('/health', async (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    status: 'ok',
    checks: {
      database: 'unknown',
      memory: process.memoryUsage(),
      version: process.env.npm_package_version,
    }
  };

  try {
    // Test database connection
    await db.query('SELECT 1');
    healthCheck.checks.database = 'connected';
    
    res.status(200).json(healthCheck);
  } catch (error) {
    healthCheck.status = 'error';
    healthCheck.checks.database = 'disconnected';
    res.status(503).json(healthCheck);
  }
});
```

### Structured Logging
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

## 💾 Database Management

### Backup Strategy
```bash
#!/bin/bash
# backup.sh - Daily database backup

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="ledger_backup_$DATE.sql"

# Create backup
pg_dump $DATABASE_URL > /backups/$BACKUP_FILE

# Compress backup
gzip /backups/$BACKUP_FILE

# Upload to cloud storage
aws s3 cp /backups/$BACKUP_FILE.gz s3://your-backup-bucket/

# Clean up old backups (keep 30 days)
find /backups -name "ledger_backup_*.sql.gz" -mtime +30 -delete
```

### Migration in Production
```bash
#!/bin/bash
# production-migrate.sh

echo "Starting production migration..."

# Backup before migration
./backup.sh

# Run migrations
npm run migrate

# Verify migration
if npm run migrate:verify; then
    echo "Migration completed successfully"
else
    echo "Migration failed, consider rollback"
    exit 1
fi
```

### Database Scaling
```sql
-- Read replica setup
CREATE USER readonly_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE ledger_prod TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

-- Performance optimization
CREATE INDEX CONCURRENTLY idx_journal_entries_date ON journal_entries(date);
CREATE INDEX CONCURRENTLY idx_journal_lines_account_date ON journal_lines(account_id, entry_id);
```

## 🚀 Performance Optimization

### Application-Level Caching
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache account balances for 5 minutes
export const getCachedBalance = async (accountCode: string): Promise<any> => {
  const cacheKey = `balance:${accountCode}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const balance = await balanceService.getAccountBalance(accountCode);
  await redis.setex(cacheKey, 300, JSON.stringify(balance));
  
  return balance;
};
```

### Database Connection Pooling
```typescript
// Production database configuration
const productionConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,                    // Maximum connections
  min: 5,                     // Minimum connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000,
  acquireTimeoutMillis: 60000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  createRetryIntervalMillis: 200,
};
```

## 📈 Scaling Considerations

### Horizontal Scaling
- **Stateless design**: No session storage in application
- **Database connection pooling**: Shared across instances
- **Load balancer**: Distribute requests evenly
- **Health checks**: Remove unhealthy instances

### Vertical Scaling
- **CPU**: 2+ cores for production workload
- **Memory**: 2GB+ for optimal performance
- **Storage**: SSD for database performance

### Database Scaling
- **Read replicas**: For reporting queries
- **Connection pooling**: PgBouncer for connection management
- **Partitioning**: By date for large transaction volumes
- **Archiving**: Move old data to separate storage

## 🔒 Security Checklist

### Application Security
- [ ] Strong API key generation and rotation
- [ ] Input validation and sanitization
- [ ] SQL injection prevention
- [ ] Rate limiting implementation
- [ ] HTTPS/TLS encryption
- [ ] Security headers configuration

### Infrastructure Security
- [ ] Database access restrictions
- [ ] Network segmentation
- [ ] Regular security updates
- [ ] Backup encryption
- [ ] Access logging and monitoring
- [ ] Secrets management

### Compliance Considerations
- [ ] Data retention policies
- [ ] Audit trail maintenance
- [ ] Financial data encryption
- [ ] Access control documentation
- [ ] Incident response procedures

---

**🎯 Production Readiness**: This deployment guide ensures your ledger system meets enterprise-grade reliability, security, and performance standards.

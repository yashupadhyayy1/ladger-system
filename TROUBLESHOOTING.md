# Troubleshooting Guide - Double-Entry Ledger System

Common issues, solutions, and debugging procedures for the ledger system.

## 🚨 Common Issues & Solutions

### Database Connection Issues

#### Issue: "Cannot connect to database"
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql
# or
brew services list | grep postgresql

# Start PostgreSQL
sudo systemctl start postgresql
# or
brew services start postgresql

# Verify connection manually
psql -h localhost -p 5432 -U ledger_user -d ledger_db

# Check DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://user:password@host:port/database
```

#### Issue: "Password authentication failed"
```
Error: password authentication failed for user "ledger_user"
```

**Solutions:**
```bash
# Reset user password
sudo -u postgres psql
ALTER USER ledger_user WITH PASSWORD 'new_password';

# Update .env file
DATABASE_URL=postgresql://ledger_user:new_password@localhost:5432/ledger_db

# Check pg_hba.conf authentication method
sudo nano /etc/postgresql/15/main/pg_hba.conf
# Ensure line exists: local all ledger_user md5
```

#### Issue: "Database does not exist"
```
Error: database "ledger_db" does not exist
```

**Solutions:**
```bash
# Create database
sudo -u postgres createdb ledger_db

# Or via psql
sudo -u postgres psql
CREATE DATABASE ledger_db OWNER ledger_user;
GRANT ALL PRIVILEGES ON DATABASE ledger_db TO ledger_user;

# Run migrations
npm run migrate
```

### Migration Issues

#### Issue: "Migration table does not exist"
```
Error: relation "migration_history" does not exist
```

**Solutions:**
```bash
# Clean and re-run migrations
npm run clean
npm run migrate

# Manual migration table creation
psql $DATABASE_URL
CREATE TABLE migration_history (
  version VARCHAR(10) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Issue: "Migration already executed"
```
Error: Migration 001 already executed
```

**Solutions:**
```bash
# Check migration status
psql $DATABASE_URL -c "SELECT * FROM migration_history ORDER BY version;"

# Skip problematic migration (if safe)
psql $DATABASE_URL -c "INSERT INTO migration_history (version, name) VALUES ('001', 'Manual skip');"

# Or reset migrations (WARNING: deletes data)
npm run clean
npm run migrate
```

### API Authentication Issues

#### Issue: "API key is required"
```json
{
  "error": "Unauthorized",
  "message": "API key is required. Please provide X-API-Key header."
}
```

**Solutions:**
```bash
# Check API keys in database
psql $DATABASE_URL -c "SELECT key, is_active FROM api_keys;"

# Add missing API key
psql $DATABASE_URL -c "INSERT INTO api_keys (key, name, is_active) VALUES ('dev-key-1', 'Development Key', true);"

# Verify request header
curl -H "X-API-Key: dev-key-1" http://localhost:3000/accounts

# Check environment variables
echo $API_KEYS
```

#### Issue: "Invalid or inactive API key"
```json
{
  "error": "Unauthorized",
  "message": "Invalid or inactive API key."
}
```

**Solutions:**
```bash
# Check if key exists and is active
psql $DATABASE_URL -c "SELECT * FROM api_keys WHERE key = 'your-key';"

# Activate key
psql $DATABASE_URL -c "UPDATE api_keys SET is_active = true WHERE key = 'your-key';"

# Verify key format (no extra spaces/characters)
echo "'your-key'" | od -c
```

### Validation Errors

#### Issue: "Entry is not balanced"
```json
{
  "error": "Validation Error",
  "message": "Total debits (100000) must equal total credits (50000)"
}
```

**Solutions:**
```javascript
// Check your journal entry data
{
  "lines": [
    { "account_code": "1001", "debit": 100000 },     // 100,000 debit
    { "account_code": "3001", "credit": 100000 }     // 100,000 credit (must match)
  ]
}

// Verify amounts in cents/minor units
// ₹1,000.50 = 100050 (not 1000.50)
```

#### Issue: "Account not found"
```json
{
  "error": "Validation Error",
  "message": "Accounts not found: 9999"
}
```

**Solutions:**
```bash
# Check if account exists
psql $DATABASE_URL -c "SELECT code, name FROM accounts WHERE code = '9999';"

# List all accounts
curl -H "X-API-Key: dev-key-1" http://localhost:3000/accounts

# Create missing account
curl -X POST http://localhost:3000/accounts \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-key-1" \
  -d '{"code":"9999","name":"Test Account","type":"Asset"}'
```

#### Issue: "Date cannot be in the future"
```json
{
  "error": "Validation Error",
  "message": "Entry date cannot be in the future"
}
```

**Solutions:**
```javascript
// Use past or current date
{
  "date": "2025-01-01",    // ✅ Past date
  "date": "2025-12-31",    // ❌ Future date (if current date < 2025-12-31)
}

// Check server timezone
console.log(new Date().toISOString());

// Use UTC dates consistently
const today = new Date().toISOString().split('T')[0];
```

### Performance Issues

#### Issue: "Slow query performance"
```
Query taking >5 seconds to execute
```

**Solutions:**
```sql
-- Check for missing indexes
EXPLAIN ANALYZE SELECT * FROM journal_lines WHERE account_id = 'some-id';

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_journal_lines_account ON journal_lines(account_id);
CREATE INDEX CONCURRENTLY idx_journal_entries_date ON journal_entries(date);

-- Update table statistics
ANALYZE accounts;
ANALYZE journal_entries;
ANALYZE journal_lines;
```

#### Issue: "High memory usage"
```
Process using >2GB RAM
```

**Solutions:**
```javascript
// Check database connection pool size
const config = {
  max: 10,  // Reduce from 20
  min: 2,   // Reduce from 5
  idleTimeoutMillis: 10000  // Reduce from 30000
};

// Monitor memory usage
console.log(process.memoryUsage());

// Implement connection pooling
// Use PgBouncer for production
```

### Testing Issues

#### Issue: "Tests failing intermittently"
```
Error: Cannot use a pool after calling end on the pool
```

**Solutions:**
```typescript
// Fix test setup/teardown
beforeEach(async () => {
  // Create new database instance for each test
  db = Database.getInstance();
});

afterEach(async () => {
  // Don't close connection pool in tests
  // Let Jest handle cleanup
});

// Run tests sequentially
npm test -- --runInBand

// Use test database
DATABASE_URL=postgresql://test_user:password@localhost:5432/test_db npm test
```

#### Issue: "Port already in use"
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Use different port for tests
PORT=3001 npm test

# Check what's using the port
lsof -i :3000
```

### Docker Issues

#### Issue: "Docker container won't start"
```
Error: Container exits immediately
```

**Solutions:**
```bash
# Check container logs
docker logs container_name

# Run container interactively
docker run -it --entrypoint /bin/sh your-image

# Check environment variables
docker exec container_name env

# Verify database connectivity from container
docker exec container_name nc -zv db_host 5432
```

#### Issue: "Database connection from Docker"
```
Error: connect ECONNREFUSED db:5432
```

**Solutions:**
```yaml
# docker-compose.yml - ensure proper networking
services:
  app:
    depends_on:
      - db
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/dbname  # Use service name 'db'
  
  db:
    ports:
      - "5432:5432"  # Expose port for debugging
```

## 🔧 Debugging Tools & Techniques

### Database Debugging

#### Check Database Schema
```sql
-- List all tables
\dt

-- Describe table structure
\d accounts
\d journal_entries
\d journal_lines

-- Check constraints
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'journal_lines';
```

#### Query Performance Analysis
```sql
-- Enable query logging
SET log_statement = 'all';
SET log_min_duration_statement = 1000; -- Log queries >1s

-- Analyze slow query
EXPLAIN (ANALYZE, BUFFERS) 
SELECT a.code, SUM(jl.debit_cents), SUM(jl.credit_cents)
FROM accounts a
LEFT JOIN journal_lines jl ON a.id = jl.account_id
GROUP BY a.id, a.code;
```

#### Check Data Integrity
```sql
-- Verify double-entry rule
SELECT entry_id, SUM(debit_cents), SUM(credit_cents),
       SUM(debit_cents) - SUM(credit_cents) as difference
FROM journal_lines
GROUP BY entry_id
HAVING SUM(debit_cents) != SUM(credit_cents);

-- Find orphaned records
SELECT jl.* FROM journal_lines jl
LEFT JOIN journal_entries je ON jl.entry_id = je.id
WHERE je.id IS NULL;
```

### Application Debugging

#### Enable Debug Logging
```typescript
// Add to index.ts
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, {
      headers: req.headers,
      body: req.body,
      query: req.query
    });
    next();
  });
}
```

#### Memory Leak Detection
```typescript
// Monitor memory usage
setInterval(() => {
  const usage = process.memoryUsage();
  console.log('Memory usage:', {
    rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB'
  });
}, 30000);
```

#### API Request Tracing
```typescript
import { v4 as uuidv4 } from 'uuid';

app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  console.log(`[${req.id}] Started ${req.method} ${req.path}`);
  
  res.on('finish', () => {
    console.log(`[${req.id}] Completed ${res.statusCode}`);
  });
  
  next();
});
```

### Network Debugging

#### Test API Endpoints
```bash
# Health check
curl -v http://localhost:3000/health

# Test with verbose output
curl -v -H "X-API-Key: dev-key-1" http://localhost:3000/accounts

# Test POST with data
curl -v -X POST http://localhost:3000/accounts \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-key-1" \
  -d '{"code":"TEST","name":"Test","type":"Asset"}' \
  --trace-ascii trace.txt
```

#### Check Network Connectivity
```bash
# Test database connection
nc -zv localhost 5432

# Test application port
nc -zv localhost 3000

# Check if port is listening
netstat -tulpn | grep :3000
```

## 📊 Monitoring & Alerts

### Application Metrics
```typescript
// Simple metrics collection
const metrics = {
  requests: 0,
  errors: 0,
  dbQueries: 0,
  responseTime: []
};

app.use((req, res, next) => {
  metrics.requests++;
  const start = Date.now();
  
  res.on('finish', () => {
    metrics.responseTime.push(Date.now() - start);
    if (res.statusCode >= 400) metrics.errors++;
  });
  
  next();
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    ...metrics,
    avgResponseTime: metrics.responseTime.reduce((a, b) => a + b, 0) / metrics.responseTime.length
  });
});
```

### Database Monitoring
```sql
-- Monitor active connections
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';

-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Monitor table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🚨 Emergency Procedures

### System Recovery

#### Database Corruption
```bash
# 1. Stop application immediately
docker-compose stop app

# 2. Create emergency backup
pg_dump $DATABASE_URL > emergency_backup.sql

# 3. Check database integrity
psql $DATABASE_URL -c "SELECT * FROM pg_stat_database;"

# 4. Restore from latest backup if needed
psql $DATABASE_URL < latest_backup.sql
```

#### Data Inconsistency
```sql
-- 1. Identify problem entries
SELECT entry_id, SUM(debit_cents) as debits, SUM(credit_cents) as credits
FROM journal_lines
GROUP BY entry_id
HAVING SUM(debit_cents) != SUM(credit_cents);

-- 2. Create correcting entries (don't delete!)
-- Manual review required for each case

-- 3. Document the issue
INSERT INTO audit_log (issue, description, resolution, created_at)
VALUES ('data_inconsistency', 'Unbalanced entries found', 'Corrected via manual entries', NOW());
```

### Contact Information

**For Production Issues:**
- **Database**: DBA Team
- **Application**: Development Team
- **Infrastructure**: DevOps Team
- **Security**: Security Team

**Escalation Matrix:**
1. **Level 1**: Application restart, basic troubleshooting
2. **Level 2**: Database issues, data integrity problems  
3. **Level 3**: System architecture changes, security incidents

---

**🔍 Remember**: Always document issues and solutions to improve the troubleshooting process for future incidents!

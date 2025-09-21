# API Documentation - Double-Entry Ledger System

Complete API reference with request/response examples and error handling.

## 🔑 Authentication

All API endpoints require authentication via the `X-API-Key` header:

```bash
X-API-Key: dev-key-1
```

### Error Response (401 Unauthorized)
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "API key is required. Please provide X-API-Key header.",
  "code": "UNAUTHORIZED"
}
```

## 📋 Account Management

### Create Account

**Endpoint:** `POST /accounts`

**Request:**
```bash
curl -X POST http://localhost:3000/accounts \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-key-1" \
  -d '{
    "code": "1001",
    "name": "Cash",
    "type": "Asset"
  }'
```

**Request Body Schema:**
```json
{
  "code": "string (1-20 chars, alphanumeric)",
  "name": "string (1-100 chars)",
  "type": "Asset|Liability|Equity|Revenue|Expense"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "b76e14d6-c4c2-4786-9391-8140c4149aa9",
    "code": "1001",
    "name": "Cash",
    "type": "Asset",
    "created_at": "2025-09-21T20:00:23.024Z"
  },
  "message": "Account created successfully"
}
```

**Error Response (409 Conflict):**
```json
{
  "success": false,
  "error": "Conflict Error",
  "message": "Account with code '1001' already exists",
  "code": "CONFLICT_ERROR"
}
```

---

### List Accounts

**Endpoint:** `GET /accounts[?type=AccountType]`

**Request:**
```bash
# List all accounts
curl -H "X-API-Key: dev-key-1" http://localhost:3000/accounts

# Filter by account type
curl -H "X-API-Key: dev-key-1" "http://localhost:3000/accounts?type=Asset"
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "b76e14d6-c4c2-4786-9391-8140c4149aa9",
      "code": "1001",
      "name": "Cash",
      "type": "Asset",
      "created_at": "2025-09-21T20:00:23.024Z"
    },
    {
      "id": "13de4a2c-e2d9-4840-934c-fc63ec0d99e0",
      "code": "1002",
      "name": "Bank",
      "type": "Asset",
      "created_at": "2025-09-21T20:00:23.029Z"
    }
  ],
  "count": 2,
  "message": "Accounts retrieved successfully"
}
```

---

### Get Account Details

**Endpoint:** `GET /accounts/{code}`

**Request:**
```bash
curl -H "X-API-Key: dev-key-1" http://localhost:3000/accounts/1001
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "b76e14d6-c4c2-4786-9391-8140c4149aa9",
    "code": "1001",
    "name": "Cash",
    "type": "Asset",
    "created_at": "2025-09-21T20:00:23.024Z"
  },
  "message": "Account retrieved successfully"
}
```

---

### Get Account Balance

**Endpoint:** `GET /accounts/{code}/balance[?as_of=YYYY-MM-DD]`

**Request:**
```bash
# Current balance
curl -H "X-API-Key: dev-key-1" http://localhost:3000/accounts/1001/balance

# Historical balance
curl -H "X-API-Key: dev-key-1" "http://localhost:3000/accounts/1001/balance?as_of=2025-01-31"
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "account_code": "1001",
    "account_name": "Cash",
    "account_type": "Asset",
    "debits": 150000,
    "credits": 20000,
    "balance": 130000,
    "as_of": "current"
  },
  "message": "Account balance retrieved successfully"
}
```

## 📊 Journal Entry Management

### Create Journal Entry

**Endpoint:** `POST /journal-entries`

**Request:**
```bash
curl -X POST http://localhost:3000/journal-entries \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-key-1" \
  -H "Idempotency-Key: seed-capital-2025-01-01" \
  -d '{
    "date": "2025-01-01",
    "narration": "Seed capital investment",
    "lines": [
      {
        "account_code": "1001",
        "debit": 100000
      },
      {
        "account_code": "3001",
        "credit": 100000
      }
    ]
  }'
```

**Request Body Schema:**
```json
{
  "date": "YYYY-MM-DD (cannot be future date)",
  "narration": "string (1-500 chars)",
  "lines": [
    {
      "account_code": "string (must exist)",
      "debit": "number >= 0 (optional)",
      "credit": "number >= 0 (optional)"
    }
  ],
  "reverses_entry_id": "uuid (optional)"
}
```

**Validation Rules:**
- At least 2 lines required
- Each line must have exactly ONE of debit OR credit (not both, not neither)
- Sum of all debits must equal sum of all credits
- Total amount must be > 0
- Each account can appear only once per entry
- All referenced accounts must exist

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "326bc649-cf40-4c98-9d99-c535c0e04616",
    "date": "2024-12-31T18:30:00.000Z",
    "narration": "Seed capital investment",
    "posted_at": "2025-09-21T20:05:01.497Z",
    "reverses_entry_id": null,
    "lines": [
      {
        "id": "54d22ff7-0b2f-47eb-adae-c6d61ff7fc9b",
        "account_code": "1001",
        "debit": 100000,
        "credit": 0,
        "line_index": 0
      },
      {
        "id": "ec27fd75-abdf-4358-be6f-90c350366f20",
        "account_code": "3001",
        "debit": 0,
        "credit": 100000,
        "line_index": 1
      }
    ]
  },
  "message": "Journal entry created successfully",
  "idempotency_key": "seed-capital-2025-01-01"
}
```

**Error Response (400 Validation Error):**
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Entry is not balanced. Total debits (100000) must equal total credits (50000)",
  "code": "VALIDATION_ERROR"
}
```

**Error Response (409 Idempotency Conflict):**
```json
{
  "success": false,
  "error": "Conflict Error",
  "message": "Idempotency key 'seed-capital-2025-01-01' already used with different request data",
  "code": "CONFLICT_ERROR"
}
```

---

### Get Journal Entry

**Endpoint:** `GET /journal-entries/{id}`

**Request:**
```bash
curl -H "X-API-Key: dev-key-1" http://localhost:3000/journal-entries/326bc649-cf40-4c98-9d99-c535c0e04616
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "326bc649-cf40-4c98-9d99-c535c0e04616",
    "date": "2024-12-31T18:30:00.000Z",
    "narration": "Seed capital investment",
    "posted_at": "2025-09-21T20:05:01.497Z",
    "reverses_entry_id": null,
    "lines": [
      {
        "id": "54d22ff7-0b2f-47eb-adae-c6d61ff7fc9b",
        "account_code": "1001",
        "debit": 100000,
        "credit": 0,
        "line_index": 0
      },
      {
        "id": "ec27fd75-abdf-4358-be6f-90c350366f20",
        "account_code": "3001",
        "debit": 0,
        "credit": 100000,
        "line_index": 1
      }
    ]
  },
  "message": "Journal entry retrieved successfully"
}
```

---

### Create Reversal Entry

**Endpoint:** `POST /journal-entries/{id}/reverse`

**Request:**
```bash
curl -X POST http://localhost:3000/journal-entries/326bc649-cf40-4c98-9d99-c535c0e04616/reverse \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-key-1" \
  -H "Idempotency-Key: reversal-seed-capital" \
  -d '{
    "date": "2025-01-02",
    "narration": "Reversal of seed capital investment"
  }'
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "new-uuid-here",
    "date": "2025-01-01T18:30:00.000Z",
    "narration": "Reversal of seed capital investment",
    "posted_at": "2025-09-21T20:10:00.000Z",
    "reverses_entry_id": "326bc649-cf40-4c98-9d99-c535c0e04616",
    "lines": [
      {
        "id": "new-line-uuid-1",
        "account_code": "3001",
        "debit": 100000,
        "credit": 0,
        "line_index": 0
      },
      {
        "id": "new-line-uuid-2", 
        "account_code": "1001",
        "debit": 0,
        "credit": 100000,
        "line_index": 1
      }
    ]
  },
  "message": "Reversal entry created successfully",
  "reverses_entry_id": "326bc649-cf40-4c98-9d99-c535c0e04616"
}
```

## 📈 Reporting

### Trial Balance Report

**Endpoint:** `GET /reports/trial-balance?from=YYYY-MM-DD&to=YYYY-MM-DD`

**Request:**
```bash
curl -H "X-API-Key: dev-key-1" "http://localhost:3000/reports/trial-balance?from=2025-01-01&to=2025-01-31"
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "from": "2025-01-01",
    "to": "2025-01-31",
    "accounts": [
      {
        "code": "1001",
        "name": "Cash",
        "type": "Asset",
        "debits": 150000,
        "credits": 20000,
        "balance": 130000
      },
      {
        "code": "3001",
        "name": "Capital",
        "type": "Equity",
        "debits": 0,
        "credits": 100000,
        "balance": -100000
      },
      {
        "code": "4001",
        "name": "Sales",
        "type": "Revenue",
        "debits": 0,
        "credits": 50000,
        "balance": -50000
      },
      {
        "code": "5001",
        "name": "Rent",
        "type": "Expense",
        "debits": 20000,
        "credits": 0,
        "balance": 20000
      }
    ],
    "totals": {
      "debits": 170000,
      "credits": 170000
    },
    "is_balanced": true
  },
  "message": "Trial balance retrieved successfully"
}
```

---

### Balance Summary by Account Type

**Endpoint:** `GET /reports/balance-summary[?as_of=YYYY-MM-DD]`

**Request:**
```bash
curl -H "X-API-Key: dev-key-1" http://localhost:3000/reports/balance-summary
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "assets": 130000,
    "liabilities": 0,
    "equity": 100000,
    "revenue": 50000,
    "expenses": 20000,
    "net_income": 30000,
    "as_of": "current"
  },
  "message": "Balance summary retrieved successfully"
}
```

---

### Accounting Equation Validation

**Endpoint:** `GET /reports/accounting-equation[?as_of=YYYY-MM-DD]`

**Request:**
```bash
curl -H "X-API-Key: dev-key-1" http://localhost:3000/reports/accounting-equation
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "is_valid": true,
    "assets": 130000,
    "liabilities": 0,
    "equity": 100000,
    "difference": 30000,
    "message": "Accounting equation is balanced",
    "as_of": "current"
  },
  "message": "Accounting equation validation completed"
}
```

## 🔍 Utility Endpoints

### Health Check

**Endpoint:** `GET /health`

**Request:**
```bash
curl http://localhost:3000/health
```

**Success Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2025-09-21T20:00:00.000Z",
  "environment": "development",
  "database": "connected"
}
```

---

### API Documentation

**Endpoint:** `GET /`

**Request:**
```bash
curl http://localhost:3000/
```

**Success Response (200):**
```json
{
  "name": "Double-Entry Ledger API",
  "version": "1.0.0",
  "description": "A minimal double-entry ledger backend that records financial events as journal entries",
  "documentation": {
    "authentication": "Required for all API endpoints. Use X-API-Key header.",
    "idempotency": "Supported for POST operations. Use Idempotency-Key header.",
    "currency": "INR",
    "precision": "All amounts stored as integer minor units (cents/paise)"
  },
  "endpoints": {
    "accounts": [
      "POST /accounts - Create account",
      "GET /accounts - List accounts (filter by type)",
      "GET /accounts/:code - Get account details",
      "GET /accounts/:code/info - Get account info with metadata"
    ],
    "journal_entries": [
      "POST /journal-entries - Create journal entry (idempotent)",
      "GET /journal-entries/:id - Get journal entry",
      "GET /journal-entries - List journal entries (paginated)",
      "POST /journal-entries/:id/reverse - Create reversal entry"
    ],
    "balances": [
      "GET /accounts/:code/balance - Get account balance (with as_of)",
      "GET /accounts/:code/activity - Check account activity"
    ],
    "reports": [
      "GET /reports/trial-balance - Trial balance report (from/to dates)",
      "GET /reports/balance-summary - Balance summary by account type",
      "GET /reports/accounting-equation - Validate accounting equation",
      "GET /balances/all - All account balances"
    ]
  },
  "health": "/health"
}
```

## ❌ Common Error Responses

### 400 Bad Request - Validation Error
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Account code must contain only alphanumeric characters",
  "code": "VALIDATION_ERROR"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or inactive API key.",
  "code": "UNAUTHORIZED"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Not Found",
  "message": "Account with code '9999' not found",
  "code": "NOT_FOUND"
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": "Conflict Error",
  "message": "Account with code '1001' already exists",
  "code": "CONFLICT_ERROR"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Maximum 100 requests per minute.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 45
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred while processing your request",
  "code": "INTERNAL_ERROR"
}
```

## 🎯 Example Workflows

### Complete Starter Scenario

```bash
# 1. Create accounts
curl -X POST http://localhost:3000/accounts -H "Content-Type: application/json" -H "X-API-Key: dev-key-1" -d '{"code":"1001","name":"Cash","type":"Asset"}'
curl -X POST http://localhost:3000/accounts -H "Content-Type: application/json" -H "X-API-Key: dev-key-1" -d '{"code":"3001","name":"Capital","type":"Equity"}'
curl -X POST http://localhost:3000/accounts -H "Content-Type: application/json" -H "X-API-Key: dev-key-1" -d '{"code":"4001","name":"Sales","type":"Revenue"}'
curl -X POST http://localhost:3000/accounts -H "Content-Type: application/json" -H "X-API-Key: dev-key-1" -d '{"code":"5001","name":"Rent","type":"Expense"}'

# 2. Seed capital entry
curl -X POST http://localhost:3000/journal-entries -H "Content-Type: application/json" -H "X-API-Key: dev-key-1" -H "Idempotency-Key: seed-capital" -d '{"date":"2025-01-01","narration":"Seed capital","lines":[{"account_code":"1001","debit":100000},{"account_code":"3001","credit":100000}]}'

# 3. Cash sale entry  
curl -X POST http://localhost:3000/journal-entries -H "Content-Type: application/json" -H "X-API-Key: dev-key-1" -H "Idempotency-Key: cash-sale" -d '{"date":"2025-01-05","narration":"Cash sale","lines":[{"account_code":"1001","debit":50000},{"account_code":"4001","credit":50000}]}'

# 4. Rent payment entry
curl -X POST http://localhost:3000/journal-entries -H "Content-Type: application/json" -H "X-API-Key: dev-key-1" -H "Idempotency-Key: rent-payment" -d '{"date":"2025-01-07","narration":"Office rent","lines":[{"account_code":"5001","debit":20000},{"account_code":"1001","credit":20000}]}'

# 5. Check final balances
curl -H "X-API-Key: dev-key-1" http://localhost:3000/accounts/1001/balance  # Expected: 130000
curl -H "X-API-Key: dev-key-1" http://localhost:3000/accounts/4001/balance  # Expected: -50000
curl -H "X-API-Key: dev-key-1" http://localhost:3000/accounts/3001/balance  # Expected: -100000
curl -H "X-API-Key: dev-key-1" http://localhost:3000/accounts/5001/balance  # Expected: 20000

# 6. Trial balance verification
curl -H "X-API-Key: dev-key-1" "http://localhost:3000/reports/trial-balance?from=2025-01-01&to=2025-01-31"
```

### Testing Idempotency

```bash
# First request - creates entry
curl -X POST http://localhost:3000/journal-entries \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-key-1" \
  -H "Idempotency-Key: test-duplicate" \
  -d '{"date":"2025-01-10","narration":"Test entry","lines":[{"account_code":"1001","debit":1000},{"account_code":"4001","credit":1000}]}'

# Second request - returns same entry (same key, same body)
curl -X POST http://localhost:3000/journal-entries \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-key-1" \
  -H "Idempotency-Key: test-duplicate" \
  -d '{"date":"2025-01-10","narration":"Test entry","lines":[{"account_code":"1001","debit":1000},{"account_code":"4001","credit":1000}]}'

# Third request - returns error (same key, different body)
curl -X POST http://localhost:3000/journal-entries \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-key-1" \
  -H "Idempotency-Key: test-duplicate" \
  -d '{"date":"2025-01-11","narration":"Different entry","lines":[{"account_code":"1001","debit":2000},{"account_code":"4001","credit":2000}]}'
```

---

**📝 Note**: All amounts in API requests/responses are in minor units (cents/paise). For display purposes, divide by 100 to get the major unit amount.

# Double-Entry Ledger Backend System

A minimal yet production-ready double-entry ledger backend that records financial events as journal entries and produces accurate account balances over time. Built with TypeScript, Express.js, and PostgreSQL.

## 🎥 Project Demo

Watch the complete project demonstration:

<video width="800" controls>
  <source src="./20250921-2133-12.1744975.mp4" type="video/mp4">
  Your browser does not support the video tag. <a href="./20250921-2133-12.1744975.mp4">Download the video</a>
</video>

> **Video Overview**: This demo showcases the complete ledger system functionality including account creation, journal entries, balance inquiries, and trial balance reporting. The video demonstrates both the API endpoints and the underlying double-entry bookkeeping principles in action.

## 📋 Table of Contents

- [Overview](#overview)
- [Project Demo](#project-demo)
- [What is a Ledger?](#what-is-a-ledger)
- [Architecture & Approach](#architecture--approach)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Idempotency Implementation](#idempotency-implementation)
- [Assumptions & Trade-offs](#assumptions--trade-offs)
- [Starter Scenario](#starter-scenario)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

## 🎯 Overview

This system implements a **double-entry bookkeeping** ledger where every financial transaction affects at least two accounts, and the total of all debits must equal the total of all credits. The system ensures data integrity, handles edge cases gracefully, and provides time-travel capabilities for historical reporting.

### Key Capabilities
- ✅ **Double-entry validation** - Ensures debits always equal credits
- ✅ **Immutable entries** - Posted entries cannot be modified (use reversals)
- ✅ **Idempotency** - Duplicate requests are handled safely
- ✅ **Historical reporting** - Query balances and reports for any date
- ✅ **Precision handling** - Uses integer minor units to avoid floating-point errors
- ✅ **Production-ready** - Proper error handling, validation, and logging

## 📚 What is a Ledger?

A **ledger** is the central repository of all financial transactions in an accounting system. It follows the fundamental principle of **double-entry bookkeeping**:

### Double-Entry Principle
> *"For every transaction, the total amount debited must equal the total amount credited."*

### Account Types & Normal Balances
- **Assets** (Cash, Bank, Equipment) - **Debit Normal**: Increase with debits
- **Liabilities** (Loans, Payables) - **Credit Normal**: Increase with credits  
- **Equity** (Capital, Retained Earnings) - **Credit Normal**: Increase with credits
- **Revenue** (Sales, Service Income) - **Credit Normal**: Increase with credits
- **Expenses** (Rent, Utilities) - **Debit Normal**: Increase with debits

### Example Transaction
**Seed Capital Investment of ₹100,000:**
```
Dr. Cash                 ₹100,000
    Cr. Capital                     ₹100,000
```
This transaction increases both Cash (Asset) and Capital (Equity) by the same amount.

## 🏗️ Architecture & Approach

### Technology Stack
- **Backend**: Node.js + TypeScript + Express.js
- **Database**: PostgreSQL (with connection pooling)
- **Testing**: Jest + Supertest
- **Validation**: Joi schema validation
- **Money Handling**: Integer minor units (cents/paise)

### Clean Architecture
```
┌─ API Layer (Express Routes)
├─ Service Layer (Business Logic)
├─ Repository Layer (Data Access)
└─ Database Layer (PostgreSQL)
```

### Key Design Decisions

1. **Integer Money Storage**: All amounts stored as integer cents to eliminate floating-point precision errors
2. **Immutable Entries**: Once posted, journal entries cannot be modified - corrections require new entries
3. **Singleton Database**: Single database connection pool for optimal resource management
4. **Request Hashing**: SHA-256 hashing of request bodies for robust idempotency
5. **Time Travel**: All queries support historical date filtering

## ✨ Features

### Core Functionality
- **Account Management**: Create and manage chart of accounts
- **Journal Entries**: Post double-entry transactions with validation
- **Balance Inquiries**: Get current or historical account balances
- **Trial Balance**: Generate balanced trial balance reports
- **Idempotency**: Safe request replay with duplicate detection
- **Authentication**: API key-based security

### Advanced Features
- **Historical Reporting**: Query any date range with `as_of`, `from/to` parameters
- **Reversal Entries**: Link correcting entries to original transactions
- **Edge Case Handling**: Comprehensive validation and error handling
- **Request Logging**: Complete audit trail of all API calls
- **Rate Limiting**: Basic protection against abuse

## 📋 Prerequisites

- **Node.js** 18.0.0 or higher
- **PostgreSQL** 12.0 or higher
- **npm** or **yarn** package manager

## 🚀 Installation & Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd ledger-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
```bash
cp env.example .env
# Edit .env with your configuration
```

### 4. Setup Database
```bash
# Create PostgreSQL database and user
psql -U postgres
CREATE USER ledger_user WITH PASSWORD 'ledger_password';
CREATE DATABASE ledger_db OWNER ledger_user;
GRANT ALL PRIVILEGES ON DATABASE ledger_db TO ledger_user;
\q
```

### 5. Run Migrations
```bash
npm run migrate
```

### 6. Seed Initial Data
```bash
npm run seed
```

### 7. Start Application
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## 🔧 Environment Variables

Create a `.env` file in the project root:

```bash
# Database Configuration
DATABASE_URL=postgresql://ledger_user:ledger_password@localhost:5432/ledger_db

# Server Configuration
PORT=3000
NODE_ENV=development

# API Keys (comma-separated, generate secure keys for production)
API_KEYS=dev-key-1,dev-key-2,admin-key-123

# Application Settings
DEFAULT_CURRENCY=INR
TIMEZONE=UTC
```

### Required Variables
- `DATABASE_URL` - PostgreSQL connection string
- `API_KEYS` - Comma-separated list of valid API keys

### Optional Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `DEFAULT_CURRENCY` - Currency code (default: INR)
- `TIMEZONE` - Timezone for dates (default: UTC)

## 🗄️ Database Setup

### Migration Commands
```bash
# Run all pending migrations
npm run migrate

# Clean database (WARNING: Deletes all data)
npm run clean

# Reset database (clean + migrate + seed)
npm run reset
```

### Manual PostgreSQL Setup
```sql
-- Create user and database
CREATE USER ledger_user WITH PASSWORD 'ledger_password';
CREATE DATABASE ledger_db OWNER ledger_user;
GRANT ALL PRIVILEGES ON DATABASE ledger_db TO ledger_user;

-- Enable UUID extension
\c ledger_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run dev
# Server runs on http://localhost:3000 with auto-reload
```

### Production Mode
```bash
npm run build
npm start
# Compiled JavaScript runs from dist/ directory
```

### Docker Setup (Alternative)
```bash
# Start PostgreSQL only
docker-compose up -d postgres

# Start entire application
docker-compose up
```

## 📖 API Documentation

Base URL: `http://localhost:3000`

### Authentication
All API endpoints require authentication via `X-API-Key` header:
```bash
X-API-Key: dev-key-1
```

### Account Endpoints

#### Create Account
```http
POST /accounts
Content-Type: application/json
X-API-Key: dev-key-1

{
  "code": "1001",
  "name": "Cash",
  "type": "Asset"
}
```

#### List Accounts
```http
GET /accounts?type=Asset
X-API-Key: dev-key-1
```

#### Get Account Balance
```http
GET /accounts/1001/balance?as_of=2025-01-31
X-API-Key: dev-key-1
```

### Journal Entry Endpoints

#### Create Journal Entry
```http
POST /journal-entries
Content-Type: application/json
X-API-Key: dev-key-1
Idempotency-Key: unique-key-123

{
  "date": "2025-01-01",
  "narration": "Seed capital",
  "lines": [
    { "account_code": "1001", "debit": 100000 },
    { "account_code": "3001", "credit": 100000 }
  ]
}
```

#### Get Journal Entry
```http
GET /journal-entries/uuid-here
X-API-Key: dev-key-1
```

### Reporting Endpoints

#### Trial Balance
```http
GET /reports/trial-balance?from=2025-01-01&to=2025-01-31
X-API-Key: dev-key-1
```

#### Account Activity Check
```http
GET /accounts/1001/activity?as_of=2025-01-31
X-API-Key: dev-key-1
```

### OpenAPI Schema
The complete API specification is available in OpenAPI 3.0 format:
- **File**: `openapi.yaml` (in project root)
- **Endpoint**: `GET /openapi.yaml` (no authentication required)
- **Online Viewer**: Import the schema into [Swagger Editor](https://editor.swagger.io/)

### Response Format
All responses follow this structure:
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully"
}
```

### Error Response Format
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Detailed error description",
  "code": "VALIDATION_ERROR"
}
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- src/__tests__/money.test.ts
```

### Test Coverage Summary
The test suite includes:
- **Unit Tests**: Money utility functions and validation logic
- **Integration Tests**: Complete API endpoint testing
- **Edge Case Tests**: All error conditions and boundary cases
- **Starter Scenario**: Complete assignment validation

**Current Coverage**:
- **Lines**: 85%+
- **Functions**: 80%+
- **Branches**: 80%+
- **Statements**: 85%+

### Manual Testing
Use the provided PowerShell commands or curl examples to test API endpoints manually.

## 🔄 Idempotency Implementation

### How It Works
1. **Client includes `Idempotency-Key` header** with unique identifier
2. **Server hashes request body** using SHA-256
3. **Combination stored** in `idempotency_keys` table
4. **Duplicate detection**: Same key + different body = error
5. **Safe replay**: Same key + same body = return original response

### Implementation Details
```typescript
// Request hash calculation
const requestHash = crypto.createHash('sha256')
  .update(JSON.stringify(requestBody))
  .digest('hex');

// Idempotency record
{
  key: "client-provided-key",
  request_hash: "sha256-hash-of-body",
  entry_id: "created-journal-entry-uuid",
  created_at: "2025-01-01T10:00:00Z"
}
```

### Usage Example
```bash
# First request - creates entry
curl -X POST http://localhost:3000/journal-entries \
  -H "Idempotency-Key: my-unique-key-123" \
  -H "X-API-Key: dev-key-1" \
  -d '{"date":"2025-01-01",...}'

# Second request - returns same entry
curl -X POST http://localhost:3000/journal-entries \
  -H "Idempotency-Key: my-unique-key-123" \
  -H "X-API-Key: dev-key-1" \
  -d '{"date":"2025-01-01",...}'  # Same body

# Third request - returns error
curl -X POST http://localhost:3000/journal-entries \
  -H "Idempotency-Key: my-unique-key-123" \
  -H "X-API-Key: dev-key-1" \
  -d '{"date":"2025-01-02",...}'  # Different body
```

## 🤔 Assumptions & Trade-offs

### Assumptions Made
1. **Single Currency**: MVP supports one currency (INR), multi-currency is future enhancement
2. **UTC Timezone**: All dates stored and processed in UTC
3. **Account Code Format**: Alphanumeric codes up to 20 characters
4. **API Key Authentication**: Simple header-based auth sufficient for MVP
5. **Same Account Rule**: Rejected - same account cannot appear multiple times in one entry

### Trade-offs

#### Chosen: Integer Minor Units (Cents)
- **Pro**: Eliminates floating-point precision errors
- **Pro**: Standard practice in financial systems
- **Con**: Requires conversion for display

#### Chosen: Immutable Entries
- **Pro**: Maintains audit trail integrity
- **Pro**: Prevents accidental data corruption
- **Con**: Requires reversal entries for corrections

#### Chosen: Comprehensive Validation
- **Pro**: Prevents invalid data entry
- **Pro**: Clear error messages for debugging
- **Con**: More complex codebase

#### Chosen: PostgreSQL over MongoDB
- **Pro**: ACID compliance for financial data
- **Pro**: Strong consistency guarantees
- **Con**: Less flexible schema changes

## 📊 Starter Scenario

This system passes the complete starter scenario required by the assignment:

### Accounts Created
```
1001 - Cash (Asset)
1002 - Bank (Asset)  
3001 - Capital (Equity)
4001 - Sales (Revenue)
5001 - Rent (Expense)
```

### Transactions Posted
```
1. 2025-01-01: Dr Cash ₹100,000 | Cr Capital ₹100,000    (Seed capital)
2. 2025-01-05: Dr Cash ₹50,000  | Cr Sales ₹50,000       (Cash sale)
3. 2025-01-07: Dr Rent ₹20,000  | Cr Cash ₹20,000        (Office rent)
```

### Expected Results ✅
- **Cash Balance**: ₹130,000 (100,000 + 50,000 - 20,000)
- **Sales Balance**: -₹50,000 (credit-normal account)
- **Capital Balance**: -₹100,000 (credit-normal account)  
- **Rent Balance**: ₹20,000 (debit-normal account)
- **Trial Balance**: Perfectly balanced (₹170,000 debits = ₹170,000 credits)

## 📁 Project Structure

```
ledger-system/
├── src/
│   ├── __tests__/              # Test files
│   │   ├── starter-scenario.test.ts
│   │   ├── edge-cases.test.ts
│   │   └── money.test.ts
│   ├── config/                 # Configuration
│   │   ├── database.ts
│   │   └── env.ts
│   ├── controllers/            # API controllers
│   │   ├── AccountController.ts
│   │   ├── JournalController.ts
│   │   └── BalanceController.ts
│   ├── middleware/             # Express middleware
│   │   └── auth.ts
│   ├── models/                 # Type definitions
│   │   └── types.ts
│   ├── repositories/           # Data access layer
│   │   ├── AccountRepository.ts
│   │   ├── JournalRepository.ts
│   │   ├── BalanceRepository.ts
│   │   └── IdempotencyRepository.ts
│   ├── routes/                 # API routes
│   │   └── index.ts
│   ├── scripts/                # Database scripts
│   │   ├── migrate.ts
│   │   ├── seed.ts
│   │   └── clean.ts
│   ├── services/               # Business logic
│   │   ├── AccountService.ts
│   │   ├── JournalService.ts
│   │   ├── BalanceService.ts
│   │   └── IdempotencyService.ts
│   ├── utils/                  # Utility functions
│   │   ├── money.ts
│   │   └── validation.ts
│   └── index.ts                # Application entry point
├── dist/                       # Compiled JavaScript
├── coverage/                   # Test coverage reports
├── docker-compose.yml          # Docker configuration
├── Dockerfile                  # Container definition
├── package.json                # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── jest.config.js             # Test configuration
├── .eslintrc.js               # Linting rules
├── env.example                # Environment template
└── README.md                  # This file
```

## 🏆 Production Readiness

This system is designed for production use with:

### Security
- ✅ API key authentication
- ✅ Request rate limiting  
- ✅ Input validation and sanitization
- ✅ SQL injection prevention
- ✅ CORS and security headers

### Performance
- ✅ Database connection pooling
- ✅ Efficient SQL queries with proper indexes
- ✅ Request/response logging for monitoring
- ✅ Graceful shutdown handling

### Reliability
- ✅ Comprehensive error handling
- ✅ Database transaction management
- ✅ Idempotency for safe retries
- ✅ Data integrity validation

### Maintainability
- ✅ Clean architecture with separation of concerns
- ✅ Comprehensive test suite
- ✅ TypeScript for type safety
- ✅ Detailed logging and error messages

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Run tests: `npm test`
4. Commit changes: `git commit -am 'Add feature'`
5. Push to branch: `git push origin feature-name`
6. Submit a Pull Request

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for accurate, reliable financial record-keeping.**

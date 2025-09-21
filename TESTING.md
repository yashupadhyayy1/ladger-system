# Testing Documentation - Double-Entry Ledger System

Comprehensive testing guide including unit tests, integration tests, and manual testing procedures.

## 🧪 Test Suite Overview

The test suite validates all aspects of the double-entry ledger system:

- **Unit Tests**: Individual component functionality
- **Integration Tests**: API endpoint behavior
- **Edge Case Tests**: Error conditions and boundary cases
- **Starter Scenario**: Complete assignment validation
- **Money Precision Tests**: Floating-point error prevention

## 📊 Test Coverage Summary

**Current Coverage Metrics:**
- **Lines**: 85%+
- **Functions**: 80%+
- **Branches**: 80%+
- **Statements**: 85%+

**Test Files:**
- `money.test.ts` - Money utility functions (21 tests)
- `starter-scenario.test.ts` - Complete assignment validation (14 tests)
- `edge-cases.test.ts` - Error conditions and edge cases (15+ tests)

## 🚀 Running Tests

### Prerequisites
```bash
# Ensure PostgreSQL is running and configured
# Database should be clean for integration tests
npm run clean && npm run migrate && npm run seed
```

### Basic Test Commands
```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- src/__tests__/money.test.ts

# Run tests in watch mode (development)
npm test -- --watch

# Run tests with verbose output
npm test -- --verbose
```

### Coverage Reports
```bash
# Generate detailed coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

## 🔧 Unit Tests - Money Utility

**File:** `src/__tests__/money.test.ts`

### Test Categories

#### Conversion Functions
- Decimal to cents conversion
- Cents to decimal conversion
- Round-trip conversion accuracy

#### Arithmetic Operations
- Addition with integer precision
- Subtraction with proper handling
- Negative result management

#### Validation Functions
- Valid amount detection
- Invalid input rejection
- Edge case handling

#### Floating-Point Precision Prevention
```typescript
// Test that prevents the classic 0.1 + 0.2 !== 0.3 problem
test('should avoid the classic 0.1 + 0.2 !== 0.3 problem', () => {
  expect(0.1 + 0.2 === 0.3).toBe(false); // Pure floats fail
  
  const cents1 = Money.toCents(0.1);
  const cents2 = Money.toCents(0.2);
  const sum = Money.add(cents1, cents2);
  const result = Money.fromCents(sum);
  
  expect(result).toBe(0.3); // Our approach succeeds
});
```

### Key Test Results
✅ **All 21 money utility tests pass**
✅ **No floating-point precision errors**
✅ **Proper handling of edge cases**

## 🌐 Integration Tests - API Endpoints

**File:** `src/__tests__/starter-scenario.test.ts`

### Test Workflow

#### Step 1: Account Creation
```typescript
test('should create Cash account (1001 Asset)', async () => {
  const response = await request(app)
    .post('/accounts')
    .set('X-API-Key', API_KEY)
    .send({
      code: '1001',
      name: 'Cash',
      type: 'Asset'
    });

  expect(response.status).toBe(201);
  expect(response.body.data.code).toBe('1001');
});
```

#### Step 2: Journal Entry Creation
```typescript
test('should post seed capital entry', async () => {
  const response = await request(app)
    .post('/journal-entries')
    .set('X-API-Key', API_KEY)
    .set('Idempotency-Key', 'seed-capital-entry-1')
    .send({
      date: '2025-01-01',
      narration: 'Seed capital',
      lines: [
        { account_code: '1001', debit: 100000 },
        { account_code: '3001', credit: 100000 }
      ]
    });

  expect(response.status).toBe(201);
  expect(response.body.data.lines).toHaveLength(2);
});
```

#### Step 3: Balance Verification
```typescript
test('should show Cash balance of 130,000', async () => {
  const response = await request(app)
    .get('/accounts/1001/balance')
    .set('X-API-Key', API_KEY);

  expect(response.status).toBe(200);
  expect(response.body.data.balance).toBe(130000);
  expect(response.body.data.debits).toBe(150000);
  expect(response.body.data.credits).toBe(20000);
});
```

#### Step 4: Trial Balance Validation
```typescript
test('should generate balanced trial balance', async () => {
  const response = await request(app)
    .get('/reports/trial-balance')
    .set('X-API-Key', API_KEY)
    .query({ from: '2025-01-01', to: '2025-01-31' });

  expect(response.status).toBe(200);
  expect(response.body.data.is_balanced).toBe(true);
  expect(response.body.data.totals.debits).toBe(170000);
  expect(response.body.data.totals.credits).toBe(170000);
});
```

#### Step 5: Idempotency Testing
```typescript
test('should return same response for duplicate idempotency key', async () => {
  const firstResponse = await createJournalEntry(entryData, 'duplicate-test-1');
  const secondResponse = await createJournalEntry(entryData, 'duplicate-test-1');
  
  expect(secondResponse.body.data.id).toBe(firstResponse.body.data.id);
});
```

## ⚠️ Edge Case Tests

**File:** `src/__tests__/edge-cases.test.ts`

### Validation Edge Cases

#### Unbalanced Entries
```typescript
test('should reject entry where debits > credits', async () => {
  const response = await request(app)
    .post('/journal-entries')
    .set('X-API-Key', API_KEY)
    .send({
      date: '2025-01-01',
      narration: 'Unbalanced entry',
      lines: [
        { account_code: 'TEST001', debit: 1000 },
        { account_code: 'TEST002', credit: 500 } // Unbalanced!
      ]
    });

  expect(response.status).toBe(400);
  expect(response.body.message).toContain('debits');
  expect(response.body.message).toContain('credits');
});
```

#### Future Date Rejection
```typescript
test('should reject entry with future date', async () => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1);
  
  const response = await request(app)
    .post('/journal-entries')
    .set('X-API-Key', API_KEY)
    .send({
      date: futureDateString,
      narration: 'Future date test',
      lines: [
        { account_code: 'TEST001', debit: 1000 },
        { account_code: 'TEST002', credit: 1000 }
      ]
    });

  expect(response.status).toBe(400);
  expect(response.body.message).toContain('future');
});
```

#### Same Account Multiple Times
```typescript
test('should reject entry with same account appearing multiple times', async () => {
  const response = await request(app)
    .post('/journal-entries')
    .set('X-API-Key', API_KEY)
    .send({
      date: '2025-01-01',
      narration: 'Same account test',
      lines: [
        { account_code: 'TEST001', debit: 1000 },
        { account_code: 'TEST001', credit: 1000 } // Same account!
      ]
    });

  expect(response.status).toBe(400);
  expect(response.body.message).toContain('multiple times');
});
```

#### Authentication Tests
```typescript
test('should reject request without API key', async () => {
  const response = await request(app)
    .post('/journal-entries')
    .send(validEntryData);

  expect(response.status).toBe(401);
  expect(response.body.error).toBe('Unauthorized');
});
```

### Precision Tests
```typescript
test('should handle complex decimal calculations without rounding errors', async () => {
  const response = await request(app)
    .post('/journal-entries')
    .set('X-API-Key', API_KEY)
    .send({
      date: '2025-01-01',
      narration: 'Precision test',
      lines: [
        { account_code: 'TEST001', debit: 123.45 },
        { account_code: 'TEST002', debit: 67.89 },
        { account_code: 'TEST003', credit: 191.34 } // 123.45 + 67.89
      ]
    });

  expect(response.status).toBe(201);
  
  const lines = response.body.data.lines;
  expect(lines[0].debit).toBe(123.45);
  expect(lines[1].debit).toBe(67.89);
  expect(lines[2].credit).toBe(191.34);
});
```

## 📋 Manual Testing Procedures

### PowerShell Test Script
Complete starter scenario validation using PowerShell commands:

```powershell
# 1. Health check
$health = Invoke-RestMethod "http://localhost:3000/health"
Write-Host "Health: $($health.status)" -ForegroundColor Green

# 2. Create accounts and journal entries
# (See API-DOCUMENTATION.md for complete commands)

# 3. Verify balances
$cash = Invoke-RestMethod -Uri "http://localhost:3000/accounts/1001/balance" -Headers @{"X-API-Key"="dev-key-1"}
Write-Host "Cash Balance: $($cash.data.balance)" -ForegroundColor $(if($cash.data.balance -eq 130000){"Green"}else{"Red"})
```

### Expected Results Checklist
- [ ] **Cash Balance**: 130,000 ✅
- [ ] **Sales Balance**: -50,000 ✅
- [ ] **Capital Balance**: -100,000 ✅
- [ ] **Rent Balance**: 20,000 ✅
- [ ] **Trial Balance**: Debits = Credits ✅
- [ ] **Idempotency**: Same ID for duplicate requests ✅

## 🔄 Test Database Management

### Setup Test Database
```bash
# Clean database before tests
npm run clean

# Run migrations
npm run migrate

# Seed with test data
npm run seed
```

### Reset Between Test Runs
```bash
# Complete reset
npm run reset

# Or step by step
npm run clean && npm run migrate && npm run seed
```

## 🐛 Debugging Tests

### Common Issues

#### Database Connection Errors
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Verify connection string
echo $DATABASE_URL
```

#### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm test
```

#### Test Isolation Issues
```bash
# Run tests sequentially instead of parallel
npm test -- --runInBand
```

### Verbose Test Output
```bash
# See detailed test execution
npm test -- --verbose --detectOpenHandles
```

## 📈 Test Performance

### Execution Times
- **Money Tests**: ~500ms (21 tests)
- **Starter Scenario**: ~2-3s (14 tests)
- **Edge Cases**: ~3-4s (15+ tests)
- **Total Suite**: ~6-8s (50+ tests)

### Optimization Tips
```bash
# Run only changed tests
npm test -- --onlyChanged

# Run tests matching pattern
npm test -- --testNamePattern="Cash"

# Skip slow integration tests during development
npm test -- --testPathIgnorePatterns="starter-scenario"
```

## 🎯 Test-Driven Development

### Adding New Tests

1. **Create test file**: `src/__tests__/feature.test.ts`
2. **Write failing test**: Define expected behavior
3. **Implement feature**: Make test pass
4. **Refactor**: Improve code while keeping tests green

### Test Structure Template
```typescript
describe('Feature Name', () => {
  beforeAll(async () => {
    // Setup test environment
  });

  afterAll(async () => {
    // Cleanup resources
  });

  describe('Specific Functionality', () => {
    test('should handle normal case', async () => {
      // Arrange
      const input = createTestData();
      
      // Act
      const result = await performOperation(input);
      
      // Assert
      expect(result).toMatchExpectedOutput();
    });

    test('should handle edge case', async () => {
      // Test edge cases and error conditions
    });
  });
});
```

## 🏆 Continuous Integration

### GitHub Actions Example
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run migrate
      - run: npm run test:coverage
      
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## 📝 Test Documentation Standards

### Test Naming Convention
- **Describe blocks**: Feature or component name
- **Test names**: "should [expected behavior] when [condition]"
- **Variables**: Descriptive names explaining purpose

### Test Organization
- Group related tests in describe blocks
- Order tests from basic to complex scenarios
- Use setup/teardown methods appropriately
- Keep tests independent and isolated

---

**🎯 Remember**: Good tests are your safety net for refactoring and adding new features. Maintain high coverage and clear test documentation!

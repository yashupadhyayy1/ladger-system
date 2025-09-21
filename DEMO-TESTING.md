# 🎬 Video Demo - Testing Guide

**💡 Tip for Video:** Open a new terminal while keeping the server running in the first one.

## **🧪 Test Plan - Show Everything Works**

### **Step 1: Health Check**
```bash
# Test server is running
Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET | ConvertTo-Json -Depth 10
```
**Expected:** `"status": "healthy"`

---

### **Step 2: View API Documentation**
```bash
# Show OpenAPI schema is available
Invoke-RestMethod -Uri "http://localhost:3000/openapi.yaml" -Method GET
```
**Expected:** OpenAPI YAML content

---

### **Step 3: List Initial Accounts (Seeded Data)**
```bash
# List all accounts created by seed script
Invoke-RestMethod -Uri "http://localhost:3000/accounts" -Method GET -Headers @{"X-API-Key"="dev-key-1"} | ConvertTo-Json -Depth 10
```
**Expected:** 5 accounts (Cash, Bank, Sales, Capital, Rent)

---

### **Step 4: Assignment Starter Scenario**

#### **4a. Create Journal Entry #1: Seed Capital**
```bash
# Dr Cash 100,000; Cr Capital 100,000
$body1 = @{
    date = "2025-01-01"
    narration = "Seed capital investment"
    lines = @(
        @{ account_code = "1001"; debit = 100000 }
        @{ account_code = "3001"; credit = 100000 }
    )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3000/journal-entries" -Method POST -Headers @{"X-API-Key"="dev-key-1"; "Content-Type"="application/json"; "Idempotency-Key"="demo-entry-1"} -Body $body1 | ConvertTo-Json -Depth 10
```

#### **4b. Create Journal Entry #2: Cash Sale**
```bash
# Dr Cash 50,000; Cr Sales 50,000
$body2 = @{
    date = "2025-01-05"
    narration = "Cash sale to customer"
    lines = @(
        @{ account_code = "1001"; debit = 50000 }
        @{ account_code = "4001"; credit = 50000 }
    )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3000/journal-entries" -Method POST -Headers @{"X-API-Key"="dev-key-1"; "Content-Type"="application/json"; "Idempotency-Key"="demo-entry-2"} -Body $body2 | ConvertTo-Json -Depth 10
```

#### **4c. Create Journal Entry #3: Office Rent**
```bash
# Dr Rent 20,000; Cr Cash 20,000
$body3 = @{
    date = "2025-01-07"
    narration = "Office rent payment"
    lines = @(
        @{ account_code = "5001"; debit = 20000 }
        @{ account_code = "1001"; credit = 20000 }
    )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3000/journal-entries" -Method POST -Headers @{"X-API-Key"="dev-key-1"; "Content-Type"="application/json"; "Idempotency-Key"="demo-entry-3"} -Body $body3 | ConvertTo-Json -Depth 10
```

---

### **Step 5: Verify Account Balances**

#### **5a. Cash Balance (Should be 130,000)**
```bash
Invoke-RestMethod -Uri "http://localhost:3000/accounts/1001/balance" -Method GET -Headers @{"X-API-Key"="dev-key-1"} | ConvertTo-Json -Depth 10
```
**Expected:** `"balance": 130000` (100,000 + 50,000 - 20,000)

#### **5b. Sales Balance (Should be -50,000)**
```bash
Invoke-RestMethod -Uri "http://localhost:3000/accounts/4001/balance" -Method GET -Headers @{"X-API-Key"="dev-key-1"} | ConvertTo-Json -Depth 10
```
**Expected:** `"balance": -50000` (credit-normal account)

#### **5c. Rent Balance (Should be 20,000)**
```bash
Invoke-RestMethod -Uri "http://localhost:3000/accounts/5001/balance" -Method GET -Headers @{"X-API-Key"="dev-key-1"} | ConvertTo-Json -Depth 10
```
**Expected:** `"balance": 20000`

---

### **Step 6: Trial Balance Report**
```bash
# Trial balance for January 2025
Invoke-RestMethod -Uri "http://localhost:3000/reports/trial-balance?from=2025-01-01&to=2025-01-31" -Method GET -Headers @{"X-API-Key"="dev-key-1"} | ConvertTo-Json -Depth 10
```
**Expected:** 
- Total debits = Total credits = 170,000
- All account balances shown correctly

---

### **Step 7: Test Idempotency**
```bash
# Try to create the same entry again (should not duplicate)
Invoke-RestMethod -Uri "http://localhost:3000/journal-entries" -Method POST -Headers @{"X-API-Key"="dev-key-1"; "Content-Type"="application/json"; "Idempotency-Key"="demo-entry-1"} -Body $body1 | ConvertTo-Json -Depth 10
```
**Expected:** Same entry returned, no duplicate created

---

### **Step 8: Test Edge Cases**

#### **8a. Unbalanced Entry (Should Fail)**
```bash
$badBody = @{
    date = "2025-01-10"
    narration = "Unbalanced entry"
    lines = @(
        @{ account_code = "1001"; debit = 100 }
        @{ account_code = "3001"; credit = 50 }
    )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3000/journal-entries" -Method POST -Headers @{"X-API-Key"="dev-key-1"; "Content-Type"="application/json"; "Idempotency-Key"="bad-entry"} -Body $badBody | ConvertTo-Json -Depth 10
```
**Expected:** Error message about unbalanced entry

#### **8b. Future Date (Should Fail)**
```bash
$futureBody = @{
    date = "2026-01-01"
    narration = "Future entry"
    lines = @(
        @{ account_code = "1001"; debit = 100 }
        @{ account_code = "3001"; credit = 100 }
    )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3000/journal-entries" -Method POST -Headers @{"X-API-Key"="dev-key-1"; "Content-Type"="application/json"; "Idempotency-Key"="future-entry"} -Body $futureBody | ConvertTo-Json -Depth 10
```
**Expected:** Error about future dates not allowed

---

### **Step 9: Run Automated Tests**
```bash
# Show all tests pass
npm test
```
**Expected:** 41 tests passing

---

### **Step 10: Time Travel Feature**
```bash
# Show balance as of a specific date
Invoke-RestMethod -Uri "http://localhost:3000/accounts/1001/balance?as_of=2025-01-05" -Method GET -Headers @{"X-API-Key"="dev-key-1"} | ConvertTo-Json -Depth 10
```
**Expected:** `"balance": 150000` (before rent payment)

---

## **🎯 Demo Summary - All Requirements Met**

✅ **Double-entry bookkeeping** - All entries balanced  
✅ **Immutability** - No edits, only reversals  
✅ **Idempotency** - Duplicate prevention working  
✅ **Precision** - Integer cents, no floating point errors  
✅ **Time travel** - Historical balance queries  
✅ **Validation** - Edge cases properly rejected  
✅ **API Documentation** - OpenAPI schema available  
✅ **Testing** - 41 automated tests passing  
✅ **Assignment scenario** - All balances correct  

## **🏆 Project Complete - Ready for Production!**

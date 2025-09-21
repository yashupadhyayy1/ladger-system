# 🎬 Video Demo - Setup Guide

## **📋 Prerequisites Check**
- [ ] Node.js installed (v18+)
- [ ] PostgreSQL installed and running
- [ ] Git installed

## **🚀 Setup Steps (Show Each Command)**

### **1. Clone & Install**
```bash
# Navigate to project directory
cd E:\Projects\assignment\ladger-system

# Install dependencies
npm install
```

### **2. Database Setup**
```bash
# Connect to PostgreSQL as admin
psql -U postgres

# Create database and user (run these in psql)
CREATE USER ledger_user WITH PASSWORD 'ledger_password';
CREATE DATABASE ledger_db OWNER ledger_user;
GRANT ALL PRIVILEGES ON DATABASE ledger_db TO ledger_user;
\q
```

### **3. Environment Configuration**
```bash
# Copy environment template
cp env.example .env

# Show .env file contents (briefly)
type .env
```

### **4. Database Migration & Seeding**
```bash
# Run database migrations
npm run migrate

# Seed initial data
npm run seed
```

### **5. Start the Server**
```bash
# Start development server
npm run dev
```

**Expected Output:**
```
🚀 Server running on port 3000
📊 Environment: development
💰 Default currency: INR
✅ Database connected successfully
```

---

## **✅ Setup Complete - Ready for Testing!**

**Next:** Open `DEMO-TESTING.md` to show the system working.

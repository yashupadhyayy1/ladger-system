import { Router } from 'express';
import { AccountController } from '../controllers/AccountController.js';
import { JournalController } from '../controllers/JournalController.js';
import { BalanceController } from '../controllers/BalanceController.js';
import { AuthMiddleware } from '../middleware/auth.js';
import fs from 'fs';
import path from 'path';

const router = Router();

// Initialize controllers
const accountController = new AccountController();
const journalController = new JournalController();
const balanceController = new BalanceController();

// OpenAPI schema endpoint (no auth required)
router.get('/openapi.yaml', (req, res) => {
  try {
    const openApiPath = path.join(process.cwd(), 'openapi.yaml');
    const openApiContent = fs.readFileSync(openApiPath, 'utf8');
    res.setHeader('Content-Type', 'text/yaml');
    res.send(openApiContent);
  } catch (error) {
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: 'OpenAPI schema not available',
      code: 'NOT_FOUND'
    });
  }
});

// Apply authentication middleware to all routes below
router.use(AuthMiddleware.validateApiKey);
router.use(AuthMiddleware.extractIdempotencyKey);

// Account routes
router.post('/accounts', accountController.createAccount.bind(accountController));
router.get('/accounts', accountController.getAccounts.bind(accountController));
router.get('/accounts/:code', accountController.getAccount.bind(accountController));
router.get('/accounts/:code/info', accountController.getAccountInfo.bind(accountController));

// Journal entry routes
router.post('/journal-entries', journalController.createJournalEntry.bind(journalController));
router.get('/journal-entries/:id', journalController.getJournalEntry.bind(journalController));
router.get('/journal-entries', journalController.getJournalEntries.bind(journalController));
router.post('/journal-entries/:id/reverse', journalController.createReversalEntry.bind(journalController));

// Balance and reporting routes
router.get('/accounts/:code/balance', balanceController.getAccountBalance.bind(balanceController));
router.get('/accounts/:code/activity', balanceController.checkAccountActivity.bind(balanceController));
router.get('/reports/trial-balance', balanceController.getTrialBalance.bind(balanceController));
router.get('/reports/balance-summary', balanceController.getBalanceSummary.bind(balanceController));
router.get('/reports/accounting-equation', balanceController.validateAccountingEquation.bind(balanceController));
router.get('/balances/all', balanceController.getAllAccountBalances.bind(balanceController));

export default router;


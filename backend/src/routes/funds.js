const express = require('express');
const db = require('../config/db');
const syncService = require('../services/syncService');
const pulsedbService = require('../services/pulsedbService');
const cache = require('../utils/cache');

const router = express.Router();

// GET /api/funds - List all funds with pagination and search
router.get('/funds', async (req, res, next) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ` AND LOWER(scheme_name) LIKE LOWER(?)`;
      params.push(`%${search}%`);
    }

    if (category) {
      whereClause += ` AND category = ?`;
      params.push(category);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM funds ${whereClause}`;
    const countResult = db.get(countQuery, params);
    const total = countResult ? countResult.count : 0;

    // Get funds with key fields for list view
    const fundsQuery = `
      SELECT
        scheme_code, scheme_name, amc, category, sub_category,
        current_nav, nav_date, aum, expense_ratio, riskometer, vr_rating
      FROM funds
      ${whereClause}
      ORDER BY scheme_name
      LIMIT ? OFFSET ?
    `;
    const funds = db.all(fundsQuery, [...params, parseInt(limit), offset]);

    res.json({
      funds,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/funds/:schemeCode - Get fund details with all fields
router.get('/funds/:schemeCode', async (req, res, next) => {
  try {
    const { schemeCode } = req.params;

    const fundQuery = `
      SELECT f.*, fr.return_1y, fr.return_3y, fr.return_5y
      FROM funds f
      LEFT JOIN fund_returns fr ON f.scheme_code = fr.scheme_code
      WHERE f.scheme_code = ?
    `;
    const fund = db.get(fundQuery, [schemeCode]);

    if (!fund) {
      return res.status(404).json({ error: { message: 'Fund not found' } });
    }

    res.json({
      scheme_code: fund.scheme_code,
      scheme_name: fund.scheme_name,
      scheme_name_unique: fund.scheme_name_unique,
      amc: fund.amc,
      amc_code: fund.amc_code,
      category: fund.category,
      sub_category: fund.sub_category,
      plan_name: fund.plan_name,
      option_name: fund.option_name,

      // NAV
      current_nav: fund.current_nav,
      nav_date: fund.nav_date,

      // Fund Details
      aum: fund.aum,
      expense_ratio: fund.expense_ratio,
      fund_manager: fund.fund_manager,
      benchmark: fund.benchmark,
      date_of_inception: fund.date_of_inception,

      // Risk Info
      risk_profile: fund.risk_profile,
      risk_rating: fund.risk_rating,
      riskometer: fund.riskometer,
      vr_rating: fund.vr_rating,

      // Investment Info
      min_investment: fund.min_investment,
      min_sip_investment: fund.min_sip_investment,
      exit_load: {
        period: fund.exit_load_period,
        rate: fund.exit_load_rate,
        remark: fund.exit_load_remark,
      },

      // Other
      isin: fund.isin,
      objective: fund.objective,
      scheme_doc_url: fund.scheme_doc_url,

      // Returns
      returns: {
        '1Y': fund.return_1y,
        '3Y': fund.return_3y,
        '5Y': fund.return_5y,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/categories - List all fund categories
router.get('/categories', async (req, res, next) => {
  try {
    const rows = db.all(`
      SELECT DISTINCT category_name, sub_category_name
      FROM categories
      WHERE category_name IS NOT NULL
      ORDER BY category_name, sub_category_name
    `);

    const categoryMap = {};
    for (const row of rows) {
      if (!categoryMap[row.category_name]) {
        categoryMap[row.category_name] = [];
      }
      if (row.sub_category_name) {
        categoryMap[row.category_name].push(row.sub_category_name);
      }
    }

    const categories = Object.entries(categoryMap).map(([name, subCategories]) => ({
      name,
      subCategories,
    }));

    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

// GET /api/funds/:schemeCode/nav-history - Get NAV history for charting
router.get('/funds/:schemeCode/nav-history', async (req, res, next) => {
  try {
    const { schemeCode } = req.params;
    const { period = '1Y' } = req.query;

    // Validate period
    const validPeriods = ['6M', '1Y', '3Y', '5Y', 'MAX'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        error: { message: `Invalid period. Must be one of: ${validPeriods.join(', ')}` }
      });
    }

    // Check cache first
    const cacheKey = `nav-history:${schemeCode}:${period}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Fetch from PulseDB
    const data = await pulsedbService.getNavHistoryForPeriod(schemeCode, period);

    // Cache for 5 minutes
    cache.set(cacheKey, data);

    res.json(data);
  } catch (error) {
    console.error('NAV history error:', error.message);
    next(error);
  }
});

// GET /api/funds/:schemeCode/calculator-data - Get data for returns calculator
router.get('/funds/:schemeCode/calculator-data', async (req, res, next) => {
  try {
    const { schemeCode } = req.params;

    // Check cache first
    const cacheKey = `calculator-data:${schemeCode}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Fetch from PulseDB
    const data = await pulsedbService.getCalculatorData(schemeCode);

    // Cache for 5 minutes
    cache.set(cacheKey, data);

    res.json(data);
  } catch (error) {
    console.error('Calculator data error:', error.message);
    next(error);
  }
});

// POST /api/sync - Trigger manual data sync (internal use)
router.post('/sync', async (req, res, next) => {
  try {
    const { limit = 100 } = req.body;
    console.log('Manual sync triggered');

    await syncService.syncCategories();
    const result = await syncService.syncFunds(limit);

    res.json({
      message: 'Sync completed',
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

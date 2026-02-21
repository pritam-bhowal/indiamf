require('dotenv').config();
const { initDb, run, saveDb } = require('../config/db');

async function seed() {
  console.log('Starting initial data seed...');

  try {
    // Initialize database first
    await initDb();

    // Try PulseDB API first, fall back to sample data
    if (process.env.PULSEDB_API_KEY && process.env.PULSEDB_API_KEY !== 'your-api-key') {
      console.log('Syncing from PulseDB API...');
      try {
        const syncService = require('../services/syncService');
        await syncService.syncCategories();
        await syncService.syncFunds(100);
        console.log('PulseDB sync completed!');
      } catch (error) {
        console.error('PulseDB sync failed:', error.message);
        console.log('Falling back to sample data...');
        await seedSampleData();
      }
    } else {
      console.log('No PulseDB credentials, using sample data...');
      await seedSampleData();
    }

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed failed:', error.message);
    console.error(error.stack);
  }
}

async function seedSampleData() {
  // Sample categories
  const categories = [
    { name: 'Equity', subCategories: ['Large Cap', 'Mid Cap', 'Small Cap', 'Multi Cap', 'ELSS'] },
    { name: 'Debt', subCategories: ['Liquid', 'Short Duration', 'Corporate Bond', 'Gilt'] },
    { name: 'Hybrid', subCategories: ['Balanced Advantage', 'Aggressive Hybrid', 'Conservative Hybrid'] },
  ];

  for (const cat of categories) {
    for (const subCat of cat.subCategories) {
      run(
        `INSERT OR IGNORE INTO categories (category_name, sub_category_name) VALUES (?, ?)`,
        [cat.name, subCat]
      );
    }
  }

  // Sample funds
  const sampleFunds = [
    { scheme_code: 'INF846K01DP8', scheme_name: 'Axis Bluechip Fund - Growth', amc: 'Axis Mutual Fund', category: 'Equity', sub_category: 'Large Cap', nav: 52.34, return_1y: 12.5, return_3y: 8.2, return_5y: 14.1 },
    { scheme_code: 'INF179K01EK7', scheme_name: 'HDFC Mid-Cap Opportunities Fund - Growth', amc: 'HDFC Mutual Fund', category: 'Equity', sub_category: 'Mid Cap', nav: 145.67, return_1y: 25.3, return_3y: 18.7, return_5y: 16.9 },
    { scheme_code: 'INF090I01EN6', scheme_name: 'SBI Small Cap Fund - Growth', amc: 'SBI Mutual Fund', category: 'Equity', sub_category: 'Small Cap', nav: 128.45, return_1y: 35.2, return_3y: 22.1, return_5y: 19.8 },
    { scheme_code: 'INF194K01Y82', scheme_name: 'Mirae Asset Large Cap Fund - Growth', amc: 'Mirae Asset Mutual Fund', category: 'Equity', sub_category: 'Large Cap', nav: 89.23, return_1y: 15.4, return_3y: 11.2, return_5y: 15.6 },
    { scheme_code: 'INF200K01RO0', scheme_name: 'Parag Parikh Flexi Cap Fund - Growth', amc: 'PPFAS Mutual Fund', category: 'Equity', sub_category: 'Multi Cap', nav: 67.89, return_1y: 22.8, return_3y: 19.4, return_5y: 18.2 },
    { scheme_code: 'INF109K01YZ0', scheme_name: 'ICICI Prudential Liquid Fund - Growth', amc: 'ICICI Prudential Mutual Fund', category: 'Debt', sub_category: 'Liquid', nav: 342.56, return_1y: 7.2, return_3y: 6.8, return_5y: 6.5 },
    { scheme_code: 'INF209K01UN5', scheme_name: 'Kotak Balanced Advantage Fund - Growth', amc: 'Kotak Mutual Fund', category: 'Hybrid', sub_category: 'Balanced Advantage', nav: 15.67, return_1y: 11.2, return_3y: 9.8, return_5y: 12.1 },
    { scheme_code: 'INF179K01SY1', scheme_name: 'HDFC Tax Saver Fund - Growth', amc: 'HDFC Mutual Fund', category: 'Equity', sub_category: 'ELSS', nav: 978.34, return_1y: 18.9, return_3y: 14.2, return_5y: 13.8 },
    { scheme_code: 'INF846K01EW2', scheme_name: 'Axis Long Term Equity Fund - Growth', amc: 'Axis Mutual Fund', category: 'Equity', sub_category: 'ELSS', nav: 78.45, return_1y: 14.3, return_3y: 10.5, return_5y: 12.9 },
    { scheme_code: 'INF090I01DD3', scheme_name: 'SBI Equity Hybrid Fund - Growth', amc: 'SBI Mutual Fund', category: 'Hybrid', sub_category: 'Aggressive Hybrid', nav: 234.67, return_1y: 13.8, return_3y: 11.4, return_5y: 13.2 },
    { scheme_code: 'INF174K01LS2', scheme_name: 'Nippon India Small Cap Fund - Growth', amc: 'Nippon India Mutual Fund', category: 'Equity', sub_category: 'Small Cap', nav: 145.23, return_1y: 38.5, return_3y: 25.3, return_5y: 21.4 },
    { scheme_code: 'INF789F01PN3', scheme_name: 'UTI Flexi Cap Fund - Growth', amc: 'UTI Mutual Fund', category: 'Equity', sub_category: 'Multi Cap', nav: 289.45, return_1y: 16.7, return_3y: 12.3, return_5y: 14.5 },
    { scheme_code: 'INF846K01131', scheme_name: 'Axis Midcap Fund - Growth', amc: 'Axis Mutual Fund', category: 'Equity', sub_category: 'Mid Cap', nav: 89.12, return_1y: 28.4, return_3y: 21.6, return_5y: 18.9 },
    { scheme_code: 'INF179K01EC4', scheme_name: 'HDFC Flexi Cap Fund - Growth', amc: 'HDFC Mutual Fund', category: 'Equity', sub_category: 'Multi Cap', nav: 1567.89, return_1y: 14.2, return_3y: 10.8, return_5y: 12.6 },
    { scheme_code: 'INF090I01EL5', scheme_name: 'SBI Corporate Bond Fund - Growth', amc: 'SBI Mutual Fund', category: 'Debt', sub_category: 'Corporate Bond', nav: 45.67, return_1y: 8.1, return_3y: 7.5, return_5y: 7.8 },
  ];

  const today = new Date().toISOString().split('T')[0];

  for (const fund of sampleFunds) {
    run(
      `INSERT OR REPLACE INTO funds (scheme_code, scheme_name, amc, category, sub_category, current_nav, nav_date, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [fund.scheme_code, fund.scheme_name, fund.amc, fund.category, fund.sub_category, fund.nav, today]
    );

    run(
      `INSERT OR REPLACE INTO fund_returns (scheme_code, return_1y, return_3y, return_5y, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [fund.scheme_code, fund.return_1y, fund.return_3y, fund.return_5y]
    );
  }

  saveDb();
  console.log(`Seeded ${sampleFunds.length} sample funds`);
}

seed();

const { run, saveDb } = require('../config/db');
const pulsedbService = require('./pulsedbService');

// Target AMCs
const TARGET_AMCS = [
  'HDFC',
  'Axis',
  'ICICI Prudential',
  'Nippon',
  'SBI'
];

class SyncService {
  isTargetAMC(amcName) {
    if (!amcName) return false;
    const upperAmc = amcName.toUpperCase();
    return TARGET_AMCS.some(amc => upperAmc.includes(amc.toUpperCase()));
  }

  isRegularGrowth(fund) {
    const isRegular = fund.plan_name && fund.plan_name.toLowerCase() !== 'direct';
    const isGrowth = fund.option_name && fund.option_name.toLowerCase() === 'growth';
    return isRegular && isGrowth;
  }

  async syncFunds(limit = 100) {
    console.log(`Starting fund sync (limit: ${limit})...`);
    console.log(`Target AMCs: ${TARGET_AMCS.join(', ')}`);
    console.log(`Filter: Regular Growth schemes only`);
    const startTime = Date.now();

    try {
      const fundsPerAMC = Math.ceil(limit / TARGET_AMCS.length);
      console.log(`Target: ~${fundsPerAMC} funds per AMC`);

      const uniqueFunds = [];
      const seenCodes = new Set();

      for (const amc of TARGET_AMCS) {
        console.log(`Fetching funds for ${amc}...`);
        const response = await pulsedbService.searchFunds(amc);
        const funds = response.data?.mutual_funds || [];

        let amcCount = 0;
        for (const fund of funds) {
          if (
            fund.scheme_code &&
            !seenCodes.has(fund.scheme_code) &&
            this.isTargetAMC(fund.amc_name) &&
            this.isRegularGrowth(fund) &&
            amcCount < fundsPerAMC
          ) {
            seenCodes.add(fund.scheme_code);
            uniqueFunds.push(fund);
            amcCount++;
          }
        }
        console.log(`  Found ${amcCount} Regular Growth funds for ${amc}`);
      }

      console.log(`Total: ${uniqueFunds.length} Regular Growth funds from target AMCs`);

      let syncedCount = 0;
      let errorCount = 0;

      for (const fund of uniqueFunds) {
        try {
          await this.syncSingleFund(fund);
          syncedCount++;
          if (syncedCount % 10 === 0) {
            console.log(`Progress: ${syncedCount}/${uniqueFunds.length} funds synced`);
            saveDb();
          }
        } catch (error) {
          errorCount++;
          console.error(`Error syncing ${fund.scheme_code}:`, error.message);
        }
      }

      saveDb();

      const duration = (Date.now() - startTime) / 1000;
      console.log(`Sync completed: ${syncedCount} funds synced, ${errorCount} errors, ${duration}s`);

      return { syncedCount, errorCount, duration };
    } catch (error) {
      console.error('Sync failed:', error.message);
      throw error;
    }
  }

  async syncSingleFund(fund) {
    const schemeCode = fund.scheme_code;

    // Basic info from search API
    let fundData = {
      scheme_code: schemeCode,
      scheme_name: fund.scheme_name || '',
      amc: fund.amc_name || '',
      category: fund.asset_category || '',
      sub_category: fund.asset_sub_category || '',
      plan_name: fund.plan_name || '',
      option_name: fund.option_name || '',
      isin: fund.isin_dividend_payout_or_growth || '',
    };

    // Get comprehensive metadata
    try {
      const metadata = await pulsedbService.getFundMetadata(schemeCode);
      if (metadata?.data?.[schemeCode]) {
        const meta = metadata.data[schemeCode];

        // Extract exit load info
        const exitLoad = meta.exit_load || {};
        const txnInfo = meta.txn_info || {};

        fundData = {
          ...fundData,
          scheme_name_unique: meta.scheme_name_unique || '',
          amc_code: meta.amc_code || '',

          // NAV
          current_nav: meta.nav || null,
          nav_date: meta.nav_date ? meta.nav_date.split('T')[0] : null,

          // Fund Details
          aum: meta.fund_size || null,
          expense_ratio: meta['expense_ratio(s)_&_(d)'] || null,
          fund_manager: meta.fund_manager || '',
          benchmark: meta.benchmark || '',
          date_of_inception: meta.date_of_inception || '',

          // Risk Info
          risk_profile: meta.risk_profile || '',
          risk_rating: meta.risk_rating || null,
          riskometer: meta.riskometer || '',
          vr_rating: meta.vr_rating || '',

          // Investment Info
          min_investment: txnInfo.min_invest || null,
          min_sip_investment: txnInfo.min_invest_sip || null,
          exit_load_period: exitLoad.exit_load_period || null,
          exit_load_rate: exitLoad.exit_load_rate || null,
          exit_load_remark: exitLoad.exit_load_period_remark || '',

          // Other
          objective: meta.objective || '',
          scheme_doc_url: meta.scheme_doc_url || '',
          isin: meta.isin_dividend_payout_or_growth || fundData.isin,
        };
      }
    } catch (error) {
      // Continue with basic info if metadata fails
    }

    // Insert/update fund with all fields
    run(
      `INSERT OR REPLACE INTO funds (
        scheme_code, scheme_name, scheme_name_unique, amc, amc_code,
        category, sub_category, plan_name, option_name,
        current_nav, nav_date,
        aum, expense_ratio, fund_manager, benchmark, date_of_inception,
        risk_profile, risk_rating, riskometer, vr_rating,
        min_investment, min_sip_investment, exit_load_period, exit_load_rate, exit_load_remark,
        isin, objective, scheme_doc_url,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        fundData.scheme_code,
        fundData.scheme_name,
        fundData.scheme_name_unique,
        fundData.amc,
        fundData.amc_code,
        fundData.category,
        fundData.sub_category,
        fundData.plan_name,
        fundData.option_name,
        fundData.current_nav,
        fundData.nav_date,
        fundData.aum,
        fundData.expense_ratio,
        fundData.fund_manager,
        fundData.benchmark,
        fundData.date_of_inception,
        fundData.risk_profile,
        fundData.risk_rating,
        fundData.riskometer,
        fundData.vr_rating,
        fundData.min_investment,
        fundData.min_sip_investment,
        fundData.exit_load_period,
        fundData.exit_load_rate,
        fundData.exit_load_remark,
        fundData.isin,
        fundData.objective,
        fundData.scheme_doc_url,
      ]
    );

    // Get NAV history and calculate returns
    try {
      const today = new Date();
      const fiveYearsAgo = new Date(today);
      fiveYearsAgo.setFullYear(today.getFullYear() - 5);

      const formatDate = (d) => d.toISOString().split('T')[0];

      const navHistoryRes = await pulsedbService.getNavHistory(
        schemeCode,
        formatDate(fiveYearsAgo),
        formatDate(today)
      );

      if (navHistoryRes?.data?.nav_history && fundData.current_nav) {
        const returns = pulsedbService.calculateReturns(
          navHistoryRes.data.nav_history,
          fundData.current_nav
        );

        if (returns.return_1y !== null || returns.return_3y !== null || returns.return_5y !== null) {
          run(
            `INSERT OR REPLACE INTO fund_returns (scheme_code, return_1y, return_3y, return_5y, updated_at)
             VALUES (?, ?, ?, ?, datetime('now'))`,
            [schemeCode, returns.return_1y, returns.return_3y, returns.return_5y]
          );
        }
      }
    } catch (error) {
      // NAV history fetch failed, continue without returns
    }

    // Upsert category
    if (fundData.category) {
      run(
        `INSERT OR IGNORE INTO categories (category_name, sub_category_name)
         VALUES (?, ?)`,
        [fundData.category, fundData.sub_category || null]
      );
    }

    return schemeCode;
  }

  async syncCategories() {
    console.log('Syncing categories...');
    try {
      const categoriesResponse = await pulsedbService.getCategories();
      const categories = categoriesResponse.data?.asset_categories || [];

      for (const categoryName of categories) {
        run(
          `INSERT OR IGNORE INTO categories (category_name, sub_category_name)
           VALUES (?, ?)`,
          [categoryName, null]
        );
      }

      saveDb();
      console.log(`Categories synced: ${categories.length} categories`);
    } catch (error) {
      console.error('Category sync failed:', error.message);
    }
  }
}

module.exports = new SyncService();

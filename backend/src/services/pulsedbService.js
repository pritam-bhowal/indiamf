const axios = require('axios');

class PulseDBService {
  constructor() {
    this.baseUrl = process.env.PULSEDB_BASE_URL;
    this.apiKey = process.env.PULSEDB_API_KEY;
    this.apiSecret = process.env.PULSEDB_API_SECRET;
    this.token = null;
    this.tokenExpiry = null;
  }

  async authenticate() {
    try {
      const response = await axios.post(`${this.baseUrl}/rest/api/v1/partner_login`, {
        partner: this.apiKey,
        key: this.apiSecret,
      });

      if (response.data && response.data.data && response.data.data.auth) {
        this.token = response.data.data.auth;
        this.tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
        console.log('PulseDB authentication successful');
        return true;
      }
      throw new Error('No token in response: ' + JSON.stringify(response.data));
    } catch (error) {
      console.error('PulseDB authentication failed:', error.message);
      throw error;
    }
  }

  async ensureAuthenticated() {
    if (!this.token || !this.tokenExpiry || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
  }

  async makeRequest(endpoint, params = {}) {
    await this.ensureAuthenticated();

    try {
      const response = await axios.post(`${this.baseUrl}${endpoint}`, {
        auth: this.token,
        ...params,
      });
      return response.data;
    } catch (error) {
      console.error(`PulseDB request failed for ${endpoint}:`, error.message);
      throw error;
    }
  }

  async searchFunds(query) {
    return this.makeRequest('/rest/api/v1/mf/search', { search_text: query });
  }

  async getCategories() {
    return this.makeRequest('/rest/api/v1/mf/asset_categories');
  }

  async getFundMetadata(schemeCode) {
    return this.makeRequest('/rest/api/v1/mf/metadata', { scheme_code: schemeCode });
  }

  async getNavHistory(schemeCode, fromDate, toDate, frequency = 'month') {
    return this.makeRequest('/rest/api/v1/mf/nav-history', {
      scheme_code: schemeCode,
      frequency,
      from: fromDate,
      to: toDate,
    });
  }

  // Get NAV history for a specific period with hybrid frequency
  async getNavHistoryForPeriod(schemeCode, period) {
    const today = new Date();
    const toDate = today.toISOString().split('T')[0];

    let fromDate;
    let frequency;

    // Calculate from date and frequency based on period
    switch (period) {
      case '6M':
        fromDate = new Date(today);
        fromDate.setMonth(today.getMonth() - 6);
        frequency = 'day';
        break;
      case '1Y':
        fromDate = new Date(today);
        fromDate.setFullYear(today.getFullYear() - 1);
        frequency = 'day';
        break;
      case '3Y':
        fromDate = new Date(today);
        fromDate.setFullYear(today.getFullYear() - 3);
        frequency = 'month';
        break;
      case '5Y':
        fromDate = new Date(today);
        fromDate.setFullYear(today.getFullYear() - 5);
        frequency = 'month';
        break;
      case 'MAX':
      default:
        fromDate = new Date(today);
        fromDate.setFullYear(today.getFullYear() - 10); // 10 years max
        frequency = 'month';
        break;
    }

    const fromDateStr = fromDate.toISOString().split('T')[0];

    const response = await this.getNavHistory(schemeCode, fromDateStr, toDate, frequency);

    if (!response?.data?.nav_history) {
      throw new Error('No NAV history data returned');
    }

    // Transform to array format and sort by date
    const navHistory = response.data.nav_history;
    const dataPoints = Object.entries(navHistory)
      .map(([date, nav]) => ({ date, nav }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (dataPoints.length === 0) {
      throw new Error('Empty NAV history');
    }

    // Calculate returns
    const startNav = dataPoints[0].nav;
    const endNav = dataPoints[dataPoints.length - 1].nav;
    const startDate = dataPoints[0].date;
    const endDate = dataPoints[dataPoints.length - 1].date;

    // Calculate time difference in years
    const timeDiffMs = new Date(endDate) - new Date(startDate);
    const years = timeDiffMs / (365.25 * 24 * 60 * 60 * 1000);

    const absoluteReturn = ((endNav - startNav) / startNav) * 100;
    const annualizedReturn = years > 0
      ? (Math.pow(endNav / startNav, 1 / years) - 1) * 100
      : absoluteReturn;

    // Find min and max NAV
    const navValues = dataPoints.map(d => d.nav);
    const minNav = Math.min(...navValues);
    const maxNav = Math.max(...navValues);

    return {
      scheme_code: schemeCode,
      period,
      frequency,
      data_points: dataPoints,
      summary: {
        start_date: startDate,
        end_date: endDate,
        start_nav: startNav,
        end_nav: endNav,
        absolute_return: absoluteReturn,
        annualized_return: annualizedReturn,
        min_nav: minNav,
        max_nav: maxNav,
        total_points: dataPoints.length,
      },
    };
  }

  // Get calculator data - reuses getNavHistoryForPeriod for consistent data
  async getCalculatorData(schemeCode) {
    const periods = ['6M', '1Y', '3Y', '5Y'];

    // Expected number of SIP installments per period
    const expectedMonths = {
      '6M': 6,
      '1Y': 12,
      '3Y': 36,
      '5Y': 60
    };

    // Fetch data for all periods in parallel
    const periodDataPromises = periods.map(async (period) => {
      try {
        const data = await this.getNavHistoryForPeriod(schemeCode, period);

        // Extract monthly NAVs for SIP calculation
        const dataPoints = data.data_points;
        const monthlyNavs = [];
        let lastMonth = -1;

        for (const point of dataPoints) {
          const d = new Date(point.date);
          const monthKey = d.getFullYear() * 12 + d.getMonth();

          // Take first NAV of each month
          if (monthKey !== lastMonth) {
            monthlyNavs.push({ date: point.date, nav: point.nav });
            lastMonth = monthKey;
          }
        }

        // Limit to expected number of installments (exclude the final month if over)
        const targetMonths = expectedMonths[period] || monthlyNavs.length;
        const limitedMonthlyNavs = monthlyNavs.length > targetMonths
          ? monthlyNavs.slice(0, targetMonths)
          : monthlyNavs;

        return {
          period,
          data: {
            start_date: data.summary.start_date,
            start_nav: data.summary.start_nav,
            end_nav: data.summary.end_nav,
            months: limitedMonthlyNavs.length,
            monthly_navs: limitedMonthlyNavs
          }
        };
      } catch (err) {
        console.error(`Failed to get data for period ${period}:`, err.message);
        return { period, data: null };
      }
    });

    const results = await Promise.all(periodDataPromises);

    // Find the most recent end date and NAV from available data
    let currentNav = null;
    let currentDate = null;

    for (const result of results) {
      if (result.data) {
        currentNav = result.data.end_nav;
        currentDate = result.data.monthly_navs[result.data.monthly_navs.length - 1]?.date;
        break;
      }
    }

    // Build periods object
    const periodsObj = {};
    for (const result of results) {
      periodsObj[result.period] = result.data;
    }

    return {
      scheme_code: schemeCode,
      current_nav: currentNav,
      current_date: currentDate,
      periods: periodsObj
    };
  }

  // Calculate returns from NAV history
  calculateReturns(navHistory, currentNav) {
    const dates = Object.keys(navHistory).sort();
    const today = new Date();

    const getNavForYearsAgo = (years) => {
      const targetDate = new Date(today);
      targetDate.setFullYear(today.getFullYear() - years);

      // Find the closest date in nav history
      let closestDate = null;
      let closestDiff = Infinity;

      for (const date of dates) {
        const navDate = new Date(date);
        const diff = Math.abs(navDate - targetDate);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestDate = date;
        }
      }

      // Only use if within 2 months of target
      if (closestDate && closestDiff < 60 * 24 * 60 * 60 * 1000) {
        return navHistory[closestDate];
      }
      return null;
    };

    const nav1YAgo = getNavForYearsAgo(1);
    const nav3YAgo = getNavForYearsAgo(3);
    const nav5YAgo = getNavForYearsAgo(5);

    const calcReturn = (oldNav) => {
      if (!oldNav || !currentNav) return null;
      return ((currentNav / oldNav) - 1) * 100;
    };

    const calcCAGR = (oldNav, years) => {
      if (!oldNav || !currentNav) return null;
      return (Math.pow(currentNav / oldNav, 1 / years) - 1) * 100;
    };

    return {
      return_1y: nav1YAgo ? calcReturn(nav1YAgo) : null,
      return_3y: nav3YAgo ? calcCAGR(nav3YAgo, 3) : null,
      return_5y: nav5YAgo ? calcCAGR(nav5YAgo, 5) : null,
    };
  }
}

module.exports = new PulseDBService();

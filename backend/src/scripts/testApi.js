require('dotenv').config();
const axios = require('axios');

async function testAPIs() {
  const baseUrl = process.env.PULSEDB_BASE_URL;

  // Get auth token
  console.log('Getting auth token...');
  const authRes = await axios.post(`${baseUrl}/rest/api/v1/partner_login`, {
    partner: process.env.PULSEDB_API_KEY,
    key: process.env.PULSEDB_API_SECRET
  });
  const auth = authRes.data.data.auth;
  console.log('Auth token:', auth);

  const schemeCode = '112277'; // Axis Large Cap Fund

  // Test NAV history with dates (to calculate returns)
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  const formatDate = (d) => d.toISOString().split('T')[0];

  const endpoints = [
    {
      name: 'NAV History (with dates)',
      path: '/rest/api/v1/mf/nav-history',
      params: {
        scheme_code: schemeCode,
        frequency: 'month',
        from: formatDate(oneYearAgo),
        to: formatDate(today)
      }
    },
    {
      name: 'Search with details',
      path: '/rest/api/v1/mf/search',
      params: { search_text: 'Axis Large Cap' }
    },
    {
      name: 'Metadata (check for returns)',
      path: '/rest/api/v1/mf/metadata',
      params: { scheme_code: schemeCode }
    },
  ];

  for (const ep of endpoints) {
    try {
      const res = await axios.post(`${baseUrl}${ep.path}`, { auth, ...ep.params });
      console.log(`\n=== ${ep.name} ===`);
      const output = JSON.stringify(res.data, null, 2);
      console.log(output.substring(0, 2000));
      if (output.length > 2000) console.log('... (truncated)');
    } catch (e) {
      const errMsg = e.response ? JSON.stringify(e.response.data) : e.message;
      console.log(`\n=== ${ep.name} === ERROR: ${errMsg}`);
    }
  }
}

testAPIs().catch(console.error);

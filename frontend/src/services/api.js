import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function getFunds({ search = '', category = '', page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category) params.append('category', category);
  params.append('page', page);
  params.append('limit', limit);

  const response = await api.get(`/funds?${params.toString()}`);
  return response.data;
}

export async function getFundDetails(schemeCode) {
  const response = await api.get(`/funds/${schemeCode}`);
  return response.data;
}

export async function getCategories() {
  const response = await api.get('/categories');
  return response.data;
}

export async function getNavHistory(schemeCode, period = '1Y') {
  const response = await api.get(`/funds/${schemeCode}/nav-history?period=${period}`);
  return response.data;
}

export async function getCalculatorData(schemeCode) {
  const response = await api.get(`/funds/${schemeCode}/calculator-data`);
  return response.data;
}

export default api;

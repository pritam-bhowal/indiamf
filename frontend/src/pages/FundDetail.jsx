import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFundDetails } from '../services/api';
import PerformanceChart from '../components/PerformanceChart';
import ReturnsCalculator from '../components/ReturnsCalculator';

function FundDetail() {
  const { schemeCode } = useParams();
  const navigate = useNavigate();
  const [fund, setFund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchFund() {
      setLoading(true);
      setError(null);
      try {
        const data = await getFundDetails(schemeCode);
        setFund(data);
      } catch (err) {
        setError('Failed to load fund details. Please try again.');
        console.error('Error fetching fund:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchFund();
  }, [schemeCode]);

  const formatNav = (nav) => {
    if (!nav) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(nav);
  };

  const formatAUM = (aum) => {
    if (!aum) return 'N/A';
    if (aum >= 1000) {
      return `₹${(aum / 1000).toFixed(2)}K Cr`;
    }
    return `₹${aum.toFixed(2)} Cr`;
  };

  const formatReturn = (value) => {
    if (value === null || value === undefined) return 'N/A';
    const num = parseFloat(value);
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const getReturnClass = (value) => {
    if (value === null || value === undefined) return '';
    return parseFloat(value) >= 0 ? 'return-positive' : 'return-negative';
  };

  const getRiskClass = (riskometer) => {
    if (!riskometer) return '';
    const risk = riskometer.toLowerCase();
    if (risk.includes('low')) return 'risk-low';
    if (risk.includes('moderate')) return 'risk-moderate';
    if (risk.includes('high')) return 'risk-high';
    return '';
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading fund details...</p>
        </div>
      </div>
    );
  }

  if (error || !fund) {
    return (
      <div className="container">
        <div className="fund-detail">
          <button className="back-btn" onClick={() => navigate('/')}>
            &larr; Back to Funds
          </button>
          <div className="error">
            <p>{error || 'Fund not found.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="fund-detail">
        <button className="back-btn" onClick={() => navigate('/')}>
          &larr; Back to Funds
        </button>

        <div className="detail-card">
          {/* Header */}
          <div className="detail-header">
            <h1 className="detail-name">{fund.scheme_name}</h1>
            <p className="detail-amc">{fund.amc}</p>
            <div className="fund-badges" style={{ marginTop: '12px' }}>
              {fund.category && (
                <span className="badge badge-category">{fund.category}</span>
              )}
              {fund.sub_category && (
                <span className="badge badge-subcategory">{fund.sub_category}</span>
              )}
              {fund.riskometer && (
                <span className={`badge badge-risk ${getRiskClass(fund.riskometer)}`}>
                  {fund.riskometer}
                </span>
              )}
              {fund.vr_rating && (
                <span className="badge badge-rating">VR: {fund.vr_rating}</span>
              )}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="detail-metrics-grid">
            <div className="metric-card">
              <div className="metric-value">{formatNav(fund.current_nav)}</div>
              <div className="metric-label">NAV ({fund.nav_date || 'N/A'})</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{formatAUM(fund.aum)}</div>
              <div className="metric-label">AUM</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{fund.expense_ratio ? `${fund.expense_ratio}%` : 'N/A'}</div>
              <div className="metric-label">Expense Ratio</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{fund.risk_rating || 'N/A'}</div>
              <div className="metric-label">Risk Rating</div>
            </div>
          </div>

          {/* Performance Chart */}
          <PerformanceChart schemeCode={schemeCode} />

          {/* Returns Calculator */}
          <ReturnsCalculator schemeCode={schemeCode} />

          {/* Returns */}
          <div className="detail-section">
            <h2>Returns</h2>
            <table className="returns-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Return</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1 Year</td>
                  <td className={getReturnClass(fund.returns?.['1Y'])}>
                    {formatReturn(fund.returns?.['1Y'])}
                  </td>
                </tr>
                <tr>
                  <td>3 Year (CAGR)</td>
                  <td className={getReturnClass(fund.returns?.['3Y'])}>
                    {formatReturn(fund.returns?.['3Y'])}
                  </td>
                </tr>
                <tr>
                  <td>5 Year (CAGR)</td>
                  <td className={getReturnClass(fund.returns?.['5Y'])}>
                    {formatReturn(fund.returns?.['5Y'])}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Fund Details */}
          <div className="detail-section">
            <h2>Fund Details</h2>
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">Fund Manager</span>
                <span className="info-value">{fund.fund_manager || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Benchmark</span>
                <span className="info-value">{fund.benchmark || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Inception Date</span>
                <span className="info-value">{fund.date_of_inception || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Risk Profile</span>
                <span className="info-value">{fund.risk_profile || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">ISIN</span>
                <span className="info-value">{fund.isin || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Investment Details */}
          <div className="detail-section">
            <h2>Investment Details</h2>
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">Min Investment</span>
                <span className="info-value">
                  {fund.min_investment ? `₹${fund.min_investment}` : 'N/A'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Min SIP</span>
                <span className="info-value">
                  {fund.min_sip_investment ? `₹${fund.min_sip_investment}` : 'N/A'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Exit Load</span>
                <span className="info-value">
                  {fund.exit_load?.remark || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Objective */}
          {fund.objective && (
            <div className="detail-section">
              <h2>Investment Objective</h2>
              <p className="objective-text">{fund.objective}</p>
            </div>
          )}

          {/* Document Link */}
          {fund.scheme_doc_url && (
            <div className="detail-section">
              <a
                href={fund.scheme_doc_url}
                target="_blank"
                rel="noopener noreferrer"
                className="doc-link"
              >
                View Scheme Document &rarr;
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FundDetail;

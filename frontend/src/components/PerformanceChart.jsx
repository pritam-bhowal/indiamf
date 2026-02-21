import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getNavHistory } from '../services/api';

const PERIODS = ['6M', '1Y', '3Y', '5Y', 'MAX'];

function PerformanceChart({ schemeCode }) {
  const [period, setPeriod] = useState('1Y');
  const [returnType, setReturnType] = useState('absolute'); // 'absolute' or 'annualized'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const result = await getNavHistory(schemeCode, period);
        setData(result);
      } catch (err) {
        setError('Failed to load performance data');
        console.error('Error fetching NAV history:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [schemeCode, period]);

  const formatNav = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    });
  };

  const formatAxisDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      month: 'short',
      year: '2-digit',
    });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-date">{formatDate(label)}</p>
          <p className="tooltip-nav">NAV: {formatNav(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  const getDisplayReturn = () => {
    if (!data?.summary) return 'N/A';
    const value = returnType === 'absolute'
      ? data.summary.absolute_return
      : data.summary.annualized_return;

    if (value === null || value === undefined) return 'N/A';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getReturnClass = () => {
    if (!data?.summary) return '';
    const value = returnType === 'absolute'
      ? data.summary.absolute_return
      : data.summary.annualized_return;
    return value >= 0 ? 'return-positive' : 'return-negative';
  };

  return (
    <div className="performance-chart">
      <div className="chart-header">
        <h2>Performance</h2>
        <div className="chart-controls">
          {/* Period Tabs */}
          <div className="period-tabs">
            {PERIODS.map((p) => (
              <button
                key={p}
                className={`period-tab ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
                disabled={loading}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="chart-container">
        {loading && !data && (
          <div className="chart-shimmer">
            <div className="shimmer-chart"></div>
          </div>
        )}

        {error && (
          <div className="chart-error">
            <p>{error}</p>
          </div>
        )}

        {data && (
          <div className={`chart-wrapper ${loading ? 'chart-refreshing' : ''}`}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={data.data_points}
                margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatAxisDate}
                  tick={{ fontSize: 12, fill: '#888' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e0e0e0' }}
                  interval="preserveStartEnd"
                  minTickGap={50}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => `₹${v.toFixed(0)}`}
                  tick={{ fontSize: 12, fill: '#888' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e0e0e0' }}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="nav"
                  stroke="#667eea"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, fill: '#667eea', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="chart-summary">
        {loading && !data ? (
          <div className="summary-shimmer">
            <div className="shimmer-block shimmer-return"></div>
            <div className="shimmer-block shimmer-toggle"></div>
          </div>
        ) : data ? (
          <>
            <div className="return-section">
              <div className="return-display">
                <span className={`return-value ${getReturnClass()}`}>
                  {getDisplayReturn()}
                </span>
                <span className="return-meta">
                  {returnType === 'absolute' ? 'Absolute' : 'CAGR'} · {formatDate(data.summary.start_date)} – {formatDate(data.summary.end_date)}
                </span>
              </div>
            </div>

            <div className="return-toggle">
              <button
                className={`toggle-btn ${returnType === 'absolute' ? 'active' : ''}`}
                onClick={() => setReturnType('absolute')}
              >
                Absolute
              </button>
              <button
                className={`toggle-btn ${returnType === 'annualized' ? 'active' : ''}`}
                onClick={() => setReturnType('annualized')}
              >
                CAGR
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default PerformanceChart;

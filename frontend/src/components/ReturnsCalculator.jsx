import { useState, useEffect, useMemo, useCallback } from 'react';
import { getCalculatorData } from '../services/api';

const PERIODS = ['6M', '1Y', '3Y', '5Y'];
const PRESETS = [10000, 25000, 50000, 100000];

// Gain-to-purchase mapping for tangible rewards
const PURCHASE_BRACKETS = [
  {
    min: 500,
    max: 2000,
    items: [
      { text: "a month of coffee dates", emoji: "☕" },
      { text: "multiple movie nights", emoji: "🎬" },
      { text: "a stack of bestseller books", emoji: "📚" },
      { text: "a nice pair of sneakers", emoji: "👟" },
    ]
  },
  {
    min: 2000,
    max: 10000,
    items: [
      { text: "premium wireless headphones", emoji: "🎧" },
      { text: "a smartwatch", emoji: "⌚" },
      { text: "a fancy dinner for two", emoji: "🍽️" },
      { text: "a fitness tracker", emoji: "💪" },
      { text: "a Kindle e-reader", emoji: "📖" },
    ]
  },
  {
    min: 10000,
    max: 30000,
    items: [
      { text: "a brand new smartphone", emoji: "📱" },
      { text: "a weekend getaway", emoji: "🏖️" },
      { text: "a year of gym membership", emoji: "🏋️" },
      { text: "a gaming console", emoji: "🎮" },
      { text: "a designer watch", emoji: "⌚" },
    ]
  },
  {
    min: 30000,
    max: 75000,
    items: [
      { text: "a 55-inch LED TV", emoji: "📺" },
      { text: "a powerful laptop", emoji: "💻" },
      { text: "a domestic vacation", emoji: "✈️" },
      { text: "a home theatre system", emoji: "🔊" },
      { text: "a premium smartphone", emoji: "📱" },
    ]
  },
  {
    min: 75000,
    max: 200000,
    items: [
      { text: "the latest iPhone", emoji: "📱" },
      { text: "a Goa trip with friends", emoji: "🏝️" },
      { text: "a washing machine + refrigerator combo", emoji: "🏠" },
      { text: "a MacBook Air", emoji: "💻" },
      { text: "a Thailand trip", emoji: "🌴" },
    ]
  },
  {
    min: 200000,
    max: 500000,
    items: [
      { text: "a brand new Activa", emoji: "🛵" },
      { text: "a Royal Enfield Classic", emoji: "🏍️" },
      { text: "a Europe backpacking trip", emoji: "🗼" },
      { text: "a complete home makeover", emoji: "🏡" },
      { text: "a Pulsar with accessories", emoji: "🏍️" },
    ]
  },
  {
    min: 500000,
    max: 1500000,
    items: [
      { text: "a pre-owned sedan", emoji: "🚗" },
      { text: "a luxury international vacation", emoji: "🌍" },
      { text: "a complete home renovation", emoji: "🏠" },
      { text: "a KTM Duke", emoji: "🏍️" },
      { text: "your dream home furniture", emoji: "🛋️" },
    ]
  },
  {
    min: 1500000,
    max: Infinity,
    items: [
      { text: "a brand new car", emoji: "🚘" },
      { text: "a down payment on your dream home", emoji: "🏢" },
      { text: "a Harley Davidson", emoji: "🏍️" },
      { text: "multiple international vacations", emoji: "🌏" },
      { text: "a fully loaded SUV", emoji: "🚙" },
    ]
  },
];

function ReturnsCalculator({ schemeCode }) {
  const [mode, setMode] = useState('lumpsum'); // 'lumpsum' or 'sip'
  const [amount, setAmount] = useState(10000);
  const [period, setPeriod] = useState('1Y');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const result = await getCalculatorData(schemeCode);
        setData(result);
      } catch (err) {
        setError('Failed to load calculator data');
        console.error('Error fetching calculator data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [schemeCode]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setAmount(value ? parseInt(value, 10) : 0);
  };

  const result = useMemo(() => {
    if (!data || !data.periods[period]) return null;

    const periodData = data.periods[period];
    const currentNav = data.current_nav;

    if (mode === 'lumpsum') {
      // Lumpsum calculation
      const startNav = periodData.start_nav;
      const units = amount / startNav;
      const currentValue = units * currentNav;
      const gains = currentValue - amount;
      const returnsPercent = (gains / amount) * 100;

      return {
        invested: amount,
        currentValue,
        gains,
        returnsPercent,
      };
    } else {
      // SIP calculation
      const monthlyNavs = periodData.monthly_navs;
      let totalUnits = 0;
      const monthlyAmount = amount;

      // For each month, calculate units purchased
      for (const { nav } of monthlyNavs) {
        totalUnits += monthlyAmount / nav;
      }

      const totalInvested = monthlyAmount * monthlyNavs.length;
      const currentValue = totalUnits * currentNav;
      const gains = currentValue - totalInvested;
      const returnsPercent = (gains / totalInvested) * 100;

      return {
        invested: totalInvested,
        currentValue,
        gains,
        returnsPercent,
        months: monthlyNavs.length,
      };
    }
  }, [data, mode, amount, period]);

  const isPositive = result && result.gains > 0;
  const isNegative = result && result.gains < 0;

  const getPeriodLabel = (p) => {
    switch (p) {
      case '6M': return '6 Months';
      case '1Y': return '1 Year';
      case '3Y': return '3 Years';
      case '5Y': return '5 Years';
      default: return p;
    }
  };

  // Get a random purchase item based on gain amount
  const getRandomPurchase = useCallback((gains) => {
    if (gains < 500) return null;

    const bracket = PURCHASE_BRACKETS.find(b => gains >= b.min && gains < b.max);
    if (!bracket) return null;

    const randomIndex = Math.floor(Math.random() * bracket.items.length);
    return bracket.items[randomIndex];
  }, []);

  // Memoize the purchase to avoid changing on every render
  const purchaseItem = useMemo(() => {
    if (!result || result.gains <= 0) return null;
    return getRandomPurchase(result.gains);
  }, [result?.gains, result?.invested, mode, period, getRandomPurchase]);

  return (
    <div className="returns-calculator">
      <div className="calc-header">
        <h2>Returns Calculator</h2>
      </div>

      {/* Controls */}
      <div className="calc-controls">
        {/* Mode Toggle */}
        <div className="calc-row">
          <label className="calc-label">Investment Type</label>
          <div className="mode-toggle">
            <button
              className={`mode-btn ${mode === 'lumpsum' ? 'active' : ''}`}
              onClick={() => setMode('lumpsum')}
            >
              Lumpsum
            </button>
            <button
              className={`mode-btn ${mode === 'sip' ? 'active' : ''}`}
              onClick={() => setMode('sip')}
            >
              Monthly SIP
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div className="calc-row">
          <label className="calc-label">
            {mode === 'lumpsum' ? 'Investment Amount' : 'Monthly Amount'}
          </label>
          <div className="amount-input-wrapper">
            <span className="currency-symbol">₹</span>
            <input
              type="text"
              className="amount-input"
              value={amount.toLocaleString('en-IN')}
              onChange={handleAmountChange}
            />
          </div>
          <div className="amount-presets">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                className={`preset-btn ${amount === preset ? 'active' : ''}`}
                onClick={() => setAmount(preset)}
              >
                {preset >= 100000 ? `₹${preset / 100000}L` : `₹${preset / 1000}K`}
              </button>
            ))}
          </div>
        </div>

        {/* Period Selection */}
        <div className="calc-row">
          <label className="calc-label">Duration</label>
          <div className="period-selector">
            {PERIODS.map((p) => (
              <button
                key={p}
                className={`period-btn ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
                disabled={!data?.periods[p]}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      <div className="calc-result">
        {loading && (
          <div className="calc-shimmer">
            <div className="shimmer-block shimmer-value"></div>
            <div className="shimmer-row">
              <div className="shimmer-block shimmer-stat"></div>
              <div className="shimmer-block shimmer-stat"></div>
              <div className="shimmer-block shimmer-stat"></div>
            </div>
          </div>
        )}

        {error && (
          <div className="calc-error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && result && (
          <div className={`result-card ${isPositive ? 'result-positive' : ''} ${isNegative ? 'result-negative' : ''}`}>
            {/* Celebration elements for positive gains */}
            {isPositive && (
              <>
                <div className="sparkle sparkle-1">✨</div>
                <div className="sparkle sparkle-2">✨</div>
                <div className="sparkle sparkle-3">🎉</div>
                <div className="glow"></div>
              </>
            )}

            <div className="result-main">
              <div className="result-value">{formatCurrency(result.currentValue)}</div>
              <div className="result-label">
                Investment Value
                {isPositive && <span className="celebration-text"> — Great choice!</span>}
              </div>
            </div>

            <div className="result-stats">
              <div className="result-stat">
                <div className="stat-value">{formatCurrency(result.invested)}</div>
                <div className="stat-label">
                  {mode === 'sip' ? `Invested (${result.months} months)` : 'Invested'}
                </div>
              </div>
              <div className="result-stat">
                <div className={`stat-value ${isPositive ? 'gains-positive' : ''} ${isNegative ? 'gains-negative' : ''}`}>
                  {result.gains >= 0 ? '+' : ''}{formatCurrency(result.gains)}
                </div>
                <div className="stat-label">
                  {isPositive ? 'Profit' : isNegative ? 'Loss' : 'Gains'}
                  {isPositive && <span className="emoji"> 📈</span>}
                </div>
              </div>
              <div className="result-stat">
                <div className={`stat-value ${isPositive ? 'gains-positive' : ''} ${isNegative ? 'gains-negative' : ''}`}>
                  {formatPercent(result.returnsPercent)}
                </div>
                <div className="stat-label">
                  Returns
                  {isPositive && result.returnsPercent > 20 && <span className="emoji"> 🚀</span>}
                </div>
              </div>
            </div>

            {/* Extra celebration message with tangible purchase */}
            {isPositive && purchaseItem && (
              <div className="celebration-banner">
                Your gains could buy you <strong>{purchaseItem.text}</strong> <span className="purchase-emoji">{purchaseItem.emoji}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReturnsCalculator;

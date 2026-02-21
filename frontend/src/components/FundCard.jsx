import { useNavigate } from 'react-router-dom';

function FundCard({ fund }) {
  const navigate = useNavigate();

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

  return (
    <div
      className="fund-card"
      onClick={() => navigate(`/fund/${fund.scheme_code}`)}
    >
      <div className="fund-card-header">
        <div className="fund-name">{fund.scheme_name}</div>
        <div className="fund-nav">
          <div className="nav-value">{formatNav(fund.current_nav)}</div>
          <div className="nav-label">NAV</div>
        </div>
      </div>
      <div className="fund-amc">{fund.amc}</div>

      <div className="fund-metrics">
        {fund.aum && (
          <div className="metric">
            <span className="metric-label">AUM:</span>
            <span className="metric-value">{formatAUM(fund.aum)}</span>
          </div>
        )}
        {fund.expense_ratio && (
          <div className="metric">
            <span className="metric-label">Expense:</span>
            <span className="metric-value">{fund.expense_ratio}%</span>
          </div>
        )}
        {fund.riskometer && (
          <div className="metric">
            <span className="metric-label">Risk:</span>
            <span className={`metric-value risk-${fund.riskometer.toLowerCase().replace(' ', '-')}`}>
              {fund.riskometer}
            </span>
          </div>
        )}
      </div>

      <div className="fund-badges">
        {fund.category && (
          <span className="badge badge-category">{fund.category}</span>
        )}
        {fund.sub_category && (
          <span className="badge badge-subcategory">{fund.sub_category}</span>
        )}
        {fund.vr_rating && (
          <span className="badge badge-rating">{fund.vr_rating}</span>
        )}
      </div>
    </div>
  );
}

export default FundCard;

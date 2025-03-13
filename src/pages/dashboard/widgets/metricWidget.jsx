const MetricWidget = ({ value = "$0", change = 12.5, label = "vs. last period" }) => {
  return (
    <div className="db-metric-widget">
      <div className="db-metric-value">{value}</div>
      <div className="db-metric-change-container">
        {change >= 0 ? (
          <div className="db-metric-change db-metric-positive">
            <span className="db-metric-arrow">↑</span>
            <span>+{change}%</span>
          </div>
        ) : (
          <div className="db-metric-change db-metric-negative">
            <span className="db-metric-arrow">↓</span>
            <span>{change}%</span>
          </div>
        )}
        <span className="db-metric-label">{label}</span>
      </div>
    </div>
  )
}

export default MetricWidget


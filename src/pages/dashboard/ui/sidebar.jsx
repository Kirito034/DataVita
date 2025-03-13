"use client"

const Sidebar = ({ activeTab, setActiveTab, collapsed, setCollapsed, dashboards = [], currentDashboard, onCreateDashboard, onSelectDashboard }) => {
  console.log(`🎨 Sidebar rendering with ${dashboards?.length || 0} dashboards`)
  return (
    <div className={`db-sidebar ${collapsed ? "db-sidebar-collapsed" : ""}`}>
      <div className="db-sidebar-header">
        <div className="db-logo">
          <span className="db-logo-icon">📊</span>
          <span className="db-logo-text">DataVita</span>
        </div>
        <button className="db-sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? "→" : "←"}
        </button>
      </div>

      <div className="db-sidebar-content">
        <div className="db-sidebar-section">
          <div className="db-sidebar-section-title">Navigation</div>
          <ul className="db-sidebar-menu">
            <li className={`db-sidebar-menu-item ${activeTab === "canvas" ? "db-active" : ""}`}>
              <button className="db-sidebar-menu-button" onClick={() => setActiveTab("canvas")}>
                <span className="db-menu-icon">📋</span>
                <span className="db-menu-text">Canvas</span>
              </button>
            </li>
            <li className={`db-sidebar-menu-item ${activeTab === "data" ? "db-active" : ""}`}>
              <button className="db-sidebar-menu-button" onClick={() => setActiveTab("data")}>
                <span className="db-menu-icon">📁</span>
                <span className="db-menu-text">Data</span>
              </button>
            </li>
          </ul>
        </div>

        <div className="db-sidebar-divider"></div>

        <div className="db-sidebar-section">
          <div className="db-sidebar-section-title">Dashboards</div>
          <div className="db-sidebar-actions">
            <button className="db-create-btn" onClick={onCreateDashboard}>
              + New Dashboard
            </button>
          </div>
          <div className="db-dashboard-list">
            {(dashboards || []).map((dashboard) => (
              <div
                key={dashboard?.id || `dashboard-${Date.now()}`}
                className={`db-dashboard-item ${
                  currentDashboard?.id === dashboard?.id ? "active" : ""
                }`}
                onClick={() => onSelectDashboard(dashboard)}
              >
                <span className="db-dashboard-icon">📊</span>
                <span className="db-dashboard-title">{dashboard?.title || "Untitled Dashboard"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="db-sidebar-footer">
        <button className="db-sidebar-footer-button">
          <span className="db-menu-icon">⚙️</span>
          <span className="db-menu-text">Settings</span>
        </button>
        <button className="db-sidebar-footer-button">
          <span className="db-menu-icon">👤</span>
          <span className="db-menu-text">Profile</span>
        </button>
      </div>
    </div>
  )
}

export default Sidebar


"use client"

import { useState, useEffect, useCallback } from "react"
import { Responsive, WidthProvider } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import {Home} from 'lucide-react'
import BarChartWidget from "./dashboard/widgets/BarChartWidget"
import LineChartWidget from "./dashboard/widgets/LineChartWidget"
import PieChartWidget from "./dashboard/widgets/PieChartWidget"
import MetricWidget from "./dashboard/widgets/MetricWidget"
import DataTable from "./dashboard/widgets/DataTable"

import "../styles/dashboard/dashboard.css"

// Create a responsive grid layout
const ResponsiveGridLayout = WidthProvider(Responsive)

// Widget types and their components
const WIDGET_COMPONENTS = {
  "bar-chart": BarChartWidget,
  "line-chart": LineChartWidget,
  "pie-chart": PieChartWidget,
  metric: MetricWidget,
}

// Available widgets for the palette
const AVAILABLE_WIDGETS = [
  { id: "bar-chart", label: "Bar Chart", icon: "📊" },
  { id: "line-chart", label: "Line Chart", icon: "📈" },
  { id: "pie-chart", label: "Pie Chart", icon: "🥧" },
  { id: "metric", label: "Metric", icon: "📉" },
]

// Sample datasets
const DATASETS = [
  { id: "dataset-1", name: "Sales Data", rows: 1245, columns: 8, updated: "2 hours ago" },
  { id: "dataset-2", name: "Customer Information", rows: 5432, columns: 12, updated: "1 day ago" },
  { id: "dataset-3", name: "Product Inventory", rows: 876, columns: 6, updated: "3 days ago" },
  { id: "dataset-4", name: "Marketing Campaigns", rows: 342, columns: 9, updated: "1 week ago" },
]

// Widget component that wraps the actual content
const Widget = ({ id, type, title, onRemove, onEdit, onDuplicate, children }) => {
  const [showOptions, setShowOptions] = useState(false)

  return (
    <div className="db-widget">
      <div className="db-widget-header">
        <div className="db-widget-title">{title}</div>
        <div className="db-widget-actions">
          <div className="db-widget-menu">
            <button className="db-widget-menu-btn" onClick={() => setShowOptions(!showOptions)}>
              ⋮
            </button>
            {showOptions && (
              <div className="db-widget-menu-dropdown">
                <button onClick={() => onEdit(id)}>Edit</button>
                <button onClick={() => onDuplicate(id)}>Duplicate</button>
                <button onClick={() => onRemove(id)}>Delete</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="db-widget-body">{children}</div>
    </div>
  )
}

// Sidebar component
const Sidebar = ({ activeTab, setActiveTab, collapsed, setCollapsed }) => {
  return (
    <div className={`db-sidebar ${collapsed ? "db-sidebar-collapsed" : ""}`}>
      <div className="db-sidebar-header">
        <div className="db-logo">
          <span className="db-logo-icon">📊</span>
          <span className="db-logo-text">DataBricks</span>
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
          <ul className="db-sidebar-menu">
            <li className="db-sidebar-menu-item">
              <button className="db-sidebar-menu-button">
                <span className="db-menu-icon">📈</span>
                <span className="db-menu-text">Sales Overview</span>
              </button>
            </li>
            <li className="db-sidebar-menu-item">
              <button className="db-sidebar-menu-button">
                <span className="db-menu-icon">📊</span>
                <span className="db-menu-text">Marketing Analytics</span>
              </button>
            </li>
            <li className="db-sidebar-menu-item">
              <button className="db-sidebar-menu-button">
                <span className="db-menu-icon">👥</span>
                <span className="db-menu-text">Customer Insights</span>
              </button>
            </li>
          </ul>
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

// Widget palette component
const WidgetPalette = ({ widgets, onAddWidget }) => {
  const handleDragStart = (e, widgetType) => {
    e.dataTransfer.setData("widget-type", widgetType)
    e.dataTransfer.effectAllowed = "copy"
  }

  return (
    <div className="db-widget-palette">
      <div className="db-palette-header">
        <h3 className="db-palette-title">Widget Palette</h3>
        <div className="db-palette-subtitle">Drag widgets to canvas or click to add</div>
      </div>

      <div className="db-palette-widgets">
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className="db-palette-widget"
            draggable
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onClick={() => onAddWidget(widget.id)}
          >
            <span className="db-palette-widget-icon">{widget.icon}</span>
            <span className="db-palette-widget-label">{widget.label}</span>
          </div>
        ))}
      </div>

      <div className="db-palette-settings">
        <h3 className="db-palette-title">Canvas Settings</h3>
        <button className="db-palette-setting-btn">
          <span className="db-icon">🎨</span>
          Theme
        </button>
        <button className="db-palette-setting-btn">
          <span className="db-icon">📏</span>
          Layout
        </button>
      </div>
    </div>
  )
}

// Generate random data for real-time updates
const generateRandomData = (type) => {
  switch (type) {
    case "bar-chart":
      return [
        { name: "North", value: Math.floor(Math.random() * 100) + 20 },
        { name: "South", value: Math.floor(Math.random() * 100) + 20 },
        { name: "East", value: Math.floor(Math.random() * 100) + 20 },
        { name: "West", value: Math.floor(Math.random() * 100) + 20 },
        { name: "Central", value: Math.floor(Math.random() * 100) + 20 },
        { name: "Other", value: Math.floor(Math.random() * 100) + 20 },
      ]
    case "line-chart":
      return [
        { name: "Jan", value: Math.floor(Math.random() * 100) + 20 },
        { name: "Feb", value: Math.floor(Math.random() * 100) + 20 },
        { name: "Mar", value: Math.floor(Math.random() * 100) + 20 },
        { name: "Apr", value: Math.floor(Math.random() * 100) + 20 },
        { name: "May", value: Math.floor(Math.random() * 100) + 20 },
        { name: "Jun", value: Math.floor(Math.random() * 100) + 20 },
        { name: "Jul", value: Math.floor(Math.random() * 100) + 20 },
        { name: "Aug", value: Math.floor(Math.random() * 100) + 20 },
        { name: "Sep", value: Math.floor(Math.random() * 100) + 20 },
        { name: "Oct", value: Math.floor(Math.random() * 100) + 20 },
        { name: "Nov", value: Math.floor(Math.random() * 100) + 20 },
        { name: "Dec", value: Math.floor(Math.random() * 100) + 20 },
      ]
    case "pie-chart":
      return [
        { name: "Product A", value: Math.floor(Math.random() * 40) + 10 },
        { name: "Product B", value: Math.floor(Math.random() * 30) + 10 },
        { name: "Product C", value: Math.floor(Math.random() * 20) + 10 },
        { name: "Product D", value: Math.floor(Math.random() * 15) + 5 },
        { name: "Others", value: Math.floor(Math.random() * 10) + 5 },
      ]
    case "metric":
      const value = Math.floor(Math.random() * 1000000) + 500000
      const change = (Math.random() * 20 - 10).toFixed(1)
      return {
        value: `$${value.toLocaleString()}`,
        change: Number.parseFloat(change),
      }
    default:
      return []
  }
}

// Main Dashboard Component
function Dashboard() {
  // State for active tab
  const [activeTab, setActiveTab] = useState("canvas")

  // State for sidebar collapsed
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // State for widgets with layout information
  const [widgets, setWidgets] = useState([
    {
      i: "widget-1",
      type: "bar-chart",
      title: "Sales by Region",
      x: 0,
      y: 0,
      w: 6,
      h: 8,
      minW: 3,
      minH: 4,
      data: generateRandomData("bar-chart"),
    },
    {
      i: "widget-2",
      type: "line-chart",
      title: "Monthly Revenue",
      x: 6,
      y: 0,
      w: 6,
      h: 8,
      minW: 3,
      minH: 4,
      data: generateRandomData("line-chart"),
    },
    {
      i: "widget-3",
      type: "pie-chart",
      title: "Market Share",
      x: 0,
      y: 8,
      w: 4,
      h: 8,
      minW: 3,
      minH: 4,
      data: generateRandomData("pie-chart"),
    },
    {
      i: "widget-4",
      type: "metric",
      title: "Total Revenue",
      x: 4,
      y: 8,
      w: 4,
      h: 4,
      minW: 2,
      minH: 2,
      ...generateRandomData("metric"),
    },
    {
      i: "widget-5",
      type: "metric",
      title: "Total Customers",
      x: 8,
      y: 8,
      w: 4,
      h: 4,
      minW: 2,
      minH: 2,
      value: "45,678",
      change: 8.3,
    },
  ])

  // State for edit modal
  const [editingWidget, setEditingWidget] = useState(null)

  // Real-time data update
  useEffect(() => {
    const interval = setInterval(() => {
      setWidgets((currentWidgets) =>
        currentWidgets.map((widget) => {
          // Only update some widgets randomly to make it look more natural
          if (Math.random() > 0.7) {
            if (widget.type === "metric") {
              const updates = generateRandomData("metric")
              return { ...widget, ...updates }
            } else {
              return { ...widget, data: generateRandomData(widget.type) }
            }
          }
          return widget
        }),
      )
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  // Handle adding a new widget
  const handleAddWidget = useCallback((widgetType) => {
    const newWidget = {
      i: `widget-${Date.now()}`,
      type: widgetType,
      title: `New ${AVAILABLE_WIDGETS.find((w) => w.id === widgetType).label}`,
      x: 0,
      y: Number.POSITIVE_INFINITY, // Put it at the bottom
      w: widgetType === "metric" ? 4 : 6,
      h: widgetType === "metric" ? 4 : 8,
      minW: widgetType === "metric" ? 2 : 3,
      minH: widgetType === "metric" ? 2 : 4,
    }

    // Add data based on widget type
    if (widgetType === "metric") {
      const metricData = generateRandomData("metric")
      Object.assign(newWidget, metricData)
    } else {
      newWidget.data = generateRandomData(widgetType)
    }

    setWidgets((prevWidgets) => [...prevWidgets, newWidget])
  }, [])

  // Handle removing a widget
  const handleRemoveWidget = useCallback((widgetId) => {
    setWidgets((prevWidgets) => prevWidgets.filter((widget) => widget.i !== widgetId))
  }, [])

  // Handle editing a widget
  const handleEditWidget = useCallback(
    (widgetId) => {
      const widget = widgets.find((w) => w.i === widgetId)
      if (widget) {
        setEditingWidget(widget)
      }
    },
    [widgets],
  )

  // Handle duplicating a widget
  const handleDuplicateWidget = useCallback(
    (widgetId) => {
      const widget = widgets.find((w) => w.i === widgetId)
      if (widget) {
        const newWidget = {
          ...widget,
          i: `widget-${Date.now()}`,
          title: `${widget.title} (Copy)`,
          x: widget.x,
          y: widget.y + widget.h, // Place below the original
        }
        setWidgets((prevWidgets) => [...prevWidgets, newWidget])
      }
    },
    [widgets],
  )

  // Handle layout change
  const handleLayoutChange = useCallback((layout) => {
    setWidgets((prevWidgets) => {
      return prevWidgets.map((widget) => {
        const layoutItem = layout.find((item) => item.i === widget.i)
        if (layoutItem) {
          return { ...widget, ...layoutItem }
        }
        return widget
      })
    })
  }, [])

  // Handle drop on canvas
  const handleCanvasDrop = useCallback(
    (e) => {
      e.preventDefault()
      const widgetType = e.dataTransfer.getData("widget-type")
      if (widgetType) {
        handleAddWidget(widgetType)
      }
    },
    [handleAddWidget],
  )

  // Handle drag over canvas
  const handleCanvasDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }, [])

  // Save widget edits
  const handleSaveWidgetEdit = useCallback((updatedWidget) => {
    setWidgets((prevWidgets) => prevWidgets.map((widget) => (widget.i === updatedWidget.i ? updatedWidget : widget)))
    setEditingWidget(null)
  }, [])

  // Cancel widget edit
  const handleCancelWidgetEdit = useCallback(() => {
    setEditingWidget(null)
  }, [])

  return (
    <div className="db-container">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Content */}
      <div className="db-main">
        {/* Header */}
        <header className="db-header">
          <div className="db-header-left">
            <button className="db-sidebar-toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              {sidebarCollapsed ? "☰" : "◀"}
            </button>
            <h1 className="db-title">Dashboard</h1>
            <div className="db-tabs">
              {/* Home Button */}
              <a 
                href="/" 
                className="db-tab no-underline" 
                style={{ 
                  textDecoration : "none",
                  filter: "grayscale(100%)", 
                  color: "black", 
                  transition: "filter 0.3s ease, color 0.3s ease" 
                }}
                onMouseEnter={(e) => { e.currentTarget.style.filter = "grayscale(0%)"; }} // Remove grayscale on hover
                onMouseLeave={(e) => { e.currentTarget.style.filter = "grayscale(100%)"; }} // Restore grayscale when not hovered
              >
                <span className="font-semibold">Home</span>
              </a>

              {/* Canvas Button */}
              <button
                className={`db-tab ${activeTab === "canvas" ? "db-tab-active" : ""}`}
                onClick={() => setActiveTab("canvas")}
              >
                Canvas
              </button>

              {/* Data Button */}
              <button
                className={`db-tab ${activeTab === "data" ? "db-tab-active" : ""}`}
                onClick={() => setActiveTab("data")}
              >
                Data
              </button>
            </div>
          </div>

          <div className="db-header-right">
            <div className="db-search">
              <span className="db-search-icon">🔍</span>
              <input className="db-search-input" placeholder="Search..." />
            </div>
            <button className="db-new-dashboard-btn">
              <span className="db-icon">➕</span>
              New Dashboard
            </button>
            <div className="db-user-avatar">JD</div>
          </div>
        </header>

        {/* Main content */}
        <main className="db-content">
          {/* Canvas Tab */}
          {activeTab === "canvas" && (
            <div className="db-canvas-container">
              {/* Widget palette */}
              <WidgetPalette widgets={AVAILABLE_WIDGETS} onAddWidget={handleAddWidget} />

              {/* Canvas area */}
              <div className="db-canvas" onDrop={handleCanvasDrop} onDragOver={handleCanvasDragOver}>
                {widgets.length > 0 ? (
                  <ResponsiveGridLayout
                    className="db-grid-layout"
                    layouts={{ lg: widgets }}
                    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                    cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                    rowHeight={30}
                    isDraggable={true}
                    isResizable={true}
                    onLayoutChange={handleLayoutChange}
                    margin={[16, 16]}
                    useCSSTransforms={true}
                    draggableHandle=".db-widget-header"
                    compactType="vertical"
                    preventCollision={false}
                  >
                    {widgets.map((widget) => {
                      const WidgetComponent = WIDGET_COMPONENTS[widget.type]
                      return (
                        <div key={widget.i}>
                          <Widget
                            id={widget.i}
                            type={widget.type}
                            title={widget.title}
                            onRemove={handleRemoveWidget}
                            onEdit={handleEditWidget}
                            onDuplicate={handleDuplicateWidget}
                          >
                            <WidgetComponent {...widget} />
                          </Widget>
                        </div>
                      )
                    })}
                  </ResponsiveGridLayout>
                ) : (
                  <div className="db-empty-canvas">
                    <div className="db-empty-canvas-icon">📊</div>
                    <h3 className="db-empty-canvas-title">Your canvas is empty</h3>
                    <p className="db-empty-canvas-text">
                      Drag and drop widgets from the palette to start building your dashboard
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Data Tab */}
          {activeTab === "data" && (
            <div className="db-data-container">
              <div className="db-data-header">
                <h2 className="db-data-title">Data Sources</h2>
                <div className="db-data-actions">
                  <button className="db-data-action-btn">
                    <span className="db-icon">📁</span>
                    Connect Data
                  </button>
                  <button className="db-data-action-btn db-data-action-primary">
                    <span className="db-icon">➕</span>
                    New Dataset
                  </button>
                </div>
              </div>

              <div className="db-datasets-grid">
                {DATASETS.map((dataset) => (
                  <div key={dataset.id} className="db-dataset-card">
                    <div className="db-dataset-header">
                      <div className="db-dataset-title">{dataset.name}</div>
                      <button className="db-dataset-menu-btn">⋮</button>
                    </div>
                    <div className="db-dataset-meta">
                      <div className="db-dataset-meta-item">{dataset.rows.toLocaleString()} rows</div>
                      <div className="db-dataset-meta-item">{dataset.columns} columns</div>
                      <div className="db-dataset-meta-item">Updated {dataset.updated}</div>
                    </div>
                    <div className="db-dataset-content">
                      <DataTable datasetId={dataset.id} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Widget Edit Modal */}
      {editingWidget && (
        <div className="db-modal-overlay">
          <div className="db-modal">
            <div className="db-modal-header">
              <h3>Edit Widget</h3>
              <button className="db-modal-close" onClick={handleCancelWidgetEdit}>
                ✕
              </button>
            </div>
            <div className="db-modal-body">
              <div className="db-form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={editingWidget.title}
                  onChange={(e) => setEditingWidget({ ...editingWidget, title: e.target.value })}
                />
              </div>
              {editingWidget.type === "metric" && (
                <>
                  <div className="db-form-group">
                    <label>Value</label>
                    <input
                      type="text"
                      value={editingWidget.value}
                      onChange={(e) => setEditingWidget({ ...editingWidget, value: e.target.value })}
                    />
                  </div>
                  <div className="db-form-group">
                    <label>Change (%)</label>
                    <input
                      type="number"
                      value={editingWidget.change}
                      onChange={(e) =>
                        setEditingWidget({ ...editingWidget, change: Number.parseFloat(e.target.value) })
                      }
                    />
                  </div>
                </>
              )}
            </div>
            <div className="db-modal-footer">
              <button className="db-btn db-btn-secondary" onClick={handleCancelWidgetEdit}>
                Cancel
              </button>
              <button className="db-btn db-btn-primary" onClick={() => handleSaveWidgetEdit(editingWidget)}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard


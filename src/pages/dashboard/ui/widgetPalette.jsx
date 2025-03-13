"use client"
import { useDrag } from "react-dnd"

const DraggableWidgetItem = ({ widget = {}, onAddWidget }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "WIDGET",
    item: { type: widget?.id },
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult()
      if (item && dropResult) {
        onAddWidget?.(widget?.id)
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  return (
    <div
      ref={drag}
      className={`db-palette-widget ${isDragging ? "db-dragging" : ""}`}
      onClick={() => onAddWidget?.(widget?.id)}
    >
      <span className="db-palette-widget-icon">{widget?.icon}</span>
      <span className="db-palette-widget-label">{widget?.label}</span>
    </div>
  )
}

const WidgetPalette = ({ widgets = [], onAddWidget }) => {
  console.log(`🎨 WidgetPalette rendering with ${widgets?.length || 0} widgets`)
  
  return (
    <div className="db-widget-palette">
      <div className="db-palette-header">
        <h3 className="db-palette-title">Widget Palette</h3>
        <div className="db-palette-subtitle">Drag widgets to canvas or click to add</div>
      </div>

      <div className="db-palette-widgets">
        {(widgets || []).map((widget) => (
          <DraggableWidgetItem 
            key={widget?.id || `widget-${Date.now()}`} 
            widget={widget} 
            onAddWidget={onAddWidget} 
          />
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

export default WidgetPalette


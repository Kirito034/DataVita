"use client"

import { useState, useEffect } from "react"
import { AlertCircle, CheckCircle, Info, X } from "lucide-react"

/**
 * CustomAlert Component
 *
 * Displays a notification alert with different styles based on type
 *
 * @param {Object} props - Component props
 * @param {string} props.type - Alert type (success, error, info)
 * @param {string} props.title - Alert title
 * @param {string} props.message - Alert message
 * @param {Function} props.onClose - Function to call when alert is closed
 */
export const CustomAlert = ({ type = "info", title, message, onClose }) => {
  const [isVisible, setIsVisible] = useState(true)

  // Auto-close the alert after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => {
        if (onClose) onClose()
      }, 300) // Wait for fade-out animation
    }, 5000)

    return () => clearTimeout(timer)
  }, [onClose])

  // Handle manual close
  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      if (onClose) onClose()
    }, 300) // Wait for fade-out animation
  }

  // Get the appropriate icon based on alert type
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="alert-icon success" size={20} />
      case "error":
        return <AlertCircle className="alert-icon error" size={20} />
      default:
        return <Info className="alert-icon info" size={20} />
    }
  }

  return (
    <div className={`custom-alert ${type} ${isVisible ? "visible" : "hidden"}`}>
      <div className="alert-icon-wrapper">{getIcon()}</div>
      <div className="alert-content">
        <h4 className="alert-title">{title}</h4>
        <p className="alert-message">{message}</p>
      </div>
      <button className="alert-close" onClick={handleClose}>
        <X size={16} />
      </button>
    </div>
  )
}


/**
 * Format a date string or timestamp into a human-readable format
 *
 * @param {string|Date} dateString - Date string or Date object
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted date string
 */
export const formatDate = (dateString, options = {}) => {
    if (!dateString) return "Unknown"
  
    try {
      const date = new Date(dateString)
  
      // Default options for date formatting
      const defaultOptions = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        ...options,
      }
  
      return new Intl.DateTimeFormat("en-US", defaultOptions).format(date)
    } catch (error) {
      console.error("Error formatting date:", error)
      return "Invalid date"
    }
  }
  
  /**
   * Get relative time (e.g., "2 days ago")
   *
   * @param {string|Date} dateString - Date string or Date object
   * @returns {string} - Relative time string
   */
  export const getRelativeTime = (dateString) => {
    if (!dateString) return "Unknown"
  
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now - date
  
      // Convert to seconds
      const diffSec = Math.floor(diffMs / 1000)
  
      if (diffSec < 60) return `${diffSec} seconds ago`
  
      // Convert to minutes
      const diffMin = Math.floor(diffSec / 60)
      if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`
  
      // Convert to hours
      const diffHour = Math.floor(diffMin / 60)
      if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? "s" : ""} ago`
  
      // Convert to days
      const diffDay = Math.floor(diffHour / 24)
      if (diffDay < 30) return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`
  
      // Convert to months
      const diffMonth = Math.floor(diffDay / 30)
      if (diffMonth < 12) return `${diffMonth} month${diffMonth !== 1 ? "s" : ""} ago`
  
      // Convert to years
      const diffYear = Math.floor(diffMonth / 12)
      return `${diffYear} year${diffYear !== 1 ? "s" : ""} ago`
    } catch (error) {
      console.error("Error calculating relative time:", error)
      return "Unknown"
    }
  }
  
  /**
 * Format duration in seconds to a readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted duration string
 */
export const formatDuration = (seconds) => {
  if (seconds === null || seconds === undefined) return "N/A"

  // Handle very short durations
  if (seconds < 1) return "< 1 second"

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  let result = ""

  if (hours > 0) {
    result += `${hours} hr${hours > 1 ? "s" : ""} `
  }

  if (minutes > 0 || hours > 0) {
    result += `${minutes} min${minutes > 1 ? "s" : ""} `
  }

  if (remainingSeconds > 0 || (hours === 0 && minutes === 0)) {
    result += `${remainingSeconds} sec${remainingSeconds > 1 ? "s" : ""}`
  }

  return result.trim()
}

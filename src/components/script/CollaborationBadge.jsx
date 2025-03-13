"use client"
import { Users, Shield, Eye, Edit, Play } from "lucide-react"
// import "../styles/collaboration-badge.css"

/**
 * CollaborationBadge Component
 *
 * Displays a badge showing collaboration status for a file
 *
 * @param {Object} props - Component props
 * @param {Object} props.file - The file object
 * @param {boolean} props.showDetails - Whether to show detailed information
 * @param {Function} props.onClick - Function to call when clicking the badge
 */
const CollaborationBadge = ({ file, showDetails = false, onClick }) => {
  if (!file) return null

  const { shared_with = [], created_by, permission } = file
  const isShared = Array.isArray(shared_with) && shared_with.length > 0

  // Check if current user is the creator
  const currentUserId = localStorage.getItem("user_id")
  const isCreator = String(created_by) === String(currentUserId)

  // If file is not shared and user is not the creator with a permission, don't show badge
  if (!isShared && !isCreator && !permission) return null

  // Get permission icon
  const getPermissionIcon = () => {
    if (!permission) return null

    switch (permission) {
      case "view":
        return <Eye size={14} className="permission-icon" />
      case "edit":
        return <Edit size={14} className="permission-icon" />
      case "run":
        return <Play size={14} className="permission-icon" />
      case "full":
        return <Shield size={14} className="permission-icon" />
      default:
        return null
    }
  }

  // Get permission label
  const getPermissionLabel = () => {
    if (!permission) return ""

    switch (permission) {
      case "view":
        return "View access"
      case "edit":
        return "Edit access"
      case "run":
        return "Run access"
      case "full":
        return "Full access"
      default:
        return ""
    }
  }

  return (
    <div
      className={`collaboration-badge ${isShared ? "shared" : ""} ${permission || ""}`}
      onClick={onClick ? () => onClick() : undefined}
    >
      {isCreator ? (
        <>
          <Users size={16} className="badge-icon" />
          {showDetails && (
            <div className="badge-details">
              <span className="badge-label">Owner</span>
              <span className="badge-count">
                {shared_with.length} collaborator{shared_with.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </>
      ) : (
        <>
          {getPermissionIcon()}
          {showDetails && (
            <div className="badge-details">
              <span className="badge-label">{getPermissionLabel()}</span>
              <span className="badge-owner">Shared by {file.created_by_name || "Owner"}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default CollaborationBadge

import {
  File,
  Folder,
  ChevronRight,
  ChevronDown,
  FileCode,
  FileText,
  Share2,
  Shield,
  Eye,
  Edit,
  Play,
  Lock,
  AlertTriangle,
} from "lucide-react";
import "../../styles/script/file-item.css";

/**
 * FileItem Component
 *
 * Renders a file or folder item in the file explorer with sharing indicators
 * and access control visualization
 *
 * @param {Object} props - Component props
 * @param {Object} props.item - The file or folder item
 * @param {boolean} props.isExpanded - Whether the folder is expanded
 * @param {Function} props.onToggle - Function to call when toggling folder expansion
 * @param {Function} props.onClick - Function to call when clicking the item
 * @param {Function} props.onDoubleClick - Function to call when double-clicking the item
 * @param {Function} props.onContextMenu - Function to call when right-clicking the item
 * @param {boolean} props.isSelected - Whether the item is selected
 * @param {number} props.depth - The depth level in the tree
 */
const FileItem = ({ item, isExpanded, onToggle, onClick, onDoubleClick, onContextMenu, isSelected, depth = 0 }) => {
  const { type, name, path, shared_with = [], created_by, created_by_full_name, permission } = item;

  // Get current user info from localStorage
  const userId = localStorage.getItem("id");
  const userRole = localStorage.getItem("role");
  const userFullName = localStorage.getItem("full_name");

  // Check if file is shared
  const isShared = Array.isArray(shared_with) && shared_with.length > 0;

  // Check if current user is admin
  const isAdmin = userRole === "admin";

  // Convert IDs to strings for comparison
  const fileCreatorId = String(created_by || "");
  const currentUserId = String(userId || "");

  // Check if current user is the creator by matching IDs
  const isCreator = fileCreatorId === currentUserId;

  // Debug logging for access control
  console.log("File Access Check:", {
    fileName: name,
    userInfo: {
      currentUserId,
      userRole,
      userFullName
    },
    fileInfo: {
      fileCreatorId,
      created_by,
      created_by_full_name
    },
    accessChecks: {
      isAdmin,
      isCreator,
      idMatch: fileCreatorId === currentUserId,
      permission
    }
  });

  // Check if a file is a script file
  const isScriptFile = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    return ["py", "ipynb"].includes(ext);
  };

  // Check if this is a script file
  const isScript = type === "file" && isScriptFile(name);

  // Check if user has access to this file
  const hasAccess = isAdmin || isCreator || (isScript && permission) || !isScript;

  // Get file extension
  const extension = name.split(".").pop().toLowerCase();

  // Get appropriate icon
  const getItemIcon = () => {
    if (type === "folder") {
      return <Folder className="item-icon folder" size={16} />;
    }

    if (["py", "ipynb"].includes(extension)) {
      return <FileCode className="item-icon python" size={16} />;
    } else if (["js", "jsx", "ts", "tsx"].includes(extension)) {
      return <FileText className="item-icon js" size={16} />;
    } else {
      return <File className="item-icon" size={16} />;
    }
  };

  // Get permission icon
  const getPermissionIcon = () => {
    if (isAdmin) {
      return <Shield size={14} className="permission-icon admin" title="Admin access" />;
    }

    if (isCreator) {
      return <Shield size={14} className="permission-icon owner" title="Owner" />;
    }

    if (!permission) return null;

    switch (permission) {
      case "view":
        return <Eye size={14} className="permission-icon view" title="View access" />;
      case "edit":
        return <Edit size={14} className="permission-icon edit" title="Edit access" />;
      case "run":
        return <Play size={14} className="permission-icon run" title="Run access" />;
      case "full":
        return <Shield size={14} className="permission-icon full" title="Full access" />;
      default:
        return null;
    }
  };

  // Get access status for tooltip
  const getAccessStatus = () => {
    if (isAdmin) return "Admin access";
    if (isCreator) return "Owner";
    if (permission) return `${permission.charAt(0).toUpperCase() + permission.slice(1)} access`;
    return "No access";
  };

  // Get creation and modification info
  const getFileInfo = () => {
    const creationInfo = item.created_at ? 
      `Created: ${new Date(item.created_at).toLocaleString()}` : "";
    const creatorInfo = created_by_full_name ? 
      `Created by: ${created_by_full_name}` : "";
    const modificationInfo = item.modified_at ? 
      `Modified: ${new Date(item.modified_at).toLocaleString()}` : "";
    const modifierInfo = item.modified_by_full_name ? 
      `Modified by: ${item.modified_by_full_name}` : "";

    return [creationInfo, creatorInfo, modificationInfo, modifierInfo]
      .filter(info => info)
      .join('\n');
  };

  // Debug log for user info
  console.log("Current User Info:", {
    id: localStorage.getItem("id"),
    role: localStorage.getItem("role"),
    full_name: localStorage.getItem("full_name")
  });

  return (
    <div
      className={`file-item ${type} ${isSelected ? "selected" : ""} ${isShared ? "shared" : ""} ${!hasAccess ? "restricted" : ""}`}
      style={{ paddingLeft: `${depth * 16}px` }}
      title={`${name}
Type: ${type}
Access: ${getAccessStatus()}
${getFileInfo()}
${isShared ? `Shared with ${shared_with.length} user${shared_with.length !== 1 ? "s" : ""}` : ""}`}
    >
      <div 
        className="file-item-content" 
        onClick={onClick} 
        onDoubleClick={onDoubleClick} 
        onContextMenu={onContextMenu}
      >
        {type === "folder" && (
          <span
            className="toggle-icon"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        )}

        {getItemIcon()}

        <span className="item-name">{name}</span>

        <div className="item-indicators">
          {/* Show permission/role indicator */}
          {getPermissionIcon()}

          {/* Show shared icon if file is shared with others */}
          {isShared && (
            <Share2
              size={14}
              className="shared-icon"
              title={`Shared with ${shared_with.length} user${shared_with.length !== 1 ? "s" : ""}`}
            />
          )}

          {/* Show warning icon if user doesn't have access */}
          {isScript && !hasAccess && (
            <AlertTriangle size={14} className="warning-icon" title="You don't have access to this file" />
          )}
        </div>
      </div>
    </div>
  );
};

export default FileItem;

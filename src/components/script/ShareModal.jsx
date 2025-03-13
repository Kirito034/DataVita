
import { useState, useEffect } from "react"
import { X, Search, User, Shield, Eye, Edit, Play, Check } from "lucide-react"
import "../../styles/script/share-modal.css"

/**
 * ShareModal Component
 *
 * A modal dialog for sharing files with other users and managing permissions.
 *
 * @param {Object} props - Component props
 * @param {Object} props.file - The file to be shared
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to call when closing the modal
 * @param {Function} props.onShareUpdate - Function to call when sharing is updated
 */
const ShareModal = ({ file, isOpen, onClose, onShareUpdate }) => {
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [currentSharing, setCurrentSharing] = useState([])
  const [error, setError] = useState(null)

  // Permission levels
  const PERMISSIONS = {
    VIEW: "view",
    EDIT: "edit",
    RUN: "run",
    FULL: "full",
  }

  // Permission descriptions
  const PERMISSION_DESCRIPTIONS = {
    [PERMISSIONS.VIEW]: "Can view file content only",
    [PERMISSIONS.EDIT]: "Can view and edit file content",
    [PERMISSIONS.RUN]: "Can view, edit, and execute file",
    [PERMISSIONS.FULL]: "Full access (view, edit, run, delete, share)",
  }

  // Permission icons
  const PERMISSION_ICONS = {
    [PERMISSIONS.VIEW]: Eye,
    [PERMISSIONS.EDIT]: Edit,
    [PERMISSIONS.RUN]: Play,
    [PERMISSIONS.FULL]: Shield,
  }

  useEffect(() => {
    if (isOpen && file) {
      fetchUsers()
      fetchCurrentSharing()
    }
  }, [isOpen, file])

  // Fetch available users
  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/users")
      if (!response.ok) throw new Error("Failed to fetch users")

      const data = await response.json()
      // Filter out current user
      const currentUserId = localStorage.getItem("user_id")
      const filteredUsers = data.filter((user) => String(user.id) !== String(currentUserId))

      setUsers(filteredUsers)
    } catch (error) {
      console.error("Error fetching users:", error)
      setError("Failed to load users. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch current sharing settings for the file
  const fetchCurrentSharing = async () => {
    if (!file) return;
  
    try {
      setIsLoading(true);
  
      const response = await fetch(
        `/api/files/sharing?path=${encodeURIComponent(file.path)}&name=${encodeURIComponent(file.name)}`
      );
  
      if (!response.ok) {
        throw new Error("Failed to fetch sharing information");
      }
  
      const data = await response.json();
      setCurrentSharing(data.shared_with || []);
  
      // Initialize selected users with current permissions
      if (Array.isArray(data.shared_with)) {
        const initialSelectedUsers = data.shared_with.map((share) => ({
          userId: share.user_id,
          permission: share.permission,
        }));
        setSelectedUsers(initialSelectedUsers);
      }
    } catch (error) {
      console.error("Error fetching sharing info:", error);
      setError("Failed to load sharing information. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  

  // Handle sharing the file
  const handleShare = async () => {
    if (!file) return

    try {
      setIsLoading(true)

      const response = await fetch("/api/files/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: file.path,
          name: file.name,
          sharing: selectedUsers,
        }),
      })

      if (!response.ok) throw new Error("Failed to update sharing")

      // Call the callback to update the parent component
      if (onShareUpdate) {
        onShareUpdate()
      }

      onClose()
    } catch (error) {
      console.error("Error sharing file:", error)
      setError("Failed to share file. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Toggle user selection
  const toggleUserSelection = (userId) => {
    const isAlreadySelected = selectedUsers.some((user) => user.userId === userId)

    if (isAlreadySelected) {
      setSelectedUsers(selectedUsers.filter((user) => user.userId !== userId))
    } else {
      setSelectedUsers([...selectedUsers, { userId, permission: PERMISSIONS.VIEW }])
    }
  }

  // Update permission for a user
  const updatePermission = (userId, permission) => {
    setSelectedUsers(selectedUsers.map((user) => (user.userId === userId ? { ...user, permission } : user)))
  }

  // Check if a user is already selected
  const isUserSelected = (userId) => {
    return selectedUsers.some((user) => user.userId === userId)
  }

  // Get the current permission for a user
  const getUserPermission = (userId) => {
    const user = selectedUsers.find((user) => user.userId === userId)
    return user ? user.permission : null
  }

  // Check if a user is already shared with
  const isUserSharedWith = (userId) => {
    return currentSharing.some((share) => String(share.user_id) === String(userId))
  }

  // Get filtered users based on search term
  const filteredUsers = users.filter((user) => {
    const searchString = searchTerm.toLowerCase()
    const name = (user.name || "").toLowerCase()
    const username = (user.username || "").toLowerCase()
    const email = (user.email || "").toLowerCase()

    return name.includes(searchString) || username.includes(searchString) || email.includes(searchString)
  })

  if (!isOpen) return null

  return (
    <div className="share-modal-overlay">
      <div className="share-modal">
        {/* Header */}
        <div className="share-modal-header">
          <h2>Share "{file?.name}"</h2>
          <button className="close-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="share-modal-search">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {error && <div className="share-modal-error">{error}</div>}

        {/* User List */}
        <div className="share-modal-users">
          {isLoading ? (
            <div className="loading-indicator">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="no-users-found">
              {searchTerm ? "No users match your search" : "No users available to share with"}
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = isUserSelected(user.id);
              const isShared = isUserSharedWith(user.id);
              const currentPermission = getUserPermission(user.id);

              return (
                <div
                  key={user.id}
                  className={`user-item ${isSelected ? "selected" : ""} ${isShared ? "already-shared" : ""}`}
                >
                  <div className="user-info" onClick={() => toggleUserSelection(user.id)}>
                    <div className="user-avatar">
                      <User size={18} />
                    </div>
                    <div className="user-details">
                      <div className="user-name">{user.name || user.username || user.email || `User ${user.id}`}</div>
                      {user.email && <div className="user-email">{user.email}</div>}
                    </div>
                    <div className="user-selection">{isSelected && <Check size={16} className="check-icon" />}</div>
                  </div>

                  {isSelected && (
                    <div className="permission-selector">
                      {Object.values(PERMISSIONS).map((permission) => {
                        const PermissionIcon = PERMISSION_ICONS[permission];
                        return (
                          <div
                            key={permission}
                            className={`permission-option ${currentPermission === permission ? "active" : ""}`}
                            onClick={() => updatePermission(user.id, permission)}
                            title={PERMISSION_DESCRIPTIONS[permission]}
                          >
                            <PermissionIcon size={16} />
                            <span>{permission}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="share-modal-footer">
          <div className="selected-count">
            {selectedUsers.length} user{selectedUsers.length !== 1 ? "s" : ""} selected
          </div>
          <div className="modal-actions">
            <button className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button className="share-button" onClick={handleShare} disabled={isLoading || selectedUsers.length === 0}>
              {isLoading ? "Sharing..." : "Share"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
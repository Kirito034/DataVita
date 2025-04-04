"use client"

import { useState, useEffect } from "react"
import { Share2, X, MoreVertical, Edit, Trash, Users } from "lucide-react"
import ShareModal from "./ShareModel" // Ensure this import is correct

const AppSidebar = ({
  ownedFiles: initialOwnedFiles = [],
  sharedFiles = [],
  handleFileDoubleClick = () => {},
  handleSharedFileDoubleClick = () => {},
  getItemIcon = () => {},
  availableUsers = [],
  openShareModal = () => {},
  isLoading = false,
  addTab = () => {},
  fetchSharedFiles = () => {},
}) => {
  const [currentUserId, setCurrentUserId] = useState(null)
  const [showShareModal, setShowShareModal] = useState(false) // State to control ShareModal visibility
  const [selectedFile, setSelectedFile] = useState(null) // File selected for sharing
  const [showOptions, setShowOptions] = useState(null)
  const [users, setUsers] = useState([])
  const [showUsersModal, setShowUsersModal] = useState(false)
  const [selectedUserFiles, setSelectedUserFiles] = useState([])
  const [showUserFilesModal, setShowUserFilesModal] = useState(false)
  const [selectedUserName, setSelectedUserName] = useState("")
  const [isAdmin, setIsAdmin] = useState(false) // State to track admin role
  const [ownedFiles, setOwnedFiles] = useState(initialOwnedFiles) // Initialize ownedFiles state

  useEffect(() => {
    const userId = localStorage.getItem("user_id")
    const role = localStorage.getItem("role")

    console.log("User ID:", userId)
    console.log("Role:", role)

    if (userId) setCurrentUserId(userId)
    if (role === "admin") setIsAdmin(true) // Set isAdmin to true only if role is "admin"
  }, [])

  // Fetch Users
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users")
      const data = await response.json()
      if (response.ok) {
        setUsers(data)
      } else {
        console.error("Error fetching users:", data.error)
      }
    } catch (error) {
      console.error("Fetch users error:", error)
    }
  }

  // Fetch Files for Selected User
  const fetchUserFiles = async (userId, userName) => {
    try {
      const response = await fetch("/api/files1") // Replace with the correct API endpoint
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`)

      const allFiles = await response.json()
      const userFiles = allFiles.filter((file) => file.creator_id === userId)

      setSelectedUserFiles(userFiles)
      setSelectedUserName(userName)
      setShowUserFilesModal(true)
    } catch (error) {
      console.error("Fetch user files error:", error)
    }
  }

  // Rename File
  const handleRenameClick = async (file) => {
    const newName = prompt("Enter new file name:", file.name)
    if (!newName || newName.trim() === file.name) return

    try {
      const response = await fetch("/api/rename_file", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: file.id, new_name: newName.trim() }),
      })

      // Check if the response is OK before parsing JSON
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Server returned ${response.status}: ${errorText}`)
      }

      const data = await response.json()

      // Update the file name in the UI
      setOwnedFiles((prevFiles) =>
        prevFiles.map((f) => (f.id === file.id ? { ...f, name: newName.trim() } : f))
      )

      // Optional: Show success message
      alert(data.message || "File renamed successfully!")
    } catch (error) {
      console.error("Rename error:", error.message || error)
      alert(error.message || "Failed to rename the file. Please try again.")
    }
  }

  // Delete File
  const handleDeleteClick = async (file) => {
    if (!window.confirm(`Are you sure you want to delete "${file.name}"?`)) return

    try {
      const response = await fetch("/api/delete_file", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: file.id }),
      })

      // Check if the response is OK before parsing JSON
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Server returned ${response.status}: ${errorText}`)
      }

      const data = await response.json()

      // Remove the file from the UI
      setOwnedFiles((prevFiles) => prevFiles.filter((f) => f.id !== file.id))

      // Optional: Show success message
      alert(data.message || "File deleted successfully!")
    } catch (error) {
      console.error("Delete error:", error.message || error)
      alert(error.message || "Failed to delete the file. Please try again.")
    }
  }

  // Open Share Modal
  const handleShareClick = (file) => {
    setSelectedFile(file) // Set the selected file for sharing
    setShowShareModal(true) // Show the ShareModal
  }

  // Open File Content
  const handleFileClick = (file) => {
    if (file.isShared) {
      handleSharedFileDoubleClick(file)
    } else {
      handleFileDoubleClick(file)
    }
  }

  return (
    <div className="sidebar">
      {/* Show the button only if the user is an admin */}
      {isAdmin && (
        <button
          onClick={() => {
            setShowUsersModal(true)
            fetchUsers()
          }}
          className="show-users-button"
        >
          <Users size={16} /> Show All Users' Files
        </button>
      )}

      <h2 className="sidebar-header">📂 My Files</h2>
      <ul className="file-list">
        {ownedFiles.map((file, index) => (
          <li key={file.id || `owned-${index}`} className="file-item">
            <div className="file-item-content" onClick={() => handleFileClick(file)}>
              {getItemIcon(file)}
              <span className="file-name">{file.name}</span>
            </div>
            <MoreVertical
              size={16}
              className="options-icon"
              onClick={() => setShowOptions(showOptions === file.id ? null : file.id)}
            />
            {showOptions === file.id && (
              <div className="options-menu">
                <button className="option-button" onClick={() => handleRenameClick(file)}>
                  <Edit size={14} /> Rename
                </button>
                <button className="option-button delete" onClick={() => handleDeleteClick(file)}>
                  <Trash size={14} /> Delete
                </button>
                <button className="option-button" onClick={() => handleShareClick(file)}>
                  <Share2 size={14} /> Share
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <h2 className="sidebar-header">🔄 Shared Files</h2>
      <ul className="file-list">
        {sharedFiles.map((file, index) => (
          <li
            key={file.id || `shared-${index}`}
            className="file-item shared"
            onClick={() => handleFileClick({ ...file, isShared: true })}
          >
            {getItemIcon(file)}
            <span className="file-name shared">{file.name || file.file_name || "Unnamed File"}</span>
          </li>
        ))}
      </ul>

      {/* Share Modal */}
      {showShareModal && selectedFile && (
        <ShareModal
          isOpen={showShareModal} // Pass the modal visibility state
          onClose={() => setShowShareModal(false)} // Function to close the modal
          file={selectedFile} // Pass the selected file
        />
      )}

      {/* Users Modal */}
      {showUsersModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Select a User</h3>
            <button onClick={() => setShowUsersModal(false)} className="close-button">
              <X size={16} />
            </button>
            <ul className="users-list">
              {users.map((user) => (
                <li
                  key={user.id}
                  className="user-item"
                  onClick={() => {
                    fetchUserFiles(user.id, user.name) // Call fetchUserFiles here
                    setShowUsersModal(false)
                  }}
                >
                  {user.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* User Files Modal */}
      {showUserFilesModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Files of {selectedUserName}</h3>
            <button onClick={() => setShowUserFilesModal(false)} className="close-button">
              <X size={16} />
            </button>
            <ul className="files-list">
              {selectedUserFiles.length > 0 ? (
                selectedUserFiles.map((file, index) => (
                  <li key={file.id || `user-file-${index}`} className="file-item" onClick={() => handleFileClick(file)}>
                    {getItemIcon(file)}
                    <span>{file.name}</span>
                  </li>
                ))
              ) : (
                <p>No files found</p>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default AppSidebar
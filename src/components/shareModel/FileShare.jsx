import React, { useState, useEffect } from "react";
import { X, Search, Send, User } from 'lucide-react'; // Using Lucide icons for consistency
import "./ShareModel.css";

const FileShare = ({ fileId, onClose, loadFileStructure, setAlert }) => {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [search, setSearch] = useState("");
  const currentUserId = localStorage.getItem("user_id");

  // Fetch Users (Exclude current user)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/users", {
          headers: { "X-User-ID": currentUserId },
        });
        if (!response.ok) throw new Error("Failed to fetch users");
        const data = await response.json();
        // Exclude the current user from the list of users
        setUsers(data.filter((user) => user.id !== currentUserId));
      } catch (error) {
        console.error("Error fetching users:", error);
        setAlert({
          type: "error",
          message: "Failed to fetch user list.",
        });
      }
    };

    fetchUsers();
  }, [currentUserId, setAlert]);

  // Handle User Selection
  const handleSelectUser = (user) => {
    if (!selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, { id: user.id, name: user.full_name }]);
      setSearch(""); // Clear search after selection
    }
  };

  // Remove Selected User
  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter((user) => user.id !== userId));
  };

  // Handle File Sharing
  const handleShare = async () => {
    if (!fileId || selectedUsers.length === 0) {
      setAlert({ type: "error", message: "Please select users to share the file." });
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/share_file", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": currentUserId,
        },
        body: JSON.stringify({
          file_id: fileId,
          shared_with: selectedUsers.map((user) => user.id),
        }),
      });

      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || "Failed to share file");

      handleShareSuccess(); // Call success function
    } catch (error) {
      console.error("Error sharing file:", error);
      setAlert({ type: "error", message: error.message || "Internal Server Error" });
    }
  };

  // Handle Share Success
  const handleShareSuccess = () => {
    setAlert({
      type: "success",
      title: "File Shared",
      message: "File shared successfully!",
    });
    loadFileStructure();
    onClose(); // Close modal after sharing
  };

  return (
    <div className="share-modal-overlay">
      <div className="share-modal-container">
        <button className="share-modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        
        <h2 className="share-modal-title">Share File</h2>
        <p className="share-modal-description">Select users to share this file with:</p>

        {/* Search Input */}
        <div className="share-search-container">
          <Search size={16} className="share-search-icon" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="share-search-input"
          />
        </div>

        {/* Filtered User List */}
        {search && (
          <ul className="share-user-suggestions">
            {users
              .filter((user) =>
                user.full_name?.toLowerCase().includes(search.toLowerCase())
              )
              .slice(0, 5) // Display only the first 5 matching results
              .map((user) => (
                <li
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="share-suggestion-item"
                >
                  <User size={14} className="share-user-icon" />
                  <span>{user.full_name}</span>
                </li>
              ))}
          </ul>
        )}

        {/* Selected Users */}
        <div className="share-selected-users">
          {selectedUsers.length === 0 && (
            <div className="share-no-users">No users selected</div>
          )}
          
          {selectedUsers.map((user) => (
            <div key={user.id} className="share-user-badge">
              <span>{user.name}</span>
              <button 
                onClick={() => handleRemoveUser(user.id)} 
                className="share-remove-user"
                aria-label="Remove user"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="share-modal-actions">
          <button onClick={handleShare} className="share-send-button">
            <Send size={14} className="share-send-icon" /> 
            Share
          </button>
          <button onClick={onClose} className="share-cancel-button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileShare;

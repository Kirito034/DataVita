import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, Check, AlertCircle, CheckCircle, User } from 'lucide-react';
import "./ShareModel.css";

const ShareModal = ({ isOpen, onClose, file }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Get the logged-in user ID from localStorage
  const currentUserId = localStorage.getItem("user_id");

  useEffect(() => {
    if (!isOpen) return;
  
    axios
      .get("http://127.0.0.1:5000/api/users")
      .then((response) => {
        const filteredUsers = response.data.filter((user) => user.id !== currentUserId);
        setUsers(filteredUsers);
      })
      .catch((error) => {
        console.error("Error fetching users:", error);
        setErrorMessage("Failed to load users.");
      });
  }, [isOpen, currentUserId]);
  
  const handleSelectUser = (userId) => {
    setSelectedUser(userId);
    setErrorMessage("");
  };

  const handleShare = () => {
    if (!selectedUser) {
      setErrorMessage("Please select a user to share the file with.");
      return;
    }

    axios
      .put("http://127.0.0.1:5000/api/share_file", {
        file_id: file.id,
        shared_with: selectedUser,
      })
      .then(() => {
        setSuccessMessage("File shared successfully!");
        setTimeout(() => {
          onClose();
        }, 1500);
      })
      .catch(() => {
        setErrorMessage("Failed to share the file.");
      });
  };

  if (!isOpen) return null;

  return (
    <div className="share-modal-overlay">
      <div className="share-modal-container">
        <button className="share-modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        
        <h2 className="share-modal-title">
          Share File: <span className="share-filename">{file.name}</span>
        </h2>

        {/* Messages */}
        {errorMessage && (
          <div className="share-message error">
            <AlertCircle size={16} />
            {errorMessage}
          </div>
        )}
        
        {successMessage && (
          <div className="share-message success">
            <CheckCircle size={16} />
            {successMessage}
          </div>
        )}

        {/* User List */}
        <div className="share-users-list">
          {users.length > 0 ? (
            users.map((user) => (
              <div
                key={user.id}
                className={`share-user-item ${selectedUser === user.id ? 'selected' : ''}`}
                onClick={() => handleSelectUser(user.id)}
              >
                <div className="share-user-info">
                  <User size={16} className="share-user-icon" />
                  <span>{user.name || "Unnamed User"}</span>
                </div>
                {selectedUser === user.id && (
                  <Check size={16} className="share-check-icon" />
                )}
              </div>
            ))
          ) : (
            <div className="share-no-users">No users available to share the file.</div>
          )}
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="share-send-button full-width"
          disabled={!selectedUser}
        >
          Share File
        </button>
      </div>
    </div>
  );
};

export default ShareModal;

 
"use client"
 
import { useEffect, useState, useRef } from "react"
import axios from "axios"
import { useSearchParams, useNavigate } from "react-router-dom"
import {
  FaUser,
  FaTrash,
  FaKey,
  FaCopy,
  FaSearch,
  FaSync,
  FaEye,
  FaEyeSlash,
  FaUserCog,
  FaChartBar,
  FaChartPie,
} from "react-icons/fa"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
 
const AdminDashboard = () => {
  const [searchParams] = useSearchParams()
  const user_id = searchParams.get("user_id")
  const role = searchParams.get("role")
  const storedRole = localStorage.getItem("role")
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [filterEmail, setFilterEmail] = useState("")
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showUserIds, setShowUserIds] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userName, setUserName] = useState("")
  const [animateHeader, setAnimateHeader] = useState(false)
  const [headerStyle, setHeaderStyle] = useState({
    backgroundColor: "rgba(255, 255, 255, 1)",
    backdropFilter: "blur(0px)",
    boxShadow: "none",
    padding: "1rem 0",
  })
 
  // Refs for animations
  const headerRef = useRef(null)
  const tableRef = useRef(null)
  const chartsRef = useRef(null)
  const barChartRef = useRef(null)
  const pieChartRef = useRef(null)
  const searchRef = useRef(null)
  const statsRef = useRef(null)
 
  const navigate = useNavigate()
 
  // API Base URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
 
  useEffect(() => {
    if (role !== "admin" || storedRole !== "admin") {
      alert("Unauthorized Access!")
      navigate("/")
    }
 
    fetchUsers()
    fetchUserName(user_id)
 
    // Trigger animations after component mounts
    setTimeout(() => {
      setAnimateHeader(true)
    }, 300)
 
    // Header scroll effect
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setHeaderStyle({
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 5px 20px rgba(0, 0, 0, 0.1)",
          padding: "0.5rem 0",
        })
      } else {
        setHeaderStyle({
          backgroundColor: "rgba(255, 255, 255, 1)",
          backdropFilter: "blur(0px)",
          boxShadow: "none",
          padding: "1rem 0",
        })
      }
    }
 
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [user_id, role, storedRole, navigate])
 
  // Function to fetch username using the provided API endpoint
  const fetchUserName = async (userId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/api/user-name`, {
        params: { user_id: userId },
      })
 
      if (response.data && response.data.full_name) {
        setUserName(response.data.full_name)
      }
    } catch (error) {
      console.error("Failed to fetch user name:", error)
    }
  }
 
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE_URL}/auth/api/get-all-users`)
      const updatedUsers = response.data.map((user) => (user.id === user_id ? { ...user, is_online: true } : user))
      setUsers(updatedUsers)
      setFilteredUsers(updatedUsers) // Initially, show all users
    } catch (error) {
      setError("Failed to load users.")
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }
 
  const handleFilterByEmail = (e) => {
    const filterValue = e.target.value.toLowerCase()
    setFilterEmail(filterValue)
    const filtered = users.filter((user) => user.email.toLowerCase().includes(filterValue))
    setFilteredUsers(filtered)
  }
 
  // Calculate number of online and offline users
  const getOnlineUsersCount = () => {
    return users.filter((user) => user.is_online).length
  }
 
  const getOfflineUsersCount = () => {
    return users.filter((user) => !user.is_online).length
  }
 
  // Data for Online/Offline Users Bar Chart
  const onlineOfflineData = [
    { name: "Online", value: getOnlineUsersCount() },
    { name: "Offline", value: getOfflineUsersCount() },
  ]
 
  // Data for Role Distribution Pie Chart
  const roleDistributionData = [
    { name: "Admin", value: users.filter((user) => user.role === "admin").length },
    { name: "User", value: users.filter((user) => user.role === "user").length },
    { name: "Developer", value: users.filter((user) => user.role === "developer").length },
  ]
 
  // Color Palette
  const COLORS = ["#006d77", "#83c5be", "#ffddd2", "#e29578"]
 
  const promoteUser = async (userId, newRole) => {
    try {
      const user = users.find((user) => user.id === userId)
      if (!user) {
        alert("User not found.")
        return
      }
      if (user.role === "admin") {
        alert("Admin role cannot be changed.")
        return
      }
 
      await axios.post(`${API_BASE_URL}/auth/api/promote-user`, {
        user_id: userId,
        role: newRole,
      })
 
      alert(`User promoted to ${newRole} successfully.`)
      fetchUsers()
    } catch (error) {
      console.error("Failed to promote user:", error.response?.data || error.message)
    }
  }
 
  const deleteUser = async (userId, userRole) => {
    if (userRole === "admin") {
      alert("Admin users cannot be deleted.")
      return
    }
 
    try {
      await axios.delete(`${API_BASE_URL}/auth/api/delete-user`, {
        data: { user_id: userId },
      })
 
      // Find the row to animate
      const row = document.querySelector(`tr[data-user-id="${userId}"]`)
      if (row) {
        // Add animation class
        row.classList.add("row-exit")
 
        // Wait for animation to complete before refreshing
        setTimeout(() => {
          alert("User deleted successfully.")
          fetchUsers()
        }, 300)
      } else {
        alert("User deleted successfully.")
        fetchUsers()
      }
    } catch (error) {
      console.error("Failed to delete user:", error.response?.data || error.message)
    }
  }
 
  const resetPassword = async () => {
    try {
      if (!selectedUserId.trim() || !newPassword.trim()) {
        alert("Please enter a valid User ID and password.")
        return
      }
 
      const response = await axios.post(`${API_BASE_URL}/auth/api/reset-password`, {
        user_id: selectedUserId,
        new_password: newPassword,
      })
 
      alert(response.data.message)
 
      // Close modal with animation
      const modalContent = document.querySelector(".modal-content")
      if (modalContent) {
        modalContent.classList.add("modal-exit")
 
        setTimeout(() => {
          setIsResetModalOpen(false)
          setNewPassword("")
          setSelectedUserId("")
        }, 300)
      } else {
        setIsResetModalOpen(false)
        setNewPassword("")
        setSelectedUserId("")
      }
    } catch (error) {
      console.error("Failed to reset password:", error.response?.data || error.message)
      alert(error.response?.data?.error || "An error occurred. Please try again.")
    }
  }
 
  const toggleUserIdVisibility = (userId) => {
    setShowUserIds((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }))
  }
 
  const copyUserIdToClipboard = (userId) => {
    navigator.clipboard.writeText(userId).then(() => {
      // Flash animation to indicate copy success
      const copyBtn = document.querySelector(`#copy-${userId}`)
      if (copyBtn) {
        copyBtn.classList.add("copy-success")
        setTimeout(() => {
          copyBtn.classList.remove("copy-success")
        }, 600)
      }
 
      alert("User ID copied to clipboard!")
    })
  }
 
  const handleShowActivity = (userId) => {
    navigate(`/activity-logs?user_id=${userId}`)
  }
 
  const handleBarClick = (data) => {
    alert(`Category: ${data.name}\nValue: ${data.value}`)
  }
 
  const handlePieClick = (data) => {
    alert(`Role: ${data.name}\nCount: ${data.value}`)
  }
 
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }
 
  const handleLogout = async () => {
    try {
      const userId = localStorage.getItem("user_id")
 
      if (userId) {
        await axios.post(`${API_BASE_URL}/auth/api/logout`, { user_id: userId })
      }
 
      // Add page fade out class
      document.querySelector(".datavita-landing-page").classList.add("page-exit")
 
      // Wait for animation to complete
      setTimeout(() => {
        localStorage.removeItem("user_id")
        localStorage.removeItem("role")
        localStorage.removeItem("full_name")
        navigate("/login")
      }, 500)
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }
 
  const openResetModal = (userId) => {
    setSelectedUserId(userId)
    setIsResetModalOpen(true)
  }
 
  if (loading) {
    return (
      <div className="datavita-loading">
        <div className="datavita-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }
 
  if (error) {
    return <div className="datavita-error">{error}</div>
  }
 
  return (
    <div className="datavita-landing-page">
      {/* Header */}
      <header className="datavita-header" ref={headerRef} style={headerStyle}>
        <div className="datavita-container datavita-header-container">
          <div className="datavita-logo">
            <span className="datavita-logo-text">DataVita</span>
            <span className="datavita-logo-dot"></span>
          </div>
          <nav className={`datavita-nav-links ${mobileMenuOpen ? "datavita-mobile-open" : ""}`}>
            <div className="datavita-user-welcome">
              Welcome, <span className="datavita-username-highlight">{userName}</span>
            </div>
 
            <a href="/Compiler" className="datavita-nav-link">
              Workplace
            </a>
 
            <a href="#" onClick={() => navigate(`/activity-logs?user_id=${user_id}`)} className="datavita-nav-link">
              Logs
            </a>
 
            <a href="#footer" className="datavita-nav-link">
              About Us
            </a>
          </nav>
          <div className="datavita-auth-buttons">
            <div className="datavita-user-profile">
              <button onClick={handleLogout} className="datavita-btn datavita-btn-logout">
                Logout
              </button>
            </div>
          </div>
          <button
            className={`datavita-mobile-menu-btn ${mobileMenuOpen ? "datavita-active" : ""}`}
            onClick={toggleMobileMenu}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>
 
      {/* Main Admin Dashboard Content */}
      <div className="datavita-admin-dashboard">
        <div className="datavita-container">
          <div className={`datavita-dashboard-header ${animateHeader ? "slide-in-active" : ""}`}>
            <h2 className="admin-title">Admin Dashboard</h2>
            <p className="admin-subtitle">Manage users and monitor system activity</p>
          </div>
 
          {/* Search and Filter Section */}
          <div className="admin-search-section" ref={searchRef}>
            <div className="search-input-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Filter by Email"
                value={filterEmail}
                onChange={handleFilterByEmail}
                className="admin-search-input"
              />
            </div>
            <button onClick={fetchUsers} className="refresh-button">
              <FaSync className="refresh-icon" /> Refresh Users
            </button>
          </div>
 
          <div className="user-stats" ref={statsRef}>
            <div className="stat-item">
              <span className="stat-label">Total Users:</span>
              <span className="stat-value">{Array.isArray(users) ? users.length : 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Online:</span>
              <span className="stat-value online">{getOnlineUsersCount()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Offline:</span>
              <span className="stat-value offline">{getOfflineUsersCount()}</span>
            </div>
          </div>
 
          {/* User Table */}
          <div className="table-container" ref={tableRef}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Email</th>
                  <th>Full Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="table-row" data-user-id={user.id}>
                    <td>
                      {!showUserIds[user.id] ? (
                        <button onClick={() => toggleUserIdVisibility(user.id)} className="action-button view-id">
                          <FaEye /> View ID
                        </button>
                      ) : (
                        <div className="user-id-container">
                          <span className="user-id" id={`user-id-${user.id}`}>
                            {user.id}
                          </span>
                          <div className="id-actions">
                            <button
                              onClick={() => toggleUserIdVisibility(user.id)}
                              className="action-button hide-id"
                              id={`hide-${user.id}`}
                            >
                              <FaEyeSlash />
                            </button>
                            <button
                              onClick={() => copyUserIdToClipboard(user.id)}
                              className="action-button copy-id"
                              id={`copy-${user.id}`}
                            >
                              <FaCopy />
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                    <td>{user.email}</td>
                    <td>{user.full_name}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>{user.role}</span>
                    </td>
                    <td>
                      <span className={`status-indicator ${user.is_online ? "online" : "offline"}`}>
                        {user.is_online ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {user.role !== "admin" && (
                          <>
                            <button
                              id={`promote-${user.id}-user`}
                              onClick={() => promoteUser(user.id, "user")}
                              className="action-button promote"
                              title="Promote to User"
                            >
                              <FaUser /> User
                            </button>
                            <button
                              id={`promote-${user.id}-developer`}
                              onClick={() => promoteUser(user.id, "developer")}
                              className="action-button promote"
                              title="Promote to Developer"
                            >
                              <FaUserCog /> Dev
                            </button>
                            <button
                              id={`delete-${user.id}`}
                              onClick={() => deleteUser(user.id, user.role)}
                              className="action-button delete"
                              title="Delete User"
                            >
                              <FaTrash />
                            </button>
                          </>
                        )}
                        <button
                          id={`reset-${user.id}`}
                          onClick={() => openResetModal(user.id)}
                          className="action-button reset"
                          title="Reset Password"
                        >
                          <FaKey />
                        </button>
                        <button
                          id={`activity-${user.id}`}
                          onClick={() => handleShowActivity(user.id)}
                          className="action-button activity"
                          title="Show Activity"
                        >
                          <FaChartBar />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
 
          {/* Reset Password Modal */}
          {isResetModalOpen && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3 className="modal-title">Reset Password</h3>
                <p className="modal-user-id">User ID: {selectedUserId}</p>
                <input
                  type="password"
                  placeholder="Enter New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="modal-input"
                />
                <div className="modal-buttons">
                  <button id="reset-confirm-btn" onClick={resetPassword} className="modal-button confirm">
                    Set New Password
                  </button>
                  <button onClick={() => setIsResetModalOpen(false)} className="modal-button cancel">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
 
          {/* Charts Section */}
          <div className="charts-container" ref={chartsRef}>
            {/* Online/Offline Users Bar Chart */}
            <div className="chart-card bar-chart" ref={barChartRef}>
              <div className="chart-header">
                <h3 className="chart-title">
                  <FaChartBar className="chart-icon" /> Online vs Offline Users
                </h3>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={onlineOfflineData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    onClick={handleBarClick}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" animationDuration={1500}>
                      {onlineOfflineData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
 
            {/* Role Distribution Pie Chart */}
            <div className="chart-card pie-chart" ref={pieChartRef}>
              <div className="chart-header">
                <h3 className="chart-title">
                  <FaChartPie className="chart-icon" /> User Role Distribution
                </h3>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart onClick={handlePieClick}>
                    <Pie
                      data={roleDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                      animationDuration={1500}
                      animationBegin={300}
                    >
                      {roleDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
 
      {/* Footer */}
      <footer id="footer" className="datavita-footer">
        <div className="datavita-container">
          <div className="datavita-footer-top">
            <div className="datavita-footer-brand">
              <div className="datavita-logo">
                <span className="datavita-logo-text" style={{ color: "white" }}>
                  DataVita
                </span>
                <span className="datavita-logo-dot" style={{ backgroundColor: "lightgray" }}></span>
              </div>
              <p>Data analytics platform for advanced workflows.</p>
            </div>
 
            <div className="datavita-footer-links">
              <div className="datavita-footer-links-column">
                <h4>Product</h4>
                <a href="/Compiler">Workplace</a>
              </div>
 
              <div className="datavita-footer-links-column">
                <h4>Company</h4>
                <a href="#footer" className="datavita-nav-link">
                  About Us
                </a>
                <a href="#careers">Careers</a>
                <a href="#testimonials">Blog</a>
              </div>
 
              <div className="datavita-footer-links-column">
                <h4>Resources</h4>
                <a href="#documentation">Documentation</a>
                <a href="#support">Support</a>
                <a href="#community">Community</a>
              </div>
            </div>
          </div>
 
          <div className="datavita-footer-bottom">
            <p>&copy; 2025 DataVita. All rights reserved.</p>
            <div className="datavita-social-links">
              <a href="#twitter" className="datavita-social-link">
                Twitter
              </a>
              <a href="#linkedin" className="datavita-social-link">
                LinkedIn
              </a>
              <a href="#github" className="datavita-social-link">
                GitHub
              </a>
            </div>
          </div>
        </div>
        <div className="datavita-watermark">DataVita</div>
      </footer>
 
      <style jsx>{`
        /* Admin Dashboard Specific Styles */
        .datavita-admin-dashboard {
          padding: 2;
          min-height: calc(100vh - 70px);
        }
 
        /* Animated Header */
        .datavita-dashboard-header {
          margin-bottom: 0.900;
          opacity: 0;
          transform: translateY(-20px);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }
 
        .slide-in-active {
          opacity: 1;
          transform: translateY(0);
        }
 
        .admin-title {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: #1d3557;
          position: relative;
          display: inline-block;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          background: linear-gradient(135deg, #1d3557, #457b9d);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: fadeIn 1s ease-in-out;
        }
 
        .admin-title::after {
          content: "";
          position: absolute;
          bottom: -8px;
          left: 0;
          width: 60px;
          height: 4px;
          background: linear-gradient(90deg, #1d3557, #457b9d);
          border-radius: 2px;
          animation: slideIn 1.2s ease-in-out;
        }
 
        .admin-subtitle {
          font-size: 1.1rem;
          color: #666;
          margin-bottom: 2rem;
          animation: fadeIn 1.5s ease-in-out;
        }
 
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
 
        @keyframes slideIn {
          from { width: 0; }
          to { width: 60px; }
        }
 
        /* Search and Filter Section */
        .admin-search-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 1rem;
          animation: fadeInUp 0.8s ease forwards;
          animation-delay: 0.3s;
          opacity: 0;
        }
 
        .search-input-container {
          position: relative;
          flex: 1;
          max-width: 400px;
        }
 
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #666;
        }
 
        .admin-search-input {
          width: 100%;
          padding: 10px 10px 10px 40px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.3s;
          background-color: #f9f9f9;
        }
 
        .admin-search-input:focus {
          outline: none;
          border-color: #333;
          box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
        }
 
        .refresh-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background-color: #1d3557;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
        }
 
        .refresh-button:hover {
          background-color: #152a45;
          transform: translateY(-2px);
        }
 
        .refresh-icon {
          font-size: 14px;
        }
 
        /* User Stats */
        .user-stats {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          animation: fadeInUp 0.8s ease forwards;
          animation-delay: 0.5s;
          opacity: 0;
        }
 
        .stat-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background-color: #f5f5f5;
          padding: 8px 16px;
          border-radius: 8px;
        }
 
        .stat-label {
          font-size: 14px;
          color: #666;
        }
 
        .stat-value {
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }
 
        .stat-value.online {
          color: #10b981;
        }
 
        .stat-value.offline {
          color: #ef4444;
        }
 
        /* Table Styles */
        .table-container {
          overflow-x: auto;
          margin-bottom: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          animation: fadeInUp 0.8s ease forwards;
          animation-delay: 0.7s;
          opacity: 0;
        }
 
        .admin-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          background-color: white;
          border-radius: 12px;
          overflow: hidden;
        }
 
        .admin-table th {
          padding: 16px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
          background-color: #1d3557;
          color: #ffffff;
          position: sticky;
          top: 0;
        }
 
        .admin-table th:first-child {
          border-top-left-radius: 12px;
        }
 
        .admin-table th:last-child {
          border-top-right-radius: 12px;
        }
 
        .admin-table td {
          padding: 14px 16px;
          font-size: 14px;
          color: #333;
          border-bottom: 1px solid #eee;
          vertical-align: middle;
        }
 
        .table-row {
          transition: background-color 0.3s, opacity 0.3s, height 0.3s;
          animation: fadeIn 0.5s ease-in-out;
        }
 
        .table-row:nth-child(odd) {
          animation-delay: 0.1s;
        }
 
        .table-row:nth-child(even) {
          animation-delay: 0.2s;
        }
 
        .table-row:hover {
          background-color: #f9f9f9;
        }
 
        .table-row:last-child td {
          border-bottom: none;
        }
 
        .row-exit {
          opacity: 0;
          height: 0;
          overflow: hidden;
        }
 
        /* User ID Styles */
        .user-id-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }
 
        .user-id {
          font-family: monospace;
          background-color: #f5f5f5;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          animation: fadeIn 0.3s ease;
        }
 
        .id-actions {
          display: flex;
          gap: 4px;
        }
 
        /* Role Badge */
        .role-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }
 
        .role-badge.admin {
          background-color: #fecaca;
          color: #b91c1c;
        }
 
        .role-badge.user {
          background-color: #bfdbfe;
          color: #1e40af;
        }
 
        .role-badge.developer {
          background-color: #bbf7d0;
          color: #166534;
        }
 
        /* Status Indicator */
        .status-indicator {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
 
        .status-indicator::before {
          content: "";
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 6px;
        }
 
        .status-indicator.online {
          background-color: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
 
        .status-indicator.online::before {
          background-color: #10b981;
        }
 
        .status-indicator.offline {
          background-color: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
 
        .status-indicator.offline::before {
          background-color: #ef4444;
        }
 
        /* Action Buttons */
        .action-buttons {
          display: flex;
          flex-wrap: nowrap;
          gap: 4px;
          justify-content: flex-start;
          min-width: 240px;
        }
 
        .action-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 5px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
 
        .action-button:hover {
          transform: translateY(-2px);
        }
 
        .action-button.view-id {
          background-color: #f3f4f6;
          color: #4b5563;
        }
 
        .action-button.view-id:hover {
          background-color: #e5e7eb;
        }
 
        .action-button.hide-id,
        .action-button.copy-id {
          background-color: #f3f4f6;
          color: #4b5563;
          padding: 4px;
        }
 
        .action-button.promote {
          background-color: #dbeafe;
          color: #1e40af;
        }
 
        .action-button.promote:hover {
          background-color: #bfdbfe;
        }
 
        .action-button.delete {
          background-color: #fee2e2;
          color: #b91c1c;
        }
 
        .action-button.delete:hover {
          background-color: #fecaca;
        }
 
        .action-button.reset {
          background-color: #fef3c7;
          color: #92400e;
        }
 
        .action-button.reset:hover {
          background-color: #fde68a;
        }
 
        .action-button.activity {
          background-color: #e0f2fe;
          color: #0369a1;
        }
 
        .action-button.activity:hover {
          background-color: #bae6fd;
        }
 
        .copy-success {
          background-color: #10b981 !important;
          color: white !important;
          transition: background-color 0.3s, color 0.3s;
        }
 
        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }
 
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
 
        .modal-content {
          background-color: white;
          border-radius: 12px;
          padding: 24px;
          width: 90%;
          max-width: 400px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          animation: slideIn 0.3s ease;
        }
 
        .modal-exit {
          animation: slideOut 0.3s ease forwards;
        }
 
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
 
        @keyframes slideOut {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(-20px); opacity: 0; }
        }
 
        .modal-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #333;
        }
 
        .modal-user-id {
          font-family: monospace;
          background-color: #f5f5f5;
          padding: 8px;
          border-radius: 6px;
          margin-bottom: 1rem;
          font-size: 14px;
        }
 
        .modal-input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          font-size: 14px;
          background-color: #f9f9f9;
        }
 
        .modal-input:focus {
          outline: none;
          border-color: #333;
          box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
        }
 
        .modal-buttons {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
 
        .modal-button {
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.3s;
        }
 
        .modal-button.confirm {
          background-color: #1d3557;
          color: white;
        }
 
        .modal-button.confirm:hover {
          background-color: #152a45;
        }
 
        .modal-button.cancel {
          background-color: #e5e7eb;
          color: #4b5563;
        }
 
        .modal-button.cancel:hover {
          background-color: #d1d5db;
        }
 
        /* Charts Section */
        .charts-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
 
        .chart-card {
          background-color: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
 
        .chart-card.bar-chart {
          animation: fadeInUp 0.8s ease forwards;
          animation-delay: 0.9s;
          opacity: 0;
        }
 
        .chart-card.pie-chart {
          animation: fadeInUp 0.8s ease forwards;
          animation-delay: 1.1s;
          opacity: 0;
        }
 
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
 
        .chart-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }
 
        .chart-header {
          padding: 16px;
          border-bottom: 1px solid #eee;
        }
 
        .chart-title {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
 
        .chart-icon {
          color: #1d3557;
        }
 
        .chart-body {
          padding: 16px;
          height: 280px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
 
        /* Page exit animation */
        .page-exit {
          opacity: 0;
          transition: opacity 0.5s ease;
        }
 
        /* Responsive Styles */
        @media (max-width: 768px) {
          .admin-search-section {
            flex-direction: column;
            align-items: flex-start;
          }
 
          .search-input-container {
            width: 100%;
            max-width: none;
          }
 
          .charts-container {
            grid-template-columns: 1fr;
          }
 
          .action-buttons {
            flex-wrap: wrap;
          }
        }
 
        /* Additional animations */
        .datavita-header {
          animation: slideDown 0.8s ease-out;
        }
 
        .datavita-nav-links {
          animation: fadeIn 1s ease-in-out 0.3s forwards;
          opacity: 0;
        }
 
        .datavita-auth-buttons {
          animation: fadeIn 1s ease-in-out 0.5s forwards;
          opacity: 0;
        }
 
        @keyframes slideDown {
          from {
            transform: translateY(-50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
 
export default AdminDashboard
 
 
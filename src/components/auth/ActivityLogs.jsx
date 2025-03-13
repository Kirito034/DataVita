 
"use client"
 
import { useEffect, useState, useRef, useMemo } from "react"
import axios from "axios"
import { useSearchParams, useNavigate } from "react-router-dom"
import { Chart } from "chart.js/auto"
import DatePicker, { registerLocale } from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { IoCalendarOutline, IoArrowBackOutline } from "react-icons/io5"
import { FaChartBar, FaChartPie, FaSync } from "react-icons/fa"
import enGB from "date-fns/locale/en-GB"
 
registerLocale("en-GB", enGB)
 
const ActivityLogs = () => {
  const [searchParams] = useSearchParams()
  const userId = searchParams.get("user_id")
  const [activityLogs, setActivityLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userName, setUserName] = useState("")
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" })
  const [selectedDate, setSelectedDate] = useState(null)
  const [filteredData, setFilteredData] = useState([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [animateHeader, setAnimateHeader] = useState(false)
  const [headerStyle, setHeaderStyle] = useState({
    backgroundColor: "rgba(255, 255, 255, 1)",
    backdropFilter: "blur(0px)",
    boxShadow: "none",
    padding: "1rem 0",
  })
 
  const navigate = useNavigate()
 
  // Refs for animations
  const headerRef = useRef(null)
  const tableRef = useRef(null)
  const chartsRef = useRef(null)
  const filterRef = useRef(null)
 
  const loginFrequencyChartRef = useRef(null)
  const sessionStatusChartRef = useRef(null)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
 
  useEffect(() => {
    if (!userId) {
      setError("Invalid user ID.")
      setLoading(false)
      return
    }
    fetchUserActivity(userId)
    fetchUserName(userId)
 
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
  }, [userId])
 
  const fetchUserActivity = async (userId) => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE_URL}/auth/api/user-activity`, {
        params: { user_id: userId },
      })
      setActivityLogs(response.data)
      setFilteredData(response.data)
    } catch (error) {
      setError("Failed to fetch activity logs.")
      console.error(error)
      setActivityLogs([])
      setFilteredData([])
    } finally {
      setLoading(false)
    }
  }
 
  const fetchUserName = async (userId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/api/user-data`, {
        params: { user_id: userId },
      })
      setUserName(response.data.full_name || "Unknown User")
    } catch (error) {
      console.error(error)
      setUserName("Unknown User")
    }
  }
 
  const formatDateTime = (datetime) => {
    if (!datetime) return "Still logged in"
    const date = new Date(datetime)
    return date.toLocaleDateString("en-GB") + " " + date.toLocaleTimeString("en-GB")
  }
 
  const calculateSurfingTime = (loginTime, logoutTime) => {
    if (!loginTime) return "N/A"
    const loginDate = new Date(loginTime)
    const now = new Date()
 
    if (!logoutTime && now - loginDate > 24 * 60 * 60 * 1000) {
      return "Session expired"
    }
    if (!logoutTime) return "Still logged in"
 
    const logoutDate = new Date(logoutTime)
    const diffInSeconds = Math.floor((logoutDate - loginDate) / 1000)
    const hrs = Math.floor(diffInSeconds / 3600)
    const mins = Math.floor((diffInSeconds % 3600) / 60)
    return `${hrs}h ${mins}m`
  }
 
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }))
  }
 
  const sortedData = useMemo(() => {
    const sourceData = selectedDate ? filteredData : activityLogs
    const sortableItems = [...sourceData]
 
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === "surfing_time") {
          const getDuration = (log) => {
            if (!log.login_time) return Number.NEGATIVE_INFINITY
            const login = new Date(log.login_time)
            const logout = log.logout_time ? new Date(log.logout_time) : new Date()
            return logout - login
          }
          return sortConfig.direction === "asc" ? getDuration(a) - getDuration(b) : getDuration(b) - getDuration(a)
        }
 
        const dateA = new Date(a[sortConfig.key] || 0)
        const dateB = new Date(b[sortConfig.key] || 0)
 
        if (dateA < dateB) return sortConfig.direction === "asc" ? -1 : 1
        if (dateA > dateB) return sortConfig.direction === "asc" ? 1 : -1
        return 0
      })
    }
    return sortableItems
  }, [activityLogs, filteredData, selectedDate, sortConfig])
 
  const handleDateChange = (date) => {
    setSelectedDate(date)
 
    if (!date) {
      setFilteredData(activityLogs)
      return
    }
 
    const filtered = activityLogs.filter((log) => {
      if (!log.login_time) return false
      const logDate = new Date(log.login_time).setHours(0, 0, 0, 0)
      const selected = new Date(date).setHours(0, 0, 0, 0)
      return logDate === selected
    })
 
    setFilteredData(filtered)
  }
 
  const clearDateFilter = () => {
    setSelectedDate(null)
    setFilteredData(activityLogs)
  }
 
  const processDataForGraphs = (logs) => {
    const loginFrequency = {}
    const sessionStatus = { stillLoggedIn: 0, expired: 0, loggedOut: 0 }
 
    logs.forEach((log) => {
      const dateKey = new Date(log.login_time).toISOString().split("T")[0]
      loginFrequency[dateKey] = (loginFrequency[dateKey] || 0) + 1
 
      const surfingTime = calculateSurfingTime(log.login_time, log.logout_time)
      if (surfingTime === "Still logged in") sessionStatus.stillLoggedIn++
      else if (surfingTime === "Session expired") sessionStatus.expired++
      else sessionStatus.loggedOut++
    })
 
    return { loginFrequency, sessionStatus }
  }
 
  const renderGraphs = (processedData) => {
    if (loginFrequencyChartRef.current) loginFrequencyChartRef.current.destroy()
    if (sessionStatusChartRef.current) sessionStatusChartRef.current.destroy()
 
    const loginCtx = document.getElementById("loginFrequencyChart").getContext("2d")
    const sessionCtx = document.getElementById("sessionStatusChart").getContext("2d")
 
    loginFrequencyChartRef.current = new Chart(loginCtx, {
      type: "bar",
      data: {
        labels: Object.keys(processedData.loginFrequency),
        datasets: [
          {
            label: "Logins Per Day",
            data: Object.values(processedData.loginFrequency),
            backgroundColor: "#4CAF50",
            borderColor: "#45a049",
            borderWidth: 1,
            borderRadius: 6,
            hoverBackgroundColor: "#66BB6A",
          },
        ],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: "Daily Login Activity",
            font: {
              size: 16,
              weight: "bold",
            },
            padding: {
              top: 10,
              bottom: 20,
            },
          },
          legend: { display: false },
        },
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 2000,
          easing: "easeOutQuart",
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
      },
    })
 
    sessionStatusChartRef.current = new Chart(sessionCtx, {
      type: "pie",
      data: {
        labels: ["Still Logged In", "Session Expired", "Logged Out"],
        datasets: [
          {
            data: [
              processedData.sessionStatus.stillLoggedIn,
              processedData.sessionStatus.expired,
              processedData.sessionStatus.loggedOut,
            ],
            backgroundColor: ["#2196F3", "#FFC107", "#F44336"],
            borderColor: "#ffffff",
            borderWidth: 2,
          },
        ],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: "Session Breakdown",
            font: {
              size: 16,
              weight: "bold",
            },
            padding: {
              top: 10,
              bottom: 20,
            },
          },
          legend: {
            position: "bottom",
            labels: {
              padding: 20,
              usePointStyle: true,
              pointStyle: "circle",
            },
          },
        },
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 2000,
          easing: "easeOutQuart",
        },
      },
    })
  }
 
  useEffect(() => {
    const dataToProcess = selectedDate ? filteredData : activityLogs
    if (dataToProcess.length > 0) {
      const processedData = processDataForGraphs(dataToProcess)
      renderGraphs(processedData)
    }
  }, [filteredData, activityLogs, selectedDate, processDataForGraphs, renderGraphs])
 
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }
 
  const handleLogout = async () => {
    try {
      const storedUserId = localStorage.getItem("user_id")
 
      if (storedUserId) {
        await axios.post(`${API_BASE_URL}/auth/api/logout`, { user_id: storedUserId })
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
 
            <a
              href="#"
              onClick={() => navigate(`/activity-logs?user_id=${userId}`)}
              className="datavita-nav-link active"
            >
              Logs
            </a>
 
            <a href="/file-management" className="datavita-nav-link">
              Script settings
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
 
      <div className="activity-logs-container">
        <div className="datavita-container">
          <div className={`activity-logs-header ${animateHeader ? "slide-in-active" : ""}`}>
            <h2 className="activity-title">Activity Logs</h2>
            <p className="activity-subtitle">Viewing activity history for {userName}</p>
          </div>
 
          <div className="activity-actions" ref={filterRef}>
            <button onClick={() => navigate(-1)} className="back-button">
              <IoArrowBackOutline className="back-icon" /> Back to Dashboard
            </button>
 
            <div className="filter-container">
              <div className="date-picker-wrapper">
                <DatePicker
                  selected={selectedDate}
                  onChange={handleDateChange}
                  locale="en-GB"
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Filter by date"
                  className="date-picker-input"
                  popperPlacement="auto"
                  popperClassName="datepicker-popper"
                  popperModifiers={[
                    {
                      name: "offset",
                      options: {
                        offset: [0, 10],
                      },
                    },
                    {
                      name: "preventOverflow",
                      options: {
                        rootBoundary: "viewport",
                        tether: false,
                        altAxis: true,
                      },
                    },
                    {
                      name: "flip",
                      options: {
                        fallbackPlacements: ["top", "bottom"],
                      },
                    },
                  ]}
                  wrapperClassName="date-picker-custom-wrapper"
                />
                <IoCalendarOutline className="calendar-icon" />
              </div>
 
              {selectedDate && (
                <button onClick={clearDateFilter} className="clear-filter-button">
                  Clear Filter
                </button>
              )}
 
              <button onClick={() => fetchUserActivity(userId)} className="refresh-button">
                <FaSync className="refresh-icon" /> Refresh
              </button>
            </div>
          </div>
 
          <div className="table-container" ref={tableRef}>
            <table className="activity-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("login_time")}>
                    <div className="th-content">
                      Login Timestamp
                      {sortConfig.key === "login_time" && (
                        <span className="sort-indicator">{sortConfig.direction === "asc" ? " ▲" : " ▼"}</span>
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort("logout_time")}>
                    <div className="th-content">
                      Logout Timestamp
                      {sortConfig.key === "logout_time" && (
                        <span className="sort-indicator">{sortConfig.direction === "asc" ? " ▲" : " ▼"}</span>
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort("surfing_time")}>
                    <div className="th-content">
                      Total Duration
                      {sortConfig.key === "surfing_time" && (
                        <span className="sort-indicator">{sortConfig.direction === "asc" ? " ▲" : " ▼"}</span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.length > 0 ? (
                  sortedData.map((log, index) => (
                    <tr key={index} className="table-row">
                      <td>{formatDateTime(log.login_time)}</td>
                      <td>{formatDateTime(log.logout_time)}</td>
                      <td>
                        <span
                          className={`session-duration ${
                            calculateSurfingTime(log.login_time, log.logout_time) === "Still logged in"
                              ? "active"
                              : calculateSurfingTime(log.login_time, log.logout_time) === "Session expired"
                                ? "expired"
                                : ""
                          }`}
                        >
                          {calculateSurfingTime(log.login_time, log.logout_time)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="no-data">
                      No activity logs available for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
 
          <div className="charts-container" ref={chartsRef}>
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">
                  <FaChartBar className="chart-icon" /> Login Frequency
                </h3>
              </div>
              <div className="chart-body">
                <canvas id="loginFrequencyChart"></canvas>
              </div>
            </div>
 
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">
                  <FaChartPie className="chart-icon" /> Session Status
                </h3>
              </div>
              <div className="chart-body">
                <canvas id="sessionStatusChart"></canvas>
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
        /* Global Styles */
        .datavita-landing-page {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          color: #333;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #f9fafb;
        }
       
        .datavita-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }
       
        /* Header Styles */
        .datavita-header {
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
          transition: all 0.3s ease;
        }
       
        .datavita-header-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 10px;
        }
       
        .datavita-logo {
          display: flex;
          align-items: center;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1d3557;
        }
       
        .datavita-logo-text {
          margin-right: 5px;
        }
       
        .datavita-logo-dot {
          width: 8px;
          height: 8px;
          background-color: #1d3557;
          border-radius: 50%;
        }
       
        .datavita-nav-links {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
       
        .datavita-user-welcome {
          margin-right: 1rem;
          font-size: 0.9rem;
          color: #666;
        }
       
        .datavita-username-highlight {
          font-weight: 600;
          color: #1d3557;
        }
       
        .datavita-nav-link {
          color: #4b5563;
          text-decoration: none;
          font-size: 0.95rem;
          font-weight: 500;
          transition: color 0.2s;
          position: relative;
        }
       
        .datavita-nav-link:hover {
          color: #1d3557;
        }
       
        .datavita-nav-link.active {
          color: #1d3557;
          font-weight: 600;
        }
       
        .datavita-nav-link.active::after {
          content: '';
          position: absolute;
          bottom: -5px;
          left: 0;
          width: 100%;
          height: 2px;
          background-color: #1d3557;
          border-radius: 1px;
        }
       
        .datavita-auth-buttons {
          display: flex;
          align-items: center;
        }
       
        .datavita-btn {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }
       
        .datavita-btn-logout {
          background-color: #1d3557;
          color: white;
        }
       
        .datavita-btn-logout:hover {
          background-color: #152a45;
          transform: translateY(-2px);
        }
       
        .datavita-mobile-menu-btn {
          display: none;
          flex-direction: column;
          justify-content: space-between;
          width: 30px;
          height: 20px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          z-index: 10;
        }
       
        .datavita-mobile-menu-btn span {
          width: 100%;
          height: 2px;
          background-color: #1d3557;
          transition: all 0.3s ease;
        }
       
        /* Activity Logs Specific Styles */
        .activity-logs-container {
          flex: 1;
          padding: 2rem 0;
        }
       
        .activity-logs-header {
          margin-bottom: 2rem;
          opacity: 0;
          transform: translateY(-20px);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }
       
        .slide-in-active {
          opacity: 1;
          transform: translateY(0);
        }
       
        .activity-title {
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
       
        .activity-title::after {
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
       
        .activity-subtitle {
          font-size: 1.1rem;
          color: #666;
          margin-bottom: 1rem;
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
       
        /* Ensure the activity-actions has a higher z-index than the table */
        .activity-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          animation: fadeInUp 0.8s ease forwards;
          animation-delay: 0.3s;
          opacity: 0;
          position: relative;
          z-index: 999;
        }
       
        .back-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: linear-gradient(135deg, #1d3557, #457b9d);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 6px rgba(29, 53, 87, 0.1);
        }
       
        .back-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 8px rgba(29, 53, 87, 0.15);
        }
       
        .back-icon {
          font-size: 16px;
        }
       
        .filter-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }
       
        /* Date picker styles */
        .date-picker-wrapper {
          position: relative;
          z-index: 999; /* Much higher z-index to ensure calendar appears above everything */
        }
       
        .date-picker-input {
          padding: 10px 36px 10px 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.3s;
          background-color: white;
          width: 150px;
        }
       
        /* Add these styles to ensure the datepicker appears above everything */
        .datepicker-popper {
          z-index: 9999 !important;
        }
 
        .date-picker-custom-wrapper {
          position: relative;
          z-index: 999;
        }
       
        /* Override any react-datepicker inline styles that might be causing issues */
        .react-datepicker-wrapper,
        .react-datepicker__input-container {
          display: block;
          width: 100%;
        }
       
        /* Ensure the table doesn't create a new stacking context that's higher than our datepicker */
        .table-container {
          z-index: 1;
        }
       
        .calendar-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #1d3557;
          font-size: 16px;
          pointer-events: none;
        }
       
        .clear-filter-button {
          padding: 10px 16px;
          background-color: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s;
        }
       
        .clear-filter-button:hover {
          background-color: #dc2626;
          transform: translateY(-2px);
        }
       
        .refresh-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background-color: #1d3557;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
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
       
        /* Table Styles */
        .table-container {
          overflow-x: auto;
          margin-bottom: 2rem;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          animation: fadeInUp 0.8s ease forwards;
          animation-delay: 0.5s;
          opacity: 0;
          background-color: white;
          max-height: 300px;
          overflow-y: auto;
          max-width: 900px;
          margin-left: auto;
          margin-right: auto;
          position: relative;
        }
       
        .activity-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
       
        .activity-table th {
          padding: 16px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
          background-color: #1d3557;
          color: white;
          position: sticky;
          top: 0;
          cursor: pointer;
          transition: background-color 0.2s;
          user-select: none;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          z-index: 10;
        }
       
        .activity-table th:hover {
          background-color: #152a45;
        }
       
        .activity-table th:first-child {
          border-top-left-radius: 12px;
        }
       
        .activity-table th:last-child {
          border-top-right-radius: 12px;
        }
       
        .sort-indicator {
          margin-left: 5px;
          display: inline-block;
          font-size: 12px;
        }
 
        .th-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
       
        .activity-table td {
          padding: 14px 16px;
          font-size: 14px;
          color: #333;
          border-bottom: 1px solid #eee;
        }
       
        .table-row {
          transition: background-color 0.3s;
          animation: fadeIn 0.5s ease-in-out;
        }
       
        .table-row:nth-child(odd) {
          background-color: #f9fafb;
          animation-delay: 0.1s;
        }
       
        .table-row:nth-child(even) {
          animation-delay: 0.2s;
        }
       
        .table-row:hover {
          background-color: #f0f4f8;
        }
       
        .table-row:last-child td {
          border-bottom: none;
        }
       
        .session-duration {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
        }
       
        .session-duration.active {
          background-color: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
       
        .session-duration.expired {
          background-color: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
       
        .no-data {
          text-align: center;
          padding: 2rem !important;
          color: #6b7280;
          font-style: italic;
        }
       
        /* Charts Styles */
        .charts-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
          animation: fadeInUp 0.8s ease forwards;
          animation-delay: 0.7s;
          opacity: 0;
        }
       
        .chart-card {
          background-color: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
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
          color: #1d3557;
        }
       
        .chart-icon {
          color: #1d3557;
        }
       
        .chart-body {
          padding: 16px;
          height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
       
        /* Footer Styles */
        .datavita-footer {
          background-color: #1d3557;
          color: white;
          padding: 3rem 0 1rem;
          position: relative;
          overflow: hidden;
        }
       
        .datavita-footer-top {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }
       
        .datavita-footer-brand p {
          margin-top: 1rem;
          opacity: 0.8;
          max-width: 300px;
        }
       
        .datavita-footer-links {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }
       
        .datavita-footer-links-column h4 {
          font-size: 1.1rem;
          margin-bottom: 1rem;
          font-weight: 600;
        }
       
        .datavita-footer-links-column a {
          display: block;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 0.5rem;
          text-decoration: none;
          transition: color 0.2s;
        }
       
        .datavita-footer-links-column a:hover {
          color: white;
        }
       
        .datavita-footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
       
        .datavita-footer-bottom p {
          opacity: 0.7;
          font-size: 0.9rem;
        }
       
        .datavita-social-links {
          display: flex;
          gap: 1rem;
        }
       
        .datavita-social-link {
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          transition: color 0.2s;
        }
       
        .datavita-social-link:hover {
          color: white;
        }
       
        .datavita-watermark {
          position: absolute;
          bottom: -30px;
          right: 0;
          font-size: 8rem;
          font-weight: 800;
          opacity: 0.03;
          user-select: none;
          pointer-events: none;
        }
       
        /* Loading and Error States */
        .datavita-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background-color: #f9fafb;
        }
       
        .datavita-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(29, 53, 87, 0.1);
          border-radius: 50%;
          border-top-color: #1d3557;
          animation: spin 1s ease-in-out infinite;
          margin-bottom: 1rem;
        }
       
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
       
        .datavita-error {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background-color: #f9fafb;
          color: #ef4444;
          font-size: 1.2rem;
          padding: 2rem;
          text-align: center;
        }
       
        /* Animations */
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
       
        /* Page exit animation */
        .page-exit {
          opacity: 0;
          transition: opacity 0.5s ease;
        }
       
        /* Responsive Styles */
        @media (max-width: 768px) {
          .datavita-nav-links {
            display: none;
            position: fixed;
            top: 70px;
            left: 0;
            width: 100%;
            background-color: white;
            flex-direction: column;
            padding: 1rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 100;
          }
         
          .datavita-nav-links.datavita-mobile-open {
            display: flex;
          }
         
          .datavita-mobile-menu-btn {
            display: flex;
          }
         
          .datavita-mobile-menu-btn.datavita-active span:nth-child(1) {
            transform: translateY(9px) rotate(45deg);
          }
         
          .datavita-mobile-menu-btn.datavita-active span:nth-child(2) {
            opacity: 0;
          }
         
          .datavita-mobile-menu-btn.datavita-active span:nth-child(3) {
            transform: translateY(-9px) rotate(-45deg);
          }
         
          .activity-actions {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
         
          .filter-container {
            width: 100%;
            justify-content: space-between;
          }
         
          .charts-container {
            grid-template-columns: 1fr;
          }
         
          .datavita-footer-top {
            grid-template-columns: 1fr;
          }
         
          .datavita-footer-links {
            grid-template-columns: 1fr 1fr;
          }
         
          .datavita-footer-bottom {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
        }
       
        @media (max-width: 480px) {
          .datavita-footer-links {
            grid-template-columns: 1fr;
          }
         
          .activity-title {
            font-size: 2rem;
          }
         
          .date-picker-input {
            width: 120px;
          }
        }
      `}</style>
    </div>
  )
}
 
export default ActivityLogs
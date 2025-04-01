"use client"

import { useEffect, useRef, useState } from "react"
import "../styles/Home.css"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js"
import { Bar, Pie } from "react-chartjs-2"

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement)

const Home = () => {
  const navigate = useNavigate()
  const headerRef = useRef(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [userName, setUserName] = useState("")
  const [activityData, setActivityData] = useState(null)
  const [showDashboard, setShowDashboard] = useState(false)

  // Setup scroll animations with Intersection Observer
  useEffect(() => {
    // Observer for fade-in animations
    const fadeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("datavita-fade-in-visible")
            // Once the animation has played, we can stop observing
            if (entry.target.classList.contains("datavita-once")) {
              fadeObserver.unobserve(entry.target)
            }
          }
        })
      },
      { threshold: 0.1, rootMargin: "0px 0px -100px 0px" },
    )

    // Observer for slide animations
    const slideObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("datavita-slide-in-visible")
            // Once the animation has played, we can stop observing
            if (entry.target.classList.contains("datavita-once")) {
              slideObserver.unobserve(entry.target)
            }
          }
        })
      },
      { threshold: 0.1, rootMargin: "0px 0px -100px 0px" },
    )

    // Observer for staggered animations (like feature cards)
    const staggerObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Add a small delay to each child for staggered effect
            const children = entry.target.querySelectorAll(".datavita-stagger-item")
            children.forEach((child, index) => {
              setTimeout(() => {
                child.classList.add("datavita-stagger-visible")
              }, index * 100) // 100ms delay between each item
            })
            staggerObserver.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.2 },
    )

    // Apply observers to elements
    document.querySelectorAll(".datavita-fade-in").forEach((el) => fadeObserver.observe(el))
    document.querySelectorAll(".datavita-slide-in").forEach((el) => slideObserver.observe(el))
    document.querySelectorAll(".datavita-stagger-container").forEach((el) => staggerObserver.observe(el))

    // Header scroll effect
    const handleScroll = () => {
      if (window.scrollY > 50) {
        headerRef.current.classList.add("datavita-header-scrolled")
      } else {
        headerRef.current.classList.remove("datavita-header-scrolled")
      }
    }

    window.addEventListener("scroll", handleScroll)

    // Cleanup
    return () => {
      fadeObserver.disconnect()
      slideObserver.disconnect()
      staggerObserver.disconnect()
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  // Add smooth scroll behavior to the document
  useEffect(() => {
    // Enable smooth scrolling
    document.documentElement.style.scrollBehavior = "smooth"

    // Add scroll trigger for animations
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      const scrollIndicator = document.querySelector(".datavita-scroll-indicator")

      if (scrollPosition > 100) {
        scrollIndicator?.classList.add("datavita-hidden")
      } else {
        scrollIndicator?.classList.remove("datavita-hidden")
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Handle mobile menu toggle
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  // Check authentication and fetch user data
  useEffect(() => {
    const userId = localStorage.getItem("user_id")
    const userRole = localStorage.getItem("role")

    if (userId && userRole) {
      setIsAuthenticated(true)
      setUserRole(userRole)
      fetchUserDetails(userId)
    }
  }, [])

  // Fetch user details
  const fetchUserDetails = async (userId) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
      const response = await axios.get(`${API_BASE_URL}/auth/api/get-user-id`, {
        params: { user_id: userId },
      })
      if (response.data && response.data.full_name) {
        setUserName(response.data.full_name)
        localStorage.setItem("full_name", response.data.full_name)
      }
    } catch (error) {
      console.error("Failed to fetch user details:", error)
    }
  }

  // Fetch user activity for charts
  const fetchUserActivity = async (userId) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
      const response = await axios.get(`${API_BASE_URL}/auth/api/user-activity`, {
        params: { user_id: userId },
      })

      if (response.data && Array.isArray(response.data)) {
        const activityStats = processActivityData(response.data)
        setActivityData(activityStats)
      }
    } catch (error) {
      console.error("Failed to fetch activity data:", error)
    }
  }

  // Process activity data for charts
  const processActivityData = (logs) => {
    // Example processing - in a real app, you'd do more sophisticated analysis
    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const dayCounts = Array(7).fill(0)

    // Count logins by day of week
    logs.forEach((log) => {
      if (log.login_time) {
        const date = new Date(log.login_time)
        const dayIndex = date.getDay()
        dayCounts[dayIndex === 0 ? 6 : dayIndex - 1]++ // Adjust for Sunday
      }
    })

    // Calculate average session time
    const sessionTimes = logs
      .map((log) => {
        if (log.login_time && log.logout_time) {
          const loginDate = new Date(log.login_time)
          const logoutDate = new Date(log.logout_time)
          return (logoutDate - loginDate) / (1000 * 60) // in minutes
        }
        return 0
      })
      .filter((time) => time > 0)

    const avgSessionTime =
      sessionTimes.length > 0 ? sessionTimes.reduce((sum, time) => sum + time, 0) / sessionTimes.length : 0

    // Create data for charts
    return {
      loginsByDay: {
        labels: dayLabels,
        datasets: [
          {
            label: "Logins by Day",
            data: dayCounts,
            backgroundColor: "rgba(53, 162, 235, 0.5)",
            borderColor: "rgba(53, 162, 235, 1)",
            borderWidth: 1,
          },
        ],
      },
      sessionDistribution: {
        labels: ["< 5 min", "5-15 min", "15-30 min", "30-60 min", "> 60 min"],
        datasets: [
          {
            label: "Session Duration",
            data: [
              sessionTimes.filter((t) => t < 5).length,
              sessionTimes.filter((t) => t >= 5 && t < 15).length,
              sessionTimes.filter((t) => t >= 15 && t < 30).length,
              sessionTimes.filter((t) => t >= 30 && t < 60).length,
              sessionTimes.filter((t) => t >= 60).length,
            ],
            backgroundColor: [
              "rgba(255, 99, 132, 0.6)",
              "rgba(54, 162, 235, 0.6)",
              "rgba(255, 206, 86, 0.6)",
              "rgba(75, 192, 192, 0.6)",
              "rgba(153, 102, 255, 0.6)",
            ],
            borderColor: [
              "rgba(255, 99, 132, 1)",
              "rgba(54, 162, 235, 1)",
              "rgba(255, 206, 86, 1)",
              "rgba(75, 192, 192, 1)",
              "rgba(153, 102, 255, 1)",
            ],
            borderWidth: 1,
          },
        ],
      },
      totalSessions: logs.length,
      avgSessionTime: Math.round(avgSessionTime),
    }
  }

  const handleLogout = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
      const userId = localStorage.getItem("user_id")
      if (userId) {
        await axios.post(`${API_BASE_URL}/auth/api/logout`, { user_id: userId })
      }
      localStorage.removeItem("user_id")
      localStorage.removeItem("role")
      localStorage.removeItem("full_name")
      setIsAuthenticated(false)
      setUserRole(null)
      setUserName("")
      setActivityData(null)
      setShowDashboard(false)
      navigate("/login")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  // View activity logs
  const viewActivityLogs = () => {
    const userId = localStorage.getItem("user_id")
    if (userId) {
      navigate(`/activity-logs?user_id=${userId}`)
    }
  }

  // Toggle dashboard view
  const toggleDashboard = () => {
    if (!showDashboard) {
      const userId = localStorage.getItem("user_id")
      if (userId) {
        fetchUserActivity(userId)
      }
    }
    setShowDashboard(!showDashboard)
  }

  // Handle navigation to protected routes
  const handleProtectedNavigation = (route) => {
    if (isAuthenticated) {
      navigate(route)
    } else {
      navigate("/register")
    }
  }

  return (
    <div className="datavita-landing-page">
      {/* Header */}
      <header className="datavita-header" ref={headerRef}>
        <div className="datavita-container datavita-header-container">
          <div className="datavita-logo">
            <span className="datavita-logo-text">DataVita</span>
            <span className="datavita-logo-dot"></span>
          </div>
          <nav className={`datavita-nav-links ${mobileMenuOpen ? "datavita-mobile-open" : ""}`}>
            {isAuthenticated && (
              <div className="datavita-user-welcome">
                Welcome <span className="datavita-username-highlight">{userName}</span>
              </div>
            )}

            {!isAuthenticated && (
              <>
                <a href="#features" className="datavita-nav-link">
                  Features
                </a>
                <a href="#dashboard-section" className="datavita-nav-link">
                  Dashboards
                </a>
                <a href="#playground-section" className="datavita-nav-link">
                  Playground
                </a>
                <a href="#testimonials" className="datavita-nav-link">
                  Blogs
                </a>
                <a href="#pricing" className="datavita-nav-link">
                  Pricing
                </a>
              </>
            )}

            {isAuthenticated && (
              <>
                <a href="/Compiler" className="datavita-nav-link">
                  Workplace
                </a>
                <a 
                  href="#" 
                  onClick={() => handleProtectedNavigation("/dashboard")} 
                  className="datavita-nav-link"
                >
                  Dashboard
                </a>
                <a 
                  href="#" 
                  onClick={() => handleProtectedNavigation("/playground")} 
                  className="datavita-nav-link"
                >
                  Playground
                </a>
                <a href="/scripts-log" className="datavita-nav-link">
                  Scripts
                </a>
              </>
            )}

            {isAuthenticated && (userRole === "admin" || userRole === "developer") && (
              <a href="#" onClick={viewActivityLogs} className="datavita-nav-link">
                Logs
              </a>
            )}

            {isAuthenticated && userRole === "admin" && (
              <a
                href={`/admin-dashboard?user_id=${localStorage.getItem("user_id")}&role=admin`}
                className="datavita-nav-link"
              >
                Admin Panel
              </a>
            )}

            {isAuthenticated && userRole === "developer" && (
              <a href="/developer-tools" className="datavita-nav-link">
                Developer Tools
              </a>
            )}

            <a href="#footer" className="datavita-nav-link">
              About Us
            </a>
          </nav>
          <div className="datavita-auth-buttons">
            {isAuthenticated ? (
              <div className="datavita-user-profile">
                <span className="datavita-user-name">{userName}</span>
                <button onClick={handleLogout} className="datavita-btn datavita-btn-logout">
                  Logout
                </button>
              </div>
            ) : (
              <>
                <a href="/login" className="datavita-btn datavita-btn-outline">
                  Login
                </a>
                <a href="/register" className="datavita-btn datavita-btn-primary">
                  Register
                </a>
              </>
            )}
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

      {/* User Dashboard (shown when logged in and dashboard is toggled) */}
      {isAuthenticated && showDashboard && (
        <div className="datavita-user-dashboard">
          <div className="datavita-container">
            <div className="datavita-dashboard-header">
              <h2>Welcome, {userName}!</h2>
              <p>Here's an overview of your activity</p>
            </div>

            {activityData ? (
              <div className="datavita-dashboard-stats">
                <div className="datavita-stats-summary">
                  <div className="datavita-stat-card">
                    <h3>Total Sessions</h3>
                    <p className="datavita-stat-value">{activityData.totalSessions}</p>
                  </div>
                  <div className="datavita-stat-card">
                    <h3>Avg. Session Time</h3>
                    <p className="datavita-stat-value">{activityData.avgSessionTime} min</p>
                  </div>
                </div>

                <div className="datavita-charts-container">
                  <div className="datavita-chart-card">
                    <h3>Login Activity by Day</h3>
                    <div className="datavita-chart">
                      <Bar
                        data={activityData.loginsByDay}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: { position: "top" },
                            title: { display: false },
                          },
                        }}
                      />
                    </div>
                  </div>

                  <div className="datavita-chart-card">
                    <h3>Session Duration Distribution</h3>
                    <div className="datavita-chart">
                      <Pie
                        data={activityData.sessionDistribution}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: { position: "right" },
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowDashboard(false)} className="datavita-btn datavita-btn-primary">
                  Back to Home
                </button>
              </div>
            ) : (
              <div className="datavita-dashboard-loading">
                <p>Loading your activity data...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content (Hero, Features, etc.) */}
      {!showDashboard && (
        <>
          {/* Hero Section */}
          <section id="hero" className="datavita-hero">
            <div className="datavita-container">
              <div className="datavita-hero-content">
                <h1 className="datavita-slide-in datavita-once datavita-from-bottom">
                  Unlock the Power of Your Data with
                  <span className="datavita-highlight"> Advanced Analytics</span>
                </h1>
                <p className="datavita-slide-in datavita-once datavita-from-bottom datavita-delay-200">
                  Interactive notebooks supporting SQL, PySpark, and Python. Manage data objects and files effortlessly.
                </p>
                
                <div className="datavita-cta-buttons datavita-slide-in datavita-once datavita-from-bottom datavita-delay-400">
                <button 
                      onClick={() => handleProtectedNavigation("/compiler")} 
                      className="datavita-btn datavita-btn-primary"
                    >
                      Explore Workplace
                    </button>
                  {!isAuthenticated && (
                    <a href="/register" className="datavita-btn datavita-btn-primary datavita-btn-lg">
                      Start for Free
                    </a>
                  )}
                </div>
              </div>
              <div className="datavita-hero-image datavita-fade-in datavita-once datavita-delay-600">
                <div className="datavita-blob-shape"></div>
                <div className="datavita-floating-card datavita-card-1">
                  <div className="datavita-card-content">
                    <div className="datavita-card-icon">📊</div>
                    <div className="datavita-card-text">Data Analysis</div>
                  </div>
                </div>
                <div className="datavita-floating-card datavita-card-2">
                  <div className="datavita-card-content">
                    <div className="datavita-card-icon">🔍</div>
                    <div className="datavita-card-text">Insights</div>
                  </div>
                </div>
                <div className="datavita-floating-card datavita-card-3">
                  <div className="datavita-card-content">
                    <div className="datavita-card-icon">📈</div>
                    <div className="datavita-card-text">Results</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="datavita-scroll-indicator">
            <div className="datavita-scroll-icon">
              <span></span>
            </div>
            <p>Scroll Down</p>
          </div>

          {/* Features Section */}
          {!isAuthenticated && (
            <section id="features" className="datavita-features">
              <div className="datavita-container">
                <h2 className="datavita-section-title datavita-fade-in datavita-once">Powerful Features</h2>
                <p className="datavita-section-subtitle datavita-fade-in datavita-once datavita-delay-200">
                  Everything you need for data analysis in one place
                </p>

                <div className="datavita-feature-grid datavita-stagger-container">
                  <div className="datavita-feature-card datavita-stagger-item">
                    <div className="datavita-feature-icon">
                      <i className="datavita-icon-notebook"></i>
                    </div>
                    <h3>Interactive Notebooks</h3>
                    <p>Unified environment for SQL, PySpark, and Python.</p>
                    <div className="datavita-feature-hover-content"></div>
                  </div>
                  <div className="datavita-feature-card datavita-stagger-item">
                    <div className="datavita-feature-icon">
                      <i className="datavita-icon-explorer"></i>
                    </div>
                    <h3>Object Explorer</h3>
                    <p>Navigate and manage data objects and schemas.</p>
                    <div className="datavita-feature-hover-content"></div>
                  </div>
                  <div className="datavita-feature-card datavita-stagger-item">
                    <div className="datavita-feature-icon">
                      <i className="datavita-icon-files"></i>
                    </div>
                    <h3>File Explorer</h3>
                    <p>Manage notebooks, scripts, and data files.</p>
                    <div className="datavita-feature-hover-content"></div>
                  </div>
                  <div className="datavita-feature-card datavita-stagger-item">
                    <div className="datavita-feature-icon">
                      <i className="datavita-icon-package"></i>
                    </div>
                    <h3>Package Management</h3>
                    <p>Install and use external pip packages seamlessly.</p>
                    <div className="datavita-feature-hover-content"></div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Dashboard Section */}
          <section id="dashboard-section" className="datavita-dashboard-section">
            <div className="datavita-container">
              <h2 className="datavita-section-title datavita-fade-in datavita-once">Powerful Dashboards</h2>
              <p className="datavita-section-subtitle datavita-fade-in datavita-once datavita-delay-200">
                Visualize your data with customizable dashboards for deeper insights
              </p>

              <div className="datavita-dashboard-showcase">
                <div className="datavita-dashboard-image datavita-fade-in datavita-once">
                  <div className="datavita-dashboard-floating">
                    <div className="datavita-dashboard-screen">
                      <div className="datavita-dashboard-header-bar"></div>
                      <div className="datavita-dashboard-content">
                        <div className="datavita-dashboard-widget"></div>
                        <div className="datavita-dashboard-widget"></div>
                        <div className="datavita-dashboard-widget-large"></div>
                        <div className="datavita-dashboard-widget"></div>
                        <div className="datavita-dashboard-widget"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="datavita-dashboard-info datavita-slide-in datavita-once datavita-from-right">
                  <h3>Custom Analytics Dashboard</h3>
                  <p>
                    Our powerful dashboard solution provides a comprehensive view of your data, enabling you to make informed decisions quickly. With our intuitive interface, you can:
                  </p>
                  <ul className="datavita-dashboard-features">
                    <li>Create custom visualizations tailored to your specific needs</li>
                    <li>Monitor key performance indicators in real-time</li>
                    <li>Share insights with your team through collaborative dashboards</li>
                    <li>Export reports in multiple formats for presentations</li>
                  </ul>
                  <div className="datavita-dashboard-cta">
                    <button 
                      onClick={() => handleProtectedNavigation("/dashboard")} 
                      className="datavita-btn datavita-btn-primary"
                    >
                      Explore Dashboards
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Playground Section */}
          <section id="playground-section" className="datavita-playground-section">
            <div className="datavita-container">
              <h2 className="datavita-section-title datavita-fade-in datavita-once">Interactive Playground</h2>
              <p className="datavita-section-subtitle datavita-fade-in datavita-once datavita-delay-200">
                Experiment with data and algorithms in a safe, interactive environment
              </p>

              <div className="datavita-playground-showcase">
                <div className="datavita-playground-info datavita-slide-in datavita-once datavita-from-left">
                  <h3>Experiment Without Limits</h3>
                  <p>
                    Our playground environment gives you the freedom to experiment with your data using various tools and techniques without affecting your production environment.
                  </p>
                  <ul className="datavita-playground-features">
                    <li>Test data transformations with instant visual feedback</li>
                    <li>Experiment with machine learning algorithms on sample datasets</li>
                    <li>Collaborate with team members on experimental analyses</li>
                    <li>Save and version your experiments for future reference</li>
                  </ul>
                  <div className="datavita-playground-cta">
                    <button 
                      onClick={() => handleProtectedNavigation("/playground")} 
                      className="datavita-btn datavita-btn-primary"
                    >
                      Try Playground
                    </button>
                  </div>
                </div>
                <div className="datavita-playground-image datavita-fade-in datavita-once">
                  <div className="datavita-playground-floating">
                    <div className="datavita-code-editor">
                      <div className="datavita-editor-header">
                        <div className="datavita-editor-tabs">
                          <div className="datavita-editor-tab datavita-active">app.jsx</div>
                          <div className="datavita-editor-tab">app.css</div>
                        </div>
                      </div>
                      <div className="datavita-editor-content">
                        <div className="datavita-code-line"><span className="datavita-line-number">1</span><span className="datavita-code-keyword">import</span> pandas <span className="datavita-code-keyword">as</span> pd</div>
                        <div className="datavita-code-line"><span className="datavita-line-number">2</span><span className="datavita-code-keyword">import</span> matplotlib.pyplot <span className="datavita-code-keyword">as</span> plt</div>
                        <div className="datavita-code-line"><span className="datavita-line-number">3</span></div>
                        <div className="datavita-code-line"><span className="datavita-line-number">4</span><span className="datavita-code-comment"># Load the dataset</span></div>
                        <div className="datavita-code-line"><span className="datavita-line-number">5</span>df = pd.read_csv(<span className="datavita-code-string">'data.csv'</span>)</div>
                        <div className="datavita-code-line"><span className="datavita-line-number">6</span></div>
                        <div className="datavita-code-line"><span className="datavita-line-number">7</span><span className="datavita-code-comment"># Analyze the data</span></div>
                        <div className="datavita-code-line"><span className="datavita-line-number">8</span>print(df.describe())</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Testimonials Section */}
          {!isAuthenticated && (
            <section id="testimonials" className="datavita-testimonials">
              <div className="datavita-container">
                <h2 className="datavita-section-title datavita-fade-in datavita-once">What Our Users Say</h2>

                <div className="datavita-testimonial-slider datavita-fade-in datavita-once datavita-delay-200">
                  <div className="datavita-testimonial-card">
                    <div className="datavita-quote-mark">"</div>
                    <p className="datavita-testimonial-text">
                      DataVita transformed our data analytics workflow. The platform is intuitive and has significantly
                      improved our team's productivity.
                    </p>
                    <div className="datavita-testimonial-author">
                      <div className="datavita-author-avatar"></div>
                      <div className="datavita-author-info">
                        <p className="datavita-author-name">Jane Doe</p>
                        <p className="datavita-author-title">Data Scientist</p>
                      </div>
                    </div>
                  </div>

                  <div className="datavita-testimonial-card">
                    <div className="datavita-quote-mark">"</div>
                    <p className="datavita-testimonial-text">
                      The notebook interface is intuitive and powerful. We've been able to collaborate more effectively
                      and derive insights faster than ever before.
                    </p>
                    <div className="datavita-testimonial-author">
                      <div className="datavita-author-avatar"></div>
                      <div className="datavita-author-info">
                        <p className="datavita-author-name">John Smith</p>
                        <p className="datavita-author-title">Analyst</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Pricing Section */}
          {!isAuthenticated && (
            <section id="pricing" className="datavita-pricing">
              <div className="datavita-container">
                <h2 className="datavita-section-title datavita-fade-in datavita-once">Pricing Plans</h2>
                <p className="datavita-section-subtitle datavita-fade-in datavita-once datavita-delay-200">
                  Choose the plan that fits your needs
                </p>

                <div className="datavita-pricing-grid datavita-stagger-container">
                  <div className="datavita-pricing-card datavita-stagger-item">
                    <div className="datavita-pricing-header">
                      <h3>Starter</h3>
                      <div className="datavita-price">
                        <span className="datavita-currency">$</span>
                        <span className="datavita-amount">12</span>
                        <span className="datavita-period">/month</span>
                      </div>
                    </div>
                    <ul className="datavita-pricing-features">
                      <li>Basic storage</li>
                      <li>Limited compute resources</li>
                      <li>Community support</li>
                      <li>7-day history</li>
                    </ul>
                    <a href="/register" className="datavita-btn datavita-btn-outline datavita-btn-full">
                      Get Started
                    </a>
                  </div>

                  <div className="datavita-pricing-card datavita-popular datavita-stagger-item">
                    <div className="datavita-popular-badge">Most Popular</div>
                    <div className="datavita-pricing-header">
                      <h3>Professional</h3>
                      <div className="datavita-price">
                        <span className="datavita-currency">$</span>
                        <span className="datavita-amount">29</span>
                        <span className="datavita-period">/month</span>
                      </div>
                    </div>
                    <ul className="datavita-pricing-features">
                      <li>Advanced storage</li>
                      <li>Custom compute clusters</li>
                      <li>Priority support</li>
                      <li>30-day history</li>
                    </ul>
                    <a href="/register" className="datavita-btn datavita-btn-outline datavita-btn-full">
                      Get Started
                    </a>
                  </div>

                  <div className="datavita-pricing-card datavita-stagger-item">
                    <div className="datavita-pricing-header">
                      <h3>Enterprise</h3>
                      <div className="datavita-price">
                        <span className="datavita-currency">$</span>
                        <span className="datavita-amount">99</span>
                        <span className="datavita-period">/month</span>
                      </div>
                    </div>
                    <ul className="datavita-pricing-features">
                      <li>Unlimited storage</li>
                      <li>Dedicated support</li>
                      <li>Custom integrations</li>
                      <li>Unlimited history</li>
                    </ul>
                    <a href="#footer" className="datavita-btn datavita-btn-outline datavita-btn-full">
                      Contact Us
                    </a>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* CTA Section */}
          {!isAuthenticated && (
            <section id="cta" className="datavita-cta datavita-fade-in datavita-once">
              <div className="datavita-container">
                <div className="datavita-cta-content">
                  <h2>Ready to Transform Your Data Analytics?</h2>
                  <p>Join thousands of data professionals who have already improved their workflow.</p>
                  <a href="/register" className="datavita-btn datavita-btn-primary datavita-btn-lg">
                    Your Free Trial Awaits
                  </a>
                </div>
              </div>
            </section>
          )}

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
                    {!isAuthenticated ? (
                      <>
                        <a href="#features">Features</a>
                        <a href="#dashboard-section">Dashboards</a>
                        <a href="#playground-section">Playground</a>
                        <a href="#pricing">Pricing</a>
                        <a href="#testimonials">Testimonials</a>
                      </>
                    ) : (
                      <>
                        <a href="/Compiler">Workplace</a>
                        <a href="#" onClick={() => handleProtectedNavigation("/dashboard")}>Dashboard</a>
                        <a href="#" onClick={() => handleProtectedNavigation("/playground")}>Playground</a>
                      </>
                    )}
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
        </>
      )}
    </div>
  )
}

export default Home

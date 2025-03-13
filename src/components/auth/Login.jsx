 
"use client"
 
import { useState, useEffect, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
 
export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState("")
  const [animateError, setAnimateError] = useState(false)
 
  const cardRef = useRef(null)
  const formRef = useRef(null)
  const circlesRef = useRef([])
 
  const navigate = useNavigate()
 
  // Initialize animations
  useEffect(() => {
    // Animate circles with random movements
    circlesRef.current.forEach((_, index) => {
      const circle = document.querySelector(`.circle-${index + 1}`)
      if (circle) {
        circle.style.animation = `float ${10 + Math.random() * 10}s infinite ease-in-out ${Math.random() * 5}s`
      }
    })
  }, [])
 
  // Card hover effect
  useEffect(() => {
    if (!cardRef.current) return
 
    const card = cardRef.current
 
    const handleMouseMove = (e) => {
      const rect = card.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
 
      const centerX = rect.width / 2
      const centerY = rect.height / 2
 
      const tiltX = (y - centerY) / 20
      const tiltY = (centerX - x) / 20
 
      card.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`
    }
 
    const handleMouseLeave = () => {
      card.style.transform = "rotateX(0deg) rotateY(0deg)"
    }
 
    card.addEventListener("mousemove", handleMouseMove)
    card.addEventListener("mouseleave", handleMouseLeave)
 
    return () => {
      card.removeEventListener("mousemove", handleMouseMove)
      card.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [])
 
  const handleLogin = async (e) => {
    e.preventDefault()
    setFormError("")
    setIsLoading(true)
 
    try {
      if (email === "admin@datavita.com") {
        const response = await fetch("http://localhost:5000/auth/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        })
 
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Server returned ${response.status}: ${errorText}`)
        }
 
        const data = await response.json()
 
        localStorage.setItem("user_id", data.user_id)
        localStorage.setItem("role", "admin")
        localStorage.setItem("full_name", data.full_name || "Admin User")
 
        // Add exit animation class
        if (formRef.current) {
          formRef.current.classList.add("form-exit")
        }
 
        // Wait for animation to complete before navigating
        setTimeout(() => {
          navigate(`/admin-dashboard?user_id=${localStorage.getItem("user_id")}&role=admin`)
        }, 400)
 
        return
      }
 
      const response = await fetch("http://localhost:5000/auth/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })
 
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Server returned ${response.status}: ${errorText}`)
      }
 
      const data = await response.json()
 
      localStorage.setItem("user_id", data.user_id)
      localStorage.setItem("role", data.role)
      localStorage.setItem("full_name", data.full_name || "")
 
      // Add exit animation class
      if (formRef.current) {
        formRef.current.classList.add("form-exit")
      }
 
      // Wait for animation to complete before navigating
      setTimeout(() => {
        if (data.role === "admin") {
          navigate(`/admin-dashboard?user_id=${localStorage.getItem("user_id")}&role=admin`)
        } else {
          navigate("/")
        }
      }, 400)
    } catch (error) {
      console.error("Login failed:", error)
      setFormError(error.message || "Authentication failed. Please check your credentials.")
 
      // Error shake animation
      setAnimateError(true)
      setTimeout(() => setAnimateError(false), 600)
    } finally {
      setIsLoading(false)
    }
  }
 
  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="circles">
          {[...Array(10)].map((_, i) => (
            <div key={i} className={`circle circle-${i + 1}`} ref={(el) => (circlesRef.current[i] = el)}></div>
          ))}
        </div>
      </div>
 
      <div className="logo-container">
        <Link to="/" className="logo">
          <span className="logo-text">DataVita</span>
          <span className="logo-dot"></span>
        </Link>
      </div>
 
      <div className="auth-card-wrapper" ref={cardRef}>
        <div className="auth-card">
          <div className="card-inner">
            <div className="card-face">
              <div className={`form-container login-container ${animateError ? "shake" : ""}`} ref={formRef}>
                <div className="form-header">
                  <h2 className="form-title">Welcome Back</h2>
                  <p className="form-subtitle">Sign in to continue your journey</p>
                </div>
 
                {formError && <div className="form-error">{formError}</div>}
 
                <form onSubmit={handleLogin}>
                  <div className="input-group">
                    <label className="input-label">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="auth-input"
                      placeholder="your@email.com"
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="auth-input"
                      placeholder="••••••••"
                    />
                    <Link to="/forgot-password" className="forgot-password">
                      Forgot Password?
                    </Link>
                  </div>
                  <button type="submit" className={`auth-button ${isLoading ? "loading" : ""}`} disabled={isLoading}>
                    {isLoading ? <span className="loading-spinner"></span> : "Sign In"}
                  </button>
                </form>
                <div className="register-prompt">
                  <p className="toggle-text">
                    Don't have an account?{" "}
                    <Link to="/register" className="toggle-button">
                      Register here
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
 
      <style jsx>{`
        /* Main Container */
        .auth-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
          background: linear-gradient(135deg, #f5f7fa 0%, #e7ecef 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
 
        /* Animated Background */
        .auth-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }
 
        .circles {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
 
        .circle {
          position: absolute;
          border-radius: 50%;
          background: linear-gradient(
            to right,
            rgba(13, 27, 42, 0.1),
            rgba(27, 38, 59, 0.1)
          );
        }
 
        .circle-1 {
          width: 80px;
          height: 80px;
          top: 10%;
          left: 10%;
          background: linear-gradient(to right, rgba(13, 27, 42, 0.1), rgba(27, 38, 59, 0.1));
        }
 
        .circle-2 {
          width: 120px;
          height: 120px;
          top: 20%;
          right: 15%;
          background: linear-gradient(to right, rgba(65, 90, 119, 0.1), rgba(27, 38, 59, 0.05));
        }
 
        .circle-3 {
          width: 150px;
          height: 150px;
          bottom: 15%;
          right: 30%;
          background: linear-gradient(to right, rgba(13, 27, 42, 0.08), rgba(65, 90, 119, 0.08));
        }
 
        .circle-4 {
          width: 60px;
          height: 60px;
          bottom: 30%;
          left: 15%;
          background: linear-gradient(to right, rgba(27, 38, 59, 0.1), rgba(13, 27, 42, 0.1));
        }
 
        .circle-5 {
          width: 100px;
          height: 100px;
          top: 40%;
          left: 30%;
          background: linear-gradient(to right, rgba(65, 90, 119, 0.05), rgba(13, 27, 42, 0.1));
        }
 
        .circle-6 {
          width: 200px;
          height: 200px;
          bottom: 10%;
          left: 5%;
          background: linear-gradient(to right, rgba(13, 27, 42, 0.03), rgba(27, 38, 59, 0.05));
        }
 
        .circle-7 {
          width: 70px;
          height: 70px;
          top: 50%;
          right: 10%;
          background: linear-gradient(to right, rgba(27, 38, 59, 0.08), rgba(65, 90, 119, 0.08));
        }
 
        .circle-8 {
          width: 110px;
          height: 110px;
          top: 10%;
          right: 30%;
          background: linear-gradient(to right, rgba(13, 27, 42, 0.05), rgba(27, 38, 59, 0.1));
        }
 
        .circle-9 {
          width: 90px;
          height: 90px;
          bottom: 40%;
          right: 5%;
          background: linear-gradient(to right, rgba(65, 90, 119, 0.08), rgba(13, 27, 42, 0.05));
        }
 
        .circle-10 {
          width: 160px;
          height: 160px;
          bottom: 20%;
          right: 15%;
          background: linear-gradient(to right, rgba(13, 27, 42, 0.05), rgba(65, 90, 119, 0.05));
        }
 
        @keyframes float {
          0%, 100% { transform: translateY(0) }
          50% { transform: translateY(-20px) }
        }
 
        /* Logo */
        .logo-container {
          position: relative;
          z-index: 1;
          margin-bottom: 2rem;
          animation: fadeInDown 0.8s ease forwards;
        }
 
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
 
        .logo {
          display: flex;
          align-items: center;
          text-decoration: none;
          font-weight: 700;
          font-size: 2rem;
          color: #0d1b2a;
          position: relative;
        }
 
        .logo-text {
          position: relative;
          letter-spacing: -0.5px;
        }
 
        .logo-text::after {
          content: '';
          position: absolute;
          bottom: -3px;
          left: 0;
          width: 0;
          height: 2px;
          background-color:#0d1b2a;
          transition: width 0.3s ease;
        }
 
        .logo:hover .logo-text::after {
          width: 100%;
        }
 
        .logo-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          background-color: #0d1b2a;
          border-radius: 50%;
          margin-left: 2px;
        }
 
        /* Card Styling */
        .auth-card-wrapper {
          perspective: 1500px;
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
          transform-style: preserve-3d;
          animation: fadeInUp 0.8s ease forwards;
          animation-delay: 0.3s;
          opacity: 0;
        }
 
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
 
        .auth-card {
          width: 100%;
          height: 480px;
          position: relative;
          transform-style: preserve-3d;
          border-radius: 16px;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
          transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
 
        .card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
 
        .card-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow:
            0 8px 30px rgba(0, 0, 0, 0.05),
            inset 0 1px 1px rgba(255, 255, 255, 0.8);
        }
 
        /* Form Styling */
        .form-container {
          display: flex;
          flex-direction: column;
          padding: 2.5rem;
          height: 100%;
          transition: opacity 0.4s ease, transform 0.4s ease;
        }
 
        .form-exit {
          opacity: 0;
          transform: translateY(-20px);
        }
 
        .form-header {
          text-align: center;
          margin-bottom: 2rem;
        }
 
        .form-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1a202c;
          margin-bottom: 0.5rem;
        }
 
        .form-subtitle {
          font-size: 0.9rem;
          color: #64748b;
        }
 
        .form-error {
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
          border-left: 3px solid #ef4444;
        }
 
        .shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
 
        @keyframes shake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
 
        .input-group {
          margin-bottom: 1.25rem;
          position: relative;
        }
 
        .input-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #4b5563;
          margin-bottom: 0.5rem;
        }
 
        .auth-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background-color: #f9fafb;
          font-size: 0.95rem;
          transition: all 0.3s ease;
        }
 
        .auth-input:focus {
          outline: none;
          border-color: #0d1b2a;
          background-color: #fff;
          box-shadow: 0 0 0 2px rgba(13, 27, 42, 0.3);
        }
 
        .forgot-password {
          position: absolute;
          right: 0;
          top: 0;
          font-size: 0.75rem;
          color: #0d1b2a;
          text-decoration: none;
        }
 
        .forgot-password:hover {
          text-decoration: underline;
        }
 
        .auth-button {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 3rem;
          padding: 0 1.5rem;
          background-color: #0d1b2a;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          margin-top: 0.5rem;
        }
 
        .auth-button:before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            to right,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          transition: all 0.6s ease;
        }
 
        .auth-button:hover:before {
          left: 100%;
        }
 
        .auth-button:hover {
          background-color: #1b263b;
          box-shadow: 0 4px 12px rgba(13, 27, 42, 0.3);
          transform: translateY(-2px);
        }
 
        .auth-button:active {
          transform: translateY(1px);
        }
       
        .auth-button.loading {
          background-color: #1b263b;
          cursor: not-allowed;
        }
 
        .loading-spinner {
          display: inline-block;
          width: 1.25rem;
          height: 1.25rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
        }
 
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
 
        .register-prompt {
          margin-top: auto;
        }
 
        .toggle-text {
          text-align: center;
          font-size: 0.875rem;
          color: #6b7280;
          padding-top: 1.5rem;
        }
 
        .toggle-button {
          color: #0d1b2a;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.875rem;
          text-decoration: underline;
          transition: color 0.2s ease;
        }
 
        .toggle-button:hover {
          color: #1b263b;
        }
 
        /* Mobile Responsive Styles */
        @media (max-width: 640px) {
          .auth-card {
            height: auto;
            min-height: 480px;
          }
         
          .form-container {
            padding: 1.75rem;
          }
         
          .form-title {
            font-size: 1.5rem;
          }
         
          .form-subtitle {
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  )
}
 
 
 
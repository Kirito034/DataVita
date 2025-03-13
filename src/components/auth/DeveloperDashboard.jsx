import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import "../../styles/DeveloperDashboard.css";

const DeveloperDashboard = () => {
  const [searchParams] = useSearchParams();
  const user_id = searchParams.get("user_id");
  const role = searchParams.get("role");
  const [allUsersActivity, setAllUsersActivity] = useState([]);
  const [filterEmail, setFilterEmail] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const navigate = useNavigate();
  const API_BASE_URL = "http://127.0.0.1:5000";

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (!user_id || !role) {
          console.error("Missing user_id or role in query parameters");
          return;
        }
        const response = await axios.get(`${API_BASE_URL}/auth/api/dashboard`, {
          params: { user_id, role },
        });
        if (role === "developer") {
          const filteredData = response.data.all_users_activity.filter(
            (log) => log.role !== "admin"
          );
          setAllUsersActivity(filteredData);
        } else {
          setAllUsersActivity(response.data.all_users_activity);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error.response?.data || error.message);
      }
    };
    fetchDashboardData();
  }, [user_id, role]);

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/auth/api/logout`, { user_id });
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error.response?.data || error.message);
      alert("Logout failed. Please try again.");
    }
  };

  const handleOpenCompiler = () => {
    navigate("/compiler");
  };

  const formatDateTime = (datetime) => {
    if (!datetime) return "N/A";
    const date = new Date(datetime);
    return date.toLocaleDateString("en-GB") + " " + date.toLocaleTimeString("en-GB");
  };

  const calculateSurfingTime = (loginTime, logoutTime) => {
    if (!loginTime || !logoutTime) return "N/A";
    const loginDate = new Date(loginTime);
    const logoutDate = new Date(logoutTime);
    const diffInSeconds = Math.floor((logoutDate - loginDate) / 1000);
    const hrs = Math.floor(diffInSeconds / 3600);
    const mins = Math.floor((diffInSeconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  // Filter activity logs
  const filteredActivity = allUsersActivity.filter((log) => {
    const matchesEmail = log.email.toLowerCase().includes(filterEmail.toLowerCase());
    const matchesDate = filterDate ? log.login_time.includes(filterDate) : true;
    return matchesEmail && matchesDate;
  });

  // Get unique registered users
  const uniqueUsers = Array.from(new Set(allUsersActivity.map((log) => log.email))).map(
    (email) =>
      allUsersActivity.find((log) => log.email === email)
  );

  // Count online and offline users
  const onlineUsers = uniqueUsers.filter((user) =>
    allUsersActivity.some(
      (log) => log.email === user.email && !log.logout_time
    )
  ).length;

  const offlineUsers = uniqueUsers.length - onlineUsers;

  return (
    <div className="developer-dashboard">
      <h1>Developer Dashboard</h1>
      <table className="options-table">
        <tbody>
          <tr>
            <td style={{ backgroundColor: "#ccebff" }}>
              <input
                type="text"
                placeholder="Filter by Email"
                value={filterEmail}
                onChange={(e) => setFilterEmail(e.target.value)}
              />
            </td>
            <td style={{ backgroundColor: "#ccffcc" }}>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </td>
            <td style={{ backgroundColor: "#ffcccb" }}>
              <button onClick={handleLogout}>
                <span role="img" aria-label="logout">🚪</span> Logout
              </button>
            </td>
            <td style={{ backgroundColor: "#ffeb99" }}>
              <button onClick={handleOpenCompiler}>
                <span role="img" aria-label="compiler">💻</span> Open Compiler
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="user-counts">
        <p>Total Registered Users: {uniqueUsers.length}</p>
        <p>Online Users: {onlineUsers}</p>
        <p>Offline Users: {offlineUsers}</p>
      </div>
      <table className="activity-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Login Time</th>
            <th>Logout Time</th>
            <th>Surfing Time</th>
          </tr>
        </thead>
        <tbody>
          {filteredActivity.map((log, index) => (
            <tr key={index}>
              <td>{log.email}</td>
              <td>{formatDateTime(log.login_time)}</td>
              <td>{formatDateTime(log.logout_time)}</td>
              <td>{calculateSurfingTime(log.login_time, log.logout_time)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DeveloperDashboard;
import React, { useEffect, useState } from "react";
import { getUserData, getUserActivityLogs, logoutUser } from "../../services/api.jsx";
import "../../styles/UserDashboard.css";
import { useNavigate } from "react-router-dom";

function UserDashboard() {
    const [userData, setUserData] = useState(null);
    const [activityLogs, setActivityLogs] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const user_id = localStorage.getItem("user_id");
                if (!user_id) {
                    alert("Session expired. Please log in again.");
                    navigate("/");
                    return;
                }
                const userDataResponse = await getUserData(user_id);
                setUserData(userDataResponse.data);
                const activityLogsResponse = await getUserActivityLogs(user_id);
                setActivityLogs(activityLogsResponse.data);
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };
        fetchUserData();
    }, [navigate]);

    const formatDateTime = (datetime) => {
        if (!datetime) return "Still logged in";
        const date = new Date(datetime);
        return date.toLocaleDateString("en-GB") + " " + date.toLocaleTimeString("en-GB");
    };

    const calculateSurfingTime = (loginTime, logoutTime) => {
        if (!logoutTime) return "Still logged in";
        const diff = new Date(logoutTime) - new Date(loginTime);
        const seconds = Math.floor((diff / 1000) % 60);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        return `${hours}h ${minutes}m ${seconds}s`;
    };

    const handleLogout = async () => {
        try {
            const user_id = localStorage.getItem("user_id");
            if (!user_id) {
                alert("Session expired. Please log in again.");
                navigate("/");
                return;
            }
            await logoutUser(user_id);
            localStorage.removeItem("user_id");
            window.location.href = "/login";
        } catch (error) {
            console.error("Error during logout:", error);
            alert("An error occurred while logging out. Please try again.");
        }
    };

    return (
        <div className="dashboard-container">
            <h1 className="dashboard-title">User Dashboard</h1>
            {userData ? (
                <div className="user-info">
                    <p><strong>Name:</strong> {userData.full_name}</p>
                    <p><strong>Email:</strong> {userData.email}</p>
                    <p><strong>Role:</strong> {userData.role}</p>
                    <p><strong>Login Count:</strong> {userData.login_count}</p>
                    <p><strong>Last Login:</strong> {userData.last_login || "N/A"}</p>
                    <p><strong>Account Created:</strong> {new Date(userData.created_at).toLocaleString()}</p>
                </div>
            ) : (
                <p>Loading user data...</p>
            )}
            <h2 className="activity-title">Login Activity</h2>
            {activityLogs.length > 0 ? (
                <table className="activity-table">
                    <thead>
                        <tr>
                            <th>Login Time</th>
                            <th>Logout Time</th>
                            <th>Surfing Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activityLogs.map((log, index) => (
                            <tr key={index}>
                                <td>{formatDateTime(log.login_time)}</td>
                                <td>{formatDateTime(log.logout_time)}</td>
                                <td>{calculateSurfingTime(log.login_time, log.logout_time)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>No activity logs available.</p>
            )}
            <button className="logout-button" onClick={handleLogout}>Logout from User Dashboard</button>
            <button className="compiler-button" onClick={() => navigate("/workplace")}>
                Open Compiler
            </button>
        </div>
    );
}

export default UserDashboard;
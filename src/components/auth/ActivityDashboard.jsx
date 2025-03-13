import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import '../../styles/ActivityDashboard.css';
const ActivityDashboard = () => {
    const [registeredUsers, setRegisteredUsers] = useState([]);
    const [showUsers, setShowUsers] = useState(false);
    const navigate = useNavigate();

    // Fetch registered users
    const fetchRegisteredUsers = async () => {
        try {
            const response = await axios.get(`http://127.0.0.1:5000/auth/api/get-all-users`);
            setRegisteredUsers(response.data.users);
            setShowUsers(true);
        } catch (error) {
            console.error("Failed to fetch registered users:", error.response?.data || error.message);
        }
    };

    // Redirect to Compiler.js
    const redirectToCompiler = () => {
        navigate("/workspace"); // Redirect to the Compiler component
    };

    // Redirect to AdminDashboard.js
    const redirectToAdminDashboard = () => {
        navigate("/admin-dashboard"); // Redirect to the AdminDashboard component
    };

    return (
        <div className="activity-dashboard">
            <h1>Activity Dashboard</h1>

            {/* Buttons */}
            <div className="buttons-container">
                <button onClick={fetchRegisteredUsers}>Show Registered Users</button>
                <button onClick={redirectToCompiler}>Open Compiler</button>
                <button onClick={redirectToAdminDashboard}>Show User Activity</button>
            </div>

            {/* Display Registered Users */}
            {showUsers && (
                <div className="table-container">
                    <h2>Registered Users</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Email</th>
                                <th>Full Name</th>
                                <th>Role</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registeredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td>{user.email}</td>
                                    <td>{user.full_name}</td>
                                    <td>{user.role}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ActivityDashboard;
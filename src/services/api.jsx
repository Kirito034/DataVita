import axios from "axios";

// Base URL for the backend API
// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";


// Register a new user
export const registerUser = (userData) => {
    return axios.post(`${API_BASE_URL}/auth/api/register`, userData);
};

// Login a user
export const loginUser = (credentials) => {
    return axios.post(`${API_BASE_URL}/auth/api/login`, credentials);
};

// Logout a user
export const logoutUser = (user_id) => {
    return axios.post(`${API_BASE_URL}/auth/api/logout`, { user_id });
};

// Fetch user data
export const getUserData = (user_id) => {
    return axios.get(`${API_BASE_URL}/auth/api/user-data`, { params: { user_id } });
};

// Fetch user activity logs
export const getUserActivityLogs = (user_id) => {
    return axios.get(`${API_BASE_URL}/auth/api/user-activity`, { params: { user_id } });
};

// Fetch all users (for managers and admins)
export const getAllUsers = () => {
    return axios.get(`${API_BASE_URL}/auth/api/get-all-users`);
};

// Fetch all managers (for admins)
export const getAllManagers = () => {
    return axios.get(`${API_BASE_URL}/auth/api/get-all-managers`);
};

// Fetch all activity logs (for admins)
export const getAllActivityLogs = () => {
    return axios.get(`${API_BASE_URL}/auth/api/get-all-activity-logs`);
};
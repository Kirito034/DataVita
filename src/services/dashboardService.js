import axios from 'axios';

const API_URL = 'http://localhost:5000';

export const dashboardService = {
    // Dashboard operations
    getDashboards: async () => {
        try {
            const response = await axios.get(`${API_URL}/dashboards`);
            console.log("🚀 API Response:", response.data);
            return response.data;
        } catch (error) {
            console.error("❌ API Error:", error.response?.data || error.message);
            throw error.response?.data || error.message;
        }
    },
    

    createDashboard: async (dashboardData) => {
        try {
            console.log("🚀 Sending Dashboard Data:", dashboardData);
    
            if (!dashboardData.created_by) {
                console.error("❌ Missing created_by (UUID)");
                alert("Error: created_by (UUID) is required!");
                return;
            }
    
            const response = await axios.post(`${API_URL}/dashboards`, dashboardData);
            console.log("✅ Dashboard Created:", response.data);
            return response.data;
        } catch (error) {
            console.error("❌ Failed to create dashboard:", error.response?.data || error.message);
            alert("Failed to create dashboard: " + JSON.stringify(error.response?.data || error.message));
            throw error;
        }
    },
    

    updateDashboard: async (dashboardId, updateData) => {
        try {
            const response = await axios.put(`${API_URL}/dashboards/${dashboardId}`, updateData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    deleteDashboard: async (dashboardId) => {
        try {
            const response = await axios.delete(`${API_URL}/dashboards/${dashboardId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Widget operations
    addWidget: async (dashboardId, widgetData) => {
        try {
            const response = await axios.post(
                `${API_URL}/dashboards/${dashboardId}/widgets`,
                widgetData
            );
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    updateWidget: async (widgetId, updateData) => {
        try {
            const response = await axios.put(`${API_URL}/dashboards/widgets/${widgetId}`, updateData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    deleteWidget: async (widgetId) => {
        try {
            const response = await axios.delete(`${API_URL}/dashboards/widgets/${widgetId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Data fetching for widgets
    getWidgetData: async (widgetId, params) => {
        try {
            const response = await axios.get(
                `${API_URL}/dashboards/widgets/${widgetId}/data`,
                { params }
            );
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
}; 
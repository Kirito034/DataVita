import { useEffect, useState } from "react";
import { fetchFileStructure } from "../services/api";
import { FileText, FileType, Calendar, User, Clock, Home, Search } from "lucide-react";
import "../styles/scripts-log.css";

// Function to format file extensions into human-readable names
const formatFileType = (extension) => {
  const fileTypes = {
    py: "Python File",
    ipynb: "Notebook",
    sql: "SQL File",
    csv: "CSV File",
    zip: "ZIP File",
    json: "JSON File",
    txt: "Text File",
    md: "Markdown File",
  };

  return fileTypes[extension] || extension.charAt(0).toUpperCase() + extension.slice(1) + " File";
};

const formatDate = (dateString) => (dateString ? new Date(dateString).toLocaleString() : "Unknown");

const getScripts = (items, scripts = []) => {
  const userFullName = localStorage.getItem("user_full_name") || "Unknown User";

  items.forEach((item) => {
    if (item.type === "file") {
      const extension = item.name.split(".").pop().toLowerCase();
      if (["py", "ipynb", "sql", "csv", "zip", "json", "txt", "md"].includes(extension)) {
        scripts.push({
          ...item,
          extension: formatFileType(extension), // Format file extension
          createdAt: item.created_at || null,
          lastModifiedAt: item.modified_at || null,
          createdBy: item.created_by || userFullName,
          lastModifiedBy: item.modified_by || userFullName,
        });
      }
    }
    if (item.type === "folder" && item.children) {
      getScripts(item.children, scripts);
    }
  });

  return scripts;
};

const ScriptsLog = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    const loadLogs = async () => {
      setIsLoading(true);
      try {
        const data = await fetchFileStructure();
        const scripts = getScripts(data.files || []);
        setLogs(scripts);
        setFilteredLogs(scripts);
      } catch (error) {
        console.error("Error fetching script logs:", error);
      }
      setIsLoading(false);
    };
    loadLogs();
  }, []);

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    filterLogs(term, dateFilter);
  };

  const handleDateFilter = (e) => {
    const date = e.target.value;
    setDateFilter(date);
    filterLogs(searchTerm, date);
  };

  const filterLogs = (search, date) => {
    let filtered = logs.filter((log) => log.name.toLowerCase().includes(search));
    if (date) {
      filtered = filtered.filter((log) => log.createdAt && log.createdAt.startsWith(date));
    }
    setFilteredLogs(filtered);
  };

  return (
    <div className="scripts-log-container">
      {/* Navbar */}
      <div className="scripts-log-header">
        <div className="scripts-log-nav-left">
          <div className="scripts-log-datavita-logo">
            <span className="scripts-log-datavita-text">DataVita</span>
            <span className="scripts-log-datavita-dot"></span>
            <h2 className="scripts-log-title">Scripts</h2>
          </div>
        </div>
        <a href="/" className="scripts-log-home-btn">
          <Home size={18} /> Home
        </a>
      </div>

      {/* Filters */}
      <div className="scripts-log-filters">
        <div className="scripts-log-search-bar">
          <Search size={14} />
          <input type="text" placeholder="Search scripts..." value={searchTerm} onChange={handleSearch} />
        </div>
        <div className="scripts-log-date-filter">
          <label>Date: </label>
          <input type="date" value={dateFilter} onChange={handleDateFilter} />
        </div>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <p>Loading logs...</p>
      ) : (
        <div className="scripts-log-container">
          {filteredLogs.length > 0 ? (
            <table className="scripts-log-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Created At</th>
                  <th>Created By</th>
                  <th>Modified At</th>
                  <th>Modified By</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => (
                  <tr key={index} onClick={() => setSelectedItem(log)}>
                    <td>{log.name}</td>
                    <td style={{ textTransform: "capitalize" }}>{log.extension}</td> {/* Ensure capitalization */}
                    <td>{formatDate(log.createdAt)}</td>
                    <td>{log.createdBy}</td>
                    <td>{formatDate(log.lastModifiedAt)}</td>
                    <td>{log.lastModifiedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No scripts found</p>
          )}

          {/* File Details */}
          {selectedItem && (
            <div className="scripts-log-file-details">
              <h3 className="scripts-log-details-title">File Details</h3>
              <div className="scripts-log-details-row">
                <FileText size={14} />
                <span className="scripts-log-details-label">Name:</span>
                <span className="scripts-log-details-value">{selectedItem.name}</span>
              </div>
              <div className="scripts-log-details-row">
                <FileType size={14} />
                <span className="scripts-log-details-label">Type:</span>
                <span className="scripts-log-details-value">{selectedItem.extension}</span> {/* Updated */}
              </div>
              <div className="scripts-log-details-row">
                <Calendar size={14} />
                <span className="scripts-log-details-label">Created:</span>
                <span className="scripts-log-details-value">{formatDate(selectedItem.createdAt)}</span>
              </div>
              <div className="scripts-log-details-row">
                <User size={14} />
                <span className="scripts-log-details-label">Created by:</span>
                <span className="scripts-log-details-value">{selectedItem.createdBy}</span>
              </div>
              <div className="scripts-log-details-row">
                <Clock size={14} />
                <span className="scripts-log-details-label">Modified:</span>
                <span className="scripts-log-details-value">{formatDate(selectedItem.lastModifiedAt)}</span>
              </div>
              <div className="scripts-log-details-row">
                <User size={14} />
                <span className="scripts-log-details-label">Modified by:</span>
                <span className="scripts-log-details-value">{selectedItem.lastModifiedBy}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScriptsLog;

"use client";

import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PythonNotebook from "./components/PythonNotebook.jsx";
import LeftBar from "./components/LeftBar.jsx";
import Navbar from "./components/Navbar";
import BottomBar from "./components/BottomBar";
import Home from "./pages/Home.jsx";
import Authpage from "./components/auth/Login";
import UserDashboard from "./components/auth/UserDashboard";
import AdminDashboard from "./components/auth/AdminDashboard";
import DeveloperDashboard from "./components/auth/DeveloperDashboard";
import ActivityLogs from "./components/auth/ActivityLogs";
import ActivityDashboard from "./components/auth/ActivityDashboard";
import Registration from "./components/auth/Register.jsx";
import ScriptsLog from "./pages/scripts-log.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Playground from "./pages/playground.jsx"
import './styles/layout.css';
import './App.css'
const MainLayout = ({ openFile, fileTabs, onOpenFile, onSwitchTab, onRemoveTab }) => {
  const [leftBarWidth, setLeftBarWidth] = useState(200); // Initial width of LeftBar

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100&", width: "100%", overflow: "hidden" }}>
      <Navbar />
      <div style={{ display: "flex", flex: 1, width: "100%", height: "100%",overflow: "hidden" }}>
        <LeftBar onOpenFile={onOpenFile} setLeftBarWidth={setLeftBarWidth} leftBarWidth={leftBarWidth} />
        <div style={{ display: "flex", flex: 1, width: "100%", height: "100%",overflow: "hidden" }}>
          <PythonNotebook
            fileTabs={fileTabs}
            openFile={openFile}
            addTab={onOpenFile}
            removeTab={onRemoveTab}
            onExecuteCode={async (code, mode) => {
              console.log("Executing code:", code, "Mode:", mode);
              return { result: "Code execution result would appear here", status: "success" };
            }}
          />
        </div>
      </div>
      <BottomBar />
    </div>
  );
};  

const App = () => {
  const [theme, setTheme] = useState("dark");
  const [openFile, setOpenFile] = useState(null);
  const [fileTabs, setFileTabs] = useState([]);
  const [fileStructure, setFileStructure] = useState([]);

  const handleOpenFile = (file) => {
    if (!fileTabs.some((tab) => tab.id === file.id)) {
      setFileTabs((prevTabs) => [...prevTabs, file]);
    }
    setOpenFile(file);
  };

  const handleRemoveTab = (fileId) => {
    setFileTabs((prevTabs) => prevTabs.filter((tab) => tab.id !== fileId));
    if (openFile && openFile.id === fileId) {
      setOpenFile(null);
    }
  };

  const handleFileStructureChange = (newStructure) => {
    setFileStructure(newStructure);
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Authpage />} />
        <Route path="/register" element={<Registration />} />
        <Route path="/user-dashboard" element={<UserDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/developer-dashboard" element={<DeveloperDashboard />} />
        <Route path="/activity-logs" element={<ActivityLogs />} />
        <Route path="/activity-dashboard" element={<ActivityDashboard />} />
        <Route path="/scripts-log" element={<ScriptsLog />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/playground" element={<Playground/>}/>
        <Route
          path="/compiler"
          element={
            <MainLayout
              openFile={openFile}
              fileTabs={fileTabs}
              onOpenFile={handleOpenFile}
              onSwitchTab={setOpenFile}
              onRemoveTab={handleRemoveTab}
            />
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
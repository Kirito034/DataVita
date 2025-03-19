import { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw, Sun, Moon, ChevronLeft, ChevronRight, ChevronDown, Play, Download, Share, Settings, Plus, Trash2, Code, Terminal, Maximize2, Minimize2, FileText, FileCode, FileCodeIcon as FileCss, FileIcon as FileHtml, Eye, Home, Package, Search, AlertCircle, Info, Layers, List, Coffee, Folder, ExternalLink, Save, Upload, Database } from 'lucide-react';
import * as Babel from "@babel/standalone";
import JSZip from "jszip";
import styles from "../styles/playground.module.css";
import { Editor } from "@monaco-editor/react";
import PlaygroundServices from "../services/playgroundServices";

// Default templates for different file types
const DEFAULT_TEMPLATES = {
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Playground</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app"></div>
  <script src="script.js"></script>
</body>
</html>`,
  css: `/* Base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  color: #333;
  line-height: 1.6;
}

#app {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  color: #0070f3;
  margin-bottom: 1rem;
}

/* Button styles */
button {
  padding: 0.5rem 1rem;
  background-color: #0070f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s ease;
}

button:hover {
  background-color: #0060df;
}`,
  javascript: `// JavaScript code
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  app.innerHTML = '<h1>Welcome to Playground!</h1>';
  
  // Add a paragraph element
  const paragraph = document.createElement('p');
  paragraph.textContent = 'This is a simple JavaScript playground. Edit the code to see changes!';
  app.appendChild(paragraph);
  
  // Create a button element
  const button = document.createElement('button');
  button.textContent = 'Click me';
  button.addEventListener('click', () => {
    console.log('Button clicked!');
    alert('Button clicked!');
  });
  app.appendChild(button);
  
  // Log a message to the console
  console.log('Application initialized');
});`,
  jsx: `// React JSX code
import React, { useState } from 'react';
import ReactDOM from 'react-dom';

// Simple Button component
const Button = ({ onClick, children }) => (
  <button 
    onClick={onClick}
    style={{
      padding: '0.5rem 1rem',
      backgroundColor: '#0070f3',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    }}
  >
    {children}
  </button>
);

// Main App component
function App() {
  const [count, setCount] = useState(0);
  
  return (
    <div className="app">
      <h1>React JSX Playground</h1>
      <p>Edit this code to see your changes in real-time!</p>
      <p>Count: {count}</p>
      <Button onClick={() => setCount(count + 1)}>
        Increment
      </Button>
      <Button onClick={() => alert('Button clicked!')}>
        Show Alert
      </Button>
    </div>
  );
}

// Render the App component to the DOM
ReactDOM.render(<App />, document.getElementById('app'));`,
  json: `{
  "name": "playground-project",
  "version": "1.0.0",
  "description": "A code playground project",
  "main": "index.js",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "eslint": "^8.38.0"
  },
  "scripts": {
    "start": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}`,
};

// CDN links for React and other libraries
const CDN_LINKS = {
  react: "https://unpkg.com/react@18/umd/react.development.js",
  reactDom: "https://unpkg.com/react-dom@18/umd/react-dom.development.js",
  babel: "https://unpkg.com/@babel/standalone/babel.min.js",
};

// NPM Registry API
const NPM_REGISTRY_API = "https://registry.npmjs.org";

// Popular npm packages for quick installation
const POPULAR_PACKAGES = [
  { name: "react", version: "18.2.0", description: "A JavaScript library for building user interfaces." },
  { name: "react-dom", version: "18.2.0", description: "React package for working with the DOM." },
  { name: "lodash", version: "4.17.21", description: "A modern JavaScript utility library delivering modularity, performance & extras." },
  { name: "axios", version: "1.4.0", description: "Promise based HTTP client for the browser and node.js" },
  { name: "prettier", version: "2.8.8", description: "Code formatter" },
  { name: "eslint", version: "8.0.0", description: "JavaScript linter" },
  { name: "vite", version: "4.4.9", description: "Next generation frontend tooling" },
  { name: "@vitejs/plugin-react", version: "4.0.4", description: "React plugin for Vite" },
  { name: "zustand", version: "4.4.1", description: "Bear necessities for state management in React" },
  { name: "tailwindcss", version: "3.3.3", description: "A utility-first CSS framework for rapidly building custom user interfaces" },
];

export default function Playground() {
  const [theme, setTheme] = useState("light");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState("editor");
  const [editorLayout, setEditorLayout] = useState("horizontal");
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [shareUrl, setShareUrl] = useState("");
  const [activeSidebarTab, setActiveSidebarTab] = useState("files");
  const [fileViewMode, setFileViewMode] = useState("tree");

  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileType, setNewFileType] = useState("javascript");
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});

  const [packages, setPackages] = useState([]);
  const [packageSearch, setPackageSearch] = useState("");
  const [isInstallingPackage, setIsInstallingPackage] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [consoleOutput, setConsoleOutput] = useState([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [activeBottomTab, setActiveBottomTab] = useState("console");
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalHistory, setTerminalHistory] = useState([]);

  const [syntaxErrors, setSyntaxErrors] = useState([]);
  const [runtimeErrors, setRuntimeErrors] = useState([]);
  
  // Context menu state - moved outside of renderFileTree to avoid conditional hooks
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, fileId: null });
  
  // Monaco editor instance reference
  const editorRef = useRef(null);
  
  // User state for file management
const userId = localStorage.getItem("user_id"); // Mock user ID, replace with actual auth
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  
  const [settings, setSettings] = useState({
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    autoComplete: true,
    formatOnSave: true,
    livePreview: true,
    linting: true,
    minimap: true,
    indentGuides: true,
    autoClosingBrackets: true,
    highlightActiveLine: true,
    autoSave: false,
  });

  const iframeRef = useRef(null);
  const consoleEndRef = useRef(null);
  const terminalInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);

  // Initialize with default files
  useEffect(() => {
    const defaultFiles = [
      { id: 1, name: "index.html", type: "html", content: DEFAULT_TEMPLATES.html, path: "/" },
      { id: 2, name: "styles.css", type: "css", content: DEFAULT_TEMPLATES.css, path: "/" },
      { id: 3, name: "script.js", type: "javascript", content: DEFAULT_TEMPLATES.javascript, path: "/" },
      { id: 4, name: "package.json", type: "json", content: DEFAULT_TEMPLATES.json, path: "/" },
    ];
    
    // Load user files from API
    loadUserFiles();
    
    // If no files are loaded, use defaults
    if (files.length === 0) {
      setFiles(defaultFiles);
      setActiveFile(defaultFiles[0]);
    }

    try {
      const packageJson = JSON.parse(DEFAULT_TEMPLATES.json);
      const initialPackages = [
        ...Object.entries(packageJson.dependencies || {}).map(([name, version]) => ({
          name,
          version: version.replace("^", ""),
          type: "dependency",
        })),
        ...Object.entries(packageJson.devDependencies || {}).map(([name, version]) => ({
          name,
          version: version.replace("^", ""),
          type: "devDependency",
        })),
      ];
      setPackages(initialPackages);
    } catch (error) {
      console.error("Error parsing package.json:", error);
    }

    addConsoleLog("Playground initialized. Ready to code!", "info");
    
    // Set theme based on system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  // Load user files from API
  const loadUserFiles = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    addConsoleLog("Loading your files...", "info");
    
    try {
      const userFiles = await PlaygroundServices.getUserFiles(userId);
      
      if (userFiles && userFiles.length > 0) {
        // Transform API data to match our file structure
        const transformedFiles = userFiles.map(file => ({
          id: file.id,
          name: file.name,
          type: file.type || getFileTypeFromName(file.name),
          content: file.content,
          path: file.path || "/",
          lastModified: file.lastModified || new Date().toISOString()
        }));
        
        setFiles(transformedFiles);
        setActiveFile(transformedFiles[0]);
        addConsoleLog(`Loaded ${transformedFiles.length} files successfully`, "success");
      } else {
        addConsoleLog("No saved files found. Using default templates.", "info");
      }
    } catch (error) {
      console.error("Error loading files:", error);
      addConsoleLog(`Failed to load files: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Get file type from file name
  const getFileTypeFromName = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
      case 'html': return 'html';
      case 'css': return 'css';
      case 'js': return 'javascript';
      case 'jsx': return 'jsx';
      case 'json': return 'json';
      default: return 'text';
    }
  };

  // Save current file to API
  const saveCurrentFile = async () => {
    if (!activeFile || !userId) return;
    
    setIsSaving(true);
    setSaveStatus("saving");
    
    try {
      const fileData = {
        id: activeFile.id,
        name: activeFile.name,
        content: activeFile.content,
        type: activeFile.type,
        path: activeFile.path,
        userId: userId,
        lastModified: new Date().toISOString()
      };
      
      // If file has an ID from the server, update it, otherwise create new
      let response;
      if (typeof activeFile.id === 'number' || (typeof activeFile.id === 'string' && !activeFile.id.startsWith('local_'))) {
        response = await PlaygroundServices.updateFile(activeFile.id, fileData);
        addConsoleLog(`Updated file: ${activeFile.name}`, "success");
      } else {
        response = await PlaygroundServices.saveFile(fileData);
        // Update the file ID in our state with the one from the server
        setFiles(prev => prev.map(file => 
          file.id === activeFile.id ? { ...file, id: response.id } : file
        ));
        setActiveFile(prev => ({ ...prev, id: response.id }));
        addConsoleLog(`Saved new file: ${activeFile.name}`, "success");
      }
      
      setSaveStatus("saved");
      
      // Reset save status after a delay
      setTimeout(() => {
        setSaveStatus(null);
      }, 2000);
      
    } catch (error) {
      console.error("Error saving file:", error);
      addConsoleLog(`Failed to save file: ${error.message}`, "error");
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  // Save all files to API
  const saveAllFiles = async () => {
    if (!userId || files.length === 0) return;
    
    setIsSaving(true);
    setSaveStatus("saving");
    addConsoleLog("Saving all files...", "info");
    
    try {
      // Process files in sequence to avoid race conditions
      for (const file of files) {
        const fileData = {
          id: file.id,
          name: file.name,
          content: file.content,
          type: file.type,
          path: file.path,
          userId: userId,
          lastModified: new Date().toISOString()
        };
        
        // If file has an ID from the server, update it, otherwise create new
        if (typeof file.id === 'number' || (typeof file.id === 'string' && !file.id.startsWith('local_'))) {
          await PlaygroundServices.updateFile(file.id, fileData);
        } else {
          const response = await PlaygroundServices.saveFile(fileData);
          // Update the file ID in our state
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, id: response.id } : f
          ));
          if (activeFile && activeFile.id === file.id) {
            setActiveFile(prev => ({ ...prev, id: response.id }));
          }
        }
      }
      
      setSaveStatus("saved");
      addConsoleLog(`Saved ${files.length} files successfully`, "success");
      
      // Reset save status after a delay
      setTimeout(() => {
        setSaveStatus(null);
      }, 2000);
      
    } catch (error) {
      console.error("Error saving files:", error);
      addConsoleLog(`Failed to save files: ${error.message}`, "error");
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete file from API
  const deleteFileFromServer = async (fileId) => {
    if (!fileId) return;
    
    try {
      await PlaygroundServices.deleteFile(fileId);
      addConsoleLog("File deleted from server", "success");
    } catch (error) {
      console.error("Error deleting file from server:", error);
      addConsoleLog(`Failed to delete file from server: ${error.message}`, "error");
    }
  };

  // Auto-scroll console to bottom when new logs are added
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleOutput]);

  // Auto-refresh preview when files change
  useEffect(() => {
    if (!isAutoRefresh || !activeFile) return;

    const timer = setTimeout(() => {
      updatePreview();
    }, 1000);

    return () => clearTimeout(timer);
  }, [files, isAutoRefresh, activeFile]);

  // Auto-save functionality
  useEffect(() => {
    if (!settings.autoSave || !activeFile?.content) return;
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveCurrentFile();
    }, 3000); // Auto-save after 3 seconds of inactivity
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [activeFile?.content, settings.autoSave]);

  // Handle console messages from the preview iframe
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.source === "playground-console") {
        if (event.data.type === "error" && event.data.errorDetails) {
          const { message, filename, lineno, colno, stack } = event.data.errorDetails;

          setRuntimeErrors((prev) => [
            ...prev,
            {
              message,
              filename,
              line: lineno,
              column: colno,
              stack,
            },
          ]);

          const formattedMessage = `${message} (${filename}:${lineno}:${colno})`;
          addConsoleLog(formattedMessage, "error");
        } else {
          addConsoleLog(event.data.args, event.data.type);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Search for npm packages when packageSearch changes
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (packageSearch.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`${NPM_REGISTRY_API}/-/v1/search?text=${encodeURIComponent(packageSearch)}&size=10`);
        const data = await response.json();
        
        const results = data.objects.map(obj => ({
          name: obj.package.name,
          version: obj.package.version,
          description: obj.package.description || 'No description available',
          keywords: obj.package.keywords || [],
          date: obj.package.date,
          links: obj.package.links,
          publisher: obj.package.publisher,
          score: obj.score
        }));
        
        setSearchResults(results);
      } catch (error) {
        console.error("Error searching npm packages:", error);
        addConsoleLog(`Failed to search packages: ${error.message}`, "error");
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [packageSearch]);

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu({ visible: false, x: 0, y: 0, fileId: null });
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible]);

  // Toggle between light and dark theme
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  // Get file icon based on file type
  const getFileIcon = (fileType) => {
    switch (fileType) {
      case "html":
        return <FileHtml size={16} />;
      case "css":
        return <FileCss size={16} />;
      case "javascript":
      case "jsx":
        return <FileCode size={16} />;
      case "json":
        return <FileCode size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  // Get language ID for Monaco editor
  const getLanguageId = (fileType) => {
    switch (fileType) {
      case "html":
        return "html";
      case "css":
        return "css";
      case "javascript":
        return "javascript";
      case "jsx":
        return "javascript";
      case "json":
        return "json";
      default:
        return "javascript";
    }
  };

  // Handle editor initialization
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Set editor options based on settings
    editor.updateOptions({
      fontSize: settings.fontSize,
      tabSize: settings.tabSize,
      wordWrap: settings.wordWrap ? "on" : "off",
      minimap: { enabled: settings.minimap },
      renderIndentGuides: settings.indentGuides,
      autoClosingBrackets: settings.autoClosingBrackets ? "always" : "never",
      renderLineHighlight: settings.highlightActiveLine ? "all" : "none",
      lineNumbers: showLineNumbers ? "on" : "off",
      automaticLayout: true,
      scrollBeyondLastLine: false,
      quickSuggestions: settings.autoComplete,
      suggestOnTriggerCharacters: settings.autoComplete,
      folding: true,
      foldingStrategy: "auto",
      matchBrackets: "always",
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
        alwaysConsumeMouseWheel: false
      }
    });
    
    // Set up model change listener for syntax validation
    editor.onDidChangeModelContent(() => {
      if (activeFile) {
        const model = editor.getModel();
        if (model) {
          const markers = monaco.editor.getModelMarkers({ resource: model.uri });
          
          const errors = markers.map(marker => ({
            message: marker.message,
            line: marker.startLineNumber,
            column: marker.startColumn,
            severity: marker.severity === 8 ? "error" : "warning",
            source: activeFile.name,
          }));
          
          setSyntaxErrors(errors);
        }
      }
    });
    
    // Add keyboard shortcut for saving
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveCurrentFile();
    });
  };

  // Handle editor content change
  const handleEditorChange = (value) => {
    if (!activeFile) return;
    updateFileContent(activeFile.id, value);
  };

  // Handle terminal command submission
  const handleTerminalSubmit = (e) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    setTerminalHistory((prev) => [...prev, { type: "command", content: terminalInput }]);
    processTerminalCommand(terminalInput);
    setTerminalInput("");
  };

  // Process terminal commands
  const processTerminalCommand = (command) => {
    const cmd = command.trim();
    let response = "";

    if (cmd.startsWith("npm install") || cmd.startsWith("npm i")) {
      const parts = cmd.split(" ");
      const packageName = parts[2];
      const isDev = parts.includes("--save-dev") || parts.includes("-D");
      
      if (packageName) {
        response = `Installing package: ${packageName}${isDev ? ' (dev dependency)' : ''}...`;
        
        // Simulate package installation
        setTimeout(async () => {
          try {
            const packageInfo = await fetchPackageInfo(packageName);
            if (packageInfo) {
              installPackage(packageName, packageInfo.version, isDev ? "devDependency" : "dependency");
              setTerminalHistory((prev) => [
                ...prev,
                { type: "output", content: `+ ${packageName}@${packageInfo.version} installed successfully` },
              ]);
            } else {
              setTerminalHistory((prev) => [
                ...prev,
                { type: "output", content: `Error: Package ${packageName} not found` },
              ]);
            }
          } catch (error) {
            setTerminalHistory((prev) => [
              ...prev,
              { type: "output", content: `Error installing ${packageName}: ${error.message}` },
            ]);
          }
        }, 1000);
      } else {
        response = "Error: Please specify a package name";
      }
    } else if (cmd.startsWith("npm uninstall") || cmd.startsWith("npm remove") || cmd.startsWith("npm r")) {
      const packageName = cmd.split(" ")[2];
      if (packageName) {
        response = `Uninstalling package: ${packageName}...`;
        setTimeout(() => {
          uninstallPackage(packageName);
          setTerminalHistory((prev) => [
            ...prev,
            { type: "output", content: `- ${packageName} removed successfully` },
          ]);
        }, 1000);
      } else {
        response = "Error: Please specify a package name";
      }
    } else if (cmd === "npm list" || cmd === "npm ls") {
      if (packages.length === 0) {
        response = "No packages installed";
      } else {
        response = "Installed packages:\n" + packages.map(pkg => 
          `${pkg.name}@${pkg.version} ${pkg.type === "devDependency" ? "(dev)" : ""}`
        ).join("\n");
      }
    } else if (cmd === "clear" || cmd === "cls") {
      setTerminalHistory([]);
      return;
    } else if (cmd === "ls" || cmd === "dir") {
      response = files.map((file) => file.name).join("\n");
    } else if (cmd === "save") {
      response = "Saving current file...";
      saveCurrentFile();
    } else if (cmd === "save all") {
      response = "Saving all files...";
      saveAllFiles();
    } else if (cmd === "load") {
      response = "Loading files from server...";
      loadUserFiles();
    } else if (cmd === "help") {
      response = `Available commands:
npm install <package> - Install a package
npm install <package> --save-dev - Install a dev dependency
npm uninstall <package> - Remove a package
npm list - List installed packages
ls, dir - List files
save - Save current file
save all - Save all files
load - Load files from server
clear, cls - Clear terminal
help - Show this help`;
    } else {
      response = `Command not found: ${cmd}. Type 'help' for available commands.`;
    }

    setTerminalHistory((prev) => [...prev, { type: "output", content: response }]);
  };

  // Fetch package info from npm registry
  const fetchPackageInfo = async (packageName) => {
    try {
      const response = await fetch(`${NPM_REGISTRY_API}/${packageName}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch package info: ${response.statusText}`);
      }
      const data = await response.json();
      return {
        name: data.name,
        version: data['dist-tags'].latest,
        description: data.description,
        homepage: data.homepage,
        repository: data.repository?.url,
        license: data.license,
        dependencies: data.versions[data['dist-tags'].latest].dependencies || {},
        devDependencies: data.versions[data['dist-tags'].latest].devDependencies || {},
      };
    } catch (error) {
      console.error(`Error fetching package info for ${packageName}:`, error);
      addConsoleLog(`Failed to fetch package info: ${error.message}`, "error");
      return null;
    }
  };

  // Update file content
  const updateFileContent = (fileId, newContent) => {
    setFiles((prev) => prev.map((file) => (file.id === fileId ? { ...file, content: newContent } : file)));

    if (activeFile && activeFile.id === fileId) {
      setActiveFile((prev) => ({ ...prev, content: newContent }));
    }
  };

  // Create a new file
  const createNewFile = () => {
    if (!newFileName.trim()) {
      addConsoleLog("File name cannot be empty", "error");
      return;
    }

    const fileExists = files.some((file) => file.name === newFileName && file.path === "/");

    if (fileExists) {
      addConsoleLog(`File '${newFileName}' already exists`, "error");
      return;
    }

    const newFile = {
      id: `local_${Date.now()}`, // Use local_ prefix for unsaved files
      name: newFileName,
      type: newFileType,
      content: DEFAULT_TEMPLATES[newFileType] || "",
      path: "/",
      lastModified: new Date().toISOString()
    };

    setFiles((prev) => [...prev, newFile]);
    setActiveFile(newFile);
    setIsCreatingFile(false);
    setNewFileName("");

    addConsoleLog(`Created new file: ${newFileName}`, "success");
  };

  // Delete a file
  const deleteFile = (id) => {
    const fileToDelete = files.find((file) => file.id === id);
    if (!fileToDelete) return;

    // If file exists on server, delete it there too
    if (typeof fileToDelete.id === 'number' || (typeof fileToDelete.id === 'string' && !fileToDelete.id.startsWith('local_'))) {
      deleteFileFromServer(fileToDelete.id);
    }

    setFiles((prev) => prev.filter((file) => file.id !== id));

    if (activeFile?.id === id) {
      setActiveFile(files.length > 1 ? files.find((file) => file.id !== id) : null);
    }

    addConsoleLog(`Deleted file: ${fileToDelete.name}`, "info");
  };

  // Create a new folder
  const createNewFolder = () => {
    const folderName = prompt("Enter folder name:");
    if (!folderName) return;

    const newFolder = {
      id: `local_folder_${Date.now()}`,
      name: folderName,
      type: "folder",
      path: "/",
      children: [],
    };

    setFiles((prev) => [...prev, newFolder]);
    addConsoleLog(`Created new folder: ${folderName}`, "success");
  };

  // Toggle folder expansion
  const toggleFolder = (id) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Handle context menu for files
  const handleContextMenu = (event, fileId) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      fileId
    });
  };
  
  // Handle context menu actions
  const handleContextMenuAction = (action) => {
    const file = files.find(f => f.id === contextMenu.fileId);
    
    switch(action) {
      case 'rename':
        if (file) {
          const newName = prompt("Enter new name:", file.name);
          if (newName && newName !== file.name) {
            setFiles(prev => prev.map(f => 
              f.id === contextMenu.fileId ? { ...f, name: newName } : f
            ));
            addConsoleLog(`Renamed ${file.name} to ${newName}`, "info");
          }
        }
        break;
      case 'delete':
        if (file) {
          deleteFile(contextMenu.fileId);
        }
        break;
      case 'duplicate':
        if (file) {
          const newFile = {
            ...file,
            id: `local_${Date.now()}`,
            name: `Copy of ${file.name}`
          };
          setFiles(prev => [...prev, newFile]);
          addConsoleLog(`Duplicated ${file.name}`, "info");
        }
        break;
      case 'save':
        if (file && file.id === activeFile?.id) {
          saveCurrentFile();
        } else if (file) {
          // Set as active file and then save
          setActiveFile(file);
          setTimeout(() => saveCurrentFile(), 100);
        }
        break;
    }
    
    setContextMenu({ visible: false, x: 0, y: 0, fileId: null });
  };

  // Install a package
  const installPackage = async (packageName, version, type = "dependency") => {
    setIsInstallingPackage(true);

    try {
      // Check if package already exists
      const existingPackage = packages.find((p) => p.name === packageName);

      if (existingPackage) {
        if (existingPackage.version !== version) {
          setPackages((prev) =>
            prev.map((p) => (p.name === packageName ? { ...p, version, type } : p))
          );
          addConsoleLog(`Updated ${packageName} to version ${version}`, "success");
        } else if (existingPackage.type !== type) {
          setPackages((prev) =>
            prev.map((p) => (p.name === packageName ? { ...p, type } : p))
          );
          addConsoleLog(`Changed ${packageName} to ${type === "dependency" ? "regular" : "dev"} dependency`, "success");
        } else {
          addConsoleLog(`${packageName} is already installed`, "info");
        }
      } else {
        // If package doesn't exist, fetch its details
        let packageInfo = version ? { version } : null;
        
        if (!packageInfo) {
          packageInfo = await fetchPackageInfo(packageName);
          if (!packageInfo) {
            throw new Error(`Package ${packageName} not found`);
          }
        }
        
        setPackages((prev) => [...prev, { 
          name: packageName, 
          version: packageInfo.version || version, 
          type,
          description: packageInfo.description || '',
          homepage: packageInfo.homepage || '',
        }]);
        
        addConsoleLog(`Installed ${packageName}@${packageInfo.version || version}`, "success");
      }

      // Update package.json
      updatePackageJson(packageName, version, type);
      
      // If auto-refresh is enabled, update the preview
      if (isAutoRefresh) {
        setTimeout(() => {
          updatePreview();
        }, 500);
      }
    } catch (error) {
      addConsoleLog(`Failed to install ${packageName}: ${error.message}`, "error");
    } finally {
      setIsInstallingPackage(false);
    }
  };

  // Update package.json with new package
  const updatePackageJson = (packageName, version, type) => {
    const packageJsonFile = files.find((f) => f.name === "package.json");

    if (!packageJsonFile) {
      addConsoleLog("package.json not found", "error");
      return;
    }

    try {
      const packageJson = JSON.parse(packageJsonFile.content);

      if (type === "dependency") {
        packageJson.dependencies = packageJson.dependencies || {};
        packageJson.dependencies[packageName] = `^${version}`;
      } else {
        packageJson.devDependencies = packageJson.devDependencies || {};
        packageJson.devDependencies[packageName] = `^${version}`;
      }

      const formattedJson = JSON.stringify(packageJson, null, 2);
      updateFileContent(packageJsonFile.id, formattedJson);

      addConsoleLog(`Updated package.json with ${packageName}@${version}`, "success");
    } catch (error) {
      addConsoleLog(`Failed to update package.json: ${error.message}`, "error");
    }
  };

  // Uninstall a package
  const uninstallPackage = (packageName) => {
    setIsInstallingPackage(true);

    setTimeout(() => {
      try {
        const packageExists = packages.some(p => p.name === packageName);
        
        if (!packageExists) {
          addConsoleLog(`Package ${packageName} is not installed`, "warning");
          setIsInstallingPackage(false);
          return;
        }
        
        setPackages((prev) => prev.filter((p) => p.name !== packageName));

        const packageJsonFile = files.find((f) => f.name === "package.json");

        if (packageJsonFile) {
          const packageJson = JSON.parse(packageJsonFile.content);

          if (packageJson.dependencies && packageJson.dependencies[packageName]) {
            delete packageJson.dependencies[packageName];
          }

          if (packageJson.devDependencies && packageJson.devDependencies[packageName]) {
            delete packageJson.devDependencies[packageName];
          }

          updateFileContent(packageJsonFile.id, JSON.stringify(packageJson, null, 2));
        }

        addConsoleLog(`Uninstalled ${packageName}`, "success");
        
        // If auto-refresh is enabled, update the preview
        if (isAutoRefresh) {
          setTimeout(() => {
            updatePreview();
          }, 500);
        }
      } catch (error) {
        addConsoleLog(`Failed to uninstall ${packageName}: ${error.message}`, "error");
      } finally {
        setIsInstallingPackage(false);
      }
    }, 1000);
  };

  // Update preview iframe
  const updatePreview = useCallback(async () => {
    try {
      setIsProcessing(true);
      setPreviewError(null);
      setRuntimeErrors([]);

      const htmlFile = files.find((f) => f.name.endsWith(".html"));
      const htmlContent = htmlFile?.content || DEFAULT_TEMPLATES.html;

      const cssFiles = files.filter((f) => f.name.endsWith(".css"));
      const cssContent = cssFiles.map((f) => f.content).join("\n");

      const jsFiles = files.filter((f) => f.name.endsWith(".js"));
      const jsxFiles = files.filter((f) => f.name.endsWith(".jsx"));

      // Ensure jsContent is defined inside the function
      const jsContent = jsFiles.map((f) => f.content).join("\n");

      let jsxContent = "";
      if (jsxFiles.length > 0) {
        for (const file of jsxFiles) {
          try {
            const transpiled = Babel.transform(file.content, {
              presets: ["react"],
              filename: file.name,
            }).code;

            jsxContent += `
// File: ${file.name}
${transpiled}
`;
          } catch (error) {
            setPreviewError(`Error transpiling ${file.name}: ${error.message}`);
            addConsoleLog(`JSX Transpilation Error: ${error.message}`, "error");
            setIsProcessing(false);
            return;
          }
        }
      }

      // Create a sandbox iframe to prevent access to parent window
      const sandboxHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Playground Preview</title>
  <style>
    /* Reset styles to prevent leakage from parent */
    html, body { margin: 0; padding: 0; }
    
    /* Injected CSS */
    ${cssContent}
  </style>
</head>
<body>
  <!-- Base HTML -->
  ${htmlContent.replace(/<html[^>]*>|<\/html>|<head[^>]*>|<\/head>|<body[^>]*>|<\/body>/gi, '')}

  <!-- Console interceptor -->
  <script>
  (function() {
      const originalConsole = {
          log: console.log,
          error: console.error,
          warn: console.warn,
          info: console.info
      };
      
      function sendMessageToParent(type, args, errorDetails) {
          window.parent.postMessage({
              source: 'playground-console',
              type: type,
              args: Array.from(args).map(arg => 
                  typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
              ).join(' '),
              errorDetails
          }, '*');
      }
      
      console.log = function() {
          sendMessageToParent('log', arguments);
          originalConsole.log.apply(console, arguments);
      };
      
      console.error = function() {
          sendMessageToParent('error', arguments);
          originalConsole.error.apply(console, arguments);
      };
      
      console.warn = function() {
          sendMessageToParent('warning', arguments);
          originalConsole.warn.apply(console, arguments);
      };
      
      console.info = function() {
          sendMessageToParent('info', arguments);
          originalConsole.info.apply(console, arguments);
      };
      
      window.onerror = function(message, filename, lineno, colno, error) {
          sendMessageToParent('error', [message + ' (Line: ' + lineno + ', Col: ' + colno + ')'], {
              message,
              filename,
              lineno,
              colno,
              stack: error ? error.stack : null
          });
          return true;
      };
  })();
  </script>

  <!-- Inject React if JSX is used -->
  ${jsxFiles.length > 0 ? `
  <script src="${CDN_LINKS.react}" crossorigin></script>
  <script src="${CDN_LINKS.reactDom}" crossorigin></script>
  <script>
  function checkReactLoaded() {
      if (window.React && window.ReactDOM) {
          initializeApp();
      } else {
          setTimeout(checkReactLoaded, 50);
      }
  }
  checkReactLoaded();
  </script>
  ` : ''}

  <!-- JavaScript execution -->
  <script>
  function initializeApp() {
      try {
          // Execute regular JavaScript
          ${jsContent}
          
          // Execute transpiled JSX
          ${jsxContent}
      } catch (error) {
          console.error('Runtime error:', error.message);
      }
  }
  
  // Initialize immediately if no JSX files exist
  if (${jsxFiles.length === 0}) {
      initializeApp();
  }
  </script>
</body>
</html>`;

      if (iframeRef.current) {
        // Set sandbox attributes to prevent access to parent window
        iframeRef.current.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin');
        iframeRef.current.srcdoc = sandboxHtml;
      }

      addConsoleLog("Preview updated successfully", "success");
    } catch (error) {
      setPreviewError(error.message);
      addConsoleLog(`Preview error: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  }, [files]);

  // Format code using Monaco's built-in formatter
  const formatCode = () => {
    if (!activeFile || !editorRef.current) return;

    try {
      addConsoleLog("Formatting code...", "info");
      
      // Use Monaco's built-in formatter
      editorRef.current.getAction('editor.action.formatDocument').run();
      
      addConsoleLog("Code formatted successfully", "success");
    } catch (error) {
      addConsoleLog(`Format error: ${error.message}`, "error");
    }
  };

  // Share playground by generating a shareable URL
  const sharePlayground = async () => {
    try {
      const playgroundState = {
        files,
        settings,
        layout: editorLayout,
      };

      // Here you would typically make an API call to save the state
      // and generate a shareable URL
      const encodedState = btoa(JSON.stringify(playgroundState));
      const shareableUrl = `${window.location.origin}/playground/${encodedState}`;

      setShareUrl(shareableUrl);
      await navigator.clipboard.writeText(shareableUrl);
      addConsoleLog("Share URL copied to clipboard!", "success");
    } catch (error) {
      addConsoleLog(`Failed to generate share URL: ${error.message}`, "error");
    }
  };

  // Download project as a ZIP file
  const downloadProject = () => {
    try {
      const zip = new JSZip();

      // Add files to the zip
      files.forEach((file) => {
        // Skip folders
        if (file.type === "folder") return;

        const filePath = file.path === "/" ? file.name : `${file.path}/${file.name}`;
        zip.file(filePath, file.content);
      });

      // Generate and download the zip file
      zip.generateAsync({ type: "blob" }).then((content) => {
        const url = window.URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = "playground-project.zip";
        a.click();
        window.URL.revokeObjectURL(url);

        addConsoleLog("Project downloaded successfully", "success");
      });
    } catch (error) {
      addConsoleLog(`Failed to download project: ${error.message}`, "error");
    }
  };

  // Toggle editor layout between horizontal and vertical
  const toggleEditorLayout = () => {
    setEditorLayout((prev) => (prev === "horizontal" ? "vertical" : "horizontal"));
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);

    // If switching to preview, update the preview
    if (tab === "preview") {
      updatePreview();
    }
  };

  // Add console log with timestamp
  const addConsoleLog = (message, type = "log") => {
    setConsoleOutput((prev) => [
      ...prev,
      {
        type,
        message,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  // Clear the console
  const clearConsole = () => {
    setConsoleOutput([]);
    setRuntimeErrors([]);
    addConsoleLog("Console cleared", "info");
  };

  // Toggle auto-save setting
  const toggleAutoSave = () => {
    setSettings(prev => ({
      ...prev,
      autoSave: !prev.autoSave
    }));
    addConsoleLog(`Auto-save ${!settings.autoSave ? 'enabled' : 'disabled'}`, "info");
  };

  // Render file tree with drag and drop support
  const renderFileTree = () => {
    const handleDragStart = (event, fileId) => {
      event.dataTransfer.setData("fileId", fileId);
    };

    const handleDragOver = (event) => {
      event.preventDefault();
    };

    const handleDrop = (event, targetId) => {
      event.preventDefault();
      const fileId = event.dataTransfer.getData("fileId");
      
      // If dropped on a folder, move the file into that folder
      if (targetId && fileId) {
        const targetFile = files.find(f => f.id === parseInt(targetId));
        const sourceFile = files.find(f => f.id === parseInt(fileId));
        
        if (targetFile && sourceFile && targetFile.type === 'folder') {
          setFiles(prev => prev.map(f => {
            if (f.id === parseInt(fileId)) {
              return { ...f, path: `/${targetFile.name}` };
            }
            return f;
          }));
          
          addConsoleLog(`Moved ${sourceFile.name} to ${targetFile.name}`, "info");
        }
      }
    };

    return (
      <>
        {files.map((file) => {
          if (file.type === "folder") {
            const isExpanded = expandedFolders[file.id];

            return (
              <div 
                key={file.id} 
                className={styles.fileTreeItem}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, file.id)}
              >
                <div 
                  className={styles.fileTreeItemHeader} 
                  onClick={() => toggleFolder(file.id)}
                  onContextMenu={(e) => handleContextMenu(e, file.id)}
                >
                  <span className={styles.fileTreeItemIcon}>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                  <span className={styles.fileTreeItemIcon}>
                    <Folder size={16} />
                  </span>
                  <span className={styles.fileTreeItemName}>{file.name}</span>
                </div>

                {isExpanded &&
                  file.children &&
                  file.children.map((childFile) => (
                    <div
                      key={childFile.id}
                      className={`${styles.fileItem} ${activeFile?.id === childFile.id ? styles.active : ""}`}
                      onClick={() => setActiveFile(childFile)}
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, childFile.id)}
                      onContextMenu={(e) => handleContextMenu(e, childFile.id)}
                    >
                      <div className={styles.fileItemContent}>
                        {getFileIcon(childFile.type)}
                        <span className={styles.fileName}>{childFile.name}</span>
                      </div>
                      <button
                        onClick={() => deleteFile(childFile.id)}
                        className={styles.fileDeleteButton}
                        title="Delete file"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
              </div>
            );
          } else {
            return (
              <div
                key={file.id}
                className={`${styles.fileItem} ${activeFile?.id === file.id ? styles.active : ""}`}
                draggable="true"
                onDragStart={(e) => handleDragStart(e, file.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, file.id)}
                onContextMenu={(e) => handleContextMenu(e, file.id)}
              >
                <div className={styles.fileItemContent} onClick={() => setActiveFile(file)}>
                  {getFileIcon(file.type)}
                  <span className={styles.fileName}>{file.name}</span>
                  {file.id.toString().startsWith('local_') && (
                    <span className={styles.unsavedBadge} title="Unsaved file">•</span>
                  )}
                </div>
                <button onClick={() => deleteFile(file.id)} className={styles.fileDeleteButton} title="Delete file">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          }
        })}
        
        {/* Context Menu */}
        {contextMenu.visible && (
          <div 
            className={styles.contextMenu} 
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction('rename')}>
              Rename
            </div>
            <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction('delete')}>
              Delete
            </div>
            <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction('duplicate')}>
              Duplicate
            </div>
            <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction('save')}>
              Save
            </div>
          </div>
        )}
      </>
    );
  };

  // Render package installer with enhanced search functionality
  const renderPackageInstaller = () => {
    return (
      <div className={styles.packageInstallerContainer}>
        <div className={styles.packageSearch}>
          <Search size={16} className={styles.packageSearchIcon} />
          <input
            type="text"
            value={packageSearch}
            onChange={(e) => setPackageSearch(e.target.value)}
            placeholder="Search npm packages..."
            className={styles.packageSearchInput}
          />
        </div>

        {/* Search Results */}
        {packageSearch.trim().length >= 2 && (
          <div className={styles.searchResults}>
            <h3 className={styles.packageSectionTitle}>
              Search Results {isSearching && <RefreshCw size={14} className={styles.spinning} />}
            </h3>
            
            {searchResults.length === 0 ? (
              isSearching ? (
                <div className={styles.emptyState}>Searching...</div>
              ) : (
                <div className={styles.emptyState}>No packages found</div>
              )
            ) : (
              <div className={styles.packageList}>
                {searchResults.map((pkg) => (
                  <div key={pkg.name} className={styles.packageItem}>
                    <div className={styles.packageInfo}>
                      <div className={styles.packageHeader}>
                        <span className={styles.packageName}>{pkg.name}</span>
                        <span className={styles.packageVersion}>{pkg.version}</span>
                        {pkg.links?.npm && (
                          <a 
                            href={pkg.links.npm} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={styles.packageLink}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      <p className={styles.packageDescription}>{pkg.description}</p>
                      {pkg.keywords && pkg.keywords.length > 0 && (
                        <div className={styles.packageTags}>
                          {pkg.keywords.slice(0, 3).map(keyword => (
                            <span key={keyword} className={styles.packageTag}>{keyword}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={styles.packageActions}>
                      <button
                        onClick={() => installPackage(pkg.name, pkg.version, "dependency")}
                        className={styles.packageInstallButton}
                        disabled={isInstallingPackage}
                      >
                        {isInstallingPackage ? <RefreshCw size={14} className={styles.spinning} /> : <Plus size={14} />}
                        Install
                      </button>
                      <button
                        onClick={() => installPackage(pkg.name, pkg.version, "devDependency")}
                        className={styles.packageDevInstallButton}
                        disabled={isInstallingPackage}
                        title="Install as dev dependency"
                      >
                        Dev
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Popular Packages */}
        <div className={styles.popularPackages}>
          <h3 className={styles.packageSectionTitle}>Popular Packages</h3>
          <div className={styles.packageList}>
            {POPULAR_PACKAGES.filter(
              (pkg) =>
                packageSearch === "" ||
                pkg.name.toLowerCase().includes(packageSearch.toLowerCase()) ||
                pkg.description.toLowerCase().includes(packageSearch.toLowerCase()),
            ).map((pkg) => (
              <div key={pkg.name} className={styles.packageItem}>
                <div className={styles.packageInfo}>
                  <div className={styles.packageHeader}>
                    <span className={styles.packageName}>{pkg.name}</span>
                    <span className={styles.packageVersion}>{pkg.version}</span>
                  </div>
                  <p className={styles.packageDescription}>{pkg.description}</p>
                </div>
                <div className={styles.packageActions}>
                  <button
                    onClick={() => installPackage(pkg.name, pkg.version)}
                    className={styles.packageInstallButton}
                    disabled={isInstallingPackage}
                  >
                    {isInstallingPackage ? <RefreshCw size={14} className={styles.spinning} /> : <Plus size={14} />}
                    Install
                  </button>
                  <button
                    onClick={() => installPackage(pkg.name, pkg.version, "devDependency")}
                    className={styles.packageDevInstallButton}
                    disabled={isInstallingPackage}
                    title="Install as dev dependency"
                  >
                    Dev
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Installed Packages */}
        <div className={styles.installedPackages}>
          <h3 className={styles.packageSectionTitle}>Installed Packages</h3>
          {packages.length === 0 ? (
            <div className={styles.emptyState}>
              <Package size={24} />
              <p>No packages installed</p>
            </div>
          ) : (
            <div className={styles.installedPackageList}>
              {packages.map((pkg) => (
                <div key={pkg.name} className={styles.installedPackageItem}>
                  <div className={styles.installedPackageInfo}>
                    <span className={styles.installedPackageName}>{pkg.name}</span>
                    <span className={styles.installedPackageVersion}>{pkg.version}</span>
                    <span className={`${styles.packageType} ${styles[pkg.type]}`}>
                      {pkg.type === "dependency" ? "Dependency" : "Dev Dependency"}
                    </span>
                  </div>
                  <button
                    onClick={() => uninstallPackage(pkg.name)}
                    className={styles.packageUninstallButton}
                    disabled={isInstallingPackage}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render terminal
  const renderTerminal = () => {
    return (
      <div className={styles.terminalContainer}>
        <div className={styles.terminalOutput}>
          {terminalHistory.length === 0 ? (
            <div className={styles.terminalWelcome}>
              <p>Welcome to the Playground Terminal</p>
              <p>Type 'help' to see available commands</p>
            </div>
          ) : (
            terminalHistory.map((entry, index) => (
              <div key={index} className={`${styles.terminalEntry} ${styles[entry.type]}`}>
                {entry.type === "command" ? (
                  <div className={styles.terminalCommand}>
                    <span className={styles.terminalPrompt}>$</span>
                    <span className={styles.terminalCommandText}>{entry.content}</span>
                  </div>
                ) : (
                  <div className={styles.terminalOutput}>{entry.content}</div>
                )}
              </div>
            ))
          )}
        </div>
        <form onSubmit={handleTerminalSubmit} className={styles.terminalForm}>
          <span className={styles.terminalPrompt}>$</span>
          <input
            ref={terminalInputRef}
            type="text"
            value={terminalInput}
            onChange={(e) => setTerminalInput(e.target.value)}
            className={styles.terminalInput}
            placeholder="Type a command..."
          />
        </form>
      </div>
    );
  };

  // Render error panel with detailed error information
  const renderErrorPanel = () => {
    const allErrors = [...syntaxErrors, ...runtimeErrors];

    if (allErrors.length === 0) {
      return (
        <div className={styles.emptyErrorPanel}>
          <Info size={24} />
          <p>No errors to display</p>
        </div>
      );
    }

    return (
      <div className={styles.errorPanel}>
        {allErrors.map((error, index) => (
          <div
            key={index}
            className={styles.errorItem}
            onClick={() => {
              // Find the file and set it as active
              const file = files.find((f) => f.name === error.source || f.path + "/" + f.name === error.filename);
              if (file) {
                setActiveFile(file);
                setActiveTab("editor");
                
                // Jump to error line in Monaco editor
                if (editorRef.current) {
                  editorRef.current.revealLineInCenter(error.line);
                  editorRef.current.setPosition({
                    lineNumber: error.line,
                    column: error.column || 1
                  });
                  editorRef.current.focus();
                }
              }
            }}
          >
            <div className={styles.errorHeader}>
              <AlertCircle size={16} className={styles.errorIcon} />
              <span className={styles.errorMessage}>{error.message}</span>
            </div>
            <div className={styles.errorLocation}>
              {error.source || error.filename || "Unknown file"}:{error.line}:{error.column || 0}
            </div>
            {error.stack && <pre className={styles.errorStack}>{error.stack}</pre>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`${styles.playgroundContainer} ${styles[theme]}`}>
      {/* Header */}
      <div className={styles.playgroundHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.playgroundTitle}>Playground</h1>
          <div className={styles.headerTabs}>
            <a href="/" className={styles.tabButton} style={{ textDecoration: "none" }}>
              <Home size={16} /> {/* Home Icon */}
              <span className="font-semibold">Home</span>
            </a>
            <button
              className={`${styles.tabButton} ${activeTab === "editor" ? styles.active : ""}`}
              onClick={() => handleTabChange("editor")}
            >
              <Code size={14} />
              <span>Editor</span>
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === "preview" ? styles.active : ""}`}
              onClick={() => handleTabChange("preview")}
            >
              <Eye size={14} />
              <span>Preview</span>
            </button>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button 
            onClick={saveCurrentFile} 
            className={`${styles.iconButton} ${isSaving ? styles.processing : ""} ${saveStatus ? styles[saveStatus] : ""}`} 
            title="Save current file (Ctrl+S)"
            disabled={isSaving || !activeFile}
          >
            <Save size={16} />
          </button>
          <button 
            onClick={saveAllFiles} 
            className={`${styles.iconButton} ${isSaving ? styles.processing : ""}`} 
            title="Save all files"
            disabled={isSaving || files.length === 0}
          >
            <Database size={16} />
          </button>
          <button onClick={sharePlayground} className={styles.iconButton} title="Share Playground">
            <Share size={16} />
          </button>
          <button onClick={downloadProject} className={styles.iconButton} title="Download Project">
            <Download size={16} />
          </button>
          <button
            onClick={toggleTheme}
            className={styles.iconButton}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button
            onClick={toggleEditorLayout}
            className={styles.iconButton}
            title={`Switch to ${editorLayout === "horizontal" ? "vertical" : "horizontal"} layout`}
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`${styles.mainContent} ${editorLayout}`}>
        {/* Sidebar */}
        {isSidebarOpen && (
          <div className={styles.sidebar}>
            <div className={styles.sidebarTabs}>
              <button
                className={`${styles.sidebarTab} ${activeSidebarTab === "files" ? styles.active : ""}`}
                onClick={() => setActiveSidebarTab("files")}
                title="Files"
              >
                <FileText size={16} />
              </button>
              <button
                className={`${styles.sidebarTab} ${activeSidebarTab === "packages" ? styles.active : ""}`}
                onClick={() => setActiveSidebarTab("packages")}
                title="Packages"
              >
                <Package size={16} />
              </button>
            </div>

            <div className={styles.sidebarContent}>
              {/* Files Panel */}
              {activeSidebarTab === "files" && (
                <div className={styles.filesPanel}>
                  <div className={styles.fileManagerHeader}>
                    <span className={styles.fileManagerTitle}>Files</span>
                    <div className={styles.fileManagerActions}>
                      <button
                        onClick={() => setFileViewMode(fileViewMode === "tree" ? "list" : "tree")}
                        className={styles.iconButton}
                        title={fileViewMode === "tree" ? "List View" : "Tree View"}
                      >
                        {fileViewMode === "tree" ? <List size={16} /> : <Layers size={16} />}
                      </button>
                      <button
                        onClick={() => setIsCreatingFile(true)}
                        className={styles.iconButton}
                        title="Create new file"
                      >
                        <Plus size={16} />
                      </button>
                      <button onClick={createNewFolder} className={styles.iconButton} title="Create new folder">
                        <Folder size={16} />
                      </button>
                      <button
                        onClick={() => loadUserFiles()}
                        className={`${styles.iconButton} ${isLoading ? styles.processing : ""}`}
                        title="Reload files from server"
                        disabled={isLoading}
                      >
                        <Upload size={16} />
                      </button>
                      <button
                        onClick={() => setIsSidebarOpen(false)}
                        className={styles.iconButton}
                        title="Close sidebar"
                      >
                        <ChevronLeft size={16} />
                      </button>
                    </div>
                  </div>

                  {/* New File Form */}
                  {isCreatingFile && (
                    <div className={styles.newFileForm}>
                      <input
                        type="text"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        placeholder="File name"
                        className={styles.newFileInput}
                        autoFocus
                      />
                      <select
                        value={newFileType}
                        onChange={(e) => setNewFileType(e.target.value)}
                        className={styles.newFileSelect}
                      >
                        <option value="html">HTML</option>
                        <option value="css">CSS</option>
                        <option value="javascript">JavaScript</option>
                        <option value="jsx">JSX</option>
                        <option value="json">JSON</option>
                      </select>
                      <div className={styles.newFileActions}>
                        <button onClick={createNewFile} className={styles.newFileButton}>
                          Create
                        </button>
                        <button onClick={() => setIsCreatingFile(false)} className={styles.newFileButton}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* File List */}
                  <div className={styles.fileList}>{renderFileTree()}</div>
                </div>
              )}

              {/* Packages Panel */}
              {activeSidebarTab === "packages" && (
                <div className={styles.packagesPanel}>{renderPackageInstaller()}</div>
              )}
            </div>
          </div>
        )}

        {/* Editor Section */}
        <div className={`${styles.editorSection} ${activeTab === "editor" ? styles.visible : styles.hidden}`}>
          <div className={styles.editorHeader}>
            <div className={styles.editorFileInfo}>
              {!isSidebarOpen && (
                <button onClick={() => setIsSidebarOpen(true)} className={styles.iconButton} title="Open sidebar">
                  <ChevronRight size={16} />
                </button>
              )}
              <span className={styles.editorFileName}>{activeFile?.name || "Untitled"}</span>
              <span className={styles.editorFileType}>{activeFile?.type || ""}</span>

              {/* Show error count if there are syntax errors */}
              {syntaxErrors.length > 0 && (
                <span className={styles.errorCount} title={`${syntaxErrors.length} error(s) found`}>
                  <AlertCircle size={14} />
                  {syntaxErrors.length}
                </span>
              )}
              
              {/* Show unsaved indicator */}
              {activeFile && activeFile.id.toString().startsWith('local_') && (
                <span className={styles.unsavedIndicator} title="Unsaved file">
                  Unsaved
                </span>
              )}
            </div>
            <div className={styles.editorActions}>
              <button 
                onClick={toggleAutoSave} 
                className={`${styles.iconButton} ${settings.autoSave ? styles.active : ""}`} 
                title={settings.autoSave ? "Disable auto-save" : "Enable auto-save"}
              >
                <Save size={16} />
                <span className={styles.actionLabel}>Auto</span>
              </button>
              <button onClick={formatCode} className={styles.iconButton} title="Format code">
                <Code size={16} />
              </button>
              <button
                onClick={() => setShowLineNumbers(!showLineNumbers)}
                className={styles.iconButton}
                title={showLineNumbers ? "Hide line numbers" : "Show line numbers"}
              >
                {showLineNumbers ? "#" : "1"}
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className={styles.monacoEditorContainer}>
            {activeFile ? (
              <Editor
                height="100%"
                language={getLanguageId(activeFile.type)}
                value={activeFile.content}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                theme={theme === "dark" ? "vs-dark" : "vs-light"}
                options={{
                  fontSize: settings.fontSize,
                  tabSize: settings.tabSize,
                  wordWrap: settings.wordWrap ? "on" : "off",
                  minimap: { enabled: settings.minimap },
                  renderIndentGuides: settings.indentGuides,
                  autoClosingBrackets: settings.autoClosingBrackets ? "always" : "never",
                  renderLineHighlight: settings.highlightActiveLine ? "all" : "none",
                  lineNumbers: showLineNumbers ? "on" : "off",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  contextmenu: true,
                  quickSuggestions: settings.autoComplete,
                  suggestOnTriggerCharacters: settings.autoComplete,
                  folding: true,
                  foldingStrategy: "auto",
                  matchBrackets: "always",
                  scrollbar: {
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10,
                    alwaysConsumeMouseWheel: false
                  }
                }}
              />
            ) : (
              <div className={styles.noFileSelected}>
                <p>No file selected</p>
                <button onClick={() => setIsCreatingFile(true)} className={styles.createFileButton}>
                  Create a new file
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Preview Section */}
        <div
          className={`${styles.previewSection} ${
            isFullScreen ? styles.fullScreen : ""
          } ${activeTab === "preview" ? styles.visible : styles.hidden}`}
        >
          {/* Preview Header (Visible in Fullscreen Mode) */}
          <div className={styles.previewHeader}>
            <span className={styles.previewTitle}>Preview</span>
            <div className={styles.previewActions}>
              <button
                onClick={updatePreview}
                className={`${styles.iconButton} ${isProcessing ? styles.processing : ""}`}
                disabled={isProcessing}
                title="Run code"
              >
                <Play size={16} />
              </button>
              <button
                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                className={`${styles.iconButton} ${isAutoRefresh ? styles.active : ""}`}
                title={isAutoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"}
              >
                <RefreshCw size={16} className={isAutoRefresh ? styles.spinning : ""} />
              </button>
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className={styles.iconButton}
                title={isFullScreen ? "Exit full screen" : "Full screen"}
              >
                {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
          </div>

          {/* Full-Screen Preview Content */}
          <div className={`${styles.previewContent} ${isFullScreen ? styles.fullScreenContent : ""}`}>
            {previewError ? (
              <div className={styles.previewError}>
                <h3>Preview Error</h3>
                <pre>{previewError}</pre>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                title="preview"
                className={`${styles.previewFrame} ${isFullScreen ? styles.fullScreenFrame : ""}`}
                sandbox="allow-scripts allow-forms allow-same-origin"
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Panel */}
      <div className={`${styles.bottomPanel} ${isBottomPanelOpen ? "" : styles.collapsed}`}>
        <div className={styles.bottomPanelHeader}>
          <div className={styles.bottomPanelTabs}>
            <button
              className={`${styles.bottomPanelTab} ${activeBottomTab === "console" ? styles.active : ""}`}
              onClick={() => setActiveBottomTab("console")}
            >
              <Terminal size={14} />
              <span>Console</span>
              {consoleOutput.filter((log) => log.type === "error").length > 0 && (
                <span className={styles.tabBadge}>{consoleOutput.filter((log) => log.type === "error").length}</span>
              )}
            </button>
            <button
              className={`${styles.bottomPanelTab} ${activeBottomTab === "terminal" ? styles.active : ""}`}
              onClick={() => setActiveBottomTab("terminal")}
            >
              <Code size={14} />
              <span>Terminal</span>
            </button>
            <button
              className={`${styles.bottomPanelTab} ${activeBottomTab === "problems" ? styles.active : ""}`}
              onClick={() => setActiveBottomTab("problems")}
            >
              <AlertCircle size={14} />
              <span>Problems</span>
              {syntaxErrors.length + runtimeErrors.length > 0 && (
                <span className={styles.tabBadge}>{syntaxErrors.length + runtimeErrors.length}</span>
              )}
            </button>
          </div>
          <div className={styles.bottomPanelActions}>
            {activeBottomTab === "console" && (
              <button onClick={clearConsole} className={styles.iconButton} title="Clear console">
                Clear
              </button>
            )}
            <button
              onClick={() => setIsBottomPanelOpen(!isBottomPanelOpen)}
              className={styles.iconButton}
              title={isBottomPanelOpen ? "Collapse panel" : "Expand panel"}
            >
              {isBottomPanelOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>

        {isBottomPanelOpen && (
          <div className={styles.bottomPanelContent}>
            {/* Console Panel */}
            {activeBottomTab === "console" && (
              <div className={styles.consolePanel}>
                {consoleOutput.length === 0 ? (
                  <div className={styles.emptyConsole}>
                    <p>No console output yet</p>
                  </div>
                ) : (
                  consoleOutput.map((log, index) => (
                    <div key={index} className={`${styles.output} ${styles[log.type]}`}>
                      <span className={styles.timestamp}>[{log.timestamp}]</span>
                      <span className={`${styles.logMessage} ${styles[log.type]}`}>{log.message}</span>
                    </div>
                  ))
                )}
                <div ref={consoleEndRef} />
              </div>
            )}

            {/* Terminal Panel */}
            {activeBottomTab === "terminal" && <div className={styles.terminalPanel}>{renderTerminal()}</div>}

            {/* Problems Panel */}
            {activeBottomTab === "problems" && <div className={styles.problemsPanel}>{renderErrorPanel()}</div>}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          {activeFile && (
            <>
              <span className={styles.statusItem}>{activeFile.type.toUpperCase()}</span>
              <span className={styles.statusItem}>
                {activeFile.path === "/" ? activeFile.name : `${activeFile.path}/${activeFile.name}`}
              </span>
              {syntaxErrors.length > 0 && (
                <span className={styles.statusError}>
                  {syntaxErrors.length} error{syntaxErrors.length !== 1 ? "s" : ""}
                </span>
              )}
              {saveStatus === "saved" && (
                <span className={styles.statusSuccess}>Saved</span>
              )}
              {saveStatus === "saving" && (
                <span className={styles.statusInfo}>Saving...</span>
              )}
              {saveStatus === "error" && (
                <span className={styles.statusError}>Save failed</span>
              )}
            </>
          )}
        </div>
        <div className={styles.statusRight}>
          <span className={styles.statusItem}>{theme === "light" ? "Light Mode" : "Dark Mode"}</span>
          <span className={styles.statusItem}>{isAutoRefresh ? "Auto-refresh: On" : "Auto-refresh: Off"}</span>
          <span className={styles.statusItem}>{settings.autoSave ? "Auto-save: On" : "Auto-save: Off"}</span>
          <span className={styles.statusItem}>
            <Coffee size={14} className={styles.statusIcon} />
            Ready
          </span>
        </div>
      </div>
    </div>
  );
}

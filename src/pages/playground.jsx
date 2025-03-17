"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  RefreshCw,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Play,
  Download,
  Share,
  Settings,
  Plus,
  Trash2,
  Code,
  Terminal,
  Maximize2,
  Minimize2,
  FileText,
  FileCode,
  FileCodeIcon as FileCss,
  FileIcon as FileHtml,
  Eye,
  Home,
  Package,
  Search,
  AlertCircle,
  Info,
  Layers,
  List,
  Coffee,
  Folder,
} from "lucide-react"
import Prism from "prismjs"
import "prismjs/components/prism-markup"
import "prismjs/components/prism-css"
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-jsx"
import "prismjs/components/prism-typescript"
import "prismjs/components/prism-tsx"
import "prismjs/components/prism-json"
import "prismjs/themes/prism-tomorrow.css" // Using a better theme for syntax highlighting
import * as Babel from "@babel/standalone"
import JSZip from "jszip"
import styles from "../styles/playground.module.css"
import ErrorBoundary from '../components/ErrorBoundary'
import * as monaco from 'monaco-editor'

/**
 * Default templates for different file types
 * These provide starter code for users creating new files
 */
const DEFAULT_TEMPLATES = {
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Playground</title>
  <!-- CSS file reference -->
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app"></div>
  <!-- JavaScript file reference -->
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

  tsx: `// React TypeScript code
import React, { useState } from 'react';
import ReactDOM from 'react-dom';

// Define types for props
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

// Button component with TypeScript
const Button: React.FC<ButtonProps> = ({ 
  onClick, 
  children, 
  variant = 'primary' 
}) => (
  <button 
    onClick={onClick}
    style={{
      padding: '0.5rem 1rem',
      backgroundColor: variant === 'primary' ? '#0070f3' : '#f5f5f5',
      color: variant === 'primary' ? 'white' : '#333',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    }}
  >
    {children}
  </button>
);

// Define types for App props
interface AppProps {
  title?: string;
}

// Main App component with TypeScript
const App: React.FC<AppProps> = ({ title = "TypeScript React Playground" }) => {
  const [count, setCount] = useState<number>(0);
  
  return (
    <div className="app">
      <h1>{title}</h1>
      <p>Count: {count}</p>
      <Button onClick={() => setCount(count + 1)}>
        Increment
      </Button>
      <Button variant="secondary" onClick={() => setCount(0)}>
        Reset
      </Button>
    </div>
  );
};

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
    "typescript": "^5.0.4",
    "eslint": "^8.38.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}`,
}

/**
 * CDN links for React and other libraries
 * These are injected into the preview iframe when needed
 */
const CDN_LINKS = {
  react: "https://unpkg.com/react@18/umd/react.development.js",
  reactDom: "https://unpkg.com/react-dom@18/umd/react-dom.development.js",
  babel: "https://unpkg.com/@babel/standalone/babel.min.js",
}

/**
 * Popular npm packages for quick installation
 * These are shown in the package installer section
 */
const POPULAR_PACKAGES = [
  { name: "react", version: "18.2.0", description: "A JavaScript library for building user interfaces." },
  { name: "react-dom", version: "18.2.0", description: "React package for working with the DOM." },
  {
    name: "lodash",
    version: "4.17.21",
    description: "A modern JavaScript utility library delivering modularity, performance & extras.",
  },
  { name: "axios", version: "1.4.0", description: "Promise based HTTP client for the browser and node.js" },
  {
    name: "tailwindcss",
    version: "3.3.2",
    description: "A utility-first CSS framework for rapidly building custom designs.",
  },
  { name: "typescript", version: "5.0.4", description: "TypeScript is a language for application-scale JavaScript." },
  { name: "next", version: "13.4.4", description: "The React Framework for Production" },
  { name: "express", version: "4.18.2", description: "Fast, unopinionated, minimalist web framework for node." },
  {
    name: "mongoose",
    version: "7.2.2",
    description: "MongoDB object modeling designed to work in an asynchronous environment.",
  },
  { name: "redux", version: "4.2.1", description: "Predictable state container for JavaScript apps" },
]

/**
 * Playground Component - An interactive code editor and preview environment
 *
 * Features:
 * - Multi-file support with file management
 * - Syntax highlighting for HTML, CSS, JavaScript, JSX, and TSX
 * - Line numbers with error indicators
 * - Live preview with auto-refresh
 * - Console output for debugging
 * - Package installation interface
 * - Dark/light theme toggle
 * - Project export and sharing
 */
export default function Playground() {
  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================

  // UI Configuration
  const [theme, setTheme] = useState("light")
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)
  const [activeTab, setActiveTab] = useState("editor") // 'editor' or 'preview'
  const [editorLayout, setEditorLayout] = useState("horizontal") // 'horizontal' or 'vertical'
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewError, setPreviewError] = useState(null)
  const [shareUrl, setShareUrl] = useState("")
  const [activeSidebarTab, setActiveSidebarTab] = useState("files") // 'files', 'packages'
  const [fileViewMode, setFileViewMode] = useState("tree") // 'tree' or 'list'

  // File Management
  const [isCreatingFile, setIsCreatingFile] = useState(false)
  const [newFileName, setNewFileName] = useState("")
  const [newFileType, setNewFileType] = useState("javascript")
  const [files, setFiles] = useState([])
  const [activeFile, setActiveFile] = useState(null)
  const [expandedFolders, setExpandedFolders] = useState({})

  // Package Management
  const [packages, setPackages] = useState([])
  const [packageSearch, setPackageSearch] = useState("")
  const [isInstallingPackage, setIsInstallingPackage] = useState(false)

  // Console and Terminal
  const [consoleOutput, setConsoleOutput] = useState([])
  const [isConsoleOpen, setIsConsoleOpen] = useState(true)
  const [activeBottomTab, setActiveBottomTab] = useState("console") // 'console', 'terminal'
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true)
  const [terminalInput, setTerminalInput] = useState("")
  const [terminalHistory, setTerminalHistory] = useState([])

  // Error Tracking
  const [syntaxErrors, setSyntaxErrors] = useState([])
  const [runtimeErrors, setRuntimeErrors] = useState([])

  // Editor Settings
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
  })

  // Refs
  const editorRef = useRef(null)
  const editorWrapperRef = useRef(null)
  const iframeRef = useRef(null)
  const consoleEndRef = useRef(null)
  const terminalInputRef = useRef(null)
  const highlightedCodeRef = useRef(null)
  const lineNumbersRef = useRef(null)

  /**
   * Add a log message to the console
   */
  const addConsoleLog = (message, type = "log") => {
    setConsoleOutput((prev) => [
      ...prev,
      {
        type,
        message,
        timestamp: new Date().toLocaleTimeString(),
      },
    ])
  }

  /**
   * Update the preview iframe with the current code
   */
  const updatePreview = useCallback(async () => {
    try {
      setIsProcessing(true)
      setPreviewError(null)
      setRuntimeErrors([])

      // Get HTML file content
      const htmlFile = files.find((f) => f.name.endsWith(".html"))
      const htmlContent = htmlFile?.content || DEFAULT_TEMPLATES.html

      // Process and inject CSS
      const cssFiles = files.filter((f) => f.name.endsWith(".css"))
      const cssContent = cssFiles.map((f) => f.content).join("\n")

      // Process and inject JavaScript/JSX/TSX
      const jsFiles = files.filter((f) => f.name.endsWith(".js"))
      const jsxFiles = files.filter((f) => f.name.endsWith(".jsx") || f.name.endsWith(".tsx"))

      // Regular JS content
      const jsContent = jsFiles.map((f) => f.content).join("\n")

      // JSX content needs to be transpiled
      let jsxContent = ""
      try {
        // Check if we have JSX files
        if (jsxFiles.length > 0) {
          // Transpile each JSX file
          for (const file of jsxFiles) {
            try {
              const transpiled = Babel.transform(file.content, {
                presets: ["react"],
                filename: file.name, // Add filename for better error messages
              }).code

              jsxContent += `
// File: ${file.name}
${transpiled}
`
            } catch (error) {
              throw new Error(`Error transpiling ${file.name}: ${error.message}`)
            }
          }
        }
      } catch (error) {
        setPreviewError(`JSX Transpilation Error: ${error.message}`)
        addConsoleLog(`JSX Transpilation Error: ${error.message}`, "error")
        setIsProcessing(false)
        return
      }

      // Create a new HTML document
      const doc = new DOMParser().parseFromString(htmlContent, "text/html")

      // Add CSS
      const style = doc.createElement("style")
      style.textContent = cssContent
      doc.head.appendChild(style)

      // Add React and Babel if JSX files exist
      if (jsxFiles.length > 0) {
        // Add React
        const reactScript = doc.createElement("script")
        reactScript.src = CDN_LINKS.react
        reactScript.crossOrigin = "anonymous"
        doc.head.appendChild(reactScript)

        // Add ReactDOM
        const reactDomScript = doc.createElement("script")
        reactDomScript.src = CDN_LINKS.reactDom
        reactDomScript.crossOrigin = "anonymous"
        doc.head.appendChild(reactDomScript)

        // Wait for React to load before executing JSX
        const waitForReactScript = doc.createElement("script")
        waitForReactScript.textContent = `
        // Wait for React to load
        function checkReactLoaded() {
          if (window.React && window.ReactDOM) {
            initializeApp();
          } else {
            setTimeout(checkReactLoaded, 50);
          }
        }
        checkReactLoaded();
      `
        doc.head.appendChild(waitForReactScript)
      }

      // Add JS with error handling
      const script = doc.createElement("script")
      script.textContent = `
      // Capture console logs and errors
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
      
      function initializeApp() {
        try {
          // Regular JavaScript
          ${jsContent}
          
          // Transpiled JSX
          ${jsxContent}
        } catch (error) {
          console.error('Runtime error:', error.message);
        }
      }
      
      // If no JSX files, initialize immediately
      if (${jsxFiles.length === 0}) {
        initializeApp();
      }
    `
      doc.body.appendChild(script)

      // Set the processed HTML
      const finalHtml = doc.documentElement.outerHTML

      // Update the iframe
      if (iframeRef.current) {
        iframeRef.current.srcdoc = finalHtml
      }

      addConsoleLog("Preview updated successfully", "success")
    } catch (error) {
      setPreviewError(error.message)
      addConsoleLog(`Preview error: ${error.message}`, "error")
    } finally {
      setIsProcessing(false)
    }
  }, [files])

  // =========================================================================
  // INITIALIZATION AND EFFECTS
  // =========================================================================

  /**
   * Initialize the playground with default files
   */
  useEffect(() => {
    // Create default files for a new playground
    const defaultFiles = [
      { id: 1, name: "index.html", type: "html", content: DEFAULT_TEMPLATES.html, path: "/" },
      { id: 2, name: "styles.css", type: "css", content: DEFAULT_TEMPLATES.css, path: "/" },
      { id: 3, name: "script.js", type: "javascript", content: DEFAULT_TEMPLATES.javascript, path: "/" },
      { id: 4, name: "package.json", type: "json", content: DEFAULT_TEMPLATES.json, path: "/" },
    ]
    setFiles(defaultFiles)
    setActiveFile(defaultFiles[0])

    // Initialize packages from package.json
    try {
      const packageJson = JSON.parse(DEFAULT_TEMPLATES.json)
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
      ]
      setPackages(initialPackages)
    } catch (error) {
      console.error("Error parsing package.json:", error)
    }

    // Add welcome message to console
    addConsoleLog("Playground initialized. Ready to code!", "info")
  }, [])

  /**
   * Auto-scroll console to bottom when new logs are added
   */
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [consoleOutput])

  /**
   * Update preview when code changes and auto-refresh is enabled
   */
  useEffect(() => {
    if (!isAutoRefresh || !activeFile) return

    const timer = setTimeout(() => {
      updatePreview()
    }, 1000)

    return () => clearTimeout(timer)
  }, [files, isAutoRefresh, activeFile, updatePreview])

  // Add the handleTabChange function to the component
  /**
   * Handle tab changes between editor and preview
   */
  const handleTabChange = (tab) => {
    setActiveTab(tab)

    // If switching to preview, update the preview
    if (tab === "preview") {
      updatePreview()
    }
  }

  // Optimize the syntax highlighting implementation
  /**
   * Apply syntax highlighting to the active file
   */
  useEffect(() => {
    if (!activeFile || !editorRef.current || !highlightedCodeRef.current) return

    // Check for syntax errors
    validateSyntax(activeFile)

    // Apply syntax highlighting
    try {
      const language = getLanguage(activeFile.type)
      const highlightedCode = Prism.highlight(activeFile.content || "", language, activeFile.type)

      highlightedCodeRef.current.innerHTML = highlightedCode

      // Sync scroll position between editor and highlighted code
      const syncScroll = () => {
        if (highlightedCodeRef.current && editorRef.current) {
          highlightedCodeRef.current.scrollTop = editorRef.current.scrollTop
          highlightedCodeRef.current.scrollLeft = editorRef.current.scrollLeft

          if (lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = editorRef.current.scrollTop
          }
        }
      }

      editorRef.current.addEventListener("scroll", syncScroll)
      return () => {
        if (editorRef.current) {
          editorRef.current.removeEventListener("scroll", syncScroll)
        }
      }
    } catch (error) {
      console.error("Error applying syntax highlighting:", error)
    }
  }, [activeFile, syntaxErrors])

  /**
   * Listen for console messages from the iframe
   */
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.source === "playground-console") {
        if (event.data.type === "error" && event.data.errorDetails) {
          // Handle detailed error information
          const { message, filename, lineno, colno, stack } = event.data.errorDetails

          // Add to runtime errors
          setRuntimeErrors((prev) => [
            ...prev,
            {
              message,
              filename,
              line: lineno,
              column: colno,
              stack,
            },
          ])

          // Format error message for console
          const formattedMessage = `${message} (${filename}:${lineno}:${colno})`
          addConsoleLog(formattedMessage, "error")
        } else {
          // Handle regular console logs
          addConsoleLog(event.data.args, event.data.type)
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  // =========================================================================
  // UTILITY FUNCTIONS
  // =========================================================================

  /**
   * Toggle between light and dark theme
   */
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    document.documentElement.setAttribute("data-theme", newTheme)
  }

  /**
   * Get the appropriate language for syntax highlighting based on file type
   */
  const getLanguage = (fileType) => {
    switch (fileType) {
      case "html":
        return Prism.languages.html
      case "css":
        return Prism.languages.css
      case "javascript":
        return Prism.languages.javascript
      case "jsx":
        return Prism.languages.jsx
      case "tsx":
      case "typescript":
        return Prism.languages.typescript
      case "json":
        return Prism.languages.json
      default:
        return Prism.languages.javascript
    }
  }

  /**
   * Get the appropriate file icon based on file type
   */
  const getFileIcon = (fileType) => {
    switch (fileType) {
      case "html":
        return <FileHtml size={16} />
      case "css":
        return <FileCss size={16} />
      case "javascript":
        return <FileCode size={16} />
      case "jsx":
        return <FileCode size={16} />
      case "tsx":
      case "typescript":
        return <FileCode size={16} />
      case "json":
        return <FileCode size={16} />
      default:
        return <FileText size={16} />
    }
  }

  /**
   * Create line numbers for the code editor
   * Includes error indicators for lines with syntax errors
   */
  const getLineNumbers = (content) => {
    if (!content) return "1"
    const lines = content.split("\n")

    // Map each line number, adding error indicators if needed
    return lines
      .map((_, i) => {
        const lineNum = i + 1
        const hasError = syntaxErrors.some((err) => err.line === lineNum)
        return `${hasError ? "⚠️ " : ""}${lineNum}`
      })
      .join("\n")
  }

  /**
   * Validate syntax of the current file
   * This is a simplified version - a real implementation would use a proper parser
   */
  const validateSyntax = (file) => {
    if (!file || !file.content) {
      setSyntaxErrors([])
      return
    }

    const errors = []
    const lines = file.content.split("\n")

    // Simple syntax validation based on file type
    switch (file.type) {
      case "javascript":
      case "jsx":
        try {
          // For JSX, try to transpile with Babel
          if (file.type === "jsx") {
            Babel.transform(file.content, {
              presets: ["react"],
            })
          } else {
            // For regular JS, use Function constructor to check syntax
            new Function(file.content)
          }
        } catch (e) {
          // Extract line and column from error message
          const lineMatch = e.message.match(/$$(\d+):(\d+)$$/)
          let line = 1
          let column = 1

          if (lineMatch) {
            line = Number.parseInt(lineMatch[1])
            column = Number.parseInt(lineMatch[2])
          }

          errors.push({
            message: e.message,
            line,
            column,
            severity: "error",
            source: file.name,
          })
        }
        break

      case "html":
        // Check for unclosed tags
        const tagStack = []
        const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)(?: [^>]*)?>/g
        let match
        const content = file.content
        let lastIndex = 0
        let lineCount = 1

        while ((match = tagRegex.exec(content)) !== null) {
          // Count lines up to this match
          lineCount += (content.substring(lastIndex, match.index).match(/\n/g) || []).length
          lastIndex = match.index

          const fullTag = match[0]
          const tagName = match[1].toLowerCase()

          // Skip self-closing tags
          if (fullTag.endsWith("/>") || ["meta", "link", "img", "br", "hr", "input"].includes(tagName)) {
            continue
          }

          if (fullTag.startsWith("</")) {
            // Closing tag
            if (tagStack.length === 0 || tagStack[tagStack.length - 1].name !== tagName) {
              errors.push({
                message: `Unexpected closing tag: '${tagName}'`,
                line: lineCount,
                column: match.index - lastIndex + 1,
                severity: "error",
                source: file.name,
              })
            } else {
              tagStack.pop()
            }
          } else {
            // Opening tag
            tagStack.push({ name: tagName, line: lineCount })
          }
        }

        // Check for unclosed tags at the end
        tagStack.forEach((tag) => {
          errors.push({
            message: `Unclosed tag: '${tag.name}'`,
            line: tag.line,
            column: 1,
            severity: "error",
            source: file.name,
          })
        })
        break

      case "css":
        // Check for unclosed braces
        let braces = 0

        lines.forEach((line, lineIndex) => {
          for (let i = 0; i < line.length; i++) {
            if (line[i] === "{") {
              braces++
            } else if (line[i] === "}") {
              braces--
              if (braces < 0) {
                errors.push({
                  message: "Unexpected closing brace",
                  line: lineIndex + 1,
                  column: i + 1,
                  severity: "error",
                  source: file.name,
                })
                braces = 0
              }
            }
          }
        })

        if (braces > 0) {
          errors.push({
            message: "Unclosed braces in CSS",
            line: lines.length,
            column: lines[lines.length - 1].length,
            severity: "error",
            source: file.name,
          })
        }
        break

      case "json":
        try {
          JSON.parse(file.content)
        } catch (e) {
          // Extract line and column from error message if possible
          const match = e.message.match(/at position (\d+)/)
          const position = match ? Number.parseInt(match[1]) : 0

          // Calculate line and column
          let line = 1
          let column = 1
          for (let i = 0; i < position && i < file.content.length; i++) {
            if (file.content[i] === "\n") {
              line++
              column = 1
            } else {
              column++
            }
          }

          errors.push({
            message: `Invalid JSON: ${e.message}`,
            line,
            column,
            severity: "error",
            source: file.name,
          })
        }
        break
    }

    setSyntaxErrors(errors)
  }

  // =========================================================================
  // EVENT HANDLERS
  // =========================================================================

  /**
   * Handle tab key in the code editor
   * Also handles auto-closing brackets if enabled
   */
  const handleKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault()
      const start = e.target.selectionStart
      const end = e.target.selectionEnd
      const value = e.target.value
      const spaces = " ".repeat(settings.tabSize)
      const newValue = value.substring(0, start) + spaces + value.substring(end)

      // Update the content
      if (activeFile) {
        updateFileContent(activeFile.id, newValue)
      }

      // Move cursor position
      requestAnimationFrame(() => {
        e.target.selectionStart = e.target.selectionEnd = start + settings.tabSize
      })
    } else if (
      settings.autoClosingBrackets &&
      (e.key === "{" || e.key === "(" || e.key === "[" || e.key === '"' || e.key === "'")
    ) {
      // Auto-closing brackets
      const closingChar = {
        "{": "}",
        "(": ")",
        "[": "]",
        '"': '"',
        "'": "'",
      }[e.key]

      const start = e.target.selectionStart
      const value = e.target.value

      // Insert opening and closing characters
      const newValue = value.substring(0, start) + e.key + closingChar + value.substring(start)

      e.preventDefault()

      // Update content
      if (activeFile) {
        updateFileContent(activeFile.id, newValue)
      }

      // Move cursor between the brackets
      requestAnimationFrame(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 1
      })
    }
  }

  /**
   * Update file content when editor changes
   */
  const handleEditorChange = (e) => {
    if (!activeFile) return

    const newContent = e.target.value
    updateFileContent(activeFile.id, newContent)
  }

  /**
   * Handle terminal input submission
   */
  const handleTerminalSubmit = (e) => {
    e.preventDefault()
    if (!terminalInput.trim()) return

    // Add the command to history
    setTerminalHistory((prev) => [...prev, { type: "command", content: terminalInput }])

    // Process the command (simplified)
    processTerminalCommand(terminalInput)

    // Clear the input
    setTerminalInput("")
  }

  /**
   * Process terminal commands
   * This is a simplified version - a real implementation would be more complex
   */
  const processTerminalCommand = (command) => {
    const cmd = command.trim()
    let response = ""

    if (cmd.startsWith("npm install") || cmd.startsWith("npm i")) {
      const packageName = cmd.split(" ")[2]
      if (packageName) {
        response = `Installing package: ${packageName}...`
        // Simulate package installation
        setTimeout(() => {
          setTerminalHistory((prev) => [
            ...prev,
            { type: "output", content: `+ ${packageName}@1.0.0 installed successfully` },
          ])

          // Add to packages list
          setPackages((prev) => [...prev, { name: packageName, version: "1.0.0", type: "dependency" }])
        }, 1500)
      } else {
        response = "Error: Please specify a package name"
      }
    } else if (cmd === "clear" || cmd === "cls") {
      // Clear the terminal
      setTerminalHistory([])
      return
    } else if (cmd === "ls" || cmd === "dir") {
      // List files
      response = files.map((file) => file.name).join("\n")
    } else if (cmd === "help") {
      response = `Available commands:
npm install <package> - Install a package
ls, dir - List files
clear, cls - Clear terminal
help - Show this help`
    } else {
      response = `Command not found: ${cmd}. Type 'help' for available commands.`
    }

    setTerminalHistory((prev) => [...prev, { type: "output", content: response }])
  }

  // =========================================================================
  // FILE MANAGEMENT
  // =========================================================================

  /**
   * Update file content in the files array
   */
  const updateFileContent = (fileId, newContent) => {
    setFiles((prev) => prev.map((file) => (file.id === fileId ? { ...file, content: newContent } : file)))

    if (activeFile && activeFile.id === fileId) {
      setActiveFile((prev) => ({ ...prev, content: newContent }))
    }
  }

  /**
   * Create a new file or folder
   */
  const createNewFile = () => {
    if (!newFileName.trim()) {
      addConsoleLog("File name cannot be empty", "error")
      return
    }

    // Check if file already exists
    const fileExists = files.some((file) => file.name === newFileName && file.path === "/")

    if (fileExists) {
      addConsoleLog(`File '${newFileName}' already exists`, "error")
      return
    }

    const newFile = {
      id: Date.now(),
      name: newFileName,
      type: newFileType,
      content: DEFAULT_TEMPLATES[newFileType] || "",
      path: "/",
    }

    setFiles((prev) => [...prev, newFile])
    setActiveFile(newFile)
    setIsCreatingFile(false)
    setNewFileName("")

    addConsoleLog(`Created new file: ${newFileName}`, "success")
  }

  /**
   * Delete a file
   */
  const deleteFile = (id) => {
    const fileToDelete = files.find((file) => file.id === id)
    if (!fileToDelete) return

    setFiles((prev) => prev.filter((file) => file.id !== id))

    if (activeFile?.id === id) {
      setActiveFile(files.length > 1 ? files.find((file) => file.id !== id) : null)
    }

    addConsoleLog(`Deleted file: ${fileToDelete.name}`, "info")
  }

  /**
   * Create a new folder
   */
  const createNewFolder = () => {
    const folderName = prompt("Enter folder name:")
    if (!folderName) return

    const newFolder = {
      id: Date.now(),
      name: folderName,
      type: "folder",
      path: "/",
      children: [],
    }

    setFiles((prev) => [...prev, newFolder])

    addConsoleLog(`Created new folder: ${folderName}`, "success")
  }

  /**
   * Toggle folder expansion
   */
  const toggleFolder = (id) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // =========================================================================
  // CONSOLE AND LOGGING
  // =========================================================================

  /**
   * Clear the console
   */
  const clearConsole = () => {
    setConsoleOutput([])
    setRuntimeErrors([])
    addConsoleLog("Console cleared", "info")
  }

  // =========================================================================
  // PACKAGE MANAGEMENT
  // =========================================================================

  /**
   * Install a package
   * This is a simulated implementation
   */
  const installPackage = (packageName, version, type = "dependency") => {
    setIsInstallingPackage(true)

    // Simulate package installation
    setTimeout(() => {
      try {
        // Check if package is already installed
        const existingPackage = packages.find((p) => p.name === packageName)

        if (existingPackage) {
          // Update version if different
          if (existingPackage.version !== version) {
            setPackages((prev) => prev.map((p) => (p.name === packageName ? { ...p, version, type } : p)))
            addConsoleLog(`Updated ${packageName} to version ${version}`, "success")
          } else {
            addConsoleLog(`${packageName} is already installed`, "info")
          }
        } else {
          // Add new package
          setPackages((prev) => [...prev, { name: packageName, version, type }])
          addConsoleLog(`Installed ${packageName}@${version}`, "success")
        }

        // Update package.json
        updatePackageJson(packageName, version, type)
      } catch (error) {
        addConsoleLog(`Failed to install ${packageName}: ${error.message}`, "error")
      } finally {
        setIsInstallingPackage(false)
      }
    }, 1000) // Reduced delay for better UX
  }

  /**
   * Update package.json with new package
   */
  const updatePackageJson = (packageName, version, type) => {
    const packageJsonFile = files.find((f) => f.name === "package.json")

    if (!packageJsonFile) {
      addConsoleLog("package.json not found", "error")
      return
    }

    try {
      const packageJson = JSON.parse(packageJsonFile.content)

      if (type === "dependency") {
        packageJson.dependencies = packageJson.dependencies || {}
        packageJson.dependencies[packageName] = `^${version}`
      } else {
        packageJson.devDependencies = packageJson.devDependencies || {}
        packageJson.devDependencies[packageName] = `^${version}`
      }

      // Format the JSON with proper indentation for better readability
      const formattedJson = JSON.stringify(packageJson, null, 2)
      updateFileContent(packageJsonFile.id, formattedJson)

      // Log success message
      addConsoleLog(`Updated package.json with ${packageName}@${version}`, "success")
    } catch (error) {
      addConsoleLog(`Failed to update package.json: ${error.message}`, "error")
    }
  }

  /**
   * Uninstall a package
   */
  const uninstallPackage = (packageName) => {
    setIsInstallingPackage(true)

    // Simulate package uninstallation
    setTimeout(() => {
      try {
        // Remove package from state
        setPackages((prev) => prev.filter((p) => p.name !== packageName))

        // Update package.json
        const packageJsonFile = files.find((f) => f.name === "package.json")

        if (packageJsonFile) {
          const packageJson = JSON.parse(packageJsonFile.content)

          if (packageJson.dependencies && packageJson.dependencies[packageName]) {
            delete packageJson.dependencies[packageName]
          }

          if (packageJson.devDependencies && packageJson.devDependencies[packageName]) {
            delete packageJson.devDependencies[packageName]
          }

          updateFileContent(packageJsonFile.id, JSON.stringify(packageJson, null, 2))
        }

        addConsoleLog(`Uninstalled ${packageName}`, "success")
      } catch (error) {
        addConsoleLog(`Failed to uninstall ${packageName}: ${error.message}`, "error")
      } finally {
        setIsInstallingPackage(false)
      }
    }, 1000)
  }

  // =========================================================================
  // PREVIEW AND RENDERING
  // =========================================================================

  /**
   * Format code based on file type
   * This is a placeholder for actual code formatting
   */
  const formatCode = () => {
    if (!activeFile) return

    try {
      // This is a placeholder for actual code formatting
      // In a real implementation, you would use a library like prettier
      addConsoleLog("Formatting code...", "info")

      // Simulate formatting delay
      setTimeout(() => {
        addConsoleLog("Code formatted successfully", "success")
      }, 500)
    } catch (error) {
      addConsoleLog(`Format error: ${error.message}`, "error")
    }
  }

  /**
   * Share playground by generating a shareable URL
   */
  const sharePlayground = async () => {
    try {
      const playgroundState = {
        files,
        settings,
        layout: editorLayout,
      }

      // Here you would typically make an API call to save the state
      // and generate a shareable URL
      const encodedState = btoa(JSON.stringify(playgroundState))
      const shareableUrl = `${window.location.origin}/playground/${encodedState}`

      setShareUrl(shareableUrl)
      await navigator.clipboard.writeText(shareableUrl)
      addConsoleLog("Share URL copied to clipboard!", "success")
    } catch (error) {
      addConsoleLog(`Failed to generate share URL: ${error.message}`, "error")
    }
  }

  /**
   * Download project as a ZIP file
   */
  const downloadProject = () => {
    try {
      const zip = new JSZip()

      // Add files to the zip
      files.forEach((file) => {
        // Skip folders
        if (file.type === "folder") return

        const filePath = file.path === "/" ? file.name : `${file.path}/${file.name}`
        zip.file(filePath, file.content)
      })

      // Generate and download the zip file
      zip.generateAsync({ type: "blob" }).then((content) => {
        const url = window.URL.createObjectURL(content)
        const a = document.createElement("a")
        a.href = url
        a.download = "playground-project.zip"
        a.click()
        window.URL.revokeObjectURL(url)

        addConsoleLog("Project downloaded successfully", "success")
      })
    } catch (error) {
      addConsoleLog(`Failed to download project: ${error.message}`, "error")
    }
  }

  /**
   * Toggle editor layout between horizontal and vertical
   */
  const toggleEditorLayout = () => {
    setEditorLayout((prev) => (prev === "horizontal" ? "vertical" : "horizontal"))
  }

  // =========================================================================
  // RENDER FUNCTIONS
  // =========================================================================

  /**
   * Render file tree
   */
  const renderFileTree = () => {
    return files.map((file) => {
      if (file.type === "folder") {
        const isExpanded = expandedFolders[file.id]

        return (
          <div key={file.id} className={styles.fileTreeItem}>
            <div className={styles.fileTreeItemHeader} onClick={() => toggleFolder(file.id)}>
              <span className={styles.fileTreeItemIcon}>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              <span className={styles.fileTreeItemIcon}>
                <Folder size={16} />
              </span>
              <span className={styles.fileTreeItemName}>{file.name}</span>
            </div>

            {isExpanded && file.children && (
              <div className={styles.fileTreeChildren}>
                {file.children.map((childFile) => (
                  <div
                    key={childFile.id}
                    className={`${styles.fileItem} ${activeFile?.id === childFile.id ? styles.active : ""}`}
                    onClick={() => setActiveFile(childFile)}
                  >
                    <div className={styles.fileItemContent}>
                      {getFileIcon(childFile.type)}
                      <span className={styles.fileName}>{childFile.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteFile(childFile.id)
                      }}
                      className={styles.fileDeleteButton}
                      title="Delete file"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      } else {
        return (
          <div key={file.id} className={`${styles.fileItem} ${activeFile?.id === file.id ? styles.active : ""}`}>
            <div className={styles.fileItemContent} onClick={() => setActiveFile(file)}>
              {getFileIcon(file.type)}
              <span className={styles.fileName}>{file.name}</span>
            </div>
            <button onClick={() => deleteFile(file.id)} className={styles.fileDeleteButton} title="Delete file">
              <Trash2 size={14} />
            </button>
          </div>
        )
      }
    })
  }

  /**
   * Render package installer
   */
  const renderPackageInstaller = () => {
    return (
      <div className={styles.packageInstallerContainer}>
        <div className={styles.packageSearch}>
          <Search size={16} className={styles.packageSearchIcon} />
          <input
            type="text"
            value={packageSearch}
            onChange={(e) => setPackageSearch(e.target.value)}
            placeholder="Search packages..."
            className={styles.packageSearchInput}
          />
        </div>

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
                <button
                  onClick={() => installPackage(pkg.name, pkg.version)}
                  className={styles.packageInstallButton}
                  disabled={isInstallingPackage}
                >
                  {isInstallingPackage ? <RefreshCw size={14} className={styles.spinning} /> : <Plus size={14} />}
                  Install
                </button>
              </div>
            ))}
          </div>
        </div>

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
    )
  }

  /**
   * Render terminal
   */
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
    )
  }

  /**
   * Render error panel with detailed error information
   */
  const renderErrorPanel = () => {
    const allErrors = [...syntaxErrors, ...runtimeErrors]

    if (allErrors.length === 0) {
      return (
        <div className={styles.emptyErrorPanel}>
          <Info size={24} />
          <p>No errors to display</p>
        </div>
      )
    }

    return (
      <div className={styles.errorPanel}>
        {allErrors.map((error, index) => (
          <div
            key={index}
            className={styles.errorItem}
            onClick={() => {
              // Find the file and set it as active
              const file = files.find((f) => f.name === error.source || f.path + "/" + f.name === error.filename)
              if (file) {
                setActiveFile(file)
                setActiveTab("editor")

                // Scroll to error line (would need to be implemented)
                // scrollToLine(error.line);
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
    )
  }

  // =========================================================================
  // MAIN RENDER
  // =========================================================================

  return (
    <ErrorBoundary>
      <div className={`${styles.playgroundContainer} ${styles[theme]}`}>
        {/* Header */}
        <div className={styles.playgroundHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.playgroundTitle}>Playground</h1>
            <div className={styles.headerTabs}>
              <a href="/" className={`${styles.tabButton}`} style={{ textDecoration: "none" }}>
                <Home size={24} /> {/* Home Icon */}
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
        <div className={`${styles.mainContent} ${styles[editorLayout]}`}>
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
                          <option value="tsx">TSX</option>
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
              </div>
              <div className={styles.editorActions}>
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

            {/* Code Editor */}
            <div
              className={`${styles.codeEditor} ${showLineNumbers ? styles.hasLineNumbers : ""}`}
              ref={editorWrapperRef}
            >
              {/* Optimize the line numbers rendering */}
              {showLineNumbers && activeFile && (
                <div className={styles.lineNumbers} ref={lineNumbersRef}>
                  {activeFile.content.split("\n").map((_, i) => {
                    const lineNum = i + 1
                    const hasError = syntaxErrors.some((err) => err.line === lineNum)
                    return (
                      <div
                        key={i}
                        className={`${styles.lineNumber} ${hasError ? styles.errorLine : ""}`}
                        title={hasError ? syntaxErrors.find((err) => err.line === lineNum)?.message : ""}
                      >
                        {hasError && <AlertCircle size={12} className={styles.lineErrorIcon} />}
                        {lineNum}
                      </div>
                    )
                  })}
                </div>
              )}

              {activeFile ? (
                <div className={styles.editorWithHighlight}>
                  {/* Syntax highlighted code (read-only, for display) */}
                  <pre className={styles.highlightedCode} ref={highlightedCodeRef} aria-hidden="true"></pre>

                  {/* Actual textarea for editing */}
                  <textarea
                    ref={editorRef}
                    value={activeFile.content || ""}
                    onChange={handleEditorChange}
                    onKeyDown={handleKeyDown}
                    className={styles.codeContent}
                    style={{
                      fontSize: `${settings.fontSize}px`,
                      tabSize: settings.tabSize,
                      whiteSpace: settings.wordWrap ? "pre-wrap" : "pre",
                    }}
                    spellCheck="false"
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    data-gramm="false"
                    data-gramm_editor="false"
                    data-enable-grammarly="false"
                    wrap={settings.wordWrap ? "soft" : "off"}
                  />
                </div>
              ) : (
                <div className={styles.noFileSelected}>
                  <p>No file selected</p>
                  <button onClick={() => setIsCreatingFile(true)} className={styles.createFileButton}>
                    Create a new file
                  </button>
                </div>
              )}

              {/* Error markers */}
              {activeFile && syntaxErrors.length > 0 && (
                <div className={styles.errorMarkers}>
                  {syntaxErrors.map((error, index) => {
                    const lines = activeFile.content.split("\n")
                    const lineHeight = 1.7 // Same as in CSS
                    const top = (error.line - 1) * lineHeight + 0.2 // Adjust for positioning

                    return (
                      <div key={index} className={styles.errorMarker} style={{ top: `${top}em` }} title={error.message}>
                        <span className={styles.errorMarkerLine}></span>
                        <span className={styles.errorMarkerIcon}>
                          <AlertCircle size={12} />
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Preview Section */}
          <div
            className={`${styles.previewSection} ${isFullScreen ? styles.fullScreen : ""} ${activeTab === "preview" ? styles.visible : styles.hidden}`}
          >
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
            <div className={styles.previewContent}>
              {previewError ? (
                <div className={styles.previewError}>
                  <h3>Preview Error</h3>
                  <pre>{previewError}</pre>
                </div>
              ) : (
                <iframe
                  ref={iframeRef}
                  title="preview"
                  className={styles.previewFrame}
                  sandbox="allow-scripts allow-modals allow-forms allow-same-origin allow-popups allow-presentation"
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
              </>
            )}
          </div>
          <div className={styles.statusRight}>
            <span className={styles.statusItem}>{theme === "light" ? "Light Mode" : "Dark Mode"}</span>
            <span className={styles.statusItem}>{isAutoRefresh ? "Auto-refresh: On" : "Auto-refresh: Off"}</span>
            <span className={styles.statusItem}>
              <Coffee size={14} className={styles.statusIcon} />
              Ready
            </span>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}


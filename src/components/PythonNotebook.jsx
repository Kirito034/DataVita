

 
"use client"
 
import { useState, useEffect, useCallback, useRef } from "react"
import { Editor } from "@monaco-editor/react"
import ReactDiffViewer from "react-diff-viewer"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vs, vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { PlayCircle, ChevronUp, ChevronDown, Trash2, Download, History, Code, X, Moon, Sun, Save, FileCode, Layers, CheckCircle, XCircle, Clock, Info, Loader, GitBranch, MessageSquare, RefreshCw } from 'lucide-react'
import {
  executeCode,
  fetchFileContent,
  saveFileContent,
  fetchVersionHistory,
  saveVersionHistory,
} from "../services/api"
import "../styles/pythonnotebook.css"
 
const PythonNotebook = ({ fileTabs = [], openFile, addTab, removeTab, onExecuteCode, onThemeChange }) => {
  // Store file content for each file ID to prevent content mixing
  const [fileContents, setFileContents] = useState({})
  const [activeTab, setActiveTab] = useState(null)
  const [openTabs, setOpenTabs] = useState([])
  const [versionHistory, setVersionHistory] = useState([])
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false)
  const [selectedVersionForDiff, setSelectedVersionForDiff] = useState(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [commitMessage, setCommitMessage] = useState("")
  const [notification, setNotification] = useState(null)
  const [executionState, setExecutionState] = useState({})
  const notificationTimeoutRef = useRef(null)
  const versionHistoryRef = useRef(null)
  const diffViewerRef = useRef(null)
  const [versionPage, setVersionPage] = useState(1)
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)
  const versionsPerPage = 10
 
  const normalizePath = useCallback((path) => {
    if (!path) return ""
    return path.replace(/\\/g, "/")
  }, [])
 
  // Get cells for the current active file
  const getCells = useCallback(() => {
    if (!activeTab || !activeTab.id) return []
    return fileContents[activeTab.id]?.cells || []
  }, [activeTab, fileContents])
 
  // Set cells for the current active file
  const setCells = useCallback((cellsOrUpdater) => {
    if (!activeTab || !activeTab.id) return
   
    setFileContents(prev => {
      const newCells = typeof cellsOrUpdater === 'function'
        ? cellsOrUpdater(prev[activeTab.id]?.cells || [])
        : cellsOrUpdater
       
      return {
        ...prev,
        [activeTab.id]: {
          ...prev[activeTab.id],
          cells: newCells
        }
      }
    })
  }, [activeTab])
 
  const createNewCell = useCallback(
    (cellData) => ({
      id: cellData.id || generateId(),
      content: cellData.content || "",
      type: cellData.type || "code",
      isRunning: false,
      status: "Idle",
      result: "",
      mode: cellData.mode || "python",
    }),
    [],
  )
 
  const generateId = () => `cell_${Math.random().toString(36).substr(2, 9)}`
 
  const parseFileContent = useCallback((content, fileName) => {
    if (!fileName) {
      console.error("File name is undefined in parseFileContent")
      return [
        createNewCell({
          content: "# Error: Could not determine file type. Please check the file name.",
          type: "code",
          mode: "python",
        }),
      ]
    }
 
    const fileExtension = fileName.split(".").pop().toLowerCase()
    let parsedCells = []
 
    if (fileExtension === "py") {
      parsedCells = content.split("\n\n").map((block) =>
        createNewCell({
          content: block.trim() || "# Empty block",
          type: "code",
          mode: "python",
        }),
      )
    } else if (fileExtension === "ipynb" || fileExtension === "pynb") {
      try {
        const notebookData = JSON.parse(content)
        parsedCells = notebookData.cells.map((cell) =>
          createNewCell({
            id: cell.id || generateId(),
            content: cell.source.join("\n").trim() || "# Empty cell",
            type: cell.cell_type === "code" ? "code" : "text",
            mode: "python",
          }),
        )
      } catch (jsonError) {
        console.error("Error parsing JSON:", jsonError)
        alert("Failed to parse the file as JSON. Please check the file format or contact support.")
        return []
      }
    } else if (fileExtension === "sql") {
      // Parse SQL files as separate statements divided by semicolons or empty lines
      const sqlStatements = content
        .split(/;\s*\n|;\s*$/)
        .filter(stmt => stmt.trim())
        .map(stmt => stmt.trim() + (stmt.trim().endsWith(";") ? "" : ";"))
     
      parsedCells = sqlStatements.map((statement) =>
        createNewCell({
          content: statement || "-- Empty SQL statement",
          type: "code",
          mode: "sql",
        }),
      )
    }
 
    return parsedCells.length > 0
      ? parsedCells
      : [
          createNewCell({
            content: fileExtension === "sql"
              ? "-- Empty file. Add your SQL here."
              : "# Empty file. Add your code here.",
            type: "code",
            mode: fileExtension === "sql" ? "sql" : "python",
          }),
        ]
  }, [createNewCell])
 
  // Handle file opening from parent component
  useEffect(() => {
    if (openFile && openFile.id) {
      // Add to open tabs if not already open
      if (!openTabs.some(tab => tab.id === openFile.id)) {
        setOpenTabs(prev => [...prev, openFile]);
      }
     
      // Set as active tab
      setActiveTab(openFile);
     
      // Load file content if not already loaded
      if (!fileContents[openFile.id]?.loaded) {
        loadFileContent(openFile);
      }
    }
  }, [openFile]);
 
  const loadFileContent = useCallback(
    async (file) => {
      try {
        if (!file || !file.id) {
          console.error("File missing permanent ID:", file)
          alert("The selected file does not have a permanent ID. Please reload the application.")
          return
        }
 
        if (!file.name) {
          console.error("File name is missing:", file)
          alert("The selected file does not have a name. Please reload the application.")
          return
        }
 
        // Check if we already have this file's content cached
        if (fileContents[file.id]?.loaded) {
          return
        }
 
        setIsLoading(true)
        const normalizedPath = normalizePath(file.path)
        const content = await fetchFileContent(normalizedPath)
 
        const parsedCells = parseFileContent(content, file.name)
       
        // Update the file contents cache with the new content
        setFileContents(prev => ({
          ...prev,
          [file.id]: {
            cells: parsedCells,
            loaded: true,
            path: normalizedPath,
            name: file.name
          }
        }))
 
        const history = await fetchVersionHistory(normalizedPath)
        setVersionHistory(history || [])
      } catch (error) {
        console.error("Error loading file:", error)
        alert("Failed to load file. Please check the console for details.")
      } finally {
        setIsLoading(false)
      }
    },
    [fileContents, normalizePath, parseFileContent],
  )
 
  // Define generateFileContent before it's used in saveFileContentOnly
  const generateFileContent = useCallback((cells, fileName) => {
    if (!fileName) {
      console.error("File name is undefined in generateFileContent")
      return ""
    }
 
    const fileExtension = fileName.split(".").pop().toLowerCase()
 
    if (fileExtension === "py") {
      return cells.map((cell) => cell.content).join("\n\n")
    } else if (fileExtension === "ipynb" || fileExtension === "pynb") {
      const notebookData = {
        cells: cells.map((cell) => ({
          id: cell.id,
          cell_type: cell.type,
          source: cell.content.split("\n"),
          metadata: {},
          execution_count: null,
        })),
        metadata: {
          kernelspec: {
            display_name: "Python 3",
            language: "python",
            name: "python3",
          },
          language_info: {
            codemirror_mode: { name: "ipython", version: 3 },
            file_extension: ".py",
            mimetype: "text/x-python",
            name: "python",
            nbconvert_exporter: "python",
            pygments_lexer: "ipython3",
            version: "3.8.10",
          },
        },
        nbformat: 4,
        nbformat_minor: 4,
      }
      return JSON.stringify(notebookData, null, 2)
    } else if (fileExtension === "sql") {
      // For SQL files, join all cell content with newlines
      return cells.map((cell) => cell.content).join("\n\n")
    }
 
    // Default return for unknown file types
    return cells.map((cell) => cell.content).join("\n\n")
  }, [])
 
  const saveFileContentOnly = useCallback(async () => {
    if (!activeTab) return
 
    setIsLoading(true)
 
    if (!activeTab.name) {
      console.error("File name is missing when saving:", activeTab)
      setNotification({
        type: "error",
        title: "Save Failed",
        message: "File name is missing. Cannot save the file.",
      })
      setIsLoading(false)
      return
    }
 
    const cells = getCells()
    const contentToSave = generateFileContent(cells, activeTab.name)
 
    try {
      const normalizedPath = normalizePath(activeTab.path)
 
      // Determine file type based on extension
      const fileExtension = activeTab.name.split(".").pop().toLowerCase()
      const fileType = fileExtension === "sql"
        ? "application/sql"
        : fileExtension === "py"
          ? "application/x-python"
          : "application/json"
 
      // Construct API payload
      const payload = {
        filename: activeTab.name,
        content: contentToSave,
        file_type: fileType,
        creator_id: "550e8400-e29b-41d4-a716-446655440000", // Replace with actual user ID
        creator_name: "John Doe", // Replace with actual user name
      }
 
      // Send request to save file
      const response = await fetch("http://127.0.0.1:5000/api/save-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
 
      if (!response.ok) {
        throw new Error(`Failed to save file: ${response.statusText}`)
      }
 
      setNotification({
        type: "success",
        title: "File Saved",
        message: `${activeTab.name} has been saved successfully.`,
      })
 
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current)
      }
 
      notificationTimeoutRef.current = setTimeout(() => {
        setNotification(null)
      }, 3000)
    } catch (error) {
      console.error("Error saving file:", error)
      setNotification({
        type: "error",
        title: "Save Failed",
        message: "Could not save the file. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, getCells, normalizePath, generateFileContent])
 
  const saveVersionHistoryManually = useCallback(
    async (message = "") => {
      if (!activeTab?.path) {
        setNotification({
          type: "warning",
          title: "No File Open",
          message: "Please open a file before saving a version.",
        })
        return
      }
 
      if (!activeTab.name) {
        setNotification({
          type: "error",
          title: "Save Failed",
          message: "File name is missing. Cannot save version.",
        })
        return
      }
 
      setIsLoading(true)
      const filePath = normalizePath(activeTab.path)
      const cells = getCells()
      const contentToSave = generateFileContent(cells, activeTab.name)
      const commitMsg = message || commitMessage || "Manual save"
 
      try {
        const timestamp = new Date().toLocaleString()
        await saveFileContent(filePath, contentToSave)
 
        setVersionHistory((prevHistory) => {
          const newVersion = {
            id: `version_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, // Add unique ID
            filePath,
            timestamp,
            content: contentToSave,
            commitMessage: commitMsg.trim(),
          }
 
          const updatedHistory = [...prevHistory.filter((entry) => entry.filePath !== filePath), newVersion]
 
          saveVersionHistory(filePath, updatedHistory)
          return updatedHistory
        })
 
        setCommitMessage("")
 
        setNotification({
          type: "success",
          title: "Version Saved",
          message: `New version created: ${commitMsg}`,
        })
      } catch (error) {
        console.error("Error saving version history:", error)
        setNotification({
          type: "error",
          title: "Version Save Failed",
          message: "Could not save version history. Please try again.",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [activeTab, getCells, normalizePath, generateFileContent, commitMessage],
  )
 
  // Fetch files from backend on initial load - MODIFIED to not auto-open files
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch("/api/files1")
        if (!response.ok) throw new Error("Failed to fetch files")
        const files = await response.json()
 
        // Update fileTabs with fetched files but don't open any
        if (addTab && typeof addTab === "function") {
          files.forEach((file) => addTab(file))
        }
       
        // Removed the auto-opening of the first file
        // Now files will only open when explicitly requested by the user
      } catch (error) {
        console.error("Error fetching files:", error)
      }
    }
 
    fetchFiles()
  }, [])
 
  useEffect(() => {
    const handleCtrlS = (e) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault()
        saveVersionHistoryManually("Manual save via Ctrl+S")
      }
    }
 
    window.addEventListener("keydown", handleCtrlS)
    return () => window.removeEventListener("keydown", handleCtrlS)
  }, [saveVersionHistoryManually])
 
  const moveCell = useCallback((id, direction) => {
    setCells((prevCells) => {
      const index = prevCells.findIndex((cell) => cell.id === id)
      if (index === -1) return prevCells
 
      const newIndex = index + direction
      if (newIndex < 0 || newIndex >= prevCells.length) return prevCells
 
      const updatedCells = [...prevCells]
      const [movedCell] = updatedCells.splice(index, 1)
      updatedCells.splice(newIndex, 0, movedCell)
 
      return updatedCells
    })
  }, [setCells])
 
  const addCellAfter = useCallback(
    (id, type) => {
      setCells((prevCells) => {
        const index = prevCells.findIndex((cell) => cell.id === id)
        if (index === -1) return prevCells
 
        // Determine the mode based on the current file extension
        const fileExtension = activeTab?.name?.split(".").pop().toLowerCase() || "py"
        const mode = fileExtension === "sql" ? "sql" : "python"
 
        const newCell = createNewCell({ type, mode })
        const updatedCells = [...prevCells]
        updatedCells.splice(index + 1, 0, newCell)
 
        return updatedCells
      })
    },
    [setCells, createNewCell, activeTab],
  )
 
  const deleteCell = useCallback((id) => {
    setCells((prevCells) => prevCells.filter((cell) => cell.id !== id))
  }, [setCells])
 
  const downloadActiveFile = useCallback(() => {
    if (!activeTab) {
      setNotification({
        type: "warning",
        title: "No File Open",
        message: "Please open a file before downloading.",
      })
      return
    }
 
    if (!activeTab.name) {
      setNotification({
        type: "error",
        title: "Download Failed",
        message: "File name is missing. Cannot download the file.",
      })
      return
    }
 
    try {
      const cells = getCells()
      const contentToDownload = generateFileContent(cells, activeTab.name)
      const blob = new Blob([contentToDownload], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = activeTab.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
 
      setNotification({
        type: "success",
        title: "Download Started",
        message: `${activeTab.name} is being downloaded.`,
      })
    } catch (error) {
      console.error("Error downloading file:", error)
      setNotification({
        type: "error",
        title: "Download Failed",
        message: "Could not download the file. Please try again.",
      })
    }
  }, [activeTab, getCells, generateFileContent])
 
  // Handle tab switching
  const handleTabClick = useCallback((file) => {
    if (!file || !file.id) return
    setActiveTab(file)
   
    // Load file content if not already loaded
    if (!fileContents[file.id]?.loaded) {
      loadFileContent(file)
    }
  }, [fileContents, loadFileContent])
 
  // Handle closing a tab
  const handleCloseTab = useCallback((fileId) => {
    // Remove from open tabs
    setOpenTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== fileId);
     
      // If we're closing the active tab, switch to another tab
      if (activeTab?.id === fileId && newTabs.length > 0) {
        setActiveTab(newTabs[0]);
      } else if (newTabs.length === 0) {
        setActiveTab(null);
      }
     
      return newTabs;
    });
   
    // Remove from file contents cache
    setFileContents(prev => {
      const newContents = { ...prev };
      delete newContents[fileId];
      return newContents;
    });
   
    // Call parent removeTab if provided
    if (removeTab) {
      removeTab(fileId);
    }
  }, [activeTab, removeTab]);
 
  // Render open file tabs
  const renderOpenTabs = () => {
    return (
      <div className="open-file-tabs">
        {openTabs.map(file => (
          <div
            key={file.id}
            className={`file-tab ${activeTab?.id === file.id ? 'active' : ''}`}
            onClick={() => handleTabClick(file)}
          >
            <FileCode size={16} />
            <span className="file-tab-name">{file.name || "Untitled"}</span>
            <button
              className="close-file-tab"
              onClick={(e) => {
                e.stopPropagation();
                handleCloseTab(file.id);
              }}
              aria-label="Close file"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    );
  };
 
  const renderVersionHistoryModal = () => {
    const latestVersion = versionHistory[versionHistory.length - 1]
 
    const extractCodeCells = (version) => {
      if (!version || !version.content) return []
 
      try {
        const parsedContent = JSON.parse(version.content)
        if (parsedContent.cells && Array.isArray(parsedContent.cells)) {
          return parsedContent.cells
            .filter((cell) => cell.cell_type === "code")
            .map((cell) => ({
              id: cell.id || Math.random().toString(36).substr(2, 9),
              content: cell.source.join("\n"),
            }))
        }
      } catch (error) {
        // If not JSON, treat as plain text
        return [{ id: "fallback", content: version.content }]
      }
 
      return [{ id: "fallback", content: version.content }]
    }
 
    const formatTimestamp = (utcTimestamp) => {
      if (!utcTimestamp) return "Unknown time"
 
      try {
        const localDate = new Date(utcTimestamp)
        return new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }).format(localDate)
      } catch (error) {
        console.error("Error formatting timestamp:", error)
        return "Invalid date"
      }
    }
 
    return (
      <div className={`version-history-modal ${isDarkMode ? "dark" : ""}`}>
        <div className="modal-header">
          <h3>Version History</h3>
          <div className="modal-actions">
            <button
              className="refresh-versions-btn"
              onClick={refreshVersionHistory}
              disabled={isLoadingVersions}
              title="Refresh Version History"
            >
              <RefreshCw size={16} className={isLoadingVersions ? "spin" : ""} />
            </button>
            <button className="close-modal-btn" onClick={() => setIsVersionModalOpen(false)}>
              <X size={24} />
            </button>
          </div>
        </div>
 
        <div className="modal-content">
          <div className="version-save-form">
            <div className="commit-input-container">
              <GitBranch size={16} />
              <input
                type="text"
                className="commit-input"
                placeholder="Enter a commit message..."
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
              />
            </div>
            <button className="save-version-btn" onClick={() => saveVersionHistoryManually()} disabled={isLoading}>
              {isLoading ? <Loader size={16} className="spin" /> : <Save size={16} />}
              Save Version
            </button>
          </div>
 
          <div className="scrollable-version-history" ref={versionHistoryRef}>
            {versionHistory.length > 0 ? (
              <>
                {versionHistory.slice(0, versionPage * versionsPerPage).map((version, index) => (
                  <div key={version.id || `version-${index}`} className={`version-item ${selectedVersionForDiff === version ? "selected" : ""}`}>
                    <div className="version-header">
                      <div className="version-commit">
                        <MessageSquare size={16} />
                        {version.commitMessage || "Manual Save"}
                      </div>
                      <div className="version-timestamp">
                        <Clock size={14} />
                        {formatTimestamp(version.timestamp)}
                      </div>
                    </div>
 
                    <div className="version-actions">
                      <button
                        className={`version-action-btn diff-btn ${selectedVersionForDiff === version ? "active" : ""}`}
                        onClick={() => setSelectedVersionForDiff(version)}
                      >
                        <Layers size={16} /> Select for Diff
                      </button>
 
                      <button
                        className="version-action-btn rollback-btn"
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to rollback to this version?`)) {
                            try {
                              setIsLoading(true)
                              const encodedFilePath = encodeURIComponent(version.filePath || activeTab?.path).replace(
                                /%5C/g,
                                "/",
                              )
 
                              const response = await fetch(
                                `http://localhost:5000/api/version-history/${encodedFilePath}/rollback/${version.id}`,
                                { method: "POST" },
                              )
 
                              if (!response.ok) {
                                throw new Error(`Server Error: ${response.statusText}`)
                              }
 
                              const data = await response.json()
                              loadFileContent(activeTab)
 
                              setNotification({
                                type: "success",
                                title: "Rollback Complete",
                                message: "Successfully rolled back to the selected version.",
                              })
                            } catch (error) {
                              console.error("Rollback failed:", error)
                              setNotification({
                                type: "error",
                                title: "Rollback Failed",
                                message: "Could not rollback to the selected version.",
                              })
                            } finally {
                              setIsLoading(false)
                            }
                          }
                        }}
                      >
                        Rollback
                      </button>
                    </div>
                  </div>
                ))}
 
                {versionHistory.length > versionPage * versionsPerPage && (
                  <button className="load-more-versions" onClick={() => setVersionPage((prev) => prev + 1)}>
                    Load More Versions
                  </button>
                )}
              </>
            ) : (
              <div className="no-versions">
                <History size={32} />
                <p>No version history available</p>
                <div className="no-versions-hint">Save a version to start tracking changes</div>
              </div>
            )}
          </div>
 
          {selectedVersionForDiff && latestVersion && (
            <div className="diff-viewer-container" ref={diffViewerRef}>
              <div className="diff-header">
                <h4>Diff Viewer</h4>
                <div className="diff-version-info">
                  <div className="diff-old-version">
                    <span>Previous:</span> {formatTimestamp(selectedVersionForDiff.timestamp)}
                  </div>
                  <div className="diff-new-version">
                    <span>Current:</span> {formatTimestamp(latestVersion.timestamp)}
                  </div>
                </div>
              </div>
 
              <div className="scrollable-diff-content">
                {extractCodeCells(selectedVersionForDiff).map((oldCell, index) => {
                  const newCell = extractCodeCells(latestVersion)[index] || { content: "" }
 
                  return (
                    <div key={`diff-cell-${index}`} className="diff-cell">
                      <div className="diff-cell-header">Cell {index + 1}</div>
                      <ReactDiffViewer
                        oldValue={oldCell.content || ""}
                        newValue={newCell.content || ""}
                        splitView={true}
                        useDarkTheme={isDarkMode}
                        leftTitle="Previous Version"
                        rightTitle="Latest Version"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
 
  // Enhanced function to format tabular data for PySpark and SQL results
  const formatTabularData = useCallback((result, mode) => {
    if (!result || typeof result !== "object") {
      return result
    }
 
    // Handle array of objects (typical SQL/PySpark DataFrame result)
    if (Array.isArray(result) && result.length > 0 && typeof result[0] === "object") {
      const headers = Object.keys(result[0])
 
      // Calculate column widths
      const columnWidths = headers.map((header) => {
        const maxContentWidth = Math.max(header.length, ...result.map((row) => String(row[header] || "").length))
        return maxContentWidth
      })
 
      // Create PostgreSQL-style table
      let tableHtml = '<div class="result-table-container">'
 
      // Add row count information
      tableHtml += `<div class="result-table-info">
        <span class="row-count">${result.length} rows</span>
        <div class="table-actions">
          <button class="table-action-btn copy-btn" title="Copy as CSV">Copy</button>
          <button class="table-action-btn expand-btn" title="Expand view">Expand</button>
        </div>
      </div>`
 
      tableHtml += '<div class="pg-table-wrapper"><table class="pg-table">'
 
      // Add headers with column types
      tableHtml += "<thead><tr>"
      headers.forEach((header, i) => {
        const columnType = typeof result[0][header]
        tableHtml += `<th>
          <div class="column-header">
            <span class="column-name">${header}</span>
            <span class="column-type">${columnType}</span>
          </div>
        </th>`
      })
      tableHtml += "</tr></thead><tbody>"
 
      // Add rows with proper formatting
      result.forEach((row, rowIndex) => {
        tableHtml += `<tr class="${rowIndex % 2 === 0 ? "even" : "odd"}">`
        headers.forEach((header, colIndex) => {
          const value = row[header]
          const cellValue = value !== undefined && value !== null ? String(value) : "NULL"
          const cellClass = value === null ? "null-value" : typeof value
 
          tableHtml += `<td class="${cellClass}" data-column="${header}">
            <div class="cell-content" title="${cellValue}">${cellValue}</div>
          </td>`
        })
        tableHtml += "</tr>"
      })
 
      tableHtml += "</tbody></table></div></div>"
 
      // Add copy functionality script
      tableHtml += `
        <script>
          document.querySelector('.copy-btn').addEventListener('click', function() {
            const rows = Array.from(document.querySelectorAll('.pg-table tr'));
            const csv = rows.map(row =>
              Array.from(row.querySelectorAll('th, td'))
                .map(cell => cell.textContent.trim())
                .join(',')
            ).join('\\n');
            navigator.clipboard.writeText(csv);
            this.textContent = 'Copied!';
            setTimeout(() => this.textContent = 'Copy', 2000);
          });
 
          document.querySelector('.expand-btn').addEventListener('click', function() {
            const wrapper = this.closest('.result-table-container');
            wrapper.classList.toggle('expanded');
            this.textContent = wrapper.classList.contains('expanded') ? 'Collapse' : 'Expand';
          });
        </script>
      `
 
      return tableHtml
    }
 
    return result
  }, [])
 
  const refreshVersionHistory = useCallback(async () => {
    if (!activeTab?.path) return
 
    try {
      setIsLoadingVersions(true)
      const normalizedPath = normalizePath(activeTab.path)
      const history = await fetchVersionHistory(normalizedPath)
     
      // Ensure each version has a unique ID
      const historyWithIds = history.map(version => ({
        ...version,
        id: version.id || `version_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      }))
     
      setVersionHistory(historyWithIds || [])
      setVersionPage(1) // Reset to first page
    } catch (error) {
      console.error("Error refreshing version history:", error)
      setNotification({
        type: "error",
        title: "Refresh Failed",
        message: "Could not refresh version history.",
      })
    } finally {
      setIsLoadingVersions(false)
    }
  }, [activeTab, normalizePath])
 
  const runCell = useCallback(
    async (id) => {
      const cells = getCells()
      const cell = cells.find((cell) => cell.id === id)
      if (!cell || cell.type !== "code") return
 
      setCells((prevCells) =>
        prevCells.map((c) => (c.id === id ? { ...c, isRunning: true, status: "Running", result: "" } : c)),
      )
 
      try {
        const { result, status, error } = await executeCode(cell.content, executionState, cell.mode)
 
        if (error) {
          setCells((prevCells) =>
            prevCells.map((c) =>
              c.id === id ? { ...c, isRunning: false, status: "Error", result: error.message } : c,
            ),
          )
          return
        }
 
        setExecutionState(result)
 
        // Format result based on cell mode
        let formattedResult = result
 
        if (cell.mode === "pyspark" || cell.mode === "sql") {
          formattedResult = formatTabularData(result, cell.mode)
        }
 
        setCells((prevCells) =>
          prevCells.map((c) =>
            c.id === id
              ? {
                  ...c,
                  isRunning: false,
                  status: status === "success" ? "Finished" : "Error",
                  result: formattedResult || "No output",
                }
              : c,
          ),
        )
      } catch (error) {
        setCells((prevCells) =>
          prevCells.map((c) => (c.id === id ? { ...c, isRunning: false, status: "Error", result: error.message } : c)),
        )
      }
    },
    [getCells, setCells, executionState, formatTabularData],
  )
 
  const getStatusIcon = (status, isRunning) => {
    if (isRunning) return <Loader size={14} className="spin status-icon running" />
 
    switch (status) {
      case "Finished":
        return <CheckCircle size={14} className="status-icon success" />
      case "Error":
        return <XCircle size={14} className="status-icon error" />
      default:
        return null
    }
  }
 
  const toggleTheme = () => {
    const newTheme = isDarkMode ? "light" : "dark"
    setIsDarkMode(!isDarkMode)
    if (onThemeChange) {
      onThemeChange(newTheme)
    }
  }
 
  return (
    <div className={`python-notebook-container ${isDarkMode ? "dark" : ""}`}>
      {/* Render open file tabs */}
      {renderOpenTabs()}
 
      <div className="editor-header">
        <div className="editor-actions">
          <button
            className="action-button"
            onClick={saveFileContentOnly}
            disabled={isLoading || !activeTab}
            title="Save (Ctrl+S)"
          >
            {isLoading ? <Loader size={16} className="spin" /> : <Save size={16} />}
            <span>Save</span>
          </button>
 
          <button
            className="action-button"
            onClick={() => {
              setCommitMessage("")
              setIsVersionModalOpen(true)
            }}
            disabled={isLoading || !activeTab}
            title="Version History"
          >
            <History size={16} />
            <span>Save Version</span>
          </button>
 
          <button
            className="action-button"
            onClick={downloadActiveFile}
            disabled={isLoading || !activeTab}
            title="Download File"
          >
            <Download size={16} />
            <span>Download</span>
          </button>
        </div>
 
        <button
          className={`theme-toggle ${isDarkMode ? "dark" : "light"}`}
          onClick={toggleTheme}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
 
      <div className="notebook-scroll-container">
        <div className="cells-container">
          {getCells().map((cell, index) => (
            <div key={cell.id} className={`cell ${cell.type}-cell ${cell.isRunning ? "running" : ""}`}>
              <div className="cell-header">
                <div className="cell-info">
                  <select
                    className="execution-mode-dropdown"
                    value={cell.mode}
                    onChange={(e) =>
                      setCells((prevCells) =>
                        prevCells.map((c) => (c.id === cell.id ? { ...c, mode: e.target.value } : c)),
                      )
                    }
                    disabled={cell.isRunning}
                  >
                    <option value="python">Python</option>
                    <option value="pyspark">PySpark</option>
                    <option value="sql">SQL</option>
                  </select>
 
                  {cell.status !== "Idle" && (
                    <div className="cell-status">
                      {getStatusIcon(cell.status, cell.isRunning)}
                      <span className={`status-text ${cell.status.toLowerCase()}`}>{cell.status}</span>
                    </div>
                  )}
                </div>
 
                <div className="cell-actions">
                  <button
                    className="cell-action-btn"
                    onClick={() => moveCell(cell.id, -1)}
                    disabled={index === 0 || cell.isRunning}
                    title="Move Up"
                  >
                    <ChevronUp size={16} />
                  </button>
 
                  <button
                    className="cell-action-btn"
                    onClick={() => moveCell(cell.id, 1)}
                    disabled={index === getCells().length - 1 || cell.isRunning}
                    title="Move Down"
                  >
                    <ChevronDown size={16} />
                  </button>
 
                  <button
                    className={`cell-action-btn run-btn ${cell.isRunning ? "loading" : ""}`}
                    onClick={() => runCell(cell.id)}
                    disabled={cell.isRunning || cell.type !== "code"}
                    title="Run Cell"
                  >
                    {cell.isRunning ? <Loader size={16} className="spin" /> : <PlayCircle size={16} />}
                  </button>
 
                  <button
                    className="cell-action-btn delete-btn"
                    onClick={() => deleteCell(cell.id)}
                    disabled={cell.isRunning}
                    title="Delete Cell"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
 
              {cell.type === "code" ? (
                <div className="code-editor-container">
                  <Editor
                    value={cell.content}
                    onChange={(value) =>
                      setCells((prevCells) => prevCells.map((c) => (c.id === cell.id ? { ...c, content: value } : c)))
                    }
                    language={cell.mode === "sql" ? "sql" : "python"}
                    theme={isDarkMode ? "vs-dark" : "vs-light"}
                    options={{
                      minimap: { enabled: false },
                      wordWrap: "on",
                      autoClosingBrackets: "always",
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      fontFamily: "'Calibri', 'Consolas', 'Monaco', monospace",
                      fontSize: 14,
                      padding: { top: 10, bottom: 10 },
                    }}
                    className="code-editor"
                    height={Math.max(100, (cell.content ? cell.content.split("\n").length : 1) * 22 + 20)}
                  />
                </div>
              ) : (
                <div className="text-editor-container">
                  <textarea
                    value={cell.content}
                    onChange={(e) =>
                      setCells((prevCells) =>
                        prevCells.map((c) => (c.id === cell.id ? { ...c, content: e.target.value } : c)),
                      )
                    }
                    placeholder="Enter text here..."
                    className="text-cell-editor"
                    rows={Math.max(3, cell.content.split("\n").length)}
                  />
                </div>
              )}
 
              {(cell.status === "Finished" || cell.status === "Error") && cell.result && (
                <div className={`cell-result ${cell.status.toLowerCase()}`}>
                  <div className="result-header">
                    <span>Output</span>
                    {cell.status === "Error" && <span className="error-label">Error</span>}
                  </div>
                  <div className="result-content">
                    {cell.mode === "pyspark" || cell.mode === "sql" ? (
                      <div className="table-result-wrapper" dangerouslySetInnerHTML={{ __html: cell.result }} />
                    ) : (
                      <SyntaxHighlighter
                        language={cell.status === "Error" ? "bash" : "python"}
                        style={isDarkMode ? vscDarkPlus : vs}
                        customStyle={{
                          margin: 0,
                          padding: "12px",
                          borderRadius: "0 0 6px 6px",
                          fontSize: "13px",
                          fontFamily: "'Calibri', 'Consolas', 'Monaco', monospace",
                        }}
                      >
                        {cell.result}
                      </SyntaxHighlighter>
                    )}
                  </div>
                </div>
              )}
 
              <div className="add-cell-buttons">
                <button
                  className="add-cell-btn code-btn"
                  onClick={() => addCellAfter(cell.id, "code")}
                  title="Add Code Cell"
                >
                  <Code size={14} /> Add Code Cell
                </button>
              </div>
            </div>
          ))}
 
          {getCells().length === 0 && (
            <div className="empty-notebook">
              <div className="empty-notebook-content">
                <FileCode size={36} />
                <h3>Please create or select a Notebook</h3>
              </div>
            </div>
          )}
        </div>
      </div>
 
      {isVersionModalOpen && renderVersionHistoryModal()}
 
      {notification && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-icon">
            {notification.type === "success" && <CheckCircle size={18} />}
            {notification.type === "error" && <XCircle size={18} />}
            {notification.type === "warning" && <Info size={18} />}
          </div>
          <div className="notification-content">
            <div className="notification-title">{notification.title}</div>
            <div className="notification-message">{notification.message}</div>
          </div>
          <button className="close-notification" onClick={() => setNotification(null)} aria-label="Close notification">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
 
export default PythonNotebook
 
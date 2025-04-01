"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Editor } from "@monaco-editor/react"
import ReactDiffViewer from "react-diff-viewer"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vs, vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  PlayCircle,
  ChevronUp,
  ChevronDown,
  Trash2,
  Download,
  History,
  Code,
  Type,
  X,
  Moon,
  Sun,
  Save,
  FileCode,
  Layers,
  CheckCircle,
  XCircle,
  Clock,
  Info,
  Loader,
  GitBranch,
  MessageSquare,
  RefreshCw,
  User,
} from "lucide-react"
import {
  executeCode,
  fetchFileContent,
  saveFileContent,
  fetchVersionHistory,
  saveVersionHistory,
} from "../services/api"
import "../styles/pythonnotebook.css"

const PythonNotebook = ({ fileTabs = [], openFile, addTab, removeTab, onExecuteCode, onThemeChange }) => {
  const [cells, setCells] = useState([])
  const [executionState, setExecutionState] = useState({})
  const [activeTab, setActiveTab] = useState(null)
  const [versionHistory, setVersionHistory] = useState([])
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false)
  const [selectedVersionForDiff, setSelectedVersionForDiff] = useState(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [commitMessage, setCommitMessage] = useState("")
  const [notification, setNotification] = useState(null)
  const notificationTimeoutRef = useRef(null)
  const versionHistoryRef = useRef(null)
  const diffViewerRef = useRef(null)
  const [versionPage, setVersionPage] = useState(1)
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)
  const versionsPerPage = 10
  const normalizePath = useCallback((path) => path.replace(/\\/g, "/"), [])

  useEffect(() => {
    if (openFile && openFile.id !== activeTab?.id) {
      setActiveTab(openFile)
      loadFileContent(openFile)
    }
  }, [openFile, activeTab])

  const loadFileContent = useCallback(
    async (file) => {
      try {
        const normalizedPath = normalizePath(file.path)
        const content = await fetchFileContent(normalizedPath)

        if (!file.id) {
          console.error("File missing permanent ID:", file)
          alert("The selected file does not have a permanent ID. Please reload the application.")
          return
        }

        const parsedCells = parseFileContent(content, file.name)
        setCells(parsedCells)

        // Load version history immediately after loading file content
        refreshVersionHistory(normalizedPath)
      } catch (error) {
        console.error("Error loading file:", error)
        alert("Failed to load file. Please check the console for details.")
      }
    },
    [normalizePath],
  )

  const refreshVersionHistory = useCallback(
    async (filePath) => {
      const path = filePath || (openFile ? normalizePath(openFile.path) : null)
      if (!path) return

      try {
        setIsLoadingVersions(true)
        const history = await fetchVersionHistory(path)
        console.log("Fetched version history:", history)

        if (Array.isArray(history)) {
          setVersionHistory(history)
        } else {
          console.warn("Received non-array version history:", history)
          setVersionHistory([])
        }
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
    },
    [openFile, normalizePath],
  )

  const parseFileContent = useCallback((content, fileName) => {
    const fileExtension = fileName.split(".").pop().toLowerCase();
    let parsedCells = [];
  
    if (!content || content.trim().length === 0) {
      return [
        createNewCell({
          content: "# Empty file. Add your code here.",
          type: "code",
          mode: "python",
        }),
      ];
    }
  
    if (fileExtension === "py") {
      parsedCells = content
        .split(/\n{2,}/) // Handles multi-line Python code properly
        .map((block) =>
          createNewCell({
            content: block.trim() || "# Empty block",
            type: "code",
            mode: "python",
          })
        );
    } else if (fileExtension === "ipynb") {
      try {
        const notebookData = content.trim() ? JSON.parse(content) : { cells: [] };
  
        // Ensure 'cells' key exists and is an array
        if (!notebookData.cells || !Array.isArray(notebookData.cells)) {
          console.warn("Invalid notebook format: 'cells' key missing or not an array.");
          notebookData.cells = [];
        }
  
        parsedCells = notebookData.cells.map((cell) =>
          createNewCell({
            id: cell.id || generateId(),
            content: (cell.source && cell.source.join("\n").trim()) || "# Empty cell",
            type: cell.cell_type === "code" ? "code" : "text",
            mode: "python",
          })
        );
      } catch (jsonError) {
        console.error("Error parsing JSON:", jsonError);
        alert("Failed to parse the notebook. It might be empty or corrupted.");
        return [
          createNewCell({
            content: "# Error loading notebook. Please check the file format.",
            type: "code",
            mode: "python",
          }),
        ];
      }
    } else {
      alert("Unsupported file type. Please upload a .py or .ipynb file.");
      return [];
    }
  
    return parsedCells.length > 0
      ? parsedCells
      : [
          createNewCell({
            content: "# Empty notebook. Start adding cells.",
            type: "code",
            mode: "python",
          }),
        ];
  }, []);
  

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

  const saveFileContentOnly = useCallback(async () => {
    if (!openFile) return

    setIsLoading(true)
    const contentToSave = generateFileContent(cells, openFile.name)

    try {
      const normalizedPath = normalizePath(openFile.path)
      await saveFileContent(normalizedPath, contentToSave)

      setNotification({
        type: "success",
        title: "File Saved",
        message: `${openFile.name} has been saved successfully.`,
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
  }, [openFile, cells, normalizePath])

  const generateFileContent = useCallback((cells, fileName) => {
    const fileExtension = fileName.split(".").pop().toLowerCase()

    if (fileExtension === "py") {
      return cells.map((cell) => cell.content).join("\n\n")
    } else if (fileExtension === "ipynb") {
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
    }
  }, [])

  const saveVersionHistoryManually = useCallback(
    async (message = "") => {
      if (!openFile?.path) {
        setNotification({
          type: "warning",
          title: "No File Open",
          message: "Please open a file before saving a version.",
        })
        return
      }

      setIsLoading(true)
      const filePath = normalizePath(openFile.path)
      const contentToSave = generateFileContent(cells, openFile.name)
      const commitMsg = message || commitMessage || "Manual save"

      try {
        const userId = localStorage.getItem("user_id")
        const userFullName = localStorage.getItem("user_full_name") || "Unknown User"

        if (!userId) {
          console.error("User ID is missing!")
          setNotification({
            type: "error",
            title: "User Not Found",
            message: "User ID is required to save version history.",
          })
          return
        }

        const timestamp = new Date().toISOString()
        await saveFileContent(filePath, contentToSave)

        // Create a new version with user information
        const newVersion = {
          id: Date.now(), // Temporary ID for UI purposes
          filePath,
          timestamp,
          content: contentToSave,
          commit_message: commitMsg.trim(),
          user_id: userId,
          full_name: userFullName,
        }

        // Update local state first for immediate feedback
        setVersionHistory((prevHistory) => [...prevHistory, newVersion])

        // Save to server
        await saveVersionHistory(filePath, [newVersion], userId)

        // Refresh version history to get server-assigned IDs
        setTimeout(() => refreshVersionHistory(filePath), 500)

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
    [openFile, cells, normalizePath, generateFileContent, commitMessage, refreshVersionHistory],
  )

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
  }, [])

  const addCellAfter = useCallback(
    (id, type) => {
      setCells((prevCells) => {
        const index = prevCells.findIndex((cell) => cell.id === id)
        if (index === -1) return prevCells

        const newCell = createNewCell({ type, mode: "python" })
        const updatedCells = [...prevCells]
        updatedCells.splice(index + 1, 0, newCell)

        return updatedCells
      })
    },
    [createNewCell],
  )

  const deleteCell = useCallback((id) => {
    setCells((prevCells) => prevCells.filter((cell) => cell.id !== id))
  }, [])

  const downloadActiveFile = useCallback(() => {
    if (!openFile) {
      setNotification({
        type: "warning",
        title: "No File Open",
        message: "Please open a file before downloading.",
      })
      return
    }

    try {
      const contentToDownload = generateFileContent(cells, openFile.name)
      const blob = new Blob([contentToDownload], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = openFile.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setNotification({
        type: "success",
        title: "Download Started",
        message: `${openFile.name} is being downloaded.`,
      })
    } catch (error) {
      console.error("Error downloading file:", error)
      setNotification({
        type: "error",
        title: "Download Failed",
        message: "Could not download the file. Please try again.",
      })
    }
  }, [openFile, cells, generateFileContent])

  const renderTabs = () => (
    <div className="file-tabs">
      {fileTabs.length > 0 ? (
        fileTabs.map((file) => (
          <div
            key={file.id}
            className={`tab ${activeTab?.id === file.id ? "active" : ""}`}
            onClick={() => {
              if (activeTab?.id !== file.id) {
                setActiveTab(file) // Only update state when switching
                loadFileContent(file)
              }
            }}
          >
            <FileCode size={16} />
            <span className="tab-name">{file.name}</span>
            <button
              className="close-tab"
              onClick={(e) => {
                e.stopPropagation()
                removeTab(file.id)
              }}
              aria-label="Close tab"
            >
              <X size={16} />
            </button>
          </div>
        ))
      ) : (
        <div className="no-tabs">No files open</div>
      )}
    </div>
  )

  const renderVersionHistoryModal = () => {
    const latestVersion = versionHistory.length > 0 
    ? [...versionHistory].sort((a, b) => b.id - a.id)[0] 
    : null;
  

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

    // Get user name directly from the version object
    const getUserName = (version) => {
      return version.full_name || "Unknown User"
    }

    return (
      <div className={`version-history-modal ${isDarkMode ? "dark" : ""}`}>
        <div className="modal-header">
          <h3>Version History</h3>
          <div className="modal-actions">
            <button
              className="refresh-versions-btn"
              onClick={() => refreshVersionHistory(openFile?.path ? normalizePath(openFile.path) : null)}
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
                  <div
                    key={version.id || index}
                    className={`version-item ${selectedVersionForDiff === version ? "selected" : ""}`}
                  >
                    <div className="version-header">
                      <div className="version-commit">
                        <MessageSquare size={16} />
                        {version.commit_message || "Manual Save"}
                      </div>
                      <div className="version-timestamp">
                        <Clock size={14} />
                        {formatTimestamp(version.timestamp || version.created_at)}
                      </div>
                      <div className="version-user">
                        <div className="user-info">
                          <User size={14} />
                          {getUserName(version)}
                        </div>
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
                              const encodedFilePath = encodeURIComponent(version.filePath || openFile?.path).replace(
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
                              loadFileContent(openFile)

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
            ) : isLoadingVersions ? (
              <div className="loading-indicator">
                <Loader size={24} className="spin" />
                <span>Loading version history...</span>
              </div>
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
                    <span>Previous:</span>{" "}
                    {formatTimestamp(selectedVersionForDiff.timestamp || selectedVersionForDiff.created_at)}
                  </div>
                  <div className="diff-new-version">
                    <span>Current:</span> {formatTimestamp(latestVersion.timestamp || latestVersion.created_at)}
                  </div>
                </div>
              </div>

              <div className="scrollable-diff-content">
                {extractCodeCells(selectedVersionForDiff).map((oldCell, index) => {
                  const newCell = extractCodeCells(latestVersion)[index] || { content: "" }

                  return (
                    <div key={index} className="diff-cell">
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

  const runCell = useCallback(
    async (id) => {
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
    [cells, executionState, formatTabularData],
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
      {renderTabs()}

      <div className="editor-header">
        <div className="editor-actions">
          <button
            className="action-button"
            onClick={saveFileContentOnly}
            disabled={isLoading || !openFile}
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
            disabled={isLoading || !openFile}
            title="Version History"
          >
            <History size={16} />
            <span>Save Version</span>
          </button>

          <button
            className="action-button"
            onClick={downloadActiveFile}
            disabled={isLoading || !openFile}
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
          {cells.map((cell, index) => (
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
                    disabled={index === cells.length - 1 || cell.isRunning}
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

                <button
                  className="add-cell-btn text-btn"
                  onClick={() => addCellAfter(cell.id, "text")}
                  title="Add Text Cell"
                >
                  <Type size={14} /> Add Text Cell
                </button>
              </div>
            </div>
          ))}

          {cells.length === 0 && (
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


 
"use client"
import { useState, useEffect, useRef } from "react"
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  Database,
  Table,
  Download,
  Search,
  Plus,
  FileText,
  FilePlus,
  FolderPlus,
  Trash,
  Edit,
  FileCode,
  RefreshCw,
  X,
  Laptop,
  ChevronLeft,
  Menu,
} from "lucide-react"
import {
  createItem,
  renameItem,
  deleteItem,
  fetchMetadata,
  importTableData,
  exportTableData,
  fetchFileContent,
} from "../services/api"
import "../styles/leftbar.css"
import FileShare from "./shareModel/FileShare"
import AppSidebar from "./shareModel/AppSidebar"
 
const LeftBar = ({ onOpenFile, onFileStructureChange, theme, onThemeChange }) => {
  const [fileStructure, setFileStructure] = useState([])
  const [expandedFolders, setExpandedFolders] = useState({})
  const [contextMenu, setContextMenu] = useState(null)
  const [selectedFolderPath, setSelectedFolderPath] = useState("")
  const [metadata, setMetadata] = useState([])
  const [viewMode, setViewMode] = useState("file-manager")
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [ownedFiles, setOwnedFiles] = useState([])
  const [sharedFiles, setSharedFiles] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [fileToShare, setFileToShare] = useState(null)
 
  const searchInputRef = useRef(null)
  const leftBarRef = useRef(null)
  const resizeHandleRef = useRef(null)
  const isResizingRef = useRef(false)
  const startWidthRef = useRef(0)
  const startXRef = useRef(0)
 
  useEffect(() => {
    loadFileStructure()
    loadMetadata()
 
    const handleClickOutside = (e) => {
      if (contextMenu && e.target.closest(".context-menu")) return
      setContextMenu(null)
    }
 
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setContextMenu(null)
      }
    }
 
    document.addEventListener("click", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
 
    return () => {
      document.removeEventListener("click", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [contextMenu])
 
  useEffect(() => {
    const resizeHandle = resizeHandleRef.current
    const leftBar = leftBarRef.current
 
    if (!resizeHandle || !leftBar) return
 
    const handleMouseDown = (e) => {
      e.preventDefault()
      isResizingRef.current = true
      setIsDragging(true)
      document.body.style.cursor = "ew-resize"
      document.body.style.userSelect = "none"
 
      startWidthRef.current = leftBar.offsetWidth
      startXRef.current = e.clientX
 
      resizeHandle.classList.add("active")
 
      const handleMouseMove = (e) => {
        if (!isResizingRef.current) return
 
        const deltaX = e.clientX - startXRef.current
        const newWidth = Math.max(50, Math.min(500, startWidthRef.current + deltaX))
 
        if (newWidth <= 50) {
          setIsCollapsed(true)
        } else {
          setIsCollapsed(false)
          leftBar.style.width = `${newWidth}px`
          document.documentElement.style.setProperty("--sidebar-width", `${newWidth}px`)
        }
      }
 
      const handleMouseUp = () => {
        isResizingRef.current = false
        setIsDragging(false)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
        resizeHandle.classList.remove("active")
 
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
 
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }
 
    resizeHandle.addEventListener("mousedown", handleMouseDown)
 
    return () => {
      resizeHandle.removeEventListener("mousedown", handleMouseDown)
    }
  }, [])
 
  const loadMetadata = async () => {
    setIsLoading(true)
    try {
      const data = await fetchMetadata()
      setMetadata(data)
    } catch (error) {
      console.error("Error loading metadata:", error)
      const errorMessage = error.response?.data?.message || "Server error occurred."
      setAlert({
        type: "error",
        title: "Loading Failed",
        message: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }
 
  const loadFileStructure = async () => {
    try {
      setIsLoading(true)
      const userId = localStorage.getItem("user_id")
 
      // Fetch owned files
      const ownedResponse = await fetch("http://localhost:5000/files", {
        method: "GET",
        headers: { "X-User-ID": userId },
      })
 
      if (!ownedResponse.ok) {
        throw new Error(`Failed to load owned files: ${ownedResponse.status}`)
      }
 
      const ownedData = await ownedResponse.json()
 
      // Fetch shared files
      const sharedResponse = await fetch("http://localhost:5000/api/shared_files", {
        method: "GET",
        headers: { "X-User-ID": userId },
      })
 
      if (!sharedResponse.ok) {
        throw new Error(`Failed to load shared files: ${sharedResponse.status}`)
      }
 
      const sharedData = await sharedResponse.json()
 
      // Normalize owned files
      const normalizedOwnedFiles = (ownedData.files || []).map((file) => ({
        ...file,
        path: file.path || "",
      }))
 
      // Normalize shared files
      const normalizedSharedFiles = (sharedData.shared_files || []).map((file) => ({
        ...file,
        path: file.file_path || "",
        id: file.file_id || file.id,
      }))
 
      setOwnedFiles(normalizedOwnedFiles)
      setSharedFiles(normalizedSharedFiles)
 
      // Combine all files for the file structure
      const allFiles = [...normalizedOwnedFiles, ...normalizedSharedFiles]
      setFileStructure(allFiles)
 
      if (onFileStructureChange) {
        onFileStructureChange(allFiles)
      }
    } catch (error) {
      console.error("Error fetching file structure:", error)
      setAlert({
        type: "error",
        title: "Loading Failed",
        message: error.message || "Failed to load file structure.",
      })
    } finally {
      setIsLoading(false)
    }
  }
 
  const handleFileDoubleClick = async (file) => {
    try {
      // Extract the file path, handle different key names
      const filePath = file?.path || file?.Path || file?.filepath || file?.file_path
 
      if (!filePath) {
        console.error("Missing file path.")
        setAlert({
          type: "error",
          title: "Error",
          message: "Invalid file selected or missing path.",
        })
        return
      }
 
      // Normalize the file path (replace backslashes with slashes, remove potential leading './', '../', or 'user_workspace/')
      const normalizedFilePath = filePath.replace(/^(\.\/|\.\.\/|user_workspace[\\/])/, "").trim()
      console.log(`🔍 Normalized file path: ${normalizedFilePath}`)
 
      // Fetch the content from the backend API
      let content = await fetchFileContent(normalizedFilePath)
 
      // Extract file name and extension for further checks
      const fileName = file.name || file.file_name
      const fileExtension = fileName.split(".").pop().toLowerCase()
 
      // If content is empty, provide default content based on the file extension
      if (!content.trim()) {
        content = fileExtension === "py" ? "# New file. Start writing your code here." : ""
      }
 
      // Open the file with content
      onOpenFile({ ...file, content })
    } catch (error) {
      console.error("Error loading file:", error)
      setAlert({
        type: "error",
        title: "Loading Failed",
        message: "Failed to load file.",
      })
    }
  }
 
  const handleSharedFileDoubleClick = async (file) => {
    try {
      // Log the file object for debugging
      console.log("Shared File Object:", file)
 
      // Use the normalized `path` property
      const filePath = file.path || ""
      if (!filePath) {
        console.error("Missing file path for file:", file)
        setAlert({
          type: "error",
          title: "Error",
          message: `Error: Unable to open file "${file.file_name}". File path is missing.`,
        })
        return
      }
 
      // Normalize the file path
      const normalizedFilePath = filePath.replace(/^(\.\/|\.\.\/|user_workspace[\\/])/, "").trim()
      let content = await fetchFileContent(normalizedFilePath)
 
      const fileName = file.file_name || file.name
      const fileExtension = fileName.split(".").pop().toLowerCase()
 
      if (!content.trim()) {
        content = fileExtension === "py" ? "# Start writing your Python code here." : ""
      }
 
      // Pass the file object to `onOpenFile`
      onOpenFile({ ...file, content })
    } catch (error) {
      console.error("Error loading shared file:", error)
      setAlert({
        type: "error",
        title: "Loading Failed",
        message: "Error: Unable to load the file content.",
      })
    }
  }
 
  const openShareModal = (file) => {
    setFileToShare(file)
    setShareModalOpen(true)
    setSelectedUsers([])
  }
 
  const handleShareSuccess = () => {
    setShareModalOpen(false)
    loadFileStructure()
    setAlert({
      type: "success",
      title: "File Shared",
      message: "File shared successfully!",
    })
  }
 
  const toggleFolder = (path) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }))
  }
 
  const handleRightClick = (event, item) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({ x: event.clientX, y: event.clientY, item })
    setSelectedFolderPath(item.path || "")
  }
 
  const showPrompt = (message, defaultValue = "") => {
    return new Promise((resolve) => {
      const result = window.prompt(message, defaultValue)
      resolve(result)
    })
  }
 
  const generateUniqueFileName = async (fileName, userId) => {
    let counter = 1
    let newFileName = fileName
    const takenNames = new Set()
 
    while (true) {
      const checkResponse = await fetch(
        `http://localhost:5000/api/check_file_exists?name=${encodeURIComponent(newFileName)}&user_id=${userId}`,
      ).then((res) => res.json())
 
      if (!checkResponse.exists) {
        return newFileName
      }
 
      takenNames.add(newFileName)
 
      const [baseName, extension] = fileName.includes(".")
        ? [fileName.slice(0, fileName.lastIndexOf(".")), fileName.slice(fileName.lastIndexOf("."))]
        : [fileName, ""]
 
      do {
        newFileName = `${baseName}_${counter}${extension}`
        counter++
      } while (takenNames.has(newFileName))
    }
  }
 
  const handleCreateItem = async () => {
    try {
      const newItemName = await showPrompt("Enter name:")
      if (!newItemName) return
 
      const newItemType = await showPrompt("Enter type (file/folder):")
      if (!newItemType || !["file", "folder"].includes(newItemType.toLowerCase())) {
        setAlert({
          type: "error",
          title: "Invalid Type",
          message: "Type must be either 'file' or 'folder'.",
        })
        return
      }
 
      const creatorName = localStorage.getItem("full_name") || "Unknown User"
      const creatorId = localStorage.getItem("user_id") || "Unknown ID"
      const folderPath = "./user_workspace"
 
      setIsLoading(true)
 
      const response = await fetch("http://localhost:5000/api/create_file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Full-Name": creatorName,
          "X-User-ID": creatorId,
        },
        body: JSON.stringify({
          path: folderPath,
          name: newItemName,
          type: newItemType.toLowerCase(),
        }),
      }).then((res) => res.json())
 
      if (response.status === "success") {
        setAlert({
          type: "success",
          title: "Item Created",
          message: `Successfully created ${newItemType}: ${newItemName}`,
        })
        await loadFileStructure()
      } else {
        throw new Error(response.message || "Failed to create item.")
      }
    } catch (error) {
      console.error("Error creating item:", error)
      setAlert({
        type: "error",
        title: "Creation Failed",
        message: error.message || "Failed to create item.",
      })
    } finally {
      setIsLoading(false)
    }
  }
 
  const handleOptionClick = async (action, item = null) => {
    const targetItem = item || contextMenu?.item
    if (!targetItem) return
 
    try {
      setIsLoading(true)
 
      if (action === "create") {
        const name = await showPrompt("Enter name:")
        if (!name) return
 
        const type = await showPrompt("Enter type: 'file' or 'folder':")
        if (!type || !["file", "folder"].includes(type.toLowerCase())) {
          setAlert({
            type: "error",
            title: "Invalid Type",
            message: "Type must be either 'file' or 'folder'.",
          })
          return
        }
 
        let targetPath = targetItem.path
        if (targetItem.type === "folder") {
          targetPath = `${targetPath}/${targetItem.name}`
        }
 
        await createItem(targetPath, name, type.toLowerCase())
        setAlert({
          type: "success",
          title: "Item Created",
          message: `Successfully created ${type}: ${name}`,
        })
      } else if (action === "rename") {
        const newName = await showPrompt("Enter new name:", targetItem.name)
        if (!newName || newName === targetItem.name) return
 
        await renameItem(targetItem.path, targetItem.name, newName)
        setAlert({
          type: "success",
          title: "Item Renamed",
          message: `Successfully renamed to: ${newName}`,
        })
      } else if (action === "delete") {
        const confirmed = window.confirm(`Are you sure you want to delete ${targetItem.name}?`)
        if (!confirmed) return
 
        await deleteItem(targetItem.path, targetItem.name)
        setAlert({
          type: "success",
          title: "Item Deleted",
          message: `Successfully deleted: ${targetItem.name}`,
        })
      }
 
      await loadFileStructure()
    } catch (error) {
      console.error(`Error during ${action}:`, error)
      const errorMessage =
        error.message && error.message.includes("localhost")
          ? "An unexpected error occurred."
          : error.message || `Failed to ${action} item.`
 
      setAlert({
        type: "error",
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} Failed`,
        message: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
 
    setContextMenu(null)
  }
 
  const getItemIcon = (item) => {
    if (item.type === "folder") {
      return <Folder className="item-type-icon folder" size={16} />
    }
 
    const fileName = item.name || item.file_name || ""
    const extension = fileName.split(".").pop().toLowerCase()
 
    if (["py", "ipynb"].includes(extension)) {
      return <FileCode className="file-icon python" size={16} />
    } else if (["js", "jsx", "ts", "tsx"].includes(extension)) {
      return <FileText className="file-icon js" size={16} />
    } else if (["json", "yaml", "yml"].includes(extension)) {
      return <File className="file-icon config" size={16} />
    } else {
      return <File className="file-icon" size={16} />
    }
  }
 
  const renderFileTree = (items, depth = 0) => {
    return items.map((item) => {
      const itemPath = `${item.path}/${item.name}`
      const isExpanded = expandedFolders[itemPath]
      const hasChildren = item.type === "folder" && item.children && item.children.length > 0
 
      return (
        <div key={itemPath} className={`tree-item ${item.type}`} style={{ paddingLeft: `${depth * 12}px` }}>
          <div
            className="tree-item-content"
            onContextMenu={(e) => handleRightClick(e, item)}
            onClick={() => item.type === "folder" && toggleFolder(itemPath)}
            onDoubleClick={() => {
              if (item.type === "file") {
                if (item.isShared) {
                  handleSharedFileDoubleClick(item)
                } else {
                  handleFileDoubleClick(item)
                }
              }
            }}
          >
            {item.type === "folder" && (
              <span className="folder-toggle">
                {hasChildren && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
              </span>
            )}
            {getItemIcon(item)}
            <span className="item-name">{item.name}</span>
          </div>
 
          {item.type === "folder" && isExpanded && item.children && (
            <div className="nested-items">{renderFileTree(item.children, depth + 1)}</div>
          )}
        </div>
      )
    })
  }
 
  const organizeMetadata = (data) => {
    const schemas = {}
    data.forEach(([tableSchema, tableName, columnName, dataType]) => {
      if (!schemas[tableSchema]) schemas[tableSchema] = {}
      if (!schemas[tableSchema][tableName]) schemas[tableSchema][tableName] = []
      schemas[tableSchema][tableName].push({ columnName, dataType })
    })
    return schemas
  }
 
  const downloadTableAsCSV = async (schemaName, tableName) => {
    try {
      setIsLoading(true)
      await exportTableData(schemaName, tableName, "csv")
      setAlert({
        type: "success",
        title: "Export Successful",
        message: `Table ${tableName} exported as CSV.`,
      })
    } catch (error) {
      console.error("Error exporting table as CSV:", error)
      setAlert({
        type: "error",
        title: "Export Failed",
        message: "Failed to export table as CSV.",
      })
    } finally {
      setIsLoading(false)
    }
  }
 
  const downloadTableAsJSON = async (schemaName, tableName) => {
    try {
      setIsLoading(true)
      await exportTableData(schemaName, tableName, "json")
      setAlert({
        type: "success",
        title: "Export Successful",
        message: `Table ${tableName} exported as JSON.`,
      })
    } catch (error) {
      console.error("Error exporting table as JSON:", error)
      setAlert({
        type: "error",
        title: "Export Failed",
        message: "Failed to export table as JSON.",
      })
    } finally {
      setIsLoading(false)
    }
  }
 
  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
 
    try {
      const schema = await showPrompt("Enter schema name:")
      if (!schema) return
 
      const table = await showPrompt("Enter table name:")
      if (!table) return
 
      setIsLoading(true)
      await importTableData(schema, table, file)
      setAlert({
        type: "success",
        title: "Import Successful",
        message: `File successfully imported to ${schema}.${table}.`,
      })
      await loadMetadata()
    } catch (error) {
      console.error("Error importing file:", error)
      setAlert({
        type: "error",
        title: "Import Failed",
        message: "Failed to import file.",
      })
    } finally {
      setIsLoading(false)
    }
  }
 
  const showDownloadOptions = (e, schemaName, tableName) => {
    e.stopPropagation()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      options: [
        {
          label: "Download CSV",
          icon: <Download size={14} />,
          action: () => downloadTableAsCSV(schemaName, tableName),
        },
        {
          label: "Download JSON",
          icon: <Download size={14} />,
          action: () => downloadTableAsJSON(schemaName, tableName),
        },
      ],
    })
  }
 
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    if (onThemeChange) {
      onThemeChange(newTheme)
    }
  }
  const fetchSharedFiles = async () => {
    try {
      const response = await axios.get("/api/shared_files");
      setSharedFiles(response.data); // Ensure shared files update in the state
    } catch (error) {
      console.error("Error fetching shared files:", error);
    }
  };
 
  const organizedMetadata = organizeMetadata(metadata)
  const filteredMetadata = Object.entries(organizedMetadata).filter(([schemaName]) =>
    schemaName.toLowerCase().includes(searchTerm.toLowerCase()),
  )
 
  useEffect(() => {
    document.body.classList.toggle("sidebar-open", !isCollapsed)
 
    const contentWrappers = document.querySelectorAll(".content-wrapper")
    contentWrappers.forEach((wrapper) => {
      wrapper.classList.toggle("sidebar-collapsed", isCollapsed)
    })
 
    return () => {
      document.body.classList.remove("sidebar-open")
    }
  }, [isCollapsed])
 
  return (
    <>
      <div
        ref={leftBarRef}
        className={`file-manager ${theme} ${isCollapsed ? "collapsed" : ""} ${isDragging ? "dragging" : ""}`}
        style={{ zIndex: isDragging ? 1100 : 1000 }}
      >
        <div className="header">
          <div className="view-mode-toggle">
            <button
              className={`view-mode-btn ${viewMode === "file-manager" ? "active" : ""}`}
              onClick={() => setViewMode("file-manager")}
              title="File Explorer"
            >
              <Laptop size={16} />
              <span>Files</span>
            </button>
            <button
              className={`view-mode-btn ${viewMode === "object-explorer" ? "active" : ""}`}
              onClick={() => setViewMode("object-explorer")}
              title="Object Explorer"
            >
              <Database size={16} />
              <span>Database</span>
            </button>
          </div>
          <div className="header-actions">
            {viewMode === "file-manager" && (
              <button className="action-button" onClick={handleCreateItem} title="Create New Item">
                <Plus size={16} />
              </button>
            )}
            {viewMode === "object-explorer" && (
              <label className="action-button import-button" title="Import File">
                <input type="file" onChange={handleImport} hidden />
                <Download size={12} />
              </label>
            )}
            <button
              className="action-button"
              onClick={viewMode === "file-manager" ? loadFileStructure : loadMetadata}
              title="Refresh"
            >
              <RefreshCw size={16} className={isLoading ? "spin" : ""} />
            </button>
          </div>
        </div>
        <div className={`search-container ${isSearchFocused ? "focused" : ""}`}>
          <Search size={16} className="search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={`Search ${viewMode === "file-manager" ? "files" : "schemas"}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="search-bar"
          />
          {searchTerm && (
            <button
              className="clear-search"
              onClick={() => {
                setSearchTerm("")
                searchInputRef.current?.focus()
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="main-body">
          {viewMode === "file-manager" && (
            <div className="file-manager-content">
              {fileStructure.length === 0 && !isLoading ? (
                <div className="empty-state">
                  <Folder size={24} />
                  <p>No files found. Create your first file or folder!</p>
                  <button className="create-first-item" onClick={handleCreateItem}>
                    <Plus size={14} /> Create New
                  </button>
                </div>
              ) : (
                <AppSidebar
                  ownedFiles={ownedFiles}
                  sharedFiles={sharedFiles}
                  fetchSharedFiles={fetchSharedFiles}
                  handleFileDoubleClick={handleFileDoubleClick}
                  handleSharedFileDoubleClick={handleSharedFileDoubleClick}
                  openShareModal={openShareModal}
                  getItemIcon={getItemIcon}
                  isLoading={isLoading}
                  addTab={onOpenFile}
                />
              )}
            </div>
          )}
          {viewMode === "object-explorer" && (
            <div className="object-explorer-content">
              {filteredMetadata.length === 0 ? (
                <div className="empty-state">
                  <Database size={24} />
                  <p>No schemas found. Import data to get started.</p>
                  <label className="import-first-item">
                    <input type="file" onChange={handleImport} hidden />
                    <Plus size={14} /> Import Data
                  </label>
                </div>
              ) : (
                filteredMetadata.map(([schemaName, tables]) => (
                  <div key={schemaName} className="schema">
                    <div className="schema-header" onClick={() => toggleFolder(`schema-${schemaName}`)}>
                      {expandedFolders[`schema-${schemaName}`] ? (
                        <ChevronDown size={16} className="folder-icon" />
                      ) : (
                        <ChevronRight size={16} className="folder-icon" />
                      )}
                      <Database size={16} className="item-type-icon database" />
                      <span className="schema-name">{schemaName}</span>
                    </div>
                    {expandedFolders[`schema-${schemaName}`] && (
                      <div className="tables">
                        {Object.entries(tables).map(([tableName, columns]) => (
                          <div key={tableName} className="table">
                            <div
                              className="table-header"
                              onClick={() => toggleFolder(`table-${tableName}`)}
                              onContextMenu={(e) => showDownloadOptions(e, schemaName, tableName)}
                            >
                              {expandedFolders[`table-${tableName}`] ? (
                                <ChevronDown size={16} className="folder-icon" />
                              ) : (
                                <ChevronRight size={16} className="folder-icon" />
                              )}
                              <Table size={16} className="item-type-icon table" />
                              <span className="table-name">{tableName}</span>
                              <Download
                                size={14}
                                className="download-icon"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  showDownloadOptions(e, schemaName, tableName)
                                }}
                              />
                            </div>
                            {expandedFolders[`table-${tableName}`] && (
                              <div className="columns">
                                {columns.map((column, index) => (
                                  <div key={index} className="column">
                                    <div className="column-icon-container">
                                      <File size={14} className="column-icon" />
                                    </div>
                                    <span className="column-name">{column.columnName}</span>
                                    <span className="data-type">{column.dataType}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <div className="resize-handle" ref={resizeHandleRef}></div>
        {contextMenu && (
          <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
            {contextMenu.options ? (
              contextMenu.options.map((option, index) => (
                <button
                  key={index}
                  className="context-option"
                  onClick={() => {
                    option.action()
                    setContextMenu(null)
                  }}
                >
                  {option.icon && <span className="option-icon">{option.icon}</span>}
                  {option.label}
                </button>
              ))
            ) : (
              <>
                <button className="context-option" onClick={() => handleOptionClick("create")}>
                  <FilePlus size={14} />
                  <span>New File</span>
                </button>
                <button className="context-option" onClick={() => handleOptionClick("create")}>
                  <FolderPlus size={14} />
                  <span>New Folder</span>
                </button>
                <button className="context-option" onClick={() => handleOptionClick("rename")}>
                  <Edit size={14} />
                  <span>Rename</span>
                </button>
                <button className="context-option" onClick={() => handleOptionClick("delete")}>
                  <Trash size={14} />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <button
        className={`sidebar-toggle ${isCollapsed ? "collapsed" : ""}`}
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
      </button>
      {shareModalOpen && fileToShare && (
        <FileShare
          fileId={fileToShare.id}
          onClose={() => setShareModalOpen(false)}
          onShareSuccess={handleShareSuccess}
          setAlert={setAlert}
        />
      )}
      <style jsx>{`
        .shared-files-heading {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid var(--border-color, #e5e7eb);
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .shared-files-list .file-list-item {
          background-color: rgba(59, 130, 246, 0.05);
          border-left: 3px solid #3b82f6;
        }
        .shared-by {
          font-size: 0.75rem;
          color: var(--text-secondary, #6b7280);
          margin-left: auto;
          padding-left: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 120px;
        }
        .shared-file .file-name {
          max-width: calc(100% - 130px);
        }
      `}</style>
    </>
  )
}
 
export default LeftBar;
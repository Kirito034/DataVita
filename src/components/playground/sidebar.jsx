"use client"

import { useState, useRef, useEffect } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  List,
  Layers,
  Plus,
  Folder,
  Upload,
  FileText,
  FileIcon as FileHtml,
  FileCodeIcon as FileCss,
  FileCode,
  Trash2,
  Package,
  Search,
  RefreshCw,
  ArrowLeft,
} from "lucide-react"
import PlaygroundServices from "../../services/playgroundServices"
import styles from "../../styles/playground.module.css"
import { DEFAULT_TEMPLATES, PROJECT_TEMPLATES } from "../playground/constants"

// NPM Registry API
const NPM_REGISTRY_API = "https://registry.npmjs.org"

// Popular npm packages for quick installation
const POPULAR_PACKAGES = [
  { name: "react", version: "18.2.0", description: "A JavaScript library for building user interfaces." },
  { name: "react-dom", version: "18.2.0", description: "React package for working with the DOM." },
  {
    name: "lodash",
    version: "4.17.21",
    description: "A modern JavaScript utility library delivering modularity, performance & extras.",
  },
  { name: "axios", version: "1.4.0", description: "Promise based HTTP client for the browser and node.js" },
  { name: "prettier", version: "2.8.8", description: "Code formatter" },
  { name: "eslint", version: "8.0.0", description: "JavaScript linter" },
  { name: "vite", version: "4.4.9", description: "Next generation frontend tooling" },
  { name: "@vitejs/plugin-react", version: "4.0.4", description: "React plugin for Vite" },
  { name: "zustand", version: "4.4.1", description: "Bear necessities for state management in React" },
  {
    name: "tailwindcss",
    version: "3.3.3",
    description: "A utility-first CSS framework for rapidly building custom user interfaces",
  },
]

// Filter project templates to only include HTML and React options
const FILTERED_PROJECT_TEMPLATES = {
  basic: PROJECT_TEMPLATES.basic, // HTML option
  react: PROJECT_TEMPLATES.react, // React option
}

export default function Sidebar({
  files,
  setFiles,
  activeFile,
  expandedFolders,
  toggleFolder,
  openFileInTab,
  deleteFile,
  selectedFolderId,
  setSelectedFolderId,
  isCreatingProject,
  setIsCreatingProject,
  newProjectName,
  setNewProjectName,
  selectedProjectTemplate,
  setSelectedProjectTemplate,
  projectTemplates,
  createNewProject,
  isLoading,
  loadUserFiles,
  packages,
  setPackages,
  updateFileContent,
  addConsoleLog,
  setIsSidebarOpen,
  setExpandedFolders,
  currentProject,
  userId,
  goBackToProjects,
  projectType,
  openTabs,
  deletedOpenFiles,
  setDeletedOpenFiles,
}) {
  const [activeSidebarTab, setActiveSidebarTab] = useState("files")
  const [fileViewMode, setFileViewMode] = useState("tree")
  const [isCreatingFile, setIsCreatingFile] = useState(false)
  const [newFileName, setNewFileName] = useState("")
  const [newFileType, setNewFileType] = useState("javascript")
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, fileId: null, type: null })
  const [packageSearch, setPackageSearch] = useState("")
  const [isInstallingPackage, setIsInstallingPackage] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  const searchTimeoutRef = useRef(null)

  // Track deleted files that are still open in tabs
  useEffect(() => {
    // When a file is deleted, check if it's open in a tab
    const trackDeletedFiles = () => {
      // For each open tab, check if the file still exists in the files array
      openTabs.forEach((tab) => {
        const fileExists = files.some((f) => f.id === tab.id)

        if (!fileExists && !deletedOpenFiles.some((df) => df.id === tab.id)) {
          // This file is open in a tab but has been deleted
          // Add it to our deletedOpenFiles state
          setDeletedOpenFiles((prev) => [...prev, tab])
        }
      })
    }

    trackDeletedFiles()
  }, [files, openTabs, deletedOpenFiles, setDeletedOpenFiles])

  // Get file icon based on file type
  const getFileIcon = (fileType) => {
    switch (fileType) {
      case "html":
        return <FileHtml size={16} />
      case "css":
        return <FileCss size={16} />
      case "javascript":
      case "jsx":
      case "tsx":
        return <FileCode size={16} />
      case "json":
        return <FileCode size={16} />
      default:
        return <FileText size={16} />
    }
  }

  // Create a new file
  const createNewFile = async () => {
    if (!newFileName.trim()) {
      addConsoleLog("File name cannot be empty", "error")
      return
    }

    // Determine the path based on selected folder
    const path = selectedFolderId
      ? files.find((f) => f.id === selectedFolderId)?.path + "/" + files.find((f) => f.id === selectedFolderId)?.name
      : "/"

    // Check if file already exists in the same path
    const fileExists = files.some((file) => file.name === newFileName && file.path === path)

    if (fileExists) {
      addConsoleLog(`File '${newFileName}' already exists in ${path}`, "error")
      return
    }

    // Determine content based on file type and name
    let content = ""

    // If it's an HTML file, use a template with proper structure
    if (newFileType === "html") {
      content = DEFAULT_TEMPLATES.html
    } else if (newFileType === "css") {
      content = DEFAULT_TEMPLATES.css
    } else if (newFileType === "javascript") {
      content = DEFAULT_TEMPLATES.javascript
    } else if (newFileType === "jsx") {
      content = DEFAULT_TEMPLATES.jsx
    } else if (newFileType === "json") {
      content = DEFAULT_TEMPLATES.json
    }

    const tempId = `local_${Date.now()}`

    const newFile = {
      id: tempId, // Use local_ prefix for unsaved files
      name: newFileName,
      type: newFileType,
      content: content,
      path: path,
      lastModified: new Date().toISOString(),
      project_id: currentProject?.id, // Associate with current project
    }

    // Add to local state first
    setFiles((prev) => [...prev, newFile])

    // Open the new file in a tab
    openFileInTab(newFile)

    // Try to save to server if we have a project
    if (currentProject?.id && userId) {
      try {
        const fileNameParts = newFileName.split(".")
        const fileExtension = fileNameParts.pop()
        const fileName = fileNameParts.join(".")

        const fileData = {
          file_name: fileName,
          file_extension: fileExtension,
          file_content: content,
          file_path: path,
          user_id: userId,
          project_id: currentProject.id,
        }

        const response = await PlaygroundServices.createPlaygroundFile(fileData)

        // Update the file ID with the one from the server
        setFiles((prev) => prev.map((f) => (f.id === tempId ? { ...f, id: response.file_id || response.id } : f)))

        addConsoleLog(`Created and saved new file: ${newFileName}`, "success")
      } catch (error) {
        console.error("Error saving file to server:", error)
        addConsoleLog(`File created locally but failed to save to server: ${error.message}`, "warning")
      }
    } else {
      addConsoleLog(`Created new file: ${newFileName} (not saved to server)`, "info")
    }

    setIsCreatingFile(false)
    setNewFileName("")
  }

  // Handle file change
  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)

    try {
      // Read file content
      const fileContent = await readFileContent(selectedFile)

      // Get file extension
      const fileName = selectedFile.name
      const fileNameParts = fileName.split(".")
      const fileExtension = fileNameParts.pop()
      const fileNameWithoutExt = fileNameParts.join(".")

      // Create file data object
      const fileData = {
        file_name: fileNameWithoutExt,
        file_extension: fileExtension,
        file_content: fileContent,
        user_id: userId,
        project_id: currentProject?.id,
        file_path: "/",
      }

      // Save to server
      const response = await PlaygroundServices.createPlaygroundFile(fileData)

      // Create a file object in our app's format
      const newFile = {
        id: response.file_id || response.id,
        name: `${fileNameWithoutExt}.${fileExtension}`,
        type: fileExtension,
        content: fileContent,
        path: "/",
        lastModified: new Date().toISOString(),
        project_id: currentProject?.id,
      }

      // Add to files state
      setFiles((prev) => [...prev, newFile])

      // Open the file
      openFileInTab(newFile)

      // Reset form
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      addConsoleLog(`Uploaded file: ${fileName}`, "success")
    } catch (error) {
      console.error("Error uploading file:", error)
      addConsoleLog(`Failed to upload file: ${error.message}`, "error")
    } finally {
      setIsUploading(false)
    }
  }

  // Helper function to read file content
  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (event) => {
        resolve(event.target.result)
      }

      reader.onerror = (error) => {
        reject(error)
      }

      reader.readAsText(file)
    })
  }

  // Add file uploader component
  const renderFileUploader = () => {
    return (
      <div className={styles.fileUploadForm}>
        <input
          type="file"
          id="file-upload"
          onChange={handleFileChange}
          className={styles.fileUploadInput}
          ref={fileInputRef}
        />
        <label htmlFor="file-upload" className={styles.fileUploadLabel}>
          <Upload size={16} style={{ marginRight: "5px" }} />
          {selectedFile ? selectedFile.name : "Choose a file"}
        </label>

        <button onClick={handleUpload} disabled={!selectedFile || isUploading} className={styles.fileUploadButton}>
          {isUploading ? (
            <>
              <RefreshCw size={14} className={styles.spinning} /> Uploading...
            </>
          ) : (
            "Upload"
          )}
        </button>
      </div>
    )
  }

  // Create a new folder
  const createNewFolder = async (parentFolderId = null) => {
    const folderName = prompt("Enter folder name:")
    if (!folderName) return

    // Determine the path based on parent folder
    let path = "/"
    if (parentFolderId) {
      const parentFolder = files.find((f) => f.id === parentFolderId)
      if (parentFolder) {
        path = parentFolder.path === "/" ? `/${parentFolder.name}` : `${parentFolder.path}/${parentFolder.name}`
      }
    }

    // Check if folder already exists in the same path
    const folderExists = files.some((file) => file.type === "folder" && file.name === folderName && file.path === path)

    if (folderExists) {
      addConsoleLog(`Folder '${folderName}' already exists in ${path}`, "error")
      return
    }

    const tempId = `local_folder_${Date.now()}`

    const newFolder = {
      id: tempId,
      name: folderName,
      type: "folder",
      path: path,
      project_id: currentProject?.id,
    }

    setFiles((prev) => [...prev, newFolder])

    // Expand the parent folder if it exists
    if (parentFolderId) {
      setExpandedFolders((prev) => ({
        ...prev,
        [parentFolderId]: true,
      }))
    }

    // Try to save to server if we have a project
    if (currentProject?.id && userId) {
      try {
        const folderData = {
          file_name: folderName,
          file_extension: "folder",
          file_content: "",
          file_path: path,
          user_id: userId,
          project_id: currentProject.id,
          isFolder: true,
        }

        const response = await PlaygroundServices.createPlaygroundFile(folderData)

        // Update the folder ID with the one from the server
        setFiles((prev) => prev.map((f) => (f.id === tempId ? { ...f, id: response.file_id || response.id } : f)))

        addConsoleLog(`Created and saved new folder: ${folderName}`, "success")
      } catch (error) {
        console.error("Error saving folder to server:", error)
        addConsoleLog(`Folder created locally but failed to save to server: ${error.message}`, "warning")
      }
    } else {
      addConsoleLog(`Created new folder: ${folderName} (not saved to server)`, "info")
    }
  }

  // Handle context menu for files and folders
  const handleContextMenu = (event, fileId, type = "file") => {
    event.preventDefault()
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      fileId,
      type,
    })
  }

  // Handle context menu actions
  const handleContextMenuAction = (action) => {
    const file = files.find((f) => f.id === contextMenu.fileId)

    switch (action) {
      case "rename":
        if (file) {
          const newName = prompt("Enter new name:", file.name)
          if (newName && newName !== file.name) {
            setFiles((prev) => prev.map((f) => (f.id === contextMenu.fileId ? { ...f, name: newName } : f)))
            addConsoleLog(`Renamed ${file.name} to ${newName}`, "info")
          }
        }
        break
      case "delete":
        if (file) {
          deleteFile(contextMenu.fileId)
        }
        break
      case "duplicate":
        if (file && file.type !== "folder") {
          const newFile = {
            ...file,
            id: `local_${Date.now()}`,
            name: `Copy of ${file.name}`,
          }
          setFiles((prev) => [...prev, newFile])
          addConsoleLog(`Duplicated ${file.name}`, "info")
        }
        break
      case "new-file":
        if (file && file.type === "folder") {
          setSelectedFolderId(contextMenu.fileId)
          setIsCreatingFile(true)
        } else {
          setSelectedFolderId(null)
          setIsCreatingFile(true)
        }
        break
      case "new-folder":
        if (file && file.type === "folder") {
          createNewFolder(contextMenu.fileId)
        } else {
          createNewFolder()
        }
        break
      case "import-to-active":
        if (file && activeFile && file.id !== activeFile.id) {
          addImportToFile(file.id, activeFile.id)
        }
        break
    }

    setContextMenu({ visible: false, x: 0, y: 0, fileId: null, type: null })
  }

  // Add import statement to a file
  const addImportToFile = (sourceFileId, targetFileId) => {
    const sourceFile = files.find((f) => f.id === sourceFileId)
    const targetFile = files.find((f) => f.id === targetFileId)

    if (!sourceFile || !targetFile) {
      addConsoleLog("Error: Source or target file not found", "error")
      return
    }

    // Get component name from file name
    const componentName = sourceFile.name.replace(/\.(js|jsx|ts|tsx)$/, "")

    // Calculate relative path more accurately
    let importPath

    // If files are in the same directory
    if (sourceFile.path === targetFile.path) {
      importPath = `./${componentName}`
    } else {
      // Handle more complex relative paths
      const sourceParts = sourceFile.path === "/" ? [] : sourceFile.path.split("/").filter(Boolean)
      const targetParts = targetFile.path === "/" ? [] : targetFile.path.split("/").filter(Boolean)

      // Find common path prefix
      let commonPrefixLength = 0
      const minLength = Math.min(sourceParts.length, targetParts.length)

      for (let i = 0; i < minLength; i++) {
        if (sourceParts[i] === targetParts[i]) {
          commonPrefixLength++
        } else {
          break
        }
      }

      // Calculate relative path
      const upLevels = targetParts.length - commonPrefixLength
      const downPath = sourceParts.slice(commonPrefixLength)

      if (upLevels === 0 && downPath.length === 0) {
        // Same directory
        importPath = `./${componentName}`
      } else if (upLevels === 0) {
        // Target is in a parent directory of source
        importPath = `./${downPath.join("/")}/${componentName}`
      } else if (downPath.length === 0) {
        // Source is in a parent directory of target
        importPath = `${"../".repeat(upLevels)}${componentName}`
      } else {
        // Need to go up and then down
        importPath = `${"../".repeat(upLevels)}${downPath.join("/")}/${componentName}`
      }
    }

    // Create import statement
    const importStatement = `import ${componentName} from '${importPath}';\n`

    // Check if import already exists
    if (targetFile.content.includes(importStatement)) {
      addConsoleLog(`Import for ${componentName} already exists in ${targetFile.name}`, "warning")
      return
    }

    // Add import statement to the top of the file
    updateFileContent(targetFileId, importStatement + targetFile.content)

    addConsoleLog(`Added import for ${componentName} to ${targetFile.name}`, "success")
  }

  // Install a package
  const installPackage = async (packageName, version, type = "dependency") => {
    setIsInstallingPackage(true)

    try {
      // Check if package already exists
      const existingPackage = packages.find((p) => p.name === packageName)

      if (existingPackage) {
        if (existingPackage.version !== version) {
          setPackages((prev) => prev.map((p) => (p.name === packageName ? { ...p, version, type } : p)))
          addConsoleLog(`Updated ${packageName} to version ${version}`, "success")
        } else if (existingPackage.type !== type) {
          setPackages((prev) => prev.map((p) => (p.name === packageName ? { ...p, type } : p)))
          addConsoleLog(`Changed ${packageName} to ${type === "dependency" ? "regular" : "dev"} dependency`, "success")
        } else {
          addConsoleLog(`${packageName} is already installed`, "info")
        }
      } else {
        // If package doesn't exist, fetch its details
        let packageInfo = version ? { version } : null

        if (!packageInfo) {
          packageInfo = await fetchPackageInfo(packageName)
          if (!packageInfo) {
            throw new Error(`Package ${packageName} not found`)
          }
        }

        setPackages((prev) => [
          ...prev,
          {
            name: packageName,
            version: packageInfo.version || version,
            type,
            description: packageInfo.description || "",
            homepage: packageInfo.homepage || "",
          },
        ])

        addConsoleLog(`Installed ${packageName}@${packageInfo.version || version}`, "success")
      }

      // Update package.json
      updatePackageJson(packageName, version, type)
    } catch (error) {
      addConsoleLog(`Failed to install ${packageName}: ${error.message}`, "error")
    } finally {
      setIsInstallingPackage(false)
    }
  }

  // Update package.json with new package
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

      const formattedJson = JSON.stringify(packageJson, null, 2)
      updateFileContent(packageJsonFile.id, formattedJson)

      addConsoleLog(`Updated package.json with ${packageName}@${version}`, "success")
    } catch (error) {
      addConsoleLog(`Failed to update package.json: ${error.message}`, "error")
    }
  }

  // Uninstall a package
  const uninstallPackage = (packageName) => {
    setIsInstallingPackage(true)

    setTimeout(() => {
      try {
        const packageExists = packages.some((p) => p.name === packageName)

        if (!packageExists) {
          addConsoleLog(`Package ${packageName} is not installed`, "warning")
          setIsInstallingPackage(false)
          return
        }

        setPackages((prev) => prev.filter((p) => p.name !== packageName))

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

  // Fetch package info from npm registry
  const fetchPackageInfo = async (packageName) => {
    try {
      const response = await fetch(`${NPM_REGISTRY_API}/${packageName}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch package info: ${response.statusText}`)
      }
      const data = await response.json()
      return {
        name: data.name,
        version: data["dist-tags"].latest,
        description: data.description,
        homepage: data.homepage,
        repository: data.repository?.url,
        license: data.license,
        dependencies: data.versions[data["dist-tags"].latest].dependencies || {},
        devDependencies: data.versions[data["dist-tags"].latest].devDependencies || {},
      }
    } catch (error) {
      console.error(`Error fetching package info for ${packageName}:`, error)
      addConsoleLog(`Failed to fetch package info: ${error.message}`, "error")
      return null
    }
  }

  // Search for npm packages
  const searchNpmPackages = async (query) => {
    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)

    try {
      const response = await fetch(`${NPM_REGISTRY_API}/-/v1/search?text=${encodeURIComponent(query)}&size=10`)
      const data = await response.json()

      const results = data.objects.map((obj) => ({
        name: obj.package.name,
        version: obj.package.version,
        description: obj.package.description || "No description available",
        keywords: obj.package.keywords || [],
        date: obj.package.date,
        links: obj.package.links,
        publisher: obj.package.publisher,
        score: obj.score,
      }))

      setSearchResults(results)
    } catch (error) {
      console.error("Error searching npm packages:", error)
      addConsoleLog(`Failed to search packages: ${error.message}`, "error")
    } finally {
      setIsSearching(false)
    }
  }

  // Handle package search input change
  const handlePackageSearchChange = (e) => {
    const query = e.target.value
    setPackageSearch(query)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchNpmPackages(query)
      }, 500)
    } else {
      setSearchResults([])
    }
  }

  // Render file tree with drag and drop support
  const renderFileTree = () => {
    // Recursive function to render folders and their contents
    const renderFolder = (folder) => {
      const isExpanded = expandedFolders[folder.id]
      const folderPath = folder.path === "/" ? `/${folder.name}` : `${folder.path}/${folder.name}`

      const folderContents = files.filter((f) => f.path === folderPath)

      return (
        <div key={folder.id} className={styles.fileTreeItem}>
          <div
            className={`${styles.fileTreeItemHeader} ${selectedFolderId === folder.id ? styles.selected : ""}`}
            onClick={() => toggleFolder(folder.id)}
            onContextMenu={(e) => handleContextMenu(e, folder.id, "folder")}
          >
            <span className={styles.fileTreeItemIcon}>
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
            <span className={styles.fileTreeItemIcon}>
              <Folder size={16} />
            </span>
            <span className={styles.fileTreeItemName}>{folder.name}</span>
          </div>

          {isExpanded && folderContents.length > 0 && (
            <div className={styles.fileTreeChildren}>
              {folderContents.map((item) => (item.type === "folder" ? renderFolder(item) : renderFile(item)))}
            </div>
          )}
        </div>
      )
    }

    // Render a single file
    const renderFile = (file) => {
      // Check if this file is open in a tab but has been deleted
      const isOpenButDeleted =
        openTabs.some((tab) => tab.id === file.id) && deletedOpenFiles.some((df) => df.id === file.id)

      return (
        <div
          key={file.id}
          className={`${styles.fileItem} ${activeFile?.id === file.id ? styles.active : ""} ${isOpenButDeleted ? styles.deletedFile : ""}`}
          onClick={() => openFileInTab(file)}
          onContextMenu={(e) => handleContextMenu(e, file.id, "file")}
        >
          <div className={styles.fileItemContent}>
            {getFileIcon(file.type)}
            <span className={styles.fileName}>{file.name}</span>
            {file.id.toString().startsWith("local_") && (
              <span className={styles.unsavedBadge} title="Unsaved file">
                •
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              deleteFile(file.id)
            }}
            className={styles.fileDeleteButton}
            title="Delete file"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }

    // Root level files and folders
    const rootItems = files.filter((f) => f.path === "/")

    return (
      <>
        {rootItems.map((item) => (item.type === "folder" ? renderFolder(item) : renderFile(item)))}

        {/* Context Menu */}
        {contextMenu.visible && (
          <div className={styles.contextMenu} style={{ top: contextMenu.y, left: contextMenu.x }}>
            {contextMenu.type === "folder" ? (
              <>
                <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction("rename")}>
                  Rename
                </div>
                <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction("delete")}>
                  Delete
                </div>
                <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction("new-file")}>
                  New File
                </div>
                <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction("new-folder")}>
                  New Folder
                </div>
              </>
            ) : (
              <>
                <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction("rename")}>
                  Rename
                </div>
                <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction("delete")}>
                  Delete
                </div>
                <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction("duplicate")}>
                  Duplicate
                </div>
                <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction("import-to-active")}>
                  Import to Active File
                </div>
                <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction("new-file")}>
                  New File
                </div>
                <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction("new-folder")}>
                  New Folder
                </div>
              </>
            )}
          </div>
        )}
      </>
    )
  }

  // Render project template selector
  const renderProjectTemplateSelector = () => {
    return (
      <div className={styles.newProjectForm}>
        <h3>Create New Project</h3>
        <div className={styles.formGroup}>
          <label htmlFor="projectName">Project Name:</label>
          <input
            type="text"
            id="projectName"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="My Project"
            className={styles.newFileInput}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="projectTemplate">Template:</label>
          <select
            id="projectTemplate"
            value={selectedProjectTemplate}
            onChange={(e) => setSelectedProjectTemplate(e.target.value)}
            className={styles.newFileSelect}
          >
            {Object.entries(FILTERED_PROJECT_TEMPLATES).map(([key, template]) => (
              <option key={key} value={key}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.templateDescription}>
          {FILTERED_PROJECT_TEMPLATES[selectedProjectTemplate]?.description}
        </div>
        <div className={styles.newFileActions}>
          <button onClick={createNewProject} className={styles.newFileButton} disabled={isLoading}>
            {isLoading ? <RefreshCw size={14} className={styles.spinning} /> : "Create Project"}
          </button>
          <button onClick={() => setIsCreatingProject(false)} className={styles.newFileButton}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // Render package installer with enhanced search functionality
  const renderPackageInstaller = () => {
    return (
      <div className={styles.packageInstallerContainer}>
        <div className={styles.packageSearch}>
          <Search size={16} className={styles.packageSearchIcon} />
          <input
            type="text"
            value={packageSearch}
            onChange={handlePackageSearchChange}
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

            {searchResults.length === 0 &&
              (isSearching ? (
                <div className={styles.emptyState}>Searching...</div>
              ) : (
                <div className={styles.emptyState}>No packages found</div>
              ))}

            {searchResults.length > 0 && (
              <div className={styles.packageList}>
                {searchResults.map((pkg) => (
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
                        {isInstallingPackage ? <RefreshCw size={14} className={styles.spinning} /> : "Install"}
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
                    {isInstallingPackage ? <RefreshCw size={14} className={styles.spinning} /> : "Install"}
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
    )
  }

  return (
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
            {/* Back to Projects Button */}
            {currentProject && (
              <button className={styles.backToProjectsButton} onClick={goBackToProjects}>
                <ArrowLeft size={14} /> Back to Projects
              </button>
            )}

            {/* Project Info */}
            {currentProject && (
              <div className={styles.currentProjectInfo}>
                <h3 className={styles.currentProjectName}>{currentProject.name}</h3>
                {currentProject.description && (
                  <p className={styles.currentProjectDescription}>{currentProject.description}</p>
                )}
                <div className={styles.projectTypeTag}>
                  {projectType === "react" ? "Code Project" : "HTML/CSS Project"}
                </div>
              </div>
            )}

            {/* File Uploader */}
            {renderFileUploader()}

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
                  onClick={() => {
                    setSelectedFolderId(null)
                    setIsCreatingFile(true)
                  }}
                  className={styles.iconButton}
                  title="Create new file"
                >
                  <Plus size={16} />
                </button>
                <button onClick={() => createNewFolder()} className={styles.iconButton} title="Create new folder">
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
                <button onClick={() => setIsSidebarOpen(false)} className={styles.iconButton} title="Close sidebar">
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
                  {projectType === "react" && (
                    <>
                      <option value="jsx">JSX</option>
                      <option value="tsx">TSX</option>
                    </>
                  )}
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
        {activeSidebarTab === "packages" && <div className={styles.packagesPanel}>{renderPackageInstaller()}</div>}
      </div>
    </div>
  )
}


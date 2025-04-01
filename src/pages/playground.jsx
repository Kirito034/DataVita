"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Sun, Moon, Download, Share, Settings, FolderPlus, Save, Database, Home, Code, Eye } from "lucide-react"
import styles from "../styles/playground.module.css"
import JSZip from "jszip"
import Sidebar from "../components/playground/sidebar"
import EditorPanel from "../components/playground/EditorPanel"
import PreviewPanel from "../components/playground/PreviewPanel"
import BottomPanel from "../components/playground/BottomPanel"
import { DEFAULT_TEMPLATES, PROJECT_TEMPLATES, CDN_LINKS } from "../components/playground/constants"

export default function Playground() {
  // Theme and layout state
  const [theme, setTheme] = useState("light")
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [editorLayout, setEditorLayout] = useState("horizontal")
  const [activeTab, setActiveTab] = useState("editor")

  // File and project state
  const [files, setFiles] = useState([])
  const [activeFile, setActiveFile] = useState(null)
  const [expandedFolders, setExpandedFolders] = useState({})
  const [openTabs, setOpenTabs] = useState([])
  const [activeTabId, setActiveTabId] = useState(null)
  const [currentPreviewPage, setCurrentPreviewPage] = useState("index.html")
  const [projects, setProjects] = useState([])
  const [activeProject, setActiveProject] = useState(null)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [selectedProjectTemplate, setSelectedProjectTemplate] = useState("basic")
  const [projectTemplates, setProjectTemplates] = useState(PROJECT_TEMPLATES)
  const [selectedFolderId, setSelectedFolderId] = useState(null)

  // Package management state
  const [packages, setPackages] = useState([])

  // Console and error state
  const [consoleOutput, setConsoleOutput] = useState([])
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true)
  const [activeBottomTab, setActiveBottomTab] = useState("console")
  const [syntaxErrors, setSyntaxErrors] = useState([])
  const [runtimeErrors, setRuntimeErrors] = useState([])

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewError, setPreviewError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [shareUrl, setShareUrl] = useState("")

  // Editor settings
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)
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
  })

  // Refs
  const iframeRef = useRef(null)
  const autoSaveTimeoutRef = useRef(null)

  // User ID for file management
  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") || "default_user" : "default_user"

  // Initialize with default files and user files
  useEffect(() => {
    // Load user files from API and merge with defaults
    loadUserFiles()

    // Set theme based on system preference
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark")
      document.documentElement.setAttribute("data-theme", "dark")
    }

    // Load project templates
    loadProjectTemplates()
  }, [])

  // Load project templates from API or use defaults
  const loadProjectTemplates = async () => {
    try {
      // Try to fetch templates from API
      // const templates = await PlaygroundServices.getProjectTemplates()
      // setProjectTemplates(templates)

      // For now, use default templates
      setProjectTemplates(PROJECT_TEMPLATES)
    } catch (error) {
      console.log("Using default project templates")
      // Use default templates if API fails
      setProjectTemplates(PROJECT_TEMPLATES)
    }
  }

  // Load user files from API and merge with default files
  const loadUserFiles = async () => {
    if (!userId) return

    setIsLoading(true)
    addConsoleLog("Loading your files...", "info")

    try {
      // For now, create default project instead of loading from API
      createDefaultProject()
      addConsoleLog("Created default project.", "info")
    } catch (error) {
      console.error("Error loading files:", error)
      addConsoleLog(`Failed to load files: ${error.message}`, "error")

      // Create default project if loading fails
      createDefaultProject()
    } finally {
      setIsLoading(false)
    }
  }

  // Create a default project with basic files
  const createDefaultProject = () => {
    const defaultFiles = [
      { id: "default-1", name: "index.html", type: "html", content: DEFAULT_TEMPLATES.html, path: "/" },
      { id: "default-2", name: "test.html", type: "html", content: DEFAULT_TEMPLATES.test_html, path: "/" },
      { id: "default-3", name: "styles.css", type: "css", content: DEFAULT_TEMPLATES.css, path: "/" },
      { id: "default-4", name: "script.js", type: "javascript", content: DEFAULT_TEMPLATES.javascript, path: "/" },
      { id: "default-5", name: "package.json", type: "json", content: DEFAULT_TEMPLATES.json, path: "/" },
    ]

    setFiles(defaultFiles)

    // Set the first file as active and open it in a tab
    if (defaultFiles.length > 0) {
      const firstFile = defaultFiles[0]
      setActiveFile(firstFile)
      setOpenTabs([firstFile])
      setActiveTabId(firstFile.id)
    }

    try {
      // Parse package.json to extract dependencies
      const packageJsonFile = defaultFiles.find((f) => f.name === "package.json")
      if (packageJsonFile) {
        const packageJson = JSON.parse(packageJsonFile.content)

        const initialPackages = []

        // Add dependencies
        if (packageJson.dependencies) {
          Object.entries(packageJson.dependencies).forEach(([name, version]) => {
            initialPackages.push({
              name,
              version: version.replace(/[\^~]/, ""),
              type: "dependency",
            })
          })
        }

        // Add devDependencies
        if (packageJson.devDependencies) {
          Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
            initialPackages.push({
              name,
              version: version.replace(/[\^~]/, ""),
              type: "devDependency",
            })
          })
        }

        setPackages(initialPackages)
        addConsoleLog(`Loaded ${initialPackages.length} packages from package.json`, "info")
      }
    } catch (error) {
      console.error("Error parsing package.json:", error)
      addConsoleLog(`Failed to parse package.json: ${error.message}`, "error")
    }
  }

  // Create a new project from template
  const createNewProject = async () => {
    if (!newProjectName.trim()) {
      addConsoleLog("Project name cannot be empty", "error")
      return
    }

    setIsLoading(true)
    addConsoleLog(`Creating new project: ${newProjectName}...`, "info")

    try {
      // If API fails, create project locally
      const template = projectTemplates[selectedProjectTemplate]
      if (template) {
        // Generate local IDs for files
        const newFiles = template.files.map((file) => ({
          ...file,
          id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        }))

        setFiles(newFiles)

        // Set the first file as active and open it in a tab
        if (newFiles.length > 0) {
          const firstFile = newFiles.find((f) => f.name === "index.html") || newFiles[0]
          setActiveFile(firstFile)
          setOpenTabs([firstFile])
          setActiveTabId(firstFile.id)
        }

        // Parse package.json to extract dependencies
        try {
          const packageJsonFile = newFiles.find((f) => f.name === "package.json")
          if (packageJsonFile) {
            const packageJson = JSON.parse(packageJsonFile.content)

            const newPackages = []

            // Add dependencies
            if (packageJson.dependencies) {
              Object.entries(packageJson.dependencies).forEach(([name, version]) => {
                newPackages.push({
                  name,
                  version: version.replace(/[\^~]/, ""),
                  type: "dependency",
                })
              })
            }

            // Add devDependencies
            if (packageJson.devDependencies) {
              Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
                newPackages.push({
                  name,
                  version: version.replace(/[\^~]/, ""),
                  type: "devDependency",
                })
              })
            }

            setPackages(newPackages)
            addConsoleLog(`Loaded ${newPackages.length} packages from package.json`, "info")
          }
        } catch (error) {
          console.error("Error parsing package.json:", error)
          addConsoleLog(`Failed to parse package.json: ${error.message}`, "error")
        }

        addConsoleLog(`Project "${newProjectName}" created locally`, "success")
      } else {
        addConsoleLog(`Failed to create project: Template not found`, "error")
      }
    } finally {
      setIsCreatingProject(false)
      setNewProjectName("")
      setIsLoading(false)
    }
  }

  // Get file type from file name
  const getFileTypeFromName = (fileName) => {
    const extension = fileName.split(".").pop().toLowerCase()
    switch (extension) {
      case "html":
        return "html"
      case "css":
        return "css"
      case "js":
        return "javascript"
      case "jsx":
        return "jsx"
      case "tsx":
        return "tsx"
      case "json":
        return "json"
      default:
        return "text"
    }
  }

  // Save current file to API
  const saveCurrentFile = async () => {
    if (!activeFile || !userId) {
      console.error("❌ Missing activeFile or userId", { activeFile, userId })
      return
    }

    setIsSaving(true)
    setSaveStatus("saving")

    try {
      // Simulate saving
      setTimeout(() => {
        setSaveStatus("saved")

        // Reset save status after a delay
        setTimeout(() => {
          setSaveStatus(null)
        }, 2000)

        addConsoleLog(`✅ Saved file: ${activeFile.name}`, "success")
        setIsSaving(false)
      }, 1000)
    } catch (error) {
      console.error("❌ Error saving file:", error)
      addConsoleLog(`Failed to save file: ${error.message}`, "error")
      setSaveStatus("error")
      setIsSaving(false)
    }
  }

  // Save all files to API
  const saveAllFiles = async () => {
    if (!userId || files.length === 0) {
      console.error("❌ No userId or files to save", { userId, files })
      return
    }

    setIsSaving(true)
    setSaveStatus("saving")
    addConsoleLog("📤 Saving all files...", "info")

    try {
      // Simulate saving
      setTimeout(() => {
        setSaveStatus("saved")

        // Reset save status after a delay
        setTimeout(() => {
          setSaveStatus(null)
        }, 2000)

        addConsoleLog(`✅ Saved ${files.length} files successfully`, "success")
        setIsSaving(false)
      }, 1500)
    } catch (error) {
      console.error("❌ Error saving files:", error)
      addConsoleLog(`Failed to save all files: ${error.message}`, "error")
      setSaveStatus("error")
      setIsSaving(false)
    }
  }

  // Delete file from API
  const deleteFileFromServer = async (fileId) => {
    if (!fileId) return

    try {
      // Simulate API call
      addConsoleLog("File deleted from server", "success")
    } catch (error) {
      console.error("Error deleting file from server:", error)
      addConsoleLog(`Failed to delete file from server: ${error.message}`, "error")
    }
  }
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
  
  // Update preview iframe
  const updatePreview = useCallback(
    (pageName = currentPreviewPage) => {
      setIsProcessing(true)
      setPreviewError(null)
      setRuntimeErrors([])

      // Normalize the page name by removing any leading slash
      if (pageName && pageName.startsWith("/")) {
        pageName = pageName.substring(1)
      }

      // Make sure we have a valid page name
      if (!pageName) {
        const htmlFile = files.find((f) => f.name.endsWith(".html"))
        if (htmlFile) {
          pageName = htmlFile.name
        } else {
          setPreviewError("No HTML file found for preview")
          setIsProcessing(false)
          return
        }
      }

      // Check if the page exists
      const pageExists = files.some((f) => f.type === "html" && f.name === pageName)
      if (!pageExists) {
        setPreviewError(`HTML file "${pageName}" not found`)
        addConsoleLog(`Preview error: HTML file "${pageName}" not found`, "error")
        setIsProcessing(false)
        return
      }

      // Set the current preview page
      setCurrentPreviewPage(pageName)

      // Add a small delay to ensure state updates
      setTimeout(() => {
        setIsProcessing(false)
        // Force a re-render of the preview by passing the updated page to PreviewPanel
        if (iframeRef.current && iframeRef.current.contentWindow) {
          try {
            // Signal to the PreviewPanel that it should update
            const event = new CustomEvent("preview-update", { detail: { page: pageName } })
            window.dispatchEvent(event)
          } catch (error) {
            console.error("Error updating preview:", error)
          }
        }
      }, 500)
    },
    [files, currentPreviewPage, addConsoleLog, setPreviewError, setIsProcessing, setRuntimeErrors],
  )

  // Auto-refresh preview when files change
  useEffect(() => {
    if (!isAutoRefresh || !activeFile) return

    const timer = setTimeout(() => {
      updatePreview()
    }, 1000)

    return () => clearTimeout(timer)
  }, [files, isAutoRefresh, activeFile, updatePreview])

  // Auto-save functionality
  useEffect(() => {
    if (!settings.autoSave || !activeFile?.content) return

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveCurrentFile()
    }, 3000) // Auto-save after 3 seconds of inactivity

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [activeFile?.content, settings.autoSave, saveCurrentFile])

  // Update file content
  const updateFileContent = (fileId, newContent) => {
    setFiles((prev) => prev.map((file) => (file.id === fileId ? { ...file, content: newContent } : file)))

    if (activeFile && activeFile.id === fileId) {
      setActiveFile((prev) => ({ ...prev, content: newContent }))
    }

    // Update content in open tabs
    setOpenTabs((prev) => prev.map((tab) => (tab.id === fileId ? { ...tab, content: newContent } : tab)))
  }

  // Delete a file
  const deleteFile = (id) => {
    const fileToDelete = files.find((file) => file.id === id)
    if (!fileToDelete) return

    // If file exists on server, delete it there too
    if (
      typeof fileToDelete.id === "number" ||
      (typeof fileToDelete.id === "string" && !fileToDelete.id.startsWith("local_"))
    ) {
      deleteFileFromServer(fileToDelete.id)
    }

    setFiles((prev) => prev.filter((file) => file.id !== id))

    // Remove from open tabs
    setOpenTabs((prev) => {
      const updatedTabs = prev.filter((tab) => tab.id !== id) // Changed from tabId to id

      // If we're deleting the active tab, set a new active tab
      if (activeTabId === id && updatedTabs.length > 0) {
        setActiveTabId(updatedTabs[0].id)
        setActiveFile(updatedTabs[0])
      } else if (updatedTabs.length === 0) {
        setActiveTabId(null)
        setActiveFile(null)
      }

      return updatedTabs
    })

    addConsoleLog(`Deleted file: ${fileToDelete.name}`, "info")
  }

  // Toggle folder expansion
  const toggleFolder = (id) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))

    // Set as selected folder
    setSelectedFolderId(id)
  }

  // Open a file in a tab
  const openFileInTab = (file) => {
    // Skip folders
    if (file.type === "folder") {
      toggleFolder(file.id)
      return
    }

    // Check if file is already open in a tab
    const isAlreadyOpen = openTabs.some((tab) => tab.id === file.id)

    if (!isAlreadyOpen) {
      setOpenTabs((prev) => [...prev, file])
    }

    // Set as active tab and file
    setActiveTabId(file.id)
    setActiveFile(file)

    // Switch to editor tab if in preview mode
    if (activeTab !== "editor") {
      setActiveTab("editor")
    }
  }

  // Close a tab
  const closeTab = (tabId, event) => {
    event.stopPropagation()

    setOpenTabs((prev) => {
      const updatedTabs = prev.filter((tab) => tab.id !== tabId)

      // If we're closing the active tab, set a new active tab
      if (activeTabId === tabId && updatedTabs.length > 0) {
        setActiveTabId(updatedTabs[0].id)
        setActiveFile(updatedTabs[0])
      } else if (updatedTabs.length === 0) {
        setActiveTabId(null)
        setActiveFile(null)
      }

      return updatedTabs
    })
  }

  // Toggle between light and dark theme
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    document.documentElement.setAttribute("data-theme", newTheme)
  }

  // Toggle editor layout between horizontal and vertical
  const toggleEditorLayout = () => {
    setEditorLayout((prev) => (prev === "horizontal" ? "vertical" : "horizontal"))
  }

  // Share playground by generating a shareable URL
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

  // Download project as a ZIP file
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

  const handleTabChange = (tab) => {
    setActiveTab(tab)

    // If switching to preview, update the preview
    if (tab === "preview") {
      updatePreview()
    }
  }

  return (
    <div className={`${styles.playgroundContainer} ${styles[theme]}`}>
      {/* Header */}
      <div className={styles.playgroundHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.playgroundTitle}>Playground</h1>
          <div className={styles.headerTabs}>
            <a href="/" className={styles.tabButton} style={{ textDecoration: "none" }}>
              <Home size={16} />
              <span>Home</span>
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
          <button onClick={() => setIsCreatingProject(true)} className={styles.iconButton} title="Create new project">
            <FolderPlus size={16} />
          </button>
          <button
            onClick={saveCurrentFile}
            className={`${styles.iconButton} ${isSaving ? styles.processing : ""} ${
              saveStatus ? styles[saveStatus] : ""
            }`}
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
          <Sidebar
            files={files}
            setFiles={setFiles}
            activeFile={activeFile}
            expandedFolders={expandedFolders}
            setExpandedFolders={setExpandedFolders}
            toggleFolder={toggleFolder}
            openFileInTab={openFileInTab}
            deleteFile={deleteFile}
            selectedFolderId={selectedFolderId}
            setSelectedFolderId={setSelectedFolderId}
            isCreatingProject={isCreatingProject}
            setIsCreatingProject={setIsCreatingProject}
            newProjectName={newProjectName}
            setNewProjectName={setNewProjectName}
            selectedProjectTemplate={selectedProjectTemplate}
            setSelectedProjectTemplate={setSelectedProjectTemplate}
            projectTemplates={projectTemplates}
            createNewProject={createNewProject}
            isLoading={isLoading}
            loadUserFiles={loadUserFiles}
            packages={packages}
            setPackages={setPackages}
            updateFileContent={updateFileContent}
            addConsoleLog={addConsoleLog}
            setIsSidebarOpen={setIsSidebarOpen}
          />
        )}

        {/* Editor Section */}
        <div className={`${styles.editorSection} ${activeTab === "editor" ? styles.visible : styles.hidden}`}>
          <EditorPanel
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            activeFile={activeFile}
            setActiveFile={setActiveFile}
            openTabs={openTabs}
            activeTabId={activeTabId}
            setActiveTabId={setActiveTabId}
            closeTab={closeTab}
            updateFileContent={updateFileContent}
            showLineNumbers={showLineNumbers}
            setShowLineNumbers={setShowLineNumbers}
            settings={settings}
            setSettings={setSettings}
            theme={theme}
            syntaxErrors={syntaxErrors}
            setSyntaxErrors={setSyntaxErrors}
            saveCurrentFile={saveCurrentFile}
          />
        </div>

        {/* Preview Section */}
        <div
          className={`${styles.previewSection} ${isFullScreen ? styles.fullScreen : ""} ${activeTab === "preview" ? styles.visible : styles.hidden}`}
        >
          <PreviewPanel
            files={files}
            isFullScreen={isFullScreen}
            setIsFullScreen={setIsFullScreen}
            isAutoRefresh={isAutoRefresh}
            setIsAutoRefresh={setIsAutoRefresh}
            isProcessing={isProcessing}
            previewError={previewError}
            currentPreviewPage={currentPreviewPage}
            setCurrentPreviewPage={setCurrentPreviewPage}
            updatePreview={updatePreview}
            iframeRef={iframeRef}
            addConsoleLog={addConsoleLog}
            setRuntimeErrors={setRuntimeErrors}
            CDN_LINKS={CDN_LINKS}
          />
        </div>
      </div>

      {/* Bottom Panel */}
      <BottomPanel
        isBottomPanelOpen={isBottomPanelOpen}
        setIsBottomPanelOpen={setIsBottomPanelOpen}
        activeBottomTab={activeBottomTab}
        setActiveBottomTab={setActiveBottomTab}
        consoleOutput={consoleOutput}
        setConsoleOutput={setConsoleOutput}
        syntaxErrors={syntaxErrors}
        runtimeErrors={runtimeErrors}
        files={files}
        openFileInTab={openFileInTab}
      />

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
              {saveStatus === "saved" && <span className={styles.statusSuccess}>Saved</span>}
              {saveStatus === "saving" && <span className={styles.statusInfo}>Saving...</span>}
              {saveStatus === "error" && <span className={styles.statusError}>Save failed</span>}
            </>
          )}
        </div>
        <div className={styles.statusRight}>
          <span className={styles.statusItem}>{theme === "light" ? "Light Mode" : "Dark Mode"}</span>
          <span className={styles.statusItem}>{isAutoRefresh ? "Auto-refresh: On" : "Auto-refresh: Off"}</span>
          <span className={styles.statusItem}>{settings.autoSave ? "Auto-save: On" : "Auto-save: Off"}</span>
          <span className={styles.statusItem}>Ready</span>
        </div>
      </div>
    </div>
  )
}


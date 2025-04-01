"use client"

import { createContext, useState, useEffect } from "react"
import { DEFAULT_TEMPLATES, CDN_LINKS } from "../constants"

export const PlaygroundContext = createContext()

export const PlaygroundProvider = ({ children }) => {
  // File and project state
  const [files, setFiles] = useState([])
  const [activeFile, setActiveFile] = useState(null)
  const [expandedFolders, setExpandedFolders] = useState({})
  const [openTabs, setOpenTabs] = useState([])
  const [activeTabId, setActiveTabId] = useState(null)
  const [currentPreviewPage, setCurrentPreviewPage] = useState("index.html")

  // Console and error state
  const [consoleOutput, setConsoleOutput] = useState([])
  const [syntaxErrors, setSyntaxErrors] = useState([])
  const [runtimeErrors, setRuntimeErrors] = useState([])

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewError, setPreviewError] = useState(null)
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)

  // Initialize with default files
  useEffect(() => {
    createDefaultProject()
  }, [])

  // Create a default project with basic files
  const createDefaultProject = () => {
    const defaultFiles = [
      { id: "default-1", name: "index.html", type: "html", content: DEFAULT_TEMPLATES.html, path: "/" },
      { id: "default-2", name: "test.html", type: "html", content: DEFAULT_TEMPLATES.test_html, path: "/" },
      { id: "default-3", name: "styles.css", type: "css", content: DEFAULT_TEMPLATES.css, path: "/" },
      { id: "default-4", name: "script.js", type: "javascript", content: DEFAULT_TEMPLATES.javascript, path: "/" },
    ]

    setFiles(defaultFiles)

    // Set the first file as active and open it in a tab
    if (defaultFiles.length > 0) {
      const firstFile = defaultFiles[0]
      setActiveFile(firstFile)
      setOpenTabs([firstFile])
      setActiveTabId(firstFile.id)
    }
  }

  // Update file content
  const updateFileContent = (fileId, newContent) => {
    setFiles((prev) => prev.map((file) => (file.id === fileId ? { ...file, content: newContent } : file)))

    if (activeFile && activeFile.id === fileId) {
      setActiveFile((prev) => ({ ...prev, content: newContent }))
    }

    // Update content in open tabs
    setOpenTabs((prev) => prev.map((tab) => (tab.id === fileId ? { ...tab, content: newContent } : tab)))
  }

  // Add console log with timestamp
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
  const updatePreview = (pageName = currentPreviewPage) => {
    setIsProcessing(true)
    setPreviewError(null)
    setRuntimeErrors([])

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

    // Set the current preview page
    setCurrentPreviewPage(pageName)

    // Add a small delay to ensure state updates
    setTimeout(() => setIsProcessing(false), 500)
  }

  return (
    <PlaygroundContext.Provider
      value={{
        files,
        setFiles,
        activeFile,
        setActiveFile,
        expandedFolders,
        setExpandedFolders,
        openTabs,
        setOpenTabs,
        activeTabId,
        setActiveTabId,
        currentPreviewPage,
        setCurrentPreviewPage,
        consoleOutput,
        setConsoleOutput,
        syntaxErrors,
        setSyntaxErrors,
        runtimeErrors,
        setRuntimeErrors,
        isProcessing,
        setIsProcessing,
        previewError,
        setPreviewError,
        isAutoRefresh,
        setIsAutoRefresh,
        updateFileContent,
        addConsoleLog,
        updatePreview,
        CDN_LINKS,
      }}
    >
      {children}
    </PlaygroundContext.Provider>
  )
}


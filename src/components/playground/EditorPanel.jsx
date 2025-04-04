"use client"
import { useRef, useEffect, useState } from "react"
import {
  ChevronRight,
  Code,
  X,
  Undo,
  Redo,
  Search,
  Replace,
  Maximize2,
  Minimize2,
  Copy,
  Save,
  SquareSplitHorizontalIcon as SplitHorizontal,
  SquareSplitVerticalIcon as SplitVertical,
  Edit,
} from "lucide-react"
import { Editor, useMonaco } from "@monaco-editor/react"
import styles from "../../styles/playground.module.css"
import PlaygroundServices from "../../services/playgroundServices"

export default function EditorPanel({
  isSidebarOpen,
  setIsSidebarOpen,
  activeFile,
  setActiveFile,
  openTabs,
  activeTabId,
  setActiveTabId,
  closeTab,
  updateFileContent,
  showLineNumbers,
  setShowLineNumbers,
  settings,
  setSettings,
  theme,
  syntaxErrors,
  setSyntaxErrors,
  saveCurrentFile,
  files = [], // Provide default empty array to prevent undefined errors
  deletedOpenFiles = [], // Add this prop with default value
}) {
  const editorRef = useRef(null)
  const monaco = useMonaco()
  const tabsContainerRef = useRef(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editorHistory, setEditorHistory] = useState({})
  const [editorStates, setEditorStates] = useState({})
  const [isZenMode, setIsZenMode] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [replaceQuery, setReplaceQuery] = useState("")
  const [searchOptions, setSearchOptions] = useState({
    caseSensitive: false,
    wholeWord: false,
    regex: false,
    matchCase: false,
  })
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 })
  const [encoding, setEncoding] = useState("UTF-8")
  const [lineEnding, setLineEnding] = useState("LF")
  const [splitView, setSplitView] = useState(null) // null, 'horizontal', 'vertical'
  const [secondaryEditor, setSecondaryEditor] = useState(null)
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0, visible: false })
  const [contextMenuTab, setContextMenuTab] = useState(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState("")
  const [renamingTabId, setRenamingTabId] = useState(null)
  const [breadcrumbs, setBreadcrumbs] = useState([])
  const [isDraggingTab, setIsDraggingTab] = useState(false)
  const [draggedTabId, setDraggedTabId] = useState(null)
  const [tabGroups, setTabGroups] = useState([{ id: "default", tabs: [] }])
  const [activeTabGroup, setActiveTabGroup] = useState("default")

  // Initialize editor history for each file
  useEffect(() => {
    if (activeFile && !editorHistory[activeFile.id]) {
      setEditorHistory((prev) => ({
        ...prev,
        [activeFile.id]: {
          past: [],
          future: [],
          current: activeFile.content,
        },
      }))
    }
  }, [activeFile, editorHistory])

  // Save editor state when switching files
  useEffect(() => {
    if (editorRef.current && activeFile) {
      // Save the current editor's view state
      const currentState = editorRef.current.saveViewState()

      setEditorStates((prev) => ({
        ...prev,
        [activeFile.id]: currentState,
      }))
    }
  }, [activeTabId])

  // Restore editor state when switching back to a file
  useEffect(() => {
    if (editorRef.current && activeFile && editorStates[activeFile.id]) {
      // Restore the view state for this file
      setTimeout(() => {
        editorRef.current.restoreViewState(editorStates[activeFile.id])
        editorRef.current.focus()
      }, 50)
    }

    // Update breadcrumbs when active file changes
    if (activeFile) {
      const pathParts = activeFile.name.split("/")
      setBreadcrumbs(pathParts)
    }
  }, [activeFile, editorStates])

  // Check if file still exists in files array or in deletedOpenFiles
  const fileExists = (fileId) => {
    // First check in the regular files array
    if (files && files.some((f) => f.id === fileId)) {
      return true
    }

    // Then check in the deletedOpenFiles array
    return deletedOpenFiles && deletedOpenFiles.some((f) => f.id === fileId)
  }

  useEffect(() => {
    if (editorRef.current && activeFile) {
      const model = editorRef.current.getModel()
      if (model) {
        // Check if we have history for this file
        const history = editorHistory[activeFile.id]
        if (history) {
          setCanUndo(history.past.length > 0)
          setCanRedo(history.future.length > 0)
        } else {
          // Fallback to Monaco's undo stack
          const undoStack = model.getAlternativeVersionId() > 1
          const redoStack = model.canRedo()
          setCanUndo(undoStack)
          setCanRedo(redoStack)
        }
      }
    }
  }, [activeFile, editorHistory])

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenuPos((prev) => ({ ...prev, visible: false }))
    }

    document.addEventListener("click", handleClickOutside)
    return () => {
      document.removeEventListener("click", handleClickOutside)
    }
  }, [])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Close zen mode with Escape
      if (e.key === "Escape" && isZenMode) {
        setIsZenMode(false)
      }

      // Ctrl+F for search
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault()
        setIsSearchOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isZenMode])

  // Scroll tabs into view when active tab changes
  useEffect(() => {
    if (tabsContainerRef.current && activeTabId) {
      const activeTabElement = tabsContainerRef.current.querySelector(`[data-tab-id="${activeTabId}"]`)
      if (activeTabElement) {
        activeTabElement.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" })
      }
    }
  }, [activeTabId])

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor

    // Configure editor options
    editor.updateOptions({
      fontSize: settings.fontSize,
      tabSize: settings.tabSize,
      wordWrap: settings.wordWrap ? "on" : "off",
      minimap: {
        enabled: settings.minimap,
        scale: 0.8,
        showSlider: "mouseover",
        renderCharacters: true,
        maxColumn: 80,
      },
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
        alwaysConsumeMouseWheel: false,
        useShadows: true,
      },
      // Enhanced features
      bracketPairColorization: {
        enabled: true,
        independentColorPoolPerBracketType: true,
      },
      guides: {
        bracketPairs: true,
        highlightActiveBracketPair: true,
        indentation: true,
      },
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      smoothScrolling: true,
      linkedEditing: true,
      codeLens: true,
      contextmenu: false, // We'll use our own context menu
      parameterHints: {
        enabled: true,
        cycle: true,
      },
      snippetSuggestions: "inline",
      formatOnPaste: true,
      formatOnType: settings.formatOnType || false,
      inlineSuggest: {
        enabled: true,
        mode: "prefix",
      },
    })

    // Listen for content changes to update syntax errors
    editor.onDidChangeModelContent(() => {
      if (activeFile) {
        const model = editor.getModel()
        if (model) {
          const markers = monaco.editor.getModelMarkers({ resource: model.uri })
          const errors = markers.map((marker) => ({
            message: marker.message,
            line: marker.startLineNumber,
            column: marker.startColumn,
            severity: marker.severity === 8 ? "error" : "warning",
            source: activeFile.name,
          }))
          setSyntaxErrors(errors)
        }
      }
    })

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      })
    })

    // Add keyboard shortcut for saving
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveCurrentFile()
    })

    // Add keyboard shortcuts for undo/redo
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => {
      handleUndo()
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, () => {
      handleRedo()
    })

    // Add keyboard shortcut for search
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
      setIsSearchOpen(true)
    })

    // Add keyboard shortcut for zen mode
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      setIsZenMode(!isZenMode)
    })

    // Add keyboard shortcut for multi-cursor (Alt+Click)
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyI, () => {
      // Add cursor above
      editor.trigger("keyboard", "editor.action.insertCursorAbove", null)
    })

    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyK, () => {
      // Add cursor below
      editor.trigger("keyboard", "editor.action.insertCursorBelow", null)
    })

    // Add keyboard shortcut for duplicate line
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyD, () => {
      editor.trigger("keyboard", "editor.action.copyLinesDownAction", null)
    })

    // Add keyboard shortcut for split editor
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backslash, () => {
      toggleSplitView("vertical")
    })

    // Add keyboard shortcut for horizontal split editor
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Backslash, () => {
      toggleSplitView("horizontal")
    })

    // Add keyboard shortcut for file duplication
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyD, () => {
      if (activeFile) {
        duplicateFile(activeFile)
      }
    })

    // Add keyboard shortcut for file rename
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyR, () => {
      if (activeFile) {
        startRenameFile(activeFile.id)
      }
    })
  }

  const handleEditorChange = async (value) => {
    if (!activeFile) return

    // Update our custom undo/redo history
    setEditorHistory((prev) => {
      const history = prev[activeFile.id] || { past: [], future: [], current: activeFile.content }

      return {
        ...prev,
        [activeFile.id]: {
          past: [...history.past, history.current],
          current: value,
          future: [],
        },
      }
    })

    // Update the file content locally
    updateFileContent(activeFile.id, value)

    // Auto-save if enabled
    if (settings.autoSave) {
      try {
        setIsSaving(true)
        const fileData = {
          name: activeFile.name,
          type: activeFile.type,
          content: value,
        }

        if (activeFile.id.toString().startsWith("local_")) {
          // New file (not yet saved to the server)
          const savedFile = await PlaygroundServices.saveFile(fileData)
          setActiveFile((prev) => ({
            ...prev,
            id: savedFile.id, // Update the ID if it was a new file
            content: savedFile.content,
          }))
        } else {
          // Existing file (already saved to the server)
          await PlaygroundServices.updateFile(activeFile.id, fileData)
        }

        console.log("File auto-saved successfully")
      } catch (error) {
        console.error("Auto-save failed:", error.message)
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleUndo = () => {
    if (!activeFile) return

    // Use our custom history system
    setEditorHistory((prev) => {
      const history = prev[activeFile.id]

      if (!history || history.past.length === 0) {
        // If no history, use Monaco's undo
        if (editorRef.current) {
          editorRef.current.trigger("keyboard", "undo", null)
        }
        return prev
      }

      const newPast = [...history.past]
      const previousContent = newPast.pop()

      // Update the file content
      updateFileContent(activeFile.id, previousContent)

      return {
        ...prev,
        [activeFile.id]: {
          past: newPast,
          current: previousContent,
          future: [history.current, ...history.future],
        },
      }
    })
  }

  const handleRedo = () => {
    if (!activeFile) return

    // Use our custom history system
    setEditorHistory((prev) => {
      const history = prev[activeFile.id]

      if (!history || history.future.length === 0) {
        // If no future history, use Monaco's redo
        if (editorRef.current) {
          editorRef.current.trigger("keyboard", "redo", null)
        }
        return prev
      }

      const newFuture = [...history.future]
      const nextContent = newFuture.shift()

      // Update the file content
      updateFileContent(activeFile.id, nextContent)

      return {
        ...prev,
        [activeFile.id]: {
          past: [...history.past, history.current],
          current: nextContent,
          future: newFuture,
        },
      }
    })
  }

  const formatCode = () => {
    if (!activeFile || !editorRef.current) return
    try {
      editorRef.current.getAction("editor.action.formatDocument").run()
    } catch (error) {
      console.error("Format error:", error)
    }
  }

  const toggleAutoSave = () => {
    setSettings((prev) => ({
      ...prev,
      autoSave: !prev.autoSave,
    }))
  }

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case "html":
        return <span className={styles.fileIcon}>HTML</span>
      case "css":
        return <span className={styles.fileIcon}>CSS</span>
      case "javascript":
        return <span className={styles.fileIcon}>JS</span>
      case "jsx":
        return <span className={styles.fileIcon}>JSX</span>
      case "tsx":
        return <span className={styles.fileIcon}>TSX</span>
      case "json":
        return <span className={styles.fileIcon}>JSON</span>
      default:
        return <span className={styles.fileIcon}>TXT</span>
    }
  }

  const getLanguageId = (fileType) => {
    switch (fileType) {
      case "html":
        return "html"
      case "css":
        return "css"
      case "javascript":
        return "javascript"
      case "jsx":
        return "javascript"
      case "tsx":
        return "typescript"
      case "json":
        return "json"
      default:
        return "javascript"
    }
  }

  // Check if the file is deleted (exists in openTabs but not in files)
  const isFileDeleted = (fileId) => {
    return files && openTabs && openTabs.some((tab) => tab.id === fileId) && !files.some((file) => file.id === fileId)
  }

  // Toggle zen mode
  const toggleZenMode = () => {
    setIsZenMode(!isZenMode)
  }

  // Toggle search panel
  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen)
    if (!isSearchOpen && editorRef.current) {
      // Focus search input after opening
      setTimeout(() => {
        const searchInput = document.querySelector(`.${styles.searchInput}`)
        if (searchInput) searchInput.focus()
      }, 100)
    }
  }

  // Perform search
  const performSearch = (e) => {
    e?.preventDefault()
    if (!searchQuery || !editorRef.current) return

    // Use Monaco's built-in search
    const editor = editorRef.current
    editor.getAction("actions.find").run()

    // Set the search value in Monaco's find widget
    setTimeout(() => {
      const findInputElement = document.querySelector(".monaco-editor .find-widget .input")
      if (findInputElement) {
        findInputElement.value = searchQuery
        // Trigger the input event to update the search
        findInputElement.dispatchEvent(new Event("input", { bubbles: true }))
      }
    }, 100)
  }

  // Perform replace
  const performReplace = () => {
    if (!searchQuery || !replaceQuery || !editorRef.current) return

    const editor = editorRef.current
    editor.getAction("editor.action.startFindReplaceAction").run()

    // Set the search and replace values in Monaco's find widget
    setTimeout(() => {
      const findInputElement = document.querySelector(".monaco-editor .find-widget .input")
      const replaceInputElement = document.querySelector(".monaco-editor .find-widget .replace-input")

      if (findInputElement && replaceInputElement) {
        findInputElement.value = searchQuery
        findInputElement.dispatchEvent(new Event("input", { bubbles: true }))

        replaceInputElement.value = replaceQuery
        replaceInputElement.dispatchEvent(new Event("input", { bubbles: true }))
      }
    }, 100)
  }

  // Replace all occurrences
  const replaceAll = () => {
    if (!searchQuery || !replaceQuery || !editorRef.current || !activeFile) return

    const editor = editorRef.current
    const model = editor.getModel()

    if (!model) return

    const content = model.getValue()
    let newContent

    if (searchOptions.regex) {
      try {
        const flags = searchOptions.matchCase ? "g" : "gi"
        const regex = new RegExp(searchQuery, flags)
        newContent = content.replace(regex, replaceQuery)
      } catch (error) {
        console.error("Invalid regex:", error)
        return
      }
    } else {
      // Simple string replace
      const searchRegex = new RegExp(
        searchOptions.matchCase
          ? searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          : searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        searchOptions.matchCase ? "g" : "gi",
      )
      newContent = content.replace(searchRegex, replaceQuery)
    }

    if (newContent !== content) {
      editor.executeEdits("replace-all", [
        {
          range: model.getFullModelRange(),
          text: newContent,
        },
      ])

      // Update file content
      updateFileContent(activeFile.id, newContent)
    }
  }

  // Toggle split view
  const toggleSplitView = (direction) => {
    if (splitView === direction) {
      setSplitView(null)
      setSecondaryEditor(null)
    } else {
      setSplitView(direction)
      // Clone the current editor for the secondary view
      if (activeFile) {
        setSecondaryEditor(activeFile)
      }
    }
  }

  // Handle tab drag start
  const handleTabDragStart = (e, tabId) => {
    setIsDraggingTab(true)
    setDraggedTabId(tabId)
    e.dataTransfer.setData("text/plain", tabId)
    // Add a dragging class to the tab
    e.currentTarget.classList.add(styles.draggingTab)
  }

  // Handle tab drag end
  const handleTabDragEnd = (e) => {
    setIsDraggingTab(false)
    setDraggedTabId(null)
    // Remove the dragging class
    e.currentTarget.classList.remove(styles.draggingTab)
  }

  // Handle tab drag over
  const handleTabDragOver = (e) => {
    e.preventDefault()
    e.currentTarget.classList.add(styles.dragOverTab)
  }

  // Handle tab drag leave
  const handleTabDragLeave = (e) => {
    e.currentTarget.classList.remove(styles.dragOverTab)
  }

  // Handle tab drop
  const handleTabDrop = (e, targetTabId) => {
    e.preventDefault()
    e.currentTarget.classList.remove(styles.dragOverTab)

    if (!draggedTabId || draggedTabId === targetTabId) return

    // Reorder tabs
    const newTabs = [...openTabs]
    const draggedTabIndex = newTabs.findIndex((tab) => tab.id === draggedTabId)
    const targetTabIndex = newTabs.findIndex((tab) => tab.id === targetTabId)

    if (draggedTabIndex === -1 || targetTabIndex === -1) return

    const [draggedTab] = newTabs.splice(draggedTabIndex, 1)
    newTabs.splice(targetTabIndex, 0, draggedTab)

    // Update the tabs order (this would need to be implemented in the parent component)
    // For now, we'll just simulate the reordering visually
    const tabsContainer = tabsContainerRef.current
    if (tabsContainer) {
      const draggedTabElement = tabsContainer.querySelector(`[data-tab-id="${draggedTabId}"]`)
      const targetTabElement = tabsContainer.querySelector(`[data-tab-id="${targetTabId}"]`)

      if (draggedTabElement && targetTabElement) {
        if (draggedTabIndex < targetTabIndex) {
          targetTabElement.parentNode.insertBefore(draggedTabElement, targetTabElement.nextSibling)
        } else {
          targetTabElement.parentNode.insertBefore(draggedTabElement, targetTabElement)
        }
      }
    }
  }

  // Show context menu for tab
  const showTabContextMenu = (e, tab) => {
    e.preventDefault()
    setContextMenuTab(tab)
    setContextMenuPos({
      x: e.clientX,
      y: e.clientY,
      visible: true,
    })
  }

  // Close all tabs
  const closeAllTabs = () => {
    openTabs.forEach((tab) => {
      closeTab(tab.id)
    })
    setContextMenuPos((prev) => ({ ...prev, visible: false }))
  }

  // Close other tabs
  const closeOtherTabs = () => {
    if (!contextMenuTab) return

    openTabs.forEach((tab) => {
      if (tab.id !== contextMenuTab.id) {
        closeTab(tab.id)
      }
    })
    setContextMenuPos((prev) => ({ ...prev, visible: false }))
  }

  // Close tabs to the right
  const closeTabsToRight = () => {
    if (!contextMenuTab) return

    const tabIndex = openTabs.findIndex((tab) => tab.id === contextMenuTab.id)
    if (tabIndex === -1) return

    openTabs.slice(tabIndex + 1).forEach((tab) => {
      closeTab(tab.id)
    })
    setContextMenuPos((prev) => ({ ...prev, visible: false }))
  }

  // Duplicate file
  const duplicateFile = async (file) => {
    try {
      // Create a new file with the same content but a different name
      const nameParts = file.name.split(".")
      const extension = nameParts.pop()
      const baseName = nameParts.join(".")
      const newName = `${baseName}-copy.${extension}`

      const newFileData = {
        name: newName,
        type: file.type,
        content: file.content,
      }

      // Save the new file
      const savedFile = await PlaygroundServices.saveFile(newFileData)

      // Open the new file
      setActiveFile(savedFile)
      setActiveTabId(savedFile.id)

      // Close context menu
      setContextMenuPos((prev) => ({ ...prev, visible: false }))

      return savedFile
    } catch (error) {
      console.error("Failed to duplicate file:", error)
      return null
    }
  }

  // Start renaming a file
  const startRenameFile = (tabId) => {
    const tab = openTabs.find((t) => t.id === tabId)
    if (!tab) return

    setRenamingTabId(tabId)
    setRenameValue(tab.name)
    setIsRenaming(true)
    setContextMenuPos((prev) => ({ ...prev, visible: false }))

    // Focus the rename input after rendering
    setTimeout(() => {
      const renameInput = document.querySelector(`.${styles.renameInput}`)
      if (renameInput) {
        renameInput.focus()
        renameInput.select()
      }
    }, 50)
  }

  // Complete file rename
  const completeRename = async () => {
    if (!renamingTabId || !renameValue.trim()) {
      cancelRename()
      return
    }

    try {
      const tab = openTabs.find((t) => t.id === renamingTabId)
      if (!tab) return

      // Update the file name
      const updatedFile = await PlaygroundServices.renameFile(tab.id, renameValue)

      // Update the tab and active file
      if (updatedFile) {
        // This would need to be implemented in the parent component
        // For now, we'll just update the UI
        if (tab.id === activeTabId) {
          setActiveFile((prev) => ({ ...prev, name: renameValue }))
        }
      }
    } catch (error) {
      console.error("Failed to rename file:", error)
    } finally {
      setIsRenaming(false)
      setRenamingTabId(null)
      setRenameValue("")
    }
  }

  // Cancel rename operation
  const cancelRename = () => {
    setIsRenaming(false)
    setRenamingTabId(null)
    setRenameValue("")
  }

  // Handle rename input key press
  const handleRenameKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      completeRename()
    } else if (e.key === "Escape") {
      e.preventDefault()
      cancelRename()
    }
  }

  // Navigate to breadcrumb path
  const navigateToBreadcrumb = (index) => {
    if (!activeFile) return

    // This would need to be implemented based on your file structure
    // For now, we'll just log the action
    console.log(`Navigate to breadcrumb: ${breadcrumbs.slice(0, index + 1).join("/")}`)
  }

  return (
    <>
      <div className={styles.editorHeader}>
        <div className={styles.editorFileInfo}>
          {!isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(true)} className={styles.iconButton} title="Open sidebar">
              <ChevronRight size={16} />
            </button>
          )}
          {activeFile && (
            <>
              {/* Breadcrumbs navigation */}
              <div className={styles.breadcrumbs}>
                {breadcrumbs.map((part, index) => (
                  <span key={index} className={styles.breadcrumbItem}>
                    {index < breadcrumbs.length - 1 ? (
                      <>
                        <span className={styles.breadcrumbLink} onClick={() => navigateToBreadcrumb(index)}>
                          {part}
                        </span>
                        <span className={styles.breadcrumbSeparator}>/</span>
                      </>
                    ) : (
                      <span className={styles.breadcrumbCurrent}>{part}</span>
                    )}
                  </span>
                ))}
              </div>
              <span className={styles.editorFileType}>{activeFile.type}</span>
              {syntaxErrors.length > 0 && (
                <span className={styles.errorCount} title={`${syntaxErrors.length} error(s) found`}>
                  {syntaxErrors.length}
                </span>
              )}
              {/* Check if activeFile.id is defined before calling toString */}
              {activeFile.id && activeFile.id.toString().startsWith("local_") && (
                <span className={styles.unsavedIndicator} title="Unsaved file">
                  Unsaved
                </span>
              )}
              {/* Show deleted indicator if file no longer exists in files array */}
              {activeFile.id && isFileDeleted(activeFile.id) && (
                <span className={styles.deletedIndicator} title="File has been deleted">
                  (deleted)
                </span>
              )}
            </>
          )}
        </div>
        <div className={styles.editorActions}>
          <button
            onClick={handleUndo}
            className={`${styles.iconButton} ${!canUndo ? styles.disabled : ""}`}
            title="Undo (Ctrl+Z)"
            disabled={!canUndo}
          >
            <Undo size={16} />
          </button>
          <button
            onClick={handleRedo}
            className={`${styles.iconButton} ${!canRedo ? styles.disabled : ""}`}
            title="Redo (Ctrl+Shift+Z)"
            disabled={!canRedo}
          >
            <Redo size={16} />
          </button>
          <button
            onClick={toggleAutoSave}
            className={`${styles.iconButton} ${settings.autoSave ? styles.active : ""}`}
            title={settings.autoSave ? "Disable auto-save" : "Enable auto-save"}
          >
            Auto-save
          </button>
          <button
            onClick={saveCurrentFile}
            className={`${styles.iconButton} ${isSaving ? styles.processing : ""}`}
            title="Save file (Ctrl+S)"
            disabled={isSaving}
          >
            <Save size={16} className={isSaving ? styles.spinning : ""} />
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
          <button
            onClick={toggleSearch}
            className={`${styles.iconButton} ${isSearchOpen ? styles.active : ""}`}
            title="Find and replace (Ctrl+F)"
          >
            <Search size={16} />
          </button>
          <button
            onClick={() => toggleSplitView("vertical")}
            className={`${styles.iconButton} ${splitView === "vertical" ? styles.active : ""}`}
            title="Split editor vertically (Ctrl+\)"
          >
            <SplitVertical size={16} />
          </button>
          <button
            onClick={() => toggleSplitView("horizontal")}
            className={`${styles.iconButton} ${splitView === "horizontal" ? styles.active : ""}`}
            title="Split editor horizontally (Ctrl+Shift+\)"
          >
            <SplitHorizontal size={16} />
          </button>
          <button onClick={toggleZenMode} className={styles.iconButton} title="Toggle zen mode (Ctrl+K)">
            {isZenMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>
      <div className={styles.editorTabs} ref={tabsContainerRef}>
        {openTabs.map((tab) => {
          // Check if this file still exists in the files array
          const fileStillExists = files && files.some((f) => f.id === tab.id)
          const isRenaming = renamingTabId === tab.id

          return (
            <div
              key={tab.id}
              data-tab-id={tab.id}
              className={`${styles.editorTab} ${activeTabId === tab.id ? styles.active : ""} ${!fileStillExists ? styles.deletedTab : ""}`}
              onClick={() => {
                setActiveTabId(tab.id)
                setActiveFile(tab)
              }}
              onContextMenu={(e) => showTabContextMenu(e, tab)}
              draggable={!isRenaming}
              onDragStart={(e) => handleTabDragStart(e, tab.id)}
              onDragEnd={handleTabDragEnd}
              onDragOver={handleTabDragOver}
              onDragLeave={handleTabDragLeave}
              onDrop={(e) => handleTabDrop(e, tab.id)}
            >
              <div className={styles.editorTabContent}>
                {getFileIcon(tab.type)}
                {isRenaming ? (
                  <input
                    type="text"
                    className={styles.renameInput}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={completeRename}
                    onKeyDown={handleRenameKeyPress}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className={styles.editorTabName}>
                    {tab.name}
                    {!fileStillExists && " (deleted)"}
                  </span>
                )}
                {/* Check if tab.id is defined before calling toString */}
                {tab.id && tab.id.toString().startsWith("local_") && (
                  <span className={styles.unsavedBadge} title="Unsaved file">
                    •
                  </span>
                )}
              </div>
              <button className={styles.editorTabClose} onClick={(e) => closeTab(tab.id, e)} title="Close tab">
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>

      <div className={isZenMode ? styles.zenModeContainer : styles.editorContainer}>
        <div
          className={`${styles.monacoEditorContainer} ${isFileDeleted(activeFile?.id) ? styles.deletedFile : ""} ${isZenMode ? styles.zenMode : ""}`}
        >
          {activeFile ? (
            <>
              {splitView ? (
                <div className={`${styles.splitEditorContainer} ${styles[splitView]}`}>
                  <div className={styles.primaryEditor}>
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
                        minimap: {
                          enabled: settings.minimap,
                          scale: 0.8,
                          showSlider: "mouseover",
                          renderCharacters: true,
                          maxColumn: 80,
                        },
                        renderIndentGuides: settings.indentGuides,
                        autoClosingBrackets: settings.autoClosingBrackets ? "always" : "never",
                        renderLineHighlight: settings.highlightActiveLine ? "all" : "none",
                        lineNumbers: showLineNumbers ? "on" : "off",
                      }}
                    />
                  </div>
                  <div className={styles.secondaryEditor}>
                    {secondaryEditor && (
                      <Editor
                        height="100%"
                        language={getLanguageId(secondaryEditor.type)}
                        value={secondaryEditor.content}
                        theme={theme === "dark" ? "vs-dark" : "vs-light"}
                        options={{
                          readOnly: true,
                          fontSize: settings.fontSize,
                          tabSize: settings.tabSize,
                          wordWrap: settings.wordWrap ? "on" : "off",
                          minimap: { enabled: false },
                          lineNumbers: showLineNumbers ? "on" : "off",
                        }}
                      />
                    )}
                  </div>
                </div>
              ) : (
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
                    minimap: {
                      enabled: settings.minimap,
                      scale: 0.8,
                      showSlider: "mouseover",
                      renderCharacters: true,
                      maxColumn: 80,
                    },
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
                      alwaysConsumeMouseWheel: false,
                      useShadows: true,
                    },
                  }}
                />
              )}

              {/* Search and Replace Panel */}
              {isSearchOpen && (
                <div className={styles.searchPanel}>
                  <div className={styles.searchPanelHeader}>
                    <h3>Find & Replace</h3>
                    <button
                      className={styles.iconButton}
                      onClick={() => setIsSearchOpen(false)}
                      title="Close search panel"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <form onSubmit={performSearch} className={styles.searchForm}>
                    <div className={styles.searchInputGroup}>
                      <Search size={14} className={styles.searchIcon} />
                      <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Find"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className={styles.searchInputGroup}>
                      <Replace size={14} className={styles.searchIcon} />
                      <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Replace"
                        value={replaceQuery}
                        onChange={(e) => setReplaceQuery(e.target.value)}
                      />
                    </div>
                    <div className={styles.searchOptions}>
                      <label className={styles.searchOption}>
                        <input
                          type="checkbox"
                          checked={searchOptions.matchCase}
                          onChange={() => setSearchOptions((prev) => ({ ...prev, matchCase: !prev.matchCase }))}
                        />
                        Match Case
                      </label>
                      <label className={styles.searchOption}>
                        <input
                          type="checkbox"
                          checked={searchOptions.wholeWord}
                          onChange={() => setSearchOptions((prev) => ({ ...prev, wholeWord: !prev.wholeWord }))}
                        />
                        Whole Word
                      </label>
                      <label className={styles.searchOption}>
                        <input
                          type="checkbox"
                          checked={searchOptions.regex}
                          onChange={() => setSearchOptions((prev) => ({ ...prev, regex: !prev.regex }))}
                        />
                        Regex
                      </label>
                    </div>
                    <div className={styles.searchActions}>
                      <button type="submit" className={styles.searchButton}>
                        Find
                      </button>
                      <button type="button" className={styles.searchButton} onClick={performReplace}>
                        Replace
                      </button>
                      <button type="button" className={styles.searchButton} onClick={replaceAll}>
                        Replace All
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          ) : (
            <div className={styles.noFileSelected}>
              <p>No file selected</p>
              <p>Create a new file or select an existing file from the sidebar</p>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      {!isZenMode && activeFile && (
        <div className={styles.statusBar}>
          <div className={styles.statusLeft}>
            <div className={styles.statusItem}>
              Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
            </div>
            <div className={styles.statusItem}>{encoding}</div>
            <div className={styles.statusItem}>{lineEnding}</div>
            <div className={styles.statusItem}>{getLanguageId(activeFile.type).toUpperCase()}</div>
          </div>
          <div className={styles.statusRight}>
            {syntaxErrors.length > 0 && <div className={styles.statusError}>{syntaxErrors.length} error(s)</div>}
            <div className={styles.statusItem}>{settings.tabSize} Spaces</div>
            <div className={styles.statusItem}>{settings.wordWrap ? "Wrap" : "No Wrap"}</div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenuPos.visible && (
        <div
          className={styles.contextMenu}
          style={{
            top: contextMenuPos.y,
            left: contextMenuPos.x,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={styles.contextMenuItem}
            onClick={() => {
              if (contextMenuTab) {
                closeTab(contextMenuTab.id)
                setContextMenuPos((prev) => ({ ...prev, visible: false }))
              }
            }}
          >
            <X size={14} />
            Close
          </div>
          <div className={styles.contextMenuItem} onClick={closeOtherTabs}>
            Close Others
          </div>
          <div className={styles.contextMenuItem} onClick={closeTabsToRight}>
            Close to the Right
          </div>
          <div className={styles.contextMenuItem} onClick={closeAllTabs}>
            Close All
          </div>
          <div className={styles.contextMenuDivider}></div>
          <div
            className={styles.contextMenuItem}
            onClick={() => {
              if (contextMenuTab) {
                duplicateFile(contextMenuTab)
              }
            }}
          >
            <Copy size={14} />
            Duplicate
          </div>
          <div
            className={styles.contextMenuItem}
            onClick={() => {
              if (contextMenuTab) {
                startRenameFile(contextMenuTab.id)
              }
            }}
          >
            <Edit size={14} />
            Rename
          </div>
        </div>
      )}
    </>
  )
}


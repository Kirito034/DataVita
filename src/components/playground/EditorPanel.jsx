"use client"

import { useRef, useEffect, useState } from "react"
import { ChevronRight, Code, X, Undo, Redo } from "lucide-react"
import { Editor, useMonaco } from "@monaco-editor/react"
import styles from "../../styles/playground.module.css"

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
}) {
  const editorRef = useRef(null)
  const monaco = useMonaco()
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  useEffect(() => {
    if (editorRef.current && activeFile) {
      const model = editorRef.current.getModel()
      if (model) {
        const undoStack = model.getAlternativeVersionId() > 1
        const redoStack = model.canRedo()
        setCanUndo(undoStack)
        setCanRedo(redoStack)
      }
    }
  }, [activeFile])

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor

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
        alwaysConsumeMouseWheel: false,
      },
    })

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

        const undoStack = model.getAlternativeVersionId() > 1
        const redoStack = model.canRedo()
        setCanUndo(undoStack)
        setCanRedo(redoStack)
      }
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveCurrentFile()
    })
  }

  const handleEditorChange = (value) => {
    if (!activeFile) return
    updateFileContent(activeFile.id, value)
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

  const handleUndo = () => {
    if (editorRef.current) {
      editorRef.current.trigger("keyboard", "undo", null)
      const model = editorRef.current.getModel()
      if (model) {
        setCanUndo(model.getAlternativeVersionId() > 1)
        setCanRedo(model.canRedo())
      }
    }
  }

  const handleRedo = () => {
    if (editorRef.current) {
      editorRef.current.trigger("keyboard", "redo", null)
      const model = editorRef.current.getModel()
      if (model) {
        setCanUndo(model.getAlternativeVersionId() > 1)
        setCanRedo(model.canRedo())
      }
    }
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
              <span className={styles.editorFileName}>{activeFile.name}</span>
              <span className={styles.editorFileType}>{activeFile.type}</span>
              {syntaxErrors.length > 0 && (
                <span className={styles.errorCount} title={`${syntaxErrors.length} error(s) found`}>
                  {syntaxErrors.length}
                </span>
              )}
              {activeFile.id.toString().startsWith("local_") && (
                <span className={styles.unsavedIndicator} title="Unsaved file">
                  Unsaved
                </span>
              )}
            </>
          )}
        </div>
        <div className={styles.editorActions}>
          <button
            onClick={handleUndo}
            className={`${styles.iconButton} ${!canUndo ? styles.disabled : ""}`}
            title="Undo"
            disabled={!canUndo}
          >
            <Undo size={16} />
          </button>
          <button
            onClick={handleRedo}
            className={`${styles.iconButton} ${!canRedo ? styles.disabled : ""}`}
            title="Redo"
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

      <div className={styles.editorTabs}>
        {openTabs.map((tab) => (
          <div
            key={tab.id}
            className={`${styles.editorTab} ${activeTabId === tab.id ? styles.active : ""}`}
            onClick={() => {
              setActiveTabId(tab.id)
              setActiveFile(tab)
            }}
          >
            <div className={styles.editorTabContent}>
              {getFileIcon(tab.type)}
              <span className={styles.editorTabName}>{tab.name}</span>
              {tab.id.toString().startsWith("local_") && (
                <span className={styles.unsavedBadge} title="Unsaved file">
                  •
                </span>
              )}
            </div>
            <button className={styles.editorTabClose} onClick={(e) => closeTab(tab.id, e)} title="Close tab">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

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
              quickSuggestions: settings.autoComplete,
              suggestOnTriggerCharacters: settings.autoComplete,
              folding: true,
              foldingStrategy: "auto",
              matchBrackets: "always",
              scrollbar: {
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
                alwaysConsumeMouseWheel: false,
              },
            }}
          />
        ) : (
          <div className={styles.noFileSelected}>
            <p>No file selected</p>
            <p>Create a new file or select an existing file from the sidebar</p>
          </div>
        )}
      </div>
    </>
  )
}


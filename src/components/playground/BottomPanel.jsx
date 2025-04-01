"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, ChevronRight, Terminal, AlertCircle } from "lucide-react"
import styles from "../../styles/playground.module.css"

export default function BottomPanel({
  isBottomPanelOpen,
  setIsBottomPanelOpen,
  activeBottomTab,
  setActiveBottomTab,
  consoleOutput,
  setConsoleOutput,
  syntaxErrors,
  runtimeErrors,
  files,
  openFileInTab,
}) {
  const [terminalInput, setTerminalInput] = useState("")
  const [terminalHistory, setTerminalHistory] = useState([])

  const consoleEndRef = useRef(null)
  const terminalInputRef = useRef(null)

  // Auto-scroll console to bottom when new logs are added
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [consoleOutput])

  // Clear the console
  const clearConsole = () => {
    setConsoleOutput([])
    setTerminalHistory([])
  }

  // Handle terminal command submission
  const handleTerminalSubmit = (e) => {
    e.preventDefault()
    if (!terminalInput.trim()) return

    setTerminalHistory((prev) => [...prev, { type: "command", content: terminalInput }])
    processTerminalCommand(terminalInput)
    setTerminalInput("")
  }

  // Process terminal commands
  const processTerminalCommand = (command) => {
    const cmd = command.trim()
    let response = ""

    if (cmd === "clear" || cmd === "cls") {
      setTerminalHistory([])
      return
    } else if (cmd === "help") {
      response = `Available commands:
npm install <package> - Install a package
npm install <package> --save-dev - Install a dev dependency
npm uninstall <package> - Remove a package
npm list - List installed packages
ls, dir - List files in current directory
save - Save current file
save all - Save all files
load - Load files from server
create-project - Create a new project
clear, cls - Clear terminal
help - Show this help`
    } else {
      response = `Command not found: ${cmd}. Type 'help' for available commands.`
    }

    setTerminalHistory((prev) => [...prev, { type: "output", content: response }])
  }

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
    )
  }

  // Render error panel with detailed error information
  const renderErrorPanel = () => {
    const allErrors = [...syntaxErrors, ...runtimeErrors]

    if (allErrors.length === 0) {
      return (
        <div className={styles.emptyErrorPanel}>
          <AlertCircle size={24} />
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
                openFileInTab(file)
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

  return (
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
            <Terminal size={14} />
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
  )
}


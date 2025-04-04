"use client"

import { useEffect, useCallback, useRef, useState } from "react"
import { RefreshCw, Play, Maximize2, Minimize2, ExternalLink } from "lucide-react"
import styles from "../../styles/playground.module.css"
import UrlBar from "./utils/UrlBar"

export default function PreviewPanel({
  files,
  isFullScreen,
  setIsFullScreen,
  isAutoRefresh,
  setIsAutoRefresh,
  isProcessing,
  previewError,
  currentPreviewPage,
  setCurrentPreviewPage,
  updatePreview,
  iframeRef,
  addConsoleLog,
  setRuntimeErrors,
  CDN_LINKS,
  projectType,
}) {
  // Reference to track if the component is mounted
  const isMountedRef = useRef(true)

  // Add state for SPA routing
  const [isSpaMode, setIsSpaMode] = useState(false)
  const [spaPath, setSpaPath] = useState("/")

  // Add state for preview URL
  const [previewUrl, setPreviewUrl] = useState("")

  // Add state to track deleted files that are still needed for preview
  const [deletedFiles, setDeletedFiles] = useState([])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Track deleted files that might be needed for preview
  useEffect(() => {
    // Check if the current preview page exists in files
    const currentPageExists = files.some((f) => f.name === currentPreviewPage)

    if (!currentPageExists) {
      // Find the file in deletedFiles or try to find another HTML file
      const deletedFile = deletedFiles.find((f) => f.name === currentPreviewPage)

      if (!deletedFile) {
        // Try to find another HTML file to use
        const htmlFile = files.find((f) => f.type === "html")
        if (htmlFile) {
          setCurrentPreviewPage(htmlFile.name)
        }
      }
    }
  }, [files, currentPreviewPage, deletedFiles])

  // Handle console messages from the preview iframe
  useEffect(() => {
    const handleMessage = (event) => {
      if (!isMountedRef.current) return

      if (event.data && event.data.source === "playground-console") {
        if (event.data.type === "error" && event.data.errorDetails) {
          const { message, filename, lineno, colno, stack } = event.data.errorDetails

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

          const formattedMessage = `${message} (${filename}:${lineno}:${colno})`
          addConsoleLog(formattedMessage, "error")
        } else {
          addConsoleLog(event.data.args, event.data.type)
        }
      } else if (event.data && event.data.source === "playground-navigation") {
        // Handle navigation between HTML pages
        if (event.data.action === "navigate") {
          if (event.data.page) {
            // HTML navigation
            const targetPage = event.data.page
            setCurrentPreviewPage(targetPage)
            addConsoleLog(`Navigating to: ${targetPage}`, "info")
            setIsSpaMode(false)

            // Re-render the preview with the new page
            updatePreview(targetPage)
          } else if (event.data.path) {
            // SPA navigation
            setSpaPath(event.data.path)
            setIsSpaMode(true)
            addConsoleLog(`SPA navigation to: ${event.data.path}`, "info")
          }
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [setCurrentPreviewPage, updatePreview, addConsoleLog, setRuntimeErrors])

  // Generate a shareable preview URL
  const generateShareableUrl = useCallback(() => {
    // Create a temporary URL that can be shared
    try {
      const previewData = {
        files: files.map((f) => ({
          name: f.name,
          type: f.type,
          content: f.content,
          path: f.path,
        })),
        currentPage: currentPreviewPage,
      }

      // In a real implementation, this would call an API to save the state
      // and generate a shareable URL with a unique ID
      const encodedData = btoa(JSON.stringify(previewData))
      const shareableUrl = `${window.location.origin}/preview/${encodedData}`

      setPreviewUrl(shareableUrl)

      // Copy to clipboard
      navigator.clipboard
        .writeText(shareableUrl)
        .then(() => {
          addConsoleLog("Preview URL copied to clipboard!", "success")
        })
        .catch((err) => {
          addConsoleLog(`Failed to copy URL: ${err.message}`, "error")
        })
    } catch (error) {
      addConsoleLog(`Failed to generate preview URL: ${error.message}`, "error")
    }
  }, [files, currentPreviewPage, addConsoleLog])

  // Render preview navigation bar
  const renderPreviewNavigation = () => {
    // Get all HTML files
    const htmlFiles = files.filter((f) => f.type === "html")

    // Include deleted HTML files that might still be needed
    const deletedHtmlFiles = deletedFiles.filter((f) => f.type === "html")

    // Combine both lists, ensuring no duplicates
    const allHtmlFiles = [...htmlFiles, ...deletedHtmlFiles.filter((df) => !htmlFiles.some((f) => f.name === df.name))]

    return (
      <div className={styles.previewNavigation}>
        <span className={styles.previewNavigationLabel}>Page:</span>
        <select
          value={currentPreviewPage}
          onChange={(e) => updatePreview(e.target.value)}
          className={styles.previewNavigationSelect}
        >
          {allHtmlFiles.map((file) => (
            <option key={file.id} value={file.name}>
              {file.name} {!files.some((f) => f.id === file.id) && "(deleted)"}
            </option>
          ))}
        </select>

        <UrlBar
          currentPage={currentPreviewPage}
          onRefresh={() => generatePreview()}
          isSpa={isSpaMode}
          spaPath={spaPath}
        />

        <button onClick={generateShareableUrl} className={styles.iconButton} title="Generate shareable preview URL">
          <ExternalLink size={16} />
        </button>
      </div>
    )
  }

  // Build a file path map for resolving imports
  const buildFilePathMap = useCallback((allFiles) => {
    const fileMap = {}

    // First pass: map all files by their full paths
    allFiles.forEach((file) => {
      // Normalize path to ensure consistency
      const normalizedPath = file.path.endsWith("/") ? file.path : `${file.path}/`
      const fullPath = normalizedPath === "/" ? file.name : `${normalizedPath}${file.name}`

      // Store by full path
      fileMap[fullPath] = file

      // Also store by just filename for simple imports
      fileMap[file.name] = file

      // Store by path without extension for JSX/TSX imports
      if (file.name.endsWith(".jsx") || file.name.endsWith(".tsx")) {
        const nameWithoutExt = file.name.replace(/\.(jsx|tsx)$/, "")
        fileMap[nameWithoutExt] = file

        // Also store with path
        const pathWithoutExt = fullPath.replace(/\.(jsx|tsx)$/, "")
        fileMap[pathWithoutExt] = file
      }
    })

    // Second pass: handle relative paths for each file's directory
    allFiles.forEach((file) => {
      const normalizedPath = file.path.endsWith("/") ? file.path : `${file.path}/`

      // For each directory in the project, add mappings for files relative to that directory
      allFiles.forEach((targetFile) => {
        if (targetFile.path !== file.path) {
          // Calculate relative path from file's directory to target file
          const relativePath = calculateRelativePath(normalizedPath, targetFile)
          fileMap[`${normalizedPath}${relativePath}`] = targetFile
        }
      })
    })

    return fileMap
  }, [])

  // Helper function to calculate relative path between directories
  const calculateRelativePath = (fromDir, toFile) => {
    // This is a simplified version - in a real implementation, you'd need more robust path resolution
    const toDir = toFile.path.endsWith("/") ? toFile.path : `${toFile.path}/`

    // If the target is in the root, it's just the filename
    if (toDir === "/" || toDir === "./") {
      return toFile.name
    }

    // If the source is in the root, the relative path is the full path to the target
    if (fromDir === "/" || fromDir === "./") {
      return `${toDir}${toFile.name}`.replace(/^\//, "")
    }

    // For files in different directories, calculate the relative path
    // This is a simplified implementation
    const fromParts = fromDir.split("/").filter(Boolean)
    const toParts = toDir.split("/").filter(Boolean)

    // Find common prefix
    let commonPrefixLength = 0
    const minLength = Math.min(fromParts.length, toParts.length)

    for (let i = 0; i < minLength; i++) {
      if (fromParts[i] === toParts[i]) {
        commonPrefixLength++
      } else {
        break
      }
    }

    // Build relative path
    const upCount = fromParts.length - commonPrefixLength
    const upPath = Array(upCount).fill("..").join("/")
    const downPath = toParts.slice(commonPrefixLength).join("/")

    let relativePath = ""
    if (upPath && downPath) {
      relativePath = `${upPath}/${downPath}/${toFile.name}`
    } else if (upPath) {
      relativePath = `${upPath}/${toFile.name}`
    } else if (downPath) {
      relativePath = `${downPath}/${toFile.name}`
    } else {
      relativePath = toFile.name
    }

    return relativePath
  }

  // Generate preview content
  const generatePreview = useCallback(() => {
    try {
      // Combine current files with deleted files that might still be needed
      const allFiles = [...files, ...deletedFiles.filter((df) => !files.some((f) => f.id === df.id))]

      // Find the HTML file that should be the entry point
      // Use the specified page, or index.html as default
      let htmlFile = allFiles.find((f) => f.name === currentPreviewPage)
      if (!htmlFile) {
        htmlFile = allFiles.find((f) => f.name === "index.html")
        if (!htmlFile) {
          htmlFile = allFiles.find((f) => f.name.endsWith(".html"))
        }
      }

      // If no HTML file is found, log an error and return
      if (!htmlFile && allFiles.length > 0) {
        addConsoleLog(`No HTML file found for preview`, "error")
        return false
      }

      const htmlContent = htmlFile?.content || ""

      // Get all CSS files
      const cssFiles = allFiles.filter((f) => f.name.endsWith(".css"))

      // Get all JS files
      const jsFiles = allFiles.filter((f) => f.name.endsWith(".js"))

      // Get all JSX files
      const jsxFiles = allFiles.filter((f) => f.name.endsWith(".jsx") || f.name.endsWith(".tsx"))

      // Create a map of all files for import resolution
      const fileMap = buildFilePathMap(allFiles)

      // Process imports in JS files to create a dependency graph
      const processedFiles = new Set()
      const dependencyGraph = {}

      // Function to process imports in a file
      const processImports = (file) => {
        if (processedFiles.has(file.id)) return
        processedFiles.add(file.id)

        const filePath = file.path === "/" ? file.name : `${file.path}/${file.name}`
        dependencyGraph[filePath] = []

        // Simple regex to find import statements
        const importRegex = /import\s+(?:.+\s+from\s+)?['"](.+)['"]/g
        let match

        while ((match = importRegex.exec(file.content)) !== null) {
          const importPath = match[1]

          // Handle relative imports
          let resolvedPath = importPath
          if (importPath.startsWith("./") || importPath.startsWith("../")) {
            // Resolve relative path based on current file's path
            const currentDir = file.path === "/" ? "/" : `${file.path}/`
            resolvedPath = resolveRelativePath(currentDir, importPath)
          }

          // Check if the import exists in our file system
          const possiblePaths = [
            resolvedPath,
            `${resolvedPath}.js`,
            `${resolvedPath}.jsx`,
            `${resolvedPath}.tsx`,
            // Try without extension (for component imports)
            resolvedPath.replace(/\.(js|jsx|tsx)$/, ""),
            // Try with /index
            `${resolvedPath}/index.js`,
            `${resolvedPath}/index.jsx`,
            `${resolvedPath}/index.tsx`,
          ]

          let importedFile = null
          for (const path of possiblePaths) {
            if (fileMap[path]) {
              importedFile = fileMap[path]
              break
            }
          }

          if (importedFile) {
            dependencyGraph[filePath].push(importedFile)

            // Recursively process imports in the imported file
            processImports(importedFile)
          }
        }
      }

      // Helper function to resolve relative paths
      const resolveRelativePath = (basePath, relativePath) => {
        // Remove ./ prefix
        const path = relativePath.replace(/^\.\//, "")

        // Handle ../ by going up directories
        if (path.startsWith("../")) {
          const basePathParts = basePath.split("/").filter(Boolean)
          const relativePathParts = path.split("/")

          let upCount = 0
          while (relativePathParts[0] === "..") {
            upCount++
            relativePathParts.shift()
          }

          const newBasePath = basePathParts.slice(0, basePathParts.length - upCount).join("/")
          return `${newBasePath ? `/${newBasePath}` : ""}/${relativePathParts.join("/")}`
        }

        // For simple relative paths, just join with base path
        return basePath === "/" ? path : `${basePath}${path}`
      }
      // Process all JS and JSX files
      ;[...jsFiles, ...jsxFiles].forEach(processImports)

      // Prepare CSS content - maintain file paths for imports
      const cssContent = cssFiles
        .map((f) => {
          // Add a comment to identify the file
          return `/* File: ${f.path === "/" ? "" : f.path}/${f.name} */\n${f.content}`
        })
        .join("\n\n")

      // Sort JS files based on dependencies to ensure proper loading order
      const sortedJsFiles = [...jsFiles].sort((a, b) => {
        const aPath = a.path === "/" ? a.name : `${a.path}/${a.name}`
        const bPath = b.path === "/" ? b.name : `${b.path}/${b.name}`

        // If A depends on B, B should come first
        if (dependencyGraph[aPath] && dependencyGraph[aPath].some((dep) => dep.id === b.id)) {
          return 1
        }
        // If B depends on A, A should come first
        if (dependencyGraph[bPath] && dependencyGraph[bPath].some((dep) => dep.id === a.id)) {
          return -1
        }

        // Default to alphabetical order
        return aPath.localeCompare(bPath)
      })

      // Prepare JS content with proper ordering
      const jsContent = sortedJsFiles
        .map((file) => {
          // Add a comment to identify the file
          return `// File: ${file.path === "/" ? "" : file.path}/${file.name}\n${file.content}`
        })
        .join("\n\n")

      // Transpile JSX files
      let jsxContent = ""
      if (jsxFiles.length > 0) {
        // Sort JSX files based on dependencies
        const sortedJsxFiles = [...jsxFiles].sort((a, b) => {
          const aPath = a.path === "/" ? a.name : `${a.path}/${a.name}`
          const bPath = b.path === "/" ? b.name : `${b.path}/${b.name}`

          // If A depends on B, B should come first
          if (dependencyGraph[aPath] && dependencyGraph[aPath].some((dep) => dep.id === b.id)) {
            return 1
          }
          // If B depends on A, A should come first
          if (dependencyGraph[bPath] && dependencyGraph[bPath].some((dep) => dep.id === a.id)) {
            return -1
          }

          // App.jsx should always come last
          if (a.name === "App.jsx" || a.name === "App.tsx") return 1
          if (b.name === "App.jsx" || b.name === "App.tsx") return -1

          // Default to alphabetical order
          return aPath.localeCompare(bPath)
        })

        // Create a virtual module system for React components
        jsxContent += `
// Create a virtual module system for React components
window.__PLAYGROUND__ = window.__PLAYGROUND__ || {};
window.__PLAYGROUND__.reactModules = {};
window.__PLAYGROUND__.reactRoutes = {};
window.__PLAYGROUND__.registerReactComponent = function(name, component) {
  window.__PLAYGROUND__.reactModules[name] = component;
  console.log('Registered component:', name);
};
window.__PLAYGROUND__.getReactComponent = function(name) {
  // First try exact match
  if (window.__PLAYGROUND__.reactModules[name]) {
    return window.__PLAYGROUND__.reactModules[name];
  }
  
  // Try with file extension variations
  const extensionVariations = [name, name + '.jsx', name + '.js', name + '.tsx', name + '.ts'];
  for (const variation of extensionVariations) {
    if (window.__PLAYGROUND__.reactModules[variation]) {
      return window.__PLAYGROUND__.reactModules[variation];
    }
  }
  
  // Try case-insensitive match
  const lowerName = name.toLowerCase();
  for (const key in window.__PLAYGROUND__.reactModules) {
    if (key.toLowerCase() === lowerName) {
      return window.__PLAYGROUND__.reactModules[key];
    }
  }
  
  // Try with different casing conventions (camelCase, PascalCase, kebab-case)
  const variations = [
    // Original
    name,
    // camelCase to PascalCase
    name.charAt(0).toUpperCase() + name.slice(1),
    // PascalCase to camelCase
    name.charAt(0).toLowerCase() + name.slice(1),
    // kebab-case to camelCase
    name.replace(/-([a-z])/g, (g) => g[1].toUpperCase()),
    // kebab-case to PascalCase
    name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('')
  ];
  
  for (const variation of variations) {
    if (window.__PLAYGROUND__.reactModules[variation]) {
      return window.__PLAYGROUND__.reactModules[variation];
    }
  }
  
  // Try with path-based resolution
  if (name.includes('/')) {
    const parts = name.split('/');
    const componentName = parts[parts.length - 1];
    
    // Try the component name alone
    if (window.__PLAYGROUND__.reactModules[componentName]) {
      return window.__PLAYGROUND__.reactModules[componentName];
    }
    
    // Try variations of the component name
    const componentVariations = [
      // Original
      componentName,
      // With extensions
      componentName + '.jsx',
      componentName + '.js',
      componentName + '.tsx',
      componentName + '.ts',
      // camelCase to PascalCase
      componentName.charAt(0).toUpperCase() + componentName.slice(1),
      // PascalCase to camelCase
      componentName.charAt(0).toLowerCase() + componentName.slice(1),
      // kebab-case to camelCase
      componentName.replace(/-([a-z])/g, (g) => g[1].toUpperCase()),
      // kebab-case to PascalCase
      componentName.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('')
    ];
    
    for (const variation of componentVariations) {
      if (window.__PLAYGROUND__.reactModules[variation]) {
        return window.__PLAYGROUND__.reactModules[variation];
      }
    }
    
    // Try with index files
    const dirPath = parts.slice(0, -1).join('/');
    const indexVariations = [
      dirPath + '/index',
      dirPath + '/index.jsx',
      dirPath + '/index.js',
      dirPath + '/index.tsx',
      dirPath + '/index.ts'
    ];
    
    for (const variation of indexVariations) {
      if (window.__PLAYGROUND__.reactModules[variation]) {
        return window.__PLAYGROUND__.reactModules[variation];
      }
    }
  }
  
  // Not found
  console.error('Component not found:', name);
  return null;
};
`

        // Process each JSX file
        for (const file of sortedJsxFiles) {
          try {
            const isTypescript = file.name.endsWith(".tsx")
            const fileName = file.name.replace(/\.(jsx|tsx)$/, "")
            const filePath = file.path === "/" ? "" : file.path

            // Register the component with both name and path for better resolution
            const registerNames = [
              fileName,
              `${filePath}/${fileName}`.replace(/^\//, "").replace(/\/\//g, "/"),
              `${filePath}/${file.name}`.replace(/^\//, "").replace(/\/\//g, "/"),
            ]

            // Create a module wrapper for this component
            jsxContent += `
// File: ${file.path === "/" ? "" : file.path}/${file.name}
try {
  (function() {
    // Create local React and ReactDOM references
    const React = window.React;
    const ReactDOM = window.ReactDOM;
    const useState = React.useState;
    const useEffect = React.useEffect;
    const useRef = React.useRef;
    const useCallback = React.useCallback;
    const useMemo = React.useMemo;
    const useContext = React.useContext;
    const useReducer = React.useReducer;
    const Fragment = React.Fragment;
    
    // Import system for React components
    const importComponent = function(name) {
      const component = window.__PLAYGROUND__.getReactComponent(name);
      if (!component) {
        console.error('Component not found:', name);
        return () => React.createElement('div', null, 'Component not found: ' + name);
      }
      return component;
    };
    
    // Process the file content
    let processedContent = ${JSON.stringify(file.content)}
  // Replace import statements for React components with our virtual imports
  .replace(/import\\s+([\\w\\{\\}\\s,]+)\\s+from\\s+['"]react['"];?/g, '')
  .replace(/import\\s+([\\w\\{\\}\\s,]+)\\s+from\\s+['"]react-dom['"];?/g, '')
  .replace(/import\\s+([\\w\\{\\}\\s,]+)\\s+from\\s+['"]react-dom\\/client['"];?/g, '')
  .replace(/import\\s+([\\w\\{\\}\\s,]+)\\s+from\\s+['"]react-router-dom['"];?/g, 'const $1 = window.ReactRouterDOM;')
  // Replace relative imports with our importComponent function
  .replace(/import\\s+([\\w\\{\\}\\s,]+)\\s+from\\s+['"]\\.\\/([\\.\\w\\-\\/]+)['"];?/?/g, 'const $1 = importComponent("./$2");')
  .replace(/import\\s+([\\w\\{\\}\\s,]+)\\s+from\\s+['"]\\.\\.\\/([\\.\\w\\-\\/]+)['"];?/g, 'const $1 = importComponent("../$2");')
  // Handle imports from specific paths
  .replace(/import\\s+([\\w\\{\\}\\s,]+)\\s+from\\s+['"]([\\.\\w\\-\\/]+)['"];?/g, 'const $1 = importComponent("$2");')
  // Replace export statements
  .replace(/export\\s+default\\s+/g, 'const ComponentToExport = ')
  .replace(/export\\s+/g, '');
    
    // Transform JSX/TSX to JS
    const presets = ["react"];
    if (${isTypescript}) {
      presets.push("typescript");
    }
    
    const transpiled = Babel.transform(processedContent, {
      presets,
      filename: ${JSON.stringify(file.name)},
      sourceType: "script",
      retainLines: true,
    }).code;
    
    // Execute the transpiled code
    eval(transpiled);
    
    // Register the component
if (typeof ComponentToExport !== 'undefined') {
  // Register with multiple names for better resolution
  ${registerNames.map((name) => `window.__PLAYGROUND__.registerReactComponent(${JSON.stringify(name)}, ComponentToExport);`).join("\n      ")}
  
  // Register without extension
  const nameWithoutExt = ${JSON.stringify(fileName)};
  window.__PLAYGROUND__.registerReactComponent(nameWithoutExt, ComponentToExport);
  
  // Register with path variations
  const pathWithoutExt = ${JSON.stringify(`${filePath}/${fileName}`.replace(/^\//, "").replace(/\/\//g, "/"))};
  window.__PLAYGROUND__.registerReactComponent(pathWithoutExt, ComponentToExport);
  
  // If this is App.jsx or App.tsx, make it globally available
  if (${JSON.stringify(fileName)} === 'App') {
    window.App = ComponentToExport;
  }
}
  })();
} catch (error) {
  console.error("Error in ${file.name}:", error);
}
`
          } catch (error) {
            console.error(`Error processing JSX file ${file.name}:`, error)
            jsxContent += `\n// Error processing ${file.name}: ${error.message}\n`
          }
        }

        // Add code to automatically render the App component
        jsxContent += `
// Auto-render the App component if it exists
if (typeof window.App !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    const appContainer = document.getElementById('app');
    if (appContainer) {
      console.log('Rendering App component');
      const root = ReactDOM.createRoot(appContainer);
      root.render(React.createElement(window.App));
    }
  });
  
  // If DOMContentLoaded already fired, try to render immediately
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    const appContainer = document.getElementById('app');
    if (appContainer) {
      console.log('Rendering App component immediately');
      const root = ReactDOM.createRoot(appContainer);
      root.render(React.createElement(window.App));
    }
  }
}

// Setup React Router for SPA navigation
if (window.ReactRouterDOM) {
  // Create a base router configuration that excludes HTML routes
  window.__PLAYGROUND__.setupRouter = function() {
    // Create a simple router that can handle SPA navigation
    const { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } = window.ReactRouterDOM;
    
    // Register navigation function
    window.__PLAYGROUND__.navigate = function(path) {
      // Skip HTML navigation in React Router
      if (path && path.endsWith('.html')) {
        console.log('HTML navigation should be handled separately:', path);
        
        // Extract the page name
        const pageName = path.split('/').pop();
        
        // Notify parent about navigation
        window.parent.postMessage({
          source: 'playground-navigation',
          action: 'navigate',
          page: pageName
        }, '*');
        
        return;
      }
    
      // For SPA navigation, notify parent about the path change
      window.parent.postMessage({
        source: 'playground-navigation',
        action: 'navigate',
        path: path
      }, '*');
    
      if (window.__PLAYGROUND__.navigateFunction) {
        window.__PLAYGROUND__.navigateFunction(path);
      }
    };
    
    // Create a component to capture the navigate function
    window.__PLAYGROUND__.RouterSetup = function() {
      const navigate = useNavigate();
      const location = useLocation();
      
      React.useEffect(() => {
        window.__PLAYGROUND__.navigateFunction = navigate;
        
        // Check if current location is an HTML file and redirect
        if (location.pathname.endsWith('.html')) {
          console.log('Detected HTML path in React Router, redirecting to home');
          navigate('/');
        }
      }, [navigate, location]);
      
      return null;
    };
    
    // Create a wrapper for BrowserRouter that ignores HTML paths
    window.__PLAYGROUND__.CustomBrowserRouter = function(props) {
      return React.createElement(
        BrowserRouter,
        props,
        [
          React.createElement(window.__PLAYGROUND__.RouterSetup, { key: 'router-setup' }),
          props.children
        ]
      );
    };
    
    // Override the BrowserRouter component
    window.ReactRouterDOM.BrowserRouter = window.__PLAYGROUND__.CustomBrowserRouter;
    
    // Create a custom Link component that handles HTML navigation
    window.__PLAYGROUND__.CustomLink = function(props) {
      const { to, children, ...rest } = props;
      
      // If this is an HTML link, use our custom navigation
      if (typeof to === 'string' && to.endsWith('.html')) {
        return React.createElement('a', {
          href: to,
          onClick: function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Extract the page name
            const pageName = to.split('/').pop();
            
            // Notify parent about navigation
            window.parent.postMessage({
              source: 'playground-navigation',
              action: 'navigate',
              page: pageName
            }, '*');
            
            console.log('Navigating to HTML page:', pageName);
          },
          ...rest
        }, children);
      }
      
      // Otherwise, use React Router's Link
      return React.createElement(window.ReactRouterDOM.Link, { to, ...rest }, children);
    };
    
    // Override the Link component
    window.ReactRouterDOM.Link = window.__PLAYGROUND__.CustomLink;
  };
  
  // Call setup
  window.__PLAYGROUND__.setupRouter();
}
`
      }

      const sandboxHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Playground Preview - ${currentPreviewPage}</title>
  <style>
    /* Reset styles to prevent leakage from parent */
    html, body { margin: 0; padding: 0; }
    
    /* Injected CSS */
    ${cssContent}
  </style>
  
  <!-- Load React and Babel if JSX is used -->
  ${
    jsxFiles.length > 0
      ? `
  <script src="${CDN_LINKS.react}" crossorigin></script>
  <script src="${CDN_LINKS.reactDom}" crossorigin></script>
  <script src="${CDN_LINKS.babel}" crossorigin></script>
  <script src="${CDN_LINKS.reactRouter}" crossorigin></script>
  ${jsxFiles.some((f) => f.name.endsWith(".tsx")) ? `<script src="${CDN_LINKS.typescript}" crossorigin></script>` : ""}
  `
      : ""
  }
</head>
<body>
  <!-- Base HTML -->
  ${htmlContent.replace(/<html[^>]*>|<\/html>|<\/head[^>]*>|<\/head>|<body[^>]*>|<\/body>/gi, "")}

  <!-- Console interceptor - ISOLATED to only show playground messages -->
  <script>
  (function() {
      // Create a namespace for playground utilities to avoid conflicts with user code
      window.__PLAYGROUND__ = window.__PLAYGROUND__ || {};
      window.__PLAYGROUND__.console = {};
      window.__PLAYGROUND__.router = {};
      window.__PLAYGROUND__.modules = {};
      window.__PLAYGROUND__.errors = [];
      
      // Store original console methods
      const originalConsole = {
          log: console.log,
          error: console.error,
          warn: console.warn,
          info: console.info
      };
      
      // Create a playground-specific console namespace
      window.__PLAYGROUND__.console = {
          logs: [],
          log: function() {
              this.logs.push({ type: 'log', args: Array.from(arguments) });
              sendMessageToParent('log', arguments);
              originalConsole.log.apply(console, arguments);
          },
          error: function() {
              this.logs.push({ type: 'error', args: Array.from(arguments) });
              sendMessageToParent('error', arguments);
              originalConsole.error.apply(console, arguments);
          },
          warn: function() {
              this.logs.push({ type: 'warning', args: Array.from(arguments) });
              sendMessageToParent('warning', arguments);
              originalConsole.warn.apply(console, arguments);
          },
          info: function() {
              this.logs.push({ type: 'info', args: Array.from(arguments) });
              sendMessageToParent('info', arguments);
              originalConsole.info.apply(console, arguments);
          },
          clear: function() {
              this.logs = [];
              sendMessageToParent('clear', []);
              originalConsole.clear();
          }
      };
      
      // Override console methods to use our playground console
      console.log = function() { window.__PLAYGROUND__.console.log.apply(window.__PLAYGROUND__.console, arguments); };
      console.error = function() { window.__PLAYGROUND__.console.error.apply(window.__PLAYGROUND__.console, arguments); };
      console.warn = function() { window.__PLAYGROUND__.console.warn.apply(window.__PLAYGROUND__.console, arguments); };
      console.info = function() { window.__PLAYGROUND__.console.info.apply(window.__PLAYGROUND__.console, arguments); };
      console.clear = function() { window.__PLAYGROUND__.console.clear(); };
      
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
      
      // Handle errors
      window.onerror = function(message, filename, lineno, colno, error) {
          const errorDetails = {
              message,
              filename,
              lineno,
              colno,
              stack: error ? error.stack : null
          };
          
          window.__PLAYGROUND__.errors.push(errorDetails);
          
          sendMessageToParent('error', [message + ' (Line: ' + lineno + ', Col: ' + colno + ')'], errorDetails);
          return true; // Prevent default error handling
      };
      
      // Initialize app routing system
      window.__PLAYGROUND__.router = {
          navigate: function(path) {
              sendMessageToParent('info', ['Navigating to: ' + path]);
              // In a real implementation, this would change the view
              // For now, we'll just log the navigation
              console.log('Navigating to: ' + path);
              
              // Notify parent about navigation request
              window.parent.postMessage({
                  source: 'playground-navigation',
                  action: 'navigate',
                  path: path
              }, '*');
          },
          currentPath: '/',
          routes: {}
      };
      
      // Expose a simplified router for user code
      window.appRouter = window.__PLAYGROUND__.router;
      
      // Intercept link clicks to handle navigation between HTML pages
      document.addEventListener('click', function(e) {
        // Find closest anchor element
        let target = e.target;
        while (target && target.tagName !== 'A') {
          target = target.parentElement;
        }
        
        // If we found an anchor with href
        if (target && target.href) {
          const url = new URL(target.href);
          
          // Check if this is a relative link or same-origin link
          if (url.origin === window.location.origin) {
            // Check if this is an HTML file link
            if (url.pathname.endsWith('.html')) {
              e.preventDefault();
              e.stopPropagation();
              
              // Extract the page name from the URL
              const pageName = url.pathname.split('/').pop();
              
              // Notify parent about navigation
              window.parent.postMessage({
                source: 'playground-navigation',
                action: 'navigate',
                page: pageName
              }, '*');
              
              console.log('Navigating to HTML page:', pageName);
              return false;
            }
          }
        }
      }, true); // Use capture phase to intercept events early
  })();
  </script>

  <!-- Handle messages from parent -->
  <script>
  window.addEventListener('message', function(event) {
    if (event.data && event.data.source === 'playground-parent') {
      if (event.data.action === 'navigate' && event.data.path) {
        // If we have React Router set up, use it for navigation
        if (window.__PLAYGROUND__ && window.__PLAYGROUND__.navigate) {
          window.__PLAYGROUND__.navigate(event.data.path);
        }
      }
    }
  });
  </script>

  <!-- Module system for imports -->
  <script>
  (function() {
      // Simple module system
      window.__PLAYGROUND__.define = function(name, factory) {
          window.__PLAYGROUND__.modules[name] = { exports: {} };
          factory(window.__PLAYGROUND__.modules[name].exports);
      };
      
      window.__PLAYGROUND__.require = function(name) {
          if (!window.__PLAYGROUND__.modules[name]) {
              console.error('Module not found: ' + name);
              return {};
          }
          return window.__PLAYGROUND__.modules[name].exports;
      };
      
      // Expose simplified module system for user code
      window.define = window.__PLAYGROUND__.define;
      window.require = window.__PLAYGROUND__.require;
  })();
  </script>

  <!-- JavaScript execution -->
  <script>
  // Execute regular JavaScript with proper module wrapping
  ${jsFiles
    .map((file) => {
      const filePath = file.path === "/" ? file.name : `${file.path}/${file.name}`
      return `
    // Module: ${filePath}
    (function(exports) {
      try {
        ${file.content}
      } catch (error) {
        console.error('Error in ${filePath}:', error);
      }
    })(window.__PLAYGROUND__.modules['${filePath}'] = { exports: {} });
    `
    })
    .join("\n")}
  </script>

  <!-- Execute transpiled JSX -->
  <script>
  ${jsxContent}
  </script>

  <!-- Add a special handler for React Router links -->
  <script>
  // Add a special handler for React Router links
  if (window.ReactRouterDOM) {
    // Create a custom Link component that handles both React Router and HTML navigation
    window.__PLAYGROUND__.CustomLink = function(props) {
      const { to, children, ...rest } = props;
      
      // If this is an HTML link, use our custom navigation
      if (typeof to === 'string' && to.endsWith('.html')) {
        return React.createElement('a', {
          href: to,
          onClick: function(e) {
            e.preventDefault();
            // Extract the page name
            const pageName = to.split('/').pop();
            
            // Notify parent about navigation
            window.parent.postMessage({
              source: 'playground-navigation',
              action: 'navigate',
              page: pageName
            }, '*');
            
            console.log('Navigating to HTML page:', pageName);
          },
          ...rest
        }, children);
      }
      
      // Otherwise, use React Router's Link
      return React.createElement(window.ReactRouterDOM.Link, { to, ...rest }, children);
    };
    
    // Override the Link component
    const originalLink = window.ReactRouterDOM.Link;
    window.ReactRouterDOM.Link = window.__PLAYGROUND__.CustomLink;
  }
  </script>

  <!-- Special handler for HTML navigation -->
  <script>
  // Make sure all HTML links use relative paths
  document.addEventListener('DOMContentLoaded', function() {
    // Fix all links to use relative paths
    const links = document.querySelectorAll('a[href]');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.endsWith('.html') && !href.startsWith('./') && !href.startsWith('../')) {
        // Convert absolute paths to relative
        link.setAttribute('href', './' + href);
      }
    });
    
    // Fix all script tags to use relative paths
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src && !src.startsWith('./') && !src.startsWith('../') && !src.startsWith('http')) {
        // Convert absolute paths to relative
        script.setAttribute('src', './' + src);
      }
    });
  });
  </script>
</body>
</html>`

      if (iframeRef.current) {
        // Set sandbox attributes to prevent access to parent window
        iframeRef.current.setAttribute("sandbox", "allow-scripts allow-forms allow-same-origin")
        iframeRef.current.srcdoc = sandboxHtml

        // Only log if we're not in an auto-refresh cycle to prevent console spam
        if (!isAutoRefresh) {
          addConsoleLog(`Preview updated: ${currentPreviewPage}`, "success")
        }
      }
      return true
    } catch (error) {
      addConsoleLog(`Preview error: ${error.message}`, "error")
      return false
    }
  }, [files, currentPreviewPage, iframeRef, CDN_LINKS, addConsoleLog, isAutoRefresh, buildFilePathMap, deletedFiles])

  // Update preview when component mounts or when files/currentPreviewPage changes
  useEffect(() => {
    // Only generate preview if we have files and a current page
    if ((files.length > 0 || deletedFiles.length > 0) && currentPreviewPage) {
      generatePreview()
    }
    // Do NOT include generatePreview in the dependency array
  }, [files, currentPreviewPage, deletedFiles])

  // Track deleted files that might be needed for preview
  useEffect(() => {
    // When a file is removed from the files array, check if it's needed for preview
    const checkForDeletedFiles = () => {
      // Find files that were in the previous render but not in the current files array
      const currentFileIds = new Set(files.map((f) => f.id))

      // Add any newly deleted files to our deletedFiles state
      const newlyDeletedFiles = files.filter((f) => !currentFileIds.has(f.id))

      if (newlyDeletedFiles.length > 0) {
        setDeletedFiles((prev) => [...prev, ...newlyDeletedFiles])
      }
    }

    checkForDeletedFiles()
  }, [files])

  // Memoize the generatePreview function to prevent it from causing infinite loops
  const memoizedGeneratePreview = useCallback(() => {
    generatePreview()
  }, [files, currentPreviewPage, deletedFiles])

  // Handle auto-refresh
  useEffect(() => {
    let refreshInterval

    if (isAutoRefresh) {
      refreshInterval = setInterval(() => {
        memoizedGeneratePreview()
      }, 3000) // Refresh every 3 seconds
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [isAutoRefresh, memoizedGeneratePreview])

  return (
    <>
      {/* Preview Header */}
      <div className={styles.previewHeader}>
        <span className={styles.previewTitle}>Preview: {currentPreviewPage}</span>
        <div className={styles.previewActions}>
          {renderPreviewNavigation()}
          <button
            onClick={() => generatePreview()}
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

      {/* Preview Content */}
      <div className={`${styles.previewContent} ${isFullScreen ? styles.fullScreenContent : ""}`}>
        {previewError ? (
          <div className={styles.previewError}>
            <h3>Preview Error</h3>
            <pre>{previewError}</pre>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            title="preview"
            className={`${styles.previewFrame} ${isFullScreen ? styles.fullScreenFrame : ""}`}
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"
          />
        )}
      </div>

      {/* Preview URL Display */}
      {previewUrl && (
        <div className={styles.previewUrlContainer}>
          <input
            type="text"
            value={previewUrl}
            readOnly
            className={styles.previewUrlInput}
            onClick={(e) => e.target.select()}
          />
          <button className={styles.previewUrlButton} onClick={() => window.open(previewUrl, "_blank")}>
            Open in new tab
          </button>
        </div>
      )}
    </>
  )
}


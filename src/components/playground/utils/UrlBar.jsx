"use client"

import { useState, useEffect } from "react"
import { RefreshCw } from "lucide-react"
import styles from "./url-bar.module.css"

export default function UrlBar({ currentPage, onRefresh, isSpa = false, spaPath = "/" }) {
  const [url, setUrl] = useState("")

  useEffect(() => {
    if (isSpa) {
      setUrl(`${spaPath}`)
    } else {
      setUrl(`${currentPage}`)
    }
  }, [currentPage, isSpa, spaPath])

  // Split URL into protocol, host, and path for styling
  const formatUrl = (url) => {
    try {
      const urlObj = new URL(url)
      return {
        protocol: `${urlObj.protocol}//`,
        host: urlObj.host,
        path: urlObj.pathname,
      }
    } catch (e) {
      return {
        protocol: "",
        host: "",
        path: `/${currentPage}`,
      }
    }
  }

  const { protocol, host, path } = formatUrl(url)

  return (
    <div className={styles.urlBarContainer}>
      <div className={styles.urlBar}>
        <span>
          <span className={styles.urlProtocol}>{protocol}</span>
          <span className={styles.urlHost}>{host}</span>
          <span className={styles.urlPath}>{path}</span>
        </span>
      </div>
      <button className={styles.refreshButton} onClick={onRefresh} title="Refresh preview">
        <RefreshCw size={14} />
      </button>
    </div>
  )
}


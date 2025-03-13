"use client"

import React, { useState } from "react"

const DataTable = ({ datasetId }) => {
  // Mock data - in a real app, this would come from an API
  const [data] = useState(() => {
    // Generate mock data based on datasetId
    const columns = [
      { id: "id", name: "ID" },
      { id: "name", name: "Name" },
      { id: "category", name: "Category" },
      { id: "value", name: "Value" },
      { id: "date", name: "Date" },
    ]

    const rows = Array.from({ length: 10 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Item ${i + 1}`,
      category: ["Electronics", "Clothing", "Food", "Services"][i % 4],
      value: `$${Math.floor(Math.random() * 1000)}`,
      date: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toLocaleDateString(),
    }))

    return { columns, rows }
  })

  // State for sorting
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  })

  // State for search
  const [searchTerm, setSearchTerm] = useState("")

  // Handle sorting
  const requestSort = (key) => {
    let direction = "ascending"
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  // Sort and filter data
  const sortedAndFilteredData = React.useMemo(() => {
    let sortableItems = [...data.rows]

    // Filter by search term
    if (searchTerm) {
      sortableItems = sortableItems.filter((item) =>
        Object.values(item).some((val) => val.toString().toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    // Sort if needed
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1
        }
        return 0
      })
    }

    return sortableItems
  }, [data.rows, sortConfig, searchTerm])

  return (
    <div className="db-data-table-container">
      <div className="db-data-table-toolbar">
        <div className="db-search-container">
          <span className="db-search-icon">🔍</span>
          <input
            className="db-search-input"
            placeholder="Search data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="db-table-actions">
          <button className="db-table-action-btn">
            <span className="db-icon">🔍</span>
            Filter
          </button>
          <button className="db-table-action-btn">
            <span className="db-icon">⬇️</span>
            Export
          </button>
        </div>
      </div>

      <div className="db-table-wrapper">
        <table className="db-data-table">
          <thead>
            <tr>
              {data.columns.map((column) => (
                <th
                  key={column.id}
                  className={`db-table-header ${sortConfig.key === column.id ? `db-sorted-${sortConfig.direction}` : ""}`}
                  onClick={() => requestSort(column.id)}
                >
                  {column.name}
                  {sortConfig.key === column.id && (
                    <span className="db-sort-indicator">{sortConfig.direction === "ascending" ? " ▲" : " ▼"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredData.map((row) => (
              <tr key={row.id} className="db-table-row">
                {data.columns.map((column) => (
                  <td key={`${row.id}-${column.id}`} className="db-table-cell">
                    {row[column.id]}
                  </td>
                ))}
              </tr>
            ))}
            {sortedAndFilteredData.length === 0 && (
              <tr>
                <td colSpan={data.columns.length} className="db-table-empty">
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DataTable


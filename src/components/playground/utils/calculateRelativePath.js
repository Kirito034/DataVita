/**
 * Calculate the relative path from one directory to a target file
 * @param {string} fromDir - The source directory path
 * @param {object} toFile - The target file object with path and name properties
 * @returns {string} The relative path to the target file
 */
export function calculateRelativePath(fromDir, toFile) {
    // Skip if toFile is a folder
    if (toFile.type === "folder") return ""
  
    // Normalize paths
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
  
  
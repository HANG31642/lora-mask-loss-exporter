var LoRAMaskLoss = window.LoRAMaskLoss || {}
var fs = require('fs')
var path = require('path')

function FileBrowser() {}

FileBrowser.prototype.getSubfolders = function (dirPath) {
  return new Promise(function (resolve, reject) {
    try {
      var items = fs.readdirSync(dirPath, { withFileTypes: true })
      var folders = items.filter(function (f) { return f.isDirectory() })
        .map(function (f) { return { name: f.name, path: path.join(dirPath, f.name) } })
        .sort(function (a, b) { return a.name.localeCompare(b.name) })
      resolve(folders)
    } catch (e) { reject(e) }
  })
}

FileBrowser.prototype.scan = function (dirPath, filter, sortBy, sortOrder) {
  return new Promise(function (resolve, reject) {
    try {
      var items = fs.readdirSync(dirPath, { withFileTypes: true })
      var files = items.filter(function (f) {
        if (f.isDirectory()) return false
        var ext = path.extname(f.name).toLowerCase().replace('.', '')
        if (filter === 'all') return true
        return ext === filter
      }).map(function (f) {
        var p = path.join(dirPath, f.name)
        var stat = fs.statSync(p)
        return { name: f.name, path: p, size: stat.size, mtime: stat.mtimeMs, isDir: false }
      })
      files.sort(function (a, b) {
        var cmp = 0
        if (sortBy === 'name') cmp = a.name.localeCompare(b.name)
        else if (sortBy === 'modified') cmp = a.mtime - b.mtime
        else if (sortBy === 'size') cmp = a.size - b.size
        else if (sortBy === 'type') cmp = path.extname(a.name).localeCompare(path.extname(b.name))
        return sortOrder === 'desc' ? -cmp : cmp
      })
      var stats = { total: files.length, totalSize: files.reduce(function (s, f) { return s + f.size }, 0) }
      resolve({ files: files, stats: stats })
    } catch (e) { reject(e) }
  })
}

FileBrowser.prototype.formatSize = function (bytes) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB'
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return bytes + ' B'
}

LoRAMaskLoss.FileBrowser = new FileBrowser()

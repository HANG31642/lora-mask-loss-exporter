var cfg = LoRAMaskLoss.Config
var fb = LoRAMaskLoss.FileBrowser
var thumb = LoRAMaskLoss.ThumbnailManager
var exp = LoRAMaskLoss.ExportManager

var treeRoot = null
var treeNodes = {}
var selectedNodeId = ''
var currentFiles = []
var currentFolderPath = ''
var selectedFilePath = ''
var sortAscending = true
var outputFolderPath = ''

document.addEventListener('DOMContentLoaded', async function () {
  await loadConfig()
  setupEvents()
})

async function loadConfig() {
  document.getElementById('outputPathInput').value = (await cfg.get('lastOutputPath')) || ''
  document.getElementById('scalePercent').value = (await cfg.get('scalePercent')) || 100
  document.getElementById('autoBinarizeCheck').checked = (await cfg.get('autoBinarize')) || false
  document.getElementById('sortSelect').value = (await cfg.get('sortBy')) || 'name'
  var sm = (await cfg.get('sizeMode')) || 'original'
  document.getElementById('sizeModeSelect').value = sm
  updateSizeOpts(sm)
  var lm = (await cfg.get('lastMode')) || 'alpha'
  setMode(lm)
  var ts = (await cfg.get('thumbSize')) || 120
  document.getElementById('thumbSizeSlider').value = ts
  document.getElementById('thumbSizeLabel').textContent = ts + 'px'
}

function setupEvents() {
  document.getElementById('browseBtn').addEventListener('click', browseFolder)
  document.getElementById('refreshBtn').addEventListener('click', function () { reloadFolder() })
  document.getElementById('filterSelect').addEventListener('change', function () { reloadFolder() })
  document.getElementById('sortSelect').addEventListener('change', function (e) {
    cfg.set('sortBy', e.target.value)
    reloadFolder()
  })
  document.getElementById('sortOrderBtn').addEventListener('click', function () {
    sortAscending = !sortAscending
    document.getElementById('sortOrderBtn').textContent = sortAscending ? '\u2191' : '\u2193'
    reloadFolder()
  })
  document.getElementById('resetStatusBtn').addEventListener('click', async function () {
    await cfg.clearImageStatus()
    reloadFolder()
    showToast('状态已重置')
  })
  document.getElementById('openInPSBtn').addEventListener('click', openInPS)
  document.getElementById('sizeModeSelect').addEventListener('change', function (e) { updateSizeOpts(e.target.value) })
  document.getElementById('scalePercent').addEventListener('change', function (e) { cfg.set('scalePercent', parseInt(e.target.value) || 100) })
  document.getElementById('longestSideSelect').addEventListener('change', function (e) {
    var v = e.target.value
    var custom = document.getElementById('customLongestSide')
    custom.style.display = v === '0' ? 'inline-block' : 'none'
    cfg.set('longestSide', v === '0' ? parseInt(custom.value) || 1024 : parseInt(v))
  })
  document.getElementById('customLongestSide').addEventListener('change', function (e) {
    cfg.set('longestSide', parseInt(e.target.value) || 1024)
  })
  document.getElementById('autoBinarizeCheck').addEventListener('change', function (e) { cfg.set('autoBinarize', e.target.checked) })
  document.getElementById('outputBrowseBtn').addEventListener('click', browseOutput)
  document.getElementById('modeAlpha').addEventListener('click', function () { setMode('alpha') })
  document.getElementById('modeBW').addEventListener('click', function () { setMode('bw') })
  document.getElementById('thumbSizeSlider').addEventListener('input', function (e) {
    document.getElementById('thumbSizeLabel').textContent = e.target.value + 'px'
    applyThumbSize()
  })
  document.getElementById('thumbSizeSlider').addEventListener('change', function (e) {
    cfg.set('thumbSize', parseInt(e.target.value))
  })
  document.getElementById('exportBtn').addEventListener('click', handleExport)
  document.getElementById('clearLogBtn').addEventListener('click', function () { document.getElementById('logOutput').innerHTML = '' })
  document.getElementById('logHeader').addEventListener('click', toggleLog)
  // Grid resize
  window.addEventListener('resize', function () { applyThumbSize() })
  new ResizeObserver(function () { applyThumbSize() }).observe(document.getElementById('thumbnailGrid'))
}

// ── 目录树 ──

async function browseFolder() {
  try {
    var dir = await selectDirectory()
    if (dir) {
      showToast('加载目录...')
      await initTree(dir)
    }
  } catch (e) { log('error', '选择目录失败: ' + e.message) }
}

function selectDirectory() {
  return LoRAMaskLoss.PSBridge.selectFolder().then(function (result) {
    return result || null
  }).catch(function () { return null })
}

async function initTree(dirPath) {
  treeNodes = {}
  treeRoot = {
    id: dirPath, path: dirPath,
    name: dirPath.split('\\').pop() || dirPath.split('/').pop() || dirPath,
    expanded: true, children: null, loading: false, depth: 0
  }
  treeNodes[treeRoot.id] = treeRoot
  await loadChildren(treeRoot)
  selectedNodeId = treeRoot.id
  renderTree()
  navigateToNode(treeRoot)
}

async function loadChildren(node) {
  if (node.children !== null) return
  node.loading = true; renderTree()
  try {
    var subs = await fb.getSubfolders(node.path)
    node.children = subs.map(function (f) {
      var child = { id: f.path, path: f.path, name: f.name, expanded: false, children: null, loading: false, depth: node.depth + 1 }
      treeNodes[child.id] = child
      return child
    })
  } catch (e) { node.children = [] }
  node.loading = false; renderTree()
}

function toggleNode(id) {
  var node = treeNodes[id]
  if (!node) return
  if (node.expanded) { node.expanded = false; renderTree() }
  else { node.expanded = true; loadChildren(node).then(function () { renderTree() }) }
}

function selectNode(id) {
  var node = treeNodes[id]
  if (!node) { log('error', '节点不存在'); return }
  selectedNodeId = id; renderTree(); navigateToNode(node)
}

function navigateToNode(node) {
  currentFolderPath = node.path; selectedFilePath = ''
  document.getElementById('openInPSBtn').disabled = true; reloadFolder()
}

function renderTree() {
  var el = document.getElementById('treeContainer')
  if (!treeRoot) { el.innerHTML = '<div class="empty-tree">请选择一个目录</div>'; return }
  el.innerHTML = renderNode(treeRoot)
}

function renderNode(node) {
  var isLeaf = node.children !== null && node.children.length === 0
  var isActive = node.id === selectedNodeId
  var html = '<div class="tree-node' + (isActive ? ' active' : '') + '" data-id="' + esc(node.id) + '" style="padding-left:' + (4 + node.depth * 16) + 'px">'
  if (node.loading) html += '<span class="tree-toggle">⏳</span>'
  else if (isLeaf) html += '<span class="tree-toggle" style="visibility:hidden">▶</span>'
  else html += '<span class="tree-toggle" data-action="toggle">' + (node.expanded ? '▼' : '▶') + '</span>'
  html += '<span class="tree-icon">📁</span>'
  html += '<span class="tree-label" data-action="select">' + esc(node.name) + '</span></div>'
  if (node.expanded && node.children) {
    for (var i = 0; i < node.children.length; i++) html += renderNode(node.children[i])
  }
  return html
}

document.getElementById('treeContainer').addEventListener('click', function (e) {
  var target = e.target
  var nodeEl = target.closest('.tree-node')
  if (!nodeEl) return
  var id = nodeEl.dataset.id
  if (target.dataset.action === 'toggle') { toggleNode(id); return }
  selectNode(id)
})

// ── 文件浏览 ──

function applyThumbSize() {
  var grid = document.getElementById('thumbnailGrid')
  if (!grid || !grid.clientWidth) return
  var thumbSize = parseInt(document.getElementById('thumbSizeSlider').value) || 120
  var gap = 4; var pad = 8
  var available = grid.clientWidth - pad
  var cols = Math.max(1, Math.floor((available + gap) / (thumbSize + gap)))
  var actual = Math.floor((available - (cols - 1) * gap) / cols)
  document.getElementById('thumbSizeLabel').textContent = actual + 'px'
  grid.querySelectorAll('.thumb-cell').forEach(function (cell) {
    cell.style.width = actual + 'px'
  })
  grid.querySelectorAll('.thumb-wrap').forEach(function (wrap) {
    wrap.style.width = actual + 'px'
    wrap.style.height = actual + 'px'
  })
}

function reloadFolder() { if (currentFolderPath) loadFolder(currentFolderPath) }

async function loadFolder(dirPath) {
  try {
    if (!dirPath) { renderEmpty(); return }
    currentFolderPath = dirPath
    var filter = document.getElementById('filterSelect').value
    var sortBy = document.getElementById('sortSelect').value
    var result = await fb.scan(dirPath, filter, sortBy, sortAscending ? 'asc' : 'desc')
    currentFiles = result.files
    log('info', '扫描 "' + (dirPath.split('\\').pop() || dirPath) + '": ' + result.files.length + ' 个文件')
    renderGrid()
    updateInfo(null)
  } catch (e) { log('error', '加载失败: ' + e.message); renderEmpty('加载失败') }
}

function renderEmpty(msg) {
  document.getElementById('thumbnailGrid').innerHTML =
    '<div class="empty-state"><div>' + esc(msg || '未选择文件夹') + '</div></div>'
}

function renderGrid() {
  var grid = document.getElementById('thumbnailGrid')
  if (currentFiles.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div>没有找到图片文件</div></div>'
    return
  }
  var html = ''
  for (var i = 0; i < currentFiles.length; i++) {
    var f = currentFiles[i]
    html += '<div class="thumb-cell" data-path="' + esc(f.path) + '" data-name="' + esc(f.name) + '" data-idx="' + i + '">'
    html += '<div class="thumb-wrap"><img class="thumb-img" data-idx="' + i + '" data-path="' + esc(f.path) + '" alt="">'
    html += '<div class="thumb-badge" data-idx="' + i + '"></div></div>'
    html += '<div class="thumb-name">' + esc(f.name) + '</div></div>'
  }
  grid.innerHTML = html
  grid.querySelectorAll('.thumb-cell').forEach(function (cell) {
    cell.addEventListener('click', function () { selectFile(cell) })
    cell.addEventListener('dblclick', function () { openPS(cell.dataset.path) })
  })
  loadThumbnails()
  loadBadges()
  setTimeout(function () { applyThumbSize() }, 20)
}

function loadThumbnails() {
  var idx = 0
  function next() {
    var end = Math.min(idx + 5, currentFiles.length)
    for (var i = idx; i < end; i++) loadThumb(i)
    idx = end
    if (idx < currentFiles.length) setTimeout(next, 50)
  }
  next()
}

async function loadThumb(i) {
  var file = currentFiles[i]
  if (!file) return
  var img = document.querySelector('.thumb-img[data-idx="' + i + '"]')
  if (!img) return
  try {
    var url = await thumb.getThumbnailUrl(file.path)
    if (url) {
      img.src = url + '?t=' + (file.mtime || Date.now())
      img.onerror = function () {
        img.style.display = 'none'
        var wrap = img.parentElement
        if (wrap) wrap.innerHTML = '<span style="font-size:32px;color:#666">&#x1F5BC;</span>'
      }
    }
  } catch (e) { img.alt = '!' }
}

async function loadBadges() {
  for (var i = 0; i < currentFiles.length; i++) {
    var f = currentFiles[i]
    var status = await cfg.getImageStatus(f.path)
    if (!status) continue
    var badge = document.querySelector('.thumb-badge[data-idx="' + i + '"]')
    if (badge) badge.textContent = status === 'done' ? '✔' : (status === 'error' ? '⚠' : '')
  }
}

// ── 选择 / 信息 ──

function selectFile(cell) {
  document.querySelectorAll('.thumb-cell.selected').forEach(function (e) { e.classList.remove('selected') })
  cell.classList.add('selected')
  selectedFilePath = cell.dataset.path
  var file = currentFiles.find(function (f) { return f.path === selectedFilePath })
  updateInfo(file)
  document.getElementById('openInPSBtn').disabled = !file
}

function updateInfo(file) {
  var text = document.getElementById('infoText')
  if (file) text.textContent = file.name + ' | ' + (file.size ? fb.formatSize(file.size) : '')
  else text.textContent = currentFiles.length + ' 个图片文件'
}

// ── 在 PS 中打开 ──

function openInPS() { if (selectedFilePath) openPS(selectedFilePath) }

async function openPS(filePath) {
  try {
    log('info', '正在打开: ' + filePath.split('\\').pop())
    var result = await LoRAMaskLoss.PSBridge.openFile(filePath)
    log('success', '已打开 ' + filePath.split('\\').pop())
  } catch (e) { log('error', '打开失败: ' + e.message) }
}

// ── 模式 / 尺寸选项 ──

function setMode(m) {
  document.getElementById('modeAlpha').classList.toggle('active', m === 'alpha')
  document.getElementById('modeBW').classList.toggle('active', m === 'bw')
  cfg.set('lastMode', m)
}

function updateSizeOpts(mode) {
  document.getElementById('scaleOpt').style.display = mode === 'scale' ? 'flex' : 'none'
  document.getElementById('fixedOpt').style.display = mode === 'fixed' ? 'flex' : 'none'
  cfg.set('sizeMode', mode)
  if (mode === 'fixed') {
    cfg.get('longestSide').then(function (v) {
      var sel = document.getElementById('longestSideSelect')
      var vals = [256, 512, 768, 1024, 1536, 2048, 3072, 4096]
      if (v && vals.indexOf(v) >= 0) { sel.value = String(v); document.getElementById('customLongestSide').style.display = 'none' }
      else { sel.value = '0'; document.getElementById('customLongestSide').style.display = 'inline-block'; if (v) document.getElementById('customLongestSide').value = v }
    })
  }
}

// ── 输出路径 ──

async function browseOutput() {
  var dir = await selectDirectory()
  if (dir) {
    outputFolderPath = dir
    document.getElementById('outputPathInput').value = dir
    await cfg.set('lastOutputPath', dir)
  }
}

// ── 导出 ──

async function handleExport() {
  var outPath = document.getElementById('outputPathInput').value
  if (!outPath) { showToast('请先选择输出目录'); return }
  var mode = document.getElementById('modeAlpha').classList.contains('active') ? 'alpha' : 'bw'
  // Construct subdirectory paths: source/ + alpha/ or mask/
  var parentDir = outPath.replace(/[\\/]$/, '')
  var subDir = mode === 'alpha' ? 'alpha' : 'mask'
  var sourcePath = parentDir + '\\source'
  var maskPath = parentDir + '\\' + subDir
  var btn = document.getElementById('exportBtn')
  btn.disabled = true; btn.textContent = '⏳ 导出中...'
  try {
    var sizeMode = document.getElementById('sizeModeSelect').value
    var longestSide = parseInt(document.getElementById('longestSideSelect').value) || 1024
    if (longestSide === 0) longestSide = parseInt(document.getElementById('customLongestSide').value) || 1024
    var params = {
      mode: mode, outputPath: maskPath,
      sizeMode: sizeMode,
      scalePercent: parseInt(document.getElementById('scalePercent').value) || 100,
      longestSide: longestSide,
      autoBinarize: document.getElementById('autoBinarizeCheck').checked
    }
    // Export source image first (same size, no mask)
    var sourceParams = { outputPath: sourcePath, sizeMode: params.sizeMode, scalePercent: params.scalePercent, longestSide: params.longestSide }
    try { await LoRAMaskLoss.PSBridge.exportSource(sourceParams) } catch (e) { log('warning', 'source导出失败: ' + e.message) }
    // Export mask
    var result = await exp.exportCurrent(params)
    clearLog()
    if (result.logs) { for (var i = 0; i < result.logs.length; i++) log(result.logs[i].type, result.logs[i].text) }
    if (result.success) {
      showToast('导出成功!')
      var docInfo = await LoRAMaskLoss.PSBridge.getDocInfo()
      if (docInfo && docInfo.name) {
        for (var j = 0; j < currentFiles.length; j++) {
          if (currentFiles[j].name.toLowerCase() === docInfo.name.toLowerCase()) {
            await cfg.setImageStatus(currentFiles[j].path, 'done')
            loadBadges(); break
          }
        }
      }
    } else { showToast('导出失败 - 请查看日志') }
  } catch (e) { log('error', '导出错误: ' + e.message); showToast('导出错误') }
  finally { btn.disabled = false; btn.textContent = '📤 导出当前' }
}

// ── 日志 / Toast ──

function log(type, msg) {
  var out = document.getElementById('logOutput')
  var entry = document.createElement('div')
  entry.className = 'log-entry log-' + type
  entry.textContent = new Date().toLocaleTimeString() + ' ' + msg
  out.appendChild(entry)
  out.scrollTop = out.scrollHeight
}

function clearLog() { document.getElementById('logOutput').innerHTML = '' }

function toggleLog() {
  var body = document.getElementById('logBody')
  var toggle = document.getElementById('logToggle')
  var isHidden = body.style.display === 'none'
  body.style.display = isHidden ? 'block' : 'none'
  toggle.textContent = isHidden ? '▼' : '▶'
}

function showToast(msg) {
  var toast = document.getElementById('toast')
  toast.textContent = msg; toast.classList.remove('hidden')
  clearTimeout(toast._hideTimer)
  toast._hideTimer = setTimeout(function () { toast.classList.add('hidden') }, 3000)
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

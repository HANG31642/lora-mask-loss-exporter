var LoRAMaskLoss = window.LoRAMaskLoss || {}

function PSBridge() {}

PSBridge.prototype._call = function (script) {
  return new Promise(function (resolve, reject) {
    LoRAMaskLoss.evalScript(script, function (err, result) {
      if (err) { reject(new Error(err)); return }
      if (typeof result === 'string' && result.indexOf('EvalScript error') >= 0) {
        reject(new Error('ExtendScript: ' + result))
        return
      }
      try {
        var parsed = JSON.parse(result)
        if (parsed.error) reject(new Error(parsed.error))
        else if ('result' in parsed) resolve(parsed.result)
        else resolve(parsed)
      } catch (e) { resolve(result) }
    })
  })
}

PSBridge.prototype.selectFolder = function () {
  return this._call('selectFolder()')
}

PSBridge.prototype.openFile = function (filePath) {
  return this._call('openFile("' + escJS(filePath) + '")')
}

PSBridge.prototype.getDocInfo = function () {
  return this._call('getDocInfo()')
}

PSBridge.prototype.exportAlphaMask = function (params) {
  return this._call('exportAlphaMask("' + escJS(params.outputPath) + '","' + escJS(params.sizeMode) + '",' + (params.scalePercent||100) + ',' + (params.longestSide||1024) + ',' + (params.autoBinarize?'true':'false') + ')')
}

PSBridge.prototype.exportBWMask = function (params) {
  return this._call('exportBWMask("' + escJS(params.outputPath) + '","' + escJS(params.sizeMode) + '",' + (params.scalePercent||100) + ',' + (params.longestSide||1024) + ',' + (params.autoBinarize?'true':'false') + ')')
}

PSBridge.prototype.exportSource = function (params) {
  return this._call('exportSource("' + escJS(params.outputPath) + '","' + escJS(params.sizeMode) + '",' + (params.scalePercent||100) + ',' + (params.longestSide||1024) + ')')
}

PSBridge.prototype.getLayers = function () {
  return this._call('getLayers()')
}

PSBridge.prototype.generateThumbnail = function (filePath, maxW, maxH) {
  return this._call('generateThumbnail("' + escJS(filePath) + '",' + (maxW||256) + ',' + (maxH||256) + ')')
}

function escJS(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')
}

LoRAMaskLoss.PSBridge = new PSBridge()

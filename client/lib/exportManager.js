var LoRAMaskLoss = window.LoRAMaskLoss || {}

function ExportManager() {}

ExportManager.prototype.exportCurrent = function (params) {
  var self = this
  var logs = []
  function addLog(type, text) { logs.push({ type: type, text: text }) }

  return LoRAMaskLoss.PSBridge.getDocInfo()
    .then(function (docInfo) {
      addLog('info', 'getDocInfo 返回值: ' + JSON.stringify(docInfo))
      if (!docInfo || !docInfo.name) throw new Error('没有打开的文档 (getDocInfo返回空)')
      addLog('info', '文档: ' + docInfo.name)
      addLog('info', '尺寸: ' + docInfo.width + 'x' + docInfo.height)
      var exportFn = params.mode === 'alpha' ? LoRAMaskLoss.PSBridge.exportAlphaMask : LoRAMaskLoss.PSBridge.exportBWMask
      return exportFn.call(LoRAMaskLoss.PSBridge, params).then(function (result) {
        addLog('success', '导出成功: ' + (result || ''))
        return { success: true, logs: logs }
      })
    })
    .catch(function (err) {
      addLog('error', '导出失败: ' + err.message)
      return { success: false, logs: logs }
    })
}

LoRAMaskLoss.ExportManager = new ExportManager()

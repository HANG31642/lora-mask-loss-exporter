var LoRAMaskLoss = window.LoRAMaskLoss || {}

LoRAMaskLoss.CSEP = function () {
  var _cep = window.__adobe_cep__
  if (!_cep) {
    console.error('no __adobe_cep__')
    return null
  }
  return _cep
}

LoRAMaskLoss.getHostEnvironment = function () {
  var cep = LoRAMaskLoss.CSEP()
  return cep ? cep.getHostEnvironment() : null
}

LoRAMaskLoss.evalScript = function (script, cb) {
  var cep = LoRAMaskLoss.CSEP()
  if (!cep) { cb('no cep', null); return }
  cep.evalScript(script, function (r) { cb(null, r) })
}

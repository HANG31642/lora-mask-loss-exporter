var LoRAMaskLoss = window.LoRAMaskLoss || {}

function ThumbnailManager() {}

ThumbnailManager.prototype.getThumbnailUrl = function (filePath) {
  return Promise.resolve('file:///' + filePath.replace(/\\/g, '/'))
}

LoRAMaskLoss.ThumbnailManager = new ThumbnailManager()

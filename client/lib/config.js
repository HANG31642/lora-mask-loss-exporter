var LoRAMaskLoss = window.LoRAMaskLoss || {}
var fs = require('fs')
var path = require('path')

var SETTINGS_FILE = process.env.APPDATA + '\\LoRAMaskLossExporter\\settings.json'
var _cache = null

function _load() {
  if (_cache) return _cache
  try {
    var dir = path.dirname(SETTINGS_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    var raw = fs.readFileSync(SETTINGS_FILE, 'utf-8')
    _cache = JSON.parse(raw)
  } catch (e) { _cache = {} }
  return _cache
}

function _save() {
  try {
    var dir = path.dirname(SETTINGS_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(_cache, null, 2), 'utf-8')
  } catch (e) { console.error('config save error', e) }
}

function Config() {}

Config.prototype.get = function (key) {
  var cfg = _load()
  return Promise.resolve(cfg[key] !== undefined ? cfg[key] : null)
}

Config.prototype.set = function (key, val) {
  var cfg = _load()
  cfg[key] = val; _cache = cfg; _save()
  return Promise.resolve()
}

Config.prototype.getAll = function () {
  return Promise.resolve(JSON.parse(JSON.stringify(_load())))
}

Config.prototype.getImageStatus = function (filePath) {
  var cfg = _load()
  var imageStatus = cfg._imageStatus || {}
  return Promise.resolve(imageStatus[filePath] || null)
}

Config.prototype.setImageStatus = function (filePath, status) {
  var cfg = _load()
  if (!cfg._imageStatus) cfg._imageStatus = {}
  cfg._imageStatus[filePath] = status; _cache = cfg; _save()
  return Promise.resolve()
}

Config.prototype.clearImageStatus = function () {
  var cfg = _load()
  delete cfg._imageStatus; _cache = cfg; _save()
  return Promise.resolve()
}

Config.prototype.setMultiple = function (pairs) {
  var cfg = _load()
  for (var k in pairs) { if (pairs.hasOwnProperty(k)) cfg[k] = pairs[k] }
  _cache = cfg; _save()
  return Promise.resolve()
}

LoRAMaskLoss.Config = new Config()

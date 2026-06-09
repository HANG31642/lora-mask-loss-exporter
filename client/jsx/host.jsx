function selectFolder() {
  var f = Folder.selectDialog('Please select a folder');
  return f ? f.fsName : ''
}

function openFile(p) {
  var doc = app.open(File(p));
  return doc ? doc.name : ''
}

function getDocInfo() {
  try {
    var doc = app.activeDocument;
    if (!doc) return '{"result":""}';
    return '{"result":{"name":"' + doc.name.replace(/"/g,'\\"') + '","width":' + doc.width.value + ',"height":' + doc.height.value + ',"resolution":' + doc.resolution + '}}';
  } catch (e) {
    return '{"error":"' + e.toString().replace(/"/g,'\\"') + '"}';
  }
}

function getLayers() {
  try {
    var doc = app.activeDocument;
    if (!doc) return '[]';
    var a = [];
    for (var i = 0; i < doc.layers.length; i++) {
      a.push('{"name":"' + doc.layers[i].name.replace(/"/g,'\\"') + '","visible":' + doc.layers[i].visible + '}');
    }
    return '[' + a.join(',') + ']';
  } catch (e) {
    return '[]';
  }
}

function exportAlphaMask(outPath, sizeMode, scalePct, longestSide, autoBin) {
  try {
    var doc = app.activeDocument;
    if (!doc) return '{"error":"No active document"}';
    if (!doc.selection) return '{"error":"No selection in document"}';
    // Save selection to channel for later restore
    var selCh = doc.channels.add();
    doc.selection.store(selCh);
    // Duplicate document
    var dup = doc.duplicate();
    // Switch back to remove temp channel from original doc
    app.activeDocument = doc;
    selCh.remove();
    app.activeDocument = dup;
    var savedCh = dup.channels[dup.channels.length - 1];
    // Apply size
    applySize(dup, sizeMode, scalePct, longestSide);
    // Flatten → stamp visible to get a regular layer (not background)
    dup.flatten();
    dup.selection.selectAll();
    dup.selection.copy();
    dup.paste();
    if (dup.artLayers.length > 1) dup.artLayers[dup.artLayers.length - 1].remove();
    // Restore selection, invert, clear outside → transparent
    dup.selection.load(savedCh, SelectionType.REPLACE);
    savedCh.remove();
    dup.selection.invert();
    dup.selection.clear();
    // Save with same basename as source
    var nm = doc.name.replace(/\.[^\.]+$/, '');
    var outFolder = new Folder(outPath);
    if (!outFolder.exists) outFolder.create();
    var f = File(outPath + '/' + nm + '.png');
    var opts = new PNGSaveOptions(); opts.compression = 6;
    dup.saveAs(f, opts, true, Extension.LOWERCASE);
    dup.close(SaveOptions.DONOTSAVECHANGES);
    return '{"result":"' + f.fsName.replace(/\\/g,'\\\\') + '"}';
  } catch (e) {
    return '{"error":"' + e.toString().replace(/"/g,'\\"') + '"}';
  }
}

function exportBWMask(outPath, sizeMode, scalePct, longestSide, autoBin) {
  try {
    var doc = app.activeDocument;
    if (!doc) return '{"error":"No active document"}';
    if (!doc.selection) return '{"error":"No selection in document"}';
    // Save selection to channel for later restore
    var selCh = doc.channels.add();
    doc.selection.store(selCh);
    // Duplicate document
    var dup = doc.duplicate();
    // Switch back to remove temp channel from original doc
    app.activeDocument = doc;
    selCh.remove();
    app.activeDocument = dup;
    var savedCh = dup.channels[dup.channels.length - 1];
    // Apply size
    applySize(dup, sizeMode, scalePct, longestSide);
    // Create mask layer, fill all black, then fill selection white
    var black = new SolidColor();
    black.rgb.red = 0; black.rgb.green = 0; black.rgb.blue = 0;
    var white = new SolidColor();
    white.rgb.red = 255; white.rgb.green = 255; white.rgb.blue = 255;
    var maskLayer = dup.artLayers.add();
    dup.selection.selectAll();
    dup.selection.fill(black);
    dup.selection.load(savedCh, SelectionType.REPLACE);
    savedCh.remove();
    dup.selection.fill(white);
    // Remove all layers except the mask layer
    while (dup.artLayers.length > 1) { dup.artLayers[dup.artLayers.length - 1].remove(); }
    // Optional binarization
    if (autoBin) { dup.flatten(); dup.changeMode(ChangeMode.GRAYSCALE); dup.binarize(128); dup.changeMode(ChangeMode.RGB); }
    // Save with same basename as source
    var nm = doc.name.replace(/\.[^\.]+$/, '');
    var outFolder = new Folder(outPath);
    if (!outFolder.exists) outFolder.create();
    var f = File(outPath + '/' + nm + '.png');
    var opts = new PNGSaveOptions(); opts.compression = 6;
    dup.saveAs(f, opts, true, Extension.LOWERCASE);
    dup.close(SaveOptions.DONOTSAVECHANGES);
    return '{"result":"' + f.fsName.replace(/\\/g,'\\\\') + '"}';
  } catch (e) {
    return '{"error":"' + e.toString().replace(/"/g,'\\"') + '"}';
  }
}

function exportSource(outPath, sizeMode, scalePct, longestSide) {
  try {
    var doc = app.activeDocument;
    if (!doc) return '{"error":"No active document"}';
    var dup = doc.duplicate();
    app.activeDocument = dup;
    // Apply same size as mask
    applySize(dup, sizeMode, scalePct, longestSide);
    dup.flatten();
    var outFolder = new Folder(outPath);
    if (!outFolder.exists) outFolder.create();
    var nm = doc.name.replace(/\.[^\.]+$/, '');
    var f = File(outPath + '/' + nm + '.png');
    var opts = new PNGSaveOptions(); opts.compression = 6;
    dup.saveAs(f, opts, true, Extension.LOWERCASE);
    dup.close(SaveOptions.DONOTSAVECHANGES);
    return '{"result":"' + f.fsName.replace(/\\/g,'\\\\') + '"}';
  } catch (e) {
    return '{"error":"' + e.toString().replace(/"/g,'\\"') + '"}';
  }
}

function applySize(doc, mode, scalePct, longestSide) {
  if (mode === 'scale') {
    var r = scalePct / 100;
    doc.resizeImage(doc.width.value * r, doc.height.value * r, doc.resolution, ResampleMethod.BICUBIC);
  } else if (mode === 'fixed') {
    var w = doc.width.value, h = doc.height.value;
    var maxDim = Math.max(w, h);
    if (maxDim > longestSide) {
      var s = longestSide / maxDim;
      doc.resizeImage(Math.round(w * s), Math.round(h * s), doc.resolution, ResampleMethod.BICUBIC);
    }
  }
}

function generateThumbnail(p, maxW, maxH) {
  try {
    var doc = app.open(File(p));
    var w = doc.width.value, h = doc.height.value;
    var s = Math.min(maxW / w, maxH / h, 1);
    if (s < 1) doc.resizeImage(w * s, h * s, doc.resolution, ResampleMethod.BICUBIC);
    var tf = File(Folder.temp.fsName + '/cep_thumb_' + doc.name.replace(/[^a-zA-Z0-9]/g,'_') + '.png');
    var opts = new PNGSaveOptions(); opts.compression = 6;
    doc.saveAs(tf, opts, true, Extension.LOWERCASE);
    doc.close(SaveOptions.DONOTSAVECHANGES);
    return '{"result":"' + tf.fsName.replace(/\\/g,'\\\\') + '"}';
  } catch (e) {
    return '{"error":"' + e.toString().replace(/"/g,'\\"') + '"}';
  }
}

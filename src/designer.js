// Admin Card Designer – interactive page for uploading card artwork, placing
// QR codes on either side (drag / size / rotation), and exporting a ZIP of
// print-ready composited cards.
//
// The client script is inlined (site convention) and must never contain
// backticks or `${...}` sequences, because it lives inside this template
// literal. It is validated by extracting it and running `node --check`.

const { getHeader, getFooter } = require('./views');

function renderDesignerPage(sampleQrDataUrl) {
  return `${getHeader('Card Designer')}
  <style>
    .step-num { width: 24px; height: 24px; border-radius: 9999px; background: rgba(99,102,241,.18);
      border: 1px solid rgba(99,102,241,.4); color: #a5b4fc; font-size: 12px; font-weight: 700;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .dropzone { display: flex; align-items: center; justify-content: center; position: relative;
      border: 1.5px dashed #334155; border-radius: 1rem; background: #020617; height: 150px;
      cursor: pointer; overflow: hidden; transition: border-color .15s, background .15s; }
    .dropzone:hover, .dropzone.dragover { border-color: #6366f1; background: #0b1120; }
    .dropzone.filled { border-style: solid; border-color: #1e293b; cursor: default; }
    .dropzone .thumb { width: 100%; height: 100%; object-fit: contain; }
    .dz-placeholder { display: flex; flex-direction: column; align-items: center; gap: .5rem;
      color: #64748b; font-size: 11px; font-weight: 500; pointer-events: none; }
    .side-tab { padding: .45rem 1rem; border-radius: .75rem; font-size: 12px; font-weight: 600;
      color: #94a3b8; background: transparent; border: 1px solid transparent; transition: all .15s; }
    .side-tab:hover:not(:disabled) { color: #e2e8f0; background: #1e293b; }
    .side-tab.active { color: #fff; background: #4f46e5; border-color: #6366f1; }
    .side-tab:disabled { opacity: .35; cursor: not-allowed; }
    #canvasWrap { position: relative; width: 100%; max-width: 640px; margin: 0 auto;
      background: repeating-conic-gradient(#0f172a 0% 25%, #020617 0% 50%) 50% / 20px 20px;
      border: 1px solid #1e293b; border-radius: 1rem; overflow: hidden; touch-action: none; }
    #cardCanvas { display: block; width: 100%; cursor: grab; }
    #cardCanvas.dragging { cursor: grabbing; }
    .slider { -webkit-appearance: none; appearance: none; width: 100%; height: 6px;
      border-radius: 9999px; background: #1e293b; outline: none; }
    .slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px;
      border-radius: 50%; background: #6366f1; border: 2px solid #e0e7ff; cursor: pointer; }
    .slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: #6366f1;
      border: 2px solid #e0e7ff; cursor: pointer; }
    .preset-btn { font-size: 11px; font-weight: 600; padding: .3rem .6rem; border-radius: .5rem;
      background: #1e293b; color: #cbd5e1; border: 1px solid #334155; transition: all .15s; }
    .preset-btn:hover { background: #334155; color: #fff; }
    .check-row { display: flex; align-items: center; gap: .55rem; font-size: 13px; color: #e2e8f0;
      font-weight: 600; cursor: pointer; user-select: none; padding: .55rem .8rem;
      border: 1px solid #1e293b; border-radius: .75rem; background: #020617; transition: all .15s; }
    .check-row:hover { border-color: #334155; }
    .check-row.on { border-color: #6366f1; background: rgba(99,102,241,.1); }
    .check-row.disabled { opacity: .4; cursor: not-allowed; }
    .check-row input { accent-color: #6366f1; width: 15px; height: 15px; }
    #busyOverlay { position: fixed; inset: 0; z-index: 60; background: rgba(2,6,23,.82);
      backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; }
    /* The ID rule above would otherwise beat Tailwind's .hidden (class-only)
       and leave the overlay permanently on screen - this restores the toggle. */
    #busyOverlay.hidden { display: none; }
    .spinner { width: 44px; height: 44px; border: 4px solid rgba(99,102,241,.25);
      border-top-color: #6366f1; border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>

  <main class="w-full max-w-5xl mx-auto p-4 sm:p-6 flex-1">

    <!-- Page header -->
    <div class="mb-6 pb-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <a href="/admin" class="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-400 transition mb-1.5">
          <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
          <span>Back to Dashboard</span>
        </a>
        <h1 class="text-2xl font-bold text-white flex items-center gap-2">
          <i data-lucide="layout-template" class="w-6 h-6 text-indigo-400"></i>
          <span>Card Designer</span>
        </h1>
        <p class="text-xs text-slate-400 mt-0.5">Upload artwork &rarr; place the QR codes &rarr; export a print-ready ZIP</p>
      </div>
      <button id="btnReset" type="button"
        class="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 inline-flex items-center gap-1.5 transition self-start">
        <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
        <span>Start over</span>
      </button>
    </div>

    <div id="errorBox" class="hidden mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm"></div>
    <div id="successBox" class="hidden mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm"></div>

    <!-- STEP 1: artwork upload -->
    <section class="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl mb-6">
      <div class="flex items-center gap-2 mb-1">
        <span class="step-num">1</span>
        <h2 class="text-lg font-bold text-white">Upload card artwork</h2>
      </div>
      <p class="text-xs text-slate-400 mb-5">Upload the front and/or back of your card. Images are auto-resized to keep generation fast.</p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- FRONT -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-semibold text-slate-300">Front side</label>
            <span id="state-front" class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">No image</span>
          </div>
          <label class="dropzone" id="drop-front" for="file-front">
            <input type="file" id="file-front" accept="image/png,image/jpeg" class="hidden">
            <img id="thumb-front" class="thumb hidden" alt="Front preview">
            <span class="dz-placeholder" id="ph-front">
              <i data-lucide="image-plus" class="w-6 h-6"></i>
              <span>Click to upload front</span>
            </span>
          </label>
          <div class="mt-2">
            <button type="button" id="remove-front" class="hidden text-[11px] text-red-400 hover:text-red-300 font-medium">Remove</button>
          </div>
        </div>

        <!-- BACK -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-semibold text-slate-300">Back side</label>
            <span id="state-back" class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">No image</span>
          </div>
          <label class="dropzone" id="drop-back" for="file-back">
            <input type="file" id="file-back" accept="image/png,image/jpeg" class="hidden">
            <img id="thumb-back" class="thumb hidden" alt="Back preview">
            <span class="dz-placeholder" id="ph-back">
              <i data-lucide="image-plus" class="w-6 h-6"></i>
              <span>Click to upload back</span>
            </span>
          </label>
          <div class="mt-2">
            <button type="button" id="remove-back" class="hidden text-[11px] text-red-400 hover:text-red-300 font-medium">Remove</button>
          </div>
        </div>
      </div>
      <p class="text-[11px] text-slate-500 mt-4">PNG or JPG. Both sides should share the same pixel size &mdash; standard card ratio 85.6 &times; 54 mm.</p>
    </section>

    <!-- STEP 2: QR placement -->
    <section id="placementSection" class="hidden bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl mb-6">
      <div class="flex items-center gap-2 mb-1">
        <span class="step-num">2</span>
        <h2 class="text-lg font-bold text-white">Place the QR code</h2>
      </div>
      <p class="text-xs text-slate-400 mb-4">Pick which side(s) carry a QR code, then drag it on the card and fine-tune size &amp; rotation.</p>

      <!-- QR side choices -->
      <div class="flex flex-wrap gap-3 mb-5">
        <label class="check-row on" id="row-front">
          <input type="checkbox" id="qrFront" checked>
          <span>QR on front</span>
        </label>
        <label class="check-row" id="row-back">
          <input type="checkbox" id="qrBack">
          <span>QR on back</span>
        </label>
      </div>

      <!-- side tabs -->
      <div class="flex gap-2 mb-4 justify-center" id="sideTabs">
        <button type="button" class="side-tab active" data-side="front">Front</button>
        <button type="button" class="side-tab" data-side="back" disabled>Back</button>
      </div>

      <div id="canvasWrap">
        <canvas id="cardCanvas" width="640" height="406"></canvas>
      </div>

      <div class="max-w-xl mx-auto mt-5 space-y-4">
        <!-- size -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-semibold text-slate-300">QR size</label>
            <span id="sizeValue" class="text-xs font-mono text-indigo-300">18%</span>
          </div>
          <input type="range" id="sizeSlider" class="slider" min="3" max="60" step="1" value="18">
        </div>

        <!-- rotation -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-semibold text-slate-300">Rotation (orientation)</label>
            <span id="rotValue" class="text-xs font-mono text-indigo-300">0&deg;</span>
          </div>
          <input type="range" id="rotSlider" class="slider" min="-180" max="180" step="1" value="0">
          <div class="flex flex-wrap gap-2 mt-2 justify-center">
            <button type="button" class="preset-btn" data-rot="0">0&deg;</button>
            <button type="button" class="preset-btn" data-rot="90">90&deg;</button>
            <button type="button" class="preset-btn" data-rot="-90">-90&deg;</button>
            <button type="button" class="preset-btn" data-rot="180">180&deg;</button>
          </div>
        </div>

        <!-- readout -->
        <div class="flex items-center justify-between gap-3 pt-1">
          <div class="text-[11px] text-slate-400">
            Position: <span id="posValue" class="font-mono text-slate-200">50% / 50%</span>
            <span class="text-slate-600 mx-1.5">&bull;</span>
            Drag the QR on the card to move it
          </div>
          <button type="button" id="btnResetPlacement"
            class="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition shrink-0">Reset placement</button>
        </div>
      </div>
      <p class="text-[11px] text-slate-500 mt-4 text-center">Tip: keep a few millimetres of clear quiet zone around the QR for reliable scanning.</p>
    </section>

    <!-- STEP 3: generate -->
    <section id="generateSection" class="hidden bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl mb-8">
      <div class="flex items-center gap-2 mb-1">
        <span class="step-num">3</span>
        <h2 class="text-lg font-bold text-white">Generate the batch</h2>
      </div>
      <p class="text-xs text-slate-400 mb-5">We will create fresh card IDs, bake the QR codes into your artwork, and download everything as one ZIP.</p>

      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end mb-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Number of cards</label>
          <input type="number" id="genQty" value="10" min="1" max="500" required
            class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Code Prefix (Optional)</label>
          <input type="text" id="genPrefix" placeholder="e.g. CARD-"
            class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm uppercase">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Code Length</label>
          <input type="number" id="genLength" value="6" min="4" max="10"
            class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Export format</label>
          <select id="genFormat"
            class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm">
            <option value="pdf" selected>PDF - front + back pages</option>
            <option value="images">Images (PNG/JPG) per side</option>
          </select>
        </div>
      </div>

      <button type="button" id="btnGenerate"
        class="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm shadow-lg shadow-indigo-600/25 transition inline-flex items-center justify-center gap-2 mb-4">
        <i data-lucide="download" class="w-4 h-4"></i>
        <span>Generate &amp; Download ZIP</span>
      </button>

      <div id="qtyWarning" class="hidden p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
        <i data-lucide="alert-triangle" class="w-4 h-4 shrink-0 mt-0.5"></i>
        <span>Large batches can exceed the hosted server's time limit. Batches above ~100 cards are safest run locally with <span class="font-mono">npm start</span>.</span>
      </div>

      <p class="text-[11px] text-slate-500 mt-1" id="outputSummary">Output: PDF export (front + back pages) + CSV + NFC instructions.</p>
    </section>
  </main>

  <!-- busy overlay -->
  <div id="busyOverlay" class="hidden">
    <div class="text-center px-6">
      <div class="spinner mx-auto mb-4"></div>
      <div id="busyMsg" class="text-sm font-medium text-slate-200">Working&hellip;</div>
      <div class="text-[11px] text-slate-500 mt-1">Please keep this tab open</div>
    </div>
  </div>

  <script type="application/json" id="designer-config">${JSON.stringify({ sampleQr: sampleQrDataUrl })}</script>
  <script>
  'use strict';
  (function () {
    // NOTE: this script is inlined in a template literal - no backticks,
    // no dollar-brace and no backslashes allowed anywhere below.
    var CFG = JSON.parse(document.getElementById('designer-config').textContent);
    var STORE_KEY = 'opentap_designer_v1';
    var MAX_SIDE_CHARS = 1900000; // per-side data URL cap (keeps us under serverless body limits)

    function $(id) { return document.getElementById(id); }
    function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
    function rotFactor(deg) {
      var rad = deg * Math.PI / 180;
      return Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad));
    }
    function defaultPlacement() { return { x: 0.5, y: 0.5, size: 0.18, rotation: 0 }; }

    var state = {
      front: { dataUrl: null, img: null, placement: defaultPlacement() },
      back: { dataUrl: null, img: null, placement: defaultPlacement() },
      qr: { front: true, back: false },
      activeSide: 'front',
      designId: null,
      dirty: false,
      busy: false
    };

    // QR geometry in CSS pixels for a side. Mirrors src/compositor.js exactly so
    // what the admin drags is what gets composited server-side.
    function geom(side, cssW, cssH) {
      var p = state[side].placement;
      var f = rotFactor(p.rotation);
      var maxSize = Math.min(cssW, cssH) / f;
      var size = Math.min(Math.max(p.size * cssW, 6), maxSize);
      var bw = size * f;
      var bh = size * f;
      var cx = bw >= cssW ? cssW / 2 : clamp(p.x * cssW, bw / 2, cssW - bw / 2);
      var cy = bh >= cssH ? cssH / 2 : clamp(p.y * cssH, bh / 2, cssH - bh / 2);
      return { size: size, cx: cx, cy: cy, bw: bw, bh: bh };
    }

    // ---------- messages ----------
    function showError(msg) {
      var box = $('errorBox');
      box.textContent = msg;
      box.classList.remove('hidden');
      $('successBox').classList.add('hidden');
    }
    function showSuccess(msg) {
      var box = $('successBox');
      box.textContent = msg;
      box.classList.remove('hidden');
      $('errorBox').classList.add('hidden');
    }
    function hideMessages() {
      $('errorBox').classList.add('hidden');
      $('successBox').classList.add('hidden');
    }
    function showBusy(msg) {
      state.busy = true;
      $('busyMsg').textContent = msg;
      $('busyOverlay').classList.remove('hidden');
    }
    function setBusyMsg(msg) { $('busyMsg').textContent = msg; }
    function hideBusy() {
      state.busy = false;
      $('busyOverlay').classList.add('hidden');
    }

    // ---------- image optimisation ----------
    // Downscale to <=1600px, keep PNG only when it actually has transparency,
    // otherwise encode JPEG, stepping quality/size down until under the cap.
    function optimizeImage(file) {
      return createImageBitmap(file).then(function (bmp) {
        var MAX = 1600;
        var scale = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
        var w = Math.max(1, Math.round(bmp.width * scale));
        var h = Math.max(1, Math.round(bmp.height * scale));

        function renderTo(sw, sh) {
          var c = document.createElement('canvas');
          c.width = sw; c.height = sh;
          var cx = c.getContext('2d');
          cx.imageSmoothingEnabled = true;
          cx.imageSmoothingQuality = 'high';
          cx.drawImage(bmp, 0, 0, sw, sh);
          return c;
        }

        var hasAlpha = false;
        if (file.type === 'image/png') {
          var probe = renderTo(w, h).getContext('2d');
          var d = probe.getImageData(0, 0, w, h).data;
          for (var i = 3; i < d.length; i += 4) {
            if (d[i] !== 255) { hasAlpha = true; break; }
          }
        }

        var result = null;
        if (hasAlpha) {
          var cw = w, ch = h;
          for (var t = 0; t < 5; t++) {
            result = renderTo(cw, ch).toDataURL('image/png');
            if (result.length <= MAX_SIDE_CHARS) break;
            cw = Math.round(cw * 0.75);
            ch = Math.round(ch * 0.75);
            result = null;
          }
          if (!result) {
            // Still too big: flatten onto white and fall back to JPEG.
            var fc = renderTo(w, h);
            var fx = fc.getContext('2d');
            fx.globalCompositeOperation = 'destination-over';
            fx.fillStyle = '#ffffff';
            fx.fillRect(0, 0, w, h);
            result = fc.toDataURL('image/jpeg', 0.85);
          }
        } else {
          var q = 0.85;
          while (q >= 0.5) {
            result = renderTo(w, h).toDataURL('image/jpeg', q);
            if (result.length <= MAX_SIDE_CHARS) break;
            q = Math.round((q - 0.08) * 100) / 100;
          }
          var guard = 0;
          while (result.length > MAX_SIDE_CHARS && guard < 5 && w > 400) {
            w = Math.round(w * 0.8);
            h = Math.round(h * 0.8);
            result = renderTo(w, h).toDataURL('image/jpeg', 0.8);
            guard++;
          }
        }

        if (bmp.close) bmp.close();
        return result;
      });
    }

    // ---------- file handling ----------
    function handleFile(side, file) {
      if (!file) return;
      if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
        showError('Please upload a PNG or JPG image.');
        return;
      }
      hideMessages();
      showBusy('Preparing image...');
      optimizeImage(file).then(function (dataUrl) {
        var img = new Image();
        img.onload = function () {
          var firstUpload = !state[side].img;
          state[side].dataUrl = dataUrl;
          state[side].img = img;
          if (firstUpload && side === 'front') state.qr.front = true;
          state.dirty = true;
          if (!state[state.activeSide].img) state.activeSide = side;
          hideBusy();
          syncUI();
          persist();
        };
        img.onerror = function () { hideBusy(); showError('Could not read that image file.'); };
        img.src = dataUrl;
      }).catch(function (e) {
        hideBusy();
        showError((e && e.message) ? e.message : 'Image processing failed.');
      });
    }

    function removeSide(side) {
      state[side].dataUrl = null;
      state[side].img = null;
      state[side].placement = defaultPlacement();
      state.qr[side] = side === 'front';
      if (!state[state.activeSide].img) {
        state.activeSide = state.front.img ? 'front' : 'back';
      }
      state.dirty = true;
      hideMessages();
      syncUI();
      persist();
    }

    // ---------- UI sync ----------
    function syncUI() {
      var anyImage = Boolean(state.front.img || state.back.img);

      ['front', 'back'].forEach(function (side) {
        var has = Boolean(state[side].img);
        $('thumb-' + side).classList.toggle('hidden', !has);
        $('ph-' + side).classList.toggle('hidden', has);
        $('drop-' + side).classList.toggle('filled', has);
        $('remove-' + side).classList.toggle('hidden', !has);
        $('state-' + side).textContent = has ? 'Ready' : 'No image';
        $('state-' + side).className = has
          ? 'text-[10px] font-semibold uppercase tracking-wide text-emerald-400'
          : 'text-[10px] font-semibold uppercase tracking-wide text-slate-500';
        if (has) $('thumb-' + side).src = state[side].dataUrl;
        // side tabs + QR checkboxes follow image availability
        var tab = document.querySelector('.side-tab[data-side="' + side + '"]');
        tab.disabled = !has;
        tab.classList.toggle('active', state.activeSide === side && has);
        var row = $('row-' + side);
        row.classList.toggle('disabled', !has);
        row.classList.toggle('on', has && state.qr[side]);
        var cb = side === 'front' ? $('qrFront') : $('qrBack');
        cb.disabled = !has;
        cb.checked = Boolean(state.qr[side]) && has;
      });

      $('placementSection').classList.toggle('hidden', !anyImage);
      $('generateSection').classList.toggle('hidden', !anyImage);

      updateOutputSummary();
      draw();
    }

    function updateOutputSummary() {
      var qty = clamp(parseInt($('genQty').value, 10) || 1, 1, 500);
      if ($('genFormat').value === 'pdf') {
        $('outputSummary').textContent = 'Output: ' + qty + ' PDF file(s) - page 1 = front, page 2 = back (QR baked in where enabled) + CSV + NFC instructions.';
        $('qtyWarning').classList.toggle('hidden', qty <= 100);
        return;
      }
      var parts = [];
      if (state.front.img && state.qr.front) parts.push('front');
      if (state.back.img && state.qr.back) parts.push('back');
      var shared = [];
      if (state.front.img && !state.qr.front) shared.push('common_front');
      if (state.back.img && !state.qr.back) shared.push('common_back');
      var txt = 'Output: ' + qty + ' unique card image(s)' + (parts.length ? ' per side (' + parts.join(' + ') + ')' : '');
      if (shared.length) txt += ', plus shared ' + shared.join(' / ');
      txt += ' + CSV + NFC instructions.';
      $('outputSummary').textContent = txt;
      $('qtyWarning').classList.toggle('hidden', qty <= 100);
    }

    // ---------- canvas rendering ----------
    var qrImg = new Image();
    qrImg.src = CFG.sampleQr;

    function clampPlacement(side) {
      var s = state[side];
      if (!s.img) return;
      var p = s.placement;
      var ratio = s.img.naturalHeight / s.img.naturalWidth;
      var f = rotFactor(p.rotation);
      // Mirrors the server-side size cap: the rotated QR must fit the card.
      var maxSize = Math.min(0.6, Math.min(1, ratio) / f);
      p.size = clamp(p.size, 0.03, maxSize);
      p.x = clamp(p.x, 0, 1);
      p.y = clamp(p.y, 0, 1);
      p.rotation = clamp(p.rotation, -180, 180);
    }

    function draw() {
      var side = state.activeSide;
      var s = state[side];
      var canvas = $('cardCanvas');
      var wrap = $('canvasWrap');
      var ctx = canvas.getContext('2d');

      if (!s.img) {
        wrap.style.aspectRatio = '';
        canvas.width = 640;
        canvas.height = 406;
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, 640, 406);
        ctx.fillStyle = '#475569';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Upload card artwork to start placing QR codes', 320, 203);
        return;
      }

      clampPlacement(side);
      var imgW = s.img.naturalWidth;
      var imgH = s.img.naturalHeight;
      wrap.style.aspectRatio = imgW + ' / ' + imgH;

      var cssW = wrap.clientWidth;
      if (!cssW) return; // section not visible yet
      var cssH = (cssW * imgH) / imgW;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.height = cssH + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.drawImage(s.img, 0, 0, cssW, cssH);

      var g = geom(side, cssW, cssH);
      ctx.save();
      ctx.translate(g.cx, g.cy);
      ctx.rotate((s.placement.rotation * Math.PI) / 180);
      if (qrImg.complete && qrImg.naturalWidth) {
        ctx.drawImage(qrImg, -g.size / 2, -g.size / 2, g.size, g.size);
      }
      ctx.strokeStyle = 'rgba(129,140,248,0.95)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(-g.size / 2, -g.size / 2, g.size, g.size);
      ctx.setLineDash([]);
      ctx.restore();

      // keep controls in sync with the (possibly clamped) placement
      var pct = Math.round(s.placement.size * 100);
      var deg = Math.round(s.placement.rotation);
      $('sizeSlider').value = pct;
      $('rotSlider').value = deg;
      $('sizeValue').textContent = pct + '%';
      $('rotValue').textContent = deg + String.fromCharCode(176);
      $('posValue').textContent = Math.round(s.placement.x * 100) + '% / ' + Math.round(s.placement.y * 100) + '%';
    }

    // ---------- drag to place ----------
    var drag = null;

    $('cardCanvas').addEventListener('pointerdown', function (e) {
      var side = state.activeSide;
      var s = state[side];
      if (!s.img || state.busy) return;
      var canvas = $('cardCanvas');
      var rect = canvas.getBoundingClientRect();
      var cssW = rect.width;
      var cssH = rect.height;
      var g = geom(side, cssW, cssH);
      var px = e.clientX - rect.left;
      var py = e.clientY - rect.top;
      var ang = (s.placement.rotation * Math.PI) / 180;
      var dx = px - g.cx;
      var dy = py - g.cy;
      // rotate the pointer into the QR's local space for hit testing
      var lx = dx * Math.cos(-ang) - dy * Math.sin(-ang);
      var ly = dx * Math.sin(-ang) + dy * Math.cos(-ang);
      if (Math.abs(lx) > g.size / 2 || Math.abs(ly) > g.size / 2) return;
      drag = { side: side, lx: lx, ly: ly };
      canvas.classList.add('dragging');
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    $('cardCanvas').addEventListener('pointermove', function (e) {
      if (!drag) return;
      var side = drag.side;
      var s = state[side];
      var canvas = $('cardCanvas');
      var rect = canvas.getBoundingClientRect();
      var cssW = rect.width;
      var cssH = rect.height;
      var px = e.clientX - rect.left;
      var py = e.clientY - rect.top;
      var ang = (s.placement.rotation * Math.PI) / 180;
      // desired centre = pointer minus the grab offset (rotated with the QR)
      var ox = drag.lx * Math.cos(ang) - drag.ly * Math.sin(ang);
      var oy = drag.lx * Math.sin(ang) + drag.ly * Math.cos(ang);
      var g = geom(side, cssW, cssH);
      var cx = g.bw >= cssW ? cssW / 2 : clamp(px - ox, g.bw / 2, cssW - g.bw / 2);
      var cy = g.bh >= cssH ? cssH / 2 : clamp(py - oy, g.bh / 2, cssH - g.bh / 2);
      s.placement.x = cx / cssW;
      s.placement.y = cy / cssH;
      state.dirty = true;
      draw();
    });

    function endDrag() {
      if (!drag) return;
      drag = null;
      $('cardCanvas').classList.remove('dragging');
      persist();
    }
    $('cardCanvas').addEventListener('pointerup', endDrag);
    $('cardCanvas').addEventListener('pointercancel', endDrag);

    // ---------- event wiring ----------
    var persistTimer = null;
    function persistSoon() {
      if (persistTimer) clearTimeout(persistTimer);
      persistTimer = setTimeout(persist, 300);
    }

    ['front', 'back'].forEach(function (side) {
      $('file-' + side).addEventListener('change', function (e) {
        handleFile(side, e.target.files[0]);
        e.target.value = '';
      });
      $('remove-' + side).addEventListener('click', function () { removeSide(side); });
      ['dragenter', 'dragover'].forEach(function (ev) {
        $('drop-' + side).addEventListener(ev, function (e) {
          e.preventDefault();
          $('drop-' + side).classList.add('dragover');
        });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        $('drop-' + side).addEventListener(ev, function (e) {
          e.preventDefault();
          $('drop-' + side).classList.remove('dragover');
        });
      });
      $('drop-' + side).addEventListener('drop', function (e) {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFile(side, e.dataTransfer.files[0]);
        }
      });
    });

    document.querySelectorAll('.side-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var side = tab.getAttribute('data-side');
        if (!state[side].img) return;
        state.activeSide = side;
        syncUI();
      });
    });

    $('qrFront').addEventListener('change', function () {
      state.qr.front = $('qrFront').checked;
      state.dirty = true;
      syncUI();
      persist();
    });
    $('qrBack').addEventListener('change', function () {
      state.qr.back = $('qrBack').checked;
      state.dirty = true;
      syncUI();
      persist();
    });

    $('sizeSlider').addEventListener('input', function () {
      var s = state[state.activeSide];
      if (!s.img) return;
      s.placement.size = clamp(parseInt($('sizeSlider').value, 10) / 100, 0.03, 0.6);
      state.dirty = true;
      draw();
      persistSoon();
    });
    $('rotSlider').addEventListener('input', function () {
      var s = state[state.activeSide];
      if (!s.img) return;
      s.placement.rotation = clamp(parseInt($('rotSlider').value, 10), -180, 180);
      state.dirty = true;
      draw();
      persistSoon();
    });
    document.querySelectorAll('.preset-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var s = state[state.activeSide];
        if (!s.img) return;
        s.placement.rotation = clamp(parseInt(btn.getAttribute('data-rot'), 10), -180, 180);
        state.dirty = true;
        draw();
        persist();
      });
    });
    $('btnResetPlacement').addEventListener('click', function () {
      var s = state[state.activeSide];
      if (!s.img) return;
      s.placement = defaultPlacement();
      state.dirty = true;
      draw();
      persist();
    });
    $('genQty').addEventListener('input', updateOutputSummary);
    $('genFormat').addEventListener('change', updateOutputSummary);

    // ---------- persistence ----------
    function persist() {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify({
          designId: state.designId,
          placement: { front: state.front.placement, back: state.back.placement },
          qr: state.qr
        }));
      } catch (e) { /* storage unavailable (private mode) - non-fatal */ }
    }

    function validate() {
      if (!state.front.img && !state.back.img) return 'Upload at least one card side first.';
      var qrAny = (state.front.img && state.qr.front) || (state.back.img && state.qr.back);
      if (!qrAny) return 'Enable the QR code on at least one side.';
      var qty = parseInt($('genQty').value, 10);
      if (!qty || qty < 1 || qty > 500) return 'Quantity must be between 1 and 500.';
      var len = parseInt($('genLength').value, 10);
      if (!len || len < 4 || len > 10) return 'Code length must be between 4 and 10.';
      return null;
    }

    function postJson(url, body) {
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(function (r) {
        return r.json().then(
          function (data) {
            if (!r.ok) throw new Error((data && data.error) ? data.error : ('Request failed (' + r.status + ')'));
            return data;
          },
          function () { throw new Error('Request failed (' + r.status + ')'); }
        );
      });
    }

    function saveDesign() {
      if (state.designId && !state.dirty) return Promise.resolve(state.designId);
      return postJson('/admin/designs', {
        name: 'Card design',
        frontB64: state.front.dataUrl,
        backB64: state.back.dataUrl,
        placement: { front: state.front.placement, back: state.back.placement }
      }).then(function (data) {
        state.designId = data.id;
        state.dirty = false;
        persist();
        return data.id;
      });
    }

    // ---------- generate ----------
    function generate() {
      hideMessages();
      var err = validate();
      if (err) { showError(err); return; }
      var qty = parseInt($('genQty').value, 10);

      showBusy('Saving your design...');
      saveDesign().then(function (id) {
        setBusyMsg('Generating ' + qty + ' cards... large batches can take a minute.');
        return fetch('/admin/generate-design', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            designId: id,
            quantity: qty,
            prefix: $('genPrefix').value,
            length: parseInt($('genLength').value, 10),
            format: $('genFormat').value,
            qr: state.qr,
            placement: { front: state.front.placement, back: state.back.placement }
          })
        }).then(function (r) {
          var ct = r.headers.get('content-type') || '';
          if (!r.ok || ct.indexOf('zip') === -1) {
            return r.json().then(
              function (d) { throw new Error((d && d.error) ? d.error : ('Generation failed (' + r.status + ')')); },
              function () { throw new Error('Generation failed (' + r.status + ')'); }
            );
          }
          return r.blob();
        });
      }).then(function (blob) {
        setBusyMsg('Preparing download...');
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'opentap_design_batch_' + qty + '_cards.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
        hideBusy();
        showSuccess('Batch ready! ' + qty + ' card(s) generated - your ZIP download has started.');
      }).catch(function (e) {
        hideBusy();
        showError((e && e.message) ? e.message : 'Generation failed.');
      });
    }

    // ---------- restore previous session ----------
    function loadSideFromDataUrl(side, dataUrl) {
      return new Promise(function (resolve) {
        if (!dataUrl) { resolve(); return; }
        var img = new Image();
        img.onload = function () {
          state[side].dataUrl = dataUrl;
          state[side].img = img;
          resolve();
        };
        img.onerror = function () { resolve(); };
        img.src = dataUrl;
      });
    }

    function restore() {
      var saved = null;
      try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) {}
      if (!saved || !saved.designId) return Promise.resolve();

      return fetch('/admin/designs/' + encodeURIComponent(saved.designId))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d || (!d.frontB64 && !d.backB64)) {
            try { localStorage.removeItem(STORE_KEY); } catch (e) {}
            return;
          }
          return Promise.all([
            loadSideFromDataUrl('front', d.frontB64),
            loadSideFromDataUrl('back', d.backB64)
          ]).then(function () {
            // Latest placement wins: localStorage is newer than the stored row.
            var pl = (saved.placement && (saved.placement.front || saved.placement.back))
              ? saved.placement
              : (d.placement || {});
            if (pl.front) state.front.placement = pl.front;
            if (pl.back) state.back.placement = pl.back;
            if (saved.qr) {
              state.qr.front = Boolean(saved.qr.front);
              state.qr.back = Boolean(saved.qr.back);
            }
            if (!state.front.img) state.qr.front = false;
            if (!state.back.img) state.qr.back = false;
            state.designId = saved.designId;
            state.dirty = false;
            state.activeSide = state.front.img ? 'front' : (state.back.img ? 'back' : 'front');
          });
        })
        .catch(function () { /* offline / expired - start fresh */ });
    }

    // ---------- init ----------
    $('btnGenerate').addEventListener('click', generate);
    $('btnReset').addEventListener('click', function () {
      if (state.busy) return;
      if (window.confirm('Start over? This clears the current design and placement.')) {
        try { localStorage.removeItem(STORE_KEY); } catch (e) {}
        window.location.reload();
      }
    });
    window.addEventListener('resize', function () { draw(); });

    syncUI();
    restore().then(function () { syncUI(); });
  })();
  </script>
  ${getFooter()}`;
}

module.exports = { renderDesignerPage };
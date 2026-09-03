const map = L.map('map', {
  maxBounds: [[-90, -180], [90, 180]],
  maxBoundsViscosity: 1.0,
  minZoom: 2
}).setView([35.6812, 139.7671], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
  attribution: '&copy; OpenStreetMap',
  noWrap: true
}).addTo(map);

const SHADOW_URL = './node_modules/leaflet/dist/images/marker-shadow.png';
const icons = {
  blue: new L.Icon({ iconUrl: './assets/markers/marker-icon-2x-blue.png', shadowUrl: SHADOW_URL, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] }),
  green: new L.Icon({ iconUrl: './assets/markers/marker-icon-2x-green.png', shadowUrl: SHADOW_URL, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] }),
  red: new L.Icon({ iconUrl: './assets/markers/marker-icon-2x-red.png', shadowUrl: SHADOW_URL, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] }),
  yellow: new L.Icon({ iconUrl: './assets/markers/marker-icon-2x-yellow.png', shadowUrl: SHADOW_URL, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] }),
  violet: new L.Icon({ iconUrl: './assets/markers/marker-icon-2x-violet.png', shadowUrl: SHADOW_URL, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] }),
  black: new L.Icon({ iconUrl: './assets/markers/marker-icon-2x-black.png', shadowUrl: SHADOW_URL, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] })
};

const sidePanel = document.getElementById('side-panel');
const panelTitle = document.getElementById('panel-title');
const subpathDisplay = document.getElementById('subpath-display');
const fileList = document.getElementById('file-list');
const pinSettingsArea = document.getElementById('pin-settings-area');
const movingBanner = document.getElementById('moving-banner');

let currentPinId = ''; 
let currentSubPath = ''; 
let pinsCache = {}; 
const markers = {}; 
let isMovingPin = false; 

function showPrompt(message, defaultValue = '') {
  return new Promise((resolve) => {
    const promptUI = document.getElementById('custom-prompt');
    const msgEl = document.getElementById('prompt-message');
    const inputEl = document.getElementById('prompt-input');
    const okBtn = document.getElementById('prompt-ok');
    const cancelBtn = document.getElementById('prompt-cancel');

    msgEl.textContent = message;
    inputEl.value = defaultValue;
    promptUI.style.display = 'flex';
    inputEl.focus();

    const closePrompt = () => { promptUI.style.display = 'none'; };

    okBtn.onclick = () => { resolve(inputEl.value.trim()); closePrompt(); };
    cancelBtn.onclick = () => { resolve(null); closePrompt(); };
    inputEl.onkeydown = (e) => {
      if (e.key === 'Enter') okBtn.click();
      if (e.key === 'Escape') cancelBtn.click();
    };
  });
}

// ソート関数
function sortPins(pinList, sortOption) {
  return pinList.sort((a, b) => {
    switch (sortOption) {
      case 'name_asc':
        return a.name.localeCompare(b.name, 'ja');
      case 'name_desc':
        return b.name.localeCompare(a.name, 'ja');
      case 'created_asc':
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      case 'created_desc':
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      case 'updated_asc':
        return new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0);
      case 'updated_desc':
      default:
        return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    }
  });
}

// 左パネルのピン一覧を更新
async function refreshPinList() {
  pinsCache = await window.api.getPins();
  const listContent = document.getElementById('pin-list-content');
  const searchQuery = document.getElementById('pin-search-input').value.toLowerCase();
  const sortOption = document.getElementById('pin-sort-select').value;
  listContent.innerHTML = '';
  
  let pinArray = Object.values(pinsCache);
  if (pinArray.length === 0) {
    listContent.innerHTML = '<p style="padding:15px; color:#999; font-size:13px;">登録されたピンがありません。</p>';
    return;
  }

  // 検索フィルタ
  if (searchQuery) {
    pinArray = pinArray.filter(p => p.name.toLowerCase().includes(searchQuery));
  }

  // 並び替え
  pinArray = sortPins(pinArray, sortOption);

  for (const pin of pinArray) {
    const files = await window.api.readFolder(pin.id, '');
    const fileCount = files.length;

    const div = document.createElement('div');
    div.className = 'pin-list-item';

    div.innerHTML = `
      <div class="pin-list-icon">📍</div>
      <div class="pin-list-text">
        <span class="pin-list-name">${pin.name}</span>
        <span class="pin-list-coords">${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)} （📁 ${fileCount} 項目）</span>
      </div>
      <button class="btn btn-sm btn-danger pin-list-del" title="ピンを削除">🗑️</button>
    `;

    div.onclick = (e) => {
      if (e.target.classList.contains('pin-list-del')) return;
      map.flyTo([pin.lat, pin.lng], 15);
      openPinPanel(pin.id);
    };

    div.querySelector('.pin-list-del').onclick = async (e) => {
      e.stopPropagation();
      if (confirm(`「${pin.name}」とデータを削除しますか？`)) {
        await window.api.deletePin(pin.id);
        removeMarker(pin.id);
        delete pinsCache[pin.id];
        if (currentPinId === pin.id) closeSidePanel();
        refreshPinList();
      }
    };

    listContent.appendChild(div);
  }
}

// ファイル一覧更新
async function refreshList() {
  const files = await window.api.readFolder(currentPinId, currentSubPath);
  subpathDisplay.textContent = currentSubPath === '' ? 'ルート階層' : '/' + currentSubPath;
  document.getElementById('btn-up').style.display = currentSubPath === '' ? 'none' : 'block';
  
  fileList.innerHTML = '';
  if (files.length === 0) {
    fileList.innerHTML = '<p style="color:#999; font-size:13px; text-align:center; margin-top:20px;">空です。<br>ここにファイルをドラッグ＆ドロップできます。</p>';
    return;
  }
  
  files.forEach(item => {
    const div = document.createElement('div');
    div.className = 'file-item';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'file-name';
    nameSpan.textContent = (item.isDirectory ? '📁 ' : '📄 ') + item.name;
    
    nameSpan.onclick = () => {
      if (item.isDirectory) {
        currentSubPath = currentSubPath ? `${currentSubPath}/${item.name}` : item.name;
        refreshList();
      } else {
        window.api.openItem(currentPinId, currentSubPath, item.name);
      }
    };

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'file-actions';

    const renameBtn = document.createElement('button');
    renameBtn.className = 'btn-sm btn-rename';
    renameBtn.textContent = '名前変更';
    renameBtn.onclick = async () => {
      const newName = await showPrompt('新しい名前を入力してください', item.name);
      if (newName && newName !== item.name) {
        const ok = await window.api.renameItem(currentPinId, currentSubPath, item.name, newName);
        if (!ok) { alert('その名前は使用できません（/ や \\、.. などは使えません）。'); return; }
        refreshList();
      }
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-sm btn-delete';
    deleteBtn.textContent = '削除';
    deleteBtn.onclick = async () => {
      if (confirm(`「${item.name}」をごみ箱へ移動しますか？`)) {
        await window.api.deleteItem(currentPinId, currentSubPath, item.name);
        refreshList();
        refreshPinList();
      }
    };

    actionsDiv.appendChild(renameBtn);
    actionsDiv.appendChild(deleteBtn);
    div.appendChild(nameSpan);
    div.appendChild(actionsDiv);
    fileList.appendChild(div);
  });
}

function closeSidePanel() {
  stopMovingMode();
  pinSettingsArea.classList.remove('open');
  sidePanel.classList.remove('open');
}

async function openPinPanel(id) {
  stopMovingMode();
  pinSettingsArea.classList.remove('open');

  currentPinId = id;
  currentSubPath = ''; 
  const pin = pinsCache[id];
  panelTitle.textContent = `📍 ${pin ? pin.name : ''}`;
  
  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.classList.toggle('selected', dot.dataset.color === (pin.color || 'blue'));
  });

  await refreshList();
  sidePanel.classList.add('open');
}

function removeMarker(id) {
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }
}

async function updatePinCoords(id, lat, lng) {
  await window.api.updatePinLocation({ id, lat, lng });
  pinsCache[id].lat = lat;
  pinsCache[id].lng = lng;
  if (markers[id]) {
    markers[id].setLatLng([lat, lng]);
  }
  refreshPinList();
}

function placeMarker(id, pin) {
  const icon = icons[pin.color || 'blue'] || icons.blue;

  if (markers[id]) {
    markers[id].setIcon(icon);
    markers[id].setLatLng([pin.lat, pin.lng]);
    markers[id].setTooltipContent(pin.name);
    return;
  }
  
  const marker = L.marker([pin.lat, pin.lng], { icon: icon, draggable: false }).addTo(map);
  marker.bindTooltip(pin.name); 
  
  marker.on('click', (e) => {
    if (isMovingPin) {
      L.DomEvent.stopPropagation(e);
      return;
    }
    openPinPanel(id);
  });
  
  marker.on('dragend', async (e) => {
    const newPos = e.target.getLatLng();
    await updatePinCoords(id, newPos.lat, newPos.lng);
  });

  markers[id] = marker; 
}

function startMovingMode() {
  if (!currentPinId || !markers[currentPinId]) return;
  isMovingPin = true;
  markers[currentPinId].dragging.enable();
  
  movingBanner.classList.add('active');
  const btn = document.getElementById('move-pin-btn');
  btn.textContent = '✅ 位置変更を決定';
  btn.style.background = '#28a745';
}

function stopMovingMode() {
  if (isMovingPin && currentPinId && markers[currentPinId]) {
    markers[currentPinId].dragging.disable();
  }
  isMovingPin = false;
  movingBanner.classList.remove('active');
  const btn = document.getElementById('move-pin-btn');
  if (btn) {
    btn.textContent = '📍 位置を変更する';
    btn.style.background = '#17a2b8';
  }
}

async function loadExistingPins() {
  pinsCache = await window.api.getPins();
  Object.keys(pinsCache).forEach(id => placeMarker(id, pinsCache[id]));
  refreshPinList(); 
}
loadExistingPins();

// --- イベントハンドラ ---

document.getElementById('toggle-settings-btn').addEventListener('click', () => {
  pinSettingsArea.classList.toggle('open');
});

document.getElementById('move-pin-btn').addEventListener('click', () => {
  if (!isMovingPin) {
    startMovingMode();
  } else {
    stopMovingMode();
  }
});

document.getElementById('list-toggle-btn').addEventListener('click', () => {
  document.getElementById('left-panel').classList.add('open');
});
document.getElementById('close-left-panel-btn').addEventListener('click', () => {
  document.getElementById('left-panel').classList.remove('open');
});
document.getElementById('close-panel-btn').addEventListener('click', closeSidePanel);

// 検索 & 並び替え 変更イベント
document.getElementById('pin-search-input').addEventListener('input', refreshPinList);
document.getElementById('pin-sort-select').addEventListener('change', refreshPinList);

document.getElementById('btn-up').addEventListener('click', () => {
  const parts = currentSubPath.split('/');
  parts.pop();
  currentSubPath = parts.join('/');
  refreshList();
});

document.getElementById('rename-pin-btn').addEventListener('click', async () => {
  const currentPin = pinsCache[currentPinId];
  if (!currentPin) return;

  const newName = await showPrompt('この場所の新しい名前を入力してください', currentPin.name);
  if (newName !== null && newName.trim() !== '') {
    await window.api.renamePin({ id: currentPinId, newName: newName.trim() });
    pinsCache[currentPinId].name = newName.trim();
    panelTitle.textContent = `📍 ${newName.trim()}`;
    placeMarker(currentPinId, pinsCache[currentPinId]);
    refreshPinList(); 
  }
});

document.querySelectorAll('.color-dot').forEach(dot => {
  dot.addEventListener('click', async (e) => {
    const color = e.target.dataset.color;
    if (!currentPinId || !pinsCache[currentPinId]) return;

    await window.api.updatePinColor({ id: currentPinId, color: color });
    pinsCache[currentPinId].color = color;
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
    e.target.classList.add('selected');
    placeMarker(currentPinId, pinsCache[currentPinId]);
  });
});

document.getElementById('add-file-btn').addEventListener('click', async () => {
  const success = await window.api.addFile(currentPinId, currentSubPath);
  if (success) { refreshList(); refreshPinList(); }
});
document.getElementById('new-file-btn').addEventListener('click', async () => {
  const name = await showPrompt('作成するファイル名（例: メモ.txt）');
  if (name) {
    const ok = await window.api.createNewFile(currentPinId, currentSubPath, name);
    if (!ok) { alert('その名前は使用できません（/ や \\、.. などは使えません）。'); return; }
    refreshList(); refreshPinList();
  }
});
document.getElementById('new-dir-btn').addEventListener('click', async () => {
  const name = await showPrompt('作成するフォルダ名');
  if (name) {
    const ok = await window.api.createSubFolder(currentPinId, currentSubPath, name);
    if (!ok) { alert('その名前は使用できません（/ や \\、.. などは使えません）。'); return; }
    refreshList(); refreshPinList();
  }
});
document.getElementById('open-explorer-btn').addEventListener('click', () => {
  if (currentPinId) window.api.openFolderInExplorer(currentPinId, currentSubPath);
});

document.getElementById('delete-pin-btn').addEventListener('click', async () => {
  if (confirm('このピンと、中身のデータをすべてごみ箱へ移動しますか？')) {
    await window.api.deletePin(currentPinId);
    removeMarker(currentPinId);
    delete pinsCache[currentPinId];
    closeSidePanel();
    refreshPinList(); 
  }
});

// 1. ドラッグ中：デフォルト動作を打ち消さないと Drop が発火しません
fileList.addEventListener('dragover', (e) => {
  e.preventDefault(); // ★これが超重要です
  e.stopPropagation();
  fileList.classList.add('drag-over');
});

// 2. 領域から外れたとき
fileList.addEventListener('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();
  fileList.classList.remove('drag-over');
});

// 3. ドロップしたとき
fileList.addEventListener('drop', async (e) => {
  e.preventDefault();
  e.stopPropagation();
  fileList.classList.remove('drag-over');

  if (!currentPinId) {
    alert('ピンが選択されていません');
    return;
  }

  const filePaths = [];

  // items からファイルを取り出してパスを取得する（最も確実な方法）
  if (e.dataTransfer && e.dataTransfer.items) {
    for (const item of e.dataTransfer.items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          const filePath = window.api.getPathForFile(file);
          if (filePath) {
            filePaths.push(filePath);
          }
        }
      }
    }
  }

  console.log('取得したファイルパス:', filePaths);

  // パスが取得できたらメインプロセスへ送信
  if (filePaths.length > 0) {
    const result = await window.api.addDroppedFiles(currentPinId, currentSubPath, filePaths);
    console.log('コピー結果:', result);

    if (result) {
      if (typeof refreshList === 'function') refreshList();
      if (typeof refreshPinList === 'function') refreshPinList();
    }
  }
});

map.on('click', async (e) => {
  if (isMovingPin) {
    if (currentPinId) {
      await updatePinCoords(currentPinId, e.latlng.lat, e.latlng.lng);
    }
    return;
  }

  // 重複作成防止（閾値チェック）
  const CLICK_THRESHOLD_DEGREE = 0.00015; 
  const existingPinId = Object.keys(pinsCache).find(id => {
    const pin = pinsCache[id];
    return Math.abs(pin.lat - e.latlng.lat) < CLICK_THRESHOLD_DEGREE &&
           Math.abs(pin.lng - e.latlng.lng) < CLICK_THRESHOLD_DEGREE;
  });

  if (existingPinId) {
    openPinPanel(existingPinId);
    return;
  }

  const { id, pinData } = await window.api.createPin({ lat: e.latlng.lat, lng: e.latlng.lng });
  pinsCache[id] = pinData;
  placeMarker(id, pinData);
  refreshPinList(); 
});

async function searchLocation() {
  const query = document.getElementById('search-input').value.trim();
  if (!query) return;

  const result = await window.api.searchLocation(query);
  if (result && typeof result.lat === 'number' && typeof result.lon === 'number') {
    map.flyTo([result.lat, result.lon], 15);
    return;
  }

  if (result && result.error === 'rate_limited') {
    alert('検索の間隔が短すぎます。少し待ってから再度お試しください。');
  } else if (result && result.error === 'not_found') {
    alert('場所が見つかりませんでした。');
  } else {
    alert('検索に失敗しました。');
  }
}

document.getElementById('search-btn').addEventListener('click', searchLocation);
document.getElementById('search-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchLocation();
});

// --- インポート / エクスポート処理 ---

// エクスポート：まずボタンを押してから、モーダルでピンを選択する
function renderExportPinList(filterQuery = '') {
  const container = document.getElementById('export-pin-list');
  container.innerHTML = '';

  const q = filterQuery.toLowerCase();
  const pinArray = Object.values(pinsCache).filter(p => !q || p.name.toLowerCase().includes(q));

  if (pinArray.length === 0) {
    container.innerHTML = '<p style="padding:10px; color:#999; font-size:13px;">該当するピンがありません。</p>';
    return;
  }

  pinArray.forEach(pin => {
    const div = document.createElement('div');
    div.style.padding = '4px 0';
    div.innerHTML = `
      <label style="font-size:13px; cursor:pointer;">
        <input type="checkbox" class="export-checkbox" value="${pin.id}" checked>
        📍 <b>${pin.name}</b> (${pin.lat.toFixed(3)}, ${pin.lng.toFixed(3)})
      </label>
    `;
    container.appendChild(div);
  });
}

document.getElementById('export-btn').addEventListener('click', () => {
  if (Object.keys(pinsCache).length === 0) {
    alert('エクスポートできるピンがありません。');
    return;
  }
  document.getElementById('export-search-input').value = '';
  renderExportPinList();
  document.getElementById('export-modal').style.display = 'flex';
});

document.getElementById('export-search-input').addEventListener('input', (e) => {
  renderExportPinList(e.target.value);
});

document.getElementById('export-select-all').addEventListener('click', () => {
  document.querySelectorAll('.export-checkbox').forEach(cb => cb.checked = true);
});
document.getElementById('export-deselect-all').addEventListener('click', () => {
  document.querySelectorAll('.export-checkbox').forEach(cb => cb.checked = false);
});
document.getElementById('export-cancel-btn').addEventListener('click', () => {
  document.getElementById('export-modal').style.display = 'none';
});

// モーダルで選択を確定 → ZIPで出力
document.getElementById('export-confirm-btn').addEventListener('click', async () => {
  const selectedCheckboxes = document.querySelectorAll('.export-checkbox:checked');
  const targetIds = Array.from(selectedCheckboxes).map(cb => cb.value);

  if (targetIds.length === 0) {
    alert('エクスポートするピンを選択してください。');
    return;
  }

  const exportPath = await window.api.selectExportZipPath();
  if (!exportPath) return;

  const zip = new JSZip();
  const exportPinsData = {};

  for (const pinId of targetIds) {
    if (!pinsCache[pinId]) continue;
    exportPinsData[pinId] = pinsCache[pinId];

    // ファイル実体の取得とZIP格納
    const files = await window.api.getPinFilesBinary(pinId);
    files.forEach(f => {
      zip.file(`files/${pinId}/${f.relPath}`, f.buffer);
    });
  }

  zip.file('pins.json', JSON.stringify(exportPinsData, null, 2));

  const content = await zip.generateAsync({ type: 'uint8array' });
  await window.api.writeZipFile(exportPath, content);

  document.getElementById('export-modal').style.display = 'none';
  alert(`選択した ${targetIds.length} 件のピンデータをエクスポートしました！`);
});

// ZIPを取り込み (Import)
let pendingImportData = null; // 一時保持用
let pendingConflictImport = null; // ファイル競合解決中のインポートデータ

// 同名ファイルが既にある場合の「別名で保存」用に、衝突しない相対パスを生成する
function generateUniqueRelPath(relPath, existingSet) {
  const lastSlash = relPath.lastIndexOf('/');
  const dir = lastSlash >= 0 ? relPath.slice(0, lastSlash + 1) : '';
  const fileName = lastSlash >= 0 ? relPath.slice(lastSlash + 1) : relPath;
  const dotIdx = fileName.lastIndexOf('.');
  const base = dotIdx > 0 ? fileName.slice(0, dotIdx) : fileName;
  const ext = dotIdx > 0 ? fileName.slice(dotIdx) : '';

  let counter = 1;
  let candidate = `${dir}${base} (取込${counter})${ext}`;
  while (existingSet.has(candidate)) {
    counter++;
    candidate = `${dir}${base} (取込${counter})${ext}`;
  }
  existingSet.add(candidate);
  return candidate;
}

document.getElementById('import-btn').addEventListener('click', async () => {
  const zipBuffer = await window.api.readImportZipFile();
  if (!zipBuffer) return;

  try {
    const zip = await JSZip.loadAsync(zipBuffer);
    const pinsJsonFile = zip.file('pins.json');
    if (!pinsJsonFile) {
      alert('無効なエクスポートデータです (pins.jsonが見つかりません)');
      return;
    }

    const pinsJsonStr = await pinsJsonFile.async('string');
    const importedPinsMap = JSON.parse(pinsJsonStr);
    const pinIds = Object.keys(importedPinsMap);

    if (pinIds.length === 0) {
      alert('取り込み可能なピンデータがありません。');
      return;
    }

    // ZIPからファイル群のバッファをパースして準備
    const pinFilesMap = {};
    for (const pinId of pinIds) {
      pinFilesMap[pinId] = [];
      const folderPrefix = `files/${pinId}/`;
      
      zip.folder(`files/${pinId}`).forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          pinFilesMap[pinId].push({
            relPath: relativePath,
            entry: zipEntry
          });
        }
      });
    }

    pendingImportData = { importedPinsMap, pinFilesMap };

    // インポート選択ダイアログを表示
    const container = document.getElementById('import-pin-list');
    container.innerHTML = '';

    pinIds.forEach(id => {
      const pin = importedPinsMap[id];
      const div = document.createElement('div');
      div.style.padding = '4px 0';
      div.innerHTML = `
        <label style="font-size:13px; cursor:pointer;">
          <input type="checkbox" class="import-checkbox" value="${id}" checked>
          📍 <b>${pin.name}</b> (${pin.lat.toFixed(3)}, ${pin.lng.toFixed(3)})
        </label>
      `;
      container.appendChild(div);
    });

    document.getElementById('import-modal').style.display = 'flex';

  } catch (err) {
    console.error(err);
    alert('ZIPファイルの読み込みに失敗しました。');
  }
});

// インポートダイアログの全選択/解除
document.getElementById('import-select-all').addEventListener('click', () => {
  document.querySelectorAll('.import-checkbox').forEach(cb => cb.checked = true);
});
document.getElementById('import-deselect-all').addEventListener('click', () => {
  document.querySelectorAll('.import-checkbox').forEach(cb => cb.checked = false);
});
document.getElementById('import-cancel-btn').addEventListener('click', () => {
  document.getElementById('import-modal').style.display = 'none';
  pendingImportData = null;
});

// インポートの確定実行：まず競合の有無を確認する
document.getElementById('import-confirm-btn').addEventListener('click', async () => {
  if (!pendingImportData) return;

  const selectedCheckboxes = document.querySelectorAll('.import-checkbox:checked');
  const targetIds = Array.from(selectedCheckboxes).map(cb => cb.value);

  if (targetIds.length === 0) {
    alert('取り込むピンを選択してください。');
    return;
  }

  const importPins = [];
  const importPinFilesMap = {};
  const conflicts = []; // { pinId, pinName, relPath }

  for (const id of targetIds) {
    const pinData = pendingImportData.importedPinsMap[id];
    importPins.push(pinData);

    // 取り込み先に既に存在するファイルの相対パス一覧を取得
    const existingRelPaths = new Set(await window.api.listPinRelPaths(id));

    // JSZipオブジェクトからバイナリバッファに変換
    const filesInfo = pendingImportData.pinFilesMap[id] || [];
    importPinFilesMap[id] = [];
    for (const item of filesInfo) {
      const buffer = await item.entry.async('arraybuffer');
      importPinFilesMap[id].push({ relPath: item.relPath, buffer });

      if (existingRelPaths.has(item.relPath)) {
        conflicts.push({
          pinId: id,
          pinName: pinData ? pinData.name : id,
          relPath: item.relPath,
          existingRelPaths // このピンの既存ファイル一覧（リネーム時の重複チェック用）
        });
      }
    }
  }

  document.getElementById('import-modal').style.display = 'none';

  if (conflicts.length === 0) {
    await finalizeImport(importPins, importPinFilesMap);
    return;
  }

  // 競合があれば、解決方法を選ぶモーダルへ引き継ぐ
  pendingConflictImport = { importPins, importPinFilesMap, conflicts };
  renderConflictModal(conflicts);
  document.getElementById('conflict-modal').style.display = 'flex';
});

function renderConflictModal(conflicts) {
  const container = document.getElementById('conflict-list');
  container.innerHTML = '';

  conflicts.forEach((c, idx) => {
    const div = document.createElement('div');
    div.style.padding = '6px 0';
    div.style.borderBottom = '1px solid #eee';
    div.innerHTML = `
      <div style="font-size:12px; margin-bottom:4px;">
        📍 <b>${c.pinName}</b> ／ ${c.relPath}
      </div>
      <select class="conflict-resolution" data-idx="${idx}" style="width:100%; padding:4px; font-size:12px;">
        <option value="overwrite">上書きする</option>
        <option value="skip">スキップする（取り込まない）</option>
        <option value="rename">別名で保存する（両方残す）</option>
      </select>
    `;
    container.appendChild(div);
  });
}

document.getElementById('conflict-all-overwrite').addEventListener('click', () => {
  document.querySelectorAll('.conflict-resolution').forEach(sel => sel.value = 'overwrite');
});
document.getElementById('conflict-all-skip').addEventListener('click', () => {
  document.querySelectorAll('.conflict-resolution').forEach(sel => sel.value = 'skip');
});
document.getElementById('conflict-all-rename').addEventListener('click', () => {
  document.querySelectorAll('.conflict-resolution').forEach(sel => sel.value = 'rename');
});

document.getElementById('conflict-cancel-btn').addEventListener('click', () => {
  document.getElementById('conflict-modal').style.display = 'none';
  pendingConflictImport = null;
  pendingImportData = null;
});

document.getElementById('conflict-confirm-btn').addEventListener('click', async () => {
  if (!pendingConflictImport) return;

  const { importPins, importPinFilesMap, conflicts } = pendingConflictImport;
  const selects = document.querySelectorAll('.conflict-resolution');

  selects.forEach(sel => {
    const idx = Number(sel.dataset.idx);
    const conflict = conflicts[idx];
    const action = sel.value;
    const files = importPinFilesMap[conflict.pinId];

    if (action === 'skip') {
      const i = files.findIndex(f => f.relPath === conflict.relPath);
      if (i !== -1) files.splice(i, 1);
    } else if (action === 'rename') {
      const target = files.find(f => f.relPath === conflict.relPath);
      if (target) {
        target.relPath = generateUniqueRelPath(conflict.relPath, conflict.existingRelPaths);
      }
    }
    // 'overwrite' の場合は relPath をそのまま使う（main.js側で自動的に上書きされる）
  });

  document.getElementById('conflict-modal').style.display = 'none';
  pendingConflictImport = null;

  await finalizeImport(importPins, importPinFilesMap);
});

async function finalizeImport(importPins, importPinFilesMap) {
  const result = await window.api.importPinsData(importPins, importPinFilesMap);
  pendingImportData = null;

  if (result && result.skipped > 0) {
    alert(`取り込みが完了しました（成功: ${result.imported}件 / 不正なデータのためスキップ: ${result.skipped}件）`);
  } else {
    alert('ピンとファイルの取り込みが完了しました！');
  }

  // 地図とピン一覧を更新
  pinsCache = await window.api.getPins();
  Object.keys(pinsCache).forEach(id => placeMarker(id, pinsCache[id]));
  refreshPinList();
}
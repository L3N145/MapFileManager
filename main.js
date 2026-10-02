const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');

let mainWindow;
const DATA_DIR = path.join(app.getPath('userData'), 'MapPinsData');
const PINS_FILE = path.join(DATA_DIR, 'pins.json');

async function ensureDataDir() {
  await fs.ensureDir(DATA_DIR);
  if (!await fs.pathExists(PINS_FILE)) {
    await fs.writeJson(PINS_FILE, {});
  }
}

// --- セキュリティ用ヘルパー ---

// ピンIDは 'pin_' + タイムスタンプ (+ 'pin_' + タイムスタンプ + '_' + ランダム8桁hex) の
// いずれかの形式のみ受け付ける。旧形式（ランダム要素なし）は、アップデート前に
// 作成された既存データとの互換性のために引き続き許可している。
function isValidPinId(id) {
  return typeof id === 'string' && /^pin_[0-9]{1,20}(_[0-9a-f]{8})?$/.test(id);
}

// ファイル名・フォルダ名として安全な文字列かどうかを検証する。
// パス区切り文字、'.' '..'、制御文字、OSで問題になりやすい記号を拒否する。
function sanitizeItemName(name) {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (trimmed === '.' || trimmed === '..') return null;
  if (trimmed.length > 200) return null;
  if (/[\\/]/.test(trimmed)) return null;
  if (/[:*?"<>|\x00-\x1f]/.test(trimmed)) return null;
  return trimmed;
}

// 複数のパス片を結合したうえで、結果が必ず baseDir の内側に収まっていることを
// 検証する（Zip Slip / パストラバーサル対策）。範囲外なら例外を投げる。
function resolveSafePath(baseDir, ...segments) {
  const normalizedBase = path.resolve(baseDir);
  const target = path.resolve(normalizedBase, ...segments);
  if (target !== normalizedBase && !target.startsWith(normalizedBase + path.sep)) {
    throw new Error('不正なパスが検出されました');
  }
  return target;
}

// インポートされたピンオブジェクトの形式を最低限検証する
function sanitizeImportedPin(pin, fallbackId) {
  if (!pin || typeof pin !== 'object') return null;
  const lat = Number(pin.lat);
  const lng = Number(pin.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const allowedColors = ['blue', 'green', 'red', 'yellow', 'violet', 'black'];
  const color = allowedColors.includes(pin.color) ? pin.color : 'blue';
  const name = typeof pin.name === 'string' && pin.name.trim() ? pin.name.trim().slice(0, 200) : '無題の地点';

  return {
    id: fallbackId,
    name,
    lat,
    lng,
    color,
    createdAt: typeof pin.createdAt === 'string' ? pin.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(async () => {
  await ensureDataDir();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// 新規ウィンドウ・ナビゲーションを開かせない（外部URLへの脱線防止）
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (navEvent, url) => {
    if (!url.startsWith('file://')) navEvent.preventDefault();
  });
});

// --- 地名検索（Nominatim）---
// レンダラーからは fetch で User-Agent を設定できない（ブラウザの制限）ため、
// メインプロセス側でリクエストし、レンダラーの connect-src 権限を一切不要にする
let lastSearchAt = 0;
const SEARCH_MIN_INTERVAL_MS = 1000; // Nominatim利用ポリシー：連続リクエストを避ける

ipcMain.handle('search-location', async (event, query) => {
  if (typeof query !== 'string' || !query.trim()) return { error: 'empty' };

  const now = Date.now();
  if (now - lastSearchAt < SEARCH_MIN_INTERVAL_MS) {
    return { error: 'rate_limited' };
  }
  lastSearchAt = now;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}`,
      { headers: { 'User-Agent': 'MapFileManager/1.0 (local desktop app; contact: set-your-contact-here)' } }
    );
    if (!res.ok) return { error: 'http_error' };
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return { error: 'not_found' };
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch (err) {
    return { error: 'network_error' };
  }
});

// --- IPCハンドラー ---

// ピン情報操作
ipcMain.handle('get-pins', async () => {
  await ensureDataDir();
  return await fs.readJson(PINS_FILE);
});

ipcMain.handle('save-pins', async (event, pins) => {
  await fs.writeJson(PINS_FILE, pins, { spaces: 2 });
  return true;
});

ipcMain.handle('create-pin', async (event, { lat, lng, lang }) => {
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) return null;

  const pins = await fs.readJson(PINS_FILE);
  // タイムスタンプだけだと、別々のPCで極めて近いタイミングに作成された
  // ピン同士でIDが衝突する可能性がゼロではないため、ランダムな8桁hexを付与する
  const id = 'pin_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
  const now = new Date().toISOString();
  const defaultNamePrefix = lang === 'en' ? 'Point_' : '地点_';

  pins[id] = {
    id,
    name: `${defaultNamePrefix}${Object.keys(pins).length + 1}`,
    lat: numLat,
    lng: numLng,
    color: 'blue',
    createdAt: now,
    updatedAt: now
  };

  await fs.writeJson(PINS_FILE, pins, { spaces: 2 });
  await fs.ensureDir(path.join(DATA_DIR, id));
  return { id, pinData: pins[id] };
});

ipcMain.handle('update-pin-location', async (event, { id, lat, lng }) => {
  if (!isValidPinId(id)) return false;
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) return false;

  const pins = await fs.readJson(PINS_FILE);
  if (pins[id]) {
    pins[id].lat = numLat;
    pins[id].lng = numLng;
    pins[id].updatedAt = new Date().toISOString();
    await fs.writeJson(PINS_FILE, pins, { spaces: 2 });
  }
  return true;
});

ipcMain.handle('rename-pin', async (event, { id, newName }) => {
  if (!isValidPinId(id)) return false;
  if (typeof newName !== 'string' || !newName.trim()) return false;

  const pins = await fs.readJson(PINS_FILE);
  if (pins[id]) {
    pins[id].name = newName.trim().slice(0, 200);
    pins[id].updatedAt = new Date().toISOString();
    await fs.writeJson(PINS_FILE, pins, { spaces: 2 });
  }
  return true;
});

ipcMain.handle('update-pin-color', async (event, { id, color }) => {
  if (!isValidPinId(id)) return false;
  const allowedColors = ['blue', 'green', 'red', 'yellow', 'violet', 'black'];
  if (!allowedColors.includes(color)) return false;

  const pins = await fs.readJson(PINS_FILE);
  if (pins[id]) {
    pins[id].color = color;
    pins[id].updatedAt = new Date().toISOString();
    await fs.writeJson(PINS_FILE, pins, { spaces: 2 });
  }
  return true;
});

ipcMain.handle('delete-pin', async (event, id) => {
  if (!isValidPinId(id)) return false;

  const pins = await fs.readJson(PINS_FILE);
  delete pins[id];
  await fs.writeJson(PINS_FILE, pins, { spaces: 2 });

  const pinDir = resolveSafePath(DATA_DIR, id);
  if (await fs.pathExists(pinDir)) {
    await shell.trashItem(pinDir);
  }
  return true;
});

// ファイル・フォルダ操作
ipcMain.handle('read-folder', async (event, pinId, subPath = '') => {
  if (!isValidPinId(pinId)) return [];
  let targetDir;
  try {
    targetDir = resolveSafePath(DATA_DIR, pinId, subPath);
  } catch {
    return [];
  }
  if (!await fs.pathExists(targetDir)) return [];

  const items = await fs.readdir(targetDir, { withFileTypes: true });
  return items.map(item => ({
    name: item.name,
    isDirectory: item.isDirectory()
  }));
});

ipcMain.handle('add-file', async (event, pinId, subPath = '') => {
  if (!isValidPinId(pinId)) return false;
  let targetDir;
  try {
    targetDir = resolveSafePath(DATA_DIR, pinId, subPath);
  } catch {
    return false;
  }

  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections']
  });
  if (canceled || filePaths.length === 0) return false;

  await fs.ensureDir(targetDir);

  for (const filePath of filePaths) {
    const fileName = path.basename(filePath);
    await fs.copy(filePath, path.join(targetDir, fileName));
  }

  // 最終更新日時の更新
  const pins = await fs.readJson(PINS_FILE);
  if (pins[pinId]) {
    pins[pinId].updatedAt = new Date().toISOString();
    await fs.writeJson(PINS_FILE, pins, { spaces: 2 });
  }

  return true;
});

ipcMain.handle('add-dropped-files', async (event, pinId, subPath, filePaths) => {
  if (!isValidPinId(pinId)) return false;
  if (!Array.isArray(filePaths) || filePaths.length === 0) return false;

  let targetDir;
  try {
    targetDir = resolveSafePath(DATA_DIR, pinId, subPath || '');
  } catch {
    return false;
  }
  await fs.ensureDir(targetDir);

  // ループを1つにまとめ、文字列チェックを行ってからコピーします
  for (const filePath of filePaths) {
    // undefined や文字列以外をスキップしてエラーを防ぐ
    if (typeof filePath !== 'string') continue;

    const fileName = path.basename(filePath);
    await fs.copy(filePath, path.join(targetDir, fileName));
  }

  const pins = await fs.readJson(PINS_FILE);
  if (pins[pinId]) {
    pins[pinId].updatedAt = new Date().toISOString();
    await fs.writeJson(PINS_FILE, pins, { spaces: 2 });
  }

  return true;
});

ipcMain.handle('create-new-file', async (event, pinId, subPath = '', fileName) => {
  if (!isValidPinId(pinId)) return false;
  const safeName = sanitizeItemName(fileName);
  if (!safeName) return false;

  let targetDir;
  try {
    targetDir = resolveSafePath(DATA_DIR, pinId, subPath);
  } catch {
    return false;
  }
  await fs.ensureDir(targetDir);
  await fs.writeFile(path.join(targetDir, safeName), '');

  const pins = await fs.readJson(PINS_FILE);
  if (pins[pinId]) {
    pins[pinId].updatedAt = new Date().toISOString();
    await fs.writeJson(PINS_FILE, pins, { spaces: 2 });
  }
  return true;
});

ipcMain.handle('create-sub-folder', async (event, pinId, subPath = '', folderName) => {
  if (!isValidPinId(pinId)) return false;
  const safeName = sanitizeItemName(folderName);
  if (!safeName) return false;

  let targetDir;
  try {
    targetDir = resolveSafePath(DATA_DIR, pinId, subPath, safeName);
  } catch {
    return false;
  }
  await fs.ensureDir(targetDir);

  const pins = await fs.readJson(PINS_FILE);
  if (pins[pinId]) {
    pins[pinId].updatedAt = new Date().toISOString();
    await fs.writeJson(PINS_FILE, pins, { spaces: 2 });
  }
  return true;
});

ipcMain.handle('open-item', async (event, pinId, subPath = '', itemName) => {
  if (!isValidPinId(pinId)) return false;
  let itemPath;
  try {
    itemPath = resolveSafePath(DATA_DIR, pinId, subPath, itemName);
  } catch {
    return false;
  }
  await shell.openPath(itemPath);
  return true;
});

ipcMain.handle('rename-item', async (event, pinId, subPath = '', oldName, newName) => {
  if (!isValidPinId(pinId)) return false;
  const safeNewName = sanitizeItemName(newName);
  if (!safeNewName) return false;

  let oldPath, newPath;
  try {
    oldPath = resolveSafePath(DATA_DIR, pinId, subPath, oldName);
    newPath = resolveSafePath(DATA_DIR, pinId, subPath, safeNewName);
  } catch {
    return false;
  }
  await fs.rename(oldPath, newPath);

  const pins = await fs.readJson(PINS_FILE);
  if (pins[pinId]) {
    pins[pinId].updatedAt = new Date().toISOString();
    await fs.writeJson(PINS_FILE, pins, { spaces: 2 });
  }
  return true;
});

ipcMain.handle('delete-item', async (event, pinId, subPath = '', itemName) => {
  if (!isValidPinId(pinId)) return false;
  let itemPath;
  try {
    itemPath = resolveSafePath(DATA_DIR, pinId, subPath, itemName);
  } catch {
    return false;
  }
  await shell.trashItem(itemPath);

  const pins = await fs.readJson(PINS_FILE);
  if (pins[pinId]) {
    pins[pinId].updatedAt = new Date().toISOString();
    await fs.writeJson(PINS_FILE, pins, { spaces: 2 });
  }
  return true;
});

ipcMain.handle('open-folder-in-explorer', async (event, pinId, subPath = '') => {
  if (!isValidPinId(pinId)) return false;
  let targetDir;
  try {
    targetDir = resolveSafePath(DATA_DIR, pinId, subPath);
  } catch {
    return false;
  }
  await fs.ensureDir(targetDir);
  await shell.openPath(targetDir);
  return true;
});

// 指定ピンのフォルダ内に既に存在する相対パス一覧を返す
// （インポート時のファイル名衝突チェックに使用）
ipcMain.handle('list-pin-relpaths', async (event, pinId) => {
  if (!isValidPinId(pinId)) return [];
  let pinDir;
  try {
    pinDir = resolveSafePath(DATA_DIR, pinId);
  } catch {
    return [];
  }
  if (!await fs.pathExists(pinDir)) return [];

  const relPaths = [];
  async function walkDir(currentDir, relativePath = '') {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walkDir(fullPath, relPath);
      } else {
        relPaths.push(relPath);
      }
    }
  }
  await walkDir(pinDir);
  return relPaths;
});

// --- インポート/エクスポート関連 IPC ---

// 1. エクスポート先のZIPパスを選択
ipcMain.handle('select-export-zip-path', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'ピンデータをエクスポート (ZIP)',
    defaultPath: `MapPins_Export_${Date.now()}.zip`,
    filters: [{ name: 'ZIP Files', extensions: ['zip'] }]
  });
  return canceled ? null : filePath;
});

// 2. 指定ピンの全ファイル（フォルダ階層含む）バイナリリスト取得
ipcMain.handle('get-pin-files-binary', async (event, pinId) => {
  if (!isValidPinId(pinId)) return [];
  const pinDir = resolveSafePath(DATA_DIR, pinId);
  if (!await fs.pathExists(pinDir)) return [];

  const filesList = [];

  async function walkDir(currentDir, relativePath = '') {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walkDir(fullPath, relPath);
      } else {
        const buffer = await fs.readFile(fullPath);
        filesList.push({ relPath, buffer });
      }
    }
  }

  await walkDir(pinDir);
  return filesList;
});

// 3. ZIPデータをファイル出力
ipcMain.handle('write-zip-file', async (event, filePath, zipBuffer) => {
  await fs.writeFile(filePath, Buffer.from(zipBuffer));
  return true;
});

// 4. インポートするZIPファイルの選択と読み込み
ipcMain.handle('read-import-zip-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'インポートするZIPファイルを選択',
    properties: ['openFile'],
    filters: [{ name: 'ZIP Files', extensions: ['zip'] }]
  });
  if (canceled || filePaths.length === 0) return null;

  const buffer = await fs.readFile(filePaths[0]);
  return buffer;
});

// 5. インポート実行（ピン情報追加＋解凍したファイルを保存）
// ZIPは第三者から受け取る可能性があるため、ここが最も信頼できない入力。
// ・ピンIDの形式チェック（プロトタイプ汚染／パス脱出の防止）
// ・各ファイルの展開先が pinDir の内側に収まっているかの検証（Zip Slip対策）
// ・ピンの各フィールドの型チェック
// を必ず行う。
ipcMain.handle('import-pins-data', async (event, importPins, pinFilesMap) => {
  if (!Array.isArray(importPins)) return { imported: 0, skipped: 0 };

  await ensureDataDir();
  const existingPins = await fs.readJson(PINS_FILE);

  let imported = 0;
  let skipped = 0;

  for (const rawPin of importPins) {
    const pinId = rawPin && rawPin.id;

    if (!isValidPinId(pinId)) {
      skipped++;
      continue;
    }

    const cleanPin = sanitizeImportedPin(rawPin, pinId);
    if (!cleanPin) {
      skipped++;
      continue;
    }

    let pinDir;
    try {
      pinDir = resolveSafePath(DATA_DIR, pinId);
    } catch {
      skipped++;
      continue;
    }
    await fs.ensureDir(pinDir);

    const files = Array.isArray(pinFilesMap[pinId]) ? pinFilesMap[pinId] : [];
    for (const file of files) {
      if (!file || typeof file.relPath !== 'string') continue;

      let destPath;
      try {
        // relPath はZIP内の任意の文字列なので、ここで pinDir の外に
        // 出ていないかを必ず検証する（Zip Slip対策）
        destPath = resolveSafePath(pinDir, file.relPath);
      } catch {
        continue; // このファイルだけスキップして継続
      }

      await fs.ensureDir(path.dirname(destPath));
      await fs.writeFile(destPath, Buffer.from(file.buffer));
    }

    existingPins[pinId] = cleanPin;
    imported++;
  }

  await fs.writeJson(PINS_FILE, existingPins, { spaces: 2 });
  return { imported, skipped };
});

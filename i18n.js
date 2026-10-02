// --- 多言語対応 (i18n) ---
// renderer.js より先に読み込まれる想定。t() と applyStaticI18n() をグローバルに提供する。

const I18N = {
  ja: {
    langToggleBtn: '🌐 English',
    movingBanner: '📍 位置の変更中：地図をクリックするかピンをドラッグして移動してください',
    pinListBtn: '📋 ピン一覧',
    mapSearchPlaceholder: '場所・駅名を検索（例: 東京駅）',
    mapSearchBtn: '検索',
    leftPanelTitle: '📍 登録済みピン',
    closeBtn: '閉じる',
    searchByNamePlaceholder: '名前で検索...',
    sortLabel: '並び替え:',
    sortNameAsc: '50音順 (昇順)',
    sortNameDesc: '50音順 (降順)',
    sortCreatedDesc: '作成日 (新しい順)',
    sortCreatedAsc: '作成日 (古い順)',
    sortUpdatedDesc: '最終更新 (新しい順)',
    sortUpdatedAsc: '最終更新 (古い順)',
    selectAllBtn: '全選択',
    deselectAllBtn: '全解除',
    exportBtn: '📤 エクスポート',
    importBtn: '📥 インポート',
    panelTitleDefault: '📍 選択地点',
    toggleSettingsBtn: '⚙️ ピンの設定',
    pinSettingsTitle: 'ピンの管理設定',
    renamePinBtn: '✏️ ピンの名前を変更',
    colorLabel: '色を変更:',
    movePinBtn: '📍 位置を変更する',
    moveConfirmBtn: '✅ 位置変更を決定',
    deletePinBtn: '🗑️ ピンを削除',
    btnUp: '⬆️ 戻る',
    addFileBtn: '➕ 追加',
    newFileBtn: '📄 新規',
    newDirBtn: '📁 新規',
    openExplorerBtn: '📁 フォルダを開く',
    cancelBtn: 'キャンセル',
    promptOkBtn: 'OK',
    exportModalTitle: '📤 エクスポートするピンの選択',
    exportConfirmBtn: 'エクスポート',
    conflictModalTitle: '⚠️ 同名ファイルが見つかりました',
    conflictModalDesc: '取り込み先に既に同じ名前のファイルがあります。ファイルごとに操作を選択してください。',
    conflictAllOverwrite: 'すべて上書き',
    conflictAllSkip: 'すべてスキップ',
    conflictAllRename: 'すべて別名で保存',
    conflictConfirmBtn: 'この内容で取り込む',
    importModalTitle: '📥 インポートするピンの選択',
    importConfirmBtn: '取り込む',

    // renderer.js 側で動的に使うメッセージ
    noPinsRegistered: '登録されたピンがありません。',
    itemsCount: '📁 {count} 項目',
    deletePinTitleAttr: 'ピンを削除',
    confirmDeletePinWithData: '「{name}」とデータを削除しますか？',
    rootLevel: 'ルート階層',
    emptyFolderMessage: '空です。<br>ここにファイルをドラッグ＆ドロップできます。',
    renameBtnLabel: '名前変更',
    promptRenameItem: '新しい名前を入力してください',
    invalidNameError: 'その名前は使用できません（/ や \\、.. などは使えません）。',
    deleteBtnLabel: '削除',
    confirmDeleteItemToTrash: '「{name}」をごみ箱へ移動しますか？',
    promptRenamePin: 'この場所の新しい名前を入力してください',
    promptNewFileName: '作成するファイル名（例: メモ.txt）',
    promptNewFolderName: '作成するフォルダ名',
    confirmDeletePinAndData: 'このピンと、中身のデータをすべてごみ箱へ移動しますか？',
    noPinSelected: 'ピンが選択されていません',
    searchIntervalTooShort: '検索の間隔が短すぎます。少し待ってから再度お試しください。',
    locationNotFound: '場所が見つかりませんでした。',
    searchFailed: '検索に失敗しました。',
    noMatchingPins: '該当するピンがありません。',
    noPinsToExport: 'エクスポートできるピンがありません。',
    selectPinsToExport: 'エクスポートするピンを選択してください。',
    exportSuccess: '選択した {count} 件のピンデータをエクスポートしました！',
    invalidExportData: '無効なエクスポートデータです (pins.jsonが見つかりません)',
    noImportablePins: '取り込み可能なピンデータがありません。',
    zipReadFailed: 'ZIPファイルの読み込みに失敗しました。',
    selectPinsToImport: '取り込むピンを選択してください。',
    conflictOptionOverwrite: '上書きする',
    conflictOptionSkip: 'スキップする（取り込まない）',
    conflictOptionRename: '別名で保存する（両方残す）',
    renameSuffixTemplate: '(取込{n})',
    importSuccessWithSkipped: '取り込みが完了しました（成功: {imported}件 / 不正なデータのためスキップ: {skipped}件）',
    importSuccess: 'ピンとファイルの取り込みが完了しました！'
  },
  en: {
    langToggleBtn: '🌐 日本語',
    movingBanner: '📍 Moving pin: click the map or drag the pin to set a new location',
    pinListBtn: '📋 Pin List',
    mapSearchPlaceholder: 'Search a place or station (e.g. Tokyo Station)',
    mapSearchBtn: 'Search',
    leftPanelTitle: '📍 Saved Pins',
    closeBtn: 'Close',
    searchByNamePlaceholder: 'Search by name...',
    sortLabel: 'Sort:',
    sortNameAsc: 'Name (A→Z)',
    sortNameDesc: 'Name (Z→A)',
    sortCreatedDesc: 'Created (newest)',
    sortCreatedAsc: 'Created (oldest)',
    sortUpdatedDesc: 'Updated (newest)',
    sortUpdatedAsc: 'Updated (oldest)',
    selectAllBtn: 'Select All',
    deselectAllBtn: 'Deselect All',
    exportBtn: '📤 Export',
    importBtn: '📥 Import',
    panelTitleDefault: '📍 Selected Location',
    toggleSettingsBtn: '⚙️ Pin Settings',
    pinSettingsTitle: 'Pin Management',
    renamePinBtn: '✏️ Rename Pin',
    colorLabel: 'Change color:',
    movePinBtn: '📍 Move Location',
    moveConfirmBtn: '✅ Confirm New Location',
    deletePinBtn: '🗑️ Delete Pin',
    btnUp: '⬆️ Back',
    addFileBtn: '➕ Add',
    newFileBtn: '📄 New File',
    newDirBtn: '📁 New Folder',
    openExplorerBtn: '📁 Open Folder',
    cancelBtn: 'Cancel',
    promptOkBtn: 'OK',
    exportModalTitle: '📤 Select Pins to Export',
    exportConfirmBtn: 'Export',
    conflictModalTitle: '⚠️ Duplicate Files Found',
    conflictModalDesc: 'Some files already exist at the destination. Choose an action for each file.',
    conflictAllOverwrite: 'Overwrite All',
    conflictAllSkip: 'Skip All',
    conflictAllRename: 'Keep Both (Rename All)',
    conflictConfirmBtn: 'Import With These Choices',
    importModalTitle: '📥 Select Pins to Import',
    importConfirmBtn: 'Import',

    noPinsRegistered: 'No pins have been registered yet.',
    itemsCount: '📁 {count} items',
    deletePinTitleAttr: 'Delete pin',
    confirmDeletePinWithData: 'Delete "{name}" and all of its data?',
    rootLevel: 'Root',
    emptyFolderMessage: 'This folder is empty.<br>You can drag and drop files here.',
    renameBtnLabel: 'Rename',
    promptRenameItem: 'Enter a new name',
    invalidNameError: 'That name cannot be used (/, \\, and .. are not allowed).',
    deleteBtnLabel: 'Delete',
    confirmDeleteItemToTrash: 'Move "{name}" to the trash?',
    promptRenamePin: 'Enter a new name for this location',
    promptNewFileName: 'File name to create (e.g. notes.txt)',
    promptNewFolderName: 'Folder name to create',
    confirmDeletePinAndData: 'Move this pin and all of its data to the trash?',
    noPinSelected: 'No pin is selected',
    searchIntervalTooShort: 'Please wait a moment before searching again.',
    locationNotFound: 'Location not found.',
    searchFailed: 'Search failed.',
    noMatchingPins: 'No matching pins.',
    noPinsToExport: 'There are no pins to export.',
    selectPinsToExport: 'Please select at least one pin to export.',
    exportSuccess: 'Exported {count} pin(s) successfully!',
    invalidExportData: 'Invalid export file (pins.json not found).',
    noImportablePins: 'No importable pin data was found.',
    zipReadFailed: 'Failed to read the ZIP file.',
    selectPinsToImport: 'Please select at least one pin to import.',
    conflictOptionOverwrite: 'Overwrite',
    conflictOptionSkip: 'Skip (do not import)',
    conflictOptionRename: 'Keep both (rename)',
    renameSuffixTemplate: '(imported {n})',
    importSuccessWithSkipped: 'Import complete (succeeded: {imported}, skipped due to invalid data: {skipped})',
    importSuccess: 'Pins and files imported successfully!'
  }
};

// exe化した環境などでは localStorage への書き込み/読み込みが失敗することがある
// （インストール先フォルダの権限や、ストレージのパーティション分けの都合など）。
// ここで例外が発生すると i18n.js 全体が止まってしまうため、必ず try/catch で保護する。
function getSavedLang() {
  try {
    return localStorage.getItem('mapfileman_lang');
  } catch (e) {
    console.error('localStorageが利用できません。言語設定は保存されません。', e);
    return null;
  }
}

function saveLang(lang) {
  try {
    localStorage.setItem('mapfileman_lang', lang);
  } catch (e) {
    console.error('localStorageが利用できません。言語設定は保存されません。', e);
  }
}

let currentLang = getSavedLang() || 'ja';

function t(key, vars) {
  const dict = I18N[currentLang] || I18N.ja;
  let str = dict[key] !== undefined ? dict[key] : (I18N.ja[key] !== undefined ? I18N.ja[key] : key);
  if (vars) {
    Object.keys(vars).forEach(k => {
      str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
    });
  }
  return str;
}

// data-i18n / data-i18n-placeholder が付いた静的要素をまとめて更新する
function applyStaticI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.documentElement.lang = currentLang;
}

// 言語を切り替える。renderer.js 側で onLanguageChanged() を定義しておくと、
// 動的に生成されるピン一覧・ファイル一覧なども合わせて再描画される。
function setLang(lang) {
  currentLang = (lang === 'en') ? 'en' : 'ja';
  saveLang(currentLang);
  applyStaticI18n();
  if (typeof onLanguageChanged === 'function') onLanguageChanged();
}

// 静的文言の適用と言語切り替えボタンの初期化はここで行う。
// renderer.js より先に読み込まれるため、renderer.js側でエラーが起きても
// 表示言語の切り替え自体は独立して機能する。
applyStaticI18n();
const langToggleBtnEl = document.getElementById('lang-toggle-btn');
if (langToggleBtnEl) {
  langToggleBtnEl.addEventListener('click', () => {
    setLang(currentLang === 'ja' ? 'en' : 'ja');
  });
} else {
  console.error('lang-toggle-btn が見つかりません。index.html を確認してください。');
}

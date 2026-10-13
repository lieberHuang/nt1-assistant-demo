/* Preview workspace tools are independent from patient demo state. */
(() => {
  'use strict';
  const input = document.getElementById('notesInput');
  const saveButton = document.getElementById('saveNotesButton');
  const status = document.getElementById('notesStatus');
  const storageHint = document.getElementById('notesStorageHint');
  const SAVED_KEY = 'knowdrug-nt1-workspace-notes-v1';
  const DRAFT_KEY = 'knowdrug-nt1-workspace-draft-v1';
  const hasServer = /^https?:$/.test(location.protocol) && ['127.0.0.1','localhost','[::1]'].includes(location.hostname);
  let savedText = '', savedAt = '', saving = false;
  const stored = key => { try {return JSON.parse(localStorage.getItem(key));} catch {return null;} };
  const store = (key, value) => { try {localStorage.setItem(key, JSON.stringify(value));return true;} catch {return false;} };
  const removeDraft = () => {try {localStorage.removeItem(DRAFT_KEY);} catch {}};
  const time = value => new Date(value).toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
  function update() {
    document.getElementById('notesCount').textContent = `${input.value.length} / 20000`;
    if (!saving) status.textContent = input.value !== savedText ? '有未保存的修改' : savedAt ? `已保存 · ${time(savedAt)}` : '尚未保存说明';
    status.dataset.state = input.value !== savedText ? 'dirty' : 'saved';
  }
  async function load() {
    const cached = stored(SAVED_KEY);
    let note = cached || {text:'',updatedAt:''};
    if (hasServer) {
      try {
        const response = await fetch('/api/notes', {cache:'no-store'});
        if (!response.ok) throw new Error('read failed');
        note = await response.json();
        storageHint.textContent = '保存至项目目录 .local/notes.json，刷新、重启服务或换浏览器可继续读取。';
      } catch {
        storageHint.textContent = '未连接说明保存服务。可继续编辑，并重试保存或导出文本。';
      }
    } else storageHint.textContent = location.protocol==='file:' ? '当前以文件方式打开，说明保存至此浏览器。使用本地地址可保存到项目目录。' : '说明保存在当前浏览器，刷新后可继续读取；可导出文本。';
    savedText = typeof note.text === 'string' ? note.text : '';
    savedAt = note.updatedAt || '';
    const draft = stored(DRAFT_KEY);
    // Drafts only override the saved copy when they were based on that exact copy.
    const restoreDraft = draft && draft.baseText === savedText && draft.text !== savedText;
    if (!input.value) input.value = restoreDraft ? draft.text : savedText;
    update();
    if (restoreDraft) status.textContent = '已恢复未保存的草稿';
  }
  async function saveNotes() {
    if (saving) return;
    const text = input.value;
    saving = true;saveButton.disabled = true;status.textContent = '正在保存…';
    try {
      let note = {text,updatedAt:new Date().toISOString()};
      if (hasServer) {
        const response = await fetch('/api/notes', {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});
        if (!response.ok) throw new Error('server write failed');
        note = await response.json();
      } else if (!store(SAVED_KEY, note)) throw new Error('browser write failed');
      savedText = note.text;savedAt = note.updatedAt;
      store(SAVED_KEY, note);
      if (input.value === savedText) removeDraft();
      else store(DRAFT_KEY,{text:input.value,baseText:savedText});
      saving = false;update();
    } catch {
      saving = false;update();status.textContent = '保存失败，请重试或导出文本';status.dataset.state = 'error';
    } finally {saveButton.disabled = false;}
  }
  input.addEventListener('input', () => {store(DRAFT_KEY,{text:input.value,baseText:savedText});update();});
  saveButton.addEventListener('click', saveNotes);
  input.addEventListener('keydown', e => {if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {e.preventDefault();saveNotes();}});
  document.getElementById('exportNotesButton').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([input.value],{type:'text/plain;charset=utf-8'}));
    const a = document.createElement('a');a.href = url;a.download = 'NT1助手-演示说明.txt';a.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  });
  function fitDevice() {
    const isMobile = window.innerWidth <= 760;
    const scale = Math.min(1, Math.max(.3, (window.innerHeight - 90) / 890), Math.max(.3, (window.innerWidth - 40) / 418));
    document.documentElement.style.setProperty('--device-scale',scale);
    document.getElementById('deviceScaleLabel').textContent = `· ${Math.round(scale*100)}%`;
    document.getElementById('compactNotes').hidden = window.innerWidth > 1130;
    if (!isMobile && document.getElementById('notesPanel').classList.contains('notes-expanded')) closeNotes();
  }
  function closeNotes() {
    document.getElementById('notesPanel').classList.remove('notes-expanded');
    document.getElementById('notesBackdrop')?.remove();
    document.getElementById('notesCloseButton')?.remove();
  }
  document.getElementById('compactNotesButton').addEventListener('click', () => {
    const panel = document.getElementById('notesPanel');if(panel.classList.contains('notes-expanded'))return;
    panel.classList.add('notes-expanded');
    const backdrop = document.createElement('div');backdrop.id = 'notesBackdrop';backdrop.addEventListener('click',closeNotes);document.body.append(backdrop);
    const close = document.createElement('button');close.id = 'notesCloseButton';close.textContent = '关闭说明';close.addEventListener('click',closeNotes);panel.append(close);
    input.focus();
  });
  document.addEventListener('keydown', e => {if(e.key==='Escape')closeNotes();});
  window.addEventListener('resize',fitDevice);
  fitDevice();load();
})();

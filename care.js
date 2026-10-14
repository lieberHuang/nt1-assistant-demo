/* Mianbao care journeys: articles, guided applications, and locally stored records. */
window.createCareExperience = function(api) {
  'use strict';
  const {esc,icon} = api;
  const $ = s => document.querySelector(s);
  const uid = prefix => prefix+'-'+(globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2));
  const localTime = (date = new Date()) => {const d=new Date(date.getTime()-date.getTimezoneOffset()*60000);return d.toISOString().slice(0,16);};
  const dateText = value => new Date(value).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
  const sheep = (className='') => `<img class="${className}" src="assets/mianbao-doctor.webp" alt="眠宝">`;
  const bot = content => `<div class="message"><span class="bot-dot">${sheep()}</span><div class="bubble care-bubble">${content}</div></div>`;
  const articles = [
    {id:'visit',category:'就医准备',title:'复诊前，和眠宝一起整理资料',summary:'让病程、用药记录和就诊材料更容易查找。',read:'3分钟',color:'blue',sections:[['先整理时间线','将自己的记录按发生时间排列。可写下日期、当时的场景和想向医生说明的情况；有相关照片或文件时，放在同一条记录里。'],['把用药信息放在一起','整理自己实际使用的药品名称、用药时间和已有的处方材料。记录事实，不根据文章自行修改医生的用药安排。'],['准备想问的问题','把复诊时想咨询的问题提前写下来，例如近期记录中不清楚的情况、需要医生解释的检查结果。就诊时由医生结合实际情况判断。']]},
    {id:'journey',category:'日常记录',title:'病程怎么记？从一条小记录开始',summary:'图片、拍照、文件，都能成为回顾病程的线索。',read:'2分钟',color:'green',sections:[['记录发生了什么','用自己的语言描述当时的情况，无需使用医学术语。时间、持续多久和具体场景，可以作为后续回顾的线索。'],['选择方便的记录方式','可以上传图片、使用相机拍照，或上传PDF、Word、TXT文件。保存前查看图片是否清楚、文件是否选对。'],['保存后再回顾','病历夹按记录时间展示内容，您可以随时查看。记录数量仅表示已记录条数，不用于判断疾病严重程度或治疗效果。']]},
    {id:'med',category:'用药记录',title:'用药记录：留下实际发生的信息',summary:'把药品名称、时间和备注集中保存。',read:'2分钟',color:'purple',sections:[['填写实际情况','输入自己使用的药品名称和实际记录时间，可根据已有处方填写用药情况。此工具不推荐药品，也不计算或调整剂量。'],['区分记录状态','根据事实选择已服用、漏服或暂停，并填写需要向医生说明的备注。状态用于记录，不代表系统给出用药指令。'],['带着记录咨询','如果需要确认漏服处理、用药后不适或用药安排，请联系医生或专业客服。记录可以帮助您准确描述情况。']]},
    {id:'aid',category:'援助服务',title:'创新支付申请，资料怎样整理？',summary:'先核对信息，再确认处方和相关凭证。',read:'3分钟',color:'blue',sections:[['了解申请流程','演示流程包括选择直付或后报销、填写申请信息、上传材料和确认提交。真实项目的条件、材料和权益以正式规则为准。'],['上传清楚的材料','上传前核对图片种类与清晰度。演示中的后报销需要处方和发票；真实项目可能有不同材料要求。'],['查看结果','提交后到创新支付中查看进度。资料被驳回时，先查看原因，再补充相应材料。提交成功不等于审核通过或福利到账。']]},
    {id:'questions',category:'就医准备',title:'把想问医生的问题，先记下来',summary:'整理问题，减少复诊时遗漏的重要信息。',read:'2分钟',color:'green',sections:[['保留自己的疑问','想到问题时可以先在病历夹中记录，复诊前集中查看。问题应围绕自己的实际经历和已有诊疗安排。'],['关联已有资料','如有与问题相关的记录、处方或就诊材料，可以一起整理。医生会结合真实情况说明。']]},
    {id:'organize',category:'日常记录',title:'让图片与文件各归其位',summary:'给每条记录一个日期和清楚的备注。',read:'2分钟',color:'purple',sections:[['一条记录对应一个场景','尽量在一条记录中描述同一次经历。多个时间点可以分别保存，方便按时间回顾。'],['注意材料清晰度','图片要完整清晰，文件上传后可下载核对。演示数据仅保存在当前浏览器，请使用演示资料体验。']]},
  ];
  let articleFilter='全部', articleId='visit', recordsFilter='全部', records=[], dbPromise, busy=false, pageFrom='chat', cameraStream=null, cameraStarting=false, cameraRevision=0, recordPageRevision=0, resetRevision=0, dataResetRevision=0;
  const mediaUrls=new Map();
  function db() {
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      if(!window.indexedDB)return reject(new Error('本浏览器不支持本地记录保存'));
      const req=indexedDB.open('nt1-care-records-v1',1);
      req.onupgradeneeded=()=>{req.result.createObjectStore('records',{keyPath:'id'});req.result.createObjectStore('media',{keyPath:'id'});};
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });return dbPromise;
  }
  async function transact(store,mode,perform) {
    const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction(store,mode);const req=perform(tx.objectStore(store));tx.oncomplete=()=>resolve(req?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
  }
  const put=(store,value)=>transact(store,'readwrite',s=>s.put(value));
  const read=(store,id)=>transact(store,'readonly',s=>s.get(id));
  function session() {return api.getActive()||api.session();}
  function activeFlow(s=session()) {return s?.careFlows?.find(f=>f.id===s.activeCareFlowId&&f.phase==='active');}
  function push(s,message){s.messages.push(message);s.updated=new Date().toISOString();}
  function addBot(s,text,actions=[]){push(s,{role:'bot',parts:[{text}],actions,intent:'眠宝服务引导',demo:false});}
  function addSuccess(s,title,text,actions=[]){push(s,{role:'bot',kind:'companionSuccess',title,text,parts:[{text}],actions});}
  function pauseCurrent(s){const f=activeFlow(s);if(f)f.phase='cancelled';return f;}
  function enterChat(label) {
    api.closeModal();const s=api.getActive()&&activeFlow(api.getActive())?api.getActive():api.session();if(label)push(s,{role:'user',text:label});api.setSession(s.id);return s;
  }
  function refresh(s){api.save();api.changeView('chat');}
  const articleCards = (list=articles.slice(0,3)) => list.map(a=>`<button type="button" class="article-item" data-care-action="article" data-article="${a.id}"><span class="article-cover ${a.color}">${icon(a.category==='用药记录'?'card':a.category==='日常记录'?'doc':'layers')}</span><span><small>${a.category} · ${a.read}</small><strong>${esc(a.title)}</strong><em>${esc(a.summary)}</em></span><span class="article-chevron">›</span></button>`).join('');
  function message(m) {
    if(m.kind==='aidResume'){if(m.resolved)return bot(`<p>${esc(m.resolved)}</p>`);const d=(api.getState().aidDrafts||[]).find(f=>f.id===m.draftId);return bot(`<div class="aid-resume-card">${sheep()}<div><h3>继续上次的援助申请吗？</h3><p>${d?esc(guide(d).text):'您还有一份未完成的申请。'}</p></div></div><div class="aid-resume-actions"><button type="button" class="primary-button" data-care-action="resumeAid" data-draft-id="${esc(m.draftId)}" data-prompt-id="${esc(m.id)}">继续填写</button><button type="button" class="secondary-button" data-care-action="freshAid" data-draft-id="${esc(m.draftId)}" data-prompt-id="${esc(m.id)}">重新填写</button></div>`);}
    if(m.kind==='appPanel')return panelMarkup(m);
    if(m.kind==='companionSuccess')return bot(`<div class="mianbao-result"><img src="assets/mianbao-lamb.webp" alt="眠宝已帮您收好"><div><span class="result-check">${icon('check')} ${esc(m.title)}</span><p>${esc(m.text)}</p></div></div>${(m.actions||[]).map(a=>`<button class="inline-action" data-action="${a.action}">${esc(a.label)}</button>`).join('')}`);
    if(m.kind==='uploadedMaterial'){const f=session().careFlows?.find(f=>f.id===m.flowId);return `<div class="message user"><div class="bubble">${esc(m.text)}${m.media?.length?m.media.map(item=>`<button class="image-attachment" data-care-action="previewMedia" data-media-id="${esc(item.id)}"><img class="uploaded-chat-image" data-media="${esc(item.id)}" alt="${esc(m.text)}"></button>`).join(''):f?.values[m.purpose]?`<img class="uploaded-chat-image" src="${esc(f.values[m.purpose])}" alt="${esc(m.text)}">`:''}</div></div>`;}
    if(m.kind==='articles')return bot(`<span class="bubble-title">眠宝为您整理了这些文章</span><p class="article-intro">先从记录与资料整理开始，慢慢了解自己的每一天。</p><div class="article-list">${articleCards()}</div><button class="view-more" data-care-action="articles">查看更多</button>`);
    if(m.kind==='medInput')return `<div class="message user"><div class="bubble record-input-card"><div class="record-input-heading">${icon('card')}用药记录</div><strong>${esc(m.drugName)}</strong><p>${esc(m.status)} · ${dateText(m.when)}</p>${m.dose?`<p>${esc(m.dose)}</p>`:''}${m.note?`<p>${esc(m.note)}</p>`:''}</div></div>`;
    if(m.kind==='recordInput')return `<div class="message user"><div class="bubble record-input-card"><div class="record-input-heading">${icon('doc')}病程记录 · ${m.media?.some(x=>x.kind==='file')?'文件':m.media?.some(x=>x.kind==='audio')?'语音':m.media?.length?'图片':'文字'}</div>${m.text?`<p class="record-input-text">${esc(m.text)}</p>`:''}${mediaMarkup(m.media||[])}</div></div>`;
    return bot(`<p>${esc(m.text||'眠宝已记录')}</p>`);
  }
  function showEducation() {
    closeCamera();const s=enterChat('看看健康科普');push(s,{role:'bot',kind:'articles'});refresh(s);
  }
  function findPanel(id){for(const s of api.getState().sessions){const m=s.messages.find(m=>m.id===id&&m.kind==='appPanel');if(m)return {s,m};}return {};}
  function panelMarkup(m){return bot(`<section class="inline-panel ${m.collapsed?'collapsed':''}" data-panel-id="${esc(m.id)}"><header class="inline-panel-header"><h3>${esc(m.title)}</h3><button type="button" data-care-action="togglePanel" data-panel-id="${esc(m.id)}" aria-expanded="${!m.collapsed}">${m.collapsed?'展开':'收起'}</button></header>${m.collapsed?'':`<div class="inline-panel-body">${m.body}</div>${m.footer?`<footer class="inline-panel-footer">${m.footer}</footer>`:''}`}</section>`);}
  function openPanel(title,body,footer='',panelType='generic'){
    captureFields();const s=enterChat();for(const m of s.messages)if(m.kind==='appPanel'&&m.panelType===panelType)m.collapsed=true;
    const m={id:uid('panel'),role:'bot',kind:'appPanel',title,body,footer,panelType};push(s,m);refresh(s);focusPanel(m.id);return m;
  }
  function focusPanel(id){requestAnimationFrame(()=>document.querySelector(`[data-panel-id="${id}"]`)?.scrollIntoView({block:'start',behavior:'instant'}));}
  function updatePanel(id,body){const {s,m}=findPanel(id);if(!m)return;m.body=body;api.save();if(s.id===session().id){api.renderChat();focusPanel(id);}}
  function collapsePanel(id){const {m}=findPanel(id);if(!m)return;m.collapsed=true;api.save();api.renderChat();}
  function articleListMarkup(id){return `<p class="inline-panel-intro">和眠宝一起了解记录、复诊与援助服务。</p><div class="article-filters">${['全部','日常记录','就医准备','用药记录','援助服务'].map(t=>`<button class="${articleFilter===t?'active':''}" data-care-action="articleFilter" data-panel-id="${id}" data-filter="${t}">${t}</button>`).join('')}</div><div class="article-module-list">${articleCards(articles.filter(a=>articleFilter==='全部'||a.category===articleFilter))}</div>`;}
  function openArticles(){articleFilter='全部';const m=openPanel('健康科普 · 全部文章','','','articles');updatePanel(m.id,articleListMarkup(m.id));}
  function openArticle(id){const a=articles.find(a=>a.id===id);if(!a)return api.showToast('文章未找到');openPanel(a.title,`<article class="article-detail"><span class="record-type">${a.category}</span><p class="article-byline">眠宝为您整理 · ${a.read}</p>${a.sections.map(([title,text])=>`<section><h4>${esc(title)}</h4><p>${esc(text)}</p></section>`).join('')}</article>`,'','article');}
  async function loadRecords(){records=(await transact('records','readonly',s=>s.getAll())).sort((a,b)=>new Date(b.when)-new Date(a.when));return records;}
  function openRecords(){closeCamera();recordsFilter='全部';renderRecordPanel('records');}
  function openMedications(){closeCamera();renderRecordPanel('medications');}
  function mediaMarkup(media){return `<div class="care-attachments">${media.map(m=>m.kind==='audio'?`<div class="voice-attachment">${icon('support')}<span>语音记录 ${m.duration?m.duration+'秒':''}</span><audio controls preload="metadata" data-media="${esc(m.id)}"></audio></div>`:m.kind==='file'?`<button type="button" class="file-attachment" data-care-action="downloadFile" data-media-id="${esc(m.id)}" data-file-name="${esc(m.name)}">${icon('doc')}<span><strong>${esc(m.name)}</strong><small>${Math.max(1,Math.round((m.size||0)/1024))} KB · 点击下载</small></span>${icon('download')}</button>`:`<button type="button" class="image-attachment" data-care-action="previewMedia" data-media-id="${esc(m.id)}"><img data-media="${esc(m.id)}" alt="${esc(m.name||'记录图片')}"></button>`).join('')}</div>`;}
  async function hydrate(){
    const video=$('#recordCameraVideo');if(video&&cameraStream&&video.srcObject!==cameraStream)video.srcObject=cameraStream;
    const elements=[...document.querySelectorAll('[data-media]')];for(const el of elements){
      const id=el.dataset.media;
      try{if(!mediaUrls.has(id)){const item=await read('media',id);if(item?.blob)mediaUrls.set(id,URL.createObjectURL(item.blob));}if(el.isConnected&&mediaUrls.has(id)&&el.src!==mediaUrls.get(id))el.src=mediaUrls.get(id);}catch{}
    }
  }
  function recordCard(r){return `<article class="care-record-card"><div class="care-record-top"><span class="record-type ${r.type==='med'?'purple':''}">${r.type==='med'?'用药记录':'病程记录'}</span><time>${dateText(r.when)}</time></div><h4>${esc(r.title)}</h4><p>${esc(r.text||'')}</p>${r.type==='med'?`<div class="med-record-fields">${esc(r.status)}${r.dose?' · '+esc(r.dose):''}</div>`:''}${mediaMarkup(r.media||[])}<div class="record-card-actions"><button type="button" data-care-action="editRecord" data-record-id="${esc(r.id)}">修改这条记录</button></div></article>`;}
  async function renderRecordPanel(v,id){
    const revision=++recordPageRevision,epoch=resetRevision;
    const m=id?findPanel(id).m:openPanel(v==='medications'?'用药记录':'我的病历夹','<p>正在读取记录…</p>','',v);
    if(!m)return;
    try{await loadRecords();if(epoch!==resetRevision||revision!==recordPageRevision)return;
      const list=records.filter(r=>v==='medications'?r.type==='med':recordsFilter==='病程'?r.type==='journey':recordsFilter==='用药'?r.type==='med':true);
      const html=`<p class="inline-panel-intro">${v==='medications'?'留下实际用药情况，方便随时回顾。':'图片和文件，收好每一次就诊资料。'}</p><button class="primary-button care-new-record" data-action="${v==='medications'?'newMedication':'recordJourney'}">＋ ${v==='medications'?'记录一次用药':'记录新的病程'}</button>${v==='records'?`<div class="article-filters">${['全部','病程','用药'].map(t=>`<button class="${recordsFilter===t?'active':''}" data-care-action="recordFilter" data-panel-id="${m.id}" data-filter="${t}">${t}</button>`).join('')}</div>`:''}<div class="record-list">${list.map(recordCard).join('')||`<div class="care-empty"><img src="assets/mianbao-doctor.webp" alt="眠宝"><h4>还没有${v==='medications'?'用药':'病程'}记录</h4><p>从一条记录开始，眠宝帮您收好。</p></div>`}</div>`;
      updatePanel(m.id,html);
    }catch{updatePanel(m.id,'<p class="care-error">暂时无法读取记录，请重试。</p><button data-action="'+(v==='records'?'records':'medications')+'">重新读取</button>');}
  }
  function createFlow(kind,label,values={},extra={}){
    captureFields();closeCamera();const s=enterChat(label);const old=activeFlow(s);if(old)pauseCurrent(s);
    const f={id:uid('flow'),kind,step:kind==='aid'?'type':kind==='med'?'medName':'record',phase:'active',values,...extra};
    s.careFlows||=[];s.careFlows.push(f);s.activeCareFlowId=f.id;return [s,f];
  }
  function rememberAid(f){const state=api.getState();state.aidDrafts=(state.aidDrafts||[]).filter(d=>d.id!==f.id);state.aidDrafts.push(JSON.parse(JSON.stringify({...f,phase:'paused',pausedAt:new Date().toISOString()})));}
  function aidDraft(reupload=false,id=api.getOrder()?.id){const state=api.getState();const matches=f=>f.kind==='aid'&&['paused','cancelled'].includes(f.phase)&&!!f.reupload===!!reupload&&(!reupload||f.orderId===id);return [...(state.aidDrafts||[])].reverse().find(matches)||state.sessions.flatMap(s=>[...(s.careFlows||[])].reverse()).find(matches);}
  function forgetAid(id,phase='completed'){api.getState().aidDrafts=(api.getState().aidDrafts||[]).filter(f=>f.id!==id);for(const s of api.getState().sessions)for(const f of s.careFlows||[])if(f.id===id)f.phase=phase;}
  function interruptAid(){const s=api.getActive(),f=s&&activeFlow(s);if(f?.kind!=='aid')return;captureFields();f.phase='paused';rememberAid(f);$('#chatInput').value='';addBot(s,'已暂停本次援助申请，填写的信息已保留。您可以先使用其他功能，再次申请时可继续填写。');api.save();return f.id;}
  function startAid(reupload=false){
    imagePurpose='rx';const o=api.getOrder();const [s,f]=createFlow('aid',reupload?'重新上传援助资料':'申请新的援助',{type:reupload?o?.type||api.getState().type:api.getState().type},{reupload,orderId:reupload?o?.id:null});
    addBot(s,reupload?'我陪您补充这次申请的资料。请先确认申请方式，然后按步骤完善信息与图片。':'我会陪您逐项整理申请信息。先选申请方式，再填写姓名、地区和联系号码，最后上传材料并确认提交。');refresh(s);
  }
  function beginAid(reupload=false){
    if(api.aidBlock?.(reupload))return api.showToast(api.aidBlock(reupload));
    const draft=aidDraft(reupload);if(!draft)return startAid(reupload);
    rememberAid(draft);const s=enterChat();push(s,{id:uid('aid-prompt'),role:'bot',kind:'aidResume',draftId:draft.id,reupload,orderId:draft.orderId});refresh(s);
  }
  function resumeAid(id,promptId,fresh=false){
    if(busy)return api.showToast('请等待材料处理完成后继续');
    const draft=(api.getState().aidDrafts||[]).find(f=>f.id===id);if(!draft)return api.showToast('这份申请已处理，请重新进入申请');
    const block=api.aidBlock?.(draft.reupload,draft.orderId);if(block)return api.showToast(block);
    const s=enterChat();const prompt=s.messages.find(m=>m.id===promptId);if(prompt)prompt.resolved=fresh?'已选择重新填写。':'已继续上次的申请。';
    if(fresh){forgetAid(id,'discarded');return startAid(draft.reupload);}
    captureFields();pauseCurrent(s);const f=JSON.parse(JSON.stringify(draft));f.phase='active';const existing=s.careFlows?.find(f=>f.id===id);if(existing)Object.assign(existing,f);else{ s.careFlows||=[];s.careFlows.push(f); }s.activeCareFlowId=id;imagePurpose=f.values.type==='reimburse'&&f.values.rx&&!f.values.invoice?'invoice':'rx';composerKey='';
    addBot(s,'已接着上次的申请继续。'+guide(f).text);refresh(s);
  }
  function beginRecord(){const [s,f]=createFlow('record','记录新的病程',{when:localTime(),text:'',media:[]});addBot(s,'眠宝陪您整理病程资料。可以上传图片、拍照或上传文件，确认后保存到病历夹。');refresh(s);}
  function beginMedication(){const [s,f]=createFlow('med','记录一次用药',{when:localTime(),status:'已服用',drugName:'',dose:'',note:''});f.step='medCard';addBot(s,'在下面的卡片填写这次用药信息，完成后直接保存，眠宝帮您收好。');refresh(s);}
  function aidSteps(f){return ['type','name','region','phone',...(f.values.type==='direct'?['quantity']:[]),'images','confirm'];}
  const prompts={name:'请填写本次申请人的姓名。',region:'请填写申请人所在地区，例如“上海市静安区”。',phone:'请填写11位联系手机号，用于演示资料完整性校验。',quantity:'本次申请的用药数量是多少盒？请按材料中的实际数量填写。',images:'接下来整理图片材料。请上传处方图片；后报销还需要发票图片。',confirm:'资料已整理好，请核对后确认提交。本次仅模拟申请，不产生实际支付。',medDetails:'接下来填写记录时间、实际用药情况和备注，然后确认保存。'};
  function advance(f){const steps=aidSteps(f);let i=steps.indexOf(f.step)+1;while(f.editingAid&&i<steps.length&& !['images','confirm'].includes(steps[i])&&f.values[steps[i]])i++;f.step=steps[i]||'confirm';}
  function field(title,value){return `<div class="detail-row"><span>${title}</span><span>${esc(value)}</span></div>`;}
  const choice=(label,action,value,active=false)=>`<button type="button" class="care-choice ${active?'selected':''}" data-care-action="${action}" data-value="${esc(value)}">${label}</button>`;
  const edit=(label,key)=>`<button type="button" class="care-link" data-care-action="editField" data-field="${key}">${label}</button>`;
  const uploadSummary=(v,keys)=>`<div class="flow-materials">${keys.map(key=>`<div class="flow-upload">${v[key]?`<img src="${esc(v[key])}" alt="${key==='invoice'?'发票':key==='diagnosis'?'诊断材料':'处方'}预览">${icon('check')}`:icon('upload')}<span>${key==='invoice'?'发票':key==='diagnosis'?'诊断材料':'处方'}${v[key]?'已收到':'待上传'}</span></div>`).join('')}</div>`;
  function recordControls(){return `<button type="button" data-care-action="chooseImage">${icon('upload')}上传图片</button><button type="button" data-care-action="useCamera">${icon('camera')}使用相机</button><button type="button" data-care-action="chooseFile">${icon('doc')}上传文件</button>`;}
  function materialButtons(v,enroll=false){return `<div class="material-upload-buttons"><button type="button" data-care-action="chooseImage" data-purpose="${enroll?'diagnosis':'rx'}">${icon('upload')}上传${enroll?'诊断材料':'处方'}</button>${!enroll&&v.type==='reimburse'?`<button type="button" data-care-action="chooseImage" data-purpose="invoice">${icon('upload')}上传发票</button>`:''}</div>`;}

  function flowMarkup(s){
    if(!s)return '';const f=activeFlow(s);if(!f)return '';const v=f.values;let content='',title='',button='',allowSubmit=true;
    if(f.kind==='aid'){
      title='申请资料 · '+(aidSteps(f).indexOf(f.step)+1)+' / '+aidSteps(f).length;
      if(f.step==='type'){content=`<p>本次想选择哪种申请方式？</p><div class="care-choices">${choice('直付','aidType','direct')}${choice('后报销','aidType','reimburse')}</div>`;allowSubmit=false;}
      else if(['name','region','phone','quantity'].includes(f.step)){content=`<p>${prompts[f.step]}</p>`;allowSubmit=false;}
      else if(f.step==='images'){content=uploadSummary(v,['rx',...(v.type==='reimburse'?['invoice']:[])])+materialButtons(v)+`<button type="button" class="secondary-button" data-care-action="sampleAid">使用演示材料</button>`;button='材料已就绪，继续';}
      else{content=`<div class="care-summary">${field('申请方式',v.type==='direct'?'直付':'后报销')}${field('申请人',v.name)}${edit('修改姓名','name')}${field('地区',v.region)}${edit('修改地区','region')}${field('联系电话',String(v.phone).replace(/(\d{3})\d{4}(\d{4})/,'$1****$2'))}${edit('修改手机号','phone')}${v.type==='direct'?field('数量',v.quantity+'盒')+edit('修改数量','quantity'):''}</div><label class="consent"><input type="checkbox" name="careConsent">我已确认这是演示申请。</label><button type="button" class="care-link" data-care-action="editAid">修改申请方式或材料</button>`;button='确认提交申请';}
    }else if(f.kind==='record'){
      title='病程记录';content=`<div class="record-entry-intro">${sheep()}<p>把就诊图片和资料交给眠宝，方便以后回顾。</p></div><div id="recordMediaTools" class="record-media-tools">${recordControls()}</div>${cameraStream||cameraStarting?`<div class="record-camera-panel">${cameraStarting?'<p>正在打开相机…</p>':'<video id="recordCameraVideo" autoplay playsinline muted></video>'}<div class="button-row">${cameraStream?'<button type="button" class="primary-button" data-care-action="takePhoto">拍照并添加</button>':''}<button type="button" class="secondary-button" data-care-action="closeCamera">取消</button></div></div>`:''}${v.media?.length?mediaMarkup(v.media):'<div class="record-upload-empty">选择图片、拍照或添加文件</div>'}`;button='保存这条病程';
    }else if(f.kind==='med'){
      f.step='medCard';delete f.editField;title='用药记录';
      content=`<div class="record-entry-intro">${sheep()}<p>填写实际用药情况，眠宝为您留好记录。</p></div><div class="med-entry-fields"><label class="form-field" for="medDrugName"><span>药品名称</span><input id="medDrugName" maxlength="60" placeholder="填写药品名称" value="${esc(v.drugName||'')}" autocomplete="off"></label><label class="form-field" for="medWhen"><span>用药时间</span><input id="medWhen" type="datetime-local" max="${localTime()}" value="${esc(v.when)}"></label><label class="form-field" for="medDoseInput"><span>实际用药情况（选填）</span><input id="medDoseInput" maxlength="80" placeholder="按实际情况填写" value="${esc(v.dose||'')}" autocomplete="off"></label><label class="form-field" for="medNoteInput"><span>备注（选填）</span><textarea id="medNoteInput" maxlength="1000" placeholder="需要补充的情况…">${esc(v.note||'')}</textarea></label></div><div class="care-choices">${['已服用','漏服','暂停'].map(t=>choice(t,'medStatus',t,v.status===t)).join('')}</div>`;button='保存用药记录';
    }else if(f.kind==='enroll'){
      title='入组资料';
      if(f.step==='enrollName'||f.step==='enrollIdentity'){content=`<p>${f.step==='enrollName'?'请在底部输入患者姓名。':'请在底部输入18位演示身份号码，用于计算年龄和性别。'}</p>${f.step==='enrollIdentity'?'<button type="button" class="secondary-button" data-care-action="sampleIdentity">使用演示号码</button>':''}`;allowSubmit=false;}
      else if(f.step==='enrollImages'){content=uploadSummary(v,['diagnosis'])+materialButtons(v,true)+'<button type="button" class="secondary-button" data-care-action="sampleEnrollment">使用演示材料</button>';button='材料已就绪，继续';}
      else{content=`${field('姓名',v.name)}${field('年龄 / 性别',v.age+'岁 / '+v.gender)}${field('疾病','NT1阵发性睡病')}<label class="consent"><input type="checkbox" name="careConsent">我确认本次只提交演示资料。</label>`;button='提交入组资料';}
    }else if(f.kind==='ae'){
      title='疑似不良事件记录';
      if(f.step==='aeDescription'){content=`<p>${esc(v.description||'请在底部描述当时的情况。')}</p>`;button='确认描述';}
      else if(f.step==='aeDrug'){content='<p>请在底部填写相关药品名称（可选）。</p>';button='跳过药品名称';}
      else{content=`${field('描述',v.description)}${edit('修改描述','description')}${field('药品',v.drugName||'未填写')}${edit('修改药品','drugName')}${field('时间',dateText(v.when))}${edit('修改时间','when')}<label class="consent"><input type="checkbox" name="careConsent">仅生成演示记录，不上报真实平台。</label>`;button='确认保存事件';}
    }
    return bot(`<form id="careFlowForm" novalidate data-flow="${f.id}"><div class="care-flow-progress">${title}</div>${content}<div id="careFlowError" role="alert"></div>${f.editField?`<div class="edit-notice">正在修改${esc(fieldName(f.editField))}，请从底部发送。<button type="button" data-care-action="cancelEdit">取消修改</button>${['dose','note','drugName'].includes(f.editField)&&!(f.kind==='med'&&f.editField==='drugName')?'<button type="button" data-care-action="clearOptional">清空此项</button>':''}</div>`:allowSubmit?`<button type="submit" class="primary-button">${button}</button>`:''}</form>`);
  }
  const fieldName=key=>({when:'记录时间',text:'病程文字',drugName:'药品名称',dose:'实际用药情况',note:'备注',description:'事件描述',name:'申请人姓名',region:'所在地区',phone:'联系手机号',quantity:'用药数量'}[key]||'资料');
  function error(message){if($('#careFlowError')){ $('#careFlowError').innerHTML=`<div class="mianbao-error">${sheep()}<div><strong>眠宝陪您核对一下</strong><p class="form-error">${esc(message)}</p></div></div>`;$('#careFlowError').scrollIntoView({block:'nearest'});}else api.showToast(message);}
  const limitFor=(f,key=f.editField||f.step)=>({text:2000,description:500,drugName:f.kind==='ae'?50:60,dose:80,note:1000,when:16,name:40,region:40,phone:11,quantity:2,medName:60,medDose:80,medNote:1000,enrollName:12,enrollIdentity:18,aeDescription:500,aeDrug:50}[key]||2000);
  function captureFields(){const s=api.getActive(),f=s&&activeFlow(s);if(f?.kind==='med'){const fields={drugName:'medDrugName',when:'medWhen',dose:'medDoseInput',note:'medNoteInput'};for(const [key,id] of Object.entries(fields)){const input=$('#'+id);if(input)f.values[key]=input.value;}}}
  function clearInput(f=activeFlow()){if(['record','med'].includes(f?.kind))return;$('#chatInput').value='';if(f)delete f.composerDraft;else if(api.getActive())delete api.getActive().chatDraft;}
  function accepted(s,text,f=activeFlow(s)){push(s,{role:'user',text});clearInput(f);}
  function validTime(value){const match=String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/);if(!match)return null;const [y,m,d,h,min]=match.slice(1).map(Number);const date=new Date(y,m-1,d,h,min);return y>=1900&&date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d&&date.getHours()===h&&date.getMinutes()===min&&date<=new Date(Date.now()+60000)?localTime(date):null;}
  async function submitStep(value,fd){
    if(busy)return error('正在保存附件，请稍候');captureFields();const s=session(),f=activeFlow(s);if(!f)return;const v=f.values;value=String(value||'').trim();if(fd&&(!value)&&(f.editField||['medDose','medNote','aeDescription','aeDrug'].includes(f.step)))value=$('#chatInput').value.trim();if(value.length>limitFor(f))return error('此项最多'+limitFor(f)+'字，请缩短后重试');
    if(f.editField){const key=f.editField;if(!value)return error('请在底部填写内容');if(key==='phone'&&!/^1\d{10}$/.test(value))return error('请填写以1开头的11位演示手机号');if(key==='quantity'&&(!/^\d+$/.test(value)||Number(value)<1||Number(value)>99))return error('用药数量须为1–99的整数');if(key==='when'){value=validTime(value);if(!value)return error('请填写有效的非未来日期时间，如2026-10-12 18:30');}v[key]=value;f.editField=null;accepted(s,key==='when'?'记录时间已修改':key==='phone'?value.replace(/(\d{3})\d{4}(\d{4})/,'$1****$2'):value);refresh(s);return;}
    if(f.kind==='aid'){
      if(['type','name','region','phone','quantity'].includes(f.step)){
        const step=f.step;if(!value)return error('请在底部填写当前信息');
        if(step==='type'&&!['direct','reimburse'].includes(value))return error('请选择直付或后报销');
        if(step==='phone'&&!/^1\d{10}$/.test(value))return error('请填写以1开头的11位演示手机号');
        if(step==='quantity'&&(!/^\d+$/.test(value)||Number(value)<1||Number(value)>99))return error('用药数量须为1–99的整数');
        if(['name','region'].includes(step)&&value.length>40)return error('请将输入控制在40字内');
        v[step]=value;accepted(s,step==='type'?(value==='direct'?'选择直付':'选择后报销'):step==='phone'?value.replace(/(\d{3})\d{4}(\d{4})/,'$1****$2'):value);advance(f);addBot(s,prompts[f.step]);refresh(s);return;
      }
      if(f.step==='images'){if(!v.rx||v.type==='reimburse'&&!v.invoice)return error(v.type==='reimburse'?'请从底部上传处方和发票':'请从底部上传处方');advance(f);addBot(s,prompts.confirm);refresh(s);return;}
      if(!fd?.get('careConsent'))return error('请勾选演示申请确认说明');const block=api.aidBlock?.(f.reupload,f.orderId);if(block)return error(block);
      busy=true;const order=api.submitAid(f);busy=false;if(!order)return error('保存申请失败，请减少图片大小后重试');
      f.phase='completed';forgetAid(f.id);accepted(s,'确认提交申请',f);addSuccess(s,'眠宝已整理并提交',`资料已收到，演示申请已进入审核。订单编号：${order.id}。`,[{label:'查看申请详情',action:'payment'}]);refresh(s);return;
    }
    if(f.kind==='enroll'){
      if(f.step==='enrollName'){if(!value||value.length>12)return error('请填写1–12字的演示姓名');v.name=value;accepted(s,value);f.step='enrollIdentity';refresh(s);return;}
      if(f.step==='enrollIdentity'){const identity=api.parseIdentity(value);if(!identity)return error('请输入含有效生日的18位演示号码');Object.assign(v,identity);accepted(s,'年龄和性别已计算：'+identity.age+'岁 / '+identity.gender);f.step='enrollImages';refresh(s);return;}
      if(f.step==='enrollImages'){if(!v.diagnosis)return error('请从底部上传诊断材料');f.step='enrollConfirm';refresh(s);return;}
      if(!fd?.get('careConsent'))return error('请勾选演示说明');if(!api.submitEnrollment(v))return error('入组保存失败，请重试');f.phase='completed';clearInput(f);addSuccess(s,'入组资料已收好','入组资料已收到，正在审核。',[{label:'查看进度',action:'payment'}]);refresh(s);return;
    }
    if(f.kind==='ae'){
      if(f.step==='aeDescription'){if(value)v.description=value;if(!v.description)return error('请填写事件描述');accepted(s,value||'确认当前事件描述');f.step='aeDrug';refresh(s);return;}
      if(f.step==='aeDrug'){v.drugName=value;accepted(s,value||'暂不填写药品');f.step='aeConfirm';refresh(s);return;}
      if(!fd?.get('careConsent'))return error('请勾选演示说明');const report=api.submitCareAE(v);if(!report)return error('保存失败，请重试');f.phase='completed';clearInput(f);addSuccess(s,'事件记录已收好','已保存演示事件 '+report.id+'，未上报真实平台。');refresh(s);return;
    }
    if(f.kind==='med'){if(!v.drugName?.trim()||v.drugName.trim().length>60)return error('请填写1–60字的药品名称');v.drugName=v.drugName.trim();if(v.dose.length>80||v.note.length>1000)return error('请缩短用药情况或备注后重试');}
    if(!v.when||!validTime(v.when))return error('请核对记录时间，不可在未来');
    if(f.kind==='record'&&(v.text||'').length>2000)return error('每条病程文字最多2000字');
    if(f.kind==='record'&&!v.media?.some(m=>['image','file'].includes(m.kind)))return error('请先上传图片、拍照或添加文件');
    const r={id:f.recordId||'record-'+f.id,type:f.kind==='med'?'med':'journey',when:new Date(v.when).toISOString(),created:f.originalCreated||new Date().toISOString(),updated:new Date().toISOString(),flowId:f.id,title:f.kind==='med'?v.drugName:v.text.trim().slice(0,26)||v.media?.find(m=>['image','file'].includes(m.kind))?.name||'病程资料记录',text:f.kind==='med'?v.note:v.text,media:v.media||[],status:v.status,dose:v.dose};
    if(f.kind==='record')closeCamera();
    const saveEpoch=resetRevision,dataEpoch=dataResetRevision;busy=true;try{await put('records',r);if(saveEpoch!==resetRevision){if(dataEpoch!==dataResetRevision)await transact('records','readwrite',s=>s.delete(r.id));return;}f.phase='completed';f.recordId=r.id;if(f.kind==='med')push(s,{role:'user',kind:'medInput',drugName:v.drugName,dose:v.dose,note:v.note,status:v.status,when:v.when});clearInput(f);addSuccess(s,'眠宝已为您收好',`已保存这条${r.type==='med'?'用药':'病程'}记录。`,[{label:r.type==='med'?'查看用药记录':'打开病历夹',action:r.type==='med'?'medications':'records',icon:'doc'}]);refresh(s);}catch{api.save();api.renderChat();error('记录保存失败，内容已保留，请重试。');}finally{busy=false;updateComposer();}
  }
  function interceptText(text){const f=activeFlow();if(!f){
      if(/^(?:打开|查看|我的)?病历夹$/.test(text)){openRecords();clearInput();return true;}
      if(/^(?:我想|我要|帮我|请帮我)?记录(?:用药|服药)$/.test(text)){clearInput();beginMedication();return true;}
      if(/^(?:看看|查看|打开|我想看)?(?:健康科普|科普文章|健康文章)$/.test(text)){showEducation();clearInput();return true;}
      return false;
    }if(api.getView()!=='chat')return false;
    if(f.editField){submitStep(text);return true;}
    if(['record','med'].includes(f.kind)){captureFields();closeCamera();f.phase='cancelled';api.save();return false;}
    if(f.kind==='aid'&&['type','name','region','phone','quantity'].includes(f.step)){submitStep(f.step==='type'?/后报销/.test(text)?'reimburse':/直付/.test(text)?'direct':text:text);return true;}
    if(f.kind==='enroll'&&['enrollName','enrollIdentity'].includes(f.step)||f.kind==='ae'&&['aeDescription','aeDrug'].includes(f.step)){submitStep(text);return true;}
    api.showToast('请确认当前资料，或暂存后继续咨询');return true;
  }
  async function compressImage(file){
    if(!file.type.startsWith('image/'))throw new Error('请选择图片文件');if(file.size>10*1024*1024)throw new Error('图片请小于10MB');
    const src=URL.createObjectURL(file);try{const img=new Image();img.src=src;try{await img.decode();}catch{throw new Error('图片无法读取，请换一张完整的图片后重试');}const scale=Math.min(1,1200/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('图片处理失败')),'image/jpeg',.8));}finally{URL.revokeObjectURL(src);}
  }
  const dataUrl=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
  function closeCamera(){cameraRevision++;cameraStream?.getTracks().forEach(t=>t.stop());cameraStream=null;cameraStarting=false;}
  async function useCamera(){const f=activeFlow();if(f?.kind!=='record'||busy||cameraStarting)return;
    if(/Android|iPhone|iPad/i.test(navigator.userAgent)){const input=$('#composerCameraInput');input.value='';input.click();return;}
    closeCamera();const revision=cameraRevision;cameraStarting=true;api.renderChat();
    try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('unsupported');const acquired=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});if(revision!==cameraRevision||activeFlow()?.id!==f.id){acquired.getTracks().forEach(t=>t.stop());return;}cameraStream=acquired;cameraStarting=false;api.renderChat();}
    catch(e){if(revision!==cameraRevision)return;cameraStarting=false;api.renderChat();error(e.name==='NotAllowedError'?'相机未授权，请允许使用相机，或选择上传图片。':'无法打开相机，可以选择上传图片或文件。');}
  }
  async function takePhoto(){const video=$('#recordCameraVideo'),f=activeFlow();if(!video||!f||busy)return;if(!video.videoWidth)return error('相机画面尚未就绪，请稍候');const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d').drawImage(video,0,0);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.9));if(!blob)return error('照片生成失败，请重新拍照');if(activeFlow()?.id!==f.id)return;closeCamera();await addRecordFiles([new File([blob],'病程照片-'+Date.now()+'.jpg',{type:'image/jpeg'})],f);}
  async function addRecordFiles(files,f){if(busy)return error('正在处理附件，请稍候');if((f.values.media?.length||0)+files.length>8)return error('每条病程最多8份附件');busy=true;updateComposer();const s=session(),epoch=resetRevision,addedIds=[],added=[];
    try{if((f.values.media||[]).filter(m=>m.kind==='image').length+files.filter(file=>file.type.startsWith('image/')).length>4)throw new Error('每条记录最多4张图片');for(const file of files){if(!file.size||file.size>10*1024*1024)throw new Error('文件需有内容且不超过10MB');const image=file.type.startsWith('image/');if(!image&&!/\.(pdf|doc|docx|txt)$/i.test(file.name))throw new Error('请选择图片、PDF、Word或TXT文件');const blob=image?await compressImage(file):file,id=uid(image?'image':'file');await put('media',{id,blob});addedIds.push(id);added.push({id,kind:image?'image':'file',name:file.name,size:blob.size});}
      if(epoch!==resetRevision){for(const id of addedIds)await transact('media','readwrite',store=>store.delete(id));return;}f.values.media.push(...added);push(s,{role:'user',kind:'recordInput',text:added.some(m=>m.kind==='file')?'已添加病程资料':'已添加病程图片',media:added});addBot(s,'资料收到了，确认后点“保存这条病程”，眠宝会放进病历夹。');api.save();if(activeFlow()?.id===f.id)api.renderChat();
    }catch(e){for(const id of addedIds)await transact('media','readwrite',store=>store.delete(id)).catch(()=>{});error(e.message||'附件保存失败，请重试');}finally{busy=false;updateComposer();}
  }
  async function downloadFile(el){try{const item=await read('media',el.dataset.mediaId);if(!item?.blob)return api.showToast('文件未找到，请重新上传');const url=URL.createObjectURL(item.blob),a=document.createElement('a');a.href=url;a.download=el.dataset.fileName||'病程资料';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{api.showToast('文件读取失败，请重试');}}
  const dayKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const moods=[['😀','精神饱满'],['🙂','有些疲惫'],['😴','需要小睡'],['😟','状态不佳']];
  const feedback={'精神饱满':'很高兴听到，眠宝陪您记录今天的小进步。','有些疲惫':'辛苦了，今天的感受已经记好了。','需要小睡':'收到，眠宝帮您留住今天的感受。','状态不佳':'眠宝在这里，今天的状态已经记好了。需要时可联系专业人员。'};
  const kindName=f=>({record:'病程记录',med:'用药记录',aid:'援助申请',enroll:'入组资料',ae:'事件记录'}[f?.kind]||'与眠宝聊天');
  function guide(f){
    if(busy)return {text:'眠宝正在收好您的资料',help:'请稍等，保存完成后可以查看预览。',mode:'receiving'};
    if(!f)return {text:'眠宝在这里，想聊点什么？',help:'您可以咨询服务、记录病程、查看用药或了解科普。',mode:'ready'};
    if(f.editField)return {text:'一起修改'+fieldName(f.editField),help:'从底部发送新的'+fieldName(f.editField)+'；不想修改可以点“取消修改”。',mode:'guiding'};
    if(f.kind==='record')return {text:f.values.text||f.values.media?.length?'内容收到了，还想补充什么？':'今天发生了什么？慢慢告诉眠宝',help:'可以上传图片、使用相机拍照或上传文件。确认后点“保存这条病程”，我会放进病历夹。',mode:'guiding'};
    if(f.kind==='med')return {text:'一起记录这次用药',help:'在用药卡片填写药品名称、时间、实际用药情况和备注，选择状态后保存。',mode:'guiding'};
    const map={type:'先选择直付或后报销',name:'下一步：申请人姓名',region:'下一步：所在地区',phone:'下一步：联系手机号',quantity:'下一步：用药数量',images:!f.values.rx?'接下来上传处方':f.values.type==='reimburse'&&!f.values.invoice?'处方收到啦，还需要发票':'材料齐了，一起核对提交',confirm:'最后一起核对申请信息',medName:'先告诉眠宝药品名称',medDose:'接下来记录实际用药情况',medNote:'还有想补充的备注吗？',medReview:'一起核对时间与用药状态',enrollName:'先告诉眠宝患者姓名',enrollIdentity:'接下来计算年龄和性别',enrollImages:'接下来上传诊断材料',enrollConfirm:'最后核对入组资料',aeDescription:'一起确认当时的情况',aeDrug:'这次涉及什么药品？',aeConfirm:'一起核对事件信息'};
    return {text:map[f.step]||'一起核对这份资料',help:['images','enrollImages'].includes(f.step)?'点资料卡片中的上传按钮添加对应材料，确认清晰完整后继续。':['confirm','medReview','enrollConfirm','aeConfirm'].includes(f.step)?'请核对聊天里的信息，可以修改；确认无误后点保存或提交。':'从底部输入当前步骤的信息再发送。可选信息可以点“跳过”。需要使用其他功能时，直接点击对应按钮即可。',mode:'guiding'};
  }
  function dailyMarkup(){const state=api.getState(),date=dayKey();state.dailyCheckins||={};if(!state.dailyCheckins[date]){state.dailyCheckins[date]={askedAt:new Date().toISOString()};api.save();}
    const check=state.dailyCheckins[date],home=true;
    const title=check.mood?'今天的感受：'+esc(check.mood):'今天感觉怎么样？';
    const detail=check.mood?feedback[check.mood]:'选择最接近您当前的状态吧。';
    const mascot=`<button class="companion-mascot" type="button" data-care-action="askMianbao" aria-label="让眠宝帮我"><img src="assets/mianbao-lamb.webp" alt="陪伴您的眠宝"><span>问问眠宝</span></button>`;
    return `<section id="dailyCompanion" class="daily-companion ${home?'home-companion':''} ${check.mood?'answered':''}" aria-label="眠宝每日关怀"><div class="companion-story"><div>${home?`<small>眠宝陪您，一起记录每一天</small><h3>您好，我是眠宝</h3><p>您的NT1阵发性睡病助手<br>陪您了解知识、记录病程与申请福利</p>`:`<small>眠宝每日关怀</small><strong>${title}</strong><p>${detail}</p>`}</div>${mascot}</div>${home?`<div class="home-checkin-copy"><strong>${title}</strong><p>${detail}</p></div>`:''}${!check.mood?`<div class="companion-moods">${moods.map(([emoji,label])=>`<button data-care-action="dailyMood" data-value="${label}"><span>${emoji}</span>${label}</button>`).join('')}</div>`:'<div class="checkin-complete">✓ 今天的状态已记录</div>'}</section>`;
  }
  function renderCompanion(){const el=$('#dailyCompanion');if(el&&['home','chat'].includes(api.getView()))el.outerHTML=dailyMarkup();}
  let imagePurpose='rx', composerKey='';
  function updateComposer(){const current=api.getActive(),active=current&&activeFlow(current),f=['record','med'].includes(active?.kind)?null:active;renderCompanion();const input=$('#chatInput');const nextKey=f?f.id+':'+(f.editField||f.step):'normal:'+(api.getActive()?.id||'home');if(composerKey!==nextKey){input.value=f?(f.composerDraft?.key===nextKey?f.composerDraft.value:''):(api.getActive()?.chatDraft||'');composerKey=nextKey;}
    const editPrompts={when:'输入记录时间，如2026-10-12 18:30',text:'重新填写病程文字…',drugName:'输入药品名称…',dose:'输入实际用药情况…',note:'输入备注…',description:'重新描述当时的情况…',name:'输入申请人姓名…',region:'输入所在地区…',phone:'输入11位演示手机号…',quantity:'输入用药数量（盒）…'};
    const placeholders={name:'输入申请人姓名…',region:'输入所在地区…',phone:'输入11位演示手机号…',quantity:'输入用药数量（盒）…',medName:'输入药品名称…',medDose:'输入实际用药情况，或点跳过…',medNote:'输入备注，或点跳过…',enrollName:'输入演示患者姓名…',enrollIdentity:'输入18位演示号码…',aeDescription:'描述当时的情况…',aeDrug:'输入药品名称，或点跳过…'};
    input.placeholder=f?f.editField?editPrompts[f.editField]:f.kind==='record'?'写下病程情况，发送后加入记录…':placeholders[f.step]||'在聊天中核对资料并确认…':'咨询用药、疾病或创新支付…';
    input.maxLength=f?limitFor(f):2000;input.inputMode=f?.kind==='aid'&&['phone','quantity'].includes(f.step)||f?.step==='enrollIdentity'?'numeric':'text';
    const context=$('#composerContext');context.hidden=true;context.textContent='';
    if(f?.kind==='aid'&&f.values.type!=='reimburse')imagePurpose='rx';
    const imageInput=$('#composerImageInput');imageInput.multiple=active?.kind==='record';imageInput.dataset.purpose=f?.kind==='enroll'?'diagnosis':imagePurpose;
    $('#composerTools').innerHTML='';
    const tools=$('#recordMediaTools');if(tools)tools.innerHTML=recordControls();
    document.querySelectorAll('#recordMediaTools button, .material-upload-buttons button').forEach(b=>b.disabled=busy||cameraStarting);
    document.querySelectorAll('#careFlowForm button[type="submit"]').forEach(b=>b.disabled=busy||cameraStarting);

  }
    
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderCompanion();});
  window.addEventListener('focus',renderCompanion);
  new ResizeObserver(()=>{const bottom=$('#chatBottom');$('#appBody').style.paddingBottom=bottom.hidden?'24px':bottom.offsetHeight+16+'px';}).observe($('#chatBottom'));
  function beginEnrollment(){const [s,f]=createFlow('enroll','完善入组资料',{},{});f.step='enrollName';addBot(s,'眠宝陪您整理入组资料，请先在底部填写姓名，再上传演示诊断材料。');refresh(s);}
  function beginAE(text){const [s,f]=createFlow('ae','确认疑似不良事件',{description:text||'',drugName:'',when:localTime()});f.step='aeDescription';addBot(s,'请核对或补充当时的情况，信息只保存为本地演示记录。');refresh(s);}

  async function editRecord(id){try{const r=await read('records',id);if(!r)return api.showToast('这条记录未找到，请刷新列表');const values=r.type==='med'?{when:localTime(new Date(r.when)),drugName:r.title,status:r.status,dose:r.dose||'',note:r.text||'',media:r.media||[]}:{when:localTime(new Date(r.when)),text:r.text||'',media:r.media||[]};const [s,f]=createFlow(r.type==='med'?'med':'record','修改已有'+(r.type==='med'?'用药':'病程')+'记录',values,{recordId:r.id,originalCreated:r.created});if(r.type==='med')f.step='medCard';addBot(s,'眠宝已取出这条记录。修改后保存会更新原记录，不会多出一条。');refresh(s);}catch{api.showToast('读取记录失败，请重试');}}
  const originalMessage=message;
  function richMessage(m){if(m.kind==='pausedFlow')return '';return originalMessage(m);}
  document.addEventListener('click',e=>{
    const button=e.target.closest('button');if(!button||!button.closest('#device')||button.closest('#careFlowForm')||button.closest('#chatForm'))return;
    const s=api.getActive(),f=s&&activeFlow(s);if(!f)return;
    if(f.kind==='aid'){const id=interruptAid();queueMicrotask(()=>{if(document.querySelector('#careFlowForm')?.dataset.flow===id)api.renderChat();});}
    else if(['record','med'].includes(f.kind)){captureFields();closeCamera();f.phase='cancelled';api.save();queueMicrotask(()=>{if(document.querySelector('#careFlowForm')?.dataset.flow===f.id)api.renderChat();});}
  },true);
  document.addEventListener('click',async e=>{
    const el=e.target.closest('[data-care-action]');if(!el)return;const action=el.dataset.careAction;
    if(action==='resumeAid'||action==='freshAid')resumeAid(el.dataset.draftId,el.dataset.promptId,action==='freshAid');
    if(action==='togglePanel'){const {m}=findPanel(el.dataset.panelId);if(!m)return;captureFields();m.collapsed=!m.collapsed;if(!m.collapsed)for(const other of session().messages)if(other.kind==='appPanel'&&other.id!==m.id&&other.panelType===m.panelType)other.collapsed=true;api.save();api.renderChat();focusPanel(m.id);}
    if(action==='askMianbao'){if(busy||cameraStarting)return api.showToast(guide(activeFlow()).text);const f=activeFlow();const info=guide(f);addBot(session(),'眠宝在这里。'+info.help);refresh(session());}
    if(action==='editRecord')editRecord(el.dataset.recordId);
    if(action==='cancelEdit'){const f=activeFlow();delete f.editField;delete f.composerDraft;clearInput();api.save();api.renderChat();}
    if(action==='clearOptional'){const f=activeFlow();f.values[f.editField]='';delete f.editField;delete f.composerDraft;clearInput();api.save();api.renderChat();}
    if(action==='dailyMood'){const state=api.getState(),date=dayKey();if(state.dailyCheckins?.[date]?.mood)return;state.dailyCheckins[date]={...state.dailyCheckins[date],mood:el.dataset.value,answeredAt:new Date().toISOString()};api.save();const s=enterChat('今天的感受：'+el.dataset.value);push(s,{role:'bot',kind:'companionSuccess',title:'今天的状态已记录',text:feedback[el.dataset.value],parts:[{text:feedback[el.dataset.value]}]});refresh(s);}
    if(action==='aidType')submitStep(el.dataset.value);
    if(action==='sampleIdentity')submitStep('310000199404120020');
    if(action==='sampleEnrollment'){if(busy)return api.showToast('请等当前图片处理完成');const f=activeFlow();f.values.diagnosis='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(api.documentSvg('diagnosis'));api.save();api.renderChat();}
    if(action==='medStatus'){captureFields();activeFlow().values.status=el.dataset.value;api.save();api.renderChat();}
    if(action==='editField'){const f=activeFlow();f.editField=el.dataset.field;api.save();api.renderChat();$('#chatInput').focus();}
    if(action==='imagePurpose'){imagePurpose=el.dataset.value;updateComposer();}
    if(action==='chooseImage'){const f=activeFlow();if(!f||!['record','aid','enroll'].includes(f.kind))return;if(el.dataset.purpose)imagePurpose=el.dataset.purpose;captureFields();updateComposer();$('#composerImageInput').value='';$('#composerImageInput').click();}
    if(action==='articles')openArticles();if(action==='article')openArticle(el.dataset.article);
    if(action==='articleFilter'){articleFilter=el.dataset.filter;updatePanel(el.dataset.panelId,articleListMarkup(el.dataset.panelId));}
    if(action==='recordFilter'){recordsFilter=el.dataset.filter;renderRecordPanel('records',el.dataset.panelId);}
    if(action==='editAid'){const f=activeFlow();f.editingAid=true;f.step='type';addBot(session(),'请重新核对申请方式及申请信息。');refresh(session());}
    if(action==='sampleAid'){if(busy)return api.showToast('请等当前图片处理完成');const f=activeFlow();f.values.rx='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(api.documentSvg('prescription'));if(f.values.type==='reimburse')f.values.invoice='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(api.documentSvg('invoice'));api.save();api.renderChat();}

    if(action==='useCamera')useCamera();if(action==='takePhoto')takePhoto();if(action==='closeCamera'){closeCamera();api.renderChat();}if(action==='chooseFile'){const f=activeFlow();if(f?.kind==='record'){$('#composerFileInput').value='';$('#composerFileInput').click();}}if(action==='downloadFile')downloadFile(el);
    if(action==='previewMedia'){el.classList.toggle('expanded');el.setAttribute('aria-expanded',String(el.classList.contains('expanded')));}

  });
  document.addEventListener('submit',e=>{if(e.target.id==='careFlowForm'){e.preventDefault();const fd=new FormData(e.target);submitStep(fd.get('careValue'),fd);}});
  document.addEventListener('input',e=>{if(['medDrugName','medWhen','medDoseInput','medNoteInput'].includes(e.target.id)){captureFields();const errorBox=$('#careFlowError');if(errorBox)errorBox.innerHTML='';api.save();}if(e.target.id==='chatInput'){const active=api.getActive(),flow=active&&activeFlow(active),f=['record','med'].includes(flow?.kind)?null:flow;if(f&&f.step!=='enrollIdentity'){f.composerDraft={key:composerKey,value:e.target.value};api.save();}else if(!f&&api.getActive()){api.getActive().chatDraft=e.target.value;api.save();}}});
  document.addEventListener('change',async e=>{
    const el=e.target;if(['composerCameraInput','composerFileInput'].includes(el.id)){const f=activeFlow();if(f?.kind==='record'&&el.files.length)await addRecordFiles([...el.files],f);el.value='';return;}if(el.id!=='composerImageInput')return;const f=activeFlow();if(!f||!el.files.length)return;if(f.kind==='record'){await addRecordFiles([...el.files],f);el.value='';return;}if(busy)return error('正在处理附件，请稍候');captureFields();busy=true;updateComposer();const s=session(),epoch=resetRevision,addedIds=[];
    try{
      if(el.id==='composerImageInput'){
        const files=[...el.files];
        if(f.kind==='aid'||f.kind==='enroll'){const key=el.dataset.purpose,blob=await compressImage(files[0]),id=uid('material');await put('media',{id,blob});addedIds.push(id);if(epoch!==resetRevision){await transact('media','readwrite',s=>s.delete(id));return;}f.values[key]=await dataUrl(blob);push(s,{role:'user',kind:'uploadedMaterial',media:[{id,kind:'image',name:files[0].name}],text:'已上传'+(key==='invoice'?'发票':key==='diagnosis'?'诊断材料':'处方'),flowId:f.id,purpose:key});if(f.kind==='aid'&&f.values.type==='reimburse')imagePurpose=key==='rx'?'invoice':'rx';}

      }
      if(epoch!==resetRevision)return;if(f.kind==='aid'&&f.phase==='paused')rememberAid(f);if(el.id==='composerImageInput')addBot(s,f.kind==='aid'?(f.values.type==='reimburse'&&!f.values.invoice?'处方收好了，下一步请上传发票。':'申请图片已收好，可以核对后继续。'):f.kind==='enroll'?'诊断材料收到了，眠宝陪您核对后提交。':'图片收到了，保存时我会和文字一起收好。');api.save();if(activeFlow()?.id===f.id&&api.getView()==='chat')api.renderChat();
    }catch(e){for(const id of addedIds)await transact('media','readwrite',s=>s.delete(id)).catch(()=>{});error(e.message||'附件保存失败，请重试');}finally{busy=false;el.value='';updateComposer();}
  });
  window.addEventListener('pagehide',()=>closeCamera());
  function prepareInitialView(){let changed=false;for(const s of api.getState().sessions)for(const f of s.careFlows||[])if(f.phase==='active'){if(f.kind==='aid'){f.phase='paused';rememberAid(f);changed=true;}else if(f.kind==='record'){f.phase='cancelled';changed=true;}}if(changed)api.save();}
  function clearChats(){const state=api.getState();for(const s of state.sessions)for(const f of s.careFlows||[])if(f.kind==='aid'&&['active','paused','cancelled'].includes(f.phase))rememberAid(f);resetRevision++;recordPageRevision++;closeCamera();$('#chatInput').value='';composerKey='';}
  async function reset(){resetRevision++;dataResetRevision++;recordPageRevision++;closeCamera();clearInput();composerKey='';try{await transact('records','readwrite',s=>s.clear());await transact('media','readwrite',s=>s.clear());for(const url of mediaUrls.values())URL.revokeObjectURL(url);mediaUrls.clear();records=[];}catch{}}
  return {dailyMarkup,openPanel,collapsePanel,message:richMessage,flowMarkup,hydrate,showEducation,openRecords,openMedications,beginRecord,beginMedication,beginAid,beforeNavigate:()=>closeCamera(),prepareInitialView,clearChats,interceptText,updateComposer,clearComposer:clearInput,beginEnrollment,beginAE,reset};
};

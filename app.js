/* Buildless interactive prototype. All patient and business data are fictional. */
(() => {
  'use strict';
  const DISEASE = 'NT1阵发性睡病';
  const PROJECT = 'NT1福利关爱计划';
  const STORAGE_KEY = 'knowdrug-nt1-demo-v1';
  let openingView=true;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icons = {
    chat:'<path d="M4 4h16v13H9l-5 4V4Z"/>',
    card:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
    map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/>',
    layers:'<path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',
    support:'<path d="M20 11a8 8 0 0 1-11 7l-5 3 1-6a8 8 0 1 1 15-4Z"/>',
    send:'<path d="m3 11 18-8-6 18-4-7-8-3ZM11 14 21 3"/>',
    star:'<path d="m12 3 3 6 6 1-4.5 4.5 1 6.5-5.5-3-5.5 3 1-6.5L3 10l6-1 3-6Z"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    back:'<path d="m15 5-7 7 7 7"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    phone:'<path d="M6 3h4l1 5-3 2c2 4 3 5 6 6l2-3 5 1v4c0 2-2 3-4 3C9 20 4 15 3 7c0-2 1-4 3-4Z"/>',
    doc:'<path d="M5 3h9l5 5v13H5V3ZM14 3v5h5M8 12h8M8 16h8"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    mic:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
    camera:'<path d="M3 7h4l2-3h6l2 3h4v14H3V7Z"/><circle cx="12" cy="13" r="4"/>',
    download:'<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
    upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
    pin:'<path d="M12 23S3 14 3 9a9 9 0 1 1 18 0c0 5-9 14-9 14Z"/><circle cx="12" cy="9" r="3"/>',
    location:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
    shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.chat}</svg>`;
  const now = () => new Date();
  const relativeDate = days => {const d = now(); d.setDate(d.getDate() - days); return d.toISOString();};
  const dateLabel = d => new Date(d).toLocaleDateString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'}).replaceAll('/','.');
  const mask = name => name.length < 2 ? '*' : name.length === 2 ? name[0] + '*' : name[0] + '*'.repeat(name.length - 2) + name.at(-1);
  const seedSessions = () => [4,8,13,18,25,35,60].map((day,i) => {
    const questions=['如何申请创新支付？',`${DISEASE}有哪些服务？`,'直付与后报销有什么区别？','怎么使用病程记录？','材料被驳回后怎么办？','如何联系人工客服？','怎么查看福利申请记录？'];
    return {id:`sample-${i}`,updated:relativeDate(day),messages:[{role:'user',text:questions[i]},{role:'bot',parts:[{title:'演示服务说明',text:'您可以通过助手查询相关服务，并在创新支付进度卡中查看申请状态。具体内容以项目正式发布的信息为准。'}],intent:'创新支付相关'}]};
  });
  const seedOrders = () => [
    {id:'PAP-DEMO-20260927-0186',date:relativeDate(15),type:'direct',code:'95',name:'林晓宁'},
    {id:'PAP-DEMO-20261004-0298',date:relativeDate(8),type:'reimburse',code:'15',name:'林晓宁',proxy:true},
    {id:'PAP-DEMO-20261011-0362',date:relativeDate(1),type:'direct',code:'20',name:'林晓宁'},
  ];
  function initialState(){return {enrollment:'approved',type:'direct',code:'20',patient:{name:'林晓宁',age:32,gender:'女'},orders:seedOrders(),sessions:seedSessions(),reports:[]};}
  let state = initialState();
  try {const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(saved && Array.isArray(saved.orders) && Array.isArray(saved.sessions)) state={...state,...saved};} catch {}
  // A rolling twelve-month window; no actual patient records are stored.
  const cutoff=now();cutoff.setMonth(cutoff.getMonth()-12);
  state.sessions=state.sessions.filter(s=>new Date(s.updated)>=cutoff);
  let care;
  let view='home', activeSession=null, historyLimit=3, modalKind='', selectedOrderId=null, toastTimer, typing=false, replyTimer=null, pendingDraft=null, selectedPharmacy='p1', currentCity='上海', pharmacyQuery='', mobilePanelOverlay=null, lastFocus=null;
  const patientEnrolled=()=>['noApplication','orderRejected','orderReview','approved'].includes(state.enrollment);
  const latest=()=>state.orders.at(-1);
  const save=()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}catch{showToast('浏览器存储空间不足，请减少图片或导出记录');return false;}};
  const statusOptions={
    direct:[['00','00 · 待提交'],['10','10 · 待审核'],['15','15 · 材料驳回'],['20-pharmacy','20 · 后台通过 / 待药房审核'],['20','20 · 药房审核通过'],['21','21 · 药师驳回（卡片过滤）'],['25','25 · 药店确认 / 待付款'],['30','30 · 付款完成 / 待上传发票'],['40','40 · 发票待审核'],['55','55 · 发票审核未通过'],['60','60 · 发票审核通过'],['80','80 · 报案成功'],['85','85 · 理赔中'],['90','90 · 理赔完成'],['91','91 · 理赔失败'],['95','95 · 已完成'],['92','92 · 理赔销案']],
    reimburse:[['00','00 · 待提交'],['10','10 · 待审核'],['15','15 · 材料驳回'],['20','20 · 审核通过 / 待理赔'],['80','80 · 报案成功 / 待理赔'],['85','85 · 理赔中'],['90','90 · 理赔完成'],['91','91 · 理赔失败'],['95','95 · 已完成'],['92','92 · 理赔销案'],['93','93 · 案件退回'],['94','94 · 支付信息审核']],
  };
  const enrollmentMap={
    unsubmitted:{tag:'未入组',tone:'blue',desc:'申请入组即可了解项目福利',action:'立即申请',explain:'点击进度卡进入入组申请页面。'},
    supplement:{tag:'待投保',tone:'warning',desc:'补充材料，继续领取保险权益',action:'补充材料',explain:'点击进度卡进入资料补充页面。'},
    enrollReview:{tag:'审核中',tone:'warning',desc:'已收到您的资料，正在加急审核中',action:'查看进度',explain:'点击进度卡展示审核中提示，不跳转。'},
    enrollRejected:{tag:'未通过',tone:'danger',desc:'您的资料有误，请重新提交审核',action:'修改资料',explain:'点击进度卡进入修改资料页面。'},
    noApplication:{tag:'待申请',tone:'blue',desc:'您已投保成功，快来领取福利吧',action:'查看详情',explain:'打开无申请记录弹窗，可发起福利申请。'},
    orderRejected:{tag:'未通过',tone:'danger',desc:'您的本次申请被拒，请重新提交',action:'查看详情',explain:'打开被拒订单，可查看原因并重新上传。'},
    orderReview:{tag:'审核中',tone:'warning',desc:'已收到您的申请，请留意平台消息',action:'查看详情',explain:'打开审核中订单，底部申请按钮置灰。'},
    approved:{tag:'已通过',tone:'',desc:'您的申请已通过，快去使用吧',action:'查看详情',explain:'打开已通过订单，展示对应流程节点。'},
  };
  function mappedOrder(o){
    if(!o) return {label:'待申请',tone:'blue',phase:0};
    const c=o.code;
    if(c==='00')return {label:'待提交',tone:'blue',phase:0};
    if(c==='10')return {label:'材料审核中',tone:'warning',phase:0};
    if(c==='15')return {label:'审核失败',tone:'danger',phase:0,failed:true};
    if(o.type==='direct'){
      if(c==='20-pharmacy')return {label:'待药房审核',tone:'warning',phase:1,review:true};
      if(c==='21')return {label:'卡片不展示',tone:'warning',phase:1,filtered:true};
      if(c==='20')return {label:'材料审核通过',tone:'',phase:1};
      if(c==='25')return {label:'待付款取药',tone:'',phase:1};
      return {label:'已完成',tone:'',phase:c==='30'?2:3};
    }
    if(['90','95','93','94'].includes(c))return {label:'已完成',tone:'',phase:2};
    return {label:'材料审核通过，待理赔',tone:c==='91'?'danger':'blue',phase:1,claimFailed:c==='91'};
  }
  const visibleOrders=()=>patientEnrolled()&&state.enrollment!=='noApplication'?state.orders.filter(o=>!['00','21'].includes(o.code)):[];
  function tag(text,tone=''){return `<span class="status-tag ${tone}">${esc(text)}</span>`;}
  function showToast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,2800);}
  function renderPayment(){
    const meta={...enrollmentMap[state.enrollment]};
    if(state.enrollment==='approved') {
      meta.desc=state.type==='direct'?'您的申请已通过，快去使用吧':'您的申请已通过，请静待打款';
      if(['30','40','55','60','80','85','90','91','95','92','93','94'].includes(state.code) && mappedOrder(latest()).label==='已完成')meta.tag='已完成';
    }
    $('#paymentFloat').innerHTML=`创新支付 <span class="action-status">${esc(meta.tag)}</span>`;
    $('#paymentFloat').setAttribute('aria-label',`创新支付，${meta.tag}`);
    $('#conversationActions').hidden=view!=='chat'||!(state.sessions.find(s=>s.id===activeSession)?.messages.length);
  }
  function feature(name,desc,kind,color,action){return `<button class="feature" data-action="${action}"><span class="feature-icon ${color}">${icon(kind)}</span><strong>${name}</strong><small>${desc}</small></button>`;}
  function homeMarkup(){
    return `${care?.dailyMarkup()||''}<div class="feature-grid">${feature('创新支付','特药自付减免','card','','payment')}${feature('病程记录','语音图片记录','doc','green','recordJourney')}${feature('健康科普','阅读健康知识','layers','purple','education')}${feature('联系客服','一对一咨询','support','pink','call')}</div><h4 class="section-label">${icon('star')} 猜你想问</h4><button class="question-card" data-question="${DISEASE}有哪些表现？"><strong>${DISEASE}有哪些表现？</strong><small>热门咨询 · 疾病相关</small></button><button class="question-card" data-question="${DISEASE}用药有哪些注意事项？"><strong>${DISEASE}用药有哪些注意事项？</strong><small>热门咨询 · 用药相关</small></button><button class="question-card" data-question="如何申请创新支付福利？"><strong>如何申请创新支付福利？</strong><small>热门咨询 · 创新支付相关</small></button>`;
  }
  function renderMessage(m){
    if(care&&m.kind)return care.message(m);
    if(m.role==='user')return `<div class="message user"><div class="bubble">${esc(m.text)}</div></div>`;
    return `<div class="message"><span class="bot-dot"><img src="assets/mianbao-doctor.webp" alt="眠宝"></span><div class="bubble">${(m.parts||[]).map(p=>`<p>${p.title?`<span class="bubble-title">${esc(p.title)}</span><br>`:''}${esc(p.text)}</p>`).join('')}${(m.actions||[]).map(a=>`<button class="inline-action" data-action="${a.action}">${icon(a.icon||'card')}${esc(a.label)}</button>`).join('')}${m.ae?`<div class="ae-callout">${icon('shield')}检测到疑似不良事件描述。可确认并记录事件。<br><button class="inline-action" data-action="ae" data-report="${esc(m.ae)}">查看事件信息</button></div>`:''}</div></div>`;
  }
  function renderChat(){
    const startAtTop=openingView||view==='home';
    const session=state.sessions.find(s=>s.id===activeSession);
    $('#appBody').innerHTML=`<div class="conversation" aria-live="polite">${homeMarkup()}${session?.messages.map(renderMessage).join('')||''}${care?care.flowMarkup(session):''}${typing?`<div class="message"><span class="bot-dot"><img src="assets/mianbao-doctor.webp" alt="眠宝"></span><div class="bubble typing-dot">眠宝正在整理回答…</div></div>`:''}</div>`;
    care?.updateComposer();
    requestAnimationFrame(()=>{care?.hydrate();$('#appBody').scrollTop=startAtTop?0:$('#appBody').scrollHeight;});
  }
  function serviceMarkup(){
    const submitted=state.enrollment!=='unsubmitted';
    const ss=[...state.sessions].sort((a,b)=>new Date(b.updated)-new Date(a.updated));
    const orders=visibleOrders().slice().reverse();
    return `<div class="profile-card"><span class="profile-avatar">${icon('user')}</span><div class="profile-info"><h3>${submitted?esc(mask(state.patient.name)):'待建立患者档案'}</h3><small>${submitted?`${state.patient.gender} · ${state.patient.age}岁`:'完善资料，开启您的专属服务'}</small></div>${submitted?`<span class="profile-tag">${patientEnrolled()?'已入组':state.enrollment==='supplement'?'待补充资料':'待入组'}</span>`:'<button class="inline-action" data-action="enroll">去建档</button>'}</div><section class="service-section"><h3>历史会话 <span class="section-count">近12个月</span></h3>${ss.slice(0,historyLimit).map(s=>{const user=s.messages.filter(m=>m.role==='user').at(-1);const bot=s.messages.filter(m=>m.role==='bot').at(-1);return `<button class="history-card" data-session="${esc(s.id)}"><time>${dateLabel(s.updated)}</time><strong>${esc(user?.text||'新的咨询')}</strong><p>${esc(bot?.parts?.at(-1)?.text||bot?.text||bot?.title||(bot?.kind==='articles'?'眠宝推荐的科普文章':'暂无回复'))}</p></button>`;}).join('')||'<p class="quiet-note">暂无会话记录，向助手提出第一个问题吧</p>'}${ss.length>historyLimit?'<button class="load-more" data-action="loadMore">加载更多会话</button>':'<p class="quiet-note">已显示全部会话</p>'}</section><section class="service-section"><h3>福利关爱记录 <span class="section-count">${orders.length}笔申请</span></h3>${orders.map(o=>`<button class="record-card" data-order="${esc(o.id)}"><div class="record-top"><strong>${o.type==='direct'?'直付福利申请':'后报销福利申请'}</strong>${tag(mappedOrder(o).label,mappedOrder(o).tone)}</div><p>申请时间：${dateLabel(o.date)}</p><p>订单编号：${esc(o.id)}</p><p>申请人：${esc(mask(o.name))}${o.proxy?'（代领）':''}</p></button>`).join('')||'<div class="detail-card"><p class="quiet-note">暂无福利申请记录</p><button class="secondary-button" data-action="payment">查看创新支付计划</button></div>'}</section><section class="service-section"><h3>常见功能</h3><div class="service-functions"><button data-action="call">${icon('phone')}真人客服</button><button data-action="education">${icon('layers')}健康科普</button></div></section>`;
  }
  function render(){
    $('#device').dataset.view='chat';
    $('#appLogo').hidden=false;
    $('#headerTitle').textContent=`${DISEASE}助手`;
    $('#headerBadge').textContent='已确诊患者通道';
    $('#chatBottom').hidden=false;
    renderChat();renderPayment();renderPanel();
  }
  function openService(){historyLimit=3;care.openPanel('我的服务',serviceMarkup(),'','service');}
  function renderPanel(){
    $('#enrollmentSelect').value=state.enrollment;
    $$('#typeControl button').forEach(b=>b.classList.toggle('active',b.dataset.type===state.type));
    $('#orderStatusSelect').innerHTML=statusOptions[state.type].map(([v,n])=>`<option value="${v}" ${v===state.code?'selected':''}>${n}</option>`).join('');
    $('#orderControls').hidden=!patientEnrolled()||state.enrollment==='noApplication';
    $('#statusHelp').textContent=state.code==='21'?'状态 21 的订单按需求过滤，详情默认展示最近一笔可见订单。':state.code==='20-pharmacy'?'状态码同为 20，额外使用药房审核标记区分阶段。':`对应患者端状态：${mappedOrder(latest()).label}`;
    $('#scenarioExplanation').textContent=enrollmentMap[state.enrollment].explain;
  }
  function syncLatest(){const o=latest();if(o){o.type=state.type;o.code=state.code;}save();}
  function setEnrollment(value){
    state.enrollment=value;
    if(value==='orderRejected')state.code='15';else if(value==='orderReview')state.code='10';else if(value==='approved')state.code='20';else if(value==='noApplication')state.code='00';
    syncLatest();closeModal();render();
  }
  function setOrderStatus(value){
    state.code=value;
    state.enrollment=value==='00'?'noApplication':value==='15'?'orderRejected':['10','20-pharmacy','21'].includes(value)?'orderReview':'approved';
    syncLatest();closeModal();render();
  }
  function ensureSession(force=false){
    if(force)activeSession=null;
    if(activeSession&&state.sessions.some(s=>s.id===activeSession)){const selected=state.sessions.find(s=>s.id===activeSession);if(now()-new Date(selected.updated)<3*86400000)return selected;activeSession=null;force=true;}
    const recent=state.sessions.filter(s=>!s.id.startsWith('sample-')).sort((a,b)=>new Date(b.updated)-new Date(a.updated))[0];
    if(!force&&recent&&now()-new Date(recent.updated)<3*86400000){activeSession=recent.id;return recent;}
    const s={id:'session-'+(crypto.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2)),updated:now().toISOString(),messages:[]};state.sessions.unshift(s);activeSession=s.id;return s;
  }
  function faqAnswer(text){
    const ae=/(服药|吃药|用药|注射|药后).*(不适|皮疹|头晕|恶心|呕吐|过敏|不舒服)|不良事件|不良反应/.test(text);
    if(/自杀|自伤|过量|双倍剂量|加大剂量/.test(text))return {role:'bot',parts:[{title:'需要专业人员确认',text:'这个问题涉及用药或个人安全，演示助手不会提供具体处置建议。请联系医生或专业客服获取帮助；如有紧急危险，请及时联系当地急救服务。'}],actions:[{label:'联系专业客服',action:'call',icon:'phone'}],intent:'敏感意图拦截'};
    if(/傻逼|操你|色情|赌博/.test(text))return {role:'bot',parts:[{text:'请使用文明用语，咨询疾病、药品或创新支付相关问题。'}],intent:'敏感词拦截（本地演示）'};
    const payment=/支付|福利|报销|援助|申请|投保|审核|入组|驳回|材料|费用|药费|理赔/.test(text);
    const drug=/药|剂量|漏服|存储|储存|注意事项|疗效|不良反应/.test(text)&&!/药房|药店/.test(text)||ae;
    const disease=/NT1|睡病|嗜睡|症状|疾病|表现|病因|复发|生活管理|饮食|检查|诊断/.test(text);
    const pharmacy=/药房|药店|购药|买药/.test(text);
    let parts=[],actions=[],intents=[];
    if(drug){intents.push('药品相关');parts.push({title:'用药咨询',text:ae?'已识别您描述的用药后不适，正式系统会匹配安全性 FAQ，并将疑似不良事件交由专业人员评估。本演示可继续填写事件记录。':'已为您匹配“用药注意事项”演示 FAQ。正式版本会依据药企提供的知识库回答适应症、用法用量、漏服与储存等问题；当前不提供具体药品或剂量建议。'});}
    if(disease){intents.push('疾病相关');parts.push({title:`${DISEASE}咨询`,text:'已匹配疾病相关知识库分类。正式版本将展示经过确认的疾病基础知识、症状、检查与日常管理 FAQ。此处用于演示检索和回答流程，不能据此判断诊断或选择治疗方案。'});}
    if(payment){intents.push('创新支付相关');parts.push({title:'创新支付服务',text:/驳回|补充|材料/.test(text)?'演示流程：打开创新支付进度卡，查看材料审核结果及原因；若材料被驳回，可点击“重新上传”，补充资料后再次提交。':'演示流程：申请入组 → 提交资料 → 审核通过 → 申请直付或后报销福利。点击下方入口可查看您当前的状态。具体 eligibility、保障范围和金额以正式项目规则为准。'.replace('eligibility','参与条件')});actions.push({label:'查看创新支付进度',action:'payment'});}
    if(pharmacy){intents.push('服务咨询');parts.push({title:'服务入口更新',text:'首页原直付药房入口已更新为病程记录，可通过同一卡片使用语音或上传图片，核对时间和总结后保存。直付申请中的签约药房信息仍保留在订单详情。'});actions.push({label:'打开病程记录',action:'records',icon:'doc'});}
    if(/客服|热线|人工/.test(text)){parts.push({title:'人工服务',text:'点击下方按钮可以查看客服联系方式。本演示未配置真实 400 号码。'});actions.push({label:'联系客服',action:'call',icon:'phone'});intents.push('服务咨询');}
    if(!parts.length)return {role:'bot',parts:[{text:`我可以协助您了解${DISEASE}、用药咨询与创新支付相关服务。这个问题暂不在当前知识库范围内，您可以换个相关问题，或联系人工客服。`}],actions:[{label:'联系人工客服',action:'call',icon:'phone'}],intent:'未知意图 · 固定回复'};
    return {role:'bot',parts,actions,intent:[...new Set(intents)].join(' + '),ae:ae?text:null};
  }
  function sendQuestion(text){
    text=text.trim();if(!text)return;if(care?.interceptText(text))return;if(typing){showToast('正在匹配上一条问题，请稍候');return;}
    closeModal();view='chat';const session=ensureSession();session.messages.push({role:'user',text});session.updated=now().toISOString();care?.clearComposer();typing=true;save();render();
    replyTimer=setTimeout(()=>{session.messages.push(faqAnswer(text));typing=false;save();if(view==='chat')renderChat();},550);
  }
  function openSheet(title,body,footer='',kind='generic'){
    return care.openPanel(title,body,footer,kind);
  }
  function closeModal(){modalKind='';$('#modalRoot').innerHTML='';if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});lastFocus=null;}
  function openPayment(orderId){
    if(orderId){selectedOrderId=orderId;return openOrder();}
    if(state.enrollment==='enrollReview'){showToast('已收到您的资料，正在加急审核中，请耐心等待');return;}
    if(!patientEnrolled())return care.beginEnrollment();
    const orders=visibleOrders();selectedOrderId=orders.at(-1)?.id;
    if(!orders.length)return openEmptyPayment();
    openOrder();
  }
  function openEmptyPayment(){
    openSheet('创新支付申请详情',`<div class="empty-state"><div class="empty-icon">${icon('card')}</div><h4>暂无创新支付福利申请记录</h4><p>您已加入${PROJECT}<br>完成以下步骤，开启您的福利申请</p></div><div class="guide"><h4>申请指南与流程</h4>${[['选择申请方式','选择签约药房直付，或提交发票后报销。'],['提交申请材料','填写申请信息，上传处方及相关凭证。'],['查看审核进度','审核结果会在进度卡和服务记录中展示。']].map(([t,p],i)=>`<div class="guide-step"><span class="step-num">${i+1}</span><div><strong>${t}</strong><p>${p}</p></div></div>`).join('')}</div>`,`<button class="primary-button" data-action="apply">立即提交福利申请</button>`,'payment');
  }
  function orderMaterial(o,kind){const exists=kind==='prescription'?!!o.rx:!!o.invoice,name=kind==='prescription'?'处方':'发票';const sample=o.id.startsWith('PAP-DEMO-2026')&&!o.rx&&!o.updated;if(exists||sample)return `<button class="doc-thumb" data-doc="${kind}">${icon('doc')}${sample?'示例': '已上传'}${name} · 查看</button>`;return `<span class="doc-thumb missing-material">${icon('doc')}${name}暂未上传</span>`;}
  function aidBlock(reupload=false,id=selectedOrderId){if(!patientEnrolled())return '请先完成入组，再提交福利申请';const pending=state.orders.find(o=>['10','20-pharmacy'].includes(o.code));if(pending)return '已有申请正在审核，请先查看进度';if(reupload&&!state.orders.some(o=>o.id===id&&o.code==='15'))return '这笔订单当前无需补件，请刷新详情';return '';}
  function orderTimeline(o){
    const s=mappedOrder(o);
    const list=o.type==='direct'?[['材料审核中','您上传的材料已收到，正在审核中，请耐心等待。'],['材料审核通过，请及时到店付款取药','您上传的材料已通过审核，请前往对应药房领取药品。'],['已领药，待药师完善资料','药品已经领取成功，药师将上传后续资料。'],['已完成','本次申请已完成。']]:[['材料审核中','您上传的材料已收到，正在审核中，请耐心等待。'],['材料审核通过，待理赔','材料审核已通过，请耐心等待理赔。'],['已完成','本次申请已完成。']];
    if(s.failed)list[0]=['材料审核失败','本次材料审核未通过。原因：处方图片不清晰，请重新上传完整、清晰的材料。'];
    if(o.code==='20-pharmacy')list[1]=['待药房审核','您上传的材料待药房审核，请留意后续提醒。'];
    if(s.claimFailed)list[1]=['理赔失败','理赔未成功，请联系人工客服进行处理。'];
    return `<div class="timeline"><h4>审批节点跟踪</h4>${list.map(([t,p],i)=>`<div class="timeline-step ${i<s.phase?'done':i===s.phase?(s.failed||s.claimFailed?'failed':'current'):'future'}"><span class="node"></span><div><strong>${t}</strong>${i<=s.phase?`<p>${p}</p>${i===s.phase&&o.type==='direct'&&s.phase===1&&!s.review?'<button class="inline-action" data-action="orderPharmacy">查看取药药房</button>':''}${i===s.phase&&s.claimFailed?'<button class="inline-action" data-action="call">联系人工客服</button>':''}<time>${dateLabel(o.date)}</time>`:''}</div></div>`).join('')}</div>`;
  }
  function openOrder(){
    const orders=visibleOrders();const o=orders.find(o=>o.id===selectedOrderId);if(!o){if(selectedOrderId)return openSheet('申请记录暂不可查看','<div class="call-content"><h4>未找到这笔可见申请</h4><p>订单可能不存在或当前状态不在列表中。请查看自己的福利记录。</p></div>','<button class="primary-button" data-action="myService">查看我的服务</button>','missingOrder');return openEmptyPayment();}selectedOrderId=o.id;
    const s=mappedOrder(o);const row=(label,val)=>`<div class="detail-row"><span>${label}</span><span>${val}</span></div>`;
    const data=o.type==='direct'?row('申请时间',dateLabel(o.date))+row('用药数量',`${o.quantity||1}盒（演示）`)+row('订单类型','直付')+row('药房名称','益康专业药房 · 静安店（演示）')+row('药房地址','上海市静安区示范路128号（虚构）')+row('联系方式','未配置 · 演示药房'):row('被保人',esc(mask(o.name))+(o.proxy?'（代领）':''))+row('所属银行','演示银行')+row('银行卡号','6225 **** **** 1938')+row('福利金额','<span class="money">¥ 3,870.00（演示）</span>')+row('订单类型','后报销');
    const review=!!state.orders.find(v=>['10','20-pharmacy'].includes(v.code));
    const footer=s.failed?`<button class="primary-button" data-action="reupload" ${review?'disabled':''}>${review?'其他申请审核中，请稍候':'重新上传'}</button>`:`<button class="primary-button" data-action="apply" ${review?'disabled':''}>${review?'已有申请审核中，请耐心等待':'申请新的援助'}</button>`;
    openSheet('创新支付申请详情',`<div class="order-tabs">${orders.map(v=>`<button class="order-tab ${v.id===o.id?'active':''}" data-switch-order="${esc(v.id)}">${dateLabel(v.date)} · ${mappedOrder(v).label}</button>`).join('')}</div><div class="detail-card"><h4>服务状态 ${tag(s.label,s.tone)}</h4>${row('订单编号',esc(o.id))}${data}<div class="doc-grid">${orderMaterial(o,'prescription')}${orderMaterial(o,'invoice')}</div></div>${orderTimeline(o)}`,footer,'payment');
    requestAnimationFrame(()=>$('.order-tab.active')?.scrollIntoView({block:'nearest',inline:'end'}));
  }
  function draftFor(kind){
    const o=state.orders.find(o=>o.id===selectedOrderId);
    return {kind,name:state.patient.name,age:state.patient.age,gender:state.patient.gender,type:o&&kind==='reupload'?o.type:state.type,rx:null,invoice:null};
  }
  function openEnrollment(){
    pendingDraft=draftFor('enroll');
    const supplement=state.enrollment==='supplement';const rejected=state.enrollment==='enrollRejected';
    openSheet(supplement?'补充入组材料':rejected?'修改入组资料':'申请加入福利关爱计划',`<div class="form-banner">${rejected?'驳回原因（演示）：诊断材料不完整，请补充后重新提交。':supplement?'请补充诊断材料，完成本次入组申请。':`欢迎了解${PROJECT}。以下为模拟入组表单。`}</div><form id="enrollmentForm" novalidate><label class="form-field"><span>患者姓名 *</span><input name="patientName" maxlength="12" value="${state.enrollment==='unsubmitted'?'':esc(state.patient.name)}" placeholder="填写演示姓名" required></label><label class="form-field"><span>演示身份号码 *</span><input name="demoIdentity" maxlength="18" inputmode="numeric" value="310000199404120020" placeholder="18位演示号码"><small>示例号码仅演示生日与性别计算，请勿填写真实身份证号。</small></label><div class="button-row"><label class="form-field"><span>年龄（自动计算）</span><input name="age" value="32" readonly></label><label class="form-field"><span>性别（自动计算）</span><input name="gender" value="女" readonly></label></div><label class="form-field"><span>疾病名称</span><input value="${DISEASE}" readonly></label><label class="form-field"><span>诊断材料 *</span><label class="upload-box">${icon('upload')}<span id="rxUploadLabel">上传演示图片，或使用示例材料</span><input name="rxFile" type="file" accept="image/*"></label></label><button class="secondary-button" type="button" data-action="sampleRx">使用示例诊断材料</button><label class="consent"><input type="checkbox" name="consent">我了解这是演示申请，所填信息只保存在当前浏览器，请勿填写真实患者资料。</label><div id="formErrors" role="alert"></div></form>`,`<button class="primary-button" data-submit="enrollmentForm">提交入组资料</button>`,'enroll');
  }
  function openApplication(reupload=false){
    pendingDraft=draftFor(reupload?'reupload':'apply');
    renderApplicationForm();
  }
  function renderApplicationForm(){
    const d=pendingDraft;
    openSheet(d.kind==='reupload'?'重新上传申请材料':'申请创新支付福利',`<div class="form-banner">${d.kind==='reupload'?'请补充清晰完整的材料后重新提交。':'选择申请方式，并提交演示凭证。提交后可在进度卡查看审核情况。'}</div><form id="applicationForm" novalidate><label class="form-field"><span>申请方式</span><select name="paymentType"><option value="direct" ${d.type==='direct'?'selected':''}>直付 · 在签约药房使用</option><option value="reimburse" ${d.type==='reimburse'?'selected':''}>后报销 · 提交发票申请</option></select></label><label class="form-field"><span>申请人</span><input value="${esc(mask(state.patient.name))}" readonly></label>${d.type==='direct'?'<label class="form-field"><span>签约药房</span><select name="pharmacy"><option>益康专业药房 · 静安店（演示）</option><option>惠民大药房 · 徐汇店（演示）</option></select></label><label class="form-field"><span>用药数量 *</span><input name="quantity" type="number" min="1" max="99" value="1"></label>':'<label class="form-field"><span>收款银行</span><input value="演示银行" readonly></label><label class="form-field"><span>收款账户</span><input value="6225 **** **** 1938（演示）" readonly></label>'}<label class="form-field"><span>处方材料 *</span><label class="upload-box">${icon('upload')}<span id="rxUploadLabel">${d.rx?'示例处方材料已就绪':'上传演示图片，或使用示例处方'}</span><input name="rxFile" type="file" accept="image/*"></label></label>${d.type==='reimburse'?`<label class="form-field"><span>发票材料 *</span><label class="upload-box">${icon('upload')}<span id="invoiceUploadLabel">${d.invoice?'示例发票材料已就绪':'上传演示发票，或使用示例材料'}</span><input name="invoiceFile" type="file" accept="image/*"></label></label>`:''}<button class="secondary-button" type="button" data-action="sampleAll">使用全部示例材料</button><label class="consent"><input type="checkbox" name="consent">我了解本次操作仅模拟申请流程，不发生实际支付或理赔。</label><div id="formErrors" role="alert"></div></form>`,`<button class="primary-button" data-submit="applicationForm">${d.kind==='reupload'?'重新提交申请':'提交福利申请'}</button>`,'apply');
  }
  function handleForm(id){
    const form=$('#'+id);if(!form)return;const fd=new FormData(form);let errors=[];
    if(id==='enrollmentForm'){
      if(!String(fd.get('patientName')).trim())errors.push('请填写患者姓名');
      if(!parseIdentity(String(fd.get('demoIdentity'))))errors.push('请输入包含有效出生日期的18位演示号码');
    }
    if(!pendingDraft.rx)errors.push('请上传或选择示例材料');
    if(id==='applicationForm'&&pendingDraft.type==='reimburse'&&!pendingDraft.invoice)errors.push('请选择发票材料');
    if(id==='applicationForm'&&pendingDraft.type==='direct'){const q=Number(fd.get('quantity'));if(!Number.isInteger(q)||q<1||q>99)errors.push('用药数量须为1–99的整数');}
    if(!fd.get('consent'))errors.push('请勾选演示说明');
    if(errors.length){$('#formErrors').innerHTML=errors.map(e=>`<p class="form-error">${e}</p>`).join('');$('.sheet-body').scrollTop=$('.sheet-body').scrollHeight;return;}
    if(id==='enrollmentForm'){
      state.patient={name:String(fd.get('patientName')).trim(),age:Number(fd.get('age')),gender:String(fd.get('gender'))};state.enrollment='enrollReview';save();render();
      openSheet('入组资料已提交',`<div class="success-view"><div class="success-illustration">${icon('check')}</div><h4>资料已收到</h4><p>您的入组资料已进入审核流程。<br>审核结果可在首页进度卡查看。</p></div>`,`<button class="primary-button" data-action="done">返回查看进度</button>`,'success');
    }else{
      const d=pendingDraft;let o;
      if(d.kind==='reupload')o=state.orders.find(o=>o.id===selectedOrderId);
      if(!o){o={id:'PAP-DEMO-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),date:now().toISOString(),name:state.patient.name,type:d.type,code:'10'};state.orders.push(o);}
      Object.assign(o,{code:'10',date:now().toISOString(),type:d.type,rx:d.rx,invoice:d.invoice,quantity:Number(fd.get('quantity'))||1});
      // When an older rejected order is resubmitted, it becomes the latest order.
      state.orders=state.orders.filter(v=>v.id!==o.id).concat(o);state.enrollment='orderReview';state.type=d.type;state.code='10';selectedOrderId=o.id;save();render();
      openSheet('福利申请已提交',`<div class="success-view"><div class="success-illustration">${icon('check')}</div><h4>申请已收到，正在审核</h4><p>您可以随时在进度卡或福利关爱记录<br>查看本次申请的最新状态。</p></div><div class="detail-card"><div class="detail-row"><span>订单编号</span><span>${esc(o.id)}</span></div><div class="detail-row"><span>申请方式</span><span>${d.type==='direct'?'直付':'后报销'}</span></div></div>`,`<button class="primary-button" data-action="submittedOrder">查看申请详情</button>`,'success');
    }
  }
  function documentSvg(kind){
    const title=kind==='invoice'?'福利申请发票 · 示例':kind==='diagnosis'?'诊断材料 · 示例':'处方材料 · 示例';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="860" viewBox="0 0 700 860"><rect width="700" height="860" fill="#fff"/><rect x="32" y="32" width="636" height="796" rx="6" fill="#fff" stroke="#dce5ef" stroke-width="2"/><text x="350" y="103" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#29496d">${title}</text><path d="M70 177h560" stroke="#dce5ef"/><g font-family="sans-serif" font-size="19" fill="#7890ac"><text x="75" y="236">患者：林 * 宁（虚构）</text><text x="75" y="283">疾病：${DISEASE}</text><text x="75" y="330">材料编号：DEMO-2026-001</text></g><g stroke="#e5ecf3" stroke-width="2"><path d="M75 390h550M75 448h550M75 506h550M75 564h550M75 622h550"/></g><g transform="rotate(-25 350 440)"><text x="350" y="450" text-anchor="middle" font-family="sans-serif" font-size="72" fill="#cbdcf1" opacity=".65">演示材料</text></g></svg>`;
  }
  function showDocument(kind){
    const o=state.orders.find(o=>o.id===selectedOrderId);const src=kind==='prescription'?o?.rx:kind==='invoice'?o?.invoice:null;
    if(!src&&!(o?.id.startsWith('PAP-DEMO-2026')&&!o.rx&&!o.updated))return showToast('这笔申请尚未上传该材料');
    openSheet(kind==='invoice'?'发票材料':'处方材料',`<img class="inline-document" alt="${kind==='invoice'?'发票':'处方'}材料" src="${esc(src||'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(documentSvg(kind)))}">`,'','document');
  }
  const pharmacies=[
    {id:'p1',city:'上海',name:'益康专业药房 · 静安店',address:'静安区示范路128号',distance:'1.2 km',hours:'09:00–21:00',x:36,y:32},
    {id:'p2',city:'上海',name:'惠民大药房 · 徐汇店',address:'徐汇区演示路56号',distance:'3.6 km',hours:'08:30–20:30',x:65,y:63},
    {id:'p3',city:'上海',name:'仁和专业药房 · 浦东店',address:'浦东新区样例路88号',distance:'5.8 km',hours:'09:00–20:00',x:78,y:21},
    {id:'p4',city:'北京',name:'益康专业药房 · 朝阳店',address:'朝阳区示范路101号',distance:'2.1 km',hours:'09:00–21:00',x:43,y:33},
    {id:'p5',city:'杭州',name:'惠民大药房 · 西湖店',address:'西湖区样例路66号',distance:'1.8 km',hours:'08:30–20:00',x:55,y:44},
  ];
  function pharmacyItems(){return pharmacies.filter(p=>p.city===currentCity&&(p.name+p.address).includes(pharmacyQuery));}
  function mapMarkup(items){return `<svg viewBox="0 0 350 180" preserveAspectRatio="none" aria-hidden="true"><rect width="350" height="180" fill="#edf2ef"/><path d="M250 0c-20 40 35 60 20 100s-20 65-6 80" fill="none" stroke="#b7dce9" stroke-width="31"/><path d="M0 45 240 70l110-16M80 0 65 180M160 0 192 180M0 136l350-22M17 0l37 180" fill="none" stroke="#fff" stroke-width="9"/><path d="M0 45 240 70l110-16M80 0 65 180M160 0 192 180M0 136l350-22" fill="none" stroke="#dce5e2" stroke-width="1.5"/><rect x="94" y="77" width="55" height="43" rx="7" fill="#d1e7d3"/><rect x="10" y="63" width="40" height="48" rx="5" fill="#e2e9e3"/><text x="102" y="102" fill="#8db497" font-size="10">城市绿地</text><text x="298" y="145" fill="#87bac9" font-size="10">河道</text></svg>${items.map(p=>`<button class="map-pin ${p.id===selectedPharmacy?'active':''}" style="left:${p.x}%;top:${p.y}%" data-pharmacy="${p.id}" aria-label="选择${p.name}">${icon('pin')}</button>`).join('')}<span class="map-label">示意地图 · 距离为演示数据</span><button class="map-location" data-action="locate" aria-label="使用演示位置">${icon('location')}</button>`;}
  function pharmacyList(items){return items.map(p=>`<article class="pharmacy-card ${p.id===selectedPharmacy?'selected':''}" data-pharmacy-card="${p.id}"><h4>${p.name}<small>${p.distance}</small></h4><p>${p.city}市${p.address}（虚构）<br>营业时间 ${p.hours} · 签约直付药房（演示）</p><div class="pharmacy-actions"><button data-nav="${p.id}">${icon('location')}模拟导航</button><button data-action="pharmacyCall">${icon('phone')}联系药房</button></div></article>`).join('')||'<div class="empty-state"><h4>未找到匹配的药房</h4><p>请更换城市或尝试其他药房名称</p></div>';}
  function openPharmacy(){
    const items=pharmacyItems();openSheet('查询直付药房',`<div class="map-toolbar"><select id="citySelect" aria-label="选择城市">${['上海','北京','杭州'].map(c=>`<option ${c===currentCity?'selected':''}>${c}</option>`).join('')}</select><input id="pharmacySearch" value="${esc(pharmacyQuery)}" placeholder="搜索药房名称或地址" aria-label="搜索药房"></div><div class="map-canvas" id="mapCanvas">${mapMarkup(items)}</div><div id="pharmacyList">${pharmacyList(items)}</div>`,'','pharmacy');
  }
  function refreshPharmacy(){const items=pharmacyItems();$('#mapCanvas').innerHTML=mapMarkup(items);$('#pharmacyList').innerHTML=pharmacyList(items);}
  function openCall(pharmacy=false){openSheet(pharmacy?'联系演示药房':'真人客服',`<div class="call-content"><div class="call-circle">${icon('phone')}</div><h4>${pharmacy?'药房电话尚未配置':'400客服热线待配置'}</h4><p>${pharmacy?'正式版本会使用后台维护的药房电话。':'正式版本点击后将唤起系统默认拨号功能。'}<br>本演示不拨打真实电话。</p></div>`,`<button class="primary-button" data-action="simulateCall">模拟唤起系统拨号</button>`,'call');}
  function openAE(text){
    pendingDraft={kind:'ae',text};
    openSheet('疑似不良事件记录',`<div class="form-banner">已从咨询内容中识别疑似事件。请确认信息后生成演示记录；正式版本会调用 AE 平台进行分析和上报。</div><form id="aeForm"><label class="form-field"><span>关联描述</span><textarea name="description" maxlength="500" required>${esc(text)}</textarea></label><label class="form-field"><span>发生时间</span><input type="date" name="eventDate" value="${now().toLocaleDateString('en-CA')}"></label><label class="form-field"><span>药品名称（可选）</span><input name="drugName" maxlength="50" placeholder="填写演示药品名称"></label><label class="consent"><input type="checkbox" name="consent" required>我确认这是演示事件，只生成本地记录，不向实际 AE 平台发送信息。</label><div id="aeErrors" role="alert"></div></form>`,`<button class="primary-button" data-submit="aeForm">确认并生成事件记录</button>`,'ae');
  }
  function submitAE(){
    const fd=new FormData($('#aeForm'));if(!String(fd.get('description')).trim()||!fd.get('consent')){$('#aeErrors').innerHTML='<p class="form-error">请填写事件描述并勾选演示说明</p>';return;}
    const report={id:'AE-DEMO-'+Date.now(),text:String(fd.get('description')),date:String(fd.get('eventDate')),drug:String(fd.get('drugName')),created:now().toISOString()};state.reports.push(report);save();
    openSheet('事件记录已生成',`<div class="success-view"><div class="success-illustration">${icon('shield')}</div><h4>已保存演示事件记录</h4><p>未提交至实际 AE 平台。<br>正式版本会由专业人员进一步评估。</p></div><div class="detail-card"><div class="detail-row"><span>记录编号</span><span>${esc(report.id)}</span></div><div class="detail-row"><span>描述</span><span>${esc(report.text)}</span></div><div class="detail-row"><span>记录状态</span><span>已保存至本地演示</span></div></div>`,`<button class="primary-button" data-action="done">返回咨询</button>`,'success');
  }
  function actions(name,el){
    const map={payment:()=>openPayment(),myService:openService,pharmacy:()=>care.openRecords(),orderPharmacy:()=>{showToast('取药药房及联系方式请查看当前订单信息');},records:()=>care.openRecords(),recordJourney:()=>care.beginRecord(),voiceMedical:()=>care.beginVoiceMedical(),medications:()=>care.openMedications(),newMedication:()=>care.beginMedication(),education:()=>care.showEducation(),call:()=>openCall(),pharmacyCall:()=>openCall(true),enroll:()=>care.beginEnrollment(),apply:()=>care.beginAid(false),reupload:()=>care.beginAid(true),newChat:()=>{if(typing)return showToast('请等待当前回复完成');care?.beforeNavigate();ensureSession(true);view='chat';save();render();$('#chatInput').focus();},loadMore:()=>{historyLimit+=3;care.openPanel('我的服务',serviceMarkup(),'','service');},sampleRx:()=>{pendingDraft.rx='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(documentSvg('diagnosis'));$('#rxUploadLabel').textContent='示例诊断材料已就绪';},sampleAll:()=>{pendingDraft.rx='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(documentSvg('prescription'));pendingDraft.invoice='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(documentSvg('invoice'));$('#rxUploadLabel').textContent='示例处方材料已就绪';if($('#invoiceUploadLabel'))$('#invoiceUploadLabel').textContent='示例发票材料已就绪';},done:()=>care.collapsePanel(el.closest('[data-panel-id]')?.dataset.panelId),submittedOrder:openOrder,backToOrder:openOrder,simulateCall:()=>{showToast('已模拟唤起系统拨号，未拨打真实电话');closeModal();},locate:()=>{currentCity='上海';pharmacyQuery='';selectedPharmacy='p1';openPharmacy();showToast('已使用上海演示位置，未获取设备定位');},ae:()=>care.beginAE(el.dataset.report)};
    map[name]?.();
  }
  document.addEventListener('click',e=>{
    const el=e.target.closest('button,[data-dismiss]');if(!el)return;
    if(el.dataset.dismiss){closeModal();return;}
    if(el.dataset.action)actions(el.dataset.action,el);
    if(el.dataset.question)sendQuestion(el.dataset.question);
    if(el.dataset.order)openPayment(el.dataset.order);
    if(el.dataset.switchOrder){selectedOrderId=el.dataset.switchOrder;openOrder();}
    if(el.dataset.session){const history=state.sessions.find(s=>s.id===el.dataset.session);if(history)care.openPanel('会话记录 · '+dateLabel(history.updated),history.messages.filter(m=>m.kind!=='appPanel').map(renderMessage).join('')||'<p>这段会话还没有消息。</p>','','history');}
    if(el.dataset.doc)showDocument(el.dataset.doc);
    if(el.dataset.submit){if(el.dataset.submit==='aeForm')submitAE();else handleForm(el.dataset.submit);}
    if(el.dataset.pharmacy){selectedPharmacy=el.dataset.pharmacy;refreshPharmacy();$(`[data-pharmacy-card="${selectedPharmacy}"]`)?.scrollIntoView({behavior:'smooth',block:'nearest'});}
    if(el.dataset.nav){const p=pharmacies.find(p=>p.id===el.dataset.nav);openSheet('导航路线 · 演示',`<div class="call-content"><div class="call-circle">${icon('map')}</div><h4>${p.name}</h4><p>演示位置 → ${p.city}市${p.address}<br>示例距离 ${p.distance} · 预计15分钟<br>正式版将唤起地图导航应用</p></div>`,`<button class="primary-button" data-action="pharmacy">返回药房查询</button>`,'nav');}
    if(el.dataset.type){state.type=el.dataset.type;if(!statusOptions[state.type].some(([v])=>v===state.code))state.code='20';syncLatest();closeModal();render();}
    if(el.dataset.demo){
      if(mobilePanelOverlay)closeMobilePanel();
      const sample={multi:`${DISEASE}用药有哪些注意事项，如何申请创新支付？`,ae:'服药后出现皮疹和头晕，我想咨询一下',unknown:'帮我查一下今天的股票行情'};
      if(el.dataset.demo==='link'){view='home';state.enrollment='approved';state.code='20';syncLatest();render();openPayment(latest().id);showToast('已模拟从消息卡片进入指定订单');}else sendQuestion(sample[el.dataset.demo]);
    }
  });
  document.addEventListener('change',async e=>{
    const el=e.target;
    if(el.id==='enrollmentSelect')setEnrollment(el.value);
    if(el.id==='orderStatusSelect')setOrderStatus(el.value);
    if(el.id==='citySelect'){currentCity=el.value;selectedPharmacy=pharmacyItems()[0]?.id;refreshPharmacy();}
    if(el.name==='paymentType'){pendingDraft.type=el.value;renderApplicationForm();}
    if(el.type==='file'&&pendingDraft&&['rxFile','invoiceFile'].includes(el.name)){
      const f=el.files[0];if(!f)return;
      if(!f.type.startsWith('image/')){showToast('请选择图片文件');el.value='';return;}
      if(f.size>5*1024*1024){showToast('演示图片请小于5MB');el.value='';return;}
      const draft=pendingDraft;const reader=new FileReader();reader.onload=()=>{if(draft!==pendingDraft)return;const key=el.name==='invoiceFile'?'invoice':'rx';pendingDraft[key]=reader.result;$('#'+(key==='rx'?'rxUploadLabel':'invoiceUploadLabel')).textContent=f.name+' · 已选择';};reader.readAsDataURL(f);
    }
  });
  function parseIdentity(value){
    if(!/^\d{17}[\dXx]$/.test(value))return null;
    const year=Number(value.slice(6,10)),month=Number(value.slice(10,12)),day=Number(value.slice(12,14));
    const birth=new Date(year,month-1,day),today=now();
    if(year<1900||birth.getFullYear()!==year||birth.getMonth()!==month-1||birth.getDate()!==day||birth>today)return null;
    const age=today.getFullYear()-year-((today.getMonth()+1<month||(today.getMonth()+1===month&&today.getDate()<day))?1:0);
    if(age>120)return null;
    return {age,gender:Number(value[16])%2?'男':'女'};
  }
  document.addEventListener('input',e=>{
    if(e.target.id==='pharmacySearch'){pharmacyQuery=e.target.value;refreshPharmacy();}
    if(e.target.name==='demoIdentity'){const result=parseIdentity(e.target.value);$('[name=age]').value=result?.age??'';$('[name=gender]').value=result?.gender??'';}
  });
  document.addEventListener('submit',e=>{if(['enrollmentForm','applicationForm','aeForm'].includes(e.target.id)){e.preventDefault();e.target.id==='aeForm'?submitAE():handleForm(e.target.id);}});
  $('#chatForm').addEventListener('submit',e=>{e.preventDefault();sendQuestion($('#chatInput').value);});
  $('#profileButton').addEventListener('click',openService);
  $('.send-button').innerHTML=icon('send');
  $('#paymentFloat').addEventListener('click',()=>openPayment());
  $('#clearChatButton').addEventListener('click',()=>{care.clearChats();clearTimeout(replyTimer);typing=false;state.sessions=[];activeSession=null;view='home';$('#chatInput').value='';save();render();$('#appBody').scrollTop=0;showToast('聊天记录已清空');});
  $('#resetButton').addEventListener('click',()=>{if(mobilePanelOverlay)closeMobilePanel();openSheet('重置演示数据',`<div class="call-content"><h4>恢复初始演示场景？</h4><p>本浏览器中新增的会话、申请、病程、用药和事件记录将被清除，左侧说明会保留。</p></div>`,`<div class="button-row"><button class="secondary-button" data-action="done">保留数据</button><button class="primary-button" id="confirmReset">重置演示</button></div>`,'reset');});
  document.addEventListener('click',async e=>{if(e.target.id==='confirmReset'){e.target.disabled=true;await care?.reset();clearTimeout(replyTimer);typing=false;state=initialState();activeSession=null;view='home';save();closeModal();if(mobilePanelOverlay)closeMobilePanel();render();showToast('演示数据已重置');}});
  function closeMobilePanel(){if(!mobilePanelOverlay)return;$('.mobile-panel-close')?.remove();$('.desktop-layout').append($('#demoPanel'));mobilePanelOverlay.remove();mobilePanelOverlay=null;}
  $('#mobileDemoButton').addEventListener('click',()=>{closeModal();mobilePanelOverlay=document.createElement('div');mobilePanelOverlay.className='mobile-panel-overlay';const panel=$('#demoPanel');mobilePanelOverlay.append(panel);const close=document.createElement('button');close.className='mobile-panel-close';close.textContent='关闭演示场景';close.addEventListener('click',closeMobilePanel);panel.append(close);close.addEventListener('click',()=>close.remove());$('#device').append(mobilePanelOverlay);mobilePanelOverlay.addEventListener('click',e=>{if(e.target===mobilePanelOverlay){close.remove();closeMobilePanel();}});});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){if(mobilePanelOverlay)closeMobilePanel();else if(modalKind==='doc')openOrder();else closeModal();}
    if(e.key==='Tab'&&(modalKind||mobilePanelOverlay)){const list=$$('button:not(:disabled),input:not([type="file"]),select,textarea,a[href]',mobilePanelOverlay||$('#modalRoot')).filter(el=>el.getClientRects().length);if(!list.length)return;const first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  });
  care=window.createCareExperience({
    getState:()=>state,getView:()=>view,getActive:()=>state.sessions.find(s=>s.id===activeSession),
    session:()=>ensureSession(),save,render,renderChat,esc,icon,showToast,closeModal,openSheet,
    changeView:()=>{view='chat';render();},
    setSession:id=>{activeSession=id;view='chat';},
    documentSvg,parseIdentity,aidBlock,
    submitEnrollment:v=>{const before=JSON.parse(JSON.stringify(state));state.patient={name:v.name,age:v.age,gender:v.gender};state.enrollment='enrollReview';if(!save()){state=before;return false;}return true;},
    submitCareAE:v=>{const r={id:'AE-DEMO-'+Date.now(),text:v.description,date:v.when.slice(0,10),drug:v.drugName||'',created:now().toISOString()};state.reports.push(r);if(!save()){state.reports.pop();return null;}return r;},
    submitAid:(flow)=>{
      if(aidBlock(flow.reupload,flow.orderId))return null;const before=JSON.parse(JSON.stringify(state));const v=flow.values;
      let o=flow.reupload?state.orders.find(o=>o.id===flow.orderId):null;
      if(!o)o={id:'PAP-DEMO-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),date:now().toISOString(),name:v.name,type:v.type,code:'10'};
      Object.assign(o,{code:'10',updated:now().toISOString(),type:v.type,name:v.name,region:v.region,phone:v.phone,rx:v.rx,invoice:v.invoice||null,quantity:Number(v.quantity)||1});
      state.orders=state.orders.filter(x=>x.id!==o.id).concat(o);state.enrollment='orderReview';state.type=v.type;state.code='10';selectedOrderId=o.id;
      if(!save()){state=before;return null;}return o;
    },
    getOrder:()=>state.orders.find(o=>o.id===selectedOrderId),
    openOrder:id=>{selectedOrderId=id;openOrder();}
  });
  care.prepareInitialView();
  const savedConversation=state.sessions.filter(s=>!s.id.startsWith('sample-')&&s.messages.length).sort((a,b)=>new Date(b.updated)-new Date(a.updated))[0];
  if(savedConversation){activeSession=savedConversation.id;view='chat';}
  render();openingView=false;
  // Demo deep links: index.html?order=latest or ?entry=wechat / ?entry=drug-search.
  const params=new URLSearchParams(location.search);
  if(params.has('order')){const o=latest();if(o){state.type=o.type;state.code=o.code;state.enrollment=o.code==='00'?'noApplication':o.code==='15'?'orderRejected':['10','20-pharmacy','21'].includes(o.code)?'orderReview':'approved';}render();openPayment(params.get('order')==='latest'?latest()?.id:params.get('order'));}
  if(params.has('entry'))showToast(params.get('entry')==='wechat'?'已从公众号欢迎语进入助手':'已从一码直付药品搜索进入助手');
})();

(()=>{
"use strict";
const KEY="simple_shift_manager_v3";
const PACK_SCHEMA="shift-manager-feature-pack";
const PACK_VERSION=1;
const DEFAULT_SHIFT_TYPES=[
  {id:"work",name:"勤務",color:"#2563eb",showTime:true,countsAsWork:true,countsForStaffing:true,enabled:true,protected:true},
  {id:"off",name:"休み",color:"#6b7280",showTime:false,countsAsWork:false,countsForStaffing:false,enabled:true,protected:true},
  {id:"request",name:"希望休",color:"#d97706",showTime:false,countsAsWork:false,countsForStaffing:false,enabled:true,protected:true},
  {id:"paid",name:"有給",color:"#059669",showTime:false,countsAsWork:false,countsForStaffing:false,enabled:true,protected:true},
  {id:"tentative",name:"未定",color:"#7c3aed",showTime:false,countsAsWork:false,countsForStaffing:false,enabled:true,protected:true}
];
const DEFAULT_SETTINGS={appName:"かんたんシフト管理",subtitle:"10人以下向け・ローカル保存・通知なし・PWA対応",defaultView:"week",visible:{requirements:true,summary:true,employeeSummary:true,shortages:true,ruleAlerts:true,copyWeek:true,print:true,csv:true}};
const DEFAULT_RULES={maxWeeklyHours:0,maxConsecutiveDays:0};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
const pad=n=>String(n).padStart(2,"0");
const dstr=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const pdate=s=>{const [y,m,d]=String(s).split("-").map(Number);return new Date(y,m-1,d)};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const DOWS=["日","月","火","水","木","金","土"];
let pendingPack=null;
let renderTimer=0;

function readState(){try{return JSON.parse(localStorage.getItem(KEY)||"null")||{employees:[],shifts:[],requirements:[],settings:clone(DEFAULT_SETTINGS),shiftTypes:clone(DEFAULT_SHIFT_TYPES),customFields:[],rules:clone(DEFAULT_RULES)}}catch{return {employees:[],shifts:[],requirements:[],settings:clone(DEFAULT_SETTINGS),shiftTypes:clone(DEFAULT_SHIFT_TYPES),customFields:[],rules:clone(DEFAULT_RULES)}}}
function writeState(s){localStorage.setItem(KEY,JSON.stringify(s))}
function safeColor(v){return /^#[0-9a-f]{6}$/i.test(String(v||""))?String(v):"#6b7280"}
function safeId(v,prefix="id"){const s=String(v||"").replace(/[^a-zA-Z0-9_-]/g,"-").slice(0,48);return s||`${prefix}-${Date.now().toString(36)}`}
function normalizePack(raw){
  if(!raw||typeof raw!=="object")throw new Error("JSON形式が正しくありません。");
  if(raw.$schema!==PACK_SCHEMA)throw new Error("このアプリ用の機能パックではありません。");
  if(Number(raw.version)!==PACK_VERSION)throw new Error(`未対応の機能パック version: ${raw.version}`);
  const c=raw.config&&typeof raw.config==="object"?raw.config:{};
  const settings=c.settings&&typeof c.settings==="object"?c.settings:{};
  const visible=settings.visible&&typeof settings.visible==="object"?settings.visible:{};
  const shiftTypes=Array.isArray(c.shiftTypes)?c.shiftTypes.slice(0,20).map(t=>({
    id:safeId(t.id,"type"),name:String(t.name||"種別").slice(0,24),color:safeColor(t.color),enabled:t.enabled!==false,
    showTime:!!t.showTime,countsAsWork:!!t.countsAsWork,countsForStaffing:!!t.countsForStaffing,protected:DEFAULT_SHIFT_TYPES.some(d=>d.id===t.id)
  })):[];
  const customFields=Array.isArray(c.customFields)?c.customFields.slice(0,12).map(f=>({
    id:safeId(f.id,"field"),label:String(f.label||"項目").slice(0,30),type:["text","number","select","checkbox"].includes(f.type)?f.type:"text",
    options:Array.isArray(f.options)?f.options.slice(0,30).map(x=>String(x).slice(0,40)):[],required:!!f.required
  })):[];
  const rules={maxWeeklyHours:Math.max(0,Math.min(168,Number(c.rules?.maxWeeklyHours)||0)),maxConsecutiveDays:Math.max(0,Math.min(31,Math.floor(Number(c.rules?.maxConsecutiveDays)||0)))};
  const requirements=Array.isArray(c.requirements)?c.requirements.slice(0,80).map(r=>({
    id:safeId(r.id,"req"),day:["all","0","1","2","3","4","5","6"].includes(String(r.day))?String(r.day):"all",
    start:/^\d{2}:\d{2}$/.test(String(r.start||""))?String(r.start):"18:00",end:/^\d{2}:\d{2}$/.test(String(r.end||""))?String(r.end):"23:00",
    count:Math.max(1,Math.min(10,Math.floor(Number(r.count)||1)))
  })):[];
  return {$schema:PACK_SCHEMA,version:PACK_VERSION,name:String(raw.name||"名称未設定パック").slice(0,60),description:String(raw.description||"").slice(0,300),config:{
    settings:{appName:settings.appName?String(settings.appName).slice(0,40):undefined,subtitle:settings.subtitle!==undefined?String(settings.subtitle).slice(0,80):undefined,defaultView:["week","month","list"].includes(settings.defaultView)?settings.defaultView:undefined,visible:Object.fromEntries(Object.entries(visible).filter(([k,v])=>k in DEFAULT_SETTINGS.visible&&typeof v==="boolean"))},
    shiftTypes,customFields,rules,requirements
  }};
}
function exportPack(){
  const s=readState();
  const pack={$schema:PACK_SCHEMA,version:PACK_VERSION,name:`${s.settings?.appName||"シフト管理"} カスタマイズ`,description:"この端末のカスタマイズ設定を書き出した機能パックです。従業員・シフト実績は含みません。",createdAt:new Date().toISOString(),config:{settings:clone(s.settings||DEFAULT_SETTINGS),shiftTypes:clone(s.shiftTypes||DEFAULT_SHIFT_TYPES),customFields:clone(s.customFields||[]),rules:clone(s.rules||DEFAULT_RULES),requirements:clone(s.requirements||[])}};
  const text=JSON.stringify(pack,null,2),blob=new Blob([text],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`shift-feature-pack-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  showPackStatus("機能パックを書き出しました。従業員・シフト実績は含まれません。")
}
function copyPackJson(){
  const s=readState(),pack={$schema:PACK_SCHEMA,version:PACK_VERSION,name:`${s.settings?.appName||"シフト管理"} カスタマイズ`,description:"ChatGPTなどで編集できる機能パック",config:{settings:s.settings||DEFAULT_SETTINGS,shiftTypes:s.shiftTypes||DEFAULT_SHIFT_TYPES,customFields:s.customFields||[],rules:s.rules||DEFAULT_RULES,requirements:s.requirements||[]}},text=JSON.stringify(pack,null,2);
  navigator.clipboard?.writeText(text).then(()=>showPackStatus("現在の機能パックJSONをコピーしました。"),()=>{const ta=$("#packJsonText");if(ta){ta.value=text;ta.select()}showPackStatus("JSON欄に出力しました。")});
}
function mergeUnique(current,incoming,key="id"){const out=clone(current||[]),idx=new Map(out.map((x,i)=>[x[key],i]));incoming.forEach(x=>{if(idx.has(x[key]))out[idx.get(x[key])]={...out[idx.get(x[key])],...x};else{idx.set(x[key],out.length);out.push(clone(x))}});return out}
function applyPack(pack,mode="merge",includeRequirements=false){
  const p=normalizePack(pack),s=readState(),usedTypes=new Set((s.shifts||[]).map(x=>x.type||"work"));
  if(mode==="replace"){
    const incomingIds=new Set(p.config.shiftTypes.map(t=>t.id));
    const usedMissing=(s.shiftTypes||[]).filter(t=>usedTypes.has(t.id)&&!incomingIds.has(t.id)&&!DEFAULT_SHIFT_TYPES.some(d=>d.id===t.id));
    s.settings={...clone(DEFAULT_SETTINGS),...p.config.settings,visible:{...DEFAULT_SETTINGS.visible,...(p.config.settings.visible||{})}};
    s.shiftTypes=mergeUnique(clone(DEFAULT_SHIFT_TYPES),[...p.config.shiftTypes,...usedMissing]);
    s.customFields=clone(p.config.customFields);
    s.rules={...clone(DEFAULT_RULES),...p.config.rules};
    if(includeRequirements)s.requirements=clone(p.config.requirements);
  }else{
    s.settings={...clone(DEFAULT_SETTINGS),...(s.settings||{}),...p.config.settings,visible:{...DEFAULT_SETTINGS.visible,...(s.settings?.visible||{}),...(p.config.settings.visible||{})}};
    s.shiftTypes=mergeUnique(s.shiftTypes||clone(DEFAULT_SHIFT_TYPES),p.config.shiftTypes);
    s.customFields=mergeUnique(s.customFields||[],p.config.customFields);
    s.rules={...DEFAULT_RULES,...(s.rules||{}),...p.config.rules};
    if(includeRequirements)s.requirements=mergeRequirements(s.requirements||[],p.config.requirements);
  }
  DEFAULT_SHIFT_TYPES.forEach(d=>{const x=s.shiftTypes.find(t=>t.id===d.id);if(!x)s.shiftTypes.push(clone(d));else if(d.id==="work")Object.assign(x,{enabled:true,showTime:true,countsAsWork:true,countsForStaffing:true,protected:true})});
  writeState(s);sessionStorage.setItem("shift_l2_notice",`「${p.name}」を${mode==="replace"?"置き換え":"追加"}で適用しました。`);location.reload();
}
function mergeRequirements(a,b){const key=r=>`${r.day}|${r.start}|${r.end}|${r.count}`,seen=new Set(a.map(key));return [...a,...b.filter(r=>!seen.has(key(r)))].slice(0,100)}
function packSummary(p){const c=p.config;return `「${p.name}」\nシフト種別: ${c.shiftTypes.length}件 / 従業員項目: ${c.customFields.length}件\n警告ルール: 週${c.rules.maxWeeklyHours||"無効"}${c.rules.maxWeeklyHours?"h":""}・連勤${c.rules.maxConsecutiveDays||"無効"}${c.rules.maxConsecutiveDays?"日":""}\n必要人数テンプレート: ${c.requirements.length}件`}
function showPackStatus(t){const el=$("#packStatus");if(el)el.textContent=t}
function loadPackText(text){if(text.length>250000)throw new Error("機能パックが大きすぎます（250KBまで）。");const p=normalizePack(JSON.parse(text));pendingPack=p;const prev=$("#packPreview");if(prev)prev.textContent=packSummary(p)+(p.description?`\n${p.description}`:"");showPackStatus("内容を確認して「このパックを適用」を押してください。")}

const BUILT_INS={
 restaurant:{$schema:PACK_SCHEMA,version:1,name:"飲食店ベーシック",description:"ホール・キッチン・責任者などを従業員属性として追加し、仕込み/研修を勤務種別として追加します。",config:{settings:{visible:{requirements:true,shortages:true,employeeSummary:true,ruleAlerts:true}},shiftTypes:[{id:"prep",name:"仕込み",color:"#0891b2",showTime:true,countsAsWork:true,countsForStaffing:true,enabled:true},{id:"training",name:"研修",color:"#7c3aed",showTime:true,countsAsWork:true,countsForStaffing:false,enabled:true}],customFields:[{id:"role-food",label:"担当",type:"select",options:["ホール","キッチン","両方","責任者"],required:false},{id:"can-close",label:"締め作業可",type:"checkbox",options:[],required:false},{id:"skill-food",label:"スキル/持ち場",type:"text",options:[],required:false}],rules:{maxWeeklyHours:0,maxConsecutiveDays:0},requirements:[]}},
 bar:{$schema:PACK_SCHEMA,version:1,name:"バー・スナック",description:"キャスト/スタッフ/責任者、送迎可否、同伴・送迎の勤務区分を追加します。",config:{settings:{visible:{requirements:true,shortages:true,employeeSummary:true}},shiftTypes:[{id:"accompany",name:"同伴",color:"#be185d",showTime:true,countsAsWork:false,countsForStaffing:false,enabled:true},{id:"pickup",name:"送迎",color:"#0891b2",showTime:true,countsAsWork:true,countsForStaffing:false,enabled:true},{id:"training-bar",name:"研修",color:"#7c3aed",showTime:true,countsAsWork:true,countsForStaffing:false,enabled:true}],customFields:[{id:"role-bar",label:"区分",type:"select",options:["キャスト","スタッフ","責任者"],required:false},{id:"pickup-ok",label:"送迎対象",type:"checkbox",options:[],required:false},{id:"driver-ok",label:"運転可",type:"checkbox",options:[],required:false}],rules:{maxWeeklyHours:0,maxConsecutiveDays:0},requirements:[]}},
 salon:{$schema:PACK_SCHEMA,version:1,name:"美容・サロン",description:"スタイリスト/アシスタントなどの役割や施術スキルを管理しやすくします。",config:{settings:{visible:{requirements:true,employeeSummary:true}},shiftTypes:[{id:"training-salon",name:"技術研修",color:"#7c3aed",showTime:true,countsAsWork:true,countsForStaffing:false,enabled:true},{id:"meeting",name:"ミーティング",color:"#ea580c",showTime:true,countsAsWork:true,countsForStaffing:false,enabled:true}],customFields:[{id:"role-salon",label:"役割",type:"select",options:["スタイリスト","アシスタント","受付","責任者"],required:false},{id:"skills-salon",label:"対応メニュー/スキル",type:"text",options:[],required:false},{id:"nomination",label:"指名対応",type:"checkbox",options:[],required:false}],rules:{maxWeeklyHours:0,maxConsecutiveDays:0},requirements:[]}},
 retail:{$schema:PACK_SCHEMA,version:1,name:"小売・販売",description:"レジ・品出し・責任者などの担当区分と開店/閉店作業を追加します。",config:{settings:{visible:{requirements:true,shortages:true,employeeSummary:true}},shiftTypes:[{id:"opening",name:"開店作業",color:"#059669",showTime:true,countsAsWork:true,countsForStaffing:true,enabled:true},{id:"closing",name:"閉店作業",color:"#ea580c",showTime:true,countsAsWork:true,countsForStaffing:true,enabled:true}],customFields:[{id:"role-retail",label:"担当",type:"select",options:["レジ","品出し","接客","責任者","複数対応"],required:false},{id:"cashier-ok",label:"レジ対応可",type:"checkbox",options:[],required:false}],rules:{maxWeeklyHours:0,maxConsecutiveDays:0},requirements:[]}}
};

function createPackModal(){if($("#featurePackModal"))return;
  const wrap=document.createElement("div");wrap.id="featurePackModal";wrap.className="modal-backdrop";wrap.setAttribute("aria-hidden","true");wrap.innerHTML=`<div class="modal wide"><h2>🧩 機能パック <span class="pack-badge">Level 2</span></h2>
  <div class="settings-section"><div class="settings-note">従業員・シフト実績を消さずに、勤務種別・従業員項目・表示設定・警告ルールをJSONで追加できます。ChatGPTで作った機能パックも読み込めます。</div></div>
  <div class="settings-section"><h3>おすすめパック</h3><div class="pack-card-grid">
    ${Object.entries(BUILT_INS).map(([id,p])=>`<div class="pack-card"><h4>${esc(p.name)}</h4><p>${esc(p.description)}</p><button type="button" class="btn small" data-built-pack="${id}">内容を見る</button></div>`).join("")}
  </div></div>
  <div class="settings-section"><h3>読み込み / 共有</h3><div class="pack-toolbar"><button type="button" class="btn" id="exportPackBtn">JSONを書き出す</button><button type="button" class="btn" id="copyPackBtn">JSONをコピー</button><label class="btn" for="packFileInput">ファイルを選ぶ</label><input type="file" id="packFileInput" accept="application/json,.json" class="file-input"></div>
    <div class="field" style="margin-top:9px"><label for="packJsonText">またはJSONを貼り付け</label><textarea id="packJsonText" class="pack-textarea" placeholder='{"$schema":"shift-manager-feature-pack", ...}'></textarea></div><div class="settings-actions-row"><button type="button" class="btn small" id="parsePackJsonBtn">貼り付けたJSONを確認</button></div></div>
  <div class="settings-section"><h3>適用内容</h3><div id="packPreview" class="pack-preview">まだ機能パックが選択されていません。</div><div class="settings-grid" style="margin-top:9px"><div class="field"><label for="packApplyMode">適用方法</label><select id="packApplyMode"><option value="merge">追加・更新（おすすめ）</option><option value="replace">カスタマイズを置き換え</option></select></div><label class="toggle-row"><input type="checkbox" id="packIncludeRequirements"> 必要人数テンプレートも適用</label></div><div class="pack-danger" style="margin-top:9px">「置き換え」でも、既存シフトで使用中の独自勤務種別は保護されます。従業員・シフト実績は削除しません。</div><div id="packStatus" class="pack-status" style="margin-top:8px"></div></div>
  <div class="modal-actions"><button type="button" class="btn" id="closePackBtn">閉じる</button><button type="button" class="btn primary" id="applyPackBtn" disabled>このパックを適用</button></div></div>`;
  document.body.appendChild(wrap);
  $("#closePackBtn").onclick=closePackModal;wrap.addEventListener("click",e=>{if(e.target===wrap)closePackModal()});
  $("#exportPackBtn").onclick=exportPack;$("#copyPackBtn").onclick=copyPackJson;
  $("#packFileInput").addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;try{loadPackText(await f.text());$("#applyPackBtn").disabled=false}catch(err){pendingPack=null;$("#applyPackBtn").disabled=true;showPackStatus(`読み込みエラー: ${err.message}`)}});
  $("#parsePackJsonBtn").onclick=()=>{try{loadPackText($("#packJsonText").value.trim());$("#applyPackBtn").disabled=false}catch(err){pendingPack=null;$("#applyPackBtn").disabled=true;showPackStatus(`JSONエラー: ${err.message}`)}};
  $("#applyPackBtn").onclick=()=>{if(!pendingPack)return;const mode=$("#packApplyMode").value,req=$("#packIncludeRequirements").checked;if(mode==="replace"&&!confirm("現在のカスタマイズ設定をこのパック中心に置き換えますか？\n従業員・シフト実績は残ります。"))return;applyPack(pendingPack,mode,req)};
  wrap.addEventListener("click",e=>{const id=e.target?.dataset?.builtPack;if(!id)return;try{pendingPack=normalizePack(BUILT_INS[id]);$("#packPreview").textContent=packSummary(pendingPack)+`\n${pendingPack.description}`;$("#applyPackBtn").disabled=false;showPackStatus("おすすめパックを選択しました。適用方法を確認してください。")}catch(err){showPackStatus(err.message)}});
}
function openPackModal(){createPackModal();pendingPack=null;$("#packPreview").textContent="まだ機能パックが選択されていません。";$("#packStatus").textContent="";$("#applyPackBtn").disabled=true;const m=$("#featurePackModal");m.classList.add("show");m.setAttribute("aria-hidden","false")}
function closePackModal(){const m=$("#featurePackModal");if(!m)return;m.classList.remove("show");m.setAttribute("aria-hidden","true")}
function injectPackButton(){const settingsBtn=$("#settingsBtn");if(!settingsBtn||$("#featurePackBtn"))return;const b=document.createElement("button");b.id="featurePackBtn";b.className="btn";b.textContent="🧩 機能パック";b.onclick=openPackModal;settingsBtn.after(b)}

function createMobileUi(){if($("#mobileBottomNav"))return;
  const overlay=document.createElement("div");overlay.className="mobile-side-overlay";overlay.onclick=closeStaffSheet;document.body.appendChild(overlay);
  const side=$("aside.side");if(side){const c=document.createElement("button");c.type="button";c.className="mobile-side-close";c.textContent="×";c.setAttribute("aria-label","スタッフパネルを閉じる");c.onclick=closeStaffSheet;side.prepend(c)}
  const nav=document.createElement("nav");nav.id="mobileBottomNav";nav.className="mobile-bottom-nav";nav.setAttribute("aria-label","モバイルナビゲーション");nav.innerHTML=`
    <button class="mobile-nav-btn" data-mobile-view="week"><span class="icon">▦</span><span>週</span></button>
    <button class="mobile-nav-btn" data-mobile-view="month"><span class="icon">▣</span><span>月</span></button>
    <button class="mobile-nav-btn" data-mobile-view="list"><span class="icon">☷</span><span>一覧</span></button>
    <button class="mobile-nav-btn" data-mobile-action="staff"><span class="icon">♟</span><span>スタッフ</span></button>
    <button class="mobile-nav-btn" data-mobile-action="settings"><span class="icon">⚙</span><span>設定</span></button>`;document.body.appendChild(nav);
  nav.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.mobileView){clickView(b.dataset.mobileView);window.scrollTo({top:0,behavior:"smooth"})}else if(b.dataset.mobileAction==="staff")openStaffSheet();else if(b.dataset.mobileAction==="settings")$("#settingsBtn")?.click()});
  const fab=document.createElement("button");fab.type="button";fab.className="mobile-fab";fab.setAttribute("aria-label","シフトを追加");fab.textContent="＋";fab.onclick=()=>$("#addShiftTop")?.click();document.body.appendChild(fab);
  const agenda=document.createElement("div");agenda.id="mobileAgenda";agenda.className="mobile-agenda hidden";$("#weekView")?.parentElement?.insertBefore(agenda,$("#weekView"));
}
function openStaffSheet(){document.body.classList.add("mobile-staff-open")}
function closeStaffSheet(){document.body.classList.remove("mobile-staff-open")}
function clickView(view){const b=$(`.view-tabs [data-view="${view}"]`)||$(`[data-view="${view}"]`);if(b)b.click()}
function activeView(){return $(".view-tabs [data-view].active")?.dataset.view||"week"}
function syncMobileNav(){const v=activeView();$$('[data-mobile-view]').forEach(b=>b.classList.toggle("active",b.dataset.mobileView===v));const agenda=$("#mobileAgenda");if(!agenda)return;agenda.classList.toggle("hidden",v==="list");if(v!=="list")renderMobileAgenda(v)}
function stateMeta(s,id){return (s.shiftTypes||[]).find(t=>t.id===(id||"work"))||{id:id||"work",name:id||"種別",color:"#6b7280",showTime:false,countsAsWork:false}}
function getWeekDates(){const dates=[...new Set($$("#calendar [data-add-cell]").map(x=>x.dataset.addCell?.split("|")[1]).filter(Boolean))].sort();if(dates.length)return dates;const text=$("#periodLabel")?.textContent||"",m=text.match(/(\d{4})年\s*(\d{1,2})\/(\d{1,2})\s*〜\s*(\d{1,2})\/(\d{1,2})/);if(!m)return [dstr(new Date())];const start=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));return Array.from({length:7},(_,i)=>dstr(addDays(start,i)))}
function getMonthDates(){const dates=[...new Set($$("#monthGrid [data-add-date]").map(x=>x.dataset.addDate).filter(Boolean))];const text=$("#periodLabel")?.textContent||"",m=text.match(/(\d{4})年\s*(\d{1,2})月/);if(!m)return dates;const ym=`${m[1]}-${pad(m[2])}-`;return dates.filter(d=>d.startsWith(ym))}
function renderMobileAgenda(view){clearTimeout(renderTimer);renderTimer=setTimeout(()=>{const root=$("#mobileAgenda");if(!root)return;const s=readState(),dates=view==="month"?getMonthDates():getWeekDates(),today=dstr(new Date());let shown=dates;if(view==="month"){const withShift=new Set((s.shifts||[]).filter(x=>dates.includes(x.date)).map(x=>x.date));shown=dates.filter(d=>withShift.has(d)||d===today);if(!shown.length)shown=dates.slice(0,Math.min(7,dates.length))}
  root.innerHTML=`${view==="month"?`<div class="mobile-month-summary">${esc($("#periodLabel")?.textContent||"")}・シフトがある日を中心に表示</div>`:""}<div class="mobile-agenda-days"></div>`;const list=root.querySelector(".mobile-agenda-days");shown.forEach(ds=>list.appendChild(makeDayCard(s,ds,today)));syncMobileNavOnly();},20)}
function syncMobileNavOnly(){const v=activeView();$$('[data-mobile-view]').forEach(b=>b.classList.toggle("active",b.dataset.mobileView===v))}
function makeDayCard(s,ds,today){const date=pdate(ds),card=document.createElement("section");card.className="mobile-day-card"+(ds===today?" today":"");const shifts=(s.shifts||[]).filter(x=>x.date===ds).sort((a,b)=>(a.start||"").localeCompare(b.start||""));card.innerHTML=`<div class="mobile-day-head"><div><div class="mobile-day-date">${date.getMonth()+1}月${date.getDate()}日</div><div class="mobile-day-dow">${DOWS[date.getDay()]}曜日${ds===today?" ・ 今日":""}</div></div><span style="flex:1"></span><button type="button" class="mobile-day-add" data-mobile-add="${ds}" aria-label="${ds}にシフト追加">＋</button></div><div class="mobile-shift-list"></div>`;const list=card.querySelector(".mobile-shift-list");if(!shifts.length)list.innerHTML='<div class="mobile-day-empty">シフトなし</div>';else shifts.forEach(x=>{const e=(s.employees||[]).find(z=>z.id===x.employeeId),t=stateMeta(s,x.type),color=t.countsAsWork?(e?.color||t.color):t.color,row=document.createElement("div");row.className="mobile-shift-item";row.style.color=color;row.innerHTML=`<span class="mobile-shift-bar"></span><div class="mobile-shift-main"><div class="mobile-shift-name">${esc(e?.name||"未登録")} <span style="color:${esc(t.color)};font-size:10px">${esc(t.name)}</span></div><div class="mobile-shift-meta">${t.showTime?`${esc(x.start||"")}–${esc(x.end||"")}`:"時間指定なし"}</div>${x.note?`<div class="mobile-shift-note">${esc(x.note)}</div>`:""}</div><button type="button" class="mobile-shift-edit" data-mobile-edit="${esc(x.id)}">編集</button>`;list.appendChild(row)});return card}
function openShiftForDate(ds){$("#addShiftTop")?.click();setTimeout(()=>{const x=$("#shiftDate");if(x){x.value=ds;x.dispatchEvent(new Event("change",{bubbles:true}))}},0)}
function editShift(id){const existing=$(`[data-edit-shift="${CSS.escape(id)}"]`);if(existing){existing.click();return}const s=readState(),x=(s.shifts||[]).find(v=>v.id===id);if(!x)return;$("#shiftEditId").value=x.id;$("#shiftEmployee").value=x.employeeId;$("#shiftDate").value=x.date;$("#shiftType").value=x.type||"work";$("#startTime").value=x.start||"18:00";$("#endTime").value=x.end||"23:00";$("#shiftNote").value=x.note||"";$("#shiftType").dispatchEvent(new Event("change",{bubbles:true}));const m=$("#shiftModal");m.classList.add("show");m.setAttribute("aria-hidden","false")}
function bindMobileAgenda(){document.addEventListener("click",e=>{const a=e.target.closest("[data-mobile-add]");if(a){openShiftForDate(a.dataset.mobileAdd);return}const ed=e.target.closest("[data-mobile-edit]");if(ed)editShift(ed.dataset.mobileEdit)});const obs=new MutationObserver(()=>{if(matchMedia("(max-width:760px)").matches)syncMobileNav()});["#calendar","#monthGrid","#periodLabel","#listView"].forEach(sel=>{const el=$(sel);if(el)obs.observe(el,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["class"]})});window.addEventListener("resize",()=>{if(matchMedia("(max-width:760px)").matches)syncMobileNav();else closeStaffSheet()})}

function init(){injectPackButton();createPackModal();createMobileUi();bindMobileAgenda();document.addEventListener("keydown",e=>{if(e.key==="Escape"){closePackModal();closeStaffSheet()}});if(matchMedia("(max-width:760px)").matches)syncMobileNav();const msg=sessionStorage.getItem("shift_l2_notice");if(msg){sessionStorage.removeItem("shift_l2_notice");setTimeout(()=>{const n=$("#notice");if(n){n.textContent=msg;n.classList.add("show");setTimeout(()=>n.classList.remove("show"),2600)}},200)}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();

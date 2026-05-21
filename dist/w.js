/*! CCM Feedback MVP — https://github.com/ccmdesign/ccm-feedback-tool */
"use strict";var CcmFeedback=(()=>{var ot=Object.defineProperty;var de=Object.getOwnPropertyDescriptor;var pe=Object.getOwnPropertyNames;var ue=Object.prototype.hasOwnProperty;var he=(e,t)=>{for(var r in t)ot(e,r,{get:t[r],enumerable:!0})},fe=(e,t,r,n)=>{if(t&&typeof t=="object"||typeof t=="function")for(let o of pe(t))!ue.call(e,o)&&o!==r&&ot(e,o,{get:()=>t[o],enumerable:!(n=de(t,o))||n.enumerable});return e};var me=e=>fe(ot({},"__esModule",{value:!0}),e);var tr={};he(tr,{initCcmFeedback:()=>Et});var St="ccm-feedback:author",ge="Anonymous";function be(){try{let e=localStorage.getItem(St);return e?.trim()?e.trim():null}catch{return null}}function ve(e){try{localStorage.setItem(St,e.trim())}catch{}}function j(){let e=be();if(e)return e;let t=null;try{t=window.prompt("Your name (shown next to your comments):","")}catch{t=null}let r=t?.trim()||ge;return ve(r),r}function $(e){let n=document.createRange().createContextualFragment(e).firstElementChild;if(!n||n.nodeName.toLowerCase()!=="svg")throw new Error("[ccm-feedback] Invalid SVG string");for(let o of[...n.attributes])o.name.startsWith("on")&&n.removeAttribute(o.name);for(let o of n.querySelectorAll("*"))for(let a of[...o.attributes])a.name.startsWith("on")&&o.removeAttribute(a.name);return n}function d(e,t){let r=document.createElement(e);if(t)for(let[n,o]of Object.entries(t))n==="class"?r.className=o:n==="style"?r.style.cssText=o:r.setAttribute(n,o);return r}function h(e,t){e.textContent=t}var At=25;function Tt(e){let t={};for(let n of Array.from(e.attributes))t[n.name]=n.value;let r=e.getBoundingClientRect();return{tag:e.tagName.toLowerCase(),attributes:t,rect:{x:r.left,y:r.top,w:r.width,h:r.height}}}var H=class{constructor(t,r,n,o,a){this.colors=t;this.bus=r;this.t=n;this.onCapture=o;this.shouldIgnoreElement=a;this.overlay=null;this.toolbar=null;this.isActive=!1;this.savedOverflow="";this.onKey=t=>{t.key==="Escape"&&(t.preventDefault(),this.deactivate())};this.onClick=t=>{if(t.preventDefault(),t.stopPropagation(),!this.overlay)return;let r=t.clientX,n=t.clientY;this.overlay.style.pointerEvents="none";let o=document.elementsFromPoint(r,n);this.overlay&&(this.overlay.style.pointerEvents="auto");let a=o.filter(l=>!this.shouldIgnoreElement(l)).filter(l=>l!==document.documentElement&&l!==document.body).slice(0,At).map(Tt),s=r+window.scrollX,i=n+window.scrollY;this.deactivate(),this.onCapture({x:s,y:i,elements:a})};this.unsubStart=this.bus.on("pin:start",()=>this.activate())}activate(){if(this.isActive)return;this.isActive=!0,this.savedOverflow=document.body.style.overflow,this.overlay=d("div",{style:`position:fixed;inset:0;z-index:${2147483646};background:rgba(15,23,42,0.04);cursor:crosshair;`}),this.overlay.setAttribute("data-ccm-coord-pin-overlay","true"),this.toolbar=d("div",{style:`
        position:fixed;top:0;left:0;right:0;z-index:${2147483647};
        height:52px;background:${this.colors.glassBg};
        backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
        border-bottom:1px solid ${this.colors.glassBorder};
        display:flex;align-items:center;justify-content:center;gap:16px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:14px;color:${this.colors.text};
      `});let t=d("span",{style:"font-weight:500;letter-spacing:-0.01em;"});h(t,this.t("coordPin.instruction"));let r=document.createElement("button");r.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;
    `,h(r,this.t("pin.cancel")),r.addEventListener("click",()=>this.deactivate()),this.toolbar.appendChild(t),this.toolbar.appendChild(r),this.overlay.addEventListener("click",this.onClick,!0),document.addEventListener("keydown",this.onKey),document.body.style.overflow="hidden",document.body.appendChild(this.overlay),document.body.appendChild(this.toolbar)}deactivate(){this.isActive&&(this.isActive=!1,this.overlay?.removeEventListener("click",this.onClick,!0),document.removeEventListener("keydown",this.onKey),document.body.style.overflow=this.savedOverflow,this.overlay?.remove(),this.toolbar?.remove(),this.overlay=null,this.toolbar=null,this.bus.emit("pin:end"))}destroy(){this.deactivate(),this.unsubStart()}},z=class{constructor(t,r,n,o,a){this.colors=t;this.bus=r;this.t=n;this.onCapture=o;this.shouldIgnoreElement=a;this.overlay=null;this.toolbar=null;this.rectEl=null;this.isActive=!1;this.savedOverflow="";this.dragStart=null;this.onKey=t=>{t.key==="Escape"&&(t.preventDefault(),this.deactivate())};this.onMouseDown=t=>{t.preventDefault(),t.stopPropagation(),this.dragStart={x:t.clientX,y:t.clientY},this.rectEl||(this.rectEl=d("div",{style:`
          position:fixed;z-index:${2147483647};
          border:2px dashed ${this.colors.accent};
          background:${this.colors.accent}1a;
          pointer-events:none;
        `}),document.body.appendChild(this.rectEl)),this.updateRect(t.clientX,t.clientY)};this.onMouseMove=t=>{this.dragStart&&this.updateRect(t.clientX,t.clientY)};this.onMouseUp=t=>{if(!this.dragStart)return;t.preventDefault(),t.stopPropagation();let r=this.dragStart,n=Math.min(r.x,t.clientX),o=Math.min(r.y,t.clientY),a=Math.abs(t.clientX-r.x),s=Math.abs(t.clientY-r.y);if(this.dragStart=null,a<4||s<4){this.rectEl?.remove(),this.rectEl=null;return}let i=this.collectElements(n,o,a,s),l=n+window.scrollX,c=o+window.scrollY;this.deactivate(),this.onCapture({x:l,y:c,w:a,h:s,elements:i})};this.unsubStart=this.bus.on("area:start",()=>this.activate())}activate(){if(this.isActive)return;this.isActive=!0,this.savedOverflow=document.body.style.overflow,this.overlay=d("div",{style:`position:fixed;inset:0;z-index:${2147483646};background:rgba(15,23,42,0.04);cursor:crosshair;`}),this.overlay.setAttribute("data-ccm-area-overlay","true"),this.toolbar=d("div",{style:`
        position:fixed;top:0;left:0;right:0;z-index:${2147483647};
        height:52px;background:${this.colors.glassBg};
        backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
        border-bottom:1px solid ${this.colors.glassBorder};
        display:flex;align-items:center;justify-content:center;gap:16px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:14px;color:${this.colors.text};
      `});let t=d("span",{style:"font-weight:500;letter-spacing:-0.01em;"});h(t,this.t("area.instruction"));let r=document.createElement("button");r.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;
    `,h(r,this.t("pin.cancel")),r.addEventListener("click",()=>this.deactivate()),this.toolbar.appendChild(t),this.toolbar.appendChild(r),this.overlay.addEventListener("mousedown",this.onMouseDown,!0),this.overlay.addEventListener("mousemove",this.onMouseMove,!0),this.overlay.addEventListener("mouseup",this.onMouseUp,!0),document.addEventListener("keydown",this.onKey),document.body.style.overflow="hidden",document.body.appendChild(this.overlay),document.body.appendChild(this.toolbar)}deactivate(){this.isActive&&(this.isActive=!1,this.overlay?.removeEventListener("mousedown",this.onMouseDown,!0),this.overlay?.removeEventListener("mousemove",this.onMouseMove,!0),this.overlay?.removeEventListener("mouseup",this.onMouseUp,!0),document.removeEventListener("keydown",this.onKey),document.body.style.overflow=this.savedOverflow,this.overlay?.remove(),this.toolbar?.remove(),this.rectEl?.remove(),this.overlay=null,this.toolbar=null,this.rectEl=null,this.dragStart=null,this.bus.emit("area:end"))}updateRect(t,r){if(!this.rectEl||!this.dragStart)return;let n=Math.min(this.dragStart.x,t),o=Math.min(this.dragStart.y,r),a=Math.abs(t-this.dragStart.x),s=Math.abs(r-this.dragStart.y);this.rectEl.style.left=`${n}px`,this.rectEl.style.top=`${o}px`,this.rectEl.style.width=`${a}px`,this.rectEl.style.height=`${s}px`}collectElements(t,r,n,o){let a=t+n,s=r+o,i=document.body.getElementsByTagName("*"),l=[];for(let c of Array.from(i)){if(l.length>=At)break;if(this.shouldIgnoreElement(c)||c===document.documentElement||c===document.body)continue;let p=c.getBoundingClientRect();p.width===0||p.height===0||p.right<t||p.left>a||p.bottom<r||p.top>s||l.push(Tt(c))}return l}destroy(){this.deactivate(),this.unsubStart()}};var K=class{constructor(t){this.opts=t;this.ws=null;this.destroyed=!1;this.heartbeat=null;this.reconnectAttempt=0;this.refCounter=1;this.topic=`realtime:${t.schema??"public"}:${t.table}`,this.log=t.log??(()=>{})}connect(){if(this.destroyed)return;let t=`${this.opts.url.replace(/^http/,"ws").replace(/\/$/,"")}/realtime/v1/websocket?apikey=${encodeURIComponent(this.opts.apiKey)}&vsn=1.0.0`,r;try{r=new WebSocket(t)}catch(n){this.log("realtime ws constructor error",n),this.scheduleReconnect();return}this.ws=r,r.addEventListener("open",()=>{this.reconnectAttempt=0,this.send({topic:this.topic,event:"phx_join",payload:{config:{postgres_changes:[{event:"*",schema:this.opts.schema??"public",table:this.opts.table,filter:this.opts.filter}]},access_token:this.opts.apiKey},ref:String(this.refCounter++)}),this.heartbeat=setInterval(()=>{this.send({topic:"phoenix",event:"heartbeat",payload:{},ref:String(this.refCounter++)})},25e3),this.log("realtime connected")}),r.addEventListener("message",n=>this.handleMessage(n.data)),r.addEventListener("close",()=>{this.cleanupSocket(),this.destroyed||this.scheduleReconnect()}),r.addEventListener("error",n=>{this.log("realtime ws error",n)})}cleanupSocket(){this.heartbeat&&(clearInterval(this.heartbeat),this.heartbeat=null),this.ws=null}scheduleReconnect(){let t=Math.min(1e3*2**this.reconnectAttempt,3e4);this.reconnectAttempt+=1,setTimeout(()=>{this.destroyed||this.connect()},t)}send(t){if(!(!this.ws||this.ws.readyState!==WebSocket.OPEN))try{this.ws.send(JSON.stringify(t))}catch(r){this.log("realtime send error",r)}}handleMessage(t){if(typeof t!="string")return;let r;try{r=JSON.parse(t)}catch{return}if(r.event!=="postgres_changes")return;let o=r.payload?.data;if(!o)return;let a=o.type,s=o.record??o.old_record;s&&(a==="INSERT"?this.opts.onInsert(s):a==="UPDATE"?this.opts.onUpdate(s):a==="DELETE"&&this.opts.onDelete(s))}destroy(){if(this.destroyed=!0,this.cleanupSocket(),this.ws)try{this.ws.close()}catch{}}};function st(e){return`ccm-feedback:${e}`}function y(e){return!e||e==="/"?"/":e.endsWith("/")?e.slice(0,-1):e}function xe(){try{return crypto.randomUUID()}catch{return`${Date.now()}-${Math.random().toString(36).slice(2)}`}}function R(e){try{let t=localStorage.getItem(st(e));if(!t)return[];let r=JSON.parse(t);return Array.isArray(r)?r:[]}catch{return[]}}function it(e,t){try{localStorage.setItem(st(e),JSON.stringify(t))}catch{}}function at(e){let t={id:xe(),projectName:e.projectName,message:e.message,authorName:e.authorName,url:e.url,path:y(e.path),viewport:e.viewport,userAgent:e.userAgent,createdAt:new Date().toISOString(),cssSelector:e.anchor.cssSelector,xpath:e.anchor.xpath,textSnippet:e.anchor.textSnippet,elementTag:e.anchor.elementTag,elementId:e.anchor.elementId,textPrefix:e.anchor.textPrefix,textSuffix:e.anchor.textSuffix,fingerprint:e.anchor.fingerprint,neighborText:e.anchor.neighborText,xPct:e.rect.xPct,yPct:e.rect.yPct,wPct:e.rect.wPct,hPct:e.rect.hPct,status:e.status??"todo",kind:e.kind??"target"};return e.pin&&(t.pinX=e.pin.x,t.pinY=e.pin.y),e.area&&(t.areaX=e.area.x,t.areaY=e.area.y,t.areaW=e.area.w,t.areaH=e.area.h),e.capturedElements&&e.capturedElements.length>0&&(t.capturedElements=e.capturedElements),t}var X=class{constructor(t){this.projectName=t}list(){return R(this.projectName)}listForPath(t){let r=y(t);return R(this.projectName).filter(n=>y(n.path)===r)}save(t){let r=R(this.projectName),n=at(t);return r.unshift(n),it(this.projectName,r),n}delete(t){let r=R(this.projectName),n=r.findIndex(o=>o.id===t);return n===-1?!1:(r.splice(n,1),it(this.projectName,r),!0)}clear(){localStorage.removeItem(st(this.projectName))}updateStatus(t,r){let n=R(this.projectName),o=n.find(a=>a.id===t);return o?(o.status=r,it(this.projectName,n),!0):!1}};var $t="ccm_widget_annotations";function lt(e){if(!e)return null;let t=e.lastIndexOf("/");if(t===-1)return null;let r=e.slice(t+1).trim();if(r===""||r==="*")return null;let n=Number(r);return Number.isFinite(n)?n:null}function U(e){let t={id:e.id,projectName:e.project_name,message:e.message,authorName:e.author_name,url:e.url,path:e.path,viewport:e.viewport,userAgent:e.user_agent,cssSelector:e.css_selector,xpath:e.xpath,textSnippet:e.text_snippet,elementTag:e.element_tag,elementId:e.element_id??void 0,textPrefix:e.text_prefix,textSuffix:e.text_suffix,fingerprint:e.fingerprint,neighborText:e.neighbor_text,xPct:e.x_pct,yPct:e.y_pct,wPct:e.w_pct,hPct:e.h_pct,createdAt:e.created_at,status:e.status??"todo",kind:e.kind??"target"};return e.pin_x!=null&&e.pin_y!=null&&(t.pinX=e.pin_x,t.pinY=e.pin_y),e.area_x!=null&&e.area_y!=null&&e.area_w!=null&&e.area_h!=null&&(t.areaX=e.area_x,t.areaY=e.area_y,t.areaW=e.area_w,t.areaH=e.area_h),e.captured_elements&&Array.isArray(e.captured_elements)&&(t.capturedElements=e.captured_elements),t}function Mt(e){let t={id:e.id,project_name:e.projectName,message:e.message,author_name:e.authorName,url:e.url,path:e.path,viewport:e.viewport,user_agent:e.userAgent,css_selector:e.cssSelector,xpath:e.xpath,text_snippet:e.textSnippet,element_tag:e.elementTag,element_id:e.elementId??null,text_prefix:e.textPrefix,text_suffix:e.textSuffix,fingerprint:e.fingerprint,neighbor_text:e.neighborText,x_pct:e.xPct,y_pct:e.yPct,w_pct:e.wPct,h_pct:e.hPct,created_at:e.createdAt};return e.status&&(t.status=e.status),e.kind&&(t.kind=e.kind),e.pinX!=null&&(t.pin_x=e.pinX),e.pinY!=null&&(t.pin_y=e.pinY),e.areaX!=null&&(t.area_x=e.areaX),e.areaY!=null&&(t.area_y=e.areaY),e.areaW!=null&&(t.area_w=e.areaW),e.areaH!=null&&(t.area_h=e.areaH),e.capturedElements&&(t.captured_elements=e.capturedElements),t}var Y=class{constructor(t){this.cache=[];this.realtime=null;this.projectName=t.projectName,this.url=t.url,this.apiKey=t.apiKey,this.onChange=t.onChange??(()=>{}),this.log=t.log??(()=>{}),this.endpoint=`${t.url.replace(/\/$/,"")}/rest/v1/${$t}`,this.headers={apikey:t.apiKey,Authorization:`Bearer ${t.apiKey}`,"Content-Type":"application/json",Prefer:"return=representation"}}async init(){try{let t=`${this.endpoint}?project_name=eq.${encodeURIComponent(this.projectName)}&order=created_at.desc`,r=await fetch(t,{headers:this.headers});if(!r.ok){let o=await r.text();console.warn(`[ccm-feedback] cloud fetch failed: ${r.status} ${o}`);return}let n=await r.json();this.cache=n.map(U),this.log("cloud loaded",this.cache.length,"annotations"),this.startRealtime()}catch(t){console.warn("[ccm-feedback] cloud fetch error",t)}}startRealtime(){this.realtime||(this.realtime=new K({url:this.url,apiKey:this.apiKey,table:$t,filter:`project_name=eq.${this.projectName}`,log:this.log,onInsert:t=>{let r=t;this.cache.some(n=>n.id===r.id)||(this.cache.unshift(U(r)),this.onChange())},onUpdate:t=>{let n=U(t),o=this.cache.findIndex(a=>a.id===n.id);o===-1?this.cache.unshift(n):this.cache[o]=n,this.onChange()},onDelete:t=>{let r=t.id;if(!r)return;let n=this.cache.findIndex(o=>o.id===r);n!==-1&&(this.cache.splice(n,1),this.onChange())}}),this.realtime.connect())}destroy(){this.realtime?.destroy(),this.realtime=null}list(){return[...this.cache]}listForPath(t){let r=y(t);return this.cache.filter(n=>y(n.path)===r)}save(t){let r=at(t);return this.cache.unshift(r),this.pushInsert(r),r}updateStatus(t,r){let n=this.cache.find(o=>o.id===t);return n?(n.status=r,this.pushUpdate(t,{status:r}),!0):!1}delete(t){let r=this.cache.findIndex(n=>n.id===t);return r===-1?!1:(this.cache.splice(r,1),this.pushDelete(t),!0)}clear(){let t=this.cache.map(r=>r.id);this.cache=[],this.pushClear(t)}async migrateFromLocal(t){if(t.length===0)return 0;let r=new Set(this.cache.map(o=>o.id)),n=t.filter(o=>!r.has(o.id));if(n.length===0)return 0;try{let o=await fetch(this.endpoint,{method:"POST",headers:{...this.headers,Prefer:"return=representation,resolution=ignore-duplicates"},body:JSON.stringify(n.map(Mt))});if(!o.ok){let s=await o.text();return console.warn(`[ccm-feedback] cloud migrate failed: ${o.status} ${s}`),0}let a=await o.json();for(let s of a){let i=U(s);this.cache.some(l=>l.id===i.id)||this.cache.unshift(i)}return this.log("cloud migrated",a.length,"of",n.length,"local annotations"),this.onChange(),a.length}catch(o){return console.warn("[ccm-feedback] cloud migrate error",o),0}}async pushInsert(t){try{let r=await fetch(this.endpoint,{method:"POST",headers:this.headers,body:JSON.stringify(Mt(t))});if(!r.ok){let n=await r.text();console.warn(`[ccm-feedback] cloud insert failed: ${r.status} ${n}`)}}catch(r){console.warn("[ccm-feedback] cloud insert error",r)}}async pushUpdate(t,r){try{let n=await fetch(`${this.endpoint}?id=eq.${encodeURIComponent(t)}`,{method:"PATCH",headers:{...this.headers,Prefer:"return=representation, count=exact"},body:JSON.stringify(r)});if(!n.ok){let a=await n.text();console.warn(`[ccm-feedback] cloud update failed: ${n.status} ${a}`);return}lt(n.headers.get("content-range"))===0&&console.error(`[ccm-feedback] cloud update no-op for id=${t} \u2014 possible RLS misconfiguration or stale id`)}catch(n){console.warn("[ccm-feedback] cloud update error",n)}}async pushDelete(t){try{let r=await fetch(`${this.endpoint}?id=eq.${encodeURIComponent(t)}`,{method:"DELETE",headers:{...this.headers,Prefer:"return=representation, count=exact"}});if(!r.ok){let o=await r.text();console.warn(`[ccm-feedback] cloud delete failed: ${r.status} ${o}`);return}lt(r.headers.get("content-range"))===0&&console.error(`[ccm-feedback] cloud delete no-op for id=${t} \u2014 possible RLS misconfiguration or stale id`)}catch(r){console.warn("[ccm-feedback] cloud delete error",r)}}async pushClear(t){if(t.length!==0)try{let r=t.map(a=>`"${a}"`).join(","),n=await fetch(`${this.endpoint}?id=in.(${r})`,{method:"DELETE",headers:{...this.headers,Prefer:"return=representation, count=exact"}});if(!n.ok){let a=await n.text();console.warn(`[ccm-feedback] cloud clear failed: ${n.status} ${a}`);return}let o=lt(n.headers.get("content-range"));o!==null&&o<t.length&&console.warn(`[ccm-feedback] cloud clear partial: expected ${t.length} deleted ${o}`)}catch(r){console.warn("[ccm-feedback] cloud clear error",r)}}};var ye=new Set(["role","name","aria-label","rel","href"]);function we(e,t){let r=ye.has(e);r||(r=e.startsWith("data-")&&O(e));let n=O(t)&&t.length<100;return n||(n=t.startsWith("#")&&O(t.slice(1))),r&&n}function ke(e){return O(e)}function Ee(e){return O(e)}function Ce(e){return!0}function Pt(e,t){if(e.nodeType!==Node.ELEMENT_NODE)throw new Error("Can't generate CSS selector for non-element node type.");if(e.tagName.toLowerCase()==="html")return"html";let r={root:document.body,idName:ke,className:Ee,tagName:Ce,attr:we,timeoutMs:1e3,seedMinLength:3,optimizedMinLength:2,maxNumberOfPathChecks:1/0},n=new Date,o={...r,...t},a=Me(o.root,r),s,i=0;for(let c of Se(e,o,a)){if(new Date().getTime()-n.getTime()>o.timeoutMs||i>=o.maxNumberOfPathChecks){let f=Te(e,a);if(!f)throw new Error(`Timeout: Can't find a unique selector after ${o.timeoutMs}ms`);return N(f)}if(i++,pt(c,a)){s=c;break}}if(!s)throw new Error("Selector was not found.");let l=[...Nt(s,e,o,a,n)];return l.sort(ct),l.length>0?N(l[0]):N(s)}function*Se(e,t,r){let n=[],o=[],a=e,s=0;for(;a&&a!==r;){let i=Ae(a,t);for(let l of i)l.level=s;if(n.push(i),a=a.parentElement,s++,o.push(...Ot(n)),s>=t.seedMinLength){o.sort(ct);for(let l of o)yield l;o=[]}}o.sort(ct);for(let i of o)yield i}function O(e){if(/^[a-z\-]{3,}$/i.test(e)){let t=e.split(/-|[A-Z]/);for(let r of t)if(r.length<=2||/[^aeiou]{4,}/i.test(r))return!1;return!0}return!1}function Ae(e,t){let r=[],n=e.getAttribute("id");n&&t.idName(n)&&r.push({name:"#"+CSS.escape(n),penalty:0});for(let s=0;s<e.classList.length;s++){let i=e.classList[s];t.className(i)&&r.push({name:"."+CSS.escape(i),penalty:1})}for(let s=0;s<e.attributes.length;s++){let i=e.attributes[s];t.attr(i.name,i.value)&&r.push({name:`[${CSS.escape(i.name)}="${CSS.escape(i.value)}"]`,penalty:2})}let o=e.tagName.toLowerCase();if(t.tagName(o)){r.push({name:o,penalty:5});let s=dt(e,o);s!==void 0&&r.push({name:Rt(o,s),penalty:10})}let a=dt(e);return a!==void 0&&r.push({name:$e(o,a),penalty:50}),r}function N(e){let t=e[0],r=t.name;for(let n=1;n<e.length;n++){let o=e[n].level||0;t.level===o-1?r=`${e[n].name} > ${r}`:r=`${e[n].name} ${r}`,t=e[n]}return r}function Lt(e){return e.map(t=>t.penalty).reduce((t,r)=>t+r,0)}function ct(e,t){return Lt(e)-Lt(t)}function dt(e,t){let r=e.parentNode;if(!r)return;let n=r.firstChild;if(!n)return;let o=0;for(;n&&(n.nodeType===Node.ELEMENT_NODE&&(t===void 0||n.tagName.toLowerCase()===t)&&o++,n!==e);)n=n.nextSibling;return o}function Te(e,t){let r=0,n=e,o=[];for(;n&&n!==t;){let a=n.tagName.toLowerCase(),s=dt(n,a);if(s===void 0)return;o.push({name:Rt(a,s),penalty:NaN,level:r}),n=n.parentElement,r++}if(pt(o,t))return o}function $e(e,t){return e==="html"?"html":`${e}:nth-child(${t})`}function Rt(e,t){return e==="html"?"html":`${e}:nth-of-type(${t})`}function*Ot(e,t=[]){if(e.length>0)for(let r of e[0])yield*Ot(e.slice(1,e.length),t.concat(r));else yield t}function Me(e,t){return e.nodeType===Node.DOCUMENT_NODE?e:e===t.root?e.ownerDocument:e}function pt(e,t){let r=N(e);switch(t.querySelectorAll(r).length){case 0:throw new Error(`Can't select any node with this selector: ${r}`);case 1:return!0;default:return!1}}function*Nt(e,t,r,n,o){if(e.length>2&&e.length>r.optimizedMinLength)for(let a=1;a<e.length-1;a++){if(new Date().getTime()-o.getTime()>r.timeoutMs)return;let i=[...e];i.splice(a,1),pt(i,n)&&n.querySelector(N(i))===t&&(yield i,yield*Nt(i,t,r,n,o))}}var Le=["role","aria-label","type","name","href","src","data-testid","data-id"];function Pe(e){let t=5381;for(let r=0;r<e.length;r++)t=(t<<5)+t+e.charCodeAt(r)|0;return(t>>>0).toString(36)}function ut(e){let t=e.children.length,r=0,n=e.parentElement;if(n)for(let s of n.children){if(s===e)break;s.tagName===e.tagName&&r++}let o=[];for(let s of Le){let i=e.getAttribute(s);i&&o.push(`${s}=${i}`)}let a=o.length>0?Pe(o.join(",")):"0";return`${t}:${r}:${a}`}function Bt(e,t){let r=t.split(":");if(r.length!==3)return 0;let[n,o,a]=r,s=Number(n),i=Number(o);if(Number.isNaN(s)||Number.isNaN(i))return 0;let l=ut(e),[c,p,f]=l.split(":"),g=0,b=Math.abs(Number(c)-s);b===0?g+=.2:b<=2?g+=.1:b<=5&&(g+=.03);let m=Math.abs(Number(p)-i);return m===0?g+=.4:m===1?g+=.2:m<=3&&(g+=.08),f===a&&(g+=.4),g}function M(e,t){let r=t==="before"?"previousElementSibling":"nextElementSibling",n=e[r],o=3;for(;n&&o>0;){let a=n.textContent?.trim();if(a)return t==="before"?a.slice(-32):a.slice(0,32);n=n[r],o--}return""}function W(e){let t=e.previousElementSibling?.textContent?.trim().slice(0,40)??"",r=e.nextElementSibling?.textContent?.trim().slice(0,40)??"";return[t,r].filter(Boolean).join(" | ")}function _t(e){if(e.id){let n=e.id.includes("'")?`concat('${e.id.replace(/'/g,`',"'",'`)}')`:`'${e.id}'`;return`//${e.localName}[@id=${n}]`}let t=[],r=e;for(;r&&r!==document.body&&t.length<6;){let n=r.localName,o=r.parentElement;if(r.id){let s=r.id.includes("'")?`concat('${r.id.replace(/'/g,`',"'",'`)}')`:`'${r.id}'`;return t.unshift(`/${n}[@id=${s}]`),"/"+t.join("")}let a=1;if(o)for(let s of o.children){if(s===r)break;s.localName===n&&a++}t.unshift(`/${n}[${a}]`),r=o}return"/html/body"+t.join("")}function It(e){let t=Pt(e,{className:c=>!/^(css|sc|emotion|styled)-/.test(c)&&!/^[a-z]{1,3}[A-Za-z0-9]{4,8}$/.test(c),attr:c=>["data-testid","data-id","role","aria-label"].includes(c),idName:c=>!c.startsWith("radix-")&&!/^:r[0-9]+:$/.test(c),seedMinLength:3,optimizedMinLength:2}),r=_t(e),o=(e.textContent?.trim()??"").slice(0,120),a=M(e,"before"),s=M(e,"after"),i=ut(e),l=W(e);return{cssSelector:t,xpath:r,textSnippet:o,textPrefix:a,textSuffix:s,fingerprint:i,neighborText:l,elementTag:e.tagName,elementId:e.id||void 0}}function Ft(e,t=document.documentElement){let r=e.x+e.width/2,n=e.y+e.height/2,o=document.elementFromPoint(r,n);if(!o||o===t)return document.body;let a=o,s=o;for(;s&&s!==document.body;){let i=s.getBoundingClientRect();if(i.left<=e.x&&i.top<=e.y&&i.right>=e.x+e.width&&i.bottom>=e.y+e.height){a=s;break}s=s.parentElement}return a}function Dt(e,t){return t.width<=0||t.height<=0?{xPct:0,yPct:0,wPct:1,hPct:1}:{xPct:(e.x-t.x)/t.width,yPct:(e.y-t.y)/t.height,wPct:e.width/t.width,hPct:e.height/t.height}}var ht='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="12" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="10" r="1" fill="currentColor" stroke="none"/></svg>',jt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';var ft='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',mt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',G='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';var Ht='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';var zt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>',Kt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14"/><path d="M9 10V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V10l3 4v3H6v-3l3-4z"/></svg>',Xt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="1"/><path d="M21 21h-4v-4"/><path d="M21 13v8h-8"/></svg>';var Ut='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';var B=["todo","review","done","question"];var L={todo:{fg:"#a16207",bg:"#fef3c7",border:"#f59e0b"},review:{fg:"#1d4ed8",bg:"#dbeafe",border:"#3b82f6"},done:{fg:"#15803d",bg:"#dcfce7",border:"#22c55e"},question:{fg:"#6d28d9",bg:"#ede9fe",border:"#8b5cf6"}},q=class{constructor(t,r){this.colors=t;this.t=r;this.resolve=null;this.previouslyFocused=null;this.onKeydownTrap=null;this.status="todo";this.statusButtons=new Map;this.root=d("div",{style:`
        position:fixed;z-index:${2147483647};width:300px;padding:16px;border-radius:16px;
        background:${this.colors.glassBg};
        backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
        border:1px solid ${this.colors.glassBorder};
        box-shadow:0 8px 32px ${this.colors.shadow}, 0 2px 8px ${this.colors.shadow};
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        opacity:0;transform:translateY(8px) scale(0.98);
        transition:opacity 0.2s ease,transform 0.2s ease;
        display:none;-webkit-font-smoothing:antialiased;
      `}),this.root.setAttribute("role","dialog"),this.root.setAttribute("aria-modal","true"),this.root.setAttribute("aria-label",this.t("popup.ariaLabel")),this.textarea=document.createElement("textarea"),this.textarea.style.cssText=`
      width:100%;min-height:88px;max-height:200px;
      padding:10px 12px;border-radius:12px;
      border:1px solid ${this.colors.border};
      background:${this.colors.glassBgHeavy};
      color:${this.colors.text};font-family:inherit;
      font-size:13px;line-height:1.5;resize:vertical;outline:none;
      transition:border-color 0.2s ease,box-shadow 0.2s ease,background 0.2s ease;
      box-sizing:border-box;
    `,this.textarea.placeholder=this.t("popup.placeholder"),this.textarea.maxLength=5e3,this.textarea.setAttribute("aria-label",this.t("popup.textareaAria")),this.textarea.addEventListener("focus",()=>{this.textarea.style.borderColor=this.colors.accent,this.textarea.style.boxShadow=`0 0 0 3px ${this.colors.accent}14`,this.textarea.style.background=this.colors.bg}),this.textarea.addEventListener("blur",()=>{this.textarea.style.borderColor=this.colors.border,this.textarea.style.boxShadow="none",this.textarea.style.background=this.colors.glassBgHeavy}),this.textarea.addEventListener("input",()=>this.updateSubmitState()),this.textarea.addEventListener("keydown",c=>{c.key==="Enter"&&(c.ctrlKey||c.metaKey)?(c.preventDefault(),this.submit()):c.key==="Escape"&&this.cancel()});let n=d("div",{style:`font-size:11px;color:${this.colors.textTertiary};text-align:right;margin-top:6px;letter-spacing:0.01em;`}),o=/Macintosh|Mac OS X/i.test(navigator.userAgent);h(n,o?this.t("popup.submitHintMac"):this.t("popup.submitHintOther"));let a=d("div",{style:"display:flex;justify-content:flex-end;gap:8px;margin-top:12px;"}),s=document.createElement("button");s.type="button",s.style.cssText=`
      height:34px;padding:0 16px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;
      font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s ease;
    `,h(s,this.t("popup.cancel")),s.addEventListener("click",()=>this.cancel()),this.submitBtn=document.createElement("button"),this.submitBtn.type="button",this.submitBtn.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:none;background:${this.colors.accentGradient};
      color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;
      opacity:0.35;pointer-events:none;transition:all 0.2s ease;
      box-shadow:0 2px 8px ${this.colors.accentGlow};
    `,h(this.submitBtn,this.t("popup.submit")),this.submitBtn.addEventListener("click",()=>this.submit()),a.appendChild(s),a.appendChild(this.submitBtn);let i=d("div",{style:"display:flex;align-items:center;gap:6px;margin-top:10px;flex-wrap:wrap;"}),l=d("span",{style:`font-size:11px;color:${this.colors.textTertiary};margin-right:4px;`});h(l,`${this.t("status.label")}:`),i.appendChild(l);for(let c of B){let p=document.createElement("button");p.type="button",p.dataset.status=c,p.style.cssText=`
        height:24px;padding:0 10px;border-radius:9999px;
        font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;
        transition:all 0.15s ease;
      `,h(p,this.t(`status.${c}`)),p.addEventListener("click",()=>this.setStatus(c)),this.statusButtons.set(c,p),i.appendChild(p)}this.root.appendChild(this.textarea),this.root.appendChild(i),this.root.appendChild(n),this.root.appendChild(a),document.body.appendChild(this.root),this.applyStatusStyles()}setStatus(t){this.status=t,this.applyStatusStyles()}applyStatusStyles(){for(let[t,r]of this.statusButtons){let n=L[t],o=t===this.status;r.style.background=o?n.bg:"transparent",r.style.color=o?n.fg:this.colors.textTertiary,r.style.border=`1px solid ${o?n.border:this.colors.border}`}}show(t){return new Promise(r=>{this.resolve=r,this.textarea.value="",this.status="todo",this.applyStatusStyles(),this.updateSubmitState(),this.previouslyFocused=document.activeElement;let n=t.bottom+8,o=t.left;n+220>window.innerHeight&&(n=t.top-220-8),o+300>window.innerWidth&&(o=t.right-300),n=Math.max(8,n),o=Math.max(8,o),this.root.style.top=`${n}px`,this.root.style.left=`${o}px`,this.root.style.display="block",this.onKeydownTrap=a=>{if(a.key!=="Tab")return;let s=Array.from(this.root.querySelectorAll('button:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])'));if(s.length===0)return;let i=s[0],l=s[s.length-1];!i||!l||(a.shiftKey?(document.activeElement===i||!this.root.contains(document.activeElement))&&(a.preventDefault(),l.focus()):(document.activeElement===l||!this.root.contains(document.activeElement))&&(a.preventDefault(),i.focus()))},this.root.addEventListener("keydown",this.onKeydownTrap),requestAnimationFrame(()=>{this.root.style.opacity="1",this.root.style.transform="translateY(0) scale(1)",this.textarea.focus()})})}updateSubmitState(){let t=this.textarea.value.trim().length>0;this.submitBtn.disabled=!t,this.submitBtn.style.opacity=t?"1":"0.35",this.submitBtn.style.pointerEvents=t?"auto":"none"}submit(){let t=this.textarea.value.trim();t&&(this.resolve?.({message:t,status:this.status}),this.resolve=null,this.hide())}cancel(){this.resolve?.(null),this.resolve=null,this.hide()}hide(){this.onKeydownTrap&&(this.root.removeEventListener("keydown",this.onKeydownTrap),this.onKeydownTrap=null),this.root.style.opacity="0",this.root.style.transform="translateY(8px) scale(0.98)",this.previouslyFocused?.focus(),this.previouslyFocused=null,setTimeout(()=>{this.root.style.display="none"},200)}destroy(){this.root.remove()}};var Yt=140,Re="todo",V=class{constructor(t,r,n,o,a,s,i=()=>{}){this.bus=r;this.t=n;this.store=o;this.colors=a;this.jump=s;this.onFilterChange=i;this.isOpen=!1;this.filter=Re;this.otherPagesExpanded=!1;this.previouslyFocused=null;this.chipButtons=new Map;this.chipCounts=new Map;this.chipLabels=new Map;this.root=d("div",{class:"sp-panel"}),this.root.setAttribute("role","dialog"),this.root.setAttribute("aria-label",n("drawer.aria")),this.root.setAttribute("aria-hidden","true"),this.root.inert=!0;let l=d("div",{class:"sp-panel-header"}),c=d("div",{class:"sp-panel-title"});h(c,n("drawer.title"));let p=d("button",{class:"sp-panel-close",type:"button"});p.setAttribute("aria-label",n("drawer.close")),p.appendChild($(G)),p.addEventListener("click",()=>this.close()),l.appendChild(c),l.appendChild(p),this.filtersEl=d("div",{class:"sp-filters"});let f=d("div",{class:"sp-chips"}),g=[...B];for(let m of g){let x=d("button",{class:"sp-chip",type:"button"}),w=n(`status.${m}`),k=d("span",{class:"sp-chip-label"});h(k,w);let C=d("span",{class:"sp-chip-count"});C.setAttribute("aria-hidden","true"),x.appendChild(k),x.appendChild(C),x.dataset.filter=m,x.setAttribute("aria-pressed",m===this.filter?"true":"false"),x.addEventListener("click",()=>this.setFilter(m)),this.chipButtons.set(m,x),this.chipCounts.set(m,C),this.chipLabels.set(m,w),f.appendChild(x)}this.filtersEl.appendChild(f),this.listEl=d("div",{class:"sp-list"}),this.root.appendChild(l),this.root.appendChild(this.filtersEl),this.root.appendChild(this.listEl),t.appendChild(this.root);let b=t.host;this.onDocumentClick=m=>{this.isOpen&&(m.composedPath().includes(b)||this.close())},this.onKeydown=m=>{if(this.isOpen){if(m.key==="Escape"){m.stopPropagation(),this.close();return}m.key==="Tab"&&this.trapFocus(m)}},this.applyChipStyles()}open(){if(this.isOpen){this.render();return}this.isOpen=!0,this.previouslyFocused=this.deepActiveElement()??null,this.render(),this.root.classList.add("sp-panel--open"),this.root.setAttribute("aria-hidden","false"),this.root.inert=!1,document.addEventListener("click",this.onDocumentClick),document.addEventListener("keydown",this.onKeydown,!0),requestAnimationFrame(()=>{this.root.querySelector('button:not([disabled]):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"])')?.focus()})}close(){if(!this.isOpen)return;this.isOpen=!1,this.root.classList.remove("sp-panel--open"),this.root.setAttribute("aria-hidden","true"),this.root.inert=!0,document.removeEventListener("click",this.onDocumentClick),document.removeEventListener("keydown",this.onKeydown,!0),this.bus.emit("navigator:close");let t=this.previouslyFocused;this.previouslyFocused=null,t&&typeof t.focus=="function"&&t.focus()}refreshIfOpen(){this.isOpen&&this.render()}destroy(){document.removeEventListener("click",this.onDocumentClick),document.removeEventListener("keydown",this.onKeydown,!0),this.root.remove()}setFilter(t){this.filter!==t&&(this.filter=t,this.applyChipStyles(),this.onFilterChange(t),this.render())}getFilter(){return this.filter}applyChipStyles(){for(let[t,r]of this.chipButtons){let n=t===this.filter;r.classList.toggle("sp-chip--active",n),r.setAttribute("aria-pressed",n?"true":"false")}}updateChipCounts(t){let r=new Map;for(let n of B)r.set(n,0);for(let n of t){let o=n.status??"todo";r.set(o,(r.get(o)??0)+1)}for(let[n,o]of this.chipButtons){let a=r.get(n)??0,s=this.chipCounts.get(n),i=this.chipLabels.get(n)??n;s&&h(s,String(a)),o.setAttribute("aria-label",`${i} \u2014 ${a}`)}}render(){this.listEl.replaceChildren();let t=this.store.list();this.updateChipCounts(t);let r=t.filter(l=>(l.status??"todo")===this.filter);if(t.length===0){this.listEl.appendChild(this.buildEmpty(this.t("drawer.empty")));return}if(r.length===0){this.listEl.appendChild(this.buildEmpty(this.t("drawer.emptyFiltered")));return}let n=y(window.location.pathname),o=[...r].sort((l,c)=>new Date(c.createdAt).getTime()-new Date(l.createdAt).getTime()),a=o.filter(l=>y(l.path)===n),s=o.filter(l=>y(l.path)!==n),i=0;if(a.length>0){s.length>0&&this.listEl.appendChild(this.buildSectionLabel(this.t("drawer.thisPage")));for(let l of a)this.listEl.appendChild(this.buildCard(l,++i))}if(s.length>0){let l=d("button",{class:"sp-chip",type:"button"});l.style.cssText="margin:8px 4px;";let c=()=>{h(l,`${this.otherPagesExpanded?"\u25BE ":"\u25B8 "}${this.t("drawer.otherPages",{n:s.length})}`)};c(),l.setAttribute("aria-expanded",this.otherPagesExpanded?"true":"false");let p=d("div",{});p.style.display=this.otherPagesExpanded?"block":"none",l.addEventListener("click",()=>{this.otherPagesExpanded=!this.otherPagesExpanded,p.style.display=this.otherPagesExpanded?"block":"none",l.setAttribute("aria-expanded",this.otherPagesExpanded?"true":"false"),c()});for(let f of s)p.appendChild(this.buildCard(f,++i));this.listEl.appendChild(l),this.listEl.appendChild(p)}}buildSectionLabel(t){let r=d("div",{style:`font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${this.colors.textTertiary};padding:10px 8px 4px;`});return h(r,t),r}buildEmpty(t){let r=d("div",{class:"sp-empty"}),n=d("div",{class:"sp-empty-text"});return h(n,t),r.appendChild(n),r}buildCard(t,r){let n=t.status??"todo",o=L[n],a=y(t.path)===y(window.location.pathname),s=d("button",{class:"sp-card",type:"button"});s.style.textAlign="left",s.style.width="100%",s.dataset.annotationId=t.id;let i=t.message.length>Yt?`${t.message.slice(0,Yt).trimEnd()}\u2026`:t.message;s.setAttribute("aria-label",this.t("drawer.rowAria",{n:r,message:i})),s.addEventListener("click",()=>{a?this.jump(t.id):t.url&&(window.location.href=t.url)});let l=d("div",{class:"sp-card-bar",style:`background:${o.border};`}),c=d("div",{class:"sp-card-body"}),p=d("div",{class:"sp-card-header"}),f=d("span",{class:"sp-card-number"});h(f,`#${r}`);let g=d("span",{class:"sp-badge",style:`background:${o.bg};color:${o.fg};border:1px solid ${o.border};`});h(g,this.t(`status.${n}`).toUpperCase());let b=d("span",{class:"sp-card-date"});h(b,new Date(t.createdAt).toLocaleDateString()),p.appendChild(f),p.appendChild(g),p.appendChild(b);let m=d("div",{class:"sp-card-message"});h(m,i);let x=d("div",{style:`font-size:11px;color:${this.colors.textTertiary};margin-top:8px;display:flex;flex-wrap:wrap;gap:8px;`}),w=t.authorName?.trim()||"Anonymous",k=t.kind??"target",C=d("span",{});h(C,w);let F=d("span",{style:"text-transform:uppercase;letter-spacing:0.04em;"});h(F,k);let D=d("span",{style:"overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;"});return h(D,y(t.path)),x.appendChild(C),x.appendChild(F),x.appendChild(D),c.appendChild(p),c.appendChild(m),c.appendChild(x),s.appendChild(l),s.appendChild(c),s}trapFocus(t){let r=Array.from(this.root.querySelectorAll('button:not([disabled]):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"])'));if(r.length===0)return;let n=r[0],o=r[r.length-1];if(!n||!o)return;let a=this.deepActiveElement();t.shiftKey?(a===n||!this.root.contains(a))&&(t.preventDefault(),o.focus()):(a===o||!this.root.contains(a))&&(t.preventDefault(),n.focus())}deepActiveElement(){let t=document.activeElement;for(;t?.shadowRoot?.activeElement;)t=t.shadowRoot.activeElement;return t}};var J=class{constructor(){this.listeners=new Map}on(t,r){let n=this.listeners.get(t);return n||(n=new Set,this.listeners.set(t,n)),n.add(r),()=>{n.delete(r)}}emit(t,...r){let n=this.listeners.get(t);if(n)for(let o of n)try{o(...r)}catch(a){console.error(`[ccm-feedback] Error in listener for "${String(t)}":`,a)}}removeAll(){this.listeners.clear()}};function Oe(e,t,r){let n=new Blob([e],{type:r}),o=URL.createObjectURL(n),a=document.createElement("a");a.href=o,a.download=t,a.style.display="none",document.body.appendChild(a),a.click(),requestAnimationFrame(()=>{URL.revokeObjectURL(o),a.remove()})}async function Wt(e){try{if(navigator.clipboard?.writeText)return await navigator.clipboard.writeText(e),!0}catch{}try{let t=document.createElement("textarea");t.value=e,t.style.cssText="position:fixed;top:-9999px;left:-9999px;opacity:0;",document.body.appendChild(t),t.select();let r=document.execCommand("copy");return t.remove(),r}catch{return!1}}function gt(e,t){let r=new Date().toISOString().slice(0,10),n=e.replace(/[^a-zA-Z0-9_-]/g,"_"),o={projectName:e,exportedAt:new Date().toISOString(),count:t.length,annotations:t};Oe(JSON.stringify(o,null,2),`ccm-feedback-${n}-${r}.json`,"application/json;charset=utf-8")}var Ne=54,Q=class{constructor(t,r,n,o=!1){this.bus=r;this.t=n;this.cloudMode=o;this.countBadge=null;this.mode="closed";this.annotationsVisible=!0;this.items=[{id:"target",icon:zt,label:n("fab.targetLabel"),direction:"up"},{id:"toggle",icon:ft,iconAlt:mt,label:n("fab.toggleOn"),direction:"up"},{id:"pin",icon:Kt,label:n("fab.pinLabel"),direction:"up"},{id:"area",icon:Xt,label:n("fab.areaLabel"),direction:"up"},{id:"navigator",icon:jt,label:n("fab.navigatorLabel"),direction:"up"},{id:"export",icon:Be,label:n("fab.export"),direction:"left"},{id:"copyUrl",icon:Ut,label:n("fab.copyUrl"),direction:"left",...this.cloudMode?{}:{disabled:!0,disabledTitle:n("fab.copyUrlLocalOnly")}},{id:"clear",icon:Ht,label:n("fab.clear"),direction:"left"}],this.fab=document.createElement("button"),this.fab.className="sp-fab sp-fab--bottom-right sp-anim-fab-in",this.fab.style.position="fixed",this.fab.appendChild($(ht)),this.fab.setAttribute("aria-label",n("fab.aria")),this.fab.setAttribute("aria-expanded","false"),this.fab.addEventListener("click",i=>{i.detail>=2||this.toggle()}),this.fab.addEventListener("dblclick",i=>{i.preventDefault(),this.openAll()}),this.radialContainer=document.createElement("div"),this.radialContainer.className="sp-radial sp-radial--bottom-right",this.radialContainer.setAttribute("role","menu"),this.items.forEach((i,l)=>{let c=document.createElement("button");c.className="sp-radial-item",c.style.setProperty("--sp-i",String(l)),c.appendChild($(i.icon)),c.setAttribute("role","menuitem"),c.setAttribute("aria-label",i.label),c.dataset.itemId=i.id,c.dataset.direction=i.direction,i.disabled&&(c.setAttribute("aria-disabled","true"),c.dataset.disabled="true",c.style.opacity="0.4",c.style.cursor="not-allowed",i.disabledTitle&&(c.title=i.disabledTitle));let p=document.createElement("span");p.className="sp-radial-label",p.style.cssText=i.direction==="up"?"position:absolute;right:54px;top:50%;transform:translateY(-50%);white-space:nowrap;":"position:absolute;bottom:54px;left:50%;transform:translateX(-50%);white-space:nowrap;",p.textContent=i.label,c.appendChild(p),c.addEventListener("click",f=>{f.stopPropagation(),!i.disabled&&this.handleItemClick(i.id)}),this.radialContainer.appendChild(c)}),this.root=document.createElement("div"),this.root.appendChild(this.radialContainer),this.root.appendChild(this.fab),t.appendChild(this.root);let a=t.host;this.onDocumentClick=i=>{this.mode!=="closed"&&!i.composedPath().includes(a)&&this.close()},document.addEventListener("click",this.onDocumentClick);let s=i=>{i.key==="Escape"&&this.mode!=="closed"&&(i.stopPropagation(),this.close())};this.fab.addEventListener("keydown",s),this.radialContainer.addEventListener("keydown",s)}updateCount(t){if(t<=0){this.countBadge?.remove(),this.countBadge=null;return}this.countBadge||(this.countBadge=document.createElement("span"),this.countBadge.className="sp-fab-badge",this.countBadge.setAttribute("role","status"),this.countBadge.setAttribute("aria-live","polite"),this.fab.appendChild(this.countBadge)),h(this.countBadge,t>99?"99+":String(t))}toggle(){this.mode==="closed"?this.openMode("up"):this.close()}openAll(){this.openMode("all")}openMode(t){this.mode=t,this.setFabIcon(G),this.fab.setAttribute("aria-expanded","true");let r=this.radialContainer.querySelectorAll(".sp-radial-item"),n={up:0,left:0};r.forEach(o=>{let a=o.dataset.direction??"up";if(!(t==="all"||a==="up")){o.style.transform="translate(0, 0) scale(0.8)",o.classList.remove("sp-radial-item--open");return}let i=16+Ne*(n[a]+1);n[a]+=1;let l=a==="left"?-i:0,c=a==="up"?-i:0;o.style.transform=`translate(${l}px, ${c}px) scale(1)`,o.classList.add("sp-radial-item--open")}),requestAnimationFrame(()=>{this.radialContainer.querySelector(".sp-radial-item--open")?.focus()})}close(){this.mode="closed",this.setFabIcon(ht),this.fab.setAttribute("aria-expanded","false"),this.radialContainer.querySelectorAll(".sp-radial-item").forEach(r=>{r.style.transform="translate(0, 0) scale(0.8)",r.classList.remove("sp-radial-item--open")}),this.fab.focus()}setFabIcon(t){let r=this.countBadge;this.fab.replaceChildren($(t)),r&&this.fab.appendChild(r)}handleItemClick(t){switch(this.close(),t){case"target":this.bus.emit("target:start");break;case"pin":this.bus.emit("pin:start");break;case"area":this.bus.emit("area:start");break;case"toggle":{this.annotationsVisible=!this.annotationsVisible,this.bus.emit("annotations:toggle",this.annotationsVisible);let r=this.radialContainer.querySelector('[data-item-id="toggle"]');r&&(r.querySelector("svg")?.remove(),r.insertBefore($(this.annotationsVisible?ft:mt),r.firstChild),r.setAttribute("aria-label",this.t(this.annotationsVisible?"fab.toggleOn":"fab.toggleOff")));break}case"navigator":this.bus.emit("navigator:open");break;case"export":this.bus.emit("export:click");break;case"copyUrl":this.bus.emit("copyUrl:click");break;case"clear":this.bus.emit("clear:click");break}}destroy(){document.removeEventListener("click",this.onDocumentClick),this.root.remove()}},Be='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';var _e={"fab.aria":"Feedback","fab.targetLabel":"Target element","fab.pinLabel":"Drop pin","fab.areaLabel":"Capture area","fab.toggleOn":"Hide comments","fab.toggleOff":"Show comments","fab.export":"Export JSON","fab.copyUrl":"Copy feedback URL","fab.copyUrlLocalOnly":"Cloud mode only \u2014 use Export JSON","fab.clear":"Clear all","fab.clearConfirm":"Delete all annotations for this project? This cannot be undone.","fab.navigatorLabel":"Comments","pin.ariaLabel":"Pin mode toolbar","pin.instruction":"Click any element to comment on it","pin.cancel":"Cancel","coordPin.instruction":"Click anywhere to drop a pin","area.instruction":"Drag to capture an area","status.todo":"Todo","status.review":"Review","status.done":"Done","status.question":"Question","status.label":"Status","popup.ariaLabel":"Comment composer","popup.placeholder":"Leave a comment\u2026","popup.textareaAria":"Comment","popup.cancel":"Cancel","popup.submit":"Send","popup.submitHintMac":"\u2318 + \u21B5 to submit","popup.submitHintOther":"Ctrl + \u21B5 to submit","marker.ariaLabel":"Comment #{n}","marker.popover.delete":"Delete","marker.popover.close":"Close","marker.popover.deleteConfirm":"Delete this comment? This cannot be undone.","toast.exported":"Exported {n} annotation(s)","toast.empty":"No annotations to export","toast.urlCopied":"Feedback URL copied to clipboard","toast.urlCopyFailed":"Could not copy URL \u2014 clipboard unavailable","drawer.title":"Comments","drawer.aria":"Comments navigator","drawer.close":"Close comments","drawer.empty":"No comments yet","drawer.emptyFiltered":"No comments match this filter","drawer.thisPage":"This page","drawer.otherPages":"Other pages ({n})","drawer.rowAria":"Comment {n}: {message}"};function Gt(){return(e,t)=>{let r=_e[e]??e;return t?r.replace(/\{(\w+)\}/g,(n,o)=>String(t[o]??"")):r}}function Ie(e,t){if(e===t)return 0;if(e.length===0)return t.length;if(t.length===0)return e.length;if(e.length>t.length){let s=e;e=t,t=s}let r=e.length,n=t.length,o=new Array(r+1);for(let s=0;s<=r;s++)o[s]=s;let a=new Array(r+1);for(let s=1;s<=n;s++){a[0]=s;for(let l=1;l<=r;l++){let c=o[l-1]??0;a[l]=e[l-1]===t[s-1]?c:1+Math.min(c,o[l]??0,a[l-1]??0)}let i=o;o=a,a=i}return o[r]??0}function P(e,t){if(e===t)return 1;let r=Math.max(e.length,t.length);return r===0?1:1-Ie(e,t)/r}function bt(e,t,r=.6){if(!t||!e)return 0;if(e.includes(t))return 1;let n=t.length;if(n>e.length){let i=P(e,t);return i>=r?i:0}let o=0,a=e.length>500?e.slice(0,500):e,s=a.length-n;for(let i=0;i<=s;i++){let l=a.slice(i,i+n),c=P(l,t);if(c>o&&(o=c),o>=.95)break}return o>=r?o:0}var Fe=300,De=.3;function vt(e,t){if(!t.textSnippet)return!0;let r=(e.textContent?.trim()??"").slice(0,500);return bt(r,t.textSnippet,.5)>De}function je(e){if(e.elementId){let t=document.getElementById(e.elementId);if(t&&t.tagName===e.elementTag&&vt(t,e))return{element:t,confidence:1,strategy:"id"}}try{let t=document.querySelector(e.cssSelector);if(t&&t.tagName===e.elementTag&&vt(t,e))return{element:t,confidence:.95,strategy:"css"}}catch{}try{let r=document.evaluate(e.xpath,document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue;if(r instanceof Element&&r.tagName===e.elementTag&&vt(r,e))return{element:r,confidence:.9,strategy:"xpath"}}catch{}return He(e)}function He(e){let t=e.elementTag.toLowerCase(),r=document.querySelectorAll(t);if(r.length===0)return null;let n=null,o=0,a=Math.min(r.length,Fe);for(let s=0;s<a;s++){let i=r[s];if(!i)continue;let l=ze(i,e);if(l>o&&(o=l,n=i,o>=.85))break}return!n||o<.4?null:{element:n,confidence:Math.min(o,.85),strategy:"scan"}}function ze(e,t){let r=0,n=0,o=(e.textContent?.trim()??"").slice(0,500);if(t.textSnippet&&(n+=40,r+=bt(o,t.textSnippet,.5)*40),t.fingerprint&&(n+=20,r+=Bt(e,t.fingerprint)*20),t.textPrefix||t.textSuffix){n+=20;let a=0,s=0;if(t.textPrefix){let i=M(e,"before");a+=i?P(i,t.textPrefix):0,s++}if(t.textSuffix){let i=M(e,"after");a+=i?P(i,t.textSuffix):0,s++}s>0&&(r+=a/s*20)}if(t.neighborText){n+=20;let a=W(e);r+=a?P(a,t.neighborText)*20:0}return n>0?r/n:0}function qt(e,t){let r=je(e);if(!r)return null;let n=r.element.getBoundingClientRect(),o=new DOMRect(n.x+t.xPct*n.width,n.y+t.yPct*n.height,t.wPct*n.width,t.hPct*n.height);return{element:r.element,rect:o,confidence:r.confidence,strategy:r.strategy}}var Z=26,_=Z/2,Ke=200,Vt=180,Jt=300,tt=class{constructor(t,r,n,o){this.colors=t;this.bus=r;this.t=n;this.store=o;this.entries=[];this.visible=!0;this.includeDone=!1;this.popover=null;this.repositionTimer=null;this.lastPath=window.location.pathname;if(this.container=d("div",{style:`position:absolute;top:0;left:0;width:100%;height:0;overflow-x:clip;overflow-y:visible;z-index:${2147483645};pointer-events:none;`}),this.container.setAttribute("aria-hidden","false"),this.container.setAttribute("data-ccm-markers","true"),document.body.appendChild(this.container),!document.getElementById("ccm-marker-anim")){let s=document.createElement("style");s.id="ccm-marker-anim",s.textContent=`
        @keyframes ccm-pulse {
          0%, 100% { box-shadow: 0 2px 8px rgba(139,92,246,0.55), 0 0 0 0 rgba(139,92,246,0.55); }
          50%      { box-shadow: 0 2px 8px rgba(139,92,246,0.55), 0 0 0 10px rgba(139,92,246,0); }
        }
        @keyframes ccm-anchor-flash {
          0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0); outline-color: rgba(139,92,246,0); }
          30%      { box-shadow: 0 0 0 6px rgba(139,92,246,0.35); outline-color: rgba(139,92,246,0.95); }
          70%      { box-shadow: 0 0 0 10px rgba(139,92,246,0); outline-color: rgba(139,92,246,0.4); }
        }
        .ccm-anchor-flash {
          outline: 2px solid rgba(139,92,246,0);
          outline-offset: 3px;
          animation: ccm-anchor-flash 1.2s ease-in-out 1;
          border-radius: 2px;
        }
      `,document.head.appendChild(s)}this.onResize=this.scheduleReposition.bind(this),this.onScroll=this.scheduleReposition.bind(this),window.addEventListener("resize",this.onResize,{passive:!0}),window.addEventListener("scroll",this.onScroll,{passive:!0}),this.onDocClick=s=>{this.popover&&(s.composedPath().some(i=>i===this.popover)||this.closePopover())},document.addEventListener("click",this.onDocClick,!0);let a=()=>{window.location.pathname!==this.lastPath&&(this.lastPath=window.location.pathname,this.refresh())};this.onPopState=a,window.addEventListener("popstate",this.onPopState),this.origPushState=history.pushState.bind(history),this.origReplaceState=history.replaceState.bind(history),history.pushState=(...s)=>{this.origPushState(...s),a()},history.replaceState=(...s)=>{this.origReplaceState(...s),a()},this.bus.on("annotations:toggle",s=>this.setVisible(s))}refresh(){this.closePopover();for(let r of this.entries)r.node.remove();this.entries=[],this.store.listForPath(window.location.pathname).filter(r=>this.shouldRender(r)).forEach((r,n)=>{let o=this.buildMarker(r,n+1);this.container.appendChild(o),this.entries.push({record:r,node:o,anchorEl:null})}),this.reposition()}addOne(t){if(!this.shouldRender(t))return;let r=this.entries.length+1,n=this.buildMarker(t,r);this.container.appendChild(n),this.entries.unshift({record:t,node:n,anchorEl:null}),this.renumber(),this.reposition()}shouldRender(t){return!((t.status??"todo")==="done"&&!this.includeDone)}setIncludeDone(t){this.includeDone!==t&&(this.includeDone=t,this.refresh())}setVisible(t){this.visible=t,this.container.style.display=t?"block":"none",t||this.closePopover()}canLocate(t){let r=this.entries.find(n=>n.record.id===t);return r?this.isEntryLocatable(r):!1}scrollToAndFlash(t){let r=this.entries.find(o=>o.record.id===t);if(!r||!this.isEntryLocatable(r))return!1;let n=Number.parseFloat(r.node.style.top);if(Number.isFinite(n)&&window.scrollTo({top:Math.max(0,n-window.innerHeight/3),behavior:"smooth"}),this.visible){let o=r.node;o.style.animation="ccm-pulse 0.6s ease-in-out 1",window.setTimeout(()=>{let a=o.dataset.status;o.style.animation=a==="question"?"ccm-pulse 1.6s ease-in-out infinite":""},650)}return this.flashAnchorElement(r),!0}flashAnchorElement(t){if((t.record.kind??"target")!=="target")return;let n=t.anchorEl;!n||!(n instanceof HTMLElement)||(n.classList.remove("ccm-anchor-flash"),n.offsetWidth,n.classList.add("ccm-anchor-flash"),window.setTimeout(()=>{n.classList.remove("ccm-anchor-flash")},1250))}isEntryLocatable(t){return!0}buildMarker(t,r){let n=t.status??"todo",o=L[n],a=d("button",{type:"button","aria-label":this.t("marker.ariaLabel",{n:r}),style:`
        position:absolute;width:${Z}px;height:${Z}px;
        border-radius:9999px;border:2px solid #fff;
        background:${o.border};color:#fff;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:12px;font-weight:700;line-height:1;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 8px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.18);
        cursor:pointer;pointer-events:auto;
        transform:translate(-50%, -50%);transition:transform 0.15s ease;
      `});return a.dataset.annotationId=t.id,a.dataset.status=n,a.dataset.kind=t.kind??"target",n==="question"&&(a.style.animation="ccm-pulse 1.6s ease-in-out infinite"),h(a,String(r)),a.addEventListener("mouseenter",()=>{a.style.transform="translate(-50%, -50%) scale(1.12)"}),a.addEventListener("mouseleave",()=>{a.style.transform="translate(-50%, -50%) scale(1)"}),a.addEventListener("click",s=>{s.stopPropagation(),this.openPopover(t,a)}),a}renumber(){this.entries.forEach((t,r)=>{let n=r+1;h(t.node,String(n)),t.node.setAttribute("aria-label",this.t("marker.ariaLabel",{n}))})}openPopover(t,r){this.closePopover();let n=d("div",{style:`
        z-index:${2147483647};max-width:300px;min-width:220px;padding:14px;
        border-radius:12px;background:${this.colors.glassBg};
        backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
        border:1px solid ${this.colors.glassBorder};
        box-shadow:0 8px 32px ${this.colors.shadow},0 2px 8px ${this.colors.shadow};
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        color:${this.colors.text};font-size:13px;line-height:1.5;
        -webkit-font-smoothing:antialiased;
      `});n.setAttribute("role","dialog"),n.setAttribute("aria-label",this.t("marker.ariaLabel",{n:""})),n.addEventListener("click",C=>C.stopPropagation());let o=d("div",{style:"white-space:pre-wrap;word-break:break-word;margin-bottom:10px;"});h(o,t.message);let a=d("div",{style:`font-size:11px;color:${this.colors.textTertiary};margin-bottom:12px;`}),s=t.authorName?.trim()||"Anonymous";h(a,`${s} \xB7 ${new Date(t.createdAt).toLocaleString()}`);let i=t.status??"todo",l=L[i],c=d("span",{style:`
        display:inline-block;padding:2px 10px;border-radius:9999px;
        font-size:10px;font-weight:600;letter-spacing:0.02em;
        background:${l.bg};color:${l.fg};border:1px solid ${l.border};
        margin-right:6px;cursor:pointer;
      `});h(c,this.t(`status.${i}`).toUpperCase()),c.addEventListener("click",()=>this.cycleStatus(t));let p=d("span",{style:`
        display:inline-block;padding:2px 8px;border-radius:9999px;
        font-size:10px;font-weight:600;letter-spacing:0.02em;
        background:${this.colors.glassBgHeavy};color:${this.colors.textTertiary};
        border:1px solid ${this.colors.border};margin-right:6px;text-transform:uppercase;
      `});h(p,t.kind??"target");let f=d("div",{style:"margin-bottom:10px;display:flex;flex-wrap:wrap;gap:4px;"});f.appendChild(c),f.appendChild(p);let g=d("div",{style:"display:flex;justify-content:flex-end;gap:8px;"}),b=document.createElement("button");b.type="button",b.style.cssText=`
      height:30px;padding:0 14px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;font-size:12px;font-weight:500;
      cursor:pointer;transition:all 0.2s ease;
    `,h(b,this.t("marker.popover.close")),b.addEventListener("click",()=>this.closePopover());let m=document.createElement("button");m.type="button",m.style.cssText=`
      height:30px;padding:0 14px;border-radius:9999px;
      border:1px solid ${this.colors.typeBug};background:${this.colors.typeBugBg};
      color:${this.colors.typeBug};font-family:inherit;font-size:12px;font-weight:600;
      cursor:pointer;transition:all 0.2s ease;
    `,h(m,this.t("marker.popover.delete")),m.addEventListener("click",()=>{window.confirm(this.t("marker.popover.deleteConfirm"))&&(this.store.delete(t.id),this.bus.emit("feedback:deleted",t.id),this.closePopover(),this.refresh())}),g.appendChild(b),g.appendChild(m),n.appendChild(f),n.appendChild(o),n.appendChild(a),n.appendChild(g);let x=r.getBoundingClientRect();n.style.position="fixed";let w=x.bottom+8,k=x.left-10;w+Vt>window.innerHeight&&(w=x.top-Vt-8),k+Jt>window.innerWidth&&(k=window.innerWidth-Jt-8),w=Math.max(8,w),k=Math.max(8,k),n.style.top=`${w}px`,n.style.left=`${k}px`,document.body.appendChild(n),this.popover=n}cycleStatus(t){let r=["todo","review","done","question"],n=t.status??"todo",o=r[(r.indexOf(n)+1)%r.length]??"todo";this.store.updateStatus?.(t.id,o),t.status=o,this.bus.emit("feedback:updated",t),this.closePopover(),this.refresh()}closePopover(){this.popover&&(this.popover.remove(),this.popover=null)}scheduleReposition(){this.repositionTimer===null&&(this.repositionTimer=window.setTimeout(()=>{this.repositionTimer=null,this.reposition()},Ke))}reposition(){let t=document.documentElement.clientWidth,r=_,n=Math.max(_,t-_),o=i=>Math.max(r,Math.min(n,i)),a=0,s=i=>window.scrollY+80+i*(Z+8);for(let i of this.entries){let l=i.record.kind??"target";if(l==="pin"&&i.record.pinX!=null&&i.record.pinY!=null){i.node.style.display=this.visible?"flex":"none",i.node.style.top=`${i.record.pinY}px`,i.node.style.left=`${o(i.record.pinX)}px`,i.anchorEl=null;continue}if(l==="area"&&i.record.areaX!=null&&i.record.areaY!=null&&i.record.areaW!=null&&i.record.areaH!=null){i.node.style.display=this.visible?"flex":"none",i.node.style.top=`${i.record.areaY}px`,i.node.style.left=`${o(i.record.areaX+i.record.areaW)}px`,i.anchorEl=null;continue}let c=qt({cssSelector:i.record.cssSelector,xpath:i.record.xpath,textSnippet:i.record.textSnippet,elementTag:i.record.elementTag,elementId:i.record.elementId,textPrefix:i.record.textPrefix,textSuffix:i.record.textSuffix,fingerprint:i.record.fingerprint,neighborText:i.record.neighborText},{xPct:i.record.xPct,yPct:i.record.yPct,wPct:i.record.wPct,hPct:i.record.hPct});if(!c){i.node.style.display=this.visible?"flex":"none",i.node.style.top=`${s(a)}px`,i.node.style.left=`${n}px`,i.node.dataset.orphan="true",i.anchorEl=null,a++;continue}i.node.dataset.orphan="false",i.anchorEl=c.element;let p=c.rect,f=p.top+window.scrollY-_,g=p.right+window.scrollX;i.node.style.display=this.visible?"flex":"none",i.node.style.top=`${f+_}px`,i.node.style.left=`${o(g)}px`}}destroy(){window.removeEventListener("resize",this.onResize),window.removeEventListener("scroll",this.onScroll),window.removeEventListener("popstate",this.onPopState),document.removeEventListener("click",this.onDocClick,!0),history.pushState=this.origPushState,history.replaceState=this.origReplaceState,this.closePopover(),this.container.remove(),this.entries=[]}};var Qt=8,et=class{constructor(t,r,n,o,a){this.colors=t;this.bus=r;this.t=n;this.openPopupForElement=o;this.shouldIgnoreElement=a;this.overlay=null;this.toolbar=null;this.badge=null;this.hoveredElement=null;this.isActive=!1;this.savedOverflow="";this.previouslyFocused=null;this.previousOutline=null;this.previousOutlineOffset=null;this.previousOutlinePriority="";this.previousOutlineOffsetPriority="";this.onKeyDown=t=>{t.key==="Escape"&&(t.preventDefault(),this.deactivate())};this.onOverlayMouseMove=t=>{if(!this.overlay)return;this.overlay.style.pointerEvents="none";let r=document.elementFromPoint(t.clientX,t.clientY);if(this.overlay.style.pointerEvents="auto",!r||!(r instanceof HTMLElement)){this.clearHoverOutline();return}if(this.shouldIgnoreElement(r)){this.clearHoverOutline();return}if(r===document.documentElement||r===document.body){this.clearHoverOutline();return}r!==this.hoveredElement&&(this.clearHoverOutline(),this.hoveredElement=r,this.applyHoverOutline(r))};this.onOverlayClick=t=>{if(t.preventDefault(),t.stopPropagation(),!this.overlay)return;this.overlay.style.pointerEvents="none";let r=document.elementFromPoint(t.clientX,t.clientY);this.overlay.style.pointerEvents="auto",!(!r||!(r instanceof HTMLElement))&&(this.shouldIgnoreElement(r)||r===document.documentElement||r===document.body||(this.clearHoverOutline(),this.handleSelect(r)))};this.unsubPinStart=this.bus.on("target:start",()=>this.activate())}activate(){if(this.isActive)return;this.isActive=!0,this.savedOverflow=document.body.style.overflow,this.previouslyFocused=document.activeElement instanceof HTMLElement?document.activeElement:null,this.overlay=d("div",{style:`
        position:fixed;inset:0;z-index:${2147483646};
        background:rgba(15, 23, 42, 0.02);
        cursor:crosshair;
      `}),this.overlay.setAttribute("aria-hidden","true"),this.overlay.setAttribute("data-ccm-pin-overlay","true"),this.toolbar=d("div",{style:`
        position:fixed;top:0;left:0;right:0;z-index:${2147483647};
        height:52px;background:${this.colors.glassBg};
        backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
        border-bottom:1px solid ${this.colors.glassBorder};
        display:flex;align-items:center;justify-content:center;gap:16px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:14px;color:${this.colors.text};
      `}),this.toolbar.setAttribute("aria-label",this.t("pin.ariaLabel"));let t=d("span",{style:"font-weight:500;letter-spacing:-0.01em;"});h(t,this.t("pin.instruction"));let r=document.createElement("button");r.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;font-weight:500;cursor:pointer;
    `,h(r,this.t("pin.cancel")),r.addEventListener("click",()=>this.deactivate()),this.toolbar.appendChild(t),this.toolbar.appendChild(r),this.overlay.addEventListener("mousemove",this.onOverlayMouseMove,!0),this.overlay.addEventListener("click",this.onOverlayClick,!0),document.addEventListener("keydown",this.onKeyDown),document.body.style.overflow="hidden",document.body.appendChild(this.overlay),document.body.appendChild(this.toolbar)}deactivate(){if(!this.isActive)return;this.isActive=!1,this.clearHoverOutline(),this.overlay?.removeEventListener("mousemove",this.onOverlayMouseMove,!0),this.overlay?.removeEventListener("click",this.onOverlayClick,!0),document.removeEventListener("keydown",this.onKeyDown),document.body.style.overflow=this.savedOverflow,this.overlay?.remove(),this.toolbar?.remove(),this.overlay=null,this.toolbar=null;let t=this.previouslyFocused;if(this.previouslyFocused=null,t&&typeof t.focus=="function"&&document.contains(t))try{t.focus()}catch{}this.bus.emit("target:end")}async handleSelect(t){this.deactivate();try{await this.openPopupForElement(t)}catch(r){console.error("[ccm-feedback] pin-mode: openPopupForElement threw",r)}}applyHoverOutline(t){this.previousOutline=t.style.outline||null,this.previousOutlineOffset=t.style.outlineOffset||null,this.previousOutlinePriority=t.style.getPropertyPriority("outline"),this.previousOutlineOffsetPriority=t.style.getPropertyPriority("outline-offset"),t.style.setProperty("outline",`2px solid ${this.colors.accent}`,"important"),t.style.setProperty("outline-offset","2px","important");let r=t.getBoundingClientRect();if(r.width>0&&r.height>0){this.badge=document.createElement("div");let n=t.tagName.toLowerCase();this.badge.textContent=n,this.badge.setAttribute("aria-hidden","true");let o=Math.max(Qt,Math.min(r.right-4,window.innerWidth-60)),a=Math.max(Qt,Math.min(r.bottom+4,window.innerHeight-24));this.badge.style.cssText=`
        position:fixed;
        left:${o}px;
        top:${a}px;
        transform:translateX(-100%);
        z-index:${2147483647};
        padding:2px 8px;border-radius:6px;
        background:${this.colors.glassBg};
        backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
        border:1px solid ${this.colors.accent};
        color:${this.colors.accent};
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:11px;font-weight:500;
        letter-spacing:0.02em;
        pointer-events:none;
        white-space:nowrap;
      `,document.body.appendChild(this.badge)}}clearHoverOutline(){this.hoveredElement&&(this.previousOutline!==null?this.hoveredElement.style.setProperty("outline",this.previousOutline,this.previousOutlinePriority):this.hoveredElement.style.removeProperty("outline"),this.previousOutlineOffset!==null?this.hoveredElement.style.setProperty("outline-offset",this.previousOutlineOffset,this.previousOutlineOffsetPriority):this.hoveredElement.style.removeProperty("outline-offset"),this.hoveredElement=null,this.previousOutline=null,this.previousOutlineOffset=null,this.previousOutlinePriority="",this.previousOutlineOffsetPriority=""),this.badge&&(this.badge.remove(),this.badge=null)}destroy(){this.deactivate(),this.unsubPinStart()}};var Xe="linear(0, 0.006, 0.025, 0.06, 0.11, 0.17, 0.25, 0.34, 0.45, 0.56, 0.67, 0.78, 0.88, 0.95, 1.01, 1.04, 1.05, 1.04, 1.02, 1, 0.99, 1)",xt="cubic-bezier(0.16, 1, 0.3, 1)",yt="cubic-bezier(0.34, 1.56, 0.64, 1)",Ue="cubic-bezier(0.25, 1, 0.5, 1)",Zt=`
  /* ---- Keyframes ---- */

  @keyframes sp-fab-in {
    from {
      transform: scale(0) rotate(-180deg);
      opacity: 0;
    }
    to {
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
  }

  @keyframes sp-fab-glow {
    0%, 100% { box-shadow: 0 4px 20px var(--sp-accent-glow), 0 2px 8px rgba(0, 0, 0, 0.08); }
    50% { box-shadow: 0 4px 28px var(--sp-accent-glow), 0 2px 12px rgba(0, 0, 0, 0.1); }
  }

  @keyframes sp-marker-in {
    0% {
      transform: scale(0);
      opacity: 0;
    }
    60% {
      transform: scale(1.2);
      opacity: 1;
    }
    100% {
      transform: scale(1);
    }
  }

  @keyframes sp-pulse-ring {
    0% {
      box-shadow: 0 0 0 0 var(--sp-accent-glow);
    }
    70% {
      box-shadow: 0 0 0 8px transparent;
    }
    100% {
      box-shadow: 0 0 0 0 transparent;
    }
  }

  @keyframes sp-flash-bg {
    0% { background-color: var(--sp-accent-light); }
    100% { background-color: transparent; }
  }

  @keyframes sp-slide-up {
    from {
      transform: translateY(8px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes sp-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes sp-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  /* ---- Animation classes ---- */

  .sp-anim-fab-in {
    animation: sp-fab-in 0.5s ${Xe} both;
  }

  .sp-anim-marker-in {
    animation: sp-marker-in 0.35s ${yt} both;
  }

  .sp-anim-pulse {
    animation: sp-pulse-ring 0.7s ease-out;
  }

  .sp-anim-flash {
    animation: sp-flash-bg 0.5s ${Ue};
  }

  .sp-anim-slide-up {
    animation: sp-slide-up 0.3s ${xt} both;
  }

  .sp-anim-fade-in {
    animation: sp-fade-in 0.2s ease-out both;
  }

  /* ---- Transition utilities ---- */

  .sp-panel {
    transform: translateX(110%);
    transition: transform 0.4s ${xt};
  }

  .sp-panel.sp-panel--open {
    transform: translateX(0);
  }

  .sp-radial-item {
    opacity: 0;
    pointer-events: none;
    transform: translate(0, 0) scale(0.8);
    transition:
      transform 0.35s ${yt},
      opacity 0.2s ease,
      background 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .sp-radial-item.sp-radial-item--open {
    opacity: 1;
    pointer-events: auto;
  }

  /* Stagger delay via CSS custom property --sp-i */
  .sp-radial-item {
    transition-delay: calc(var(--sp-i, 0) * 50ms);
  }

  /* ---- Card stagger animation ---- */

  @keyframes sp-card-in {
    from {
      transform: translateY(12px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .sp-card {
    animation: sp-card-in 0.35s ${xt} both;
    animation-delay: calc(var(--sp-card-i, 0) * 40ms);
  }

  /* ---- Loading spinner ---- */

  @keyframes sp-spin {
    to { transform: rotate(360deg); }
  }

  .sp-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--sp-border);
    border-top-color: var(--sp-accent);
    border-radius: 50%;
    animation: sp-spin 0.6s linear infinite;
  }

  /* ---- Badge bounce ---- */

  @keyframes sp-badge-in {
    0% { transform: scale(0); }
    60% { transform: scale(1.3); }
    100% { transform: scale(1); }
  }

  .sp-fab-badge {
    animation: sp-badge-in 0.4s ${yt} both;
  }

  /* ---- Reduced motion ---- */

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

`;var ee="#0066ff",Ye=/^#[0-9a-fA-F]{6}$/,te=/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/,We=/^#[0-9a-fA-F]{8}$/;function Ge(e){if(Ye.test(e))return e;let t=te.test(e)?e.match(te):null;return t?`#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}`:We.test(e)?e.slice(0,7):(console.warn(`[ccm-feedback] Invalid accentColor "${e}" \u2014 only hex colors (#RGB, #RRGGBB, #RRGGBBAA) are supported. Using default.`),ee)}function qe(e,t){let r=Math.max(0,Math.round(parseInt(e.slice(1,3),16)*(1-t))),n=Math.max(0,Math.round(parseInt(e.slice(3,5),16)*(1-t))),o=Math.max(0,Math.round(parseInt(e.slice(5,7),16)*(1-t)));return`#${r.toString(16).padStart(2,"0")}${n.toString(16).padStart(2,"0")}${o.toString(16).padStart(2,"0")}`}function Ve(){return typeof window>"u"?!1:window.matchMedia("(prefers-color-scheme: dark)").matches}function Je(e){return e==="dark"||e==="auto"&&Ve()?"dark":"light"}function re(e=ee,t){let r=Ge(e),n=qe(r,.15);return Je(t)==="dark"?{accent:r,accentLight:r+"22",accentDark:n,accentGlow:r+"44",accentGradient:`linear-gradient(135deg, ${r}, ${n})`,bg:"#0f172a",bgHover:"#1e293b",text:"#f1f5f9",textSecondary:"#94a3b8",textTertiary:"#64748b",border:"#334155",shadow:"rgba(0, 0, 0, 0.3)",glassBg:"rgba(15, 23, 42, 0.78)",glassBgHeavy:"rgba(15, 23, 42, 0.88)",glassBorder:"rgba(51, 65, 85, 0.5)",glassBorderSubtle:"rgba(51, 65, 85, 0.3)",typeQuestion:"#60a5fa",typeChange:"#fbbf24",typeBug:"#f87171",typeOther:"#94a3b8",typeComment:"#9ca3af",typeQuestionBg:"rgba(59, 130, 246, 0.15)",typeChangeBg:"rgba(245, 158, 11, 0.15)",typeBugBg:"rgba(239, 68, 68, 0.15)",typeOtherBg:"rgba(100, 116, 139, 0.15)",typeCommentBg:"rgba(107, 114, 128, 0.15)"}:{accent:r,accentLight:r+"14",accentDark:n,accentGlow:r+"33",accentGradient:`linear-gradient(135deg, ${r}, ${n})`,bg:"#ffffff",bgHover:"#f8f9fb",text:"#0f172a",textSecondary:"#475569",textTertiary:"#64748b",border:"#e2e8f0",shadow:"rgba(0, 0, 0, 0.06)",glassBg:"rgba(255, 255, 255, 0.72)",glassBgHeavy:"rgba(255, 255, 255, 0.85)",glassBorder:"rgba(255, 255, 255, 0.35)",glassBorderSubtle:"rgba(255, 255, 255, 0.18)",typeQuestion:"#3b82f6",typeChange:"#b45309",typeBug:"#ef4444",typeOther:"#64748b",typeComment:"#6b7280",typeQuestionBg:"#eff6ff",typeChangeBg:"#fffbeb",typeBugBg:"#fef2f2",typeOtherBg:"#f8fafc",typeCommentBg:"#e5e7eb"}}function ne(e){return`
    --sp-accent: ${e.accent};
    --sp-accent-light: ${e.accentLight};
    --sp-accent-dark: ${e.accentDark};
    --sp-accent-glow: ${e.accentGlow};
    --sp-accent-gradient: ${e.accentGradient};
    --sp-bg: ${e.bg};
    --sp-bg-hover: ${e.bgHover};
    --sp-text: ${e.text};
    --sp-text-secondary: ${e.textSecondary};
    --sp-text-tertiary: ${e.textTertiary};
    --sp-border: ${e.border};
    --sp-shadow: ${e.shadow};
    --sp-glass-bg: ${e.glassBg};
    --sp-glass-bg-heavy: ${e.glassBgHeavy};
    --sp-glass-border: ${e.glassBorder};
    --sp-glass-border-subtle: ${e.glassBorderSubtle};
    --sp-type-question: ${e.typeQuestion};
    --sp-type-change: ${e.typeChange};
    --sp-type-bug: ${e.typeBug};
    --sp-type-other: ${e.typeOther};
    --sp-type-comment: ${e.typeComment};
    --sp-type-question-bg: ${e.typeQuestionBg};
    --sp-type-change-bg: ${e.typeChangeBg};
    --sp-type-bug-bg: ${e.typeBugBg};
    --sp-type-other-bg: ${e.typeOtherBg};
    --sp-type-comment-bg: ${e.typeCommentBg};
    --sp-radius: 12px;
    --sp-radius-lg: 16px;
    --sp-radius-xl: 20px;
    --sp-radius-full: 9999px;
    --sp-blur: 20px;
    --sp-blur-heavy: 32px;
    --sp-shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.04);
    --sp-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.04);
    --sp-shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
    --sp-shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.04);
    --sp-shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.06);
    --sp-font: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  `}function wt(e){return`
    :host {
      all: initial;
      position: fixed;
      z-index: ${2147483647};
      font-family: var(--sp-font);
      font-size: 14px;
      line-height: 1.5;
      color: var(--sp-text);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      ${ne(e)}

      /* Identity modal \u2014 theme-aware backdrop + panel */
      --sp-identity-bg: ${e.glassBgHeavy};
      --sp-identity-overlay: ${e.bg==="#ffffff"?"rgba(15, 23, 42, 0.2)":"rgba(0, 0, 0, 0.4)"};
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* ============================
       Focus visible (accessibility)
       ============================ */

    :focus-visible {
      outline: 2px solid var(--sp-accent);
      outline-offset: 2px;
    }

    /* ============================
       FAB (Floating Action Button)
       ============================ */

    .sp-fab {
      position: fixed;
      /* Bumped to ensure visibility over third-party chat/widgets that
         routinely sit at z-index 2147483600+ (Intercom, Drift, etc.). */
      z-index: ${2147483647};
      width: 60px;
      height: 60px;
      border-radius: var(--sp-radius-full);
      background: var(--sp-accent-gradient);
      color: #fff;
      border: 2px solid rgba(255, 255, 255, 0.85);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow:
        0 6px 28px var(--sp-accent-glow),
        0 4px 12px rgba(0, 0, 0, 0.18),
        0 0 0 1px rgba(0, 0, 0, 0.04);
      transition:
        transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
        box-shadow 0.3s ease;
      outline: none;
      /* Gentle attention pulse on first paint \u2014 wears off after 3 cycles. */
      animation: sp-fab-attn 1.6s ease-out 3;
    }

    @keyframes sp-fab-attn {
      0%, 100% { box-shadow: 0 6px 28px var(--sp-accent-glow), 0 4px 12px rgba(0,0,0,0.18), 0 0 0 0 var(--sp-accent-glow); }
      50%      { box-shadow: 0 6px 28px var(--sp-accent-glow), 0 4px 12px rgba(0,0,0,0.18), 0 0 0 14px transparent; }
    }

    .sp-fab:focus-visible {
      outline: 2px solid #fff;
      outline-offset: 3px;
    }

    .sp-fab:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow:
        0 8px 28px var(--sp-accent-glow),
        0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .sp-fab:active {
      transform: translateY(0) scale(0.95);
      transition-duration: 0.1s;
    }

    .sp-fab--bottom-right {
      bottom: 24px;
      right: 24px;
    }

    .sp-fab--bottom-left {
      bottom: 24px;
      left: 24px;
    }

    .sp-fab svg {
      width: 26px;
      height: 26px;
      fill: currentColor;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    /* ---- FAB Badge ---- */

    .sp-fab-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: var(--sp-radius-full);
      background: #ef4444;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #fff;
      pointer-events: none;
      font-family: var(--sp-font);
      line-height: 1;
    }

    /* ============================
       Radial Menu
       ============================ */

    .sp-radial {
      position: fixed;
      pointer-events: none;
      width: 52px;
      height: 52px;
    }

    .sp-radial--bottom-right {
      bottom: 24px;
      right: 24px;
    }

    .sp-radial--bottom-left {
      bottom: 24px;
      left: 24px;
    }

    .sp-radial-item {
      position: absolute;
      left: 4px;
      bottom: 4px;
      width: 44px;
      height: 44px;
      border-radius: var(--sp-radius-full);
      background: var(--sp-glass-bg-heavy);
      backdrop-filter: blur(var(--sp-blur));
      -webkit-backdrop-filter: blur(var(--sp-blur));
      color: var(--sp-text);
      border: 1px solid var(--sp-glass-border);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--sp-shadow-md);
      font-size: 12px;
      font-weight: 600;
    }

    .sp-radial-item:hover,
    .sp-radial-item:focus-visible {
      background: rgba(255, 255, 255, 0.95);
      border-color: var(--sp-accent);
      color: var(--sp-accent);
      box-shadow:
        var(--sp-shadow-md),
        0 0 0 3px var(--sp-accent-light);
      outline: none;
    }

    .sp-radial-item svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      stroke: currentColor;
      fill: none;
    }

    .sp-radial-label {
      white-space: nowrap;
      font-size: 12px;
      font-weight: 500;
      color: var(--sp-text);
      pointer-events: none;
      opacity: 0;
      padding: 4px 12px;
      border-radius: var(--sp-radius);
      background: var(--sp-glass-bg-heavy);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--sp-glass-border);
      box-shadow: var(--sp-shadow-sm);
      transform: translateX(4px);
      transition: opacity 0.2s ease, transform 0.2s ease;
    }

    .sp-radial-item:hover .sp-radial-label,
    .sp-radial-item:focus-visible .sp-radial-label {
      opacity: 1;
      transform: translateX(0);
    }

    /* ============================
       Panel (Side drawer)
       ============================ */

    .sp-panel {
      position: fixed;
      top: 0;
      right: 0;
      width: 400px;
      max-width: 100vw;
      height: 100vh;
      height: 100dvh;
      background: var(--sp-glass-bg);
      backdrop-filter: blur(var(--sp-blur-heavy));
      -webkit-backdrop-filter: blur(var(--sp-blur-heavy));
      border-left: 1px solid var(--sp-glass-border);
      box-shadow: var(--sp-shadow-xl);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    @media (max-width: 480px) {
      .sp-panel {
        width: 100vw;
        border-left: none;
      }
    }

    .sp-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--sp-border);
      background: var(--sp-glass-bg-heavy);
      backdrop-filter: blur(var(--sp-blur));
      -webkit-backdrop-filter: blur(var(--sp-blur));
    }

    .sp-panel-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--sp-text);
      letter-spacing: -0.02em;
    }

    .sp-panel-close {
      width: 44px;
      height: 44px;
      border-radius: var(--sp-radius);
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--sp-text-tertiary);
      transition: all 0.2s ease;
    }

    .sp-panel-close:hover {
      background: var(--sp-bg-hover);
      color: var(--sp-text);
    }

    .sp-panel-close svg {
      width: 16px;
      height: 16px;
    }

    /* ============================
       Filters & Search
       ============================ */

    .sp-filters {
      padding: 16px 24px;
      border-bottom: 1px solid var(--sp-border);
      background: var(--sp-glass-bg-heavy);
      backdrop-filter: blur(var(--sp-blur));
      -webkit-backdrop-filter: blur(var(--sp-blur));
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .sp-search-wrap {
      position: relative;
      margin-bottom: 12px;
    }

    .sp-search {
      width: 100%;
      height: 40px;
      padding: 0 12px 0 38px;
      border-radius: var(--sp-radius);
      border: 1px solid var(--sp-border);
      background: var(--sp-glass-bg-heavy);
      color: var(--sp-text);
      font-family: var(--sp-font);
      font-size: 13px;
      outline: none;
      transition: all 0.2s ease;
    }

    .sp-search::placeholder {
      color: var(--sp-text-tertiary);
    }

    .sp-search:focus {
      border-color: var(--sp-accent);
      box-shadow: 0 0 0 3px var(--sp-accent-light);
      background: #fff;
    }

    .sp-search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--sp-text-tertiary);
      width: 16px;
      height: 16px;
      transition: color 0.2s ease;
    }

    .sp-search:focus ~ .sp-search-icon,
    .sp-search-wrap:focus-within .sp-search-icon {
      color: var(--sp-accent);
    }

    .sp-chips {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }

    .sp-chips:last-child {
      margin-bottom: 0;
    }

    .sp-chip {
      padding: 5px 14px;
      border-radius: var(--sp-radius-full);
      border: 1px solid var(--sp-border);
      background: var(--sp-glass-bg-heavy);
      color: var(--sp-text-secondary);
      font-family: var(--sp-font);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
      letter-spacing: 0.01em;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .sp-chip-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: var(--sp-radius-full);
      background: var(--sp-border);
      color: var(--sp-text-tertiary);
      font-size: 10.5px;
      font-weight: 600;
      line-height: 1;
      transition: background 0.2s ease, color 0.2s ease;
    }

    .sp-chip--active .sp-chip-count {
      background: rgba(255, 255, 255, 0.25);
      color: #fff;
    }

    .sp-chip:hover:not(.sp-chip--active) .sp-chip-count {
      background: var(--sp-accent-light);
      color: var(--sp-accent);
    }

    .sp-chip:hover {
      border-color: var(--sp-accent);
      color: var(--sp-accent);
      background: var(--sp-accent-light);
    }

    .sp-chip--active {
      background: var(--sp-accent-gradient);
      border-color: transparent;
      color: #fff;
      box-shadow: 0 2px 8px var(--sp-accent-glow);
    }

    .sp-chip--active:hover {
      background: var(--sp-accent-gradient);
      border-color: transparent;
      color: #fff;
    }

    /* ============================
       Feedback Cards
       ============================ */

    .sp-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px 12px;
    }

    .sp-list::-webkit-scrollbar {
      width: 6px;
    }

    .sp-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .sp-list::-webkit-scrollbar-thumb {
      background: var(--sp-border);
      border-radius: var(--sp-radius-full);
    }

    .sp-list::-webkit-scrollbar-thumb:hover {
      background: var(--sp-text-tertiary);
    }

    .sp-card {
      display: flex;
      padding: 14px 16px;
      margin-bottom: 6px;
      cursor: pointer;
      border-radius: var(--sp-radius);
      background: var(--sp-glass-bg-heavy);
      border: 1px solid var(--sp-glass-border);
      box-shadow: var(--sp-shadow-xs);
      transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .sp-card:hover {
      background: #fff;
      border-color: var(--sp-border);
      box-shadow: var(--sp-shadow-md);
      transform: translateY(-2px);
    }

    .sp-card:active {
      transform: translateY(0) scale(0.99);
      transition-duration: 0.1s;
    }

    .sp-card-bar {
      width: 3px;
      border-radius: var(--sp-radius-full);
      margin-right: 14px;
      flex-shrink: 0;
    }

    .sp-card-body {
      flex: 1;
      min-width: 0;
    }

    .sp-card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .sp-card-number {
      font-size: 12px;
      font-weight: 700;
      color: var(--sp-text-tertiary);
      font-variant-numeric: tabular-nums;
    }

    .sp-badge {
      padding: 2px 10px;
      border-radius: var(--sp-radius-full);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .sp-card-date {
      font-size: 11px;
      color: var(--sp-text-tertiary);
      margin-left: auto;
    }

    .sp-card-message {
      font-size: 13px;
      line-height: 1.5;
      color: var(--sp-text);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .sp-card-message--expanded {
      -webkit-line-clamp: unset;
    }

    .sp-card-expand {
      font-size: 12px;
      font-weight: 500;
      color: var(--sp-accent);
      cursor: pointer;
      background: none;
      border: none;
      padding: 4px 0;
      font-family: var(--sp-font);
      transition: opacity 0.15s ease;
    }

    .sp-card-expand:hover {
      opacity: 0.8;
    }

    .sp-card-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      margin-top: 10px;
    }

    .sp-btn-resolve,
    .sp-btn-delete {
      padding: 8px 14px;
      border-radius: var(--sp-radius-full);
      border: 1px solid var(--sp-border);
      background: transparent;
      color: var(--sp-text-secondary);
      font-family: var(--sp-font);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.2s ease;
    }

    .sp-btn-resolve svg,
    .sp-btn-delete svg {
      width: 14px;
      height: 14px;
    }

    .sp-btn-resolve:hover {
      border-color: #22c55e;
      color: #22c55e;
      background: rgba(34, 197, 94, 0.06);
    }

    .sp-btn-delete:hover {
      border-color: #ef4444;
      color: #ef4444;
      background: rgba(239, 68, 68, 0.06);
    }

    .sp-btn-resolve:disabled,
    .sp-btn-delete:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    .sp-spinner--sm {
      width: 14px;
      height: 14px;
    }

    /* ---- Delete All (header) ---- */

    .sp-panel-header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sp-btn-delete-all {
      padding: 5px 12px;
      border-radius: var(--sp-radius-full);
      border: 1px solid var(--sp-border);
      background: transparent;
      color: var(--sp-text-tertiary);
      font-family: var(--sp-font);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.2s ease;
    }

    .sp-btn-delete-all svg {
      width: 13px;
      height: 13px;
    }

    .sp-btn-delete-all:hover {
      border-color: #ef4444;
      color: #ef4444;
      background: rgba(239, 68, 68, 0.06);
    }

    .sp-btn-delete-all:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* ---- Confirm Dialog ---- */

    .sp-confirm-backdrop {
      position: fixed;
      inset: 0;
      background: var(--sp-backdrop, rgba(15, 23, 42, 0.2));
      backdrop-filter: blur(var(--sp-blur));
      -webkit-backdrop-filter: blur(var(--sp-blur));
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: ${2147483647};
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .sp-confirm-dialog {
      width: 340px;
      padding: 28px;
      border-radius: 20px;
      background: var(--sp-glass-bg-heavy);
      backdrop-filter: blur(var(--sp-blur-heavy));
      -webkit-backdrop-filter: blur(var(--sp-blur-heavy));
      border: 1px solid var(--sp-glass-border);
      box-shadow: var(--sp-shadow-xl);
      font-family: var(--sp-font);
      transform: translateY(8px) scale(0.97);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .sp-confirm-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--sp-text);
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }

    .sp-confirm-message {
      font-size: 14px;
      color: var(--sp-text-secondary);
      line-height: 1.5;
      margin-bottom: 20px;
    }

    .sp-confirm-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .sp-btn-danger {
      height: 40px;
      padding: 0 22px;
      border-radius: var(--sp-radius);
      border: none;
      background: #ef4444;
      color: #fff;
      font-family: var(--sp-font);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
    }

    .sp-btn-danger:hover {
      background: #dc2626;
      box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
      transform: translateY(-1px);
    }

    .sp-btn-danger:active {
      transform: translateY(0) scale(0.98);
      transition-duration: 0.1s;
    }

    .sp-card--resolved {
      opacity: 0.5;
    }

    .sp-card--resolved .sp-card-message {
      text-decoration: line-through;
      text-decoration-color: var(--sp-text-tertiary);
    }

    /* ============================
       Loading State
       ============================ */

    .sp-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
    }

    /* ============================
       Identity Form
       ============================ */

    .sp-identity-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--sp-text);
      letter-spacing: -0.02em;
    }

    .sp-input {
      width: 100%;
      height: 42px;
      padding: 0 14px;
      border-radius: var(--sp-radius);
      border: 1px solid var(--sp-border);
      background: var(--sp-glass-bg-heavy);
      color: var(--sp-text);
      font-family: var(--sp-font);
      font-size: 14px;
      outline: none;
      transition: all 0.2s ease;
    }

    .sp-input::placeholder {
      color: var(--sp-text-tertiary);
    }

    .sp-input:focus {
      border-color: var(--sp-accent);
      box-shadow: 0 0 0 3px var(--sp-accent-light);
      background: #fff;
    }

    .sp-input-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--sp-text-secondary);
      margin-bottom: 6px;
      display: block;
    }

    /* ============================
       Buttons
       ============================ */

    .sp-btn-primary {
      height: 40px;
      padding: 0 22px;
      border-radius: var(--sp-radius);
      border: none;
      background: var(--sp-accent-gradient);
      color: #fff;
      font-family: var(--sp-font);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px var(--sp-accent-glow);
    }

    .sp-btn-primary:hover {
      box-shadow: 0 4px 16px var(--sp-accent-glow);
      transform: translateY(-1px);
    }

    .sp-btn-primary:active {
      transform: translateY(0) scale(0.98);
      transition-duration: 0.1s;
    }

    .sp-btn-primary:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .sp-btn-ghost {
      height: 40px;
      padding: 0 22px;
      border-radius: var(--sp-radius);
      border: 1px solid var(--sp-border);
      background: var(--sp-glass-bg-heavy);
      color: var(--sp-text-secondary);
      font-family: var(--sp-font);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .sp-btn-ghost:hover {
      border-color: var(--sp-accent);
      color: var(--sp-accent);
      background: var(--sp-accent-light);
    }

    /* ============================
       Empty State
       ============================ */

    .sp-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 56px 24px;
      color: var(--sp-text-tertiary);
      text-align: center;
      gap: 8px;
      animation: sp-fade-in 0.3s ease-out both;
    }

    .sp-empty-text {
      font-size: 14px;
      font-weight: 500;
    }

    /* ============================
       Load More
       ============================ */

    .sp-load-more-wrap {
      display: flex;
      justify-content: center;
      padding: 12px 0 4px;
    }

    .sp-btn-load-more {
      width: 100%;
    }

    /* ============================
       Forced Colors / High Contrast
       ============================ */

    @media (forced-colors: active) {
      .sp-fab,
      .sp-radial-item,
      .sp-chip,
      .sp-card,
      .sp-panel-close,
      .sp-search,
      .sp-btn-resolve,
      .sp-btn-delete,
      .sp-btn-delete-all,
      .sp-btn-primary,
      .sp-btn-ghost,
      .sp-btn-danger,
      .sp-card-expand,
      .sp-input,
      .sp-confirm-dialog {
        border: 2px solid ButtonText !important;
        background: Canvas !important;
        color: ButtonText !important;
      }

      .sp-fab:focus-visible,
      .sp-radial-item:focus-visible,
      .sp-chip:focus-visible,
      .sp-panel-close:focus-visible,
      .sp-btn-resolve:focus-visible,
      .sp-btn-delete:focus-visible,
      .sp-btn-delete-all:focus-visible,
      .sp-btn-primary:focus-visible,
      .sp-btn-ghost:focus-visible,
      .sp-btn-danger:focus-visible,
      .sp-card-expand:focus-visible,
      .sp-input:focus-visible,
      .sp-search:focus-visible {
        outline: 3px solid Highlight !important;
      }

      .sp-panel {
        border: 2px solid ButtonText !important;
      }

      .sp-fab-badge {
        border: 2px solid ButtonText !important;
        background: Canvas !important;
        color: ButtonText !important;
      }

      .sp-card-bar {
        background: ButtonText !important;
      }
    }

    ${Zt}
  `}function T(e){return e.reduce((t,r)=>t+((r.status??"todo")!=="done"?1:0),0)}var I=null;function ie(){return{destroy:()=>{},count:()=>0,export:()=>{}}}function Et(e){let t=e.debug?(...u)=>console.debug("[ccm-feedback]",...u):()=>{};if(I)return t("initCcmFeedback() called more than once \u2014 returning existing instance"),I;if(!e.projectName||typeof e.projectName!="string")return console.error("[ccm-feedback] Missing or invalid 'projectName' in config."),ie();if(window.innerWidth<768)return console.info(`[ccm-feedback] Widget not loaded: viewport < ${768}px.`),ie();t("Initializing",{projectName:e.projectName});let r=re(e.accentColor,e.theme),n=Gt(),o=new J,a=!!(e.supabaseUrl&&e.supabaseKey),s,i=null;a?(i=new Y({url:e.supabaseUrl,apiKey:e.supabaseKey,projectName:e.projectName,log:t,onChange:()=>{f.refresh(),g.updateCount(T(s.list())),b.refreshIfOpen()}}),s=i,t("Cloud mode enabled",{url:e.supabaseUrl})):(s=new X(e.projectName),t("LocalStorage mode"));let l=document.createElement("ccm-feedback-widget");l.style.cssText=`position:fixed;z-index:${2147483647};`;let c=l.attachShadow({mode:"open"});if("adoptedStyleSheets"in ShadowRoot.prototype){let u=new CSSStyleSheet;u.replaceSync(wt(r)),c.adoptedStyleSheets=[u]}else{let u=document.createElement("style");u.textContent=wt(r),c.appendChild(u)}document.body.appendChild(l);let p=new q(r,n),f=new tt(r,o,n,s),g=new Q(c,o,n,a),b=new V(c,o,n,s,r,u=>f.scrollToAndFlash(u),u=>f.setIncludeDone(u==="done"));o.on("navigator:open",()=>b.open());let m=u=>u===l||l.contains(u),x=()=>({cssSelector:"",xpath:"",textSnippet:"",elementTag:"",elementId:void 0,textPrefix:"",textSuffix:"",fingerprint:"",neighborText:""}),w=async u=>{let A=u.getBoundingClientRect(),E=await p.show(A);if(!E)return;let S=j(),le=It(u),Ct=u.getBoundingClientRect(),ce=Dt(Ct,Ct),nt=s.save({projectName:e.projectName,message:E.message,authorName:S,url:kt(window.location.href),path:window.location.pathname,viewport:`${window.innerWidth}x${window.innerHeight}`,userAgent:navigator.userAgent,anchor:le,rect:ce,status:E.status,kind:"target"});o.emit("feedback:saved",nt),f.addOne(nt),g.updateCount(T(s.list())),t("Saved",nt.id)},k=async u=>{let A=new DOMRect(u.x-window.scrollX,u.y-window.scrollY,0,0),E=await p.show(A);if(!E)return;let S=s.save({projectName:e.projectName,message:E.message,authorName:j(),url:kt(window.location.href),path:window.location.pathname,viewport:`${window.innerWidth}x${window.innerHeight}`,userAgent:navigator.userAgent,anchor:x(),rect:{xPct:0,yPct:0,wPct:0,hPct:0},status:E.status,kind:"pin",pin:{x:u.x,y:u.y},capturedElements:u.elements});o.emit("feedback:saved",S),f.addOne(S),g.updateCount(T(s.list())),t("Saved pin",S.id)},C=async u=>{let A=new DOMRect(u.x-window.scrollX,u.y-window.scrollY,u.w,u.h),E=await p.show(A);if(!E)return;let S=s.save({projectName:e.projectName,message:E.message,authorName:j(),url:kt(window.location.href),path:window.location.pathname,viewport:`${window.innerWidth}x${window.innerHeight}`,userAgent:navigator.userAgent,anchor:x(),rect:{xPct:0,yPct:0,wPct:0,hPct:0},status:E.status,kind:"area",area:{x:u.x,y:u.y,w:u.w,h:u.h},capturedElements:u.elements});o.emit("feedback:saved",S),f.addOne(S),g.updateCount(T(s.list())),t("Saved area",S.id)},F=new et(r,o,n,w,m),D=new H(r,o,n,k,m),ae=new z(r,o,n,C,m);o.on("export:click",()=>{let u=s.list();if(u.length===0){console.info("[ccm-feedback] No annotations to export.");return}gt(e.projectName,u)}),o.on("copyUrl:click",()=>{let u=`${window.location.origin}/feedback?project=${encodeURIComponent(e.projectName)}`;Wt(u).then(A=>{A?console.info(`[ccm-feedback] ${n("toast.urlCopied")}: ${u}`):console.warn(`[ccm-feedback] ${n("toast.urlCopyFailed")} \u2014 ${u}`)})}),o.on("clear:click",()=>{s.list().length!==0&&window.confirm(n("fab.clearConfirm"))&&(s.clear(),f.refresh(),g.updateCount(0),b.refreshIfOpen(),t("Cleared all annotations"))});let rt=()=>{g.updateCount(T(s.list())),b.refreshIfOpen()};if(o.on("feedback:saved",rt),o.on("feedback:updated",rt),o.on("feedback:deleted",rt),f.refresh(),g.updateCount(T(s.list())),i){let u=i;u.init().then(async()=>{f.refresh(),g.updateCount(T(s.list())),await Qe(u,e.projectName,t)>0&&(f.refresh(),g.updateCount(T(s.list())))})}return I={destroy:()=>{t("Destroying widget"),F.destroy(),D.destroy(),ae.destroy(),f.destroy(),g.destroy(),p.destroy(),b.destroy(),o.removeAll(),l.remove(),I=null},count:()=>s.list().length,export:()=>{let u=s.list();u.length!==0&&gt(e.projectName,u)}},I}async function Qe(e,t,r){let n=new Set([t,se()]),o=0;for(let a of n){let s=`ccm-feedback:${a}`,i=null;try{i=localStorage.getItem(s)}catch{continue}if(!i)continue;let l=[];try{let p=JSON.parse(i);if(!Array.isArray(p)||p.length===0)continue;l=p.map(f=>({...f,projectName:t}))}catch{continue}r("Migrating",l.length,"local records from",s);let c=await e.migrateFromLocal(l);o+=c;try{localStorage.setItem(`${s}:migrated`,new Date().toISOString()),localStorage.removeItem(s)}catch{}}return o}function kt(e){try{let t=new URL(e);for(let r of[...t.searchParams.keys()])/token|key|secret|auth|session|password|code/i.test(r)&&t.searchParams.delete(r);return t.toString()}catch{return e}}function Ze(e){return!!(!e||e==="localhost"||e==="127.0.0.1"||e==="0.0.0.0"||e==="::1"||e.endsWith(".local")||e.endsWith(".localhost"))}function se(){let{hostname:e,port:t}=window.location,n=(e||"site").replace(/[^a-z0-9]+/gi,"-").replace(/^-+|-+$/g,"").toLowerCase()||"site";return t?`${n}-${t}`:n}if(typeof window<"u"){window.CcmFeedback={init:Et};let e=document.currentScript;if(e){let t=e.dataset.project||se(),r=Ze(window.location.hostname),n={projectName:t,...e.dataset.accent?{accentColor:e.dataset.accent}:{},...e.dataset.theme?{theme:e.dataset.theme}:{},...e.dataset.debug==="true"?{debug:!0}:{},...!r&&e.dataset.supabaseUrl?{supabaseUrl:e.dataset.supabaseUrl}:{},...!r&&e.dataset.supabaseKey?{supabaseKey:e.dataset.supabaseKey}:{}},o=()=>Et(n);document.readyState==="loading"?document.addEventListener("DOMContentLoaded",o,{once:!0}):o()}}return me(tr);})();
//# sourceMappingURL=w.js.map

/*! CCM Feedback MVP — https://github.com/ccmdesign/ccm-feedback-tool */
"use strict";var CcmFeedback=(()=>{var ve=Object.defineProperty;var kt=Object.getOwnPropertyDescriptor;var Et=Object.getOwnPropertyNames;var Ct=Object.prototype.hasOwnProperty;var St=(r,e)=>{for(var t in e)ve(r,t,{get:e[t],enumerable:!0})},At=(r,e,t,o)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of Et(e))!Ct.call(r,n)&&n!==t&&ve(r,n,{get:()=>e[n],enumerable:!(o=kt(e,n))||o.enumerable});return r};var Tt=r=>At(ve({},"__esModule",{value:!0}),r);var mr={};St(mr,{initCcmFeedback:()=>_e});var Ne="ccm-feedback:author",Mt="Anonymous";function Lt(){try{let r=localStorage.getItem(Ne);return r?.trim()?r.trim():null}catch{return null}}function Pt(r){try{localStorage.setItem(Ne,r.trim())}catch{}}function U(){let r=Lt();if(r)return r;let e=null;try{e=window.prompt("Your name (shown next to your comments):","")}catch{e=null}let t=e?.trim()||Mt;return Pt(t),t}function N(r){let o=document.createRange().createContextualFragment(r).firstElementChild;if(!o||o.nodeName.toLowerCase()!=="svg")throw new Error("[ccm-feedback] Invalid SVG string");for(let n of[...o.attributes])n.name.startsWith("on")&&o.removeAttribute(n.name);for(let n of o.querySelectorAll("*"))for(let s of[...n.attributes])s.name.startsWith("on")&&n.removeAttribute(s.name);return o}function p(r,e){let t=document.createElement(r);if(e)for(let[o,n]of Object.entries(e))o==="class"?t.className=n:o==="style"?t.style.cssText=n:t.setAttribute(o,n);return t}function g(r,e){r.textContent=e}var ye='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="12" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="10" r="1" fill="currentColor" stroke="none"/></svg>';var De='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',Be='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',J='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';var He='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';var Fe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>',je='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14"/><path d="M9 10V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V10l3 4v3H6v-3l3-4z"/></svg>',ze='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="1"/><path d="M21 21h-4v-4"/><path d="M21 13v8h-8"/></svg>';var Xe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';function W(r){let{bus:e,t,colors:o,markers:n}=r,s=document.createElement("button");s.type="button",s.style.cssText=`
    height:34px;width:34px;padding:0;border-radius:9999px;
    border:1px solid ${o.border};background:${o.glassBg};
    color:${o.textTertiary};font-family:inherit;
    display:inline-flex;align-items:center;justify-content:center;
    cursor:pointer;
  `;let i=l=>{s.replaceChildren(N(l?De:Be)),s.setAttribute("aria-label",t(l?"toolbar.toggleOn":"toolbar.toggleOff")),s.title=t(l?"toolbar.toggleOn":"toolbar.toggleOff"),s.style.color=l?o.textTertiary:o.accent,s.style.borderColor=l?o.border:o.accent};i(n.isVisible),s.addEventListener("click",l=>{l.preventDefault(),l.stopPropagation(),e.emit("annotations:toggle",!n.isVisible)});let a=e.on("annotations:toggle",l=>i(l));return{button:s,destroy:()=>a()}}var Ue=25;function Ye(r){let e={};for(let o of Array.from(r.attributes))e[o.name]=o.value;let t=r.getBoundingClientRect();return{tag:r.tagName.toLowerCase(),attributes:e,rect:{x:t.left,y:t.top,w:t.width,h:t.height}}}var ee=class{constructor(e,t,o,n,s,i){this.colors=e;this.bus=t;this.t=o;this.onCapture=n;this.shouldIgnoreElement=s;this.markers=i;this.overlay=null;this.toolbar=null;this.eyeHandle=null;this.isActive=!1;this.savedOverflow="";this.onKey=e=>{e.key==="Escape"&&(e.preventDefault(),this.deactivate())};this.onClick=e=>{if(e.preventDefault(),e.stopPropagation(),!this.overlay)return;let t=e.clientX,o=e.clientY;this.overlay.style.pointerEvents="none";let n=document.elementsFromPoint(t,o);this.overlay&&(this.overlay.style.pointerEvents="auto");let s=n.filter(l=>!this.shouldIgnoreElement(l)).filter(l=>l!==document.documentElement&&l!==document.body).slice(0,Ue).map(Ye),i=t+window.scrollX,a=o+window.scrollY;this.deactivate(),this.onCapture({x:i,y:a,elements:s})};this.unsubStart=this.bus.on("pin:start",()=>this.activate())}activate(){if(this.isActive)return;this.isActive=!0,this.savedOverflow=document.body.style.overflow,this.overlay=p("div",{style:`position:fixed;inset:0;z-index:${2147483646};background:rgba(15,23,42,0.04);cursor:crosshair;`}),this.overlay.setAttribute("data-ccm-coord-pin-overlay","true"),this.toolbar=p("div",{style:`
        position:fixed;top:0;left:0;right:0;z-index:${2147483647};
        height:52px;background:${this.colors.glassBg};
        backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
        border-bottom:1px solid ${this.colors.glassBorder};
        display:flex;align-items:center;justify-content:center;gap:16px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:14px;color:${this.colors.text};
      `});let e=p("span",{style:"font-weight:500;letter-spacing:-0.01em;"});g(e,this.t("coordPin.instruction"));let t=document.createElement("button");t.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;
    `,g(t,this.t("pin.cancel")),t.addEventListener("click",()=>this.deactivate()),this.eyeHandle=W({bus:this.bus,t:this.t,colors:this.colors,markers:this.markers}),this.toolbar.appendChild(e),this.toolbar.appendChild(this.eyeHandle.button),this.toolbar.appendChild(t),this.overlay.addEventListener("click",this.onClick,!0),document.addEventListener("keydown",this.onKey),document.body.style.overflow="hidden",document.body.appendChild(this.overlay),document.body.appendChild(this.toolbar)}deactivate(){this.isActive&&(this.isActive=!1,this.overlay?.removeEventListener("click",this.onClick,!0),document.removeEventListener("keydown",this.onKey),document.body.style.overflow=this.savedOverflow,this.eyeHandle?.destroy(),this.eyeHandle=null,this.overlay?.remove(),this.toolbar?.remove(),this.overlay=null,this.toolbar=null,this.bus.emit("pin:end"))}destroy(){this.deactivate(),this.unsubStart()}},te=class{constructor(e,t,o,n,s,i){this.colors=e;this.bus=t;this.t=o;this.onCapture=n;this.shouldIgnoreElement=s;this.markers=i;this.overlay=null;this.toolbar=null;this.eyeHandle=null;this.rectEl=null;this.isActive=!1;this.savedOverflow="";this.dragStart=null;this.onKey=e=>{e.key==="Escape"&&(e.preventDefault(),this.deactivate())};this.onMouseDown=e=>{e.preventDefault(),e.stopPropagation(),this.dragStart={x:e.clientX,y:e.clientY},this.rectEl||(this.rectEl=p("div",{style:`
          position:fixed;z-index:${2147483647};
          border:2px dashed ${this.colors.accent};
          background:${this.colors.accent}1a;
          pointer-events:none;
        `}),document.body.appendChild(this.rectEl)),this.updateRect(e.clientX,e.clientY)};this.onMouseMove=e=>{this.dragStart&&this.updateRect(e.clientX,e.clientY)};this.onMouseUp=e=>{if(!this.dragStart)return;e.preventDefault(),e.stopPropagation();let t=this.dragStart,o=Math.min(t.x,e.clientX),n=Math.min(t.y,e.clientY),s=Math.abs(e.clientX-t.x),i=Math.abs(e.clientY-t.y);if(this.dragStart=null,s<4||i<4){this.rectEl?.remove(),this.rectEl=null;return}let a=this.collectElements(o,n,s,i),l=o+window.scrollX,c=n+window.scrollY;this.deactivate(),this.onCapture({x:l,y:c,w:s,h:i,elements:a})};this.unsubStart=this.bus.on("area:start",()=>this.activate())}activate(){if(this.isActive)return;this.isActive=!0,this.savedOverflow=document.body.style.overflow,this.overlay=p("div",{style:`position:fixed;inset:0;z-index:${2147483646};background:rgba(15,23,42,0.04);cursor:crosshair;`}),this.overlay.setAttribute("data-ccm-area-overlay","true"),this.toolbar=p("div",{style:`
        position:fixed;top:0;left:0;right:0;z-index:${2147483647};
        height:52px;background:${this.colors.glassBg};
        backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
        border-bottom:1px solid ${this.colors.glassBorder};
        display:flex;align-items:center;justify-content:center;gap:16px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:14px;color:${this.colors.text};
      `});let e=p("span",{style:"font-weight:500;letter-spacing:-0.01em;"});g(e,this.t("area.instruction"));let t=document.createElement("button");t.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;
    `,g(t,this.t("pin.cancel")),t.addEventListener("click",()=>this.deactivate()),this.eyeHandle=W({bus:this.bus,t:this.t,colors:this.colors,markers:this.markers}),this.toolbar.appendChild(e),this.toolbar.appendChild(this.eyeHandle.button),this.toolbar.appendChild(t),this.overlay.addEventListener("mousedown",this.onMouseDown,!0),this.overlay.addEventListener("mousemove",this.onMouseMove,!0),this.overlay.addEventListener("mouseup",this.onMouseUp,!0),document.addEventListener("keydown",this.onKey),document.body.style.overflow="hidden",document.body.appendChild(this.overlay),document.body.appendChild(this.toolbar)}deactivate(){this.isActive&&(this.isActive=!1,this.overlay?.removeEventListener("mousedown",this.onMouseDown,!0),this.overlay?.removeEventListener("mousemove",this.onMouseMove,!0),this.overlay?.removeEventListener("mouseup",this.onMouseUp,!0),document.removeEventListener("keydown",this.onKey),document.body.style.overflow=this.savedOverflow,this.eyeHandle?.destroy(),this.eyeHandle=null,this.overlay?.remove(),this.toolbar?.remove(),this.rectEl?.remove(),this.overlay=null,this.toolbar=null,this.rectEl=null,this.dragStart=null,this.bus.emit("area:end"))}updateRect(e,t){if(!this.rectEl||!this.dragStart)return;let o=Math.min(this.dragStart.x,e),n=Math.min(this.dragStart.y,t),s=Math.abs(e-this.dragStart.x),i=Math.abs(t-this.dragStart.y);this.rectEl.style.left=`${o}px`,this.rectEl.style.top=`${n}px`,this.rectEl.style.width=`${s}px`,this.rectEl.style.height=`${i}px`}collectElements(e,t,o,n){let s=e+o,i=t+n,a=document.body.getElementsByTagName("*"),l=[];for(let c of Array.from(a)){if(l.length>=Ue)break;if(this.shouldIgnoreElement(c)||c===document.documentElement||c===document.body)continue;let d=c.getBoundingClientRect();d.width===0||d.height===0||d.right<e||d.left>s||d.bottom<t||d.top>i||l.push(Ye(c))}return l}destroy(){this.deactivate(),this.unsubStart()}};var re=class{constructor(e){this.opts=e;this.ws=null;this.destroyed=!1;this.heartbeat=null;this.reconnectAttempt=0;this.refCounter=1;this.topic=`realtime:${e.schema??"public"}:${e.table}`,this.log=e.log??(()=>{})}connect(){if(this.destroyed)return;let e=`${this.opts.url.replace(/^http/,"ws").replace(/\/$/,"")}/realtime/v1/websocket?apikey=${encodeURIComponent(this.opts.apiKey)}&vsn=1.0.0`,t;try{t=new WebSocket(e)}catch(o){this.log("realtime ws constructor error",o),this.scheduleReconnect();return}this.ws=t,t.addEventListener("open",()=>{this.reconnectAttempt=0,this.send({topic:this.topic,event:"phx_join",payload:{config:{postgres_changes:[{event:"*",schema:this.opts.schema??"public",table:this.opts.table,filter:this.opts.filter}]},access_token:this.opts.apiKey},ref:String(this.refCounter++)}),this.heartbeat=setInterval(()=>{this.send({topic:"phoenix",event:"heartbeat",payload:{},ref:String(this.refCounter++)})},25e3),this.log("realtime connected")}),t.addEventListener("message",o=>this.handleMessage(o.data)),t.addEventListener("close",()=>{this.cleanupSocket(),this.destroyed||this.scheduleReconnect()}),t.addEventListener("error",o=>{this.log("realtime ws error",o)})}cleanupSocket(){this.heartbeat&&(clearInterval(this.heartbeat),this.heartbeat=null),this.ws=null}scheduleReconnect(){let e=Math.min(1e3*2**this.reconnectAttempt,3e4);this.reconnectAttempt+=1,setTimeout(()=>{this.destroyed||this.connect()},e)}send(e){if(!(!this.ws||this.ws.readyState!==WebSocket.OPEN))try{this.ws.send(JSON.stringify(e))}catch(t){this.log("realtime send error",t)}}handleMessage(e){if(typeof e!="string")return;let t;try{t=JSON.parse(e)}catch{return}if(t.event!=="postgres_changes")return;let n=t.payload?.data;if(!n)return;let s=n.type,i=n.record??n.old_record;i&&(s==="INSERT"?this.opts.onInsert(i):s==="UPDATE"?this.opts.onUpdate(i):s==="DELETE"&&this.opts.onDelete(i))}destroy(){if(this.destroyed=!0,this.cleanupSocket(),this.ws)try{this.ws.close()}catch{}}};function xe(r){return`ccm-feedback:${r}`}function $(r){return!r||r==="/"?"/":r.endsWith("/")?r.slice(0,-1):r}function Ke(){try{return crypto.randomUUID()}catch{return`${Date.now()}-${Math.random().toString(36).slice(2)}`}}function D(r){try{let e=localStorage.getItem(xe(r));if(!e)return[];let t=JSON.parse(e);return Array.isArray(t)?t:[]}catch{return[]}}function G(r,e){try{localStorage.setItem(xe(r),JSON.stringify(e))}catch{}}function we(r){let e={id:Ke(),projectName:r.projectName,message:r.message,authorName:r.authorName,url:r.url,path:$(r.path),viewport:r.viewport,userAgent:r.userAgent,createdAt:new Date().toISOString(),cssSelector:r.anchor.cssSelector,xpath:r.anchor.xpath,textSnippet:r.anchor.textSnippet,elementTag:r.anchor.elementTag,elementId:r.anchor.elementId,textPrefix:r.anchor.textPrefix,textSuffix:r.anchor.textSuffix,fingerprint:r.anchor.fingerprint,neighborText:r.anchor.neighborText,xPct:r.rect.xPct,yPct:r.rect.yPct,wPct:r.rect.wPct,hPct:r.rect.hPct,status:r.status??"todo",kind:r.kind??"target"};return r.pin&&(e.pinX=r.pin.x,e.pinY=r.pin.y),r.area&&(e.areaX=r.area.x,e.areaY=r.area.y,e.areaW=r.area.w,e.areaH=r.area.h),r.capturedElements&&r.capturedElements.length>0&&(e.capturedElements=r.capturedElements),e}function ke(r){return{id:Ke(),projectName:r.projectName,message:r.message,authorName:r.authorName,url:r.url,path:$(r.path),viewport:r.viewport,userAgent:r.userAgent,createdAt:new Date().toISOString(),cssSelector:"",xpath:"",textSnippet:"",elementTag:"",elementId:void 0,textPrefix:"",textSuffix:"",fingerprint:"",neighborText:"",xPct:0,yPct:0,wPct:0,hPct:0,parentId:r.parentId}}var oe=class{constructor(e){this.projectName=e}list(){return D(this.projectName).filter(e=>!e.parentId)}listForPath(e){let t=$(e);return D(this.projectName).filter(o=>!o.parentId&&$(o.path)===t)}save(e){let t=D(this.projectName),o=we(e);return t.unshift(o),G(this.projectName,t),o}delete(e){let t=D(this.projectName);if(t.findIndex(s=>s.id===e)===-1)return!1;let n=t.filter(s=>s.id!==e&&s.parentId!==e);return G(this.projectName,n),!0}clear(){localStorage.removeItem(xe(this.projectName))}updateStatus(e,t){let o=D(this.projectName),n=o.find(s=>s.id===e);return n?(n.status=t,G(this.projectName,o),!0):!1}updateAnchor(e,t){let o=D(this.projectName),n=o.find(s=>s.id===e);return n?(n.cssSelector=t.anchor.cssSelector,n.xpath=t.anchor.xpath,n.textSnippet=t.anchor.textSnippet,n.elementTag=t.anchor.elementTag,n.elementId=t.anchor.elementId,n.textPrefix=t.anchor.textPrefix,n.textSuffix=t.anchor.textSuffix,n.fingerprint=t.anchor.fingerprint,n.neighborText=t.anchor.neighborText,n.xPct=t.rect.xPct,n.yPct=t.rect.yPct,n.wPct=t.rect.wPct,n.hPct=t.rect.hPct,n.kind=t.kind,t.pin?(n.pinX=t.pin.x,n.pinY=t.pin.y):(delete n.pinX,delete n.pinY),t.area?(n.areaX=t.area.x,n.areaY=t.area.y,n.areaW=t.area.w,n.areaH=t.area.h):(delete n.areaX,delete n.areaY,delete n.areaW,delete n.areaH),G(this.projectName,o),!0):!1}listReplies(e){return D(this.projectName).filter(t=>t.parentId===e).sort((t,o)=>t.createdAt.localeCompare(o.createdAt))}addReply(e){let t=D(this.projectName),o=ke(e);return t.push(o),G(this.projectName,t),o}};var We="ccm_widget_annotations";function Ee(r){if(!r)return null;let e=r.lastIndexOf("/");if(e===-1)return null;let t=r.slice(e+1).trim();if(t===""||t==="*")return null;let o=Number(t);return Number.isFinite(o)?o:null}function ne(r){let e={id:r.id,projectName:r.project_name,message:r.message,authorName:r.author_name,url:r.url,path:r.path,viewport:r.viewport,userAgent:r.user_agent,cssSelector:r.css_selector,xpath:r.xpath,textSnippet:r.text_snippet,elementTag:r.element_tag,elementId:r.element_id??void 0,textPrefix:r.text_prefix,textSuffix:r.text_suffix,fingerprint:r.fingerprint,neighborText:r.neighbor_text,xPct:r.x_pct,yPct:r.y_pct,wPct:r.w_pct,hPct:r.h_pct,createdAt:r.created_at,status:r.status??"todo",kind:r.kind??"target"};return r.pin_x!=null&&r.pin_y!=null&&(e.pinX=r.pin_x,e.pinY=r.pin_y),r.area_x!=null&&r.area_y!=null&&r.area_w!=null&&r.area_h!=null&&(e.areaX=r.area_x,e.areaY=r.area_y,e.areaW=r.area_w,e.areaH=r.area_h),r.captured_elements&&Array.isArray(r.captured_elements)&&(e.capturedElements=r.captured_elements),r.parent_id&&(e.parentId=r.parent_id),e}function Ge(r){let e={id:r.id,project_name:r.projectName,message:r.message,author_name:r.authorName,url:r.url,path:r.path,viewport:r.viewport,user_agent:r.userAgent,css_selector:r.cssSelector,xpath:r.xpath,text_snippet:r.textSnippet,element_tag:r.elementTag,element_id:r.elementId??null,text_prefix:r.textPrefix,text_suffix:r.textSuffix,fingerprint:r.fingerprint,neighbor_text:r.neighborText,x_pct:r.xPct,y_pct:r.yPct,w_pct:r.wPct,h_pct:r.hPct,created_at:r.createdAt};return r.status&&(e.status=r.status),r.kind&&(e.kind=r.kind),r.pinX!=null&&(e.pin_x=r.pinX),r.pinY!=null&&(e.pin_y=r.pinY),r.areaX!=null&&(e.area_x=r.areaX),r.areaY!=null&&(e.area_y=r.areaY),r.areaW!=null&&(e.area_w=r.areaW),r.areaH!=null&&(e.area_h=r.areaH),r.capturedElements&&(e.captured_elements=r.capturedElements),r.parentId&&(e.parent_id=r.parentId),e}var ie=class{constructor(e){this.cache=[];this.realtime=null;this.projectName=e.projectName,this.url=e.url,this.apiKey=e.apiKey,this.onChange=e.onChange??(()=>{}),this.onReply=e.onReply??(()=>{}),this.onReplyDeleted=e.onReplyDeleted??(()=>{}),this.onUpdated=e.onUpdated??(()=>{}),this.log=e.log??(()=>{}),this.endpoint=`${e.url.replace(/\/$/,"")}/rest/v1/${We}`,this.headers={apikey:e.apiKey,Authorization:`Bearer ${e.apiKey}`,"Content-Type":"application/json",Prefer:"return=representation"}}async init(){try{let e=`${this.endpoint}?project_name=eq.${encodeURIComponent(this.projectName)}&order=created_at.desc`,t=await fetch(e,{headers:this.headers});if(!t.ok){let n=await t.text();console.warn(`[ccm-feedback] cloud fetch failed: ${t.status} ${n}`);return}let o=await t.json();this.cache=o.map(ne),this.log("cloud loaded",this.cache.length,"annotations"),this.startRealtime()}catch(e){console.warn("[ccm-feedback] cloud fetch error",e)}}startRealtime(){this.realtime||(this.realtime=new re({url:this.url,apiKey:this.apiKey,table:We,filter:`project_name=eq.${this.projectName}`,log:this.log,onInsert:e=>{let t=e;if(this.cache.some(n=>n.id===t.id))return;let o=ne(t);if(o.parentId){this.cache.push(o),this.onReply(o);return}this.cache.unshift(o),this.onChange()},onUpdate:e=>{let o=ne(e),n=this.cache.findIndex(s=>s.id===o.id);n===-1?this.cache.unshift(o):this.cache[n]=o,!o.parentId&&(this.onUpdated(o),this.onChange())},onDelete:e=>{let t=e.id;if(!t)return;let o=this.cache.findIndex(s=>s.id===t);if(o===-1)return;let n=this.cache[o];if(this.cache.splice(o,1),n?.parentId){this.onReplyDeleted(t);return}this.onChange()}}),this.realtime.connect())}destroy(){this.realtime?.destroy(),this.realtime=null}list(){return this.cache.filter(e=>!e.parentId)}listForPath(e){let t=$(e);return this.cache.filter(o=>!o.parentId&&$(o.path)===t)}save(e){let t=we(e);return this.cache.unshift(t),this.pushInsert(t),t}updateStatus(e,t){let o=this.cache.find(n=>n.id===e);return o?(o.status=t,this.pushUpdate(e,{status:t}),!0):!1}updateAnchor(e,t){let o=this.cache.find(s=>s.id===e);if(!o)return!1;o.cssSelector=t.anchor.cssSelector,o.xpath=t.anchor.xpath,o.textSnippet=t.anchor.textSnippet,o.elementTag=t.anchor.elementTag,o.elementId=t.anchor.elementId,o.textPrefix=t.anchor.textPrefix,o.textSuffix=t.anchor.textSuffix,o.fingerprint=t.anchor.fingerprint,o.neighborText=t.anchor.neighborText,o.xPct=t.rect.xPct,o.yPct=t.rect.yPct,o.wPct=t.rect.wPct,o.hPct=t.rect.hPct,o.kind=t.kind,t.pin?(o.pinX=t.pin.x,o.pinY=t.pin.y):(delete o.pinX,delete o.pinY),t.area?(o.areaX=t.area.x,o.areaY=t.area.y,o.areaW=t.area.w,o.areaH=t.area.h):(delete o.areaX,delete o.areaY,delete o.areaW,delete o.areaH);let n={css_selector:t.anchor.cssSelector,xpath:t.anchor.xpath,text_snippet:t.anchor.textSnippet,element_tag:t.anchor.elementTag,element_id:t.anchor.elementId??null,text_prefix:t.anchor.textPrefix,text_suffix:t.anchor.textSuffix,fingerprint:t.anchor.fingerprint,neighbor_text:t.anchor.neighborText,x_pct:t.rect.xPct,y_pct:t.rect.yPct,w_pct:t.rect.wPct,h_pct:t.rect.hPct,kind:t.kind,pin_x:t.pin?t.pin.x:null,pin_y:t.pin?t.pin.y:null,area_x:t.area?t.area.x:null,area_y:t.area?t.area.y:null,area_w:t.area?t.area.w:null,area_h:t.area?t.area.h:null};return this.pushUpdate(e,n),!0}delete(e){return this.cache.findIndex(o=>o.id===e)===-1?!1:(this.cache=this.cache.filter(o=>o.id!==e&&o.parentId!==e),this.pushDelete(e),!0)}clear(){let e=this.cache.map(t=>t.id);this.cache=[],this.pushClear(e)}listReplies(e){return this.cache.filter(t=>t.parentId===e).sort((t,o)=>t.createdAt.localeCompare(o.createdAt))}addReply(e){let t=ke(e);return this.cache.push(t),this.pushInsert(t),t}async migrateFromLocal(e){if(e.length===0)return 0;let t=new Set(this.cache.map(n=>n.id)),o=e.filter(n=>!t.has(n.id));if(o.length===0)return 0;try{let n=await fetch(this.endpoint,{method:"POST",headers:{...this.headers,Prefer:"return=representation,resolution=ignore-duplicates"},body:JSON.stringify(o.map(Ge))});if(!n.ok){let i=await n.text();return console.warn(`[ccm-feedback] cloud migrate failed: ${n.status} ${i}`),0}let s=await n.json();for(let i of s){let a=ne(i);this.cache.some(l=>l.id===a.id)||this.cache.unshift(a)}return this.log("cloud migrated",s.length,"of",o.length,"local annotations"),this.onChange(),s.length}catch(n){return console.warn("[ccm-feedback] cloud migrate error",n),0}}async pushInsert(e){try{let t=await fetch(this.endpoint,{method:"POST",headers:this.headers,body:JSON.stringify(Ge(e))});if(!t.ok){let o=await t.text();console.warn(`[ccm-feedback] cloud insert failed: ${t.status} ${o}`)}}catch(t){console.warn("[ccm-feedback] cloud insert error",t)}}async pushUpdate(e,t){try{let o=await fetch(`${this.endpoint}?id=eq.${encodeURIComponent(e)}`,{method:"PATCH",headers:{...this.headers,Prefer:"return=representation, count=exact"},body:JSON.stringify(t)});if(!o.ok){let s=await o.text();console.warn(`[ccm-feedback] cloud update failed: ${o.status} ${s}`);return}Ee(o.headers.get("content-range"))===0&&console.error(`[ccm-feedback] cloud update no-op for id=${e} \u2014 possible RLS misconfiguration or stale id`)}catch(o){console.warn("[ccm-feedback] cloud update error",o)}}async pushDelete(e){try{let t=await fetch(`${this.endpoint}?id=eq.${encodeURIComponent(e)}`,{method:"DELETE",headers:{...this.headers,Prefer:"return=representation, count=exact"}});if(!t.ok){let n=await t.text();console.warn(`[ccm-feedback] cloud delete failed: ${t.status} ${n}`);return}Ee(t.headers.get("content-range"))===0&&console.error(`[ccm-feedback] cloud delete no-op for id=${e} \u2014 possible RLS misconfiguration or stale id`)}catch(t){console.warn("[ccm-feedback] cloud delete error",t)}}async pushClear(e){if(e.length!==0)try{let t=e.map(s=>`"${s}"`).join(","),o=await fetch(`${this.endpoint}?id=in.(${t})`,{method:"DELETE",headers:{...this.headers,Prefer:"return=representation, count=exact"}});if(!o.ok){let s=await o.text();console.warn(`[ccm-feedback] cloud clear failed: ${o.status} ${s}`);return}let n=Ee(o.headers.get("content-range"));n!==null&&n<e.length&&console.warn(`[ccm-feedback] cloud clear partial: expected ${e.length} deleted ${n}`)}catch(t){console.warn("[ccm-feedback] cloud clear error",t)}}};var Rt=new Set(["role","name","aria-label","rel","href"]);function $t(r,e){let t=Rt.has(r);t||(t=r.startsWith("data-")&&q(r));let o=q(e)&&e.length<100;return o||(o=e.startsWith("#")&&q(e.slice(1))),t&&o}function It(r){return q(r)}function Ot(r){return q(r)}function _t(r){return!0}function Ve(r,e){if(r.nodeType!==Node.ELEMENT_NODE)throw new Error("Can't generate CSS selector for non-element node type.");if(r.tagName.toLowerCase()==="html")return"html";let t={root:document.body,idName:It,className:Ot,tagName:_t,attr:$t,timeoutMs:1e3,seedMinLength:3,optimizedMinLength:2,maxNumberOfPathChecks:1/0},o=new Date,n={...t,...e},s=Ft(n.root,t),i,a=0;for(let c of Nt(r,n,s)){if(new Date().getTime()-o.getTime()>n.timeoutMs||a>=n.maxNumberOfPathChecks){let b=Bt(r,s);if(!b)throw new Error(`Timeout: Can't find a unique selector after ${n.timeoutMs}ms`);return V(b)}if(a++,Ae(c,s)){i=c;break}}if(!i)throw new Error("Selector was not found.");let l=[...Je(i,r,n,s,o)];return l.sort(Ce),l.length>0?V(l[0]):V(i)}function*Nt(r,e,t){let o=[],n=[],s=r,i=0;for(;s&&s!==t;){let a=Dt(s,e);for(let l of a)l.level=i;if(o.push(a),s=s.parentElement,i++,n.push(...Qe(o)),i>=e.seedMinLength){n.sort(Ce);for(let l of n)yield l;n=[]}}n.sort(Ce);for(let a of n)yield a}function q(r){if(/^[a-z\-]{3,}$/i.test(r)){let e=r.split(/-|[A-Z]/);for(let t of e)if(t.length<=2||/[^aeiou]{4,}/i.test(t))return!1;return!0}return!1}function Dt(r,e){let t=[],o=r.getAttribute("id");o&&e.idName(o)&&t.push({name:"#"+CSS.escape(o),penalty:0});for(let i=0;i<r.classList.length;i++){let a=r.classList[i];e.className(a)&&t.push({name:"."+CSS.escape(a),penalty:1})}for(let i=0;i<r.attributes.length;i++){let a=r.attributes[i];e.attr(a.name,a.value)&&t.push({name:`[${CSS.escape(a.name)}="${CSS.escape(a.value)}"]`,penalty:2})}let n=r.tagName.toLowerCase();if(e.tagName(n)){t.push({name:n,penalty:5});let i=Se(r,n);i!==void 0&&t.push({name:Ze(n,i),penalty:10})}let s=Se(r);return s!==void 0&&t.push({name:Ht(n,s),penalty:50}),t}function V(r){let e=r[0],t=e.name;for(let o=1;o<r.length;o++){let n=r[o].level||0;e.level===n-1?t=`${r[o].name} > ${t}`:t=`${r[o].name} ${t}`,e=r[o]}return t}function qe(r){return r.map(e=>e.penalty).reduce((e,t)=>e+t,0)}function Ce(r,e){return qe(r)-qe(e)}function Se(r,e){let t=r.parentNode;if(!t)return;let o=t.firstChild;if(!o)return;let n=0;for(;o&&(o.nodeType===Node.ELEMENT_NODE&&(e===void 0||o.tagName.toLowerCase()===e)&&n++,o!==r);)o=o.nextSibling;return n}function Bt(r,e){let t=0,o=r,n=[];for(;o&&o!==e;){let s=o.tagName.toLowerCase(),i=Se(o,s);if(i===void 0)return;n.push({name:Ze(s,i),penalty:NaN,level:t}),o=o.parentElement,t++}if(Ae(n,e))return n}function Ht(r,e){return r==="html"?"html":`${r}:nth-child(${e})`}function Ze(r,e){return r==="html"?"html":`${r}:nth-of-type(${e})`}function*Qe(r,e=[]){if(r.length>0)for(let t of r[0])yield*Qe(r.slice(1,r.length),e.concat(t));else yield e}function Ft(r,e){return r.nodeType===Node.DOCUMENT_NODE?r:r===e.root?r.ownerDocument:r}function Ae(r,e){let t=V(r);switch(e.querySelectorAll(t).length){case 0:throw new Error(`Can't select any node with this selector: ${t}`);case 1:return!0;default:return!1}}function*Je(r,e,t,o,n){if(r.length>2&&r.length>t.optimizedMinLength)for(let s=1;s<r.length-1;s++){if(new Date().getTime()-n.getTime()>t.timeoutMs)return;let a=[...r];a.splice(s,1),Ae(a,o)&&o.querySelector(V(a))===e&&(yield a,yield*Je(a,e,t,o,n))}}var jt=["role","aria-label","type","name","href","src","data-testid","data-id"];function zt(r){let e=5381;for(let t=0;t<r.length;t++)e=(e<<5)+e+r.charCodeAt(t)|0;return(e>>>0).toString(36)}function Te(r){let e=r.children.length,t=0,o=r.parentElement;if(o)for(let i of o.children){if(i===r)break;i.tagName===r.tagName&&t++}let n=[];for(let i of jt){let a=r.getAttribute(i);a&&n.push(`${i}=${a}`)}let s=n.length>0?zt(n.join(",")):"0";return`${e}:${t}:${s}`}function et(r,e){let t=e.split(":");if(t.length!==3)return 0;let[o,n,s]=t,i=Number(o),a=Number(n);if(Number.isNaN(i)||Number.isNaN(a))return 0;let l=Te(r),[c,d,b]=l.split(":"),f=0,v=Math.abs(Number(c)-i);v===0?f+=.2:v<=2?f+=.1:v<=5&&(f+=.03);let m=Math.abs(Number(d)-a);return m===0?f+=.4:m===1?f+=.2:m<=3&&(f+=.08),b===s&&(f+=.4),f}function Y(r,e){let t=e==="before"?"previousElementSibling":"nextElementSibling",o=r[t],n=3;for(;o&&n>0;){let s=o.textContent?.trim();if(s)return e==="before"?s.slice(-32):s.slice(0,32);o=o[t],n--}return""}function se(r){let e=r.previousElementSibling?.textContent?.trim().slice(0,40)??"",t=r.nextElementSibling?.textContent?.trim().slice(0,40)??"";return[e,t].filter(Boolean).join(" | ")}function tt(r){if(r.id){let o=r.id.includes("'")?`concat('${r.id.replace(/'/g,`',"'",'`)}')`:`'${r.id}'`;return`//${r.localName}[@id=${o}]`}let e=[],t=r;for(;t&&t!==document.body&&e.length<6;){let o=t.localName,n=t.parentElement;if(t.id){let i=t.id.includes("'")?`concat('${t.id.replace(/'/g,`',"'",'`)}')`:`'${t.id}'`;return e.unshift(`/${o}[@id=${i}]`),"/"+e.join("")}let s=1;if(n)for(let i of n.children){if(i===t)break;i.localName===o&&s++}e.unshift(`/${o}[${s}]`),t=n}return"/html/body"+e.join("")}function ae(r){let e=Ve(r,{className:c=>!/^(css|sc|emotion|styled)-/.test(c)&&!/^[a-z]{1,3}[A-Za-z0-9]{4,8}$/.test(c),attr:c=>["data-testid","data-id","role","aria-label"].includes(c),idName:c=>!c.startsWith("radix-")&&!/^:r[0-9]+:$/.test(c),seedMinLength:3,optimizedMinLength:2}),t=tt(r),n=(r.textContent?.trim()??"").slice(0,120),s=Y(r,"before"),i=Y(r,"after"),a=Te(r),l=se(r);return{cssSelector:e,xpath:t,textSnippet:n,textPrefix:s,textSuffix:i,fingerprint:a,neighborText:l,elementTag:r.tagName,elementId:r.id||void 0}}function rt(r,e=document.documentElement){let t=r.x+r.width/2,o=r.y+r.height/2,n=document.elementFromPoint(t,o);if(!n||n===e)return document.body;let s=n,i=n;for(;i&&i!==document.body;){let a=i.getBoundingClientRect();if(a.left<=r.x&&a.top<=r.y&&a.right>=r.x+r.width&&a.bottom>=r.y+r.height){s=i;break}i=i.parentElement}return s}function ot(r,e){return e.width<=0||e.height<=0?{xPct:0,yPct:0,wPct:1,hPct:1}:{xPct:(r.x-e.x)/e.width,yPct:(r.y-e.y)/e.height,wPct:r.width/e.width,hPct:r.height/e.height}}var I=["todo","review","done","question"];var O={todo:{fg:"#a16207",bg:"#fef3c7",border:"#f59e0b"},review:{fg:"#1d4ed8",bg:"#dbeafe",border:"#3b82f6"},done:{fg:"#15803d",bg:"#dcfce7",border:"#22c55e"},question:{fg:"#6d28d9",bg:"#ede9fe",border:"#8b5cf6"}},le=class{constructor(e,t){this.colors=e;this.t=t;this.resolve=null;this.previouslyFocused=null;this.onKeydownTrap=null;this.status="todo";this.statusButtons=new Map;this.root=p("div",{style:`
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
    `,this.textarea.placeholder=this.t("popup.placeholder"),this.textarea.maxLength=5e3,this.textarea.setAttribute("aria-label",this.t("popup.textareaAria")),this.textarea.addEventListener("focus",()=>{this.textarea.style.borderColor=this.colors.accent,this.textarea.style.boxShadow=`0 0 0 3px ${this.colors.accent}14`,this.textarea.style.background=this.colors.bg}),this.textarea.addEventListener("blur",()=>{this.textarea.style.borderColor=this.colors.border,this.textarea.style.boxShadow="none",this.textarea.style.background=this.colors.glassBgHeavy}),this.textarea.addEventListener("input",()=>this.updateSubmitState()),this.textarea.addEventListener("keydown",c=>{c.key==="Enter"&&(c.ctrlKey||c.metaKey)?(c.preventDefault(),this.submit()):c.key==="Escape"&&this.cancel()});let o=p("div",{style:`font-size:11px;color:${this.colors.textTertiary};text-align:right;margin-top:6px;letter-spacing:0.01em;`}),n=/Macintosh|Mac OS X/i.test(navigator.userAgent);g(o,n?this.t("popup.submitHintMac"):this.t("popup.submitHintOther"));let s=p("div",{style:"display:flex;justify-content:flex-end;gap:8px;margin-top:12px;"}),i=document.createElement("button");i.type="button",i.style.cssText=`
      height:34px;padding:0 16px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;
      font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s ease;
    `,g(i,this.t("popup.cancel")),i.addEventListener("click",()=>this.cancel()),this.submitBtn=document.createElement("button"),this.submitBtn.type="button",this.submitBtn.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:none;background:${this.colors.accentGradient};
      color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;
      opacity:0.35;pointer-events:none;transition:all 0.2s ease;
      box-shadow:0 2px 8px ${this.colors.accentGlow};
    `,g(this.submitBtn,this.t("popup.submit")),this.submitBtn.addEventListener("click",()=>this.submit()),s.appendChild(i),s.appendChild(this.submitBtn);let a=p("div",{style:"display:flex;align-items:center;gap:6px;margin-top:10px;flex-wrap:wrap;"}),l=p("span",{style:`font-size:11px;color:${this.colors.textTertiary};margin-right:4px;`});g(l,`${this.t("status.label")}:`),a.appendChild(l);for(let c of I){let d=document.createElement("button");d.type="button",d.dataset.status=c,d.style.cssText=`
        height:24px;padding:0 10px;border-radius:9999px;
        font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;
        transition:all 0.15s ease;
      `,g(d,this.t(`status.${c}`)),d.addEventListener("click",()=>this.setStatus(c)),this.statusButtons.set(c,d),a.appendChild(d)}this.root.appendChild(this.textarea),this.root.appendChild(a),this.root.appendChild(o),this.root.appendChild(s),document.body.appendChild(this.root),this.applyStatusStyles()}setStatus(e){this.status=e,this.applyStatusStyles()}applyStatusStyles(){for(let[e,t]of this.statusButtons){let o=O[e],n=e===this.status;t.style.background=n?o.bg:"transparent",t.style.color=n?o.fg:this.colors.textTertiary,t.style.border=`1px solid ${n?o.border:this.colors.border}`}}show(e){return new Promise(t=>{this.resolve=t,this.textarea.value="",this.status="todo",this.applyStatusStyles(),this.updateSubmitState(),this.previouslyFocused=document.activeElement;let o=e.bottom+8,n=e.left;o+220>window.innerHeight&&(o=e.top-220-8),n+300>window.innerWidth&&(n=e.right-300),o=Math.max(8,o),n=Math.max(8,n),this.root.style.top=`${o}px`,this.root.style.left=`${n}px`,this.root.style.display="block",this.onKeydownTrap=s=>{if(s.key!=="Tab")return;let i=Array.from(this.root.querySelectorAll('button:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])'));if(i.length===0)return;let a=i[0],l=i[i.length-1];!a||!l||(s.shiftKey?(document.activeElement===a||!this.root.contains(document.activeElement))&&(s.preventDefault(),l.focus()):(document.activeElement===l||!this.root.contains(document.activeElement))&&(s.preventDefault(),a.focus()))},this.root.addEventListener("keydown",this.onKeydownTrap),requestAnimationFrame(()=>{this.root.style.opacity="1",this.root.style.transform="translateY(0) scale(1)",this.textarea.focus()})})}updateSubmitState(){let e=this.textarea.value.trim().length>0;this.submitBtn.disabled=!e,this.submitBtn.style.opacity=e?"1":"0.35",this.submitBtn.style.pointerEvents=e?"auto":"none"}submit(){let e=this.textarea.value.trim();e&&(this.resolve?.({message:e,status:this.status}),this.resolve=null,this.hide())}cancel(){this.resolve?.(null),this.resolve=null,this.hide()}hide(){this.onKeydownTrap&&(this.root.removeEventListener("keydown",this.onKeydownTrap),this.onKeydownTrap=null),this.root.style.opacity="0",this.root.style.transform="translateY(8px) scale(0.98)",this.previouslyFocused?.focus(),this.previouslyFocused=null,setTimeout(()=>{this.root.style.display="none"},200)}destroy(){this.root.remove()}};var Xt=0;function ce(r){let{colors:e,t,onPick:o,readOnly:n=!1}=r,s=r.current,i=`ccm-status-menu-${++Xt}`,a=p("span",{style:"position:relative;display:inline-block;"}),l=document.createElement("button");l.type="button",l.setAttribute("role",n?"presentation":"combobox"),l.setAttribute("aria-haspopup","listbox"),l.setAttribute("aria-expanded","false"),l.setAttribute("aria-controls",i),l.setAttribute("aria-label",t("marker.popover.statusAria"));let c=()=>{let h=O[s];l.style.cssText=`
      display:inline-flex;align-items:center;gap:4px;
      padding:2px 8px 2px 10px;border-radius:9999px;
      font-size:10px;font-weight:600;letter-spacing:0.02em;line-height:1.4;
      background:${h.bg};color:${h.fg};border:1px solid ${h.border};
      font-family:inherit;
      cursor:${n?"default":"pointer"};
      text-transform:uppercase;
    `,l.replaceChildren();let x=document.createElement("span");if(g(x,t(`status.${s}`)),l.appendChild(x),!n){let C=document.createElement("span");C.setAttribute("aria-hidden","true"),C.style.cssText="font-size:9px;line-height:1;opacity:0.7;",g(C,"\u25BE"),l.appendChild(C)}};c();let d=document.createElement("ul");d.id=i,d.setAttribute("role","listbox"),d.setAttribute("aria-label",t("marker.popover.statusMenuAria")),d.style.cssText=`
    position:absolute;top:calc(100% + 4px);left:0;
    margin:0;padding:4px;list-style:none;
    min-width:140px;border-radius:8px;
    background:${e.glassBg};
    backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
    border:1px solid ${e.glassBorder};
    box-shadow:0 8px 24px ${e.shadow};
    z-index:2;display:none;
    font-family:inherit;font-size:12px;
  `,d.setAttribute("aria-hidden","true");let b=new Map;for(let h of I){let x=document.createElement("li");x.setAttribute("role","option"),x.setAttribute("data-status",h),x.setAttribute("tabindex","-1"),x.style.cssText=`
      display:flex;align-items:center;gap:8px;
      padding:6px 10px;border-radius:6px;
      color:${e.text};cursor:pointer;
      transition:background 0.12s ease;
    `;let C=document.createElement("span");C.setAttribute("aria-hidden","true");let P=O[h];C.style.cssText=`
      width:10px;height:10px;border-radius:9999px;
      background:${P.border};flex-shrink:0;
    `;let T=document.createElement("span");g(T,t(`status.${h}`)),T.style.cssText="flex:1;";let u=document.createElement("span");u.setAttribute("aria-hidden","true"),u.style.cssText=`font-size:12px;color:${e.accent};font-weight:600;`,g(u,"\u2713"),x.appendChild(C),x.appendChild(T),x.appendChild(u),x.addEventListener("mouseenter",()=>{x.style.background=e.glassBgHeavy}),x.addEventListener("mouseleave",()=>{x.style.background=""}),x.addEventListener("click",k=>{k.preventDefault(),k.stopPropagation(),A(h)}),b.set(h,x),d.appendChild(x)}let f=()=>{for(let h of I){let x=b.get(h);if(!x)continue;let C=h===s;x.setAttribute("aria-selected",String(C));let P=x.lastElementChild;P&&(P.style.visibility=C?"visible":"hidden")}};f();let v=!1,m=()=>{if(n||v)return;v=!0,l.setAttribute("aria-expanded","true"),d.style.display="block",d.setAttribute("aria-hidden","false"),(b.get(s)??b.get(I[0]))?.focus()},E=()=>{v&&(v=!1,l.setAttribute("aria-expanded","false"),d.style.display="none",d.setAttribute("aria-hidden","true"))},A=h=>{if(h===s){E(),l.focus();return}E(),l.focus(),o(h)};n||(l.addEventListener("click",h=>{h.preventDefault(),h.stopPropagation(),v?E():m()}),l.addEventListener("keydown",h=>{(h.key==="Enter"||h.key===" "||h.key==="ArrowDown")&&(h.preventDefault(),m())}),d.addEventListener("keydown",h=>{if(h.key==="Escape"){h.preventDefault(),h.stopPropagation(),E(),l.focus();return}if(h.key==="ArrowDown"||h.key==="ArrowUp"){h.preventDefault();let x=I.findIndex(k=>b.get(k)===document.activeElement),C=h.key==="ArrowDown"?1:-1,P=I.length,T=((x===-1?0:x+C)+P)%P;b.get(I[T])?.focus();return}if(h.key==="Enter"||h.key===" "){h.preventDefault();let x=document.activeElement;for(let C of I)if(b.get(C)===x){A(C);return}}}));let R=h=>{v&&(h.composedPath().some(x=>x===a)||E())};return document.addEventListener("click",R,!0),a.appendChild(l),a.appendChild(d),{root:a,setCurrent:h=>{s=h,c(),f()},close:E,destroy:()=>{E(),document.removeEventListener("click",R,!0)}}}var nt=140,Ut="todo",de=class{constructor(e,t,o,n,s,i,a=()=>{}){this.bus=t;this.t=o;this.store=n;this.colors=s;this.jump=i;this.onFilterChange=a;this.isOpen=!1;this.filter=Ut;this.otherPagesExpanded=!1;this.previouslyFocused=null;this.chipButtons=new Map;this.chipCounts=new Map;this.chipLabels=new Map;this.cardDropdowns=new Set;this.root=p("div",{class:"sp-panel"}),this.root.setAttribute("role","dialog"),this.root.setAttribute("aria-label",o("drawer.aria")),this.root.setAttribute("aria-hidden","true"),this.root.inert=!0;let l=p("div",{class:"sp-panel-header"}),c=p("div",{class:"sp-panel-title"});g(c,o("drawer.title"));let d=p("button",{class:"sp-panel-close",type:"button"});d.setAttribute("aria-label",o("drawer.close")),d.appendChild(N(J)),d.addEventListener("click",()=>this.close()),l.appendChild(c),l.appendChild(d),this.filtersEl=p("div",{class:"sp-filters"});let b=p("div",{class:"sp-chips"}),f=[...I];for(let m of f){let E=p("button",{class:"sp-chip",type:"button"}),A=o(`status.${m}`),R=p("span",{class:"sp-chip-label"});g(R,A);let h=p("span",{class:"sp-chip-count"});h.setAttribute("aria-hidden","true"),E.appendChild(R),E.appendChild(h),E.dataset.filter=m,E.setAttribute("aria-pressed",m===this.filter?"true":"false"),E.addEventListener("click",()=>this.setFilter(m)),this.chipButtons.set(m,E),this.chipCounts.set(m,h),this.chipLabels.set(m,A),b.appendChild(E)}this.filtersEl.appendChild(b),this.listEl=p("div",{class:"sp-list"}),this.root.appendChild(l),this.root.appendChild(this.filtersEl),this.root.appendChild(this.listEl),e.appendChild(this.root);let v=e.host;this.onDocumentClick=m=>{this.isOpen&&(m.composedPath().includes(v)||this.close())},this.onKeydown=m=>{if(this.isOpen){if(m.key==="Escape"){m.stopPropagation(),this.close();return}m.key==="Tab"&&this.trapFocus(m)}},this.applyChipStyles()}open(){if(this.isOpen){this.render();return}this.isOpen=!0,this.previouslyFocused=this.deepActiveElement()??null,this.render(),this.root.classList.add("sp-panel--open"),this.root.setAttribute("aria-hidden","false"),this.root.inert=!1,document.addEventListener("click",this.onDocumentClick),document.addEventListener("keydown",this.onKeydown,!0),this.bus.emit("drawer:opened"),requestAnimationFrame(()=>{this.root.querySelector('button:not([disabled]):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"])')?.focus()})}close(){if(!this.isOpen)return;this.isOpen=!1,this.root.classList.remove("sp-panel--open"),this.root.setAttribute("aria-hidden","true"),this.root.inert=!0,document.removeEventListener("click",this.onDocumentClick),document.removeEventListener("keydown",this.onKeydown,!0),this.bus.emit("navigator:close"),this.bus.emit("drawer:closed");let e=this.previouslyFocused;this.previouslyFocused=null,e&&typeof e.focus=="function"&&e.focus()}refreshIfOpen(){this.isOpen&&this.render()}destroy(){for(let e of this.cardDropdowns)e.destroy();this.cardDropdowns.clear(),document.removeEventListener("click",this.onDocumentClick),document.removeEventListener("keydown",this.onKeydown,!0),this.root.remove()}setFilter(e){this.filter!==e&&(this.filter=e,this.applyChipStyles(),this.onFilterChange(e),this.render())}getFilter(){return this.filter}applyChipStyles(){for(let[e,t]of this.chipButtons){let o=e===this.filter;t.classList.toggle("sp-chip--active",o),t.setAttribute("aria-pressed",o?"true":"false")}}updateChipCounts(e){let t=new Map;for(let o of I)t.set(o,0);for(let o of e){let n=o.status??"todo";t.set(n,(t.get(n)??0)+1)}for(let[o,n]of this.chipButtons){let s=t.get(o)??0,i=this.chipCounts.get(o),a=this.chipLabels.get(o)??o;i&&g(i,String(s)),n.setAttribute("aria-label",`${a} \u2014 ${s}`)}}render(){for(let l of this.cardDropdowns)l.destroy();this.cardDropdowns.clear(),this.listEl.replaceChildren();let e=this.store.list();this.updateChipCounts(e);let t=e.filter(l=>(l.status??"todo")===this.filter);if(e.length===0){this.listEl.appendChild(this.buildEmpty(this.t("drawer.empty")));return}if(t.length===0){this.listEl.appendChild(this.buildEmpty(this.t("drawer.emptyFiltered")));return}let o=$(window.location.pathname),n=[...t].sort((l,c)=>new Date(c.createdAt).getTime()-new Date(l.createdAt).getTime()),s=n.filter(l=>$(l.path)===o),i=n.filter(l=>$(l.path)!==o),a=0;if(s.length>0){i.length>0&&this.listEl.appendChild(this.buildSectionLabel(this.t("drawer.thisPage")));for(let l of s)this.listEl.appendChild(this.buildCard(l,++a))}if(i.length>0){let l=p("button",{class:"sp-chip",type:"button"});l.style.cssText="margin:8px 4px;";let c=()=>{g(l,`${this.otherPagesExpanded?"\u25BE ":"\u25B8 "}${this.t("drawer.otherPages",{n:i.length})}`)};c(),l.setAttribute("aria-expanded",this.otherPagesExpanded?"true":"false");let d=p("div",{});d.style.display=this.otherPagesExpanded?"block":"none",l.addEventListener("click",()=>{this.otherPagesExpanded=!this.otherPagesExpanded,d.style.display=this.otherPagesExpanded?"block":"none",l.setAttribute("aria-expanded",this.otherPagesExpanded?"true":"false"),c()});for(let b of i)d.appendChild(this.buildCard(b,++a));this.listEl.appendChild(l),this.listEl.appendChild(d)}}buildSectionLabel(e){let t=p("div",{style:`font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${this.colors.textTertiary};padding:10px 8px 4px;`});return g(t,e),t}buildEmpty(e){let t=p("div",{class:"sp-empty"}),o=p("div",{class:"sp-empty-text"});return g(o,e),t.appendChild(o),t}handleStatusPick(e,t,o){t!==e.status&&(this.store.updateStatus?.(e.id,t),e.status=t,o.setCurrent(t),this.bus.emit("feedback:updated",e),this.render())}buildCard(e,t){let o=e.status??"todo",n=O[o],s=$(e.path)===$(window.location.pathname),i=p("button",{class:"sp-card",type:"button"});i.style.textAlign="left",i.style.width="100%",i.dataset.annotationId=e.id;let a=e.message.length>nt?`${e.message.slice(0,nt).trimEnd()}\u2026`:e.message;i.setAttribute("aria-label",this.t("drawer.rowAria",{n:t,message:a})),i.addEventListener("click",()=>{s?this.jump(e.id):e.url&&(window.location.href=e.url)});let l=p("div",{class:"sp-card-bar",style:`background:${n.border};`}),c=p("div",{class:"sp-card-body"}),d=p("div",{class:"sp-card-header"}),b=p("span",{class:"sp-card-number"});g(b,`#${t}`);let f=typeof this.store.updateStatus=="function",v=ce({current:o,colors:this.colors,t:this.t,readOnly:!f,onPick:T=>this.handleStatusPick(e,T,v)});this.cardDropdowns.add(v),v.root.addEventListener("click",T=>T.stopPropagation()),v.root.addEventListener("keydown",T=>T.stopPropagation());let m=p("span",{class:"sp-card-date"});g(m,new Date(e.createdAt).toLocaleDateString()),d.appendChild(b),d.appendChild(v.root),d.appendChild(m);let E=p("div",{class:"sp-card-message"});g(E,a);let A=p("div",{style:`font-size:11px;color:${this.colors.textTertiary};margin-top:8px;display:flex;flex-wrap:wrap;gap:8px;`}),R=e.authorName?.trim()||"Anonymous",h=e.kind??"target",x=p("span",{});g(x,R);let C=p("span",{style:"text-transform:uppercase;letter-spacing:0.04em;"});g(C,h);let P=p("span",{style:"overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;"});return g(P,$(e.path)),A.appendChild(x),A.appendChild(C),A.appendChild(P),c.appendChild(d),c.appendChild(E),c.appendChild(A),i.appendChild(l),i.appendChild(c),i}trapFocus(e){let t=Array.from(this.root.querySelectorAll('button:not([disabled]):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"])'));if(t.length===0)return;let o=t[0],n=t[t.length-1];if(!o||!n)return;let s=this.deepActiveElement();e.shiftKey?(s===o||!this.root.contains(s))&&(e.preventDefault(),n.focus()):(s===n||!this.root.contains(s))&&(e.preventDefault(),o.focus())}deepActiveElement(){let e=document.activeElement;for(;e?.shadowRoot?.activeElement;)e=e.shadowRoot.activeElement;return e}};var pe=class{constructor(){this.listeners=new Map}on(e,t){let o=this.listeners.get(e);return o||(o=new Set,this.listeners.set(e,o)),o.add(t),()=>{o.delete(t)}}emit(e,...t){let o=this.listeners.get(e);if(o)for(let n of o)try{n(...t)}catch(s){console.error(`[ccm-feedback] Error in listener for "${String(e)}":`,s)}}removeAll(){this.listeners.clear()}};function Yt(r,e,t){let o=new Blob([r],{type:t}),n=URL.createObjectURL(o),s=document.createElement("a");s.href=n,s.download=e,s.style.display="none",document.body.appendChild(s),s.click(),requestAnimationFrame(()=>{URL.revokeObjectURL(n),s.remove()})}async function it(r){try{if(navigator.clipboard?.writeText)return await navigator.clipboard.writeText(r),!0}catch{}try{let e=document.createElement("textarea");e.value=r,e.style.cssText="position:fixed;top:-9999px;left:-9999px;opacity:0;",document.body.appendChild(e),e.select();let t=document.execCommand("copy");return e.remove(),t}catch{return!1}}function Me(r,e){let t=new Date().toISOString().slice(0,10),o=r.replace(/[^a-zA-Z0-9_-]/g,"_"),n={projectName:r,exportedAt:new Date().toISOString(),count:e.length,annotations:e};Yt(JSON.stringify(n,null,2),`ccm-feedback-${o}-${t}.json`,"application/json;charset=utf-8")}var Kt=54,ue=class{constructor(e,t,o,n=!1){this.bus=t;this.cloudMode=n;this.todoBadge=null;this.reviewBadge=null;this.mode="closed";this.activeMode=null;this.savedHostZIndex="";this.unsubs=[];this.hostEl=e.host,this.items=[{id:"target",icon:Fe,label:o("fab.targetLabel")},{id:"pin",icon:je,label:o("fab.pinLabel")},{id:"area",icon:ze,label:o("fab.areaLabel")},{id:"export",icon:Wt,label:o("fab.export")},{id:"copyUrl",icon:Xe,label:o("fab.copyUrl"),...this.cloudMode?{}:{disabled:!0,disabledTitle:o("fab.copyUrlLocalOnly")}},{id:"clear",icon:He,label:o("fab.clear")}],this.fab=document.createElement("button"),this.fab.className="sp-fab sp-fab--bottom-right sp-anim-fab-in",this.fab.style.position="fixed",this.fab.appendChild(N(ye)),this.baseAriaLabel=o("fab.aria"),this.fab.setAttribute("aria-label",this.baseAriaLabel),this.fab.setAttribute("aria-expanded","false"),this.fab.addEventListener("click",i=>{i.detail>=2||this.toggle()}),this.fab.addEventListener("dblclick",i=>{i.preventDefault(),this.bus.emit("navigator:open")}),this.radialContainer=document.createElement("div"),this.radialContainer.className="sp-radial sp-radial--bottom-right",this.radialContainer.setAttribute("role","menu"),this.items.forEach((i,a)=>{let l=document.createElement("button");l.className="sp-radial-item",l.style.setProperty("--sp-i",String(a)),l.appendChild(N(i.icon)),l.setAttribute("role","menuitem"),l.setAttribute("aria-label",i.label),l.dataset.itemId=i.id,i.disabled&&(l.setAttribute("aria-disabled","true"),l.dataset.disabled="true",l.style.opacity="0.4",l.style.cursor="not-allowed",i.disabledTitle&&(l.title=i.disabledTitle));let c=document.createElement("span");c.className="sp-radial-label",c.style.cssText="position:absolute;right:54px;top:50%;transform:translateY(-50%);white-space:nowrap;",c.textContent=i.label,l.appendChild(c),l.addEventListener("click",d=>{d.stopPropagation(),!i.disabled&&this.handleItemClick(i.id)}),this.radialContainer.appendChild(l)}),this.root=document.createElement("div"),this.root.appendChild(this.radialContainer),this.root.appendChild(this.fab),e.appendChild(this.root),this.onDocumentClick=i=>{this.mode!=="closed"&&!i.composedPath().includes(this.hostEl)&&this.close()},document.addEventListener("click",this.onDocumentClick);let s=i=>{i.key==="Escape"&&this.mode!=="closed"&&(i.stopPropagation(),this.close())};this.fab.addEventListener("keydown",s),this.radialContainer.addEventListener("keydown",s),this.unsubs.push(this.bus.on("drawer:opened",()=>{this.setDrawerOpen(!0),this.activeMode&&this.bus.emit(`${this.activeMode}:end`)}),this.bus.on("drawer:closed",()=>this.setDrawerOpen(!1)),this.bus.on("target:start",()=>this.onModeStart("target")),this.bus.on("pin:start",()=>this.onModeStart("pin")),this.bus.on("area:start",()=>this.onModeStart("area")),this.bus.on("target:end",()=>this.onModeEnd("target")),this.bus.on("pin:end",()=>this.onModeEnd("pin")),this.bus.on("area:end",()=>this.onModeEnd("area")))}updateCounts(e){if(this.todoBadge=this.renderBadge(this.todoBadge,e.todo,"todo"),this.reviewBadge=this.renderBadge(this.reviewBadge,e.review,"review"),e.todo<=0&&e.review<=0){this.fab.setAttribute("aria-label",this.baseAriaLabel);return}let t=[];e.todo>0&&t.push(`${e.todo} todo`),e.review>0&&t.push(`${e.review} review`),this.fab.setAttribute("aria-label",`${this.baseAriaLabel}, ${t.join(", ")}`)}renderBadge(e,t,o){if(t<=0)return e?.remove(),null;let n=e;if(!n){n=document.createElement("span"),n.className=o==="todo"?"sp-fab-badge":"sp-fab-badge sp-fab-badge--left",n.setAttribute("aria-hidden","true");let s=O[o];n.style.background=s.border,n.style.color="#fff",this.fab.appendChild(n)}return g(n,t>99?"99+":String(t)),n}setDrawerOpen(e){this.fab.classList.toggle("sp-fab--drawer-open",e),this.radialContainer.classList.toggle("sp-radial--drawer-open",e)}setModeActive(e){e?(this.savedHostZIndex=this.hostEl.style.zIndex,this.hostEl.style.zIndex=String(2147483647)):this.hostEl.style.zIndex=this.savedHostZIndex}onModeStart(e){this.activeMode=e,this.setModeActive(!0)}onModeEnd(e){this.activeMode===e&&(this.activeMode=null,this.setModeActive(!1))}toggle(){this.mode==="closed"?this.openRadial():this.close()}openRadial(){this.mode="open",this.setFabIcon(J),this.fab.setAttribute("aria-expanded","true"),this.radialContainer.querySelectorAll(".sp-radial-item").forEach((t,o)=>{let n=16+Kt*(o+1);t.style.transform=`translate(0, ${-n}px) scale(1)`,t.classList.add("sp-radial-item--open")}),requestAnimationFrame(()=>{this.radialContainer.querySelector(".sp-radial-item--open")?.focus()})}close(){this.mode="closed",this.setFabIcon(ye),this.fab.setAttribute("aria-expanded","false"),this.radialContainer.querySelectorAll(".sp-radial-item").forEach(t=>{t.style.transform="translate(0, 0) scale(0.8)",t.classList.remove("sp-radial-item--open")}),this.fab.focus()}setFabIcon(e){let t=this.todoBadge,o=this.reviewBadge;this.fab.replaceChildren(N(e)),t&&this.fab.appendChild(t),o&&this.fab.appendChild(o)}handleItemClick(e){switch(e){case"target":this.bus.emit("target:start");break;case"pin":this.bus.emit("pin:start");break;case"area":this.bus.emit("area:start");break;case"export":this.close(),this.bus.emit("export:click");break;case"copyUrl":this.close(),this.bus.emit("copyUrl:click");break;case"clear":this.close(),this.bus.emit("clear:click");break}}destroy(){document.removeEventListener("click",this.onDocumentClick);for(let e of this.unsubs)e();this.unsubs.length=0,this.activeMode&&this.setModeActive(!1),this.root.remove()}},Wt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';var Gt={"fab.aria":"Feedback","fab.targetLabel":"Target element","fab.pinLabel":"Drop pin","fab.areaLabel":"Capture area","toolbar.toggleOn":"Hide comments","toolbar.toggleOff":"Show comments","fab.export":"Export JSON","fab.copyUrl":"Copy feedback URL","fab.copyUrlLocalOnly":"Cloud mode only \u2014 use Export JSON","fab.clear":"Clear all","fab.clearConfirm":"Delete all annotations for this project? This cannot be undone.","pin.ariaLabel":"Pin mode toolbar","pin.instruction":"Click any element to comment on it","pin.cancel":"Cancel","relocate.instruction":"Drop on a new target. ESC to cancel.","relocate.cancel":"Cancel relocate","coordPin.instruction":"Click anywhere to drop a pin","area.instruction":"Drag to capture an area","status.todo":"Todo","status.review":"Review","status.done":"Done","status.question":"Question","status.label":"Status","popup.ariaLabel":"Comment composer","popup.placeholder":"Leave a comment\u2026","popup.textareaAria":"Comment","popup.cancel":"Cancel","popup.submit":"Send","popup.submitHintMac":"\u2318 + \u21B5 to submit","popup.submitHintOther":"Ctrl + \u21B5 to submit","marker.ariaLabel":"Comment #{n}","marker.popover.delete":"Delete","marker.popover.close":"Close","marker.popover.deleteConfirm":"Delete this comment? This cannot be undone.","marker.popover.statusAria":"Change status","marker.popover.statusMenuAria":"Statuses","marker.replies.heading":"Replies","marker.reply.delete":"Delete reply","marker.reply.placeholder":"Write a reply\u2026","marker.reply.send":"Reply","marker.replyDeleteConfirm":"Delete this reply? This cannot be undone.","toast.exported":"Exported {n} annotation(s)","toast.empty":"No annotations to export","toast.urlCopied":"Feedback URL copied to clipboard","toast.urlCopyFailed":"Could not copy URL \u2014 clipboard unavailable","drawer.title":"Comments","drawer.aria":"Comments navigator","drawer.close":"Close comments","drawer.empty":"No comments yet","drawer.emptyFiltered":"No comments match this filter","drawer.thisPage":"This page","drawer.otherPages":"Other pages ({n})","drawer.rowAria":"Comment {n}: {message}"};function st(){return(r,e)=>{let t=Gt[r]??r;return e?t.replace(/\{(\w+)\}/g,(o,n)=>String(e[n]??"")):t}}var at=8;function he(r){let e=null,t=null,o=null,n=null,s="",i="",a=()=>{e&&(o!==null?e.style.setProperty("outline",o,s):e.style.removeProperty("outline"),n!==null?e.style.setProperty("outline-offset",n,i):e.style.removeProperty("outline-offset"),e=null,o=null,n=null,s="",i=""),t&&(t.remove(),t=null)};return{apply:c=>{if(e===c)return;e&&a(),o=c.style.outline||null,n=c.style.outlineOffset||null,s=c.style.getPropertyPriority("outline"),i=c.style.getPropertyPriority("outline-offset"),c.style.setProperty("outline",`2px solid ${r.accent}`,"important"),c.style.setProperty("outline-offset","2px","important"),e=c;let d=c.getBoundingClientRect();if(d.width>0&&d.height>0){t=document.createElement("div");let b=c.tagName.toLowerCase();t.textContent=b,t.setAttribute("aria-hidden","true");let f=Math.max(at,Math.min(d.right-4,window.innerWidth-60)),v=Math.max(at,Math.min(d.bottom+4,window.innerHeight-24));t.style.cssText=`
        position:fixed;
        left:${f}px;
        top:${v}px;
        transform:translateX(-100%);
        z-index:${2147483647};
        padding:2px 8px;border-radius:6px;
        background:${r.glassBg};
        backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
        border:1px solid ${r.accent};
        color:${r.accent};
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:11px;font-weight:500;
        letter-spacing:0.02em;
        pointer-events:none;
        white-space:nowrap;
      `,document.body.appendChild(t)}},clear:a,destroy:a}}function qt(r,e){if(r===e)return 0;if(r.length===0)return e.length;if(e.length===0)return r.length;if(r.length>e.length){let i=r;r=e,e=i}let t=r.length,o=e.length,n=new Array(t+1);for(let i=0;i<=t;i++)n[i]=i;let s=new Array(t+1);for(let i=1;i<=o;i++){s[0]=i;for(let l=1;l<=t;l++){let c=n[l-1]??0;s[l]=r[l-1]===e[i-1]?c:1+Math.min(c,n[l]??0,s[l-1]??0)}let a=n;n=s,s=a}return n[t]??0}function K(r,e){if(r===e)return 1;let t=Math.max(r.length,e.length);return t===0?1:1-qt(r,e)/t}function Le(r,e,t=.6){if(!e||!r)return 0;if(r.includes(e))return 1;let o=e.length;if(o>r.length){let a=K(r,e);return a>=t?a:0}let n=0,s=r.length>500?r.slice(0,500):r,i=s.length-o;for(let a=0;a<=i;a++){let l=s.slice(a,a+o),c=K(l,e);if(c>n&&(n=c),n>=.95)break}return n>=t?n:0}var Vt=300,Zt=.3;function Pe(r,e){if(!e.textSnippet)return!0;let t=(r.textContent?.trim()??"").slice(0,500);return Le(t,e.textSnippet,.5)>Zt}function Qt(r){if(r.elementId){let e=document.getElementById(r.elementId);if(e&&e.tagName===r.elementTag&&Pe(e,r))return{element:e,confidence:1,strategy:"id"}}try{let e=document.querySelector(r.cssSelector);if(e&&e.tagName===r.elementTag&&Pe(e,r))return{element:e,confidence:.95,strategy:"css"}}catch{}try{let t=document.evaluate(r.xpath,document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue;if(t instanceof Element&&t.tagName===r.elementTag&&Pe(t,r))return{element:t,confidence:.9,strategy:"xpath"}}catch{}return Jt(r)}function Jt(r){let e=r.elementTag.toLowerCase(),t=document.querySelectorAll(e);if(t.length===0)return null;let o=null,n=0,s=Math.min(t.length,Vt);for(let i=0;i<s;i++){let a=t[i];if(!a)continue;let l=er(a,r);if(l>n&&(n=l,o=a,n>=.85))break}return!o||n<.4?null:{element:o,confidence:Math.min(n,.85),strategy:"scan"}}function er(r,e){let t=0,o=0,n=(r.textContent?.trim()??"").slice(0,500);if(e.textSnippet&&(o+=40,t+=Le(n,e.textSnippet,.5)*40),e.fingerprint&&(o+=20,t+=et(r,e.fingerprint)*20),e.textPrefix||e.textSuffix){o+=20;let s=0,i=0;if(e.textPrefix){let a=Y(r,"before");s+=a?K(a,e.textPrefix):0,i++}if(e.textSuffix){let a=Y(r,"after");s+=a?K(a,e.textSuffix):0,i++}i>0&&(t+=s/i*20)}if(e.neighborText){o+=20;let s=se(r);t+=s?K(s,e.neighborText)*20:0}return o>0?t/o:0}function lt(r,e){let t=Qt(r);if(!t)return null;let o=t.element.getBoundingClientRect(),n=new DOMRect(o.x+e.xPct*o.width,o.y+e.yPct*o.height,e.wPct*o.width,e.hPct*o.height);return{element:t.element,rect:n,confidence:t.confidence,strategy:t.strategy}}var fe=26,Z=fe/2,tr=200,rr=250,ct=6,dt=300,or=.7,nr=540,pt=16,me=class{constructor(e,t,o,n,s=()=>!1){this.colors=e;this.bus=t;this.t=o;this.store=n;this.shouldIgnoreElement=s;this.entries=[];this.visible=!0;this.includeDone=!1;this.popover=null;this.popoverStatusDropdown=null;this.popoverDisposers=[];this.repositionTimer=null;this.lastPath=window.location.pathname;this.dragCleanup=null;this.watcherCleanups=new Set;this.dragInFlight=!1;if(this.container=p("div",{style:`position:absolute;top:0;left:0;width:100%;height:0;overflow-x:clip;overflow-y:visible;z-index:${2147483645};pointer-events:none;`}),this.container.setAttribute("aria-hidden","false"),this.container.setAttribute("data-ccm-markers","true"),document.body.appendChild(this.container),!document.getElementById("ccm-marker-anim")){let a=document.createElement("style");a.id="ccm-marker-anim",a.textContent=`
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
      `,document.head.appendChild(a)}if(!document.getElementById("ccm-popover-scroll")){let a=document.createElement("style");a.id="ccm-popover-scroll",a.textContent=`
        .ccm-popover::-webkit-scrollbar { width: 6px; }
        .ccm-popover::-webkit-scrollbar-track { background: transparent; }
        .ccm-popover::-webkit-scrollbar-thumb {
          background: ${this.colors.glassBorder};
          border-radius: 3px;
        }
        .ccm-popover { scrollbar-width: thin; scrollbar-color: ${this.colors.glassBorder} transparent; }
      `,document.head.appendChild(a)}this.onResize=this.scheduleReposition.bind(this),this.onScroll=this.scheduleReposition.bind(this),window.addEventListener("resize",this.onResize,{passive:!0}),window.addEventListener("scroll",this.onScroll,{passive:!0}),this.onDocClick=a=>{this.popover&&(a.composedPath().some(l=>l===this.popover)||this.closePopover())},document.addEventListener("click",this.onDocClick,!0);let i=()=>{window.location.pathname!==this.lastPath&&(this.dragInFlight||(this.lastPath=window.location.pathname,this.refresh()))};this.onPopState=i,window.addEventListener("popstate",this.onPopState),this.origPushState=history.pushState.bind(history),this.origReplaceState=history.replaceState.bind(history),history.pushState=(...a)=>{this.origPushState(...a),i()},history.replaceState=(...a)=>{this.origReplaceState(...a),i()},this.bus.on("annotations:toggle",a=>this.setVisible(a))}refresh(){this.closePopover();for(let t of this.entries)t.node.remove();this.entries=[],this.store.listForPath(window.location.pathname).filter(t=>this.shouldRender(t)).forEach((t,o)=>{let n=this.buildMarker(t,o+1);this.container.appendChild(n),this.entries.push({record:t,node:n,anchorEl:null})}),this.reposition()}addOne(e){if(!this.shouldRender(e))return;let t=this.entries.length+1,o=this.buildMarker(e,t);this.container.appendChild(o),this.entries.unshift({record:e,node:o,anchorEl:null}),this.renumber(),this.reposition()}shouldRender(e){return!((e.status??"todo")==="done"&&!this.includeDone)}setIncludeDone(e){this.includeDone!==e&&(this.includeDone=e,this.refresh())}setVisible(e){this.visible=e,this.container.style.display=e?"block":"none",e||this.closePopover()}get isVisible(){return this.visible}canLocate(e){let t=this.entries.find(o=>o.record.id===e);return t?this.isEntryLocatable(t):!1}scrollToAndFlash(e){let t=this.entries.find(n=>n.record.id===e);if(!t||!this.isEntryLocatable(t))return!1;let o=Number.parseFloat(t.node.style.top);if(Number.isFinite(o)&&window.scrollTo({top:Math.max(0,o-window.innerHeight/3),behavior:"smooth"}),this.visible){let n=t.node;n.style.animation="ccm-pulse 0.6s ease-in-out 1",window.setTimeout(()=>{let s=n.dataset.status;n.style.animation=s==="question"?"ccm-pulse 1.6s ease-in-out infinite":""},650)}return this.flashAnchorElement(t),!0}flashAnchorElement(e){if((e.record.kind??"target")!=="target")return;let o=e.anchorEl;!o||!(o instanceof HTMLElement)||(o.classList.remove("ccm-anchor-flash"),o.offsetWidth,o.classList.add("ccm-anchor-flash"),window.setTimeout(()=>{o.classList.remove("ccm-anchor-flash")},1250))}isEntryLocatable(e){return!0}buildMarker(e,t){let o=e.status??"todo",n=O[o],s=p("button",{type:"button","aria-label":this.t("marker.ariaLabel",{n:t}),style:`
        position:absolute;width:${fe}px;height:${fe}px;
        border-radius:9999px;border:2px solid #fff;
        background:${n.border};color:#fff;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:12px;font-weight:700;line-height:1;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 8px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.18);
        cursor:grab;pointer-events:auto;
        transform:translate(-50%, -50%);transition:transform 0.15s ease;
      `});return s.dataset.annotationId=e.id,s.dataset.status=o,s.dataset.kind=e.kind??"target",o==="question"&&(s.style.animation="ccm-pulse 1.6s ease-in-out infinite"),g(s,String(t)),s.addEventListener("mouseenter",()=>{s.style.transform="translate(-50%, -50%) scale(1.12)"}),s.addEventListener("mouseleave",()=>{s.style.transform="translate(-50%, -50%) scale(1)"}),this.attachDragOrClickWatcher(s,e),s}attachDragOrClickWatcher(e,t){let o={value:!1};e.addEventListener("click",n=>{if(n.stopPropagation(),o.value){o.value=!1;return}this.openPopover(t,e)}),e.addEventListener("mousedown",n=>{if(n.button!==0)return;n.stopPropagation();let s=n.clientX,i=n.clientY,a=!1,l=window.setTimeout(()=>{l=null,f(n)},rr),c=v=>{if(a)return;let m=v.clientX-s,E=v.clientY-i;m*m+E*E>=ct*ct&&f(v)},d=()=>{l!==null&&(window.clearTimeout(l),l=null),b()},b=()=>{window.removeEventListener("mousemove",c,!0),window.removeEventListener("mouseup",d,!0),l!==null&&(window.clearTimeout(l),l=null),this.watcherCleanups.delete(b)},f=v=>{if(a)return;a=!0,o.value=!0,l!==null&&(window.clearTimeout(l),l=null),b();let m=this.entries.find(E=>E.record.id===t.id);m&&this.enterDragMode(m,v)};window.addEventListener("mousemove",c,!0),window.addEventListener("mouseup",d,!0),this.watcherCleanups.add(b)})}enterDragMode(e,t){let o=e.node,n=o.style.opacity,s=o.style.transform,i=o.style.cursor,a=o.style.transition,l=t.clientX+window.scrollX,c=t.clientY+window.scrollY,d=he(this.colors),b=p("div",{style:`
        position:fixed;inset:0;z-index:${2147483646};
        background:transparent;cursor:grabbing;
      `});b.setAttribute("aria-hidden","true"),b.setAttribute("data-ccm-drag-overlay","true");let f=p("div",{style:`
        position:fixed;top:0;left:0;right:0;z-index:${2147483647};
        height:52px;background:${this.colors.glassBg};
        backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
        border-bottom:1px solid ${this.colors.glassBorder};
        display:flex;align-items:center;justify-content:center;gap:16px;
        pointer-events:auto;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:14px;color:${this.colors.text};
      `});f.setAttribute("data-ccm-drag-toolbar","true");let v=p("span",{style:"font-weight:500;letter-spacing:-0.01em;"});g(v,this.t("relocate.instruction"));let m=document.createElement("button");m.type="button",m.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;
      font-size:13px;font-weight:500;cursor:pointer;
    `,g(m,this.t("relocate.cancel")),f.appendChild(v),f.appendChild(m),document.body.appendChild(b),document.body.appendChild(f),o.style.opacity="0.75",o.style.cursor="grabbing",o.style.transition="none",o.style.transform="translate(-50%, -50%)",o.style.position="fixed",o.style.top=`${t.clientY}px`,o.style.left=`${t.clientX}px`;let E=!1;this.dragInFlight=!0;let A=(k,y)=>{b.style.pointerEvents="none",f.style.pointerEvents="none";let M=o.style.pointerEvents;o.style.pointerEvents="none";let H=document.elementFromPoint(k,y);return b.style.pointerEvents="auto",f.style.pointerEvents="auto",o.style.pointerEvents=M,H},R=k=>{o.style.top=`${k.clientY}px`,o.style.left=`${k.clientX}px`;let y=A(k.clientX,k.clientY);if(!y||!(y instanceof HTMLElement)){d.clear();return}if(this.shouldIgnoreElement(y)||o.contains(y)||y===o){d.clear();return}if(y===document.documentElement||y===document.body){d.clear();return}d.apply(y)},h=()=>{E||(E=!0,window.removeEventListener("mousemove",R,!0),window.removeEventListener("mouseup",u,!0),document.removeEventListener("keydown",P,!0),window.removeEventListener("contextmenu",T,!0),window.removeEventListener("popstate",x,!0),d.destroy(),b.remove(),f.remove(),o.style.position="absolute",o.style.opacity=n,o.style.transform=s,o.style.cursor=i,o.style.transition=a,this.dragInFlight=!1,this.dragCleanup=null,this.reposition())};this.dragCleanup=h;let x=()=>{C()},C=()=>{h()},P=k=>{k.key==="Escape"&&(k.preventDefault(),C())},T=k=>{k.preventDefault(),C()};m.addEventListener("click",k=>{k.preventDefault(),k.stopPropagation(),C()});let u=k=>{if(E)return;let y=A(k.clientX,k.clientY),M=e.record.kind??"target",H=e.record.id,j=(w,L)=>{let z=window.scrollX+8,X=window.scrollX+window.innerWidth-8,F=w+L;return F<z?z-L:F>X?X-L:w},_=null;if(M==="area"){let w=k.clientX+window.scrollX-l,L=k.clientY+window.scrollY-c,z=e.record.areaX??0,X=e.record.areaY??0,F=e.record.areaW??0,be=e.record.areaH??0,xt=j(z+w,F),wt=X+L;_={kind:"area",anchor:this.entryAnchor(e),rect:{xPct:e.record.xPct,yPct:e.record.yPct,wPct:e.record.wPct,hPct:e.record.hPct},pin:null,area:{x:xt,y:wt,w:F,h:be}}}else{let w=!y||!(y instanceof HTMLElement)||this.shouldIgnoreElement(y)||y===o||o.contains(y)||y===document.documentElement||y===document.body;if(!w&&y&&M==="target"&&y===e.anchorEl){h();return}if(w)_={kind:"pin",anchor:this.emptyAnchor(),rect:{xPct:0,yPct:0,wPct:0,hPct:0},pin:{x:k.clientX+window.scrollX,y:k.clientY+window.scrollY},area:null};else if(y&&y instanceof HTMLElement){let L=y.getBoundingClientRect(),z=L.width||1,X=L.height||1,F=(k.clientX-L.left)/z,be=(k.clientY-L.top)/X;_={kind:"target",anchor:ae(y),rect:{xPct:F,yPct:be,wPct:0,hPct:0},pin:null,area:null}}}_&&(this.applyAnchorInputToRecord(e.record,_),this.store.updateAnchor?.(H,_),this.bus.emit("feedback:updated",e.record)),h()};window.addEventListener("mousemove",R,!0),window.addEventListener("mouseup",u,!0),document.addEventListener("keydown",P,!0),window.addEventListener("contextmenu",T,!0),window.addEventListener("popstate",x,!0)}entryAnchor(e){return{cssSelector:e.record.cssSelector,xpath:e.record.xpath,textSnippet:e.record.textSnippet,elementTag:e.record.elementTag,elementId:e.record.elementId,textPrefix:e.record.textPrefix,textSuffix:e.record.textSuffix,fingerprint:e.record.fingerprint,neighborText:e.record.neighborText}}emptyAnchor(){return{cssSelector:"",xpath:"",textSnippet:"",elementTag:"",elementId:void 0,textPrefix:"",textSuffix:"",fingerprint:"",neighborText:""}}applyAnchorInputToRecord(e,t){e.cssSelector=t.anchor.cssSelector,e.xpath=t.anchor.xpath,e.textSnippet=t.anchor.textSnippet,e.elementTag=t.anchor.elementTag,e.elementId=t.anchor.elementId,e.textPrefix=t.anchor.textPrefix,e.textSuffix=t.anchor.textSuffix,e.fingerprint=t.anchor.fingerprint,e.neighborText=t.anchor.neighborText,e.xPct=t.rect.xPct,e.yPct=t.rect.yPct,e.wPct=t.rect.wPct,e.hPct=t.rect.hPct,e.kind=t.kind,t.pin?(e.pinX=t.pin.x,e.pinY=t.pin.y):(delete e.pinX,delete e.pinY),t.area?(e.areaX=t.area.x,e.areaY=t.area.y,e.areaW=t.area.w,e.areaH=t.area.h):(delete e.areaX,delete e.areaY,delete e.areaW,delete e.areaH)}renumber(){this.entries.forEach((e,t)=>{let o=t+1;g(e.node,String(o)),e.node.setAttribute("aria-label",this.t("marker.ariaLabel",{n:o}))})}openPopover(e,t){this.closePopover();let o=p("div",{style:`
        z-index:${2147483647};max-width:300px;min-width:220px;padding:14px;
        border-radius:12px;background:${this.colors.glassBg};
        backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
        border:1px solid ${this.colors.glassBorder};
        box-shadow:0 8px 32px ${this.colors.shadow},0 2px 8px ${this.colors.shadow};
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        color:${this.colors.text};font-size:13px;line-height:1.5;
        -webkit-font-smoothing:antialiased;
      `});o.setAttribute("role","dialog"),o.setAttribute("aria-label",this.t("marker.ariaLabel",{n:""})),o.classList.add("ccm-popover"),o.addEventListener("click",w=>w.stopPropagation()),o.addEventListener("keydown",w=>{w.key==="Escape"&&(w.preventDefault(),this.closePopover())});let n=p("div",{style:"white-space:pre-wrap;word-break:break-word;margin-bottom:10px;"});g(n,e.message);let s=p("div",{style:`font-size:11px;color:${this.colors.textTertiary};margin-bottom:12px;`}),i=e.authorName?.trim()||"Anonymous";g(s,`${i} \xB7 ${new Date(e.createdAt).toLocaleString()}`);let a=e.status??"todo",l=typeof this.store.updateStatus!="function",c=ce({current:a,colors:this.colors,t:this.t,readOnly:l,onPick:w=>this.onStatusPicked(e,w,c)});this.popoverStatusDropdown=c;let d=p("span",{style:`
        display:inline-block;padding:2px 8px;border-radius:9999px;
        font-size:10px;font-weight:600;letter-spacing:0.02em;
        background:${this.colors.glassBgHeavy};color:${this.colors.textTertiary};
        border:1px solid ${this.colors.border};margin-right:6px;text-transform:uppercase;
      `});g(d,e.kind??"target");let b=p("div",{style:"margin-bottom:10px;display:flex;flex-wrap:wrap;gap:4px;align-items:center;"});b.appendChild(c.root),b.appendChild(d);let f=p("div",{style:"display:flex;justify-content:flex-end;gap:8px;"}),v=document.createElement("button");v.type="button",v.style.cssText=`
      height:30px;padding:0 14px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;font-size:12px;font-weight:500;
      cursor:pointer;transition:all 0.2s ease;
    `,g(v,this.t("marker.popover.close")),v.addEventListener("click",()=>this.closePopover());let m=document.createElement("button");m.type="button",m.style.cssText=`
      height:30px;padding:0 14px;border-radius:9999px;
      border:1px solid ${this.colors.typeBug};background:${this.colors.typeBugBg};
      color:${this.colors.typeBug};font-family:inherit;font-size:12px;font-weight:600;
      cursor:pointer;transition:all 0.2s ease;
    `,g(m,this.t("marker.popover.delete")),m.addEventListener("click",()=>{window.confirm(this.t("marker.popover.deleteConfirm"))&&(this.store.delete(e.id),this.bus.emit("feedback:deleted",e.id),this.closePopover(),this.refresh())});let E=p("div",{style:`height:1px;background:${this.colors.border};margin:10px -4px 10px;`}),A=p("div",{style:"display:flex;flex-direction:column;gap:8px;margin-bottom:10px;"}),R=()=>{A.replaceChildren();let w=this.store.listReplies(e.id);if(w.length>0){let L=p("div",{style:`font-size:11px;font-weight:600;color:${this.colors.textTertiary};margin-bottom:2px;letter-spacing:0.02em;text-transform:uppercase;`});g(L,this.t("marker.replies.heading")),A.appendChild(L)}for(let L of w)A.appendChild(this.buildReplyRow(L))};R();let h=p("div",{style:"display:flex;flex-direction:column;gap:6px;margin-bottom:10px;"}),x=p("textarea",{rows:"2",placeholder:this.t("marker.reply.placeholder"),"aria-label":this.t("marker.reply.placeholder"),style:`
        width:100%;box-sizing:border-box;resize:vertical;min-height:48px;max-height:160px;
        border-radius:8px;border:1px solid ${this.colors.border};
        background:${this.colors.glassBg};color:${this.colors.text};
        font-family:inherit;font-size:13px;line-height:1.4;padding:8px 10px;
      `}),C=document.createElement("button");C.type="button",C.style.cssText=`
      align-self:flex-end;height:28px;padding:0 14px;border-radius:9999px;
      border:1px solid ${this.colors.accent};background:${this.colors.accent};
      color:#fff;font-family:inherit;font-size:12px;font-weight:600;
      cursor:pointer;transition:all 0.2s ease;
    `,g(C,this.t("marker.reply.send"));let P=()=>{let w=x.value.trim();if(!w)return;let L=this.store.addReply({projectName:e.projectName,parentId:e.id,message:w,authorName:U(),url:e.url,path:e.path,viewport:`${window.innerWidth}x${window.innerHeight}`,userAgent:navigator.userAgent});this.bus.emit("feedback:replied",L),x.value="",R(),o.scrollTop=o.scrollHeight};C.addEventListener("click",P),x.addEventListener("keydown",w=>{if(w.key==="Enter"&&!w.shiftKey){w.preventDefault(),P();return}w.key==="Enter"&&(w.metaKey||w.ctrlKey)&&(w.preventDefault(),P())}),h.appendChild(x),h.appendChild(C),f.appendChild(v),f.appendChild(m),o.appendChild(b),o.appendChild(n),o.appendChild(s),o.appendChild(E),o.appendChild(A),o.appendChild(h),o.appendChild(f);let T=Math.min(window.innerHeight*or,nr);o.style.maxHeight=`${T}px`,o.style.overflowY="auto";let u=t.getBoundingClientRect();o.style.position="fixed",o.style.top="-10000px",o.style.left="-10000px",document.body.appendChild(o),this.popover=o;let k=Math.min(o.offsetHeight,T),y=u.bottom+8,M=u.left-10;y+k>window.innerHeight-pt&&(y=u.top-k-8),M+dt>window.innerWidth&&(M=window.innerWidth-dt-8),y=Math.max(pt,y),M=Math.max(8,M),o.style.top=`${y}px`,o.style.left=`${M}px`;let H=this.bus.on("feedback:replied",w=>{w.parentId===e.id&&(A.querySelector(`[data-reply-id="${w.id}"]`)||(R(),o.scrollTop=o.scrollHeight))}),j=this.bus.on("feedback:deleted",w=>{if(w===e.id){this.closePopover();return}A.querySelector(`[data-reply-id="${w}"]`)&&R()}),_=this.bus.on("feedback:updated",w=>{if(w.id!==e.id)return;let L=w.status??"todo";this.popoverStatusDropdown?.setCurrent(L),e.status=L,this.repositionAndRecolor(e.id)});this.popoverDisposers.push(H,j,_)}buildReplyRow(e){let t=p("div",{style:`
        position:relative;padding:8px 10px 8px 10px;border-radius:8px;
        background:${this.colors.glassBgHeavy};
        border:1px solid ${this.colors.border};
      `});t.dataset.replyId=e.id;let o=p("div",{style:`font-size:11px;color:${this.colors.textTertiary};margin-bottom:4px;padding-right:18px;`}),n=e.authorName?.trim()||"Anonymous";g(o,`${n} \xB7 ${new Date(e.createdAt).toLocaleString()}`);let s=p("div",{style:"white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.45;"});g(s,e.message);let i=document.createElement("button");return i.type="button",i.setAttribute("aria-label",this.t("marker.reply.delete")),i.style.cssText=`
      position:absolute;top:4px;right:4px;width:18px;height:18px;
      border-radius:9999px;border:none;background:transparent;
      color:${this.colors.textTertiary};
      font-family:inherit;font-size:14px;line-height:1;cursor:pointer;
      opacity:0;transition:opacity 0.15s ease,color 0.15s ease;
      padding:0;
    `,g(i,"\xD7"),t.addEventListener("mouseenter",()=>{i.style.opacity="1"}),t.addEventListener("mouseleave",()=>{i.style.opacity="0"}),i.addEventListener("focus",()=>{i.style.opacity="1"}),i.addEventListener("blur",()=>{i.style.opacity="0"}),i.addEventListener("click",a=>{a.stopPropagation(),window.confirm(this.t("marker.replyDeleteConfirm"))&&(this.store.delete(e.id),this.bus.emit("feedback:deleted",e.id))}),t.appendChild(o),t.appendChild(s),t.appendChild(i),t}onStatusPicked(e,t,o){this.store.updateStatus?.(e.id,t),e.status=t,this.bus.emit("feedback:updated",e),o.setCurrent(t),o.close(),this.repositionAndRecolor(e.id)}repositionAndRecolor(e){let t=this.entries.find(s=>s.record.id===e);if(!t)return;let o=t.record.status??"todo",n=O[o];t.node.style.background=n.border,t.node.dataset.status=o,t.node.dataset.kind=t.record.kind??"target",t.node.style.animation=o==="question"?"ccm-pulse 1.6s ease-in-out infinite":""}closePopover(){if(this.popover){this.popoverStatusDropdown?.destroy(),this.popoverStatusDropdown=null,this.popover.remove(),this.popover=null;for(let e of this.popoverDisposers)e();this.popoverDisposers=[]}}scheduleReposition(){this.repositionTimer===null&&(this.repositionTimer=window.setTimeout(()=>{this.repositionTimer=null,this.reposition()},tr))}reposition(){let e=document.documentElement.clientWidth,t=Z,o=Math.max(Z,e-Z),n=a=>Math.max(t,Math.min(o,a)),s=0,i=a=>window.scrollY+80+a*(fe+8);for(let a of this.entries){let l=a.record.kind??"target";if(a.node.dataset.kind=l,l==="pin"&&a.record.pinX!=null&&a.record.pinY!=null){a.node.style.display=this.visible?"flex":"none",a.node.style.top=`${a.record.pinY}px`,a.node.style.left=`${n(a.record.pinX)}px`,a.anchorEl=null;continue}if(l==="area"&&a.record.areaX!=null&&a.record.areaY!=null&&a.record.areaW!=null&&a.record.areaH!=null){a.node.style.display=this.visible?"flex":"none",a.node.style.top=`${a.record.areaY}px`,a.node.style.left=`${n(a.record.areaX+a.record.areaW)}px`,a.anchorEl=null;continue}let c=lt({cssSelector:a.record.cssSelector,xpath:a.record.xpath,textSnippet:a.record.textSnippet,elementTag:a.record.elementTag,elementId:a.record.elementId,textPrefix:a.record.textPrefix,textSuffix:a.record.textSuffix,fingerprint:a.record.fingerprint,neighborText:a.record.neighborText},{xPct:a.record.xPct,yPct:a.record.yPct,wPct:a.record.wPct,hPct:a.record.hPct});if(!c){a.node.style.display=this.visible?"flex":"none",a.node.style.top=`${i(s)}px`,a.node.style.left=`${o}px`,a.node.dataset.orphan="true",a.anchorEl=null,s++;continue}a.node.dataset.orphan="false",a.anchorEl=c.element;let d=c.rect,b=d.top+window.scrollY-Z,f=d.right+window.scrollX;a.node.style.display=this.visible?"flex":"none",a.node.style.top=`${b+Z}px`,a.node.style.left=`${n(f)}px`}}destroy(){this.dragCleanup?.();for(let e of[...this.watcherCleanups])e();this.watcherCleanups.clear(),window.removeEventListener("resize",this.onResize),window.removeEventListener("scroll",this.onScroll),window.removeEventListener("popstate",this.onPopState),document.removeEventListener("click",this.onDocClick,!0),history.pushState=this.origPushState,history.replaceState=this.origReplaceState,this.closePopover(),this.container.remove(),this.entries=[]}};var ge=class{constructor(e,t,o,n,s,i){this.colors=e;this.bus=t;this.t=o;this.openPopupForElement=n;this.shouldIgnoreElement=s;this.markers=i;this.overlay=null;this.toolbar=null;this.eyeHandle=null;this.isActive=!1;this.savedOverflow="";this.previouslyFocused=null;this.hoveredElement=null;this.onKeyDown=e=>{e.key==="Escape"&&(e.preventDefault(),this.deactivate())};this.onOverlayMouseMove=e=>{if(!this.overlay)return;this.overlay.style.pointerEvents="none";let t=document.elementFromPoint(e.clientX,e.clientY);if(this.overlay.style.pointerEvents="auto",!t||!(t instanceof HTMLElement)){this.clearHoverOutline();return}if(this.shouldIgnoreElement(t)){this.clearHoverOutline();return}if(t===document.documentElement||t===document.body){this.clearHoverOutline();return}t!==this.hoveredElement&&(this.clearHoverOutline(),this.hoveredElement=t,this.applyHoverOutline(t))};this.onOverlayClick=e=>{if(e.preventDefault(),e.stopPropagation(),!this.overlay)return;this.overlay.style.pointerEvents="none";let t=document.elementFromPoint(e.clientX,e.clientY);this.overlay.style.pointerEvents="auto",!(!t||!(t instanceof HTMLElement))&&(this.shouldIgnoreElement(t)||t===document.documentElement||t===document.body||(this.clearHoverOutline(),this.handleSelect(t)))};this.hoverOutline=he(this.colors),this.unsubPinStart=this.bus.on("target:start",()=>this.activate())}activate(){if(this.isActive)return;this.isActive=!0,this.savedOverflow=document.body.style.overflow,this.previouslyFocused=document.activeElement instanceof HTMLElement?document.activeElement:null,this.overlay=p("div",{style:`
        position:fixed;inset:0;z-index:${2147483646};
        background:rgba(15, 23, 42, 0.02);
        cursor:crosshair;
      `}),this.overlay.setAttribute("aria-hidden","true"),this.overlay.setAttribute("data-ccm-pin-overlay","true"),this.toolbar=p("div",{style:`
        position:fixed;top:0;left:0;right:0;z-index:${2147483647};
        height:52px;background:${this.colors.glassBg};
        backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
        border-bottom:1px solid ${this.colors.glassBorder};
        display:flex;align-items:center;justify-content:center;gap:16px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:14px;color:${this.colors.text};
      `}),this.toolbar.setAttribute("aria-label",this.t("pin.ariaLabel"));let e=p("span",{style:"font-weight:500;letter-spacing:-0.01em;"});g(e,this.t("pin.instruction"));let t=document.createElement("button");t.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;font-weight:500;cursor:pointer;
    `,g(t,this.t("pin.cancel")),t.addEventListener("click",()=>this.deactivate()),this.eyeHandle=W({bus:this.bus,t:this.t,colors:this.colors,markers:this.markers}),this.toolbar.appendChild(e),this.toolbar.appendChild(this.eyeHandle.button),this.toolbar.appendChild(t),this.overlay.addEventListener("mousemove",this.onOverlayMouseMove,!0),this.overlay.addEventListener("click",this.onOverlayClick,!0),document.addEventListener("keydown",this.onKeyDown),document.body.style.overflow="hidden",document.body.appendChild(this.overlay),document.body.appendChild(this.toolbar)}deactivate(){if(!this.isActive)return;this.isActive=!1,this.clearHoverOutline(),this.overlay?.removeEventListener("mousemove",this.onOverlayMouseMove,!0),this.overlay?.removeEventListener("click",this.onOverlayClick,!0),document.removeEventListener("keydown",this.onKeyDown),document.body.style.overflow=this.savedOverflow,this.eyeHandle?.destroy(),this.eyeHandle=null,this.overlay?.remove(),this.toolbar?.remove(),this.overlay=null,this.toolbar=null;let e=this.previouslyFocused;if(this.previouslyFocused=null,e&&typeof e.focus=="function"&&document.contains(e))try{e.focus()}catch{}this.bus.emit("target:end")}async handleSelect(e){this.deactivate();try{await this.openPopupForElement(e)}catch(t){console.error("[ccm-feedback] pin-mode: openPopupForElement threw",t)}}applyHoverOutline(e){this.hoverOutline.apply(e),this.hoveredElement=e}clearHoverOutline(){this.hoverOutline.clear(),this.hoveredElement=null}destroy(){this.deactivate(),this.unsubPinStart()}};var ir="linear(0, 0.006, 0.025, 0.06, 0.11, 0.17, 0.25, 0.34, 0.45, 0.56, 0.67, 0.78, 0.88, 0.95, 1.01, 1.04, 1.05, 1.04, 1.02, 1, 0.99, 1)",Re="cubic-bezier(0.16, 1, 0.3, 1)",$e="cubic-bezier(0.34, 1.56, 0.64, 1)",sr="cubic-bezier(0.25, 1, 0.5, 1)",ut=`
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
    animation: sp-fab-in 0.5s ${ir} both;
  }

  .sp-anim-marker-in {
    animation: sp-marker-in 0.35s ${$e} both;
  }

  .sp-anim-pulse {
    animation: sp-pulse-ring 0.7s ease-out;
  }

  .sp-anim-flash {
    animation: sp-flash-bg 0.5s ${sr};
  }

  .sp-anim-slide-up {
    animation: sp-slide-up 0.3s ${Re} both;
  }

  .sp-anim-fade-in {
    animation: sp-fade-in 0.2s ease-out both;
  }

  /* ---- Transition utilities ---- */

  .sp-panel {
    transform: translateX(110%);
    transition: transform 0.4s ${Re};
  }

  .sp-panel.sp-panel--open {
    transform: translateX(0);
  }

  .sp-radial-item {
    opacity: 0;
    pointer-events: none;
    transform: translate(0, 0) scale(0.8);
    transition:
      transform 0.35s ${$e},
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
    animation: sp-card-in 0.35s ${Re} both;
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
    animation: sp-badge-in 0.4s ${$e} both;
  }

  /* ---- Reduced motion ---- */

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

`;var ft="#0066ff",ar=/^#[0-9a-fA-F]{6}$/,ht=/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/,lr=/^#[0-9a-fA-F]{8}$/;function cr(r){if(ar.test(r))return r;let e=ht.test(r)?r.match(ht):null;return e?`#${e[1]}${e[1]}${e[2]}${e[2]}${e[3]}${e[3]}`:lr.test(r)?r.slice(0,7):(console.warn(`[ccm-feedback] Invalid accentColor "${r}" \u2014 only hex colors (#RGB, #RRGGBB, #RRGGBBAA) are supported. Using default.`),ft)}function dr(r,e){let t=Math.max(0,Math.round(parseInt(r.slice(1,3),16)*(1-e))),o=Math.max(0,Math.round(parseInt(r.slice(3,5),16)*(1-e))),n=Math.max(0,Math.round(parseInt(r.slice(5,7),16)*(1-e)));return`#${t.toString(16).padStart(2,"0")}${o.toString(16).padStart(2,"0")}${n.toString(16).padStart(2,"0")}`}function pr(){return typeof window>"u"?!1:window.matchMedia("(prefers-color-scheme: dark)").matches}function ur(r){return r==="dark"||r==="auto"&&pr()?"dark":"light"}function mt(r=ft,e){let t=cr(r),o=dr(t,.15);return ur(e)==="dark"?{accent:t,accentLight:t+"22",accentDark:o,accentGlow:t+"44",accentGradient:`linear-gradient(135deg, ${t}, ${o})`,bg:"#0f172a",bgHover:"#1e293b",text:"#f1f5f9",textSecondary:"#94a3b8",textTertiary:"#64748b",border:"#334155",shadow:"rgba(0, 0, 0, 0.3)",glassBg:"rgba(15, 23, 42, 0.78)",glassBgHeavy:"rgba(15, 23, 42, 0.88)",glassBorder:"rgba(51, 65, 85, 0.5)",glassBorderSubtle:"rgba(51, 65, 85, 0.3)",typeQuestion:"#60a5fa",typeChange:"#fbbf24",typeBug:"#f87171",typeOther:"#94a3b8",typeComment:"#9ca3af",typeQuestionBg:"rgba(59, 130, 246, 0.15)",typeChangeBg:"rgba(245, 158, 11, 0.15)",typeBugBg:"rgba(239, 68, 68, 0.15)",typeOtherBg:"rgba(100, 116, 139, 0.15)",typeCommentBg:"rgba(107, 114, 128, 0.15)"}:{accent:t,accentLight:t+"14",accentDark:o,accentGlow:t+"33",accentGradient:`linear-gradient(135deg, ${t}, ${o})`,bg:"#ffffff",bgHover:"#f8f9fb",text:"#0f172a",textSecondary:"#475569",textTertiary:"#64748b",border:"#e2e8f0",shadow:"rgba(0, 0, 0, 0.06)",glassBg:"rgba(255, 255, 255, 0.72)",glassBgHeavy:"rgba(255, 255, 255, 0.85)",glassBorder:"rgba(255, 255, 255, 0.35)",glassBorderSubtle:"rgba(255, 255, 255, 0.18)",typeQuestion:"#3b82f6",typeChange:"#b45309",typeBug:"#ef4444",typeOther:"#64748b",typeComment:"#6b7280",typeQuestionBg:"#eff6ff",typeChangeBg:"#fffbeb",typeBugBg:"#fef2f2",typeOtherBg:"#f8fafc",typeCommentBg:"#e5e7eb"}}function gt(r){return`
    --sp-accent: ${r.accent};
    --sp-accent-light: ${r.accentLight};
    --sp-accent-dark: ${r.accentDark};
    --sp-accent-glow: ${r.accentGlow};
    --sp-accent-gradient: ${r.accentGradient};
    --sp-bg: ${r.bg};
    --sp-bg-hover: ${r.bgHover};
    --sp-text: ${r.text};
    --sp-text-secondary: ${r.textSecondary};
    --sp-text-tertiary: ${r.textTertiary};
    --sp-border: ${r.border};
    --sp-shadow: ${r.shadow};
    --sp-glass-bg: ${r.glassBg};
    --sp-glass-bg-heavy: ${r.glassBgHeavy};
    --sp-glass-border: ${r.glassBorder};
    --sp-glass-border-subtle: ${r.glassBorderSubtle};
    --sp-type-question: ${r.typeQuestion};
    --sp-type-change: ${r.typeChange};
    --sp-type-bug: ${r.typeBug};
    --sp-type-other: ${r.typeOther};
    --sp-type-comment: ${r.typeComment};
    --sp-type-question-bg: ${r.typeQuestionBg};
    --sp-type-change-bg: ${r.typeChangeBg};
    --sp-type-bug-bg: ${r.typeBugBg};
    --sp-type-other-bg: ${r.typeOtherBg};
    --sp-type-comment-bg: ${r.typeCommentBg};
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
  `}function Ie(r){return`
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
      ${gt(r)}

      /* Identity modal \u2014 theme-aware backdrop + panel */
      --sp-identity-bg: ${r.glassBgHeavy};
      --sp-identity-overlay: ${r.bg==="#ffffff"?"rgba(15, 23, 42, 0.2)":"rgba(0, 0, 0, 0.4)"};

      /* Drawer panel width \u2014 referenced by .sp-panel and by the FAB shift
         modifier so a future host override can be a single token change. */
      --sp-panel-width: 400px;
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
      transition: right 0.25s ease;
    }

    .sp-fab--bottom-left {
      bottom: 24px;
      left: 24px;
    }

    /* PRO-68 \xA72 \u2014 FAB and radial slide left while the drawer is open so the
       open panel doesn't sit on top of them. The CSS custom property lets a
       future host theme override the panel width in one place. */
    .sp-fab--drawer-open {
      right: calc(var(--sp-panel-width, 400px) + 24px);
    }

    .sp-radial--drawer-open {
      right: calc(var(--sp-panel-width, 400px) + 24px);
      transition: right 0.25s ease;
    }

    @media (max-width: 480px) {
      /* Below 480px the drawer panel is full-width \u2014 hide the FAB entirely
         so the shifted modifier doesn't push it off-screen. Reviewer uses
         the drawer's own close button to dismiss. */
      .sp-fab--drawer-open,
      .sp-radial--drawer-open {
        display: none;
      }
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

    /* PRO-68 \xA75 \u2014 mirror modifier for the blue review badge sitting top-left. */
    .sp-fab-badge--left {
      right: auto;
      left: -4px;
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
      width: var(--sp-panel-width, 400px);
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

    ${ut}
  `}function B(r){let e=r.listForPath(window.location.pathname).filter(n=>!n.parentId),t=0,o=0;for(let n of e){let s=n.status??"todo";s==="todo"?t++:s==="review"&&o++}return{todo:t,review:o}}var Q=null;function vt(){return{destroy:()=>{},count:()=>0,export:()=>{}}}function _e(r){let e=r.debug?(...u)=>console.debug("[ccm-feedback]",...u):()=>{};if(Q)return e("initCcmFeedback() called more than once \u2014 returning existing instance"),Q;if(!r.projectName||typeof r.projectName!="string")return console.error("[ccm-feedback] Missing or invalid 'projectName' in config."),vt();if(window.innerWidth<768)return console.info(`[ccm-feedback] Widget not loaded: viewport < ${768}px.`),vt();e("Initializing",{projectName:r.projectName});let t=mt(r.accentColor,r.theme),o=st(),n=new pe,s=!!(r.supabaseUrl&&r.supabaseKey),i,a=null;s?(a=new ie({url:r.supabaseUrl,apiKey:r.supabaseKey,projectName:r.projectName,log:e,onChange:()=>{f.refresh(),v.updateCounts(B(i)),m.refreshIfOpen()},onReply:u=>n.emit("feedback:replied",u),onReplyDeleted:u=>n.emit("feedback:deleted",u),onUpdated:u=>n.emit("feedback:updated",u)}),i=a,e("Cloud mode enabled",{url:r.supabaseUrl})):(i=new oe(r.projectName),e("LocalStorage mode"));let l=document.createElement("ccm-feedback-widget");l.style.cssText=`position:fixed;z-index:${2147483647};`;let c=l.attachShadow({mode:"open"});if("adoptedStyleSheets"in ShadowRoot.prototype){let u=new CSSStyleSheet;u.replaceSync(Ie(t)),c.adoptedStyleSheets=[u]}else{let u=document.createElement("style");u.textContent=Ie(t),c.appendChild(u)}document.body.appendChild(l);let d=new le(t,o),b=u=>u===l||l.contains(u),f=new me(t,n,o,i,b),v=new ue(c,n,o,s),m=new de(c,n,o,i,t,u=>f.scrollToAndFlash(u),u=>f.setIncludeDone(u==="done"));n.on("navigator:open",()=>m.open());let E=()=>({cssSelector:"",xpath:"",textSnippet:"",elementTag:"",elementId:void 0,textPrefix:"",textSuffix:"",fingerprint:"",neighborText:""}),A=async u=>{let k=u.getBoundingClientRect(),y=await d.show(k);if(!y)return;let M=U(),H=ae(u),j=u.getBoundingClientRect(),_=ot(j,j),w=i.save({projectName:r.projectName,message:y.message,authorName:M,url:Oe(window.location.href),path:window.location.pathname,viewport:`${window.innerWidth}x${window.innerHeight}`,userAgent:navigator.userAgent,anchor:H,rect:_,status:y.status,kind:"target"});n.emit("feedback:saved",w),f.addOne(w),v.updateCounts(B(i)),e("Saved",w.id)},R=async u=>{let k=new DOMRect(u.x-window.scrollX,u.y-window.scrollY,0,0),y=await d.show(k);if(!y)return;let M=i.save({projectName:r.projectName,message:y.message,authorName:U(),url:Oe(window.location.href),path:window.location.pathname,viewport:`${window.innerWidth}x${window.innerHeight}`,userAgent:navigator.userAgent,anchor:E(),rect:{xPct:0,yPct:0,wPct:0,hPct:0},status:y.status,kind:"pin",pin:{x:u.x,y:u.y},capturedElements:u.elements});n.emit("feedback:saved",M),f.addOne(M),v.updateCounts(B(i)),e("Saved pin",M.id)},h=async u=>{let k=new DOMRect(u.x-window.scrollX,u.y-window.scrollY,u.w,u.h),y=await d.show(k);if(!y)return;let M=i.save({projectName:r.projectName,message:y.message,authorName:U(),url:Oe(window.location.href),path:window.location.pathname,viewport:`${window.innerWidth}x${window.innerHeight}`,userAgent:navigator.userAgent,anchor:E(),rect:{xPct:0,yPct:0,wPct:0,hPct:0},status:y.status,kind:"area",area:{x:u.x,y:u.y,w:u.w,h:u.h},capturedElements:u.elements});n.emit("feedback:saved",M),f.addOne(M),v.updateCounts(B(i)),e("Saved area",M.id)},x=new ge(t,n,o,A,b,f),C=new ee(t,n,o,R,b,f),P=new te(t,n,o,h,b,f);n.on("export:click",()=>{let u=i.list();if(u.length===0){console.info("[ccm-feedback] No annotations to export.");return}Me(r.projectName,u)}),n.on("copyUrl:click",()=>{let u=`${window.location.origin}/feedback?project=${encodeURIComponent(r.projectName)}`;it(u).then(k=>{k?console.info(`[ccm-feedback] ${o("toast.urlCopied")}: ${u}`):console.warn(`[ccm-feedback] ${o("toast.urlCopyFailed")} \u2014 ${u}`)})}),n.on("clear:click",()=>{i.list().length!==0&&window.confirm(o("fab.clearConfirm"))&&(i.clear(),f.refresh(),v.updateCounts({todo:0,review:0}),m.refreshIfOpen(),e("Cleared all annotations"))});let T=()=>{v.updateCounts(B(i)),m.refreshIfOpen()};if(n.on("feedback:saved",T),n.on("feedback:updated",T),n.on("feedback:deleted",T),n.on("feedback:replied",()=>m.refreshIfOpen()),f.refresh(),v.updateCounts(B(i)),a){let u=a;u.init().then(async()=>{f.refresh(),v.updateCounts(B(i)),await hr(u,r.projectName,e)>0&&(f.refresh(),v.updateCounts(B(i)))})}return Q={destroy:()=>{e("Destroying widget"),x.destroy(),C.destroy(),P.destroy(),f.destroy(),v.destroy(),d.destroy(),m.destroy(),n.removeAll(),l.remove(),Q=null},count:()=>i.list().length,export:()=>{let u=i.list();u.length!==0&&Me(r.projectName,u)}},Q}async function hr(r,e,t){let o=new Set([e,yt()]),n=0;for(let s of o){let i=`ccm-feedback:${s}`,a=null;try{a=localStorage.getItem(i)}catch{continue}if(!a)continue;let l=[];try{let d=JSON.parse(a);if(!Array.isArray(d)||d.length===0)continue;l=d.map(b=>({...b,projectName:e}))}catch{continue}t("Migrating",l.length,"local records from",i);let c=await r.migrateFromLocal(l);n+=c;try{localStorage.setItem(`${i}:migrated`,new Date().toISOString()),localStorage.removeItem(i)}catch{}}return n}function Oe(r){try{let e=new URL(r);for(let t of[...e.searchParams.keys()])/token|key|secret|auth|session|password|code/i.test(t)&&e.searchParams.delete(t);return e.toString()}catch{return r}}function fr(r){return!!(!r||r==="localhost"||r==="127.0.0.1"||r==="0.0.0.0"||r==="::1"||r.endsWith(".local")||r.endsWith(".localhost"))}function yt(){let{hostname:r,port:e}=window.location,o=(r||"site").replace(/[^a-z0-9]+/gi,"-").replace(/^-+|-+$/g,"").toLowerCase()||"site";return e?`${o}-${e}`:o}if(typeof window<"u"){window.CcmFeedback={init:_e};let r=document.currentScript;if(r){let e=r.dataset.project||yt(),t=fr(window.location.hostname),o={projectName:e,...r.dataset.accent?{accentColor:r.dataset.accent}:{},...r.dataset.theme?{theme:r.dataset.theme}:{},...r.dataset.debug==="true"?{debug:!0}:{},...!t&&r.dataset.supabaseUrl?{supabaseUrl:r.dataset.supabaseUrl}:{},...!t&&r.dataset.supabaseKey?{supabaseKey:r.dataset.supabaseKey}:{}},n=()=>_e(o);document.readyState==="loading"?document.addEventListener("DOMContentLoaded",n,{once:!0}):n()}}return Tt(mr);})();
//# sourceMappingURL=w.js.map

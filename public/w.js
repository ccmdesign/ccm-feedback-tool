/*! CCM Feedback MVP — https://github.com/ccmdesign/ccm-feedback-tool */
"use strict";var CcmFeedback=(()=>{var Ee=Object.defineProperty;var Mt=Object.getOwnPropertyDescriptor;var Lt=Object.getOwnPropertyNames;var Pt=Object.prototype.hasOwnProperty;var Rt=(r,e)=>{for(var t in e)Ee(r,t,{get:e[t],enumerable:!0})},$t=(r,e,t,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let o of Lt(e))!Pt.call(r,o)&&o!==t&&Ee(r,o,{get:()=>e[o],enumerable:!(n=Mt(e,o))||n.enumerable});return r};var It=r=>$t(Ee({},"__esModule",{value:!0}),r);var Ar={};Rt(Ar,{initCcmFeedback:()=>ze});var Xe="ccm-feedback:author",Nt="Anonymous";function Ot(){try{let r=localStorage.getItem(Xe);return r?.trim()?r.trim():null}catch{return null}}function _t(r){try{localStorage.setItem(Xe,r.trim())}catch{}}function Y(){let r=Ot();if(r)return r;let e=null;try{e=window.prompt("Your name (shown next to your comments):","")}catch{e=null}let t=e?.trim()||Nt;return _t(t),t}function $(r){let n=document.createRange().createContextualFragment(r).firstElementChild;if(!n||n.nodeName.toLowerCase()!=="svg")throw new Error("[ccm-feedback] Invalid SVG string");for(let o of[...n.attributes])o.name.startsWith("on")&&n.removeAttribute(o.name);for(let o of n.querySelectorAll("*"))for(let s of[...o.attributes])s.name.startsWith("on")&&o.removeAttribute(s.name);return n}function h(r,e){let t=document.createElement(r);if(e)for(let[n,o]of Object.entries(e))n==="class"?t.className=o:n==="style"?t.style.cssText=o:t.setAttribute(n,o);return t}function y(r,e){r.textContent=e}var Ce='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="12" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="10" r="1" fill="currentColor" stroke="none"/></svg>';var J='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',oe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',ie='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';var se='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';var Ye='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';var Ue='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>',Ke='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14"/><path d="M9 10V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V10l3 4v3H6v-3l3-4z"/></svg>',We='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="1"/><path d="M21 21h-4v-4"/><path d="M21 13v8h-8"/></svg>';var qe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',U='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';function Q(r){let{bus:e,t,colors:n,markers:o}=r,s=document.createElement("button");s.type="button",s.style.cssText=`
    height:34px;width:34px;padding:0;border-radius:9999px;
    border:1px solid ${n.border};background:${n.glassBg};
    color:${n.textTertiary};font-family:inherit;
    display:inline-flex;align-items:center;justify-content:center;
    cursor:pointer;
  `;let a=l=>{s.replaceChildren($(l?J:oe)),s.setAttribute("aria-label",t(l?"toolbar.toggleOn":"toolbar.toggleOff")),s.title=t(l?"toolbar.toggleOn":"toolbar.toggleOff"),s.style.color=l?n.textTertiary:n.accent,s.style.borderColor=l?n.border:n.accent};a(o.isVisible),s.addEventListener("click",l=>{l.preventDefault(),l.stopPropagation(),e.emit("annotations:toggle",!o.isVisible)});let i=e.on("annotations:toggle",l=>a(l));return{button:s,destroy:()=>i()}}var Ge=25;function Ve(r){let e={};for(let n of Array.from(r.attributes))e[n.name]=n.value;let t=r.getBoundingClientRect();return{tag:r.tagName.toLowerCase(),attributes:e,rect:{x:t.left,y:t.top,w:t.width,h:t.height}}}var ae=class{constructor(e,t,n,o,s,a){this.colors=e;this.bus=t;this.t=n;this.onCapture=o;this.shouldIgnoreElement=s;this.markers=a;this.overlay=null;this.toolbar=null;this.eyeHandle=null;this.isActive=!1;this.savedOverflow="";this.onKey=e=>{e.key==="Escape"&&(e.preventDefault(),this.deactivate())};this.onClick=e=>{if(e.preventDefault(),e.stopPropagation(),!this.overlay)return;let t=e.clientX,n=e.clientY;this.overlay.style.pointerEvents="none";let o=document.elementsFromPoint(t,n);this.overlay&&(this.overlay.style.pointerEvents="auto");let s=o.filter(l=>!this.shouldIgnoreElement(l)).filter(l=>l!==document.documentElement&&l!==document.body).slice(0,Ge).map(Ve),a=t+window.scrollX,i=n+window.scrollY;this.deactivate(),this.onCapture({x:a,y:i,elements:s})};this.unsubStart=this.bus.on("pin:start",()=>this.activate())}activate(){if(this.isActive)return;this.isActive=!0,this.savedOverflow=document.body.style.overflow,this.overlay=h("div",{style:`position:fixed;inset:0;z-index:${2147483646};background:rgba(15,23,42,0.04);cursor:crosshair;`}),this.overlay.setAttribute("data-ccm-coord-pin-overlay","true"),this.toolbar=h("div",{style:`
        position:fixed;top:0;left:0;right:0;z-index:${2147483647};
        height:52px;background:${this.colors.glassBg};
        backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
        border-bottom:1px solid ${this.colors.glassBorder};
        display:flex;align-items:center;justify-content:center;gap:16px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:14px;color:${this.colors.text};
      `});let e=h("span",{style:"font-weight:500;letter-spacing:-0.01em;"});y(e,this.t("coordPin.instruction"));let t=document.createElement("button");t.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;
    `,y(t,this.t("pin.cancel")),t.addEventListener("click",()=>this.deactivate()),this.eyeHandle=Q({bus:this.bus,t:this.t,colors:this.colors,markers:this.markers}),this.toolbar.appendChild(e),this.toolbar.appendChild(this.eyeHandle.button),this.toolbar.appendChild(t),this.overlay.addEventListener("click",this.onClick,!0),document.addEventListener("keydown",this.onKey),document.body.style.overflow="hidden",document.body.appendChild(this.overlay),document.body.appendChild(this.toolbar)}deactivate(){this.isActive&&(this.isActive=!1,this.overlay?.removeEventListener("click",this.onClick,!0),document.removeEventListener("keydown",this.onKey),document.body.style.overflow=this.savedOverflow,this.eyeHandle?.destroy(),this.eyeHandle=null,this.overlay?.remove(),this.toolbar?.remove(),this.overlay=null,this.toolbar=null,this.bus.emit("pin:end"))}destroy(){this.deactivate(),this.unsubStart()}},le=class{constructor(e,t,n,o,s,a){this.colors=e;this.bus=t;this.t=n;this.onCapture=o;this.shouldIgnoreElement=s;this.markers=a;this.overlay=null;this.toolbar=null;this.eyeHandle=null;this.rectEl=null;this.isActive=!1;this.savedOverflow="";this.dragStart=null;this.onKey=e=>{e.key==="Escape"&&(e.preventDefault(),this.deactivate())};this.onMouseDown=e=>{e.preventDefault(),e.stopPropagation(),this.dragStart={x:e.clientX,y:e.clientY},this.rectEl||(this.rectEl=h("div",{style:`
          position:fixed;z-index:${2147483647};
          border:2px dashed ${this.colors.accent};
          background:${this.colors.accent}1a;
          pointer-events:none;
        `}),document.body.appendChild(this.rectEl)),this.updateRect(e.clientX,e.clientY)};this.onMouseMove=e=>{this.dragStart&&this.updateRect(e.clientX,e.clientY)};this.onMouseUp=e=>{if(!this.dragStart)return;e.preventDefault(),e.stopPropagation();let t=this.dragStart,n=Math.min(t.x,e.clientX),o=Math.min(t.y,e.clientY),s=Math.abs(e.clientX-t.x),a=Math.abs(e.clientY-t.y);if(this.dragStart=null,s<4||a<4){this.rectEl?.remove(),this.rectEl=null;return}let i=this.collectElements(n,o,s,a),l=n+window.scrollX,c=o+window.scrollY;this.deactivate(),this.onCapture({x:l,y:c,w:s,h:a,elements:i})};this.unsubStart=this.bus.on("area:start",()=>this.activate())}activate(){if(this.isActive)return;this.isActive=!0,this.savedOverflow=document.body.style.overflow,this.overlay=h("div",{style:`position:fixed;inset:0;z-index:${2147483646};background:rgba(15,23,42,0.04);cursor:crosshair;`}),this.overlay.setAttribute("data-ccm-area-overlay","true"),this.toolbar=h("div",{style:`
        position:fixed;top:0;left:0;right:0;z-index:${2147483647};
        height:52px;background:${this.colors.glassBg};
        backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
        border-bottom:1px solid ${this.colors.glassBorder};
        display:flex;align-items:center;justify-content:center;gap:16px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:14px;color:${this.colors.text};
      `});let e=h("span",{style:"font-weight:500;letter-spacing:-0.01em;"});y(e,this.t("area.instruction"));let t=document.createElement("button");t.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;
    `,y(t,this.t("pin.cancel")),t.addEventListener("click",()=>this.deactivate()),this.eyeHandle=Q({bus:this.bus,t:this.t,colors:this.colors,markers:this.markers}),this.toolbar.appendChild(e),this.toolbar.appendChild(this.eyeHandle.button),this.toolbar.appendChild(t),this.overlay.addEventListener("mousedown",this.onMouseDown,!0),this.overlay.addEventListener("mousemove",this.onMouseMove,!0),this.overlay.addEventListener("mouseup",this.onMouseUp,!0),document.addEventListener("keydown",this.onKey),document.body.style.overflow="hidden",document.body.appendChild(this.overlay),document.body.appendChild(this.toolbar)}deactivate(){this.isActive&&(this.isActive=!1,this.overlay?.removeEventListener("mousedown",this.onMouseDown,!0),this.overlay?.removeEventListener("mousemove",this.onMouseMove,!0),this.overlay?.removeEventListener("mouseup",this.onMouseUp,!0),document.removeEventListener("keydown",this.onKey),document.body.style.overflow=this.savedOverflow,this.eyeHandle?.destroy(),this.eyeHandle=null,this.overlay?.remove(),this.toolbar?.remove(),this.rectEl?.remove(),this.overlay=null,this.toolbar=null,this.rectEl=null,this.dragStart=null,this.bus.emit("area:end"))}updateRect(e,t){if(!this.rectEl||!this.dragStart)return;let n=Math.min(this.dragStart.x,e),o=Math.min(this.dragStart.y,t),s=Math.abs(e-this.dragStart.x),a=Math.abs(t-this.dragStart.y);this.rectEl.style.left=`${n}px`,this.rectEl.style.top=`${o}px`,this.rectEl.style.width=`${s}px`,this.rectEl.style.height=`${a}px`}collectElements(e,t,n,o){let s=e+n,a=t+o,i=document.body.getElementsByTagName("*"),l=[];for(let c of Array.from(i)){if(l.length>=Ge)break;if(this.shouldIgnoreElement(c)||c===document.documentElement||c===document.body)continue;let d=c.getBoundingClientRect();d.width===0||d.height===0||d.right<e||d.left>s||d.bottom<t||d.top>a||l.push(Ve(c))}return l}destroy(){this.deactivate(),this.unsubStart()}};var ce=class{constructor(e){this.opts=e;this.ws=null;this.destroyed=!1;this.heartbeat=null;this.reconnectAttempt=0;this.refCounter=1;this.topic=`realtime:${e.schema??"public"}:${e.table}`,this.log=e.log??(()=>{})}connect(){if(this.destroyed)return;let e=`${this.opts.url.replace(/^http/,"ws").replace(/\/$/,"")}/realtime/v1/websocket?apikey=${encodeURIComponent(this.opts.apiKey)}&vsn=1.0.0`,t;try{t=new WebSocket(e)}catch(n){this.log("realtime ws constructor error",n),this.scheduleReconnect();return}this.ws=t,t.addEventListener("open",()=>{this.reconnectAttempt=0,this.send({topic:this.topic,event:"phx_join",payload:{config:{postgres_changes:[{event:"*",schema:this.opts.schema??"public",table:this.opts.table,filter:this.opts.filter}]},access_token:this.opts.apiKey},ref:String(this.refCounter++)}),this.heartbeat=setInterval(()=>{this.send({topic:"phoenix",event:"heartbeat",payload:{},ref:String(this.refCounter++)})},25e3),this.log("realtime connected")}),t.addEventListener("message",n=>this.handleMessage(n.data)),t.addEventListener("close",()=>{this.cleanupSocket(),this.destroyed||this.scheduleReconnect()}),t.addEventListener("error",n=>{this.log("realtime ws error",n)})}cleanupSocket(){this.heartbeat&&(clearInterval(this.heartbeat),this.heartbeat=null),this.ws=null}scheduleReconnect(){let e=Math.min(1e3*2**this.reconnectAttempt,3e4);this.reconnectAttempt+=1,setTimeout(()=>{this.destroyed||this.connect()},e)}send(e){if(!(!this.ws||this.ws.readyState!==WebSocket.OPEN))try{this.ws.send(JSON.stringify(e))}catch(t){this.log("realtime send error",t)}}handleMessage(e){if(typeof e!="string")return;let t;try{t=JSON.parse(e)}catch{return}if(t.event!=="postgres_changes")return;let o=t.payload?.data;if(!o)return;let s=o.type,a=o.record??o.old_record;a&&(s==="INSERT"?this.opts.onInsert(a):s==="UPDATE"?this.opts.onUpdate(a):s==="DELETE"&&this.opts.onDelete(a))}destroy(){if(this.destroyed=!0,this.cleanupSocket(),this.ws)try{this.ws.close()}catch{}}};function Ae(r){return`ccm-feedback:${r}`}function Te(r){return`ccm-feedback:${r}:seq-hwm`}function Ze(r){try{let e=localStorage.getItem(Te(r));if(!e)return 1;let t=JSON.parse(e);return typeof t=="number"&&t>=1?Math.floor(t):1}catch{return 1}}function Se(r,e){try{localStorage.setItem(Te(r),JSON.stringify(e))}catch{}}function I(r){return!r||r==="/"?"/":r.endsWith("/")?r.slice(0,-1):r}function Je(){try{return crypto.randomUUID()}catch{return`${Date.now()}-${Math.random().toString(36).slice(2)}`}}function H(r){try{let e=localStorage.getItem(Ae(r));if(!e)return[];let t=JSON.parse(e);return Array.isArray(t)?t:[]}catch{return[]}}function K(r,e){try{localStorage.setItem(Ae(r),JSON.stringify(e))}catch{}}function Dt(r){let e=r.filter(s=>!s.parentId);if(e.every(s=>typeof s.sequenceNumber=="number"))return!1;let t=[...e].sort((s,a)=>{let i=new Date(s.createdAt).getTime(),l=new Date(a.createdAt).getTime();return i!==l?i-l:s.id.localeCompare(a.id)}),n=t.reduce((s,a)=>typeof a.sequenceNumber=="number"?Math.max(s,a.sequenceNumber):s,0),o=!1;for(let s of t)typeof s.sequenceNumber!="number"&&(n+=1,s.sequenceNumber=n,o=!0);return o}function Me(r,e){let t={id:Je(),projectName:r.projectName,message:r.message,authorName:r.authorName,url:r.url,path:I(r.path),viewport:r.viewport,userAgent:r.userAgent,createdAt:new Date().toISOString(),cssSelector:r.anchor.cssSelector,xpath:r.anchor.xpath,textSnippet:r.anchor.textSnippet,elementTag:r.anchor.elementTag,elementId:r.anchor.elementId,textPrefix:r.anchor.textPrefix,textSuffix:r.anchor.textSuffix,fingerprint:r.anchor.fingerprint,neighborText:r.anchor.neighborText,xPct:r.rect.xPct,yPct:r.rect.yPct,wPct:r.rect.wPct,hPct:r.rect.hPct,status:r.status??"todo",kind:r.kind??"target"};return typeof e=="number"&&(t.sequenceNumber=e),r.pin&&(t.pinX=r.pin.x,t.pinY=r.pin.y),r.area&&(t.areaX=r.area.x,t.areaY=r.area.y,t.areaW=r.area.w,t.areaH=r.area.h),r.capturedElements&&r.capturedElements.length>0&&(t.capturedElements=r.capturedElements),t}function Le(r){return{id:Je(),projectName:r.projectName,message:r.message,authorName:r.authorName,url:r.url,path:I(r.path),viewport:r.viewport,userAgent:r.userAgent,createdAt:new Date().toISOString(),cssSelector:"",xpath:"",textSnippet:"",elementTag:"",elementId:void 0,textPrefix:"",textSuffix:"",fingerprint:"",neighborText:"",xPct:0,yPct:0,wPct:0,hPct:0,parentId:r.parentId}}var de=class{constructor(e){this.projectName=e;let t=H(this.projectName);Dt(t)&&K(this.projectName,t);let n=(()=>{try{return localStorage.getItem(Te(this.projectName))}catch{return null}})(),o=t.reduce((s,a)=>!a.parentId&&typeof a.sequenceNumber=="number"&&a.sequenceNumber>s?a.sequenceNumber:s,0);if(n===null)Se(this.projectName,o+1);else{let s=Ze(this.projectName),a=o+1;s<a&&Se(this.projectName,a)}}list(){return H(this.projectName).filter(e=>!e.parentId)}listAll(){return H(this.projectName)}listForPath(e){let t=I(e);return H(this.projectName).filter(n=>!n.parentId&&I(n.path)===t)}save(e){let t=H(this.projectName),n=Ze(this.projectName),o=Me(e,n);return Se(this.projectName,n+1),t.unshift(o),K(this.projectName,t),o}delete(e){let t=H(this.projectName);if(t.findIndex(s=>s.id===e)===-1)return!1;let o=t.filter(s=>s.id!==e&&s.parentId!==e);return K(this.projectName,o),!0}clear(){localStorage.removeItem(Ae(this.projectName))}updateStatus(e,t){let n=H(this.projectName),o=n.find(s=>s.id===e);return o?(o.status=t,K(this.projectName,n),!0):!1}updateAnchor(e,t){let n=H(this.projectName),o=n.find(s=>s.id===e);return o?(o.cssSelector=t.anchor.cssSelector,o.xpath=t.anchor.xpath,o.textSnippet=t.anchor.textSnippet,o.elementTag=t.anchor.elementTag,o.elementId=t.anchor.elementId,o.textPrefix=t.anchor.textPrefix,o.textSuffix=t.anchor.textSuffix,o.fingerprint=t.anchor.fingerprint,o.neighborText=t.anchor.neighborText,o.xPct=t.rect.xPct,o.yPct=t.rect.yPct,o.wPct=t.rect.wPct,o.hPct=t.rect.hPct,o.kind=t.kind,t.pin?(o.pinX=t.pin.x,o.pinY=t.pin.y):(delete o.pinX,delete o.pinY),t.area?(o.areaX=t.area.x,o.areaY=t.area.y,o.areaW=t.area.w,o.areaH=t.area.h):(delete o.areaX,delete o.areaY,delete o.areaW,delete o.areaH),K(this.projectName,n),!0):!1}listReplies(e){return H(this.projectName).filter(t=>t.parentId===e).sort((t,n)=>t.createdAt.localeCompare(n.createdAt))}addReply(e){let t=H(this.projectName),n=Le(e);return t.push(n),K(this.projectName,t),n}};var Qe="ccm_widget_annotations";function Pe(r){if(!r)return null;let e=r.lastIndexOf("/");if(e===-1)return null;let t=r.slice(e+1).trim();if(t===""||t==="*")return null;let n=Number(t);return Number.isFinite(n)?n:null}function ee(r){let e={id:r.id,projectName:r.project_name,message:r.message,authorName:r.author_name,url:r.url,path:r.path,viewport:r.viewport,userAgent:r.user_agent,cssSelector:r.css_selector,xpath:r.xpath,textSnippet:r.text_snippet,elementTag:r.element_tag,elementId:r.element_id??void 0,textPrefix:r.text_prefix,textSuffix:r.text_suffix,fingerprint:r.fingerprint,neighborText:r.neighbor_text,xPct:r.x_pct,yPct:r.y_pct,wPct:r.w_pct,hPct:r.h_pct,createdAt:r.created_at,status:r.status??"todo",kind:r.kind??"target"};return r.pin_x!=null&&r.pin_y!=null&&(e.pinX=r.pin_x,e.pinY=r.pin_y),r.area_x!=null&&r.area_y!=null&&r.area_w!=null&&r.area_h!=null&&(e.areaX=r.area_x,e.areaY=r.area_y,e.areaW=r.area_w,e.areaH=r.area_h),r.captured_elements&&Array.isArray(r.captured_elements)&&(e.capturedElements=r.captured_elements),r.parent_id&&(e.parentId=r.parent_id),typeof r.sequence_number=="number"&&(e.sequenceNumber=r.sequence_number),e}function et(r){let e={id:r.id,project_name:r.projectName,message:r.message,author_name:r.authorName,url:r.url,path:r.path,viewport:r.viewport,user_agent:r.userAgent,css_selector:r.cssSelector,xpath:r.xpath,text_snippet:r.textSnippet,element_tag:r.elementTag,element_id:r.elementId??null,text_prefix:r.textPrefix,text_suffix:r.textSuffix,fingerprint:r.fingerprint,neighbor_text:r.neighborText,x_pct:r.xPct,y_pct:r.yPct,w_pct:r.wPct,h_pct:r.hPct,created_at:r.createdAt};return r.status&&(e.status=r.status),r.kind&&(e.kind=r.kind),r.pinX!=null&&(e.pin_x=r.pinX),r.pinY!=null&&(e.pin_y=r.pinY),r.areaX!=null&&(e.area_x=r.areaX),r.areaY!=null&&(e.area_y=r.areaY),r.areaW!=null&&(e.area_w=r.areaW),r.areaH!=null&&(e.area_h=r.areaH),r.capturedElements&&(e.captured_elements=r.capturedElements),r.parentId&&(e.parent_id=r.parentId),typeof r.sequenceNumber=="number"&&(e.sequence_number=r.sequenceNumber),e}var pe=class{constructor(e){this.cache=[];this.realtime=null;this.projectName=e.projectName,this.url=e.url,this.apiKey=e.apiKey,this.onChange=e.onChange??(()=>{}),this.onReply=e.onReply??(()=>{}),this.onReplyDeleted=e.onReplyDeleted??(()=>{}),this.onUpdated=e.onUpdated??(()=>{}),this.log=e.log??(()=>{}),this.endpoint=`${e.url.replace(/\/$/,"")}/rest/v1/${Qe}`,this.headers={apikey:e.apiKey,Authorization:`Bearer ${e.apiKey}`,"Content-Type":"application/json",Prefer:"return=representation"}}async init(){try{let e=`${this.endpoint}?project_name=eq.${encodeURIComponent(this.projectName)}&order=created_at.desc`,t=await fetch(e,{headers:this.headers});if(!t.ok){let o=await t.text();console.warn(`[ccm-feedback] cloud fetch failed: ${t.status} ${o}`);return}let n=await t.json();this.cache=n.map(ee),this.log("cloud loaded",this.cache.length,"annotations"),this.startRealtime()}catch(e){console.warn("[ccm-feedback] cloud fetch error",e)}}startRealtime(){this.realtime||(this.realtime=new ce({url:this.url,apiKey:this.apiKey,table:Qe,filter:`project_name=eq.${this.projectName}`,log:this.log,onInsert:e=>{let t=e,n=this.cache.findIndex(s=>s.id===t.id);if(n!==-1){let s=this.cache[n];if(s&&typeof s.sequenceNumber!="number"&&typeof t.sequence_number=="number"){let a=ee(t);this.cache[n]=a,a.parentId||this.onChange()}return}let o=ee(t);if(o.parentId){this.cache.push(o),this.onReply(o);return}this.cache.unshift(o),this.onChange()},onUpdate:e=>{let n=ee(e),o=this.cache.findIndex(s=>s.id===n.id);o===-1?this.cache.unshift(n):this.cache[o]=n,!n.parentId&&(this.onUpdated(n),this.onChange())},onDelete:e=>{let t=e.id;if(!t)return;let n=this.cache.findIndex(s=>s.id===t);if(n===-1)return;let o=this.cache[n];if(this.cache.splice(n,1),o?.parentId){this.onReplyDeleted(t);return}this.onChange()}}),this.realtime.connect())}destroy(){this.realtime?.destroy(),this.realtime=null}list(){return this.cache.filter(e=>!e.parentId)}listAll(){return[...this.cache]}listForPath(e){let t=I(e);return this.cache.filter(n=>!n.parentId&&I(n.path)===t)}save(e){let t=Me(e,void 0);return this.cache.unshift(t),this.pushInsert(t),t}updateStatus(e,t){let n=this.cache.find(o=>o.id===e);return n?(n.status=t,this.pushUpdate(e,{status:t}),!0):!1}updateAnchor(e,t){let n=this.cache.find(s=>s.id===e);if(!n)return!1;n.cssSelector=t.anchor.cssSelector,n.xpath=t.anchor.xpath,n.textSnippet=t.anchor.textSnippet,n.elementTag=t.anchor.elementTag,n.elementId=t.anchor.elementId,n.textPrefix=t.anchor.textPrefix,n.textSuffix=t.anchor.textSuffix,n.fingerprint=t.anchor.fingerprint,n.neighborText=t.anchor.neighborText,n.xPct=t.rect.xPct,n.yPct=t.rect.yPct,n.wPct=t.rect.wPct,n.hPct=t.rect.hPct,n.kind=t.kind,t.pin?(n.pinX=t.pin.x,n.pinY=t.pin.y):(delete n.pinX,delete n.pinY),t.area?(n.areaX=t.area.x,n.areaY=t.area.y,n.areaW=t.area.w,n.areaH=t.area.h):(delete n.areaX,delete n.areaY,delete n.areaW,delete n.areaH);let o={css_selector:t.anchor.cssSelector,xpath:t.anchor.xpath,text_snippet:t.anchor.textSnippet,element_tag:t.anchor.elementTag,element_id:t.anchor.elementId??null,text_prefix:t.anchor.textPrefix,text_suffix:t.anchor.textSuffix,fingerprint:t.anchor.fingerprint,neighbor_text:t.anchor.neighborText,x_pct:t.rect.xPct,y_pct:t.rect.yPct,w_pct:t.rect.wPct,h_pct:t.rect.hPct,kind:t.kind,pin_x:t.pin?t.pin.x:null,pin_y:t.pin?t.pin.y:null,area_x:t.area?t.area.x:null,area_y:t.area?t.area.y:null,area_w:t.area?t.area.w:null,area_h:t.area?t.area.h:null};return this.pushUpdate(e,o),!0}delete(e){return this.cache.findIndex(n=>n.id===e)===-1?!1:(this.cache=this.cache.filter(n=>n.id!==e&&n.parentId!==e),this.pushDelete(e),!0)}clear(){let e=this.cache.map(t=>t.id);this.cache=[],this.pushClear(e)}listReplies(e){return this.cache.filter(t=>t.parentId===e).sort((t,n)=>t.createdAt.localeCompare(n.createdAt))}addReply(e){let t=Le(e);return this.cache.push(t),this.pushInsert(t),t}async migrateFromLocal(e){if(e.length===0)return{ok:!0,inserted:0};let t=new Set(this.cache.map(o=>o.id)),n=e.filter(o=>!t.has(o.id));if(n.length===0)return{ok:!0,inserted:0};try{let o=n.map(i=>et(i)),s=await fetch(this.endpoint,{method:"POST",headers:{...this.headers,Prefer:"return=representation,resolution=ignore-duplicates"},body:JSON.stringify(o)});if(!s.ok){let i=await s.text();return console.warn(`[ccm-feedback] cloud migrate failed: ${s.status} ${i}`),{ok:!1,inserted:0}}let a=await s.json();for(let i of a){let l=ee(i);this.cache.some(c=>c.id===l.id)||this.cache.unshift(l)}return this.log("cloud migrated",a.length,"of",n.length,"local annotations"),this.onChange(),{ok:!0,inserted:a.length}}catch(o){return console.warn("[ccm-feedback] cloud migrate error",o),{ok:!1,inserted:0}}}async pushInsert(e){try{let t=await fetch(this.endpoint,{method:"POST",headers:this.headers,body:JSON.stringify(et(e))});if(!t.ok){let n=await t.text();console.warn(`[ccm-feedback] cloud insert failed: ${t.status} ${n}`)}}catch(t){console.warn("[ccm-feedback] cloud insert error",t)}}async pushUpdate(e,t){try{let n=await fetch(`${this.endpoint}?id=eq.${encodeURIComponent(e)}`,{method:"PATCH",headers:{...this.headers,Prefer:"return=representation, count=exact"},body:JSON.stringify(t)});if(!n.ok){let s=await n.text();console.warn(`[ccm-feedback] cloud update failed: ${n.status} ${s}`);return}Pe(n.headers.get("content-range"))===0&&console.error(`[ccm-feedback] cloud update no-op for id=${e} \u2014 possible RLS misconfiguration or stale id`)}catch(n){console.warn("[ccm-feedback] cloud update error",n)}}async pushDelete(e){try{let t=await fetch(`${this.endpoint}?id=eq.${encodeURIComponent(e)}`,{method:"DELETE",headers:{...this.headers,Prefer:"return=representation, count=exact"}});if(!t.ok){let o=await t.text();console.warn(`[ccm-feedback] cloud delete failed: ${t.status} ${o}`);return}Pe(t.headers.get("content-range"))===0&&console.error(`[ccm-feedback] cloud delete no-op for id=${e} \u2014 possible RLS misconfiguration or stale id`)}catch(t){console.warn("[ccm-feedback] cloud delete error",t)}}async pushClear(e){if(e.length!==0)try{let t=e.map(s=>`"${s}"`).join(","),n=await fetch(`${this.endpoint}?id=in.(${t})`,{method:"DELETE",headers:{...this.headers,Prefer:"return=representation, count=exact"}});if(!n.ok){let s=await n.text();console.warn(`[ccm-feedback] cloud clear failed: ${n.status} ${s}`);return}let o=Pe(n.headers.get("content-range"));o!==null&&o<e.length&&console.warn(`[ccm-feedback] cloud clear partial: expected ${e.length} deleted ${o}`)}catch(t){console.warn("[ccm-feedback] cloud clear error",t)}}};var Bt=new Set(["role","name","aria-label","rel","href"]);function Ht(r,e){let t=Bt.has(r);t||(t=r.startsWith("data-")&&te(r));let n=te(e)&&e.length<100;return n||(n=e.startsWith("#")&&te(e.slice(1))),t&&n}function Ft(r){return te(r)}function jt(r){return te(r)}function zt(r){return!0}function rt(r,e){if(r.nodeType!==Node.ELEMENT_NODE)throw new Error("Can't generate CSS selector for non-element node type.");if(r.tagName.toLowerCase()==="html")return"html";let t={root:document.body,idName:Ft,className:jt,tagName:zt,attr:Ht,timeoutMs:1e3,seedMinLength:3,optimizedMinLength:2,maxNumberOfPathChecks:1/0},n=new Date,o={...t,...e},s=Wt(o.root,t),a,i=0;for(let c of Xt(r,o,s)){if(new Date().getTime()-n.getTime()>o.timeoutMs||i>=o.maxNumberOfPathChecks){let m=Ut(r,s);if(!m)throw new Error(`Timeout: Can't find a unique selector after ${o.timeoutMs}ms`);return re(m)}if(i++,Ie(c,s)){a=c;break}}if(!a)throw new Error("Selector was not found.");let l=[...it(a,r,o,s,n)];return l.sort(Re),l.length>0?re(l[0]):re(a)}function*Xt(r,e,t){let n=[],o=[],s=r,a=0;for(;s&&s!==t;){let i=Yt(s,e);for(let l of i)l.level=a;if(n.push(i),s=s.parentElement,a++,o.push(...ot(n)),a>=e.seedMinLength){o.sort(Re);for(let l of o)yield l;o=[]}}o.sort(Re);for(let i of o)yield i}function te(r){if(/^[a-z\-]{3,}$/i.test(r)){let e=r.split(/-|[A-Z]/);for(let t of e)if(t.length<=2||/[^aeiou]{4,}/i.test(t))return!1;return!0}return!1}function Yt(r,e){let t=[],n=r.getAttribute("id");n&&e.idName(n)&&t.push({name:"#"+CSS.escape(n),penalty:0});for(let a=0;a<r.classList.length;a++){let i=r.classList[a];e.className(i)&&t.push({name:"."+CSS.escape(i),penalty:1})}for(let a=0;a<r.attributes.length;a++){let i=r.attributes[a];e.attr(i.name,i.value)&&t.push({name:`[${CSS.escape(i.name)}="${CSS.escape(i.value)}"]`,penalty:2})}let o=r.tagName.toLowerCase();if(e.tagName(o)){t.push({name:o,penalty:5});let a=$e(r,o);a!==void 0&&t.push({name:nt(o,a),penalty:10})}let s=$e(r);return s!==void 0&&t.push({name:Kt(o,s),penalty:50}),t}function re(r){let e=r[0],t=e.name;for(let n=1;n<r.length;n++){let o=r[n].level||0;e.level===o-1?t=`${r[n].name} > ${t}`:t=`${r[n].name} ${t}`,e=r[n]}return t}function tt(r){return r.map(e=>e.penalty).reduce((e,t)=>e+t,0)}function Re(r,e){return tt(r)-tt(e)}function $e(r,e){let t=r.parentNode;if(!t)return;let n=t.firstChild;if(!n)return;let o=0;for(;n&&(n.nodeType===Node.ELEMENT_NODE&&(e===void 0||n.tagName.toLowerCase()===e)&&o++,n!==r);)n=n.nextSibling;return o}function Ut(r,e){let t=0,n=r,o=[];for(;n&&n!==e;){let s=n.tagName.toLowerCase(),a=$e(n,s);if(a===void 0)return;o.push({name:nt(s,a),penalty:NaN,level:t}),n=n.parentElement,t++}if(Ie(o,e))return o}function Kt(r,e){return r==="html"?"html":`${r}:nth-child(${e})`}function nt(r,e){return r==="html"?"html":`${r}:nth-of-type(${e})`}function*ot(r,e=[]){if(r.length>0)for(let t of r[0])yield*ot(r.slice(1,r.length),e.concat(t));else yield e}function Wt(r,e){return r.nodeType===Node.DOCUMENT_NODE?r:r===e.root?r.ownerDocument:r}function Ie(r,e){let t=re(r);switch(e.querySelectorAll(t).length){case 0:throw new Error(`Can't select any node with this selector: ${t}`);case 1:return!0;default:return!1}}function*it(r,e,t,n,o){if(r.length>2&&r.length>t.optimizedMinLength)for(let s=1;s<r.length-1;s++){if(new Date().getTime()-o.getTime()>t.timeoutMs)return;let i=[...r];i.splice(s,1),Ie(i,n)&&n.querySelector(re(i))===e&&(yield i,yield*it(i,e,t,n,o))}}var qt=["role","aria-label","type","name","href","src","data-testid","data-id"];function Gt(r){let e=5381;for(let t=0;t<r.length;t++)e=(e<<5)+e+r.charCodeAt(t)|0;return(e>>>0).toString(36)}function Ne(r){let e=r.children.length,t=0,n=r.parentElement;if(n)for(let a of n.children){if(a===r)break;a.tagName===r.tagName&&t++}let o=[];for(let a of qt){let i=r.getAttribute(a);i&&o.push(`${a}=${i}`)}let s=o.length>0?Gt(o.join(",")):"0";return`${e}:${t}:${s}`}function st(r,e){let t=e.split(":");if(t.length!==3)return 0;let[n,o,s]=t,a=Number(n),i=Number(o);if(Number.isNaN(a)||Number.isNaN(i))return 0;let l=Ne(r),[c,d,m]=l.split(":"),f=0,b=Math.abs(Number(c)-a);b===0?f+=.2:b<=2?f+=.1:b<=5&&(f+=.03);let g=Math.abs(Number(d)-i);return g===0?f+=.4:g===1?f+=.2:g<=3&&(f+=.08),m===s&&(f+=.4),f}function W(r,e){let t=e==="before"?"previousElementSibling":"nextElementSibling",n=r[t],o=3;for(;n&&o>0;){let s=n.textContent?.trim();if(s)return e==="before"?s.slice(-32):s.slice(0,32);n=n[t],o--}return""}function ue(r){let e=r.previousElementSibling?.textContent?.trim().slice(0,40)??"",t=r.nextElementSibling?.textContent?.trim().slice(0,40)??"";return[e,t].filter(Boolean).join(" | ")}function at(r){if(r.id){let n=r.id.includes("'")?`concat('${r.id.replace(/'/g,`',"'",'`)}')`:`'${r.id}'`;return`//${r.localName}[@id=${n}]`}let e=[],t=r;for(;t&&t!==document.body&&e.length<6;){let n=t.localName,o=t.parentElement;if(t.id){let a=t.id.includes("'")?`concat('${t.id.replace(/'/g,`',"'",'`)}')`:`'${t.id}'`;return e.unshift(`/${n}[@id=${a}]`),"/"+e.join("")}let s=1;if(o)for(let a of o.children){if(a===t)break;a.localName===n&&s++}e.unshift(`/${n}[${s}]`),t=o}return"/html/body"+e.join("")}function he(r){let e=rt(r,{className:c=>!/^(css|sc|emotion|styled)-/.test(c)&&!/^[a-z]{1,3}[A-Za-z0-9]{4,8}$/.test(c),attr:c=>["data-testid","data-id","role","aria-label"].includes(c),idName:c=>!c.startsWith("radix-")&&!/^:r[0-9]+:$/.test(c),seedMinLength:3,optimizedMinLength:2}),t=at(r),o=(r.textContent?.trim()??"").slice(0,120),s=W(r,"before"),a=W(r,"after"),i=Ne(r),l=ue(r);return{cssSelector:e,xpath:t,textSnippet:o,textPrefix:s,textSuffix:a,fingerprint:i,neighborText:l,elementTag:r.tagName,elementId:r.id||void 0}}function lt(r,e=document.documentElement){let t=r.x+r.width/2,n=r.y+r.height/2,o=document.elementFromPoint(t,n);if(!o||o===e)return document.body;let s=o,a=o;for(;a&&a!==document.body;){let i=a.getBoundingClientRect();if(i.left<=r.x&&i.top<=r.y&&i.right>=r.x+r.width&&i.bottom>=r.y+r.height){s=a;break}a=a.parentElement}return s}function ct(r,e){return e.width<=0||e.height<=0?{xPct:0,yPct:0,wPct:1,hPct:1}:{xPct:(r.x-e.x)/e.width,yPct:(r.y-e.y)/e.height,wPct:r.width/e.width,hPct:r.height/e.height}}function Vt(r,e,t){let n=new Blob([r],{type:t}),o=URL.createObjectURL(n),s=document.createElement("a");s.href=o,s.download=e,s.style.display="none",document.body.appendChild(s),s.click(),requestAnimationFrame(()=>{URL.revokeObjectURL(o),s.remove()})}async function q(r){try{if(navigator.clipboard?.writeText)return await navigator.clipboard.writeText(r),!0}catch{}try{let e=document.createElement("textarea");e.value=r,e.style.cssText="position:fixed;top:-9999px;left:-9999px;opacity:0;",document.body.appendChild(e),e.select();let t=document.execCommand("copy");return e.remove(),t}catch{return!1}}function Oe(r,e){let t=new Date().toISOString().slice(0,10),n=r.replace(/[^a-zA-Z0-9_-]/g,"_"),o={projectName:r,exportedAt:new Date().toISOString(),count:e.length,annotations:e};Vt(JSON.stringify(o,null,2),`ccm-feedback-${n}-${t}.json`,"application/json;charset=utf-8")}var O=["todo","review","done","question"];var D={todo:{fg:"#a16207",bg:"#fef3c7",border:"#f59e0b"},review:{fg:"#1d4ed8",bg:"#dbeafe",border:"#3b82f6"},done:{fg:"#15803d",bg:"#dcfce7",border:"#22c55e"},question:{fg:"#6d28d9",bg:"#ede9fe",border:"#8b5cf6"}},fe=class{constructor(e,t){this.colors=e;this.t=t;this.resolve=null;this.previouslyFocused=null;this.onKeydownTrap=null;this.status="todo";this.statusButtons=new Map;this.root=h("div",{style:`
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
    `,this.textarea.placeholder=this.t("popup.placeholder"),this.textarea.maxLength=5e3,this.textarea.setAttribute("aria-label",this.t("popup.textareaAria")),this.textarea.addEventListener("focus",()=>{this.textarea.style.borderColor=this.colors.accent,this.textarea.style.boxShadow=`0 0 0 3px ${this.colors.accent}14`,this.textarea.style.background=this.colors.bg}),this.textarea.addEventListener("blur",()=>{this.textarea.style.borderColor=this.colors.border,this.textarea.style.boxShadow="none",this.textarea.style.background=this.colors.glassBgHeavy}),this.textarea.addEventListener("input",()=>this.updateSubmitState()),this.textarea.addEventListener("keydown",c=>{c.key==="Enter"&&(c.ctrlKey||c.metaKey)?(c.preventDefault(),this.submit()):c.key==="Escape"&&this.cancel()});let n=h("div",{style:`font-size:11px;color:${this.colors.textTertiary};text-align:right;margin-top:6px;letter-spacing:0.01em;`}),o=/Macintosh|Mac OS X/i.test(navigator.userAgent);y(n,o?this.t("popup.submitHintMac"):this.t("popup.submitHintOther"));let s=h("div",{style:"display:flex;justify-content:flex-end;gap:8px;margin-top:12px;"}),a=document.createElement("button");a.type="button",a.style.cssText=`
      height:34px;padding:0 16px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;
      font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s ease;
    `,y(a,this.t("popup.cancel")),a.addEventListener("click",()=>this.cancel()),this.submitBtn=document.createElement("button"),this.submitBtn.type="button",this.submitBtn.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:none;background:${this.colors.accentGradient};
      color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;
      opacity:0.35;pointer-events:none;transition:all 0.2s ease;
      box-shadow:0 2px 8px ${this.colors.accentGlow};
    `,y(this.submitBtn,this.t("popup.submit")),this.submitBtn.addEventListener("click",()=>this.submit()),s.appendChild(a),s.appendChild(this.submitBtn);let i=h("div",{style:"display:flex;align-items:center;gap:6px;margin-top:10px;flex-wrap:wrap;"}),l=h("span",{style:`font-size:11px;color:${this.colors.textTertiary};margin-right:4px;`});y(l,`${this.t("status.label")}:`),i.appendChild(l);for(let c of O){let d=document.createElement("button");d.type="button",d.dataset.status=c,d.style.cssText=`
        height:24px;padding:0 10px;border-radius:9999px;
        font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;
        transition:all 0.15s ease;
      `,y(d,this.t(`status.${c}`)),d.addEventListener("click",()=>this.setStatus(c)),this.statusButtons.set(c,d),i.appendChild(d)}this.root.appendChild(this.textarea),this.root.appendChild(i),this.root.appendChild(n),this.root.appendChild(s),document.body.appendChild(this.root),this.applyStatusStyles()}setStatus(e){this.status=e,this.applyStatusStyles()}applyStatusStyles(){for(let[e,t]of this.statusButtons){let n=D[e],o=e===this.status;t.style.background=o?n.bg:"transparent",t.style.color=o?n.fg:this.colors.textTertiary,t.style.border=`1px solid ${o?n.border:this.colors.border}`}}show(e){return new Promise(t=>{this.resolve=t,this.textarea.value="",this.status="todo",this.applyStatusStyles(),this.updateSubmitState(),this.previouslyFocused=document.activeElement;let n=e.bottom+8,o=e.left;n+220>window.innerHeight&&(n=e.top-220-8),o+300>window.innerWidth&&(o=e.right-300),n=Math.max(8,n),o=Math.max(8,o),this.root.style.top=`${n}px`,this.root.style.left=`${o}px`,this.root.style.display="block",this.onKeydownTrap=s=>{if(s.key!=="Tab")return;let a=Array.from(this.root.querySelectorAll('button:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])'));if(a.length===0)return;let i=a[0],l=a[a.length-1];!i||!l||(s.shiftKey?(document.activeElement===i||!this.root.contains(document.activeElement))&&(s.preventDefault(),l.focus()):(document.activeElement===l||!this.root.contains(document.activeElement))&&(s.preventDefault(),i.focus()))},this.root.addEventListener("keydown",this.onKeydownTrap),requestAnimationFrame(()=>{this.root.style.opacity="1",this.root.style.transform="translateY(0) scale(1)",this.textarea.focus()})})}updateSubmitState(){let e=this.textarea.value.trim().length>0;this.submitBtn.disabled=!e,this.submitBtn.style.opacity=e?"1":"0.35",this.submitBtn.style.pointerEvents=e?"auto":"none"}submit(){let e=this.textarea.value.trim();e&&(this.resolve?.({message:e,status:this.status}),this.resolve=null,this.hide())}cancel(){this.resolve?.(null),this.resolve=null,this.hide()}hide(){this.onKeydownTrap&&(this.root.removeEventListener("keydown",this.onKeydownTrap),this.onKeydownTrap=null),this.root.style.opacity="0",this.root.style.transform="translateY(8px) scale(0.98)",this.previouslyFocused?.focus(),this.previouslyFocused=null,setTimeout(()=>{this.root.style.display="none"},200)}destroy(){this.root.remove()}};var Zt=0;function me(r){let{colors:e,t,onPick:n,readOnly:o=!1}=r,s=r.current,a=`ccm-status-menu-${++Zt}`,i=h("span",{style:"position:relative;display:inline-block;"}),l=document.createElement("button");l.type="button",l.setAttribute("role",o?"presentation":"combobox"),l.setAttribute("aria-haspopup","listbox"),l.setAttribute("aria-expanded","false"),l.setAttribute("aria-controls",a),l.setAttribute("aria-label",t("marker.popover.statusAria"));let c=()=>{let u=D[s];l.style.cssText=`
      display:inline-flex;align-items:center;gap:4px;
      padding:2px 8px 2px 10px;border-radius:9999px;
      font-size:10px;font-weight:600;letter-spacing:0.02em;line-height:1.4;
      background:${u.bg};color:${u.fg};border:1px solid ${u.border};
      font-family:inherit;
      cursor:${o?"default":"pointer"};
      text-transform:uppercase;
    `,l.replaceChildren();let v=document.createElement("span");if(y(v,t(`status.${s}`)),l.appendChild(v),!o){let C=document.createElement("span");C.setAttribute("aria-hidden","true"),C.style.cssText="font-size:9px;line-height:1;opacity:0.7;",y(C,"\u25BE"),l.appendChild(C)}};c();let d=document.createElement("ul");d.id=a,d.setAttribute("role","listbox"),d.setAttribute("aria-label",t("marker.popover.statusMenuAria")),d.style.cssText=`
    position:absolute;top:calc(100% + 4px);left:0;
    margin:0;padding:4px;list-style:none;
    min-width:140px;border-radius:8px;
    background:${e.glassBg};
    backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
    border:1px solid ${e.glassBorder};
    box-shadow:0 8px 24px ${e.shadow};
    z-index:2;display:none;
    font-family:inherit;font-size:12px;
  `,d.setAttribute("aria-hidden","true");let m=new Map;for(let u of O){let v=document.createElement("li");v.setAttribute("role","option"),v.setAttribute("data-status",u),v.setAttribute("tabindex","-1"),v.style.cssText=`
      display:flex;align-items:center;gap:8px;
      padding:6px 10px;border-radius:6px;
      color:${e.text};cursor:pointer;
      transition:background 0.12s ease;
    `;let C=document.createElement("span");C.setAttribute("aria-hidden","true");let L=D[u];C.style.cssText=`
      width:10px;height:10px;border-radius:9999px;
      background:${L.border};flex-shrink:0;
    `;let P=document.createElement("span");y(P,t(`status.${u}`)),P.style.cssText="flex:1;";let p=document.createElement("span");p.setAttribute("aria-hidden","true"),p.style.cssText=`font-size:12px;color:${e.accent};font-weight:600;`,y(p,"\u2713"),v.appendChild(C),v.appendChild(P),v.appendChild(p),v.addEventListener("mouseenter",()=>{v.style.background=e.glassBgHeavy}),v.addEventListener("mouseleave",()=>{v.style.background=""}),v.addEventListener("click",x=>{x.preventDefault(),x.stopPropagation(),A(u)}),m.set(u,v),d.appendChild(v)}let f=()=>{for(let u of O){let v=m.get(u);if(!v)continue;let C=u===s;v.setAttribute("aria-selected",String(C));let L=v.lastElementChild;L&&(L.style.visibility=C?"visible":"hidden")}};f();let b=!1,g=()=>{if(o||b)return;b=!0,l.setAttribute("aria-expanded","true"),d.style.display="block",d.setAttribute("aria-hidden","false"),(m.get(s)??m.get(O[0]))?.focus()},S=()=>{b&&(b=!1,l.setAttribute("aria-expanded","false"),d.style.display="none",d.setAttribute("aria-hidden","true"))},A=u=>{if(u===s){S(),l.focus();return}S(),l.focus(),n(u)};o||(l.addEventListener("click",u=>{u.preventDefault(),u.stopPropagation(),b?S():g()}),l.addEventListener("keydown",u=>{(u.key==="Enter"||u.key===" "||u.key==="ArrowDown")&&(u.preventDefault(),g())}),d.addEventListener("keydown",u=>{if(u.key==="Escape"){u.preventDefault(),u.stopPropagation(),S(),l.focus();return}if(u.key==="ArrowDown"||u.key==="ArrowUp"){u.preventDefault();let v=O.findIndex(x=>m.get(x)===document.activeElement),C=u.key==="ArrowDown"?1:-1,L=O.length,P=((v===-1?0:v+C)+L)%L;m.get(O[P])?.focus();return}if(u.key==="Enter"||u.key===" "){u.preventDefault();let v=document.activeElement;for(let C of O)if(m.get(C)===v){A(C);return}}}));let E=u=>{b&&(u.composedPath().some(v=>v===i)||S())};return document.addEventListener("click",E,!0),i.appendChild(l),i.appendChild(d),{root:i,setCurrent:u=>{s=u,c(),f()},close:S,destroy:()=>{S(),document.removeEventListener("click",E,!0)}}}var dt=140,Jt="todo",ge=class{constructor(e,t,n,o,s,a,i=()=>{}){this.bus=t;this.t=n;this.store=o;this.colors=s;this.jump=a;this.onFilterChange=i;this.isOpen=!1;this.filter=Jt;this.otherPagesExpanded=!1;this.previouslyFocused=null;this.chipButtons=new Map;this.chipCounts=new Map;this.chipLabels=new Map;this.cardDropdowns=new Set;this.root=h("div",{class:"sp-panel"}),this.root.setAttribute("role","dialog"),this.root.setAttribute("aria-label",n("drawer.aria")),this.root.setAttribute("aria-hidden","true"),this.root.inert=!0;let l=h("div",{class:"sp-panel-header"}),c=h("div",{class:"sp-panel-title"});y(c,n("drawer.title"));let d=h("button",{class:"sp-panel-close",type:"button"});d.setAttribute("aria-label",n("drawer.close")),d.appendChild($(ie)),d.addEventListener("click",()=>this.close()),l.appendChild(c),l.appendChild(d),this.filtersEl=h("div",{class:"sp-filters"});let m=h("div",{class:"sp-chips"}),f=[...O];for(let g of f){let S=h("button",{class:"sp-chip",type:"button"}),A=n(`status.${g}`),E=h("span",{class:"sp-chip-label"});y(E,A);let u=h("span",{class:"sp-chip-count"});u.setAttribute("aria-hidden","true"),S.appendChild(E),S.appendChild(u),S.dataset.filter=g,S.setAttribute("aria-pressed",g===this.filter?"true":"false"),S.addEventListener("click",()=>this.setFilter(g)),this.chipButtons.set(g,S),this.chipCounts.set(g,u),this.chipLabels.set(g,A),m.appendChild(S)}this.filtersEl.appendChild(m),this.listEl=h("div",{class:"sp-list"}),this.root.appendChild(l),this.root.appendChild(this.filtersEl),this.root.appendChild(this.listEl),e.appendChild(this.root);let b=e.host;this.onDocumentClick=g=>{this.isOpen&&(g.composedPath().includes(b)||this.close())},this.onKeydown=g=>{if(this.isOpen){if(g.key==="Escape"){g.stopPropagation(),this.close();return}g.key==="Tab"&&this.trapFocus(g)}},this.applyChipStyles()}open(){if(this.isOpen){this.render();return}this.isOpen=!0,this.previouslyFocused=this.deepActiveElement()??null,this.render(),this.root.classList.add("sp-panel--open"),this.root.setAttribute("aria-hidden","false"),this.root.inert=!1,document.addEventListener("click",this.onDocumentClick),document.addEventListener("keydown",this.onKeydown,!0),this.bus.emit("drawer:opened"),requestAnimationFrame(()=>{this.root.querySelector('button:not([disabled]):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"])')?.focus()})}close(){if(!this.isOpen)return;this.isOpen=!1,this.root.classList.remove("sp-panel--open"),this.root.setAttribute("aria-hidden","true"),this.root.inert=!0,document.removeEventListener("click",this.onDocumentClick),document.removeEventListener("keydown",this.onKeydown,!0),this.bus.emit("navigator:close"),this.bus.emit("drawer:closed");let e=this.previouslyFocused;this.previouslyFocused=null,e&&typeof e.focus=="function"&&e.focus()}refreshIfOpen(){this.isOpen&&this.render()}destroy(){for(let e of this.cardDropdowns)e.destroy();this.cardDropdowns.clear(),document.removeEventListener("click",this.onDocumentClick),document.removeEventListener("keydown",this.onKeydown,!0),this.root.remove()}setFilter(e){this.filter!==e&&(this.filter=e,this.applyChipStyles(),this.onFilterChange(e),this.render())}getFilter(){return this.filter}applyChipStyles(){for(let[e,t]of this.chipButtons){let n=e===this.filter;t.classList.toggle("sp-chip--active",n),t.setAttribute("aria-pressed",n?"true":"false")}}updateChipCounts(e){let t=new Map;for(let n of O)t.set(n,0);for(let n of e){let o=n.status??"todo";t.set(o,(t.get(o)??0)+1)}for(let[n,o]of this.chipButtons){let s=t.get(n)??0,a=this.chipCounts.get(n),i=this.chipLabels.get(n)??n;a&&y(a,String(s)),o.setAttribute("aria-label",`${i} \u2014 ${s}`)}}render(){for(let i of this.cardDropdowns)i.destroy();this.cardDropdowns.clear(),this.listEl.replaceChildren();let e=this.store.list();this.updateChipCounts(e);let t=e.filter(i=>(i.status??"todo")===this.filter);if(e.length===0){this.listEl.appendChild(this.buildEmpty(this.t("drawer.empty")));return}if(t.length===0){this.listEl.appendChild(this.buildEmpty(this.t("drawer.emptyFiltered")));return}let n=I(window.location.pathname),o=[...t].sort((i,l)=>new Date(l.createdAt).getTime()-new Date(i.createdAt).getTime()),s=o.filter(i=>I(i.path)===n),a=o.filter(i=>I(i.path)!==n);if(s.length>0){a.length>0&&this.listEl.appendChild(this.buildSectionLabel(this.t("drawer.thisPage")));for(let i of s)this.listEl.appendChild(this.buildCard(i))}if(a.length>0){let i=h("button",{class:"sp-chip",type:"button"});i.style.cssText="margin:8px 4px;";let l=()=>{y(i,`${this.otherPagesExpanded?"\u25BE ":"\u25B8 "}${this.t("drawer.otherPages",{n:a.length})}`)};l(),i.setAttribute("aria-expanded",this.otherPagesExpanded?"true":"false");let c=h("div",{});c.style.display=this.otherPagesExpanded?"block":"none",i.addEventListener("click",()=>{this.otherPagesExpanded=!this.otherPagesExpanded,c.style.display=this.otherPagesExpanded?"block":"none",i.setAttribute("aria-expanded",this.otherPagesExpanded?"true":"false"),l()});for(let d of a)c.appendChild(this.buildCard(d));this.listEl.appendChild(i),this.listEl.appendChild(c)}}buildSectionLabel(e){let t=h("div",{style:`font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${this.colors.textTertiary};padding:10px 8px 4px;`});return y(t,e),t}buildEmpty(e){let t=h("div",{class:"sp-empty"}),n=h("div",{class:"sp-empty-text"});return y(n,e),t.appendChild(n),t}handleStatusPick(e,t,n){t!==e.status&&(this.store.updateStatus?.(e.id,t),e.status=t,n.setCurrent(t),this.bus.emit("feedback:updated",e),this.render())}buildCard(e){let t=e.status??"todo",n=D[t],o=I(e.path)===I(window.location.pathname),s=e.parentId?"\u21B3":typeof e.sequenceNumber=="number"?String(e.sequenceNumber):"?",a=h("button",{class:"sp-card",type:"button"});a.style.textAlign="left",a.style.width="100%",a.dataset.annotationId=e.id;let i=e.message.length>dt?`${e.message.slice(0,dt).trimEnd()}\u2026`:e.message;a.setAttribute("aria-label",this.t("drawer.rowAria",{n:s,message:i})),a.addEventListener("click",()=>{o?this.jump(e.id):e.url&&(window.location.href=e.url)});let l=h("div",{class:"sp-card-bar",style:`background:${n.border};`}),c=h("div",{class:"sp-card-body"}),d=h("div",{class:"sp-card-header"}),m=h("span",{class:"sp-card-number"});y(m,`#${s}`);let f=typeof this.store.updateStatus=="function",b=me({current:t,colors:this.colors,t:this.t,readOnly:!f,onPick:p=>this.handleStatusPick(e,p,b)});this.cardDropdowns.add(b),b.root.addEventListener("click",p=>p.stopPropagation()),b.root.addEventListener("keydown",p=>p.stopPropagation());let g=h("span",{class:"sp-card-date"});y(g,new Date(e.createdAt).toLocaleDateString());let S=this.buildCopyButton(e.id);d.appendChild(m),d.appendChild(b.root),d.appendChild(g),d.appendChild(S);let A=h("div",{class:"sp-card-message"});y(A,i);let E=h("div",{style:`font-size:11px;color:${this.colors.textTertiary};margin-top:8px;display:flex;flex-wrap:wrap;gap:8px;`}),u=e.authorName?.trim()||"Anonymous",v=e.kind??"target",C=h("span",{});y(C,u);let L=h("span",{style:"text-transform:uppercase;letter-spacing:0.04em;"});y(L,v);let P=h("span",{style:"overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;"});return y(P,I(e.path)),E.appendChild(C),E.appendChild(L),E.appendChild(P),c.appendChild(d),c.appendChild(A),c.appendChild(E),a.appendChild(l),a.appendChild(c),a}buildCopyButton(e){let t=h("button",{class:"sp-card-copy",type:"button",title:this.t("drawer.copyId")});return t.setAttribute("aria-label",this.t("drawer.copyIdAria")),t.appendChild($(U)),t.addEventListener("click",n=>{n.stopPropagation(),q(e).then(o=>{if(!o){console.warn(`[ccm-feedback] ${this.t("toast.idCopyFailed")}`);return}console.info(`[ccm-feedback] ${this.t("toast.idCopied")}: ${e}`),t.classList.add("sp-card-copy--ok"),t.replaceChildren($(se)),window.setTimeout(()=>{t.classList.remove("sp-card-copy--ok"),t.replaceChildren($(U))},1400)})}),t.addEventListener("keydown",n=>{(n.key==="Enter"||n.key===" ")&&n.stopPropagation()}),t}trapFocus(e){let t=Array.from(this.root.querySelectorAll('button:not([disabled]):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"])'));if(t.length===0)return;let n=t[0],o=t[t.length-1];if(!n||!o)return;let s=this.deepActiveElement();e.shiftKey?(s===n||!this.root.contains(s))&&(e.preventDefault(),o.focus()):(s===o||!this.root.contains(s))&&(e.preventDefault(),n.focus())}deepActiveElement(){let e=document.activeElement;for(;e?.shadowRoot?.activeElement;)e=e.shadowRoot.activeElement;return e}};var be=class{constructor(){this.listeners=new Map}on(e,t){let n=this.listeners.get(e);return n||(n=new Set,this.listeners.set(e,n)),n.add(t),()=>{n.delete(t)}}emit(e,...t){let n=this.listeners.get(e);if(n)for(let o of n)try{o(...t)}catch(s){console.error(`[ccm-feedback] Error in listener for "${String(e)}":`,s)}}removeAll(){this.listeners.clear()}};var Qt=54,ye=class{constructor(e,t,n,o=!1){this.bus=t;this.cloudMode=o;this.todoBadge=null;this.reviewBadge=null;this.mode="closed";this.annotationsVisible=!0;this.activeMode=null;this.savedHostZIndex="";this.unsubs=[];this.hostEl=e.host,this.toggleLabels={on:n("toolbar.toggleOn"),off:n("toolbar.toggleOff")},this.items=[{id:"target",icon:Ue,label:n("fab.targetLabel"),direction:"up"},{id:"pin",icon:Ke,label:n("fab.pinLabel"),direction:"up"},{id:"area",icon:We,label:n("fab.areaLabel"),direction:"up"},{id:"clear",icon:Ye,label:n("fab.clear"),direction:"left"},{id:"copyUrl",icon:qe,label:n("fab.copyUrl"),direction:"left",...this.cloudMode?{}:{disabled:!0,disabledTitle:n("fab.copyUrlLocalOnly")}},{id:"export",icon:er,label:n("fab.export"),direction:"left"},{id:"toggle",icon:J,label:this.toggleLabels.on,direction:"left"}],this.fab=document.createElement("button"),this.fab.className="sp-fab sp-fab--bottom-right sp-anim-fab-in",this.fab.style.position="fixed",this.fab.appendChild($(Ce)),this.baseAriaLabel=n("fab.aria"),this.fab.setAttribute("aria-label",this.baseAriaLabel),this.fab.setAttribute("aria-expanded","false"),this.fab.addEventListener("click",a=>{a.detail>=2||this.toggle()}),this.fab.addEventListener("dblclick",a=>{a.preventDefault(),this.bus.emit("navigator:open")}),this.radialContainer=document.createElement("div"),this.radialContainer.className="sp-radial sp-radial--bottom-right",this.radialContainer.setAttribute("role","menu"),this.items.forEach((a,i)=>{let l=document.createElement("button");l.className="sp-radial-item",l.style.setProperty("--sp-i",String(i)),l.appendChild($(a.icon)),l.setAttribute("role","menuitem"),l.setAttribute("aria-label",a.label),l.dataset.itemId=a.id,l.dataset.direction=a.direction,a.disabled&&(l.setAttribute("aria-disabled","true"),l.dataset.disabled="true",l.style.opacity="0.4",l.style.cursor="not-allowed",a.disabledTitle&&(l.title=a.disabledTitle));let c=document.createElement("span");c.className="sp-radial-label",c.style.cssText=a.direction==="up"?"position:absolute;right:54px;top:50%;transform:translateY(-50%);white-space:nowrap;":"position:absolute;bottom:54px;left:50%;transform:translateX(-50%);white-space:nowrap;",c.textContent=a.label,l.appendChild(c),l.addEventListener("click",d=>{d.stopPropagation(),!a.disabled&&this.handleItemClick(a.id)}),this.radialContainer.appendChild(l)}),this.root=document.createElement("div"),this.root.appendChild(this.radialContainer),this.root.appendChild(this.fab),e.appendChild(this.root),this.onDocumentClick=a=>{this.mode!=="closed"&&!a.composedPath().includes(this.hostEl)&&this.close()},document.addEventListener("click",this.onDocumentClick);let s=a=>{a.key==="Escape"&&this.mode!=="closed"&&(a.stopPropagation(),this.close())};this.fab.addEventListener("keydown",s),this.radialContainer.addEventListener("keydown",s),this.unsubs.push(this.bus.on("drawer:opened",()=>{this.setDrawerOpen(!0),this.activeMode&&this.bus.emit(`${this.activeMode}:end`)}),this.bus.on("drawer:closed",()=>this.setDrawerOpen(!1)),this.bus.on("target:start",()=>this.onModeStart("target")),this.bus.on("pin:start",()=>this.onModeStart("pin")),this.bus.on("area:start",()=>this.onModeStart("area")),this.bus.on("target:end",()=>this.onModeEnd("target")),this.bus.on("pin:end",()=>this.onModeEnd("pin")),this.bus.on("area:end",()=>this.onModeEnd("area")))}updateCounts(e){if(this.todoBadge=this.renderBadge(this.todoBadge,e.todo,"todo"),this.reviewBadge=this.renderBadge(this.reviewBadge,e.review,"review"),e.todo<=0&&e.review<=0){this.fab.setAttribute("aria-label",this.baseAriaLabel);return}let t=[];e.todo>0&&t.push(`${e.todo} todo`),e.review>0&&t.push(`${e.review} review`),this.fab.setAttribute("aria-label",`${this.baseAriaLabel}, ${t.join(", ")}`)}renderBadge(e,t,n){if(t<=0)return e?.remove(),null;let o=e;if(!o){o=document.createElement("span"),o.className=n==="todo"?"sp-fab-badge":"sp-fab-badge sp-fab-badge--left",o.setAttribute("aria-hidden","true");let s=D[n];o.style.background=s.border,o.style.color="#fff",this.fab.appendChild(o)}return y(o,t>99?"99+":String(t)),o}setDrawerOpen(e){this.fab.classList.toggle("sp-fab--drawer-open",e),this.radialContainer.classList.toggle("sp-radial--drawer-open",e)}setModeActive(e){if(e)this.activeMode===null&&(this.savedHostZIndex=this.hostEl.style.zIndex),this.hostEl.style.zIndex=String(2147483647);else{if(this.activeMode===null)return;this.hostEl.style.zIndex=this.savedHostZIndex}}onModeStart(e){this.activeMode===null&&(this.setModeActive(!0),this.activeMode=e)}onModeEnd(e){this.activeMode===e&&(this.setModeActive(!1),this.activeMode=null)}toggle(){this.mode==="closed"?this.openRadial():this.close()}openRadial(){this.mode="open",this.setFabIcon(ie),this.fab.setAttribute("aria-expanded","true");let e=this.radialContainer.querySelectorAll(".sp-radial-item"),t={up:0,left:0};e.forEach(n=>{let o=n.dataset.direction??"up",s=16+Qt*(t[o]+1);t[o]+=1;let a=o==="left"?-s:0,i=o==="up"?-s:0;n.style.transform=`translate(${a}px, ${i}px) scale(1)`,n.classList.add("sp-radial-item--open")}),requestAnimationFrame(()=>{this.radialContainer.querySelector(".sp-radial-item--open")?.focus()})}close(){this.mode="closed",this.setFabIcon(Ce),this.fab.setAttribute("aria-expanded","false"),this.radialContainer.querySelectorAll(".sp-radial-item").forEach(t=>{t.style.transform="translate(0, 0) scale(0.8)",t.classList.remove("sp-radial-item--open")}),this.fab.focus()}setFabIcon(e){let t=this.todoBadge,n=this.reviewBadge;this.fab.replaceChildren($(e)),t&&this.fab.appendChild(t),n&&this.fab.appendChild(n)}handleItemClick(e){switch(e){case"target":this.bus.emit("target:start");break;case"pin":this.bus.emit("pin:start");break;case"area":this.bus.emit("area:start");break;case"toggle":{this.annotationsVisible=!this.annotationsVisible,this.bus.emit("annotations:toggle",this.annotationsVisible);let t=this.radialContainer.querySelector('[data-item-id="toggle"]');if(t){t.querySelector("svg")?.remove(),t.insertBefore($(this.annotationsVisible?J:oe),t.firstChild);let o=this.annotationsVisible?this.toggleLabels.on:this.toggleLabels.off;t.setAttribute("aria-label",o);let s=t.querySelector(".sp-radial-label");s&&(s.textContent=o)}break}case"export":this.close(),this.bus.emit("export:click");break;case"copyUrl":this.close(),this.bus.emit("copyUrl:click");break;case"clear":this.close(),this.bus.emit("clear:click");break}}destroy(){document.removeEventListener("click",this.onDocumentClick);for(let e of this.unsubs)e();this.unsubs.length=0,this.activeMode&&this.setModeActive(!1),this.root.remove()}},er='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';var tr={"fab.aria":"Feedback","fab.targetLabel":"Target element","fab.pinLabel":"Drop pin","fab.areaLabel":"Capture area","toolbar.toggleOn":"Hide comments","toolbar.toggleOff":"Show comments","fab.export":"Export JSON","fab.copyUrl":"Copy feedback URL","fab.copyUrlLocalOnly":"Cloud mode only \u2014 use Export JSON","fab.clear":"Clear all","fab.clearConfirm":"Delete all annotations for this project? This cannot be undone.","pin.ariaLabel":"Pin mode toolbar","pin.instruction":"Click any element to comment on it","pin.cancel":"Cancel","relocate.instruction":"Drop on a new target. ESC to cancel.","relocate.cancel":"Cancel relocate","coordPin.instruction":"Click anywhere to drop a pin","area.instruction":"Drag to capture an area","status.todo":"Todo","status.review":"Review","status.done":"Done","status.question":"Question","status.label":"Status","popup.ariaLabel":"Comment composer","popup.placeholder":"Leave a comment\u2026","popup.textareaAria":"Comment","popup.cancel":"Cancel","popup.submit":"Send","popup.submitHintMac":"\u2318 + \u21B5 to submit","popup.submitHintOther":"Ctrl + \u21B5 to submit","marker.ariaLabel":"Comment #{n}","marker.popover.delete":"Delete","marker.popover.close":"Close","marker.popover.deleteConfirm":"Delete this comment? This cannot be undone.","marker.popover.statusAria":"Change status","marker.popover.statusMenuAria":"Statuses","marker.replies.heading":"Replies","marker.reply.delete":"Delete reply","marker.reply.placeholder":"Write a reply\u2026","marker.reply.send":"Reply","marker.replyDeleteConfirm":"Delete this reply? This cannot be undone.","toast.exported":"Exported {n} annotation(s)","toast.empty":"No annotations to export","toast.urlCopied":"Feedback URL copied to clipboard","toast.urlCopyFailed":"Could not copy URL \u2014 clipboard unavailable","drawer.title":"Comments","drawer.aria":"Comments navigator","drawer.close":"Close comments","drawer.empty":"No comments yet","drawer.emptyFiltered":"No comments match this filter","drawer.thisPage":"This page","drawer.otherPages":"Other pages ({n})","drawer.rowAria":"Comment {n}: {message}","drawer.copyId":"Copy ID","drawer.copyIdAria":"Copy comment ID","toast.idCopied":"Comment ID copied","toast.idCopyFailed":"Could not copy ID \u2014 clipboard unavailable"};function pt(){return(r,e)=>{let t=tr[r]??r;return e?t.replace(/\{(\w+)\}/g,(n,o)=>String(e[o]??"")):t}}function ut(r,e){let t=[];for(let i of r){if(i.node.dataset.orphan==="true"||i.node.style.display==="none")continue;let l=Number.parseFloat(i.node.style.left),c=Number.parseFloat(i.node.style.top);!Number.isFinite(l)||!Number.isFinite(c)||t.push({entry:i,cx:l,cy:c})}if(t.length<2){for(let i of t)delete i.entry.node.dataset.clusterSize,delete i.entry.node.dataset.clusterIndex;return}let n=t.map((i,l)=>l),o=i=>{for(;n[i]!==i;){let l=n[i];n[i]=n[l],i=n[i]}return i},s=(i,l)=>{let c=o(i),d=o(l);c!==d&&(n[c]=d)};for(let i=0;i<t.length;i++)for(let l=i+1;l<t.length;l++){let c=t[i],d=t[l];Math.abs(c.cx-d.cx)<e.collisionRadius&&Math.abs(c.cy-d.cy)<e.collisionRadius&&s(i,l)}let a=new Map;for(let i=0;i<t.length;i++){let l=o(i),c=a.get(l);c?c.push(t[i]):a.set(l,[t[i]])}for(let i of a.values()){if(i.length<2){let E=i[0];E&&(delete E.entry.node.dataset.clusterSize,delete E.entry.node.dataset.clusterIndex);continue}i.sort((E,u)=>{let v=new Date(E.entry.record.createdAt).getTime(),C=new Date(u.entry.record.createdAt).getTime();return v!==C?v-C:E.entry.record.id.localeCompare(u.entry.record.id)});let l=i.reduce((E,u)=>E+u.cx,0)/i.length,c=i.reduce((E,u)=>E+u.cy,0)/i.length,d=e.markerSize+e.clusterGap,m=i.length,f=i.map((E,u)=>l+(u-(m-1)/2)*d),b=e.clampX(Number.POSITIVE_INFINITY),g=f[m-1],S=f[0],A=0;g>b&&(A=b-g),S+A<e.minX&&(A=e.minX-S);for(let E=0;E<m;E++){let u=i[E],v=f[E]+A;u.entry.node.style.left=`${v}px`,u.entry.node.style.top=`${c}px`,u.entry.node.dataset.clusterSize=String(m),u.entry.node.dataset.clusterIndex=String(E)}}}var ht=8;function ve(r){let e=null,t=null,n=null,o=null,s="",a="",i=()=>{e&&(n!==null?e.style.setProperty("outline",n,s):e.style.removeProperty("outline"),o!==null?e.style.setProperty("outline-offset",o,a):e.style.removeProperty("outline-offset"),e=null,n=null,o=null,s="",a=""),t&&(t.remove(),t=null)};return{apply:c=>{if(e===c)return;e&&i(),n=c.style.outline||null,o=c.style.outlineOffset||null,s=c.style.getPropertyPriority("outline"),a=c.style.getPropertyPriority("outline-offset"),c.style.setProperty("outline",`2px solid ${r.accent}`,"important"),c.style.setProperty("outline-offset","2px","important"),e=c;let d=c.getBoundingClientRect();if(d.width>0&&d.height>0){t=document.createElement("div");let m=c.tagName.toLowerCase();t.textContent=m,t.setAttribute("aria-hidden","true");let f=Math.max(ht,Math.min(d.right-4,window.innerWidth-60)),b=Math.max(ht,Math.min(d.bottom+4,window.innerHeight-24));t.style.cssText=`
        position:fixed;
        left:${f}px;
        top:${b}px;
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
      `,document.body.appendChild(t)}},clear:i,destroy:i}}function rr(r,e){if(r===e)return 0;if(r.length===0)return e.length;if(e.length===0)return r.length;if(r.length>e.length){let a=r;r=e,e=a}let t=r.length,n=e.length,o=new Array(t+1);for(let a=0;a<=t;a++)o[a]=a;let s=new Array(t+1);for(let a=1;a<=n;a++){s[0]=a;for(let l=1;l<=t;l++){let c=o[l-1]??0;s[l]=r[l-1]===e[a-1]?c:1+Math.min(c,o[l]??0,s[l-1]??0)}let i=o;o=s,s=i}return o[t]??0}function G(r,e){if(r===e)return 1;let t=Math.max(r.length,e.length);return t===0?1:1-rr(r,e)/t}function _e(r,e,t=.6){if(!e||!r)return 0;if(r.includes(e))return 1;let n=e.length;if(n>r.length){let i=G(r,e);return i>=t?i:0}let o=0,s=r.length>500?r.slice(0,500):r,a=s.length-n;for(let i=0;i<=a;i++){let l=s.slice(i,i+n),c=G(l,e);if(c>o&&(o=c),o>=.95)break}return o>=t?o:0}var nr=300,or=.3;function De(r,e){if(!e.textSnippet)return!0;let t=(r.textContent?.trim()??"").slice(0,500);return _e(t,e.textSnippet,.5)>or}function ir(r){if(r.elementId){let e=document.getElementById(r.elementId);if(e&&e.tagName===r.elementTag&&De(e,r))return{element:e,confidence:1,strategy:"id"}}try{let e=document.querySelector(r.cssSelector);if(e&&e.tagName===r.elementTag&&De(e,r))return{element:e,confidence:.95,strategy:"css"}}catch{}try{let t=document.evaluate(r.xpath,document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue;if(t instanceof Element&&t.tagName===r.elementTag&&De(t,r))return{element:t,confidence:.9,strategy:"xpath"}}catch{}return sr(r)}function sr(r){let e=r.elementTag.toLowerCase(),t=document.querySelectorAll(e);if(t.length===0)return null;let n=null,o=0,s=Math.min(t.length,nr);for(let a=0;a<s;a++){let i=t[a];if(!i)continue;let l=ar(i,r);if(l>o&&(o=l,n=i,o>=.85))break}return!n||o<.4?null:{element:n,confidence:Math.min(o,.85),strategy:"scan"}}function ar(r,e){let t=0,n=0,o=(r.textContent?.trim()??"").slice(0,500);if(e.textSnippet&&(n+=40,t+=_e(o,e.textSnippet,.5)*40),e.fingerprint&&(n+=20,t+=st(r,e.fingerprint)*20),e.textPrefix||e.textSuffix){n+=20;let s=0,a=0;if(e.textPrefix){let i=W(r,"before");s+=i?G(i,e.textPrefix):0,a++}if(e.textSuffix){let i=W(r,"after");s+=i?G(i,e.textSuffix):0,a++}a>0&&(t+=s/a*20)}if(e.neighborText){n+=20;let s=ue(r);t+=s?G(s,e.neighborText)*20:0}return n>0?t/n:0}function ft(r,e){let t=ir(r);if(!t)return null;let n=t.element.getBoundingClientRect(),o=new DOMRect(n.x+e.xPct*n.width,n.y+e.yPct*n.height,e.wPct*n.width,e.hPct*n.height);return{element:t.element,rect:o,confidence:t.confidence,strategy:t.strategy}}var Z=26,V=Z/2;function lr(r){return typeof r=="number"?String(r):"?"}var cr=Z,dr=4,pr=200,ur=250,mt=6,gt=300,hr=.7,fr=540,bt=16,xe=class{constructor(e,t,n,o,s=()=>!1){this.colors=e;this.bus=t;this.t=n;this.store=o;this.shouldIgnoreElement=s;this.entries=[];this.visible=!0;this.includeDone=!1;this.popover=null;this.popoverStatusDropdown=null;this.popoverDisposers=[];this.repositionTimer=null;this.lastPath=window.location.pathname;this.dragCleanup=null;this.watcherCleanups=new Set;this.dragInFlight=!1;if(this.container=h("div",{style:`position:absolute;top:0;left:0;width:100%;height:0;overflow-x:clip;overflow-y:visible;z-index:${2147483645};pointer-events:none;`}),this.container.setAttribute("aria-hidden","false"),this.container.setAttribute("data-ccm-markers","true"),document.body.appendChild(this.container),!document.getElementById("ccm-marker-anim")){let i=document.createElement("style");i.id="ccm-marker-anim",i.textContent=`
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
      `,document.head.appendChild(i)}if(!document.getElementById("ccm-popover-scroll")){let i=document.createElement("style");i.id="ccm-popover-scroll",i.textContent=`
        .ccm-popover::-webkit-scrollbar { width: 6px; }
        .ccm-popover::-webkit-scrollbar-track { background: transparent; }
        .ccm-popover::-webkit-scrollbar-thumb {
          background: ${this.colors.glassBorder};
          border-radius: 3px;
        }
        .ccm-popover { scrollbar-width: thin; scrollbar-color: ${this.colors.glassBorder} transparent; }
      `,document.head.appendChild(i)}this.onResize=this.scheduleReposition.bind(this),this.onScroll=this.scheduleReposition.bind(this),window.addEventListener("resize",this.onResize,{passive:!0}),window.addEventListener("scroll",this.onScroll,{passive:!0}),this.onDocClick=i=>{this.popover&&(i.composedPath().some(l=>l===this.popover)||this.closePopover())},document.addEventListener("click",this.onDocClick,!0);let a=()=>{window.location.pathname!==this.lastPath&&(this.dragInFlight||(this.lastPath=window.location.pathname,this.refresh()))};this.onPopState=a,window.addEventListener("popstate",this.onPopState),this.origPushState=history.pushState.bind(history),this.origReplaceState=history.replaceState.bind(history),history.pushState=(...i)=>{this.origPushState(...i),a()},history.replaceState=(...i)=>{this.origReplaceState(...i),a()},this.bus.on("annotations:toggle",i=>this.setVisible(i))}refresh(){this.closePopover();for(let t of this.entries)t.node.remove();this.entries=[];let e=this.store.listForPath(window.location.pathname).filter(t=>this.shouldRender(t));for(let t of e){let n=this.buildMarker(t);this.container.appendChild(n),this.entries.push({record:t,node:n,anchorEl:null})}this.reposition()}addOne(e){if(!this.shouldRender(e))return;let t=this.buildMarker(e);this.container.appendChild(t),this.entries.unshift({record:e,node:t,anchorEl:null}),this.reposition()}shouldRender(e){return!((e.status??"todo")==="done"&&!this.includeDone)}setIncludeDone(e){this.includeDone!==e&&(this.includeDone=e,this.refresh())}setVisible(e){this.visible=e,this.container.style.display=e?"block":"none",e||this.closePopover()}get isVisible(){return this.visible}canLocate(e){let t=this.entries.find(n=>n.record.id===e);return t?this.isEntryLocatable(t):!1}scrollToAndFlash(e){let t=this.entries.find(o=>o.record.id===e);if(!t||!this.isEntryLocatable(t))return!1;let n=Number.parseFloat(t.node.style.top);if(Number.isFinite(n)&&window.scrollTo({top:Math.max(0,n-window.innerHeight/3),behavior:"smooth"}),this.visible){let o=t.node;o.style.animation="ccm-pulse 0.6s ease-in-out 1",window.setTimeout(()=>{let s=o.dataset.status;o.style.animation=s==="question"?"ccm-pulse 1.6s ease-in-out infinite":""},650)}return this.flashAnchorElement(t),!0}flashAnchorElement(e){if((e.record.kind??"target")!=="target")return;let n=e.anchorEl;!n||!(n instanceof HTMLElement)||(n.classList.remove("ccm-anchor-flash"),n.offsetWidth,n.classList.add("ccm-anchor-flash"),window.setTimeout(()=>{n.classList.remove("ccm-anchor-flash")},1250))}isEntryLocatable(e){return!0}buildMarker(e){let t=e.status??"todo",n=D[t],o=lr(e.sequenceNumber),s=h("button",{type:"button","aria-label":this.t("marker.ariaLabel",{n:o}),style:`
        position:absolute;width:${Z}px;height:${Z}px;
        border-radius:9999px;border:2px solid #fff;
        background:${n.border};color:#fff;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:12px;font-weight:700;line-height:1;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 8px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.18);
        cursor:grab;pointer-events:auto;
        transform:translate(-50%, -50%);transition:transform 0.15s ease;
      `});return s.dataset.annotationId=e.id,s.dataset.status=t,s.dataset.kind=e.kind??"target",t==="question"&&(s.style.animation="ccm-pulse 1.6s ease-in-out infinite"),y(s,o),s.addEventListener("mouseenter",()=>{s.style.transform="translate(-50%, -50%) scale(1.12)"}),s.addEventListener("mouseleave",()=>{s.style.transform="translate(-50%, -50%) scale(1)"}),this.attachDragOrClickWatcher(s,e),s}attachDragOrClickWatcher(e,t){let n={value:!1};e.addEventListener("click",o=>{if(o.stopPropagation(),n.value){n.value=!1;return}this.openPopover(t,e)}),e.addEventListener("mousedown",o=>{if(o.button!==0)return;o.stopPropagation();let s=o.clientX,a=o.clientY,i=!1,l=window.setTimeout(()=>{l=null,f(o)},ur),c=b=>{if(i)return;let g=b.clientX-s,S=b.clientY-a;g*g+S*S>=mt*mt&&f(b)},d=()=>{l!==null&&(window.clearTimeout(l),l=null),m()},m=()=>{window.removeEventListener("mousemove",c,!0),window.removeEventListener("mouseup",d,!0),l!==null&&(window.clearTimeout(l),l=null),this.watcherCleanups.delete(m)},f=b=>{if(i)return;i=!0,n.value=!0,l!==null&&(window.clearTimeout(l),l=null),m();let g=this.entries.find(S=>S.record.id===t.id);g&&this.enterDragMode(g,b)};window.addEventListener("mousemove",c,!0),window.addEventListener("mouseup",d,!0),this.watcherCleanups.add(m)})}enterDragMode(e,t){let n=e.node,o=n.style.opacity,s=n.style.transform,a=n.style.cursor,i=n.style.transition,l=t.clientX+window.scrollX,c=t.clientY+window.scrollY,d=ve(this.colors),m=h("div",{style:`
        position:fixed;inset:0;z-index:${2147483646};
        background:transparent;cursor:grabbing;
      `});m.setAttribute("aria-hidden","true"),m.setAttribute("data-ccm-drag-overlay","true");let f=h("div",{style:`
        position:fixed;top:0;left:0;right:0;z-index:${2147483647};
        height:52px;background:${this.colors.glassBg};
        backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
        border-bottom:1px solid ${this.colors.glassBorder};
        display:flex;align-items:center;justify-content:center;gap:16px;
        pointer-events:auto;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:14px;color:${this.colors.text};
      `});f.setAttribute("data-ccm-drag-toolbar","true");let b=h("span",{style:"font-weight:500;letter-spacing:-0.01em;"});y(b,this.t("relocate.instruction"));let g=document.createElement("button");g.type="button",g.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;
      font-size:13px;font-weight:500;cursor:pointer;
    `,y(g,this.t("relocate.cancel")),f.appendChild(b),f.appendChild(g),document.body.appendChild(m),document.body.appendChild(f),n.style.opacity="0.75",n.style.cursor="grabbing",n.style.transition="none",n.style.transform="translate(-50%, -50%)",n.style.position="fixed",n.style.top=`${t.clientY}px`,n.style.left=`${t.clientX}px`;let S=!1;this.dragInFlight=!0;let A=(x,k)=>{m.style.pointerEvents="none",f.style.pointerEvents="none";let M=n.style.pointerEvents;n.style.pointerEvents="none";let _=document.elementFromPoint(x,k);return m.style.pointerEvents="auto",f.style.pointerEvents="auto",n.style.pointerEvents=M,_},E=x=>{n.style.top=`${x.clientY}px`,n.style.left=`${x.clientX}px`;let k=A(x.clientX,x.clientY);if(!k||!(k instanceof HTMLElement)){d.clear();return}if(this.shouldIgnoreElement(k)||n.contains(k)||k===n){d.clear();return}if(k===document.documentElement||k===document.body){d.clear();return}d.apply(k)},u=()=>{S||(S=!0,window.removeEventListener("mousemove",E,!0),window.removeEventListener("mouseup",p,!0),document.removeEventListener("keydown",L,!0),window.removeEventListener("contextmenu",P,!0),window.removeEventListener("popstate",v,!0),d.destroy(),m.remove(),f.remove(),n.style.position="absolute",n.style.opacity=o,n.style.transform=s,n.style.cursor=a,n.style.transition=i,this.dragInFlight=!1,this.dragCleanup=null,this.reposition())};this.dragCleanup=u;let v=()=>{C()},C=()=>{u()},L=x=>{x.key==="Escape"&&(x.preventDefault(),C())},P=x=>{x.preventDefault(),C()};g.addEventListener("click",x=>{x.preventDefault(),x.stopPropagation(),C()});let p=x=>{if(S)return;let k=A(x.clientX,x.clientY),M=e.record.kind??"target",_=e.record.id,z=(N,w)=>{let R=window.scrollX+8,X=window.scrollX+window.innerWidth-8,j=N+w;return j<R?R-w:j>X?X-w:N},B=null;if(M==="area"){let N=x.clientX+window.scrollX-l,w=x.clientY+window.scrollY-c,R=e.record.areaX??0,X=e.record.areaY??0,j=e.record.areaW??0,ke=e.record.areaH??0,At=z(R+N,j),Tt=X+w;B={kind:"area",anchor:this.entryAnchor(e),rect:{xPct:e.record.xPct,yPct:e.record.yPct,wPct:e.record.wPct,hPct:e.record.hPct},pin:null,area:{x:At,y:Tt,w:j,h:ke}}}else{let N=!k||!(k instanceof HTMLElement)||this.shouldIgnoreElement(k)||k===n||n.contains(k)||k===document.documentElement||k===document.body;if(!N&&k&&M==="target"&&k===e.anchorEl){u();return}if(N)B={kind:"pin",anchor:this.emptyAnchor(),rect:{xPct:0,yPct:0,wPct:0,hPct:0},pin:{x:x.clientX+window.scrollX,y:x.clientY+window.scrollY},area:null};else if(k&&k instanceof HTMLElement){let w=k.getBoundingClientRect(),R=w.width||1,X=w.height||1,j=(x.clientX-w.left)/R,ke=(x.clientY-w.top)/X;B={kind:"target",anchor:he(k),rect:{xPct:j,yPct:ke,wPct:0,hPct:0},pin:null,area:null}}}B&&(this.applyAnchorInputToRecord(e.record,B),this.store.updateAnchor?.(_,B),this.bus.emit("feedback:updated",e.record)),u()};window.addEventListener("mousemove",E,!0),window.addEventListener("mouseup",p,!0),document.addEventListener("keydown",L,!0),window.addEventListener("contextmenu",P,!0),window.addEventListener("popstate",v,!0)}entryAnchor(e){return{cssSelector:e.record.cssSelector,xpath:e.record.xpath,textSnippet:e.record.textSnippet,elementTag:e.record.elementTag,elementId:e.record.elementId,textPrefix:e.record.textPrefix,textSuffix:e.record.textSuffix,fingerprint:e.record.fingerprint,neighborText:e.record.neighborText}}emptyAnchor(){return{cssSelector:"",xpath:"",textSnippet:"",elementTag:"",elementId:void 0,textPrefix:"",textSuffix:"",fingerprint:"",neighborText:""}}applyAnchorInputToRecord(e,t){e.cssSelector=t.anchor.cssSelector,e.xpath=t.anchor.xpath,e.textSnippet=t.anchor.textSnippet,e.elementTag=t.anchor.elementTag,e.elementId=t.anchor.elementId,e.textPrefix=t.anchor.textPrefix,e.textSuffix=t.anchor.textSuffix,e.fingerprint=t.anchor.fingerprint,e.neighborText=t.anchor.neighborText,e.xPct=t.rect.xPct,e.yPct=t.rect.yPct,e.wPct=t.rect.wPct,e.hPct=t.rect.hPct,e.kind=t.kind,t.pin?(e.pinX=t.pin.x,e.pinY=t.pin.y):(delete e.pinX,delete e.pinY),t.area?(e.areaX=t.area.x,e.areaY=t.area.y,e.areaW=t.area.w,e.areaH=t.area.h):(delete e.areaX,delete e.areaY,delete e.areaW,delete e.areaH)}openPopover(e,t){this.closePopover();let n=h("div",{style:`
        z-index:${2147483647};max-width:300px;min-width:220px;padding:14px;
        border-radius:12px;background:${this.colors.glassBg};
        backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
        border:1px solid ${this.colors.glassBorder};
        box-shadow:0 8px 32px ${this.colors.shadow},0 2px 8px ${this.colors.shadow};
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        color:${this.colors.text};font-size:13px;line-height:1.5;
        -webkit-font-smoothing:antialiased;
      `});n.setAttribute("role","dialog"),n.setAttribute("aria-label",this.t("marker.ariaLabel",{n:""})),n.classList.add("ccm-popover"),n.addEventListener("click",w=>w.stopPropagation()),n.addEventListener("keydown",w=>{w.key==="Escape"&&(w.preventDefault(),this.closePopover())});let o=h("div",{style:"white-space:pre-wrap;word-break:break-word;margin-bottom:10px;"});y(o,e.message);let s=h("div",{style:`font-size:11px;color:${this.colors.textTertiary};margin-bottom:12px;`}),a=e.authorName?.trim()||"Anonymous";y(s,`${a} \xB7 ${new Date(e.createdAt).toLocaleString()}`);let i=e.status??"todo",l=typeof this.store.updateStatus!="function",c=me({current:i,colors:this.colors,t:this.t,readOnly:l,onPick:w=>this.onStatusPicked(e,w,c)});this.popoverStatusDropdown=c;let d=h("span",{style:`
        display:inline-block;padding:2px 8px;border-radius:9999px;
        font-size:10px;font-weight:600;letter-spacing:0.02em;
        background:${this.colors.glassBgHeavy};color:${this.colors.textTertiary};
        border:1px solid ${this.colors.border};margin-right:6px;text-transform:uppercase;
      `});y(d,e.kind??"target");let m=h("div",{style:"margin-bottom:10px;display:flex;flex-wrap:wrap;gap:4px;align-items:center;"});m.appendChild(c.root),m.appendChild(d);let f=h("div",{style:"display:flex;justify-content:flex-end;gap:8px;"}),b=document.createElement("button");b.type="button",b.style.cssText=`
      height:30px;padding:0 14px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;font-size:12px;font-weight:500;
      cursor:pointer;transition:all 0.2s ease;
    `,y(b,this.t("marker.popover.close")),b.addEventListener("click",()=>this.closePopover());let g=document.createElement("button");g.type="button",g.style.cssText=`
      height:30px;padding:0 14px;border-radius:9999px;
      border:1px solid ${this.colors.typeBug};background:${this.colors.typeBugBg};
      color:${this.colors.typeBug};font-family:inherit;font-size:12px;font-weight:600;
      cursor:pointer;transition:all 0.2s ease;
    `,y(g,this.t("marker.popover.delete")),g.addEventListener("click",()=>{window.confirm(this.t("marker.popover.deleteConfirm"))&&(this.store.delete(e.id),this.bus.emit("feedback:deleted",e.id),this.closePopover(),this.refresh())});let S=h("div",{style:`height:1px;background:${this.colors.border};margin:10px -4px 10px;`}),A=h("div",{style:"display:flex;flex-direction:column;gap:8px;margin-bottom:10px;"}),E=()=>{A.replaceChildren();let w=this.store.listReplies(e.id);if(w.length>0){let R=h("div",{style:`font-size:11px;font-weight:600;color:${this.colors.textTertiary};margin-bottom:2px;letter-spacing:0.02em;text-transform:uppercase;`});y(R,this.t("marker.replies.heading")),A.appendChild(R)}for(let R of w)A.appendChild(this.buildReplyRow(R))};E();let u=h("div",{style:"display:flex;flex-direction:column;gap:6px;margin-bottom:10px;"}),v=h("textarea",{rows:"2",placeholder:this.t("marker.reply.placeholder"),"aria-label":this.t("marker.reply.placeholder"),style:`
        width:100%;box-sizing:border-box;resize:vertical;min-height:48px;max-height:160px;
        border-radius:8px;border:1px solid ${this.colors.border};
        background:${this.colors.glassBg};color:${this.colors.text};
        font-family:inherit;font-size:13px;line-height:1.4;padding:8px 10px;
      `}),C=document.createElement("button");C.type="button",C.style.cssText=`
      align-self:flex-end;height:28px;padding:0 14px;border-radius:9999px;
      border:1px solid ${this.colors.accent};background:${this.colors.accent};
      color:#fff;font-family:inherit;font-size:12px;font-weight:600;
      cursor:pointer;transition:all 0.2s ease;
    `,y(C,this.t("marker.reply.send"));let L=()=>{let w=v.value.trim();if(!w)return;let R=this.store.addReply({projectName:e.projectName,parentId:e.id,message:w,authorName:Y(),url:e.url,path:e.path,viewport:`${window.innerWidth}x${window.innerHeight}`,userAgent:navigator.userAgent});this.bus.emit("feedback:replied",R),v.value="",E(),n.scrollTop=n.scrollHeight};C.addEventListener("click",L),v.addEventListener("keydown",w=>{if(w.key==="Enter"&&!w.shiftKey){w.preventDefault(),L();return}w.key==="Enter"&&(w.metaKey||w.ctrlKey)&&(w.preventDefault(),L())}),u.appendChild(v),u.appendChild(C);let P=this.buildPopoverCopyButton(e.id);f.appendChild(P),f.appendChild(b),f.appendChild(g),n.appendChild(m),n.appendChild(o),n.appendChild(s),n.appendChild(S),n.appendChild(A),n.appendChild(u),n.appendChild(f);let p=Math.min(window.innerHeight*hr,fr);n.style.maxHeight=`${p}px`,n.style.overflowY="auto";let x=t.getBoundingClientRect();n.style.position="fixed",n.style.top="-10000px",n.style.left="-10000px",document.body.appendChild(n),this.popover=n;let k=Math.min(n.offsetHeight,p),M=x.bottom+8,_=x.left-10;M+k>window.innerHeight-bt&&(M=x.top-k-8),_+gt>window.innerWidth&&(_=window.innerWidth-gt-8),M=Math.max(bt,M),_=Math.max(8,_),n.style.top=`${M}px`,n.style.left=`${_}px`;let z=this.bus.on("feedback:replied",w=>{w.parentId===e.id&&(A.querySelector(`[data-reply-id="${w.id}"]`)||(E(),n.scrollTop=n.scrollHeight))}),B=this.bus.on("feedback:deleted",w=>{if(w===e.id){this.closePopover();return}A.querySelector(`[data-reply-id="${w}"]`)&&E()}),N=this.bus.on("feedback:updated",w=>{if(w.id!==e.id)return;let R=w.status??"todo";this.popoverStatusDropdown?.setCurrent(R),e.status=R,this.repositionAndRecolor(e.id)});this.popoverDisposers.push(z,B,N)}buildPopoverCopyButton(e){let t=document.createElement("button");t.type="button",t.title=this.t("drawer.copyId"),t.setAttribute("aria-label",this.t("drawer.copyIdAria")),t.style.cssText=`
      display:inline-flex;align-items:center;justify-content:center;
      height:30px;width:30px;padding:0;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;cursor:pointer;
      transition:all 0.2s ease;
    `;let n=o=>{t.replaceChildren($(o));let s=t.querySelector("svg");s&&(s.style.width="14px",s.style.height="14px")};return n(U),t.addEventListener("click",o=>{o.stopPropagation(),q(e).then(s=>{if(!s){console.warn(`[ccm-feedback] ${this.t("toast.idCopyFailed")}`);return}console.info(`[ccm-feedback] ${this.t("toast.idCopied")}: ${e}`),t.style.color="#16a34a",n(se),window.setTimeout(()=>{t.style.color=this.colors.textTertiary,n(U)},1400)})}),t.addEventListener("keydown",o=>{(o.key==="Enter"||o.key===" ")&&o.stopPropagation()}),t}buildReplyRow(e){let t=h("div",{style:`
        position:relative;padding:8px 10px 8px 10px;border-radius:8px;
        background:${this.colors.glassBgHeavy};
        border:1px solid ${this.colors.border};
      `});t.dataset.replyId=e.id;let n=h("div",{style:`font-size:11px;color:${this.colors.textTertiary};margin-bottom:4px;padding-right:18px;`}),o=e.authorName?.trim()||"Anonymous";y(n,`${o} \xB7 ${new Date(e.createdAt).toLocaleString()}`);let s=h("div",{style:"white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.45;"});y(s,e.message);let a=document.createElement("button");return a.type="button",a.setAttribute("aria-label",this.t("marker.reply.delete")),a.style.cssText=`
      position:absolute;top:4px;right:4px;width:18px;height:18px;
      border-radius:9999px;border:none;background:transparent;
      color:${this.colors.textTertiary};
      font-family:inherit;font-size:14px;line-height:1;cursor:pointer;
      opacity:0;transition:opacity 0.15s ease,color 0.15s ease;
      padding:0;
    `,y(a,"\xD7"),t.addEventListener("mouseenter",()=>{a.style.opacity="1"}),t.addEventListener("mouseleave",()=>{a.style.opacity="0"}),a.addEventListener("focus",()=>{a.style.opacity="1"}),a.addEventListener("blur",()=>{a.style.opacity="0"}),a.addEventListener("click",i=>{i.stopPropagation(),window.confirm(this.t("marker.replyDeleteConfirm"))&&(this.store.delete(e.id),this.bus.emit("feedback:deleted",e.id))}),t.appendChild(n),t.appendChild(s),t.appendChild(a),t}onStatusPicked(e,t,n){this.store.updateStatus?.(e.id,t),e.status=t,this.bus.emit("feedback:updated",e),n.setCurrent(t),n.close(),this.repositionAndRecolor(e.id)}repositionAndRecolor(e){let t=this.entries.find(s=>s.record.id===e);if(!t)return;let n=t.record.status??"todo",o=D[n];t.node.style.background=o.border,t.node.dataset.status=n,t.node.dataset.kind=t.record.kind??"target",t.node.style.animation=n==="question"?"ccm-pulse 1.6s ease-in-out infinite":""}closePopover(){if(this.popover){this.popoverStatusDropdown?.destroy(),this.popoverStatusDropdown=null,this.popover.remove(),this.popover=null;for(let e of this.popoverDisposers)e();this.popoverDisposers=[]}}scheduleReposition(){this.repositionTimer===null&&(this.repositionTimer=window.setTimeout(()=>{this.repositionTimer=null,this.reposition()},pr))}reposition(){let e=document.documentElement.clientWidth,t=V,n=Math.max(V,e-V),o=i=>Math.max(t,Math.min(n,i)),s=0,a=i=>window.scrollY+80+i*(Z+8);for(let i of this.entries){let l=i.record.kind??"target";if(i.node.dataset.kind=l,l==="pin"&&i.record.pinX!=null&&i.record.pinY!=null){i.node.style.display=this.visible?"flex":"none",i.node.style.top=`${i.record.pinY}px`,i.node.style.left=`${o(i.record.pinX)}px`,i.node.dataset.orphan="false",i.anchorEl=null;continue}if(l==="area"&&i.record.areaX!=null&&i.record.areaY!=null&&i.record.areaW!=null&&i.record.areaH!=null){i.node.style.display=this.visible?"flex":"none",i.node.style.top=`${i.record.areaY}px`,i.node.style.left=`${o(i.record.areaX+i.record.areaW)}px`,i.node.dataset.orphan="false",i.anchorEl=null;continue}let c=ft({cssSelector:i.record.cssSelector,xpath:i.record.xpath,textSnippet:i.record.textSnippet,elementTag:i.record.elementTag,elementId:i.record.elementId,textPrefix:i.record.textPrefix,textSuffix:i.record.textSuffix,fingerprint:i.record.fingerprint,neighborText:i.record.neighborText},{xPct:i.record.xPct,yPct:i.record.yPct,wPct:i.record.wPct,hPct:i.record.hPct});if(!c){i.node.style.display=this.visible?"flex":"none",i.node.style.top=`${a(s)}px`,i.node.style.left=`${n}px`,i.node.dataset.orphan="true",i.anchorEl=null,s++;continue}i.node.dataset.orphan="false",i.anchorEl=c.element;let d=c.rect,m=d.top+window.scrollY-V,f=d.right+window.scrollX;i.node.style.display=this.visible?"flex":"none",i.node.style.top=`${m+V}px`,i.node.style.left=`${o(f)}px`}ut(this.entries,{markerSize:Z,collisionRadius:cr,clusterGap:dr,minX:V,clampX:o})}destroy(){this.dragCleanup?.();for(let e of[...this.watcherCleanups])e();this.watcherCleanups.clear(),window.removeEventListener("resize",this.onResize),window.removeEventListener("scroll",this.onScroll),window.removeEventListener("popstate",this.onPopState),document.removeEventListener("click",this.onDocClick,!0),history.pushState=this.origPushState,history.replaceState=this.origReplaceState,this.closePopover(),this.container.remove(),this.entries=[]}};var we=class{constructor(e,t,n,o,s,a){this.colors=e;this.bus=t;this.t=n;this.openPopupForElement=o;this.shouldIgnoreElement=s;this.markers=a;this.overlay=null;this.toolbar=null;this.eyeHandle=null;this.isActive=!1;this.savedOverflow="";this.previouslyFocused=null;this.hoveredElement=null;this.onKeyDown=e=>{e.key==="Escape"&&(e.preventDefault(),this.deactivate())};this.onOverlayMouseMove=e=>{if(!this.overlay)return;this.overlay.style.pointerEvents="none";let t=document.elementFromPoint(e.clientX,e.clientY);if(this.overlay.style.pointerEvents="auto",!t||!(t instanceof HTMLElement)){this.clearHoverOutline();return}if(this.shouldIgnoreElement(t)){this.clearHoverOutline();return}if(t===document.documentElement||t===document.body){this.clearHoverOutline();return}t!==this.hoveredElement&&(this.clearHoverOutline(),this.hoveredElement=t,this.applyHoverOutline(t))};this.onOverlayClick=e=>{if(e.preventDefault(),e.stopPropagation(),!this.overlay)return;this.overlay.style.pointerEvents="none";let t=document.elementFromPoint(e.clientX,e.clientY);this.overlay.style.pointerEvents="auto",!(!t||!(t instanceof HTMLElement))&&(this.shouldIgnoreElement(t)||t===document.documentElement||t===document.body||(this.clearHoverOutline(),this.handleSelect(t)))};this.hoverOutline=ve(this.colors),this.unsubPinStart=this.bus.on("target:start",()=>this.activate())}activate(){if(this.isActive)return;this.isActive=!0,this.savedOverflow=document.body.style.overflow,this.previouslyFocused=document.activeElement instanceof HTMLElement?document.activeElement:null,this.overlay=h("div",{style:`
        position:fixed;inset:0;z-index:${2147483646};
        background:rgba(15, 23, 42, 0.02);
        cursor:crosshair;
      `}),this.overlay.setAttribute("aria-hidden","true"),this.overlay.setAttribute("data-ccm-pin-overlay","true"),this.toolbar=h("div",{style:`
        position:fixed;top:0;left:0;right:0;z-index:${2147483647};
        height:52px;background:${this.colors.glassBg};
        backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
        border-bottom:1px solid ${this.colors.glassBorder};
        display:flex;align-items:center;justify-content:center;gap:16px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:14px;color:${this.colors.text};
      `}),this.toolbar.setAttribute("aria-label",this.t("pin.ariaLabel"));let e=h("span",{style:"font-weight:500;letter-spacing:-0.01em;"});y(e,this.t("pin.instruction"));let t=document.createElement("button");t.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;font-weight:500;cursor:pointer;
    `,y(t,this.t("pin.cancel")),t.addEventListener("click",()=>this.deactivate()),this.eyeHandle=Q({bus:this.bus,t:this.t,colors:this.colors,markers:this.markers}),this.toolbar.appendChild(e),this.toolbar.appendChild(this.eyeHandle.button),this.toolbar.appendChild(t),this.overlay.addEventListener("mousemove",this.onOverlayMouseMove,!0),this.overlay.addEventListener("click",this.onOverlayClick,!0),document.addEventListener("keydown",this.onKeyDown),document.body.style.overflow="hidden",document.body.appendChild(this.overlay),document.body.appendChild(this.toolbar)}deactivate(){if(!this.isActive)return;this.isActive=!1,this.clearHoverOutline(),this.overlay?.removeEventListener("mousemove",this.onOverlayMouseMove,!0),this.overlay?.removeEventListener("click",this.onOverlayClick,!0),document.removeEventListener("keydown",this.onKeyDown),document.body.style.overflow=this.savedOverflow,this.eyeHandle?.destroy(),this.eyeHandle=null,this.overlay?.remove(),this.toolbar?.remove(),this.overlay=null,this.toolbar=null;let e=this.previouslyFocused;if(this.previouslyFocused=null,e&&typeof e.focus=="function"&&document.contains(e))try{e.focus()}catch{}this.bus.emit("target:end")}async handleSelect(e){this.deactivate();try{await this.openPopupForElement(e)}catch(t){console.error("[ccm-feedback] pin-mode: openPopupForElement threw",t)}}applyHoverOutline(e){this.hoverOutline.apply(e),this.hoveredElement=e}clearHoverOutline(){this.hoverOutline.clear(),this.hoveredElement=null}destroy(){this.deactivate(),this.unsubPinStart()}};var mr="linear(0, 0.006, 0.025, 0.06, 0.11, 0.17, 0.25, 0.34, 0.45, 0.56, 0.67, 0.78, 0.88, 0.95, 1.01, 1.04, 1.05, 1.04, 1.02, 1, 0.99, 1)",Be="cubic-bezier(0.16, 1, 0.3, 1)",He="cubic-bezier(0.34, 1.56, 0.64, 1)",gr="cubic-bezier(0.25, 1, 0.5, 1)",yt=`
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
    animation: sp-fab-in 0.5s ${mr} both;
  }

  .sp-anim-marker-in {
    animation: sp-marker-in 0.35s ${He} both;
  }

  .sp-anim-pulse {
    animation: sp-pulse-ring 0.7s ease-out;
  }

  .sp-anim-flash {
    animation: sp-flash-bg 0.5s ${gr};
  }

  .sp-anim-slide-up {
    animation: sp-slide-up 0.3s ${Be} both;
  }

  .sp-anim-fade-in {
    animation: sp-fade-in 0.2s ease-out both;
  }

  /* ---- Transition utilities ---- */

  .sp-panel {
    transform: translateX(110%);
    transition: transform 0.4s ${Be};
  }

  .sp-panel.sp-panel--open {
    transform: translateX(0);
  }

  .sp-radial-item {
    opacity: 0;
    pointer-events: none;
    transform: translate(0, 0) scale(0.8);
    transition:
      transform 0.35s ${He},
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
    animation: sp-card-in 0.35s ${Be} both;
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
    animation: sp-badge-in 0.4s ${He} both;
  }

  /* ---- Reduced motion ---- */

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

`;var xt="#0066ff",br=/^#[0-9a-fA-F]{6}$/,vt=/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/,yr=/^#[0-9a-fA-F]{8}$/;function vr(r){if(br.test(r))return r;let e=vt.test(r)?r.match(vt):null;return e?`#${e[1]}${e[1]}${e[2]}${e[2]}${e[3]}${e[3]}`:yr.test(r)?r.slice(0,7):(console.warn(`[ccm-feedback] Invalid accentColor "${r}" \u2014 only hex colors (#RGB, #RRGGBB, #RRGGBBAA) are supported. Using default.`),xt)}function xr(r,e){let t=Math.max(0,Math.round(parseInt(r.slice(1,3),16)*(1-e))),n=Math.max(0,Math.round(parseInt(r.slice(3,5),16)*(1-e))),o=Math.max(0,Math.round(parseInt(r.slice(5,7),16)*(1-e)));return`#${t.toString(16).padStart(2,"0")}${n.toString(16).padStart(2,"0")}${o.toString(16).padStart(2,"0")}`}function wr(){return typeof window>"u"?!1:window.matchMedia("(prefers-color-scheme: dark)").matches}function kr(r){return r==="dark"||r==="auto"&&wr()?"dark":"light"}function wt(r=xt,e){let t=vr(r),n=xr(t,.15);return kr(e)==="dark"?{accent:t,accentLight:t+"22",accentDark:n,accentGlow:t+"44",accentGradient:`linear-gradient(135deg, ${t}, ${n})`,bg:"#0f172a",bgHover:"#1e293b",text:"#f1f5f9",textSecondary:"#94a3b8",textTertiary:"#64748b",border:"#334155",shadow:"rgba(0, 0, 0, 0.3)",glassBg:"rgba(15, 23, 42, 0.78)",glassBgHeavy:"rgba(15, 23, 42, 0.88)",glassBorder:"rgba(51, 65, 85, 0.5)",glassBorderSubtle:"rgba(51, 65, 85, 0.3)",typeQuestion:"#60a5fa",typeChange:"#fbbf24",typeBug:"#f87171",typeOther:"#94a3b8",typeComment:"#9ca3af",typeQuestionBg:"rgba(59, 130, 246, 0.15)",typeChangeBg:"rgba(245, 158, 11, 0.15)",typeBugBg:"rgba(239, 68, 68, 0.15)",typeOtherBg:"rgba(100, 116, 139, 0.15)",typeCommentBg:"rgba(107, 114, 128, 0.15)"}:{accent:t,accentLight:t+"14",accentDark:n,accentGlow:t+"33",accentGradient:`linear-gradient(135deg, ${t}, ${n})`,bg:"#ffffff",bgHover:"#f8f9fb",text:"#0f172a",textSecondary:"#475569",textTertiary:"#64748b",border:"#e2e8f0",shadow:"rgba(0, 0, 0, 0.06)",glassBg:"rgba(255, 255, 255, 0.72)",glassBgHeavy:"rgba(255, 255, 255, 0.85)",glassBorder:"rgba(255, 255, 255, 0.35)",glassBorderSubtle:"rgba(255, 255, 255, 0.18)",typeQuestion:"#3b82f6",typeChange:"#b45309",typeBug:"#ef4444",typeOther:"#64748b",typeComment:"#6b7280",typeQuestionBg:"#eff6ff",typeChangeBg:"#fffbeb",typeBugBg:"#fef2f2",typeOtherBg:"#f8fafc",typeCommentBg:"#e5e7eb"}}function kt(r){return`
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
  `}function Fe(r){return`
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
      ${kt(r)}

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

    .sp-card-copy {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      padding: 0;
      border: 1px solid transparent;
      border-radius: var(--sp-radius);
      background: transparent;
      color: var(--sp-text-tertiary);
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }

    .sp-card-copy:hover {
      background: var(--sp-glass-bg);
      border-color: var(--sp-glass-border);
      color: var(--sp-text);
    }

    .sp-card-copy:focus-visible {
      outline: 2px solid var(--sp-accent);
      outline-offset: 2px;
    }

    .sp-card-copy svg {
      width: 14px;
      height: 14px;
    }

    .sp-card-copy--ok {
      color: var(--sp-success, #16a34a);
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

    ${yt}
  `}function F(r){let e=r.listForPath(window.location.pathname).filter(o=>!o.parentId),t=0,n=0;for(let o of e){let s=o.status??"todo";s==="todo"?t++:s==="review"&&n++}return{todo:t,review:n}}var ne=null;function Ct(){return{destroy:()=>{},count:()=>0,export:()=>{}}}function ze(r){let e=r.debug?(...p)=>console.debug("[ccm-feedback]",...p):()=>{};if(ne)return e("initCcmFeedback() called more than once \u2014 returning existing instance"),ne;if(!r.projectName||typeof r.projectName!="string")return console.error("[ccm-feedback] Missing or invalid 'projectName' in config."),Ct();if(window.innerWidth<768)return console.info(`[ccm-feedback] Widget not loaded: viewport < ${768}px.`),Ct();e("Initializing",{projectName:r.projectName});let t=wt(r.accentColor,r.theme),n=pt(),o=new be,s=!!(r.supabaseUrl&&r.supabaseKey),a,i=null;s?(i=new pe({url:r.supabaseUrl,apiKey:r.supabaseKey,projectName:r.projectName,log:e,onChange:()=>{f.refresh(),b.updateCounts(F(a)),g.refreshIfOpen()},onReply:p=>o.emit("feedback:replied",p),onReplyDeleted:p=>o.emit("feedback:deleted",p),onUpdated:p=>o.emit("feedback:updated",p)}),a=i,e("Cloud mode enabled",{url:r.supabaseUrl})):(a=new de(r.projectName),e("LocalStorage mode"));let l=document.createElement("ccm-feedback-widget");l.style.cssText=`position:fixed;z-index:${2147483647};`;let c=l.attachShadow({mode:"open"});if("adoptedStyleSheets"in ShadowRoot.prototype){let p=new CSSStyleSheet;p.replaceSync(Fe(t)),c.adoptedStyleSheets=[p]}else{let p=document.createElement("style");p.textContent=Fe(t),c.appendChild(p)}document.body.appendChild(l);let d=new fe(t,n),m=p=>p===l||l.contains(p),f=new xe(t,o,n,a,m),b=new ye(c,o,n,s),g=new ge(c,o,n,a,t,p=>f.scrollToAndFlash(p),p=>f.setIncludeDone(p==="done"));o.on("navigator:open",()=>g.open());let S=()=>({cssSelector:"",xpath:"",textSnippet:"",elementTag:"",elementId:void 0,textPrefix:"",textSuffix:"",fingerprint:"",neighborText:""}),A=async p=>{let x=p.getBoundingClientRect(),k=await d.show(x);if(!k)return;let M=Y(),_=he(p),z=p.getBoundingClientRect(),B=ct(z,z),N=a.save({projectName:r.projectName,message:k.message,authorName:M,url:je(window.location.href),path:window.location.pathname,viewport:`${window.innerWidth}x${window.innerHeight}`,userAgent:navigator.userAgent,anchor:_,rect:B,status:k.status,kind:"target"});o.emit("feedback:saved",N),f.addOne(N),b.updateCounts(F(a)),e("Saved",N.id)},E=async p=>{let x=new DOMRect(p.x-window.scrollX,p.y-window.scrollY,0,0),k=await d.show(x);if(!k)return;let M=a.save({projectName:r.projectName,message:k.message,authorName:Y(),url:je(window.location.href),path:window.location.pathname,viewport:`${window.innerWidth}x${window.innerHeight}`,userAgent:navigator.userAgent,anchor:S(),rect:{xPct:0,yPct:0,wPct:0,hPct:0},status:k.status,kind:"pin",pin:{x:p.x,y:p.y},capturedElements:p.elements});o.emit("feedback:saved",M),f.addOne(M),b.updateCounts(F(a)),e("Saved pin",M.id)},u=async p=>{let x=new DOMRect(p.x-window.scrollX,p.y-window.scrollY,p.w,p.h),k=await d.show(x);if(!k)return;let M=a.save({projectName:r.projectName,message:k.message,authorName:Y(),url:je(window.location.href),path:window.location.pathname,viewport:`${window.innerWidth}x${window.innerHeight}`,userAgent:navigator.userAgent,anchor:S(),rect:{xPct:0,yPct:0,wPct:0,hPct:0},status:k.status,kind:"area",area:{x:p.x,y:p.y,w:p.w,h:p.h},capturedElements:p.elements});o.emit("feedback:saved",M),f.addOne(M),b.updateCounts(F(a)),e("Saved area",M.id)},v=new we(t,o,n,A,m,f),C=new ae(t,o,n,E,m,f),L=new le(t,o,n,u,m,f);o.on("export:click",()=>{let p=a.listAll();if(p.length===0){console.info("[ccm-feedback] No annotations to export.");return}Oe(r.projectName,p)}),o.on("copyUrl:click",()=>{let p=`${window.location.origin}/feedback?project=${encodeURIComponent(r.projectName)}`;q(p).then(x=>{x?console.info(`[ccm-feedback] ${n("toast.urlCopied")}: ${p}`):console.warn(`[ccm-feedback] ${n("toast.urlCopyFailed")} \u2014 ${p}`)})}),o.on("clear:click",()=>{a.list().length!==0&&window.confirm(n("fab.clearConfirm"))&&(a.clear(),f.refresh(),b.updateCounts({todo:0,review:0}),g.refreshIfOpen(),e("Cleared all annotations"))});let P=()=>{b.updateCounts(F(a)),g.refreshIfOpen()};if(o.on("feedback:saved",P),o.on("feedback:updated",P),o.on("feedback:deleted",P),o.on("feedback:replied",()=>g.refreshIfOpen()),f.refresh(),b.updateCounts(F(a)),i){let p=i;p.init().then(async()=>{f.refresh(),b.updateCounts(F(a)),await Cr(p,r.projectName,e)>0&&(f.refresh(),b.updateCounts(F(a)))})}return ne={destroy:()=>{e("Destroying widget"),v.destroy(),C.destroy(),L.destroy(),f.destroy(),b.destroy(),d.destroy(),g.destroy(),o.removeAll(),l.remove(),ne=null},count:()=>a.list().length,export:()=>{let p=a.listAll();p.length!==0&&Oe(r.projectName,p)}},ne}function Er(r){return r.userAgent==="seed"}async function Cr(r,e,t){let n=new Set([e,St()]),o=0;for(let s of n){let a=`ccm-feedback:${s}`,i=null;try{if(localStorage.getItem(`${a}:migrated`))continue;i=localStorage.getItem(a)}catch{continue}if(!i)continue;let l=[];try{let d=JSON.parse(i);if(!Array.isArray(d))continue;l=d.filter(m=>!Er(m)).map(m=>({...m,projectName:e}))}catch{continue}l.length>0&&t("Migrating",l.length,"local records from",a);let c=await r.migrateFromLocal(l);if(c.ok){o+=c.inserted;try{localStorage.setItem(`${a}:migrated`,new Date().toISOString())}catch{}}}return o}function je(r){try{let e=new URL(r);for(let t of[...e.searchParams.keys()])/token|key|secret|auth|session|password|code/i.test(t)&&e.searchParams.delete(t);return e.toString()}catch{return r}}function Sr(r){return!!(!r||r==="localhost"||r==="127.0.0.1"||r==="0.0.0.0"||r==="::1"||r.endsWith(".local")||r.endsWith(".localhost"))}function St(){let{hostname:r,port:e}=window.location,n=(r||"site").replace(/[^a-z0-9]+/gi,"-").replace(/^-+|-+$/g,"").toLowerCase()||"site";return e?`${n}-${e}`:n}if(typeof window<"u"){window.CcmFeedback={init:ze};let r=document.currentScript;if(r){let e=r.dataset.project||St(),t=Sr(window.location.hostname),n={projectName:e,...r.dataset.accent?{accentColor:r.dataset.accent}:{},...r.dataset.theme?{theme:r.dataset.theme}:{},...r.dataset.debug==="true"?{debug:!0}:{},...!t&&r.dataset.supabaseUrl?{supabaseUrl:r.dataset.supabaseUrl}:{},...!t&&r.dataset.supabaseKey?{supabaseKey:r.dataset.supabaseKey}:{}},o=()=>ze(n);document.readyState==="loading"?document.addEventListener("DOMContentLoaded",o,{once:!0}):o()}}return It(Ar);})();
//# sourceMappingURL=w.js.map

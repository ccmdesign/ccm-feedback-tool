/*! CCM Feedback MVP — https://github.com/ccmdesign/ccm-feedback-tool */
"use strict";var CcmFeedback=(()=>{var ge=Object.defineProperty;var kt=Object.getOwnPropertyDescriptor;var Et=Object.getOwnPropertyNames;var Ct=Object.prototype.hasOwnProperty;var St=(r,e)=>{for(var t in e)ge(r,t,{get:e[t],enumerable:!0})},At=(r,e,t,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let o of Et(e))!Ct.call(r,o)&&o!==t&&ge(r,o,{get:()=>e[o],enumerable:!(n=kt(e,o))||n.enumerable});return r};var Tt=r=>At(ge({},"__esModule",{value:!0}),r);var mr={};St(mr,{initCcmFeedback:()=>Ne});var Oe="ccm-feedback:author",Lt="Anonymous";function Pt(){try{let r=localStorage.getItem(Oe);return r?.trim()?r.trim():null}catch{return null}}function $t(r){try{localStorage.setItem(Oe,r.trim())}catch{}}function U(){let r=Pt();if(r)return r;let e=null;try{e=window.prompt("Your name (shown next to your comments):","")}catch{e=null}let t=e?.trim()||Lt;return $t(t),t}function F(r){let n=document.createRange().createContextualFragment(r).firstElementChild;if(!n||n.nodeName.toLowerCase()!=="svg")throw new Error("[ccm-feedback] Invalid SVG string");for(let o of[...n.attributes])o.name.startsWith("on")&&n.removeAttribute(o.name);for(let o of n.querySelectorAll("*"))for(let s of[...o.attributes])s.name.startsWith("on")&&o.removeAttribute(s.name);return n}function p(r,e){let t=document.createElement(r);if(e)for(let[n,o]of Object.entries(e))n==="class"?t.className=o:n==="style"?t.style.cssText=o:t.setAttribute(n,o);return t}function f(r,e){r.textContent=e}var Be=25;function De(r){let e={};for(let n of Array.from(r.attributes))e[n.name]=n.value;let t=r.getBoundingClientRect();return{tag:r.tagName.toLowerCase(),attributes:e,rect:{x:t.left,y:t.top,w:t.width,h:t.height}}}var J=class{constructor(e,t,n,o,s){this.colors=e;this.bus=t;this.t=n;this.onCapture=o;this.shouldIgnoreElement=s;this.overlay=null;this.toolbar=null;this.isActive=!1;this.savedOverflow="";this.onKey=e=>{e.key==="Escape"&&(e.preventDefault(),this.deactivate())};this.onClick=e=>{if(e.preventDefault(),e.stopPropagation(),!this.overlay)return;let t=e.clientX,n=e.clientY;this.overlay.style.pointerEvents="none";let o=document.elementsFromPoint(t,n);this.overlay&&(this.overlay.style.pointerEvents="auto");let s=o.filter(l=>!this.shouldIgnoreElement(l)).filter(l=>l!==document.documentElement&&l!==document.body).slice(0,Be).map(De),a=t+window.scrollX,i=n+window.scrollY;this.deactivate(),this.onCapture({x:a,y:i,elements:s})};this.unsubStart=this.bus.on("pin:start",()=>this.activate())}activate(){if(this.isActive)return;this.isActive=!0,this.savedOverflow=document.body.style.overflow,this.overlay=p("div",{style:`position:fixed;inset:0;z-index:${2147483646};background:rgba(15,23,42,0.04);cursor:crosshair;`}),this.overlay.setAttribute("data-ccm-coord-pin-overlay","true"),this.toolbar=p("div",{style:`
        position:fixed;top:0;left:0;right:0;z-index:${2147483647};
        height:52px;background:${this.colors.glassBg};
        backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
        border-bottom:1px solid ${this.colors.glassBorder};
        display:flex;align-items:center;justify-content:center;gap:16px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:14px;color:${this.colors.text};
      `});let e=p("span",{style:"font-weight:500;letter-spacing:-0.01em;"});f(e,this.t("coordPin.instruction"));let t=document.createElement("button");t.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;
    `,f(t,this.t("pin.cancel")),t.addEventListener("click",()=>this.deactivate()),this.toolbar.appendChild(e),this.toolbar.appendChild(t),this.overlay.addEventListener("click",this.onClick,!0),document.addEventListener("keydown",this.onKey),document.body.style.overflow="hidden",document.body.appendChild(this.overlay),document.body.appendChild(this.toolbar)}deactivate(){this.isActive&&(this.isActive=!1,this.overlay?.removeEventListener("click",this.onClick,!0),document.removeEventListener("keydown",this.onKey),document.body.style.overflow=this.savedOverflow,this.overlay?.remove(),this.toolbar?.remove(),this.overlay=null,this.toolbar=null,this.bus.emit("pin:end"))}destroy(){this.deactivate(),this.unsubStart()}},Z=class{constructor(e,t,n,o,s){this.colors=e;this.bus=t;this.t=n;this.onCapture=o;this.shouldIgnoreElement=s;this.overlay=null;this.toolbar=null;this.rectEl=null;this.isActive=!1;this.savedOverflow="";this.dragStart=null;this.onKey=e=>{e.key==="Escape"&&(e.preventDefault(),this.deactivate())};this.onMouseDown=e=>{e.preventDefault(),e.stopPropagation(),this.dragStart={x:e.clientX,y:e.clientY},this.rectEl||(this.rectEl=p("div",{style:`
          position:fixed;z-index:${2147483647};
          border:2px dashed ${this.colors.accent};
          background:${this.colors.accent}1a;
          pointer-events:none;
        `}),document.body.appendChild(this.rectEl)),this.updateRect(e.clientX,e.clientY)};this.onMouseMove=e=>{this.dragStart&&this.updateRect(e.clientX,e.clientY)};this.onMouseUp=e=>{if(!this.dragStart)return;e.preventDefault(),e.stopPropagation();let t=this.dragStart,n=Math.min(t.x,e.clientX),o=Math.min(t.y,e.clientY),s=Math.abs(e.clientX-t.x),a=Math.abs(e.clientY-t.y);if(this.dragStart=null,s<4||a<4){this.rectEl?.remove(),this.rectEl=null;return}let i=this.collectElements(n,o,s,a),l=n+window.scrollX,c=o+window.scrollY;this.deactivate(),this.onCapture({x:l,y:c,w:s,h:a,elements:i})};this.unsubStart=this.bus.on("area:start",()=>this.activate())}activate(){if(this.isActive)return;this.isActive=!0,this.savedOverflow=document.body.style.overflow,this.overlay=p("div",{style:`position:fixed;inset:0;z-index:${2147483646};background:rgba(15,23,42,0.04);cursor:crosshair;`}),this.overlay.setAttribute("data-ccm-area-overlay","true"),this.toolbar=p("div",{style:`
        position:fixed;top:0;left:0;right:0;z-index:${2147483647};
        height:52px;background:${this.colors.glassBg};
        backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
        border-bottom:1px solid ${this.colors.glassBorder};
        display:flex;align-items:center;justify-content:center;gap:16px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:14px;color:${this.colors.text};
      `});let e=p("span",{style:"font-weight:500;letter-spacing:-0.01em;"});f(e,this.t("area.instruction"));let t=document.createElement("button");t.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;
    `,f(t,this.t("pin.cancel")),t.addEventListener("click",()=>this.deactivate()),this.toolbar.appendChild(e),this.toolbar.appendChild(t),this.overlay.addEventListener("mousedown",this.onMouseDown,!0),this.overlay.addEventListener("mousemove",this.onMouseMove,!0),this.overlay.addEventListener("mouseup",this.onMouseUp,!0),document.addEventListener("keydown",this.onKey),document.body.style.overflow="hidden",document.body.appendChild(this.overlay),document.body.appendChild(this.toolbar)}deactivate(){this.isActive&&(this.isActive=!1,this.overlay?.removeEventListener("mousedown",this.onMouseDown,!0),this.overlay?.removeEventListener("mousemove",this.onMouseMove,!0),this.overlay?.removeEventListener("mouseup",this.onMouseUp,!0),document.removeEventListener("keydown",this.onKey),document.body.style.overflow=this.savedOverflow,this.overlay?.remove(),this.toolbar?.remove(),this.rectEl?.remove(),this.overlay=null,this.toolbar=null,this.rectEl=null,this.dragStart=null,this.bus.emit("area:end"))}updateRect(e,t){if(!this.rectEl||!this.dragStart)return;let n=Math.min(this.dragStart.x,e),o=Math.min(this.dragStart.y,t),s=Math.abs(e-this.dragStart.x),a=Math.abs(t-this.dragStart.y);this.rectEl.style.left=`${n}px`,this.rectEl.style.top=`${o}px`,this.rectEl.style.width=`${s}px`,this.rectEl.style.height=`${a}px`}collectElements(e,t,n,o){let s=e+n,a=t+o,i=document.body.getElementsByTagName("*"),l=[];for(let c of Array.from(i)){if(l.length>=Be)break;if(this.shouldIgnoreElement(c)||c===document.documentElement||c===document.body)continue;let d=c.getBoundingClientRect();d.width===0||d.height===0||d.right<e||d.left>s||d.bottom<t||d.top>a||l.push(De(c))}return l}destroy(){this.deactivate(),this.unsubStart()}};var ee=class{constructor(e){this.opts=e;this.ws=null;this.destroyed=!1;this.heartbeat=null;this.reconnectAttempt=0;this.refCounter=1;this.topic=`realtime:${e.schema??"public"}:${e.table}`,this.log=e.log??(()=>{})}connect(){if(this.destroyed)return;let e=`${this.opts.url.replace(/^http/,"ws").replace(/\/$/,"")}/realtime/v1/websocket?apikey=${encodeURIComponent(this.opts.apiKey)}&vsn=1.0.0`,t;try{t=new WebSocket(e)}catch(n){this.log("realtime ws constructor error",n),this.scheduleReconnect();return}this.ws=t,t.addEventListener("open",()=>{this.reconnectAttempt=0,this.send({topic:this.topic,event:"phx_join",payload:{config:{postgres_changes:[{event:"*",schema:this.opts.schema??"public",table:this.opts.table,filter:this.opts.filter}]},access_token:this.opts.apiKey},ref:String(this.refCounter++)}),this.heartbeat=setInterval(()=>{this.send({topic:"phoenix",event:"heartbeat",payload:{},ref:String(this.refCounter++)})},25e3),this.log("realtime connected")}),t.addEventListener("message",n=>this.handleMessage(n.data)),t.addEventListener("close",()=>{this.cleanupSocket(),this.destroyed||this.scheduleReconnect()}),t.addEventListener("error",n=>{this.log("realtime ws error",n)})}cleanupSocket(){this.heartbeat&&(clearInterval(this.heartbeat),this.heartbeat=null),this.ws=null}scheduleReconnect(){let e=Math.min(1e3*2**this.reconnectAttempt,3e4);this.reconnectAttempt+=1,setTimeout(()=>{this.destroyed||this.connect()},e)}send(e){if(!(!this.ws||this.ws.readyState!==WebSocket.OPEN))try{this.ws.send(JSON.stringify(e))}catch(t){this.log("realtime send error",t)}}handleMessage(e){if(typeof e!="string")return;let t;try{t=JSON.parse(e)}catch{return}if(t.event!=="postgres_changes")return;let o=t.payload?.data;if(!o)return;let s=o.type,a=o.record??o.old_record;a&&(s==="INSERT"?this.opts.onInsert(a):s==="UPDATE"?this.opts.onUpdate(a):s==="DELETE"&&this.opts.onDelete(a))}destroy(){if(this.destroyed=!0,this.cleanupSocket(),this.ws)try{this.ws.close()}catch{}}};function be(r){return`ccm-feedback:${r}`}function R(r){return!r||r==="/"?"/":r.endsWith("/")?r.slice(0,-1):r}function He(){try{return crypto.randomUUID()}catch{return`${Date.now()}-${Math.random().toString(36).slice(2)}`}}function O(r){try{let e=localStorage.getItem(be(r));if(!e)return[];let t=JSON.parse(e);return Array.isArray(t)?t:[]}catch{return[]}}function W(r,e){try{localStorage.setItem(be(r),JSON.stringify(e))}catch{}}function xe(r){let e={id:He(),projectName:r.projectName,message:r.message,authorName:r.authorName,url:r.url,path:R(r.path),viewport:r.viewport,userAgent:r.userAgent,createdAt:new Date().toISOString(),cssSelector:r.anchor.cssSelector,xpath:r.anchor.xpath,textSnippet:r.anchor.textSnippet,elementTag:r.anchor.elementTag,elementId:r.anchor.elementId,textPrefix:r.anchor.textPrefix,textSuffix:r.anchor.textSuffix,fingerprint:r.anchor.fingerprint,neighborText:r.anchor.neighborText,xPct:r.rect.xPct,yPct:r.rect.yPct,wPct:r.rect.wPct,hPct:r.rect.hPct,status:r.status??"todo",kind:r.kind??"target"};return r.pin&&(e.pinX=r.pin.x,e.pinY=r.pin.y),r.area&&(e.areaX=r.area.x,e.areaY=r.area.y,e.areaW=r.area.w,e.areaH=r.area.h),r.capturedElements&&r.capturedElements.length>0&&(e.capturedElements=r.capturedElements),e}function ve(r){return{id:He(),projectName:r.projectName,message:r.message,authorName:r.authorName,url:r.url,path:R(r.path),viewport:r.viewport,userAgent:r.userAgent,createdAt:new Date().toISOString(),cssSelector:"",xpath:"",textSnippet:"",elementTag:"",elementId:void 0,textPrefix:"",textSuffix:"",fingerprint:"",neighborText:"",xPct:0,yPct:0,wPct:0,hPct:0,parentId:r.parentId}}var te=class{constructor(e){this.projectName=e}list(){return O(this.projectName).filter(e=>!e.parentId)}listForPath(e){let t=R(e);return O(this.projectName).filter(n=>!n.parentId&&R(n.path)===t)}save(e){let t=O(this.projectName),n=xe(e);return t.unshift(n),W(this.projectName,t),n}delete(e){let t=O(this.projectName);if(t.findIndex(s=>s.id===e)===-1)return!1;let o=t.filter(s=>s.id!==e&&s.parentId!==e);return W(this.projectName,o),!0}clear(){localStorage.removeItem(be(this.projectName))}updateStatus(e,t){let n=O(this.projectName),o=n.find(s=>s.id===e);return o?(o.status=t,W(this.projectName,n),!0):!1}updateAnchor(e,t){let n=O(this.projectName),o=n.find(s=>s.id===e);return o?(o.cssSelector=t.anchor.cssSelector,o.xpath=t.anchor.xpath,o.textSnippet=t.anchor.textSnippet,o.elementTag=t.anchor.elementTag,o.elementId=t.anchor.elementId,o.textPrefix=t.anchor.textPrefix,o.textSuffix=t.anchor.textSuffix,o.fingerprint=t.anchor.fingerprint,o.neighborText=t.anchor.neighborText,o.xPct=t.rect.xPct,o.yPct=t.rect.yPct,o.wPct=t.rect.wPct,o.hPct=t.rect.hPct,o.kind=t.kind,t.pin?(o.pinX=t.pin.x,o.pinY=t.pin.y):(delete o.pinX,delete o.pinY),t.area?(o.areaX=t.area.x,o.areaY=t.area.y,o.areaW=t.area.w,o.areaH=t.area.h):(delete o.areaX,delete o.areaY,delete o.areaW,delete o.areaH),W(this.projectName,n),!0):!1}listReplies(e){return O(this.projectName).filter(t=>t.parentId===e).sort((t,n)=>t.createdAt.localeCompare(n.createdAt))}addReply(e){let t=O(this.projectName),n=ve(e);return t.push(n),W(this.projectName,t),n}};var Fe="ccm_widget_annotations";function ye(r){if(!r)return null;let e=r.lastIndexOf("/");if(e===-1)return null;let t=r.slice(e+1).trim();if(t===""||t==="*")return null;let n=Number(t);return Number.isFinite(n)?n:null}function re(r){let e={id:r.id,projectName:r.project_name,message:r.message,authorName:r.author_name,url:r.url,path:r.path,viewport:r.viewport,userAgent:r.user_agent,cssSelector:r.css_selector,xpath:r.xpath,textSnippet:r.text_snippet,elementTag:r.element_tag,elementId:r.element_id??void 0,textPrefix:r.text_prefix,textSuffix:r.text_suffix,fingerprint:r.fingerprint,neighborText:r.neighbor_text,xPct:r.x_pct,yPct:r.y_pct,wPct:r.w_pct,hPct:r.h_pct,createdAt:r.created_at,status:r.status??"todo",kind:r.kind??"target"};return r.pin_x!=null&&r.pin_y!=null&&(e.pinX=r.pin_x,e.pinY=r.pin_y),r.area_x!=null&&r.area_y!=null&&r.area_w!=null&&r.area_h!=null&&(e.areaX=r.area_x,e.areaY=r.area_y,e.areaW=r.area_w,e.areaH=r.area_h),r.captured_elements&&Array.isArray(r.captured_elements)&&(e.capturedElements=r.captured_elements),r.parent_id&&(e.parentId=r.parent_id),e}function je(r){let e={id:r.id,project_name:r.projectName,message:r.message,author_name:r.authorName,url:r.url,path:r.path,viewport:r.viewport,user_agent:r.userAgent,css_selector:r.cssSelector,xpath:r.xpath,text_snippet:r.textSnippet,element_tag:r.elementTag,element_id:r.elementId??null,text_prefix:r.textPrefix,text_suffix:r.textSuffix,fingerprint:r.fingerprint,neighbor_text:r.neighborText,x_pct:r.xPct,y_pct:r.yPct,w_pct:r.wPct,h_pct:r.hPct,created_at:r.createdAt};return r.status&&(e.status=r.status),r.kind&&(e.kind=r.kind),r.pinX!=null&&(e.pin_x=r.pinX),r.pinY!=null&&(e.pin_y=r.pinY),r.areaX!=null&&(e.area_x=r.areaX),r.areaY!=null&&(e.area_y=r.areaY),r.areaW!=null&&(e.area_w=r.areaW),r.areaH!=null&&(e.area_h=r.areaH),r.capturedElements&&(e.captured_elements=r.capturedElements),r.parentId&&(e.parent_id=r.parentId),e}var ne=class{constructor(e){this.cache=[];this.realtime=null;this.projectName=e.projectName,this.url=e.url,this.apiKey=e.apiKey,this.onChange=e.onChange??(()=>{}),this.onReply=e.onReply??(()=>{}),this.onReplyDeleted=e.onReplyDeleted??(()=>{}),this.onUpdated=e.onUpdated??(()=>{}),this.log=e.log??(()=>{}),this.endpoint=`${e.url.replace(/\/$/,"")}/rest/v1/${Fe}`,this.headers={apikey:e.apiKey,Authorization:`Bearer ${e.apiKey}`,"Content-Type":"application/json",Prefer:"return=representation"}}async init(){try{let e=`${this.endpoint}?project_name=eq.${encodeURIComponent(this.projectName)}&order=created_at.desc`,t=await fetch(e,{headers:this.headers});if(!t.ok){let o=await t.text();console.warn(`[ccm-feedback] cloud fetch failed: ${t.status} ${o}`);return}let n=await t.json();this.cache=n.map(re),this.log("cloud loaded",this.cache.length,"annotations"),this.startRealtime()}catch(e){console.warn("[ccm-feedback] cloud fetch error",e)}}startRealtime(){this.realtime||(this.realtime=new ee({url:this.url,apiKey:this.apiKey,table:Fe,filter:`project_name=eq.${this.projectName}`,log:this.log,onInsert:e=>{let t=e;if(this.cache.some(o=>o.id===t.id))return;let n=re(t);if(n.parentId){this.cache.push(n),this.onReply(n);return}this.cache.unshift(n),this.onChange()},onUpdate:e=>{let n=re(e),o=this.cache.findIndex(s=>s.id===n.id);o===-1?this.cache.unshift(n):this.cache[o]=n,!n.parentId&&(this.onUpdated(n),this.onChange())},onDelete:e=>{let t=e.id;if(!t)return;let n=this.cache.findIndex(s=>s.id===t);if(n===-1)return;let o=this.cache[n];if(this.cache.splice(n,1),o?.parentId){this.onReplyDeleted(t);return}this.onChange()}}),this.realtime.connect())}destroy(){this.realtime?.destroy(),this.realtime=null}list(){return this.cache.filter(e=>!e.parentId)}listForPath(e){let t=R(e);return this.cache.filter(n=>!n.parentId&&R(n.path)===t)}save(e){let t=xe(e);return this.cache.unshift(t),this.pushInsert(t),t}updateStatus(e,t){let n=this.cache.find(o=>o.id===e);return n?(n.status=t,this.pushUpdate(e,{status:t}),!0):!1}updateAnchor(e,t){let n=this.cache.find(s=>s.id===e);if(!n)return!1;n.cssSelector=t.anchor.cssSelector,n.xpath=t.anchor.xpath,n.textSnippet=t.anchor.textSnippet,n.elementTag=t.anchor.elementTag,n.elementId=t.anchor.elementId,n.textPrefix=t.anchor.textPrefix,n.textSuffix=t.anchor.textSuffix,n.fingerprint=t.anchor.fingerprint,n.neighborText=t.anchor.neighborText,n.xPct=t.rect.xPct,n.yPct=t.rect.yPct,n.wPct=t.rect.wPct,n.hPct=t.rect.hPct,n.kind=t.kind,t.pin?(n.pinX=t.pin.x,n.pinY=t.pin.y):(delete n.pinX,delete n.pinY),t.area?(n.areaX=t.area.x,n.areaY=t.area.y,n.areaW=t.area.w,n.areaH=t.area.h):(delete n.areaX,delete n.areaY,delete n.areaW,delete n.areaH);let o={css_selector:t.anchor.cssSelector,xpath:t.anchor.xpath,text_snippet:t.anchor.textSnippet,element_tag:t.anchor.elementTag,element_id:t.anchor.elementId??null,text_prefix:t.anchor.textPrefix,text_suffix:t.anchor.textSuffix,fingerprint:t.anchor.fingerprint,neighbor_text:t.anchor.neighborText,x_pct:t.rect.xPct,y_pct:t.rect.yPct,w_pct:t.rect.wPct,h_pct:t.rect.hPct,kind:t.kind,pin_x:t.pin?t.pin.x:null,pin_y:t.pin?t.pin.y:null,area_x:t.area?t.area.x:null,area_y:t.area?t.area.y:null,area_w:t.area?t.area.w:null,area_h:t.area?t.area.h:null};return this.pushUpdate(e,o),!0}delete(e){return this.cache.findIndex(n=>n.id===e)===-1?!1:(this.cache=this.cache.filter(n=>n.id!==e&&n.parentId!==e),this.pushDelete(e),!0)}clear(){let e=this.cache.map(t=>t.id);this.cache=[],this.pushClear(e)}listReplies(e){return this.cache.filter(t=>t.parentId===e).sort((t,n)=>t.createdAt.localeCompare(n.createdAt))}addReply(e){let t=ve(e);return this.cache.push(t),this.pushInsert(t),t}async migrateFromLocal(e){if(e.length===0)return 0;let t=new Set(this.cache.map(o=>o.id)),n=e.filter(o=>!t.has(o.id));if(n.length===0)return 0;try{let o=await fetch(this.endpoint,{method:"POST",headers:{...this.headers,Prefer:"return=representation,resolution=ignore-duplicates"},body:JSON.stringify(n.map(je))});if(!o.ok){let a=await o.text();return console.warn(`[ccm-feedback] cloud migrate failed: ${o.status} ${a}`),0}let s=await o.json();for(let a of s){let i=re(a);this.cache.some(l=>l.id===i.id)||this.cache.unshift(i)}return this.log("cloud migrated",s.length,"of",n.length,"local annotations"),this.onChange(),s.length}catch(o){return console.warn("[ccm-feedback] cloud migrate error",o),0}}async pushInsert(e){try{let t=await fetch(this.endpoint,{method:"POST",headers:this.headers,body:JSON.stringify(je(e))});if(!t.ok){let n=await t.text();console.warn(`[ccm-feedback] cloud insert failed: ${t.status} ${n}`)}}catch(t){console.warn("[ccm-feedback] cloud insert error",t)}}async pushUpdate(e,t){try{let n=await fetch(`${this.endpoint}?id=eq.${encodeURIComponent(e)}`,{method:"PATCH",headers:{...this.headers,Prefer:"return=representation, count=exact"},body:JSON.stringify(t)});if(!n.ok){let s=await n.text();console.warn(`[ccm-feedback] cloud update failed: ${n.status} ${s}`);return}ye(n.headers.get("content-range"))===0&&console.error(`[ccm-feedback] cloud update no-op for id=${e} \u2014 possible RLS misconfiguration or stale id`)}catch(n){console.warn("[ccm-feedback] cloud update error",n)}}async pushDelete(e){try{let t=await fetch(`${this.endpoint}?id=eq.${encodeURIComponent(e)}`,{method:"DELETE",headers:{...this.headers,Prefer:"return=representation, count=exact"}});if(!t.ok){let o=await t.text();console.warn(`[ccm-feedback] cloud delete failed: ${t.status} ${o}`);return}ye(t.headers.get("content-range"))===0&&console.error(`[ccm-feedback] cloud delete no-op for id=${e} \u2014 possible RLS misconfiguration or stale id`)}catch(t){console.warn("[ccm-feedback] cloud delete error",t)}}async pushClear(e){if(e.length!==0)try{let t=e.map(s=>`"${s}"`).join(","),n=await fetch(`${this.endpoint}?id=in.(${t})`,{method:"DELETE",headers:{...this.headers,Prefer:"return=representation, count=exact"}});if(!n.ok){let s=await n.text();console.warn(`[ccm-feedback] cloud clear failed: ${n.status} ${s}`);return}let o=ye(n.headers.get("content-range"));o!==null&&o<e.length&&console.warn(`[ccm-feedback] cloud clear partial: expected ${e.length} deleted ${o}`)}catch(t){console.warn("[ccm-feedback] cloud clear error",t)}}};var Mt=new Set(["role","name","aria-label","rel","href"]);function Rt(r,e){let t=Mt.has(r);t||(t=r.startsWith("data-")&&G(r));let n=G(e)&&e.length<100;return n||(n=e.startsWith("#")&&G(e.slice(1))),t&&n}function It(r){return G(r)}function _t(r){return G(r)}function Nt(r){return!0}function Xe(r,e){if(r.nodeType!==Node.ELEMENT_NODE)throw new Error("Can't generate CSS selector for non-element node type.");if(r.tagName.toLowerCase()==="html")return"html";let t={root:document.body,idName:It,className:_t,tagName:Nt,attr:Rt,timeoutMs:1e3,seedMinLength:3,optimizedMinLength:2,maxNumberOfPathChecks:1/0},n=new Date,o={...t,...e},s=Ft(o.root,t),a,i=0;for(let c of Ot(r,o,s)){if(new Date().getTime()-n.getTime()>o.timeoutMs||i>=o.maxNumberOfPathChecks){let m=Dt(r,s);if(!m)throw new Error(`Timeout: Can't find a unique selector after ${o.timeoutMs}ms`);return q(m)}if(i++,Ee(c,s)){a=c;break}}if(!a)throw new Error("Selector was not found.");let l=[...Ke(a,r,o,s,n)];return l.sort(we),l.length>0?q(l[0]):q(a)}function*Ot(r,e,t){let n=[],o=[],s=r,a=0;for(;s&&s!==t;){let i=Bt(s,e);for(let l of i)l.level=a;if(n.push(i),s=s.parentElement,a++,o.push(...Ye(n)),a>=e.seedMinLength){o.sort(we);for(let l of o)yield l;o=[]}}o.sort(we);for(let i of o)yield i}function G(r){if(/^[a-z\-]{3,}$/i.test(r)){let e=r.split(/-|[A-Z]/);for(let t of e)if(t.length<=2||/[^aeiou]{4,}/i.test(t))return!1;return!0}return!1}function Bt(r,e){let t=[],n=r.getAttribute("id");n&&e.idName(n)&&t.push({name:"#"+CSS.escape(n),penalty:0});for(let a=0;a<r.classList.length;a++){let i=r.classList[a];e.className(i)&&t.push({name:"."+CSS.escape(i),penalty:1})}for(let a=0;a<r.attributes.length;a++){let i=r.attributes[a];e.attr(i.name,i.value)&&t.push({name:`[${CSS.escape(i.name)}="${CSS.escape(i.value)}"]`,penalty:2})}let o=r.tagName.toLowerCase();if(e.tagName(o)){t.push({name:o,penalty:5});let a=ke(r,o);a!==void 0&&t.push({name:Ue(o,a),penalty:10})}let s=ke(r);return s!==void 0&&t.push({name:Ht(o,s),penalty:50}),t}function q(r){let e=r[0],t=e.name;for(let n=1;n<r.length;n++){let o=r[n].level||0;e.level===o-1?t=`${r[n].name} > ${t}`:t=`${r[n].name} ${t}`,e=r[n]}return t}function ze(r){return r.map(e=>e.penalty).reduce((e,t)=>e+t,0)}function we(r,e){return ze(r)-ze(e)}function ke(r,e){let t=r.parentNode;if(!t)return;let n=t.firstChild;if(!n)return;let o=0;for(;n&&(n.nodeType===Node.ELEMENT_NODE&&(e===void 0||n.tagName.toLowerCase()===e)&&o++,n!==r);)n=n.nextSibling;return o}function Dt(r,e){let t=0,n=r,o=[];for(;n&&n!==e;){let s=n.tagName.toLowerCase(),a=ke(n,s);if(a===void 0)return;o.push({name:Ue(s,a),penalty:NaN,level:t}),n=n.parentElement,t++}if(Ee(o,e))return o}function Ht(r,e){return r==="html"?"html":`${r}:nth-child(${e})`}function Ue(r,e){return r==="html"?"html":`${r}:nth-of-type(${e})`}function*Ye(r,e=[]){if(r.length>0)for(let t of r[0])yield*Ye(r.slice(1,r.length),e.concat(t));else yield e}function Ft(r,e){return r.nodeType===Node.DOCUMENT_NODE?r:r===e.root?r.ownerDocument:r}function Ee(r,e){let t=q(r);switch(e.querySelectorAll(t).length){case 0:throw new Error(`Can't select any node with this selector: ${t}`);case 1:return!0;default:return!1}}function*Ke(r,e,t,n,o){if(r.length>2&&r.length>t.optimizedMinLength)for(let s=1;s<r.length-1;s++){if(new Date().getTime()-o.getTime()>t.timeoutMs)return;let i=[...r];i.splice(s,1),Ee(i,n)&&n.querySelector(q(i))===e&&(yield i,yield*Ke(i,e,t,n,o))}}var jt=["role","aria-label","type","name","href","src","data-testid","data-id"];function zt(r){let e=5381;for(let t=0;t<r.length;t++)e=(e<<5)+e+r.charCodeAt(t)|0;return(e>>>0).toString(36)}function Ce(r){let e=r.children.length,t=0,n=r.parentElement;if(n)for(let a of n.children){if(a===r)break;a.tagName===r.tagName&&t++}let o=[];for(let a of jt){let i=r.getAttribute(a);i&&o.push(`${a}=${i}`)}let s=o.length>0?zt(o.join(",")):"0";return`${e}:${t}:${s}`}function We(r,e){let t=e.split(":");if(t.length!==3)return 0;let[n,o,s]=t,a=Number(n),i=Number(o);if(Number.isNaN(a)||Number.isNaN(i))return 0;let l=Ce(r),[c,d,m]=l.split(":"),b=0,x=Math.abs(Number(c)-a);x===0?b+=.2:x<=2?b+=.1:x<=5&&(b+=.03);let g=Math.abs(Number(d)-i);return g===0?b+=.4:g===1?b+=.2:g<=3&&(b+=.08),m===s&&(b+=.4),b}function Y(r,e){let t=e==="before"?"previousElementSibling":"nextElementSibling",n=r[t],o=3;for(;n&&o>0;){let s=n.textContent?.trim();if(s)return e==="before"?s.slice(-32):s.slice(0,32);n=n[t],o--}return""}function oe(r){let e=r.previousElementSibling?.textContent?.trim().slice(0,40)??"",t=r.nextElementSibling?.textContent?.trim().slice(0,40)??"";return[e,t].filter(Boolean).join(" | ")}function Ge(r){if(r.id){let n=r.id.includes("'")?`concat('${r.id.replace(/'/g,`',"'",'`)}')`:`'${r.id}'`;return`//${r.localName}[@id=${n}]`}let e=[],t=r;for(;t&&t!==document.body&&e.length<6;){let n=t.localName,o=t.parentElement;if(t.id){let a=t.id.includes("'")?`concat('${t.id.replace(/'/g,`',"'",'`)}')`:`'${t.id}'`;return e.unshift(`/${n}[@id=${a}]`),"/"+e.join("")}let s=1;if(o)for(let a of o.children){if(a===t)break;a.localName===n&&s++}e.unshift(`/${n}[${s}]`),t=o}return"/html/body"+e.join("")}function ie(r){let e=Xe(r,{className:c=>!/^(css|sc|emotion|styled)-/.test(c)&&!/^[a-z]{1,3}[A-Za-z0-9]{4,8}$/.test(c),attr:c=>["data-testid","data-id","role","aria-label"].includes(c),idName:c=>!c.startsWith("radix-")&&!/^:r[0-9]+:$/.test(c),seedMinLength:3,optimizedMinLength:2}),t=Ge(r),o=(r.textContent?.trim()??"").slice(0,120),s=Y(r,"before"),a=Y(r,"after"),i=Ce(r),l=oe(r);return{cssSelector:e,xpath:t,textSnippet:o,textPrefix:s,textSuffix:a,fingerprint:i,neighborText:l,elementTag:r.tagName,elementId:r.id||void 0}}function qe(r,e=document.documentElement){let t=r.x+r.width/2,n=r.y+r.height/2,o=document.elementFromPoint(t,n);if(!o||o===e)return document.body;let s=o,a=o;for(;a&&a!==document.body;){let i=a.getBoundingClientRect();if(i.left<=r.x&&i.top<=r.y&&i.right>=r.x+r.width&&i.bottom>=r.y+r.height){s=a;break}a=a.parentElement}return s}function Ve(r,e){return e.width<=0||e.height<=0?{xPct:0,yPct:0,wPct:1,hPct:1}:{xPct:(r.x-e.x)/e.width,yPct:(r.y-e.y)/e.height,wPct:r.width/e.width,hPct:r.height/e.height}}var Se='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="12" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="10" r="1" fill="currentColor" stroke="none"/></svg>',Qe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';var Ae='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',Te='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',se='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';var Je='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';var Ze='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>',et='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14"/><path d="M9 10V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V10l3 4v3H6v-3l3-4z"/></svg>',tt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="1"/><path d="M21 21h-4v-4"/><path d="M21 13v8h-8"/></svg>';var rt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';var I=["todo","review","done","question"];var N={todo:{fg:"#a16207",bg:"#fef3c7",border:"#f59e0b"},review:{fg:"#1d4ed8",bg:"#dbeafe",border:"#3b82f6"},done:{fg:"#15803d",bg:"#dcfce7",border:"#22c55e"},question:{fg:"#6d28d9",bg:"#ede9fe",border:"#8b5cf6"}},ae=class{constructor(e,t){this.colors=e;this.t=t;this.resolve=null;this.previouslyFocused=null;this.onKeydownTrap=null;this.status="todo";this.statusButtons=new Map;this.root=p("div",{style:`
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
    `,this.textarea.placeholder=this.t("popup.placeholder"),this.textarea.maxLength=5e3,this.textarea.setAttribute("aria-label",this.t("popup.textareaAria")),this.textarea.addEventListener("focus",()=>{this.textarea.style.borderColor=this.colors.accent,this.textarea.style.boxShadow=`0 0 0 3px ${this.colors.accent}14`,this.textarea.style.background=this.colors.bg}),this.textarea.addEventListener("blur",()=>{this.textarea.style.borderColor=this.colors.border,this.textarea.style.boxShadow="none",this.textarea.style.background=this.colors.glassBgHeavy}),this.textarea.addEventListener("input",()=>this.updateSubmitState()),this.textarea.addEventListener("keydown",c=>{c.key==="Enter"&&(c.ctrlKey||c.metaKey)?(c.preventDefault(),this.submit()):c.key==="Escape"&&this.cancel()});let n=p("div",{style:`font-size:11px;color:${this.colors.textTertiary};text-align:right;margin-top:6px;letter-spacing:0.01em;`}),o=/Macintosh|Mac OS X/i.test(navigator.userAgent);f(n,o?this.t("popup.submitHintMac"):this.t("popup.submitHintOther"));let s=p("div",{style:"display:flex;justify-content:flex-end;gap:8px;margin-top:12px;"}),a=document.createElement("button");a.type="button",a.style.cssText=`
      height:34px;padding:0 16px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;
      font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s ease;
    `,f(a,this.t("popup.cancel")),a.addEventListener("click",()=>this.cancel()),this.submitBtn=document.createElement("button"),this.submitBtn.type="button",this.submitBtn.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:none;background:${this.colors.accentGradient};
      color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;
      opacity:0.35;pointer-events:none;transition:all 0.2s ease;
      box-shadow:0 2px 8px ${this.colors.accentGlow};
    `,f(this.submitBtn,this.t("popup.submit")),this.submitBtn.addEventListener("click",()=>this.submit()),s.appendChild(a),s.appendChild(this.submitBtn);let i=p("div",{style:"display:flex;align-items:center;gap:6px;margin-top:10px;flex-wrap:wrap;"}),l=p("span",{style:`font-size:11px;color:${this.colors.textTertiary};margin-right:4px;`});f(l,`${this.t("status.label")}:`),i.appendChild(l);for(let c of I){let d=document.createElement("button");d.type="button",d.dataset.status=c,d.style.cssText=`
        height:24px;padding:0 10px;border-radius:9999px;
        font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;
        transition:all 0.15s ease;
      `,f(d,this.t(`status.${c}`)),d.addEventListener("click",()=>this.setStatus(c)),this.statusButtons.set(c,d),i.appendChild(d)}this.root.appendChild(this.textarea),this.root.appendChild(i),this.root.appendChild(n),this.root.appendChild(s),document.body.appendChild(this.root),this.applyStatusStyles()}setStatus(e){this.status=e,this.applyStatusStyles()}applyStatusStyles(){for(let[e,t]of this.statusButtons){let n=N[e],o=e===this.status;t.style.background=o?n.bg:"transparent",t.style.color=o?n.fg:this.colors.textTertiary,t.style.border=`1px solid ${o?n.border:this.colors.border}`}}show(e){return new Promise(t=>{this.resolve=t,this.textarea.value="",this.status="todo",this.applyStatusStyles(),this.updateSubmitState(),this.previouslyFocused=document.activeElement;let n=e.bottom+8,o=e.left;n+220>window.innerHeight&&(n=e.top-220-8),o+300>window.innerWidth&&(o=e.right-300),n=Math.max(8,n),o=Math.max(8,o),this.root.style.top=`${n}px`,this.root.style.left=`${o}px`,this.root.style.display="block",this.onKeydownTrap=s=>{if(s.key!=="Tab")return;let a=Array.from(this.root.querySelectorAll('button:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])'));if(a.length===0)return;let i=a[0],l=a[a.length-1];!i||!l||(s.shiftKey?(document.activeElement===i||!this.root.contains(document.activeElement))&&(s.preventDefault(),l.focus()):(document.activeElement===l||!this.root.contains(document.activeElement))&&(s.preventDefault(),i.focus()))},this.root.addEventListener("keydown",this.onKeydownTrap),requestAnimationFrame(()=>{this.root.style.opacity="1",this.root.style.transform="translateY(0) scale(1)",this.textarea.focus()})})}updateSubmitState(){let e=this.textarea.value.trim().length>0;this.submitBtn.disabled=!e,this.submitBtn.style.opacity=e?"1":"0.35",this.submitBtn.style.pointerEvents=e?"auto":"none"}submit(){let e=this.textarea.value.trim();e&&(this.resolve?.({message:e,status:this.status}),this.resolve=null,this.hide())}cancel(){this.resolve?.(null),this.resolve=null,this.hide()}hide(){this.onKeydownTrap&&(this.root.removeEventListener("keydown",this.onKeydownTrap),this.onKeydownTrap=null),this.root.style.opacity="0",this.root.style.transform="translateY(8px) scale(0.98)",this.previouslyFocused?.focus(),this.previouslyFocused=null,setTimeout(()=>{this.root.style.display="none"},200)}destroy(){this.root.remove()}};var nt=140,Xt="todo",le=class{constructor(e,t,n,o,s,a,i=()=>{}){this.bus=t;this.t=n;this.store=o;this.colors=s;this.jump=a;this.onFilterChange=i;this.isOpen=!1;this.filter=Xt;this.otherPagesExpanded=!1;this.previouslyFocused=null;this.chipButtons=new Map;this.chipCounts=new Map;this.chipLabels=new Map;this.root=p("div",{class:"sp-panel"}),this.root.setAttribute("role","dialog"),this.root.setAttribute("aria-label",n("drawer.aria")),this.root.setAttribute("aria-hidden","true"),this.root.inert=!0;let l=p("div",{class:"sp-panel-header"}),c=p("div",{class:"sp-panel-title"});f(c,n("drawer.title"));let d=p("button",{class:"sp-panel-close",type:"button"});d.setAttribute("aria-label",n("drawer.close")),d.appendChild(F(se)),d.addEventListener("click",()=>this.close()),l.appendChild(c),l.appendChild(d),this.filtersEl=p("div",{class:"sp-filters"});let m=p("div",{class:"sp-chips"}),b=[...I];for(let g of b){let E=p("button",{class:"sp-chip",type:"button"}),T=n(`status.${g}`),P=p("span",{class:"sp-chip-label"});f(P,T);let h=p("span",{class:"sp-chip-count"});h.setAttribute("aria-hidden","true"),E.appendChild(P),E.appendChild(h),E.dataset.filter=g,E.setAttribute("aria-pressed",g===this.filter?"true":"false"),E.addEventListener("click",()=>this.setFilter(g)),this.chipButtons.set(g,E),this.chipCounts.set(g,h),this.chipLabels.set(g,T),m.appendChild(E)}this.filtersEl.appendChild(m),this.listEl=p("div",{class:"sp-list"}),this.root.appendChild(l),this.root.appendChild(this.filtersEl),this.root.appendChild(this.listEl),e.appendChild(this.root);let x=e.host;this.onDocumentClick=g=>{this.isOpen&&(g.composedPath().includes(x)||this.close())},this.onKeydown=g=>{if(this.isOpen){if(g.key==="Escape"){g.stopPropagation(),this.close();return}g.key==="Tab"&&this.trapFocus(g)}},this.applyChipStyles()}open(){if(this.isOpen){this.render();return}this.isOpen=!0,this.previouslyFocused=this.deepActiveElement()??null,this.render(),this.root.classList.add("sp-panel--open"),this.root.setAttribute("aria-hidden","false"),this.root.inert=!1,document.addEventListener("click",this.onDocumentClick),document.addEventListener("keydown",this.onKeydown,!0),requestAnimationFrame(()=>{this.root.querySelector('button:not([disabled]):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"])')?.focus()})}close(){if(!this.isOpen)return;this.isOpen=!1,this.root.classList.remove("sp-panel--open"),this.root.setAttribute("aria-hidden","true"),this.root.inert=!0,document.removeEventListener("click",this.onDocumentClick),document.removeEventListener("keydown",this.onKeydown,!0),this.bus.emit("navigator:close");let e=this.previouslyFocused;this.previouslyFocused=null,e&&typeof e.focus=="function"&&e.focus()}refreshIfOpen(){this.isOpen&&this.render()}destroy(){document.removeEventListener("click",this.onDocumentClick),document.removeEventListener("keydown",this.onKeydown,!0),this.root.remove()}setFilter(e){this.filter!==e&&(this.filter=e,this.applyChipStyles(),this.onFilterChange(e),this.render())}getFilter(){return this.filter}applyChipStyles(){for(let[e,t]of this.chipButtons){let n=e===this.filter;t.classList.toggle("sp-chip--active",n),t.setAttribute("aria-pressed",n?"true":"false")}}updateChipCounts(e){let t=new Map;for(let n of I)t.set(n,0);for(let n of e){let o=n.status??"todo";t.set(o,(t.get(o)??0)+1)}for(let[n,o]of this.chipButtons){let s=t.get(n)??0,a=this.chipCounts.get(n),i=this.chipLabels.get(n)??n;a&&f(a,String(s)),o.setAttribute("aria-label",`${i} \u2014 ${s}`)}}render(){this.listEl.replaceChildren();let e=this.store.list();this.updateChipCounts(e);let t=e.filter(l=>(l.status??"todo")===this.filter);if(e.length===0){this.listEl.appendChild(this.buildEmpty(this.t("drawer.empty")));return}if(t.length===0){this.listEl.appendChild(this.buildEmpty(this.t("drawer.emptyFiltered")));return}let n=R(window.location.pathname),o=[...t].sort((l,c)=>new Date(c.createdAt).getTime()-new Date(l.createdAt).getTime()),s=o.filter(l=>R(l.path)===n),a=o.filter(l=>R(l.path)!==n),i=0;if(s.length>0){a.length>0&&this.listEl.appendChild(this.buildSectionLabel(this.t("drawer.thisPage")));for(let l of s)this.listEl.appendChild(this.buildCard(l,++i))}if(a.length>0){let l=p("button",{class:"sp-chip",type:"button"});l.style.cssText="margin:8px 4px;";let c=()=>{f(l,`${this.otherPagesExpanded?"\u25BE ":"\u25B8 "}${this.t("drawer.otherPages",{n:a.length})}`)};c(),l.setAttribute("aria-expanded",this.otherPagesExpanded?"true":"false");let d=p("div",{});d.style.display=this.otherPagesExpanded?"block":"none",l.addEventListener("click",()=>{this.otherPagesExpanded=!this.otherPagesExpanded,d.style.display=this.otherPagesExpanded?"block":"none",l.setAttribute("aria-expanded",this.otherPagesExpanded?"true":"false"),c()});for(let m of a)d.appendChild(this.buildCard(m,++i));this.listEl.appendChild(l),this.listEl.appendChild(d)}}buildSectionLabel(e){let t=p("div",{style:`font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${this.colors.textTertiary};padding:10px 8px 4px;`});return f(t,e),t}buildEmpty(e){let t=p("div",{class:"sp-empty"}),n=p("div",{class:"sp-empty-text"});return f(n,e),t.appendChild(n),t}buildCard(e,t){let n=e.status??"todo",o=N[n],s=R(e.path)===R(window.location.pathname),a=p("button",{class:"sp-card",type:"button"});a.style.textAlign="left",a.style.width="100%",a.dataset.annotationId=e.id;let i=e.message.length>nt?`${e.message.slice(0,nt).trimEnd()}\u2026`:e.message;a.setAttribute("aria-label",this.t("drawer.rowAria",{n:t,message:i})),a.addEventListener("click",()=>{s?this.jump(e.id):e.url&&(window.location.href=e.url)});let l=p("div",{class:"sp-card-bar",style:`background:${o.border};`}),c=p("div",{class:"sp-card-body"}),d=p("div",{class:"sp-card-header"}),m=p("span",{class:"sp-card-number"});f(m,`#${t}`);let b=p("span",{class:"sp-badge",style:`background:${o.bg};color:${o.fg};border:1px solid ${o.border};`});f(b,this.t(`status.${n}`).toUpperCase());let x=p("span",{class:"sp-card-date"});f(x,new Date(e.createdAt).toLocaleDateString()),d.appendChild(m),d.appendChild(b),d.appendChild(x);let g=p("div",{class:"sp-card-message"});f(g,i);let E=p("div",{style:`font-size:11px;color:${this.colors.textTertiary};margin-top:8px;display:flex;flex-wrap:wrap;gap:8px;`}),T=e.authorName?.trim()||"Anonymous",P=e.kind??"target",h=p("span",{});f(h,T);let y=p("span",{style:"text-transform:uppercase;letter-spacing:0.04em;"});f(y,P);let C=p("span",{style:"overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;"});return f(C,R(e.path)),E.appendChild(h),E.appendChild(y),E.appendChild(C),c.appendChild(d),c.appendChild(g),c.appendChild(E),a.appendChild(l),a.appendChild(c),a}trapFocus(e){let t=Array.from(this.root.querySelectorAll('button:not([disabled]):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"])'));if(t.length===0)return;let n=t[0],o=t[t.length-1];if(!n||!o)return;let s=this.deepActiveElement();e.shiftKey?(s===n||!this.root.contains(s))&&(e.preventDefault(),o.focus()):(s===o||!this.root.contains(s))&&(e.preventDefault(),n.focus())}deepActiveElement(){let e=document.activeElement;for(;e?.shadowRoot?.activeElement;)e=e.shadowRoot.activeElement;return e}};var ce=class{constructor(){this.listeners=new Map}on(e,t){let n=this.listeners.get(e);return n||(n=new Set,this.listeners.set(e,n)),n.add(t),()=>{n.delete(t)}}emit(e,...t){let n=this.listeners.get(e);if(n)for(let o of n)try{o(...t)}catch(s){console.error(`[ccm-feedback] Error in listener for "${String(e)}":`,s)}}removeAll(){this.listeners.clear()}};function Ut(r,e,t){let n=new Blob([r],{type:t}),o=URL.createObjectURL(n),s=document.createElement("a");s.href=o,s.download=e,s.style.display="none",document.body.appendChild(s),s.click(),requestAnimationFrame(()=>{URL.revokeObjectURL(o),s.remove()})}async function ot(r){try{if(navigator.clipboard?.writeText)return await navigator.clipboard.writeText(r),!0}catch{}try{let e=document.createElement("textarea");e.value=r,e.style.cssText="position:fixed;top:-9999px;left:-9999px;opacity:0;",document.body.appendChild(e),e.select();let t=document.execCommand("copy");return e.remove(),t}catch{return!1}}function Le(r,e){let t=new Date().toISOString().slice(0,10),n=r.replace(/[^a-zA-Z0-9_-]/g,"_"),o={projectName:r,exportedAt:new Date().toISOString(),count:e.length,annotations:e};Ut(JSON.stringify(o,null,2),`ccm-feedback-${n}-${t}.json`,"application/json;charset=utf-8")}var Yt=54,de=class{constructor(e,t,n,o=!1){this.bus=t;this.t=n;this.cloudMode=o;this.countBadge=null;this.mode="closed";this.annotationsVisible=!0;this.items=[{id:"target",icon:Ze,label:n("fab.targetLabel"),direction:"up"},{id:"toggle",icon:Ae,iconAlt:Te,label:n("fab.toggleOn"),direction:"up"},{id:"pin",icon:et,label:n("fab.pinLabel"),direction:"up"},{id:"area",icon:tt,label:n("fab.areaLabel"),direction:"up"},{id:"navigator",icon:Qe,label:n("fab.navigatorLabel"),direction:"up"},{id:"export",icon:Kt,label:n("fab.export"),direction:"left"},{id:"copyUrl",icon:rt,label:n("fab.copyUrl"),direction:"left",...this.cloudMode?{}:{disabled:!0,disabledTitle:n("fab.copyUrlLocalOnly")}},{id:"clear",icon:Je,label:n("fab.clear"),direction:"left"}],this.fab=document.createElement("button"),this.fab.className="sp-fab sp-fab--bottom-right sp-anim-fab-in",this.fab.style.position="fixed",this.fab.appendChild(F(Se)),this.fab.setAttribute("aria-label",n("fab.aria")),this.fab.setAttribute("aria-expanded","false"),this.fab.addEventListener("click",i=>{i.detail>=2||this.toggle()}),this.fab.addEventListener("dblclick",i=>{i.preventDefault(),this.openAll()}),this.radialContainer=document.createElement("div"),this.radialContainer.className="sp-radial sp-radial--bottom-right",this.radialContainer.setAttribute("role","menu"),this.items.forEach((i,l)=>{let c=document.createElement("button");c.className="sp-radial-item",c.style.setProperty("--sp-i",String(l)),c.appendChild(F(i.icon)),c.setAttribute("role","menuitem"),c.setAttribute("aria-label",i.label),c.dataset.itemId=i.id,c.dataset.direction=i.direction,i.disabled&&(c.setAttribute("aria-disabled","true"),c.dataset.disabled="true",c.style.opacity="0.4",c.style.cursor="not-allowed",i.disabledTitle&&(c.title=i.disabledTitle));let d=document.createElement("span");d.className="sp-radial-label",d.style.cssText=i.direction==="up"?"position:absolute;right:54px;top:50%;transform:translateY(-50%);white-space:nowrap;":"position:absolute;bottom:54px;left:50%;transform:translateX(-50%);white-space:nowrap;",d.textContent=i.label,c.appendChild(d),c.addEventListener("click",m=>{m.stopPropagation(),!i.disabled&&this.handleItemClick(i.id)}),this.radialContainer.appendChild(c)}),this.root=document.createElement("div"),this.root.appendChild(this.radialContainer),this.root.appendChild(this.fab),e.appendChild(this.root);let s=e.host;this.onDocumentClick=i=>{this.mode!=="closed"&&!i.composedPath().includes(s)&&this.close()},document.addEventListener("click",this.onDocumentClick);let a=i=>{i.key==="Escape"&&this.mode!=="closed"&&(i.stopPropagation(),this.close())};this.fab.addEventListener("keydown",a),this.radialContainer.addEventListener("keydown",a)}updateCount(e){if(e<=0){this.countBadge?.remove(),this.countBadge=null;return}this.countBadge||(this.countBadge=document.createElement("span"),this.countBadge.className="sp-fab-badge",this.countBadge.setAttribute("role","status"),this.countBadge.setAttribute("aria-live","polite"),this.fab.appendChild(this.countBadge)),f(this.countBadge,e>99?"99+":String(e))}toggle(){this.mode==="closed"?this.openMode("up"):this.close()}openAll(){this.openMode("all")}openMode(e){this.mode=e,this.setFabIcon(se),this.fab.setAttribute("aria-expanded","true");let t=this.radialContainer.querySelectorAll(".sp-radial-item"),n={up:0,left:0};t.forEach(o=>{let s=o.dataset.direction??"up";if(!(e==="all"||s==="up")){o.style.transform="translate(0, 0) scale(0.8)",o.classList.remove("sp-radial-item--open");return}let i=16+Yt*(n[s]+1);n[s]+=1;let l=s==="left"?-i:0,c=s==="up"?-i:0;o.style.transform=`translate(${l}px, ${c}px) scale(1)`,o.classList.add("sp-radial-item--open")}),requestAnimationFrame(()=>{this.radialContainer.querySelector(".sp-radial-item--open")?.focus()})}close(){this.mode="closed",this.setFabIcon(Se),this.fab.setAttribute("aria-expanded","false"),this.radialContainer.querySelectorAll(".sp-radial-item").forEach(t=>{t.style.transform="translate(0, 0) scale(0.8)",t.classList.remove("sp-radial-item--open")}),this.fab.focus()}setFabIcon(e){let t=this.countBadge;this.fab.replaceChildren(F(e)),t&&this.fab.appendChild(t)}handleItemClick(e){switch(this.close(),e){case"target":this.bus.emit("target:start");break;case"pin":this.bus.emit("pin:start");break;case"area":this.bus.emit("area:start");break;case"toggle":{this.annotationsVisible=!this.annotationsVisible,this.bus.emit("annotations:toggle",this.annotationsVisible);let t=this.radialContainer.querySelector('[data-item-id="toggle"]');t&&(t.querySelector("svg")?.remove(),t.insertBefore(F(this.annotationsVisible?Ae:Te),t.firstChild),t.setAttribute("aria-label",this.t(this.annotationsVisible?"fab.toggleOn":"fab.toggleOff")));break}case"navigator":this.bus.emit("navigator:open");break;case"export":this.bus.emit("export:click");break;case"copyUrl":this.bus.emit("copyUrl:click");break;case"clear":this.bus.emit("clear:click");break}}destroy(){document.removeEventListener("click",this.onDocumentClick),this.root.remove()}},Kt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';var Wt={"fab.aria":"Feedback","fab.targetLabel":"Target element","fab.pinLabel":"Drop pin","fab.areaLabel":"Capture area","fab.toggleOn":"Hide comments","fab.toggleOff":"Show comments","fab.export":"Export JSON","fab.copyUrl":"Copy feedback URL","fab.copyUrlLocalOnly":"Cloud mode only \u2014 use Export JSON","fab.clear":"Clear all","fab.clearConfirm":"Delete all annotations for this project? This cannot be undone.","fab.navigatorLabel":"Comments","pin.ariaLabel":"Pin mode toolbar","pin.instruction":"Click any element to comment on it","pin.cancel":"Cancel","relocate.instruction":"Drop on a new target. ESC to cancel.","relocate.cancel":"Cancel relocate","coordPin.instruction":"Click anywhere to drop a pin","area.instruction":"Drag to capture an area","status.todo":"Todo","status.review":"Review","status.done":"Done","status.question":"Question","status.label":"Status","popup.ariaLabel":"Comment composer","popup.placeholder":"Leave a comment\u2026","popup.textareaAria":"Comment","popup.cancel":"Cancel","popup.submit":"Send","popup.submitHintMac":"\u2318 + \u21B5 to submit","popup.submitHintOther":"Ctrl + \u21B5 to submit","marker.ariaLabel":"Comment #{n}","marker.popover.delete":"Delete","marker.popover.close":"Close","marker.popover.deleteConfirm":"Delete this comment? This cannot be undone.","marker.popover.statusAria":"Change status","marker.popover.statusMenuAria":"Statuses","marker.replies.heading":"Replies","marker.reply.delete":"Delete reply","marker.reply.placeholder":"Write a reply\u2026","marker.reply.send":"Reply","marker.replyDeleteConfirm":"Delete this reply? This cannot be undone.","toast.exported":"Exported {n} annotation(s)","toast.empty":"No annotations to export","toast.urlCopied":"Feedback URL copied to clipboard","toast.urlCopyFailed":"Could not copy URL \u2014 clipboard unavailable","drawer.title":"Comments","drawer.aria":"Comments navigator","drawer.close":"Close comments","drawer.empty":"No comments yet","drawer.emptyFiltered":"No comments match this filter","drawer.thisPage":"This page","drawer.otherPages":"Other pages ({n})","drawer.rowAria":"Comment {n}: {message}"};function it(){return(r,e)=>{let t=Wt[r]??r;return e?t.replace(/\{(\w+)\}/g,(n,o)=>String(e[o]??"")):t}}var st=8;function pe(r){let e=null,t=null,n=null,o=null,s="",a="",i=()=>{e&&(n!==null?e.style.setProperty("outline",n,s):e.style.removeProperty("outline"),o!==null?e.style.setProperty("outline-offset",o,a):e.style.removeProperty("outline-offset"),e=null,n=null,o=null,s="",a=""),t&&(t.remove(),t=null)};return{apply:c=>{if(e===c)return;e&&i(),n=c.style.outline||null,o=c.style.outlineOffset||null,s=c.style.getPropertyPriority("outline"),a=c.style.getPropertyPriority("outline-offset"),c.style.setProperty("outline",`2px solid ${r.accent}`,"important"),c.style.setProperty("outline-offset","2px","important"),e=c;let d=c.getBoundingClientRect();if(d.width>0&&d.height>0){t=document.createElement("div");let m=c.tagName.toLowerCase();t.textContent=m,t.setAttribute("aria-hidden","true");let b=Math.max(st,Math.min(d.right-4,window.innerWidth-60)),x=Math.max(st,Math.min(d.bottom+4,window.innerHeight-24));t.style.cssText=`
        position:fixed;
        left:${b}px;
        top:${x}px;
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
      `,document.body.appendChild(t)}},clear:i,destroy:i}}function Gt(r,e){if(r===e)return 0;if(r.length===0)return e.length;if(e.length===0)return r.length;if(r.length>e.length){let a=r;r=e,e=a}let t=r.length,n=e.length,o=new Array(t+1);for(let a=0;a<=t;a++)o[a]=a;let s=new Array(t+1);for(let a=1;a<=n;a++){s[0]=a;for(let l=1;l<=t;l++){let c=o[l-1]??0;s[l]=r[l-1]===e[a-1]?c:1+Math.min(c,o[l]??0,s[l-1]??0)}let i=o;o=s,s=i}return o[t]??0}function K(r,e){if(r===e)return 1;let t=Math.max(r.length,e.length);return t===0?1:1-Gt(r,e)/t}function Pe(r,e,t=.6){if(!e||!r)return 0;if(r.includes(e))return 1;let n=e.length;if(n>r.length){let i=K(r,e);return i>=t?i:0}let o=0,s=r.length>500?r.slice(0,500):r,a=s.length-n;for(let i=0;i<=a;i++){let l=s.slice(i,i+n),c=K(l,e);if(c>o&&(o=c),o>=.95)break}return o>=t?o:0}var qt=300,Vt=.3;function $e(r,e){if(!e.textSnippet)return!0;let t=(r.textContent?.trim()??"").slice(0,500);return Pe(t,e.textSnippet,.5)>Vt}function Qt(r){if(r.elementId){let e=document.getElementById(r.elementId);if(e&&e.tagName===r.elementTag&&$e(e,r))return{element:e,confidence:1,strategy:"id"}}try{let e=document.querySelector(r.cssSelector);if(e&&e.tagName===r.elementTag&&$e(e,r))return{element:e,confidence:.95,strategy:"css"}}catch{}try{let t=document.evaluate(r.xpath,document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue;if(t instanceof Element&&t.tagName===r.elementTag&&$e(t,r))return{element:t,confidence:.9,strategy:"xpath"}}catch{}return Jt(r)}function Jt(r){let e=r.elementTag.toLowerCase(),t=document.querySelectorAll(e);if(t.length===0)return null;let n=null,o=0,s=Math.min(t.length,qt);for(let a=0;a<s;a++){let i=t[a];if(!i)continue;let l=Zt(i,r);if(l>o&&(o=l,n=i,o>=.85))break}return!n||o<.4?null:{element:n,confidence:Math.min(o,.85),strategy:"scan"}}function Zt(r,e){let t=0,n=0,o=(r.textContent?.trim()??"").slice(0,500);if(e.textSnippet&&(n+=40,t+=Pe(o,e.textSnippet,.5)*40),e.fingerprint&&(n+=20,t+=We(r,e.fingerprint)*20),e.textPrefix||e.textSuffix){n+=20;let s=0,a=0;if(e.textPrefix){let i=Y(r,"before");s+=i?K(i,e.textPrefix):0,a++}if(e.textSuffix){let i=Y(r,"after");s+=i?K(i,e.textSuffix):0,a++}a>0&&(t+=s/a*20)}if(e.neighborText){n+=20;let s=oe(r);t+=s?K(s,e.neighborText)*20:0}return n>0?t/n:0}function at(r,e){let t=Qt(r);if(!t)return null;let n=t.element.getBoundingClientRect(),o=new DOMRect(n.x+e.xPct*n.width,n.y+e.yPct*n.height,e.wPct*n.width,e.hPct*n.height);return{element:t.element,rect:o,confidence:t.confidence,strategy:t.strategy}}var er=0;function lt(r){let{colors:e,t,onPick:n,readOnly:o=!1}=r,s=r.current,a=`ccm-status-menu-${++er}`,i=p("span",{style:"position:relative;display:inline-block;"}),l=document.createElement("button");l.type="button",l.setAttribute("role",o?"presentation":"combobox"),l.setAttribute("aria-haspopup","listbox"),l.setAttribute("aria-expanded","false"),l.setAttribute("aria-controls",a),l.setAttribute("aria-label",t("marker.popover.statusAria"));let c=()=>{let h=N[s];l.style.cssText=`
      display:inline-flex;align-items:center;gap:4px;
      padding:2px 8px 2px 10px;border-radius:9999px;
      font-size:10px;font-weight:600;letter-spacing:0.02em;line-height:1.4;
      background:${h.bg};color:${h.fg};border:1px solid ${h.border};
      font-family:inherit;
      cursor:${o?"default":"pointer"};
      text-transform:uppercase;
    `,l.replaceChildren();let y=document.createElement("span");if(f(y,t(`status.${s}`)),l.appendChild(y),!o){let C=document.createElement("span");C.setAttribute("aria-hidden","true"),C.style.cssText="font-size:9px;line-height:1;opacity:0.7;",f(C,"\u25BE"),l.appendChild(C)}};c();let d=document.createElement("ul");d.id=a,d.setAttribute("role","listbox"),d.setAttribute("aria-label",t("marker.popover.statusMenuAria")),d.style.cssText=`
    position:absolute;top:calc(100% + 4px);left:0;
    margin:0;padding:4px;list-style:none;
    min-width:140px;border-radius:8px;
    background:${e.glassBg};
    backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
    border:1px solid ${e.glassBorder};
    box-shadow:0 8px 24px ${e.shadow};
    z-index:2;display:none;
    font-family:inherit;font-size:12px;
  `,d.setAttribute("aria-hidden","true");let m=new Map;for(let h of I){let y=document.createElement("li");y.setAttribute("role","option"),y.setAttribute("data-status",h),y.setAttribute("tabindex","-1"),y.style.cssText=`
      display:flex;align-items:center;gap:8px;
      padding:6px 10px;border-radius:6px;
      color:${e.text};cursor:pointer;
      transition:background 0.12s ease;
    `;let C=document.createElement("span");C.setAttribute("aria-hidden","true");let $=N[h];C.style.cssText=`
      width:10px;height:10px;border-radius:9999px;
      background:${$.border};flex-shrink:0;
    `;let M=document.createElement("span");f(M,t(`status.${h}`)),M.style.cssText="flex:1;";let u=document.createElement("span");u.setAttribute("aria-hidden","true"),u.style.cssText=`font-size:12px;color:${e.accent};font-weight:600;`,f(u,"\u2713"),y.appendChild(C),y.appendChild(M),y.appendChild(u),y.addEventListener("mouseenter",()=>{y.style.background=e.glassBgHeavy}),y.addEventListener("mouseleave",()=>{y.style.background=""}),y.addEventListener("click",w=>{w.preventDefault(),w.stopPropagation(),T(h)}),m.set(h,y),d.appendChild(y)}let b=()=>{for(let h of I){let y=m.get(h);if(!y)continue;let C=h===s;y.setAttribute("aria-selected",String(C));let $=y.lastElementChild;$&&($.style.visibility=C?"visible":"hidden")}};b();let x=!1,g=()=>{if(o||x)return;x=!0,l.setAttribute("aria-expanded","true"),d.style.display="block",d.setAttribute("aria-hidden","false"),(m.get(s)??m.get(I[0]))?.focus()},E=()=>{x&&(x=!1,l.setAttribute("aria-expanded","false"),d.style.display="none",d.setAttribute("aria-hidden","true"))},T=h=>{if(h===s){E(),l.focus();return}E(),l.focus(),n(h)};o||(l.addEventListener("click",h=>{h.preventDefault(),h.stopPropagation(),x?E():g()}),l.addEventListener("keydown",h=>{(h.key==="Enter"||h.key===" "||h.key==="ArrowDown")&&(h.preventDefault(),g())}),d.addEventListener("keydown",h=>{if(h.key==="Escape"){h.preventDefault(),h.stopPropagation(),E(),l.focus();return}if(h.key==="ArrowDown"||h.key==="ArrowUp"){h.preventDefault();let y=I.findIndex(w=>m.get(w)===document.activeElement),C=h.key==="ArrowDown"?1:-1,$=I.length,M=((y===-1?0:y+C)+$)%$;m.get(I[M])?.focus();return}if(h.key==="Enter"||h.key===" "){h.preventDefault();let y=document.activeElement;for(let C of I)if(m.get(C)===y){T(C);return}}}));let P=h=>{x&&(h.composedPath().some(y=>y===i)||E())};return document.addEventListener("click",P,!0),i.appendChild(l),i.appendChild(d),{root:i,setCurrent:h=>{s=h,c(),b()},close:E,destroy:()=>{E(),document.removeEventListener("click",P,!0)}}}var ue=26,V=ue/2,tr=200,rr=250,ct=6,dt=300,nr=.7,or=540,pt=16,he=class{constructor(e,t,n,o,s=()=>!1){this.colors=e;this.bus=t;this.t=n;this.store=o;this.shouldIgnoreElement=s;this.entries=[];this.visible=!0;this.includeDone=!1;this.popover=null;this.popoverStatusDropdown=null;this.popoverDisposers=[];this.repositionTimer=null;this.lastPath=window.location.pathname;this.dragCleanup=null;this.watcherCleanups=new Set;this.dragInFlight=!1;if(this.container=p("div",{style:`position:absolute;top:0;left:0;width:100%;height:0;overflow-x:clip;overflow-y:visible;z-index:${2147483645};pointer-events:none;`}),this.container.setAttribute("aria-hidden","false"),this.container.setAttribute("data-ccm-markers","true"),document.body.appendChild(this.container),!document.getElementById("ccm-marker-anim")){let i=document.createElement("style");i.id="ccm-marker-anim",i.textContent=`
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
      `,document.head.appendChild(i)}this.onResize=this.scheduleReposition.bind(this),this.onScroll=this.scheduleReposition.bind(this),window.addEventListener("resize",this.onResize,{passive:!0}),window.addEventListener("scroll",this.onScroll,{passive:!0}),this.onDocClick=i=>{this.popover&&(i.composedPath().some(l=>l===this.popover)||this.closePopover())},document.addEventListener("click",this.onDocClick,!0);let a=()=>{window.location.pathname!==this.lastPath&&(this.dragInFlight||(this.lastPath=window.location.pathname,this.refresh()))};this.onPopState=a,window.addEventListener("popstate",this.onPopState),this.origPushState=history.pushState.bind(history),this.origReplaceState=history.replaceState.bind(history),history.pushState=(...i)=>{this.origPushState(...i),a()},history.replaceState=(...i)=>{this.origReplaceState(...i),a()},this.bus.on("annotations:toggle",i=>this.setVisible(i))}refresh(){this.closePopover();for(let t of this.entries)t.node.remove();this.entries=[],this.store.listForPath(window.location.pathname).filter(t=>this.shouldRender(t)).forEach((t,n)=>{let o=this.buildMarker(t,n+1);this.container.appendChild(o),this.entries.push({record:t,node:o,anchorEl:null})}),this.reposition()}addOne(e){if(!this.shouldRender(e))return;let t=this.entries.length+1,n=this.buildMarker(e,t);this.container.appendChild(n),this.entries.unshift({record:e,node:n,anchorEl:null}),this.renumber(),this.reposition()}shouldRender(e){return!((e.status??"todo")==="done"&&!this.includeDone)}setIncludeDone(e){this.includeDone!==e&&(this.includeDone=e,this.refresh())}setVisible(e){this.visible=e,this.container.style.display=e?"block":"none",e||this.closePopover()}canLocate(e){let t=this.entries.find(n=>n.record.id===e);return t?this.isEntryLocatable(t):!1}scrollToAndFlash(e){let t=this.entries.find(o=>o.record.id===e);if(!t||!this.isEntryLocatable(t))return!1;let n=Number.parseFloat(t.node.style.top);if(Number.isFinite(n)&&window.scrollTo({top:Math.max(0,n-window.innerHeight/3),behavior:"smooth"}),this.visible){let o=t.node;o.style.animation="ccm-pulse 0.6s ease-in-out 1",window.setTimeout(()=>{let s=o.dataset.status;o.style.animation=s==="question"?"ccm-pulse 1.6s ease-in-out infinite":""},650)}return this.flashAnchorElement(t),!0}flashAnchorElement(e){if((e.record.kind??"target")!=="target")return;let n=e.anchorEl;!n||!(n instanceof HTMLElement)||(n.classList.remove("ccm-anchor-flash"),n.offsetWidth,n.classList.add("ccm-anchor-flash"),window.setTimeout(()=>{n.classList.remove("ccm-anchor-flash")},1250))}isEntryLocatable(e){return!0}buildMarker(e,t){let n=e.status??"todo",o=N[n],s=p("button",{type:"button","aria-label":this.t("marker.ariaLabel",{n:t}),style:`
        position:absolute;width:${ue}px;height:${ue}px;
        border-radius:9999px;border:2px solid #fff;
        background:${o.border};color:#fff;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:12px;font-weight:700;line-height:1;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 8px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.18);
        cursor:grab;pointer-events:auto;
        transform:translate(-50%, -50%);transition:transform 0.15s ease;
      `});return s.dataset.annotationId=e.id,s.dataset.status=n,s.dataset.kind=e.kind??"target",n==="question"&&(s.style.animation="ccm-pulse 1.6s ease-in-out infinite"),f(s,String(t)),s.addEventListener("mouseenter",()=>{s.style.transform="translate(-50%, -50%) scale(1.12)"}),s.addEventListener("mouseleave",()=>{s.style.transform="translate(-50%, -50%) scale(1)"}),this.attachDragOrClickWatcher(s,e),s}attachDragOrClickWatcher(e,t){let n={value:!1};e.addEventListener("click",o=>{if(o.stopPropagation(),n.value){n.value=!1;return}this.openPopover(t,e)}),e.addEventListener("mousedown",o=>{if(o.button!==0)return;o.stopPropagation();let s=o.clientX,a=o.clientY,i=!1,l=window.setTimeout(()=>{l=null,b(o)},rr),c=x=>{if(i)return;let g=x.clientX-s,E=x.clientY-a;g*g+E*E>=ct*ct&&b(x)},d=()=>{l!==null&&(window.clearTimeout(l),l=null),m()},m=()=>{window.removeEventListener("mousemove",c,!0),window.removeEventListener("mouseup",d,!0),l!==null&&(window.clearTimeout(l),l=null),this.watcherCleanups.delete(m)},b=x=>{if(i)return;i=!0,n.value=!0,l!==null&&(window.clearTimeout(l),l=null),m();let g=this.entries.find(E=>E.record.id===t.id);g&&this.enterDragMode(g,x)};window.addEventListener("mousemove",c,!0),window.addEventListener("mouseup",d,!0),this.watcherCleanups.add(m)})}enterDragMode(e,t){let n=e.node,o=n.style.opacity,s=n.style.transform,a=n.style.cursor,i=n.style.transition,l=t.clientX+window.scrollX,c=t.clientY+window.scrollY,d=pe(this.colors),m=p("div",{style:`
        position:fixed;inset:0;z-index:${2147483646};
        background:transparent;cursor:grabbing;
      `});m.setAttribute("aria-hidden","true"),m.setAttribute("data-ccm-drag-overlay","true");let b=p("div",{style:`
        position:fixed;top:0;left:0;right:0;z-index:${2147483647};
        height:52px;background:${this.colors.glassBg};
        backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
        border-bottom:1px solid ${this.colors.glassBorder};
        display:flex;align-items:center;justify-content:center;gap:16px;
        pointer-events:auto;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:14px;color:${this.colors.text};
      `});b.setAttribute("data-ccm-drag-toolbar","true");let x=p("span",{style:"font-weight:500;letter-spacing:-0.01em;"});f(x,this.t("relocate.instruction"));let g=document.createElement("button");g.type="button",g.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;
      font-size:13px;font-weight:500;cursor:pointer;
    `,f(g,this.t("relocate.cancel")),b.appendChild(x),b.appendChild(g),document.body.appendChild(m),document.body.appendChild(b),n.style.opacity="0.75",n.style.cursor="grabbing",n.style.transition="none",n.style.transform="translate(-50%, -50%)",n.style.position="fixed",n.style.top=`${t.clientY}px`,n.style.left=`${t.clientX}px`;let E=!1;this.dragInFlight=!0;let T=(w,v)=>{m.style.pointerEvents="none",b.style.pointerEvents="none";let A=n.style.pointerEvents;n.style.pointerEvents="none";let D=document.elementFromPoint(w,v);return m.style.pointerEvents="auto",b.style.pointerEvents="auto",n.style.pointerEvents=A,D},P=w=>{n.style.top=`${w.clientY}px`,n.style.left=`${w.clientX}px`;let v=T(w.clientX,w.clientY);if(!v||!(v instanceof HTMLElement)){d.clear();return}if(this.shouldIgnoreElement(v)||n.contains(v)||v===n){d.clear();return}if(v===document.documentElement||v===document.body){d.clear();return}d.apply(v)},h=()=>{E||(E=!0,window.removeEventListener("mousemove",P,!0),window.removeEventListener("mouseup",u,!0),document.removeEventListener("keydown",$,!0),window.removeEventListener("contextmenu",M,!0),window.removeEventListener("popstate",y,!0),d.destroy(),m.remove(),b.remove(),n.style.position="absolute",n.style.opacity=o,n.style.transform=s,n.style.cursor=a,n.style.transition=i,this.dragInFlight=!1,this.dragCleanup=null,this.reposition())};this.dragCleanup=h;let y=()=>{C()},C=()=>{h()},$=w=>{w.key==="Escape"&&(w.preventDefault(),C())},M=w=>{w.preventDefault(),C()};g.addEventListener("click",w=>{w.preventDefault(),w.stopPropagation(),C()});let u=w=>{if(E)return;let v=T(w.clientX,w.clientY),A=e.record.kind??"target",D=e.record.id,j=(L,_)=>{let z=window.scrollX+8,X=window.scrollX+window.innerWidth-8,H=L+_;return H<z?z-_:H>X?X-_:L},k=null;if(A==="area"){let L=w.clientX+window.scrollX-l,_=w.clientY+window.scrollY-c,z=e.record.areaX??0,X=e.record.areaY??0,H=e.record.areaW??0,me=e.record.areaH??0,yt=j(z+L,H),wt=X+_;k={kind:"area",anchor:this.entryAnchor(e),rect:{xPct:e.record.xPct,yPct:e.record.yPct,wPct:e.record.wPct,hPct:e.record.hPct},pin:null,area:{x:yt,y:wt,w:H,h:me}}}else{let L=!v||!(v instanceof HTMLElement)||this.shouldIgnoreElement(v)||v===n||n.contains(v)||v===document.documentElement||v===document.body;if(!L&&v&&A==="target"&&v===e.anchorEl){h();return}if(L)k={kind:"pin",anchor:this.emptyAnchor(),rect:{xPct:0,yPct:0,wPct:0,hPct:0},pin:{x:w.clientX+window.scrollX,y:w.clientY+window.scrollY},area:null};else if(v&&v instanceof HTMLElement){let _=v.getBoundingClientRect(),z=_.width||1,X=_.height||1,H=(w.clientX-_.left)/z,me=(w.clientY-_.top)/X;k={kind:"target",anchor:ie(v),rect:{xPct:H,yPct:me,wPct:0,hPct:0},pin:null,area:null}}}k&&(this.applyAnchorInputToRecord(e.record,k),this.store.updateAnchor?.(D,k),this.bus.emit("feedback:updated",e.record)),h()};window.addEventListener("mousemove",P,!0),window.addEventListener("mouseup",u,!0),document.addEventListener("keydown",$,!0),window.addEventListener("contextmenu",M,!0),window.addEventListener("popstate",y,!0)}entryAnchor(e){return{cssSelector:e.record.cssSelector,xpath:e.record.xpath,textSnippet:e.record.textSnippet,elementTag:e.record.elementTag,elementId:e.record.elementId,textPrefix:e.record.textPrefix,textSuffix:e.record.textSuffix,fingerprint:e.record.fingerprint,neighborText:e.record.neighborText}}emptyAnchor(){return{cssSelector:"",xpath:"",textSnippet:"",elementTag:"",elementId:void 0,textPrefix:"",textSuffix:"",fingerprint:"",neighborText:""}}applyAnchorInputToRecord(e,t){e.cssSelector=t.anchor.cssSelector,e.xpath=t.anchor.xpath,e.textSnippet=t.anchor.textSnippet,e.elementTag=t.anchor.elementTag,e.elementId=t.anchor.elementId,e.textPrefix=t.anchor.textPrefix,e.textSuffix=t.anchor.textSuffix,e.fingerprint=t.anchor.fingerprint,e.neighborText=t.anchor.neighborText,e.xPct=t.rect.xPct,e.yPct=t.rect.yPct,e.wPct=t.rect.wPct,e.hPct=t.rect.hPct,e.kind=t.kind,t.pin?(e.pinX=t.pin.x,e.pinY=t.pin.y):(delete e.pinX,delete e.pinY),t.area?(e.areaX=t.area.x,e.areaY=t.area.y,e.areaW=t.area.w,e.areaH=t.area.h):(delete e.areaX,delete e.areaY,delete e.areaW,delete e.areaH)}renumber(){this.entries.forEach((e,t)=>{let n=t+1;f(e.node,String(n)),e.node.setAttribute("aria-label",this.t("marker.ariaLabel",{n}))})}openPopover(e,t){this.closePopover();let n=p("div",{style:`
        z-index:${2147483647};max-width:300px;min-width:220px;padding:14px;
        border-radius:12px;background:${this.colors.glassBg};
        backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
        border:1px solid ${this.colors.glassBorder};
        box-shadow:0 8px 32px ${this.colors.shadow},0 2px 8px ${this.colors.shadow};
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        color:${this.colors.text};font-size:13px;line-height:1.5;
        -webkit-font-smoothing:antialiased;
      `});n.setAttribute("role","dialog"),n.setAttribute("aria-label",this.t("marker.ariaLabel",{n:""})),n.classList.add("ccm-popover"),n.addEventListener("click",k=>k.stopPropagation()),n.addEventListener("keydown",k=>{k.key==="Escape"&&(k.preventDefault(),this.closePopover())});let o=p("div",{style:"white-space:pre-wrap;word-break:break-word;margin-bottom:10px;"});f(o,e.message);let s=p("div",{style:`font-size:11px;color:${this.colors.textTertiary};margin-bottom:12px;`}),a=e.authorName?.trim()||"Anonymous";f(s,`${a} \xB7 ${new Date(e.createdAt).toLocaleString()}`);let i=e.status??"todo",l=typeof this.store.updateStatus!="function",c=lt({current:i,colors:this.colors,t:this.t,readOnly:l,onPick:k=>this.onStatusPicked(e,k,c)});this.popoverStatusDropdown=c;let d=p("span",{style:`
        display:inline-block;padding:2px 8px;border-radius:9999px;
        font-size:10px;font-weight:600;letter-spacing:0.02em;
        background:${this.colors.glassBgHeavy};color:${this.colors.textTertiary};
        border:1px solid ${this.colors.border};margin-right:6px;text-transform:uppercase;
      `});f(d,e.kind??"target");let m=p("div",{style:"margin-bottom:10px;display:flex;flex-wrap:wrap;gap:4px;align-items:center;"});m.appendChild(c.root),m.appendChild(d);let b=p("div",{style:"display:flex;justify-content:flex-end;gap:8px;"}),x=document.createElement("button");x.type="button",x.style.cssText=`
      height:30px;padding:0 14px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;font-size:12px;font-weight:500;
      cursor:pointer;transition:all 0.2s ease;
    `,f(x,this.t("marker.popover.close")),x.addEventListener("click",()=>this.closePopover());let g=document.createElement("button");g.type="button",g.style.cssText=`
      height:30px;padding:0 14px;border-radius:9999px;
      border:1px solid ${this.colors.typeBug};background:${this.colors.typeBugBg};
      color:${this.colors.typeBug};font-family:inherit;font-size:12px;font-weight:600;
      cursor:pointer;transition:all 0.2s ease;
    `,f(g,this.t("marker.popover.delete")),g.addEventListener("click",()=>{window.confirm(this.t("marker.popover.deleteConfirm"))&&(this.store.delete(e.id),this.bus.emit("feedback:deleted",e.id),this.closePopover(),this.refresh())});let E=p("div",{style:`height:1px;background:${this.colors.border};margin:10px -4px 10px;`}),T=p("div",{style:"display:flex;flex-direction:column;gap:8px;margin-bottom:10px;"}),P=()=>{T.replaceChildren();let k=this.store.listReplies(e.id);if(k.length>0){let L=p("div",{style:`font-size:11px;font-weight:600;color:${this.colors.textTertiary};margin-bottom:2px;letter-spacing:0.02em;text-transform:uppercase;`});f(L,this.t("marker.replies.heading")),T.appendChild(L)}for(let L of k)T.appendChild(this.buildReplyRow(L))};P();let h=p("div",{style:"display:flex;flex-direction:column;gap:6px;margin-bottom:10px;"}),y=p("textarea",{rows:"2",placeholder:this.t("marker.reply.placeholder"),"aria-label":this.t("marker.reply.placeholder"),style:`
        width:100%;box-sizing:border-box;resize:vertical;min-height:48px;max-height:160px;
        border-radius:8px;border:1px solid ${this.colors.border};
        background:${this.colors.glassBg};color:${this.colors.text};
        font-family:inherit;font-size:13px;line-height:1.4;padding:8px 10px;
      `}),C=document.createElement("button");C.type="button",C.style.cssText=`
      align-self:flex-end;height:28px;padding:0 14px;border-radius:9999px;
      border:1px solid ${this.colors.accent};background:${this.colors.accent};
      color:#fff;font-family:inherit;font-size:12px;font-weight:600;
      cursor:pointer;transition:all 0.2s ease;
    `,f(C,this.t("marker.reply.send"));let $=()=>{let k=y.value.trim();if(!k)return;let L=this.store.addReply({projectName:e.projectName,parentId:e.id,message:k,authorName:U(),url:e.url,path:e.path,viewport:`${window.innerWidth}x${window.innerHeight}`,userAgent:navigator.userAgent});this.bus.emit("feedback:replied",L),y.value="",P(),n.scrollTop=n.scrollHeight};C.addEventListener("click",$),y.addEventListener("keydown",k=>{if(k.key==="Enter"&&!k.shiftKey){k.preventDefault(),$();return}k.key==="Enter"&&(k.metaKey||k.ctrlKey)&&(k.preventDefault(),$())}),h.appendChild(y),h.appendChild(C),b.appendChild(x),b.appendChild(g),n.appendChild(m),n.appendChild(o),n.appendChild(s),n.appendChild(E),n.appendChild(T),n.appendChild(h),n.appendChild(b);let M=Math.min(window.innerHeight*nr,or);n.style.maxHeight=`${M}px`,n.style.overflowY="auto";let u=t.getBoundingClientRect();n.style.position="fixed",n.style.top="-10000px",n.style.left="-10000px",document.body.appendChild(n),this.popover=n;let w=Math.min(n.offsetHeight,M),v=u.bottom+8,A=u.left-10;v+w>window.innerHeight-pt&&(v=u.top-w-8),A+dt>window.innerWidth&&(A=window.innerWidth-dt-8),v=Math.max(pt,v),A=Math.max(8,A),n.style.top=`${v}px`,n.style.left=`${A}px`;let D=this.bus.on("feedback:replied",k=>{k.parentId===e.id&&(T.querySelector(`[data-reply-id="${k.id}"]`)||(P(),n.scrollTop=n.scrollHeight))}),j=this.bus.on("feedback:deleted",k=>{if(k===e.id){this.closePopover();return}T.querySelector(`[data-reply-id="${k}"]`)&&P()});this.popoverDisposers.push(D,j)}buildReplyRow(e){let t=p("div",{style:`
        position:relative;padding:8px 10px 8px 10px;border-radius:8px;
        background:${this.colors.glassBgHeavy};
        border:1px solid ${this.colors.border};
      `});t.dataset.replyId=e.id;let n=p("div",{style:`font-size:11px;color:${this.colors.textTertiary};margin-bottom:4px;padding-right:18px;`}),o=e.authorName?.trim()||"Anonymous";f(n,`${o} \xB7 ${new Date(e.createdAt).toLocaleString()}`);let s=p("div",{style:"white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.45;"});f(s,e.message);let a=document.createElement("button");return a.type="button",a.setAttribute("aria-label",this.t("marker.reply.delete")),a.style.cssText=`
      position:absolute;top:4px;right:4px;width:18px;height:18px;
      border-radius:9999px;border:none;background:transparent;
      color:${this.colors.textTertiary};
      font-family:inherit;font-size:14px;line-height:1;cursor:pointer;
      opacity:0;transition:opacity 0.15s ease,color 0.15s ease;
      padding:0;
    `,f(a,"\xD7"),t.addEventListener("mouseenter",()=>{a.style.opacity="1"}),t.addEventListener("mouseleave",()=>{a.style.opacity="0"}),a.addEventListener("focus",()=>{a.style.opacity="1"}),a.addEventListener("blur",()=>{a.style.opacity="0"}),a.addEventListener("click",i=>{i.stopPropagation(),window.confirm(this.t("marker.replyDeleteConfirm"))&&(this.store.delete(e.id),this.bus.emit("feedback:deleted",e.id))}),t.appendChild(n),t.appendChild(s),t.appendChild(a),t}onStatusPicked(e,t,n){this.store.updateStatus?.(e.id,t),e.status=t,this.bus.emit("feedback:updated",e),n.setCurrent(t),n.close(),this.repositionAndRecolor(e.id)}repositionAndRecolor(e){let t=this.entries.find(s=>s.record.id===e);if(!t)return;let n=t.record.status??"todo",o=N[n];t.node.style.background=o.border,t.node.dataset.status=n,t.node.style.animation=n==="question"?"ccm-pulse 1.6s ease-in-out infinite":""}closePopover(){if(this.popover){this.popoverStatusDropdown?.destroy(),this.popoverStatusDropdown=null,this.popover.remove(),this.popover=null;for(let e of this.popoverDisposers)e();this.popoverDisposers=[]}}scheduleReposition(){this.repositionTimer===null&&(this.repositionTimer=window.setTimeout(()=>{this.repositionTimer=null,this.reposition()},tr))}reposition(){let e=document.documentElement.clientWidth,t=V,n=Math.max(V,e-V),o=i=>Math.max(t,Math.min(n,i)),s=0,a=i=>window.scrollY+80+i*(ue+8);for(let i of this.entries){let l=i.record.kind??"target";if(l==="pin"&&i.record.pinX!=null&&i.record.pinY!=null){i.node.style.display=this.visible?"flex":"none",i.node.style.top=`${i.record.pinY}px`,i.node.style.left=`${o(i.record.pinX)}px`,i.anchorEl=null;continue}if(l==="area"&&i.record.areaX!=null&&i.record.areaY!=null&&i.record.areaW!=null&&i.record.areaH!=null){i.node.style.display=this.visible?"flex":"none",i.node.style.top=`${i.record.areaY}px`,i.node.style.left=`${o(i.record.areaX+i.record.areaW)}px`,i.anchorEl=null;continue}let c=at({cssSelector:i.record.cssSelector,xpath:i.record.xpath,textSnippet:i.record.textSnippet,elementTag:i.record.elementTag,elementId:i.record.elementId,textPrefix:i.record.textPrefix,textSuffix:i.record.textSuffix,fingerprint:i.record.fingerprint,neighborText:i.record.neighborText},{xPct:i.record.xPct,yPct:i.record.yPct,wPct:i.record.wPct,hPct:i.record.hPct});if(!c){i.node.style.display=this.visible?"flex":"none",i.node.style.top=`${a(s)}px`,i.node.style.left=`${n}px`,i.node.dataset.orphan="true",i.anchorEl=null,s++;continue}i.node.dataset.orphan="false",i.anchorEl=c.element;let d=c.rect,m=d.top+window.scrollY-V,b=d.right+window.scrollX;i.node.style.display=this.visible?"flex":"none",i.node.style.top=`${m+V}px`,i.node.style.left=`${o(b)}px`}}destroy(){this.dragCleanup?.();for(let e of[...this.watcherCleanups])e();this.watcherCleanups.clear(),window.removeEventListener("resize",this.onResize),window.removeEventListener("scroll",this.onScroll),window.removeEventListener("popstate",this.onPopState),document.removeEventListener("click",this.onDocClick,!0),history.pushState=this.origPushState,history.replaceState=this.origReplaceState,this.closePopover(),this.container.remove(),this.entries=[]}};var fe=class{constructor(e,t,n,o,s){this.colors=e;this.bus=t;this.t=n;this.openPopupForElement=o;this.shouldIgnoreElement=s;this.overlay=null;this.toolbar=null;this.isActive=!1;this.savedOverflow="";this.previouslyFocused=null;this.hoveredElement=null;this.onKeyDown=e=>{e.key==="Escape"&&(e.preventDefault(),this.deactivate())};this.onOverlayMouseMove=e=>{if(!this.overlay)return;this.overlay.style.pointerEvents="none";let t=document.elementFromPoint(e.clientX,e.clientY);if(this.overlay.style.pointerEvents="auto",!t||!(t instanceof HTMLElement)){this.clearHoverOutline();return}if(this.shouldIgnoreElement(t)){this.clearHoverOutline();return}if(t===document.documentElement||t===document.body){this.clearHoverOutline();return}t!==this.hoveredElement&&(this.clearHoverOutline(),this.hoveredElement=t,this.applyHoverOutline(t))};this.onOverlayClick=e=>{if(e.preventDefault(),e.stopPropagation(),!this.overlay)return;this.overlay.style.pointerEvents="none";let t=document.elementFromPoint(e.clientX,e.clientY);this.overlay.style.pointerEvents="auto",!(!t||!(t instanceof HTMLElement))&&(this.shouldIgnoreElement(t)||t===document.documentElement||t===document.body||(this.clearHoverOutline(),this.handleSelect(t)))};this.hoverOutline=pe(this.colors),this.unsubPinStart=this.bus.on("target:start",()=>this.activate())}activate(){if(this.isActive)return;this.isActive=!0,this.savedOverflow=document.body.style.overflow,this.previouslyFocused=document.activeElement instanceof HTMLElement?document.activeElement:null,this.overlay=p("div",{style:`
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
      `}),this.toolbar.setAttribute("aria-label",this.t("pin.ariaLabel"));let e=p("span",{style:"font-weight:500;letter-spacing:-0.01em;"});f(e,this.t("pin.instruction"));let t=document.createElement("button");t.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;font-weight:500;cursor:pointer;
    `,f(t,this.t("pin.cancel")),t.addEventListener("click",()=>this.deactivate()),this.toolbar.appendChild(e),this.toolbar.appendChild(t),this.overlay.addEventListener("mousemove",this.onOverlayMouseMove,!0),this.overlay.addEventListener("click",this.onOverlayClick,!0),document.addEventListener("keydown",this.onKeyDown),document.body.style.overflow="hidden",document.body.appendChild(this.overlay),document.body.appendChild(this.toolbar)}deactivate(){if(!this.isActive)return;this.isActive=!1,this.clearHoverOutline(),this.overlay?.removeEventListener("mousemove",this.onOverlayMouseMove,!0),this.overlay?.removeEventListener("click",this.onOverlayClick,!0),document.removeEventListener("keydown",this.onKeyDown),document.body.style.overflow=this.savedOverflow,this.overlay?.remove(),this.toolbar?.remove(),this.overlay=null,this.toolbar=null;let e=this.previouslyFocused;if(this.previouslyFocused=null,e&&typeof e.focus=="function"&&document.contains(e))try{e.focus()}catch{}this.bus.emit("target:end")}async handleSelect(e){this.deactivate();try{await this.openPopupForElement(e)}catch(t){console.error("[ccm-feedback] pin-mode: openPopupForElement threw",t)}}applyHoverOutline(e){this.hoverOutline.apply(e),this.hoveredElement=e}clearHoverOutline(){this.hoverOutline.clear(),this.hoveredElement=null}destroy(){this.deactivate(),this.unsubPinStart()}};var ir="linear(0, 0.006, 0.025, 0.06, 0.11, 0.17, 0.25, 0.34, 0.45, 0.56, 0.67, 0.78, 0.88, 0.95, 1.01, 1.04, 1.05, 1.04, 1.02, 1, 0.99, 1)",Me="cubic-bezier(0.16, 1, 0.3, 1)",Re="cubic-bezier(0.34, 1.56, 0.64, 1)",sr="cubic-bezier(0.25, 1, 0.5, 1)",ut=`
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
    animation: sp-marker-in 0.35s ${Re} both;
  }

  .sp-anim-pulse {
    animation: sp-pulse-ring 0.7s ease-out;
  }

  .sp-anim-flash {
    animation: sp-flash-bg 0.5s ${sr};
  }

  .sp-anim-slide-up {
    animation: sp-slide-up 0.3s ${Me} both;
  }

  .sp-anim-fade-in {
    animation: sp-fade-in 0.2s ease-out both;
  }

  /* ---- Transition utilities ---- */

  .sp-panel {
    transform: translateX(110%);
    transition: transform 0.4s ${Me};
  }

  .sp-panel.sp-panel--open {
    transform: translateX(0);
  }

  .sp-radial-item {
    opacity: 0;
    pointer-events: none;
    transform: translate(0, 0) scale(0.8);
    transition:
      transform 0.35s ${Re},
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
    animation: sp-card-in 0.35s ${Me} both;
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
    animation: sp-badge-in 0.4s ${Re} both;
  }

  /* ---- Reduced motion ---- */

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

`;var ft="#0066ff",ar=/^#[0-9a-fA-F]{6}$/,ht=/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/,lr=/^#[0-9a-fA-F]{8}$/;function cr(r){if(ar.test(r))return r;let e=ht.test(r)?r.match(ht):null;return e?`#${e[1]}${e[1]}${e[2]}${e[2]}${e[3]}${e[3]}`:lr.test(r)?r.slice(0,7):(console.warn(`[ccm-feedback] Invalid accentColor "${r}" \u2014 only hex colors (#RGB, #RRGGBB, #RRGGBBAA) are supported. Using default.`),ft)}function dr(r,e){let t=Math.max(0,Math.round(parseInt(r.slice(1,3),16)*(1-e))),n=Math.max(0,Math.round(parseInt(r.slice(3,5),16)*(1-e))),o=Math.max(0,Math.round(parseInt(r.slice(5,7),16)*(1-e)));return`#${t.toString(16).padStart(2,"0")}${n.toString(16).padStart(2,"0")}${o.toString(16).padStart(2,"0")}`}function pr(){return typeof window>"u"?!1:window.matchMedia("(prefers-color-scheme: dark)").matches}function ur(r){return r==="dark"||r==="auto"&&pr()?"dark":"light"}function mt(r=ft,e){let t=cr(r),n=dr(t,.15);return ur(e)==="dark"?{accent:t,accentLight:t+"22",accentDark:n,accentGlow:t+"44",accentGradient:`linear-gradient(135deg, ${t}, ${n})`,bg:"#0f172a",bgHover:"#1e293b",text:"#f1f5f9",textSecondary:"#94a3b8",textTertiary:"#64748b",border:"#334155",shadow:"rgba(0, 0, 0, 0.3)",glassBg:"rgba(15, 23, 42, 0.78)",glassBgHeavy:"rgba(15, 23, 42, 0.88)",glassBorder:"rgba(51, 65, 85, 0.5)",glassBorderSubtle:"rgba(51, 65, 85, 0.3)",typeQuestion:"#60a5fa",typeChange:"#fbbf24",typeBug:"#f87171",typeOther:"#94a3b8",typeComment:"#9ca3af",typeQuestionBg:"rgba(59, 130, 246, 0.15)",typeChangeBg:"rgba(245, 158, 11, 0.15)",typeBugBg:"rgba(239, 68, 68, 0.15)",typeOtherBg:"rgba(100, 116, 139, 0.15)",typeCommentBg:"rgba(107, 114, 128, 0.15)"}:{accent:t,accentLight:t+"14",accentDark:n,accentGlow:t+"33",accentGradient:`linear-gradient(135deg, ${t}, ${n})`,bg:"#ffffff",bgHover:"#f8f9fb",text:"#0f172a",textSecondary:"#475569",textTertiary:"#64748b",border:"#e2e8f0",shadow:"rgba(0, 0, 0, 0.06)",glassBg:"rgba(255, 255, 255, 0.72)",glassBgHeavy:"rgba(255, 255, 255, 0.85)",glassBorder:"rgba(255, 255, 255, 0.35)",glassBorderSubtle:"rgba(255, 255, 255, 0.18)",typeQuestion:"#3b82f6",typeChange:"#b45309",typeBug:"#ef4444",typeOther:"#64748b",typeComment:"#6b7280",typeQuestionBg:"#eff6ff",typeChangeBg:"#fffbeb",typeBugBg:"#fef2f2",typeOtherBg:"#f8fafc",typeCommentBg:"#e5e7eb"}}function gt(r){return`
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

    ${ut}
  `}function B(r){return r.reduce((e,t)=>e+((t.status??"todo")!=="done"?1:0),0)}var Q=null;function xt(){return{destroy:()=>{},count:()=>0,export:()=>{}}}function Ne(r){let e=r.debug?(...u)=>console.debug("[ccm-feedback]",...u):()=>{};if(Q)return e("initCcmFeedback() called more than once \u2014 returning existing instance"),Q;if(!r.projectName||typeof r.projectName!="string")return console.error("[ccm-feedback] Missing or invalid 'projectName' in config."),xt();if(window.innerWidth<768)return console.info(`[ccm-feedback] Widget not loaded: viewport < ${768}px.`),xt();e("Initializing",{projectName:r.projectName});let t=mt(r.accentColor,r.theme),n=it(),o=new ce,s=!!(r.supabaseUrl&&r.supabaseKey),a,i=null;s?(i=new ne({url:r.supabaseUrl,apiKey:r.supabaseKey,projectName:r.projectName,log:e,onChange:()=>{b.refresh(),x.updateCount(B(a.list())),g.refreshIfOpen()},onReply:u=>o.emit("feedback:replied",u),onReplyDeleted:u=>o.emit("feedback:deleted",u),onUpdated:u=>o.emit("feedback:updated",u)}),a=i,e("Cloud mode enabled",{url:r.supabaseUrl})):(a=new te(r.projectName),e("LocalStorage mode"));let l=document.createElement("ccm-feedback-widget");l.style.cssText=`position:fixed;z-index:${2147483647};`;let c=l.attachShadow({mode:"open"});if("adoptedStyleSheets"in ShadowRoot.prototype){let u=new CSSStyleSheet;u.replaceSync(Ie(t)),c.adoptedStyleSheets=[u]}else{let u=document.createElement("style");u.textContent=Ie(t),c.appendChild(u)}document.body.appendChild(l);let d=new ae(t,n),m=u=>u===l||l.contains(u),b=new he(t,o,n,a,m),x=new de(c,o,n,s),g=new le(c,o,n,a,t,u=>b.scrollToAndFlash(u),u=>b.setIncludeDone(u==="done"));o.on("navigator:open",()=>g.open());let E=()=>({cssSelector:"",xpath:"",textSnippet:"",elementTag:"",elementId:void 0,textPrefix:"",textSuffix:"",fingerprint:"",neighborText:""}),T=async u=>{let w=u.getBoundingClientRect(),v=await d.show(w);if(!v)return;let A=U(),D=ie(u),j=u.getBoundingClientRect(),k=Ve(j,j),L=a.save({projectName:r.projectName,message:v.message,authorName:A,url:_e(window.location.href),path:window.location.pathname,viewport:`${window.innerWidth}x${window.innerHeight}`,userAgent:navigator.userAgent,anchor:D,rect:k,status:v.status,kind:"target"});o.emit("feedback:saved",L),b.addOne(L),x.updateCount(B(a.list())),e("Saved",L.id)},P=async u=>{let w=new DOMRect(u.x-window.scrollX,u.y-window.scrollY,0,0),v=await d.show(w);if(!v)return;let A=a.save({projectName:r.projectName,message:v.message,authorName:U(),url:_e(window.location.href),path:window.location.pathname,viewport:`${window.innerWidth}x${window.innerHeight}`,userAgent:navigator.userAgent,anchor:E(),rect:{xPct:0,yPct:0,wPct:0,hPct:0},status:v.status,kind:"pin",pin:{x:u.x,y:u.y},capturedElements:u.elements});o.emit("feedback:saved",A),b.addOne(A),x.updateCount(B(a.list())),e("Saved pin",A.id)},h=async u=>{let w=new DOMRect(u.x-window.scrollX,u.y-window.scrollY,u.w,u.h),v=await d.show(w);if(!v)return;let A=a.save({projectName:r.projectName,message:v.message,authorName:U(),url:_e(window.location.href),path:window.location.pathname,viewport:`${window.innerWidth}x${window.innerHeight}`,userAgent:navigator.userAgent,anchor:E(),rect:{xPct:0,yPct:0,wPct:0,hPct:0},status:v.status,kind:"area",area:{x:u.x,y:u.y,w:u.w,h:u.h},capturedElements:u.elements});o.emit("feedback:saved",A),b.addOne(A),x.updateCount(B(a.list())),e("Saved area",A.id)},y=new fe(t,o,n,T,m),C=new J(t,o,n,P,m),$=new Z(t,o,n,h,m);o.on("export:click",()=>{let u=a.list();if(u.length===0){console.info("[ccm-feedback] No annotations to export.");return}Le(r.projectName,u)}),o.on("copyUrl:click",()=>{let u=`${window.location.origin}/feedback?project=${encodeURIComponent(r.projectName)}`;ot(u).then(w=>{w?console.info(`[ccm-feedback] ${n("toast.urlCopied")}: ${u}`):console.warn(`[ccm-feedback] ${n("toast.urlCopyFailed")} \u2014 ${u}`)})}),o.on("clear:click",()=>{a.list().length!==0&&window.confirm(n("fab.clearConfirm"))&&(a.clear(),b.refresh(),x.updateCount(0),g.refreshIfOpen(),e("Cleared all annotations"))});let M=()=>{x.updateCount(B(a.list())),g.refreshIfOpen()};if(o.on("feedback:saved",M),o.on("feedback:updated",M),o.on("feedback:deleted",M),o.on("feedback:replied",()=>g.refreshIfOpen()),b.refresh(),x.updateCount(B(a.list())),i){let u=i;u.init().then(async()=>{b.refresh(),x.updateCount(B(a.list())),await hr(u,r.projectName,e)>0&&(b.refresh(),x.updateCount(B(a.list())))})}return Q={destroy:()=>{e("Destroying widget"),y.destroy(),C.destroy(),$.destroy(),b.destroy(),x.destroy(),d.destroy(),g.destroy(),o.removeAll(),l.remove(),Q=null},count:()=>a.list().length,export:()=>{let u=a.list();u.length!==0&&Le(r.projectName,u)}},Q}async function hr(r,e,t){let n=new Set([e,vt()]),o=0;for(let s of n){let a=`ccm-feedback:${s}`,i=null;try{i=localStorage.getItem(a)}catch{continue}if(!i)continue;let l=[];try{let d=JSON.parse(i);if(!Array.isArray(d)||d.length===0)continue;l=d.map(m=>({...m,projectName:e}))}catch{continue}t("Migrating",l.length,"local records from",a);let c=await r.migrateFromLocal(l);o+=c;try{localStorage.setItem(`${a}:migrated`,new Date().toISOString()),localStorage.removeItem(a)}catch{}}return o}function _e(r){try{let e=new URL(r);for(let t of[...e.searchParams.keys()])/token|key|secret|auth|session|password|code/i.test(t)&&e.searchParams.delete(t);return e.toString()}catch{return r}}function fr(r){return!!(!r||r==="localhost"||r==="127.0.0.1"||r==="0.0.0.0"||r==="::1"||r.endsWith(".local")||r.endsWith(".localhost"))}function vt(){let{hostname:r,port:e}=window.location,n=(r||"site").replace(/[^a-z0-9]+/gi,"-").replace(/^-+|-+$/g,"").toLowerCase()||"site";return e?`${n}-${e}`:n}if(typeof window<"u"){window.CcmFeedback={init:Ne};let r=document.currentScript;if(r){let e=r.dataset.project||vt(),t=fr(window.location.hostname),n={projectName:e,...r.dataset.accent?{accentColor:r.dataset.accent}:{},...r.dataset.theme?{theme:r.dataset.theme}:{},...r.dataset.debug==="true"?{debug:!0}:{},...!t&&r.dataset.supabaseUrl?{supabaseUrl:r.dataset.supabaseUrl}:{},...!t&&r.dataset.supabaseKey?{supabaseKey:r.dataset.supabaseKey}:{}},o=()=>Ne(n);document.readyState==="loading"?document.addEventListener("DOMContentLoaded",o,{once:!0}):o()}}return Tt(mr);})();
//# sourceMappingURL=w.js.map

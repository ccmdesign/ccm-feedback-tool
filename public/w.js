/*! CCM Feedback MVP — https://github.com/ccmdesign/ccm-feedback-tool */
"use strict";var CcmFeedback=(()=>{var ce=Object.defineProperty;var ft=Object.getOwnPropertyDescriptor;var mt=Object.getOwnPropertyNames;var gt=Object.prototype.hasOwnProperty;var bt=(t,e)=>{for(var r in e)ce(t,r,{get:e[r],enumerable:!0})},vt=(t,e,r,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let o of mt(e))!gt.call(t,o)&&o!==r&&ce(t,o,{get:()=>e[o],enumerable:!(n=ft(e,o))||n.enumerable});return t};var yt=t=>vt(ce({},"__esModule",{value:!0}),t);var nr={};bt(nr,{initCcmFeedback:()=>$e});var Re="ccm-feedback:author",xt="Anonymous";function wt(){try{let t=localStorage.getItem(Re);return t?.trim()?t.trim():null}catch{return null}}function kt(t){try{localStorage.setItem(Re,t.trim())}catch{}}function O(){let t=wt();if(t)return t;let e=null;try{e=window.prompt("Your name (shown next to your comments):","")}catch{e=null}let r=e?.trim()||xt;return kt(r),r}function I(t){let n=document.createRange().createContextualFragment(t).firstElementChild;if(!n||n.nodeName.toLowerCase()!=="svg")throw new Error("[ccm-feedback] Invalid SVG string");for(let o of[...n.attributes])o.name.startsWith("on")&&n.removeAttribute(o.name);for(let o of n.querySelectorAll("*"))for(let s of[...o.attributes])s.name.startsWith("on")&&o.removeAttribute(s.name);return n}function d(t,e){let r=document.createElement(t);if(e)for(let[n,o]of Object.entries(e))n==="class"?r.className=o:n==="style"?r.style.cssText=o:r.setAttribute(n,o);return r}function h(t,e){t.textContent=e}var Le=25;function Me(t){let e={};for(let n of Array.from(t.attributes))e[n.name]=n.value;let r=t.getBoundingClientRect();return{tag:t.tagName.toLowerCase(),attributes:e,rect:{x:r.left,y:r.top,w:r.width,h:r.height}}}var Y=class{constructor(e,r,n,o,s){this.colors=e;this.bus=r;this.t=n;this.onCapture=o;this.shouldIgnoreElement=s;this.overlay=null;this.toolbar=null;this.isActive=!1;this.savedOverflow="";this.onKey=e=>{e.key==="Escape"&&(e.preventDefault(),this.deactivate())};this.onClick=e=>{if(e.preventDefault(),e.stopPropagation(),!this.overlay)return;let r=e.clientX,n=e.clientY;this.overlay.style.pointerEvents="none";let o=document.elementsFromPoint(r,n);this.overlay&&(this.overlay.style.pointerEvents="auto");let s=o.filter(l=>!this.shouldIgnoreElement(l)).filter(l=>l!==document.documentElement&&l!==document.body).slice(0,Le).map(Me),i=r+window.scrollX,a=n+window.scrollY;this.deactivate(),this.onCapture({x:i,y:a,elements:s})};this.unsubStart=this.bus.on("pin:start",()=>this.activate())}activate(){if(this.isActive)return;this.isActive=!0,this.savedOverflow=document.body.style.overflow,this.overlay=d("div",{style:`position:fixed;inset:0;z-index:${2147483646};background:rgba(15,23,42,0.04);cursor:crosshair;`}),this.overlay.setAttribute("data-ccm-coord-pin-overlay","true"),this.toolbar=d("div",{style:`
        position:fixed;top:0;left:0;right:0;z-index:${2147483647};
        height:52px;background:${this.colors.glassBg};
        backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
        border-bottom:1px solid ${this.colors.glassBorder};
        display:flex;align-items:center;justify-content:center;gap:16px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:14px;color:${this.colors.text};
      `});let e=d("span",{style:"font-weight:500;letter-spacing:-0.01em;"});h(e,this.t("coordPin.instruction"));let r=document.createElement("button");r.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;
    `,h(r,this.t("pin.cancel")),r.addEventListener("click",()=>this.deactivate()),this.toolbar.appendChild(e),this.toolbar.appendChild(r),this.overlay.addEventListener("click",this.onClick,!0),document.addEventListener("keydown",this.onKey),document.body.style.overflow="hidden",document.body.appendChild(this.overlay),document.body.appendChild(this.toolbar)}deactivate(){this.isActive&&(this.isActive=!1,this.overlay?.removeEventListener("click",this.onClick,!0),document.removeEventListener("keydown",this.onKey),document.body.style.overflow=this.savedOverflow,this.overlay?.remove(),this.toolbar?.remove(),this.overlay=null,this.toolbar=null,this.bus.emit("pin:end"))}destroy(){this.deactivate(),this.unsubStart()}},W=class{constructor(e,r,n,o,s){this.colors=e;this.bus=r;this.t=n;this.onCapture=o;this.shouldIgnoreElement=s;this.overlay=null;this.toolbar=null;this.rectEl=null;this.isActive=!1;this.savedOverflow="";this.dragStart=null;this.onKey=e=>{e.key==="Escape"&&(e.preventDefault(),this.deactivate())};this.onMouseDown=e=>{e.preventDefault(),e.stopPropagation(),this.dragStart={x:e.clientX,y:e.clientY},this.rectEl||(this.rectEl=d("div",{style:`
          position:fixed;z-index:${2147483647};
          border:2px dashed ${this.colors.accent};
          background:${this.colors.accent}1a;
          pointer-events:none;
        `}),document.body.appendChild(this.rectEl)),this.updateRect(e.clientX,e.clientY)};this.onMouseMove=e=>{this.dragStart&&this.updateRect(e.clientX,e.clientY)};this.onMouseUp=e=>{if(!this.dragStart)return;e.preventDefault(),e.stopPropagation();let r=this.dragStart,n=Math.min(r.x,e.clientX),o=Math.min(r.y,e.clientY),s=Math.abs(e.clientX-r.x),i=Math.abs(e.clientY-r.y);if(this.dragStart=null,s<4||i<4){this.rectEl?.remove(),this.rectEl=null;return}let a=this.collectElements(n,o,s,i),l=n+window.scrollX,c=o+window.scrollY;this.deactivate(),this.onCapture({x:l,y:c,w:s,h:i,elements:a})};this.unsubStart=this.bus.on("area:start",()=>this.activate())}activate(){if(this.isActive)return;this.isActive=!0,this.savedOverflow=document.body.style.overflow,this.overlay=d("div",{style:`position:fixed;inset:0;z-index:${2147483646};background:rgba(15,23,42,0.04);cursor:crosshair;`}),this.overlay.setAttribute("data-ccm-area-overlay","true"),this.toolbar=d("div",{style:`
        position:fixed;top:0;left:0;right:0;z-index:${2147483647};
        height:52px;background:${this.colors.glassBg};
        backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
        border-bottom:1px solid ${this.colors.glassBorder};
        display:flex;align-items:center;justify-content:center;gap:16px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:14px;color:${this.colors.text};
      `});let e=d("span",{style:"font-weight:500;letter-spacing:-0.01em;"});h(e,this.t("area.instruction"));let r=document.createElement("button");r.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;
    `,h(r,this.t("pin.cancel")),r.addEventListener("click",()=>this.deactivate()),this.toolbar.appendChild(e),this.toolbar.appendChild(r),this.overlay.addEventListener("mousedown",this.onMouseDown,!0),this.overlay.addEventListener("mousemove",this.onMouseMove,!0),this.overlay.addEventListener("mouseup",this.onMouseUp,!0),document.addEventListener("keydown",this.onKey),document.body.style.overflow="hidden",document.body.appendChild(this.overlay),document.body.appendChild(this.toolbar)}deactivate(){this.isActive&&(this.isActive=!1,this.overlay?.removeEventListener("mousedown",this.onMouseDown,!0),this.overlay?.removeEventListener("mousemove",this.onMouseMove,!0),this.overlay?.removeEventListener("mouseup",this.onMouseUp,!0),document.removeEventListener("keydown",this.onKey),document.body.style.overflow=this.savedOverflow,this.overlay?.remove(),this.toolbar?.remove(),this.rectEl?.remove(),this.overlay=null,this.toolbar=null,this.rectEl=null,this.dragStart=null,this.bus.emit("area:end"))}updateRect(e,r){if(!this.rectEl||!this.dragStart)return;let n=Math.min(this.dragStart.x,e),o=Math.min(this.dragStart.y,r),s=Math.abs(e-this.dragStart.x),i=Math.abs(r-this.dragStart.y);this.rectEl.style.left=`${n}px`,this.rectEl.style.top=`${o}px`,this.rectEl.style.width=`${s}px`,this.rectEl.style.height=`${i}px`}collectElements(e,r,n,o){let s=e+n,i=r+o,a=document.body.getElementsByTagName("*"),l=[];for(let c of Array.from(a)){if(l.length>=Le)break;if(this.shouldIgnoreElement(c)||c===document.documentElement||c===document.body)continue;let u=c.getBoundingClientRect();u.width===0||u.height===0||u.right<e||u.left>s||u.bottom<r||u.top>i||l.push(Me(c))}return l}destroy(){this.deactivate(),this.unsubStart()}};var G=class{constructor(e){this.opts=e;this.ws=null;this.destroyed=!1;this.heartbeat=null;this.reconnectAttempt=0;this.refCounter=1;this.topic=`realtime:${e.schema??"public"}:${e.table}`,this.log=e.log??(()=>{})}connect(){if(this.destroyed)return;let e=`${this.opts.url.replace(/^http/,"ws").replace(/\/$/,"")}/realtime/v1/websocket?apikey=${encodeURIComponent(this.opts.apiKey)}&vsn=1.0.0`,r;try{r=new WebSocket(e)}catch(n){this.log("realtime ws constructor error",n),this.scheduleReconnect();return}this.ws=r,r.addEventListener("open",()=>{this.reconnectAttempt=0,this.send({topic:this.topic,event:"phx_join",payload:{config:{postgres_changes:[{event:"*",schema:this.opts.schema??"public",table:this.opts.table,filter:this.opts.filter}]},access_token:this.opts.apiKey},ref:String(this.refCounter++)}),this.heartbeat=setInterval(()=>{this.send({topic:"phoenix",event:"heartbeat",payload:{},ref:String(this.refCounter++)})},25e3),this.log("realtime connected")}),r.addEventListener("message",n=>this.handleMessage(n.data)),r.addEventListener("close",()=>{this.cleanupSocket(),this.destroyed||this.scheduleReconnect()}),r.addEventListener("error",n=>{this.log("realtime ws error",n)})}cleanupSocket(){this.heartbeat&&(clearInterval(this.heartbeat),this.heartbeat=null),this.ws=null}scheduleReconnect(){let e=Math.min(1e3*2**this.reconnectAttempt,3e4);this.reconnectAttempt+=1,setTimeout(()=>{this.destroyed||this.connect()},e)}send(e){if(!(!this.ws||this.ws.readyState!==WebSocket.OPEN))try{this.ws.send(JSON.stringify(e))}catch(r){this.log("realtime send error",r)}}handleMessage(e){if(typeof e!="string")return;let r;try{r=JSON.parse(e)}catch{return}if(r.event!=="postgres_changes")return;let o=r.payload?.data;if(!o)return;let s=o.type,i=o.record??o.old_record;i&&(s==="INSERT"?this.opts.onInsert(i):s==="UPDATE"?this.opts.onUpdate(i):s==="DELETE"&&this.opts.onDelete(i))}destroy(){if(this.destroyed=!0,this.cleanupSocket(),this.ws)try{this.ws.close()}catch{}}};function de(t){return`ccm-feedback:${t}`}function C(t){return!t||t==="/"?"/":t.endsWith("/")?t.slice(0,-1):t}function Pe(){try{return crypto.randomUUID()}catch{return`${Date.now()}-${Math.random().toString(36).slice(2)}`}}function N(t){try{let e=localStorage.getItem(de(t));if(!e)return[];let r=JSON.parse(e);return Array.isArray(r)?r:[]}catch{return[]}}function q(t,e){try{localStorage.setItem(de(t),JSON.stringify(e))}catch{}}function pe(t){let e={id:Pe(),projectName:t.projectName,message:t.message,authorName:t.authorName,url:t.url,path:C(t.path),viewport:t.viewport,userAgent:t.userAgent,createdAt:new Date().toISOString(),cssSelector:t.anchor.cssSelector,xpath:t.anchor.xpath,textSnippet:t.anchor.textSnippet,elementTag:t.anchor.elementTag,elementId:t.anchor.elementId,textPrefix:t.anchor.textPrefix,textSuffix:t.anchor.textSuffix,fingerprint:t.anchor.fingerprint,neighborText:t.anchor.neighborText,xPct:t.rect.xPct,yPct:t.rect.yPct,wPct:t.rect.wPct,hPct:t.rect.hPct,status:t.status??"todo",kind:t.kind??"target"};return t.pin&&(e.pinX=t.pin.x,e.pinY=t.pin.y),t.area&&(e.areaX=t.area.x,e.areaY=t.area.y,e.areaW=t.area.w,e.areaH=t.area.h),t.capturedElements&&t.capturedElements.length>0&&(e.capturedElements=t.capturedElements),e}function ue(t){return{id:Pe(),projectName:t.projectName,message:t.message,authorName:t.authorName,url:t.url,path:C(t.path),viewport:t.viewport,userAgent:t.userAgent,createdAt:new Date().toISOString(),cssSelector:"",xpath:"",textSnippet:"",elementTag:"",elementId:void 0,textPrefix:"",textSuffix:"",fingerprint:"",neighborText:"",xPct:0,yPct:0,wPct:0,hPct:0,parentId:t.parentId}}var V=class{constructor(e){this.projectName=e}list(){return N(this.projectName).filter(e=>!e.parentId)}listForPath(e){let r=C(e);return N(this.projectName).filter(n=>!n.parentId&&C(n.path)===r)}save(e){let r=N(this.projectName),n=pe(e);return r.unshift(n),q(this.projectName,r),n}delete(e){let r=N(this.projectName);if(r.findIndex(s=>s.id===e)===-1)return!1;let o=r.filter(s=>s.id!==e&&s.parentId!==e);return q(this.projectName,o),!0}clear(){localStorage.removeItem(de(this.projectName))}updateStatus(e,r){let n=N(this.projectName),o=n.find(s=>s.id===e);return o?(o.status=r,q(this.projectName,n),!0):!1}listReplies(e){return N(this.projectName).filter(r=>r.parentId===e).sort((r,n)=>r.createdAt.localeCompare(n.createdAt))}addReply(e){let r=N(this.projectName),n=ue(e);return r.push(n),q(this.projectName,r),n}};var Ie="ccm_widget_annotations";function he(t){if(!t)return null;let e=t.lastIndexOf("/");if(e===-1)return null;let r=t.slice(e+1).trim();if(r===""||r==="*")return null;let n=Number(r);return Number.isFinite(n)?n:null}function J(t){let e={id:t.id,projectName:t.project_name,message:t.message,authorName:t.author_name,url:t.url,path:t.path,viewport:t.viewport,userAgent:t.user_agent,cssSelector:t.css_selector,xpath:t.xpath,textSnippet:t.text_snippet,elementTag:t.element_tag,elementId:t.element_id??void 0,textPrefix:t.text_prefix,textSuffix:t.text_suffix,fingerprint:t.fingerprint,neighborText:t.neighbor_text,xPct:t.x_pct,yPct:t.y_pct,wPct:t.w_pct,hPct:t.h_pct,createdAt:t.created_at,status:t.status??"todo",kind:t.kind??"target"};return t.pin_x!=null&&t.pin_y!=null&&(e.pinX=t.pin_x,e.pinY=t.pin_y),t.area_x!=null&&t.area_y!=null&&t.area_w!=null&&t.area_h!=null&&(e.areaX=t.area_x,e.areaY=t.area_y,e.areaW=t.area_w,e.areaH=t.area_h),t.captured_elements&&Array.isArray(t.captured_elements)&&(e.capturedElements=t.captured_elements),t.parent_id&&(e.parentId=t.parent_id),e}function Ne(t){let e={id:t.id,project_name:t.projectName,message:t.message,author_name:t.authorName,url:t.url,path:t.path,viewport:t.viewport,user_agent:t.userAgent,css_selector:t.cssSelector,xpath:t.xpath,text_snippet:t.textSnippet,element_tag:t.elementTag,element_id:t.elementId??null,text_prefix:t.textPrefix,text_suffix:t.textSuffix,fingerprint:t.fingerprint,neighbor_text:t.neighborText,x_pct:t.xPct,y_pct:t.yPct,w_pct:t.wPct,h_pct:t.hPct,created_at:t.createdAt};return t.status&&(e.status=t.status),t.kind&&(e.kind=t.kind),t.pinX!=null&&(e.pin_x=t.pinX),t.pinY!=null&&(e.pin_y=t.pinY),t.areaX!=null&&(e.area_x=t.areaX),t.areaY!=null&&(e.area_y=t.areaY),t.areaW!=null&&(e.area_w=t.areaW),t.areaH!=null&&(e.area_h=t.areaH),t.capturedElements&&(e.captured_elements=t.capturedElements),t.parentId&&(e.parent_id=t.parentId),e}var Q=class{constructor(e){this.cache=[];this.realtime=null;this.projectName=e.projectName,this.url=e.url,this.apiKey=e.apiKey,this.onChange=e.onChange??(()=>{}),this.onReply=e.onReply??(()=>{}),this.onReplyDeleted=e.onReplyDeleted??(()=>{}),this.log=e.log??(()=>{}),this.endpoint=`${e.url.replace(/\/$/,"")}/rest/v1/${Ie}`,this.headers={apikey:e.apiKey,Authorization:`Bearer ${e.apiKey}`,"Content-Type":"application/json",Prefer:"return=representation"}}async init(){try{let e=`${this.endpoint}?project_name=eq.${encodeURIComponent(this.projectName)}&order=created_at.desc`,r=await fetch(e,{headers:this.headers});if(!r.ok){let o=await r.text();console.warn(`[ccm-feedback] cloud fetch failed: ${r.status} ${o}`);return}let n=await r.json();this.cache=n.map(J),this.log("cloud loaded",this.cache.length,"annotations"),this.startRealtime()}catch(e){console.warn("[ccm-feedback] cloud fetch error",e)}}startRealtime(){this.realtime||(this.realtime=new G({url:this.url,apiKey:this.apiKey,table:Ie,filter:`project_name=eq.${this.projectName}`,log:this.log,onInsert:e=>{let r=e;if(this.cache.some(o=>o.id===r.id))return;let n=J(r);if(n.parentId){this.cache.push(n),this.onReply(n);return}this.cache.unshift(n),this.onChange()},onUpdate:e=>{let n=J(e),o=this.cache.findIndex(s=>s.id===n.id);o===-1?this.cache.unshift(n):this.cache[o]=n,!n.parentId&&this.onChange()},onDelete:e=>{let r=e.id;if(!r)return;let n=this.cache.findIndex(s=>s.id===r);if(n===-1)return;let o=this.cache[n];if(this.cache.splice(n,1),o?.parentId){this.onReplyDeleted(r);return}this.onChange()}}),this.realtime.connect())}destroy(){this.realtime?.destroy(),this.realtime=null}list(){return this.cache.filter(e=>!e.parentId)}listForPath(e){let r=C(e);return this.cache.filter(n=>!n.parentId&&C(n.path)===r)}save(e){let r=pe(e);return this.cache.unshift(r),this.pushInsert(r),r}updateStatus(e,r){let n=this.cache.find(o=>o.id===e);return n?(n.status=r,this.pushUpdate(e,{status:r}),!0):!1}delete(e){return this.cache.findIndex(n=>n.id===e)===-1?!1:(this.cache=this.cache.filter(n=>n.id!==e&&n.parentId!==e),this.pushDelete(e),!0)}clear(){let e=this.cache.map(r=>r.id);this.cache=[],this.pushClear(e)}listReplies(e){return this.cache.filter(r=>r.parentId===e).sort((r,n)=>r.createdAt.localeCompare(n.createdAt))}addReply(e){let r=ue(e);return this.cache.push(r),this.pushInsert(r),r}async migrateFromLocal(e){if(e.length===0)return 0;let r=new Set(this.cache.map(o=>o.id)),n=e.filter(o=>!r.has(o.id));if(n.length===0)return 0;try{let o=await fetch(this.endpoint,{method:"POST",headers:{...this.headers,Prefer:"return=representation,resolution=ignore-duplicates"},body:JSON.stringify(n.map(Ne))});if(!o.ok){let i=await o.text();return console.warn(`[ccm-feedback] cloud migrate failed: ${o.status} ${i}`),0}let s=await o.json();for(let i of s){let a=J(i);this.cache.some(l=>l.id===a.id)||this.cache.unshift(a)}return this.log("cloud migrated",s.length,"of",n.length,"local annotations"),this.onChange(),s.length}catch(o){return console.warn("[ccm-feedback] cloud migrate error",o),0}}async pushInsert(e){try{let r=await fetch(this.endpoint,{method:"POST",headers:this.headers,body:JSON.stringify(Ne(e))});if(!r.ok){let n=await r.text();console.warn(`[ccm-feedback] cloud insert failed: ${r.status} ${n}`)}}catch(r){console.warn("[ccm-feedback] cloud insert error",r)}}async pushUpdate(e,r){try{let n=await fetch(`${this.endpoint}?id=eq.${encodeURIComponent(e)}`,{method:"PATCH",headers:{...this.headers,Prefer:"return=representation, count=exact"},body:JSON.stringify(r)});if(!n.ok){let s=await n.text();console.warn(`[ccm-feedback] cloud update failed: ${n.status} ${s}`);return}he(n.headers.get("content-range"))===0&&console.error(`[ccm-feedback] cloud update no-op for id=${e} \u2014 possible RLS misconfiguration or stale id`)}catch(n){console.warn("[ccm-feedback] cloud update error",n)}}async pushDelete(e){try{let r=await fetch(`${this.endpoint}?id=eq.${encodeURIComponent(e)}`,{method:"DELETE",headers:{...this.headers,Prefer:"return=representation, count=exact"}});if(!r.ok){let o=await r.text();console.warn(`[ccm-feedback] cloud delete failed: ${r.status} ${o}`);return}he(r.headers.get("content-range"))===0&&console.error(`[ccm-feedback] cloud delete no-op for id=${e} \u2014 possible RLS misconfiguration or stale id`)}catch(r){console.warn("[ccm-feedback] cloud delete error",r)}}async pushClear(e){if(e.length!==0)try{let r=e.map(s=>`"${s}"`).join(","),n=await fetch(`${this.endpoint}?id=in.(${r})`,{method:"DELETE",headers:{...this.headers,Prefer:"return=representation, count=exact"}});if(!n.ok){let s=await n.text();console.warn(`[ccm-feedback] cloud clear failed: ${n.status} ${s}`);return}let o=he(n.headers.get("content-range"));o!==null&&o<e.length&&console.warn(`[ccm-feedback] cloud clear partial: expected ${e.length} deleted ${o}`)}catch(r){console.warn("[ccm-feedback] cloud clear error",r)}}};var Et=new Set(["role","name","aria-label","rel","href"]);function Ct(t,e){let r=Et.has(t);r||(r=t.startsWith("data-")&&j(t));let n=j(e)&&e.length<100;return n||(n=e.startsWith("#")&&j(e.slice(1))),r&&n}function St(t){return j(t)}function At(t){return j(t)}function Tt(t){return!0}function _e(t,e){if(t.nodeType!==Node.ELEMENT_NODE)throw new Error("Can't generate CSS selector for non-element node type.");if(t.tagName.toLowerCase()==="html")return"html";let r={root:document.body,idName:St,className:At,tagName:Tt,attr:Ct,timeoutMs:1e3,seedMinLength:3,optimizedMinLength:2,maxNumberOfPathChecks:1/0},n=new Date,o={...r,...e},s=Pt(o.root,r),i,a=0;for(let c of $t(t,o,s)){if(new Date().getTime()-n.getTime()>o.timeoutMs||a>=o.maxNumberOfPathChecks){let f=Lt(t,s);if(!f)throw new Error(`Timeout: Can't find a unique selector after ${o.timeoutMs}ms`);return H(f)}if(a++,ge(c,s)){i=c;break}}if(!i)throw new Error("Selector was not found.");let l=[...Fe(i,t,o,s,n)];return l.sort(fe),l.length>0?H(l[0]):H(i)}function*$t(t,e,r){let n=[],o=[],s=t,i=0;for(;s&&s!==r;){let a=Rt(s,e);for(let l of a)l.level=i;if(n.push(a),s=s.parentElement,i++,o.push(...De(n)),i>=e.seedMinLength){o.sort(fe);for(let l of o)yield l;o=[]}}o.sort(fe);for(let a of o)yield a}function j(t){if(/^[a-z\-]{3,}$/i.test(t)){let e=t.split(/-|[A-Z]/);for(let r of e)if(r.length<=2||/[^aeiou]{4,}/i.test(r))return!1;return!0}return!1}function Rt(t,e){let r=[],n=t.getAttribute("id");n&&e.idName(n)&&r.push({name:"#"+CSS.escape(n),penalty:0});for(let i=0;i<t.classList.length;i++){let a=t.classList[i];e.className(a)&&r.push({name:"."+CSS.escape(a),penalty:1})}for(let i=0;i<t.attributes.length;i++){let a=t.attributes[i];e.attr(a.name,a.value)&&r.push({name:`[${CSS.escape(a.name)}="${CSS.escape(a.value)}"]`,penalty:2})}let o=t.tagName.toLowerCase();if(e.tagName(o)){r.push({name:o,penalty:5});let i=me(t,o);i!==void 0&&r.push({name:Be(o,i),penalty:10})}let s=me(t);return s!==void 0&&r.push({name:Mt(o,s),penalty:50}),r}function H(t){let e=t[0],r=e.name;for(let n=1;n<t.length;n++){let o=t[n].level||0;e.level===o-1?r=`${t[n].name} > ${r}`:r=`${t[n].name} ${r}`,e=t[n]}return r}function Oe(t){return t.map(e=>e.penalty).reduce((e,r)=>e+r,0)}function fe(t,e){return Oe(t)-Oe(e)}function me(t,e){let r=t.parentNode;if(!r)return;let n=r.firstChild;if(!n)return;let o=0;for(;n&&(n.nodeType===Node.ELEMENT_NODE&&(e===void 0||n.tagName.toLowerCase()===e)&&o++,n!==t);)n=n.nextSibling;return o}function Lt(t,e){let r=0,n=t,o=[];for(;n&&n!==e;){let s=n.tagName.toLowerCase(),i=me(n,s);if(i===void 0)return;o.push({name:Be(s,i),penalty:NaN,level:r}),n=n.parentElement,r++}if(ge(o,e))return o}function Mt(t,e){return t==="html"?"html":`${t}:nth-child(${e})`}function Be(t,e){return t==="html"?"html":`${t}:nth-of-type(${e})`}function*De(t,e=[]){if(t.length>0)for(let r of t[0])yield*De(t.slice(1,t.length),e.concat(r));else yield e}function Pt(t,e){return t.nodeType===Node.DOCUMENT_NODE?t:t===e.root?t.ownerDocument:t}function ge(t,e){let r=H(t);switch(e.querySelectorAll(r).length){case 0:throw new Error(`Can't select any node with this selector: ${r}`);case 1:return!0;default:return!1}}function*Fe(t,e,r,n,o){if(t.length>2&&t.length>r.optimizedMinLength)for(let s=1;s<t.length-1;s++){if(new Date().getTime()-o.getTime()>r.timeoutMs)return;let a=[...t];a.splice(s,1),ge(a,n)&&n.querySelector(H(a))===e&&(yield a,yield*Fe(a,e,r,n,o))}}var It=["role","aria-label","type","name","href","src","data-testid","data-id"];function Nt(t){let e=5381;for(let r=0;r<t.length;r++)e=(e<<5)+e+t.charCodeAt(r)|0;return(e>>>0).toString(36)}function be(t){let e=t.children.length,r=0,n=t.parentElement;if(n)for(let i of n.children){if(i===t)break;i.tagName===t.tagName&&r++}let o=[];for(let i of It){let a=t.getAttribute(i);a&&o.push(`${i}=${a}`)}let s=o.length>0?Nt(o.join(",")):"0";return`${e}:${r}:${s}`}function je(t,e){let r=e.split(":");if(r.length!==3)return 0;let[n,o,s]=r,i=Number(n),a=Number(o);if(Number.isNaN(i)||Number.isNaN(a))return 0;let l=be(t),[c,u,f]=l.split(":"),g=0,v=Math.abs(Number(c)-i);v===0?g+=.2:v<=2?g+=.1:v<=5&&(g+=.03);let m=Math.abs(Number(u)-a);return m===0?g+=.4:m===1?g+=.2:m<=3&&(g+=.08),f===s&&(g+=.4),g}function _(t,e){let r=e==="before"?"previousElementSibling":"nextElementSibling",n=t[r],o=3;for(;n&&o>0;){let s=n.textContent?.trim();if(s)return e==="before"?s.slice(-32):s.slice(0,32);n=n[r],o--}return""}function Z(t){let e=t.previousElementSibling?.textContent?.trim().slice(0,40)??"",r=t.nextElementSibling?.textContent?.trim().slice(0,40)??"";return[e,r].filter(Boolean).join(" | ")}function He(t){if(t.id){let n=t.id.includes("'")?`concat('${t.id.replace(/'/g,`',"'",'`)}')`:`'${t.id}'`;return`//${t.localName}[@id=${n}]`}let e=[],r=t;for(;r&&r!==document.body&&e.length<6;){let n=r.localName,o=r.parentElement;if(r.id){let i=r.id.includes("'")?`concat('${r.id.replace(/'/g,`',"'",'`)}')`:`'${r.id}'`;return e.unshift(`/${n}[@id=${i}]`),"/"+e.join("")}let s=1;if(o)for(let i of o.children){if(i===r)break;i.localName===n&&s++}e.unshift(`/${n}[${s}]`),r=o}return"/html/body"+e.join("")}function ze(t){let e=_e(t,{className:c=>!/^(css|sc|emotion|styled)-/.test(c)&&!/^[a-z]{1,3}[A-Za-z0-9]{4,8}$/.test(c),attr:c=>["data-testid","data-id","role","aria-label"].includes(c),idName:c=>!c.startsWith("radix-")&&!/^:r[0-9]+:$/.test(c),seedMinLength:3,optimizedMinLength:2}),r=He(t),o=(t.textContent?.trim()??"").slice(0,120),s=_(t,"before"),i=_(t,"after"),a=be(t),l=Z(t);return{cssSelector:e,xpath:r,textSnippet:o,textPrefix:s,textSuffix:i,fingerprint:a,neighborText:l,elementTag:t.tagName,elementId:t.id||void 0}}function Ke(t,e=document.documentElement){let r=t.x+t.width/2,n=t.y+t.height/2,o=document.elementFromPoint(r,n);if(!o||o===e)return document.body;let s=o,i=o;for(;i&&i!==document.body;){let a=i.getBoundingClientRect();if(a.left<=t.x&&a.top<=t.y&&a.right>=t.x+t.width&&a.bottom>=t.y+t.height){s=i;break}i=i.parentElement}return s}function Xe(t,e){return e.width<=0||e.height<=0?{xPct:0,yPct:0,wPct:1,hPct:1}:{xPct:(t.x-e.x)/e.width,yPct:(t.y-e.y)/e.height,wPct:t.width/e.width,hPct:t.height/e.height}}var ve='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="12" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="10" r="1" fill="currentColor" stroke="none"/></svg>',Ue='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';var ye='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',xe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',ee='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';var Ye='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';var We='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>',Ge='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14"/><path d="M9 10V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V10l3 4v3H6v-3l3-4z"/></svg>',qe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="1"/><path d="M21 21h-4v-4"/><path d="M21 13v8h-8"/></svg>';var Ve='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';var z=["todo","review","done","question"];var B={todo:{fg:"#a16207",bg:"#fef3c7",border:"#f59e0b"},review:{fg:"#1d4ed8",bg:"#dbeafe",border:"#3b82f6"},done:{fg:"#15803d",bg:"#dcfce7",border:"#22c55e"},question:{fg:"#6d28d9",bg:"#ede9fe",border:"#8b5cf6"}},te=class{constructor(e,r){this.colors=e;this.t=r;this.resolve=null;this.previouslyFocused=null;this.onKeydownTrap=null;this.status="todo";this.statusButtons=new Map;this.root=d("div",{style:`
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
    `,this.textarea.placeholder=this.t("popup.placeholder"),this.textarea.maxLength=5e3,this.textarea.setAttribute("aria-label",this.t("popup.textareaAria")),this.textarea.addEventListener("focus",()=>{this.textarea.style.borderColor=this.colors.accent,this.textarea.style.boxShadow=`0 0 0 3px ${this.colors.accent}14`,this.textarea.style.background=this.colors.bg}),this.textarea.addEventListener("blur",()=>{this.textarea.style.borderColor=this.colors.border,this.textarea.style.boxShadow="none",this.textarea.style.background=this.colors.glassBgHeavy}),this.textarea.addEventListener("input",()=>this.updateSubmitState()),this.textarea.addEventListener("keydown",c=>{c.key==="Enter"&&(c.ctrlKey||c.metaKey)?(c.preventDefault(),this.submit()):c.key==="Escape"&&this.cancel()});let n=d("div",{style:`font-size:11px;color:${this.colors.textTertiary};text-align:right;margin-top:6px;letter-spacing:0.01em;`}),o=/Macintosh|Mac OS X/i.test(navigator.userAgent);h(n,o?this.t("popup.submitHintMac"):this.t("popup.submitHintOther"));let s=d("div",{style:"display:flex;justify-content:flex-end;gap:8px;margin-top:12px;"}),i=document.createElement("button");i.type="button",i.style.cssText=`
      height:34px;padding:0 16px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;
      font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s ease;
    `,h(i,this.t("popup.cancel")),i.addEventListener("click",()=>this.cancel()),this.submitBtn=document.createElement("button"),this.submitBtn.type="button",this.submitBtn.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:none;background:${this.colors.accentGradient};
      color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;
      opacity:0.35;pointer-events:none;transition:all 0.2s ease;
      box-shadow:0 2px 8px ${this.colors.accentGlow};
    `,h(this.submitBtn,this.t("popup.submit")),this.submitBtn.addEventListener("click",()=>this.submit()),s.appendChild(i),s.appendChild(this.submitBtn);let a=d("div",{style:"display:flex;align-items:center;gap:6px;margin-top:10px;flex-wrap:wrap;"}),l=d("span",{style:`font-size:11px;color:${this.colors.textTertiary};margin-right:4px;`});h(l,`${this.t("status.label")}:`),a.appendChild(l);for(let c of z){let u=document.createElement("button");u.type="button",u.dataset.status=c,u.style.cssText=`
        height:24px;padding:0 10px;border-radius:9999px;
        font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;
        transition:all 0.15s ease;
      `,h(u,this.t(`status.${c}`)),u.addEventListener("click",()=>this.setStatus(c)),this.statusButtons.set(c,u),a.appendChild(u)}this.root.appendChild(this.textarea),this.root.appendChild(a),this.root.appendChild(n),this.root.appendChild(s),document.body.appendChild(this.root),this.applyStatusStyles()}setStatus(e){this.status=e,this.applyStatusStyles()}applyStatusStyles(){for(let[e,r]of this.statusButtons){let n=B[e],o=e===this.status;r.style.background=o?n.bg:"transparent",r.style.color=o?n.fg:this.colors.textTertiary,r.style.border=`1px solid ${o?n.border:this.colors.border}`}}show(e){return new Promise(r=>{this.resolve=r,this.textarea.value="",this.status="todo",this.applyStatusStyles(),this.updateSubmitState(),this.previouslyFocused=document.activeElement;let n=e.bottom+8,o=e.left;n+220>window.innerHeight&&(n=e.top-220-8),o+300>window.innerWidth&&(o=e.right-300),n=Math.max(8,n),o=Math.max(8,o),this.root.style.top=`${n}px`,this.root.style.left=`${o}px`,this.root.style.display="block",this.onKeydownTrap=s=>{if(s.key!=="Tab")return;let i=Array.from(this.root.querySelectorAll('button:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])'));if(i.length===0)return;let a=i[0],l=i[i.length-1];!a||!l||(s.shiftKey?(document.activeElement===a||!this.root.contains(document.activeElement))&&(s.preventDefault(),l.focus()):(document.activeElement===l||!this.root.contains(document.activeElement))&&(s.preventDefault(),a.focus()))},this.root.addEventListener("keydown",this.onKeydownTrap),requestAnimationFrame(()=>{this.root.style.opacity="1",this.root.style.transform="translateY(0) scale(1)",this.textarea.focus()})})}updateSubmitState(){let e=this.textarea.value.trim().length>0;this.submitBtn.disabled=!e,this.submitBtn.style.opacity=e?"1":"0.35",this.submitBtn.style.pointerEvents=e?"auto":"none"}submit(){let e=this.textarea.value.trim();e&&(this.resolve?.({message:e,status:this.status}),this.resolve=null,this.hide())}cancel(){this.resolve?.(null),this.resolve=null,this.hide()}hide(){this.onKeydownTrap&&(this.root.removeEventListener("keydown",this.onKeydownTrap),this.onKeydownTrap=null),this.root.style.opacity="0",this.root.style.transform="translateY(8px) scale(0.98)",this.previouslyFocused?.focus(),this.previouslyFocused=null,setTimeout(()=>{this.root.style.display="none"},200)}destroy(){this.root.remove()}};var Je=140,Ot="todo",re=class{constructor(e,r,n,o,s,i,a=()=>{}){this.bus=r;this.t=n;this.store=o;this.colors=s;this.jump=i;this.onFilterChange=a;this.isOpen=!1;this.filter=Ot;this.otherPagesExpanded=!1;this.previouslyFocused=null;this.chipButtons=new Map;this.chipCounts=new Map;this.chipLabels=new Map;this.root=d("div",{class:"sp-panel"}),this.root.setAttribute("role","dialog"),this.root.setAttribute("aria-label",n("drawer.aria")),this.root.setAttribute("aria-hidden","true"),this.root.inert=!0;let l=d("div",{class:"sp-panel-header"}),c=d("div",{class:"sp-panel-title"});h(c,n("drawer.title"));let u=d("button",{class:"sp-panel-close",type:"button"});u.setAttribute("aria-label",n("drawer.close")),u.appendChild(I(ee)),u.addEventListener("click",()=>this.close()),l.appendChild(c),l.appendChild(u),this.filtersEl=d("div",{class:"sp-filters"});let f=d("div",{class:"sp-chips"}),g=[...z];for(let m of g){let x=d("button",{class:"sp-chip",type:"button"}),S=n(`status.${m}`),T=d("span",{class:"sp-chip-label"});h(T,S);let A=d("span",{class:"sp-chip-count"});A.setAttribute("aria-hidden","true"),x.appendChild(T),x.appendChild(A),x.dataset.filter=m,x.setAttribute("aria-pressed",m===this.filter?"true":"false"),x.addEventListener("click",()=>this.setFilter(m)),this.chipButtons.set(m,x),this.chipCounts.set(m,A),this.chipLabels.set(m,S),f.appendChild(x)}this.filtersEl.appendChild(f),this.listEl=d("div",{class:"sp-list"}),this.root.appendChild(l),this.root.appendChild(this.filtersEl),this.root.appendChild(this.listEl),e.appendChild(this.root);let v=e.host;this.onDocumentClick=m=>{this.isOpen&&(m.composedPath().includes(v)||this.close())},this.onKeydown=m=>{if(this.isOpen){if(m.key==="Escape"){m.stopPropagation(),this.close();return}m.key==="Tab"&&this.trapFocus(m)}},this.applyChipStyles()}open(){if(this.isOpen){this.render();return}this.isOpen=!0,this.previouslyFocused=this.deepActiveElement()??null,this.render(),this.root.classList.add("sp-panel--open"),this.root.setAttribute("aria-hidden","false"),this.root.inert=!1,document.addEventListener("click",this.onDocumentClick),document.addEventListener("keydown",this.onKeydown,!0),requestAnimationFrame(()=>{this.root.querySelector('button:not([disabled]):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"])')?.focus()})}close(){if(!this.isOpen)return;this.isOpen=!1,this.root.classList.remove("sp-panel--open"),this.root.setAttribute("aria-hidden","true"),this.root.inert=!0,document.removeEventListener("click",this.onDocumentClick),document.removeEventListener("keydown",this.onKeydown,!0),this.bus.emit("navigator:close");let e=this.previouslyFocused;this.previouslyFocused=null,e&&typeof e.focus=="function"&&e.focus()}refreshIfOpen(){this.isOpen&&this.render()}destroy(){document.removeEventListener("click",this.onDocumentClick),document.removeEventListener("keydown",this.onKeydown,!0),this.root.remove()}setFilter(e){this.filter!==e&&(this.filter=e,this.applyChipStyles(),this.onFilterChange(e),this.render())}getFilter(){return this.filter}applyChipStyles(){for(let[e,r]of this.chipButtons){let n=e===this.filter;r.classList.toggle("sp-chip--active",n),r.setAttribute("aria-pressed",n?"true":"false")}}updateChipCounts(e){let r=new Map;for(let n of z)r.set(n,0);for(let n of e){let o=n.status??"todo";r.set(o,(r.get(o)??0)+1)}for(let[n,o]of this.chipButtons){let s=r.get(n)??0,i=this.chipCounts.get(n),a=this.chipLabels.get(n)??n;i&&h(i,String(s)),o.setAttribute("aria-label",`${a} \u2014 ${s}`)}}render(){this.listEl.replaceChildren();let e=this.store.list();this.updateChipCounts(e);let r=e.filter(l=>(l.status??"todo")===this.filter);if(e.length===0){this.listEl.appendChild(this.buildEmpty(this.t("drawer.empty")));return}if(r.length===0){this.listEl.appendChild(this.buildEmpty(this.t("drawer.emptyFiltered")));return}let n=C(window.location.pathname),o=[...r].sort((l,c)=>new Date(c.createdAt).getTime()-new Date(l.createdAt).getTime()),s=o.filter(l=>C(l.path)===n),i=o.filter(l=>C(l.path)!==n),a=0;if(s.length>0){i.length>0&&this.listEl.appendChild(this.buildSectionLabel(this.t("drawer.thisPage")));for(let l of s)this.listEl.appendChild(this.buildCard(l,++a))}if(i.length>0){let l=d("button",{class:"sp-chip",type:"button"});l.style.cssText="margin:8px 4px;";let c=()=>{h(l,`${this.otherPagesExpanded?"\u25BE ":"\u25B8 "}${this.t("drawer.otherPages",{n:i.length})}`)};c(),l.setAttribute("aria-expanded",this.otherPagesExpanded?"true":"false");let u=d("div",{});u.style.display=this.otherPagesExpanded?"block":"none",l.addEventListener("click",()=>{this.otherPagesExpanded=!this.otherPagesExpanded,u.style.display=this.otherPagesExpanded?"block":"none",l.setAttribute("aria-expanded",this.otherPagesExpanded?"true":"false"),c()});for(let f of i)u.appendChild(this.buildCard(f,++a));this.listEl.appendChild(l),this.listEl.appendChild(u)}}buildSectionLabel(e){let r=d("div",{style:`font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${this.colors.textTertiary};padding:10px 8px 4px;`});return h(r,e),r}buildEmpty(e){let r=d("div",{class:"sp-empty"}),n=d("div",{class:"sp-empty-text"});return h(n,e),r.appendChild(n),r}buildCard(e,r){let n=e.status??"todo",o=B[n],s=C(e.path)===C(window.location.pathname),i=d("button",{class:"sp-card",type:"button"});i.style.textAlign="left",i.style.width="100%",i.dataset.annotationId=e.id;let a=e.message.length>Je?`${e.message.slice(0,Je).trimEnd()}\u2026`:e.message;i.setAttribute("aria-label",this.t("drawer.rowAria",{n:r,message:a})),i.addEventListener("click",()=>{s?this.jump(e.id):e.url&&(window.location.href=e.url)});let l=d("div",{class:"sp-card-bar",style:`background:${o.border};`}),c=d("div",{class:"sp-card-body"}),u=d("div",{class:"sp-card-header"}),f=d("span",{class:"sp-card-number"});h(f,`#${r}`);let g=d("span",{class:"sp-badge",style:`background:${o.bg};color:${o.fg};border:1px solid ${o.border};`});h(g,this.t(`status.${n}`).toUpperCase());let v=d("span",{class:"sp-card-date"});h(v,new Date(e.createdAt).toLocaleDateString()),u.appendChild(f),u.appendChild(g),u.appendChild(v);let m=d("div",{class:"sp-card-message"});h(m,a);let x=d("div",{style:`font-size:11px;color:${this.colors.textTertiary};margin-top:8px;display:flex;flex-wrap:wrap;gap:8px;`}),S=e.authorName?.trim()||"Anonymous",T=e.kind??"target",A=d("span",{});h(A,S);let L=d("span",{style:"text-transform:uppercase;letter-spacing:0.04em;"});h(L,T);let $=d("span",{style:"overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;"});return h($,C(e.path)),x.appendChild(A),x.appendChild(L),x.appendChild($),c.appendChild(u),c.appendChild(m),c.appendChild(x),i.appendChild(l),i.appendChild(c),i}trapFocus(e){let r=Array.from(this.root.querySelectorAll('button:not([disabled]):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"])'));if(r.length===0)return;let n=r[0],o=r[r.length-1];if(!n||!o)return;let s=this.deepActiveElement();e.shiftKey?(s===n||!this.root.contains(s))&&(e.preventDefault(),o.focus()):(s===o||!this.root.contains(s))&&(e.preventDefault(),n.focus())}deepActiveElement(){let e=document.activeElement;for(;e?.shadowRoot?.activeElement;)e=e.shadowRoot.activeElement;return e}};var ne=class{constructor(){this.listeners=new Map}on(e,r){let n=this.listeners.get(e);return n||(n=new Set,this.listeners.set(e,n)),n.add(r),()=>{n.delete(r)}}emit(e,...r){let n=this.listeners.get(e);if(n)for(let o of n)try{o(...r)}catch(s){console.error(`[ccm-feedback] Error in listener for "${String(e)}":`,s)}}removeAll(){this.listeners.clear()}};function _t(t,e,r){let n=new Blob([t],{type:r}),o=URL.createObjectURL(n),s=document.createElement("a");s.href=o,s.download=e,s.style.display="none",document.body.appendChild(s),s.click(),requestAnimationFrame(()=>{URL.revokeObjectURL(o),s.remove()})}async function Qe(t){try{if(navigator.clipboard?.writeText)return await navigator.clipboard.writeText(t),!0}catch{}try{let e=document.createElement("textarea");e.value=t,e.style.cssText="position:fixed;top:-9999px;left:-9999px;opacity:0;",document.body.appendChild(e),e.select();let r=document.execCommand("copy");return e.remove(),r}catch{return!1}}function we(t,e){let r=new Date().toISOString().slice(0,10),n=t.replace(/[^a-zA-Z0-9_-]/g,"_"),o={projectName:t,exportedAt:new Date().toISOString(),count:e.length,annotations:e};_t(JSON.stringify(o,null,2),`ccm-feedback-${n}-${r}.json`,"application/json;charset=utf-8")}var Bt=54,oe=class{constructor(e,r,n,o=!1){this.bus=r;this.t=n;this.cloudMode=o;this.countBadge=null;this.mode="closed";this.annotationsVisible=!0;this.items=[{id:"target",icon:We,label:n("fab.targetLabel"),direction:"up"},{id:"toggle",icon:ye,iconAlt:xe,label:n("fab.toggleOn"),direction:"up"},{id:"pin",icon:Ge,label:n("fab.pinLabel"),direction:"up"},{id:"area",icon:qe,label:n("fab.areaLabel"),direction:"up"},{id:"navigator",icon:Ue,label:n("fab.navigatorLabel"),direction:"up"},{id:"export",icon:Dt,label:n("fab.export"),direction:"left"},{id:"copyUrl",icon:Ve,label:n("fab.copyUrl"),direction:"left",...this.cloudMode?{}:{disabled:!0,disabledTitle:n("fab.copyUrlLocalOnly")}},{id:"clear",icon:Ye,label:n("fab.clear"),direction:"left"}],this.fab=document.createElement("button"),this.fab.className="sp-fab sp-fab--bottom-right sp-anim-fab-in",this.fab.style.position="fixed",this.fab.appendChild(I(ve)),this.fab.setAttribute("aria-label",n("fab.aria")),this.fab.setAttribute("aria-expanded","false"),this.fab.addEventListener("click",a=>{a.detail>=2||this.toggle()}),this.fab.addEventListener("dblclick",a=>{a.preventDefault(),this.openAll()}),this.radialContainer=document.createElement("div"),this.radialContainer.className="sp-radial sp-radial--bottom-right",this.radialContainer.setAttribute("role","menu"),this.items.forEach((a,l)=>{let c=document.createElement("button");c.className="sp-radial-item",c.style.setProperty("--sp-i",String(l)),c.appendChild(I(a.icon)),c.setAttribute("role","menuitem"),c.setAttribute("aria-label",a.label),c.dataset.itemId=a.id,c.dataset.direction=a.direction,a.disabled&&(c.setAttribute("aria-disabled","true"),c.dataset.disabled="true",c.style.opacity="0.4",c.style.cursor="not-allowed",a.disabledTitle&&(c.title=a.disabledTitle));let u=document.createElement("span");u.className="sp-radial-label",u.style.cssText=a.direction==="up"?"position:absolute;right:54px;top:50%;transform:translateY(-50%);white-space:nowrap;":"position:absolute;bottom:54px;left:50%;transform:translateX(-50%);white-space:nowrap;",u.textContent=a.label,c.appendChild(u),c.addEventListener("click",f=>{f.stopPropagation(),!a.disabled&&this.handleItemClick(a.id)}),this.radialContainer.appendChild(c)}),this.root=document.createElement("div"),this.root.appendChild(this.radialContainer),this.root.appendChild(this.fab),e.appendChild(this.root);let s=e.host;this.onDocumentClick=a=>{this.mode!=="closed"&&!a.composedPath().includes(s)&&this.close()},document.addEventListener("click",this.onDocumentClick);let i=a=>{a.key==="Escape"&&this.mode!=="closed"&&(a.stopPropagation(),this.close())};this.fab.addEventListener("keydown",i),this.radialContainer.addEventListener("keydown",i)}updateCount(e){if(e<=0){this.countBadge?.remove(),this.countBadge=null;return}this.countBadge||(this.countBadge=document.createElement("span"),this.countBadge.className="sp-fab-badge",this.countBadge.setAttribute("role","status"),this.countBadge.setAttribute("aria-live","polite"),this.fab.appendChild(this.countBadge)),h(this.countBadge,e>99?"99+":String(e))}toggle(){this.mode==="closed"?this.openMode("up"):this.close()}openAll(){this.openMode("all")}openMode(e){this.mode=e,this.setFabIcon(ee),this.fab.setAttribute("aria-expanded","true");let r=this.radialContainer.querySelectorAll(".sp-radial-item"),n={up:0,left:0};r.forEach(o=>{let s=o.dataset.direction??"up";if(!(e==="all"||s==="up")){o.style.transform="translate(0, 0) scale(0.8)",o.classList.remove("sp-radial-item--open");return}let a=16+Bt*(n[s]+1);n[s]+=1;let l=s==="left"?-a:0,c=s==="up"?-a:0;o.style.transform=`translate(${l}px, ${c}px) scale(1)`,o.classList.add("sp-radial-item--open")}),requestAnimationFrame(()=>{this.radialContainer.querySelector(".sp-radial-item--open")?.focus()})}close(){this.mode="closed",this.setFabIcon(ve),this.fab.setAttribute("aria-expanded","false"),this.radialContainer.querySelectorAll(".sp-radial-item").forEach(r=>{r.style.transform="translate(0, 0) scale(0.8)",r.classList.remove("sp-radial-item--open")}),this.fab.focus()}setFabIcon(e){let r=this.countBadge;this.fab.replaceChildren(I(e)),r&&this.fab.appendChild(r)}handleItemClick(e){switch(this.close(),e){case"target":this.bus.emit("target:start");break;case"pin":this.bus.emit("pin:start");break;case"area":this.bus.emit("area:start");break;case"toggle":{this.annotationsVisible=!this.annotationsVisible,this.bus.emit("annotations:toggle",this.annotationsVisible);let r=this.radialContainer.querySelector('[data-item-id="toggle"]');r&&(r.querySelector("svg")?.remove(),r.insertBefore(I(this.annotationsVisible?ye:xe),r.firstChild),r.setAttribute("aria-label",this.t(this.annotationsVisible?"fab.toggleOn":"fab.toggleOff")));break}case"navigator":this.bus.emit("navigator:open");break;case"export":this.bus.emit("export:click");break;case"copyUrl":this.bus.emit("copyUrl:click");break;case"clear":this.bus.emit("clear:click");break}}destroy(){document.removeEventListener("click",this.onDocumentClick),this.root.remove()}},Dt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';var Ft={"fab.aria":"Feedback","fab.targetLabel":"Target element","fab.pinLabel":"Drop pin","fab.areaLabel":"Capture area","fab.toggleOn":"Hide comments","fab.toggleOff":"Show comments","fab.export":"Export JSON","fab.copyUrl":"Copy feedback URL","fab.copyUrlLocalOnly":"Cloud mode only \u2014 use Export JSON","fab.clear":"Clear all","fab.clearConfirm":"Delete all annotations for this project? This cannot be undone.","fab.navigatorLabel":"Comments","pin.ariaLabel":"Pin mode toolbar","pin.instruction":"Click any element to comment on it","pin.cancel":"Cancel","coordPin.instruction":"Click anywhere to drop a pin","area.instruction":"Drag to capture an area","status.todo":"Todo","status.review":"Review","status.done":"Done","status.question":"Question","status.label":"Status","popup.ariaLabel":"Comment composer","popup.placeholder":"Leave a comment\u2026","popup.textareaAria":"Comment","popup.cancel":"Cancel","popup.submit":"Send","popup.submitHintMac":"\u2318 + \u21B5 to submit","popup.submitHintOther":"Ctrl + \u21B5 to submit","marker.ariaLabel":"Comment #{n}","marker.popover.delete":"Delete","marker.popover.close":"Close","marker.popover.deleteConfirm":"Delete this comment? This cannot be undone.","marker.replies.heading":"Replies","marker.reply.delete":"Delete reply","marker.reply.placeholder":"Write a reply\u2026","marker.reply.send":"Reply","marker.replyDeleteConfirm":"Delete this reply? This cannot be undone.","toast.exported":"Exported {n} annotation(s)","toast.empty":"No annotations to export","toast.urlCopied":"Feedback URL copied to clipboard","toast.urlCopyFailed":"Could not copy URL \u2014 clipboard unavailable","drawer.title":"Comments","drawer.aria":"Comments navigator","drawer.close":"Close comments","drawer.empty":"No comments yet","drawer.emptyFiltered":"No comments match this filter","drawer.thisPage":"This page","drawer.otherPages":"Other pages ({n})","drawer.rowAria":"Comment {n}: {message}"};function Ze(){return(t,e)=>{let r=Ft[t]??t;return e?r.replace(/\{(\w+)\}/g,(n,o)=>String(e[o]??"")):r}}function jt(t,e){if(t===e)return 0;if(t.length===0)return e.length;if(e.length===0)return t.length;if(t.length>e.length){let i=t;t=e,e=i}let r=t.length,n=e.length,o=new Array(r+1);for(let i=0;i<=r;i++)o[i]=i;let s=new Array(r+1);for(let i=1;i<=n;i++){s[0]=i;for(let l=1;l<=r;l++){let c=o[l-1]??0;s[l]=t[l-1]===e[i-1]?c:1+Math.min(c,o[l]??0,s[l-1]??0)}let a=o;o=s,s=a}return o[r]??0}function D(t,e){if(t===e)return 1;let r=Math.max(t.length,e.length);return r===0?1:1-jt(t,e)/r}function ke(t,e,r=.6){if(!e||!t)return 0;if(t.includes(e))return 1;let n=e.length;if(n>t.length){let a=D(t,e);return a>=r?a:0}let o=0,s=t.length>500?t.slice(0,500):t,i=s.length-n;for(let a=0;a<=i;a++){let l=s.slice(a,a+n),c=D(l,e);if(c>o&&(o=c),o>=.95)break}return o>=r?o:0}var Ht=300,zt=.3;function Ee(t,e){if(!e.textSnippet)return!0;let r=(t.textContent?.trim()??"").slice(0,500);return ke(r,e.textSnippet,.5)>zt}function Kt(t){if(t.elementId){let e=document.getElementById(t.elementId);if(e&&e.tagName===t.elementTag&&Ee(e,t))return{element:e,confidence:1,strategy:"id"}}try{let e=document.querySelector(t.cssSelector);if(e&&e.tagName===t.elementTag&&Ee(e,t))return{element:e,confidence:.95,strategy:"css"}}catch{}try{let r=document.evaluate(t.xpath,document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue;if(r instanceof Element&&r.tagName===t.elementTag&&Ee(r,t))return{element:r,confidence:.9,strategy:"xpath"}}catch{}return Xt(t)}function Xt(t){let e=t.elementTag.toLowerCase(),r=document.querySelectorAll(e);if(r.length===0)return null;let n=null,o=0,s=Math.min(r.length,Ht);for(let i=0;i<s;i++){let a=r[i];if(!a)continue;let l=Ut(a,t);if(l>o&&(o=l,n=a,o>=.85))break}return!n||o<.4?null:{element:n,confidence:Math.min(o,.85),strategy:"scan"}}function Ut(t,e){let r=0,n=0,o=(t.textContent?.trim()??"").slice(0,500);if(e.textSnippet&&(n+=40,r+=ke(o,e.textSnippet,.5)*40),e.fingerprint&&(n+=20,r+=je(t,e.fingerprint)*20),e.textPrefix||e.textSuffix){n+=20;let s=0,i=0;if(e.textPrefix){let a=_(t,"before");s+=a?D(a,e.textPrefix):0,i++}if(e.textSuffix){let a=_(t,"after");s+=a?D(a,e.textSuffix):0,i++}i>0&&(r+=s/i*20)}if(e.neighborText){n+=20;let s=Z(t);r+=s?D(s,e.neighborText)*20:0}return n>0?r/n:0}function et(t,e){let r=Kt(t);if(!r)return null;let n=r.element.getBoundingClientRect(),o=new DOMRect(n.x+e.xPct*n.width,n.y+e.yPct*n.height,e.wPct*n.width,e.hPct*n.height);return{element:r.element,rect:o,confidence:r.confidence,strategy:r.strategy}}var ie=26,K=ie/2,Yt=200,tt=180,rt=300,nt=480,ot=16,se=class{constructor(e,r,n,o){this.colors=e;this.bus=r;this.t=n;this.store=o;this.entries=[];this.visible=!0;this.includeDone=!1;this.popover=null;this.popoverDisposers=[];this.repositionTimer=null;this.lastPath=window.location.pathname;if(this.container=d("div",{style:`position:absolute;top:0;left:0;width:100%;height:0;overflow-x:clip;overflow-y:visible;z-index:${2147483645};pointer-events:none;`}),this.container.setAttribute("aria-hidden","false"),this.container.setAttribute("data-ccm-markers","true"),document.body.appendChild(this.container),!document.getElementById("ccm-marker-anim")){let i=document.createElement("style");i.id="ccm-marker-anim",i.textContent=`
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
      `,document.head.appendChild(i)}this.onResize=this.scheduleReposition.bind(this),this.onScroll=this.scheduleReposition.bind(this),window.addEventListener("resize",this.onResize,{passive:!0}),window.addEventListener("scroll",this.onScroll,{passive:!0}),this.onDocClick=i=>{this.popover&&(i.composedPath().some(a=>a===this.popover)||this.closePopover())},document.addEventListener("click",this.onDocClick,!0);let s=()=>{window.location.pathname!==this.lastPath&&(this.lastPath=window.location.pathname,this.refresh())};this.onPopState=s,window.addEventListener("popstate",this.onPopState),this.origPushState=history.pushState.bind(history),this.origReplaceState=history.replaceState.bind(history),history.pushState=(...i)=>{this.origPushState(...i),s()},history.replaceState=(...i)=>{this.origReplaceState(...i),s()},this.bus.on("annotations:toggle",i=>this.setVisible(i))}refresh(){this.closePopover();for(let r of this.entries)r.node.remove();this.entries=[],this.store.listForPath(window.location.pathname).filter(r=>this.shouldRender(r)).forEach((r,n)=>{let o=this.buildMarker(r,n+1);this.container.appendChild(o),this.entries.push({record:r,node:o,anchorEl:null})}),this.reposition()}addOne(e){if(!this.shouldRender(e))return;let r=this.entries.length+1,n=this.buildMarker(e,r);this.container.appendChild(n),this.entries.unshift({record:e,node:n,anchorEl:null}),this.renumber(),this.reposition()}shouldRender(e){return!((e.status??"todo")==="done"&&!this.includeDone)}setIncludeDone(e){this.includeDone!==e&&(this.includeDone=e,this.refresh())}setVisible(e){this.visible=e,this.container.style.display=e?"block":"none",e||this.closePopover()}canLocate(e){let r=this.entries.find(n=>n.record.id===e);return r?this.isEntryLocatable(r):!1}scrollToAndFlash(e){let r=this.entries.find(o=>o.record.id===e);if(!r||!this.isEntryLocatable(r))return!1;let n=Number.parseFloat(r.node.style.top);if(Number.isFinite(n)&&window.scrollTo({top:Math.max(0,n-window.innerHeight/3),behavior:"smooth"}),this.visible){let o=r.node;o.style.animation="ccm-pulse 0.6s ease-in-out 1",window.setTimeout(()=>{let s=o.dataset.status;o.style.animation=s==="question"?"ccm-pulse 1.6s ease-in-out infinite":""},650)}return this.flashAnchorElement(r),!0}flashAnchorElement(e){if((e.record.kind??"target")!=="target")return;let n=e.anchorEl;!n||!(n instanceof HTMLElement)||(n.classList.remove("ccm-anchor-flash"),n.offsetWidth,n.classList.add("ccm-anchor-flash"),window.setTimeout(()=>{n.classList.remove("ccm-anchor-flash")},1250))}isEntryLocatable(e){return!0}buildMarker(e,r){let n=e.status??"todo",o=B[n],s=d("button",{type:"button","aria-label":this.t("marker.ariaLabel",{n:r}),style:`
        position:absolute;width:${ie}px;height:${ie}px;
        border-radius:9999px;border:2px solid #fff;
        background:${o.border};color:#fff;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:12px;font-weight:700;line-height:1;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 8px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.18);
        cursor:pointer;pointer-events:auto;
        transform:translate(-50%, -50%);transition:transform 0.15s ease;
      `});return s.dataset.annotationId=e.id,s.dataset.status=n,s.dataset.kind=e.kind??"target",n==="question"&&(s.style.animation="ccm-pulse 1.6s ease-in-out infinite"),h(s,String(r)),s.addEventListener("mouseenter",()=>{s.style.transform="translate(-50%, -50%) scale(1.12)"}),s.addEventListener("mouseleave",()=>{s.style.transform="translate(-50%, -50%) scale(1)"}),s.addEventListener("click",i=>{i.stopPropagation(),this.openPopover(e,s)}),s}renumber(){this.entries.forEach((e,r)=>{let n=r+1;h(e.node,String(n)),e.node.setAttribute("aria-label",this.t("marker.ariaLabel",{n}))})}openPopover(e,r){this.closePopover();let n=d("div",{style:`
        z-index:${2147483647};max-width:300px;min-width:220px;padding:14px;
        border-radius:12px;background:${this.colors.glassBg};
        backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
        border:1px solid ${this.colors.glassBorder};
        box-shadow:0 8px 32px ${this.colors.shadow},0 2px 8px ${this.colors.shadow};
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        color:${this.colors.text};font-size:13px;line-height:1.5;
        -webkit-font-smoothing:antialiased;
      `});n.setAttribute("role","dialog"),n.setAttribute("aria-label",this.t("marker.ariaLabel",{n:""})),n.addEventListener("click",b=>b.stopPropagation());let o=d("div",{style:"white-space:pre-wrap;word-break:break-word;margin-bottom:10px;"});h(o,e.message);let s=d("div",{style:`font-size:11px;color:${this.colors.textTertiary};margin-bottom:12px;`}),i=e.authorName?.trim()||"Anonymous";h(s,`${i} \xB7 ${new Date(e.createdAt).toLocaleString()}`);let a=e.status??"todo",l=B[a],c=d("span",{style:`
        display:inline-block;padding:2px 10px;border-radius:9999px;
        font-size:10px;font-weight:600;letter-spacing:0.02em;
        background:${l.bg};color:${l.fg};border:1px solid ${l.border};
        margin-right:6px;cursor:pointer;
      `});h(c,this.t(`status.${a}`).toUpperCase()),c.addEventListener("click",()=>this.cycleStatus(e));let u=d("span",{style:`
        display:inline-block;padding:2px 8px;border-radius:9999px;
        font-size:10px;font-weight:600;letter-spacing:0.02em;
        background:${this.colors.glassBgHeavy};color:${this.colors.textTertiary};
        border:1px solid ${this.colors.border};margin-right:6px;text-transform:uppercase;
      `});h(u,e.kind??"target");let f=d("div",{style:"margin-bottom:10px;display:flex;flex-wrap:wrap;gap:4px;"});f.appendChild(c),f.appendChild(u);let g=d("div",{style:"display:flex;justify-content:flex-end;gap:8px;"}),v=document.createElement("button");v.type="button",v.style.cssText=`
      height:30px;padding:0 14px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:inherit;font-size:12px;font-weight:500;
      cursor:pointer;transition:all 0.2s ease;
    `,h(v,this.t("marker.popover.close")),v.addEventListener("click",()=>this.closePopover());let m=document.createElement("button");m.type="button",m.style.cssText=`
      height:30px;padding:0 14px;border-radius:9999px;
      border:1px solid ${this.colors.typeBug};background:${this.colors.typeBugBg};
      color:${this.colors.typeBug};font-family:inherit;font-size:12px;font-weight:600;
      cursor:pointer;transition:all 0.2s ease;
    `,h(m,this.t("marker.popover.delete")),m.addEventListener("click",()=>{window.confirm(this.t("marker.popover.deleteConfirm"))&&(this.store.delete(e.id),this.bus.emit("feedback:deleted",e.id),this.closePopover(),this.refresh())});let x=d("div",{style:`height:1px;background:${this.colors.border};margin:10px -4px 10px;`}),S=d("div",{style:"display:flex;flex-direction:column;gap:8px;margin-bottom:10px;"}),T=()=>{S.replaceChildren();let b=this.store.listReplies(e.id);if(b.length>0){let R=d("div",{style:`font-size:11px;font-weight:600;color:${this.colors.textTertiary};margin-bottom:2px;letter-spacing:0.02em;text-transform:uppercase;`});h(R,this.t("marker.replies.heading")),S.appendChild(R)}for(let R of b)S.appendChild(this.buildReplyRow(R))};T();let A=d("div",{style:"display:flex;flex-direction:column;gap:6px;margin-bottom:10px;"}),L=d("textarea",{rows:"2",placeholder:this.t("marker.reply.placeholder"),"aria-label":this.t("marker.reply.placeholder"),style:`
        width:100%;box-sizing:border-box;resize:vertical;min-height:48px;max-height:160px;
        border-radius:8px;border:1px solid ${this.colors.border};
        background:${this.colors.glassBg};color:${this.colors.text};
        font-family:inherit;font-size:13px;line-height:1.4;padding:8px 10px;
      `}),$=document.createElement("button");$.type="button",$.style.cssText=`
      align-self:flex-end;height:28px;padding:0 14px;border-radius:9999px;
      border:1px solid ${this.colors.accent};background:${this.colors.accent};
      color:#fff;font-family:inherit;font-size:12px;font-weight:600;
      cursor:pointer;transition:all 0.2s ease;
    `,h($,this.t("marker.reply.send"));let F=()=>{let b=L.value.trim();if(!b)return;let R=this.store.addReply({projectName:e.projectName,parentId:e.id,message:b,authorName:O(),url:e.url,path:e.path,viewport:`${window.innerWidth}x${window.innerHeight}`,userAgent:navigator.userAgent});this.bus.emit("feedback:replied",R),L.value="",T(),n.scrollTop=n.scrollHeight};$.addEventListener("click",F),L.addEventListener("keydown",b=>{if(b.key==="Enter"&&!b.shiftKey){b.preventDefault(),F();return}b.key==="Enter"&&(b.metaKey||b.ctrlKey)&&(b.preventDefault(),F())}),A.appendChild(L),A.appendChild($),g.appendChild(v),g.appendChild(m),n.appendChild(f),n.appendChild(o),n.appendChild(s),n.appendChild(x),n.appendChild(S),n.appendChild(A),n.appendChild(g),n.style.maxHeight=`${nt}px`,n.style.overflowY="auto";let M=r.getBoundingClientRect();n.style.position="fixed";let p=M.bottom+8,k=M.left-10;p+tt>window.innerHeight&&(p=M.top-tt-8),k+rt>window.innerWidth&&(k=window.innerWidth-rt-8),p=Math.max(8,p),k=Math.max(8,k),n.style.top=`${p}px`,n.style.left=`${k}px`,document.body.appendChild(n),this.popover=n;let E=Math.min(n.offsetHeight,nt),w=M.bottom+8;w+E>window.innerHeight-ot&&(w=M.top-E-8),w=Math.max(ot,w),w!==p&&(n.style.top=`${w}px`);let le=this.bus.on("feedback:replied",b=>{b.parentId===e.id&&(S.querySelector(`[data-reply-id="${b.id}"]`)||(T(),n.scrollTop=n.scrollHeight))}),U=this.bus.on("feedback:deleted",b=>{if(b===e.id){this.closePopover();return}S.querySelector(`[data-reply-id="${b}"]`)&&T()});this.popoverDisposers.push(le,U)}buildReplyRow(e){let r=d("div",{style:`
        position:relative;padding:8px 10px 8px 10px;border-radius:8px;
        background:${this.colors.glassBgHeavy};
        border:1px solid ${this.colors.border};
      `});r.dataset.replyId=e.id;let n=d("div",{style:`font-size:11px;color:${this.colors.textTertiary};margin-bottom:4px;padding-right:18px;`}),o=e.authorName?.trim()||"Anonymous";h(n,`${o} \xB7 ${new Date(e.createdAt).toLocaleString()}`);let s=d("div",{style:"white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.45;"});h(s,e.message);let i=document.createElement("button");return i.type="button",i.setAttribute("aria-label",this.t("marker.reply.delete")),i.style.cssText=`
      position:absolute;top:4px;right:4px;width:18px;height:18px;
      border-radius:9999px;border:none;background:transparent;
      color:${this.colors.textTertiary};
      font-family:inherit;font-size:14px;line-height:1;cursor:pointer;
      opacity:0;transition:opacity 0.15s ease,color 0.15s ease;
      padding:0;
    `,h(i,"\xD7"),r.addEventListener("mouseenter",()=>{i.style.opacity="1"}),r.addEventListener("mouseleave",()=>{i.style.opacity="0"}),i.addEventListener("focus",()=>{i.style.opacity="1"}),i.addEventListener("blur",()=>{i.style.opacity="0"}),i.addEventListener("click",a=>{a.stopPropagation(),window.confirm(this.t("marker.replyDeleteConfirm"))&&(this.store.delete(e.id),this.bus.emit("feedback:deleted",e.id))}),r.appendChild(n),r.appendChild(s),r.appendChild(i),r}cycleStatus(e){let r=["todo","review","done","question"],n=e.status??"todo",o=r[(r.indexOf(n)+1)%r.length]??"todo";this.store.updateStatus?.(e.id,o),e.status=o,this.bus.emit("feedback:updated",e),this.closePopover(),this.refresh()}closePopover(){if(this.popover){this.popover.remove(),this.popover=null;for(let e of this.popoverDisposers)e();this.popoverDisposers=[]}}scheduleReposition(){this.repositionTimer===null&&(this.repositionTimer=window.setTimeout(()=>{this.repositionTimer=null,this.reposition()},Yt))}reposition(){let e=document.documentElement.clientWidth,r=K,n=Math.max(K,e-K),o=a=>Math.max(r,Math.min(n,a)),s=0,i=a=>window.scrollY+80+a*(ie+8);for(let a of this.entries){let l=a.record.kind??"target";if(l==="pin"&&a.record.pinX!=null&&a.record.pinY!=null){a.node.style.display=this.visible?"flex":"none",a.node.style.top=`${a.record.pinY}px`,a.node.style.left=`${o(a.record.pinX)}px`,a.anchorEl=null;continue}if(l==="area"&&a.record.areaX!=null&&a.record.areaY!=null&&a.record.areaW!=null&&a.record.areaH!=null){a.node.style.display=this.visible?"flex":"none",a.node.style.top=`${a.record.areaY}px`,a.node.style.left=`${o(a.record.areaX+a.record.areaW)}px`,a.anchorEl=null;continue}let c=et({cssSelector:a.record.cssSelector,xpath:a.record.xpath,textSnippet:a.record.textSnippet,elementTag:a.record.elementTag,elementId:a.record.elementId,textPrefix:a.record.textPrefix,textSuffix:a.record.textSuffix,fingerprint:a.record.fingerprint,neighborText:a.record.neighborText},{xPct:a.record.xPct,yPct:a.record.yPct,wPct:a.record.wPct,hPct:a.record.hPct});if(!c){a.node.style.display=this.visible?"flex":"none",a.node.style.top=`${i(s)}px`,a.node.style.left=`${n}px`,a.node.dataset.orphan="true",a.anchorEl=null,s++;continue}a.node.dataset.orphan="false",a.anchorEl=c.element;let u=c.rect,f=u.top+window.scrollY-K,g=u.right+window.scrollX;a.node.style.display=this.visible?"flex":"none",a.node.style.top=`${f+K}px`,a.node.style.left=`${o(g)}px`}}destroy(){window.removeEventListener("resize",this.onResize),window.removeEventListener("scroll",this.onScroll),window.removeEventListener("popstate",this.onPopState),document.removeEventListener("click",this.onDocClick,!0),history.pushState=this.origPushState,history.replaceState=this.origReplaceState,this.closePopover(),this.container.remove(),this.entries=[]}};var it=8,ae=class{constructor(e,r,n,o,s){this.colors=e;this.bus=r;this.t=n;this.openPopupForElement=o;this.shouldIgnoreElement=s;this.overlay=null;this.toolbar=null;this.badge=null;this.hoveredElement=null;this.isActive=!1;this.savedOverflow="";this.previouslyFocused=null;this.previousOutline=null;this.previousOutlineOffset=null;this.previousOutlinePriority="";this.previousOutlineOffsetPriority="";this.onKeyDown=e=>{e.key==="Escape"&&(e.preventDefault(),this.deactivate())};this.onOverlayMouseMove=e=>{if(!this.overlay)return;this.overlay.style.pointerEvents="none";let r=document.elementFromPoint(e.clientX,e.clientY);if(this.overlay.style.pointerEvents="auto",!r||!(r instanceof HTMLElement)){this.clearHoverOutline();return}if(this.shouldIgnoreElement(r)){this.clearHoverOutline();return}if(r===document.documentElement||r===document.body){this.clearHoverOutline();return}r!==this.hoveredElement&&(this.clearHoverOutline(),this.hoveredElement=r,this.applyHoverOutline(r))};this.onOverlayClick=e=>{if(e.preventDefault(),e.stopPropagation(),!this.overlay)return;this.overlay.style.pointerEvents="none";let r=document.elementFromPoint(e.clientX,e.clientY);this.overlay.style.pointerEvents="auto",!(!r||!(r instanceof HTMLElement))&&(this.shouldIgnoreElement(r)||r===document.documentElement||r===document.body||(this.clearHoverOutline(),this.handleSelect(r)))};this.unsubPinStart=this.bus.on("target:start",()=>this.activate())}activate(){if(this.isActive)return;this.isActive=!0,this.savedOverflow=document.body.style.overflow,this.previouslyFocused=document.activeElement instanceof HTMLElement?document.activeElement:null,this.overlay=d("div",{style:`
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
      `}),this.toolbar.setAttribute("aria-label",this.t("pin.ariaLabel"));let e=d("span",{style:"font-weight:500;letter-spacing:-0.01em;"});h(e,this.t("pin.instruction"));let r=document.createElement("button");r.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;font-weight:500;cursor:pointer;
    `,h(r,this.t("pin.cancel")),r.addEventListener("click",()=>this.deactivate()),this.toolbar.appendChild(e),this.toolbar.appendChild(r),this.overlay.addEventListener("mousemove",this.onOverlayMouseMove,!0),this.overlay.addEventListener("click",this.onOverlayClick,!0),document.addEventListener("keydown",this.onKeyDown),document.body.style.overflow="hidden",document.body.appendChild(this.overlay),document.body.appendChild(this.toolbar)}deactivate(){if(!this.isActive)return;this.isActive=!1,this.clearHoverOutline(),this.overlay?.removeEventListener("mousemove",this.onOverlayMouseMove,!0),this.overlay?.removeEventListener("click",this.onOverlayClick,!0),document.removeEventListener("keydown",this.onKeyDown),document.body.style.overflow=this.savedOverflow,this.overlay?.remove(),this.toolbar?.remove(),this.overlay=null,this.toolbar=null;let e=this.previouslyFocused;if(this.previouslyFocused=null,e&&typeof e.focus=="function"&&document.contains(e))try{e.focus()}catch{}this.bus.emit("target:end")}async handleSelect(e){this.deactivate();try{await this.openPopupForElement(e)}catch(r){console.error("[ccm-feedback] pin-mode: openPopupForElement threw",r)}}applyHoverOutline(e){this.previousOutline=e.style.outline||null,this.previousOutlineOffset=e.style.outlineOffset||null,this.previousOutlinePriority=e.style.getPropertyPriority("outline"),this.previousOutlineOffsetPriority=e.style.getPropertyPriority("outline-offset"),e.style.setProperty("outline",`2px solid ${this.colors.accent}`,"important"),e.style.setProperty("outline-offset","2px","important");let r=e.getBoundingClientRect();if(r.width>0&&r.height>0){this.badge=document.createElement("div");let n=e.tagName.toLowerCase();this.badge.textContent=n,this.badge.setAttribute("aria-hidden","true");let o=Math.max(it,Math.min(r.right-4,window.innerWidth-60)),s=Math.max(it,Math.min(r.bottom+4,window.innerHeight-24));this.badge.style.cssText=`
        position:fixed;
        left:${o}px;
        top:${s}px;
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
      `,document.body.appendChild(this.badge)}}clearHoverOutline(){this.hoveredElement&&(this.previousOutline!==null?this.hoveredElement.style.setProperty("outline",this.previousOutline,this.previousOutlinePriority):this.hoveredElement.style.removeProperty("outline"),this.previousOutlineOffset!==null?this.hoveredElement.style.setProperty("outline-offset",this.previousOutlineOffset,this.previousOutlineOffsetPriority):this.hoveredElement.style.removeProperty("outline-offset"),this.hoveredElement=null,this.previousOutline=null,this.previousOutlineOffset=null,this.previousOutlinePriority="",this.previousOutlineOffsetPriority=""),this.badge&&(this.badge.remove(),this.badge=null)}destroy(){this.deactivate(),this.unsubPinStart()}};var Wt="linear(0, 0.006, 0.025, 0.06, 0.11, 0.17, 0.25, 0.34, 0.45, 0.56, 0.67, 0.78, 0.88, 0.95, 1.01, 1.04, 1.05, 1.04, 1.02, 1, 0.99, 1)",Ce="cubic-bezier(0.16, 1, 0.3, 1)",Se="cubic-bezier(0.34, 1.56, 0.64, 1)",Gt="cubic-bezier(0.25, 1, 0.5, 1)",st=`
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
    animation: sp-fab-in 0.5s ${Wt} both;
  }

  .sp-anim-marker-in {
    animation: sp-marker-in 0.35s ${Se} both;
  }

  .sp-anim-pulse {
    animation: sp-pulse-ring 0.7s ease-out;
  }

  .sp-anim-flash {
    animation: sp-flash-bg 0.5s ${Gt};
  }

  .sp-anim-slide-up {
    animation: sp-slide-up 0.3s ${Ce} both;
  }

  .sp-anim-fade-in {
    animation: sp-fade-in 0.2s ease-out both;
  }

  /* ---- Transition utilities ---- */

  .sp-panel {
    transform: translateX(110%);
    transition: transform 0.4s ${Ce};
  }

  .sp-panel.sp-panel--open {
    transform: translateX(0);
  }

  .sp-radial-item {
    opacity: 0;
    pointer-events: none;
    transform: translate(0, 0) scale(0.8);
    transition:
      transform 0.35s ${Se},
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
    animation: sp-card-in 0.35s ${Ce} both;
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
    animation: sp-badge-in 0.4s ${Se} both;
  }

  /* ---- Reduced motion ---- */

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

`;var lt="#0066ff",qt=/^#[0-9a-fA-F]{6}$/,at=/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/,Vt=/^#[0-9a-fA-F]{8}$/;function Jt(t){if(qt.test(t))return t;let e=at.test(t)?t.match(at):null;return e?`#${e[1]}${e[1]}${e[2]}${e[2]}${e[3]}${e[3]}`:Vt.test(t)?t.slice(0,7):(console.warn(`[ccm-feedback] Invalid accentColor "${t}" \u2014 only hex colors (#RGB, #RRGGBB, #RRGGBBAA) are supported. Using default.`),lt)}function Qt(t,e){let r=Math.max(0,Math.round(parseInt(t.slice(1,3),16)*(1-e))),n=Math.max(0,Math.round(parseInt(t.slice(3,5),16)*(1-e))),o=Math.max(0,Math.round(parseInt(t.slice(5,7),16)*(1-e)));return`#${r.toString(16).padStart(2,"0")}${n.toString(16).padStart(2,"0")}${o.toString(16).padStart(2,"0")}`}function Zt(){return typeof window>"u"?!1:window.matchMedia("(prefers-color-scheme: dark)").matches}function er(t){return t==="dark"||t==="auto"&&Zt()?"dark":"light"}function ct(t=lt,e){let r=Jt(t),n=Qt(r,.15);return er(e)==="dark"?{accent:r,accentLight:r+"22",accentDark:n,accentGlow:r+"44",accentGradient:`linear-gradient(135deg, ${r}, ${n})`,bg:"#0f172a",bgHover:"#1e293b",text:"#f1f5f9",textSecondary:"#94a3b8",textTertiary:"#64748b",border:"#334155",shadow:"rgba(0, 0, 0, 0.3)",glassBg:"rgba(15, 23, 42, 0.78)",glassBgHeavy:"rgba(15, 23, 42, 0.88)",glassBorder:"rgba(51, 65, 85, 0.5)",glassBorderSubtle:"rgba(51, 65, 85, 0.3)",typeQuestion:"#60a5fa",typeChange:"#fbbf24",typeBug:"#f87171",typeOther:"#94a3b8",typeComment:"#9ca3af",typeQuestionBg:"rgba(59, 130, 246, 0.15)",typeChangeBg:"rgba(245, 158, 11, 0.15)",typeBugBg:"rgba(239, 68, 68, 0.15)",typeOtherBg:"rgba(100, 116, 139, 0.15)",typeCommentBg:"rgba(107, 114, 128, 0.15)"}:{accent:r,accentLight:r+"14",accentDark:n,accentGlow:r+"33",accentGradient:`linear-gradient(135deg, ${r}, ${n})`,bg:"#ffffff",bgHover:"#f8f9fb",text:"#0f172a",textSecondary:"#475569",textTertiary:"#64748b",border:"#e2e8f0",shadow:"rgba(0, 0, 0, 0.06)",glassBg:"rgba(255, 255, 255, 0.72)",glassBgHeavy:"rgba(255, 255, 255, 0.85)",glassBorder:"rgba(255, 255, 255, 0.35)",glassBorderSubtle:"rgba(255, 255, 255, 0.18)",typeQuestion:"#3b82f6",typeChange:"#b45309",typeBug:"#ef4444",typeOther:"#64748b",typeComment:"#6b7280",typeQuestionBg:"#eff6ff",typeChangeBg:"#fffbeb",typeBugBg:"#fef2f2",typeOtherBg:"#f8fafc",typeCommentBg:"#e5e7eb"}}function dt(t){return`
    --sp-accent: ${t.accent};
    --sp-accent-light: ${t.accentLight};
    --sp-accent-dark: ${t.accentDark};
    --sp-accent-glow: ${t.accentGlow};
    --sp-accent-gradient: ${t.accentGradient};
    --sp-bg: ${t.bg};
    --sp-bg-hover: ${t.bgHover};
    --sp-text: ${t.text};
    --sp-text-secondary: ${t.textSecondary};
    --sp-text-tertiary: ${t.textTertiary};
    --sp-border: ${t.border};
    --sp-shadow: ${t.shadow};
    --sp-glass-bg: ${t.glassBg};
    --sp-glass-bg-heavy: ${t.glassBgHeavy};
    --sp-glass-border: ${t.glassBorder};
    --sp-glass-border-subtle: ${t.glassBorderSubtle};
    --sp-type-question: ${t.typeQuestion};
    --sp-type-change: ${t.typeChange};
    --sp-type-bug: ${t.typeBug};
    --sp-type-other: ${t.typeOther};
    --sp-type-comment: ${t.typeComment};
    --sp-type-question-bg: ${t.typeQuestionBg};
    --sp-type-change-bg: ${t.typeChangeBg};
    --sp-type-bug-bg: ${t.typeBugBg};
    --sp-type-other-bg: ${t.typeOtherBg};
    --sp-type-comment-bg: ${t.typeCommentBg};
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
  `}function Ae(t){return`
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
      ${dt(t)}

      /* Identity modal \u2014 theme-aware backdrop + panel */
      --sp-identity-bg: ${t.glassBgHeavy};
      --sp-identity-overlay: ${t.bg==="#ffffff"?"rgba(15, 23, 42, 0.2)":"rgba(0, 0, 0, 0.4)"};
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

    ${st}
  `}function P(t){return t.reduce((e,r)=>e+((r.status??"todo")!=="done"?1:0),0)}var X=null;function ut(){return{destroy:()=>{},count:()=>0,export:()=>{}}}function $e(t){let e=t.debug?(...p)=>console.debug("[ccm-feedback]",...p):()=>{};if(X)return e("initCcmFeedback() called more than once \u2014 returning existing instance"),X;if(!t.projectName||typeof t.projectName!="string")return console.error("[ccm-feedback] Missing or invalid 'projectName' in config."),ut();if(window.innerWidth<768)return console.info(`[ccm-feedback] Widget not loaded: viewport < ${768}px.`),ut();e("Initializing",{projectName:t.projectName});let r=ct(t.accentColor,t.theme),n=Ze(),o=new ne,s=!!(t.supabaseUrl&&t.supabaseKey),i,a=null;s?(a=new Q({url:t.supabaseUrl,apiKey:t.supabaseKey,projectName:t.projectName,log:e,onChange:()=>{f.refresh(),g.updateCount(P(i.list())),v.refreshIfOpen()},onReply:p=>o.emit("feedback:replied",p),onReplyDeleted:p=>o.emit("feedback:deleted",p)}),i=a,e("Cloud mode enabled",{url:t.supabaseUrl})):(i=new V(t.projectName),e("LocalStorage mode"));let l=document.createElement("ccm-feedback-widget");l.style.cssText=`position:fixed;z-index:${2147483647};`;let c=l.attachShadow({mode:"open"});if("adoptedStyleSheets"in ShadowRoot.prototype){let p=new CSSStyleSheet;p.replaceSync(Ae(r)),c.adoptedStyleSheets=[p]}else{let p=document.createElement("style");p.textContent=Ae(r),c.appendChild(p)}document.body.appendChild(l);let u=new te(r,n),f=new se(r,o,n,i),g=new oe(c,o,n,s),v=new re(c,o,n,i,r,p=>f.scrollToAndFlash(p),p=>f.setIncludeDone(p==="done"));o.on("navigator:open",()=>v.open());let m=p=>p===l||l.contains(p),x=()=>({cssSelector:"",xpath:"",textSnippet:"",elementTag:"",elementId:void 0,textPrefix:"",textSuffix:"",fingerprint:"",neighborText:""}),S=async p=>{let k=p.getBoundingClientRect(),E=await u.show(k);if(!E)return;let w=O(),le=ze(p),U=p.getBoundingClientRect(),b=Xe(U,U),R=i.save({projectName:t.projectName,message:E.message,authorName:w,url:Te(window.location.href),path:window.location.pathname,viewport:`${window.innerWidth}x${window.innerHeight}`,userAgent:navigator.userAgent,anchor:le,rect:b,status:E.status,kind:"target"});o.emit("feedback:saved",R),f.addOne(R),g.updateCount(P(i.list())),e("Saved",R.id)},T=async p=>{let k=new DOMRect(p.x-window.scrollX,p.y-window.scrollY,0,0),E=await u.show(k);if(!E)return;let w=i.save({projectName:t.projectName,message:E.message,authorName:O(),url:Te(window.location.href),path:window.location.pathname,viewport:`${window.innerWidth}x${window.innerHeight}`,userAgent:navigator.userAgent,anchor:x(),rect:{xPct:0,yPct:0,wPct:0,hPct:0},status:E.status,kind:"pin",pin:{x:p.x,y:p.y},capturedElements:p.elements});o.emit("feedback:saved",w),f.addOne(w),g.updateCount(P(i.list())),e("Saved pin",w.id)},A=async p=>{let k=new DOMRect(p.x-window.scrollX,p.y-window.scrollY,p.w,p.h),E=await u.show(k);if(!E)return;let w=i.save({projectName:t.projectName,message:E.message,authorName:O(),url:Te(window.location.href),path:window.location.pathname,viewport:`${window.innerWidth}x${window.innerHeight}`,userAgent:navigator.userAgent,anchor:x(),rect:{xPct:0,yPct:0,wPct:0,hPct:0},status:E.status,kind:"area",area:{x:p.x,y:p.y,w:p.w,h:p.h},capturedElements:p.elements});o.emit("feedback:saved",w),f.addOne(w),g.updateCount(P(i.list())),e("Saved area",w.id)},L=new ae(r,o,n,S,m),$=new Y(r,o,n,T,m),F=new W(r,o,n,A,m);o.on("export:click",()=>{let p=i.list();if(p.length===0){console.info("[ccm-feedback] No annotations to export.");return}we(t.projectName,p)}),o.on("copyUrl:click",()=>{let p=`${window.location.origin}/feedback?project=${encodeURIComponent(t.projectName)}`;Qe(p).then(k=>{k?console.info(`[ccm-feedback] ${n("toast.urlCopied")}: ${p}`):console.warn(`[ccm-feedback] ${n("toast.urlCopyFailed")} \u2014 ${p}`)})}),o.on("clear:click",()=>{i.list().length!==0&&window.confirm(n("fab.clearConfirm"))&&(i.clear(),f.refresh(),g.updateCount(0),v.refreshIfOpen(),e("Cleared all annotations"))});let M=()=>{g.updateCount(P(i.list())),v.refreshIfOpen()};if(o.on("feedback:saved",M),o.on("feedback:updated",M),o.on("feedback:deleted",M),o.on("feedback:replied",()=>v.refreshIfOpen()),f.refresh(),g.updateCount(P(i.list())),a){let p=a;p.init().then(async()=>{f.refresh(),g.updateCount(P(i.list())),await tr(p,t.projectName,e)>0&&(f.refresh(),g.updateCount(P(i.list())))})}return X={destroy:()=>{e("Destroying widget"),L.destroy(),$.destroy(),F.destroy(),f.destroy(),g.destroy(),u.destroy(),v.destroy(),o.removeAll(),l.remove(),X=null},count:()=>i.list().length,export:()=>{let p=i.list();p.length!==0&&we(t.projectName,p)}},X}async function tr(t,e,r){let n=new Set([e,ht()]),o=0;for(let s of n){let i=`ccm-feedback:${s}`,a=null;try{a=localStorage.getItem(i)}catch{continue}if(!a)continue;let l=[];try{let u=JSON.parse(a);if(!Array.isArray(u)||u.length===0)continue;l=u.map(f=>({...f,projectName:e}))}catch{continue}r("Migrating",l.length,"local records from",i);let c=await t.migrateFromLocal(l);o+=c;try{localStorage.setItem(`${i}:migrated`,new Date().toISOString()),localStorage.removeItem(i)}catch{}}return o}function Te(t){try{let e=new URL(t);for(let r of[...e.searchParams.keys()])/token|key|secret|auth|session|password|code/i.test(r)&&e.searchParams.delete(r);return e.toString()}catch{return t}}function rr(t){return!!(!t||t==="localhost"||t==="127.0.0.1"||t==="0.0.0.0"||t==="::1"||t.endsWith(".local")||t.endsWith(".localhost"))}function ht(){let{hostname:t,port:e}=window.location,n=(t||"site").replace(/[^a-z0-9]+/gi,"-").replace(/^-+|-+$/g,"").toLowerCase()||"site";return e?`${n}-${e}`:n}if(typeof window<"u"){window.CcmFeedback={init:$e};let t=document.currentScript;if(t){let e=t.dataset.project||ht(),r=rr(window.location.hostname),n={projectName:e,...t.dataset.accent?{accentColor:t.dataset.accent}:{},...t.dataset.theme?{theme:t.dataset.theme}:{},...t.dataset.debug==="true"?{debug:!0}:{},...!r&&t.dataset.supabaseUrl?{supabaseUrl:t.dataset.supabaseUrl}:{},...!r&&t.dataset.supabaseKey?{supabaseKey:t.dataset.supabaseKey}:{}},o=()=>$e(n);document.readyState==="loading"?document.addEventListener("DOMContentLoaded",o,{once:!0}):o()}}return yt(nr);})();
//# sourceMappingURL=w.js.map

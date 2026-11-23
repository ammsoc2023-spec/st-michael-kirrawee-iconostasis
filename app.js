(function(){
'use strict';
var $=function(id){return document.getElementById(id)};
var byId={};ENTRIES.forEach(function(e){byId[e.id]=e});
var spotById={};SPOTS.forEach(function(s){spotById[s.id]=s});
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}

// Hotspots: drawn on the full photo and on whichever zoomed section (left / middle / right) contains them.
function secFor(s){
  var e=0.05,fit=SECTIONS.filter(function(c){return s.x>=c.x0-e&&s.y>=c.y0-e&&s.x+s.w<=c.x1+e&&s.y+s.h<=c.y1+e});
  if(fit.length)return fit[0];
  var cx=s.x+s.w/2;return SECTIONS.filter(function(c){return cx>=c.x0&&cx<=c.x1})[0]||SECTIONS[0];
}
var FULL={id:'full',x0:0,y0:0,x1:100,y1:100};
function addSpot(s,c){
  var W=c.x1-c.x0,H=c.y1-c.y0;
  var x0=Math.max(s.x,c.x0),y0=Math.max(s.y,c.y0),x1=Math.min(s.x+s.w,c.x1),y1=Math.min(s.y+s.h,c.y1);
  var b=document.createElement('button');
  b.className='hs';b.type='button';b.dataset.id=s.id;b.dataset.sec=c.id;
  b.style.left=((x0-c.x0)/W*100)+'%';b.style.top=((y0-c.y0)/H*100)+'%';b.style.width=((x1-x0)/W*100)+'%';b.style.height=((y1-y0)/H*100)+'%';
  b.setAttribute('aria-label',s.label);b.title=s.label;
  b.addEventListener('click',function(){b.classList.add('flash');setTimeout(function(){b.classList.remove('flash')},250);go('s/'+s.id)});
  var st=$('stage-'+c.id);if(st)st.appendChild(b);
}
SPOTS.forEach(function(s){addSpot(s,FULL)});
SPOTS.forEach(function(s){addSpot(s,secFor(s))});
$('showOutlines').addEventListener('change',function(e){document.querySelectorAll('.stage').forEach(function(st){st.classList.toggle('noline',!e.target.checked)})});

// List + search
function renderList(){
  var q=$('q').value.trim().toLowerCase(),n=0;
  $('list').innerHTML=ENTRIES.filter(function(e){
    if(!q)return true;
    return (e.name+' '+(e.feast||'')+' '+e.text+' '+e.where).toLowerCase().indexOf(q)>=0;
  }).map(function(e){n++;
    return '<li><button type="button" data-id="'+e.id+'"><span class="th"><img loading="lazy" src="'+e.img+'" alt=""></span><span class="t"><span class="nm">'+esc(e.name)+'</span>'+(e.feast?'<span class="fd">Feast Day | '+esc(e.feast)+'</span>':'')+'<span class="wh">'+esc(e.where)+'</span></span></button></li>';
  }).join('');
  $('noHits').hidden=n>0;
}
$('q').addEventListener('input',renderList);
$('list').addEventListener('click',function(ev){var b=ev.target.closest('button[data-id]');if(b)go('p/'+b.dataset.id)});
$('listBtn').addEventListener('click',function(){$('iconsHead').scrollIntoView({behavior:'smooth',block:'start'})});

function renderForeword(){
  var f=FOREWORD;
  $('fwBody').innerHTML='<div class="fw"><p class="fw-q">'+esc(f.quote)+'</p><p class="fw-r">'+esc(f.quoteRef)+'</p><div class="orn"><span></span><i>&#9766;</i><span></span></div>'+
    f.paras.map(function(p){return '<p class="t">'+esc(p)+'</p>'}).join('')+'<p class="sig">'+esc(f.sign)+'<br>'+esc(f.by)+'</p><p class="dt">'+esc(f.date)+'</p></div>';
}

// Detail viewer. Routes: #s/<spot> (from the photo, ordered by position) and #p/<entry> (from the list, booklet order)
var cur=null;
function openView(kind,id){
  var s=kind==='s'?spotById[id]:null;
  var e=kind==='s'?(s&&s.entry?byId[s.entry]:null):byId[id];
  if(!s&&!e){closeView();return}
  cur={kind:kind,id:id};
  var title=e?e.name:s.label;
  $('vTitle').textContent=title;
  var src=e?e.img:s.img;
  var h='<figure class="picwrap"><button type="button" data-zoom="'+src+'" aria-label="Zoom"><img src="'+src+'" alt="'+esc(title)+' – icon"></button><span class="zoomhint">Tap the picture to zoom</span></figure>';
  if(e){
    h+='<section class="entry"><h1>'+esc(e.name)+'</h1>'+(e.feast?'<p class="feast">Feast Day <b>|</b> '+esc(e.feast)+'</p>':'')+'<div class="orn"><span></span><i>&#9766;</i><span></span></div><p class="txt">'+esc(e.text)+'</p>'+(e.scripture?'<p class="scr">'+esc(e.scripture)+'</p>':'')+'</section>';
    h+='<p class="meta">On the iconostasis: '+esc(e.where)+(e.approx?' (place on the iconostasis is a best guess from the photo)':'')+'</p>';
    if(e.video)h+='<section class="watch"><h2>Watch</h2><a class="watch-btn" href="'+esc(e.video.url)+'" target="_blank" rel="noopener"><span class="play" aria-hidden="true">&#9654;</span><span class="wt"><span class="wl">Watch: '+esc(e.video.title)+'</span><span class="wc">'+esc(e.video.channel)+' &middot; YouTube</span></span></a><p class="wn">Opens in YouTube (needs internet)</p></section>';
  } else {
    h+='<section class="entry"><h1>'+esc(s.label)+'</h1></section><p class="note">'+esc(s.note||'')+'</p>';
  }
  $('vBody').innerHTML=h;$('vBody').scrollTop=0;
  var seq=kind==='s'?ORDER:ENTRIES.map(function(x){return x.id});
  var i=seq.indexOf(id);
  $('vPrev').disabled=i<=0;$('vNext').disabled=i>=seq.length-1;
  $('vPrev').onclick=function(){if(i>0)go(kind+'/'+seq[i-1],true)};
  $('vNext').onclick=function(){if(i<seq.length-1)go(kind+'/'+seq[i+1],true)};
  $('viewer').hidden=false;document.body.classList.add('locked');
}
function closeView(){cur=null;$('viewer').hidden=true;document.body.classList.remove('locked')}
$('vBody').addEventListener('click',function(ev){var b=ev.target.closest('[data-zoom]');if(b)openZoom(b.dataset.zoom)});

// Hash routing so the phone's back button closes views
function go(route,replace){if(replace)location.replace('#'+route);else location.hash=route}
function route(){
  var h=location.hash.replace(/^#/,'');
  closeZoom();
  var m=h.match(/^(s|p)\/([\w-]+)$/);
  if(m)openView(m[1],m[2]);else closeView();
}
window.addEventListener('hashchange',route);
$('vClose').addEventListener('click',function(){if(history.length>1&&location.hash)history.back();else go('',true)});

// Swipe left/right in the viewer for next/previous
var sx=null,sy=null;
$('vBody').addEventListener('touchstart',function(e){if(e.touches.length===1){sx=e.touches[0].clientX;sy=e.touches[0].clientY}},{passive:true});
$('vBody').addEventListener('touchend',function(e){if(sx===null)return;var t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;sx=null;
  if(Math.abs(dx)>70&&Math.abs(dx)>2*Math.abs(dy)){(dx<0?$('vNext'):$('vPrev')).click()}},{passive:true});

// Zoom viewer with pinch / pan / double-tap
var z={s:1,x:0,y:0},pts={},start=null,lastTap=0,zimg=$('zImg'),zwrap=$('zWrap');
function zApply(){zimg.style.transform='translate('+z.x+'px,'+z.y+'px) scale('+z.s+')'}
function zReset(){z={s:1,x:0,y:0};zApply()}
function openZoom(src){zimg.src=src;zReset();$('zoom').hidden=false}
function closeZoom(){$('zoom').hidden=true}
$('zClose').addEventListener('click',closeZoom);
function base(){var r=zimg.getBoundingClientRect();return{l:r.left-z.x,t:r.top-z.y}}
function zoomAt(cx,cy,ns){ns=Math.max(1,Math.min(6,ns));var b=base();var px=(cx-b.l-z.x)/z.s,py=(cy-b.t-z.y)/z.s;z.x=cx-b.l-px*ns;z.y=cy-b.t-py*ns;z.s=ns;if(ns===1){z.x=0;z.y=0}zApply()}
zwrap.addEventListener('pointerdown',function(e){zwrap.setPointerCapture(e.pointerId);pts[e.pointerId]={x:e.clientX,y:e.clientY};var k=Object.keys(pts);
  if(k.length===2){var a=pts[k[0]],c=pts[k[1]];start={d:Math.hypot(a.x-c.x,a.y-c.y),s:z.s}}
  else if(k.length===1){var now=Date.now();if(now-lastTap<300){zoomAt(e.clientX,e.clientY,z.s>1?1:2.5);lastTap=0}else lastTap=now;start={px:e.clientX,py:e.clientY,x:z.x,y:z.y}}});
zwrap.addEventListener('pointermove',function(e){if(!pts[e.pointerId])return;pts[e.pointerId]={x:e.clientX,y:e.clientY};var k=Object.keys(pts);
  if(k.length===2&&start&&start.d){var a=pts[k[0]],c=pts[k[1]];zoomAt((a.x+c.x)/2,(a.y+c.y)/2,start.s*Math.hypot(a.x-c.x,a.y-c.y)/start.d)}
  else if(k.length===1&&start&&start.px!==undefined&&z.s>1){z.x=start.x+e.clientX-start.px;z.y=start.y+e.clientY-start.py;zApply()}});
function up(e){delete pts[e.pointerId];var k=Object.keys(pts);if(k.length===1){var p=pts[k[0]];start={px:p.x,py:p.y,x:z.x,y:z.y}}else if(!k.length)start=null}
zwrap.addEventListener('pointerup',up);zwrap.addEventListener('pointercancel',up);
zwrap.addEventListener('wheel',function(e){e.preventDefault();zoomAt(e.clientX,e.clientY,z.s*(e.deltaY<0?1.2:1/1.2))},{passive:false});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){if(!$('zoom').hidden)closeZoom();else if(cur)$('vClose').click()}
  else if(cur&&$('zoom').hidden&&e.key==='ArrowRight')$('vNext').click();
  else if(cur&&$('zoom').hidden&&e.key==='ArrowLeft')$('vPrev').click();
});

renderList();renderForeword();route();

if('serviceWorker' in navigator&&location.protocol!=='file:'){
  var hadController=!!navigator.serviceWorker.controller, reloaded=false;
  navigator.serviceWorker.addEventListener('controllerchange',function(){
    if(!hadController||reloaded)return;
    if(sessionStorage.getItem('sm-reloaded')===String(Date.now()).slice(0,-4))return;
    reloaded=true;sessionStorage.setItem('sm-reloaded',String(Date.now()).slice(0,-4));location.reload();
  });
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(function(reg){
      reg.update().catch(function(){});
      document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')reg.update().catch(function(){})});
    }).catch(function(){});
  });
}
})();

const LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const $=id=>document.getElementById(id);
let board,turn,over,moves,startedAt,score={x:0,o:0,d:0},history=[];

/* storage helpers (safe if unavailable) */
const store={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

/* themes */
function setTheme(t){
  document.documentElement.dataset.theme=t;
  document.querySelectorAll('.themes button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.t===t));
  store.set('ttt-theme',t);
}
document.querySelectorAll('.themes button').forEach(b=>b.onclick=()=>setTheme(b.dataset.t));

/* board */
const cells=[];
for(let i=0;i<9;i++){
  const c=document.createElement('button');
  c.className='cell';c.setAttribute('aria-label','Cell '+(i+1));
  c.onclick=()=>{if(mode==='ai'&&turn==='O')return;play(i)};
  $('board').appendChild(c);cells.push(c);
}
function newGame(){
  setHistoryOpen(false);clearTimeout(aiT);board=Array(9).fill('');turn='X';over=false;moves=[];startedAt=Date.now();
  cells.forEach(c=>{c.textContent='';c.className='cell';c.disabled=false});
  render();
}
function render(){
  cells.forEach((c,i)=>{c.textContent=board[i];c.disabled=over||!!board[i]});
  $('sx').classList.toggle('active',!over&&turn==='X');
  $('so').classList.toggle('active',!over&&turn==='O');
  $('nx').textContent=score.x;$('no').textContent=score.o;$('nd').textContent=score.d;
  const nb=$('again'),isNew=over||fresh;
  nb.textContent=isNew?'New game':'End game';
  nb.classList.toggle('primary',isNew);
  if(!over)$('msg').textContent=mode==='ai'?(turn==='X'?'Your turn':'Computer is thinking…'):'Player '+turn+'’s turn';
}
function play(i){
  if(over||board[i])return;
  board[i]=turn;moves.push(i);fresh=false;sfx[turn==='X'?'x':'o']();
  cells[i].className='cell '+turn.toLowerCase();
  const line=LINES.find(l=>l.every(k=>board[k]===turn));
  if(line){finish(turn,line);return}
  if(board.every(Boolean)){finish(null);return}
  turn=turn==='X'?'O':'X';render();aiMove();
}
function finish(w,line){
  over=true;
  if(w){
    score[w.toLowerCase()]++;
    line.forEach(k=>cells[k].classList.add('win'));
    if(mode==='ai'&&w==='O'){$('msg').textContent='Computer wins. Try again!';sfx.lose();showLose()}
    else{$('msg').textContent=mode==='ai'?'You win!':'Player '+w+' wins!';sfx.win();showWin(w);if(mode==='pvp')sadPop(w==='X'?'so':'sx')}
  }else{score.d++;sfx.draw();$('msg').textContent='It’s a draw. Play again?'}
  history.unshift({r:w||'draw',v:mode==='ai'?level:'2P',m:moves.length,t:Math.max(1,Math.round((Date.now()-startedAt)/1000)),at:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})});
  history=history.slice(0,30);
  store.set('ttt-history',history);store.set('ttt-score',score);
  render();renderHistory();
}
function endGame(){
  if(over)return;
  clearTimeout(aiT);over=true;sfx.end();
  if(moves.length){
  history.unshift({r:'ended',v:mode==='ai'?level:'2P',m:moves.length,t:Math.max(1,Math.round((Date.now()-startedAt)/1000)),at:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})});
  history=history.slice(0,30);
  store.set('ttt-history',history);
  }
  render();
  $('msg').textContent='Game ended. Press New game to play again.';
  renderHistory();
}const NG=['#ff9f1c','#2ec4b6','#e71d36','#9b5de5','#06d6a0','#f15bb5'];let ngI=-1;
$('again').onclick=()=>{
  const b=$('again');
  if(!over&&!fresh){endGame();return}
  fresh=false;sfx.ui();
  ngI=(ngI+1)%NG.length;
  b.style.setProperty('--ng',NG[ngI]);b.style.setProperty('--ngt','#111');
  b.classList.remove('flash');void b.offsetWidth;b.classList.add('flash');
  newGame();
};

/* history */
let histOpen=false;
function paintHistBtn(){
  const b=$('histBtn');
  b.textContent=histOpen?'← Back':'📜'+(history.length?' '+history.length:'');
  b.setAttribute('aria-label',histOpen?'Back to game':'History');b.title=histOpen?'Back to game':'History';
  b.setAttribute('aria-expanded',histOpen);
}
function setHistoryOpen(o){
  histOpen=o;$('board').hidden=o;$('history').hidden=!o;paintHistBtn();
}
$('histBtn').onclick=()=>{sfx.ui();setHistoryOpen(!histOpen)};
function renderHistory(){
  paintHistBtn();
  const ul=$('list');ul.innerHTML='';
  if(!history.length){ul.innerHTML='<li class="empty">No games yet. Finish a round to see it here.</li>';return}
  history.forEach((h,i)=>{
    const li=document.createElement('li');
    li.className=h.r==='draw'?'':h.r.toLowerCase();
    const n=history.length-i;
    const ai=h.v&&h.v!=='2P';
    li.innerHTML='<span>Game '+n+': <b>'+(h.r==='draw'?'Draw':h.r==='ended'?'Ended early':ai?(h.r==='X'?'You won':'Computer won'):'Player '+h.r+' won')+'</b><small>'+(ai?'vs '+h.v+' computer, ':'')+h.m+' moves, '+h.t+'s</small></span><small>'+h.at+'</small>';
    ul.appendChild(li);
  });
}
$('clear').onclick=()=>{history=[];score={x:0,o:0,d:0};store.set('ttt-history',history);store.set('ttt-score',score);renderHistory();render()};

/* win banner + fireworks */
const cv=$('fx'),ctx=cv.getContext('2d');let parts=[],raf=null;
function size(){const d=devicePixelRatio||1;cv.width=innerWidth*d;cv.height=innerHeight*d;ctx.setTransform(d,0,0,d,0,0)}
addEventListener('resize',size);size();
function burst(x,y){
  const hue=Math.random()*360,n=70;
  for(let i=0;i<n;i++){
    const a=Math.PI*2*i/n,s=2+Math.random()*4.5;
    parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,hue:hue+Math.random()*40,r:2+Math.random()*1.5});
  }
}
function loop(){
  ctx.globalCompositeOperation='destination-out';ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(0,0,innerWidth,innerHeight);
  ctx.globalCompositeOperation='lighter';
  parts=parts.filter(p=>p.life>0.02);
  for(const p of parts){
    p.x+=p.vx;p.y+=p.vy;p.vy+=.06;p.vx*=.985;p.vy*=.985;p.life*=.97;
    ctx.fillStyle='hsla('+p.hue+',100%,60%,'+p.life+')';
    ctx.beginPath();ctx.arc(p.x,p.y,p.r*p.life+.5,0,7);ctx.fill();
  }
  if(parts.length||active)raf=requestAnimationFrame(loop);
  else{raf=null;ctx.clearRect(0,0,innerWidth,innerHeight)}
}
let active=false;
function showWin(w){
  const b=$('banner');
  b.innerHTML='You win!<small>'+(mode==='ai'?'You beat the '+level+' computer':'Player '+w+' takes the round')+'</small>';
  b.classList.remove('show');void b.offsetWidth;b.classList.add('show');
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  active=true;let n=0;
  const t=setInterval(()=>{
    burst(innerWidth*(.15+Math.random()*.7),innerHeight*(.15+Math.random()*.4));sfx.boom();
    if(++n>=12){clearInterval(t);active=false}
  },280);
  burst(innerWidth/2,innerHeight*.35);sfx.boom();
  if(!raf)loop();
}


/* sad emoji on loss */
function sadPop(id){
  const el=$(id),r=el.getBoundingClientRect(),e=document.createElement('span');
  e.className='sad-pop';e.textContent='😢';
  e.style.left=(r.left+r.width/2)+'px';e.style.top=(r.top+r.height/2)+'px';
  document.body.appendChild(e);setTimeout(()=>e.remove(),1800);
}
function showLose(){
  const b=$('banner');
  b.innerHTML='😢<small>You lost to the '+level+' computer. Try again!</small>';
  b.classList.add('sad');b.classList.remove('show');void b.offsetWidth;b.classList.add('show');
  setTimeout(()=>b.classList.remove('sad'),2700);
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  for(let i=0;i<18;i++){
    const e=document.createElement('span');
    e.className='sad-drop';e.textContent=Math.random()<.7?'😢':'😭';
    e.style.left=(Math.random()*100)+'vw';
    e.style.fontSize=(1.6+Math.random()*1.8)+'rem';
    e.style.animationDelay=(Math.random()*.9)+'s';
    e.style.animationDuration=(1.8+Math.random()*1.2)+'s';
    document.body.appendChild(e);setTimeout(()=>e.remove(),4200);
  }
}

/* bokeh lights background (canvas) */
const bgc=$('bg'),bx=bgc.getContext('2d'),reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
const PAL=[330,350,0,25,50,120,160,190,215,270,300],T0=performance.now();
let W=0,H=0,dark=1,fr=0,px=0,py=0,tx=0,ty=0,discs=[],dots=[];
function hexLum(c){c=c.trim();if(c[0]!=='#')return 0;if(c.length===4)c='#'+c[1]+c[1]+c[2]+c[2]+c[3]+c[3];return(parseInt(c.slice(1,3),16)*.3+parseInt(c.slice(3,5),16)*.6+parseInt(c.slice(5,7),16)*.1)/255}
function bgInit(){
  W=innerWidth;H=innerHeight;const d=Math.min(devicePixelRatio||1,2);
  bgc.width=W*d;bgc.height=H*d;bx.setTransform(d,0,0,d,0,0);
  const n=Math.round(Math.min(42,Math.max(18,W*H/30000)));
  discs=[];
  for(let i=0;i<n;i++)discs.push({x:Math.random()*W,y:Math.random()*H,r:14+Math.pow(Math.random(),1.6)*54,h:PAL[Math.random()*PAL.length|0]+Math.random()*20-10,a:.2+Math.random()*.3,vx:(Math.random()-.5)*.28,vy:(Math.random()-.5)*.28,z:.2+Math.random()*.8,ph:Math.random()*6.28});
  dots=[];for(let i=1;i<=280;i++)dots.push(i);
}
function bgFrame(now){
  const t=reduce?20:(now-T0)/1000;
  if(fr++%30===0)dark=hexLum(getComputedStyle(document.documentElement).getPropertyValue('--bg'))<.5?1:0;
  px+=(tx-px)*.05;py+=(ty-py)*.05;
  bx.clearRect(0,0,W,H);
  bx.globalCompositeOperation=dark?'lighter':'source-over';
  const A=dark?1:.55,L=dark?60:50;
  for(const g of discs){
    if(!reduce){
      g.x+=g.vx;g.y+=g.vy;
      if(g.x<-g.r)g.x=W+g.r;if(g.x>W+g.r)g.x=-g.r;
      if(g.y<-g.r)g.y=H+g.r;if(g.y>H+g.r)g.y=-g.r;
    }
    const x=g.x+px*g.z*40,y=g.y+py*g.z*40,p=.75+.25*Math.sin(t*.8+g.ph);
    const gr=bx.createRadialGradient(x,y,g.r*.15,x,y,g.r);
    gr.addColorStop(0,'hsla('+g.h+',100%,'+L+'%,'+(g.a*.45*p*A)+')');
    gr.addColorStop(.78,'hsla('+g.h+',100%,'+L+'%,'+(g.a*.85*p*A)+')');
    gr.addColorStop(1,'hsla('+g.h+',100%,'+L+'%,0)');
    bx.fillStyle=gr;bx.beginPath();bx.arc(x,y,g.r,0,6.283);bx.fill();
  }
  const cx=W*.97+px*20,cy=H*.03+py*20,k=Math.max(W,H)*.036;
  for(const i of dots){
    const a=i*2.39996+t*.05,r=Math.sqrt(i)*k;
    const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;
    if(x<-10||y>H+10||x>W+10||y<-10)continue;
    const s=.8+(i/280)*4.2,tw=.45+.55*Math.sin(t*2+i);
    bx.fillStyle='hsla('+((i*7+t*18)%360)+',100%,'+L+'%,'+(.9*tw*A)+')';
    bx.beginPath();bx.arc(x,y,s,0,6.283);bx.fill();
  }
  if(!reduce)requestAnimationFrame(bgFrame);
}
bgInit();
addEventListener('resize',()=>{bgInit();if(reduce)bgFrame(0)});
addEventListener('pointermove',e=>{tx=e.clientX/W-.5;ty=e.clientY/H-.5});
requestAnimationFrame(bgFrame);

$('board').addEventListener('pointerdown',e=>{
  const c=e.target.closest('.cell');if(!c||c.disabled)return;
  const r=c.getBoundingClientRect(),s=document.createElement('span'),d=Math.max(r.width,r.height)/8;
  s.className='ripple';
  s.style.cssText='width:'+d+'px;height:'+d+'px;left:'+(e.clientX-r.left-d/2)+'px;top:'+(e.clientY-r.top-d/2)+'px';
  c.appendChild(s);setTimeout(()=>s.remove(),650);
});
$('board').addEventListener('pointermove',e=>{
  const c=e.target.closest('.cell');if(!c)return;
  const r=c.getBoundingClientRect();
  c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px');
});

/* sound (Web Audio, no files needed) */
let sfxOn=store.get('ttt-sound')!==false,AC=null;
function ac(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC}
function tone(f,t0,d,type,vol,slide){
  const a=ac();if(!a||!sfxOn)return;
  const o=a.createOscillator(),g=a.createGain(),s=a.currentTime+t0;
  o.type=type||'sine';o.frequency.setValueAtTime(f,s);
  if(slide)o.frequency.exponentialRampToValueAtTime(slide,s+d);
  g.gain.setValueAtTime(0.0001,s);g.gain.exponentialRampToValueAtTime(vol||.2,s+.01);g.gain.exponentialRampToValueAtTime(.0001,s+d);
  o.connect(g).connect(a.destination);o.start(s);o.stop(s+d+.05);
}
function noise(t0,d,vol,fq){
  const a=ac();if(!a||!sfxOn)return;
  const n=Math.floor(a.sampleRate*d),buf=a.createBuffer(1,n,a.sampleRate),dt=buf.getChannelData(0);
  for(let i=0;i<n;i++)dt[i]=(Math.random()*2-1)*(1-i/n);
  const src=a.createBufferSource(),g=a.createGain(),fl=a.createBiquadFilter(),s=a.currentTime+t0;
  src.buffer=buf;fl.type='lowpass';fl.frequency.value=fq||1200;
  g.gain.setValueAtTime(vol||.3,s);g.gain.exponentialRampToValueAtTime(.0001,s+d);
  src.connect(fl).connect(g).connect(a.destination);src.start(s);
}
const sfx={
  x(){tone(520,0,.12,'triangle',.22)},
  o(){tone(380,0,.12,'triangle',.22)},
  ui(){tone(300,0,.08,'square',.1,450)},
  end(){tone(300,0,.2,'sawtooth',.12,120)},
  draw(){tone(330,0,.18,'sine',.2);tone(294,.18,.18,'sine',.2);tone(262,.36,.3,'sine',.2)},
  lose(){tone(392,0,.2,'sawtooth',.14);tone(330,.2,.2,'sawtooth',.14);tone(262,.4,.4,'sawtooth',.14,200)},
  win(){[523,659,784,1047,1319].forEach((f,i)=>tone(f,i*.11,.25,'triangle',.25));tone(1047,.6,.6,'sine',.2)},
  boom(){tone(160,0,.35,'sine',.3,40);noise(0,.3,.25,500);noise(.15,.5,.1,6000)}
};
function paintMute(){$('mute').textContent=sfxOn?'🔊 Sound on':'🔇 Sound off'}
$('mute').onclick=()=>{sfxOn=!sfxOn;store.set('ttt-sound',sfxOn);paintMute();if(sfxOn)sfx.ui()};
paintMute();

/* AI */
let mode='pvp',level='Medium',aiT,fresh=true;
function winner(b){for(const l of LINES)if(b[l[0]]&&b[l[0]]===b[l[1]]&&b[l[0]]===b[l[2]])return b[l[0]];return b.every(Boolean)?'d':null}
function minimax(b,p,d){
  const w=winner(b);
  if(w==='O')return 10-d;if(w==='X')return d-10;if(w==='d')return 0;
  let best=p==='O'?-99:99;
  for(let i=0;i<9;i++)if(!b[i]){b[i]=p;const s=minimax(b,p==='O'?'X':'O',d+1);b[i]='';best=p==='O'?Math.max(best,s):Math.min(best,s)}
  return best;
}
function bestMove(){
  let bs=-99,bm=[];
  for(let i=0;i<9;i++)if(!board[i]){board[i]='O';const s=minimax(board,'X',1);board[i]='';if(s>bs){bs=s;bm=[i]}else if(s===bs)bm.push(i)}
  return bm[Math.random()*bm.length|0];
}
function immediate(p){
  for(const l of LINES){const v=l.map(k=>board[k]);if(v.filter(x=>x===p).length===2&&v.includes(''))return l[v.indexOf('')]}
  return -1;
}
function randomMove(){const e=board.map((v,i)=>v?-1:i).filter(i=>i>=0);return e[Math.random()*e.length|0]}
function pickMove(){
  if(level==='Hard')return bestMove();
  if(level==='Medium'){
    let m=immediate('O');
    if(m<0&&Math.random()<.75)m=immediate('X');
    return m>=0?m:randomMove();
  }
  return randomMove();
}
function aiMove(){
  if(mode!=='ai'||over||turn!=='O')return;
  aiT=setTimeout(()=>{if(!over&&turn==='O')play(pickMove())},500);
}
function setMode(m,l){
  mode=m;level=l;
  document.querySelectorAll('#modes button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===mode));
  document.querySelectorAll('#levels button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.l===level));
  $('levels').hidden=mode!=='ai';
  $('lx').textContent=mode==='ai'?'You (X)':'Player X';
  $('lo').textContent=mode==='ai'?'Computer (O)':'Player O';
  store.set('ttt-mode',{m:mode,l:level});
}
document.querySelectorAll('#modes button').forEach(b=>b.onclick=()=>{setMode(b.dataset.m,level);newGame()});
document.querySelectorAll('#levels button').forEach(b=>b.onclick=()=>{setMode(mode,b.dataset.l);newGame()});
const sm=store.get('ttt-mode');
if(sm&&sm.m&&sm.l)setMode(sm.m,sm.l);

/* init */
setTheme(store.get('ttt-theme')||'neon');
history=store.get('ttt-history')||[];
score=store.get('ttt-score')||{x:0,o:0,d:0};
renderHistory();newGame();

/* ===== Desk lamp ===== */
let lampOn=store.get('ttt-lamp')!==false;
const beam=$('beam'),lsvg=$('lampsvg'),shade=$('shade');
function aim(){
  const r=lsvg.getBoundingClientRect(),b=document.querySelector('.board-wrap').getBoundingClientRect();
  const ox=r.left+r.width*.475,oy=r.top+r.height*.307,tx=b.left+b.width/2,ty=b.top+b.height/2;
  const dx=tx-ox,dy=ty-oy,len=Math.min(1000,Math.max(120,Math.hypot(dx,dy)*1.15)),ang=Math.atan2(dy,dx)*180/Math.PI,h=len*.62;
  beam.style.left=ox+'px';beam.style.top=(oy-h/2)+'px';beam.style.width=len+'px';beam.style.height=h+'px';
  beam.style.transform='rotate('+ang+'deg)';
  const rot=Math.max(-100,Math.min(100,ang-90));
  shade.style.transformOrigin='95px 92px';shade.style.transform='rotate('+rot+'deg)';
}
function paintLamp(){
  document.body.classList.toggle('lamp-on',lampOn);document.body.classList.toggle('lamp-off',!lampOn);
  $('lampBtn').textContent=lampOn?'💡 Lamp on':'🌙 Lamp off';$('lampBtn').setAttribute('aria-pressed',lampOn);
}
function toggleLamp(){
  lampOn=!lampOn;store.set('ttt-lamp',lampOn);sfx.click();paintLamp();
  const c=$('cord');c.classList.add('pulled');setTimeout(()=>c.classList.remove('pulled'),160);
}
sfx.click=()=>{tone(1800,0,.03,'square',.1);tone(900,.04,.06,'square',.08)};
$('cord').onclick=toggleLamp;shade.onclick=toggleLamp;$('lampBtn').onclick=toggleLamp;
$('cord').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleLamp()}});
addEventListener('keydown',e=>{if((e.key==='l'||e.key==='L')&&!e.ctrlKey&&!e.metaKey&&!e.altKey)toggleLamp()});
function lampReact(kind){
  if(!lampOn)return;
  const c=kind==='win'?'surge':'flick';
  beam.classList.remove('surge','flick');void beam.offsetWidth;beam.classList.add(c);
}
const _finish=finish;
finish=function(w,line){_finish(w,line);lampReact(w&&!(mode==='ai'&&w==='O')?'win':'bad')};
['resize','scroll','load'].forEach(ev=>addEventListener(ev,aim,{passive:true}));
if(window.ResizeObserver)new ResizeObserver(aim).observe(document.querySelector('.board-wrap'));
paintLamp();aim();

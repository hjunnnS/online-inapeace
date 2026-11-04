import './style.css';
import { RhythmSession, directions, songDuration, type Direction } from './rhythm';
import { Walkthrough, type LightPreset, type SceneId } from './scene';
import carols from './carols.json';
import { ShuffleQueue } from './shuffle';
import cathedrals from './cathedrals.json';

function element<T extends HTMLElement>(id:string){const result=document.getElementById(id);if(!result)throw new Error('Missing element '+id);return result as T;}
const viewport=element('viewport'), welcome=element('welcome'), controls=element('controls');
const enterSound=element<HTMLButtonElement>('enter-sound');
const enter=element<HTMLButtonElement>('enter'), exit=element<HTMLButtonElement>('exit'), sit=element<HTMLButtonElement>('sit'), door=element<HTMLButtonElement>('confess');
const header=element('header'), pointsOpen=element('points-open'), candle=element('candle');
const veil=element<HTMLButtonElement>('veil'), reducedMotion=element<HTMLInputElement>('reduced-motion');
const effectPanel=element('effect-panel'), hotspots=element('hotspots');
let releasing=false;
const quiet=element('quiet'), quietExit=element('quiet-exit'), points=element<HTMLDialogElement>('points');
let quietView=false;
const notice=element('notice'), retry=element<HTMLButtonElement>('retry');
const confessional=element<HTMLDialogElement>('confessional'), thought=element<HTMLTextAreaElement>('thought');
const panel=element<HTMLDialogElement>('audio-panel');
const ambientVolume=element<HTMLInputElement>('ambient-volume');
const musicProgress=element<HTMLProgressElement>('music-progress'), musicPosition=element('music-position');
const musicTitle=element('music-title');
const backgroundToggle=element<HTMLButtonElement>('background-toggle');
const backgroundQuick=element<HTMLButtonElement>('background-quick');
const backgroundInfo=element('background-info'), backgroundStatus=element('background-status');
const reflectionOpen=element('reflection-open'), reflection=element<HTMLDialogElement>('reflection');
const lightPreset=element<HTMLSelectElement>('light-preset'), beadStatus=element('bead-status');
const beadNext=element<HTMLButtonElement>('bead-next');
const svgNamespace='http://www.w3.org/2000/svg';
const rosarySvg=document.createElementNS(svgNamespace,'svg');rosarySvg.setAttribute('viewBox','0 0 420 520');rosarySvg.setAttribute('aria-hidden','true');
const beads=Array.from({length:50},(_,index)=>{
  const angle=index*Math.PI*2/50-Math.PI/2;
  const bead=document.createElementNS(svgNamespace,'circle');
  bead.setAttribute('cx',String(210+Math.cos(angle)*116));bead.setAttribute('cy',String(205+Math.sin(angle)*168));bead.setAttribute('r',index%10===0?'9':'6.7');
  rosarySvg.append(bead);return bead;
});
const cross=document.createElementNS(svgNamespace,'path');
cross.setAttribute('d','M210 383v108 M210 390v25 M194 456h32 M210 438v58');cross.setAttribute('stroke','#d6b783');cross.setAttribute('stroke-width','5');cross.setAttribute('fill','none');rosarySvg.append(cross);
element('beads').append(rosarySvg);
let beadPointer:{y:number;id:number}|undefined;
element('beads').onpointerdown=event=>{beadPointer={y:event.clientY,id:event.pointerId};element('beads').setPointerCapture(event.pointerId);};
element('beads').onpointerup=event=>{
  if(beadPointer&&beadPointer.id===event.pointerId&&Math.abs(event.clientY-beadPointer.y)>30)beadNext.click();
  beadPointer=undefined;rosarySvg.style.transform='';
};
element('beads').onpointermove=event=>{
  if(beadPointer&&!reducedMotion.checked)rosarySvg.style.transform='translateY('+Math.max(-20,Math.min(20,event.clientY-beadPointer.y))+'px)';
};
element('beads').onpointercancel=()=>{beadPointer=undefined;rosarySvg.style.transform='';};
let beadIndex=0, backgroundOn=false, backgroundVersion=0;
const shuffle=new ShuffleQueue(carols.length);
let currentTrack=shuffle.next();
const failedTracks=new Set<number>();
const ambient=new Audio(new URL(carols[currentTrack].file,location.href).href);
ambient.preload='metadata';ambient.loop=false;ambient.volume=0;
let active=false, loaded=false, opening=false, noticeTimer=0, scene:Walkthrough|undefined;
const qa=new URLSearchParams(location.search).has('qa');
let selected:SceneId='bariloche';
let retryWalk=false;
let audioProblem='';
const catalog=element<HTMLDialogElement>('catalog');
const catalogList=element('catalog-items');

const choirOpen=element<HTMLButtonElement>('choir-open'), choirPanel=element<HTMLDialogElement>('choir-panel');
const choirStatus=element('choir-status'), rhythm=element('rhythm'), conductFeedback=element('conduct-feedback');
const conductScore=element('conduct-score'), conductRetry=element('conduct-retry'), lanes=element('note-lanes');
const effectVolume=element<HTMLInputElement>('effect-volume');
const choirAudio=new Audio(new URL('audio/choir.mp3',location.href).href);
choirAudio.preload='none';
const actionSounds=new Map<string,HTMLAudioElement>();
let choirOn=false, choirVersion=0, game:RhythmSession|undefined, gameRunning=false;
let feedbackUntil=0, musicTick=0, sitAfterChoirClose=false;
const photoPanel=element<HTMLDialogElement>('photo-panel'), photoOpen=element<HTMLButtonElement>('photo-open');
const photoPreview=element<HTMLImageElement>('photo-preview'), photoSave=element<HTMLAnchorElement>('photo-save');
let photoVersion=0;

function actionSound(name:string){
  const volume=Number(effectVolume.value);
  if(!volume||document.hidden||!active)return;
  const file=name==='room'?'door':name;
  let audio=actionSounds.get(file);
  if(!audio){audio=new Audio(new URL('audio/'+file+'.wav',location.href).href);actionSounds.set(file,audio);}
  audio.volume=volume;audio.currentTime=0;
  void audio.play().catch(()=>{});
}
function stopActionSounds(){for(const sound of actionSounds.values()){sound.pause();sound.currentTime=0;}}
effectVolume.oninput=()=>{if(!Number(effectVolume.value))stopActionSounds();};
function stopChoir(){
  choirVersion++;choirAudio.pause();choirAudio.currentTime=0;choirOn=false;
  scene?.setChoirPlaying(false);choirStatus.textContent='공연을 멈췄습니다.';
  if(game){game.end();game=undefined;gameRunning=false;rhythm.hidden=true;scene?.finishConduct();header.hidden=false;controls.hidden=!active;}
}
function exitGame(){stopChoir();syncBackground();choirOpen.focus();}
async function playChoir(conduct:boolean){
  stopChoir();
  if(!Number(ambientVolume.value))ambientVolume.value='0.5';
  const version=++choirVersion;
  choirOn=true;scene?.setChoirPlaying(true);syncBackground();
  choirStatus.textContent='공연을 불러오는 중…';
  if(conduct){
    game=new RhythmSession();gameRunning=true;rhythm.hidden=false;conductRetry.hidden=true;
    header.hidden=true;controls.hidden=true;scene?.startConduct();element('conduct-exit').focus();
    conductFeedback.textContent='준비 중';
    const fragment=document.createDocumentFragment();
    for(const note of game.notes){const mark=document.createElement('span');mark.textContent={left:'←',down:'↓',up:'↑',right:'→'}[note.direction];fragment.append(mark);}
    lanes.replaceChildren(fragment);
  }
  try{
    await choirAudio.play();
    if(version!==choirVersion)return;
    choirStatus.textContent='고요한 빛 · 공연 중';
    if(!conduct){sitAfterChoirClose=true;choirPanel.close();}
  }catch{
    if(version!==choirVersion)return;
    stopChoir();syncBackground();announce('성가를 불러오지 못했습니다. 성가대에서 다시 시작해 주세요.');
  }
}
function finishGame(){
  if(!game)return;
  game.advance(songDuration);gameRunning=false;choirOn=false;scene?.setChoirPlaying(false);
  conductFeedback.textContent='지휘를 마쳤습니다';conductScore.textContent='맞춘 음표 '+game.hits+' / '+game.notes.length;
  conductRetry.hidden=false;lanes.replaceChildren();syncBackground();
}
function judge(direction:Direction){
  if(!gameRunning||!game)return;
  const grade=game.judge(direction,choirAudio.currentTime);
  const text={ready:'곧 시작합니다',early:'박자에 맞춰 보세요',perfect:'정확해요',good:'좋아요'};
  conductFeedback.textContent=text[grade];feedbackUntil=performance.now()+700;
  if(grade==='perfect'||grade==='good'){scene?.conductHit();}
}
for(const button of rhythm.querySelectorAll<HTMLButtonElement>('button[data-direction]'))button.onclick=()=>judge(button.dataset.direction as Direction);
window.addEventListener('keydown',event=>{
  if(rhythm.hidden||event.altKey||event.ctrlKey||event.metaKey)return;
  if(event.key==='Escape'){event.preventDefault();exitGame();return;}
  const direction={ArrowLeft:'left',ArrowDown:'down',ArrowUp:'up',ArrowRight:'right'}[event.key] as Direction|undefined;
  if(direction&&!event.repeat){event.preventDefault();judge(direction);}
});
function tickChoir(){
  const now=performance.now();
  if(now-musicTick>100){
    const factor=game?.6:Math.min(1,Math.max(.16,1-(scene?.choirDistance??0)/35));
    choirAudio.volume=Number(ambientVolume.value)*factor;
    musicTick=now;
  }
  if(game&&gameRunning&&!choirAudio.paused){
    const time=choirAudio.currentTime;game.advance(time);
    if(now>feedbackUntil)conductFeedback.textContent=time<3?'준비 · '+Math.ceil(3-time):'음표를 따라 지휘해 보세요';
    conductScore.textContent='맞춘 음표 '+game.hits+' / '+game.notes.length;
    const marks=lanes.children;
    game.notes.forEach((note,index)=>{
      const mark=marks[index] as HTMLElement|undefined;if(!mark)return;
      const until=note.time-time;mark.hidden=note.judged||until>3||until<-.28;
      mark.style.left=(directions.indexOf(note.direction)*25+12.5)+'%';
      mark.style.bottom=Math.max(0,until/3*100)+'%';
    });
    if(game.finished)finishGame();
  }
  requestAnimationFrame(tickChoir);
}
choirAudio.onended=()=>{if(game)finishGame();else{stopChoir();syncBackground();}};
choirOpen.onclick=()=>{
  if(!scene||opening)return;
  announce('성가대 앞으로 이동합니다.');
  scene.walkToChoir(()=>{scene?.mode('choir');choirPanel.showModal();});
};
element('choir-close').onclick=()=>choirPanel.close();
choirPanel.onclose=()=>{if(!game){scene?.mode('walk');if(sitAfterChoirClose){sitAfterChoirClose=false;scene?.sit();}}};
element('choir-listen').onclick=()=>void playChoir(false);
element('choir-stop').onclick=()=>{stopChoir();syncBackground();};
element('conduct-start').onclick=()=>{choirPanel.close();void playChoir(true);};
element('conduct-exit').onclick=exitGame;
conductRetry.onclick=()=>void playChoir(true);
requestAnimationFrame(tickChoir);

async function takePhoto(front:boolean){
  if(!scene)return;
  const version=++photoVersion;
  photoSave.removeAttribute('href');
  element('photo-status').textContent='사진을 준비하는 중…';
  try{
    const source=scene.capturePhoto(front);
    const image=new Image();image.src=source;await image.decode();
    if(version!==photoVersion||!photoPanel.open)return;
    const canvas=document.createElement('canvas');canvas.width=900;canvas.height=1100;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
    ctx.fillStyle='#201b15';ctx.fillRect(0,0,900,1100);
    const crop=Math.min(image.width,image.height);
    ctx.drawImage(image,(image.width-crop)/2,(image.height-crop)/2,crop,crop,28,28,844,844);
    ctx.strokeStyle='#d8b77d';ctx.lineWidth=2;ctx.strokeRect(18,18,864,1064);
    ctx.textAlign='center';ctx.fillStyle='#f4e6c8';ctx.font='46px Georgia';ctx.fillText('In a Peace',450,952);
    ctx.font='23px system-ui';ctx.fillText(cathedrals.find(item=>item.id===selected)?.name??'성당',450,1002);
    ctx.font='18px system-ui';ctx.fillStyle='#beaa88';ctx.fillText(new Date().toLocaleDateString('ko-KR'),450,1044);
    const url=canvas.toDataURL('image/png');photoPreview.src=url;photoSave.href=url;
    element('photo-status').textContent='기기에 사진을 저장할 수 있습니다.';
  }catch{if(version===photoVersion)element('photo-status').textContent='사진을 만들지 못했습니다. 다시 선택해 주세요.';}
}
photoOpen.onclick=()=>{scene?.mode('photo');photoPanel.showModal();void takePhoto(false);};
element('photo-current').onclick=()=>void takePhoto(false);
element('photo-front').onclick=()=>void takePhoto(true);
element('photo-close').onclick=()=>photoPanel.close();
photoPanel.onclose=()=>{photoVersion++;photoSave.removeAttribute('href');photoPreview.removeAttribute('src');scene?.mode('walk');photoOpen.focus();};

for(const [index,item] of cathedrals.entries()){
  const row=document.createElement('li');
  const button=document.createElement('button');
  button.type='button';button.dataset.scene=item.id;
  const ordinal=document.createElement('span');ordinal.className='catalog-number';ordinal.textContent=String(index+1).padStart(2,'0');
  const copy=document.createElement('span');
  const title=document.createElement('strong');title.textContent=item.name;
  const detail=document.createElement('small');detail.textContent=item.region+' · '+item.detail;
  const thumbnail=document.createElement('img');
  thumbnail.src=new URL('previews/'+item.id+'.jpg',location.href).href;thumbnail.alt='';thumbnail.loading='lazy';thumbnail.width=480;thumbnail.height=300;
  copy.append(title,detail);button.append(thumbnail,ordinal,copy);
  button.onclick=()=>{catalog.close();void switchScene(item.id,true);};
  const source=document.createElement('a');source.href=item.source;source.textContent='참고 자료';source.target='_blank';source.rel='noopener noreferrer';
  row.append(button,source);catalogList.append(row);
}
function refreshSceneTitle(){
  const index=cathedrals.findIndex(item=>item.id===selected);
  const item=cathedrals[index];
  element('scene-name').textContent=item?.name??'검증용 임시 공간';
  element('region').textContent=item?.region??'전환 검증';
  element('scene-index').textContent='CATHEDRALS · '+String(index+1).padStart(2,'0');
  document.title='In a Peace · '+(item?.name??'전환 검증');
  for(const button of catalogList.querySelectorAll<HTMLButtonElement>('button[data-scene]')){
    button.setAttribute('aria-current',String(button.dataset.scene===selected));
  }
}
element('catalog-open').onclick=()=>{if(!opening){scene?.mode('catalog');catalog.showModal();}};
element('catalog-close').onclick=()=>catalog.close();
catalog.onclose=()=>{if(!opening)scene?.mode(active?'walk':'welcome');};

function formatTime(seconds:number){
  return Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0');
}
function updateMusicProgress(){
  const duration=Number.isFinite(ambient.duration)?ambient.duration:carols[currentTrack].duration;
  musicProgress.value=duration?ambient.currentTime/duration:0;
  musicPosition.textContent=formatTime(ambient.currentTime)+' / '+formatTime(duration);
}
for(const track of carols){
  const row=document.createElement('li');
  const title=document.createElement('strong');title.textContent=track.title;
  const credit=document.createElement('p');credit.textContent=track.artist;
  const source=document.createElement('a');source.href=track.source;source.textContent='원본 및 출처';source.target='_blank';source.rel='noopener noreferrer';
  const license=document.createElement('a');license.href=track.licenseUrl;license.textContent=track.license;license.target='_blank';license.rel='noopener noreferrer';
  const changes=document.createElement('small');changes.textContent=track.changes;
  row.append(title,credit,source,document.createTextNode(' · '),license,changes);element('music-credits').append(row);
}
function nextBackground(){
  for(let attempt=0;attempt<carols.length*2;attempt++){
    currentTrack=shuffle.next();
    if(!failedTracks.has(currentTrack)){
      ambient.src=new URL(carols[currentTrack].file,location.href).href;
      updateMusicProgress();syncBackground();return;
    }
  }
  backgroundOn=false;syncBackground();announce('캐럴을 불러오지 못했습니다. 배경음 켜기로 다시 시도해 주세요.');
}
function backgroundError(){
  if(!backgroundOn)return;
  failedTracks.add(currentTrack);
  if(failedTracks.size>=carols.length){backgroundOn=false;syncBackground();announce('캐럴을 불러오지 못했습니다. 배경음 켜기로 다시 시도해 주세요.');return;}
  nextBackground();
}
function syncBackground(){
  const version=++backgroundVersion;
  backgroundToggle.textContent=backgroundOn?'배경 소리 끄기':'배경 소리 켜기';
  backgroundQuick.textContent=backgroundOn?'♪ 배경음 끄기':'♪ 배경음 켜기';
  backgroundQuick.setAttribute('aria-pressed',String(backgroundOn));
  ambient.volume=Number(ambientVolume.value);
  const track=carols[currentTrack];
  musicTitle.textContent=track.title;
  backgroundInfo.textContent='크리스마스 캐럴 10곡 · 무작위 연속 재생';
  if(!backgroundOn||!ambient.volume||document.hidden||confessional.open||releasing||opening||choirOn){
    ambient.pause();
    backgroundStatus.textContent=backgroundOn?'다시 돌아오면 캐럴이 이어집니다.':'배경 소리 꺼짐';
    return;
  }
  void ambient.play().then(()=>{
    if(version===backgroundVersion)backgroundStatus.textContent='배경 소리 재생 중';
  }).catch((error:DOMException)=>{
    if(version!==backgroundVersion)return;
    if(error.name!=='NotAllowedError'){backgroundError();return;}
    backgroundOn=false;
    syncBackground();
    announce('배경 소리를 재생하지 못했습니다. 음악 메뉴에서 다시 켜 주세요.');
  });
}

backgroundQuick.onclick=backgroundToggle.onclick=()=>{
  backgroundOn=!backgroundOn;
  if(backgroundOn&&Number(ambientVolume.value)===0)ambientVolume.value='0.5';
  if(backgroundOn){failedTracks.clear();if(ambient.error){nextBackground();return;}}
  syncBackground();
};
ambientVolume.oninput=()=>{
  backgroundOn=Number(ambientVolume.value)>0;
  syncBackground();
};
ambient.onerror=backgroundError;
ambient.onended=nextBackground;
ambient.ontimeupdate=updateMusicProgress;
element('music-next').onclick=()=>{failedTracks.clear();nextBackground();};
element('audio-open').onclick=()=>{scene?.mode('audio');panel.showModal();};
element('audio-close').onclick=()=>panel.close();
panel.onclose=()=>{scene?.mode(active?'walk':'welcome');};
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopChoir();stopActionSounds();scene?.skipEffect();}syncBackground();});
window.addEventListener('pagehide',()=>{thought.value='';stopChoir();stopActionSounds();scene?.skipEffect();backgroundOn=false;syncBackground();if(confessional.open)confessional.close();});
window.addEventListener('pageshow',()=>{thought.value='';if(confessional.open)confessional.close();});

function announce(message:string,duration=3000){
  clearTimeout(noticeTimer);notice.textContent=message;notice.hidden=false;
  if(duration)noticeTimer=window.setTimeout(()=>{notice.hidden=true;},duration);
}
function enterRoom(){
  if(confessional.open||!active)return;
  stopChoir();scene?.onSound('room');scene?.mode('room');thought.value='';confessional.showModal();syncBackground();thought.focus();
}
function leaveRoom(){
  thought.value='';
  if(confessional.open)confessional.close();
}
function finishRelease(){
  releasing=false;effectPanel.hidden=true;header.hidden=false;controls.hidden=!active;scene?.mode(active?'walk':'welcome');
  if(active){door.focus();announce('본당으로 돌아왔습니다.');}
  syncBackground();
}
element('effect-skip').onclick=()=>scene?.skipEffect();
element('release').onclick=()=>{
  if(releasing)return;
  thought.value='';releasing=true;confessional.close();
};
element('cancel').onclick=leaveRoom;
confessional.oncancel=(event)=>{event.preventDefault();leaveRoom();};
confessional.onclose=()=>{
  thought.value='';
  if(releasing){
    effectPanel.hidden=false;header.hidden=true;controls.hidden=true;scene?.releaseThought(finishRelease);element('effect-skip').focus();
  }else{scene?.mode('walk');door.focus();syncBackground();announce('본당으로 돌아왔습니다.');}
};
veil.onclick=()=>scene?.toggleVeil();
reducedMotion.onchange=()=>{scene?.setReducedMotion(reducedMotion.checked);document.body.classList.toggle('reduce-motion',reducedMotion.checked);};
sit.onclick=()=>scene?.sit();
door.onclick=()=>{announce('고해소 쪽으로 이동합니다.');scene?.walkToDoor(enterRoom);};
function updateWalkControls(){
  const local=active&&selected==='bariloche';
  element('background-note').hidden=!local;
  backgroundQuick.hidden=!active;
  pointsOpen.hidden=!local;
  reflectionOpen.hidden=!local;choirOpen.hidden=!local;photoOpen.hidden=!local;
  veil.hidden=!local;
  veil.textContent=scene?.veilOn?'미사포 벗기':'미사포 쓰기';
  veil.disabled=!!scene?.effect;
  candle.toggleAttribute('disabled',!!scene?.effect);
  if(qa){
    const status=element('qa-status');status.hidden=false;
    status.textContent=JSON.stringify({scene:selected,active,loaded,opening,seated:scene?.seated,position:scene?.position.toArray(),veil:scene?.veilOn,holding:scene?.holdingCandle,placed:scene?.placedCandles,effect:scene?.effect,frameMs:scene?.frameTime,drawCalls:scene?.drawCalls,geometries:scene?.geometries,textures:scene?.textures,currentCarol:carols[currentTrack].id,carolCount:carols.length,worshippers:scene?.worshipperCount,totalVisitors:scene?.totalVisitorCount,movingVisitors:scene?.movingVisitorStatus,veiledWorshippers:scene?.veiledWorshipperCount,wallCandles:scene?.wallCandleCount,tree:scene?.treePresent,choirPlaying:!choirAudio.paused,game:gameRunning,gameHits:game?.hits??0,gameTime:choirAudio.currentTime,backgroundPlaying:!ambient.paused,backgroundTime:ambient.currentTime,backgroundLoop:ambient.loop,backgroundVolume:ambient.volume,room:confessional.open});
  }
  const locations=scene?.hotspots()??[];
  for(const button of hotspots.querySelectorAll<HTMLButtonElement>('button'))button.hidden=true;
  for(const location of locations){
    let button=hotspots.querySelector<HTMLButtonElement>('[data-action="'+location.id+'"]');
    if(!button){
      button=document.createElement('button');button.type='button';button.dataset.action=location.id;
      button.onclick=()=>{
        if(location.id==='choir')choirOpen.click();
        else if(location.id==='tree')scene?.visit('tree');
        else element(location.id).click();
      };
      hotspots.append(button);
    }
    button.hidden=false;button.textContent='✧ '+location.label;
    button.style.left=location.x+'%';button.style.top=location.y+'%';
  }
  candle.hidden=!local;
  candle.textContent=scene?.holdingCandle?'촛불 놓기':'촛불 켜기';
  quiet.hidden=!local||!scene?.seated;
  sit.textContent=scene?.seated?'일어나기':'앉기';
}
function setQuiet(on:boolean){
  quietView=on;
  scene?.setQuiet(on);
  header.hidden=on;controls.hidden=on||!active;quietExit.hidden=!on;
  if(on){notice.hidden=true;quietExit.focus();}
  else quiet.focus();
}
quiet.onclick=()=>{if(active&&selected==='bariloche'&&scene?.seated)setQuiet(true);};
quietExit.onclick=()=>setQuiet(false);
window.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&scene?.effect){event.preventDefault();scene.skipEffect();}
  if(quietView&&event.key==='Escape'){event.preventDefault();setQuiet(false);}
});
candle.onclick=()=>scene?.toggleCandle(updateWalkControls);
pointsOpen.onclick=()=>{scene?.mode('points');points.showModal();};
element('points-close').onclick=()=>points.close();
let nextPoint:'altar'|'glass'|'tree'|undefined;
element('point-altar').onclick=()=>{nextPoint='altar';points.close();};
element('point-glass').onclick=()=>{nextPoint='glass';points.close();};
element('point-tree').onclick=()=>{nextPoint='tree';points.close();};
points.onclose=()=>{
  scene?.mode('walk');
  if(nextPoint)scene?.visit(nextPoint);
  nextPoint=undefined;
  pointsOpen.focus();
};
function updateBeads(){
  beads.forEach((bead,index)=>bead.classList.toggle('current',index+1===beadIndex));
  beadStatus.textContent=beadIndex?beadIndex+'번째 알 · '+beads.length+'알':'아직 넘긴 알이 없습니다.';
  beadNext.textContent=beadIndex===beads.length?'처음부터 한 알 넘기기':'한 알 넘기기';
}
beadNext.onclick=()=>{
  beadIndex=beadIndex%beads.length+1;updateBeads();
  if(!reducedMotion.checked)rosarySvg.animate([{transform:'translateY(0)'},{transform:'translateY(6px)'},{transform:'translateY(0)'}],{duration:280});
};
element('bead-reset').onclick=()=>{beadIndex=0;updateBeads();};
lightPreset.onchange=()=>scene?.setLighting(lightPreset.value as LightPreset);
reflectionOpen.onclick=()=>{scene?.mode('reflection');reflection.showModal();};
element('reflection-close').onclick=()=>reflection.close();
reflection.onclose=()=>{scene?.mode('walk');reflectionOpen.focus();};
function present(walk:boolean){
  active=walk;welcome.hidden=walk;controls.hidden=!walk;exit.hidden=!walk;scene?.mode(walk?'walk':'welcome');
  if(quietView)setQuiet(false);
  updateWalkControls();
}
async function switchScene(id:SceneId,walk:boolean,url?:string){
  if(opening)return;
  if(!scene){announce('이 브라우저에서 3D를 열 수 없습니다. WebGL 2 설정을 확인해 주세요.',0);return;}
  opening=true;retry.hidden=true;enter.disabled=enterSound.disabled=true;
  stopChoir();stopActionSounds();ambient.pause();scene.mode('loading');announce('공간을 불러오는 중…',0);
  try{
    if(await scene.load(id,url)){
      selected=id;loaded=true;refreshSceneTitle();
      lightPreset.value='day';beadIndex=0;updateBeads();
      present(walk);
      notice.hidden=true;
      if(walk)announce((cathedrals.find(item=>item.id===id)?.name??'전환 검증용 임시 공간')+'에 들어왔습니다.');
    }
  }catch{
    present(active);retryWalk=walk;
    announce('공간을 불러오지 못했습니다. 연결 상태를 확인해 주세요.',0);retry.hidden=false;
    retry.onclick=()=>void switchScene(id,retryWalk);
  }finally{opening=false;enter.disabled=enterSound.disabled=false;if(active)syncBackground();}
}
try{scene=new Walkthrough(viewport,announce);scene.onSound=actionSound;reducedMotion.checked=scene.motionReduced;}
catch{announce('이 브라우저에서 3D를 열 수 없습니다. WebGL 2 설정을 확인해 주세요.',0);}
function enterCathedral(withSound:boolean){

  backgroundOn=withSound;effectVolume.value=withSound?'0.25':'0';
  if(withSound){
    failedTracks.clear();
    if(!Number(ambientVolume.value))ambientVolume.value='0.5';
    if(ambient.ended)ambient.currentTime=0;
  }
  if(!loaded){void switchScene(selected,true);return;}
  present(true);
  syncBackground();
  announce((cathedrals.find(item=>item.id===selected)?.name??'성당')+'에 들어왔습니다.');
  sit.focus();
}
enter.onclick=()=>enterCathedral(true);
enterSound.onclick=()=>enterCathedral(false);
exit.onclick=()=>{stopChoir();stopActionSounds();backgroundOn=false;syncBackground();present(false);enter.focus();};
window.setInterval(updateWalkControls,150);
refreshSceneTitle();
if(scene)void switchScene('bariloche',false);
updateMusicProgress();
syncBackground();

if(qa){
  Object.assign(window,{
    inapeaceQA:{
      switchScene,
      status:()=>({scene:selected,position:scene?.position.toArray(),seated:scene?.seated,active,loaded,opening,currentCarol:carols[currentTrack].id,backgroundPlaying:!ambient.paused,backgroundTime:ambient.currentTime,room:confessional.open,drawCalls:scene?.drawCalls,geometries:scene?.geometries,textures:scene?.textures,triangles:scene?.triangleCount})
    }
  });
}

import './style.css';
import { readPreferences, writePreferences, type Preferences } from './preferences';
import { PrayerJourney } from './intent';
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
let preferences:Preferences;
try{preferences=readPreferences(localStorage,cathedrals.map(item=>item.id));}catch{preferences=readPreferences({getItem:()=>null},[]);}
ambientVolume.value=String(preferences.volume);
let selected:SceneId=preferences.favorite??'bariloche';
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
effectVolume.value=String(preferences.effects);
effectVolume.oninput=()=>{preferences.effects=Number(effectVolume.value);saveSettings();if(!Number(effectVolume.value))stopActionSounds();};
function stopChoir(){
  choirVersion++;choirAudio.pause();choirAudio.currentTime=0;choirOn=false;
  scene?.setChoirPlaying(false);choirStatus.textContent='공연을 멈췄습니다.';
  if(game){game.end();game=undefined;gameRunning=false;rhythm.hidden=true;scene?.finishConduct();header.hidden=false;controls.hidden=!active;}
}
function exitGame(){stopChoir();syncBackground();choirOpen.focus();}
async function playChoir(conduct:boolean){
  stopLiturgy();endPrayer(false);stopChoir();
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
    const liturgyGain=liturgyElapsed===undefined?1:Math.min(1,Math.max(0,(liturgyElapsed-12)/1.2),Math.max(0,(48-liturgyElapsed)/2));
    choirAudio.volume=Number(ambientVolume.value)*factor*liturgyGain;
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
  element('point-entrance').innerHTML=selected==='bariloche'?'대형 출입문<small>트리 옆 석조 아치와 목재 양문을 바라봅니다.</small>':'입구 쪽<small>본당 뒤편에서 공간을 천천히 바라봅니다.</small>';

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

backgroundToggle.onclick=()=>{
  backgroundOn=!backgroundOn;
  if(backgroundOn&&Number(ambientVolume.value)===0)ambientVolume.value='0.5';
  if(backgroundOn){failedTracks.clear();if(ambient.error){nextBackground();return;}}
  syncBackground();
};
ambientVolume.oninput=()=>{
  backgroundOn=Number(ambientVolume.value)>0;
  preferences.volume=Number(ambientVolume.value);saveSettings();syncBackground();
};
ambient.onerror=backgroundError;
ambient.onended=nextBackground;
ambient.ontimeupdate=updateMusicProgress;
element('music-next').onclick=()=>{failedTracks.clear();nextBackground();};
element('audio-open').onclick=()=>{scene?.mode('audio');panel.showModal();};
element('audio-close').onclick=()=>panel.close();
panel.onclose=()=>{scene?.mode(active?'walk':'welcome');};
document.addEventListener('visibilitychange',()=>{experienceLast=performance.now();if(document.hidden){if(liturgyElapsed!==undefined&&liturgyPhase===1){choirAudio.pause();liturgyAudioPaused=true;}else stopChoir();stopActionSounds();scene?.skipEffect();}syncBackground();});
window.addEventListener('pagehide',()=>{thought.value='';stopChoir();stopActionSounds();scene?.skipEffect();backgroundOn=false;syncBackground();if(confessional.open)confessional.close();});
window.addEventListener('pageshow',()=>{thought.value='';if(confessional.open)confessional.close();});

function announce(message:string,duration=3000){
  clearTimeout(noticeTimer);notice.textContent=message;notice.hidden=false;
  if(duration)noticeTimer=window.setTimeout(()=>{notice.hidden=true;},duration);
}
function enterRoom(){
  if(confessional.open||!active)return;
  stopLiturgy();stopChoir();scene?.onSound('room');scene?.mode('room');thought.value='';confessional.showModal();syncBackground();thought.focus();
}
function leaveRoom(){
  thought.value='';
  if(confessional.open)confessional.close();
}
function finishRelease(){
  resumePrayerAfterRoom();
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
  }else{scene?.mode('walk');resumePrayerAfterRoom();door.focus();syncBackground();announce('본당으로 돌아왔습니다.');}
};
veil.onclick=()=>scene?.toggleVeil();
reducedMotion.onchange=()=>{scene?.setReducedMotion(reducedMotion.checked);document.body.classList.toggle('reduce-motion',reducedMotion.checked);preferences.reduced=reducedMotion.checked;saveSettings();};
sit.onclick=()=>scene?.sit();
door.onclick=()=>{announce('고해소 쪽으로 이동합니다.');scene?.walkToDoor(enterRoom);};
function updateWalkControls(){
  const local=active,bariloche=selected==='bariloche';
  element('background-note').hidden=!local;
  element('background-note').textContent=bariloche?'가상 신자 20명과 오가는 방문자 3명':'조용히 기도하는 가상 방문자 4명';
  pointsOpen.hidden=!local;
  reflectionOpen.hidden=!local;choirOpen.hidden=!local||!bariloche;photoOpen.hidden=!local;
  element('liturgy-open').hidden=!bariloche;
  element('point-tree').hidden=!bariloche;
  element('experience-scope').textContent=bariloche?'촛불과 기도, 성가대와 집전 장면을 천천히 만나보세요.':'공통 기도 체험을 위한 간략 재구성 공간입니다. 성가대·집전 장면·트리는 바릴로체 전용입니다.';
  veil.hidden=!local;
  veil.textContent=scene?.veilOn?'미사포 벗기':'미사포 쓰기';
  veil.disabled=!!scene?.effect;
  candle.toggleAttribute('disabled',!!scene?.effect);
  if(qa){
    const status=element('qa-status');status.hidden=false;
    status.textContent=JSON.stringify({scene:selected,active,loaded,opening,seated:scene?.seated,navigating:scene?.navigating,playerPraying:scene?.playerPraying,prayerStage:journey?.stage,prayerRemaining:journey?.remaining,liturgy:liturgyElapsed,position:scene?.position.toArray(),veil:scene?.veilOn,holding:scene?.holdingCandle,placed:scene?.placedCandles,effect:scene?.effect,frameMs:scene?.frameTime,drawCalls:scene?.drawCalls,geometries:scene?.geometries,textures:scene?.textures,currentCarol:carols[currentTrack].id,carolCount:carols.length,worshippers:scene?.worshipperCount,totalVisitors:scene?.totalVisitorCount,characterPatterns:scene?.characterPatterns,hairPatterns:scene?.hairPatterns,prayer:scene?.prayerCounts,playerSeatPose:scene?.playerSeatPose,movingVisitors:scene?.movingVisitorStatus,veiledWorshippers:scene?.veiledWorshipperCount,wallCandles:scene?.wallCandleCount,tree:scene?.treePresent,choirPlaying:!choirAudio.paused,game:gameRunning,gameHits:game?.hits??0,gameTime:choirAudio.currentTime,backgroundPlaying:!ambient.paused,backgroundTime:ambient.currentTime,backgroundLoop:ambient.loop,backgroundVolume:ambient.volume,room:confessional.open});
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
quiet.onclick=()=>{if(active&&scene?.seated)setQuiet(true);};
quietExit.onclick=()=>setQuiet(false);
window.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&scene?.effect){event.preventDefault();scene.skipEffect();}
  if(quietView&&event.key==='Escape'){event.preventDefault();setQuiet(false);}
});
candle.onclick=()=>scene?.toggleCandle(updateWalkControls);
pointsOpen.onclick=()=>{scene?.mode('points');points.showModal();};
element('points-close').onclick=()=>points.close();
let nextPoint:'altar'|'glass'|'tree'|'entrance'|undefined;
element('point-altar').onclick=()=>{nextPoint='altar';points.close();};
element('point-glass').onclick=()=>{nextPoint='glass';points.close();};
element('point-entrance').onclick=()=>{nextPoint='entrance';points.close();};
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
lightPreset.onchange=()=>{preferences.light=lightPreset.value as LightPreset;scene?.setLighting(preferences.light);saveSettings();};
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
  endPrayer(false);stopLiturgy();stopChoir();stopActionSounds();ambient.pause();scene.mode('loading');announce('공간을 불러오는 중…',0);
  try{
    if(await scene.load(id,url)){
      selected=id;loaded=true;refreshSceneTitle();
      lightPreset.value=preferences.light;scene.setLighting(preferences.light);beadIndex=0;updateBeads();
      updateFavorite();
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
// Only environmental preferences are persisted. Private writing remains in the textarea.
function saveSettings(){
  let saved=false;try{saved=writePreferences(localStorage,preferences);}catch{}
  element('preference-status').textContent=saved?'이 기기에 즐겨찾기와 환경 설정을 기억했습니다.':'이 브라우저에서 설정을 저장할 수 없습니다. 이번 방문에는 적용됩니다.';
}
function updateFavorite(){const button=element('favorite');button.textContent=preferences.favorite===selected?'★ 즐겨찾기 해제':'☆ 이 성당을 즐겨찾기';button.setAttribute('aria-pressed',String(preferences.favorite===selected));}
element('favorite').onclick=()=>{preferences.favorite=preferences.favorite===selected?undefined:selected;saveSettings();updateFavorite();};
const activities=element<HTMLDialogElement>('activities');
element('activities-open').onclick=()=>{scene?.mode('activities');activities.showModal();};
element('activities-close').onclick=()=>activities.close();
activities.onclose=()=>{if(!document.querySelector('dialog[open]'))scene?.mode(active?'walk':'welcome');};
// Closing the menu synchronously restores walking before an activity chooses its destination.
activities.addEventListener('click',event=>{const button=(event.target as Element).closest('button');if(button&&button.id!=='activities-close'){activities.close();scene?.mode('walk');}},true);
const prayerOptions=element<HTMLDialogElement>('prayer-options'),prayerDock=element('prayer-dock');
let journey:PrayerJourney|undefined,journeyBusy=false,writingInJourney=false;
const reflections=['오늘은 마음이 머무는 속도로 걸어도 괜찮습니다.','지금 내려놓을 수 있는 작은 걱정 하나를 떠올려 보세요.','대답을 찾지 않고 잠시 쉬어가도 좋습니다.','오늘 자신에게 건네고 싶은 다정한 말을 떠올려 보세요.','마음에 고마운 얼굴 하나를 조용히 담아 보세요.','다 하지 못한 일은 잠시 여기 두어도 괜찮습니다.','서두르지 않는 숨 한 번으로 시작해 보세요.'];
const today=new Date();element('daily-reflection').textContent=reflections[Math.floor(Date.UTC(today.getFullYear(),today.getMonth(),today.getDate())/86400000)%reflections.length];
element('prayer-open').onclick=()=>{if(journey){prayerDock.hidden=false;return;}scene?.mode('journey-options');prayerOptions.showModal();};
element('prayer-options-close').onclick=()=>prayerOptions.close();prayerOptions.onclose=()=>scene?.mode('walk');
function renderPrayer(){
  if(!journey)return;
  const stage=journey.stage;
  element('prayer-step').textContent={candle:'01 · 작은 불빛',seat:'02 · 나의 자리',prayer:'03 · 잠시 기도 · '+journey.remaining+'초',complete:'04 · 고요히 마침'}[stage];
  element('prayer-copy').textContent={candle:'촛불 하나에 오늘의 마음을 담아 보세요.',seat:'빈자리에 앉아 천천히 숨을 고릅니다.',prayer:journey.paused?'잠시 멈췄습니다. 준비되면 이어가세요.':'두 손을 모으고 눈을 감습니다. 어떤 말도 하지 않아도 좋습니다.',complete:'함께한 시간이 끝났습니다. 이 고요함을 가지고 돌아가세요.'}[stage];
  const action=element<HTMLButtonElement>('prayer-action');action.textContent={candle:scene?.holdingCandle?'촛불 놓고 다음으로':'촛불 켜러 가기',seat:scene?.seated?'기도 시작':'빈자리에 앉기',prayer:'기도 마치기',complete:'본당으로 돌아가기'}[stage];action.disabled=journeyBusy||writingInJourney;
  if(writingInJourney)element('prayer-copy').textContent='마음을 털어놓는 방으로 걸어갑니다. 중단하려면 기도 그만하기를 눌러주세요.';
  if(journeyBusy)action.textContent=scene?.effect?'잠시 불빛을 담는 중…':'자리로 걸어가는 중…';
  element('prayer-skip').hidden=writingInJourney||stage==='complete'||stage==='prayer';
  element('prayer-pause').hidden=stage!=='prayer';element('prayer-pause').textContent=journey.paused?'이어서 기도하기':'잠시 멈추기';
  element('prayer-write').hidden=writingInJourney||stage==='complete';element('prayer-end').hidden=stage==='complete';
}
function beginPrayerPose(){if(!journey)return;journey.stage='prayer';scene?.setPlayerPraying(true);renderPrayer();}
function endPrayer(message=true){journey=undefined;journeyBusy=false;writingInJourney=false;prayerDock.hidden=true;scene?.setPlayerPraying(false);if(message)announce('기도를 마쳤습니다. 편히 쉬어가세요.');}
element('prayer-start').onclick=()=>{stopLiturgy();prayerOptions.close();scene?.mode('walk');journey=new PrayerJourney(Number(element<HTMLSelectElement>('prayer-duration').value));prayerDock.hidden=false;renderPrayer();};
element('prayer-action').onclick=()=>{
  if(!journey||!scene)return;
  if(journey.stage==='candle'){
    if(scene.holdingCandle){journeyBusy=true;scene.placeCandle(()=>{if(journey?.stage==='candle'){journey.next();journeyBusy=false;renderPrayer();}});renderPrayer();}else{journeyBusy=true;scene.toggleCandle(()=>{journeyBusy=false;renderPrayer();});renderPrayer();}
  }else if(journey.stage==='seat'){
    if(scene.seated)beginPrayerPose();else{scene.sit();journeyBusy=scene.navigating;renderPrayer();}
  }else if(journey.stage==='prayer'){journey.next();scene.setPlayerPraying(false);renderPrayer();}
  else endPrayer();
};
element('prayer-skip').onclick=()=>{if(!journey)return;scene?.cancelWalk();journeyBusy=false;if(journey.stage==='seat'){if(scene?.seated)beginPrayerPose();else{scene?.sit();journeyBusy=!!scene?.navigating;}}else journey.next();renderPrayer();};
element('prayer-pause').onclick=()=>{if(journey){journey.paused=!journey.paused;renderPrayer();}};
element('prayer-end').onclick=()=>{scene?.cancelWalk();endPrayer();};
element('prayer-write').onclick=()=>{if(journey){journey.paused=true;writingInJourney=true;prayerDock.hidden=true;scene?.setPlayerPraying(false);door.click();}};
function resumePrayerAfterRoom(){if(journey&&writingInJourney){writingInJourney=false;journey.stage='seat';journey.paused=false;journeyBusy=false;prayerDock.hidden=false;renderPrayer();}}
const liturgyPanel=element<HTMLDialogElement>('liturgy-panel'),liturgyDock=element('liturgy-dock');
let liturgyElapsed:number|undefined,liturgyPhase=-1,liturgyAudioPaused=false;
element('liturgy-open').onclick=()=>{scene?.mode('choir');liturgyPanel.showModal();};
element('liturgy-close').onclick=()=>liturgyPanel.close();liturgyPanel.onclose=()=>scene?.mode('walk');
function stopLiturgy(){if(liturgyElapsed!==undefined){liturgyElapsed=undefined;liturgyPhase=-1;liturgyAudioPaused=false;scene?.setLiturgy('');stopChoir();syncBackground();}liturgyDock.hidden=true;}
element('liturgy-start').onclick=()=>{endPrayer(false);stopLiturgy();stopChoir();liturgyPanel.close();scene?.mode('walk');announce('제대 앞으로 이동합니다.');scene?.walkToChoir(()=>{liturgyElapsed=0;liturgyPhase=-1;liturgyDock.hidden=false;});};
element('liturgy-stop').onclick=stopLiturgy;
let experienceLast=performance.now();
function tickExperience(now:number){
  const delta=Math.min(1,(now-experienceLast)/1000);experienceLast=now;
  const available=active&&!document.hidden&&!document.querySelector('dialog[open]')&&!releasing&&!gameRunning&&!quietView;
  if(journey){
    if(journeyBusy&&!scene?.navigating&&!scene?.effect){journeyBusy=false;}
    const prior=journey.stage;journey.tick(delta,available&&!scene?.navigating&&!!scene?.seated);
    if(prior==='prayer'&&(journey.stage==='complete'||!scene?.seated))scene?.setPlayerPraying(false);
    if(prior==='prayer'&&!scene?.seated){journey.stage='seat';}
    if(writingInJourney&&!scene?.navigating&&!confessional.open&&!releasing)resumePrayerAfterRoom();
    prayerDock.hidden=!available;renderPrayer();
  }
  liturgyDock.hidden=liturgyElapsed===undefined||!available;
  if(liturgyElapsed!==undefined&&liturgyPhase===1){
    if(!available&&!choirAudio.paused){choirAudio.pause();liturgyAudioPaused=true;}
    else if(available&&liturgyAudioPaused){liturgyAudioPaused=false;void choirAudio.play().catch(()=>{});}
  }
  if(liturgyElapsed!==undefined&&available){
    liturgyElapsed+=delta;const phase=liturgyElapsed<12?0:liturgyElapsed<48?1:2;
    element('liturgy-phase').textContent=['함께 고개를 숙이는 시간','고요한 빛 · 성가','고요히 마침'][phase]+' · '+Math.max(0,Math.ceil(60-liturgyElapsed))+'초';
    if(phase!==liturgyPhase){
      liturgyPhase=phase;scene?.setLiturgy((['prayer','choir','closing'] as const)[phase]);
      if(phase===1){choirOn=true;scene?.setChoirPlaying(true);choirAudio.currentTime=0;syncBackground();void choirAudio.play().catch(()=>announce('소리를 재생하지 못했습니다. 장면은 조용히 이어집니다.'));}
      if(phase===2){stopChoir();syncBackground();}
    }
    if(liturgyElapsed>=60){stopLiturgy();announce('고요한 시간을 마쳤습니다.');}
  }
  requestAnimationFrame(tickExperience);
}
requestAnimationFrame(tickExperience);
try{scene=new Walkthrough(viewport,announce);scene.onSound=actionSound;reducedMotion.checked=preferences.reduced??scene.motionReduced;scene.setReducedMotion(reducedMotion.checked);scene.setLighting(preferences.light);}
catch{announce('이 브라우저에서 3D를 열 수 없습니다. WebGL 2 설정을 확인해 주세요.',0);}
function enterCathedral(withSound:boolean){

  backgroundOn=withSound;effectVolume.value=String(withSound?preferences.effects:0);
  if(withSound){
    failedTracks.clear();
    ambientVolume.value=String(preferences.volume);
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
exit.onclick=()=>{endPrayer(false);stopLiturgy();stopChoir();stopActionSounds();backgroundOn=false;syncBackground();present(false);enter.focus();};
window.setInterval(updateWalkControls,150);
refreshSceneTitle();
if(scene)void switchScene(selected,false);
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

import './style.css';
import { Walkthrough, type SceneId } from './scene';
import phrases from './phrases.json';
import cathedrals from './cathedrals.json';

function element<T extends HTMLElement>(id:string){const result=document.getElementById(id);if(!result)throw new Error('Missing element '+id);return result as T;}
const viewport=element('viewport'), welcome=element('welcome'), controls=element('controls');
const enter=element<HTMLButtonElement>('enter'), exit=element<HTMLButtonElement>('exit'), sit=element<HTMLButtonElement>('sit'), door=element<HTMLButtonElement>('confess');
const header=element('header'), pointsOpen=element('points-open'), candle=element('candle');
const quiet=element('quiet'), quietExit=element('quiet-exit'), points=element<HTMLDialogElement>('points');
let quietView=false;
const notice=element('notice'), retry=element<HTMLButtonElement>('retry');
const confessional=element<HTMLDialogElement>('confessional'), thought=element<HTMLTextAreaElement>('thought');
const panel=element<HTMLDialogElement>('audio-panel'), select=element<HTMLSelectElement>('phrase');
const play=element<HTMLButtonElement>('play'), stop=element<HTMLButtonElement>('stop'), repeat=element<HTMLInputElement>('repeat'), gap=element<HTMLSelectElement>('gap');
const progress=element<HTMLProgressElement>('progress'), audioStatus=element('audio-status'), translation=element('translation');
const voiceVolume=element<HTMLInputElement>('voice-volume'), ambientVolume=element<HTMLInputElement>('ambient-volume');
const voice=new Audio(), ambient=new Audio(new URL('audio/room.wav',location.href).href);
voice.preload='none';ambient.preload='none';ambient.loop=true;
voice.volume=Number(voiceVolume.value);ambient.volume=0;
let waiting:number|undefined, deadline=0, playVersion=0, active=false, loaded=false, opening=false, noticeTimer=0, scene:Walkthrough|undefined;
let audioState:'idle'|'loading'|'playing'|'paused'|'waiting'|'error'='idle';
const qa=new URLSearchParams(location.search).has('qa');
let selected:SceneId='bariloche';
let retryWalk=false;
let audioProblem='';
const catalog=element<HTMLDialogElement>('catalog');
const catalogList=element('catalog-items');
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

for(const phrase of phrases){const option=new Option(phrase.text,phrase.id);option.lang=phrase.lang;select.add(option);}
function current(){return phrases.find(p=>p.id===select.value)??phrases[0];}
function updateAudio(){
  translation.textContent=current().meaning;
  const elapsed=voice.currentTime||0, duration=Number.isFinite(voice.duration)?voice.duration:0;
  progress.value=duration?Math.min(1,elapsed/duration):0;
  play.textContent=audioState==='playing'?'일시정지':audioState==='loading'?'불러오는 중':'재생';
  play.disabled=audioState==='loading';
  const remaining=Math.max(0,Math.ceil(duration-elapsed));
  const states={idle:'정지',loading:'불러오는 중…',playing:'재생 중 · 남은 시간 '+remaining+'초',paused:'일시정지',waiting:'다음 재생까지 '+Math.max(0,Math.ceil((deadline-performance.now())/1000))+'초',error:audioProblem};
  audioStatus.textContent=states[audioState];
}
function resetVoice(){
  playVersion++;
  clearTimeout(waiting);waiting=undefined;deadline=0;
  voice.pause();if(voice.hasAttribute('src'))voice.currentTime=0;
  audioState='idle';updateAudio();
}
function pauseVoice(){
  if(audioState==='waiting'||audioState==='loading'){resetVoice();return;}
  if(audioState==='playing'){voice.pause();audioState='paused';updateAudio();}
}
async function startVoice(resume=false){
  clearTimeout(waiting);waiting=undefined;
  const version=++playVersion;
  if(!resume){
    voice.src=new URL('audio/'+current().id+'.wav',location.href).href;
  }
  audioState='loading';updateAudio();
  try{await voice.play();if(version!==playVersion)return;audioState='playing';}
  catch{if(version!==playVersion)return;audioState='error';audioProblem='음성을 불러오지 못했습니다. 다시 재생해 주세요.';}
  updateAudio();
}
voice.addEventListener('ended',()=>{
  if(audioState!=='playing')return;
  if(!repeat.checked){resetVoice();return;}
  audioState='waiting';deadline=performance.now()+Number(gap.value)*1000;
  waiting=window.setTimeout(()=>{if(!document.hidden&&repeat.checked)void startVoice();else resetVoice();},Number(gap.value)*1000);
  updateAudio();
});
voice.addEventListener('timeupdate',updateAudio);
window.setInterval(()=>{if(audioState==='waiting')updateAudio();},250);
play.onclick=()=>{if(audioState==='playing')pauseVoice();else void startVoice(audioState==='paused');};
stop.onclick=resetVoice;
select.onchange=resetVoice;
repeat.onchange=()=>{if(!repeat.checked&&audioState==='waiting')resetVoice();};
gap.onchange=()=>{if(audioState==='waiting')resetVoice();};
voiceVolume.oninput=()=>{voice.volume=Number(voiceVolume.value);};
ambientVolume.oninput=()=>{
  ambient.volume=Number(ambientVolume.value);
  if(ambient.volume>0&&!document.hidden)void ambient.play().catch(()=>announce('공간 소리를 재생하지 못했습니다.'));
  else ambient.pause();
};
element('audio-open').onclick=()=>{scene?.mode('audio');panel.showModal();};
element('audio-close').onclick=()=>panel.close();
panel.onclose=()=>{scene?.mode(active?'walk':'welcome');};
document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseVoice();ambient.pause();}});
window.addEventListener('pagehide',()=>{thought.value='';resetVoice();ambient.pause();if(confessional.open)confessional.close();});
window.addEventListener('pageshow',()=>{thought.value='';if(confessional.open)confessional.close();});

function announce(message:string,duration=3000){
  clearTimeout(noticeTimer);notice.textContent=message;notice.hidden=false;
  if(duration)noticeTimer=window.setTimeout(()=>{notice.hidden=true;},duration);
}
function enterRoom(){
  if(confessional.open||!active)return;
  resetVoice();ambient.pause();scene?.mode('room');thought.value='';confessional.showModal();thought.focus();
}
function leaveRoom(){
  thought.value='';
  if(confessional.open)confessional.close();
}
element('release').onclick=leaveRoom;
element('cancel').onclick=leaveRoom;
confessional.oncancel=(event)=>{event.preventDefault();leaveRoom();};
confessional.onclose=()=>{thought.value='';scene?.mode('walk');door.focus();announce('본당으로 돌아왔습니다.');};
sit.onclick=()=>scene?.sit();
door.onclick=()=>{announce('고해소 쪽으로 이동합니다.');scene?.walkToDoor(enterRoom);};
function updateWalkControls(){
  const local=active&&selected==='bariloche';
  pointsOpen.hidden=!local;
  candle.hidden=!local;
  candle.textContent=scene?.candleLit?'촛불 끄기':'촛불 켜기';
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
  if(quietView&&event.key==='Escape'){event.preventDefault();setQuiet(false);}
});
candle.onclick=()=>scene?.toggleCandle(updateWalkControls);
pointsOpen.onclick=()=>{scene?.mode('points');points.showModal();};
element('points-close').onclick=()=>points.close();
let nextPoint:'altar'|'glass'|undefined;
element('point-altar').onclick=()=>{nextPoint='altar';points.close();};
element('point-glass').onclick=()=>{nextPoint='glass';points.close();};
points.onclose=()=>{
  scene?.mode('walk');
  if(nextPoint)scene?.visit(nextPoint);
  nextPoint=undefined;
  pointsOpen.focus();
};
function present(walk:boolean){
  active=walk;welcome.hidden=walk;controls.hidden=!walk;exit.hidden=!walk;scene?.mode(walk?'walk':'welcome');
  if(quietView)setQuiet(false);
  updateWalkControls();
}
async function switchScene(id:SceneId,walk:boolean,url?:string){
  if(opening)return;
  if(!scene){announce('이 브라우저에서 3D를 열 수 없습니다. WebGL 2 설정을 확인해 주세요.',0);return;}
  opening=true;retry.hidden=true;enter.disabled=true;
  resetVoice();ambient.pause();scene.mode('loading');announce('공간을 불러오는 중…',0);
  try{
    if(await scene.load(id,url)){
      selected=id;loaded=true;refreshSceneTitle();present(walk);
      notice.hidden=true;
      if(walk)announce((cathedrals.find(item=>item.id===id)?.name??'전환 검증용 임시 공간')+'에 들어왔습니다.');
    }
  }catch{
    present(active);retryWalk=walk;
    announce('공간을 불러오지 못했습니다. 연결 상태를 확인해 주세요.',0);retry.hidden=false;
    retry.onclick=()=>void switchScene(id,retryWalk);
  }finally{opening=false;enter.disabled=false;}
}
try{scene=new Walkthrough(viewport,announce);}
catch{announce('이 브라우저에서 3D를 열 수 없습니다. WebGL 2 설정을 확인해 주세요.',0);}
enter.onclick=()=>{
  if(!loaded){void switchScene(selected,true);return;}
  resetVoice();ambient.pause();present(true);announce((cathedrals.find(item=>item.id===selected)?.name??'성당')+'에 들어왔습니다.');sit.focus();
};
exit.onclick=()=>{resetVoice();ambient.pause();present(false);enter.focus();};
window.setInterval(updateWalkControls,150);
refreshSceneTitle();
if(scene)void switchScene('bariloche',false);
updateAudio();

if(qa){
  Object.assign(window,{
    inapeaceQA:{
      switchScene,
      status:()=>({scene:selected,position:scene?.position.toArray(),seated:scene?.seated,active,loaded,opening,audioState,room:confessional.open,drawCalls:scene?.drawCalls,geometries:scene?.geometries,textures:scene?.textures,triangles:scene?.triangleCount})
    }
  });
}

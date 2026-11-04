import * as T from 'three';
import { VisitingPeople } from './visitors';
import { disposeObject as unload } from './resources';
import { makeAvatar, makeTaper, makeCandleCorner, makeAltarDecor, makeChoir, makeChristmasTree, makeWallCandles, Particles, enrichMaterials, makeProjections, markerRing, flicker, type Taper } from './sanctuary';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type SceneId = string;
type Bounds = [number, number, number, number];
type Blocker = {x:number; z:number; width:number; depth:number};
type Place = {root:T.Group; bounds:Bounds; blockers:Blocker[]; seats:T.Vector3[]; door:T.Vector3; spawn:T.Vector3};
const loader = new GLTFLoader();
const radius = .28;
const step = .36;
const keyDirections:Record<string,[number,number]> = {w:[0,-1],a:[-1,0],s:[0,1],d:[1,0],arrowup:[0,-1],arrowleft:[-1,0],arrowdown:[0,1],arrowright:[1,0]};

function decode(root:T.Group):Place {
  const place:Place={root,bounds:root.userData.bounds??root.children[0]?.userData.bounds,blockers:[],seats:[],door:new T.Vector3(),spawn:new T.Vector3()};
  if(!Array.isArray(place.bounds)||place.bounds.length!==4||!place.bounds.every(Number.isFinite))throw new Error('장면 경계가 없습니다.');
  const position=new T.Vector3();
  let spawn=false, door=false;
  root.traverse(node=>{
    node.getWorldPosition(position);
    if(/^Collision/.test(node.name))place.blockers.push({x:position.x,z:position.z,width:node.userData.width,depth:node.userData.depth});
    if(/^Seat/.test(node.name))place.seats.push(position.clone());
    if(node.name==='Confessional'){place.door.copy(position);door=true;}
    if(node.name==='Spawn'){place.spawn.copy(position);spawn=true;}
  });
  if(!spawn||!door||!place.seats.length)throw new Error('장면 접점이 없습니다.');
  return place;
}
function makePrivateRoom(){
  const group=new T.Group();group.position.set(29,0,0);group.visible=false;
  const wood=new T.MeshStandardMaterial({color:'#60452f',roughness:.9});
  const plaster=new T.MeshStandardMaterial({color:'#92806a',roughness:1});
  const fabric=new T.MeshStandardMaterial({color:'#48353d',roughness:1});
  const trim=new T.MeshStandardMaterial({color:'#bb975e',metalness:.26,roughness:.55});
  function box(material:T.Material,x:number,y:number,z:number,w:number,h:number,d:number){
    const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);group.add(mesh);
  }
  box(wood,0,-.12,0,5,.24,6);
  box(plaster,0,1.65,-2.65,5,3.3,.18);
  box(wood,2.49,1.65,0,.18,3.3,5.4);
  box(wood,-2.49,1.65,0,.18,3.3,5.4);
  box(fabric,.75,1.5,-2.45,1.35,2.4,.13);
  for(let i=0;i<13;i++)box(wood,.1+i*.112,1.55,-2.33,.046,2.12,.09);
  box(trim,.77,2.68,-2.31,1.6,.1,.19);
  box(wood,-1.28,.5,-1.55,.82,.12,.75);
  box(wood,-1.28,.95,-1.92,.82,.88,.14);
  for(const x of [-1.6,-.95])for(const z of [-1.83,-1.29])box(wood,x,.23,z,.095,.46,.095);
  box(trim,1.92,1.62,-1.65,.48,.07,.29);
  const light=new T.PointLight('#ffcf90',20,8);light.position.set(1.85,2.15,-1.52);group.add(light);
  return group;
}
const barilochePoints = {
  altar: { stop: new T.Vector3(0, 0, -10.7), view: new T.Vector3(0, 2.9, -16) },
  glass: { stop: new T.Vector3(6.3, 0, -5.6), view: new T.Vector3(8.65, 5.95, -7.8) },
  tree: { stop: new T.Vector3(1.4, 0, 17.1), view: new T.Vector3(-6.15,3.7,15.8) },
};
const candleStop = new T.Vector3(6.15, 0, 14.5);
const lighting = {
  day: { sky: '#ffe8c9', sun: '#ffe2b4', hemisphere: 1.85, direct: 2.4, altar: 5 },
  dusk: { sky: '#e6b28a', sun: '#ffad68', hemisphere: 1.2, direct: 1.6, altar: 12 },
  night: { sky: '#a4b8e8', sun: '#939ed0', hemisphere: .76, direct: .55, altar: 16 },
};
export type LightPreset = keyof typeof lighting;

export class Walkthrough {
  readonly renderer:T.WebGLRenderer;
  private scene=new T.Scene();
  private camera=new T.PerspectiveCamera(62,1,.08,85);
  private avatar=makeAvatar();
  private privateRoom=makePrivateRoom();
  private ray=new T.Raycaster();
  private ground=new T.Plane(new T.Vector3(0,1,0),0);
  private place?:Place;
  private request=0;
  private path:T.Vector3[]=[];
  private arrival?:()=>void;
  private keys=new Set<string>();
  private yaw=0;
  private pitch=.16;
  private distance=4.4;
  private pressed?:{x:number;y:number;drag:boolean};
  private frame=0;
  private last=0;
  private notice:(message:string)=>void;
  private observer:ResizeObserver;
  private view='welcome';
  private hemisphere=new T.HemisphereLight('#ffe8c9','#615343');
  private daylight=new T.DirectionalLight('#ffe2b4');
  private altarLight=new T.PointLight('#ffc381',5,9,1.3);
  private lightPreset:LightPreset='day';
  private reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  private particles=new Particles();
  private christmasTree?:ReturnType<typeof makeChristmasTree>;
  private choir?:ReturnType<typeof makeChoir>;
  private backgroundPeople:{avatar:ReturnType<typeof makeAvatar>;seated:boolean;phase:number;taper?:Taper}[]=[];
  private visitors?:VisitingPeople;
  private choirPlaying=false;
  private conductBeat=0;
  setChoirPlaying(playing:boolean){this.choirPlaying=playing;}
  get choirDistance(){return this.position.distanceTo(barilochePoints.altar.stop);}
  walkToChoir(done:()=>void){if(this.candle)this.go(barilochePoints.altar.stop,()=>{this.framing=barilochePoints.altar.view;done();});}
  startConduct(){
    this.clear();this.seated=false;this.position.set(0,0,-10.7);this.avatar.group.rotation.y=0;
    this.mode('conduct');this.choirPlaying=true;
    if(this.choir)this.choir.spotlight.visible=true;
  }
  finishConduct(){
    this.choirPlaying=false;
    if(this.choir)this.choir.spotlight.visible=false;
    this.mode('walk');this.framing=barilochePoints.altar.view;this.cinematic=true;
  }
  conductHit(){this.conductBeat=.3;this.particles.start(this.position.clone().setY(1.1));}
  capturePhoto(front:boolean){
    const position=this.camera.position.clone(),rotation=this.camera.quaternion.clone();
    const visible=this.avatar.group.visible,fov=this.camera.fov;
    try{
      this.avatar.group.visible=true;
      if(front){
        const direction=new T.Vector3(0,0,-1).applyAxisAngle(T.Object3D.DEFAULT_UP,this.avatar.group.rotation.y);
        const focus=this.avatar.rig.getWorldPosition(new T.Vector3()).setY(this.seated?1.28:1.25);
        const eye=focus.clone().addScaledVector(direction,2.8).setY(2.65);
        if(this.valid(eye.x,eye.z,.1)){this.camera.position.copy(eye);this.camera.lookAt(focus);}
        this.camera.fov=42;this.camera.updateProjectionMatrix();
      }
      this.renderer.render(this.scene,this.camera);
      return this.renderer.domElement.toDataURL('image/png');
    }finally{
      this.camera.position.copy(position);this.camera.quaternion.copy(rotation);this.camera.fov=fov;this.camera.updateProjectionMatrix();this.avatar.group.visible=visible;
    }
  }
  private altarDecor?:ReturnType<typeof makeAltarDecor>;
  private wallCandles?:ReturnType<typeof makeWallCandles>;
  private projections?:ReturnType<typeof makeProjections>;
  private markers:T.Mesh[]=[];
  private carried?:Taper;
  private handLight=new T.PointLight('#ffc07c',3,3.8,1.5);
  private placed:Taper[]=[];
  private ceremony?:{kind:'veil'|'candle'|'release';elapsed:number;duration:number;done?:()=>void};
  private cinematic=false;
  private cameraTarget=new T.Vector3();
  private cameraEye=new T.Vector3();
  private frames:number[]=[];
  onSound:(name:'candle'|'sit'|'room'|'release')=>void=()=>{};

  get worshipperCount(){return this.backgroundPeople.length;}
  get movingVisitorStatus(){return this.visitors?.status??[];}
  get totalVisitorCount(){return this.backgroundPeople.length+(this.visitors?.people.length??0);}
  get veiledWorshipperCount(){return this.backgroundPeople.filter(person=>person.avatar.veil.visible).length;}
  get wallCandleCount(){return this.wallCandles?.tapers.length??0;}
  get treePresent(){return !!this.christmasTree;}
  get veilOn(){return this.avatar.veil.visible;}
  get holdingCandle(){return !!this.carried;}
  get placedCandles(){return this.placed.length;}
  get effect(){return this.ceremony?.kind??'';}
  get motionReduced(){return this.reducedMotion;}
  get frameTime(){return this.frames.length?this.frames.reduce((a,b)=>a+b,0)/this.frames.length:0;}
  setReducedMotion(reduced:boolean){this.reducedMotion=reduced;}

  toggleVeil(){
    if(this.blocked||!this.candle)return;
    this.clear();this.framing=undefined;this.cinematic=true;
    this.avatar.veil.visible=!this.avatar.veil.visible;
    this.particles.start(this.position.clone().setY(.9));
    this.ceremony={kind:'veil',elapsed:0,duration:this.reducedMotion?.25:1.5};
    this.notice(this.veilOn?'미사포를 썼습니다.':'미사포를 벗었습니다.');
  }
  releaseThought(done:()=>void){
    this.clear();this.framing=undefined;
    if(this.reducedMotion){done();return;}
    this.view='release';this.privateRoom.visible=false;
    if(this.place)this.place.root.visible=true;
    this.particles.start(new T.Vector3(0,1.3,7),true);
    this.cameraEye.set(1.5,1.8,10);this.cameraTarget.set(0,3,7);
    this.ceremony={kind:'release',elapsed:0,duration:3.8,done};this.onSound('release');
  }
  skipEffect(){
    const done=this.ceremony?.done;
    this.ceremony=undefined;this.particles.stop();this.cinematic=false;done?.();
  }
  placeCandle(){
    if(this.blocked||!this.candle||!this.carried)return;
    this.go(candleStop,()=>{
      const taper=this.carried;if(!taper||!this.candle)return;
      this.carried=undefined;this.placed.push(taper);
      if(this.placed.length>8){const old=this.placed.shift();if(old)unload(old.root);}
      this.candle.group.add(taper.root);
      taper.root.position.set(-.65+(this.placed.length-1)%4*.4,1.25,-.12+Math.floor((this.placed.length-1)/4)*.24);
      taper.root.rotation.set(0,0,0);this.handLight.visible=false;
      this.cinematic=true;this.particles.start(this.candle.group.position.clone().setY(1.5));
      this.ceremony={kind:'candle',elapsed:0,duration:1.4};this.onSound('candle');
      this.notice('촛대에 초를 놓았습니다.');
    });
  }
  hotspots(){
    if(this.view!=='walk'||this.quiet||!this.candle||this.ceremony)return [];
    const spots=[
      {id:'candle',label:this.carried?'촛불 놓기':'촛불 켜기',position:candleStop},
      {id:'confess',label:'고해소',position:this.place!.door},
      {id:'choir',label:'성가대 감상',position:barilochePoints.altar.stop},
      {id:'tree',label:'크리스마스 트리',position:barilochePoints.tree.stop},
      {id:'sit',label:this.seated?'일어나기':'앉기',position:[...this.place!.seats].sort((a,b)=>a.distanceToSquared(this.position)-b.distanceToSquared(this.position))[0]},
    ];
    return spots.filter(spot=>spot.position.distanceTo(this.position)<5).flatMap(spot=>{
      const p=spot.position.clone().setY(.65).project(this.camera);
      return p.z>0&&p.z<1&&Math.abs(p.x)<.9&&Math.abs(p.y)<.7?[{id:spot.id,label:spot.label,x:(p.x+1)*50,y:(1-p.y)*50}]:[];
    });
  }

  setLighting(preset:LightPreset){
    this.lightPreset=preset;
  }
  private updateLighting(delta:number){
    const preset=this.view==='room'?'day':this.lightPreset;
    const settings=lighting[preset],blend=this.reducedMotion?1:1-Math.exp(-delta*4);
    this.hemisphere.color.lerp(new T.Color(settings.sky),blend);
    this.hemisphere.intensity=T.MathUtils.lerp(this.hemisphere.intensity,settings.hemisphere,blend);
    this.daylight.color.lerp(new T.Color(settings.sun),blend);
    this.daylight.intensity=T.MathUtils.lerp(this.daylight.intensity,settings.direct,blend);
    this.altarLight.intensity=T.MathUtils.lerp(this.altarLight.intensity,settings.altar,blend);
    this.projections?.setLight(preset,blend);
  }
  private candle?: ReturnType<typeof makeCandleCorner>;
  private framing?: T.Vector3;
  private quiet=false;
  seated=false;

  get candleLit(){return !!this.carried||this.placed.length>0;}

  toggleCandle(onChange:()=>void){
    if(this.blocked||!this.candle)return;
    if(this.carried){this.placeCandle();return;}
    this.go(candleStop,()=>{
      if(!this.candle||this.carried)return;
      this.carried=makeTaper();this.avatar.hand.add(this.carried.root);
      this.carried.root.rotation.x=-.9;this.handLight.visible=true;
      this.framing=undefined;this.cinematic=true;
      this.particles.start(this.position.clone().setY(1));
      this.ceremony={kind:'candle',elapsed:0,duration:1.5};this.onSound('candle');
      this.notice('촛불을 켰습니다. 들고 걷거나 앉아 보세요.');onChange();
    });
  }

  visit(point:keyof typeof barilochePoints){
    if(!this.candle)return;
    const {stop,view}=barilochePoints[point];
    this.go(stop,()=>{this.framing=view;this.notice({altar:'제대 앞에 도착했습니다.',glass:'스테인드글라스 가까이에 도착했습니다.',tree:'본당 뒤편의 크리스마스 트리입니다.'}[point]);});
  }

  setQuiet(quiet:boolean){
    this.quiet=quiet;
    if(quiet&&this.seated)this.framing=barilochePoints.altar.view;
    this.clear();
  }
  constructor(host:HTMLElement, notice:(message:string)=>void){
    this.notice=notice;
    this.renderer=new T.WebGLRenderer({antialias:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    this.renderer.toneMapping=T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.18;
    this.scene.background=new T.Color('#201a15');
    this.scene.fog=new T.FogExp2('#30251c',.022);
    this.daylight.position.set(-6,12,-11);
    this.altarLight.position.set(0,4.3,-13.7);
    this.altarLight.visible=false;
    this.handLight.visible=false;this.scene.add(this.handLight,this.particles.root,this.hemisphere,this.daylight,this.altarLight);
    this.setLighting('day');
    const fill=new T.DirectionalLight('#a0bbd9',.65);fill.position.set(7,5,9);this.scene.add(fill,this.avatar.group,this.privateRoom);
    enrichMaterials(this.privateRoom);
    const canvas=this.renderer.domElement;
    host.append(canvas);
    this.observer=new ResizeObserver(()=>{const w=Math.max(host.clientWidth,1), h=Math.max(host.clientHeight,1);this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();});
    this.observer.observe(host);
    canvas.addEventListener('pointerdown',this.pointerDown);
    canvas.addEventListener('pointermove',this.pointerMove);
    canvas.addEventListener('pointerup',this.pointerUp);
    canvas.addEventListener('pointercancel',this.pointerCancel);
    canvas.addEventListener('wheel',this.wheel,{passive:false});
    window.addEventListener('keydown',this.keyDown);
    window.addEventListener('keyup',this.keyUp);
    window.addEventListener('blur',this.clear);
    this.frame=requestAnimationFrame(this.tick);
  }
  get position(){return this.avatar.group.position;}
  get drawCalls(){return this.renderer.info.render.calls;}
  get geometries(){return this.renderer.info.memory.geometries;}
  get textures(){return this.renderer.info.memory.textures;}
  get triangleCount(){return this.renderer.info.render.triangles;}
  async load(id:SceneId, url=new URL('scenes/'+id+'.glb',location.href).href){
    const request=++this.request;
    const gltf=await loader.loadAsync(url);
    if(request!==this.request){unload(gltf.scene);return false;}
    let next:Place;
    try{next=decode(gltf.scene);}catch(error){unload(gltf.scene);throw error;}
    this.skipEffect();
    if(this.carried)unload(this.carried.root);
    this.carried=undefined;this.placed=[];this.markers=[];this.backgroundPeople=[];this.visitors=undefined;this.choirPlaying=false;this.avatar.veil.visible=false;
    this.handLight.visible=false;
    if(this.place)unload(this.place.root);
    this.place=next;this.scene.add(next.root);
    this.candle=id==='bariloche'?makeCandleCorner():undefined;
    if(this.candle){
      enrichMaterials(next.root);
      this.altarDecor=makeAltarDecor();next.root.add(this.altarDecor.group);
      this.choir=makeChoir();next.root.add(this.choir.group);
      this.christmasTree=makeChristmasTree();next.root.add(this.christmasTree.group);
      next.blockers.push({x:-6.15,z:15.8,width:4.15,depth:4.15});
      const colors=['#68576d','#6a6d50','#435d72','#755348','#9c8f77','#594e62','#8f5962','#5e766e','#52567b','#8b7453'];
      for(let i=0;i<20;i++){
        const avatar=makeAvatar(colors[i%colors.length]),seated=i>=8;
        avatar.veil.visible=i%2===0;
        if(seated){
          avatar.group.position.copy(next.seats[((i-8)*5+1)%next.seats.length]);
          avatar.rig.scale.y=.78;avatar.rig.position.z=.77;avatar.legs.forEach(leg=>leg.rotation.x=-1.2);
        }else avatar.group.position.set(i%2?6.5:-6.5,0,9-Math.floor(i/2)*6);
        avatar.group.scale.setScalar(.94);avatar.group.rotation.y=0;next.root.add(avatar.group);
        this.backgroundPeople.push({avatar,seated,phase:i});
      }
      const freeSeats=next.seats.filter(seat=>!this.backgroundPeople.some(person=>person.seated&&person.avatar.group.position.distanceToSquared(seat)<.1));
      const homes=freeSeats.filter((_,index)=>index%2===0).slice(0,3);
      this.visitors=new VisitingPeople(homes,new T.Vector3(0,0,-11.1),new T.Vector3(6.15,0,11.85),(target,start,avoid=[])=>this.route(target,start,[...avoid,...this.backgroundPeople.filter(person=>!person.seated).map(person=>person.avatar.group.position)]),(x,z)=>this.valid(x,z)&&!this.backgroundPeople.some(person=>!person.seated&&Math.hypot(x-person.avatar.group.position.x,z-person.avatar.group.position.z)<.55));
      next.root.add(this.visitors.root);
      next.root.add(this.candle.group);
      next.blockers.push({x:6.15,z:13.25,width:1.9,depth:.8});
      this.wallCandles=makeWallCandles();next.root.add(this.wallCandles.group);
      this.projections=makeProjections();next.root.add(this.projections.group);
      for(const target of [candleStop,next.door,barilochePoints.altar.stop]){
        const ring=markerRing();ring.position.x=target.x;ring.position.z=target.z;next.root.add(ring);this.markers.push(ring);
      }
    }else{
      this.christmasTree=undefined;this.choir=undefined;this.altarDecor=undefined;this.wallCandles=undefined;this.projections=undefined;
    }
    this.setLighting('day');
    this.altarLight.visible=!!this.candle;
    this.framing=undefined;
    this.quiet=false;
    this.position.copy(next.spawn);this.avatar.group.rotation.y=0;
    this.seated=false;this.yaw=0;this.pitch=.16;this.clear();
    return true;
  }
  mode(view:string){
    if(view!=='walk'&&view!=='audio'&&view!=='catalog'&&view!=='points'&&view!=='reflection'&&view!=='photo'&&view!=='choir')this.framing=undefined;

    this.altarLight.visible=!!this.candle&&view!=='room';
    if(view==='room'){this.cameraEye.set(28.15,1.43,2.47);this.cameraTarget.set(30.05,1.24,-2.2);}
    if(view==='welcome'||view==='loading')this.skipEffect();
    this.view=view;this.avatar.group.visible=view==='walk';this.privateRoom.visible=view==='room';
    if(this.place)this.place.root.visible=view!=='room';
    this.clear();
  }
  get blocked(){return this.view!=='walk'||!this.place||this.quiet||!!this.ceremony;}
  private clear=()=>{this.keys.clear();this.path=[];this.arrival=undefined;this.pressed=undefined;};
  private keyDown=(e:KeyboardEvent)=>{
    const k=e.key.toLowerCase();
    if(this.blocked||e.altKey||e.metaKey||e.ctrlKey||!(k in keyDirections)||e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.target instanceof HTMLSelectElement)return;
    e.preventDefault();this.framing=undefined;this.cinematic=false;this.path=[];this.arrival=undefined;this.keys.add(k);
  };
  private keyUp=(e:KeyboardEvent)=>{this.keys.delete(e.key.toLowerCase());};
  private pointerDown=(e:PointerEvent)=>{if(this.blocked||e.button!==0)return;this.pressed={x:e.clientX,y:e.clientY,drag:false};this.renderer.domElement.setPointerCapture(e.pointerId);};
  private pointerMove=(e:PointerEvent)=>{
    if(!this.pressed)return;
    const dx=e.clientX-this.pressed.x,dy=e.clientY-this.pressed.y;
    if(!this.pressed.drag&&Math.hypot(dx,dy)<5)return;
    this.framing=undefined;this.cinematic=false;
    this.yaw-=dx*.006;this.pitch=T.MathUtils.clamp(this.pitch+dy*.005,-.2,.65);
    this.pressed={x:e.clientX,y:e.clientY,drag:true};
  };
  private pointerUp=(e:PointerEvent)=>{
    const press=this.pressed;this.pressed=undefined;
    if(!press||press.drag||this.blocked)return;
    const rect=this.renderer.domElement.getBoundingClientRect();
    const normalized=new T.Vector2(2*(e.clientX-rect.left)/rect.width-1,1-2*(e.clientY-rect.top)/rect.height);
    this.ray.setFromCamera(normalized,this.camera);
    const target=this.ray.ray.intersectPlane(this.ground,new T.Vector3());
    if(target)this.go(target);
  };
  private pointerCancel=()=>{this.pressed=undefined;};
  private wheel=(e:WheelEvent)=>{if(this.blocked)return;e.preventDefault();this.framing=undefined;this.cinematic=false;this.distance=T.MathUtils.clamp(this.distance+e.deltaY*.005,2.4,6.6);};
  private valid(x:number,z:number,pad=radius){
    if(!this.place)return false;
    const [left,right,front,back]=this.place.bounds;
    if(x<left+pad||x>right-pad||z<front+pad||z>back-pad)return false;
    return !this.place.blockers.some(b=>Math.abs(x-b.x)<b.width/2+pad&&Math.abs(z-b.z)<b.depth/2+pad);
  }
  private route(target:T.Vector3,start=this.position,avoid:T.Vector3[]=[]){
    const valid=(x:number,z:number)=>this.valid(x,z)&&!avoid.some(point=>Math.hypot(x-point.x,z-point.z)<.62);
    if(!this.place||!valid(target.x,target.z))return [];
    const [left,right,front,back]=this.place.bounds;
    const width=Math.ceil((right-left)/step), depth=Math.ceil((back-front)/step);
    const cell=(x:number,z:number)=>z*width+x;
    const point=(i:number)=>new T.Vector3(left+(i%width+.5)*step,0,front+(Math.floor(i/width)+.5)*step);
    const closest=(p:T.Vector3)=>{
      const x=Math.floor((p.x-left)/step),z=Math.floor((p.z-front)/step);
      let found=-1,best=Infinity;
      for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
        if(x+dx<0||x+dx>=width||z+dz<0||z+dz>=depth)continue;
        const i=cell(x+dx,z+dz),q=point(i),dist=q.distanceToSquared(p);
        if(dist<best&&valid(q.x,q.z)){found=i;best=dist;}
      }
      return found;
    };
    const source=closest(start),end=closest(target);
    if(source<0||end<0)return [];
    const prev=new Int32Array(width*depth).fill(-1);prev[source]=source;
    const queue=[source];
    for(let cursor=0;cursor<queue.length&&prev[end]===-1;cursor++){
      const i=queue[cursor],x=i%width,z=Math.floor(i/width);
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
        if(x+dx<0||x+dx>=width||z+dz<0||z+dz>=depth)continue;
        const n=cell(x+dx,z+dz),p=point(n);
        if(prev[n]!==-1||!valid(p.x,p.z))continue;
        const mid=p.clone().lerp(point(i),.5);
        if(!valid(mid.x,mid.z))continue;
        prev[n]=i;queue.push(n);
      }
    }
    if(prev[end]===-1)return [];
    const path=[target.clone()];
    for(let i=end;i!==source;i=prev[i])path.push(point(i));
    path.push(point(source));
    return path.reverse();
  }
  private go(target:T.Vector3, onArrival?:()=>void){
    if(this.blocked)return;
    this.seated=false;this.cinematic=false;this.framing=undefined;this.clear();
    if(this.position.distanceTo(target)<.18){onArrival?.();return;}
    this.path=this.route(target);
    if(!this.path.length){this.notice('이동할 수 있는 바닥을 선택해 주세요.');return;}
    this.arrival=onArrival;
  }
  sit(){
    if(this.blocked||!this.place)return;
    if(this.seated){this.seated=false;this.cinematic=false;this.framing=undefined;this.notice('일어났습니다.');return;}
    const nearest=this.place.seats.filter(seat=>!this.backgroundPeople.some(person=>person.seated&&person.avatar.group.position.distanceToSquared(seat)<.1)&&!this.visitors?.reservedSeats.some(home=>home.distanceToSquared(seat)<.1)).sort((a,b)=>a.distanceToSquared(this.position)-b.distanceToSquared(this.position))[0];
    if(!nearest){this.notice('빈 좌석이 없습니다.');return;}
    this.go(nearest,()=>{this.seated=true;if(this.candle){this.cinematic=true;this.framing=barilochePoints.altar.view;}this.onSound('sit');this.avatar.group.rotation.y=0;this.notice('잠시 앉아 쉬어가세요.');});
  }
  walkToDoor(enter:()=>void){if(this.place)this.go(this.place.door,enter);}
  private move(dx:number,dz:number){
    const x=this.position.x,z=this.position.z;
    if(this.valid(x+dx,z))this.position.x+=dx;
    if(this.valid(this.position.x,z+dz))this.position.z+=dz;
    return Math.hypot(this.position.x-x,this.position.z-z);
  }
  private tick=(now:number)=>{
    const elapsed=(now-(this.last||now))/1000,delta=Math.min(.05,elapsed);this.last=now;
    if(elapsed>0&&elapsed<.25){this.frames.push(elapsed*1000);if(this.frames.length>120)this.frames.shift();}
    this.updateLighting(delta);
    this.particles.tick(delta,this.reducedMotion);
    if(this.ceremony){
      this.ceremony.elapsed+=delta;
      if(this.ceremony.elapsed>=this.ceremony.duration){const done=this.ceremony.done;this.ceremony=undefined;done?.();}
    }
    const seconds=now/1000;
    this.projections?.tick(seconds,this.reducedMotion);
    this.conductBeat=Math.max(0,this.conductBeat-delta);
    if(this.choir){
      this.choir.people.forEach((person,i)=>{
        person.rig.rotation.z=this.choirPlaying&&!this.reducedMotion?Math.sin(seconds*2+i*.3)*.025:0;
        person.arms.forEach(arm=>arm.rotation.x=.65+(this.choirPlaying?Math.sin(seconds*3+i)*.04:0));
      });
      for(const person of this.backgroundPeople){
        if(person.taper)flicker(person.taper,seconds,person.phase,this.reducedMotion);
        person.avatar.rig.rotation.z=this.reducedMotion?0:Math.sin(seconds*.65+person.phase)*.012;

      }
    }
    this.visitors?.tick(delta,seconds,this.reducedMotion||!['walk','welcome'].includes(this.view),this.position);
    this.christmasTree?.tick(seconds,this.reducedMotion);
    this.wallCandles?.tapers.forEach((taper,i)=>flicker(taper,seconds,i*1.7,this.reducedMotion));
    if(this.candle){
      this.candle.tapers.forEach((taper,i)=>flicker(taper,seconds,i,this.reducedMotion));
      this.altarDecor?.tapers.forEach((taper,i)=>flicker(taper,seconds,i,this.reducedMotion));
      this.placed.forEach((taper,i)=>flicker(taper,seconds,i,this.reducedMotion));
      this.markers.forEach(ring=>{const nearby=ring.position.distanceTo(this.position)<5;ring.visible=nearby&&this.view==='walk'&&!this.quiet;ring.scale.setScalar(this.reducedMotion?1:1+Math.sin(seconds*2)*.05);});
    }
    if(this.carried){flicker(this.carried,seconds,0,this.reducedMotion);this.carried.root.getWorldPosition(this.handLight.position);this.handLight.position.y+=.4;}
    this.handLight.visible=!!this.carried&&this.view==='walk';
    this.avatar.arms[1].rotation.x=this.carried?.9:0;
    if(this.view==='conduct'){
      this.avatar.arms[0].rotation.x=.8+Math.sin(seconds*4)*.22;
      this.avatar.arms[1].rotation.x=1.1+this.conductBeat*1.2;
    }else this.avatar.arms[0].rotation.x=0;
    this.avatar.veil.scale.y=this.ceremony?.kind==='veil'&&!this.reducedMotion?.9+.1*Math.min(1,this.ceremony.elapsed/.6):1;
    let moved=0;
    if(!this.blocked){
      const direction=new T.Vector3();
      for(const key of this.keys){const [x,z]=keyDirections[key];direction.x+=x;direction.z+=z;}
      if(direction.lengthSq()){this.seated=false;direction.normalize().applyAxisAngle(T.Object3D.DEFAULT_UP,this.yaw);moved=this.move(direction.x*delta*3.7,direction.z*delta*3.7);}
      else if(this.path.length){
        direction.subVectors(this.path[0],this.position);
        if(direction.length()<.055){this.path.shift();if(!this.path.length){const done=this.arrival;this.arrival=undefined;done?.();}}
        else{const speed=Math.min(delta*4.35,direction.length());direction.normalize();moved=this.move(direction.x*speed,direction.z*speed);if(!moved&&delta>0){this.clear();this.notice('통로가 막혔습니다. 다른 위치를 선택해 주세요.');}}
      }
      if(moved)this.avatar.group.rotation.y=Math.atan2(-direction.x,-direction.z);
      this.avatar.rig.scale.y=this.seated?.76:1;
      this.avatar.rig.position.z=this.seated?.77:0;
      this.avatar.legs.forEach((leg,i)=>{leg.rotation.x=this.seated?-1.24:moved?Math.sin(now*.012+i*Math.PI)*.42:0;});
    }
    const desiredEye=new T.Vector3(),desiredTarget=new T.Vector3();
    if(this.view==='conduct'){
      desiredEye.set(-2.5,2.5,-8);desiredTarget.set(0,1.8,-16);
    }else if(this.view==='release'){
      const progress=this.ceremony?this.ceremony.elapsed/this.ceremony.duration:1;
      desiredEye.set(1.5,1.8+progress*1.4,10);
      desiredTarget.set(0,3+progress*5,7);
    }else if(this.view==='welcome'){
      if(this.candle){
        desiredEye.set(-1,2.45,18);desiredTarget.set(.1,2.6,-15);
      }else{
        desiredEye.set(-2.25,2.65,16.9);desiredTarget.set(2.5,3.55,-15);
      }
    }else if(this.view==='room'){
      desiredEye.set(28.15,1.43,2.47);desiredTarget.set(30.05,1.24,-2.2);
    }else if(this.cinematic&&!this.quiet){
      desiredEye.copy(this.position).add(new T.Vector3(-1.8,this.seated?1.7:2.05,2.6));
      desiredTarget.copy(this.position).add(new T.Vector3(.1,1.1,-.4));
      while(!this.valid(desiredEye.x,desiredEye.z,.1)&&desiredEye.distanceTo(this.position)>.8)desiredEye.lerp(this.position.clone().setY(1.7),.16);
    }else if(this.framing){
      const eye=this.position.clone().setY(this.seated?1.28:1.63);
      desiredEye.copy(eye);desiredTarget.copy(this.framing);
    }else{
      const center=this.position.clone().add(new T.Vector3(0,this.seated?.65:.88,0));
      const cameraOffset=new T.Vector3(Math.sin(this.yaw),this.pitch+.19,Math.cos(this.yaw));
      let distance=this.distance;
      while(distance>.65&&!this.valid(center.x+cameraOffset.x*distance,center.z+cameraOffset.z*distance,.12))distance-=.16;
      desiredEye.copy(center).addScaledVector(cameraOffset,distance);desiredTarget.copy(center).add(new T.Vector3(0,.2,0));
    }
    const blend=this.reducedMotion||!this.cameraEye.lengthSq()?1:1-Math.exp(-delta*7);
    this.cameraEye.lerp(desiredEye,blend);this.cameraTarget.lerp(desiredTarget,blend);
    this.camera.position.copy(this.cameraEye);this.camera.lookAt(this.cameraTarget);
    this.avatar.group.visible=this.view!=='room'&&this.view!=='release'&&this.view!=='welcome'&&(!this.framing||this.cinematic&&!this.quiet);
    this.renderer.render(this.scene,this.camera);this.frame=requestAnimationFrame(this.tick);
  };
  dispose(){
    this.request++;cancelAnimationFrame(this.frame);this.observer.disconnect();
    window.removeEventListener('keydown',this.keyDown);window.removeEventListener('keyup',this.keyUp);window.removeEventListener('blur',this.clear);
    if(this.place)unload(this.place.root);unload(this.avatar.group);unload(this.privateRoom);unload(this.particles.root);
    const canvas=this.renderer.domElement;
    canvas.removeEventListener('pointerdown',this.pointerDown);canvas.removeEventListener('pointermove',this.pointerMove);
    canvas.removeEventListener('pointerup',this.pointerUp);canvas.removeEventListener('pointercancel',this.pointerCancel);canvas.removeEventListener('wheel',this.wheel);
    this.renderer.dispose();canvas.remove();
  }
}

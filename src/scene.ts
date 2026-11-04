import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type SceneId = string;
type Bounds = [number, number, number, number];
type Blocker = {x:number; z:number; width:number; depth:number};
type Place = {root:T.Group; bounds:Bounds; blockers:Blocker[]; seats:T.Vector3[]; door:T.Vector3; spawn:T.Vector3};
const loader = new GLTFLoader();
const radius = .28;
const step = .36;
const keyDirections:Record<string,[number,number]> = {w:[0,-1],a:[-1,0],s:[0,1],d:[1,0],arrowup:[0,-1],arrowleft:[-1,0],arrowdown:[0,1],arrowright:[1,0]};

function unload(group:T.Group) {
  const geometry=new Set<T.BufferGeometry>(), materials=new Set<T.Material>();
  group.traverse(node=>{
    if (!(node instanceof T.Mesh)) return;
    geometry.add(node.geometry);
    for(const m of Array.isArray(node.material)?node.material:[node.material])materials.add(m);
  });
  geometry.forEach(g=>g.dispose());
  materials.forEach(m=>{for(const value of Object.values(m))if(value instanceof T.Texture)value.dispose();m.dispose();});
  group.removeFromParent();
}
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
function makeAvatar(){
  const group=new T.Group();
  const rig=new T.Group();group.add(rig);
  const coat=new T.MeshStandardMaterial({color:0x52616b});
  const head=new T.MeshStandardMaterial({color:0xb99c79});
  const hair=new T.MeshStandardMaterial({color:0x292220});
  function add(geometry:T.BufferGeometry, material:T.Material, x:number,y:number,z:number){
    const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);rig.add(mesh);return mesh;
  }
  add(new T.CapsuleGeometry(.27,.53,5,12),coat,0,.9,0);
  add(new T.SphereGeometry(.19,16,12),head,0,1.55,0);
  add(new T.SphereGeometry(.195,16,10,0,Math.PI*2,0,Math.PI*.63),hair,0,1.59,.025);
  const legs=[-.12,.12].map(x=>add(new T.CapsuleGeometry(.09,.35,4,8),hair,x,.33,0));
  return {group,rig,legs};
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
};
const candleStop = new T.Vector3(-6.5, 0, 12.25);

function makeCandle() {
  const stand = new T.Group();
  stand.position.set(-7.35, 0, 12.25);
  const brass = new T.MeshStandardMaterial({ color: '#8b6239', metalness: .65, roughness: .36 });
  const wax = new T.MeshStandardMaterial({ color: '#efe1bc' });
  function add(geometry: T.BufferGeometry, material: T.Material, y: number) {
    const mesh = new T.Mesh(geometry, material);
    mesh.position.y = y;
    stand.add(mesh);
    return mesh;
  }
  add(new T.CylinderGeometry(.18, .28, .12, 24), brass, .06);
  add(new T.CylinderGeometry(.065, .09, .9, 16), brass, .52);
  add(new T.CylinderGeometry(.28, .21, .08, 24), brass, 1);
  add(new T.CylinderGeometry(.068, .074, .23, 16), wax, 1.15);
  const flame = add(new T.SphereGeometry(.055, 16, 12), new T.MeshBasicMaterial({ color: '#ffcb72' }), 1.33);
  flame.scale.y = 1.85;
  flame.visible = false;
  const glow = new T.PointLight('#ffad54', 2, 2.4);
  glow.position.y = 1.34;
  glow.visible = false;
  stand.add(glow);
  return { stand, flame, glow };
}

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
  private candle?: ReturnType<typeof makeCandle>;
  private framing?: T.Vector3;
  private quiet=false;
  seated=false;

  get candleLit(){return this.candle?.flame.visible??false;}

  toggleCandle(onChange:()=>void){
    const candle=this.candle;
    if(!candle||this.blocked)return;
    const toggle=()=>{
      candle.glow.visible=candle.flame.visible=!candle.flame.visible;
      this.framing=candle.stand.position.clone().setY(1.24);
      this.notice(this.candleLit?'촛불을 켰습니다. 잠시 머물러 보세요.':'촛불을 껐습니다.');
      onChange();
    };
    if(this.position.distanceTo(candleStop)<.3){this.clear();toggle();}
    else this.go(candleStop,toggle);
  }

  visit(point:keyof typeof barilochePoints){
    if(!this.candle)return;
    const {stop,view}=barilochePoints[point];
    this.go(stop,()=>{this.framing=view;this.notice(point==='altar'?'제대 앞에 도착했습니다.':'스테인드글라스 가까이에 도착했습니다.');});
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
    const hemi=new T.HemisphereLight('#ffe8c9','#615343',1.85);this.scene.add(hemi);
    const sun=new T.DirectionalLight('#ffe2b4',2.4);sun.position.set(-6,12,-11);this.scene.add(sun);
    const fill=new T.DirectionalLight('#a0bbd9',.65);fill.position.set(7,5,9);this.scene.add(fill,this.avatar.group,this.privateRoom);
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
    if(this.place)unload(this.place.root);
    this.place=next;this.scene.add(next.root);
    this.candle=id==='bariloche'?makeCandle():undefined;
    if(this.candle){
      next.root.add(this.candle.stand);
      next.blockers.push({x:-7.35,z:12.25,width:.56,depth:.56});
    }
    this.framing=undefined;
    this.quiet=false;
    this.position.copy(next.spawn);this.avatar.group.rotation.y=0;
    this.seated=false;this.yaw=0;this.pitch=.16;this.clear();
    return true;
  }
  mode(view:string){
    if(view!=='walk'&&view!=='audio'&&view!=='catalog'&&view!=='points')this.framing=undefined;
    this.view=view;this.avatar.group.visible=view==='walk';this.privateRoom.visible=view==='room';
    if(this.place)this.place.root.visible=view!=='room';
    this.clear();
  }
  get blocked(){return this.view!=='walk'||!this.place||this.quiet;}
  private clear=()=>{this.keys.clear();this.path=[];this.arrival=undefined;this.pressed=undefined;};
  private keyDown=(e:KeyboardEvent)=>{
    const k=e.key.toLowerCase();
    if(this.blocked||e.altKey||e.metaKey||e.ctrlKey||!(k in keyDirections)||e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.target instanceof HTMLSelectElement)return;
    e.preventDefault();this.framing=undefined;this.path=[];this.arrival=undefined;this.keys.add(k);
  };
  private keyUp=(e:KeyboardEvent)=>{this.keys.delete(e.key.toLowerCase());};
  private pointerDown=(e:PointerEvent)=>{if(this.blocked||e.button!==0)return;this.pressed={x:e.clientX,y:e.clientY,drag:false};this.renderer.domElement.setPointerCapture(e.pointerId);};
  private pointerMove=(e:PointerEvent)=>{
    if(!this.pressed)return;
    const dx=e.clientX-this.pressed.x,dy=e.clientY-this.pressed.y;
    if(!this.pressed.drag&&Math.hypot(dx,dy)<5)return;
    this.framing=undefined;
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
  private wheel=(e:WheelEvent)=>{if(this.blocked)return;e.preventDefault();this.framing=undefined;this.distance=T.MathUtils.clamp(this.distance+e.deltaY*.005,2.4,6.6);};
  private valid(x:number,z:number,pad=radius){
    if(!this.place)return false;
    const [left,right,front,back]=this.place.bounds;
    if(x<left+pad||x>right-pad||z<front+pad||z>back-pad)return false;
    return !this.place.blockers.some(b=>Math.abs(x-b.x)<b.width/2+pad&&Math.abs(z-b.z)<b.depth/2+pad);
  }
  private route(target:T.Vector3){
    if(!this.place||!this.valid(target.x,target.z))return [];
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
        if(dist<best&&this.valid(q.x,q.z)){found=i;best=dist;}
      }
      return found;
    };
    const source=closest(this.position),end=closest(target);
    if(source<0||end<0)return [];
    const prev=new Int32Array(width*depth).fill(-1);prev[source]=source;
    const queue=[source];
    for(let cursor=0;cursor<queue.length&&prev[end]===-1;cursor++){
      const i=queue[cursor],x=i%width,z=Math.floor(i/width);
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
        if(x+dx<0||x+dx>=width||z+dz<0||z+dz>=depth)continue;
        const n=cell(x+dx,z+dz),p=point(n);
        if(prev[n]!==-1||!this.valid(p.x,p.z))continue;
        const mid=p.clone().lerp(point(i),.5);
        if(!this.valid(mid.x,mid.z))continue;
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
    this.seated=false;this.framing=undefined;this.clear();
    if(this.position.distanceTo(target)<.18){onArrival?.();return;}
    this.path=this.route(target);
    if(!this.path.length){this.notice('이동할 수 있는 바닥을 선택해 주세요.');return;}
    this.arrival=onArrival;
  }
  sit(){
    if(this.blocked||!this.place)return;
    if(this.seated){this.seated=false;this.framing=undefined;this.notice('일어났습니다.');return;}
    const nearest=[...this.place.seats].sort((a,b)=>a.distanceToSquared(this.position)-b.distanceToSquared(this.position))[0];
    this.go(nearest,()=>{this.seated=true;if(this.candle)this.framing=barilochePoints.altar.view;this.avatar.group.rotation.y=0;this.notice('잠시 앉아 쉬어가세요.');});
  }
  walkToDoor(enter:()=>void){if(this.place)this.go(this.place.door,enter);}
  private move(dx:number,dz:number){
    const x=this.position.x,z=this.position.z;
    if(this.valid(x+dx,z))this.position.x+=dx;
    if(this.valid(this.position.x,z+dz))this.position.z+=dz;
    return Math.hypot(this.position.x-x,this.position.z-z);
  }
  private tick=(now:number)=>{
    const delta=Math.min(.05,(now-(this.last||now))/1000);this.last=now;
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
    if(this.view==='welcome'){
      this.camera.position.set(-2.25,2.65,16.9);this.camera.lookAt(2.5,3.55,-15);
    }else if(this.view==='room'){
      this.camera.position.set(28.15,1.43,2.47);this.camera.lookAt(30.05,1.24,-2.2);
    }else if(this.framing){
      const eye=this.position.clone().setY(this.seated?1.28:1.63);
      this.camera.position.copy(eye);
      this.camera.lookAt(this.framing);
    }else{
      const center=this.position.clone().add(new T.Vector3(0,this.seated?.87:1.22,0));
      const cameraOffset=new T.Vector3(Math.sin(this.yaw),this.pitch+.19,Math.cos(this.yaw));
      let distance=this.distance;
      while(distance>.65&&!this.valid(center.x+cameraOffset.x*distance,center.z+cameraOffset.z*distance,.12))distance-=.16;
      this.camera.position.copy(center).addScaledVector(cameraOffset,distance);this.camera.lookAt(center.clone().add(new T.Vector3(0,.43,0)));
    }
    this.avatar.group.visible=this.view==='walk'&&!this.framing;
    this.renderer.render(this.scene,this.camera);this.frame=requestAnimationFrame(this.tick);
  };
  dispose(){
    this.request++;cancelAnimationFrame(this.frame);this.observer.disconnect();
    window.removeEventListener('keydown',this.keyDown);window.removeEventListener('keyup',this.keyUp);window.removeEventListener('blur',this.clear);
    if(this.place)unload(this.place.root);unload(this.avatar.group);unload(this.privateRoom);
    const canvas=this.renderer.domElement;
    canvas.removeEventListener('pointerdown',this.pointerDown);canvas.removeEventListener('pointermove',this.pointerMove);
    canvas.removeEventListener('pointerup',this.pointerUp);canvas.removeEventListener('pointercancel',this.pointerCancel);canvas.removeEventListener('wheel',this.wheel);
    this.renderer.dispose();canvas.remove();
  }
}

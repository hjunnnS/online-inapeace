import * as T from 'three';

// All textures and meshes in this module are drawn for this project.
function texture(draw:(context:CanvasRenderingContext2D,size:number)=>void,size=256){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const context=canvas.getContext('2d');
  if(!context)throw new Error('질감을 그릴 수 없습니다.');
  draw(context,size);
  const result=new T.CanvasTexture(canvas);result.colorSpace=T.SRGBColorSpace;
  return result;
}
function mesh(parent:T.Object3D,geometry:T.BufferGeometry,material:T.Material,position:[number,number,number]){
  const result=new T.Mesh(geometry,material);result.position.set(...position);parent.add(result);return result;
}
export function makeAvatar(color='#344c60'){
  const group=new T.Group(),rig=new T.Group();group.add(rig);
  const cloth=new T.MeshStandardMaterial({color,roughness:.93});
  const skin=new T.MeshStandardMaterial({color:'#d5b697',roughness:.85});
  const hair=new T.MeshStandardMaterial({color:'#302825'});
  mesh(rig,new T.CylinderGeometry(.19,.37,.94,24),cloth,[0,.8,0]);
  mesh(rig,new T.SphereGeometry(.235,24,16),skin,[0,1.48,0]);
  mesh(rig,new T.SphereGeometry(.241,24,16,0,Math.PI*2,0,Math.PI*.57),hair,[0,1.51,.02]);
  const eyeMaterial=new T.MeshBasicMaterial({color:'#342c29'});
  for(const x of [-.082,.082])mesh(rig,new T.SphereGeometry(.017,8,8),eyeMaterial,[x,1.49,-.218]);
  const arms=[-.25,.25].map(x=>{
    const arm=new T.Group();arm.position.set(x,1.13,0);rig.add(arm);
    mesh(arm,new T.CapsuleGeometry(.075,.27,4,10),cloth,[0,-.15,0]);
    mesh(arm,new T.SphereGeometry(.071,10,10),skin,[0,-.36,0]);
    return arm;
  });
  const hand=new T.Group();hand.position.set(0,-.37,-.045);arms[1].add(hand);
  const legs=[-.13,.13].map(x=>mesh(rig,new T.CapsuleGeometry(.08,.25,4,10),hair,[x,.24,0]));
  const lace=texture((ctx,s)=>{
    ctx.clearRect(0,0,s,s);ctx.fillStyle='#eee6ce';
    ctx.globalAlpha=.18;ctx.fillRect(0,0,s,s);ctx.globalAlpha=.85;
    for(let y=8;y<s;y+=32)for(let x=8;x<s;x+=32){
      ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();
      for(let p=0;p<5;p++){
        const angle=p*Math.PI*2/5;
        ctx.beginPath();ctx.ellipse(x+Math.cos(angle)*7,y+Math.sin(angle)*7,4,2,angle,0,Math.PI*2);ctx.fill();
      }
    }
  });
  const veil=new T.Group();rig.add(veil);veil.visible=false;
  const veilMaterial=new T.MeshStandardMaterial({color:'#f5e9cf',map:lace,transparent:true,opacity:.82,side:T.DoubleSide,depthWrite:false,roughness:1});
  mesh(veil,new T.SphereGeometry(.254,28,16,0,Math.PI*2,0,Math.PI*.57),veilMaterial,[0,1.51,.02]);
  const drape=mesh(veil,new T.CylinderGeometry(.245,.38,.7,32,12,true,Math.PI*.08,Math.PI*1.84),veilMaterial,[0,1.15,.055]);
  drape.rotation.y=Math.PI;
  const gold=new T.MeshStandardMaterial({color:'#bda06b',metalness:.6,roughness:.5});
  const border=mesh(veil,new T.TorusGeometry(.38,.008,6,48,Math.PI*1.84),gold,[0,.8,.055]);border.rotation.x=Math.PI/2;
  return {group,rig,arms,hand,legs,veil};
}
export function makeTaper(){
  const root=new T.Group();
  const wax=new T.MeshStandardMaterial({color:'#f5e4b8',roughness:.82});
  mesh(root,new T.CylinderGeometry(.034,.041,.4,12),wax,[0,.2,0]);
  mesh(root,new T.CylinderGeometry(.006,.006,.035,6),new T.MeshBasicMaterial({color:'#332a24'}),[0,.415,0]);
  const flame=mesh(root,new T.SphereGeometry(.031,12,10),new T.MeshBasicMaterial({color:'#ffdb8b'}),[0,.456,0]);
  flame.scale.set(.7,2.2,.7);
  const haloMap=texture((ctx,s)=>{
    const gradient=ctx.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
    gradient.addColorStop(0,'#ffe9aaff');gradient.addColorStop(.17,'#ffc15e99');gradient.addColorStop(1,'#ff9b2300');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,s,s);
  },64);
  const halo=new T.Sprite(new T.SpriteMaterial({map:haloMap,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:.5}));
  halo.position.y=.46;halo.scale.set(.37,.48,1);root.add(halo);
  return {root,flame,halo};
}
export type Taper=ReturnType<typeof makeTaper>;
export function flicker(taper:Taper,seconds:number,phase=0,reduced=false){
  const wave=reduced?0:Math.sin(seconds*9+phase)*.07+Math.sin(seconds*15+phase)*.035;
  taper.flame.scale.set(.7+wave,2.2+wave*2,.7);
  taper.flame.rotation.z=wave*.6;taper.halo.material.opacity=.48+wave;
}
export function makeCandleCorner(){
  const group=new T.Group();group.position.set(6.15,0,13.25);
  const metal=new T.MeshStandardMaterial({color:'#786040',metalness:.65,roughness:.4});
  const wood=new T.MeshStandardMaterial({color:'#34281f',roughness:.8});
  for(const x of [-.8,.8])mesh(group,new T.CylinderGeometry(.035,.055,1.15,12),metal,[x,.575,0]);
  mesh(group,new T.BoxGeometry(1.9,.1,.7),wood,[0,1.15,0]);
  mesh(group,new T.BoxGeometry(1.95,.035,.73),metal,[0,1.215,0]);
  const tapers:Taper[]=[];
  for(let i=0;i<9;i++){
    const taper=makeTaper();taper.root.scale.setScalar(.8);
    taper.root.position.set(-.74+(i%5)*.35,1.24,Math.floor(i/5)*.28-.15);
    group.add(taper.root);tapers.push(taper);
  }
  const light=new T.PointLight('#ffbd69',8,5,1.5);light.position.set(0,1.7,0);group.add(light);
  const label=mesh(group,new T.BoxGeometry(.44,.32,.04),metal,[0,.87,.38]);label.rotation.x=-.12;
  return {group,tapers,light};
}
export class Particles {
  readonly root=new T.Group();
  private geometry=new T.BufferGeometry();
  private positions=new Float32Array(180*3);
  private material:T.PointsMaterial;
  private points:T.Points;
  private elapsed=0;
  private duration=0;
  private rise=false;
  constructor(){
    const map=texture((ctx,s)=>{
      const gradient=ctx.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
      gradient.addColorStop(0,'#fffcefff');gradient.addColorStop(.2,'#ffe2aadd');gradient.addColorStop(1,'#ffbd5500');
      ctx.fillStyle=gradient;ctx.fillRect(0,0,s,s);
    },32);
    this.material=new T.PointsMaterial({color:'#ffe0a1',map,size:.09,transparent:true,depthWrite:false,blending:T.AdditiveBlending});
    this.geometry.setAttribute('position',new T.BufferAttribute(this.positions,3));
    this.points=new T.Points(this.geometry,this.material);this.points.frustumCulled=false;this.root.add(this.points);this.root.visible=false;
  }
  start(position:T.Vector3,rise=false){this.root.position.copy(position);this.rise=rise;this.elapsed=0;this.duration=rise?3.8:1.5;this.root.visible=true;}
  stop(){this.duration=0;this.root.visible=false;}
  tick(delta:number,reduced:boolean){
    if(!this.duration)return;
    this.elapsed+=delta;
    const progress=this.elapsed/this.duration;
    if(progress>=1){this.stop();return;}
    this.material.opacity=(1-progress)*(reduced?.25:1);
    for(let i=0;i<180;i++){
      const a=i*2.39996+progress*(this.rise?.5:1.2);
      const distance=this.rise?.12+(i%7)*.02:.25+progress*.6;
      this.positions[i*3]=Math.cos(a)*distance;
      this.positions[i*3+1]=this.rise?progress*5+(i%19)*.055:Math.sin(i)*.2+progress*.9;
      this.positions[i*3+2]=Math.sin(a)*distance;
    }
    this.geometry.attributes.position.needsUpdate=true;
  }
}
function grainTexture(wood:boolean){
  return texture((ctx,s)=>{
    ctx.fillStyle=wood?'#c0aa87':'#d2c9b6';ctx.fillRect(0,0,s,s);
    let seed=237;
    const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
    for(let i=0;i<3500;i++){
      ctx.fillStyle='rgba(45,34,25,'+(random()*.12)+')';
      ctx.fillRect(random()*s,random()*s,wood?1:random()*3,wood?10+random()*55:random()*2);
    }
    if(!wood){ctx.strokeStyle='#948a7955';ctx.lineWidth=2;ctx.strokeRect(1,1,s-2,s-2);}
  });
}
export function enrichMaterials(root:T.Group){
  const stone=grainTexture(false),wood=grainTexture(true);
  const seen=new Set<T.Material>();
  root.traverse(node=>{
    if(!(node instanceof T.Mesh))return;
    for(const material of Array.isArray(node.material)?node.material:[node.material]){
      if(!(material instanceof T.MeshStandardMaterial)||seen.has(material))continue;
      seen.add(material);
      if(material.emissiveIntensity>.5)continue;
      material.map=material.color.r<.32&&material.color.g<.24?wood:stone;
      material.bumpMap=material.map;material.bumpScale=material.metalness>.25?0:.025;
      material.roughness=material.metalness>.25?.36:.86;material.needsUpdate=true;
    }
  });
}
export function makeProjections(){
  const group=new T.Group();
  const map=texture((ctx,s)=>{
    ctx.clearRect(0,0,s,s);
    const colors=['#b35446','#315baa','#cda959','#658b94','#5b4179'];
    for(let y=0;y<8;y++)for(let x=0;x<5;x++){
      ctx.fillStyle=colors[(x*3+y*2)%colors.length];
      ctx.fillRect(x*s/5+3,y*s/8+3,s/5-6,s/8-6);
    }
  });
  const material=new T.MeshBasicMaterial({map,transparent:true,opacity:.24,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});
  for(const z of [-7.8,-2.6,2.6,7.8]){
    const patch=mesh(group,new T.PlaneGeometry(5.4,3.8),material,[2,.04,z]);
    patch.rotation.x=-Math.PI/2;patch.rotation.z=.32;
  }
  const shaftMaterial=new T.MeshBasicMaterial({color:'#e7d7b4',transparent:true,opacity:.035,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});
  for(const z of [-7.8,2.6]){
    const shaft=mesh(group,new T.ConeGeometry(1.1,8.5,16,1,true),shaftMaterial,[5.4,4.5,z]);shaft.rotation.z=-.66;
  }
  return {group,material,shaftMaterial};
}
export function markerRing(){
  const ring=new T.Mesh(new T.RingGeometry(.36,.4,48),new T.MeshBasicMaterial({color:'#e8c68b',transparent:true,opacity:.7,depthWrite:false,side:T.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.055;return ring;
}

export function makeAltarDecor(){
  const group=new T.Group();
  const linen=new T.MeshStandardMaterial({color:'#e5dbc7',roughness:1});
  const gold=new T.MeshStandardMaterial({color:'#b59252',metalness:.65,roughness:.4});
  mesh(group,new T.BoxGeometry(3.6,.045,1.6),linen,[0,1.73,-14.8]);
  mesh(group,new T.BoxGeometry(3.4,.48,.03),linen,[0,1.47,-13.98]);
  mesh(group,new T.BoxGeometry(.065,.28,.035),gold,[0,1.48,-13.95]);
  mesh(group,new T.BoxGeometry(.18,.045,.035),gold,[0,1.51,-13.94]);
  const tapers:Taper[]=[];
  for(const side of [-1,1])for(let i=0;i<3;i++){
    const x=side*(2.15+i*.48),z=-15.8;
    const height=1.2+i*.22;
    mesh(group,new T.CylinderGeometry(.035,.06,height,12),gold,[x,.45+height/2,z]);
    mesh(group,new T.CylinderGeometry(.14,.2,.08,16),gold,[x,.44,z]);
    const taper=makeTaper();taper.root.position.set(x,.45+height,z);group.add(taper.root);tapers.push(taper);
  }
  return {group,tapers};
}


export function makeChoir(){
  const group=new T.Group();
  const people:ReturnType<typeof makeAvatar>[]=[];
  const white=new T.MeshStandardMaterial({color:'#efe8d7',roughness:.9});
  const wood=new T.MeshStandardMaterial({color:'#473127',roughness:.8});
  for(let row=0;row<2;row++){
    mesh(group,new T.BoxGeometry(6,.12,1),wood,[0,1.2+row*.5,-16.6-row*.8]);
    for(let column=0;column<5;column++){
      const person=makeAvatar(column%2?'#6b303b':'#753d43');person.group.scale.setScalar(.62);
      person.group.position.set(-2.3+column*1.15,1.25+row*.5,-16.6-row*.8);person.group.rotation.y=Math.PI;
      mesh(person.rig,new T.ConeGeometry(.31,.26,3),white,[0,1.04,0]);
      person.arms.forEach(arm=>arm.rotation.x=.65);
      person.veil.visible=false;group.add(person.group);people.push(person);
    }
  }
  const spotlight=new T.SpotLight('#ffe1a1',35,12,.35,.65,1.4);spotlight.position.set(-1,7,-9);
  spotlight.target.position.set(0,1,-11);spotlight.visible=false;group.add(spotlight,spotlight.target);
  return {group,people,spotlight};
}

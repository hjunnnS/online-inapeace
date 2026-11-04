import * as T from 'three';
import {makeAvatar} from './avatar';

// Code-made materials and meshes; original stained-glass artwork is in stainedglass.ts.
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
export {makeAvatar,animateAvatar,avatarPatterns} from './avatar';
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
export { makeProjections } from './stainedglass';
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
      mesh(person.rig,new T.ConeGeometry(.31,.26,3),white,[0,.4,0]);
      person.arms.forEach(arm=>arm.rotation.x=.65);
      person.veil.visible=false;group.add(person.group);people.push(person);
    }
  }
  const spotlight=new T.SpotLight('#ffe1a1',35,12,.35,.65,1.4);spotlight.position.set(-1,7,-9);
  spotlight.target.position.set(0,1,-11);spotlight.visible=false;group.add(spotlight,spotlight.target);
  return {group,people,spotlight};
}

// Fine geometric needles, grouped into one reusable branch spray.
function pineSpray(){
  const vertices:number[]=[],colors:number[]=[];
  const triangle=(a:T.Vector3,b:T.Vector3,c:T.Vector3,tint:number)=>{
    for(const point of [a,b,c]){vertices.push(...point.toArray());colors.push(.55*tint,.83*tint,.62*tint);}
  };
  const needle=(base:T.Vector3,direction:T.Vector3,length:number,tint:number)=>{
    const edge=new T.Vector3(-direction.z,0,direction.x).normalize().multiplyScalar(.009);
    const tip=base.clone().addScaledVector(direction,length);tip.y+=.035;
    triangle(base.clone().add(edge),base.clone().sub(edge),tip,tint);
  };
  for(const side of [-1,1])for(let twig=0;twig<7;twig++){
    const origin=new T.Vector3(0,.025,.1+twig*.12),end=new T.Vector3(side*(.39-twig*.035),.05,.34+twig*.09);
    const axis=end.clone().sub(origin),normal=new T.Vector3(axis.z,0,-axis.x).normalize();
    for(let n=0;n<9;n++){
      const base=origin.clone().addScaledVector(axis,n/9);
      for(const edge of [-1,1]){
        const direction=normal.clone().multiplyScalar(edge).add(axis.clone().normalize().multiplyScalar(.35)).normalize();
        needle(base,direction,.09+(1-n/9)*.045,.73+((twig*7+n*3)%11)*.035);
      }
    }
  }
  for(let n=0;n<19;n++)for(const side of [-1,1])needle(new T.Vector3(0,.02,n/20),new T.Vector3(side*.8,.15,.6).normalize(),.1,.95);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
}

export function makeChristmasTree(){
  const group=new T.Group();group.position.set(-6.15,0,15.8);
  const bark=new T.MeshStandardMaterial({color:'#59412a',roughness:1});
  const greens=['#214d34','#326646','#3c7050'].map(color=>new T.MeshStandardMaterial({color,roughness:.88,side:T.DoubleSide,vertexColors:true}));
  const radiusAt=(y:number)=>2.15*Math.pow(Math.max(.015,1-(y-.65)/6.1),.84);
  const gold=new T.MeshStandardMaterial({color:'#cba34f',metalness:.75,roughness:.26});
  mesh(group,new T.CylinderGeometry(.2,.3,1.2,16),bark,[0,.6,0]);
  mesh(group,new T.CylinderGeometry(2.1,2.16,.08,48),new T.MeshStandardMaterial({color:'#772d35',roughness:1}),[0,.06,0]);
  // A dark interior is covered by hundreds of fine, irregular branch sprays.
  mesh(group,new T.ConeGeometry(1.45,5.9,24),new T.MeshStandardMaterial({color:'#123526',roughness:1}),[0,3.4,0]);
  const spray=pineSpray(),branches:{y:number;angle:number;radius:number;scale:number;tilt:number}[]=[];
  for(let tier=0;tier<25;tier++){
    const y=.65+tier*.235,radius=radiusAt(y),count=Math.round(30-tier*.77);
    for(let i=0;i<count;i++){
      const angle=i*Math.PI*2/count+tier*2.39996,scale=.85+((i*13+tier*7)%11)*.025;
      branches.push({y:y+Math.sin(i*7+tier)*.075,angle,radius,scale,tilt:-.12});
      branches.push({y:y+.1+Math.sin(i*3)*.1,angle:angle+.09,radius:radius*.91,scale:scale*.92,tilt:.52});
    }
  }
  const branchDummy=new T.Object3D();
  for(let tint=0;tint<3;tint++){
    const chosen=branches.filter((_,i)=>i%3===tint),foliage=new T.InstancedMesh(spray,greens[tint],chosen.length);
    chosen.forEach((branch,i)=>{
      const {y,angle,radius,scale,tilt}=branch;
      branchDummy.position.set(Math.sin(angle)*radius*.27,y,Math.cos(angle)*radius*.27);
      branchDummy.rotation.set(tilt+Math.sin(i)*.08,angle,Math.sin(i*2.1)*.12);
      branchDummy.scale.set((.7+radius*.26)*scale,.8,(radius*.8+.1)*scale);branchDummy.updateMatrix();foliage.setMatrixAt(i,branchDummy.matrix);
    });group.add(foliage);
  }
  const ballGeometry=new T.SphereGeometry(.105,20,14),dummy=new T.Object3D();
  for(const [color,offset] of [['#b6353f',0],['#d8b46a',1],['#d9d9c9',2]] as const){
    const balls=new T.InstancedMesh(ballGeometry,new T.MeshStandardMaterial({color,metalness:.7,roughness:.16}),32);
    for(let i=0;i<32;i++){
      const height=.95+(i/32)*5.1,angle=i*2.39996+offset*2.1;
      const radius=radiusAt(height)+.09;
      dummy.position.set(Math.cos(angle)*radius,height,Math.sin(angle)*radius);dummy.scale.setScalar(.85+(i%3)*.18);dummy.updateMatrix();balls.setMatrixAt(i,dummy.matrix);
    }
    group.add(balls);
  }
  const wirePoints:T.Vector3[]=[];
  for(let i=0;i<=160;i++){
    const y=.9+i/160*5.4,angle=i/160*Math.PI*12,radius=radiusAt(y)+.12;
    wirePoints.push(new T.Vector3(Math.cos(angle)*radius,y,Math.sin(angle)*radius));
  }
  mesh(group,new T.TubeGeometry(new T.CatmullRomCurve3(wirePoints),180,.012,5,false),gold,[0,0,0]);
  const bulbs=new T.InstancedMesh(new T.SphereGeometry(.045,8,7),new T.MeshBasicMaterial({color:'#ffe3a4'}),180);
  for(let i=0;i<180;i++){dummy.position.copy(wirePoints[Math.floor(i/180*160)]);dummy.scale.setScalar(1);dummy.updateMatrix();bulbs.setMatrixAt(i,dummy.matrix);}
  group.add(bulbs);
  const glowMap=texture((ctx,s)=>{
    const glow=ctx.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
    glow.addColorStop(0,'#fff5d9ff');glow.addColorStop(.15,'#ffe0a5cc');glow.addColorStop(.45,'#ffd28a44');glow.addColorStop(1,'#ffd28a00');
    ctx.fillStyle=glow;ctx.fillRect(0,0,s,s);
  },32);
  const glowGeometry=new T.BufferGeometry(),positions=new Float32Array(540),colors=new Float32Array(540);
  for(let i=0;i<180;i++){const point=wirePoints[Math.floor(i/180*160)];positions.set(point.toArray(),i*3);}
  glowGeometry.setAttribute('position',new T.BufferAttribute(positions,3));
  glowGeometry.setAttribute('color',new T.BufferAttribute(colors,3));
  const glowMaterial=new T.PointsMaterial({map:glowMap,size:.62,vertexColors:true,transparent:true,opacity:1,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
  group.add(new T.Points(glowGeometry,glowMaterial));
  const bulbColor=new T.Color('#ffe3a4');bulbs.material.color.set('#ffffff');bulbs.material.toneMapped=false;

  const starShape=new T.Shape();
  for(let i=0;i<10;i++){
    const angle=Math.PI/2+i*Math.PI/5,radius=i%2?.18:.42;
    if(i===0)starShape.moveTo(Math.cos(angle)*radius,Math.sin(angle)*radius);
    else starShape.lineTo(Math.cos(angle)*radius,Math.sin(angle)*radius);
  }
  starShape.closePath();
  const starMaterial=new T.MeshStandardMaterial({color:'#f7d373',emissive:'#ffb743',emissiveIntensity:1.1,metalness:.65,roughness:.2});
  const star=mesh(group,new T.ExtrudeGeometry(starShape,{depth:.07,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.025,bevelThickness:.025}),starMaterial,[0,6.85,0]);
  star.rotation.y=.5;
  const starHalo=new T.Sprite(new T.SpriteMaterial({map:glowMap,color:'#ffd37a',transparent:true,opacity:.65,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));
  starHalo.position.set(0,6.85,0);starHalo.scale.set(2,2,1);group.add(starHalo);
  const sparkleMap=texture((ctx,size)=>{
    ctx.clearRect(0,0,size,size);const c=size/2;
    ctx.fillStyle='#fff6d2';ctx.beginPath();ctx.moveTo(c,0);ctx.lineTo(c+2,c-2);ctx.lineTo(size,c);ctx.lineTo(c+2,c+2);ctx.lineTo(c,size);ctx.lineTo(c-2,c+2);ctx.lineTo(0,c);ctx.lineTo(c-2,c-2);ctx.closePath();ctx.fill();
  },64);
  const starGlint=new T.Sprite(new T.SpriteMaterial({map:sparkleMap,color:'#fff5d4',transparent:true,opacity:.8,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));starGlint.position.copy(starHalo.position);starGlint.scale.set(1.25,1.25,1);group.add(starGlint);

  const glintGeometry=new T.BufferGeometry(),glintColors=new Float32Array(540);
  glintGeometry.setAttribute('position',new T.BufferAttribute(positions,3));glintGeometry.setAttribute('color',new T.BufferAttribute(glintColors,3));
  const glints=new T.Points(glintGeometry,new T.PointsMaterial({map:sparkleMap,size:.55,vertexColors:true,transparent:true,opacity:.9,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));group.add(glints);
  const moteGeometry=new T.BufferGeometry(),motePositions=new Float32Array(32*3);
  moteGeometry.setAttribute('position',new T.BufferAttribute(motePositions,3));
  const motes=new T.Points(moteGeometry,new T.PointsMaterial({map:glowMap,color:'#ffe0a1',size:.1,transparent:true,opacity:.75,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));group.add(motes);
  const light=new T.PointLight('#ffd18c',12,8,1.4);light.position.set(0,3,1);group.add(light);
  const wrapping=['#8b303e','#b49760','#254f45','#eee0ba'];
  for(let i=0;i<4;i++){
    const angle=i*Math.PI*.52+.3,x=Math.cos(angle)*1.65,z=Math.sin(angle)*1.65;
    const material=new T.MeshStandardMaterial({color:wrapping[i],roughness:.65});
    mesh(group,new T.BoxGeometry(.58,.4+i*.08,.55),material,[x,.25+i*.04,z]);
    mesh(group,new T.BoxGeometry(.09,.43+i*.08,.57),gold,[x,.25+i*.04,z]);
    mesh(group,new T.BoxGeometry(.6,.04,.09),gold,[x,.47+i*.08,z]);
  }
  return {group,bulbs,
    tick(seconds:number,reduced:boolean){
      for(let i=0;i<180;i++){
        const brightness=reduced?1.25:.45+1.0*(Math.sin(seconds*2.3+i*2.39996)*.5+.5)+3.2*Math.pow(Math.max(0,Math.sin(seconds*3.6+i*1.7)),10);
        bulbColor.set(i%11===0?'#e0edff':i%5===0?'#fff6d7':'#ffe3a4').multiplyScalar(brightness);bulbs.setColorAt(i,bulbColor);
        colors.set([bulbColor.r,bulbColor.g,bulbColor.b],i*3);
        const sparkle=reduced?(i%13===0?.55:0):Math.pow(Math.max(0,Math.sin(seconds*2.25+i*2.39996)),18)*2.7;
        bulbColor.set(i%3===0?'#e0edff':i%3===1?'#fff7d9':'#ffd59c').multiplyScalar(sparkle);glintColors.set([bulbColor.r,bulbColor.g,bulbColor.b],i*3);
      }
      if(bulbs.instanceColor)bulbs.instanceColor.needsUpdate=true;
      glowGeometry.attributes.color.needsUpdate=true;
      glintGeometry.attributes.color.needsUpdate=true;
      for(let i=0;i<32;i++){
        const y=.65+((i*.183+(reduced?0:seconds*.055))%5.8),angle=i*2.39996+(reduced?0:seconds*.07),radius=radiusAt(y)+.24+Math.sin(i)*.08;
        motePositions.set([Math.cos(angle)*radius,y,Math.sin(angle)*radius],i*3);
      }
      moteGeometry.attributes.position.needsUpdate=true;
      const starPulse=reduced?1:.8+.35*(Math.sin(seconds*2)*.5+.5);
      starMaterial.emissiveIntensity=starPulse*1.4;starHalo.material.opacity=starPulse*.7;
      starGlint.material.opacity=reduced?.6:.35+.65*Math.pow(Math.max(0,Math.sin(seconds*2.4)),4);
      starGlint.material.rotation=reduced?0:Math.sin(seconds*.3)*.12;

    }
  };
}

/** Flame/halo overlays on the twelve existing pillar candle brackets. */
export function makeWallCandles(){
  const group=new T.Group();group.name='wall-candle-flames';
  const tapers:Taper[]=[];
  for(const side of [-1,1])for(let i=0;i<6;i++){
    const taper=makeTaper();taper.root.position.set(side*4.32,3.64,-13+i*5.2);
    taper.halo.scale.set(.55,.7,1);group.add(taper.root);tapers.push(taper);
  }
  return {group,tapers};
}

export function makeEntrance(){
  const group=new T.Group();group.name='grand-cathedral-entrance';group.position.set(.1,0,18.68);group.rotation.y=Math.PI;
  const stone=new T.MeshStandardMaterial({color:'#b6a58b',roughness:.87});
  const wood=new T.MeshStandardMaterial({color:'#54372a',roughness:.58});
  const inset=new T.MeshStandardMaterial({color:'#38261f',roughness:.77});
  const bronze=new T.MeshStandardMaterial({color:'#a98b55',metalness:.75,roughness:.33});
  const black=new T.MeshStandardMaterial({color:'#302b28',metalness:.7,roughness:.45});
  const shape=new T.Shape();shape.moveTo(-2.35,0);shape.lineTo(2.35,0);shape.lineTo(2.35,4.65);shape.quadraticCurveTo(1.9,5.9,0,6.65);shape.quadraticCurveTo(-1.9,5.9,-2.35,4.65);shape.closePath();
  mesh(group,new T.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:false,curveSegments:28}),wood,[0,.08,0]);
  for(const side of [-1,1]){
    mesh(group,new T.BoxGeometry(.38,4.9,.5),stone,[side*2.58,2.45,.02]);
    mesh(group,new T.BoxGeometry(.64,.25,.72),stone,[side*2.58,.13,.03]);
    mesh(group,new T.BoxGeometry(.6,.26,.64),stone,[side*2.58,4.6,.03]);
    mesh(group,new T.BoxGeometry(2.18,4.46,.1),inset,[side*1.14,2.36,.16]);
    for(let plank=0;plank<7;plank++)mesh(group,new T.BoxGeometry(.018,4.3,.025),wood,[side*1.14-.94+plank*.313,2.36,.22]);
    for(let row=0;row<3;row++){
      const y=.94+row*1.32;
      mesh(group,new T.BoxGeometry(1.79,1.08,.04),wood,[side*1.14,y,.23]);
      for(const offset of [-.57,.57])mesh(group,new T.BoxGeometry(.055,1.16,.035),bronze,[side*1.14+offset,y,.26]);
      for(const edge of [-.55,.55])mesh(group,new T.BoxGeometry(1.86,.055,.035),bronze,[side*1.14,y+edge,.26]);
    }
    for(const y of [.6,2.3,4.15]){
      mesh(group,new T.BoxGeometry(1.5,.09,.07),black,[side*1.48,y,.3]);
      for(let rivet=0;rivet<5;rivet++)mesh(group,new T.SphereGeometry(.027,8,6),bronze,[side*1.48-.6+rivet*.3,y,.35]);
    }
    mesh(group,new T.BoxGeometry(.15,.44,.06),bronze,[side*.24,2.1,.34]);
    const handle=mesh(group,new T.TorusGeometry(.105,.023,8,24),bronze,[side*.24,2.1,.4]);handle.rotation.x=.15;
  }
  mesh(group,new T.BoxGeometry(.08,4.55,.12),bronze,[0,2.35,.27]);
  for(let ring=0;ring<3;ring++){
    const points:T.Vector3[]=[];
    for(let i=0;i<=48;i++){const x=-2.35+i/48*4.7;points.push(new T.Vector3(x*(1+ring*.063),4.65+(1.99+ring*.14)*(1-Math.pow(Math.abs(x/2.35),1.5)),.05));}
    mesh(group,new T.TubeGeometry(new T.CatmullRomCurve3(points),64,.12,8,false),stone,[0,0,0]);
  }
  const glass=new T.MeshStandardMaterial({color:'#bfa66d',emissive:'#806b3b',emissiveIntensity:.24,roughness:.45});
  const arch=new T.Shape();arch.moveTo(-1.88,4.85);arch.lineTo(1.88,4.85);arch.quadraticCurveTo(1.35,5.81,0,6.28);arch.quadraticCurveTo(-1.35,5.81,-1.88,4.85);arch.closePath();
  mesh(group,new T.ShapeGeometry(arch,28),glass,[0,0,.18]);
  for(let i=0;i<7;i++){
    const x=-1.5+i*.5,top=6.2-Math.abs(x)*.54;
    mesh(group,new T.BoxGeometry(.035,top-4.85,.04),bronze,[x,(top+4.85)/2,.24]);
  }
  mesh(group,new T.BoxGeometry(4.1,.08,.07),bronze,[0,4.81,.26]);
  mesh(group,new T.BoxGeometry(5.35,.07,.85),stone,[0,.035,.25]);
  return group;
}

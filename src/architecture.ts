import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

type Bounds=[number,number,number,number];
export const cathedralStyles:Record<string,{height:number;bays:number;colors:string[];motif:string}>={
 bariloche:{height:10.6,bays:7,colors:['#477d93','#b9a05b','#67967c'],motif:'파타고니아의 석조 볼트'},
 paris:{height:12,bays:6,colors:['#697ab4','#c37b84','#d1b56f'],motif:'장미창과 층을 이룬 아케이드'},
 chartres:{height:11.5,bays:5,colors:['#3c5eac','#527dac','#c49b6a'],motif:'샤르트르 블루와 바닥 미로'},
 reims:{height:12.8,bays:7,colors:['#937cb5','#a56271','#d5b573'],motif:'장미창과 조각 감실'},
 cologne:{height:16,bays:7,colors:['#657897','#ab665b','#d2b66e'],motif:'높은 수직선과 금빛 성소'},
 milan:{height:14,bays:6,colors:['#b18d9d','#88a3ac','#c8b080'],motif:'대리석과 다섯 통로'},
 seville:{height:12,bays:5,colors:['#be985a','#9a6455','#799b95'],motif:'금빛 제단화와 성가대석'},
 burgos:{height:11,bays:5,colors:['#81a29e','#b79870','#927da2'],motif:'별 모양 볼트와 교차부 채광'},
 vitus:{height:13,bays:6,colors:['#608ba2','#af696f','#a59959'],motif:'보석빛 창과 측면 예배실'},
 stephen:{height:10,bays:5,colors:['#85a2ab','#bba46f','#9b788f'],motif:'석조 설교대와 바로크 제대'},
};
function box(g:T.Group,m:T.Material,x:number,y:number,z:number,w:number,h:number,d:number){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);g.add(mesh);return mesh;}
function tube(g:T.Group,m:T.Material,points:T.Vector3[],radius=.045){const curve=new T.CatmullRomCurve3(points);const mesh=new T.Mesh(new T.TubeGeometry(curve,32,radius,6,false),m);g.add(mesh);return mesh;}
function batch(group:T.Group){
 const batches=new Map<T.Material,T.Mesh[]>();
 for(const mesh of group.children)if(mesh instanceof T.Mesh&&!Array.isArray(mesh.material)){const values=batches.get(mesh.material)??[];values.push(mesh);batches.set(mesh.material,values);}
 for(const [material,meshes] of batches){if(meshes.length<2)continue;const parts=meshes.map(mesh=>{mesh.updateMatrix();return (mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone()).applyMatrix4(mesh.matrix);});const merged=mergeGeometries(parts);if(merged){meshes.forEach(mesh=>{group.remove(mesh);mesh.geometry.dispose();});group.add(new T.Mesh(merged,material));}parts.forEach(part=>part.dispose());}
}
/** Replace only the old broad horizontal roof, leaving floors, walls and ribs intact. */
export function hideFlatRoof(root:T.Group,bounds:Bounds,id:string){
 const height=cathedralStyles[id]?.height??12,width=bounds[1]-bounds[0],depth=bounds[3]-bounds[2],base=id==='bariloche'?10.485:height-.115;
 const discarded=new Set<T.BufferGeometry>();root.updateMatrixWorld(true);
 root.traverse(node=>{
  if(!(node instanceof T.Mesh))return;
  if(new T.Box3().setFromObject(node).max.y<base)return;
  const geometry=node.geometry,positions=geometry.getAttribute('position'),index=geometry.index,count=index?.count??positions.count,kept:number[]=[];
  const points=[new T.Vector3(),new T.Vector3(),new T.Vector3()];let removed=0;
  for(let i=0;i<count;i+=3){
   const ids=[0,1,2].map(offset=>index?index.getX(i+offset):i+offset);
   ids.forEach((id,j)=>points[j].fromBufferAttribute(positions,id).applyMatrix4(node.matrixWorld));
   const minY=Math.min(...points.map(point=>point.y)),spanX=Math.max(...points.map(point=>point.x))-Math.min(...points.map(point=>point.x)),spanZ=Math.max(...points.map(point=>point.z))-Math.min(...points.map(point=>point.z));
   if(minY>=base&&(spanX>width*.8||spanZ>depth*.8))removed++;else kept.push(...ids);
  }
  if(!removed)return;
  if(!kept.length){node.visible=false;return;}
  const next=geometry.clone();next.setIndex(kept);next.clearGroups();node.geometry=next;discarded.add(geometry);
 });
 const used=new Set<T.BufferGeometry>();root.traverse(node=>{if(node instanceof T.Mesh)used.add(node.geometry);});discarded.forEach(geometry=>{if(!used.has(geometry))geometry.dispose();});
}
/** Original procedural stonework; decorative geometry never changes walkable collision. */
export function makeArchitecture(id:string,bounds:Bounds,seats:T.Vector3[]){
 const group=new T.Group();group.name='architectural-detail-'+id;
 const profile=cathedralStyles[id]??cathedralStyles.paris;
 const [left,right,front,back]=bounds,w=right+.35,l=back+.35,h=profile.height;
 const stone=new T.MeshStandardMaterial({color:id==='milan'?'#bdb3a9':'#a79b88',roughness:.94});
 const pale=new T.MeshStandardMaterial({color:'#c2b69f',roughness:.86});
 const mortar=new T.MeshStandardMaterial({color:'#746b5d',roughness:1});
 const wood=new T.MeshStandardMaterial({color:'#5e4230',roughness:.76});
 const gold=new T.MeshStandardMaterial({color:'#b59a63',roughness:.48,metalness:.42});
 // A closed, light stone vault fills the black gaps above the existing ribs.
 const half=id==='bariloche'?8.84:w-.16,spring=id==='bariloche'?8.4:h*.77,rise=id==='bariloche'?2.26:h*.2;
 const roofFront=id==='bariloche'?-18.82:front-.18,roofBack=id==='bariloche'?18.82:back+.18;
 const positions:number[]=[],uv:number[]=[],indices:number[]=[];
 for(let row=0;row<=12;row++)for(let col=0;col<=48;col++){
   const x=-half+col/48*half*2,z=roofFront+row/12*(roofBack-roofFront),y=spring+rise*(1-Math.pow(Math.abs(x/half),1.45));
   positions.push(x,y,z);uv.push(col/6,row*2);
   if(row<12&&col<48){const i=row*49+col;indices.push(i,i+49,i+1,i+1,i+49,i+50);}
 }
 const ceilingGeometry=new T.BufferGeometry();ceilingGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));ceilingGeometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));ceilingGeometry.setIndex(indices);ceilingGeometry.computeVertexNormals();
 const roofCanvas=document.createElement('canvas');roofCanvas.width=roofCanvas.height=256;const roofContext=roofCanvas.getContext('2d');if(!roofContext)throw new Error('천장 질감을 그릴 수 없습니다.');
 roofContext.fillStyle='#c7bfaf';roofContext.fillRect(0,0,256,256);roofContext.strokeStyle='#94887366';roofContext.lineWidth=1.4;
 for(let row=0;row<4;row++){roofContext.beginPath();roofContext.moveTo(0,row*64);roofContext.lineTo(256,row*64);roofContext.stroke();for(let col=-1;col<3;col++){const x=col*128+(row%2)*64;roofContext.beginPath();roofContext.moveTo(x,row*64);roofContext.lineTo(x,(row+1)*64);roofContext.stroke();}}
 const roofMap=new T.CanvasTexture(roofCanvas);roofMap.colorSpace=T.SRGBColorSpace;roofMap.wrapS=roofMap.wrapT=T.RepeatWrapping;
 const ceiling=new T.Mesh(ceilingGeometry,new T.MeshStandardMaterial({color:'#c0b5a1',map:roofMap,emissive:'#b1a38a',emissiveMap:roofMap,emissiveIntensity:.24,side:T.DoubleSide,roughness:.95}));ceiling.name='closed-stone-vault';group.add(ceiling);
 const wallTop=id==='bariloche'?10:h*.92;
 if(spring+rise>wallTop){
  const capHalf=half*Math.pow(Math.max(0,1-(wallTop-spring)/rise),1/1.45),shape=new T.Shape();shape.moveTo(-capHalf,wallTop);shape.lineTo(capHalf,wallTop);
  for(let i=1;i<=40;i++){const x=capHalf-i/40*capHalf*2;shape.lineTo(x,spring+rise*(1-Math.pow(Math.abs(x/half),1.45)));}shape.closePath();
  const material=new T.MeshStandardMaterial({color:'#a79b88',roughness:.94,side:T.DoubleSide});
  for(const z of [roofFront+.02,roofBack-.02]){const cap=new T.Mesh(new T.ShapeGeometry(shape,24),material);cap.position.z=z;group.add(cap);}
 }

 const interval=(back-front)/profile.bays;
 for(let bay=0;bay<profile.bays;bay++){
  const center=front+(bay+.5)*interval;
  for(const side of [-1,1]){
   const diagonal=Array.from({length:17},(_,i)=>{const t=i/16,x=side*half*(1-t);return new T.Vector3(x,spring+rise*(1-Math.pow(Math.abs(x/half),1.45))-.04,center+(t-.5)*interval);});tube(group,pale,diagonal,.065);
  }
  const boss=new T.Mesh(new T.SphereGeometry(.16,12,8),gold);boss.position.set(0,spring+rise-.08,center);boss.scale.y=.45;group.add(boss);
 }
 for(const side of [-1,1]){
  const x=side*(w-.42);
  box(group,pale,x,2.1,0,.12,.12,l*2-.7);box(group,mortar,x,.19,0,.16,.15,l*2-.7);
  // Wainscot recesses and fine upright mouldings bring scale to the broad walls.
  for(let z=front+1.1;z<back-.8;z+=2.35){
   box(group,stone,x,1.12,z,.09,1.48,1.96);
   for(const offset of [-.95,.95])box(group,pale,x-side*.065,1.12,z+offset,.1,1.58,.055);
   for(const y of [.36,1.9])box(group,pale,x-side*.065,y,z,.1,.055,1.96);
  }
  for(let z=front+2.2;z<back-1;z+=4.7){
   const pilaster=new T.Mesh(new T.CylinderGeometry(.12,.15,1.5,12),pale);pilaster.position.set(x-side*.13,2.95,z);group.add(pilaster);
  }
 }
 // Carved bench ends and rails share the existing seats' real contact height.
 for(const seat of seats){
   const width=Math.min(3.24,w*.38),z=seat.z+.77;
   for(const side of [-1,1]){
    const x=seat.x+side*(width/2-.09);
    box(group,wood,x,.59,z,.12,.64,.67);box(group,gold,x,.89,z,.14,.035,.69);
    const cap=new T.Mesh(new T.SphereGeometry(.12,12,8),wood);cap.position.set(x,.93,z+.2);cap.scale.set(.8,.7,.8);group.add(cap);
   }
   box(group,wood,seat.x,.73,z+.205,width-.26,.045,.025);
 }
 if(id==='paris'||id==='reims'){
  const y=h*.66,z=id==='paris'?-l+.28:l-.28,r=h*.165;
  for(const radius of [r*.96,r*.61,r*.22]){const ring=new T.Mesh(new T.TorusGeometry(radius,.045,6,64),pale);ring.position.set(0,y,z);group.add(ring);}
  for(let i=0;i<12;i++){const a=i*Math.PI/6;const ring=new T.Mesh(new T.TorusGeometry(r*.225,.028,6,24),pale);ring.position.set(Math.cos(a)*r*.61,y+Math.sin(a)*r*.61,z+(id==='paris'?.02:-.02));group.add(ring);}
 }
 if(id==='cologne'||id==='seville'||id==='stephen'){
  const end=front+3.2;
  for(const x of [-2.7,-1.8,1.8,2.7]){
   const column=new T.Mesh(new T.CylinderGeometry(.085,.125,3.3,12),gold);column.position.set(x,2.4,end);group.add(column);
   const finial=new T.Mesh(new T.ConeGeometry(.22,.58,8),gold);finial.position.set(x,4.23,end);group.add(finial);
  }
  tube(group,gold,[new T.Vector3(-2.8,4,front+3),new T.Vector3(0,5.3,front+3),new T.Vector3(2.8,4,front+3)],.09);
 }
 if(id==='milan')for(const x of [-7.1,-3.5,3.5,7.1])box(group,pale,x,.025,0,.18,.012,(back-front)*.92);
 if(id==='chartres'){
  const z=back-4.6;
  for(let i=0;i<12;i++){const a=i*Math.PI/6;const medallion=new T.Mesh(new T.CircleGeometry(.09,6),gold);medallion.rotation.x=-Math.PI/2;medallion.position.set(Math.sin(a)*2.55,.031,z+Math.cos(a)*2.55);group.add(medallion);}
 }
 if(id==='burgos')for(let i=0;i<8;i++){
  const a=i*Math.PI/4; tube(group,pale,[new T.Vector3(0,h-.45,0),new T.Vector3(Math.cos(a)*1.2,h-.66,Math.sin(a)*1.2),new T.Vector3(Math.cos(a)*2.5,h-1.8,Math.sin(a)*2.5)],.085);
 }
 if(id==='vitus'){
  const x=left+.25,map=glassTexture(profile,id),mosaic=new T.MeshStandardMaterial({map,emissiveMap:map,emissive:'#d3c8a7',emissiveIntensity:.22,roughness:.7,side:T.DoubleSide});
  for(const offset of [-.76,.76]){
   const panel=new T.Mesh(new T.PlaneGeometry(1.25,3.1),mosaic);panel.rotation.y=Math.PI/2;panel.position.set(x,3.17,-6+offset);group.add(panel);
   for(const side of [-1,1])box(group,gold,x+.04,3.18,-6+offset+side*.67,.075,3.25,.055);
   for(const y of [1.55,4.8])box(group,gold,x+.04,y,-6+offset,.075,.065,1.4);
   tube(group,gold,[new T.Vector3(x+.04,4.8,-6+offset-.67),new T.Vector3(x+.04,5.18,-6+offset),new T.Vector3(x+.04,4.8,-6+offset+.67)],.035);
  }
  const face=left+1.38;
  for(const y of [.25,1.25])box(group,gold,face,y,-6,.045,.035,3.3);
  for(let i=0;i<8;i++){const z=-7.4+i*.4;box(group,pale,face,.75,z,.04,.78,.045);const jewel=new T.Mesh(new T.SphereGeometry(.07,10,6),gold);jewel.position.set(face+.03,.75,z);jewel.scale.x=.35;group.add(jewel);}
 }

 batch(group);return {group,setLight(preset:'day'|'dusk'|'night',blend:number){ceiling.material.emissiveIntensity=T.MathUtils.lerp(ceiling.material.emissiveIntensity,preset==='night'?.04:preset==='dusk'?.15:.24,blend);}};
}

function glassTexture(profile:typeof cathedralStyles[string],id:string){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=640;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('색유리를 그릴 수 없습니다.');
 ctx.fillStyle='#e9dfbb';ctx.fillRect(0,0,256,640);ctx.lineWidth=3;ctx.strokeStyle='#45433e';
 // Irregular diamonds and petal medallions have their own palette in each cathedral.
 for(let row=-1;row<13;row++)for(let col=-1;col<6;col++){
  const x=col*52+(row%2)*26,y=row*55;ctx.beginPath();ctx.moveTo(x,y-36);ctx.lineTo(x+32,y);ctx.lineTo(x,y+36);ctx.lineTo(x-32,y);ctx.closePath();ctx.globalAlpha=.7;ctx.fillStyle=profile.colors[((row+20)*7+col+9)%3];ctx.fill();ctx.globalAlpha=1;ctx.stroke();
 }
 const petals=id==='paris'?12:id==='reims'?10:id==='milan'?6:8;
 for(const y of [140,320,500]){
  ctx.fillStyle='#e8d8a4';ctx.beginPath();ctx.arc(128,y,49,0,Math.PI*2);ctx.fill();ctx.stroke();
  for(let i=0;i<petals;i++){const a=i*Math.PI*2/petals;ctx.fillStyle=profile.colors[i%3];ctx.beginPath();
   if(id==='burgos'||id==='vitus'){ctx.moveTo(128,y);ctx.lineTo(128+Math.cos(a-.13)*43,y+Math.sin(a-.13)*43);ctx.lineTo(128+Math.cos(a+.13)*43,y+Math.sin(a+.13)*43);ctx.closePath();}
   else ctx.ellipse(128+Math.cos(a)*27,y+Math.sin(a)*27,id==='seville'?21:17,id==='seville'?7:10,a,0,Math.PI*2);
   ctx.fill();ctx.stroke();}
  if(id==='cologne'||id==='stephen'){ctx.lineWidth=4;for(const offset of [-73,73]){ctx.beginPath();ctx.moveTo(128+offset,y+70);ctx.lineTo(128+offset,y-55);ctx.quadraticCurveTo(128+offset+16,y-85,128+offset+32,y-55);ctx.stroke();}ctx.lineWidth=3;}
  ctx.fillStyle='#f0e4bd';ctx.beginPath();ctx.arc(128,y,10,0,Math.PI*2);ctx.fill();ctx.stroke();
 }
 for(const x of [10,246]){ctx.fillStyle='#c9bb91';ctx.fillRect(x-4,0,8,640);}
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return map;
}
/** Shared richness, but each named space keeps a distinct palette and architecture. */
export function makeCathedralGlass(id:string,bounds:Bounds){
 const group=new T.Group();group.name='cathedral-glass-'+id;const profile=cathedralStyles[id]??cathedralStyles.paris;
 const [,right,,back]=bounds,w=right+.35,l=back+.35,h=profile.height,interval=(2*l-10)/profile.bays;
 const map=glassTexture(profile,id),glass=new T.MeshStandardMaterial({map,emissiveMap:map,emissive:'#ffffff',emissiveIntensity:.72,roughness:.5,side:T.DoubleSide});
 const frames=new T.MeshStandardMaterial({color:'#716b61',roughness:.95});
 const floorMaterial=new T.MeshBasicMaterial({map,transparent:true,opacity:.14,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false});
 const beamCanvas=document.createElement('canvas');beamCanvas.width=64;beamCanvas.height=128;const beamContext=beamCanvas.getContext('2d');if(!beamContext)throw new Error('빛을 그릴 수 없습니다.');
 const gradient=beamContext.createLinearGradient(0,0,64,0);gradient.addColorStop(0,'#ffffff00');gradient.addColorStop(.5,'#ffffffaa');gradient.addColorStop(1,'#ffffff00');beamContext.fillStyle=gradient;beamContext.fillRect(0,0,64,128);
 const beamMap=new T.CanvasTexture(beamCanvas);
 const lightMaterial=new T.MeshBasicMaterial({map:beamMap,color:profile.colors[0],transparent:true,opacity:.08,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});
 for(const side of [-1,1])for(let bay=0;bay<profile.bays;bay++){
  const z=-l+5+bay*interval,pane=new T.Mesh(new T.PlaneGeometry(1.36,h*.285),glass);pane.position.set(side*(w-.38),h*.57,z);pane.rotation.y=-side*Math.PI/2;group.add(pane);
  for(const offset of [-.78,.78]){const frame=new T.Mesh(new T.BoxGeometry(.075,h*.33,.08),frames);frame.position.set(side*(w-.4),h*.57,z+offset);group.add(frame);}
  if(side>0&&bay%2===0){
   const patch=new T.Mesh(new T.PlaneGeometry(w*.57,2.25),floorMaterial);patch.rotation.set(-Math.PI/2,0,-.28);patch.position.set(w*.37,.034,z+1.6);group.add(patch);
   const points=[new T.Vector3(w-.25,h*.72,z-.35),new T.Vector3(w-.25,h*.72,z+.35),new T.Vector3(w*.12,.2,z+2),new T.Vector3(w*.12,.2,z+3.2)];
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points.flatMap(p=>p.toArray()),3));geo.setAttribute('uv',new T.Float32BufferAttribute([0,1,1,1,0,0,1,0],2));geo.setIndex([0,2,1,2,3,1]);geo.computeVertexNormals();group.add(new T.Mesh(geo,lightMaterial));
  }
 }
 batch(group);
 return {group,setLight(preset:'day'|'dusk'|'night',blend:number){const amount=preset==='night'?0:preset==='dusk'?.4:1;floorMaterial.opacity=T.MathUtils.lerp(floorMaterial.opacity,.14*amount,blend);lightMaterial.opacity=T.MathUtils.lerp(lightMaterial.opacity,.08*amount,blend);glass.emissiveIntensity=T.MathUtils.lerp(glass.emissiveIntensity,preset==='night'?.18:.72,blend);}};
}

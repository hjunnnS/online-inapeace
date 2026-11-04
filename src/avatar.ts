import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const avatarPatterns=['재킷','베스트','롱코트','원피스','니트'] as const;
let patternBag:number[]=[];
function randomPattern(){
  if(!patternBag.length){patternBag=[0,1,2,3,4];for(let i=4;i>0;i--){const j=Math.floor(Math.random()*(i+1));[patternBag[i],patternBag[j]]=[patternBag[j],patternBag[i]];}}
  return patternBag.pop()!;
}
function part(parent:T.Object3D,geometry:T.BufferGeometry,material:T.Material,x:number,y:number,z:number){const result=new T.Mesh(geometry,material);result.position.set(x,y,z);parent.add(result);return result;}
function solid(parent:T.Object3D,material:T.Material,x:number,y:number,z:number,w:number,h:number,d:number){return part(parent,new T.BoxGeometry(w,h,d),material,x,y,z);}
function rounded(parent:T.Object3D,material:T.Material,x:number,y:number,z:number,w:number,h:number,d:number){const result=part(parent,new T.SphereGeometry(1,20,14),material,x,y,z);result.scale.set(w/2,h/2,d/2);return result;}
function mergeRigid(group:T.Group){
  const batches=new Map<T.Material,T.Mesh[]>();
  for(const child of group.children)if(child instanceof T.Mesh&&!Array.isArray(child.material)){const batch=batches.get(child.material)??[];batch.push(child);batches.set(child.material,batch);}
  for(const [material,meshes] of batches){if(meshes.length<2)continue;const parts=meshes.map(mesh=>{mesh.updateMatrix();const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();return geometry.applyMatrix4(mesh.matrix);});const geometry=mergeGeometries(parts);if(geometry){for(const mesh of meshes){group.remove(mesh);mesh.geometry.dispose();}group.add(new T.Mesh(geometry,material));}parts.forEach(part=>part.dispose());}
}
function tailoredTorso(width:number,waist:number){
  const positions:number[]=[],uv:number[]=[],indices:number[]=[],rings=[[0,width*.83],[.12,waist],[.39,width],[.53,width*.94],[.59,width*.5]];
  for(let row=0;row<rings.length;row++)for(let i=0;i<=20;i++){const a=i/20*Math.PI*2;positions.push(Math.sin(a)*rings[row][1],rings[row][0],Math.cos(a)*rings[row][1]*.63);uv.push(i/20,row/(rings.length-1));if(row<rings.length-1&&i<20){const p=row*21+i;indices.push(p,p+1,p+21,p+1,p+22,p+21);}}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
export function makeAvatar(color='#344c60',pattern=randomPattern()){
  const group=new T.Group(),rig=new T.Group(),body=new T.Group(),head=new T.Group();group.add(rig);rig.add(body);body.add(head);
  group.name='avatar-'+avatarPatterns[pattern];
  const width=pattern===4?.29:pattern===0?.265:pattern===3?.235:.25;
  const cloth=new T.MeshStandardMaterial({color,roughness:.85});
  const light=new T.MeshStandardMaterial({color:new T.Color(color).lerp(new T.Color('#ece5d7'),.63),roughness:.9});
  const shirt=new T.MeshStandardMaterial({color:'#e6ded0',roughness:.95});
  const trousers=new T.MeshStandardMaterial({color:pattern===4?'#50473e':'#363c42',roughness:.9});
  const leather=new T.MeshStandardMaterial({color:'#302a28',roughness:.48});
  const skin=new T.MeshStandardMaterial({color:['#dab69a','#cba182','#a87859','#e2bea0','#bc9376'][pattern],roughness:.85});
  const hair=new T.MeshStandardMaterial({color:['#39312d','#60524b','#292b2e','#745343','#69645c'][pattern],roughness:.94});
  const trim=new T.MeshStandardMaterial({color:'#b99c65',metalness:.5,roughness:.45});
  part(body,tailoredTorso(width,pattern===4?.255:.205),cloth,0,0,0);
  rounded(rig,trousers,0,-.015,0,.4,.18,.29);
  rounded(body,skin,0,.63,0,.14,.19,.14);
  head.position.set(0,.83,-.005);
  rounded(head,skin,0,.02,0,.37,.46,.34);
  for(const side of [-1,1]){
    rounded(head,skin,side*.185,.02,0,.065,.115,.06);
    rounded(head,shirt,side*.068,.055,-.15,.069,.039,.02);
    rounded(head,leather,side*.068,.055,-.164,.026,.03,.014);
    const brow=solid(head,hair,side*.07,.105,-.153,.07,.012,.012);brow.rotation.z=side*.1;
  }
  rounded(head,skin,0,.015,-.168,.053,.074,.055);
  solid(head,new T.MeshStandardMaterial({color:'#8d6257',roughness:1}),0,-.077,-.157,.065,.012,.015);
  const cap=part(head,new T.SphereGeometry(.196,24,16,0,Math.PI*2,0,Math.PI*.53),hair,0,.085,.015);cap.scale.set(1,pattern===4?.73:1,1);
  for(let i=0;i<5;i++){const lock=rounded(head,hair,-.145+i*.065,.16,-.12,.095,.11,.075);lock.rotation.z=-.25+i*.09;}
  if(pattern===2||pattern===3)rounded(head,hair,0,.005,.11,.35,.38,.16);
  const lapel=(x:number,angle:number)=>{const piece=solid(body,light,x,.39,-.185,.1,.32,.035);piece.rotation.z=angle;};
  if(pattern===0){lapel(-.083,-.28);lapel(.083,.28);solid(body,shirt,0,.45,-.16,.085,.22,.035);solid(body,trousers,0,.4,-.183,.027,.16,.016);solid(body,light,-.145,.29,-.14,.085,.018,.025);}
  if(pattern===1){solid(body,shirt,0,.49,-.15,.15,.18,.04);lapel(-.09,-.3);lapel(.09,.3);for(let i=0;i<4;i++)part(body,new T.SphereGeometry(.013,8,6),trim,0,.12+i*.074,-.15);}
  if(pattern===2){const scarf=solid(body,light,-.08,.39,-.18,.105,.4,.055);scarf.rotation.z=-.08;rounded(body,light,0,.58,-.035,.4,.1,.3);for(let side of [-1,1])for(let i=0;i<3;i++)part(body,new T.SphereGeometry(.015,8,6),trim,side*.07,.14+i*.095,-.157);}
  if(pattern===3){solid(body,trim,0,.08,-.008,.43,.045,.29);rounded(body,light,0,.56,-.01,.38,.06,.28);}
  if(pattern===4){for(let i=0;i<6;i++){const stripe=solid(body,light,0,.16+i*.052,-.165,.46,.009,.012);stripe.scale.x=1-i*.025;}rounded(body,light,0,.57,0,.32,.06,.25);}
  const skirt=new T.Group(),skirtStanding=new T.Group(),lap=new T.Group();rig.add(skirt);skirt.add(skirtStanding,lap);lap.visible=false;
  if(pattern===2||pattern===3){
    const length=pattern===3?.5:.3;part(skirtStanding,new T.CylinderGeometry(.205,.33,length,32,1,true),cloth,0,-length/2+.03,0);
    const positions:number[]=[],indices:number[]=[];
    for(let row=0;row<6;row++)for(let col=0;col<=12;col++){
      const t=row/5,x=(col/12-.5)*2*(.23+t*.055),drop=row===5?(pattern===3?.2:.11):t*.065;
      positions.push(x,.02-drop-Math.pow(Math.abs(col/6-1),2)*.035,-t*.5);
      if(row<5&&col<12){const i=row*13+col;indices.push(i,i+1,i+13,i+1,i+14,i+13);}
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const material=cloth.clone();material.side=T.DoubleSide;part(lap,geometry,material,0,0,0);
  }
  const arms:T.Group[]=[],elbows:T.Group[]=[],hands:T.Group[]=[];
  for(const side of [-1,1]){
    const arm=new T.Group(),elbow=new T.Group(),hand=new T.Group();arm.position.set(side*(width+.025),.46,0);body.add(arm);elbow.position.y=-.29;arm.add(elbow);hand.position.set(0,-.285,0);elbow.add(hand);
    const sleeve=pattern===1?shirt:cloth;
    part(arm,new T.CapsuleGeometry(.067,.19,5,12),sleeve,0,-.14,0);
    part(elbow,new T.CapsuleGeometry(.058,.18,5,12),sleeve,0,-.13,0);
    rounded(hand,skin,0,-.01,-.006,.105,.13,.075);rounded(hand,skin,-side*.047,0,-.012,.035,.065,.045);
    solid(elbow,light,0,-.245,0,.12,.035,.12);arms.push(arm);elbows.push(elbow);hands.push(hand);
  }
  const legs:T.Group[]=[],knees:T.Group[]=[],feet:T.Group[]=[];
  for(const side of [-1,1]){
    const hip=new T.Group(),knee=new T.Group(),foot=new T.Group();hip.position.set(side*.105,-.015,0);rig.add(hip);knee.position.y=-.43;hip.add(knee);foot.position.y=-.43;knee.add(foot);
    part(hip,new T.CapsuleGeometry(.081,.27,5,12),trousers,0,-.205,0);
    part(knee,new T.CapsuleGeometry(.066,.29,5,12),trousers,0,-.21,0);
    rounded(foot,leather,0,-.052,-.065,.155,.13,.29);solid(foot,leather,0,-.102,-.06,.15,.026,.27);
    legs.push(hip);knees.push(knee);feet.push(foot);
  }
  const veil=new T.Group();head.add(veil);veil.visible=false;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('미사포를 그릴 수 없습니다.');
  ctx.fillStyle='#eee5cf35';ctx.fillRect(0,0,128,128);ctx.strokeStyle='#f3e9cbbf';ctx.lineWidth=1;
  for(let y=0;y<128;y+=16)for(let x=0;x<128;x+=16){ctx.beginPath();ctx.arc(x+8,y+8,5,0,Math.PI*2);ctx.stroke();for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.beginPath();ctx.ellipse(x+8+Math.cos(a)*5,y+8+Math.sin(a)*5,3,1.5,a,0,Math.PI*2);ctx.stroke();}}
  const lace=new T.CanvasTexture(canvas);lace.colorSpace=T.SRGBColorSpace;
  const veilMaterial=new T.MeshStandardMaterial({color:'#f5e9cf',map:lace,transparent:true,opacity:.75,side:T.DoubleSide,depthWrite:false,roughness:1});
  part(veil,new T.SphereGeometry(.207,24,16,0,Math.PI*2,0,Math.PI*.58),veilMaterial,0,.087,.018);
  const drape=part(veil,new T.CylinderGeometry(.2,.33,.59,28,8,true,Math.PI*.08,Math.PI*1.84),veilMaterial,0,-.17,.055);drape.rotation.y=Math.PI;
  for(const rigid of [body,head,...elbows,...hands,...legs,...knees,...feet])mergeRigid(rigid);
  const avatar={group,rig,body,head,arms,elbows,hand:hands[1],legs,knees,feet,veil,skirt,skirtStanding,lap,pattern,pose:{seat:0,gait:0,walk:0}};
  animateAvatar(avatar,false,0,0,1,true);return avatar;
}
export type Avatar=ReturnType<typeof makeAvatar>;
/** Hip height and bent knees meet the 0.575m bench, rather than shrinking a standing body. */
export function animateAvatar(avatar:Avatar,seated:boolean,speed:number,seconds:number,delta:number,reduced=false){
  const state=avatar.pose,blend=reduced||delta>=1?1:1-Math.exp(-Math.max(0,delta)*8);
  state.seat=T.MathUtils.lerp(state.seat,seated?1:0,blend);state.walk=T.MathUtils.lerp(state.walk,speed>0?Math.min(1,speed/1.8):0,blend);
  if(!reduced)state.gait+=Math.min(.1,delta)*speed*4.4;
  const seat=state.seat,walk=state.walk*(1-seat),phase=state.gait;
  avatar.rig.scale.set(1,1,1);avatar.rig.position.set(0,T.MathUtils.lerp(.98,.685,seat)+(reduced?0:Math.abs(Math.sin(phase))*walk*.024),seat*.70);
  avatar.body.rotation.x=-Math.sin(seat*Math.PI)*.16-seat*.025;avatar.body.rotation.y=reduced?0:Math.sin(phase)*walk*.035;
  avatar.body.rotation.z=reduced?0:Math.cos(phase)*walk*.022;
  for(let i=0;i<2;i++){
    const stride=Math.sin(phase+i*Math.PI),swing=stride*.47*walk;
    avatar.legs[i].rotation.x=seat*1.35+swing;
    avatar.knees[i].rotation.x=-seat*1.35-Math.max(0,-stride)*.68*walk;
    avatar.feet[i].rotation.x=Math.max(0,stride)*.12*walk;
    avatar.arms[i].rotation.x=seat*.32-swing*.63;avatar.arms[i].rotation.z=(i===0?1:-1)*.055;
    avatar.elbows[i].rotation.x=.12+seat*.58+Math.abs(stride)*walk*.12;
  }
  avatar.skirtStanding.visible=seat<.4;avatar.skirtStanding.scale.y=1-seat*.25;avatar.lap.visible=seat>=.4;
  avatar.head.rotation.x=-seat*.03+(reduced||speed?0:Math.sin(seconds*.75+avatar.pattern)*.007);
}

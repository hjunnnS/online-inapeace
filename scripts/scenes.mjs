import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { writeFile, mkdir } from 'node:fs/promises';

globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(buffer => { this.result = buffer; this.onloadend?.(); });
  }
};

const material = (color, options={}) => new T.MeshStandardMaterial({ color, roughness: .87, ...options });
const stone = material('#9a8974');
const trim = material('#b8a688');
const wall = material('#786d60');
const oak = material('#513422');
const dark = material('#32271e');
const brass = material('#bc8c4c', {metalness:.38,roughness:.4});
const red = material('#644043');
const glass = ['#ce8750','#b7c7a5','#638cae','#9d5360','#d8b675','#648d83'].map(c => material(c,{emissive:c,emissiveIntensity:.95,side:T.DoubleSide}));
const boxGeo = new T.BoxGeometry();
function box(group, mat, x,y,z,w,h,d, name='') {
  const mesh = new T.Mesh(boxGeo,mat);
  mesh.position.set(x,y,z); mesh.scale.set(w,h,d); mesh.name=name;
  group.add(mesh); return mesh;
}
function marker(group,name,x,z, rotation=0) {
  const node=new T.Object3D(); node.name=name; node.position.set(x,0,z);node.rotation.y=rotation;group.add(node);
}
function blocker(group,x,z,w,d) {
  const node=new T.Object3D(); node.name='Collision'; node.position.set(x,0,z); node.userData={width:w,depth:d};group.add(node);
}
function pew(group,x,z,width) {
  for(const dx of [-width/2+.12,width/2-.12]) box(group,dark,x+dx,.27,z,.18,.54,.62);
  box(group,oak,x,.51,z,width,.13,.59);
  box(group,oak,x,.84,z+.28,width,.54,.12);
  box(group,trim,x,1.13,z+.28,width,.065,.14);
  blocker(group,x,z,width,.65);
  marker(group,'Seat',x,z-.77);
}
function archPoints(half, height) {
  const points=[];
  for(let i=0;i<=20;i++){
    const x=-half+i*half/10;
    points.push(new T.Vector2(x,height*(1-Math.pow(Math.abs(x/half),1.45))));
  }
  return points;
}
function rib(group,x,y,z,half,height,side=false) {
  const points=archPoints(half,height);
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i];
    const mesh=box(group,trim,x+(side?0:(a.x+b.x)/2),y+(a.y+b.y)/2,z+(side?(a.x+b.x)/2:0),a.distanceTo(b)+.045,.21,.31);
    mesh.rotation.z=Math.atan2(b.y-a.y,b.x-a.x);
    if(side) mesh.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-Math.PI/2));
  }
}
function windowPanel(group,x,z,side=0) {
  const frame=new T.Group(); frame.position.set(x,5.25,z); frame.rotation.y=side*Math.PI/2;group.add(frame);
  box(frame,dark,0,.88,0,1.6,3.35,.14);
  for(let row=0;row<9;row++){
    const cols=row>=7?2:3;
    for(let col=0;col<cols;col++){
      const paletteIndex = ((row*3+col*2+Math.round(z))%glass.length+glass.length)%glass.length;
      const tile=box(frame,glass[paletteIndex],(col-(cols-1)/2)*.43,row*.34-.55,.1,.38,.30,.075);
      if(row>=7)tile.rotation.z=(col===0?1:-1)*.17;
    }
  }
  for(const sign of [-1,1])box(frame,trim,sign*.8,.78,.08,.13,3.2,.17);
  rib(frame,0,1.95,.1,.81,1.02);
  box(frame,trim,0,-.78,.13,1.91,.18,.37);
}
function cathedral(){
  const group=new T.Group();
  box(group,wall,0,-.18,0,19,.35,39);
  const floors=[material('#827260'),material('#8e7c69'),material('#71665c'),material('#9a8774')];
  for(let z=-18;z<20;z+=2)for(let x=-8;x<=8;x+=2)box(group,floors[(x*x+z*z+x+z+1000)%4],x,-.032,z,1.985,.06,1.985);
  for(const sign of [-1,1]){
    box(group,wall,sign*9,5,0,.35,10,39);
    box(group,stone,sign*8.78,1.25,0,.18,2.5,39);
    box(group,trim,sign*8.67,2.55,0,.24,.17,39);
    for(let z=-13;z<=13;z+=5.2)windowPanel(group,sign*8.78,z,-sign);
    for(let z=-13;z<=13;z+=5.2){
      box(group,stone,sign*4.8,3.15,z,.72,6.3,.72);
      box(group,trim,sign*4.8,.31,z,1.12,.62,1.12);
      box(group,trim,sign*4.8,5.83,z,1.02,.48,1.02);
      blocker(group,sign*4.8,z,1.12,1.12);
      rib(group,sign*4.8,5.9,z+2.6,2.6,2.75,true);
      box(group,brass,sign*4.35,3.6,z,.34,.09,.32);
      box(group,glass[4],sign*4.34,3.79,z,.11,.28,.11);
    }
    for(let z=-8;z<=11;z+=2.12)pew(group,sign*2.97,z,3.24);
  }
  box(group,wall,0,5,-19,18,10,.38);
  box(group,wall,0,5,19,18,10,.38);
  box(group,dark,0,10.72,0,19,.45,39);
  for(let z=-16;z<19;z+=5.2)rib(group,0,6.2,z,8.85,4.3);
  box(group,red,0,.012,0,2.3,.024,34);
  for(const x of [-3,0,3])windowPanel(group,x,-18.72);
  box(group,trim,0,.12,-14.5,9,.24,6.5);
  box(group,stone,0,.31,-15,8,.22,5.5);
  blocker(group,0,-14.7,8,5);
  box(group,trim,0,1,-14.8,3.4,1.15,1.45);
  box(group,brass,0,1.62,-14.8,3.62,.13,1.59);
  box(group,brass,0,3.05,-17.95,.19,2.62,.15);
  box(group,brass,0,3.48,-17.95,1.35,.17,.15);
  const booth=new T.Group();booth.position.set(7.4,0,9.7);group.add(booth);
  box(booth,oak,0,1.25,0,2,2.5,.18);
  box(booth,oak,0,2.5,.63,2,.16,1.45);
  for(const sign of [-1,1])box(booth,oak,sign*.94,1.25,.65,.16,2.5,1.5);
  box(booth,red,.43,1.27,1.33,.83,2.15,.08);
  for(let y=.8;y<2;y+=.21)box(booth,trim,-.45,y,1.34,.66,.052,.04);
  blocker(group,7.4,10.35,2,1.55);
  marker(group,'Confessional',7.4,12.05);
  marker(group,'Spawn',0,15);
  group.userData={bounds:[-8.55,8.55,-18.25,18.25]};
  return group;
}
function fixture(color){
  const group=new T.Group();
  box(group,material(color),0,-.15,0,10,.3,12);
  box(group,wall,0,1.5,-6,10,3,.2);
  pew(group,2,0,2.6);
  marker(group,'Spawn',0,4); marker(group,'Confessional',-3,-3);
  group.userData={bounds:[-4.8,4.8,-5.7,5.7]};
  return group;
}
function batchMeshes(root){
  root.updateMatrixWorld(true);
  const buckets=new Map();
  const meshes=[];
  root.traverse(node=>{
    if(!node.isMesh)return;
    const geometry=node.geometry.clone().applyMatrix4(node.matrixWorld);
    const material=node.material;
    if(!buckets.has(material))buckets.set(material,[]);
    buckets.get(material).push(geometry);
    meshes.push(node);
  });
  meshes.forEach(mesh=>mesh.removeFromParent());
  for(const [material,parts] of buckets){
    const merged=mergeGeometries(parts);
    parts.forEach(part=>part.dispose());
    root.add(new T.Mesh(merged,material));
  }
}
await mkdir('public/scenes',{recursive:true});
for(const [id,group] of [['bariloche',cathedral()],['test-a',fixture('#746252')],['test-b',fixture('#526b68')]]){
  batchMeshes(group);
  const glb=await new GLTFExporter().parseAsync(group,{binary:true});
  await writeFile('public/scenes/'+id+'.glb',Buffer.from(glb));
}

import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {hideFlatRoof} from '../src/architecture.ts';
import {disposeObject} from '../src/resources.ts';
test('roof replacement never removes the floor, tall walls, or narrow vault ribs',()=>{
 for(const [id,w,l,h] of [['bariloche',9,19,10.72],['milan',12.5,24,14]]){
  const root=new T.Group(),material=new T.MeshStandardMaterial();
  const add=(width,height,depth,y)=>{const mesh=new T.Mesh(new T.BoxGeometry(width,height,depth),material);mesh.position.y=y;root.add(mesh);return mesh;};
  const floor=add(w*2,.28,l*2,-.14),roof=add(w*2,id==='bariloche'?.45:.2,l*2,h),wall=add(w*2,h,.35,h/2),rib=add(2,.21,.31,h-.2);
  hideFlatRoof(root,[-w+.35,w-.35,-l+.35,l-.35],id);
  assert.equal(roof.visible,false);assert.equal(floor.visible,true);assert.equal(wall.visible,true);assert.equal(rib.visible,true);
  disposeObject(root);
 }
});

test('a roof merged with the floor and ribs loses only its twelve roof triangles',async()=>{
 const {mergeGeometries}=await import('three/addons/utils/BufferGeometryUtils.js');
 const root=new T.Group(),material=new T.MeshStandardMaterial();
 const shapes=[new T.BoxGeometry(19,.35,39).translate(0,-.18,0),new T.BoxGeometry(19,.45,39).translate(0,10.72,0),new T.BoxGeometry(19,10,.35).translate(0,5,-19),new T.BoxGeometry(2,.21,.31).translate(0,10.4,0)];
 const geometry=mergeGeometries(shapes),count=geometry.index.count;shapes.forEach(shape=>shape.dispose());
 const mesh=new T.Mesh(geometry,material);root.add(mesh);hideFlatRoof(root,[-8.55,8.55,-18.25,18.25],'bariloche');
 assert.equal(mesh.visible,true);assert.equal(mesh.geometry.index.count,count-36,'remove roof triangles while preserving floor, wall and arch');
 const used=new Set(Array.from(mesh.geometry.index.array));assert.ok([...used].some(i=>mesh.geometry.attributes.position.getY(i)<0),'floor survives');
 assert.ok([...used].some(i=>mesh.geometry.attributes.position.getY(i)>10),'high rib survives');disposeObject(root);
});

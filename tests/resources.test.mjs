import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {disposeObject} from '../src/resources.ts';

test('unloading a cathedral also releases candle sprites and particle textures',()=>{
 const parent=new T.Group(),root=new T.Group();parent.add(root);
 const candleHalo=new T.Texture(),particleTexture=new T.Texture(),sharedMap=new T.Texture();
 let haloReleases=0,particleReleases=0,sharedReleases=0;
 candleHalo.addEventListener('dispose',()=>haloReleases++);
 particleTexture.addEventListener('dispose',()=>particleReleases++);
 sharedMap.addEventListener('dispose',()=>sharedReleases++);
 root.add(new T.Sprite(new T.SpriteMaterial({map:candleHalo})));
 root.add(new T.Points(new T.BufferGeometry(),new T.PointsMaterial({map:particleTexture})));
 root.add(new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial({map:sharedMap,bumpMap:sharedMap})));
 root.add(new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial({map:sharedMap})));
 disposeObject(root);
 assert.equal(haloReleases,1);assert.equal(particleReleases,1);assert.equal(sharedReleases,1);
 assert.equal(parent.children.length,0);
});

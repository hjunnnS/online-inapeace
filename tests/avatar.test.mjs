import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeAvatar,animateAvatar} from '../src/avatar.ts';
import {disposeObject} from '../src/resources.ts';

// Texture drawing is irrelevant to this CPU-only joint/contact regression.
globalThis.document={createElement(){return {width:0,height:0,getContext(){return {fillRect(){},beginPath(){},arc(){},stroke(){},ellipse(){}};}};}};
test('all five bodies sit over the bench, with knees forward and feet near the floor',()=>{
 for(let pattern=0;pattern<5;pattern++){
  const avatar=makeAvatar('#506878',pattern);
  animateAvatar(avatar,true,0,0,1,true);avatar.group.updateMatrixWorld(true);
  const hip=avatar.rig.getWorldPosition(new T.Vector3());
  assert.ok(Math.abs((hip.y-.105)-.575)<.012,'pelvis meets the 0.575m seat');
  for(let i=0;i<2;i++){
   const knee=avatar.knees[i].getWorldPosition(new T.Vector3());
   const sole=new T.Box3().setFromObject(avatar.feet[i]);
   assert.ok(knee.z<hip.z-.35,'thigh points forward');
   assert.ok(sole.min.y>-.025&&sole.min.y<.07,'feet remain close to the floor');
  }
  animateAvatar(avatar,false,0,0,1,true);avatar.group.updateMatrixWorld(true);
  for(const foot of avatar.feet){const sole=new T.Box3().setFromObject(foot);assert.ok(Math.abs(sole.min.y)<.035,'standing sole meets floor');}
  disposeObject(avatar.group);
 }
});
test('sitting blends gradually instead of shrinking or instantly changing the body',()=>{
 const avatar=makeAvatar('#506878',0);
 animateAvatar(avatar,true,0,0,.016);
 assert.ok(avatar.pose.seat>0&&avatar.pose.seat<.3);
 assert.equal(avatar.rig.scale.y,1);
 for(let i=0;i<120;i++)animateAvatar(avatar,true,0,i/60,1/60);
 assert.ok(avatar.pose.seat>.99);
 disposeObject(avatar.group);
});

test('prayer hands meet in front of the chest and closed eyes restore on standing',()=>{
 for(let pattern=0;pattern<5;pattern++){
  const avatar=makeAvatar('#506878',pattern,pattern);avatar.praying=true;
  animateAvatar(avatar,true,0,0,1,true);avatar.group.updateMatrixWorld(true);
  const left=avatar.hands[0].getWorldPosition(new T.Vector3()),right=avatar.hands[1].getWorldPosition(new T.Vector3());
  const chest=avatar.body.getWorldPosition(new T.Vector3());
  assert.ok(left.distanceTo(right)<.065,'hands meet');
  assert.ok(left.z<chest.z-.25&&right.z<chest.z-.25,'hands stay in front of torso');
  assert.ok(left.y>chest.y+.22,'hands are raised above the lap');
  assert.equal(avatar.eyesOpen.visible,false);assert.equal(avatar.eyesClosed.visible,true);
  assert.equal(avatar.prayerHands.visible,true);
  animateAvatar(avatar,false,0,0,1,true);
  assert.equal(avatar.eyesOpen.visible,true);assert.equal(avatar.eyesClosed.visible,false);assert.equal(avatar.prayerHands.visible,false);
  assert.equal(avatar.arms[0].rotation.y,0);
  disposeObject(avatar.group);
 }
});

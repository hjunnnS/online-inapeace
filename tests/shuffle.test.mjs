import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ShuffleQueue} from '../src/shuffle.ts';

test('each shuffle cycle plays every carol exactly once',()=>{
 const queue=new ShuffleQueue(10,()=>.37);
 let last;
 for(let cycle=0;cycle<30;cycle++){
  const tracks=Array.from({length:10},()=>queue.next());
  assert.equal(new Set(tracks).size,10);
  assert.notEqual(tracks[0],last);
  assert(tracks.every(track=>track>=0&&track<10));
  last=tracks.at(-1);
 }
});
test('one-track and empty catalogs have explicit behavior',()=>{
 const queue=new ShuffleQueue(1);
 assert.equal(queue.next(),0);assert.equal(queue.next(),0);
 assert.throws(()=>new ShuffleQueue(0));
});

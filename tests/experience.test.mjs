import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NavigationIntent,PrayerJourney,prayerCanAdvance} from '../src/intent.ts';
import {readPreferences,writePreferences} from '../src/preferences.ts';
test('temporary menus preserve the destination and deliver its action exactly once',()=>{
 const intent=new NavigationIntent();let arrivals=0;const path=[{x:2,z:3}];intent.path=path;intent.arrival=()=>arrivals++;
 for(const view of ['audio','walk','photo','walk','catalog','walk','activities','walk']){intent.transition(view);assert.equal(intent.path,path);}
 intent.complete();intent.complete();assert.equal(arrivals,1);
 for(const view of ['loading','room','welcome','conduct']){intent.path=[1];intent.arrival=()=>arrivals++;intent.transition(view);assert.deepEqual(intent.path,[]);intent.complete();}
 assert.equal(arrivals,1);
});
test('prayer timer starts only at prayer, pauses offscreen and completes once',()=>{
 const session=new PrayerJourney(30);session.tick(5,true);assert.equal(session.elapsed,0);
 session.next();session.tick(5,true);assert.equal(session.elapsed,0);session.next();
 session.tick(1,false);assert.equal(session.remaining,30);session.paused=true;session.tick(1,true);assert.equal(session.remaining,30);
 session.paused=false;for(let i=0;i<30;i++)session.tick(1,true);assert.equal(session.stage,'complete');session.tick(1,true);assert.equal(session.remaining,0);
});
test('preferences recover from corruption or denied storage and validate all fields',()=>{
 for(const value of ['null','invalid','[]','{}'])assert.deepEqual(readPreferences({getItem:()=>value},['paris']),{volume:.5,effects:.25,light:'day',reduced:undefined,favorite:undefined});
 const actual=readPreferences({getItem:()=>JSON.stringify({volume:4,effects:-2,light:'wrong',reduced:1,favorite:'unknown'})},['paris']);assert.equal(actual.volume,1);assert.equal(actual.effects,0);assert.equal(actual.light,'day');assert.equal(actual.favorite,undefined);
 assert.equal(readPreferences({getItem(){throw Error('denied');}},[]).volume,.5);
 assert.equal(writePreferences({setItem(){throw Error('denied');}},{volume:.5,effects:.2,light:'day'}),false);
});
test('only allowed environmental preferences survive a write, never private writing',()=>{
 let saved;const store={setItem(key,value){saved={key,value:JSON.parse(value)};}};
 writePreferences(store,{volume:.3,effects:.1,light:'night',reduced:true,favorite:'paris',thought:'PRIVATE',history:['PRIVATE']});
 assert.deepEqual(Object.keys(saved.value).sort(),['effects','favorite','light','reduced','volume']);
 assert.equal(JSON.stringify(saved).includes('PRIVATE'),false);
 assert.equal(readPreferences({getItem:()=>JSON.stringify(saved.value)},['paris']).favorite,'paris');
});

test('a skipped seat enters standing prayer immediately and quiet viewing does not pause its timer',()=>{
 const session=new PrayerJourney(30);session.next();session.skipSeat();assert.equal(session.stage,'prayer');assert.equal(session.standing,true);
 const visible={active:true,hidden:false,modal:false,releasing:false,game:false};
 for(let i=0;i<10;i++)session.tick(1,prayerCanAdvance(visible));assert.equal(session.remaining,20);
 for(const stopped of [{...visible,hidden:true},{...visible,modal:true},{...visible,game:true}])assert.equal(prayerCanAdvance(stopped),false);
 session.paused=true;session.tick(1,prayerCanAdvance(visible));assert.equal(session.remaining,20);
});
test('cancelling a labelled route clears progress and cannot fire a late arrival',()=>{
 const intent=new NavigationIntent();let arrived=false;intent.path=[1,2];intent.label='촛대';intent.totalDistance=10;intent.arrival=()=>{arrived=true;};
 intent.transition('audio');assert.equal(intent.label,'촛대');intent.cancel();intent.complete();assert.equal(arrived,false);assert.equal(intent.label,'');assert.equal(intent.totalDistance,0);
});

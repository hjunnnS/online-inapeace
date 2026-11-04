import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RhythmSession,songNotes,songDuration} from '../src/rhythm.ts';

test('an input scores one note and cannot score it twice',()=>{
 const session=new RhythmSession(),note=songNotes[0];
 assert.equal(session.judge(note.direction,1),'ready');
 assert.equal(session.judge(note.direction,note.time),'perfect');
 assert.equal(session.judge(note.direction,note.time),'early');
 assert.equal(session.hits,1);
});
test('timing boundaries, misses and skipped frames are handled',()=>{
 const session=new RhythmSession();
 const note=songNotes[0];
 assert.equal(session.judge(note.direction,note.time+.2),'good');
 session.advance(songDuration);
 assert.equal(session.missed,songNotes.length-1);
 assert.equal(session.finished,true);
 session.advance(songDuration+20);
 assert.equal(session.missed,songNotes.length-1);
});
test('cancelled sessions reject input and retries start empty',()=>{
 const first=new RhythmSession();first.end();
 assert.equal(first.judge(songNotes[0].direction,songNotes[0].time),'ready');
 const next=new RhythmSession();assert.equal(next.hits,0);assert.equal(next.finished,false);
});

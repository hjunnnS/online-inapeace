import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const enginePath=process.argv[2];
if(!enginePath)throw new Error('Pass the path to the local espeak-ng.js module.');
const {default:makeEngine}=await import(pathToFileURL(resolve(enginePath)).href);
const engine=await makeEngine();
const voice=new engine.eSpeakNGWorker();
const phrases=JSON.parse(await readFile('src/phrases.json','utf8'));
const pronunciation={
 a01:'Dèo gràtsias',
 a03:'Dòminus vobìscum',
 a04:'Et cum spìritu tùo',
 a05:'Orèmus',
 a06:'Sùrsum còrda',
 a07:'Abèmus ad Dòminum',
 a08:'Gràtsias agàmus Dòmino Dèo nòstro',
 a09:'Dìgnum et iùstum est',
 a10:'Laus tìbi Crìste'
};
function wav(samples,rate){
 const buffer=Buffer.alloc(44+samples.length*2);
 buffer.write('RIFF',0);buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);
 buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);
 buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);
 buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(samples.length*2,40);
 for(let i=0;i<samples.length;i++)buffer.writeInt16LE(Math.round(Math.max(-32767,Math.min(32767,samples[i]))),44+i*2);
 return buffer;
}
await mkdir('public/audio',{recursive:true});
for(const phrase of phrases){
 const result=voice.set_voice(phrase.lang==='la'?'it':'en-us');
 if(result!==0)throw new Error('Unavailable voice: '+phrase.lang);
 voice.rate=125;voice.pitch=32;voice.range=30;
 const samples=[];
 voice.synthesize(pronunciation[phrase.id]??phrase.text,chunk=>{for(const x of chunk)samples.push(x);return false;});
 const rate=voice.samplerate,tail=Math.floor(rate*.24);
 const mixed=new Float64Array(samples.length+tail);
 let peak=1;
 for(let i=0;i<mixed.length;i++){
   const delay=Math.round(rate*.073);
   mixed[i]=(samples[i]??0)+.15*(samples[i-delay]??0)+.065*(samples[i-2*delay]??0);
   peak=Math.max(peak,Math.abs(mixed[i]));
 }
 if(peak<100)throw new Error('Empty voice output: '+phrase.id);
 for(let i=0;i<mixed.length;i++)mixed[i]*=22000/peak;
 await writeFile('public/audio/'+phrase.id+'.wav',wav(mixed,rate));
}
const rate=22050, ambience=new Float64Array(rate*8);
for(let i=0;i<ambience.length;i++){
 const t=i/rate;
 ambience[i]=Math.sin(2*Math.PI*55*t)*170+Math.sin(2*Math.PI*82.5*t)*95+Math.sin(2*Math.PI*110*t)*60;
}
await writeFile('public/audio/room.wav',wav(ambience,rate));

export type Preferences={volume:number;effects:number;light:'day'|'dusk'|'night';reduced?:boolean;favorite?:string};
const key='inapeace.preferences.v1';
const defaults:Preferences={volume:.5,effects:.25,light:'day',reduced:undefined,favorite:undefined};
export function readPreferences(storage:Pick<Storage,'getItem'>,ids:string[]):Preferences{
  try{const value=JSON.parse(storage.getItem(key)??'{}');return {
    volume:typeof value?.volume==='number'&&Number.isFinite(value.volume)?Math.max(0,Math.min(1,value.volume)):defaults.volume,
    effects:typeof value?.effects==='number'&&Number.isFinite(value.effects)?Math.max(0,Math.min(1,value.effects)):defaults.effects,
    light:['day','dusk','night'].includes(value?.light)?value.light:'day',
    reduced:typeof value?.reduced==='boolean'?value.reduced:undefined,
    favorite:ids.includes(value?.favorite)?value.favorite:undefined,
  };}catch{return {...defaults};}
}
/** Deliberate allowlist: never persist writing, ritual history, or a user identity. */
export function writePreferences(storage:Pick<Storage,'setItem'>,value:Preferences){
  try{storage.setItem(key,JSON.stringify({volume:value.volume,effects:value.effects,light:value.light,reduced:value.reduced,favorite:value.favorite}));return true;}catch{return false;}
}

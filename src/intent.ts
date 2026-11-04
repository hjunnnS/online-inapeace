const temporaryViews=new Set(['walk','audio','catalog','points','reflection','photo','choir','activities','explore','journey-options']);
/** A temporary menu pauses locomotion; it does not discard its arrival action. */
export class NavigationIntent<T>{
  path:T[]=[];
  arrival?:()=>void;
  transition(view:string){if(!temporaryViews.has(view))this.cancel();}
  cancel(){this.path=[];this.arrival=undefined;}
  complete(){const done=this.arrival;this.arrival=undefined;done?.();}
}
export type PrayerStage='candle'|'seat'|'prayer'|'complete';
export class PrayerJourney{
  stage:PrayerStage='candle';
  elapsed=0;
  paused=false;
  duration:number;
  constructor(duration=60){this.duration=duration;}
  next(){if(this.stage==='candle')this.stage='seat';else if(this.stage==='seat')this.stage='prayer';else if(this.stage==='prayer')this.stage='complete';}
  tick(delta:number,visible:boolean){if(this.stage!=='prayer'||this.paused||!visible)return;this.elapsed=Math.min(this.duration,this.elapsed+Math.max(0,Math.min(delta,1)));if(this.elapsed>=this.duration)this.next();}
  get remaining(){return Math.ceil(this.duration-this.elapsed);}
}

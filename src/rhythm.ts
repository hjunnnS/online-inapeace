export const directions=['left','down','up','right'] as const;
export type Direction=typeof directions[number];
export type Note={time:number;direction:Direction;judged:boolean};
export const songDuration=66;
export const songNotes=Array.from({length:40},(_,index)=>({time:4.5+index*1.5,direction:directions[(index*3+Math.floor(index/4))%4]}));
export class RhythmSession {
  readonly notes:Note[]=songNotes.map(note=>({...note,judged:false}));
  hits=0;
  missed=0;
  finished=false;
  judge(direction:Direction,time:number){
    if(this.finished||time<3)return 'ready';
    const note=this.notes.find(note=>!note.judged&&note.direction===direction&&Math.abs(note.time-time)<=.28);
    if(!note)return 'early';
    note.judged=true;this.hits++;
    return Math.abs(note.time-time)<=.12?'perfect':'good';
  }
  advance(time:number){
    if(this.finished)return;
    for(const note of this.notes){if(!note.judged&&time-note.time>.28){note.judged=true;this.missed++;}}
    if(time>=songDuration)this.finished=true;
  }
  end(){this.finished=true;}
}

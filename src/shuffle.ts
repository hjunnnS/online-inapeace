export class ShuffleQueue {
  private remaining:number[]=[];
  private previous:number|undefined;
  private readonly count:number;
  private readonly random:()=>number;
  constructor(count:number,random:()=>number=Math.random){
    this.count=count;this.random=random;
    if(!Number.isInteger(count)||count<1)throw new Error('재생할 곡이 필요합니다.');
  }
  next(){
    if(!this.remaining.length){
      this.remaining=Array.from({length:this.count},(_,index)=>index);
      for(let i=this.remaining.length-1;i>0;i--){
        const j=Math.floor(this.random()*(i+1));
        [this.remaining[i],this.remaining[j]]=[this.remaining[j],this.remaining[i]];
      }
      const end=this.remaining.length-1;
      if(this.count>1&&this.remaining[end]===this.previous)[this.remaining[0],this.remaining[end]]=[this.remaining[end],this.remaining[0]];
    }
    const index=this.remaining.pop()!;this.previous=index;return index;
  }
}

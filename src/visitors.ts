import * as T from 'three';
import {makeAvatar,animateAvatar} from './sanctuary';

type Stop='seat'|'choir'|'confessional';
type Visitor={avatar:ReturnType<typeof makeAvatar>;home:T.Vector3;path:T.Vector3[];stop:Stop;next:number;wait:number;walking:boolean;completed:number;destination:T.Vector3;blocked:number;rise:number};
/** Three local background visitors; no user content or real presence is involved. */
export class VisitingPeople {
  readonly root=new T.Group();
  readonly people:Visitor[]=[];
  private stops:Stop[]=['seat','choir','seat','confessional'];
  constructor(homes:T.Vector3[],private choir:T.Vector3,private door:T.Vector3,private route:(target:T.Vector3,start:T.Vector3,avoid?:T.Vector3[])=>T.Vector3[],private valid:(x:number,z:number)=>boolean){
    const colors=['#a17e5c','#55767c','#8b6479'];
    homes.slice(0,3).forEach((home,index)=>{
      const avatar=makeAvatar(colors[index]);avatar.group.position.copy(home);
      avatar.veil.visible=index===1;this.root.add(avatar.group);
      const person:Visitor={avatar,home:home.clone(),path:[],stop:'seat',next:1,wait:3+index*8,walking:false,completed:0,destination:home.clone(),blocked:0,rise:0};
      this.people.push(person);this.pose(person,false,0,index);
    });
  }
  get status(){return this.people.map(person=>({state:person.walking?'walking-to-'+person.stop:person.stop,position:person.avatar.group.position.toArray(),pattern:person.avatar.pattern,seatBlend:person.avatar.pose.seat,completed:person.completed}));}
  get reservedSeats(){return this.people.map(person=>person.home);}
  private pose(person:Visitor,moving:boolean,seconds:number,index:number,delta=1,reduced=false){
    animateAvatar(person.avatar,!person.walking&&person.stop==='seat',moving?1.8+index*.12:0,seconds,delta,reduced);
  }
  tick(delta:number,seconds:number,paused:boolean,player:T.Vector3){
    this.people.forEach((person,index)=>{
      if(paused){this.pose(person,false,seconds,index,delta,true);return;}
      const position=person.avatar.group.position;
      let moving=false;
      if(person.walking&&person.rise>0){person.rise-=delta;this.pose(person,false,seconds,index,delta);return;}
      if(person.walking){
        const target=person.path[0];
        if(!target){
          person.walking=false;person.completed++;person.wait=person.stop==='seat'?8+index*2:5+index;

        }else{
          const direction=target.clone().sub(position),distance=direction.length();
          if(distance<.003)person.path.shift();
          else{
            direction.normalize();const pace=Math.min(delta*(1.8+index*.12),distance),candidate=position.clone().addScaledVector(direction,pace);
            // Give the player right of way, and let a following visitor wait.
            const nearPlayer=candidate.distanceToSquared(player)<.65*.65;
            const nearVisitor=this.people.some(other=>other!==person&&candidate.distanceToSquared(other.avatar.group.position)<.6*.6);
            if(!nearPlayer&&!nearVisitor&&this.valid(candidate.x,candidate.z)){
              position.copy(candidate);const yaw=Math.atan2(-direction.x,-direction.z),difference=T.MathUtils.euclideanModulo(yaw-person.avatar.group.rotation.y+Math.PI,Math.PI*2)-Math.PI;person.avatar.group.rotation.y+=difference*Math.min(1,delta*10);moving=true;person.blocked=0;
            }else{
              person.blocked+=delta;
              if(person.blocked>1.5+index*.4){
                const obstacles=[player,...this.people.filter(other=>other!==person).map(other=>other.avatar.group.position)];
                const rerouted=this.route(person.destination,position,obstacles);
                if(rerouted.length)person.path=rerouted;
                person.blocked=0;
              }
            }
          }
        }
      }else{
        person.wait-=delta;
        if(person.wait<=0){
          const stop=this.stops[person.next],destination=stop==='seat'?person.home:stop==='choir'?this.choir.clone().add(new T.Vector3((index-1)*1.25,0,-index*.35)):this.door.clone().add(new T.Vector3(index*.85,0,0));
          const path=this.route(destination,position);
          if(path.length){person.rise=person.stop==='seat'?.65:0;person.stop=stop;person.destination.copy(destination);person.blocked=0;person.path=path;person.walking=true;person.next=(person.next+1)%this.stops.length;}
          else person.wait=3;
        }
      }
      if(!person.walking){
        const yaw=person.stop==='confessional'?Math.atan2(-(7.4-position.x),-(10.35-position.z)):0;
        const difference=T.MathUtils.euclideanModulo(yaw-person.avatar.group.rotation.y+Math.PI,Math.PI*2)-Math.PI;
        person.avatar.group.rotation.y+=difference*Math.min(1,delta*9);
      }
      this.pose(person,moving,seconds,index,delta);
    });
  }
}

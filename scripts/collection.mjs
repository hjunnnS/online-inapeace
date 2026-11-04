import * as T from 'three';
export function collection({box,marker,blocker,pew,rib,material,oak,dark,brass,glass}){
  const plans=[
    ['paris',9.5,21,12,6,'#b1a18a'],
    ['chartres',8.4,20,11.5,5,'#9c9487'],
    ['reims',9,22,12.8,7,'#c2ad91'],
    ['cologne',7.8,25,16,7,'#848589'],
    ['milan',12.5,24,14,6,'#c4bab3'],
    ['seville',11.5,20,12,5,'#b29269'],
    ['burgos',8.9,18,11,5,'#bcaf9b'],
    ['vitus',9.5,22,13,6,'#a49b91'],
    ['stephen',9,19,10,5,'#a19989']
  ];
  return plans.map(([id,w,l,h,bays,color])=>{
    const g=new T.Group(), stone=material(color), pale=material('#cec0a9'), floor=material('#776f64'), roof=material('#3d3834');
    const blue=material('#304781',{emissive:'#3a529e',emissiveIntensity:.85});
    const gold=material('#c39a4c',{emissive:'#765523',emissiveIntensity:.28,metalness:.48});
    const ivory=material('#dbc8ac'), altarDark=material('#29292c');
    const round=(mat,x,y,z,r,length)=>{const m=new T.Mesh(new T.CylinderGeometry(r,r,length,12),mat);m.position.set(x,y,z);g.add(m);return m;};
    const rose=(x,y,z,r,back=false)=>{
      const window=new T.Group();window.position.set(x,y,z);window.rotation.y=back?Math.PI:0;g.add(window);
      const disk=new T.Mesh(new T.CircleGeometry(r,40),dark);window.add(disk);
      for(let k=0;k<16;k++){
        const a=k*Math.PI/8;
        for(const [d,size] of [[.44,.20],[.76,.13]]){
          const p=new T.Mesh(new T.CircleGeometry(r*size,9),glass[k%glass.length]);
          p.position.set(Math.cos(a)*r*d,Math.sin(a)*r*d,.04);window.add(p);
        }
      }
      const center=new T.Mesh(new T.CircleGeometry(r*.19,18),glass[4]);center.position.z=.05;window.add(center);
    };
    box(g,floor,0,-.14,0,w*2,.28,l*2);
    for(let z=-l+1;z<l;z+=2)for(let x=-w+1;x<w-0.5;x+=2){
      if((Math.round((x+w+z+l)/2)%2)===0)box(g,stone,x,.005,z,1.96,.01,1.96);
    }
    box(g,stone,0,h*.46,-l,2*w,h*.92,.35);box(g,stone,0,h*.46,l,2*w,h*.92,.35);
    box(g,roof,0,h,0,w*2,.2,l*2);
    const interval=(2*l-10)/bays;
    for(const side of [-1,1]){
      box(g,stone,side*w,h*.47,0,.35,h*.94,l*2);
      for(let j=0;j<bays;j++){
        const z=-l+5+j*interval,x=side*(id==='milan'?4.5:w*.55);
        const levels=id==='milan'?[x,side*8.2]:[x];
        for(const px of levels){
          round(stone,px,h*.29,z,id==='milan'?.56:.4,h*.58);
          box(g,pale,px,.24,z,1.13,.48,1.13);box(g,pale,px,h*.56,z,1.02,.36,1.02);
          blocker(g,px,z,1.13,1.13);
          if(id==='milan'){
            for(const dx of [-.33,.33])round(ivory,px+dx,h*.53,z+.57,.11,.66);
          }
        }
        rib(g,0,h*.56,z,w-.35,h*.35);
        rib(g,x,h*.50,z+interval/2,interval/2,h*.19,true);
        const pane=new T.Group();pane.position.set(side*(w-.22),h*.57,z);pane.rotation.y=-side*Math.PI/2;g.add(pane);
        const rows=id==='cologne'?10:7;
        box(pane,dark,0,0,0,1.62,h*.34,.08);
        for(let r=0;r<rows;r++)for(let c=0;c<3;c++){
          const tone=id==='chartres'&&(r+c)%4!==0?blue:glass[(r*2+c+j)%glass.length];
          box(pane,tone,(c-1)*.46,(r-(rows-1)/2)*h*.31/rows,.07,.41,h*.29/rows,.035);
        }
        rib(pane,0,h*.17,.08,.83,h*.072);
        if(id==='paris'){
          for(const y of [h*.38,h*.69])box(g,pale,side*(w-.32),y,z,.37,.14,interval*.92);
          for(let b=-1;b<=1;b++)rib(pane,b*.67,-h*.24,.09,.30,.45);
        }
        if(id==='reims')for(const dx of [-.65,0,.65]){
          round(ivory,side*(w-.46),2.7,z+dx,.13,.82);
          const head=new T.Mesh(new T.SphereGeometry(.125,10,8),ivory);head.position.set(side*(w-.46),3.2,z+dx);g.add(head);
        }
      }
      for(let z=-l+9;z<l-5;z+=2.2)pew(g,side*(id==='milan'?2.7:w*.31),z,Math.min(3.25,w*.38));
    }
    const end=-l+3.4;
    box(g,pale,0,.16,end,7,.32,3.6);blocker(g,0,end,7,3.6);
    box(g,id==='cologne'?altarDark:ivory,0,.96,end,3.4,1.2,1.18);
    box(g,gold,0,2.85,end-1.1,.13,2.25,.14);box(g,gold,0,3.18,end-1.1,1.24,.12,.14);
    if(id==='paris'||id==='reims')rose(0,h*.66,id==='reims'?l-.24:-l+.22,h*.165,id==='reims');
    if(id==='chartres'){
      for(let i=0;i<9;i++){
        const ring=new T.Mesh(new T.RingGeometry(.38+i*.28,.43+i*.28,80,1,i*.31,Math.PI*1.84),dark);
        ring.rotation.x=-Math.PI/2;ring.position.set(0,.023,l-4.9);g.add(ring);
      }
    }
    if(id==='cologne'){
      box(g,gold,0,1.61,end-.72,2.6,.45,.86);
      for(const side of [-1,1])for(let k=0;k<5;k++)box(g,oak,side*2.65,.67,end+2.5+k*.56,.45,1.1,.47);
    }
    if(id==='seville'){
      for(let r=0;r<6;r++)for(let c=-3;c<=3;c++){
        box(g,gold,c*.94,1.85+r*.8,end-1.72,.88,.72,.27);
        box(g,ivory,c*.94,1.85+r*.8,end-1.55,.20,.43,.12);
      }
      for(const side of [-1,1]){box(g,oak,side*1.24,1.15,1,.23,2.3,5);blocker(g,side*1.24,1,.23,5);}
    }
    if(id==='burgos'){
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;
        const beam=box(g,pale,Math.sin(a)*1.85,h-.52,Math.cos(a)*1.85,5.6,.19,.19);
        beam.rotation.y=a+Math.PI/4;
      }
      round(glass[4],0,h-.69,0,1.05,.18);
    }
    if(id==='vitus'){
      for(let i=0;i<5;i++)box(g,glass[i],-w+.46,2.3+i*.53,-6,.12,.41,2.9);
      box(g,gold,-w+1.12,.74,-6,1.18,1.45,3.5);
      blocker(g,-w+1.12,-6,1.18,3.5);
    }
    if(id==='stephen'){
      round(pale,-w*.55+.74,1.14,-1,.85,1.4);blocker(g,-w*.55+.74,-1,1.7,1.7);
      for(const sign of [-1,1]){round(gold,sign*1.8,2.34,end-1.5,.20,4.1);round(ivory,sign*1.46,2.14,end-1.28,.20,1.65);}
      rib(g,0,3.4,end-1.48,2.25,1.9);
    }
    const doorX=w-1.45,doorZ=l-7.1;
    box(g,oak,doorX,1.23,doorZ,1.7,2.45,1.17);
    box(g,pale,doorX,2.5,doorZ,1.83,.13,1.22);
    box(g,dark,doorX,1.35,doorZ+.60,1.02,1.72,.07);
    blocker(g,doorX,doorZ,1.7,1.18);
    marker(g,'Confessional',doorX,doorZ+1.65);
    marker(g,'Spawn',0,l-3.2);
    g.userData={bounds:[-w+.35,w-.35,-l+.35,l-.35]};
    return [id,g];
  });
}

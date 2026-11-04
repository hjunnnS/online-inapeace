import * as T from 'three';

// Keep the leadwork dark while making the colored glass slightly less saturated.
function softenGlass(material:T.MeshStandardMaterial|T.MeshBasicMaterial){
  material.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
vec3 softGlassColor(vec3 color){
  float luminance=dot(color,vec3(0.2126,0.7152,0.0722));
  vec3 muted=mix(vec3(luminance),color,0.78);
  return mix(muted,vec3(1.0),0.055*smoothstep(0.03,0.35,luminance));
}`)
      .replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;','sampledDiffuseColor.rgb=softGlassColor(sampledDiffuseColor.rgb);\n diffuseColor *= sampledDiffuseColor;'))
      .replace('#include <emissivemap_fragment>',T.ShaderChunk.emissivemap_fragment.replace('totalEmissiveRadiance *= emissiveColor.rgb;','emissiveColor.rgb=softGlassColor(emissiveColor.rgb);\n totalEmissiveRadiance *= emissiveColor.rgb;'));
  };
  material.customProgramCacheKey=()=> 'soft-stained-glass-v1';
}

/** Original glass artwork shared by the windows and their projected color. */
export function makeProjections(){
  const group=new T.Group();group.name='stained-glass-and-daylight';group.visible=false;
  const atlas=new T.TextureLoader().load(new URL('../public/textures/stained-glass-atlas.png',import.meta.url).href,()=>{
    for(const pane of panes)pane.needsUpdate=true;
    group.visible=true;
  });
  atlas.colorSpace=T.SRGBColorSpace;atlas.anisotropy=4;
  const panes=Array.from({length:3},(_,index)=>{
    const map=index?atlas.clone():atlas;
    map.repeat.set(1/3,1);map.offset.x=index/3;map.needsUpdate=true;return map;
  });
  // A lancet silhouette clips the black corners of the texture to the stone arch.
  const shape=new T.Shape();shape.moveTo(-.8,0);shape.lineTo(.8,0);shape.lineTo(.8,2.73);
  shape.quadraticCurveTo(.61,3.36,0,3.75);shape.quadraticCurveTo(-.61,3.36,-.8,2.73);shape.closePath();
  const geometry=new T.ShapeGeometry(shape,32),uv=geometry.getAttribute('uv'),position=geometry.getAttribute('position');
  for(let i=0;i<uv.count;i++)uv.setXY(i,(position.getX(i)+.8)/1.6,position.getY(i)/3.75);
  const glass=panes.map(map=>new T.MeshStandardMaterial({map,emissiveMap:map,emissive:'#ffffff',emissiveIntensity:.83,roughness:.35,metalness:.03,side:T.DoubleSide}));
  glass.forEach(softenGlass);
  const addWindow=(x:number,y:number,z:number,turn:number,index:number)=>{
    const window=new T.Mesh(geometry,glass[index%3]);window.position.set(x,y,z);window.rotation.y=turn;group.add(window);
  };
  for(const side of [-1,1])for(let i=0;i<6;i++)addWindow(side*8.49,4.47,-13+i*5.2,-side*Math.PI/2,(i+(side>0?1:0))%3);
  for(const side of [-1,0,1])addWindow(side*2.8,5.84,-18.66+Math.abs(side)*.59+.43,-side*.37,side+1);

  const projections:T.MeshBasicMaterial[]=[],shafts:T.MeshBasicMaterial[]=[];
  // Additive texture projection preserves each pane's color and dark leadwork.
  for(let i=0;i<5;i++){
    const z=-13+i*5.2;
    const material=new T.MeshBasicMaterial({map:panes[(i+1)%3],transparent:true,opacity:.29,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false});
    softenGlass(material);projections.push(material);
    const patch=new T.Mesh(new T.PlaneGeometry(7.2,2.7),material);
    patch.position.set(3.35,.044,z+2.7);patch.rotation.set(-Math.PI/2,0,-.36);group.add(patch);
  }
  // Soft-edged light ribbons cross the sun axis; no opaque cones or hard borders.
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=128;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('빛 질감을 만들 수 없습니다.');
  const glow=ctx.createLinearGradient(0,0,64,0);glow.addColorStop(0,'#ffffff00');glow.addColorStop(.3,'#fff7dfaa');glow.addColorStop(.5,'#fffdf0ff');glow.addColorStop(.7,'#fff7dfaa');glow.addColorStop(1,'#ffffff00');ctx.fillStyle=glow;ctx.fillRect(0,0,64,128);
  ctx.globalCompositeOperation='destination-in';const fade=ctx.createLinearGradient(0,0,0,128);fade.addColorStop(0,'#ffffff00');fade.addColorStop(.2,'#ffffffff');fade.addColorStop(.8,'#ffffffcc');fade.addColorStop(1,'#ffffff00');ctx.fillStyle=fade;ctx.fillRect(0,0,64,128);
  const glowMap=new T.CanvasTexture(canvas);
  const axis=new T.Vector3(-.84,-.54,.3).normalize();
  for(const z of [-13,-7.8,-2.6,2.6,7.8,13])for(let layer=0;layer<3;layer++){
    const start=new T.Vector3(8.43,6.9-layer*.63,z),end=start.clone().addScaledVector(axis,10.4);
    const width=new T.Vector3(0,.2,1).normalize().applyAxisAngle(axis,layer*Math.PI/3);
    const points=[start.clone().addScaledVector(width,-.23),start.clone().addScaledVector(width,.23),end.clone().addScaledVector(width,-1.05),end.clone().addScaledVector(width,1.05)];
    const beamGeometry=new T.BufferGeometry();beamGeometry.setAttribute('position',new T.Float32BufferAttribute(points.flatMap(p=>p.toArray()),3));beamGeometry.setAttribute('uv',new T.Float32BufferAttribute([0,1,1,1,0,0,1,0],2));beamGeometry.setIndex([0,2,1,2,3,1]);beamGeometry.computeVertexNormals();
    const material=new T.MeshBasicMaterial({map:glowMap,color:layer===1?'#e0eaff':'#fff3d1',transparent:true,opacity:.105,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false});
    shafts.push(material);group.add(new T.Mesh(beamGeometry,material));
  }
  const dustGeometry=new T.BufferGeometry(),dustPositions=new Float32Array(96*3),dustBase=new Float32Array(96*3);
  for(let i=0;i<96;i++){
    const t=((i*37)%101)/101,z=i%2?2.6:-7.8;
    dustBase.set([8.3-t*8.4,6.4-t*5.4,z+t*3+(i%7-3)*.18],i*3);
  }
  dustPositions.set(dustBase);dustGeometry.setAttribute('position',new T.BufferAttribute(dustPositions,3));
  const dustCanvas=document.createElement('canvas');dustCanvas.width=dustCanvas.height=32;const dustContext=dustCanvas.getContext('2d');if(!dustContext)throw new Error('먼지 빛을 그릴 수 없습니다.');
  const dustGlow=dustContext.createRadialGradient(16,16,0,16,16,16);dustGlow.addColorStop(0,'#fff4d7bb');dustGlow.addColorStop(.25,'#fff4d766');dustGlow.addColorStop(1,'#fff4d700');dustContext.fillStyle=dustGlow;dustContext.fillRect(0,0,32,32);
  const dustMap=new T.CanvasTexture(dustCanvas);
  const dustMaterial=new T.PointsMaterial({map:dustMap,color:'#ffe8c5',size:.012,sizeAttenuation:true,transparent:true,opacity:.32,depthWrite:false,blending:T.AdditiveBlending});
  group.add(new T.Points(dustGeometry,dustMaterial));
  return {group,
    setLight(preset:'day'|'dusk'|'night',blend:number){
      const amount=preset==='night'?0:preset==='dusk'?.4:1;
      for(const material of projections)material.opacity=T.MathUtils.lerp(material.opacity,.29*amount,blend);
      for(const material of shafts)material.opacity=T.MathUtils.lerp(material.opacity,.105*amount,blend);
      for(const material of glass)material.emissiveIntensity=T.MathUtils.lerp(material.emissiveIntensity,preset==='night'?.18:preset==='dusk'?.48:.83,blend);
      dustMaterial.opacity=T.MathUtils.lerp(dustMaterial.opacity,.32*amount,blend);
    },
    tick(seconds:number,reduced:boolean){
      for(let i=0;i<96;i++){
        dustPositions[i*3]=dustBase[i*3]+(reduced?0:Math.sin(seconds*.16+i)*.06);
        dustPositions[i*3+1]=dustBase[i*3+1]+(reduced?0:Math.sin(seconds*.12+i*.6)*.12);
      }
      dustGeometry.attributes.position.needsUpdate=true;
    }
  };
}

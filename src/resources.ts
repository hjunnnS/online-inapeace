import * as T from 'three';

export function disposeObject(group:T.Group) {
  const geometry=new Set<T.BufferGeometry>(), materials=new Set<T.Material>(), textures=new Set<T.Texture>();
  group.traverse(node=>{
    if (!(node instanceof T.Mesh||node instanceof T.Sprite||node instanceof T.Points)) return;
    if('geometry' in node)geometry.add(node.geometry);
    for(const m of Array.isArray(node.material)?node.material:[node.material])materials.add(m);
  });
  geometry.forEach(g=>g.dispose());
  materials.forEach(material=>{for(const value of Object.values(material))if(value instanceof T.Texture)textures.add(value);material.dispose();});
  textures.forEach(texture=>texture.dispose());
  group.removeFromParent();
}

# M8 stained glass

## Scope

I049 #58, Epic #37, Milestone M8. Fifteen Bariloche lancets use three original compositions. User reference screenshots informed jewel colors, dense lead seams, Gothic arches, and oblique light shafts. The texture is an original AI-generated illustration; it is not a photograph or an accurate reproduction of the real cathedral’s windows. No reference screenshot is included in the site.

Asset: `public/textures/stained-glass-atlas.png` (1536 × 1024, three equal vertical cells).

## Generation prompt

Create an ORIGINAL stained-glass texture atlas for a 3D cathedral, inspired by supplied references only in craft and luminous color. Front-facing orthographic triptych, landscape 3:2, exactly three equal-width tall pointed Gothic panels; no surroundings or stone frame. Dark lead, dense irregular glass, original cobalt/turquoise halo figure on the left, sacred botanical tree in gold/ruby/emerald in the middle, original warm cream/blue robed figure on the right. Backlit jewel colors, uneven glass, ornate upper tracery. No text, no copies of reference compositions, no beams painted into the texture.

## Rendering

`src/stainedglass.ts` maps the atlas to lancet-shaped surfaces just inside the old modeled frames. Emissive glass maintains backlit color. Additive, textured floor patches carry the same artwork; soft ribbons and subtle dust suggest oblique sunlight. The day/dusk/night controls attenuate these elements together. Reduced motion freezes dust without removing static light. Scene disposal releases all meshes, maps and particles through the existing resource traversal.

This is a real-time artistic approximation of transmitted light, not ray-traced refraction, exact stained-glass caustics, or physical volumetric scattering.

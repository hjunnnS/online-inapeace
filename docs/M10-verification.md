# M10 tree detail · 2026-11-04

Milestone10 / Epic #37 / implementation #62 (I053). User directly approved better tree quality and stronger twinkle.

- Replaced the eight stacked cone tiers and coarse tips with roughly a thousand needle-bearing branch sprays at varied heights, angles and inclinations. Three instanced foliage groups share one detailed geometric needle model; a dark inner canopy fills gaps.
- Increased ornaments from66 to96, improved sphere smoothness/material gloss, and aligned ornaments/garland to the new canopy profile.
- Increased bulbs from100 to180, halo size from0.25 to0.48, and independent brightness peaks. The tree topper now has emissive gold, a halo and a star glint. Reduced motion keeps bulb and star illumination steady.
- Build and six existing tests pass. Existing Three.js bundle-size warning remains. Actual Chromium screenshots confirmed the new canopy/ornaments, stronger daytime and nighttime light, and reduced-motion behavior. No browser warnings/errors were logged. Carol time advanced, and existing20 worshippers/10 veils/12 wall candles remained.
- Two Paris/Bariloche round trips returned to matching geometry/texture counts on both iterations (26/1 and492/34 in those views). Tree navigation, position and collision footprint remain unchanged. Counts are view dependent, not a general benchmark.

No new Windows/Iris Xe hardware benchmark or physically accurate tree simulation is claimed. Foliage, halo and star resources use the existing scene disposal path.

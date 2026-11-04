# M13 hair, prayer and light · 2026-11-04

Milestone13 / Epic #38: #68 hair and #69 seated prayer; Epic #37: #70 daylight and tree sparkle. The user directly approved these changes.

## Changes

Five hair silhouettes (short side part, bob, raised waves, tied ponytail and curls) are randomized independently of the five clothing patterns. Color also varies separately. Hair meshes are merged within each rigid style. Veil dimensions adapt to hairstyle volume.

Six of the12 seated background worshippers are randomly chosen to pray: four with veils and two without. They bow slightly, close their eyes and bring their palms together at chest height. Two-bone arm positioning preserves arm lengths; a separate detailed pair of joined hands renders the palms/fingers. Walking and other non-seated poses restore open eyes and ordinary hands/arm rotations. The three roaming visitors and player retain their existing activity controls.

All six right windows have stronger/wider soft light ribbons, brighter floor projections and more visible dust. Day/dusk/night attenuate the effects together; night removes sunlight. Original softened glass colors and leadwork remain unchanged.

The180 tree bulbs have brighter peaks and wider halos, plus independently phased gold/ivory/pale-blue star glints and32 small drifting light motes. The topper has a larger halo and glint. Reduced motion freezes the motes and shimmer, leaving a stable glow and sparse static glints. These are artistic real-time effects, not physical volumetric/refraction calculations.

## Verification

TypeScript/Vite build and nine tests pass. The added regression constructs all five body/hair combinations, checks that prayer wrists meet in front of the torso above the lap, verifies closed-eye/hand visibility, and checks restoration on standing. Existing seating contact, smooth transition, resource, rhythm and shuffle tests remain green. The existing large Three.js bundle warning remains.

Actual Chromium UI and visible QA output confirmed all five hair types,23 nave people, six praying worshippers and four veiled praying worshippers. No browser warnings/errors were recorded at initial inspection. Visual checks include the stronger right-hand daylight and independently varied hair silhouettes.

Near-seat inspection showed veiled worshippers bowing with joined fingers/palms; this was captured as a QA screenshot. The tree's individual cross-star glints and stronger halos were inspected in day and night views, with reduced motion providing a stable display. Two Paris/Bariloche round trips reset/restored the five hair types and prayer counts0/6 (veiled0/4). Paris returned to43 geometries/1 texture on both iterations; Bariloche returned to1128–1131/43, with small view/random-style differences. All three moving visitors continued repeated cycles. No browser errors/warnings were logged. No new hardware benchmark is claimed.

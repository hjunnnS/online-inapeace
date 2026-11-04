# M8 verification · 2026-11-04

## Scope and tracking

Milestone 8; Epic #37 (visuals) and #38 (atmosphere). Implementation issues #54 tree, #55 worshippers, #56 music and narration removal, #57 integration, #58 stained glass. No target date was assigned.

## Automated and asset checks

- TypeScript + Vite production build passes; existing large Three.js bundle warning remains.
- Six Node tests pass: four rhythm/resource regressions, plus shuffle cycle uniqueness/boundary repeats and empty/single-song behavior. The shuffle test covers 30 cycles.
- All ten final MP3 files fully decode with ffmpeg `-xerror`, with a single audio stream and no embedded artwork. Durations range from 54.4 to 359.5 seconds. Recording credits and license links are bundled and available in the music panel.
- Obsolete narration UI, phrase JSON, generator and ten WAVs were removed. The earlier organ/room background recordings were also removed; action sounds and choir remain.

## Browser integration

Tested in the ChatGPT Chromium browser at 1280 × 720 using actual controls, screenshots and the visible `?qa` diagnostic output.

- Detailed three-panel glass is visible at the window viewpoint and on the 15 Bariloche windows. Diagonal light ribbons, dust and colored floor projections are visible in daylight. Night removes sunlight and reduces window brightness. Reduced motion freezes dust, bulbs and worshipper sway.
- Rear tree has ornaments, a star, gifts and warm lights. Its viewpoint was adjusted to show the full tree. All ten worshippers are virtual; six sit and four stand facing the altar. Player seating excludes occupied seats.
- Each of the ten carols was selected through the next-track button and reported active playback with advancing media time. The observed shuffle cycle contained each track exactly once.
- A 54.4-second carol was allowed to finish naturally and automatically advanced to another track, which continued playing.
- Entry starts music on the primary button. Silent entry and mute remain available. Confessional entry pauses music; completing the reflection clears the input and resumes music. A non-sensitive test sentence was used and verified empty afterward.
- Choir listening pauses the carol. Conduct mode starts and cancellation returns to the nave. Seating, quiet viewing, rosary and candle pickup were exercised; their existing effects remain available.
- Three Paris/Bariloche round trips return to 53 geometries / 2 textures in Paris and stabilize at 398 / 19 in Bariloche after warmup. Tree/worshipper counts reset to 0 outside Bariloche and restore to true/10 on return. Geometry counts depend on which objects have been in view.

Safari/WebKit was also checked through a dedicated temporary tab: primary entry played a recording with advancing time, next-track and mute worked, and the close-up glass/light viewpoint rendered correctly. The test tab was closed afterward. A startup texture warning was addressed by keeping the new glass group hidden until its atlas finishes loading.

## Limits

This is an artistic real-time approximation, not a measured reconstruction or physically exact volumetric/refraction simulation. Screenshot reference artwork is not shipped. Browser media state and full-file decoding verify playback mechanics; final listening and atmosphere preference remain subjective. No new Windows/Iris Xe hardware benchmark or multiplayer presence is claimed. Other nine cathedrals retain their existing visuals.

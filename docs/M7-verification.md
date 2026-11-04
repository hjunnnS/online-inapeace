# M7 and combined M6/M7 verification

Date: 2026-11-04. GitHub issues #47–#53. Tested on the available arm64 macOS computer.

## Checks completed

- TypeScript/Vite production build passed and all four Node regression tests passed.
- Chromium in-app browser at 1280×720 and desktop Safari/WebKit were used through the actual UI. The combined Chromium session exceeded six minutes; Safari additionally ran the full 66-second conduct experience.
- Both browsers loaded all ten cathedrals through the visible catalog. M6/M7 controls were limited to Bariloche and other interiors retained the shared walking/room/audio flow.
- The veil remained on the avatar while carrying a taper. The taper stayed in the hand when sitting and could be placed back on the stand. Quiet-view Escape restored controls.
- All ten existing liturgical clips were selected, played and stopped in Chromium. Choir playback replaced the background sound and the listen action walked to a seat. Voice playback stopped the choir. Playback failures are handled and hidden pages stop the choir/game.
- Chromium performed a timed direction input with a hit recorded. Cancel with Escape returned to the nave. Safari entered the countdown, played through the complete song and reached the result state. Pure tests also cover duplicate scoring, missed notes, ended sessions and fresh retries.
- The large rosary accepted a drag and a button/keyboard action, advanced to the expected bead, and reset. Reduced motion disables its movement effect while retaining bead highlighting.
- A test draft in the confessional was empty immediately after release. Safari also released a draft and skipped the final sequence with Escape. The visual particle effect contains no draft text. Source inspection found no storage or transmission APIs for drafts.
- Photo preview was decoded as 900×1100. Safari downloaded the PNG to disk; the saved file was opened and inspected. Current framing and portrait framing were checked. The Chromium in-app download event did not fire during automation, so actual filesystem download verification was performed in Safari.
- Browser error logs from the Chromium combined session were empty.

## Defects found and corrected

- The seated portrait initially framed a bench in front of the face. The portrait eye height, focus and field of view were adjusted and the updated preview inspected.
- Repeated cathedral changes initially leaked halo textures because the previous disposal routine only handled Mesh. It now disposes Sprite and Points materials/textures as well, and deduplicates shared maps. A regression test covers this case. After correction, three Bariloche/Paris cycles with veil interaction returned to 20 textures and 297 geometries each time.
- M6's confessional-to-nave camera originally crossed the booth wall. Its release sequence now starts in the nave; the visible particle ascent and final return were checked.

## Performance observations and review limits

Rolling frame intervals in the tested paths were about 8.3–10.5 ms in Chromium and 16.7–18.2 ms in Safari. No sustained sub-30fps interval was observed in those paths. These are local observations, not a Windows/Iris Xe benchmark.

The original synthesized choir MP3 decodes to 66 seconds; measured peak is -12.3 dBFS. Playback, duration, controls and overlap behavior were verified. The listening quality of synthetic voices, desired sacred atmosphere and resemblance to the reference still need human acceptance. No physical headphone/speaker listening approval is claimed. Existing Latin pronunciation review (#22) also remains separate.

The implementation and automated/functional checks are complete. Human sound/atmosphere acceptance is recorded as pending, rather than being marked passed.

## Background audio entry follow-up

The default entry button previously entered silently, and the organ background stopped after 80 seconds. Default entry now starts the background directly from the user click. A separate silent-entry button remains available. The organ is looped, its asset gain was raised by 8 dB, and the initial chosen background volume is 0.5. A top-bar toggle makes the background state visible and allows immediate muting/retry. Chromium confirmed normal entry playback, the loop flag, the volume, top-bar toggles, and pause/resume around liturgical speech.

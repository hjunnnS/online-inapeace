# In a Peace · 바릴로체

M2 PC 웹 시제품. 바릴로체 대성당 본당 일부를 걸으며 앉아 쉬고, 가상 개인실에서 글을 내려놓고, 전례 문구를 들을 수 있다.

## 실행

Node.js 24에서 `npm ci` 후 `npm run dev`. `npm run build`는 TypeScript 검사와 정적 배포 파일 생성을 수행한다. `npm run assets`로 장면 GLB 3개를 재생성할 수 있다. 음성 WAV는 소스에 포함되어 있다. 재생성은 eSpeak NG Emscripten 모듈을 로컬에 설치한 뒤 `node scripts/voice.mjs <espeak-ng.js 절대 경로>`로 실행한다.

입장 후 WASD·방향키·바닥 클릭으로 이동한다. 드래그와 휠로 시점을 조절한다. 앉기 버튼으로 좌석에 접근하고, 고해소 버튼으로 출입 지점까지 이동한다. 개인실에서 글을 내려놓거나 취소하면 본당으로 복귀한다. 음성 메뉴에서 문구·반복·음량을 선택한다.

## 자산과 데이터

- 바릴로체 GLB와 검증용 임시 공간 GLB 두 개는 이 프로젝트에서 생성했다. 석재의 색, 네오고딕 아치, 색유리, 좌석과 제대 축을 [성당 역사 안내](https://iglesiacatedralbariloche.com/catedral.html), [사진 갤러리](https://iglesiacatedralbariloche.com/fotos.html), [색유리 해설](https://iglesiacatedralbariloche.com/vitrales.html)에 대조한 부분 재구성이다. 치수·배치·창 문양을 단순화했고 고해소 개인실은 창작 부속 공간이다. 외부 사진·스캔·텍스처를 번들에 포함하지 않았다.
- 시험용 음성은 [eSpeak NG](https://github.com/espeak-ng/espeak-ng) Emscripten 포트에서 M1 문구를 로컬 합성했다. 교회 라틴어를 의도한 이탈리아어 음성용 발음 표기와 영어 음성, 낮은 피치, 짧은 자체 잔향을 사용한다. 성직자 녹음이나 제3자 음원 샘플을 사용하지 않았다. 실제 발음·음색 청취 승인은 별도로 필요하다.
- 고해소 글은 현재 페이지의 편집기에만 있다. 완료·취소·Escape·페이지 이탈/복원 때 지운다. 음성 및 장면 파일은 정적 요청이며 글 본문을 요청에 넣지 않는다.

## 검수 상태

기술 검수는 최종 빌드에서 Chrome과 WebKit으로 진행했다. 실제 라틴어 청취 승인과 3~5명 분위기 관찰, M1 기준 Windows/Iris Xe 실측은 검수 항목으로 남아 있다. 관련 이슈는 [음원 #22](https://github.com/hjunnnS/online-inapeace/issues/22)와 [통합 검수 #29](https://github.com/hjunnnS/online-inapeace/issues/29)다.

## M3 성당 컬렉션

성당 둘러보기에서 열 곳의 이름·도시·미리보기·참고 자료를 볼 수 있다. 목록의 미리보기는 같은 GLB를 브라우저에서 렌더링해 캡처했다. 바릴로체 외 아홉 곳은 공식 건축 자료를 참고한 창작 부분 재구성으로 치수, 문양, 조각과 세부 배치를 단순화했다. 자료 사진은 번들에 포함하지 않는다. 장면별 출처는 src/cathedrals.json, 제작 방식은 scripts/collection.mjs에 있다. 장면은 기존 로더와 이동·착석·고해소·오디오를 공유한다. 첫 입장은 방문자 계정 없이 동작한다.

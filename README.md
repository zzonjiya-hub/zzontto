# ZZONTTO — 비너스 3D 추첨기 (웹)

Three.js + cannon-es로 실물 비너스를 재현한 연출용 추첨기.

## 실행
```powershell
npm install
npm run dev   # http://localhost:5173
```

## 반영 스펙
- 본체 80×80×220cm, 혼합구 Ø50cm 투명구, 상단 캡처 튜브, 7개 전시대
- 45개 볼 (1~10 노랑, 11~20 파랑, 21~30 빨강, 31~40 회색, 41~45 초록)
- 터빈 바람 air-lift + 소용돌이 + 난류 (cannon-es force)
- PreDraw 방식: 7개 번호를 RNG로 먼저 뽑고 해당 볼만 순서대로 캡처 → 공정 + 연출 보장
- ARS 흉내: 캡처 즉시 우측 패널에 번호 표시

## 조작
- 추첨 시작: 혼합 2초 후 1.1초 간격으로 6+보너스 캡처
- 바람 세기 슬라이더: 20~110
- 마우스 드래그: 카메라 회전, 휠: 줌

## 파일
- `index.html` — UI 패널
- `src/main.js` — 씬/물리/추첨 로직
- `src/style.css`
- `unreal-backup/` — 이전 Unreal 뼈대 보관

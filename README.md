# ZZONTTO — 비너스 3D 추첨기 (웹)

Three.js + cannon-es로 만든 3D 로또 추첨기. 구를 아래 주황 받침에 끌어 놓으면 추첨이 시작돼.

## 실행

```powershell
npm install
npm run dev   # http://localhost:5173
```

## 조작

- **착지점 선택**: 구가 공중에 떠 있을 때만 가능. 주황=사용 / 녹색=사용 안 함
  - 6개 전부 녹색이면 구가 받침에 붙지 않음 (추첨 불가)
  - 추첨 중에는 선택 잠금
- **추첨 시작**: 구를 주황 받침에 드롭 (받침 위에서 끌어올리면 리셋/일시중지)
- **효과음**: 착지점 토글, 구 들어올리기/놓기, 공 굴러가기, 캡처, 착지
- 우측 상단 아이콘: 소리 켜기/끄기

## 규칙

- 6개 볼만 사용 (보너스 없음), 전시대는 테이블 앞 절반 호에 6개 배치
- **PreDraw**: 시작 시 RNG로 번호를 먼저 뽑고 해당 볼만 캡처 → 공정성 + 연출 보장
- 공은 구 상단 중앙 구멍으로 나와 포물선을 그린 뒤 슬롯 직상방에서 수직으로 낙하
- 바람 20 / 난류 1.0 고정 (조절 UI 없음)
- 착지 시 번호면이 카메라를 향함 (6·9는 밑줄)

## GitHub Pages 배포 (방법 A: 자동)

1. GitHub에 새 레포 생성 → 이 폴더 내용 푸시 (`main` 브랜치)
2. 레포 **Settings → Pages → Source**에서 **GitHub Actions** 선택
3. 이후 push마다 자동 빌드·배포 (워크플로우: `.github/workflows/deploy.yml`)

`dist/`, `node_modules/`는 `.gitignore`로 제외돼 있으니 올리지 않아도 됨.

## 파일

- `index.html` — 캔버스 + 제목/저작권/소리 버튼
- `src/main.js` — 씬, 물리, 추첨 상태머신, 드래그 인터랙션, 효과음
- `src/style.css` — HUD 스타일
- `.github/workflows/deploy.yml` — GitHub Pages 자동 배포
- `unreal-backup/` — 이전 Unreal C++ 뼈대 보관

# 카페 메뉴 이미지 에디터

카페 메뉴판 이미지를 브라우저에서 직접 편집할 수 있는 React 기반 에디터입니다.  
배경색, 이미지 슬롯, 메뉴 섹션, 장식선 등을 드래그로 자유롭게 배치할 수 있습니다.  
이미지 배경 제거(AI), 불투명도, 크기 조정 기능도 포함되어 있습니다.

---

## 시작하기 전에 — 필요한 것

| 도구 | 버전 | 확인 명령어 |
|------|------|-------------|
| **Node.js** | 18 이상 | `node -v` |
| **npm** | 9 이상 | `npm -v` |
| **Python** | 3.9 이상 (배경제거 스크립트 사용 시) | `python --version` |

> Node.js가 없다면 https://nodejs.org 에서 LTS 버전을 설치하세요.

---

## 프론트엔드 실행 방법

```bash
# 1. 저장소 클론
git clone <저장소 주소>
cd 2team-GenPrj-frontend_wj

# 2. 패키지 설치 (최초 1회)
npm install

# 3. 개발 서버 실행
npm run dev
```

브라우저에서 **http://localhost:5173** 을 열면 에디터가 실행됩니다.

### 기타 명령어

```bash
npm run build    # 배포용 빌드 (dist/ 폴더 생성)
npm run preview  # 빌드 결과물 미리보기
```

---

## Python 배경제거 스크립트 (`remove_bg.py`)

이미지의 배경을 로컬에서 제거하는 Python 스크립트입니다.  
에디터의 AI 배경제거(브라우저)와 별개로 사용할 수 있습니다.

### 설치

```bash
# 기본 (단색 배경 이미지)
pip install Pillow numpy

# AI 배경제거 (사진 등 복잡한 배경 — 권장)
pip install rembg onnxruntime

# OpenCV GrabCut 방식 사용 시
pip install opencv-python
```

> `uv`를 사용한다면 `pip` 대신 `uv pip install`을 쓰세요.

### 사용법

```bash
python remove_bg.py
```

`remove_bg.py` 하단의 `targets` 목록에 처리할 이미지 경로를 추가하면 됩니다.  
결과 파일은 원본 파일명 뒤에 `_nobg.png`가 붙어 같은 폴더에 저장됩니다.

#### 배경제거 방식 선택

| 방식 | 적합한 이미지 | 특징 |
|------|-------------|------|
| `remove_bg_floodfill` | 단색·일러스트 배경 | 빠름, 내부 색상 보존 |
| `remove_bg_rembg` | 사진, 복잡한 배경 | AI 모델, 가장 정확 (최초 ~170MB 다운로드) |
| `remove_bg_grabcut` | 단일 피사체 사진 | OpenCV, rembg 미설치 시 대안 |
| `remove_bg_auto` | 자동 판별 | 배경 유형 자동 감지 후 적합한 방식 선택 |

---

## 폴더 구조

```
📦 프로젝트 루트
├── src/                         # React 소스코드
│   ├── App.tsx                  # 앱 최상위 컴포넌트, 전체 상태 관리
│   ├── main.tsx                 # 앱 진입점
│   ├── api/
│   │   ├── generate.ts          # 템플릿 생성 API 클라이언트
│   │   └── backgroundApi.ts     # 배경 생성 API 클라이언트 (객체 PNG 전송)
│   ├── components/
│   │   └── Editor/
│   │       ├── Canvas.tsx       # 캔버스 영역 (드래그, 리사이즈, 4:5 비율)
│   │       ├── ControlPanel.tsx # 왼쪽 컨트롤 패널 (배경, 테두리, 메뉴 등)
│   │       └── SlotList.tsx     # 이미지 슬롯 (업로드, 배경제거, 크기/불투명도)
│   ├── hooks/
│   │   └── useTemplate.ts       # 템플릿 관련 훅
│   └── utils/
│       ├── exportCanvas.ts      # 이미지 합성·다운로드 유틸 (Canvas 2D API)
│       └── transform.ts         # 변환 유틸리티
│
├── docs/                        # 기술 문서
│   └── canvas-export.md         # 캔버스 내보내기 기능 보고서
│
├── img/                         # 샘플 이미지
│   └── picture/                 # 실제 사진 이미지
│
├── remove_bg.py                 # Python 배경제거 스크립트
├── package.json                 # npm 의존성 목록
├── vite.config.ts               # Vite 빌드 설정
├── tsconfig.json                # TypeScript 설정
└── index.html                   # HTML 진입점
```

---

## 주요 기능

### 캔버스 편집
- **드래그** — 이미지 슬롯, 텍스트, 메뉴 섹션, 구분선을 마우스로 자유 배치
- **리사이즈** — 이미지 슬롯 클릭 후 우하단 빨간 핸들을 드래그해 크기 조정

### 이미지 슬롯
- 이미지 업로드 (JPG, PNG 등)
- **AI 배경제거** — `@imgly/background-removal` (U2Net 모델, 브라우저 내 실행)
  - 최초 실행 시 모델 자동 다운로드 (~170MB), 이후 캐시 사용
- **불투명도** 슬라이더 (0 ~ 100%)
- **너비/높이** 슬라이더 (5 ~ 80%)

### 배경 설정
- 상단/하단 배경색 선택
- 체커보드 물결 패턴 (색상, 셀 크기, 위치, 진폭 조정)

### 구분선
- 수평 구분선 추가/제거
- 굵기, 색상 조정
- 드래그로 Y 위치 이동

### 메뉴 섹션
- 섹션 추가/제거
- 메뉴 아이템 (이름, 가격) 편집
- 드래그로 위치 이동

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| UI 프레임워크 | React 18 + TypeScript |
| 빌드 도구 | Vite |
| AI 배경제거 (브라우저) | @imgly/background-removal |
| AI 배경제거 (Python) | rembg + onnxruntime |
| 이미지 처리 (Python) | Pillow, OpenCV, NumPy |

---

## 자주 묻는 질문

**Q. `npm install` 후 실행했는데 화면이 안 나와요.**  
A. 터미널에 에러 메시지를 확인하세요. Node.js 버전이 18 미만이면 업데이트가 필요합니다.

**Q. 배경제거 버튼을 눌렀는데 반응이 없어요.**  
A. 최초 실행 시 AI 모델을 다운로드합니다 (약 170MB). 네트워크 환경에 따라 30초~1분 정도 소요됩니다. 버튼이 "처리 중..."으로 바뀌면 정상입니다.

**Q. Python 스크립트에서 `rembg` 설치가 안 돼요.**  
A. `pip install rembg onnxruntime` 를 먼저 실행하세요. 가상환경(`.venv`)이 활성화 상태인지도 확인하세요.

**Q. JPG 이미지 배경제거 결과가 이상해요.**  
A. 단색·일러스트 이미지는 `remove_bg_floodfill`, 실제 사진은 `remove_bg_rembg`를 사용하세요. `remove_bg_auto`를 쓰면 자동으로 판별합니다.

---

## 기술 문서

| 문서 | 위치 | 내용 |
|------|------|------|
| 캔버스 내보내기 | [`docs/canvas-export.md`](docs/canvas-export.md) | 이미지 합성·다운로드·API 전송 기능 구조, 사용법, 확장 방법 |

---

## Git 브랜치 전략

```
main          ← 최종 배포 브랜치
feature/demo  ← 현재 개발 브랜치
```

작업 후 `feature/demo` 브랜치에 푸시하고, 팀원과 리뷰 후 `main`으로 병합합니다.

```bash
git add .
git commit -m "feat: 기능 설명"
git push origin feature/demo
```

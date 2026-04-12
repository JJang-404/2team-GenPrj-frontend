# Git 새 브랜치 생성 및 파일 업로드 가이드

**작성일:** 2026-04-13  
**대상 저장소:** `https://github.com/JJang-404/2team-GenPrj-frontend.git`  
**기준 브랜치:** `feature/United1_1` → 새 브랜치: `feature/United1_1_patch`

---

## 주의: CMD vs PowerShell 차이

Windows에서 터미널을 열면 두 가지 환경이 있습니다.

| 환경 | 파일 복사 명령어 |
|---|---|
| **CMD** (명령 프롬프트) | `copy /Y "원본" "대상"` |
| **PowerShell** | `Copy-Item -Force "원본" "대상"` |

VSCode 터미널은 기본적으로 **PowerShell** 이므로 아래 PowerShell 명령어를 사용하세요.

---

## Step 1 — 새 브랜치 생성

```powershell
cd D:\01.project\2team-GenPrj-frontend
git checkout -b feature/United1_1_patch
```

---

## Step 2 — 파일 복사 (PowerShell)

> 작업폴더(`United1_1`) → git 폴더(`2team-GenPrj-frontend`)로 복사

```powershell
$src = "D:\01.project\2team-GenPrj-frontend_United\United1_1"
$dst = "D:\01.project\2team-GenPrj-frontend"

# ── initPage 수정 파일 ──────────────────────────────────────────
Copy-Item -Force "$src\react\src\modules\initPage\App.jsx" `
                 "$dst\react\src\modules\initPage\App.jsx"

Copy-Item -Force "$src\react\src\modules\initPage\components\draft\DraftCard.jsx" `
                 "$dst\react\src\modules\initPage\components\draft\DraftCard.jsx"

Copy-Item -Force "$src\react\src\modules\initPage\components\sidebar\Sidebar.jsx" `
                 "$dst\react\src\modules\initPage\components\sidebar\Sidebar.jsx"

Copy-Item -Force "$src\react\src\modules\initPage\constants\design.js" `
                 "$dst\react\src\modules\initPage\constants\design.js"

# ── editing 수정 파일 ───────────────────────────────────────────
Copy-Item -Force "$src\react\src\modules\editing\App.tsx" `
                 "$dst\react\src\modules\editing\App.tsx"

Copy-Item -Force "$src\react\src\modules\editing\utils\backgroundGeneration.ts" `
                 "$dst\react\src\modules\editing\utils\backgroundGeneration.ts"

Copy-Item -Force "$src\react\src\server\api\callApi.js" `
                 "$dst\react\src\server\api\callApi.js"

# ── 신규 파일 — img.jpg ─────────────────────────────────────────
Copy-Item -Force "$src\react\public\img.jpg" `
                 "$dst\react\public\img.jpg"

# ── 신규 파일 — doc/0411 폴더 전체 ─────────────────────────────
# doc/0411 폴더가 git에 없으면 먼저 생성
New-Item -ItemType Directory -Force -Path "$dst\doc\0411"

Copy-Item -Force "$src\doc\0411\*" "$dst\doc\0411\"
```

---

## Step 3 — git add / commit / push

```powershell
cd D:\01.project\2team-GenPrj-frontend

# 개별 파일 스테이징
git add react/src/modules/initPage/App.jsx
git add react/src/modules/initPage/components/draft/DraftCard.jsx
git add react/src/modules/initPage/components/sidebar/Sidebar.jsx
git add react/src/modules/initPage/constants/design.js
git add react/src/modules/editing/App.tsx
git add react/src/modules/editing/utils/backgroundGeneration.ts
git add react/src/server/api/callApi.js
git add react/public/img.jpg

# doc/0411 폴더 전체 스테이징
git add doc/0411/

# 커밋
git commit -m "feat: initPage UI 개선 및 다음 단계 확인 모달 추가

- 배경 img.jpg 통일 (bgType 4가지 주석 처리로 보존)
- 드래프트 카드 sampleCount 4 -> 1 (나머지 주석 처리)
- 사이드바: 기본 정보 최상단 이동, 배경 종류 비활성화
- 이 디자인 선택 클릭 시 확인 모달(네/아니요) 추가
- editing 배경 생성 로직(BACKGROUND_VARIANTS) 업데이트
- doc/0411 작업 문서 추가"

# 원격 push
git push origin feature/United1_1_patch
```

---

## Step 4 — GitHub에서 PR(Pull Request) 생성 (선택)

브랜치를 올린 뒤 팀원과 코드를 합치려면 GitHub에서 PR을 생성합니다.

1. `https://github.com/JJang-404/2team-GenPrj-frontend` 접속
2. 상단 **"Compare & pull request"** 버튼 클릭
3. base: `feature/United1_1` ← compare: `feature/United1_1_patch`
4. 제목과 설명 작성 후 **"Create pull request"**

---

## 자주 발생하는 오류 및 해결

### ❌ `copy /Y` 오류 (PowerShell에서 CMD 명령어 사용 시)
```
Copy-Item : '...' 인수를 허용하는 위치 매개 변수를 찾을 수 없습니다.
```
**원인:** PowerShell에서 `copy /Y` 는 `Copy-Item`으로 매핑되며 `/Y` 플래그를 인식 못 함  
**해결:** `Copy-Item -Force "원본" "대상"` 으로 교체

---

### ❌ push 시 인증 오류
```
remote: Repository not found.
fatal: repository '...' not found
```
**해결:** GitHub 로그인 확인
```powershell
git config --global user.name "본인 GitHub 아이디"
git config --global user.email "본인 이메일"
```

---

### ❌ 브랜치가 이미 존재할 때
```
fatal: A branch named 'feature/United1_1_patch' already exists.
```
**해결:** 다른 이름 사용 또는 기존 브랜치로 전환
```powershell
git checkout feature/United1_1_patch   # 기존 브랜치로 전환
# 또는
git checkout -b feature/United1_1_patch_v2   # 새 이름으로 생성
```

---

### ❌ push rejected (원격에 더 최신 커밋이 있을 때)
```
! [rejected] feature/United1_1_patch -> feature/United1_1_patch (non-fast-forward)
```
**해결:** 새 브랜치이므로 이 오류는 거의 발생하지 않음.  
만약 발생하면:
```powershell
git pull origin feature/United1_1_patch --rebase
git push origin feature/United1_1_patch
```

---

## 전체 흐름 요약

```
[작업폴더]                        [git 폴더]
United1_1/                        2team-GenPrj-frontend/
  react/src/modules/          →     react/src/modules/
  react/public/img.jpg        →     react/public/img.jpg
  doc/0411/                   →     doc/0411/
                                        ↓
                               git checkout -b feature/United1_1_patch
                               git add (파일들)
                               git commit -m "..."
                               git push origin feature/United1_1_patch
                                        ↓
                               GitHub → PR → 팀원 리뷰 → merge
```

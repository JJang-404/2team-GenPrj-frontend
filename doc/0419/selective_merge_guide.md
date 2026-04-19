# 2026-04-19 선택적 병합(Selective Merge) 가이드 (ver 2.0)

본 가이드는 팀원의 최신 UI와 문서가 담긴 **`feature/United1_8`을 베이스**로 하여, `feature/United1_7`의 **성공적인 AI 배경 생성 엔진**만 이식하는 안전한 방법입니다.

---

## 1단계: 작업 환경 준비 (United1_8 베이스)

팀원의 최신 코드를 100% 보존하면서 시작합니다. 새로운 패치 브랜치를 만들어 안전하게 작업하십시오.

```powershell
# 1. United1_8 브랜치에 있는지 확인
git checkout feature/United1_8

# 2. 안전한 작업을 위해 새로운 패치 브랜치 생성
git checkout -b feature/United1_8_patch
```

---

## 2단계: United1_7에서 AI 핵심 파일만 가져오기

아래 명령어들은 `United1_7`에서 완성되었던 AI 전용 부품들만 골라서 가져오는 명령어입니다. **팀원이 작업한 UI 배치나 문서들은 전혀 건드리지 않습니다.**

```powershell
# 핵심 AI 로직 및 API 파일들 가져오기
git checkout feature/United1_7 -- react/src/server/api/callApi.js
git checkout feature/United1_7 -- react/src/server/api/modelApi.js
git checkout feature/United1_7 -- react/src/modules/editing/constants/prompts.ts
git checkout feature/United1_7 -- react/src/modules/editing/utils/imageAnalysis.ts
git checkout feature/United1_7 -- react/src/modules/editing/components/sidebar/BackgroundOptionsSection.tsx
```

---

## 3단계: App.tsx AI 로직 이식 (수동 조율)

`App.tsx`는 팀원의 UI 로직이 가장 많이 담겨있는 파일입니다. 따라서 전체를 덮어쓰지 않고 로직만 합칩니다.

1.  현재 `United1_8` 기반의 `App.tsx` 내용을 그대로 유지하십시오.
2.  사용자께서 2단계 명령어를 마치신 후 저에게 말씀해 주시면, **`United1_7`에서 사용했던 AI 배경 생성 관련 함수들**만 따로 추출하여 `App.tsx`에 넣으실 수 있도록 코드를 준비해 드리겠습니다.

---

## 4단계: 커밋 및 완료

```powershell
# 변경사항 확인
git status

# 커밋 (팀원의 코드는 보존하고 AI 기능만 업그레이드됨을 명시)
git add .
git commit -m "Add AI background generation pipeline from United1_7 while preserving United1_8 UI"
```

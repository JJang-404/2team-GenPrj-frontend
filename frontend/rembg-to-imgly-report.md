# 작업 보고서: rembg → @imgly/background-removal 교체

## 1. 개요

| 항목 | 내용 |
|------|------|
| 프로젝트 | 2team-GenPrj-frontend (AD-GEN PRO) |
| 작업 목표 | 배경 제거 기능을 Python 서버(rembg)에서 클라이언트 사이드 JS(@imgly/background-removal)로 전환 |
| 작업 일시 | 2026-04-03 ~ 04 |
| 실행 파이프라인 | Deep Interview → Ralplan Consensus → Autopilot Execution (3-stage pipeline) |
| 최종 결과 | 구현 완료, 빌드 통과. 브라우저 실행 테스트 진행 중 |

---

## 2. 의사결정 과정 (3단계 파이프라인)

### Stage 1: Deep Interview (요구사항 명확화)

사용자의 요청이 "rembg 대신 @imgly/background-removal을 적용하고 싶다"라는 방향성만 제시된 상태였기 때문에, Socratic 질문 방식으로 숨겨진 가정과 요구사항을 도출했습니다.

**7라운드 진행, 최종 모호도 15.8% (임계값 20% 이하 달성)**

| Round | 질문 핵심 | 사용자 답변 요약 | 모호도 변화 |
|-------|-----------|-----------------|------------|
| 1 | 교체 범위 (1:1 교체 vs 추가 개선) | **교체 + 서버 제거** — Python 서버 완전 폐기 | 100% → 60.5% |
| 2 | 성공 기준 (동작만 vs 품질+성능) | **품질 + 성능 모두** 유지되어야 함 | 60.5% → 47.5% |
| 3 | 사용 환경 (데스크톱 vs 모바일) | **데스크톱 기준**, 다른 환경은 동작만 하면 됨 | 47.5% → 34.8% |
| 4 | *[Contrarian]* 품질이 떨어져도 되는 거 아닌가? | **깨끗해야 함** — 포스터 합성 시 엣지 품질 중요 | 34.8% → 28.5% |
| 5 | ~40MB 모델 다운로드 허용 여부 | **허용** — React 프론트엔드 통합이 핵심 목적 | 28.5% → 20.3% |
| 6 | *[Simplifier]* 성공 검증의 가장 단순한 방법 | 3가지 기본 조건 + **객체 과다 제거 방지** 우려 | 20.3% → 21.5% |
| 7 | 단계적 접근 (구현 후 테스트) 괜찮은가 | **단계적 접근 OK** | 21.5% → 15.8% |

**핵심 발견:**
- 사용자의 진짜 동기는 "Python 환경 의존성 제거"였음 (단순 라이브러리 교체가 아님)
- 품질 기대치가 높음 — 포스터 합성용이므로 엣지가 깨끗해야 함
- 40MB 모델 다운로드는 사전에 인지하고 수용한 상태
- 품질 튜닝은 1차 범위 밖으로 합의 (단계적 접근)

**Challenge Agent 활용:**
- Round 4 (Contrarian): "품질이 떨어져도 괜찮지 않나?" → 사용자가 명확히 거부, 품질 기준 구체화
- Round 6 (Simplifier): "가장 단순한 검증 방법은?" → 새로운 우려(객체 과다 제거) 발견

---

### Stage 2: Ralplan Consensus (설계 합의)

Deep Interview에서 도출된 스펙을 기반으로 Planner → Architect → Critic 합의 루프를 실행했습니다.

#### Planner: 초기 계획 수립

**RALPLAN-DR 구조화 의사결정:**

| 원칙 | 설명 |
|------|------|
| 최소 변경 | 기존 UX 유지, 내부 구현만 교체 |
| Python 의존성 완전 제거 | server.py 삭제, Python 환경 불필요 |
| 클라이언트 사이드 완결 | 모든 처리가 브라우저 내에서 이루어짐 |
| 단계적 품질 검증 | 먼저 구현 후 실제 이미지로 테스트 |

**설계 옵션 비교:**

| 옵션 | 설명 | 판정 |
|------|------|------|
| **Option A: 직접 import** | `removeBackground()`를 App.jsx에서 직접 호출 | **채택** |
| Option B: 래퍼 유틸리티 | `src/utils/backgroundRemoval.js`에 래퍼 모듈 분리 | 기각 |

**Option B 기각 근거:** 현재 프로젝트는 App.jsx 단일 파일 구조이며 배경 제거 호출 지점이 1곳뿐. 단일 함수 호출을 위한 래퍼 모듈은 과도한 추상화.

#### Architect: 아키텍처 리뷰

**Verdict: APPROVE with improvements (4건)**

| # | 개선 사항 | 근거 | 최종 반영 여부 |
|---|-----------|------|---------------|
| 1 | `optimizeDeps.exclude` 사전 추가 | Vite 8 prebundling이 WASM 패키지와 충돌 가능 | **제거됨** — 실 테스트 결과 이 설정이 오히려 무한 로딩을 유발 (아래 트러블슈팅 참고) |
| 2 | README.md 업데이트 | Python 백엔드 문서가 2개 파일에 남아있음 | 반영 |
| 3 | 루트 package.json의 `onnxruntime-web` 제거 | @imgly가 자체 번들하므로 버전 충돌 위험 | 반영 |
| 4 | `preview` 서버 헤더 추가 | `vite preview`도 COOP/COEP 필요 | **제거됨** — COOP/COEP 헤더 자체가 제거됨 (아래 트러블슈팅 참고) |

**Architect의 반론 (Antithesis):**
> "Python 서버를 유지하는 것도 방어 가능하다. 서버 사이드 rembg는 더 높은 품질, 클라이언트 40MB 다운로드 불필요, 저사양 기기에서도 동작, COOP/COEP 복잡성 없음."

**Synthesis (해결):**
> "이 프로젝트의 목표(정적 프론트엔드 배포)에는 클라이언트 사이드 접근이 적합. 첫 사용 시 모델 다운로드 로딩 인디케이터와 브라우저 최소 요구사항 문서화로 위험 완화."

#### Critic: 품질 평가

**Verdict: APPROVE**

| 평가 기준 | 결과 | 세부 |
|-----------|------|------|
| 원칙-옵션 일관성 | PASS | Option A가 4개 원칙 모두와 정합 |
| 대안 탐색 충실도 | PASS | 단일 호출 지점에서 래퍼 기각은 타당 |
| 리스크 구체성 | PASS | 리스크별 구체적 미티게이션 존재 |
| 수용 기준 테스트 가능성 | 6/6 PASS | 모든 기준이 기계적으로 검증 가능 |
| Architect 개선사항 | 4/4 수용 | 모두 증거 기반 |

---

### Stage 3: Autopilot Execution (구현)

Ralplan 합의 계획이 존재하므로 Phase 0(확장) + Phase 1(계획) 스킵, Phase 2(실행)부터 시작.

#### 실행 순서 및 결과

| Step | 작업 | 결과 |
|------|------|------|
| 1 | `npm install @imgly/background-removal` | 200 packages, 0 vulnerabilities |
| 2 | vite.config.js 업데이트 | COOP/COEP + optimizeDeps.exclude + preview 헤더 |
| 3 | App.jsx `handleRemoveBackground()` 교체 | 서버 fetch → `removeBackground(blob)` 직접 호출 |
| 4 | server.py 삭제 | 파일 부재 확인됨 |
| 5 | README.md 전면 개정 | Python 섹션 제거, 클라이언트 사이드 설명 추가 |
| 6 | 루트 package.json 정리 | `onnxruntime-web` 의존성 제거 |
| 7 | `npm run build` 검증 | 21.65s, 에러 없음 |

---

## 3. 트러블슈팅 (구현 후 발생한 문제)

### 문제 1: COOP/COEP 헤더로 인한 페이지 무한 로딩

**증상:** `npm run dev` 후 브라우저 접속 시 페이지가 무한 로딩
**원인:** vite.config.js에 추가한 `Cross-Origin-Embedder-Policy: require-corp` 헤더가 Vite의 HMR(Hot Module Replacement) WebSocket 연결과 ES 모듈 로딩을 차단
**해결:** COOP/COEP 헤더 전체 제거. `@imgly/background-removal`은 SharedArrayBuffer 없이도 단일스레드 WASM 폴백으로 정상 동작하므로 이 헤더는 필수가 아님 (성능 최적화용)
**교훈:** Architect가 제안한 COOP/COEP 헤더는 이론적으로 올바르지만, Vite dev server의 HMR과 충돌. 프로덕션 정적 배포 시에만 별도 설정 필요

### 문제 2: optimizeDeps.exclude로 인한 모듈 로딩 지연

**증상:** COOP/COEP 제거 후에도 브라우저에서 백색 페이지. 네트워크 탭과 콘솔에 아무것도 표시되지 않음
**원인:** `optimizeDeps.exclude: ['@imgly/background-removal']` 설정이 Vite의 사전 번들링을 비활성화하여, `@imgly/background-removal`의 대규모 의존성 트리(onnxruntime-web 등)를 런타임에 개별 변환 시도 → 모듈 로딩 차단
**해결:** `optimizeDeps.exclude` 설정 제거. Vite가 해당 패키지를 정상적으로 사전 번들링하도록 허용
**교훈:** `optimizeDeps.exclude`는 Vite의 prebundling과 충돌하는 패키지에만 사용해야 하며, 대규모 의존성 트리를 가진 패키지에 적용하면 오히려 역효과

### 문제 3: WSL2 환경에서 브라우저 접속 불가

**증상:** curl(WSL 내부)로는 HTTP 200 정상 응답이지만, Windows 브라우저(Chrome/Edge)에서 접속 시 연결 거부
**원인:** Vite가 기본적으로 `localhost`(127.0.0.1)에만 바인딩되어, WSL2의 별도 네트워크 인터페이스를 통한 Windows 브라우저 접근 차단
**해결:** `npx vite --host` 또는 vite.config.js에 `server.host: true` 추가하여 모든 네트워크 인터페이스(0.0.0.0)에 바인딩
**현재 상태:** 테스트 진행 중

---

## 4. 기술적 변경 상세

### Before (변경 전)
```
사용자 → React App → fetch POST → server.py (FastAPI) → rembg.remove() → PNG 반환 → React App
```
- Python 서버 필수 (별도 터미널에서 `python server.py` 실행)
- `pip install fastapi uvicorn rembg onnxruntime` 필요
- 서버가 꺼져있으면 배경 제거 불가

### After (변경 후)
```
사용자 → React App → removeBackground(blob) → 브라우저 내 WASM/ONNX 추론 → PNG → React App
```
- Python 불필요 (`npm run dev`만으로 전체 실행)
- 첫 사용 시 ~40MB 모델 자동 다운로드 (이후 캐시)
- 오프라인에서도 캐시된 모델로 동작 가능

### 최종 vite.config.js 상태

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    watch: {
      usePolling: true,
    },
  },
})
```

초기 계획에 포함되었던 COOP/COEP 헤더와 `optimizeDeps.exclude`는 실 테스트에서 문제를 일으켜 모두 제거됨.

### 코드 변경량

| 파일 | 변경 유형 | 규모 |
|------|-----------|------|
| App.jsx | import 1줄 추가, 함수 본문 교체 (22→18줄) | 소 |
| vite.config.js | port, watch 설정 추가 (7→13줄) | 소 |
| server.py | 삭제 (29줄) | - |
| README.md | 전면 개정 (296→198줄) | 중 |
| package.json (frontend) | 의존성 1개 추가 | 소 |
| package.json (root) | 의존성 1개 제거 | 소 |

---

## 5. 리스크 관리

| 리스크 | 영향도 | 미티게이션 | 현재 상태 |
|--------|--------|-----------|-----------|
| COOP/COEP 헤더로 인한 Vite HMR 차단 | **높** | 헤더 제거. @imgly는 단일스레드 폴백으로 동작 | **해결됨** (계획에서 수정) |
| optimizeDeps.exclude로 인한 모듈 로딩 차단 | **높** | 설정 제거. Vite 사전 번들링 사용 | **해결됨** (계획에서 수정) |
| WSL2 네트워크 격리로 브라우저 접속 불가 | 중 | `--host` 옵션으로 0.0.0.0 바인딩 | **테스트 중** |
| @imgly 모델 다운로드 실패 | 중 | catch 블록 에러 메시지 + 재시도 시 캐시 사용 | 처리됨 |
| 배경 제거 품질 차이 | 저 | 단계적 접근 합의 — 실제 테스트 후 모델 옵션 조정 | 후속 확인 필요 |
| onnxruntime-web 버전 충돌 | 중 | 루트에서 의존성 제거 | 해결됨 |

---

## 6. 후속 작업 (Follow-ups)

1. **브라우저 접속 확인**: WSL2 환경에서 Windows 브라우저 접속 정상화 확인
2. **품질 테스트**: 실제 상품 이미지로 배경 제거 결과 확인. 엣지 품질이 부족하면 @imgly의 다른 모델 옵션(`isnet` 등) 검토
3. **프로덕션 배포**: 정적 호스팅 시 서버 레벨에서 COOP/COEP 헤더 설정 검토 (멀티스레드 성능 최적화용)
4. **로딩 UX**: 첫 모델 다운로드 시 프로그레스 인디케이터 추가 검토 (현재는 스피너만 표시)

---

## 7. 파이프라인 효과 분석

### 3단계 파이프라인이 기여한 것

| Stage | 기여 | 없었다면 |
|-------|------|---------|
| Deep Interview | "서버 제거"가 핵심 동기임을 발견. 품질 기준 구체화. 40MB 다운로드 사전 합의 | 구현 후 "server.py는 왜 안 지웠어?" 또는 "품질이 너무 나쁜데?" 등의 재작업 가능성 |
| Ralplan | Architect가 README 업데이트, onnxruntime-web 충돌 발견 | README에 Python 설치 안내 잔존. 버전 충돌 |
| Autopilot | 합의된 계획을 단계적으로 실행하고 빌드 검증까지 자동 완료 | 수동 실행과 동일하지만 단계 누락 없이 체계적 실행 보장 |

### 파이프라인의 한계 — 실 테스트에서 드러난 문제

Architect가 제안한 개선사항 4건 중 2건(COOP/COEP 헤더, `optimizeDeps.exclude`)이 **실 브라우저 테스트에서 오히려 문제를 일으켰다.** 이는 다음을 시사한다:

1. **코드 리뷰만으로는 런타임 호환성을 보장할 수 없다** — Vite HMR과 COEP의 충돌, WASM 패키지와 `optimizeDeps.exclude`의 역효과는 실행해봐야 알 수 있는 문제
2. **"사전 방어적 설정"이 오히려 해가 될 수 있다** — `optimizeDeps.exclude`는 "문제 시 적용"이 맞았으나, Architect가 "사전 적용"으로 격상한 것이 역효과
3. **WSL2 환경 특수성은 계획 단계에서 고려되지 않았다** — 실행 환경(WSL2 + Windows 브라우저)에 대한 사전 탐색이 부족

### Contrarian Mode의 가치
Round 4에서 "품질이 떨어져도 괜찮지 않나?"라는 도발적 질문이 사용자로부터 **"깨끗해야 한다"**라는 명확한 품질 기준을 끌어냄. 이 질문 없이는 "품질 유지"라는 모호한 기준으로 진행되었을 것.

### Simplifier Mode의 가치
Round 6에서 "가장 단순한 검증 방법은?"이라는 질문이 오히려 새로운 우려(**객체 과다 제거**)를 발견하게 함. 단순화를 시도하는 과정에서 숨겨진 요구사항이 드러나는 역설적 효과.

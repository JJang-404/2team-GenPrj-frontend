# sample_ver3

`sample_ver3`는 `sample_ver1`의 안정성과 `sample_ver2`의 확장 방향을 합쳐, LLM이 있어도 기본 동작이 망가지지 않도록 다시 구성한 버전이다.

## 목표

- 템플릿 선택과 수정 해석에 LLM을 쓸 수 있다
- LLM이 실패해도 규칙 기반 fallback으로 계속 동작한다
- 검증된 템플릿만 기본 선택 대상으로 쓴다
- 자동 생성 템플릿은 검수 전까지 렌더 경로에 올리지 않는다
- 기본 CLI는 안정형 경로를 우선 사용한다

## 핵심 구조

### 1. 템플릿 메타데이터 체계 통합

새 파일:

- `ai/template_catalog.py`
- `ai/template_loader.py`

역할:

- 모든 템플릿 JSON을 스캔한다
- 템플릿별 `style_group`, `business_type`, `layout_type`, `source`를 정규화한다
- 렌더 가능한 템플릿인지 판별한다
- 선택기는 이 메타데이터를 기준으로 동작한다

중요한 점:

- 기존 수동 템플릿은 대부분 바로 렌더 가능
- 비전 기반 자동 생성 템플릿은 구조가 다르면 기본적으로 선택 대상에서 제외

즉, 템플릿이 많아도 검증되지 않은 자산이 메인 경로를 망치지 않는다.

### 2. LLM 실패 시 룰 기반 fallback

수정 파일:

- `ai/template_selector.py`
- `ai/revision_parser.py`

구조:

```text
LLM 시도
-> 응답 검증
-> 실패 시 규칙 기반 fallback
-> 그래도 없으면 안전한 기본 템플릿
```

이제 `OPENAI_API_KEY`가 없거나 API 호출이 실패해도, `sample_ver1` 방식의 규칙 기반 로직으로 계속 진행한다.

### 3. LLM 응답 validation

새 파일:

- `ai/validation.py`

검증 내용:

- 존재하는 템플릿 이름인지 확인
- 허용된 copy key만 반영
- 색상 형식 검증
- override 필드 화이트리스트 적용
- 렌더 가능한 템플릿 구조인지 검사

즉, LLM이 JSON처럼 보이는 이상한 값을 내놔도 그대로 믿고 쓰지 않는다.

## 권장 항목 반영

### 자동 생성 템플릿 검수 파이프라인

새 스크립트:

- `scripts/validate_templates.py`

역할:

- `assets/templates` 전체 검사
- 어떤 템플릿이 렌더 가능한지 확인
- 메타데이터와 오류 목록을 리포트로 저장

실행:

```bash
cd /home/ohs3201/codeit/project/2team-GenPrj/sample_ver3
PYTHONPATH=. python3 scripts/validate_templates.py
```

출력:

- `outputs/template_validation_report.json`

### CLI 기본 실행 경로 안정화

변경 내용:

- 기본 `visual_source`를 `input`으로 변경
- 무거운 생성 경로는 옵션으로만 사용
- 선택 전략과 confidence를 출력

즉, 첫 실행 성공률을 우선한다.

### README 재정리

이 문서는 현재 실제 동작 기준으로 다시 작성했다.

## 현재 동작 원칙

### 선택기

- 기본적으로 렌더 가능한 템플릿만 후보로 사용
- LLM이 켜져 있으면 후보 중 하나를 선택
- 실패하면 규칙 기반 선택

### 수정 파서

- 규칙 기반 수정 로직이 항상 기본값으로 깔려 있음
- LLM이 성공하면 그 결과를 검증 후 덮어씀
- LLM이 실패하면 규칙 기반 수정만 적용

### 템플릿 자산

- 수동 템플릿: 기본 메인 경로에서 사용 가능
- 자동 생성 템플릿: 검수 전까지 보조 자산

## 파일 구성

```text
sample_ver3/
├─ ai/
│  ├─ template_catalog.py
│  ├─ template_loader.py
│  ├─ template_selector.py
│  ├─ revision_parser.py
│  └─ validation.py
├─ scripts/
│  └─ validate_templates.py
├─ assets/templates/
├─ outputs/
└─ run_cli.py
```

## 실행 방법

기본 실행:

```bash
cd /home/ohs3201/codeit/project/2team-GenPrj/sample_ver3
python3 run_cli.py
```

템플릿 검수 리포트 생성:

```bash
cd /home/ohs3201/codeit/project/2team-GenPrj/sample_ver3
PYTHONPATH=. python3 scripts/validate_templates.py
```

## 정리

`sample_ver3`의 핵심은 “LLM을 더 많이 쓰는 버전”이 아니라, “LLM이 있어도 안전한 버전”이라는 점이다.

따라서 이 버전은 다음 원칙을 따른다.

1. 검증되지 않은 템플릿은 기본 선택 경로에 올리지 않는다.
2. LLM 실패는 예외 상황이 아니라 기본적으로 대비해야 할 경로로 본다.
3. 선택과 수정 모두 deterministic fallback을 유지한다.
4. 기본 실행은 고급 기능보다 성공 확률을 우선한다.

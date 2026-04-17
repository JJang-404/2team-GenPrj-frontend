[작업 진행 순서]

1. 현재 상태 확인
먼저, 오늘 작업한 내용들이 현재 워킹 디렉토리에 남아있는지 확인합니다.
```bash
git status
```

- 만약 modelApi.js, BackgroundCard.tsx 등이 'Modified' 상태로 정렬되어 있다면, 브랜치 전환 시 내용이 그대로 따라온 것이므로 바로 확인이 가능합니다.
- 만약 아무런 수정 사항이 뜨지 않는다면, 이전 브랜치(United1_7)에 커밋을 하셨거나 내용이 반영되지 않은 상태입니다.

[작업 내용 United1_7에 백업하기]

1. 작업 내용 가지고 United1_7로 이동
작업 중인 파일들을 그대로 유지한 채 백업용 브랜치로 돌아갑니다.

```bash
git checkout feature/United1_7
```

[checkout 이 안되는 경우]

현재 작업 내용을 임시 보관함에 넣기 (추천 - Stash)

```git stash -u``` (추적되지 않는 파일까지 포함하여 임시 보관)
```git checkout feature/United1_7``` (브랜치 이동 권한 확보)
```git stash pop``` (원래 브랜치로 돌아왔을 때 다시 꺼내기)

2. United1_7에 작업 내용 커밋 (백업)
여기서 커밋을 해야 파일들이 United1_7 브랜치에 기록됩니다.

```bash
git add .
git commit -m "Backup: 0417 레이아웃 동기화 및 ComfyUI 연동 작업분"
```

3. 다시 United1_8로 전환
이제 작업 내용이 커밋되었으므로, 깨끗한 상태로 팀원의 브랜치로 돌아갑니다.

```bash
git checkout feature/United1_8
```

4. 팀원의 최신 코드 동기화
팀원이 최근에 push했다고 하셨으니, 원격의 내용을 가져옵니다.

```bash
git pull origin feature/United1_8
```

5. 충돌 해결 (Merge Conflict)
만약 Git이 "Automatic merge failed"라는 메시지를 띄우며 멈춘다면, 충돌이 발생한 것입니다.

VS Code에서 충돌 해결하기
VS Code의 좌측 파일 탐색기에서 충돌이 난 파일을 열면, 충돌 지점에 다음과 같은 표시가 나타납니다.

```
// ← Current Change (현재 내 코드)
<<<<<<< HEAD
... (내 코드 내용) ...
=======
... (팀원 코드 내용) ...
>>>>>>> feature/United1_8 (팀원 브랜치 이름)
```


해결 방법:

"Accept Current Change": 내 코드를 유지합니다.
"Accept Incoming Change": 팀원 코드를 채택합니다.
"Accept Both Changes": 둘 다 유지합니다 (중간에 직접 수정 가능).
충돌이 해결된 파일을 저장합니다.

5-1. 서버의 최신 정보 강제로 가져오기

```
git fetch origin
```
5-2. 원격 브랜치 상태로 로컬을 강제 리셋 (덮어쓰기)
이 명령어를 실행하면 로컬의 모든 수정 사항이 사라지고 팀원이 push한 최신 상태와 100% 일치하게 됩니다.
```
git reset --hard origin/feature/United1_8
```

6. 최종 확인 및 푸시
모든 충돌을 해결하고 코드가 정상적으로 작동하는지 확인한 후, 다시 원격 저장소에 반영합니다.

```
git add .
git commit -m "Merge: United1_7 작업분 반영 및 충돌 해결"
git push origin feature/United1_8
```
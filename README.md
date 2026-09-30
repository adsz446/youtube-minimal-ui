# YouTube Minimal UI

YouTube 홈 피드를 썸네일 중심 그리드 대신, 제목·업로드 시점·채널명 중심의 한 줄 목록으로 표시하는 Userscript입니다.

## 기능

- YouTube 데스크톱 홈 화면에서만 작동
- 조회수 10,000회 미만 영상 숨김
- 쇼츠, 재생목록, 믹스, 라이브는 목록 변환 대상에서 제외
- 썸네일 숨김
- 제목 / 업로드 시점 / 채널명을 한 줄로 표시
- 조회수 증가 속도, 누적 조회수, 영상 길이, 최신성을 조합해 상대 중요도 계산
- 중요도가 높은 영상은 굵게 표시
- 중요도가 낮은 영상은 흐리게 표시
- 검색 결과, 채널 페이지, 영상 페이지, 쇼츠 페이지는 원래 YouTube UI 유지
- YouTube 내부 페이지 이동 후 자동 재적용 또는 원상복구

## 설치 방법

1. 브라우저에 Tampermonkey 또는 Violentmonkey를 설치합니다.
2. 이 저장소의 `youtube-minimal-ui.user.js` 파일을 엽니다.
3. 오른쪽 위의 `Raw` 버튼을 누릅니다.
4. Userscript 관리자 설치 화면이 열리면 `Install`을 누릅니다.
5. YouTube 홈 화면을 새로고침합니다.

## 적용 범위

| 페이지 | 동작 |
|---|---|
| `https://www.youtube.com/` | 목록형 UI 적용 |
| 검색 결과 | 기본 YouTube UI 유지 |
| 채널 페이지 | 기본 YouTube UI 유지 |
| 영상 페이지 | 기본 YouTube UI 유지 |
| 쇼츠 | 기본 YouTube UI 유지 |
| 모바일 YouTube | 기본 UI 유지 |

## 설정 변경

스크립트 파일 안의 `CONFIG` 영역에서 주요 옵션을 바꿀 수 있습니다.

```js
MIN_VIEWS: 10000
```

위 값을 바꾸면 홈에서 숨길 최소 조회수를 조정할 수 있습니다.

예시:

```js
MIN_VIEWS: 50000
```

조회수 5만 회 미만 영상을 숨깁니다.

```js
MIN_VIEWS: 0
```

조회수 기준으로 영상을 숨기지 않습니다.

## 주의사항

- YouTube UI 구조가 바뀌면 일부 selector가 작동하지 않을 수 있습니다.
- 이 스크립트는 YouTube 홈 화면의 표시 방식만 바꾸며, 추천 알고리즘 자체를 바꾸지는 않습니다.
- 데스크톱 YouTube 홈 화면 기준으로 작성되었습니다.
- YouTube의 일반 영상 카드가 아닌 쇼츠·재생목록·라이브는 목록 처리 대상에서 제외합니다.

## License

Personal use and modification allowed.

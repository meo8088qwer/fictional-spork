export interface ChangelogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  summary: string;
  detail: string;
  howTo: string;
}

// Curated, user-facing subset of what actually shipped -- not every commit,
// just the ones a gym owner would notice or want to know about. Newest
// first. Add a new entry here whenever a real feature ships; this list is
// the only source, no separate CMS/table for something only one person
// (the dev) ever writes to.
export const CHANGELOG: ChangelogEntry[] = [
  {
    id: '2026-09-09-round-audio',
    date: '2026-09-09',
    title: '실시간 측정에 라운드 신호음 추가',
    summary: '10초/30초 종목마다 1·3·5라운드 신호음을 바로 재생할 수 있어요.',
    detail:
      '실시간 측정 화면 맨 위에 "라운드 음원 재생" 카드가 생겼어요. 측정 시작 신호로 틀어주는 음원을 종목 선택과 상관없이 원할 때 바로 재생할 수 있고, 측정을 시작한 뒤에도 화면 위쪽에 계속 남아있어요.',
    howTo: '사이드바 "실시간 측정" 진입 → 맨 위 카드에서 10초/30초 중 원하는 라운드 버튼을 누르면 바로 재생돼요. 같은 버튼을 다시 누르면 일시정지돼요.',
  },
  {
    id: '2026-09-09-global-ranking-opt-out',
    date: '2026-09-09',
    title: '전체랭킹 참가/비참가 선택',
    summary: '우리 체육관 기록을 전체(전국) 랭킹에서 빼고 싶다면 마이페이지에서 끌 수 있어요.',
    detail:
      '끄면 우리 체육관 수련생 기록이 다른 체육관과 겨루는 전체랭킹에서 더 이상 보이지 않아요. 체육관 안에서 보는 랭킹보드에는 영향이 없어요.',
    howTo: '마이페이지 > "전체랭킹 참가" 카드에서 스위치를 눌러 꺼주세요. (베이직 이상 플랜에서 선택 가능)',
  },
  {
    id: '2026-09-09-counter-mode',
    date: '2026-09-09',
    title: '실시간 측정에 계수기(탭 카운터) 모드 추가',
    summary: '한 명씩 화면 버튼을 눌러 세는 방식이 추가됐어요. 이중뛰기 오래하기처럼 천천히 세는 종목에 잘 맞아요.',
    detail:
      '기존 실시간 측정(숫자를 직접 입력)과 별개로, 학생 한 명을 화면에 띄워두고 +1 버튼을 눌러 세는 계수기 모드가 생겼어요. 학생마다 기록을 저장하면 바로 다음 학생으로 넘어가요.',
    howTo: '실시간 측정 화면에서 "계수기 측정 시작" 버튼을 눌러 시작하세요.',
  },
  {
    id: '2026-09-04-record-edit',
    date: '2026-09-04',
    title: '측정 기록 직접 수정 기능',
    summary: '잘못 입력한 기록을 삭제 후 재입력하지 않고 그 자리에서 숫자만 고칠 수 있어요.',
    detail: '학생 상세 화면의 기록 목록에서 잘못된 기록을 바로 수정할 수 있어요. 수정 후 최고기록도 자동으로 다시 계산돼요.',
    howTo: '랭킹보드에서 학생 이름 클릭 → 기록 목록에서 수정할 기록 선택.',
  },
  {
    id: '2026-09-04-story-share',
    date: '2026-09-04',
    title: '인스타 스토리 공유 카드',
    summary: '최고기록을 인스타 스토리(9:16) 이미지로 바로 다운로드할 수 있어요.',
    detail: '학생 상세 화면에서 최고기록을 예쁜 카드 이미지로 만들어 다운로드할 수 있어요. 학부모님이 보는 공개 링크에서도 로그인 없이 똑같이 쓸 수 있어요.',
    howTo: '랭킹보드에서 학생 이름 클릭 → "스토리 공유" 버튼.',
  },
  {
    id: '2026-09-04-class-unassigned-filter',
    date: '2026-09-04',
    title: '반 필터에 "미배정" 옵션 추가',
    summary: '아직 반을 지정하지 않은 학생만 따로 걸러볼 수 있어요.',
    detail: '반이 하나라도 지정된 체육관이면 랭킹보드/기록관리/대시보드의 반 필터 목록에 "미배정"이 함께 나타나요.',
    howTo: '반 필터 드롭다운에서 "미배정" 선택.',
  },
  {
    id: '2026-09-03-gym-logo',
    date: '2026-09-03',
    title: '체육관 로고 업로드 (PRO)',
    summary: '사이드바, 공개 게시판, TV 전광판에 우리 체육관 로고를 표시할 수 있어요.',
    detail: '업로드한 로고가 기본 색상 이니셜 아바타를 대체해서 표시돼요. 프로 플랜 전용 기능이에요.',
    howTo: '마이페이지 > "체육관 로고" 카드에서 업로드.',
  },
  {
    id: '2026-09-03-custom-benchmark',
    date: '2026-09-03',
    title: '종목별 표준 기준 직접 수정 가능',
    summary: '"우수/프로" 기준 회수를 체육관 수준에 맞게 직접 바꿀 수 있어요.',
    detail: '기본값은 참고용이라, 체육관마다 수련생 수준이 다르면 우리 체육관 기준으로 직접 조정할 수 있어요.',
    howTo: '종목 관리 화면 > 종목 카드의 "표준 기준" 부분 클릭.',
  },
];

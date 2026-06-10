/**
 * Locotalk i18n — Korean + English
 *
 * Usage (in a component):
 *   const t    = useT();
 *   const lang = useLang();
 *
 *   <Text>{t('home_hero_title')}</Text>
 *   <Text>{t('home_searching_sub', { region: '마포구' })}</Text>
 *   <Text>{interestLabel(interest, lang)}</Text>
 *
 * Usage (in a callback/handler, outside render):
 *   const { lang } = useStore.getState();
 *   const str = translate('home_just_now', lang);
 */

import { useStore, type Lang } from '../store';

export type { Lang };

// ─── Translations ─────────────────────────────────────────────────
export const translations = {
  ko: {
    // Common
    cancel: '취소',
    close: '닫기',
    save: '저장',
    confirm: '확인',

    // Onboarding — nick step (자동 생성 코드네임)
    onboarding_preview: '내 코드네임',
    onboarding_nick_title: '어떻게\n불릴까요?',
    onboarding_nick_sub: '닉네임은 매칭된 이웃에게만 보여요',
    onboarding_codename_sub: '익명 코드네임이 자동으로 배정돼요',
    onboarding_codename_reroll: '다시 생성',
    onboarding_codename_hint1: '자동 생성',
    onboarding_codename_hint2: '완전 익명',
    onboarding_codename_hint3: '매칭 이웃에게만 표시',
    onboarding_nick_input_placeholder: '닉네임을 입력하세요',
    onboarding_nick_hint1: '최대 6자',
    onboarding_nick_hint2: '완전 익명',
    onboarding_nick_hint3: '언제든 변경 가능',
    onboarding_nick_next: '다음으로',
    onboarding_back_btn: '코드네임',
    alert_codename_retry: '코드네임 배정에 실패했어요. 다시 생성 후 시도해주세요.',

    // Onboarding — interest step
    onboarding_interest_title: '관심사를\n골라주세요',
    onboarding_interest_sub: '최대 3개 · 매칭 시 상대에게 표시돼요',
    onboarding_start: '시작하기',
    onboarding_interest_none: '없음',

    // Onboarding — alerts
    alert_profanity: '사용할 수 없는 단어가 포함되어 있어요',
    alert_nick_empty: '닉네임을 입력해주세요',
    alert_nick_bad: '사용할 수 없는 닉네임이에요',
    alert_interest_max: '최대 3개까지 선택할 수 있어요',
    alert_interest_min: '관심사를 1개 이상 골라주세요',

    // Home
    home_detecting_location: '위치 감지 중...',
    home_nearby: '근처',
    home_hero_title: '이웃과\n대화해볼까요?',
    home_hero_desc: '채팅방을 나가면 대화 내역이 사라져요\n닉네임으로만 만나는 익명 채팅',
    home_match_start: '매칭 시작하기',
    home_match_checking_gps: 'GPS 위치 확인 중...',
    home_info_anon: '완전 익명',
    home_info_anon_desc: '닉네임만\n공개돼요',
    home_info_once: '일회성',
    home_info_once_desc: '나가면\n사라져요',
    home_info_my_hood: '내 동네',
    home_info_my_hood_desc: 'GPS 자동\n감지해요',
    home_activity_title: '지금 우리 동네',
    home_compose_placeholder: '우리 동네 이야기를 써보세요...',
    home_compose_submit: '작성',
    home_load_more: '이전 글 더 보기 ({{count}}개)',
    home_searching_title: '이웃 탐색 중',
    home_searching_sub: '{{region}} 주변을 살펴보고 있어요',
    home_searching_cancel: '취소',
    home_post_close: '닫기',
    home_just_now: '방금 전',
    home_my_hood: '내 동네',

    // Login
    login_sub: '내 동네 이웃과 익명으로 대화해요',
    login_google: 'Google로 계속하기',
    login_kakao: '카카오로 계속하기',
    login_naver: '네이버로 계속하기',
    login_email: '이메일로 계속하기',
    login_divider: '또는',
    login_terms: '계속하면 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다.',
    login_back: '뒤로',
    // 약관 3종 동의 (진입 게이트)
    consent_all: '약관 전체 동의',
    consent_required: '[필수]',
    consent_privacy: '개인정보처리방침',
    consent_service: '서비스 이용약관',
    consent_location: '위치기반서비스 이용약관',
    consent_view: '보기',
    consent_need: '서비스 이용을 위해 약관에 모두 동의해주세요.',

    login_failed: '로그인에 실패했어요. 잠시 후 다시 시도해 주세요.',
    // 위치기반서비스 이용약관 동의 (위치정보법)
    loc_consent_title: '위치기반서비스 이용약관',
    loc_consent_sub: '내 주변 이웃 매칭을 위해 위치정보 이용에 동의가 필요해요.',
    loc_consent_h1: '1. 수집하는 위치정보',
    loc_consent_p1: '현재 위치(GPS/네트워크 기반 좌표). 정확한 좌표는 상대에게 공개되지 않으며, 거리만 500m 단위로 표시됩니다.',
    loc_consent_h2: '2. 이용 목적',
    loc_consent_p2: '내 주변(동네) 이웃과의 거리 기반 매칭에만 사용됩니다.',
    loc_consent_h3: '3. 보유 및 이용기간',
    loc_consent_p3: '위치정보 이용·제공 사실은 위치정보법에 따라 6개월간 보관 후 자동 파기되며, 회원 탈퇴 시 즉시 비식별 처리됩니다.',
    loc_consent_policy_link: '개인정보처리방침 전문 보기',
    loc_consent_agree: '동의하고 매칭 시작',
    loc_consent_cancel: '동의하지 않음',
    // OS 위치 권한 필수 게이트(진입 차단 — 위치 기반 서비스 필수 관문)
    locperm_title: '📍 위치 권한이 필요해요',
    locperm_body: '로코톡은 내 주변 동네 이웃과 익명으로 연결되는 위치 기반 서비스예요. 정확한 위치는 절대 노출되지 않고, 500m 블러 처리되어 동네(구·동) 단위로만 안전하게 쓰여요. 그래서 위치 권한 없이는 서비스를 이용하실 수 없어요. 안심하고 동의해 주세요 🙏',
    locperm_allow: '위치 권한 허용하기',
    locperm_denied_title: '권한을 허용해야 로코톡을 시작할 수 있어요',
    locperm_denied_body: '위치 권한이 거부되어 있어요. iOS 설정 > 로코톡 > 위치에서 "앱을 사용하는 동안"으로 허용한 뒤 돌아와 주세요.',
    locperm_open_settings: 'iOS 설정 열기',
    locperm_recheck: '권한 다시 확인',
    // 성인(본인)인증 필요 안내 (청소년보호법)
    adult_required_title: '본인인증이 필요해요',
    adult_required_msg: '안전한 익명 채팅을 위해 매칭 전 본인인증(성인 확인)이 필요합니다.',
    adult_required_verify: '본인인증 하기',
    adult_required_cancel: '나중에',
    // Email OTP
    email_input_title: '이메일 주소',
    email_input_placeholder: '이메일을 입력하세요',
    email_invalid: '올바른 이메일 주소를 입력해주세요',
    email_send_code: '인증코드 받기',
    email_code_title: '인증코드 입력',
    email_code_sub: '{{email}}로 보낸 6자리 코드를 입력해주세요',
    email_code_invalid: '인증코드가 올바르지 않아요',
    email_code_expired: '인증코드가 만료됐어요. 다시 받아주세요',
    email_verify: '확인',
    email_resend: '{{sec}}초 후 재발송',
    email_resend_now: '인증코드 다시 받기',

    // Home — match alerts
    alert_repeat_match_title: '다시 만났어요',
    alert_repeat_match_msg: '{{nick}}님과 이전에 대화한 적 있어요. 계속 진행할까요?',
    alert_repeat_match_cancel: '다른 이웃 찾기',
    alert_repeat_match_ok: '계속하기',
    alert_no_match_title: '주변 이웃 없음',
    alert_no_match_msg: '지금은 주변에 대화 가능한 이웃이 없어요. 잠시 후 다시 시도해보세요.',
    alert_no_match_ok: '확인',
    premium_match_count: '{{used}}/{{limit}}회 사용 · 한도 초과 시 잠김',

    // MyInfo — region
    myinfo_region_setting: '지역 설정',
    myinfo_region_custom: '커스텀 지역',
    myinfo_region_premium_only: '프리미엄 전용 기능',
    myinfo_region_current: '현재 위치 사용',

    // Home — GPS / server alerts
    alert_gps_denied_title: 'GPS 권한 필요',
    alert_gps_denied_msg: '매칭을 위해 위치 접근 권한이 필요해요.\n설정 → 개인 정보 보호 → 위치 서비스에서 허용해주세요.',
    alert_gps_denied_cancel: '취소',
    alert_gps_denied_settings: '설정 열기',
    alert_gps_fail_title: 'GPS 신호 없음',
    alert_gps_fail_msg: '현재 위치를 받지 못했어요.\nGPS가 켜져 있는지 확인하고 다시 시도해주세요.',
    alert_gps_retry: '다시 시도',
    alert_server_fail_title: '서버 연결 실패',
    alert_server_fail_msg: '서버에 연결할 수 없어요.\n오프라인 모드로 진행합니다.',
    alert_match_error: '매칭 오류',
    alert_compose_blocked_title: '작성 불가',
    alert_compose_blocked_msg: '사용할 수 없는 단어가 포함되어 있어요',

    // Chat
    chat_notice_no_save: '🕒 최근 대화는 일정 기간만 보관돼요',
    chat_empty_title: '아직 진행 중인 대화가 없어요',
    chat_empty_desc: '내 동네 이웃과 익명으로\n새로운 이야기를 시작해보세요 ✨',
    chat_empty_btn: '이웃 만나러 가기',
    chat_anon: '익명',
    chat_leave_btn: '나가기',
    chat_leave_title: '채팅 나가기',
    chat_leave_msg: '나가면 대화 내역이 모두 사라져요',
    chat_leave_confirm: '나가기',
    chat_block_title: '차단',
    chat_block_msg: '{{nick}}님을 차단할까요?',
    chat_block_confirm: '차단',
    chat_block_menu: '{{nick}} 차단하기',
    chat_leave_menu: '채팅방 나가기',
    chat_menu_cancel: '취소',
    chat_input_placeholder: '메시지 입력',
    chat_input_placeholder_gone: '상대방이 나갔어요',
    chat_peer_left: '💨 상대방이 채팅방을 나갔어요',
    chat_peer_long_gone: '💨 상대방이 오랫동안 자리를 비워 채팅이 종료됐어요',
    chat_send_failed: '⚠️ 전송 실패 · 다시 보내기',
    chat_region_unknown: '동네',
    time_am: '오전',
    time_pm: '오후',

    // MyInfo
    myinfo_title: '내 정보',
    myinfo_settings_section: '설정',
    myinfo_interests_change: '관심사 변경',
    myinfo_blocked_list: '차단 목록',
    myinfo_blocked_count: '{{count}}명',
    myinfo_accepts_chat: '채팅 받기',
    myinfo_accepts_chat_hint: '매칭 요청을 자동으로 받아요',
    myinfo_notifications: '알림',
    myinfo_language: '언어',
    myinfo_language_value: '한국어',
    myinfo_about_section: 'Locotalk은',
    myinfo_reset_btn: '처음부터 다시 시작',
    myinfo_reset_title: '처음부터',
    myinfo_reset_msg: '닉네임과 관심사가 초기화돼요',
    myinfo_reset_confirm: '초기화',
    myinfo_location_unset: '위치 미설정',
    myinfo_interest_unset: '미설정',
    myinfo_info_anon: '완전 익명',
    myinfo_info_anon_desc: '나이·성별·전화번호 모두 비공개예요',
    myinfo_info_once: '일회성 채팅',
    myinfo_info_once_desc: '채팅방 퇴장 시 모든 대화가 사라져요',
    myinfo_info_gps: 'GPS 매칭',
    myinfo_info_gps_desc: '내 동네 이웃과 자동으로 연결해요',
    myinfo_int_modal_title: '관심사 변경',
    myinfo_int_modal_sub: '최대 3개 선택 · 없음 선택 시 나머지 해제',
    myinfo_int_modal_none: '없음',
    myinfo_int_min: '관심사를 1개 이상 선택해주세요',
    myinfo_int_max: '최대 3개까지 선택할 수 있어요',
    myinfo_blocked_title: '차단 목록',
    myinfo_blocked_empty: '차단한 사용자가 없어요',
    myinfo_unblock: '해제',

    // Navigation
    tab_home: '홈',
    tab_chat: '채팅',
    tab_myinfo: '내정보',

    // Match modal
    match_request_title: '채팅 요청이 왔어요 ✨',
    match_anon: '익명',
    match_decline: '거절',
    match_accept: '수락하기',
    match_hint: '60초 안에 응답하지 않으면 자동으로 거절돼요',
  },

  en: {
    // Common
    cancel: 'Cancel',
    close: 'Close',
    save: 'Save',
    confirm: 'OK',

    // Onboarding — nick step (auto-generated codename)
    onboarding_preview: 'Your codename',
    onboarding_nick_title: "What's your\nnickname?",
    onboarding_nick_sub: 'Only shown to your matched neighbor',
    onboarding_codename_sub: 'An anonymous codename is assigned automatically',
    onboarding_codename_reroll: 'Regenerate',
    onboarding_codename_hint1: 'Auto-generated',
    onboarding_codename_hint2: 'Fully anonymous',
    onboarding_codename_hint3: 'Shown only to your match',
    onboarding_nick_input_placeholder: 'Enter a nickname',
    onboarding_nick_hint1: 'Up to 6 chars',
    onboarding_nick_hint2: 'Fully anonymous',
    onboarding_nick_hint3: 'Change anytime',
    onboarding_nick_next: 'Next',
    onboarding_back_btn: 'Codename',
    alert_codename_retry: 'Could not assign a codename. Please regenerate and try again.',

    // Onboarding — interest step
    onboarding_interest_title: 'Pick your\ninterests',
    onboarding_interest_sub: 'Up to 3 · shown to your match',
    onboarding_start: "Let's go!",
    onboarding_interest_none: 'None',

    // Onboarding — alerts
    alert_profanity: 'This word is not allowed',
    alert_nick_empty: 'Please enter a nickname',
    alert_nick_bad: "This nickname isn't allowed",
    alert_interest_max: 'You can select up to 3 interests',
    alert_interest_min: 'Please pick at least 1 interest',

    // Home
    home_detecting_location: 'Detecting location...',
    home_nearby: 'nearby',
    home_hero_title: 'Chat with\na neighbor?',
    home_hero_desc: 'History disappears when you leave\nAnonymous chat — nickname only',
    home_match_start: 'Start Matching',
    home_match_checking_gps: 'Checking GPS...',
    home_info_anon: 'Anonymous',
    home_info_anon_desc: 'Nickname\nonly',
    home_info_once: 'One-time',
    home_info_once_desc: 'Gone when\nyou leave',
    home_info_my_hood: 'My Hood',
    home_info_my_hood_desc: 'Auto GPS\ndetection',
    home_activity_title: 'Neighborhood Feed',
    home_compose_placeholder: 'Share something with your neighborhood...',
    home_compose_submit: 'Post',
    home_load_more: 'Load {{count}} more',
    home_searching_title: 'Finding neighbors',
    home_searching_sub: 'Looking around {{region}}',
    home_searching_cancel: 'Cancel',
    home_post_close: 'Close',
    home_just_now: 'Just now',
    home_my_hood: 'My hood',

    // Login
    login_sub: 'Chat anonymously with neighbors',
    login_google: 'Continue with Google',
    login_kakao: 'Continue with Kakao',
    login_naver: 'Continue with Naver',
    login_email: 'Continue with Email',
    login_divider: 'or',
    login_terms: 'By continuing, you agree to our Terms of Service and Privacy Policy.',
    // Terms consent (entry gate)
    consent_all: 'Agree to all',
    consent_required: '[Required]',
    consent_privacy: 'Privacy Policy',
    consent_service: 'Terms of Service',
    consent_location: 'Location-Based Service Terms',
    consent_view: 'View',
    consent_need: 'Please agree to all terms to continue.',
    login_back: 'Back',

    login_failed: 'Sign-in failed. Please try again in a moment.',
    // Location-based service terms consent (Location Information Act)
    loc_consent_title: 'Location-Based Service Terms',
    loc_consent_sub: 'We need your consent to use location data for matching nearby neighbors.',
    loc_consent_h1: '1. Location data collected',
    loc_consent_p1: 'Your current location (GPS/network coordinates). Exact coordinates are never shared with others — only distance, rounded to 500m.',
    loc_consent_h2: '2. Purpose of use',
    loc_consent_p2: 'Used only for distance-based matching with neighbors in your area.',
    loc_consent_h3: '3. Retention period',
    loc_consent_p3: 'Records of location use are kept for 6 months per the Location Information Act, then auto-deleted; de-identified immediately upon account withdrawal.',
    loc_consent_policy_link: 'View full Privacy Policy',
    loc_consent_agree: 'Agree & Start Matching',
    loc_consent_cancel: 'Do not agree',
    // OS location permission gate (mandatory — blocks entry for a location-based service)
    locperm_title: '📍 Location permission needed',
    locperm_body: 'Locotalk is a location-based service that anonymously connects you with neighbors nearby. Your exact location is never revealed — it’s blurred by 500m and used only at the neighborhood (district) level. So Locotalk can’t be used without location permission. Please allow it with confidence 🙏',
    locperm_allow: 'Allow location access',
    locperm_denied_title: 'Allow permission to start Locotalk',
    locperm_denied_body: 'Location permission is denied. Go to iOS Settings > Locotalk > Location and choose “While Using the App,” then come back.',
    locperm_open_settings: 'Open iOS Settings',
    locperm_recheck: 'Check again',
    // Identity (adult) verification required (Youth Protection Act)
    adult_required_title: 'Identity verification required',
    adult_required_msg: 'For safe anonymous chat, identity (adult) verification is required before matching.',
    adult_required_verify: 'Verify now',
    adult_required_cancel: 'Later',
    // Email OTP
    email_input_title: 'Email Address',
    email_input_placeholder: 'Enter your email',
    email_invalid: 'Please enter a valid email address',
    email_send_code: 'Send Code',
    email_code_title: 'Enter Code',
    email_code_sub: 'Enter the 6-digit code sent to {{email}}',
    email_code_invalid: 'Incorrect code. Please try again.',
    email_code_expired: 'Code expired. Please request a new one.',
    email_verify: 'Verify',
    email_resend: 'Resend in {{sec}}s',
    email_resend_now: 'Resend Code',

    // Home — match alerts
    alert_repeat_match_title: "You've met before",
    alert_repeat_match_msg: "You've chatted with {{nick}} before. Continue?",
    alert_repeat_match_cancel: 'Find someone else',
    alert_repeat_match_ok: 'Continue',
    alert_no_match_title: 'No neighbors nearby',
    alert_no_match_msg: 'No one is available right now. Try again in a moment.',
    alert_no_match_ok: 'OK',
    premium_match_count: '{{used}}/{{limit}} used · Locked when over limit',

    // MyInfo — region
    myinfo_region_setting: 'Region Setting',
    myinfo_region_custom: 'Custom Region',
    myinfo_region_premium_only: 'Premium only',
    myinfo_region_current: 'Use current location',

    // Home — GPS / server alerts
    alert_gps_denied_title: 'Location Required',
    alert_gps_denied_msg: 'Location access is needed for matching.\nGo to Settings → Privacy → Location Services to enable.',
    alert_gps_denied_cancel: 'Cancel',
    alert_gps_denied_settings: 'Open Settings',
    alert_gps_fail_title: 'No GPS Signal',
    alert_gps_fail_msg: "Couldn't get your location.\nMake sure GPS is on and try again.",
    alert_gps_retry: 'Try Again',
    alert_server_fail_title: 'Connection Failed',
    alert_server_fail_msg: "Couldn't reach the server.\nContinuing in offline mode.",
    alert_match_error: 'Match Error',
    alert_compose_blocked_title: 'Cannot Post',
    alert_compose_blocked_msg: 'This word is not allowed',

    // Chat
    chat_notice_no_save: '🕒 Recent chats are kept for a limited time',
    chat_empty_title: 'No conversations yet',
    chat_empty_desc: 'Start a new story anonymously\nwith a neighbor nearby ✨',
    chat_empty_btn: 'Meet a Neighbor',
    chat_anon: 'Anonymous',
    chat_leave_btn: 'Leave',
    chat_leave_title: 'Leave Chat',
    chat_leave_msg: 'All messages will disappear when you leave',
    chat_leave_confirm: 'Leave',
    chat_block_title: 'Block User',
    chat_block_msg: 'Block {{nick}}?',
    chat_block_confirm: 'Block',
    chat_block_menu: 'Block {{nick}}',
    chat_leave_menu: 'Leave chat room',
    chat_menu_cancel: 'Cancel',
    chat_input_placeholder: 'Message',
    chat_input_placeholder_gone: 'The other person has left',
    chat_peer_left: '💨 The other person left the chat',
    chat_peer_long_gone: '💨 Chat ended — the other person was away too long',
    chat_send_failed: '⚠️ Failed to send · Tap to retry',
    chat_region_unknown: 'Nearby',
    time_am: 'AM',
    time_pm: 'PM',

    // MyInfo
    myinfo_title: 'My Profile',
    myinfo_settings_section: 'Settings',
    myinfo_interests_change: 'Edit Interests',
    myinfo_blocked_list: 'Blocked Users',
    myinfo_blocked_count: '{{count}} blocked',
    myinfo_accepts_chat: 'Accept Chats',
    myinfo_accepts_chat_hint: 'Auto-accept incoming match requests',
    myinfo_notifications: 'Notifications',
    myinfo_language: 'Language',
    myinfo_language_value: 'English',
    myinfo_about_section: 'About Locotalk',
    myinfo_reset_btn: 'Start Over',
    myinfo_reset_title: 'Start Over',
    myinfo_reset_msg: 'Your nickname and interests will be reset',
    myinfo_reset_confirm: 'Reset',
    myinfo_location_unset: 'Location not set',
    myinfo_interest_unset: 'Not set',
    myinfo_info_anon: 'Fully Anonymous',
    myinfo_info_anon_desc: 'Age, gender & phone are all private',
    myinfo_info_once: 'One-time Chat',
    myinfo_info_once_desc: 'All messages disappear when you leave',
    myinfo_info_gps: 'GPS Matching',
    myinfo_info_gps_desc: 'Auto-connects you with nearby neighbors',
    myinfo_int_modal_title: 'Edit Interests',
    myinfo_int_modal_sub: 'Up to 3 · selecting None clears others',
    myinfo_int_modal_none: 'None',
    myinfo_int_min: 'Please select at least 1 interest',
    myinfo_int_max: 'You can select up to 3 interests',
    myinfo_blocked_title: 'Blocked Users',
    myinfo_blocked_empty: 'No blocked users',
    myinfo_unblock: 'Unblock',

    // Navigation
    tab_home: 'Home',
    tab_chat: 'Chat',
    tab_myinfo: 'Profile',

    // Match modal
    match_request_title: 'Chat request! ✨',
    match_anon: 'Anonymous',
    match_decline: 'Decline',
    match_accept: 'Accept',
    match_hint: "No response in 60 sec = auto-declined",
  },
} as const;

export type TKey = keyof typeof translations.ko;

// ─── Standalone translate (safe inside callbacks / effects) ───────

/**
 * Translate a key with optional template params — does NOT rely on
 * React context so it can be called from event handlers and effects.
 */
export function translate(
  key: TKey,
  lang: Lang,
  params?: Record<string, string | number>,
): string {
  const dict = (translations[lang] ?? translations.ko) as Record<string, string>;
  let str: string = dict[key] ?? (translations.ko as Record<string, string>)[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    }
  }
  return str;
}

// ─── React hooks ─────────────────────────────────────────────────

/** Returns the current language from the store (reactive). */
export function useLang(): Lang {
  return useStore(s => s.lang);
}

/**
 * Returns a reactive `t(key, params?)` function.
 * Re-renders the component when lang changes.
 */
export function useT() {
  const lang = useLang();
  return (key: TKey, params?: Record<string, string | number>): string =>
    translate(key, lang, params);
}

// ─── Locale auto-detection ────────────────────────────────────────


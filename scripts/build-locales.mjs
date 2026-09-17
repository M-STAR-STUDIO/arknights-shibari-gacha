// Generates the trial localized pages en/index.html and ko/index.html from index.html.
// Usage: node scripts/build-locales.mjs   (re-run after editing index.html)
// The UI logic is shared (js/app.js); only the markup strings and paths differ.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = await readFile(resolve(root, 'index.html'), 'utf8');

const BASE = 'https://mstar-studio.com/arknights-shibari-gacha/';

const L = {
  en: {
    lang: 'en',
    title: 'Arknights Challenge Gacha | Random 12-operator squads for challenge runs',
    description: 'Draw 12 random operators from the entire Arknights roster and clear stages with exactly that squad. Four difficulties, class guarantee, rerolls for operators you don\'t own, and a shareable result image. Free, no sign-up, works on your phone.',
    ogTitle: 'Arknights Challenge Gacha | Random 12-operator squads',
    ogDesc: '12 random operators. Clear the stage with exactly that squad.',
    siteName: 'Arknights Challenge Gacha',
    jsonName: 'Arknights Challenge Gacha',
    jsonDesc: 'Draw 12 random operators from the Arknights roster and play with exactly that squad.',
    switcher: { ja: '日本語', en: 'English', ko: '한국어', label: 'Language' },
    h1: 'Arknights<span class="title__sub">Challenge Gacha</span>',
    lead: '12 random operators from the whole roster. Clear the stage with exactly that squad.',
    leadSub: 'Don\'t own someone? Use "Reroll selected" to redraw just that card at the same rarity.',
    ownedTitle: 'Link a shared roster ID to exclude operators you don\'t own',
    sssTitle: 'Draw the 20-operator starting squad for Stationary Security Service',
    ownedPill: 'Link ID',
    sssPill: 'SSS',
    ownedPlaceholder: 'Share URL or ID',
    ownedAria: 'Arknights Shared Viewer share URL',
    ownedLoad: 'Link',
    ownedInfoAria: 'How it works',
    ownedStatus: 'Link your roster to exclude operators you don\'t own.',
    ownedClear: 'Unlink',
    ownedDetail: `
        <p><strong>About linking</strong> Paste a share URL from <a class="footer__link" href="https://sharing-view.memoria-ll.link/" target="_blank" rel="noopener noreferrer">Arknights Shared Viewer</a> (made by <a class="footer__link" href="https://x.com/an_mngtool" target="_blank" rel="noopener noreferrer">OperatorManageToolマン, @an_mngtool</a>) and only the operators registered there will be drawn. No login or account is needed here, and it has nothing to do with your game account.</p>
        <p><strong>Steps</strong></p>
        <ol>
          <li>Register your operators in Memoria's <a class="footer__link" href="https://arknights.memoria-ll.link/en/" target="_blank" rel="noopener noreferrer">Arknights Operators Manager</a> (Windows; manual entry, meant for people already using it)</li>
          <li>Create a share URL from the tool's share feature</li>
          <li>Paste the URL (or just the ID at the end) above and press "Link"</li>
        </ol>
        <p><strong>Storage and updates</strong> The link is stored only in this browser and never sent to this site's server. The roster is refreshed every time you open the site, so updating Memoria is enough. The in-app browser of X counts as a different browser, so link again there if needed. "Unlink" removes it at any time.</p>
        <p class="muted">A share URL contains nothing beyond your operator list (no password or game ID). The roster service may become unavailable without notice; drawing from the full roster keeps working regardless.</p>`,
    modeNote: 'To change the difficulty, press "Draw again"',
    modesAria: 'Difficulty',
    musou: 'All ★6', musouSub: 'MUSOU', easy: 'Easy', normal: 'Normal',
    guaranteeLabel: 'Class guarantee', guaranteeAria: 'Class guarantee', gOff: 'Off', gOn: 'On', gDesc: 'Fully random',
    squadAria: 'Squad', revealAll: 'Flip all',
    draw: 'DRAW', share: 'Share', reroll: 'Reroll selected', rerollGo: 'Reroll', cancel: 'Cancel', again: 'Draw again',
    infoAria: 'About this site',
    info: `
    <div class="panel__label">ABOUT</div>
    <details class="info">
      <summary>About this site &amp; how to play</summary>
      <div class="info__body">
        <p>Arknights Challenge Gacha is an unofficial fan tool for challenge runs in the mobile tower-defense game <em>Arknights</em>. It picks 12 random operators from every operator released on the global (EN/JP/KR) servers, and you clear stages with exactly that squad. No sign-up, no login, works in your phone's browser. The fun happens in the game; this site only creates the restriction.</p>
        <p><strong>Basic flow</strong></p>
        <ol>
          <li><strong>Pick a difficulty.</strong> Default is Easy. Difficulty only changes the rarity odds of the operators you draw, not the stage. "All ★6" and "Easy" suit well-developed accounts; "Normal" and "Mon3tr" mix in ★3 and below.</li>
          <li><strong>Press DRAW.</strong> 12 cards appear face down. Even face down, the card color shows the rarity and the icon shows the class.</li>
          <li><strong>Flip the cards.</strong> Tap to flip one at a time, or "Flip all". Tap a flipped card again to see the full illustration, name, rarity and class.</li>
          <li><strong>Reroll operators you don't own.</strong> Press "Reroll selected", tap the cards, then "Reroll". Only those cards are redrawn at the same rarity, without duplicates. No limit. Under-leveled operators are not a reason to reroll: raise them instead.</li>
          <li><strong>Share.</strong> "Share" builds a result image on the spot and sends it, with hashtags, to X or other apps. If the share button is missing on your device, save the image and post it.</li>
          <li><strong>Build the squad in game and go.</strong> Support units from friends are off by default.</li>
        </ol>
        <p><strong>Class guarantee</strong> "Off" is fully random: no medic, four guards, anything can happen. "On" fills the top two rows with one operator of each class in order (Vanguard, Guard, Defender, Sniper, Caster, Medic, Supporter, Specialist) and draws the last four slots at random. With "On", operators from smaller classes appear a little more often (see FAQ).</p>
        <p><strong>SSS</strong> Press the small "SSS" pill above the difficulty to draw a 20-operator starting squad for Stationary Security Service. With class guarantee on, each class gets two operators (top four rows) and the last four slots are random.</p>
        <p><strong>Link ID</strong> Link a share URL from Arknights Shared Viewer to exclude operators you don't own. Details are behind the "i" next to the "Link ID" pill. Everything works without linking.</p>
      </div>
    </details>
    <details class="info">
      <summary>Difficulties and odds</summary>
      <div class="info__body">
        <p>Difficulty sets the rarity odds. For each of the 12 slots the rarity is rolled first, then one operator is picked uniformly from that rarity among those not yet drawn. No duplicates within a squad. With class guarantee on, the first 8 slots are rolled per class before the remaining 4.</p>
        <div class="table-wrap">
        <table class="info__table">
          <thead><tr><th>Difficulty</th><th>★6</th><th>★5</th><th>★4</th><th>★3</th><th>★1–2</th></tr></thead>
          <tbody>
            <tr><td>All ★6</td><td>100%</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>
            <tr><td>Easy</td><td>50%</td><td>30%</td><td>20%</td><td>-</td><td>-</td></tr>
            <tr><td>Normal</td><td>30%</td><td>40%</td><td>20%</td><td>5%</td><td>5%</td></tr>
            <tr><td>Mon3tr</td><td>10%</td><td>50%</td><td>20%</td><td>10%</td><td>10%</td></tr>
          </tbody>
        </table>
        </div>
        <p>Card frames: ★6 glossy gold, ★5 yellow, ★4 blue, ★3 and below white.</p>
      </div>
    </details>
    <details class="info">
      <summary>Extra rule ideas</summary>
      <div class="info__body">
        <ul>
          <li><strong>No rerolls</strong>: leave unowned slots empty.</li>
          <li><strong>Promotion / level caps</strong>: E1 only, level 50, and so on.</li>
          <li><strong>No support units</strong>.</li>
          <li><strong>Skill lock</strong>: everyone on skill 1, or pick skills at random.</li>
          <li><strong>Farming runs</strong>: clear material stages or Annihilation with the drawn squad only.</li>
          <li><strong>Same squad with friends</strong>: share the image and compare results on the same stage.</li>
        </ul>
      </div>
    </details>
    <details class="info">
      <summary>FAQ</summary>
      <div class="info__body">
        <dl class="faq">
          <dt>Do CN-only operators appear?</dt>
          <dd>No. The roster follows the global (JP) server data, so only operators released on global servers are included. Names are taken from the EN server data.</dd>
          <dt>When are new operators added?</dt>
          <dd>The roster updates automatically every week, usually within a week of release.</dd>
          <dt>Are collab and event-only operators included?</dt>
          <dd>Yes. If one you can't obtain shows up, use "Reroll selected". Reserve operators and other non-playable characters are excluded.</dd>
          <dt>Are operators of the same rarity equally likely?</dt>
          <dd>With class guarantee off, yes: after the rarity roll, one operator is picked uniformly using the browser's cryptographic random generator. With class guarantee on, operators are equally likely within the same class and rarity, but smaller classes (for example 8 ★6 medics vs 29 ★6 guards) get a higher per-operator rate. That is inherent to guaranteeing one per class.</dd>
          <dt>Can I draw only from operators I own?</dt>
          <dd>Yes. Press "Link ID" and paste a share URL from Arknights Shared Viewer (by OperatorManageToolマン, @an_mngtool). Unowned operators are then excluded. The link is stored only in your browser. Level or promotion is not used for filtering.</dd>
          <dt>Is anything saved?</dt>
          <dd>No. Results disappear when you close the page; save the image if you want to keep them.</dd>
          <dt>Is it free? Do I need an account?</dt>
          <dd>Free, no sign-up, no login, and no connection to your game account.</dd>
        </dl>
      </div>
    </details>`,
    footerLegal: `      This is an unofficial fan site made by an individual and is not affiliated with Hypergryph or Yostar.<br>
      Arknights and all operator names and images are © Hypergryph / Yostar.<br>
      Operator images and data come from community-published game data. Requests from rights holders will be handled promptly.`,
    by: 'Made by',
    contact: 'Contact (X: @MStarStudio96)',
    privacy: 'Privacy policy (Japanese)',
    provider: 'Roster linking uses <a class="footer__link" href="https://sharing-view.memoria-ll.link/" target="_blank" rel="noopener noreferrer">Arknights Shared Viewer</a> by <a class="footer__link" href="https://x.com/an_mngtool" target="_blank" rel="noopener noreferrer">OperatorManageToolマン (@an_mngtool)</a>',
    links: `      <a class="footer__link" href="../guide.html">Guide (JA)</a>
      <span class="footer__sep">/</span>
      <a class="footer__link" href="../rules.html">Rule ideas (JA)</a>
      <span class="footer__sep">/</span>
      <a class="footer__link" href="../changelog.html">Changelog (JA)</a>
      <span class="footer__sep">/</span>
      <a class="footer__link" href="../operators.html">Operator list (JA)</a>`,
    close: 'Close', save: 'Save image', shareNote: 'Save the image, then post it.', nativeShare: 'Share',
  },
  ko: {
    lang: 'ko',
    title: '명일방주 제약 가챠 | 랜덤 12명 편성으로 도전하는 제약 플레이 도구',
    description: '명일방주 전체 오퍼레이터 중에서 랜덤으로 12명을 뽑아, 그 편성 그대로 작전에 도전하는 제약 플레이용 무료 도구. 난이도 4단계, 직군 보장, 미보유 오퍼레이터 다시 뽑기, 결과 이미지 공유 지원. 가입 없이 스마트폰에서 바로 사용.',
    ogTitle: '명일방주 제약 가챠 | 랜덤 12명으로 도전',
    ogDesc: '전체 오퍼레이터 중 랜덤 12명. 뽑은 편성 그대로 도전.',
    siteName: '명일방주 제약 가챠',
    jsonName: '명일방주 제약 가챠',
    jsonDesc: '명일방주 전체 오퍼레이터 중 랜덤 12명을 뽑아 그 편성 그대로 도전하는 제약 플레이 도구.',
    switcher: { ja: '日本語', en: 'English', ko: '한국어', label: '언어' },
    h1: '명일방주<span class="title__sub">제약 가챠</span>',
    lead: '전체 오퍼레이터 중 랜덤 12명. 뽑은 편성 그대로 도전.',
    leadSub: '없는 오퍼레이터가 나오면 「골라서 다시 뽑기」로 그 카드만 같은 등급에서 다시 뽑을 수 있습니다.',
    ownedTitle: '공유 ID를 등록하면 미보유 오퍼레이터를 자동으로 제외합니다',
    sssTitle: '보안파견 초기 편성(20명)을 뽑기',
    ownedPill: 'ID 등록',
    sssPill: '보안파견',
    ownedPlaceholder: '공유 URL 또는 ID',
    ownedAria: 'Arknights Shared Viewer 공유 URL',
    ownedLoad: '등록',
    ownedInfoAria: '사용 방법',
    ownedStatus: '등록하면 미보유 오퍼레이터가 자동으로 제외됩니다.',
    ownedClear: '해제',
    ownedDetail: `
        <p><strong>ID 등록이란</strong> <a class="footer__link" href="https://x.com/an_mngtool" target="_blank" rel="noopener noreferrer">OperatorManageToolマン(@an_mngtool)</a>님이 만든 <a class="footer__link" href="https://sharing-view.memoria-ll.link/" target="_blank" rel="noopener noreferrer">Arknights Shared Viewer</a>의 공유 URL을 등록하면, 거기에 등록된 보유 오퍼레이터만 뽑기 대상이 됩니다. 로그인이나 계정 생성은 필요 없고, 게임 계정과도 무관합니다.</p>
        <p><strong>등록 순서</strong></p>
        <ol>
          <li>Memoria의 <a class="footer__link" href="https://arknights.memoria-ll.link/" target="_blank" rel="noopener noreferrer">명일방주 육성 관리 도구</a>(Windows)에 보유 오퍼레이터를 등록(수동 입력. 이미 쓰고 있는 분을 위한 기능입니다)</li>
          <li>도구의 데이터 공유 기능으로 공유 URL 발급</li>
          <li>그 URL(또는 끝의 ID)을 위 칸에 붙여넣고 「등록」</li>
        </ol>
        <p><strong>저장과 갱신</strong> 등록 내용은 이 브라우저에만 저장되며 이 사이트의 서버로는 전송되지 않습니다. 사이트를 열 때마다 최신 보유 목록을 다시 가져오므로 Memoria 쪽만 갱신하면 됩니다. X 앱 안에서 열면 다른 브라우저로 취급되니 그 경우 다시 등록해 주세요. 「해제」로 언제든 되돌릴 수 있습니다.</p>
        <p class="muted">공유 URL에는 보유 목록 이외의 정보(비밀번호, 게임 ID)는 들어 있지 않습니다. 제공처 사정으로 예고 없이 사용할 수 없게 될 수 있으며, 그 경우에도 전체에서 뽑는 기본 동작은 그대로입니다.</p>`,
    modeNote: '난이도를 바꾸려면 「다시 뽑기」를 누르세요',
    modesAria: '난이도 선택',
    musou: '무쌍', musouSub: 'ALL ★6', easy: '이지', normal: '노멀',
    guaranteeLabel: '직군 보장', guaranteeAria: '직군 보장', gOff: '없음', gOn: '있음', gDesc: '완전 랜덤',
    squadAria: '편성', revealAll: '모두 뒤집기',
    draw: '뽑기', share: '공유', reroll: '골라서 다시 뽑기', rerollGo: '다시 뽑기', cancel: '취소', again: '다시 뽑기',
    infoAria: '이 사이트에 대해',
    info: `
    <div class="panel__label">ABOUT</div>
    <details class="info">
      <summary>이 사이트에 대해 · 사용 방법</summary>
      <div class="info__body">
        <p>「명일방주 제약 가챠」는 모바일 타워 디펜스 게임 『명일방주』의 제약 플레이를 위해 만든 비공식 팬 도구입니다. 글로벌(EN/JP/KR) 서버에 실장된 전체 오퍼레이터 중에서 랜덤으로 12명을 뽑고, 그 12명 그대로 편성해 작전에 도전합니다. 가입·로그인 없이 스마트폰 브라우저에서 바로 쓸 수 있습니다. 재미의 본체는 게임 쪽에 있고, 이 사이트는 「제약을 만드는 것」만 담당합니다.</p>
        <p><strong>기본 흐름</strong></p>
        <ol>
          <li><strong>난이도 선택.</strong> 기본은 「이지」입니다. 난이도는 뽑히는 오퍼레이터의 등급 확률만 바꾸며, 스테이지 난이도와는 관계없습니다. 「무쌍」「이지」는 보유가 충실한 분, 「노멀」「Mon3tr」은 ★3 이하도 섞입니다.</li>
          <li><strong>「뽑기」를 누름.</strong> 12장의 카드가 뒷면으로 놓입니다. 뒷면이어도 카드 색으로 등급을, 오른쪽 아래 아이콘으로 직군을 알 수 있습니다.</li>
          <li><strong>카드 뒤집기.</strong> 탭하면 한 장씩 뒤집힙니다. 「모두 뒤집기」로 한 번에 뒤집을 수도 있습니다. 뒤집힌 카드를 다시 탭하면 전신 일러스트와 이름·등급·직군이 표시됩니다.</li>
          <li><strong>없는 오퍼레이터는 다시 뽑기.</strong> 「골라서 다시 뽑기」를 누르고 해당 카드를 탭해 선택한 뒤 「다시 뽑기」. 선택한 카드만 같은 등급에서 다시 뽑히며 중복되지 않습니다. 횟수 제한 없음. 미육성 오퍼레이터는 다시 뽑지 말고 이 기회에 키우는 것을 권장합니다.</li>
          <li><strong>공유.</strong> 「공유」를 누르면 12명을 나열한 결과 이미지가 그 자리에서 만들어지고, 해시태그와 함께 X 등 앱으로 보낼 수 있습니다. 공유 버튼이 없는 환경에서는 「이미지 저장」 후 올려 주세요.</li>
          <li><strong>게임에서 편성해 도전.</strong> 친구 지원 오퍼레이터는 쓰지 않는 것이 기본입니다.</li>
        </ol>
        <p><strong>직군 보장</strong> 「없음」은 완전 랜덤이라 메딕이 한 명도 없거나 가드만 넷인 편성도 나옵니다. 「있음」이면 위 2줄 8칸에 뱅가드·가드·디펜더·스나이퍼·캐스터·메딕·서포터·스페셜리스트가 이 순서로 1명씩 들어가고, 아래 4칸은 랜덤입니다. 「있음」에서는 인원이 적은 직군의 오퍼레이터가 조금 더 자주 나옵니다(FAQ 참고).</p>
        <p><strong>보안파견</strong> 난이도 위의 작은 「보안파견」을 누르고 뽑으면 보안파견 초기 편성 20명을 뽑습니다. 직군 보장 「있음」이면 각 직군 2명씩(위 4줄), 나머지 4칸은 랜덤입니다.</p>
        <p><strong>ID 등록</strong> 난이도 위의 「ID 등록」에서 Arknights Shared Viewer 공유 URL을 등록하면 미보유 오퍼레이터가 자동으로 제외됩니다. 자세한 내용은 「ID 등록」 옆의 「i」에 있습니다. 등록하지 않아도 모든 기능을 쓸 수 있습니다.</p>
      </div>
    </details>
    <details class="info">
      <summary>난이도와 확률</summary>
      <div class="info__body">
        <p>난이도는 뽑히는 오퍼레이터의 등급 확률을 정합니다. 먼저 확률로 등급을 정하고, 그 등급 중 아직 나오지 않은 오퍼레이터에서 균등하게 1명을 고르는 과정을 12번 반복합니다. 한 편성 안에서 같은 오퍼레이터는 중복되지 않습니다. 직군 보장 「있음」이면 먼저 8개 직군 각각 1명을 정한 뒤 나머지 4칸을 뽑습니다.</p>
        <div class="table-wrap">
        <table class="info__table">
          <thead><tr><th>난이도</th><th>★6</th><th>★5</th><th>★4</th><th>★3</th><th>★1·2</th></tr></thead>
          <tbody>
            <tr><td>무쌍</td><td>100%</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>
            <tr><td>이지</td><td>50%</td><td>30%</td><td>20%</td><td>-</td><td>-</td></tr>
            <tr><td>노멀</td><td>30%</td><td>40%</td><td>20%</td><td>5%</td><td>5%</td></tr>
            <tr><td>Mon3tr</td><td>10%</td><td>50%</td><td>20%</td><td>10%</td><td>10%</td></tr>
          </tbody>
        </table>
        </div>
        <p>카드 테두리 색: ★6 광택 있는 금색, ★5 노랑, ★4 파랑, ★3 이하 흰색.</p>
      </div>
    </details>
    <details class="info">
      <summary>추가 규칙 예시</summary>
      <div class="info__body">
        <ul>
          <li><strong>다시 뽑기 금지</strong>: 미보유 칸은 비운 채 도전.</li>
          <li><strong>정예화·레벨 제한</strong>: 1정예까지, 레벨 50까지 등.</li>
          <li><strong>지원 유닛 금지</strong>.</li>
          <li><strong>스킬 고정</strong>: 전원 1스킬, 또는 랜덤으로 결정.</li>
          <li><strong>파밍에 적용</strong>: 재료 파밍이나 섬멸 작전을 뽑은 편성만으로.</li>
          <li><strong>친구와 같은 편성</strong>: 이미지를 공유해 같은 스테이지에서 결과 비교.</li>
        </ul>
      </div>
    </details>
    <details class="info">
      <summary>자주 묻는 질문</summary>
      <div class="info__body">
        <dl class="faq">
          <dt>대륙판(중국 서버) 한정 오퍼레이터도 나오나요?</dt>
          <dd>아니요. 글로벌(JP) 서버 데이터를 기준으로 하므로 글로벌 서버에 실장된 오퍼레이터만 대상입니다. 이름은 한국 서버 데이터를 사용합니다.</dd>
          <dt>새 오퍼레이터는 언제 반영되나요?</dt>
          <dd>목록은 매주 자동 갱신되며, 보통 실장 후 1주일 안에 반영됩니다.</dd>
          <dt>콜라보·배포 오퍼레이터도 포함되나요?</dt>
          <dd>포함됩니다. 지금 얻을 수 없는 오퍼레이터가 나오면 「골라서 다시 뽑기」로 교체하세요. 예비 오퍼레이터 등 편성에 쓸 수 없는 캐릭터는 제외합니다.</dd>
          <dt>같은 등급의 오퍼레이터는 정말 같은 확률인가요?</dt>
          <dd>직군 보장 「없음」에서는 같은 확률입니다. 등급이 정해진 뒤 브라우저의 암호용 난수로 균등하게 1명을 고릅니다. 「있음」에서는 같은 직군·같은 등급 안에서는 같은 확률이지만, 직군별 인원이 달라 인원이 적은 직군(예: ★6 메딕 8명 vs 가드 29명)의 오퍼레이터가 1명당 출현율이 높아집니다. 각 직군 1명을 보장하는 이상 피할 수 없는 성질입니다.</dd>
          <dt>보유한 오퍼레이터만으로 뽑을 수 있나요?</dt>
          <dd>가능합니다. 「ID 등록」을 누르고 Arknights Shared Viewer(OperatorManageToolマン @an_mngtool 님 제작)의 공유 URL을 등록하면 미보유 오퍼레이터가 제외됩니다. 등록 내용은 브라우저에만 저장됩니다. 정예화나 레벨로는 거르지 않습니다.</dd>
          <dt>결과는 저장되나요?</dt>
          <dd>저장되지 않습니다. 페이지를 닫으면 사라지니 남기려면 이미지를 저장하세요.</dd>
          <dt>무료인가요? 로그인이 필요한가요?</dt>
          <dd>무료이며 가입·로그인이 필요 없고, 게임 계정과 연동하지도 않습니다.</dd>
        </dl>
      </div>
    </details>`,
    footerLegal: `      이 사이트는 개인이 만든 비공식 팬 콘텐츠이며 Hypergryph·Yostar와는 관계가 없습니다.<br>
      『명일방주』 및 오퍼레이터의 명칭·이미지 등에 관한 권리는 © Hypergryph / Yostar에 있습니다.<br>
      오퍼레이터 이미지·데이터는 커뮤니티가 공개한 게임 데이터를 이용합니다. 권리자의 요청이 있으면 신속히 대응합니다.`,
    by: '제작',
    contact: '문의 (X: @MStarStudio96)',
    privacy: '개인정보 처리방침 (일본어)',
    provider: '보유 데이터(ID 등록): <a class="footer__link" href="https://x.com/an_mngtool" target="_blank" rel="noopener noreferrer">OperatorManageToolマン(@an_mngtool)</a>님 제작 <a class="footer__link" href="https://sharing-view.memoria-ll.link/" target="_blank" rel="noopener noreferrer">Arknights Shared Viewer</a> 이용',
    links: `      <a class="footer__link" href="../guide.html">가이드 (일본어)</a>
      <span class="footer__sep">/</span>
      <a class="footer__link" href="../rules.html">추가 규칙 모음 (일본어)</a>
      <span class="footer__sep">/</span>
      <a class="footer__link" href="../changelog.html">업데이트 내역 (일본어)</a>
      <span class="footer__sep">/</span>
      <a class="footer__link" href="../operators.html">오퍼레이터 목록 (일본어)</a>`,
    close: '닫기', save: '이미지 저장', shareNote: '이미지를 저장한 뒤 올려 주세요.', nativeShare: '공유',
  },
};

function must(html, needle, what) {
  if (!html.includes(needle)) throw new Error(`anchor not found (${what}): ${needle.slice(0, 60)}`);
}
function rep(html, a, b, what, all = false) {
  must(html, a, what || a);
  return all ? html.split(a).join(b) : html.replace(a, b);
}
function replaceBetween(html, startNeedle, endNeedle, replacement, what) {
  const s = html.indexOf(startNeedle);
  const e = html.indexOf(endNeedle, s);
  if (s < 0 || e < 0) throw new Error(`block not found (${what})`);
  return html.slice(0, s) + replacement + html.slice(e);
}

function build(d) {
  let h = src;
  const url = `${BASE}${d.lang}/`;
  h = rep(h, '<html lang="ja">', `<html lang="${d.lang}">`, 'lang');
  h = h.replace(/<title>[^<]*<\/title>/, `<title>${d.title}</title>`);
  h = h.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${d.description}">`);
  h = h.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`);
  h = h.replace(/<meta property="og:site_name" content="[^"]*">/, `<meta property="og:site_name" content="${d.siteName}">`);
  h = h.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${d.ogTitle}">`);
  h = h.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${d.ogDesc}">`);
  h = h.replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`);
  h = h.replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${d.ogTitle}">`);
  h = h.replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${d.ogDesc}">`);
  h = h.replace(/<meta property="og:locale" content="[^"]*">\n?/, '');
  // JSON-LD: localized names/description/url
  h = h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "${d.jsonName}",
  "url": "${url}",
  "applicationCategory": "GameApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "inLanguage": "${d.lang}",
  "description": "${d.jsonDesc}",
  "author": { "@type": "Organization", "name": "M Star Studio", "url": "https://mstar-studio.com/" }
}
</script>`);
  // paths (one level deeper)
  h = h.split('href="css/').join('href="../css/');
  h = h.split('src="js/').join('src="../js/');
  h = h.split('href="assets/').join('href="../assets/');
  h = h.split('href="manifest.webmanifest"').join('href="../manifest.webmanifest"');
  for (const p of ['guide.html', 'rules.html', 'changelog.html', 'operators.html', 'privacy.html']) h = h.split(`href="${p}"`).join(`href="../${p}"`);
  // language switcher (source page has links to en/ and ko/)
  h = rep(h, `<a class="lang__link" href="./" hreflang="ja" lang="ja" aria-current="page">日本語</a>`, `<a class="lang__link" href="../" hreflang="ja" lang="ja">日本語</a>`, 'switch ja');
  h = rep(h, `<a class="lang__link" href="en/" hreflang="en" lang="en">English</a>`, d.lang === 'en' ? `<a class="lang__link" href="./" hreflang="en" lang="en" aria-current="page">English</a>` : `<a class="lang__link" href="../en/" hreflang="en" lang="en">English</a>`, 'switch en');
  h = rep(h, `<a class="lang__link" href="ko/" hreflang="ko" lang="ko">한국어</a>`, d.lang === 'ko' ? `<a class="lang__link" href="./" hreflang="ko" lang="ko" aria-current="page">한국어</a>` : `<a class="lang__link" href="../ko/" hreflang="ko" lang="ko">한국어</a>`, 'switch ko');
  h = rep(h, `<nav class="lang" aria-label="言語">`, `<nav class="lang" aria-label="${d.switcher.label}">`, 'switch label');
  // beta notice
  h = rep(h, `<p class="lead lead--sub">持っていないオペレーターが出たら「選んで再抽選」で、そのカードだけ同じレア度から引き直せます。</p>`, `<p class="lead lead--sub">${d.leadSub}</p>`, 'lead sub');
  // header
  h = rep(h, `<h1 class="title">アークナイツ<span class="title__sub">縛りガチャ</span></h1>`, `<h1 class="title">${d.h1}</h1>`, 'h1');
  h = rep(h, `<p class="lead">全オペレーターからランダムに12体。引いたそのままの編成で挑む。</p>`, `<p class="lead">${d.lead}</p>`, 'lead');
  // mode panel
  h = rep(h, `<section class="panel panel--mode" aria-label="難易度">`, `<section class="panel panel--mode" aria-label="${d.modesAria}">`, 'mode aria');
  h = rep(h, `title="共有IDを登録すると未所持のオペレーターを自動的に除外します">ID登録</button>`, `title="${d.ownedTitle}">${d.ownedPill}</button>`, 'owned pill');
  h = rep(h, `title="保全駐在の初期編成(20体)を引く">保全駐在</button>`, `title="${d.sssTitle}">${d.sssPill}</button>`, 'sss pill');
  h = rep(h, `placeholder="共有URL または ID" autocomplete="off" spellcheck="false" aria-label="Arknights Shared Viewer の共有URL">`, `placeholder="${d.ownedPlaceholder}" autocomplete="off" spellcheck="false" aria-label="${d.ownedAria}">`, 'owned input');
  h = rep(h, `id="ownedLoad">登録</button>`, `id="ownedLoad">${d.ownedLoad}</button>`, 'owned load');
  h = rep(h, `aria-controls="ownedInfo" aria-label="使い方">i</button>`, `aria-controls="ownedInfo" aria-label="${d.ownedInfoAria}">i</button>`, 'owned info');
  h = rep(h, `id="ownedStatus">登録すると、未所持のオペレーターは自動的に除外されます。</div>`, `id="ownedStatus">${d.ownedStatus}</div>`, 'owned status');
  h = rep(h, `id="ownedClear">解除</button>`, `id="ownedClear">${d.ownedClear}</button>`, 'owned clear');
  h = replaceBetween(h, `      <div class="owned__detail" id="ownedInfo" hidden>`, `      </div>\n    </div>\n    <div class="mode-head">`, `      <div class="owned__detail" id="ownedInfo" hidden>${d.ownedDetail}\n`, 'owned detail');
  h = rep(h, `<span class="mode-note" id="modeNote">難易度を変えるには「もう一回引く」を押してください</span>`, `<span class="mode-note" id="modeNote">${d.modeNote}</span>`, 'mode note');
  h = rep(h, `role="radiogroup" aria-label="難易度選択">`, `role="radiogroup" aria-label="${d.modesAria}">`, 'modes aria');
  h = rep(h, `<span class="mode__name">無双</span><span class="mode__sub">ALL ★6</span>`, `<span class="mode__name">${d.musou}</span><span class="mode__sub">${d.musouSub}</span>`, 'musou');
  h = rep(h, `<span class="mode__name">イージー</span>`, `<span class="mode__name">${d.easy}</span>`, 'easy');
  h = rep(h, `<span class="mode__name">ノーマル</span>`, `<span class="mode__name">${d.normal}</span>`, 'normal');
  h = rep(h, `<span class="guarantee__label">職分保証</span>`, `<span class="guarantee__label">${d.guaranteeLabel}</span>`, 'g label');
  h = rep(h, `id="guarantee" role="radiogroup" aria-label="職分保証">`, `id="guarantee" role="radiogroup" aria-label="${d.guaranteeAria}">`, 'g aria');
  h = rep(h, `data-guarantee="0" aria-checked="true">なし</button>`, `data-guarantee="0" aria-checked="true">${d.gOff}</button>`, 'g off');
  h = rep(h, `data-guarantee="1" aria-checked="false">あり</button>`, `data-guarantee="1" aria-checked="false">${d.gOn}</button>`, 'g on');
  h = rep(h, `id="guaranteeDesc">完全ランダム</div>`, `id="guaranteeDesc">${d.gDesc}</div>`, 'g desc');
  // squad + actions
  h = rep(h, `<section class="panel panel--squad" aria-label="編成">`, `<section class="panel panel--squad" aria-label="${d.squadAria}">`, 'squad aria');
  h = rep(h, `id="btnRevealAll">全部めくる</button>`, `id="btnRevealAll">${d.revealAll}</button>`, 'reveal all');
  h = rep(h, `id="btnDraw">引く</button>`, `id="btnDraw">${d.draw}</button>`, 'draw');
  h = rep(h, `id="btnShare">シェア</button>`, `id="btnShare">${d.share}</button>`, 'share');
  h = rep(h, `id="btnReroll">選んで再抽選</button>`, `id="btnReroll">${d.reroll}</button>`, 'reroll');
  h = rep(h, `id="btnRerollGo" disabled>引き直す</button>`, `id="btnRerollGo" disabled>${d.rerollGo}</button>`, 'reroll go');
  h = rep(h, `id="btnRerollCancel">やめる</button>`, `id="btnRerollCancel">${d.cancel}</button>`, 'cancel');
  h = rep(h, `id="btnAgain">もう一回引く</button>`, `id="btnAgain">${d.again}</button>`, 'again');
  // info section
  h = replaceBetween(h, `  <section class="panel panel--info" aria-label="このサイトについて">`, `\n  </section>\n\n  <footer class="footer">`, `  <section class="panel panel--info" aria-label="${d.infoAria}">${d.info}`, 'info');
  // footer
  h = replaceBetween(h, `    <p class="footer__legal">\n`, `\n    </p>\n    <p class="footer__credit">`, `    <p class="footer__legal">\n${d.footerLegal}`, 'legal');
  h = rep(h, `<span class="footer__by">制作</span>`, `<span class="footer__by">${d.by}</span>`, 'by');
  h = rep(h, `>お問い合わせ (X: @MStarStudio96)</a>`, `>${d.contact}</a>`, 'contact');
  h = rep(h, `<a class="footer__link" href="../privacy.html">プライバシーポリシー・運営者情報</a>`, `<a class="footer__link" href="../privacy.html">${d.privacy}</a>`, 'privacy');
  h = replaceBetween(h, `    <p class="footer__links footer__provider">`, `</p>\n    <p class="footer__links">\n`, `    <p class="footer__links footer__provider">${d.provider}`, 'provider');
  h = replaceBetween(h, `    <p class="footer__links">\n      <a class="footer__link" href="../guide.html">`, `\n    </p>\n  </footer>`, `    <p class="footer__links">\n${d.links}`, 'links');
  // modals
  h = h.split(`aria-label="閉じる">×</button>`).join(`aria-label="${d.close}">×</button>`);
  h = rep(h, `id="btnNativeShare" hidden>共有</button>`, `id="btnNativeShare" hidden>${d.nativeShare}</button>`, 'native share');
  h = rep(h, `download="arknights-shibari-gacha.png">画像を保存</a>`, `download="arknights-shibari-gacha.png">${d.save}</a>`, 'save');
  h = rep(h, `id="shareNote">画像を保存してから投稿してください。</p>`, `id="shareNote">${d.shareNote}</p>`, 'share note');
  // 404-style absolute favicon not needed; done
  return h;
}

for (const lang of ['en', 'ko']) {
  const out = build(L[lang]);
  const dir = resolve(root, lang);
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, 'index.html'), out, 'utf8');
  const leftovers = (out.match(/[ぁ-んァ-ン]/g) || []).length; // hiragana/katakana leftovers (kanji allowed in names/credits)
  console.log(`wrote ${lang}/index.html (${out.length} bytes, kana leftovers: ${leftovers})`);
}

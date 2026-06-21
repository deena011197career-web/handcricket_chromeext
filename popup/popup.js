'use strict';

(function () {

  // ── DOM helpers ────────────────────────────────────────────────────────────
  const $  = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  // ══════════════════════════════════════════════════ THEME ══════════════════

  const THEME_KEY = 'hc_theme';
  let currentTheme = localStorage.getItem(THEME_KEY) || 'dark';

  function applyTheme(t) {
    currentTheme = t;
    document.documentElement.setAttribute('data-theme', t);
    $('theme-icon').textContent = t === 'dark' ? '☀' : '☾';
    localStorage.setItem(THEME_KEY, t);
    // Tactile squish feedback
    const btn = $('theme-btn');
    btn.classList.remove('toggled');
    void btn.offsetWidth;
    btn.classList.add('toggled');
  }

  $('theme-btn').addEventListener('click', () => {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  });

  applyTheme(currentTheme);

  // ══════════════════════════════════════════════════ SCREENS ════════════════

  const SCREENS = ['welcome', 'toss', 'toss-result', 'play', 'out', 'result'];

  function showScreen(name) {
    SCREENS.forEach(s => {
      const el = $(`screen-${s}`);
      if (el) el.classList.toggle('active', s === name);
    });
  }

  // ══════════════════════════════════════════════════ HELPERS ════════════════

  function setNumButtons(enabled) {
    $$('.num-btn').forEach(b => (b.disabled = !enabled));
  }

  function renderHistory(moves) {
    const row = $('play-history');
    if (!moves || moves.length === 0) { row.innerHTML = ''; return; }
    row.innerHTML = moves.map(m =>
      m.out
        ? `<span class="h-chip out-chip">OUT</span>`
        : `<span class="h-chip runs-chip">+${m.runs}</span>`
    ).join('');
  }

  function bumpScore(el) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  function showRunFloat(runs, wrapEl) {
    const f = document.createElement('div');
    f.className = 'run-float';
    f.textContent = `+${runs}`;
    wrapEl.appendChild(f);
    void f.offsetWidth;
    f.classList.add('fly');
    setTimeout(() => f.remove(), 750);
  }

  function addRipple(btn, e) {
    const rect   = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className  = 'ripple';
    ripple.style.left = (e.clientX - rect.left) + 'px';
    ripple.style.top  = (e.clientY - rect.top)  + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  }

  // ══════════════════════════════════════════════════ WELCOME ════════════════

  $('btn-start').addEventListener('click', () => {
    GameEngine.reset();
    showScreen('toss');
  });

  // ══════════════════════════════════════════════════ TOSS ═══════════════════

  $$('.btn-toss').forEach(btn => {
    btn.addEventListener('click', () => {
      const result = GameEngine.performToss(btn.dataset.pick);
      renderTossResult(result);
      showScreen('toss-result');
    });
  });

  function renderTossResult(result) {
    const S = GameEngine.getState();

    $('tr-cpu-num').textContent    = result.computerNum;
    $('tr-cpu-parity').textContent = result.parity.toUpperCase();
    $('tr-user-pick').textContent  = (S.tossUserPick || '').toUpperCase();

    const verdict   = $('tr-verdict');
    const userWonEl = $('tr-user-won');
    const cpuWonEl  = $('tr-cpu-won');

    if (result.userWins) {
      verdict.textContent = '🎉 You win the toss!';
      verdict.className   = 'verdict win';
      userWonEl.classList.remove('hidden');
      cpuWonEl.classList.add('hidden');
    } else {
      verdict.textContent = 'Computer wins the toss';
      verdict.className   = 'verdict lose';
      userWonEl.classList.add('hidden');
      cpuWonEl.classList.remove('hidden');
      const computerBats = !S.userBatting;
      $('tr-cpu-decision').textContent =
        `Computer chose to ${computerBats ? '🏏 bat first' : '🎯 bowl first'}`;
    }
  }

  $$('.btn-side').forEach(btn => {
    btn.addEventListener('click', () => {
      GameEngine.chooseSide(btn.dataset.side);
      startPlay();
    });
  });

  $('btn-start-play').addEventListener('click', () => {
    GameEngine.chooseSide(null);
    startPlay();
  });

  // ══════════════════════════════════════════════════ PLAY ═══════════════════

  function triggerStagger() {
    const grid = document.querySelector('.num-grid');
    grid.classList.remove('stagger');
    void grid.offsetWidth;
    grid.classList.add('stagger');
    setTimeout(() => grid.classList.remove('stagger'), 700);
  }

  function startPlay() {
    syncPlayUI();
    triggerStagger();
    showScreen('play');
  }

  function syncPlayUI() {
    const S = GameEngine.getState();

    $('play-innings').textContent    = S.innings === 1 ? '1ST INNINGS' : '2ND INNINGS';
    $('play-user-score').textContent = S.userScore;
    $('play-cpu-score').textContent  = S.computerScore;
    $('play-role').textContent       = S.userBatting ? 'You are batting' : 'You are bowling';

    const strip = $('play-target-strip');
    if (S.innings === 2 && S.target !== null) {
      const chaser = S.userBatting ? S.userScore : S.computerScore;
      $('play-need').textContent = Math.max(S.target - chaser + 1, 0);
      strip.classList.remove('hidden');
    } else {
      strip.classList.add('hidden');
    }

    resetArena();
    renderHistory(S.moveHistory);
    setNumButtons(true);

    // Live glow on arena
    $('move-arena').classList.add('live');
  }

  function resetArena() {
    const userCard = $('user-move-card');
    const cpuCard  = $('cpu-move-card');
    userCard.className = 'move-card';
    cpuCard.className  = 'move-card';

    $('md-user').textContent   = '?';
    $('md-user').className     = 'move-digit';
    $('md-cpu').textContent    = '?';
    $('md-cpu').className      = 'move-digit';
    $('md-result').textContent = 'VS';
    $('md-result').className   = 'move-vs';
  }

  // Number button clicks
  $$('.num-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      addRipple(btn, e);
      handlePickedNumber(parseInt(btn.dataset.n, 10), btn);
    });
  });

  function handlePickedNumber(userNum, clickedBtn) {
    setNumButtons(false);
    clickedBtn.classList.add('picked');

    // User card pop-reveal
    const userCard = $('user-move-card');
    $('md-user').textContent = userNum;
    userCard.classList.remove('user-picked');
    void userCard.offsetWidth;
    userCard.classList.add('user-picked');

    // Show thinking dots
    $('cpu-thinking').classList.remove('hidden');

    // 350ms suspense — CPU "thinks"
    setTimeout(() => {
      const outcome = GameEngine.playMove(userNum);
      const S       = GameEngine.getState();
      const move    = outcome.move;

      // Hide thinking dots
      $('cpu-thinking').classList.add('hidden');

      // CPU card flip
      const cpuCard = $('cpu-move-card');
      cpuCard.classList.remove('cpu-flip');
      void cpuCard.offsetWidth;
      cpuCard.classList.add('cpu-flip');

      // Set the number at flip midpoint (card is invisible)
      setTimeout(() => {
        $('md-cpu').textContent = move.computer;
      }, 195);

      // After flip completes — apply card states + update UI
      setTimeout(() => {
        const userScoreEl = $('play-user-score');
        const cpuScoreEl  = $('play-cpu-score');
        const prevU = parseInt(userScoreEl.textContent, 10);
        const prevC = parseInt(cpuScoreEl.textContent, 10);

        userScoreEl.textContent = S.userScore;
        cpuScoreEl.textContent  = S.computerScore;

        if (S.userScore !== prevU) {
          bumpScore(userScoreEl);
          showRunFloat(S.userScore - prevU, userScoreEl.parentElement);
        }
        if (S.computerScore !== prevC) {
          bumpScore(cpuScoreEl);
          showRunFloat(S.computerScore - prevC, cpuScoreEl.parentElement);
        }

        if (S.innings === 2 && S.target !== null) {
          const chaser = S.userBatting ? S.userScore : S.computerScore;
          $('play-need').textContent = Math.max(S.target - chaser + 1, 0);
        }

        renderHistory(S.moveHistory);

        if (move.out) {
          $('md-user').className     = 'move-digit out';
          $('md-cpu').className      = 'move-digit out';
          $('md-result').textContent = '— OUT —';
          $('md-result').className   = 'move-vs out';
          userCard.className = 'move-card out-card';
          cpuCard.className  = 'move-card out-card';

          setTimeout(() => {
            clickedBtn.classList.remove('picked');
            routeOutcome(outcome);
          }, 700);

        } else {
          $('md-user').className     = 'move-digit runs';
          $('md-cpu').className      = 'move-digit runs';
          $('md-result').textContent = `+${move.runs}`;
          $('md-result').className   = 'move-vs runs';
          userCard.className = 'move-card runs-card';
          cpuCard.className  = 'move-card runs-card';

          setTimeout(() => {
            clickedBtn.classList.remove('picked');
            if (outcome.type === 'game_end') {
              routeOutcome(outcome);
            } else {
              resetArena();
              setNumButtons(true);
            }
          }, 500);
        }

      }, 400); // after flip completes

    }, 350); // thinking time
  }

  function routeOutcome(outcome) {
    if (outcome.type === 'innings_end') {
      $('move-arena').classList.remove('live');
      renderOutScreen();
      showScreen('out');
    } else if (outcome.type === 'game_end') {
      $('move-arena').classList.remove('live');
      renderResultScreen();
      showScreen('result');
    }
  }

  // ══════════════════════════════════════════════════ OUT SCREEN ═════════════

  function renderOutScreen() {
    const S = GameEngine.getState();
    const userJustBatted = !S.userBatting;
    const innings1Score  = userJustBatted ? S.userScore : S.computerScore;

    $('out-innings-summary').textContent =
      `${userJustBatted ? 'You' : 'Computer'} scored ${innings1Score} in 1st innings`;
    $('out-target-num').textContent = S.target;
    $('out-next-info').textContent  = S.userBatting
      ? `You bat next — score ${S.target + 1}+ to win`
      : `Computer bats next — defend ${S.target}`;
  }

  $('btn-next-innings').addEventListener('click', () => {
    GameEngine.continueToInnings2();
    startPlay();
  });

  // ══════════════════════════════════════════════════ RESULT ═════════════════

  function renderResultScreen() {
    const S = GameEngine.getState();
    const cfg = {
      user:     { icon: '🏆', title: 'YOU WIN!',    cls: 'win'  },
      computer: { icon: '💻', title: 'YOU LOSE',    cls: 'lose' },
      tie:      { icon: '🤝', title: "IT'S A TIE",  cls: 'tie'  },
    };
    const c = cfg[S.winner] || cfg.tie;
    $('res-icon').textContent       = c.icon;
    $('res-title').textContent      = c.title;
    $('res-title').className        = `result-title ${c.cls}`;
    $('res-user-score').textContent = S.userScore;
    $('res-cpu-score').textContent  = S.computerScore;

    // Confetti on win
    if (S.winner === 'user') {
      $('confetti-wrap').classList.add('active');
    } else {
      $('confetti-wrap').classList.remove('active');
    }
  }

  $('btn-play-again').addEventListener('click', () => {
    $('confetti-wrap').classList.remove('active');
    GameEngine.reset();
    showScreen('welcome');
  });

  // ══════════════════════════════════════════════════ INIT ═══════════════════

  showScreen('welcome');

})();

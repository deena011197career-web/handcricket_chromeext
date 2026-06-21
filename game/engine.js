'use strict';

/**
 * Hand Cricket Game Engine
 *
 * Rules:
 *   - Both players simultaneously pick a number 1–6.
 *   - If both pick the SAME number → batter is OUT.
 *   - Otherwise → batter scores the number they showed.
 *   - Two innings: innings-1 batter sets a target, innings-2 batter chases.
 *   - Win: chase team scores MORE than target before getting out.
 *   - Tie: chase team equals target score when out.
 *   - Lose: chase team gets out below target.
 *
 * AI Strategy:
 *   When BOWLING  → predicts user's most frequent pick (tries to match = get them out).
 *   When BATTING  → picks user's LEAST frequent pick (avoids being matched = stay safe).
 *   Blended with 32% pure random to stay unpredictable.
 */

const GameEngine = (() => {
  // ── Config ─────────────────────────────────────────────────────────────────
  const AI_HISTORY_WINDOW = 8;   // how many recent user picks AI analyses
  const AI_SMART_RATE    = 0.68; // probability AI uses frequency analysis vs pure random

  // ── State factory ──────────────────────────────────────────────────────────
  function freshState() {
    return {
      phase: 'welcome',         // welcome | toss | toss_result | play | out | result
      innings: 1,               // 1 | 2
      userBatting: null,        // bool — set after toss
      tossWinner: null,         // 'user' | 'computer'
      tossUserPick: null,       // 'odd' | 'even'
      tossComputerNum: null,    // 1–6
      tossParity: null,         // 'odd' | 'even'
      userScore: 0,
      computerScore: 0,
      target: null,             // score set after innings 1 ends
      lastMove: null,           // { user, computer, runs, out, userBatting }
      moveHistory: [],          // last 6 moves (newest first)
      userPickHistory: [],      // ALL numbers user has ever picked (AI training)
      winner: null,             // 'user' | 'computer' | 'tie'
    };
  }

  let S = freshState();

  // ── AI Engine ──────────────────────────────────────────────────────────────

  function aiPick(aiBatting) {
    const pool = [1, 2, 3, 4, 5, 6];

    // Not enough data or random roll → pure random
    if (S.userPickHistory.length < 3 || Math.random() > AI_SMART_RATE) {
      return pool[Math.floor(Math.random() * 6)];
    }

    // Frequency map over recent window
    const window = S.userPickHistory.slice(-AI_HISTORY_WINDOW);
    const freq = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    window.forEach(n => freq[n]++);

    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);

    if (!aiBatting) {
      // BOWLING: mirror the user's most common pick → tries to match = get them OUT
      const mostCommon = parseInt(sorted[0][0]);
      // Occasional secondary option to prevent pure predictability
      if (Math.random() < 0.15 && sorted[1]) {
        return parseInt(sorted[1][0]);
      }
      return mostCommon;
    } else {
      // BATTING: pick user's LEAST common pick → user (bowling) unlikely to show that
      const leastCommon = parseInt(sorted[sorted.length - 1][0]);
      // Also prefer higher numbers to score more (greedy when safe)
      const lowFreqNums = sorted.slice(-3).map(e => parseInt(e[0]));
      return lowFreqNums[Math.floor(Math.random() * lowFreqNums.length)];
    }
  }

  // ── Toss ───────────────────────────────────────────────────────────────────

  function performToss(userPick) {
    const n = Math.floor(Math.random() * 6) + 1;
    const parity = n % 2 === 0 ? 'even' : 'odd';
    const userWins = parity === userPick;

    S.tossUserPick = userPick;
    S.tossComputerNum = n;
    S.tossParity = parity;
    S.tossWinner = userWins ? 'user' : 'computer';
    S.phase = 'toss_result';

    if (!userWins) {
      // Computer auto-decides: prefers to bat 70% of the time (set a target)
      S.userBatting = Math.random() < 0.3;
    }

    return {
      computerNum: n,
      parity,
      userWins,
    };
  }

  // Called after toss result:
  //   side = 'bat' | 'bowl'  when user won the toss
  //   side = null             when computer won (userBatting already set in performToss)
  function chooseSide(side) {
    if (side) {
      S.userBatting = side === 'bat';
    }
    S.phase = 'play';
    return { userBatting: S.userBatting };
  }

  // ── Core gameplay ──────────────────────────────────────────────────────────

  function playMove(userNum) {
    if (S.phase !== 'play') return null;

    const compNum = aiPick(!S.userBatting); // if user bats, AI bowls and vice-versa
    S.userPickHistory.push(userNum);

    const isOut = userNum === compNum;
    let runs = 0;

    if (!isOut) {
      runs = S.userBatting ? userNum : compNum;
      if (S.userBatting) S.userScore += runs;
      else               S.computerScore += runs;
    }

    const move = {
      user: userNum,
      computer: compNum,
      runs,
      out: isOut,
      userBatting: S.userBatting,
    };
    S.lastMove = move;
    S.moveHistory.unshift(move);
    if (S.moveHistory.length > 6) S.moveHistory.pop();

    // Innings-2: check if chasing team already exceeded target (instant win)
    if (!isOut && S.innings === 2) {
      if (S.userBatting     && S.userScore     > S.target) return _endGame();
      if (!S.userBatting    && S.computerScore > S.target) return _endGame();
    }

    if (isOut) return _handleOut();

    return { type: 'continue', move };
  }

  function _handleOut() {
    if (S.innings === 1) {
      // Record innings-1 score as the target the other team must beat
      S.target = S.userBatting ? S.userScore : S.computerScore;
      S.innings = 2;
      S.userBatting = !S.userBatting; // swap roles
      S.phase = 'out';
      return { type: 'innings_end', target: S.target, move: S.lastMove };
    }

    // Innings 2 → game over
    return _endGame();
  }

  function _endGame() {
    S.phase = 'result';

    if (S.userScore > S.computerScore)      S.winner = 'user';
    else if (S.computerScore > S.userScore) S.winner = 'computer';
    else                                    S.winner = 'tie';

    return { type: 'game_end', winner: S.winner, move: S.lastMove };
  }

  function continueToInnings2() {
    S.phase = 'play';
    return { userBatting: S.userBatting, target: S.target };
  }

  // ── Public state snapshot (read-only view) ─────────────────────────────────

  function getState() {
    return {
      phase:            S.phase,
      innings:          S.innings,
      userBatting:      S.userBatting,
      tossWinner:       S.tossWinner,
      tossUserPick:     S.tossUserPick,
      tossComputerNum:  S.tossComputerNum,
      tossParity:       S.tossParity,
      userScore:        S.userScore,
      computerScore:    S.computerScore,
      target:           S.target,
      lastMove:         S.lastMove,
      moveHistory:      S.moveHistory,
      winner:           S.winner,
    };
  }

  function reset() {
    S = freshState();
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    performToss,
    chooseSide,
    playMove,
    continueToInnings2,
    getState,
    reset,
  };
})();

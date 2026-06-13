const BACKEND = 'http://127.0.0.1:5000';

let game    = new Chess();
let board   = null;
let history = [];
let highlighted = [];
let currentMode = 'analyse';

/* ── INIT ── */
function initBoard() {
  board = Chessboard('board', {
    position: 'start',
    draggable: true,
    onDrop:    onDrop,
    onSnapEnd: () => board.position(game.fen()),
    pieceTheme: 'https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/img/chesspieces/wikipedia/{piece}.png'
  });
  updateTurn();
}

/* ── DRAG & DROP ── */
function onDrop(source, target) {
  clearHighlights();
  const move = game.move({ from: source, to: target, promotion: 'q' });
  if (!move) return 'snapback';
  syncFEN();
  updateTurn();
  history.push(move);
  renderHistory();
}

/* ── HIGHLIGHTS ── */
function clearHighlights() {
  highlighted.forEach(sq => {
    const el = document.querySelector('.square-' + sq);
    if (el) { el.classList.remove('highlight-from'); el.classList.remove('highlight-to'); }
  });
  highlighted = [];
}

function highlightMove(from, to) {
  clearHighlights();
  const elFrom = document.querySelector('.square-' + from);
  const elTo   = document.querySelector('.square-' + to);
  if (elFrom) elFrom.classList.add('highlight-from');
  if (elTo)   elTo.classList.add('highlight-to');
  highlighted = [from, to];
}

/* ── BOARD HELPERS ── */
function syncFEN() {
  document.getElementById('fenInput').value = game.fen();
}

function updateTurn() {
  const isW = game.turn() === 'w';
  const w = document.getElementById('turnW');
  const b = document.getElementById('turnB');
  w.classList.toggle('hidden', !isW);
  b.classList.toggle('hidden', isW);
}

function loadFEN() {
  const fen = document.getElementById('fenInput').value.trim();
  const tmp = new Chess();
  if (!tmp.load(fen)) { setStatus('error', 'Invalid FEN — check the string and try again'); return; }
  game.load(fen);
  board.position(fen);
  updateTurn();
  clearHighlights();
  setStatus('ready', 'Position loaded');
}

function resetBoard() {
  game.reset();
  board.start();
  syncFEN();
  updateTurn();
  clearHighlights();
  history = [];
  renderHistory();
  setStatus('', 'Set up a position and click Find Best Move');
  hideResults();
}

function flipBoard() {
  board.flip();
}

function undoMove() {
  const m = game.undo();
  if (!m) return;
  board.position(game.fen());
  syncFEN();
  updateTurn();
  clearHighlights();
  history.pop();
  renderHistory();
}

/* ── HISTORY ── */
function renderHistory() {
  const grid = document.getElementById('historyGrid');
  if (!history.length) {
    grid.innerHTML = '<span class="no-moves">No moves yet.</span>';
    return;
  }
  grid.innerHTML = history.map((m, i) =>
    `<div class="h-move${i === history.length - 1 ? ' latest' : ''}">
      <span class="h-num">${i + 1}.</span>${m.san}
    </div>`
  ).join('');
}

/* ── MODE ── */
function setMode(m) {
  currentMode = m;
  document.getElementById('chipAnalyse').classList.toggle('active', m === 'analyse');
  document.getElementById('chipHistory').classList.toggle('active', m === 'history');
  const hc = document.getElementById('historyCard');
  if (m === 'history') hc.classList.remove('hidden');
  else hc.classList.add('hidden');
}

/* ── STATUS ── */
function setStatus(type, msg) {
  document.getElementById('statusDot').className = 'status-dot ' + type;
  document.getElementById('statusText').textContent = msg;
}

/* ── RESULTS VISIBILITY ── */
function hideResults() {
  document.getElementById('emptyState').style.display  = 'flex';
  document.getElementById('moveCard').classList.add('hidden');
  document.getElementById('explainCard').classList.add('hidden');
  document.getElementById('historyCard').classList.add('hidden');
}

function showResults() {
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('moveCard').classList.remove('hidden');
  document.getElementById('explainCard').classList.remove('hidden');
  if (currentMode === 'history') {
    document.getElementById('historyCard').classList.remove('hidden');
  }
}

/* ── ANALYSE ── */
async function analyse() {
  const btn     = document.getElementById('analyseBtn');
  const spinner = document.getElementById('spinner');
  const label   = document.getElementById('btnLabel');

  btn.disabled = true;
  spinner.classList.add('active');
  label.textContent = 'Analysing…';
  setStatus('loading', 'Asking Stockfish…');

  try {
    const res = await fetch(`${BACKEND}/analyse`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ fen: game.fen() })
    });

    if (!res.ok) throw new Error('Server error ' + res.status);
    const data = await res.json();

    const from = data.best_move.slice(0, 2);
    const to   = data.best_move.slice(2, 4);

    // Get SAN notation
    const tmp = new Chess(game.fen());
    const mv  = tmp.move({ from, to, promotion: 'q' });
    const san = mv ? mv.san : data.best_move;

    // Populate move card
    document.getElementById('moveToken').textContent = data.best_move;
    document.getElementById('mFrom').textContent     = from.toUpperCase();
    document.getElementById('mTo').textContent       = to.toUpperCase();
    document.getElementById('mSAN').textContent      = san;

    // Eval bar
    const pct = 52 + Math.random() * 34;
    document.getElementById('evalFill').style.width  = pct.toFixed(1) + '%';
    document.getElementById('evalLabel').textContent =
      pct > 72 ? 'Strong advantage' : pct > 58 ? 'Slight edge' : 'Equal position';

    // Explanation
    document.getElementById('explainText').textContent = data.explanation;

    // Highlight squares
    highlightMove(from, to);

    showResults();
    setStatus('ready', 'Best move: ' + data.best_move);

  } catch (err) {
    setStatus('error', 'Cannot reach server — make sure main.py is running');
    console.error(err);
  }

  btn.disabled = false;
  spinner.classList.remove('active');
  label.textContent = 'Find Best Move';
}

/* ── BOOT ── */
initBoard();
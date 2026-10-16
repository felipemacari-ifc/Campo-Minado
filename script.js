
"use strict";

// ========================================
// ELEMENTOS
// ========================================

const boardElement = document.getElementById("board");
const difficultySelect = document.getElementById("difficulty");
const restartBtn = document.getElementById("restartBtn");
const mineCounter = document.getElementById("mineCounter");
const timerElement = document.getElementById("timer");
const messageElement = document.getElementById("message");
const flagModeBtn = document.getElementById("flagModeBtn");

// ========================================
// CONFIGURAÇÕES E ESTADO
// ========================================

const DIFFICULTIES = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 }
};

let rows = 9;
let cols = 9;
let totalMines = 10;

let cells = [];
let gameStarted = false;
let gameOver = false;
let flagMode = false;

let flagsPlaced = 0;
let revealedCount = 0;
let elapsedSeconds = 0;
let timerInterval = null;

// ========================================
// INICIAR NOVO JOGO
// ========================================

function startGame() {
  stopTimer();

  const config = DIFFICULTIES[difficultySelect.value];

  rows = config.rows;
  cols = config.cols;
  totalMines = config.mines;

  cells = [];
  gameStarted = false;
  gameOver = false;
  flagMode = false;

  flagsPlaced = 0;
  revealedCount = 0;
  elapsedSeconds = 0;

  timerElement.textContent = "000";
  mineCounter.textContent = formatCounter(totalMines);

  messageElement.textContent = "Escolha uma casa para começar.";

  flagModeBtn.classList.remove("active");
  updateFlagButton();

  createCells();
  renderBoard();
}

// ========================================
// CRIAR CASAS
// ========================================

function createCells() {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push({
        row,
        col,
        mine: false,
        adjacent: 0,
        revealed: false,
        flagged: false,
        exploded: false
      });
    }
  }
}

function getIndex(row, col) {
  return row * cols + col;
}

function getCell(row, col) {
  if (
    row < 0 ||
    row >= rows ||
    col < 0 ||
    col >= cols
  ) {
    return null;
  }

  return cells[getIndex(row, col)];
}

// ========================================
// POSICIONAR MINAS
// ========================================

function placeMines(safeIndex) {
  const available = [];

  for (let i = 0; i < cells.length; i++) {
    if (i !== safeIndex) {
      available.push(i);
    }
  }

  // Embaralhamento Fisher-Yates.
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  for (let i = 0; i < totalMines; i++) {
    cells[available[i]].mine = true;
  }

  calculateAdjacentMines();
}

function calculateAdjacentMines() {
  for (const cell of cells) {
    if (cell.mine) continue;

    let count = 0;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;

        const neighbor = getCell(
          cell.row + dr,
          cell.col + dc
        );

        if (neighbor?.mine) {
          count++;
        }
      }
    }

    cell.adjacent = count;
  }
}

// ========================================
// RENDERIZAR TABULEIRO
// ========================================

function renderBoard() {
  boardElement.innerHTML = "";

  boardElement.style.gridTemplateColumns =
    `repeat(${cols}, 34px)`;

  for (const cell of cells) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "cell";

    button.dataset.row = cell.row;
    button.dataset.col = cell.col;

    button.setAttribute(
      "aria-label",
      `Casa ${cell.row + 1}, ${cell.col + 1}`
    );

    button.addEventListener("click", () => {
      handleCellClick(cell);
    });

    button.addEventListener("contextmenu", event => {
      event.preventDefault();
      toggleFlag(cell);
    });

    boardElement.appendChild(button);
  }
}

// ========================================
// CLIQUE EM UMA CASA
// ========================================

function handleCellClick(cell) {
  if (gameOver || cell.revealed) return;

  if (flagMode) {
    toggleFlag(cell);
    return;
  }

  if (cell.flagged) return;

  if (!gameStarted) {
    gameStarted = true;

    placeMines(getIndex(cell.row, cell.col));
    startTimer();

    messageElement.textContent = "Boa sorte!";
  }

  revealCell(cell);

  if (cell.mine) {
    cell.exploded = true;
    loseGame();
    return;
  }

  checkVictory();
  renderCells();
}

// ========================================
// REVELAR CASAS
// ========================================

function revealCell(cell) {
  if (
    !cell ||
    cell.revealed ||
    cell.flagged ||
    gameOver
  ) {
    return;
  }

  cell.revealed = true;
  revealedCount++;

  if (cell.mine) return;

  // Casas sem minas ao redor revelam os vizinhos.
  if (cell.adjacent === 0) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;

        const neighbor = getCell(
          cell.row + dr,
          cell.col + dc
        );

        if (neighbor && !neighbor.mine) {
          revealCell(neighbor);
        }
      }
    }
  }
}

// ========================================
// BANDEIRAS
// ========================================

function toggleFlag(cell) {
  if (gameOver || cell.revealed) return;

  if (!gameStarted) {
    // É possível marcar bandeiras antes do primeiro clique.
    cell.flagged = !cell.flagged;
  } else {
    cell.flagged = !cell.flagged;
  }

  flagsPlaced += cell.flagged ? 1 : -1;

  mineCounter.textContent = formatCounter(
    totalMines - flagsPlaced
  );

  renderCells();
}

function updateFlagButton() {
  flagModeBtn.textContent = flagMode
    ? "🚩 Modo bandeira: ligado"
    : "🚩 Modo bandeira: desligado";
}

// ========================================
// ATUALIZAR VISUAL DAS CASAS
// ========================================

function renderCells() {
  for (const cell of cells) {
    const button = boardElement.querySelector(
      `.cell[data-row="${cell.row}"][data-col="${cell.col}"]`
    );

    if (!button) continue;

    button.className = "cell";
    button.textContent = "";
    button.removeAttribute("data-number");

    if (cell.flagged) {
      button.classList.add("flagged");
      button.textContent = "🚩";
    }

    if (cell.revealed) {
      button.classList.add("revealed");

      if (cell.mine) {
        button.classList.add("mine");
        button.textContent = "💣";
      } else if (cell.adjacent > 0) {
        button.textContent = cell.adjacent;
        button.dataset.number = cell.adjacent;
      }
    }

    if (cell.exploded) {
      button.classList.add("exploded");
      button.textContent = "💥";
    }

    if (gameOver && cell.flagged && !cell.mine) {
      button.classList.add("wrong-flag");
      button.textContent = "✕";
    }

    if (gameOver && cell.mine && !cell.flagged) {
      button.classList.add("mine");
      button.textContent = "💣";
    }
  }
}

// ========================================
// VITÓRIA E DERROTA
// ========================================

function checkVictory() {
  const safeCells = rows * cols - totalMines;

  if (revealedCount === safeCells) {
    winGame();
  }
}

function winGame() {
  gameOver = true;
  stopTimer();

  messageElement.textContent =
    `🎉 Você venceu em ${formatTime(elapsedSeconds)}!`;

  // Marcar automaticamente as minas restantes.
  for (const cell of cells) {
    if (cell.mine && !cell.flagged) {
      cell.flagged = true;
    }
  }

  flagsPlaced = totalMines;
  mineCounter.textContent = "000";

  renderCells();
}

function loseGame() {
  gameOver = true;
  stopTimer();

  messageElement.textContent =
    "💥 Você encontrou uma mina! Tente novamente.";

  renderCells();
}

// ========================================
// CRONÔMETRO
// ========================================

function startTimer() {
  stopTimer();

  timerInterval = setInterval(() => {
    if (gameOver) {
      stopTimer();
      return;
    }

    elapsedSeconds++;

    timerElement.textContent = formatCounter(
      elapsedSeconds
    );
  }, 1000);
}

function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ========================================
// FORMATAÇÃO
// ========================================

function formatCounter(number) {
  return String(number).padStart(3, "0");
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remaining
  ).padStart(2, "0")}`;
}

// ========================================
// EVENTOS
// ========================================

restartBtn.addEventListener("click", startGame);

difficultySelect.addEventListener("change", startGame);

flagModeBtn.addEventListener("click", () => {
  if (gameOver) return;

  flagMode = !flagMode;

  flagModeBtn.classList.toggle("active", flagMode);

  updateFlagButton();
});

// ========================================
// INICIALIZAÇÃO
// ========================================

startGame();

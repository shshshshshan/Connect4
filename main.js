'use-strict';
import axios from "axios";
import { sleep } from "./Helpers.js";

window.onload = function () {
  document.querySelector('.play-icon').addEventListener('click', startGame);
};

const player_dict = {
  1: 'X',
  2: 'O',
};

const rows = 6;
const cols = 7;
const winLength = 4; // Number of consecutive pieces needed to win

let currentColumns = [];
let currentPlayer = player_dict[1];

const maxDepth = 4;

const humanSymbol = 1;
const botSymbol = 2;

const board = Array(rows * cols).fill(' ');

const win_conditions = [];

// Utility boolean variables
let animating = false;

// Generate winning conditions
(function() {
  function addWinCondition(cells) {
    for (let i = 0; i <= cells.length - winLength; i++) {
      win_conditions.push(cells.slice(i, i + winLength));
    }
  }

  // Rows
  for (let r = 0; r < rows; r++) {
    addWinCondition([...Array(cols).keys()].map((_, c) => r * cols + c));
  }

  // Columns
  for (let c = 0; c < cols; c++) {
    addWinCondition([...Array(rows).keys()].map((_, r) => r * cols + c));
  }

  // Diagonals (ascending)
  for (let r = 0; r <= rows - winLength; r++) {
    for (let c = 0; c <= cols - winLength; c++) {
      addWinCondition([...Array(winLength).keys()].map((_, i) => (r + i) * cols + c + i));
    }
  }

  // Diagonals (descending)
  for (let r = winLength - 1; r < rows; r++) {
    for (let c = 0; c <= cols - winLength; c++) {
      addWinCondition([...Array(winLength).keys()].map((_, i) => (r - i) * cols + c + i));
    }
  }
})();

async function gameLoop() {
  if (currentPlayer === player_dict[2])
    await sleep(200)
    await botMove();
}

function checkGameOver()
{
  if (terminal(board)) {
    for (const combination of win_conditions) {
      let win_index;
      if (combination.every((i) => board[i] === player_dict[1]) || combination.every((i) => board[i] === player_dict[2])) {
        for (const i of combination) {
          let colSelected = i % cols;
          let rowSelected = Math.floor(i / cols);
          let tile = document.getElementById(`${colSelected + (rowSelected * cols)}`);
          tile.classList.add('winningTile');
          win_index = i;
        }

        showWinnerBanner(board[win_index] === player_dict[1] ? 'Player' : 'Bot');
        break;
      }
    }

    return true;
  }

  return false;
}

async function startGame() {
  document.querySelector('.icon-wrapper').classList.add('hide');
  document.querySelector('.board').classList.add('game-start');

  showBoard();
  showHumanMoveBanner();
}

function showBoard() {
  currentColumns = Array(cols).fill(rows - 1);

  for (let cell = 0; cell < rows * cols; cell++) {
    let tile = document.createElement('div');
    tile.id = `${cell}`;
    tile.classList.add('tile');
    tile.addEventListener('click', humanMove);
    document.querySelector('.board').append(tile);
  }
}

async function humanMove() {
  removeBanner();

  if (animating || currentPlayer === player_dict[2] || terminal(board)) return;

  const coords = Number(this.id);

  let colSelected = coords % cols;
  let rowSelected = currentColumns[colSelected];

  if (rowSelected < 0) return;

  board[colSelected + rowSelected * cols] = player_dict[humanSymbol];
  const tile = document.getElementById(`${colSelected + rowSelected * cols}`);

  animating = true;
  // Simulate dropping animation
  for (let currentRow = 0; currentRow < rowSelected; currentRow++) {
    const otherTile = document.getElementById(`${colSelected + currentRow * cols}`);
    otherTile.classList.add(`player${humanSymbol}`);
    await sleep(30);
    otherTile.classList.remove(`player${humanSymbol}`);
  }

  tile.classList.add(`player${humanSymbol}`);
  rowSelected--;
  currentColumns[colSelected] = rowSelected;

  animating = false;

  currentPlayer = player_dict[2];
  if (checkGameOver())
    return

  tileSetCursorDefault();

  await gameLoop();
}

function botMove() {
  showBotMoveBanner();

  const postData = {
    board: board,
    maxPlayer: botSymbol,
    minPlayer: humanSymbol,
    maxDepth: maxDepth,
    currentColumns: currentColumns,
    winConditions: win_conditions
  };

  axios.post('http://127.0.0.1:5000/get_ai_move', postData)
    .then(response => {
      const data = response.data;
      const move = Number(data.move);
      execBotMove(move);
    })
    .catch(err => console.log(err));
}

async function execBotMove(move)
{
  let rowSelected = Math.floor(move / cols);
  let colSelected = Number(move % cols);

  rowSelected = currentColumns[colSelected];

  if (rowSelected < 0)
    return;

  board[colSelected + (rowSelected * cols)] = player_dict[botSymbol];
  let tile = document.getElementById(`${colSelected + (rowSelected * cols)}`);

  // Simulate dropping animation
  for (let currentRow = 0; currentRow < rowSelected; currentRow++) {
    let otherTile = document.getElementById(`${colSelected + (currentRow * cols)}`);
    otherTile.classList.add(`player${botSymbol}`);
    await sleep(30);
    otherTile.classList.remove(`player${botSymbol}`);
  }

  tile.classList.add(`player${botSymbol}`);

  rowSelected--;
  currentColumns[colSelected] = rowSelected;

  document.querySelectorAll('.tile').forEach((tile) => {
    tile.classList.remove('cursorDefault');
  });

  currentPlayer = player_dict[1];

  if (checkGameOver())
    return;

  tileRemoveCursorDefault();
  showHumanMoveBanner();
}

function checkWinner(board, player) {
  for (const combination of win_conditions) {
    if (combination.every((i) => board[i] === player_dict[player])) {
      return true;
    }
  }

  return false;
}

function checkTie(board) {
  return !board.includes(' ');
}

function terminal(board) {
  return checkWinner(board, 1) || checkWinner(board, 2) || checkTie(board);
}

function printBoard(board) {
  let boardStr = ''

  for (let cell = 0; cell < board.length; cell++) {
    boardStr += board[cell] !== ' ' ? board[cell] + '\t' : cell + '\t';

    if ((cell + 1) % cols === 0)
      boardStr += '\n';
  }

  console.log(boardStr);
}

function tileSetCursorDefault() {
  document.querySelectorAll('.tile').forEach(tile => {
    tile.classList.add('cursor-default');
  })
}

function tileRemoveCursorDefault() {
  document.querySelectorAll('.tile').forEach(tile => {
    tile.classList.remove('cursor-default');
  })
}

function showHumanMoveBanner() {
  document.querySelector('.banner-text').innerHTML = 'Your turn to move'
  document.querySelector('.banner').classList.add('banner-active');
}

function showBotMoveBanner() {
  document.querySelector('.banner-text').innerHTML = 'Bot is calculating...'
  document.querySelector('.banner').classList.add('banner-active');
}

function removeBanner() {
  if (document.querySelector('.banner').classList.contains('banner-active'))
    document.querySelector('.banner').classList.remove('banner-active');
}

function showWinnerBanner(winner) {
  document.querySelector('.banner-text').innerHTML = `${winner} wins!`
  document.querySelector('.banner').classList.add('banner-active');
}
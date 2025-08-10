/*
  Worm Game - JavaScript Logic
  Features:
  - Grid-based movement
  - Numbers 1..10 spawn (value = points and growth)
  - Tail grows by number collected
  - Collision with tail or walls = game over
  - HUD: score, speed, length
  - Restart support
*/

// DOM Elements
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const scoreEl = document.getElementById('score');
const speedEl = document.getElementById('speed');
const lengthEl = document.getElementById('length');

// Game Configuration
const TILE = 16;
let COLS = Math.floor(canvas.width / TILE);
let ROWS = Math.floor(canvas.height / TILE);
const BASE_SPEED = 6;

// Responsive Canvas Setup
function setupResponsiveCanvas() {
  const isMobile = window.innerWidth <= 768 || window.innerHeight <= 768;
  
  if (isMobile) {
    // Full screen on mobile - use actual screen dimensions
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Set canvas internal resolution to screen size rounded to TILE multiples
    canvas.width = Math.floor(screenWidth / TILE) * TILE;
    canvas.height = Math.floor(screenHeight / TILE) * TILE;
    
    // Calculate grid based on canvas size
    COLS = Math.floor(canvas.width / TILE);
    ROWS = Math.floor(canvas.height / TILE);
    
    // Set CSS size to exactly fill screen (this handles the scaling)
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '1';
    canvas.style.objectFit = 'fill';
  } else {
    // Desktop sizing
    const maxWidth = Math.min(800, window.innerWidth - 40);
    const maxHeight = Math.min(480, window.innerHeight * 0.6);
    
    // Keep aspect ratio
    const aspectRatio = 800 / 480;
    let canvasWidth = maxWidth;
    let canvasHeight = maxWidth / aspectRatio;
    
    if (canvasHeight > maxHeight) {
      canvasHeight = maxHeight;
      canvasWidth = maxHeight * aspectRatio;
    }
    
    // Ensure dimensions are multiples of TILE size
    canvasWidth = Math.floor(canvasWidth / TILE) * TILE;
    canvasHeight = Math.floor(canvasHeight / TILE) * TILE;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Reset canvas style for desktop
    canvas.style.width = '';
    canvas.style.height = '';
    canvas.style.position = '';
    canvas.style.top = '';
    canvas.style.left = '';
    canvas.style.zIndex = '';
    canvas.style.objectFit = '';
    
    // Update grid dimensions
    COLS = Math.floor(canvas.width / TILE);
    ROWS = Math.floor(canvas.height / TILE);
  }
}

// Game State
let game = null;
let lastFrameTime = 0;

// Touch Controls
let touchStartX = null;
let touchStartY = null;

// Game Object Factory
function createNewGame() {
  return {
    snake: [],
    dir: { x: 1, y: 0 },
    nextDir: null,
    desiredLength: 5,
    score: 0,
    speed: BASE_SPEED,
    items: [],
    tickTimer: 0,
    tickInterval: 1000 / BASE_SPEED,
    running: false,
    gameOver: false
  };
}

// Initialize Snake
function initSnake(g) {
  g.snake = [];
  const startX = Math.floor(COLS / 2);
  const startY = Math.floor(ROWS / 2);
  for (let i = 0; i < g.desiredLength; i++) {
    g.snake.unshift({ x: startX - i, y: startY });
  }
}

// Spawn Items (Numbers)
function spawnItem(g) {
  if (g.items.length >= 3) return;
  const maxAttempts = 100;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const x = Math.floor(Math.random() * (COLS - 2)) + 1; // avoid border
    const y = Math.floor(Math.random() * (ROWS - 2)) + 1; // avoid border
    if (g.snake.some(s => s.x === x && s.y === y)) continue;
    if (g.items.some(it => it.x === x && it.y === y)) continue;
    const val = Math.floor(Math.random() * 10) + 1;
    g.items.push({ x, y, value: val });
    break;
  }
}

// Set Direction (with reverse prevention)
function setDirection(g, dx, dy) {
  if (dx === -g.dir.x && dy === -g.dir.y) return;
  g.nextDir = { x: dx, y: dy };
}

// Game Tick (Main Game Logic)
function tick(g) {
  if (g.gameOver) return;
  if (g.nextDir) {
    g.dir = g.nextDir;
    g.nextDir = null;
  }
  
  const head = g.snake[g.snake.length - 1];
  const nx = head.x + g.dir.x;
  const ny = head.y + g.dir.y;

  // Check wall collision
  if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
    g.gameOver = true;
    endGame(g);
    return;
  }

  const newHead = { x: nx, y: ny };
  
  // Check tail collision
  if (g.snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
    g.gameOver = true;
    endGame(g);
    return;
  }

  g.snake.push(newHead);

  // Check if we ate an item
  for (let i = 0; i < g.items.length; i++) {
    const it = g.items[i];
    if (it.x === newHead.x && it.y === newHead.y) {
      g.score += it.value;
      g.desiredLength += it.value;
      // Increase speed every 20 points
      if (g.score % 20 === 0) g.speed = Math.min(20, g.speed + 1);
      g.items.splice(i, 1);
      break;
    }
  }

  // Trim tail to desired length
  while (g.snake.length > g.desiredLength) {
    g.snake.shift();
  }
}

// End Game
function endGame(g) {
  overlay.style.display = 'flex';
  const panel = document.getElementById('panel');
  panel.innerHTML = `<h2>Game Over</h2><p>Score: ${g.score}</p><button id="restartBtn">Restart</button>`;
  document.getElementById('restartBtn').addEventListener('click', () => {
    overlay.style.display = 'none';
    startNewRound();
  });
}

// Update HUD Display
function updateHUD(g) {
  if (scoreEl) scoreEl.textContent = g.score;
  if (speedEl) speedEl.textContent = g.speed;
  if (lengthEl) lengthEl.textContent = g.desiredLength;
}

// Render Game
function draw(g) {
  // Clear canvas
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw border (only on desktop)
  const isMobile = window.innerWidth <= 768 || window.innerHeight <= 768;
  if (!isMobile) {
    ctx.strokeStyle = '#cfc000';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
  }

  // Draw items (numbers)
  ctx.font = `${TILE}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  g.items.forEach(it => {
    const px = it.x * TILE + TILE / 2;
    const py = it.y * TILE + TILE / 2;
    
    // Draw diamond background
    ctx.fillStyle = '#006600';
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-TILE * 0.4, -TILE * 0.4, TILE * 0.8, TILE * 0.8);
    ctx.restore();
    
    // Draw number
    ctx.fillStyle = '#ff0';
    ctx.fillText(String(it.value), px + 1, py + 1);
  });

  // Draw snake segments
  for (let i = 0; i < g.snake.length; i++) {
    const s = g.snake[i];
    const px = s.x * TILE;
    const py = s.y * TILE;
    
    // Head is green, body is red
    ctx.fillStyle = (i === g.snake.length - 1) ? '#66ff66' : '#d23';
    
    // Draw diamond shape
    ctx.save();
    ctx.translate(px + TILE / 2, py + TILE / 2);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-TILE * 0.4, -TILE * 0.4, TILE * 0.8, TILE * 0.8);
    ctx.restore();
  }
  
  // Draw score overlay on mobile
  if (isMobileDevice()) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 120, 30);
    ctx.fillStyle = '#ff0';
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${g.score}`, 15, 30);
  }
}

// Game Loop
function gameLoop(ts) {
  if (!game || !game.running) return;
  if (!lastFrameTime) lastFrameTime = ts;
  const elapsed = ts - lastFrameTime;
  const msPerTick = 1000 / game.speed;
  
  if (elapsed >= msPerTick) {
    tick(game);
    // Occasionally spawn items
    if (Math.random() < 0.25) spawnItem(game);
    updateHUD(game);
    draw(game);
    lastFrameTime = ts;
  }
  
  if (!game.gameOver) requestAnimationFrame(gameLoop);
}

// Start New Round
function startNewRound() {
  game = createNewGame();
  initSnake(game);
  // Ensure a few initial items
  for (let i = 0; i < 3; i++) spawnItem(game);
  updateHUD(game);
  overlay.style.display = 'none';
  game.running = true;
  game.gameOver = false;
  lastFrameTime = 0;
  requestAnimationFrame(gameLoop);
}

// Event Listeners

// Keyboard Input
window.addEventListener('keydown', e => {
  if (!game) return;
  switch (e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      setDirection(game, 0, -1);
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      setDirection(game, 0, 1);
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      setDirection(game, -1, 0);
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      setDirection(game, 1, 0);
      break;
    case ' ':
      // Pause/Resume
      game.running = !game.running;
      if (game.running) {
        lastFrameTime = 0;
        requestAnimationFrame(gameLoop);
        overlay.style.display = 'none';
      } else {
        overlay.style.display = 'flex';
        document.getElementById('panel').innerHTML = 
          '<div class="panel"><h3>Paused</h3><button id="resume">Resume</button></div>';
        document.getElementById('resume').addEventListener('click', () => {
          overlay.style.display = 'none';
          game.running = true;
          lastFrameTime = 0;
          requestAnimationFrame(gameLoop);
        });
      }
      break;
  }
});

// Start Button
startBtn.addEventListener('click', () => {
  startNewRound();
});

// Canvas Focus
canvas.addEventListener('click', () => canvas.focus());
canvas.tabIndex = 1000;

// Mobile detection helper
function isMobileDevice() {
  return window.innerWidth <= 768 || window.innerHeight <= 768;
}

// Canvas Swipe Controls
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault(); // Prevent scrolling
}, { passive: false });

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  if (!game || !game.running) return;
  
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  
  // Minimum swipe distance to register
  const minSwipeDistance = 30;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < minSwipeDistance) return;
  
  if (Math.abs(dx) > Math.abs(dy)) {
    setDirection(game, dx > 0 ? 1 : -1, 0);
  } else {
    setDirection(game, 0, dy > 0 ? 1 : -1);
  }
}, { passive: false });

// Initialize responsive canvas when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupResponsiveCanvas();
});

// Handle window resize and orientation change
function handleResize() {
  setupResponsiveCanvas();
  // If game is running, we might want to adjust snake position
  if (game && game.running) {
    // Ensure snake is still within bounds
    game.snake = game.snake.filter(seg => 
      seg.x >= 0 && seg.x < COLS && seg.y >= 0 && seg.y < ROWS
    );
    // If snake is empty after filtering, end game
    if (game.snake.length === 0) {
      game.gameOver = true;
      endGame(game);
    }
  }
}

window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', () => {
  // Multiple delays to ensure orientation change is complete
  setTimeout(handleResize, 100);
  setTimeout(handleResize, 300);
  setTimeout(handleResize, 500);
});

// Also handle visual viewport changes on mobile
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', handleResize);
}
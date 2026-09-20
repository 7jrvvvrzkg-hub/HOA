"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCw, ArrowLeft, ArrowRight, ArrowDown, ChevronsDown, Pause, Play } from "lucide-react";
import { Button } from "@/components/Button";

// A small falling-block puzzle, our own take rather than a copy of the
// famous one: different name, our own site colors instead of the familiar
// piece-color convention, a simpler rotation system, and scoring/leveling
// tuned by hand rather than following any official ruleset. The core
// "seven four-square shapes fall and full rows clear" idea is generic
// puzzle-game mechanics that shows up in hundreds of indie clones, not
// something we're trying to pass off as the original.

const COLS = 10;
const ROWS = 18;
const CELL = 22;

type Matrix = number[][];

// One rotation-0 shape per piece; other rotations are derived by rotating
// the matrix at runtime rather than hand-writing all four states.
const SHAPES: Record<string, Matrix> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

// Our own palette — the site's greens/gold/cream instead of the familiar
// red/orange/yellow/green/cyan/blue/purple set.
const COLORS: Record<string, string> = {
  I: "#2f8f6e",
  O: "#d7a83d",
  T: "#8a6fb0",
  S: "#4f9d5d",
  Z: "#c0603f",
  J: "#3f6f9e",
  L: "#b98b3e",
};

const PIECE_KEYS = Object.keys(SHAPES);

function rotateCW(m: Matrix): Matrix {
  const n = m.length;
  const res: Matrix = Array.from({ length: n }, () => Array(n).fill(0));
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      res[x][n - 1 - y] = m[y][x];
    }
  }
  return res;
}

function randomPiece() {
  const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
  return { key, matrix: SHAPES[key].map((row) => [...row]) };
}

type Piece = { key: string; matrix: Matrix; x: number; y: number };

function emptyBoard(): (string | null)[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function collides(board: (string | null)[][], matrix: Matrix, px: number, py: number) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (!matrix[y][x]) continue;
      const bx = px + x;
      const by = py + y;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && board[by][bx]) return true;
    }
  }
  return false;
}

function spawnPiece(): Piece {
  const { key, matrix } = randomPiece();
  return { key, matrix, x: Math.floor((COLS - matrix.length) / 2), y: -1 };
}

export default function BlockPartyGame() {
  const [board, setBoard] = useState(emptyBoard);
  const [piece, setPiece] = useState<Piece>(spawnPiece);
  const [next, setNext] = useState<Piece>(spawnPiece);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [running, setRunning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropRef = useRef<number | null>(null);

  const lockPiece = useCallback((b: (string | null)[][], p: Piece) => {
    const next = b.map((row) => [...row]);
    for (let y = 0; y < p.matrix.length; y++) {
      for (let x = 0; x < p.matrix[y].length; x++) {
        if (!p.matrix[y][x]) continue;
        const by = p.y + y;
        const bx = p.x + x;
        if (by >= 0) next[by][bx] = p.key;
      }
    }
    let cleared = 0;
    const kept = next.filter((row) => {
      const full = row.every((cell) => cell !== null);
      if (full) cleared++;
      return !full;
    });
    while (kept.length < ROWS) kept.unshift(Array(COLS).fill(null));
    if (cleared > 0) {
      const points = [0, 100, 300, 500, 800][cleared] * level;
      setScore((s) => s + points);
      setLines((l) => {
        const total = l + cleared;
        setLevel(1 + Math.floor(total / 10));
        return total;
      });
    }
    return kept;
  }, [level]);

  const tick = useCallback((dx: number, dy: number, rotate: boolean) => {
    if (gameOver || !running) return;
    setPiece((p) => {
      let matrix = p.matrix;
      if (rotate) {
        const rotated = rotateCW(p.matrix);
        // simple wall kick: try the rotation, then nudge left/right if it
        // doesn't fit, else give up on rotating this time.
        for (const kick of [0, -1, 1, -2, 2]) {
          if (!collides(board, rotated, p.x + kick, p.y)) {
            matrix = rotated;
            dx = kick;
            break;
          }
        }
        if (matrix === p.matrix) dx = 0;
      }
      const nx = p.x + dx;
      const ny = p.y + dy;
      if (!collides(board, matrix, nx, ny)) {
        return { ...p, matrix, x: nx, y: ny };
      }
      if (dy > 0) {
        // landed
        const newBoard = lockPiece(board, p);
        setBoard(newBoard);
        const spawned = next;
        const upcoming = spawnPiece();
        setNext(upcoming);
        if (collides(newBoard, spawned.matrix, spawned.x, spawned.y)) {
          setGameOver(true);
          setRunning(false);
        }
        return { ...spawned, y: 0 };
      }
      return p;
    });
  }, [board, gameOver, running, lockPiece, next]);

  const hardDrop = useCallback(() => {
    if (gameOver || !running) return;
    setPiece((p) => {
      let dropY = p.y;
      while (!collides(board, p.matrix, p.x, dropY + 1)) dropY++;
      const landed = { ...p, y: dropY };
      const newBoard = lockPiece(board, landed);
      setBoard(newBoard);
      const spawned = next;
      const upcoming = spawnPiece();
      setNext(upcoming);
      if (collides(newBoard, spawned.matrix, spawned.x, spawned.y)) {
        setGameOver(true);
        setRunning(false);
      }
      return { ...spawned, y: 0 };
    });
  }, [board, gameOver, running, lockPiece, next]);

  // gravity loop
  useEffect(() => {
    if (!running || gameOver) return;
    const speed = Math.max(120, 800 - (level - 1) * 60);
    dropRef.current = window.setInterval(() => tick(0, 1, false), speed);
    return () => {
      if (dropRef.current) window.clearInterval(dropRef.current);
    };
  }, [running, gameOver, level, tick]);

  // keyboard controls
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!running || gameOver) return;
      if (e.key === "ArrowLeft") tick(-1, 0, false);
      else if (e.key === "ArrowRight") tick(1, 0, false);
      else if (e.key === "ArrowDown") tick(0, 1, false);
      else if (e.key === "ArrowUp" || e.key === "x" || e.key === "X") tick(0, 0, true);
      else if (e.key === " ") {
        e.preventDefault();
        hardDrop();
      } else {
        return;
      }
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tick, hardDrop, running, gameOver]);

  // render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1f3d24";
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, ROWS * CELL);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(COLS * CELL, y * CELL);
      ctx.stroke();
    }

    function drawCell(x: number, y: number, color: string) {
      if (!ctx || y < 0) return;
      ctx.fillStyle = color;
      ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
    }

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = board[y][x];
        if (cell) drawCell(x, y, COLORS[cell]);
      }
    }

    for (let y = 0; y < piece.matrix.length; y++) {
      for (let x = 0; x < piece.matrix[y].length; x++) {
        if (piece.matrix[y][x]) drawCell(piece.x + x, piece.y + y, COLORS[piece.key]);
      }
    }
  }, [board, piece]);

  function startGame() {
    setBoard(emptyBoard());
    setPiece(spawnPiece());
    setNext(spawnPiece());
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setRunning(true);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4 text-sm text-cream/90">
        <span>Score: <strong>{score}</strong></span>
        <span>Lines: <strong>{lines}</strong></span>
        <span>Level: <strong>{level}</strong></span>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={COLS * CELL}
          height={ROWS * CELL}
          className="rounded-md border border-cream/20 shadow-lg"
        />
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-md bg-black/60 text-center text-cream">
            <p className="max-w-[16rem] px-4 text-sm">
              {gameOver ? `Game over — final score ${score}.` : "This block wandered off the block. Help it stack up while you find your way back."}
            </p>
            <Button variant="accent" size="sm" onClick={startGame}>
              <Play size={16} /> {gameOver ? "Play Again" : "Start"}
            </Button>
          </div>
        )}
      </div>

      {running && (
        <div className="grid grid-cols-3 gap-2 sm:hidden">
          <Button variant="outlineInvert" size="sm" onClick={() => tick(-1, 0, false)} aria-label="move left">
            <ArrowLeft size={18} />
          </Button>
          <Button variant="outlineInvert" size="sm" onClick={() => tick(0, 0, true)} aria-label="rotate">
            <RotateCw size={18} />
          </Button>
          <Button variant="outlineInvert" size="sm" onClick={() => tick(1, 0, false)} aria-label="move right">
            <ArrowRight size={18} />
          </Button>
          <Button variant="outlineInvert" size="sm" onClick={() => tick(0, 1, false)} aria-label="soft drop">
            <ArrowDown size={18} />
          </Button>
          <Button variant="outlineInvert" size="sm" onClick={hardDrop} aria-label="hard drop">
            <ChevronsDown size={18} />
          </Button>
          <Button variant="outlineInvert" size="sm" onClick={() => setRunning(false)} aria-label="pause">
            <Pause size={18} />
          </Button>
        </div>
      )}

      <p className="hidden text-xs text-cream/60 sm:block">
        Arrow keys to move · Up or X to rotate · Space to drop
      </p>
    </div>
  );
}

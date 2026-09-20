"use client";

import { useEffect, useRef, useState } from "react";

// Internal game resolution stays tiny on purpose — scaled up with CSS and
// `image-rendering: pixelated` for the chunky retro look, and cheap enough
// to run smoothly even on an old phone.
const GAME_W = 96;
const GAME_H = 72;
const PLAYER_W = 7;
const PLAYER_SPEED = 55; // px/sec at game resolution
const BULLET_SPEED = 90;
const INVADER_ROWS = 4;
const INVADER_COLS = 8;
const INVADER_W = 6;
const INVADER_H = 5;
const INVADER_GAP_X = 3;
const INVADER_GAP_Y = 5;

interface Invader {
  x: number;
  y: number;
  alive: boolean;
}

interface Bullet {
  x: number;
  y: number;
  vy: number;
}

/**
 * Space-Invaders-style 404 game. Pixel-art canvas, keyboard controls on
 * desktop, on-screen buttons on mobile/touch — both work simultaneously so
 * a trackpad-and-touchscreen laptop just works too.
 */
export function InvadersGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);

  const stateRef = useRef({
    playerX: GAME_W / 2 - PLAYER_W / 2,
    moveLeft: false,
    moveRight: false,
    invaders: [] as Invader[],
    invaderDir: 1 as 1 | -1,
    invaderSpeed: 8,
    invaderStepTimer: 0,
    bullets: [] as Bullet[],
    invaderBullets: [] as Bullet[],
    fireCooldown: 0,
    invaderFireCooldown: 1.2,
    wave: 1,
    score: 0,
    alive: true,
  });

  function spawnWave(waveNumber: number) {
    const invaders: Invader[] = [];
    for (let row = 0; row < INVADER_ROWS; row++) {
      for (let col = 0; col < INVADER_COLS; col++) {
        invaders.push({
          x: 8 + col * (INVADER_W + INVADER_GAP_X),
          y: 6 + row * (INVADER_H + INVADER_GAP_Y),
          alive: true,
        });
      }
    }
    stateRef.current.invaders = invaders;
    stateRef.current.invaderSpeed = 8 + waveNumber * 3;
  }

  function resetGame() {
    stateRef.current.playerX = GAME_W / 2 - PLAYER_W / 2;
    stateRef.current.bullets = [];
    stateRef.current.invaderBullets = [];
    stateRef.current.invaderDir = 1;
    stateRef.current.wave = 1;
    stateRef.current.score = 0;
    stateRef.current.alive = true;
    spawnWave(1);
    setWave(1);
    setScore(0);
    setStatus("playing");
  }

  useEffect(() => {
    spawnWave(1);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    const ctx = ctx2d;

    let raf: number;
    let last = performance.now();

    function onKeyDown(e: KeyboardEvent) {
      if (["ArrowLeft", "a", "A"].includes(e.key)) stateRef.current.moveLeft = true;
      if (["ArrowRight", "d", "D"].includes(e.key)) stateRef.current.moveRight = true;
      if (e.key === " ") {
        e.preventDefault();
        fire();
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (["ArrowLeft", "a", "A"].includes(e.key)) stateRef.current.moveLeft = false;
      if (["ArrowRight", "d", "D"].includes(e.key)) stateRef.current.moveRight = false;
    }
    function fire() {
      const s = stateRef.current;
      if (s.fireCooldown > 0 || !s.alive) return;
      s.bullets.push({ x: s.playerX + PLAYER_W / 2, y: GAME_H - 8, vy: -BULLET_SPEED });
      s.fireCooldown = 0.35;
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    (canvasRef.current as HTMLCanvasElement & { __fire?: () => void }).__fire = fire;

    function tick(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const s = stateRef.current;

      if (s.alive) {
        if (s.moveLeft) s.playerX -= PLAYER_SPEED * dt;
        if (s.moveRight) s.playerX += PLAYER_SPEED * dt;
        s.playerX = Math.max(2, Math.min(GAME_W - PLAYER_W - 2, s.playerX));
        s.fireCooldown = Math.max(0, s.fireCooldown - dt);

        // Move invaders as a block, bouncing off the edges and stepping down.
        let hitEdge = false;
        for (const inv of s.invaders) {
          if (!inv.alive) continue;
          const nextX = inv.x + s.invaderDir * s.invaderSpeed * dt;
          if (nextX < 2 || nextX > GAME_W - INVADER_W - 2) hitEdge = true;
        }
        if (hitEdge) {
          s.invaderDir = s.invaderDir === 1 ? -1 : 1;
          for (const inv of s.invaders) inv.y += 3;
        } else {
          for (const inv of s.invaders) inv.x += s.invaderDir * s.invaderSpeed * dt;
        }

        // Invaders fire back occasionally.
        s.invaderFireCooldown -= dt;
        if (s.invaderFireCooldown <= 0) {
          const alive = s.invaders.filter((i) => i.alive);
          if (alive.length) {
            const shooter = alive[Math.floor(Math.random() * alive.length)];
            s.invaderBullets.push({ x: shooter.x + INVADER_W / 2, y: shooter.y + INVADER_H, vy: 40 });
          }
          s.invaderFireCooldown = Math.max(0.4, 1.3 - s.wave * 0.1);
        }

        // Update bullets.
        s.bullets.forEach((b) => (b.y += b.vy * dt));
        s.bullets = s.bullets.filter((b) => b.y > -4);
        s.invaderBullets.forEach((b) => (b.y += b.vy * dt));
        s.invaderBullets = s.invaderBullets.filter((b) => b.y < GAME_H + 4);

        // Bullet-invader collisions.
        for (const b of s.bullets) {
          for (const inv of s.invaders) {
            if (!inv.alive) continue;
            if (b.x > inv.x && b.x < inv.x + INVADER_W && b.y > inv.y && b.y < inv.y + INVADER_H) {
              inv.alive = false;
              b.y = -999;
              s.score += 10;
              setScore(s.score);
            }
          }
        }

        // Invader bullets hitting the player.
        for (const b of s.invaderBullets) {
          if (
            b.x > s.playerX &&
            b.x < s.playerX + PLAYER_W &&
            b.y > GAME_H - 9 &&
            b.y < GAME_H - 4
          ) {
            s.alive = false;
            setStatus("lost");
          }
        }

        // Invaders reaching the bottom = game over.
        if (s.invaders.some((i) => i.alive && i.y + INVADER_H >= GAME_H - 10)) {
          s.alive = false;
          setStatus("lost");
        }

        // Wave cleared -> next wave.
        if (s.invaders.every((i) => !i.alive)) {
          s.wave += 1;
          setWave(s.wave);
          spawnWave(s.wave);
          if (s.wave > 5) {
            s.alive = false;
            setStatus("won");
          }
        }
      }

      // ── render ──
      ctx.fillStyle = "#241a12";
      ctx.fillRect(0, 0, GAME_W, GAME_H);

      // stars
      ctx.fillStyle = "#4a3c2f";
      for (let i = 0; i < 20; i++) {
        ctx.fillRect((i * 37) % GAME_W, (i * 53) % GAME_H, 1, 1);
      }

      ctx.fillStyle = "#c69a3a";
      for (const inv of s.invaders) {
        if (!inv.alive) continue;
        ctx.fillRect(inv.x, inv.y, INVADER_W, INVADER_H);
      }

      if (s.alive) {
        ctx.fillStyle = "#e2551f";
        ctx.fillRect(s.playerX, GAME_H - 8, PLAYER_W, 4);
        ctx.fillRect(s.playerX + PLAYER_W / 2 - 1, GAME_H - 11, 2, 3);
      }

      ctx.fillStyle = "#faf5ec";
      for (const b of s.bullets) ctx.fillRect(b.x - 0.5, b.y - 2, 1, 3);

      ctx.fillStyle = "#e8d3a0";
      for (const b of s.invaderBullets) ctx.fillRect(b.x - 0.5, b.y - 2, 1, 3);

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pressFire() {
    (canvasRef.current as (HTMLCanvasElement & { __fire?: () => void }) | null)?.__fire?.();
  }

  function handleRestart() {
    resetGame();
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-xs items-center justify-between px-1 text-xs text-cream/70">
        <span>Score: {score}</span>
        <span>Wave: {wave}</span>
      </div>

      <div className="relative w-full max-w-xs overflow-hidden rounded-[2.5rem] border-4 border-gold bg-ink p-2 shadow-soft">
        <canvas
          ref={canvasRef}
          width={GAME_W}
          height={GAME_H}
          className="w-full rounded-[1.75rem]"
          style={{ imageRendering: "pixelated" }}
        />

        {status !== "playing" && (
          <div className="absolute inset-2 flex flex-col items-center justify-center gap-3 rounded-[1.75rem] bg-ink/85 text-center text-cream">
            <p className="font-display text-xl italic">
              {status === "won" ? "You cleared the shop!" : "Lost in the aisles"}
            </p>
            <p className="text-xs text-cream/70">Score: {score}</p>
            <button
              onClick={handleRestart}
              className="rounded-full bg-pop px-4 py-2 text-xs font-semibold text-cream"
            >
              Play again
            </button>
          </div>
        )}
      </div>

      {/* On-screen controls — always rendered so touch + keyboard both work */}
      <div className="flex w-full max-w-xs items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            className="h-12 w-12 select-none rounded-full bg-cream/10 text-cream active:bg-cream/20"
            onPointerDown={() => (stateRef.current.moveLeft = true)}
            onPointerUp={() => (stateRef.current.moveLeft = false)}
            onPointerLeave={() => (stateRef.current.moveLeft = false)}
            aria-label="Move left"
          >
            ◀
          </button>
          <button
            className="h-12 w-12 select-none rounded-full bg-cream/10 text-cream active:bg-cream/20"
            onPointerDown={() => (stateRef.current.moveRight = true)}
            onPointerUp={() => (stateRef.current.moveRight = false)}
            onPointerLeave={() => (stateRef.current.moveRight = false)}
            aria-label="Move right"
          >
            ▶
          </button>
        </div>
        <button
          className="h-12 rounded-full bg-pop px-6 text-sm font-semibold text-cream shadow-pop active:bg-pop-dark"
          onPointerDown={pressFire}
          aria-label="Fire"
        >
          FIRE
        </button>
      </div>
      <p className="text-center text-[0.7rem] text-cream/50">
        Arrow keys / A·D to move, Space to fire — or use the buttons above.
      </p>
    </div>
  );
}

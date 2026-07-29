import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/store';
import { visibleCharacters, CHARACTER_META } from '../game/characters';
import type { CharacterId, LocationId } from '../game/types';
import {
  TILE,
  MAP_W,
  MAP_H,
  createMap,
  entityAt,
  isSolid,
  type WorldEntity,
  type TileId,
} from './map';
import { drawTile, drawBuilding, drawNpc, drawPlayer } from './sprites';
import { DEFAULT_WEATHER, fetchValleyWeather, type WeatherTheme } from '../scene/weather';

const SCALE = 3;
const SPEED = 1.55;

type Facing = 0 | 1 | 2 | 3;

const BUILDING_STYLE: Record<
  string,
  { body: string; roof: string; accent: string; kind: 'office' | 'market' | 'bank' | 'hospital' | 'house' }
> = {
  company: { body: '#8ec8e0', roof: '#4a6a78', accent: '#ff9f43', kind: 'office' },
  market: { body: '#2f4a3c', roof: '#1b5e20', accent: '#00c853', kind: 'market' },
  bank: { body: '#e8dfc8', roof: '#b08d57', accent: '#5d4037', kind: 'bank' },
  hospital: { body: '#f2f4f6', roof: '#90a4ae', accent: '#c62828', kind: 'hospital' },
  realestate: { body: '#c4a484', roof: '#5c4a3e', accent: '#3e342c', kind: 'house' },
};

function weatherTint(theme: WeatherTheme): string {
  if (!theme.isDay) return 'rgba(10,16,40,0.35)';
  if (theme.showRain) return 'rgba(40,55,70,0.22)';
  if (theme.kind === 'fog') return 'rgba(180,190,200,0.28)';
  if (theme.kind === 'clear') return 'rgba(255,220,140,0.06)';
  return 'rgba(0,0,0,0)';
}

export function PixelWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useRef<Record<string, boolean>>({});
  const stateRef = useRef(useGame.getState());
  const themeRef = useRef<WeatherTheme>(DEFAULT_WEATHER);
  const nearRef = useRef<WorldEntity | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [theme, setTheme] = useState<WeatherTheme>(DEFAULT_WEATHER);

  const openLocation = useGame((s) => s.openLocation);
  const openCharacter = useGame((s) => s.openCharacter);
  const gameState = useGame((s) => s.state);
  const phase = gameState?.phase;
  const blocked =
    phase === 'event' ||
    phase === 'location' ||
    phase === 'character' ||
    phase === 'title' ||
    phase === 'gameover' ||
    phase === 'victory' ||
    !phase;

  useEffect(() => useGame.subscribe((s) => {
    stateRef.current = s;
  }), []);

  useEffect(() => {
    fetchValleyWeather().then((t) => {
      themeRef.current = t;
      setTheme(t);
    });
  }, []);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === 'e' || e.key === 'Enter') {
        const near = nearRef.current;
        const st = stateRef.current;
        if (!near || !st.state) return;
        if (
          st.state.phase === 'event' ||
          st.state.phase === 'location' ||
          st.state.phase === 'character' ||
          st.state.phase === 'title' ||
          (st.state.forcedHospital && near.target !== 'hospital')
        ) {
          return;
        }
        if (near.kind === 'location') openLocation(near.target as LocationId);
        else openCharacter(near.target as CharacterId);
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [openLocation, openCharacter]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const world = createMap();
    const player = {
      x: world.spawn.x * TILE,
      y: world.spawn.y * TILE,
      facing: 0 as Facing,
      frame: 0,
      anim: 0,
    };

    let camX = player.x;
    let camY = player.y;
    let raf = 0;
    let last = performance.now();
    let rainT = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    window.addEventListener('resize', resize);

    const collides = (px: number, py: number) => {
      const points = [
        [px + 3, py + 10],
        [px + 12, py + 10],
        [px + 3, py + 15],
        [px + 12, py + 15],
      ];
      for (const [x, y] of points) {
        const tx = Math.floor(x / TILE);
        const ty = Math.floor(y / TILE);
        if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
        if (isSolid(world.tiles[ty][tx])) return true;
        for (const e of world.entities) {
          if (e.kind !== 'location') continue;
          if (tx >= e.x && tx < e.x + e.w && ty >= e.y && ty < e.y + e.h) return true;
        }
      }
      return false;
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      rainT += dt;
      const themeLocal = themeRef.current;

      const st = stateRef.current;
      const canMove =
        !!st.state &&
        st.state.phase !== 'event' &&
        st.state.phase !== 'location' &&
        st.state.phase !== 'character' &&
        st.state.phase !== 'title' &&
        st.state.phase !== 'gameover' &&
        st.state.phase !== 'victory';

      let dx = 0;
      let dy = 0;
      if (canMove) {
        if (keys.current['w'] || keys.current['arrowup']) dy -= 1;
        if (keys.current['s'] || keys.current['arrowdown']) dy += 1;
        if (keys.current['a'] || keys.current['arrowleft']) dx -= 1;
        if (keys.current['d'] || keys.current['arrowright']) dx += 1;
      }
      if (dx || dy) {
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;
        const dist = SPEED * TILE * 3.2 * dt;
        const nx = player.x + dx * dist;
        const ny = player.y + dy * dist;
        if (!collides(nx, player.y)) player.x = nx;
        if (!collides(player.x, ny)) player.y = ny;
        if (Math.abs(dy) > Math.abs(dx)) player.facing = dy > 0 ? 0 : 3;
        else player.facing = dx > 0 ? 2 : 1;
        player.anim += dt * 8;
        player.frame = Math.floor(player.anim) % 2;
      } else {
        player.frame = 0;
      }

      const viewW = canvas.width / SCALE;
      const viewH = canvas.height / SCALE;
      camX += (player.x + 8 - viewW / 2 - camX) * Math.min(1, dt * 6);
      camY += (player.y + 8 - viewH / 2 - camY) * Math.min(1, dt * 6);
      camX = Math.max(0, Math.min(MAP_W * TILE - viewW, camX));
      camY = Math.max(0, Math.min(MAP_H * TILE - viewH, camY));

      const ptx = Math.floor((player.x + 8) / TILE);
      const pty = Math.floor((player.y + 12) / TILE);
      const vis = new Set<string>(
        st.state ? visibleCharacters(st.state) : ['friend', 'colleague', 'boss'],
      );
      const near = entityAt(world.entities, ptx, pty, vis);
      nearRef.current = near;
      let nextPrompt: string | null = null;
      if (near && canMove) {
        const name =
          near.kind === 'character' && st.state?.characters
            ? st.state.characters[near.target as CharacterId]?.name ?? near.label
            : near.label;
        nextPrompt = `Press E — ${name}`;
      } else if (st.state?.forcedHospital) {
        nextPrompt = 'Health critical — walk to Urgent Care (E)';
      }
      setPrompt((prev) => (prev === nextPrompt ? prev : nextPrompt));

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = themeLocal.skyTop;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(SCALE, SCALE);
      ctx.translate(-Math.floor(camX), -Math.floor(camY));

      const x0 = Math.max(0, Math.floor(camX / TILE) - 1);
      const y0 = Math.max(0, Math.floor(camY / TILE) - 1);
      const x1 = Math.min(MAP_W, Math.ceil((camX + viewW) / TILE) + 1);
      const y1 = Math.min(MAP_H, Math.ceil((camY + viewH) / TILE) + 1);

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          drawTile(ctx, world.tiles[y][x] as TileId, x * TILE, y * TILE);
        }
      }

      const drawList: { y: number; draw: () => void }[] = [];

      for (const e of world.entities) {
        if (e.kind === 'location') {
          const style = BUILDING_STYLE[e.target] ?? BUILDING_STYLE.company;
          drawList.push({
            y: (e.y + e.h) * TILE,
            draw: () => {
              drawBuilding(
                ctx,
                e.x * TILE,
                e.y * TILE,
                e.w,
                e.h,
                style.body,
                style.roof,
                style.accent,
                style.kind,
              );
              ctx.fillStyle = 'rgba(10,14,20,0.7)';
              ctx.fillRect(e.x * TILE, (e.y + e.h) * TILE + 1, e.w * TILE, 7);
              ctx.fillStyle = '#f4f1ea';
              ctx.font = '5px monospace';
              ctx.fillText(e.label, e.x * TILE + 2, (e.y + e.h) * TILE + 6);
            },
          });
        } else if (vis.has(e.target)) {
          const meta = CHARACTER_META[e.target as CharacterId];
          const bond = st.state?.characters?.[e.target as CharacterId];
          drawList.push({
            y: e.y * TILE + 16,
            draw: () => {
              drawNpc(
                ctx,
                e.x * TILE,
                e.y * TILE,
                meta.color,
                meta.outfit,
                meta.hair,
                0,
                Math.floor(rainT * 2 + e.x) % 2,
              );
              ctx.fillStyle = 'rgba(10,14,20,0.75)';
              ctx.fillRect(e.x * TILE - 4, e.y * TILE - 6, 24, 6);
              ctx.fillStyle = '#ffeaa7';
              ctx.font = '5px monospace';
              ctx.fillText(bond?.name ?? e.label, e.x * TILE - 2, e.y * TILE - 1);
            },
          });
        }
      }

      drawList.push({
        y: player.y + 16,
        draw: () =>
          drawPlayer(ctx, Math.floor(player.x), Math.floor(player.y), player.facing, player.frame),
      });
      drawList.sort((a, b) => a.y - b.y);
      for (const d of drawList) d.draw();

      if (near && canMove) {
        const sx =
          near.kind === 'location' ? (near.x + near.w / 2) * TILE : near.x * TILE + 8;
        const sy =
          near.kind === 'location' ? (near.y + near.h) * TILE + 10 : near.y * TILE - 8;
        ctx.fillStyle = `rgba(255,230,120,${0.4 + Math.sin(rainT * 6) * 0.3})`;
        ctx.fillRect(sx - 1, sy, 2, 2);
      }

      ctx.restore();
      ctx.fillStyle = weatherTint(themeLocal);
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (themeLocal.showRain) {
        ctx.fillStyle = 'rgba(180,210,230,0.55)';
        for (let i = 0; i < 60; i++) {
          const rx = (i * 97 + rainT * 120) % canvas.width;
          const ry = (i * 53 + rainT * 380) % canvas.height;
          ctx.fillRect(rx, ry, SCALE, 4 * SCALE);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const showTitle = !gameState || gameState.phase === 'title';

  return (
    <div className="pixel-world">
      <canvas ref={canvasRef} className="pixel-canvas" />
      {!showTitle && (
        <div className="pixel-chrome">
          <div className="pixel-weather">{theme.label}</div>
          <div className="pixel-controls">
            <span>WASD / Arrows move</span>
            <span>E interact</span>
          </div>
          {prompt && !blocked && <div className="pixel-prompt">{prompt}</div>}
          {gameState?.forcedHospital && (
            <div className="pixel-alert">HP LOW — find the hospital!</div>
          )}
        </div>
      )}
    </div>
  );
}

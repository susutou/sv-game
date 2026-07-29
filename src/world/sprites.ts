/** Tiny procedural pixel sprites drawn onto an offscreen atlas */

import type { TileId } from './map';
import { TILE } from './map';

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export function drawTile(ctx: CanvasRenderingContext2D, tile: TileId, dx: number, dy: number) {
  switch (tile) {
    case 'grass':
      px(ctx, dx, dy, TILE, TILE, '#3d8f4a');
      px(ctx, dx + 3, dy + 5, 1, 2, '#2e7a3a');
      px(ctx, dx + 10, dy + 9, 1, 2, '#56a85e');
      break;
    case 'grass2':
      px(ctx, dx, dy, TILE, TILE, '#368544');
      px(ctx, dx + 6, dy + 3, 1, 2, '#2a6e36');
      px(ctx, dx + 12, dy + 11, 1, 1, '#4d9a55');
      break;
    case 'path':
      px(ctx, dx, dy, TILE, TILE, '#c2a87a');
      px(ctx, dx + 2, dy + 4, 1, 1, '#a88c60');
      px(ctx, dx + 9, dy + 10, 1, 1, '#d4bc90');
      break;
    case 'plaza':
      px(ctx, dx, dy, TILE, TILE, '#9aa0a6');
      px(ctx, dx, dy, TILE, 1, '#b0b6bc');
      px(ctx, dx, dy + TILE - 1, TILE, 1, '#7a8086');
      break;
    case 'road':
      px(ctx, dx, dy, TILE, TILE, '#3a3a3c');
      break;
    case 'roadline':
      px(ctx, dx, dy, TILE, TILE, '#3a3a3c');
      px(ctx, dx + 6, dy + 1, 4, 2, '#d4c45a');
      break;
    case 'water':
      px(ctx, dx, dy, TILE, TILE, '#2f7f9e');
      px(ctx, dx + 2, dy + 4, 5, 1, '#4a9aba');
      px(ctx, dx + 8, dy + 10, 4, 1, '#246880');
      break;
    case 'water2':
      px(ctx, dx, dy, TILE, TILE, '#2a738f');
      px(ctx, dx + 4, dy + 7, 6, 1, '#3f8eaa');
      break;
    case 'sand':
      px(ctx, dx, dy, TILE, TILE, '#d8c48a');
      px(ctx, dx + 5, dy + 8, 1, 1, '#c0aa70');
      break;
    case 'dock':
      px(ctx, dx, dy, TILE, TILE, '#6b4f32');
      px(ctx, dx, dy + 3, TILE, 1, '#4a3520');
      px(ctx, dx, dy + 10, TILE, 1, '#4a3520');
      break;
    case 'bush':
      px(ctx, dx, dy, TILE, TILE, '#3d8f4a');
      px(ctx, dx + 3, dy + 7, 10, 7, '#1f5c2e');
      px(ctx, dx + 5, dy + 5, 6, 4, '#2e7a3a');
      break;
    case 'tree':
      px(ctx, dx, dy, TILE, TILE, '#3d8f4a');
      px(ctx, dx + 7, dy + 9, 2, 6, '#5a3a22');
      px(ctx, dx + 3, dy + 2, 10, 8, '#1b5e2a');
      px(ctx, dx + 5, dy + 1, 6, 4, '#247a36');
      break;
    case 'flower':
      px(ctx, dx, dy, TILE, TILE, '#3d8f4a');
      px(ctx, dx + 6, dy + 8, 2, 4, '#2e7a3a');
      px(ctx, dx + 5, dy + 5, 4, 3, '#e85d8a');
      px(ctx, dx + 6, dy + 6, 2, 1, '#ffd76a');
      break;
    case 'floor':
      px(ctx, dx, dy, TILE, TILE, '#6e6256');
      break;
    default:
      px(ctx, dx, dy, TILE, TILE, '#ff00ff');
  }
}

/** 2.5D building facade drawn in pixel style (depth via side/roof) */
export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  body: string,
  roof: string,
  accent: string,
  kind: 'office' | 'market' | 'bank' | 'hospital' | 'house',
) {
  const pxScale = 1;
  const bw = w * TILE;
  const bh = h * TILE;
  const depth = 6;

  // side / depth slab
  ctx.fillStyle = shade(body, -30);
  ctx.fillRect(x + depth, y - depth, bw, bh);

  // roof slab
  ctx.fillStyle = roof;
  ctx.fillRect(x, y - depth - 4, bw + depth, 8);
  ctx.fillStyle = shade(roof, 20);
  ctx.fillRect(x, y - depth - 4, bw + depth, 2);

  // front face
  ctx.fillStyle = body;
  ctx.fillRect(x, y, bw, bh);

  // windows
  const cols = Math.max(2, Math.floor(w * 1.5));
  const rows = Math.max(2, Math.floor(h * 1.2));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = x + 4 + c * Math.floor((bw - 8) / cols);
      const wy = y + 4 + r * Math.floor((bh - 12) / rows);
      ctx.fillStyle = (r + c) % 3 === 0 ? '#ffe6a8' : '#1a3040';
      ctx.fillRect(wx, wy, 3, 3);
    }
  }

  // door
  ctx.fillStyle = accent;
  ctx.fillRect(x + bw / 2 - 3, y + bh - 8, 6, 8);

  if (kind === 'hospital') {
    ctx.fillStyle = '#c62828';
    ctx.fillRect(x + bw / 2 - 1, y + 6, 2, 8);
    ctx.fillRect(x + bw / 2 - 3, y + 9, 6, 2);
  }
  if (kind === 'bank') {
    ctx.fillStyle = shade(roof, 10);
    ctx.beginPath();
    ctx.arc(x + bw / 2, y - 2, 5, Math.PI, 0);
    ctx.fill();
  }
  if (kind === 'market') {
    ctx.fillStyle = '#0a1f14';
    ctx.fillRect(x + 4, y + 4, bw - 8, 7);
    ctx.fillStyle = '#3dd68c';
    ctx.fillRect(x + 6, y + 6, 2, 4);
    ctx.fillStyle = '#e85d4c';
    ctx.fillRect(x + 10, y + 7, 2, 3);
    ctx.fillStyle = '#3dd68c';
    ctx.fillRect(x + 14, y + 5, 2, 5);
  }
  if (kind === 'house') {
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(x - 2, y + 2);
    ctx.lineTo(x + bw / 2, y - 10);
    ctx.lineTo(x + bw + 2, y + 2);
    ctx.closePath();
    ctx.fill();
  }

  void pxScale;
}

function shade(hex: string, amt: number): string {
  const n = hex.replace('#', '');
  const num = parseInt(n.length === 3 ? n.split('').map((c) => c + c).join('') : n, 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (num & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

export function drawNpc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  skin: string,
  outfit: string,
  hair: string,
  facing: 0 | 1 | 2 | 3,
  frame: number,
) {
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x + 2, y + 13, 12, 3);

  const bob = frame % 2 === 0 ? 0 : 1;
  // body
  ctx.fillStyle = outfit;
  ctx.fillRect(x + 4, y + 7 + bob, 8, 7);
  // head
  ctx.fillStyle = skin;
  ctx.fillRect(x + 5, y + 2 + bob, 6, 5);
  // hair
  ctx.fillStyle = hair;
  ctx.fillRect(x + 4, y + 1 + bob, 8, 2);
  if (facing === 0) {
    // down — eyes
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 6, y + 4 + bob, 1, 1);
    ctx.fillRect(x + 9, y + 4 + bob, 1, 1);
  }
  // legs
  ctx.fillStyle = shade(outfit, -40);
  const step = frame % 2;
  if (facing === 1 || facing === 3) {
    ctx.fillRect(x + 5, y + 13 + bob, 2, 3);
    ctx.fillRect(x + 9, y + 13 + bob, 2, 3);
  } else {
    ctx.fillRect(x + 5 + step, y + 13 + bob, 2, 3);
    ctx.fillRect(x + 9 - step, y + 13 + bob, 2, 3);
  }
}

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: 0 | 1 | 2 | 3,
  frame: number,
) {
  drawNpc(ctx, x, y, '#e0b089', '#3d5afe', '#1a1a1a', facing, frame);
}

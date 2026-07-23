import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

/**
 * Captcha store (in-memory for short-lived challenges).
 * Each challenge: id -> { answer, expiresAt }
 */
const captchaStore = new Map<string, { answer: string; expiresAt: number }>();

// Periodically clean expired
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of captchaStore) {
    if (v.expiresAt < now) captchaStore.delete(k);
  }
}, 60000).unref?.();

function generateChallenge(): { question: string; answer: string } {
  // Random pick from 3 difficulty types
  const type = Math.floor(Math.random() * 3);
  if (type === 0) {
    // Math: a * b + c
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 8) + 2;
    const c = Math.floor(Math.random() * 20) + 1;
    return { question: `${a} × ${b} + ${c} = ?`, answer: String(a * b + c) };
  } else if (type === 1) {
    // Reverse string
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return { question: `请倒序输入: ${s}`, answer: s.split("").reverse().join("") };
  } else {
    // Logic: count specific char
    const pool = "△▽○●□■◇◆☆★";
    const target = pool[Math.floor(Math.random() * pool.length)];
    let str = "";
    const len = Math.floor(Math.random() * 6) + 8;
    for (let i = 0; i < len; i++) {
      str += pool[Math.floor(Math.random() * pool.length)];
    }
    const count = (str.match(new RegExp(target, "g")) || []).length;
    return { question: `数一数有几个「${target}」: ${str}`, answer: String(count) };
  }
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

/**
 * Generate an SVG captcha image with noise + distortion.
 */
function renderSvgCaptcha(text: string): string {
  const width = 260;
  const height = 80;
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${width}" height="${height}" fill="#f8fafc"/>`;
  // noise lines
  for (let i = 0; i < 8; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    const colors = ["#94a3b8", "#cbd5e1", "#64748b"];
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colors[i % 3]}" stroke-width="1"/>`;
  }
  // noise dots
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    svg += `<circle cx="${x}" cy="${y}" r="1" fill="#94a3b8"/>`;
  }
  // distorted text
  const colors = ["#0f766e", "#b45309", "#9d174d", "#1e3a8a", "#065f46"];
  for (let i = 0; i < text.length; i++) {
    const x = 25 + i * 30;
    const y = 50 + (Math.random() - 0.5) * 15;
    const rot = (Math.random() - 0.5) * 50;
    const sz = 28 + Math.floor(Math.random() * 8);
    const col = colors[i % colors.length];
    svg += `<text x="${x}" y="${y}" font-size="${sz}" fill="${col}" font-family="monospace" font-weight="bold" transform="rotate(${rot} ${x} ${y})">${escapeXml(text[i])}</text>`;
  }
  svg += `</svg>`;
  return svg;
}

/**
 * GET /api/captcha
 * Returns { captchaId, type: "svg"|"logic", svg?, question? }
 */
export async function GET() {
  const useImage = Math.random() > 0.4;
  const id = randomBytes(12).toString("hex");
  let answer: string;
  let payload: any;

  if (useImage) {
    // image captcha: random 4-5 char alphanumeric
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let s = "";
    const len = 4 + Math.floor(Math.random() * 2);
    for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
    answer = s;
    payload = { type: "svg", svg: renderSvgCaptcha(s) };
  } else {
    const ch = generateChallenge();
    answer = ch.answer;
    payload = { type: "logic", question: ch.question };
  }

  captchaStore.set(id, { answer, expiresAt: Date.now() + 5 * 60 * 1000 });

  return NextResponse.json({ captchaId: id, ...payload });
}

/**
 * Verify helper (used internally by app submit).
 */
export function verifyCaptcha(captchaId: string, userInput: string): boolean {
  const entry = captchaStore.get(captchaId);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    captchaStore.delete(captchaId);
    return false;
  }
  captchaStore.delete(captchaId); // single-use
  return entry.answer.trim().toLowerCase() === userInput.trim().toLowerCase();
}

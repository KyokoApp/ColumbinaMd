const fs = require('fs');
const { spawn } = require('child_process');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');

// Register Fonts
GlobalFonts.registerFromPath('/home/container/fonts/Inter-Bold.ttf', 'InterBold');
GlobalFonts.registerFromPath('/home/container/fonts/Inter-Regular.ttf', 'InterRegular');
GlobalFonts.registerFromPath('/home/container/fonts/BebasNeue-Regular.ttf', 'BebasNeue');

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 30;
const DURATION_SEC = 15;
const TOTAL_FRAMES = FPS * DURATION_SEC; // 450 frames
const OUTPUT_VIDEO = '/home/container/data/omp-agent/work/b96786850bcd/motion_showreel_v5.mp4';
const TEMP_AUDIO = '/tmp/showreel_v5_audio.wav';

// --- 1. GENERATE HIGH-IMPACT 128 BPM AUDIO SOUNDTRACK ---
function generateAudio(filename) {
  const sampleRate = 44100;
  const numSamples = Math.floor(DURATION_SEC * sampleRate);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  const BPM = 128;
  const beatSec = 60 / BPM;
  const roots = [146.83, 116.54, 174.61, 130.81];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    const beatNum = t / beatSec;
    const beatIndex = Math.floor(beatNum);
    const beatFrac = beatNum - beatIndex;

    // 1. Kick Drum (Aggressive punch on every quarter beat)
    const isKickSection = (t < 11.5) || (t >= 11.5 && t < 12.8);
    if (isKickSection && beatFrac < 0.22) {
      const kf = 160 * Math.exp(-beatFrac * 34) + 42;
      const kEnv = Math.exp(-beatFrac * 20);
      sample += Math.sin(2 * Math.PI * kf * (beatFrac * beatSec)) * kEnv * 0.6;
    }

    // 2. Snare / Clap on beats 2 and 4
    if (beatIndex >= 6 && beatIndex < 27) {
      if (beatIndex % 2 === 1 && beatFrac < 0.22) {
        const sNoise = (Math.random() * 2 - 1) * Math.exp(-beatFrac * 26);
        const sTone = Math.sin(2 * Math.PI * 250 * (beatFrac * beatSec)) * Math.exp(-beatFrac * 32);
        sample += (sNoise * 0.38 + sTone * 0.22) * 0.55;
      }
    }

    // 3. 16th Note Hi-Hats
    if (beatIndex >= 6 && beatIndex < 25) {
      const sixteenth = (beatFrac * 4) % 1;
      if (sixteenth < 0.09) {
        sample += (Math.random() * 2 - 1) * Math.exp(-sixteenth * 55) * 0.15;
      }
    }

    // 4. Bassline Synthesizer Arpeggio
    if (beatIndex >= 6 && beatIndex < 26) {
      const measure = Math.floor(beatIndex / 4) % 4;
      const rootFreq = roots[measure];
      const step = Math.floor(beatFrac * 4);
      const mult = (step % 2 === 0) ? 1 : (step === 3 ? 1.5 : 2);
      const arpFreq = rootFreq * mult;
      const arpEnv = Math.exp(-(beatFrac * 4 % 1) * 16);
      sample += (Math.sin(2 * Math.PI * arpFreq * t) + 0.35 * Math.sin(4 * Math.PI * arpFreq * t)) * arpEnv * 0.24;
    }

    // 5. Tension Risers
    const addRiser = (start, end) => {
      if (t >= start && t <= end) {
        const p = (t - start) / (end - start);
        sample += Math.sin(2 * Math.PI * (140 + p * p * 950) * t) * (p * 0.32);
      }
    };
    addRiser(2.2, 2.9);
    addRiser(5.2, 5.9);
    addRiser(8.8, 9.5);

    // 6. Sub-bass Drop at Climax
    if (t >= 9.5 && t < 11.2) {
      const dt = t - 9.5;
      const impFreq = 130 * Math.exp(-dt * 7) + 36;
      sample += Math.sin(2 * Math.PI * impFreq * dt) * Math.exp(-dt * 3.2) * 0.7;
      sample += (Math.random() * 2 - 1) * Math.exp(-dt * 18) * 0.25;
    }

    // 7. Ambient Outro Chord
    if (t >= 12.5) {
      const outP = Math.max(0, 1 - (t - 13.8) / 1.2);
      const chord = (Math.sin(2 * Math.PI * 146.83 * t) + Math.sin(2 * Math.PI * 220 * t) + Math.sin(2 * Math.PI * 293.66 * t)) / 3;
      sample += chord * outP * 0.38;
    }

    sample = Math.max(-1, Math.min(1, sample * 0.88));
    buffer.writeInt16LE(Math.floor(sample * 32767), 44 + i * 2);
  }

  fs.writeFileSync(filename, buffer);
  console.log('[Audio V5] Synchronized soundtrack created:', filename);
}
generateAudio(TEMP_AUDIO);

// --- EASING & MATH UTILS ---
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

// --- COLOR PALETTE (SWISS BRUTALIST + CYBER ACID ACCENTS) ---
const PALETTE = {
  bg: '#08080c',
  cardBg: 'rgba(12, 14, 20, 0.85)',
  textWhite: '#f8f9fa',
  textMuted: '#94a3b8',
  textDim: '#475569',
  electricBlue: '#2952ff',
  neonCyan: '#38bdf8',
  acidLime: '#d4ff00',
  tangerine: '#ff5338',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  gridLine: 'rgba(255, 255, 255, 0.035)'
};

const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

// --- CHROMATIC ABERRATION TEXT HELPER ---
function drawChromaticText(text, x, y, font, align, fill, shift = 4) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;

  // Red/Coral Shift
  if (shift > 0.5) {
    ctx.fillStyle = 'rgba(255, 83, 56, 0.65)';
    ctx.fillText(text, x - shift, y);
    // Cyan Shift
    ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
    ctx.fillText(text, x + shift, y);
  }

  // Core Fill
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// --- GLOBAL HUD & STUDIO OVERLAYS ---
function drawGlobalHUD(f, t, actName, actCode) {
  ctx.save();
  ctx.fillStyle = PALETTE.textMuted;
  ctx.font = '11px InterBold';

  // Top Left Header
  ctx.fillText('STUDIO YUKI // MOTION & TYPOGRAPHIC LAB', 45, 38);

  // Top Right Telemetry
  const frameStr = String(f).padStart(4, '0');
  const secStr = (t).toFixed(2).padStart(5, '0');
  ctx.textAlign = 'right';
  ctx.fillText(`00:00:${secStr} // 128 BPM [60 FPS]`, WIDTH - 45, 38);

  // Bottom Left Coordinates
  ctx.textAlign = 'left';
  ctx.font = '10px InterRegular';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('SYS.SPEC [ LAT: 35.6895°N // LNG: 139.6917°E ]', 45, HEIGHT - 32);

  // Bottom Right Frame Count
  ctx.textAlign = 'right';
  ctx.fillText(`FRAME ${frameStr} / ${TOTAL_FRAMES} • ${actCode}`, WIDTH - 45, HEIGHT - 32);

  // Corner Precision Reticle Crosshairs (Margin 30px)
  drawReticle(30, 30);
  drawReticle(WIDTH - 30, 30);
  drawReticle(30, HEIGHT - 30);
  drawReticle(WIDTH - 30, HEIGHT - 30);

  // Left & Right Vertical Side Labels
  ctx.save();
  ctx.font = '9px InterBold';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';

  // Left Vertical
  ctx.translate(22, HEIGHT / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText(`KINETIX SYSTEMS • ${actName} • EXPLORATION`, 0, 0);
  ctx.restore();

  // Right Vertical
  ctx.save();
  ctx.translate(WIDTH - 22, HEIGHT / 2);
  ctx.rotate(Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('DYNAMIC KINETICS • SPATIAL MATRIX • 2026', 0, 0);
  ctx.restore();

  ctx.restore();
}

function drawReticle(x, y) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y);
  ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8);
  ctx.stroke();
}

// =========================================================================
// --- ACT I: BRUTALIST SPLIT-SLICE MASKING & STROBE CUT (0.0s - 3.0s | f: 0 - 89) ---
// =========================================================================
function drawAct1(f, t) {
  // Hard strobe cuts at 1.0s and 2.1s
  const invertStrobe = (t > 0.95 && t < 1.08) || (t > 2.05 && t < 2.15);
  const bg = invertStrobe ? PALETTE.tangerine : PALETTE.bg;
  const fg = invertStrobe ? PALETTE.bg : PALETTE.textWhite;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Diagonal Hazard Velocity Stripes in Background
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.rotate(-0.25);
  const stripeCount = 16;
  const stripeStep = WIDTH / 10;
  ctx.strokeStyle = invertStrobe ? PALETTE.bg : 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 2;
  for (let i = -stripeCount; i <= stripeCount; i++) {
    const sx = i * stripeStep + ((t * 220) % stripeStep);
    ctx.beginPath();
    ctx.moveTo(sx, -HEIGHT);
    ctx.lineTo(sx, HEIGHT);
    ctx.stroke();
  }
  ctx.restore();

  // Sub-scene 1A (0.0s - 1.2s | f: 0 - 35): Horizontal Split-Slice "KINETIX"
  if (f < 36) {
    const p = easeOutExpo(clamp(f / 30, 0, 1));
    const fontSize = 160;
    const fontStr = `${fontSize}px BebasNeue`;
    const topY = HEIGHT / 2 - 95;
    const slices = 3;
    const sliceH = 75;

    for (let s = 0; s < slices; s++) {
      const dir = (s % 2 === 0) ? 1 : -1;
      const slideOffset = (1 - p) * 480 * dir;
      const shift = (1 - p) * 16 + 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, topY + s * sliceH, WIDTH, sliceH + 1);
      ctx.clip();

      const sliceColor = (s === 1) ? PALETTE.tangerine : fg;
      drawChromaticText('KINETIX', WIDTH / 2 + slideOffset, HEIGHT / 2 + 55, fontStr, 'center', sliceColor, shift);
      ctx.restore();
    }

    // Expanding Framing Brackets
    const bw = 400 * p + 180;
    const bh = 180 * p + 40;
    ctx.strokeStyle = PALETTE.neonCyan;
    ctx.lineWidth = 2;
    ctx.strokeRect(WIDTH / 2 - bw / 2, HEIGHT / 2 - bh / 2, bw, bh);

    // Micro Subtitle
    ctx.font = '12px InterBold';
    ctx.fillStyle = PALETTE.textMuted;
    ctx.textAlign = 'center';
    ctx.fillText('[ ACT 01 // KINETIC SPLIT SLICE PROTOCOL ]', WIDTH / 2, HEIGHT / 2 + 130);
  }
  // Sub-scene 1B (1.2s - 3.0s | f: 36 - 89): Staggered Kinetic Typography Stack "STUDIO // YUKI"
  else {
    const localF = f - 36;
    const p = clamp(localF / 25, 0, 1);
    const ease = easeOutBack(p);

    // Giant Watermark Behind
    ctx.save();
    ctx.font = '190px InterBold';
    ctx.fillStyle = invertStrobe ? 'rgba(0,0,0,0.1)' : 'rgba(255, 255, 255, 0.025)';
    ctx.textAlign = 'center';
    ctx.fillText('STUDIO', WIDTH / 2, HEIGHT / 2 + 70);
    ctx.restore();

    // 5-Row Kinetic Text Stack
    const rows = [
      { text: 'STUDIO YUKI', size: 32, fill: PALETTE.textDim, y: HEIGHT / 2 - 110, offsetDir: -1 },
      { text: 'PRECISION KINETICS', size: 48, fill: PALETTE.neonCyan, y: HEIGHT / 2 - 50, offsetDir: 1 },
      { text: 'FORM // MOTION', size: 90, fill: fg, y: HEIGHT / 2 + 35, offsetDir: -1, isHero: true },
      { text: 'HIGH SPEED DISRUPTION', size: 48, fill: PALETTE.tangerine, y: HEIGHT / 2 + 95, offsetDir: 1 },
      { text: 'TOKYO 2026 REEL', size: 32, fill: PALETTE.textDim, y: HEIGHT / 2 + 145, offsetDir: -1 }
    ];

    rows.forEach(r => {
      const rowOffset = (1 - ease) * 120 * r.offsetDir;
      const font = r.isHero ? `${r.size}px BebasNeue` : `${r.size}px InterBold`;
      drawChromaticText(r.text, WIDTH / 2 + rowOffset, r.y, font, 'center', r.fill, (1 - p) * 12);
    });

    // Glass Pill Badge (Top of Scene)
    ctx.save();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.strokeStyle = PALETTE.neonCyan;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(WIDTH / 2 - 120, HEIGHT / 2 - 170, 240, 30, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = '10px InterBold';
    ctx.fillStyle = PALETTE.neonCyan;
    ctx.textAlign = 'center';
    ctx.fillText('• 2026 BRUTALIST EXPERIMENT •', WIDTH / 2, HEIGHT / 2 - 150);
    ctx.restore();
  }

  drawGlobalHUD(f, t, 'TYPOGRAPHIC SPLIT', 'ACT:01');
}

// =========================================================================
// --- ACT II: VELOCITY MARQUEES & LIQUID POLYGON MORPH (3.0s - 6.0s | f: 90 - 179) ---
// =========================================================================
function drawAct2(f, t) {
  const localF = f - 90;
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Background Diagonal Speed Band
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.rotate(-0.18);
  ctx.fillStyle = 'rgba(41, 82, 255, 0.12)';
  ctx.fillRect(-WIDTH, -180, WIDTH * 2, 360);
  ctx.restore();

  // 4 Overlapping High-Velocity Kinetic Marquee Tracks
  // Track 1 (Y: 140, Neon Cyan Micro Track, Speed: Right)
  ctx.save();
  ctx.font = '16px InterBold';
  ctx.fillStyle = PALETTE.neonCyan;
  const off1 = (localF * 14) % 1200 - 600;
  for (let i = -1; i < 4; i++) {
    ctx.fillText('• EXPLORE SYSTEM • HIGH VELOCITY • DYNAMIC SYNCHRONIZER • ', off1 + i * 1100, 140);
  }
  ctx.restore();

  // Track 2 (Y: 260, Giant White Fill, Speed: Left)
  ctx.save();
  ctx.font = '92px BebasNeue';
  ctx.fillStyle = PALETTE.textWhite;
  const off2 = -(localF * 22) % 1600;
  for (let i = -1; i < 4; i++) {
    ctx.fillText('KINETIC RHYTHM • TYPOGRAPHY • ', off2 + i * 1400, 260);
  }
  ctx.restore();

  // Track 3 (Y: 480, Hollow Stroke Type, Speed: Right)
  ctx.save();
  ctx.font = '92px BebasNeue';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2.5;
  const off3 = (localF * 18) % 1600 - 800;
  for (let i = -1; i < 4; i++) {
    ctx.strokeText('SPATIAL DEPTH • BOLD VISION • ', off3 + i * 1400, 480);
  }
  ctx.restore();

  // Track 4 (Y: 590, Tangerine Orange Heavy, Speed: Left)
  ctx.save();
  ctx.font = '76px BebasNeue';
  ctx.fillStyle = PALETTE.tangerine;
  const off4 = -(localF * 26) % 1800;
  for (let i = -1; i < 4; i++) {
    ctx.fillText('• LIQUID GEOMETRIC MORPH • MOMENTUM • ', off4 + i * 1500, 590);
  }
  ctx.restore();

  // Center Morphing Geometric Polygon with Rotating Compass Ticks
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  const rot = t * 2.2;
  ctx.rotate(rot);

  // Outer Rotating Compass Ring
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 160, 0, Math.PI * 2);
  ctx.stroke();

  // Compass Ticks
  const ticks = 32;
  for (let i = 0; i < ticks; i++) {
    const angle = (i / ticks) * Math.PI * 2;
    const len = (i % 4 === 0) ? 14 : 7;
    ctx.strokeStyle = (i % 4 === 0) ? PALETTE.neonCyan : 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = (i % 4 === 0) ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 150, Math.sin(angle) * 150);
    ctx.lineTo(Math.cos(angle) * (150 - len), Math.sin(angle) * (150 - len));
    ctx.stroke();
  }

  // Morphing Polygon (Triangle -> Square -> Hexagon -> Star)
  const morphPhase = (t * 1.5) % 3; // 0..3
  const sides = 3 + Math.floor(morphPhase) * 2; // 3 -> 5 -> 7
  const polyRadius = 100 + Math.sin(t * 8) * 12;

  ctx.strokeStyle = PALETTE.acidLime;
  ctx.shadowColor = 'rgba(212, 255, 0, 0.6)';
  ctx.shadowBlur = 20;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const px = Math.cos(a) * polyRadius;
    const py = Math.sin(a) * polyRadius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Vertex Glowing Beads
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(Math.cos(a) * polyRadius, Math.sin(a) * polyRadius, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Central Glass Badge (Above Polygon)
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.fillStyle = 'rgba(8, 8, 12, 0.92)';
  ctx.strokeStyle = PALETTE.borderLight;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-150, -36, 300, 72, 18);
  ctx.fill();
  ctx.stroke();

  ctx.font = '24px BebasNeue';
  ctx.fillStyle = PALETTE.textWhite;
  ctx.textAlign = 'center';
  ctx.fillText('ACT II // VELOCITY MORPH', 0, 4);

  ctx.font = '10px InterBold';
  ctx.fillStyle = PALETTE.neonCyan;
  ctx.fillText('128 BPM SYNCHRONIZED MATRIX', 0, 22);
  ctx.restore();

  drawGlobalHUD(f, t, 'VELOCITY MARQUEE', 'ACT:02');
}

// =========================================================================
// --- ACT III: 3D WIREFRAME HYPER-TUNNEL & VORTEX (6.0s - 9.0s | f: 180 - 269) ---
// =========================================================================
function drawAct3(f, t) {
  const localF = f - 180;
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const cx = WIDTH / 2 + Math.sin(t * 1.5) * 40;
  const cy = HEIGHT / 2 + Math.cos(t * 1.2) * 25;

  // 1. Perspective Radial Grid Lines Converging to Vanishing Point
  ctx.save();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
  ctx.lineWidth = 1;
  const lineCount = 16;
  for (let i = 0; i < lineCount; i++) {
    const angle = (i / lineCount) * Math.PI * 2 + (t * 0.4);
    const edgeX = cx + Math.cos(angle) * WIDTH;
    const edgeY = cy + Math.sin(angle) * WIDTH;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(edgeX, edgeY);
    ctx.stroke();
  }
  ctx.restore();

  // 2. 3D Wireframe Tunnel Rings Traveling Forward (Z: 1200 -> 0)
  const ringCount = 12;
  const tunnelSpeed = (localF * 28) % 1200;

  for (let i = 0; i < ringCount; i++) {
    const baseZ = (i * (1200 / ringCount) + tunnelSpeed) % 1200;
    const z = 1200 - baseZ; // Distance from camera
    if (z <= 20) continue;

    // Perspective Projection
    const scale = 500 / z;
    const radius = 280 * scale;
    if (radius > WIDTH * 1.2) continue;

    const alpha = clamp((1200 - z) / 1000, 0, 1) * 0.85;
    const ringAngle = (t * 1.2) + (i * 0.15);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ringAngle);

    // Tunnel Ring (Square with rounded corners)
    ctx.strokeStyle = (i % 2 === 0) ? `rgba(41, 82, 255, ${alpha})` : `rgba(255, 83, 56, ${alpha})`;
    ctx.lineWidth = clamp(scale * 3.5, 1, 6);
    ctx.beginPath();
    ctx.strokeRect(-radius, -radius, radius * 2, radius * 2);

    // Corner Vertex Beads
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    const cornerR = clamp(scale * 4, 2, 7);
    ctx.beginPath(); ctx.arc(-radius, -radius, cornerR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(radius, -radius, cornerR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-radius, radius, cornerR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(radius, radius, cornerR, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  // 3. Fast Flying Depth Starfield Particles
  const particleCount = 45;
  for (let p = 0; p < particleCount; p++) {
    const pz = (p * 27 + (localF * 35)) % 1200;
    const z = 1200 - pz;
    if (z <= 30) continue;
    const scale = 500 / z;
    const pAngle = p * 1.35;
    const pDist = (p * 45) % 360;
    const px = cx + Math.cos(pAngle) * pDist * scale;
    const py = cy + Math.sin(pAngle) * pDist * scale;

    const pAlpha = clamp((1200 - z) / 1000, 0, 1);
    ctx.fillStyle = (p % 3 === 0) ? PALETTE.neonCyan : PALETTE.acidLime;
    ctx.beginPath();
    ctx.arc(px, py, clamp(scale * 2.8, 1, 4), 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Center Vanishing Point Vortex Core
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = PALETTE.neonCyan;
  ctx.shadowBlur = 25;
  ctx.beginPath();
  ctx.arc(cx, cy, 8 + Math.sin(t * 12) * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Typographic Center Hero Badge
  ctx.font = '22px BebasNeue';
  ctx.fillStyle = PALETTE.textWhite;
  ctx.textAlign = 'center';
  ctx.fillText('3D HYPER VORTEX', cx, cy + 45);
  ctx.restore();

  // Left & Right HUD Telemetry Cards
  // Left Card: 3D Camera & Spatial Matrix
  ctx.save();
  ctx.fillStyle = PALETTE.cardBg;
  ctx.strokeStyle = PALETTE.borderLight;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(80, HEIGHT / 2 - 110, 240, 220, 16);
  ctx.fill(); ctx.stroke();

  ctx.fillStyle = PALETTE.textWhite;
  ctx.font = '16px InterBold';
  ctx.fillText('SPATIAL MATRIX', 105, HEIGHT / 2 - 70);

  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '11px InterRegular';
  ctx.fillText('3D PERSPECTIVE ENGINE', 105, HEIGHT / 2 - 45);

  ctx.fillStyle = PALETTE.textMuted;
  ctx.fillText(`FOV CAMERA : 75.0°`, 105, HEIGHT / 2 - 15);
  ctx.fillText(`TUNNEL VELOCITY : 1280 u/s`, 105, HEIGHT / 2 + 10);
  ctx.fillText(`VORTEX ROT : ${(t * 45 % 360).toFixed(1)}°`, 105, HEIGHT / 2 + 35);

  ctx.fillStyle = '#22c55e';
  ctx.fillText('● SYSTEM SYNCHRONIZED', 105, HEIGHT / 2 + 70);
  ctx.restore();

  // Right Card: 128 BPM Audio Spectrum
  ctx.save();
  ctx.fillStyle = PALETTE.cardBg;
  ctx.strokeStyle = PALETTE.borderLight;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(WIDTH - 320, HEIGHT / 2 - 110, 240, 220, 16);
  ctx.fill(); ctx.stroke();

  ctx.fillStyle = PALETTE.textWhite;
  ctx.font = '16px InterBold';
  ctx.fillText('AUDIO SPECTRUM', WIDTH - 295, HEIGHT / 2 - 70);

  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '11px InterRegular';
  ctx.fillText('128 BPM SYNCHRONIZER', WIDTH - 295, HEIGHT / 2 - 45);

  const barCount = 10;
  const startX = WIDTH - 295;
  for (let b = 0; b < barCount; b++) {
    const wave = Math.sin(t * 14 + b * 0.95) * 0.5 + 0.5;
    const barHeight = wave * 68 + 10;
    ctx.fillStyle = (b % 2 === 0) ? PALETTE.electricBlue : PALETTE.tangerine;
    ctx.fillRect(startX + b * 19, HEIGHT / 2 + 55 - barHeight, 10, barHeight);
  }
  ctx.restore();

  drawGlobalHUD(f, t, '3D HYPER TUNNEL', 'ACT:03');
}

// =========================================================================
// --- ACT IV: CONCENTRIC RADIAL TYPOGRAPHY & BEAT SLAM (9.0s - 12.0s | f: 270 - 359) ---
// =========================================================================
function drawAct4(f, t) {
  const localF = f - 270;
  const isFlash = (localF < 4) || (localF > 44 && localF < 48) || (localF > 74 && localF < 78);

  const bg = isFlash ? '#ffffff' : PALETTE.bg;
  const textCol = isFlash ? '#08080c' : PALETTE.textWhite;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 1. Dual Concentric Counter-Rotating Radial Typographic Rings
  // Ring 1 (Inner, Radius 280px, Rotating Clockwise)
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.rotate(t * 1.6);
  ctx.font = '11px InterBold';
  ctx.fillStyle = isFlash ? PALETTE.electricBlue : PALETTE.neonCyan;
  const ring1Text = '✦ CRAFT ✦ INNOVATION ✦ MOVEMENT ✦ DISRUPTION ✦ IDENTITY ✦ ';
  const step1 = (Math.PI * 2) / ring1Text.length;
  for (let i = 0; i < ring1Text.length; i++) {
    ctx.save();
    ctx.rotate(i * step1);
    ctx.fillText(ring1Text[i], 0, -280);
    ctx.restore();
  }
  ctx.restore();

  // Ring 2 (Outer, Radius 325px, Rotating Counter-Clockwise)
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.rotate(-t * 1.3);
  ctx.font = '10px InterBold';
  ctx.fillStyle = isFlash ? PALETTE.tangerine : 'rgba(255, 83, 56, 0.9)';
  const ring2Text = '• STUDIO YUKI • 2026 SHOWREEL • KINETIC TYPE • ZERO SLOP • ';
  const step2 = (Math.PI * 2) / ring2Text.length;
  for (let i = 0; i < ring2Text.length; i++) {
    ctx.save();
    ctx.rotate(i * step2);
    ctx.fillText(ring2Text[i], 0, -325);
    ctx.restore();
  }
  ctx.restore();

  // 2. Beat Slam Wordmark (Cycles: CRAFT -> INNOVATION -> DISRUPT)
  let word = 'CRAFT';
  if (localF > 28 && localF <= 58) word = 'INNOVATION';
  if (localF > 58) word = 'DISRUPT';

  const beatPhase = (localF % 30) / 30;
  const scale = 1.0 + (1 - easeOutExpo(beatPhase)) * 0.38;

  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.scale(scale, scale);

  const font = (word.length > 8) ? '90px BebasNeue' : '115px BebasNeue';
  drawChromaticText(word, 0, 36, font, 'center', textCol, (1 - easeOutExpo(beatPhase)) * 18);
  ctx.restore();

  // Expanding Shockwave Ring on Beat Slam
  const shockR = easeOutCubic(beatPhase) * 360;
  const shockAlpha = (1 - beatPhase) * 0.6;
  ctx.save();
  ctx.strokeStyle = `rgba(56, 189, 248, ${shockAlpha})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(WIDTH / 2, HEIGHT / 2, shockR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Sub-tag Bar
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '11px InterBold';
  ctx.fillStyle = isFlash ? '#64748b' : PALETTE.textMuted;
  ctx.fillText('[ ACT IV // MAXIMUM IMPACT KINETIC RHYTHM ]', WIDTH / 2, HEIGHT / 2 + 105);
  ctx.restore();

  drawGlobalHUD(f, t, 'RADIAL KINETICS', 'ACT:04');
}

// =========================================================================
// --- ACT V: RADIAL IRIS CONVERGENCE & OUTRO LOCKUP (12.0s - 15.0s | f: 360 - 449) ---
// =========================================================================
function drawAct5(f, t) {
  const localF = f - 360;
  const p = clamp(localF / 25, 0, 1);
  const ease = easeOutBack(p);

  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Radial Iris Entry Circle (Frame 360 - 385)
  if (localF < 28) {
    const irisR = easeOutCubic(localF / 28) * WIDTH;
    ctx.save();
    ctx.fillStyle = 'rgba(41, 82, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(WIDTH / 2, HEIGHT / 2, irisR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Interlocking Monogram Rings Emblem
  const emblemY = HEIGHT / 2 - 80;
  ctx.save();
  ctx.translate(WIDTH / 2, emblemY);
  ctx.scale(ease, ease);

  // Ring 1 (Left, Electric Blue)
  ctx.strokeStyle = PALETTE.electricBlue;
  ctx.shadowColor = 'rgba(41, 82, 255, 0.6)';
  ctx.shadowBlur = 24;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(-22, 0, 48, 0, Math.PI * 2);
  ctx.stroke();

  // Ring 2 (Right, Tangerine)
  ctx.strokeStyle = PALETTE.tangerine;
  ctx.shadowColor = 'rgba(255, 83, 56, 0.6)';
  ctx.shadowBlur = 24;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(22, 0, 48, 0, Math.PI * 2);
  ctx.stroke();

  // Glowing Core Dot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  // Outro Architectural Typography "STUDIO YUKI"
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2 + 35);
  ctx.scale(ease, ease);
  drawChromaticText('STUDIO YUKI', 0, 0, '68px InterBold', 'center', PALETTE.textWhite, (1 - p) * 10);
  ctx.restore();

  // Subtitle Pill
  ctx.save();
  ctx.globalAlpha = clamp((localF - 15) / 20, 0, 1);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.strokeStyle = PALETTE.borderLight;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(WIDTH / 2 - 160, HEIGHT / 2 + 75, 320, 34, 17);
  ctx.fill();
  ctx.stroke();

  ctx.font = '11px InterBold';
  ctx.fillStyle = PALETTE.neonCyan;
  ctx.textAlign = 'center';
  ctx.fillText('SELECTED SHOWREEL • 2026 MASTER REEL', WIDTH / 2, HEIGHT / 2 + 96);
  ctx.restore();

  // Fade Out to Black (Last 20 frames)
  if (localF > 68) {
    const fadeOutAlpha = clamp((localF - 68) / 22, 0, 1);
    ctx.fillStyle = `rgba(8, 8, 12, ${fadeOutAlpha})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  drawGlobalHUD(f, t, 'ARCHITECTURAL OUTRO', 'ACT:05');
}

// =========================================================================
// --- MAIN RENDER PIPELINE VIA FFMPEG PIPE ---
// =========================================================================
(async function runRender() {
  console.log(`[Render V5] Starting video generation: ${TOTAL_FRAMES} frames @ ${FPS} fps...`);

  const ffmpegProc = spawn('ffmpeg', [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'png',
    '-r', String(FPS),
    '-i', '-',
    '-i', TEMP_AUDIO,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'fast',
    '-crf', '18',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    OUTPUT_VIDEO
  ]);

  ffmpegProc.stderr.on('data', () => {}); // silence ffmpeg logs

  ffmpegProc.on('close', (code) => {
    if (code === 0) {
      const stats = fs.statSync(OUTPUT_VIDEO);
      console.log(`[Success V5] Video rendered successfully!`);
      console.log(`[Output] ${OUTPUT_VIDEO} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      console.error(`[Error V5] FFmpeg exited with code ${code}`);
    }
  });

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const t = i / FPS;

    if (i < 90) {
      drawAct1(i, t);
    } else if (i < 180) {
      drawAct2(i, t);
    } else if (i < 270) {
      drawAct3(i, t);
    } else if (i < 360) {
      drawAct4(i, t);
    } else {
      drawAct5(i, t);
    }

    const pngBuffer = canvas.toBuffer('image/png');
    ffmpegProc.stdin.write(pngBuffer);

    if ((i + 1) % 60 === 0 || i === TOTAL_FRAMES - 1) {
      console.log(`[Progress V5] Frame ${i + 1}/${TOTAL_FRAMES} (${Math.round((i + 1) / TOTAL_FRAMES * 100)}%)`);
    }
  }

  ffmpegProc.stdin.end();
})();

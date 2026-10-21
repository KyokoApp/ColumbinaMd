const fs = require('fs');
const { spawn } = require('child_process');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');

// Register Fonts
GlobalFonts.registerFromPath('/home/container/fonts/Inter-Bold.ttf', 'InterBold');
GlobalFonts.registerFromPath('/home/container/assets/rinchat/fonts/Inter-Regular.ttf', 'InterRegular');

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 30;
const DURATION_SEC = 15;
const TOTAL_FRAMES = FPS * DURATION_SEC; // 450 frames
const OUTPUT_VIDEO = '/home/container/data/omp-agent/work/b96786850bcd/motion_showreel_2026.mp4';
const TEMP_AUDIO = '/tmp/showreel_audio.wav';

// --- 1. GENERATE AUDIO SOUNDTRACK ---
function generateAudio(filename) {
  const sampleRate = 44100;
  const numSamples = Math.floor(DURATION_SEC * sampleRate);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // WAV Header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // 120 BPM Rhythmic Clock (Beat every 0.5s)
    const beatPhase = (t % 0.5);

    // Deep Sub-Kick on every beat
    if (beatPhase < 0.18) {
      const kickFreq = 140 * Math.exp(-beatPhase * 28) + 42;
      const kickEnv = Math.exp(-beatPhase * 22);
      sample += Math.sin(2 * Math.PI * kickFreq * beatPhase) * kickEnv * 0.5;
    }

    // Hi-hat mechanical tick on off-beats
    const hatPhase = ((t + 0.25) % 0.5);
    if (hatPhase < 0.04) {
      const noise = (Math.random() * 2 - 1);
      const hatEnv = Math.exp(-hatPhase * 80);
      sample += noise * hatEnv * 0.15;
    }

    // Risers before cuts
    const addRiser = (start, end) => {
      if (t >= start && t <= end) {
        const p = (t - start) / (end - start);
        const f = 180 + p * p * 750;
        sample += Math.sin(2 * Math.PI * f * t) * (p * 0.28);
      }
    };
    addRiser(2.4, 3.0);
    addRiser(5.4, 6.0);
    addRiser(8.9, 9.5);

    // Climax Impact Drop at 9.5s
    if (t >= 9.5 && t < 10.8) {
      const dropP = t - 9.5;
      const dropFreq = 110 * Math.exp(-dropP * 10) + 38;
      sample += Math.sin(2 * Math.PI * dropFreq * dropP) * Math.exp(-dropP * 3) * 0.6;
      sample += (Math.random() * 2 - 1) * Math.exp(-dropP * 18) * 0.25;
    }

    // Double-time rhythmic synth arp in Act II & IV
    if ((t >= 3.0 && t < 6.0) || (t >= 9.5 && t < 12.5)) {
      const subBeat = (t % 0.125);
      const arpNotes = [220, 261.6, 329.6, 392, 440];
      const noteIdx = Math.floor((t * 8) % arpNotes.length);
      const noteFreq = arpNotes[noteIdx];
      sample += Math.sin(2 * Math.PI * noteFreq * t) * Math.exp(-subBeat * 30) * 0.12;
    }

    // Warm Ambient Synth Pad in Act I & V
    const padEnv = t < 3 ? 0.18 : (t >= 12.5 ? 0.2 * Math.max(0, 1 - (t - 14) / 1) : 0.05);
    sample += (Math.sin(2 * Math.PI * 110 * t) + 0.5 * Math.sin(2 * Math.PI * 164.8 * t)) * padEnv;

    // Int16 clamp
    sample = Math.max(-1, Math.min(1, sample * 0.85));
    buffer.writeInt16LE(Math.floor(sample * 32767), 44 + i * 2);
  }

  fs.writeFileSync(filename, buffer);
  console.log('[Audio] Procedural soundtrack created:', filename);
}

generateAudio(TEMP_AUDIO);

// --- 2. MATHEMATICAL EASING HELPERS ---
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// 3D Math Helper for Isometric Cube
function rotateX(p, angle) {
  const rad = angle * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos };
}
function rotateY(p, angle) {
  const rad = angle * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: p.x * cos + p.z * sin, y: p.y, z: -p.x * sin + p.z * cos };
}
function rotateZ(p, angle) {
  const rad = angle * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos, z: p.z };
}

// Pre-generate background floating dust particles
const PARTICLES = Array.from({ length: 45 }, () => ({
  x: Math.random() * WIDTH,
  y: Math.random() * HEIGHT,
  size: Math.random() * 2 + 1,
  speed: Math.random() * 0.4 + 0.1,
  alpha: Math.random() * 0.5 + 0.2
}));

// --- 3. SCENE RENDERING PIPELINE ---
const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

function drawFrame(frameIdx) {
  const time = frameIdx / FPS;

  // Background clear
  ctx.fillStyle = '#0c0d12';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Technical Background Grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 1;
  for (let x = 0; x < WIDTH; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < HEIGHT; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }

  // Draw floating particles
  ctx.fillStyle = '#ffffff';
  PARTICLES.forEach(p => {
    const curY = (p.y - frameIdx * p.speed * 1.5 + HEIGHT * 5) % HEIGHT;
    ctx.globalAlpha = p.alpha * 0.6;
    ctx.beginPath();
    ctx.arc(p.x, curY, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1.0;

  // Top & Bottom Studio HUD
  drawHUD(time, frameIdx);

  // --- ACT DISPATCHER ---
  if (frameIdx < 90) {
    // Act I: Opening & Monolith Reveal (0s - 3s)
    drawAct1(frameIdx, time);
  } else if (frameIdx < 180) {
    // Act II: Kinetic Marquee & Momentum (3s - 6s)
    drawAct2(frameIdx - 90, time);
  } else if (frameIdx < 285) {
    // Act III: 3D Wireframe Geometry & Depth (6s - 9.5s)
    drawAct3(frameIdx - 180, time);
  } else if (frameIdx < 375) {
    // Act IV: High-Octane Climax & Radial Motion (9.5s - 12.5s)
    drawAct4(frameIdx - 285, time);
  } else {
    // Act V: Minimalist Monogram Lockup & Resolution (12.5s - 15s)
    drawAct5(frameIdx - 375, time);
  }

  // Act Transitions Overlays
  drawTransitions(frameIdx);
}

// Studio HUD overlay
function drawHUD(time, frame) {
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px InterRegular';

  // Top Left
  ctx.fillText('STUDIO YUKI // MOTION LAB', 48, 42);

  // Top Right
  const timecode = `00:00:${String(Math.floor(time)).padStart(2, '0')}:${String(frame % 30).padStart(2, '0')}`;
  ctx.textAlign = 'right';
  ctx.fillText(timecode, WIDTH - 48, 42);
  ctx.textAlign = 'left';

  // Bottom Left Coordinates
  ctx.fillStyle = '#475569';
  ctx.fillText('SYS.LOC [ 35.6895°N // 139.6917°E ]', 48, HEIGHT - 36);

  // Bottom Right Frame Count
  ctx.textAlign = 'right';
  ctx.fillText(`FRAME ${String(frame).padStart(4, '0')} / 0450 [ 60.0 FPS ]`, WIDTH - 48, HEIGHT - 36);
  ctx.textAlign = 'left';

  // Corner Crosshairs
  drawCrosshair(48, 48);
  drawCrosshair(WIDTH - 48, 48);
  drawCrosshair(48, HEIGHT - 48);
  drawCrosshair(WIDTH - 48, HEIGHT - 48);
}

function drawCrosshair(x, y) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y);
  ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8);
  ctx.stroke();
}

// --- ACT I: OPENING & EDITORIAL REVEAL (0s - 3s) ---
function drawAct1(f, t) {
  const p = clamp(f / 70, 0, 1);
  const ep = easeOutExpo(p);

  // Rotating outer aperture ring
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.rotate(t * 0.6);
  ctx.strokeStyle = 'rgba(41, 82, 255, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 12]);
  ctx.beginPath();
  ctx.arc(0, 0, 200 * ep, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Category Pill
  ctx.save();
  const pillP = clamp(f / 40, 0, 1);
  const pillY = 240 - (1 - easeOutCubic(pillP)) * 40;
  ctx.globalAlpha = pillP;
  ctx.fillStyle = 'rgba(41, 82, 255, 0.12)';
  ctx.strokeStyle = 'rgba(41, 82, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(WIDTH / 2 - 120, pillY, 240, 32, 16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#60a5fa';
  ctx.font = '11px InterBold';
  ctx.textAlign = 'center';
  ctx.fillText('• 2026 VISUAL SHOWREEL •', WIDTH / 2, pillY + 20);
  ctx.restore();

  // Big Bold Monolith Text Reveal
  ctx.save();
  const titleP = clamp((f - 15) / 50, 0, 1);
  const titleEase = easeOutExpo(titleP);

  // Clipping box for masked slide-up
  ctx.beginPath();
  ctx.rect(0, 280, WIDTH, 160);
  ctx.clip();

  const textY = 400 - (titleEase * 90);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f8f9fa';
  ctx.font = '82px InterBold';
  ctx.fillText('STUDIO YUKI', WIDTH / 2, textY);

  ctx.restore();

  // Subtitle with tracking
  if (f > 35) {
    const subP = clamp((f - 35) / 40, 0, 1);
    ctx.save();
    ctx.globalAlpha = subP;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5338'; // Tangerine Accent
    ctx.font = '14px InterBold';
    ctx.fillText('MOTION DESIGN & CREATIVE DIRECTION', WIDTH / 2, 440);
    ctx.restore();
  }
}

// --- ACT II: KINETIC MOMENTUM & DUAL MARQUEE (3s - 6s) ---
function drawAct2(f, t) {
  const enterP = clamp(f / 20, 0, 1);
  const enterEase = easeOutCubic(enterP);

  // Background dynamic angled bar
  ctx.save();
  ctx.rotate(-6 * Math.PI / 180);
  ctx.fillStyle = 'rgba(41, 82, 255, 0.04)';
  ctx.fillRect(-200, 200, WIDTH + 400, 320);
  ctx.restore();

  // Marquee Row 1 (Moving Left, Solid White)
  ctx.save();
  ctx.font = '76px InterBold';
  ctx.fillStyle = '#ffffff';
  const offset1 = -(f * 14) % 1800;
  for (let i = -1; i < 4; i++) {
    ctx.fillText('KINETIC RHYTHM • TYPOGRAPHY • ', offset1 + i * 1400, 260);
  }
  ctx.restore();

  // Marquee Row 2 (Moving Right, Outline/Stroke Only)
  ctx.save();
  ctx.font = '76px InterBold';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2;
  const offset2 = (f * 12) % 1800 - 1000;
  for (let i = -1; i < 4; i++) {
    ctx.strokeText('SPATIAL DEPTH • BOLD VISION • ', offset2 + i * 1400, 390);
  }
  ctx.restore();

  // Marquee Row 3 (Moving Left, Tangerine Accent)
  ctx.save();
  ctx.font = '76px InterBold';
  ctx.fillStyle = '#ff5338';
  const offset3 = -(f * 18) % 1800;
  for (let i = -1; i < 4; i++) {
    ctx.fillText('EXPLORE DIMENSION • MOMENTUM • ', offset3 + i * 1400, 520);
  }
  ctx.restore();

  // Hero Floating Badge in the center
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.rotate(Math.sin(t * 3) * 0.1);
  ctx.scale(enterEase, enterEase);

  // Glass Card
  ctx.fillStyle = 'rgba(12, 13, 18, 0.88)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-140, -45, 280, 90, 20);
  ctx.fill();
  ctx.stroke();

  // Glowing corner accents
  ctx.fillStyle = '#2952ff';
  ctx.beginPath();
  ctx.arc(-110, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f8f9fa';
  ctx.font = '22px InterBold';
  ctx.textAlign = 'center';
  ctx.fillText('ACT II // VELOCITY', 10, 8);
  ctx.restore();
}

// --- ACT III: 3D WIREFRAME GEOMETRY & DEPTH (6s - 9.5s) ---
function drawAct3(f, t) {
  // 3D Cube Vertices in local space
  const size = 110;
  let vertices = [
    { x: -size, y: -size, z: -size },
    { x:  size, y: -size, z: -size },
    { x:  size, y:  size, z: -size },
    { x: -size, y:  size, z: -size },
    { x: -size, y: -size, z:  size },
    { x:  size, y: -size, z:  size },
    { x:  size, y:  size, z:  size },
    { x: -size, y:  size, z:  size }
  ];

  // Rotate vertices dynamically
  const rotAngleX = f * 1.8;
  const rotAngleY = f * 2.4;
  const rotAngleZ = f * 0.9;

  const projected = vertices.map(v => {
    let r = rotateX(v, rotAngleX);
    r = rotateY(r, rotAngleY);
    r = rotateZ(r, rotAngleZ);
    // Perspective projection
    const fov = 450;
    const distance = 400;
    const factor = fov / (fov + r.z + distance);
    return {
      x: WIDTH / 2 + r.x * factor * 1.6,
      y: HEIGHT / 2 + r.y * factor * 1.6,
      z: r.z
    };
  });

  // Connecting Edges
  const edges = [
    [0,1], [1,2], [2,3], [3,0], // back face
    [4,5], [5,6], [6,7], [7,4], // front face
    [0,4], [1,5], [2,6], [3,7]  // connecting struts
  ];

  // Draw 3D Cube Edges with Neon Gradient glow
  ctx.lineWidth = 2.5;
  edges.forEach(([i, j]) => {
    const p1 = projected[i];
    const p2 = projected[j];
    const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
    grad.addColorStop(0, '#2952ff');
    grad.addColorStop(1, '#ff5338');
    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  });

  // Draw Glowing Vertices
  projected.forEach(p => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Left Side Technical Readout
  ctx.fillStyle = '#f8f9fa';
  ctx.font = '28px InterBold';
  ctx.fillText('GEOMETRIC DISCIPLINE', 120, 320);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px InterRegular';
  ctx.fillText('ROTATION MATRIX // [3D ISOMETRIC ENGINE]', 120, 345);
  ctx.fillText(`AXIS X: ${(rotAngleX % 360).toFixed(1)}°`, 120, 375);
  ctx.fillText(`AXIS Y: ${(rotAngleY % 360).toFixed(1)}°`, 120, 395);
  ctx.fillText(`AXIS Z: ${(rotAngleZ % 360).toFixed(1)}°`, 120, 415);

  // Right Side Audio Visualizer EQ Bars
  const barCount = 10;
  const startX = WIDTH - 260;
  for (let b = 0; b < barCount; b++) {
    const wave = Math.sin(t * 12 + b * 0.8) * 0.5 + 0.5;
    const barHeight = wave * 90 + 15;
    ctx.fillStyle = b % 2 === 0 ? '#2952ff' : '#ff5338';
    ctx.fillRect(startX + b * 12, HEIGHT / 2 + 45 - barHeight, 6, barHeight);
  }
}

// --- ACT IV: HIGH-OCTANE CLIMAX & RADIAL MOTION (9.5s - 12.5s) ---
function drawAct4(f, t) {
  // Climax background: Inverted crisp light background at the start of drop
  const isFlash = f < 6 || (f > 45 && f < 50);

  if (isFlash) {
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  const textColor = isFlash ? '#0c0d12' : '#ffffff';

  // Rotating Circular Radial Typography
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.rotate(t * 1.4);

  const radialRadius = 240;
  const radialText = '✦ CRAFT ✦ INNOVATION ✦ MOVEMENT ✦ DISRUPTION ✦ IDENTITY ✦ ';
  ctx.font = '13px InterBold';
  ctx.fillStyle = isFlash ? '#2952ff' : '#60a5fa';

  const charStep = (Math.PI * 2) / radialText.length;
  for (let i = 0; i < radialText.length; i++) {
    ctx.save();
    ctx.rotate(i * charStep);
    ctx.fillText(radialText[i], 0, -radialRadius);
    ctx.restore();
  }
  ctx.restore();

  // Giant Center Wordmark Slam (CRAFT / ELEVATE / BOLD)
  let word = 'CRAFT';
  if (f > 30 && f <= 60) word = 'INNOVATION';
  if (f > 60) word = 'ELEVATE';

  const wordAge = (f % 30) / 30;
  const scale = 1.0 + (1 - easeOutExpo(wordAge)) * 0.4;

  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.scale(scale, scale);
  ctx.textAlign = 'center';

  // Echo Outline Shadow
  ctx.strokeStyle = isFlash ? 'rgba(0,0,0,0.15)' : 'rgba(255, 83, 56, 0.4)';
  ctx.lineWidth = 3;
  ctx.font = '110px InterBold';
  ctx.strokeText(word, 8, 38);

  // Main Solid Hero Text
  ctx.fillStyle = textColor;
  ctx.fillText(word, 0, 35);
  ctx.restore();

  // Burst accent lines
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.strokeStyle = isFlash ? '#ff5338' : '#2952ff';
  ctx.lineWidth = 2;
  const burstCount = 8;
  for (let b = 0; b < burstCount; b++) {
    const angle = b * (Math.PI / 4) + t * 0.5;
    const len = 40 + Math.sin(t * 10 + b) * 20;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 160, Math.sin(angle) * 160);
    ctx.lineTo(Math.cos(angle) * (160 + len), Math.sin(angle) * (160 + len));
    ctx.stroke();
  }
  ctx.restore();
}

// --- ACT V: RESOLUTION & BRAND LOCKUP (12.5s - 15s) ---
function drawAct5(f, t) {
  const enterP = clamp(f / 35, 0, 1);
  const enterEase = easeOutCubic(enterP);

  // Elegant Monogram Emblem
  ctx.save();
  ctx.translate(WIDTH / 2, 270);
  ctx.scale(enterEase, enterEase);

  // Interlocking Rings
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-22, 0, 40, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#2952ff';
  ctx.beginPath();
  ctx.arc(22, 0, 40, 0, Math.PI * 2);
  ctx.stroke();

  // Tangerine Core Point
  ctx.fillStyle = '#ff5338';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Main Studio Title
  ctx.save();
  ctx.globalAlpha = enterEase;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f8f9fa';
  ctx.font = '54px InterBold';
  ctx.fillText('STUDIO YUKI', WIDTH / 2, 400);

  // Subtitle
  ctx.fillStyle = '#60a5fa';
  ctx.font = '14px InterBold';
  ctx.fillText('MOTION LAB // CREATIVE DIRECTION', WIDTH / 2, 435);

  // Frosted Pill Container
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(WIDTH / 2 - 130, 465, 260, 34, 17);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px InterRegular';
  ctx.fillText('SELECTED WORKS • 2026', WIDTH / 2, 486);
  ctx.restore();
}

// --- TRANSITIONS & CINEMATIC FADES ---
function drawTransitions(frame) {
  // Scene 1 to Scene 2 (around frame 85 - 90)
  if (frame >= 85 && frame < 90) {
    const p = (frame - 85) / 5;
    ctx.fillStyle = `rgba(255, 255, 255, ${p * 0.8})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Scene 2 to Scene 3 (around frame 175 - 180): Vertical Split Wipe
  if (frame >= 175 && frame < 180) {
    const p = (frame - 175) / 5;
    ctx.fillStyle = '#2952ff';
    ctx.fillRect(0, 0, WIDTH * p, HEIGHT);
  }

  // Scene 3 to Scene 4 (around frame 280 - 285): White Flash
  if (frame >= 282 && frame < 285) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Final Outro Fade to Black (frame 425 - 450)
  if (frame >= 425) {
    const fade = clamp((frame - 425) / 24, 0, 1);
    ctx.fillStyle = `rgba(12, 13, 18, ${fade})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

// --- 4. RENDER PIPELINE TO FFMPEG ---
console.log(`[Render] Starting video generation: ${TOTAL_FRAMES} frames @ ${FPS} fps...`);
const startTime = Date.now();

const ffmpegArgs = [
  '-y',
  '-f', 'image2pipe',
  '-vcodec', 'png',
  '-r', String(FPS),
  '-i', '-',
  '-i', TEMP_AUDIO,
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-preset', 'fast',
  '-crf', '19',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-shortest',
  '-movflags', '+faststart',
  OUTPUT_VIDEO
];

const ffmpegProc = spawn('ffmpeg', ffmpegArgs);

ffmpegProc.stderr.on('data', (d) => {
  // Debug log jika diperlukan
});

ffmpegProc.on('close', (code) => {
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  if (code === 0) {
    const stats = fs.statSync(OUTPUT_VIDEO);
    console.log(`[Success] Video rendered in ${duration}s!`);
    console.log(`[Output] ${OUTPUT_VIDEO} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  } else {
    console.error(`[Error] FFmpeg exited with code ${code}`);
  }
});

// Stream all frames sequentially
(async function runRender() {
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    drawFrame(i);
    const pngBuffer = canvas.toBuffer('image/png');
    
    // Write to ffmpeg stdin with backpressure handling
    if (!ffmpegProc.stdin.write(pngBuffer)) {
      await new Promise(resolve => ffmpegProc.stdin.once('drain', resolve));
    }

    if (i % 60 === 0 || i === TOTAL_FRAMES - 1) {
      console.log(`[Progress] Frame ${i + 1}/${TOTAL_FRAMES} (${Math.round((i + 1) / TOTAL_FRAMES * 100)}%)`);
    }
  }
  ffmpegProc.stdin.end();
})();

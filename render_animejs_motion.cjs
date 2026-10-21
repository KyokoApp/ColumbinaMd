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
const OUTPUT_VIDEO = '/home/container/data/omp-agent/work/b96786850bcd/animejs_motion_15s.mp4';
const TEMP_AUDIO = '/tmp/animejs_motion_audio.wav';

// --- PALETTE ---
const PALETTE = {
  bg: '#0f1013',
  bgCard: '#18191e',
  accentRed: '#ff4b4b',
  accentOrange: '#ff7d36',
  accentYellow: '#ffa828',
  accentCyan: '#2cd0df',
  accentPurple: '#9457eb',
  accentGreen: '#3dd68c',
  white: '#f6f4f2',
  gray: '#85827e',
  darkGray: '#262422',
};

// --- SYNTHESIZE 128 BPM AUDIO TRACK ---
function generateAudio(filename) {
  const sampleRate = 44100;
  const numSamples = Math.floor(DURATION_SEC * sampleRate);
  const buffer = Buffer.alloc(44 + numSamples * 2);

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

  const BPM = 128;
  const beatSec = 60 / BPM; // ~0.46875s

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let s = 0;

    const beatNum = t / beatSec;
    const beatIndex = Math.floor(beatNum);
    const beatFrac = beatNum - beatIndex;

    // 1. Kick Drum (Punch on every beat, drops before transitions)
    const kickMute = (t >= 6.8 && t < 7.2) || (t >= 14.2);
    if (!kickMute && beatFrac < 0.2) {
      const kf = 150 * Math.exp(-beatFrac * 30) + 45;
      const kEnv = Math.exp(-beatFrac * 22);
      s += Math.sin(2 * Math.PI * kf * (beatFrac * beatSec)) * kEnv * 0.65;
    }

    // 2. Snare / Clap on beats 2 and 4
    if (beatIndex >= 4 && t < 14.0 && (beatIndex % 2 === 1) && beatFrac < 0.22) {
      const noise = (Math.random() * 2 - 1) * Math.exp(-beatFrac * 24);
      const tone = Math.sin(2 * Math.PI * 240 * (beatFrac * beatSec)) * Math.exp(-beatFrac * 28);
      s += (noise * 0.35 + tone * 0.25) * 0.55;
    }

    // 3. Hi-hats 16th notes
    const sixteenth = (beatNum * 4) % 1;
    if (t > 1.5 && t < 14.2 && sixteenth < 0.12) {
      s += (Math.random() * 2 - 1) * Math.exp(-sixteenth * 35) * 0.15;
    }

    // 4. Synth Bass Arp
    if (t >= 3.5 && t < 14.0) {
      const notes = [110, 130.8, 146.8, 164.8]; // A2, C3, D3, E3
      const noteIdx = Math.floor(beatNum * 2) % notes.length;
      const f = notes[noteIdx];
      const noteFrac = (beatNum * 2) % 1;
      s += Math.sin(2 * Math.PI * f * t) * Math.exp(-noteFrac * 6) * 0.25;
    }

    // 5. Climax Riser
    if (t >= 13.0 && t < 14.5) {
      const rPhase = (t - 13.0) / 1.5;
      s += Math.sin(2 * Math.PI * (200 + rPhase * 700) * t) * rPhase * 0.2;
    }

    // Fade in & out
    let master = 1;
    if (t < 0.1) master = t / 0.1;
    if (t > 14.5) master = (15.0 - t) / 0.5;

    s = Math.max(-1, Math.min(1, s * master));
    buffer.writeInt16LE(Math.floor(s * 32767), 44 + i * 2);
  }

  fs.writeFileSync(filename, buffer);
}

// --- EASING FUNCTIONS ---
function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function easeOutElastic(t) {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
}

// --- RENDER ENGINE ---
const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

generateAudio(TEMP_AUDIO);

const ffmpeg = spawn('ffmpeg', [
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
]);

ffmpeg.stderr.on('data', d => {});

// Helper HUD
function drawHUD(frame, time, label) {
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '12px InterBold';
  ctx.fillText('ANIME.JS // MOTION DESIGN LAB', 40, 36);

  ctx.textAlign = 'right';
  ctx.fillText(`00:${String(Math.floor(time)).padStart(2, '0')}:${String(Math.floor((time % 1) * 100)).padStart(2, '0')} • ${label}`, WIDTH - 40, 36);

  // Corner crosshairs
  function cross(x, y) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y);
    ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8);
    ctx.stroke();
  }
  cross(25, 25);
  cross(WIDTH - 25, 25);
  cross(25, HEIGHT - 25);
  cross(WIDTH - 25, HEIGHT - 25);
  ctx.restore();
}

(async () => {
  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const time = frame / FPS;

    // Dark sleek background
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Subtle background grid
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < WIDTH; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
    }
    for (let y = 0; y < HEIGHT; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
    }
    ctx.restore();

    // ==========================================
    // ACT 1: INTRO & KINETIC TYPOGRAPHY (0 - 3.5s)
    // ==========================================
    if (time < 3.5) {
      drawHUD(frame, time, 'ACT I // KINETIC INTRO');

      const act1Prog = time / 3.5;
      const title = "ANIME.JS";
      const letters = title.split('');

      ctx.save();
      ctx.textAlign = 'center';

      // Kinetic Letters with staggered elastic pop
      letters.forEach((char, idx) => {
        const delay = idx * 0.08;
        const letterTime = Math.max(0, time - delay);
        const p = Math.min(1, letterTime / 0.6);
        const scale = easeOutBack(p);
        const yOffset = (1 - p) * 80;

        ctx.save();
        const letterX = WIDTH / 2 - 200 + idx * 56;
        const letterY = HEIGHT / 2 + yOffset;

        ctx.translate(letterX, letterY);
        ctx.scale(scale, scale);

        ctx.font = '84px BebasNeue';
        if (char === '.') {
          ctx.fillStyle = PALETTE.accentRed;
          ctx.fillText(char, 0, 0);
        } else {
          ctx.fillStyle = PALETTE.white;
          ctx.fillText(char, 0, 0);
        }
        ctx.restore();
      });

      // Subtitle Reveal
      if (time > 0.8) {
        const subP = Math.min(1, (time - 0.8) / 0.5);
        ctx.font = '16px InterBold';
        ctx.fillStyle = `rgba(255, 255, 255, ${easeOutExpo(subP) * 0.8})`;
        ctx.letterSpacing = '4px';
        ctx.fillText('ALL-IN-ONE ANIMATION ENGINE', WIDTH / 2, HEIGHT / 2 + 65);

        // Code chip
        ctx.fillStyle = 'rgba(255, 75, 75, 0.15)';
        ctx.strokeStyle = 'rgba(255, 75, 75, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(WIDTH / 2 - 110, HEIGHT / 2 + 95, 220, 32);
        ctx.fillRect(WIDTH / 2 - 110, HEIGHT / 2 + 95, 220, 32);

        ctx.fillStyle = PALETTE.accentOrange;
        ctx.font = '13px InterBold';
        ctx.fillText('npm i animejs', WIDTH / 2, HEIGHT / 2 + 116);
      }
      ctx.restore();
    }

    // ==========================================
    // ACT 2: STAGGER MATRIX & TRANSFORMS (3.5 - 7.2s)
    // ==========================================
    else if (time >= 3.5 && time < 7.2) {
      drawHUD(frame, time, 'ACT II // STAGGER & TRANSFORMS');
      const tRel = time - 3.5;

      // Stagger Grid on Left/Center
      const cols = 14;
      const rows = 8;
      const spacingX = 42;
      const spacingY = 42;
      const startX = WIDTH / 2 - (cols * spacingX) / 2 + 20;
      const startY = HEIGHT / 2 - (rows * spacingY) / 2 + 10;

      ctx.save();
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Distance from center for radial ripple
          const dx = c - cols / 2;
          const dy = r - rows / 2;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const wave = Math.sin(tRel * 6 - dist * 0.6);
          const dotScale = Math.max(0.2, (wave + 1) * 0.6);

          const px = startX + c * spacingX;
          const py = startY + r * spacingY;

          ctx.beginPath();
          ctx.arc(px, py, 4 * dotScale, 0, Math.PI * 2);
          if (wave > 0.4) {
            ctx.fillStyle = PALETTE.accentRed;
          } else if (wave > -0.2) {
            ctx.fillStyle = PALETTE.accentOrange;
          } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          }
          ctx.fill();
        }
      }
      ctx.restore();

      // Floating Code Badge
      ctx.save();
      ctx.fillStyle = 'rgba(24, 25, 30, 0.9)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      const badgeW = 380;
      const badgeH = 80;
      ctx.fillRect(WIDTH / 2 - badgeW / 2, HEIGHT - 130, badgeW, badgeH);
      ctx.strokeRect(WIDTH / 2 - badgeW / 2, HEIGHT - 130, badgeW, badgeH);

      ctx.font = '13px InterBold';
      ctx.fillStyle = PALETTE.accentYellow;
      ctx.fillText('stagger([1.5, 0.5], { from: "center" })', WIDTH / 2 - badgeW / 2 + 20, HEIGHT - 96);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '12px InterRegular';
      ctx.fillText('RADIAL MATRIX RIPPLE STAGGER', WIDTH / 2 - badgeW / 2 + 20, HEIGHT - 72);
      ctx.restore();
    }

    // ==========================================
    // ACT 3: SPRINGS & DRAGGABLE PHYSICS (7.2 - 11.0s)
    // ==========================================
    else if (time >= 7.2 && time < 11.0) {
      drawHUD(frame, time, 'ACT III // SPRING PHYSICS & MORPH');
      const tRel = time - 7.2;

      // Elastic Spring Oscillating Shapes
      const decay = Math.exp(-tRel * 1.2);
      const springX = Math.sin(tRel * 12) * decay * 220;
      const springScale = 1 + Math.sin(tRel * 15) * decay * 0.4;
      const rot = tRel * 1.5;

      ctx.save();
      ctx.translate(WIDTH / 2 + springX, HEIGHT / 2 - 30);
      ctx.rotate(rot);
      ctx.scale(springScale, springScale);

      // Glowing Poly/Disk
      const gradient = ctx.createLinearGradient(-60, -60, 60, 60);
      gradient.addColorStop(0, PALETTE.accentRed);
      gradient.addColorStop(1, PALETTE.accentPurple);
      ctx.fillStyle = gradient;
      ctx.shadowColor = PALETTE.accentRed;
      ctx.shadowBlur = 24;

      ctx.beginPath();
      ctx.roundRect(-50, -50, 100, 100, [20]);
      ctx.fill();

      ctx.font = '12px InterBold';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText('SPRING', 0, 4);
      ctx.restore();

      // Motion trail
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 75, 75, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(WIDTH / 2 - 220, HEIGHT / 2 - 30);
      ctx.lineTo(WIDTH / 2 + 220, HEIGHT / 2 - 30);
      ctx.stroke();
      ctx.restore();

      // Telemetry Box
      ctx.save();
      ctx.font = '14px InterBold';
      ctx.fillStyle = PALETTE.accentCyan;
      ctx.textAlign = 'center';
      ctx.fillText('createSpring({ stiffness: 120, damping: 6 })', WIDTH / 2, HEIGHT - 110);
      ctx.font = '12px InterRegular';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText('HARMONIC OSCILLATION & REAL-TIME INERTIA', WIDTH / 2, HEIGHT - 85);
      ctx.restore();
    }

    // ==========================================
    // ACT 4: CLOCKWORK & CLIMAX OUTRO (11.0 - 15.0s)
    // ==========================================
    else {
      drawHUD(frame, time, 'ACT IV // CLOCKWORK TIMELINE');
      const tRel = time - 11.0;

      // Concentric clock rings
      ctx.save();
      ctx.translate(WIDTH / 2, HEIGHT / 2 - 20);

      const ringCount = 3;
      for (let r = 1; r <= ringCount; r++) {
        ctx.beginPath();
        ctx.arc(0, 0, r * 70, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 * r})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 12]);
        ctx.stroke();
      }

      // Fast rotating pointers
      const angles = [tRel * 4, -tRel * 2.5, tRel * 6];
      angles.forEach((ang, idx) => {
        ctx.save();
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -60 - idx * 45);
        ctx.strokeStyle = idx === 0 ? PALETTE.accentRed : idx === 1 ? PALETTE.accentYellow : PALETTE.accentCyan;
        ctx.lineWidth = 3 - idx * 0.5;
        ctx.shadowColor = PALETTE.accentRed;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();
      });

      // Central core
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.accentRed;
      ctx.fill();
      ctx.restore();

      // Grand Finale Title
      const textAlpha = Math.min(1, Math.max(0, (tRel - 0.5) / 0.8));
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '48px BebasNeue';
      ctx.fillStyle = `rgba(255, 255, 255, ${textAlpha})`;
      ctx.fillText('UNLEASH THE WEB', WIDTH / 2, HEIGHT - 110);

      ctx.font = '14px InterBold';
      ctx.fillStyle = `rgba(255, 75, 75, ${textAlpha})`;
      ctx.fillText('ANIMEJS.COM // JAVASCRIPT ANIMATION ENGINE', WIDTH / 2, HEIGHT - 80);
      ctx.restore();

      // Fade out on last 0.5s
      if (time > 14.5) {
        const fade = (time - 14.5) / 0.5;
        ctx.fillStyle = `rgba(15, 16, 19, ${fade})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }
    }

    // Stream frame buffer to FFmpeg pipe
    const pngBuf = canvas.toBuffer('image/png');
    if (!ffmpeg.stdin.write(pngBuf)) {
      await new Promise(r => ffmpeg.stdin.once('drain', r));
    }
  }

  ffmpeg.stdin.end();
})();

ffmpeg.on('close', code => {
  console.log(`FFmpeg render finished with code: ${code}`);
  if (fs.existsSync(TEMP_AUDIO)) fs.unlinkSync(TEMP_AUDIO);
});

import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile } from 'fs/promises';

async function generateGFX() {
    const W = 1366;
    const H = 768;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // 1. Base dark background with slight vignette
    const bgGrad = ctx.createRadialGradient(W * 0.55, H * 0.45, 100, W * 0.5, H * 0.5, W * 0.7);
    bgGrad.addColorStop(0, '#0d2827');
    bgGrad.addColorStop(0.5, '#071617');
    bgGrad.addColorStop(1, '#020708');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Halftone / Dot Grid pattern
    ctx.fillStyle = 'rgba(61, 242, 213, 0.08)';
    for (let x = 20; x < W; x += 32) {
        for (let y = 20; y < H; y += 32) {
            ctx.beginPath();
            ctx.arc(x, y, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 3. Huge stylized hollow text in background (like 'KAFKA' in reference)
    ctx.save();
    ctx.font = '900 240px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(61, 242, 213, 0.05)';
    ctx.lineWidth = 3;
    ctx.strokeText('FIREFLY', W / 2, H / 2 + 80);
    ctx.restore();

    // 4. Glowing Neon Polygon / Wings Behind Character (like the pink wings behind Kafka)
    ctx.save();
    ctx.shadowColor = '#3df2d5';
    ctx.shadowBlur = 40;
    ctx.fillStyle = 'rgba(16, 70, 65, 0.45)';
    ctx.strokeStyle = '#3df2d5';
    ctx.lineWidth = 2.5;

    // Left Wing
    ctx.beginPath();
    ctx.moveTo(W * 0.5, H * 0.3);
    ctx.lineTo(W * 0.22, H * 0.12);
    ctx.lineTo(W * 0.32, H * 0.35);
    ctx.lineTo(W * 0.2, H * 0.38);
    ctx.lineTo(W * 0.36, H * 0.55);
    ctx.lineTo(W * 0.5, H * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Wing
    ctx.beginPath();
    ctx.moveTo(W * 0.5, H * 0.3);
    ctx.lineTo(W * 0.78, H * 0.12);
    ctx.lineTo(W * 0.68, H * 0.35);
    ctx.lineTo(W * 0.8, H * 0.38);
    ctx.lineTo(W * 0.64, H * 0.55);
    ctx.lineTo(W * 0.5, H * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 5. Outer HUD glowing frame
    ctx.save();
    ctx.strokeStyle = '#3df2d5';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#3df2d5';
    ctx.shadowBlur = 25;
    ctx.strokeRect(40, 40, W - 80, H - 80);
    ctx.restore();

    // 6. Draw Firefly (Official 100% transparent PNG from Wiki)
    const url = 'https://static.wikia.nocookie.net/houkai-star-rail/images/3/38/Character_Firefly_Splash_Art.png/revision/latest?cb=20241007220547';
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const imgBuf = Buffer.from(await res.arrayBuffer());
    const charImg = await loadImage(imgBuf);

    // Scaling & position: center-right character
    const charH = 800;
    const charW = (charImg.width / charImg.height) * charH;
    ctx.save();
    ctx.shadowColor = 'rgba(61, 242, 213, 0.4)';
    ctx.shadowBlur = 35;
    ctx.drawImage(charImg, (W / 2) - (charW / 2) + 20, H - charH + 50, charW, charH);
    ctx.restore();

    // 7. Top Navigation Pill Menu
    ctx.save();
    const navItems = ['Search', 'Profile', 'Gallery', 'Character', 'PL'];
    let navX = W - 100;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'right';
    for (let i = navItems.length - 1; i >= 0; i--) {
        const item = navItems[i];
        const m = ctx.measureText(item);
        if (i === 0) {
            ctx.save();
            ctx.fillStyle = 'rgba(61, 242, 213, 0.25)';
            ctx.strokeStyle = '#3df2d5';
            ctx.lineWidth = 1.5;
            ctx.shadowColor = '#3df2d5';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.roundRect(navX - m.width - 32, 55, m.width + 32, 32, [16]);
            ctx.fill(); ctx.stroke();
            ctx.restore();
            ctx.fillStyle = '#ffffff';
            ctx.fillText(item, navX - 16, 77);
        } else {
            ctx.fillStyle = i === 1 ? '#a8ff78' : '#eafbf9';
            ctx.fillText(item, navX, 77);
            navX -= (m.width + 32);
        }
    }
    // Top Left Settings Icons & Dots
    ctx.fillStyle = 'rgba(61, 242, 213, 0.7)';
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(80 + (i * 18), 70, 4.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // 8. LEFT HERO TITLE: "FIREFLY"
    ctx.save();
    ctx.shadowColor = 'rgba(61, 242, 213, 0.8)';
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 76px sans-serif';
    ctx.fillText('FIREFLY', 85, 210);

    // Subtitle quote
    ctx.font = 'bold 15px sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillStyle = 'rgba(168, 255, 120, 0.9)';
    ctx.fillText('\" I WILL SET THE SEAS ABLAZE \"', 88, 245);

    // Design / Credit text
    ctx.font = '14px sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillText('Design by Yuki GFX', 88, 275);

    // Play Now outline button
    ctx.strokeStyle = '#3df2d5';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#3df2d5';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(88, 305, 140, 38, [6]);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('Play Now', 125, 330);
    ctx.restore();

    // 9. Floating Speech / Capsule Pills Over Character
    function drawGfxPill(x, y, w, h, text, isGlowing = false, sub = null) {
        ctx.save();
        ctx.fillStyle = 'rgba(8, 26, 27, 0.88)';
        ctx.strokeStyle = isGlowing ? '#a8ff78' : '#3df2d5';
        ctx.lineWidth = 2;
        ctx.shadowColor = isGlowing ? '#a8ff78' : '#3df2d5';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, [h / 2]);
        ctx.fill(); ctx.stroke();

        ctx.font = '900 18px sans-serif';
        ctx.fillStyle = isGlowing ? '#a8ff78' : '#3df2d5';
        ctx.textAlign = 'center';
        ctx.fillText(text, x + (w / 2), y + (sub ? 26 : (h / 2) + 6));

        if (sub) {
            ctx.font = '10px sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillText(sub, x + (w / 2), y + 42);
        }
        ctx.restore();
    }

    drawGfxPill(W * 0.28, H * 0.46, 210, 48, 'Dsing by Yuki');
    drawGfxPill(W * 0.56, H * 0.52, 230, 52, 'FIREFLY', true);
    drawGfxPill(W * 0.60, H * 0.76, 240, 46, 'demo character', false);

    // 10. Left Speech Box with pointer
    ctx.save();
    ctx.fillStyle = 'rgba(6, 20, 21, 0.85)';
    ctx.strokeStyle = '#3df2d5';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#3df2d5';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(85, 410, 240, 150, [6]);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '10.5px sans-serif';
    const leftText = [
        'ホタル (Firefly) はステラロンハンターの',
        'メンバーであり、機械装甲「サム」を',
        '纏って戦う少女。遺伝子改造によって',
        '兵器として誕生した彼女は、エントロピー',
        '喪失症の運命に抗い、自らの意志で',
        '生きることを望んでいる。'
    ];
    leftText.forEach((t, i) => ctx.fillText(t, 98, 435 + (i * 20)));

    drawGfxPill(180, 575, 140, 38, 'Profile');
    ctx.restore();

    // 11. RIGHT SECTION: Giant Stylized Script Title
    ctx.save();
    ctx.font = 'italic bold 82px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#3df2d5';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#3df2d5';
    ctx.shadowBlur = 24;
    ctx.textAlign = 'right';
    ctx.fillText('YUKI', W - 85, 230);
    ctx.strokeText('YUKI', W - 85, 230);

    ctx.font = 'italic bold 52px sans-serif';
    ctx.fillStyle = '#a8ff78';
    ctx.shadowColor = '#a8ff78';
    ctx.shadowBlur = 20;
    ctx.fillText('US', W - 85, 285);
    ctx.strokeText('US', W - 85, 285);

    ctx.font = 'italic 14px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.shadowBlur = 0;
    ctx.fillText('Do you love me? / Desing By: Yuki', W - 85, 320);
    ctx.restore();

    // 12. Right Speech Box with pointer
    ctx.save();
    ctx.fillStyle = 'rgba(6, 20, 21, 0.85)';
    ctx.strokeStyle = '#a8ff78';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#a8ff78';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(W - 350, 480, 230, 160, [6]);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '10.5px sans-serif';
    const rightText = [
        '私は火に向かって飛ぶ蛾のように、',
        '燃え尽きる運命だとしても構わない。',
        'でも、この短い命の中で、私は私として',
        '生きたい。サムという冷たい鋼鉄ではなく、',
        'ホタルという温もりを持った一人の人間として、',
        'あなたと共に歩みたい。'
    ];
    rightText.forEach((t, i) => ctx.fillText(t, W - 336, 510 + (i * 20)));
    ctx.restore();

    // 13. Bottom Right Credits Box
    ctx.save();
    ctx.fillStyle = 'rgba(6, 20, 21, 0.88)';
    ctx.strokeStyle = '#3df2d5';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#3df2d5';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.roundRect(W - 240, H - 150, 170, 95, [8]);
    ctx.fill(); ctx.stroke();

    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('This design was', W - 225, H - 125);
    ctx.fillText('made by Yuki', W - 225, H - 108);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '9.5px sans-serif';
    ctx.fillText('in - Honkai Star Rail', W - 225, H - 85);
    ctx.fillStyle = '#3df2d5';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('● Firefly', W - 225, H - 68);
    ctx.restore();

    const buf = canvas.toBuffer('image/png');
    await writeFile('firefly-gfx-v2.png', buf);
    console.log('SUCCESS V2! Size:', buf.length);
}

generateGFX().catch(console.error);

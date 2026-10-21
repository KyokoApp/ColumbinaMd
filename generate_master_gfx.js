import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { writeFile } from 'fs/promises';

async function generateMasterGFX() {
    // 1. Register Premium Fonts
    try {
        GlobalFonts.registerFromPath('Montserrat.ttf', 'Montserrat');
        GlobalFonts.registerFromPath('Caveat.ttf', 'Caveat');
        GlobalFonts.registerFromPath('NotoSansJP.ttf', 'NotoSansJP');
        GlobalFonts.registerFromPath('/home/container/plugins/maker/fonts/Inter-SemiBold.ttf', 'InterSemi');
    } catch (e) {
        console.error('Font load error:', e);
    }

    const W = 1366;
    const H = 768;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // ================= 1. DYNAMIC ATMOSPHERIC BACKGROUND =================
    // Base deep cosmic void
    ctx.fillStyle = '#030c0d';
    ctx.fillRect(0, 0, W, H);

    // Dramatic top-left teal/mint aurora gradient (matching the vibrant magenta in Kafka)
    const auroraGrad = ctx.createRadialGradient(0, 0, 60, 280, 260, 700);
    auroraGrad.addColorStop(0, 'rgba(45, 244, 194, 0.55)');
    auroraGrad.addColorStop(0.3, 'rgba(25, 175, 150, 0.32)');
    auroraGrad.addColorStop(0.65, 'rgba(10, 75, 70, 0.15)');
    auroraGrad.addColorStop(1, 'rgba(3, 12, 13, 0)');
    ctx.fillStyle = auroraGrad;
    ctx.fillRect(0, 0, W, H);

    // Top-right subtle starlight glow
    const rightGlow = ctx.createRadialGradient(W - 80, 80, 40, W - 80, 80, 520);
    rightGlow.addColorStop(0, 'rgba(45, 244, 194, 0.28)');
    rightGlow.addColorStop(0.5, 'rgba(168, 255, 120, 0.12)');
    rightGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = rightGlow;
    ctx.fillRect(0, 0, W, H);

    // Subtle fine dot grid (HUD matrix aesthetic)
    ctx.fillStyle = 'rgba(45, 244, 194, 0.06)';
    for (let x = 24; x < W; x += 28) {
        for (let y = 24; y < H; y += 28) {
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ================= 2. GIANT BACKGROUND WATERMARK OUTLINE =================
    ctx.save();
    ctx.font = '900 240px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(45, 244, 194, 0.05)';
    ctx.lineWidth = 2.5;
    ctx.strokeText('FIREFLY', W / 2, H / 2 + 75);
    ctx.restore();

    // ================= 3. SHARP CYBER WINGS / NEON GEOMETRY =================
    // Vibrant solid neon mint/teal wings with sharp geometric polygon cutouts
    ctx.save();
    ctx.shadowColor = '#2df4c2';
    ctx.shadowBlur = 45;
    ctx.strokeStyle = '#2df4c2';
    ctx.lineWidth = 3;

    const wingGrad = ctx.createLinearGradient(W * 0.2, H * 0.1, W * 0.8, H * 0.6);
    wingGrad.addColorStop(0, 'rgba(45, 244, 194, 0.9)');
    wingGrad.addColorStop(0.5, 'rgba(20, 160, 140, 0.78)');
    wingGrad.addColorStop(1, 'rgba(10, 80, 75, 0.7)');
    ctx.fillStyle = wingGrad;

    // Left Geometric Wing
    ctx.beginPath();
    ctx.moveTo(W * 0.48, H * 0.26);
    ctx.lineTo(W * 0.22, H * 0.11);
    ctx.lineTo(W * 0.33, H * 0.32);
    ctx.lineTo(W * 0.19, H * 0.36);
    ctx.lineTo(W * 0.35, H * 0.52);
    ctx.lineTo(W * 0.48, H * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Geometric Wing
    ctx.beginPath();
    ctx.moveTo(W * 0.52, H * 0.26);
    ctx.lineTo(W * 0.78, H * 0.11);
    ctx.lineTo(W * 0.67, H * 0.32);
    ctx.lineTo(W * 0.81, H * 0.36);
    ctx.lineTo(W * 0.65, H * 0.52);
    ctx.lineTo(W * 0.52, H * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // ================= 4. NEON HUD OUTER FRAME =================
    ctx.save();
    ctx.strokeStyle = '#2df4c2';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#2df4c2';
    ctx.shadowBlur = 25;

    // Outer framing
    ctx.strokeRect(40, 40, W - 80, H - 80);

    // Inner subtle thin border
    ctx.strokeStyle = 'rgba(45, 244, 194, 0.25)';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.strokeRect(46, 46, W - 92, H - 92);
    ctx.restore();

    // Corner HUD markers
    function drawCornerBracket(x, y, s, dx, dy) {
        ctx.save();
        ctx.strokeStyle = '#a8ff78';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#a8ff78';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(x, y + (dy * s));
        ctx.lineTo(x, y);
        ctx.lineTo(x + (dx * s), y);
        ctx.stroke();
        ctx.restore();
    }
    drawCornerBracket(34, 34, 25, 1, 1);
    drawCornerBracket(W - 34, 34, 25, -1, 1);
    drawCornerBracket(34, H - 34, 25, 1, -1);
    drawCornerBracket(W - 34, H - 34, 25, -1, -1);

    // ================= 5. DRAW FIREFLY CHARACTER RENDER =================
    const url = 'https://static.wikia.nocookie.net/houkai-star-rail/images/3/38/Character_Firefly_Splash_Art.png/revision/latest?cb=20241007220547';
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const imgBuf = Buffer.from(await res.arrayBuffer());
    const charImg = await loadImage(imgBuf);

    const charH = 830;
    const charW = (charImg.width / charImg.height) * charH;
    ctx.save();
    ctx.shadowColor = 'rgba(45, 244, 194, 0.55)';
    ctx.shadowBlur = 40;
    ctx.drawImage(charImg, (W / 2) - (charW / 2) + 10, H - charH + 55, charW, charH);
    ctx.restore();

    // ================= 6. TOP NAVIGATION BAR =================
    ctx.save();
    // Top Left HUD icons
    ctx.fillStyle = 'rgba(45, 244, 194, 0.85)';
    ctx.shadowColor = '#2df4c2';
    ctx.shadowBlur = 10;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(80 + (i * 18), 70, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // Top Right Nav Items: Search | Profile Gallery Character PL
    const navItems = ['Search', 'Profile', 'Gallery', 'Character', 'PL'];
    let navX = W - 90;
    ctx.font = 'bold 15px Montserrat, sans-serif';
    ctx.textAlign = 'right';
    for (let i = navItems.length - 1; i >= 0; i--) {
        const item = navItems[i];
        const m = ctx.measureText(item);
        if (i === 0) {
            ctx.save();
            ctx.fillStyle = 'rgba(45, 244, 194, 0.25)';
            ctx.strokeStyle = '#2df4c2';
            ctx.lineWidth = 1.5;
            ctx.shadowColor = '#2df4c2';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.roundRect(navX - m.width - 32, 53, m.width + 32, 32, [16]);
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            ctx.fillStyle = '#ffffff';
            ctx.fillText(item, navX - 16, 75);
        } else {
            ctx.fillStyle = i === 1 ? '#ffffff' : 'rgba(255, 255, 255, 0.85)';
            if (i === 1) {
                ctx.shadowColor = '#2df4c2';
                ctx.shadowBlur = 12;
            } else {
                ctx.shadowBlur = 0;
            }
            ctx.fillText(item, navX, 75);
            navX -= (m.width + 32);
        }
    }
    ctx.restore();

    // ================= 7. LEFT HERO TITLE & BUTTONS =================
    ctx.save();
    ctx.font = '900 80px Montserrat, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(45, 244, 194, 0.9)';
    ctx.shadowBlur = 25;
    ctx.fillText('FIREFLY', 80, 215);

    ctx.font = 'bold 15px Montserrat, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.shadowColor = '#2df4c2';
    ctx.shadowBlur = 10;
    ctx.fillText('" THERE COME OVER "', 84, 250);

    ctx.font = '14px Montserrat, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.shadowBlur = 0;
    ctx.fillText('Desing by Yuki', 84, 280);

    // "Play Now" transparent outline button
    ctx.strokeStyle = 'rgba(45, 244, 194, 0.8)';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = '#2df4c2';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.roundRect(84, 308, 140, 38, [6]);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Play Now', 84 + 70, 332);
    ctx.restore();

    // ================= 8. FLOATING FROSTED PILLS OVER CHARACTER =================
    function drawFrostedPill(x, y, w, h, text, neonColor, glow = true) {
        ctx.save();
        ctx.fillStyle = 'rgba(8, 24, 25, 0.78)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 2;
        ctx.shadowColor = glow ? neonColor : 'transparent';
        ctx.shadowBlur = glow ? 20 : 0;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, [h / 2]);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 19px Montserrat, sans-serif';
        ctx.fillStyle = neonColor;
        ctx.textAlign = 'center';
        ctx.shadowColor = neonColor;
        ctx.shadowBlur = 15;
        ctx.fillText(text, x + (w / 2), y + (h / 2) + 7);
        ctx.restore();
    }

    drawFrostedPill(W * 0.28, H * 0.44, 220, 50, 'Dsing by Yuki', '#2df4c2');
    drawFrostedPill(W * 0.58, H * 0.52, 230, 54, 'FIREFLY', '#2df4c2', true);
    drawFrostedPill(W * 0.59, H * 0.78, 240, 48, 'demo character', '#a8ff78');

    // ================= 9. LEFT SPEECH BOX (INDONESIAN LORE) & PROFILE PILL =================
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.roundRect(80, 410, 230, 145, [6]);
    ctx.fill();
    ctx.stroke();

    // Pointer pointing to Profile pill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(220, 555);
    ctx.lineTo(245, 580);
    ctx.lineTo(235, 555);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Clean Indonesian typography (rendering razor sharp without tofu)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.font = '10.5px InterSemi, Montserrat, sans-serif';
    const leftDialogue = [
        'Dia kira, menjadi bagian dari Stellaron',
        'Hunters hanya tentang kehancuran dan',
        'perang tanpa akhir. Namun di dalam',
        'dinginnya baja pelindung SAM, seorang',
        'gadis bernama Firefly selalu bermimpi',
        'untuk hidup sebagai dirinya sendiri dan',
        'melihat indahnya bintang bersama kita.'
    ];
    leftDialogue.forEach((line, idx) => {
        ctx.fillText(line, 92, 432 + (idx * 18));
    });

    drawFrostedPill(180, 575, 140, 42, 'Profile', '#2df4c2');
    ctx.restore();

    // ================= 10. RIGHT SECTION: CURSIVE TITLE "YUKI US" =================
    ctx.save();
    ctx.font = 'bold 105px Caveat, cursive';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2df4c2';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#2df4c2';
    ctx.shadowBlur = 30;
    ctx.fillText('YUKI', W - 80, 220);
    ctx.strokeText('YUKI', W - 80, 220);

    ctx.font = 'bold 75px Caveat, cursive';
    ctx.fillStyle = '#2df4c2';
    ctx.shadowColor = '#2df4c2';
    ctx.shadowBlur = 25;
    ctx.fillText('US', W - 80, 285);
    ctx.strokeText('US', W - 80, 285);

    ctx.font = '14px Montserrat, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.shadowBlur = 0;
    ctx.fillText('Do you love me?', W - 80, 320);
    ctx.fillText('Desing By: Yuki', W - 80, 340);
    ctx.restore();

    // Small capsule "They are crazy girls"
    ctx.save();
    ctx.fillStyle = 'rgba(45, 244, 194, 0.15)';
    ctx.strokeStyle = 'rgba(45, 244, 194, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(W - 240, 390, 160, 28, [14]);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2df4c2';
    ctx.font = 'italic 11px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('They are crazy girls', W - 160, 408);
    ctx.restore();

    // ================= 11. RIGHT SPEECH BOX (JAPANESE TEXT DENGAN NOTO SANS JP) =================
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.roundRect(W - 380, 480, 240, 160, [6]);
    ctx.fill();
    ctx.stroke();

    // Pointer pointing towards demo character pill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(W - 360, 640);
    ctx.lineTo(W - 330, 665);
    ctx.lineTo(W - 340, 640);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Menggunakan NotoSansJP yang sudah di-register sehingga huruf Jepang tampil sempurna
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = '10.5px NotoSansJP';
    const rightDialogue = [
        '私はあなたをすべてだと思っていました。',
        '夢の世界の中で交わした約束を、私は',
        '今でも忘れていません。冷たい装甲に',
        '守られた心の中に、あなたという光が',
        '灯ったのです。火に向かう蛾のように、',
        '私は未来へ向かって飛び続けます。',
        'あなたと共に、あの星の海を越えて。'
    ];
    rightDialogue.forEach((line, idx) => {
        ctx.fillText(line, W - 368, 505 + (idx * 19));
    });
    ctx.restore();

    // ================= 12. BOTTOM RIGHT WATERMARK / CREDITS CARD =================
    ctx.save();
    ctx.fillStyle = 'rgba(10, 25, 26, 0.85)';
    ctx.strokeStyle = 'rgba(45, 244, 194, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#2df4c2';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.roundRect(W - 250, H - 155, 190, 105, [8]);
    ctx.fill();
    ctx.stroke();

    ctx.font = '12px Montserrat, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('This design was', W - 232, H - 130);
    ctx.fillText('made by Yuki', W - 232, H - 112);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = '10px Montserrat, sans-serif';
    ctx.fillText('in - Honkai Star Rail -', W - 232, H - 90);
    ctx.fillText('is represented by bright teal color and', W - 232, H - 76);

    // Menggambar neon dot manual agar tidak pernah jadi kotak tofu
    ctx.beginPath();
    ctx.arc(W - 227, H - 61, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#2df4c2';
    ctx.shadowColor = '#2df4c2';
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.fillStyle = '#2df4c2';
    ctx.font = 'bold 12px Montserrat, sans-serif';
    ctx.fillText('Firefly', W - 216, H - 57);
    ctx.restore();

    // ================= 13. EXPORT ULTRA HD PNG & JPG =================
    const buf = canvas.toBuffer('image/png');
    await writeFile('firefly-gfx-master.png', buf);

    const sharp = (await import('sharp')).default;
    const jpgBuf = await sharp(buf).jpeg({ quality: 95 }).toBuffer();
    await writeFile('firefly-gfx-master.jpg', jpgBuf);
    console.log('RE-RENDER SUCCESS! PNG:', buf.length, 'JPG:', jpgBuf.length);
}

generateMasterGFX().catch(console.error);

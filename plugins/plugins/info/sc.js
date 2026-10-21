import config from '../../config.js'

let handler = async (m, { conn, usedPrefix }) => {
    let text = `🕊️ *COLUMBINAMD — BASEBOT WHATSAPP*\n\n`
    text += `*ColumbinaMd* adalah base bot WhatsApp modular, bersih, dan berkecepatan tinggi yang dibangun menggunakan *Baileys ESM* dengan sistem *Pairing Code Login* tanpa repot scan QR.\n\n`

    text += `┌─ ✦ *KEMAMPUAN FITUR*\n`
    text += `│ • 🔑 *Pairing Code*: Login cepat tanpa scan QR\n`
    text += `│ • ⚡ *Hot-Reload*: Tambah/edit plugin tanpa restart\n`
    text += `│ • 🤖 *5 Model AI*: DeepSeek R1, Gemini, Claude, Qwen, GPT\n`
    text += `│ • 📥 *Downloader*: TikTok No-WM, FB HD, IG, Pinterest\n`
    text += `│ • 🎮 *Game Grup*: Family 100 dengan 600+ soal survei\n`
    text += `│ • 🛡️ *Proteksi Grup*: Anti-link, anti-media & tagall/hidetag\n`
    text += `│ • 🛠️ *Plugin Manager*: .sp, .gp, .dp langsung via chat\n`
    text += `│ • 💻 *Dev Tools*: Evaluasi JavaScript & terminal shell\n`
    text += `└────\n\n`

    text += `┌─ ✦ *INFORMASI PENGEMBANG*\n`
    text += `│ • *Developer* : Natsuki MD (@NatsukiMD)\n`
    text += `│ • *Organisasi*: KyokoApp\n`
    text += `│ • *Lisensi*   : MIT Open Source\n`
    text += `│ • *Repositori*: https://github.com/KyokoApp/ColumbinaMd\n`
    text += `└────\n\n`

    text += `⭐ *Dukung project ini dengan memberikan Star di GitHub!*\n`
    text += `https://github.com/KyokoApp/ColumbinaMd`

    if (config.thumbnail) {
        await conn.sendMessage(m.chat, {
            text,
            contextInfo: {
                externalAdReply: {
                    title: 'ColumbinaMd by KyokoApp & Natsuki MD',
                    body: 'Lightweight & Modular WhatsApp Base Bot',
                    thumbnailUrl: config.thumbnail,
                    sourceUrl: 'https://github.com/KyokoApp/ColumbinaMd',
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m })
    } else {
        await m.reply(text)
    }
}

handler.help = ['sc', 'script', 'sourcecode']
handler.tags = ['info', 'main']
handler.command = /^(sc|script|sourcecode)$/i

export default handler

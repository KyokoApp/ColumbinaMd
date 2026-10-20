import config from '../../config.js'
import { plugins } from '../../lib/plugins.js'

let handler = async (m, { conn, usedPrefix, command }) => {
    // Kelompokkan perintah berdasarkan tags
    const groups = {}

    for (const name in plugins) {
        const plugin = plugins[name]
        if (!plugin || !plugin.help) continue

        const tag = (plugin.tags && plugin.tags[0]) || 'lainnya'
        if (!groups[tag]) groups[tag] = []

        const helps = Array.isArray(plugin.help) ? plugin.help : [plugin.help]
        for (const h of helps) {
            groups[tag].push(h)
        }
    }

    let text = `🤖 *${config.namebot.toUpperCase()}*\n\n`
    text += `👋 Halo, *${m.pushName || 'Kawan'}*!\n`
    text += `Prefix: \`${usedPrefix}\`\n\n`

    for (const [tag, commands] of Object.entries(groups)) {
        text += `┌─ ✦ *${tag.toUpperCase()}*\n`
        for (const cmd of commands) {
            text += `│ • ${usedPrefix}${cmd}\n`
        }
        text += `└────\n\n`
    }

    text += `_Ketik ${usedPrefix}<perintah> untuk menggunakan fitur._\n\n`
    text += `⭐ *Bantu dukung bot ini dengan beri Star di GitHub:*\n`
    text += `https://github.com/KyokoApp/ColumbinaMd`

    // Kirim menu dengan preview gambar thumbnail jika tersedia
    if (config.thumbnail) {
        await conn.sendMessage(m.chat, {
            text,
            contextInfo: {
                externalAdReply: {
                    title: config.namebot,
                    body: `Lightweight WhatsApp Base Bot by ${config.ownerName}`,
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

handler.help = ['menu', 'help']
handler.tags = ['main']
handler.command = /^(menu|help)$/i

export default handler

/**
 * Fitur : Brat Animated Sticker
 */
import axios from 'axios'
import { createSticker, StickerTypes } from 'wa-sticker-formatter'

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const text = args.join(' ') || (m.quoted && m.quoted.text)
    if (!text) return m.reply(`Contoh penggunaan:\n*${usedPrefix + command} halo dunia* atau reply teks.`)

    try {
        await m.react('⏳')
        const url = `https://brat.siputzx.my.id/gif?text=${encodeURIComponent(text)}`
        const buffer = (await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 20000
        })).data

        const stickerBuffer = await createSticker(buffer, {
            type: StickerTypes.FULL,
            pack: global.stickpack || global.namebot || 'Columbina',
            author: global.stickauth || global.author || 'KyokoApp',
            categories: ['✨'],
            quality: 70
        })
        await conn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m })
        await m.react('✅')
    } catch (e) {
        console.error('[bratvid]', e)
        await m.react('❌')
        m.reply(`[FAIL] Gagal membuat bratvid: ${e.message || e}`)
    }
}

handler.help = ['bratvid <teks>']
handler.tags = ['sticker']
handler.command = /^(bratvid)$/i
handler.limit = true

export default handler

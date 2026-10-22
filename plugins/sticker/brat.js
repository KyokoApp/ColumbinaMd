/**
 * Fitur: Brat Sticker Canvas
 */
import { bratGen } from 'brat-canvas'
import { Sticker } from 'wa-sticker-formatter'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (m.quoted && m.quoted.text) {
        text = m.quoted.text
    } else if (!text) {
        return m.reply(`Contoh penggunaan:\n*${usedPrefix + command} halo dunia* atau reply teks.`)
    }

    try {
        await m.react('⏳')

        const { buffer } = await bratGen(text)
        const imageBuffer = Buffer.from(buffer)

        const stiker = await new Sticker(imageBuffer, {
            type: 'crop',
            pack: global.stickpack || global.namebot || 'Columbina',
            author: global.stickauth || global.author || 'KyokoApp',
            quality: 70
        }).toBuffer()

        if (stiker) {
            await conn.sendMessage(m.chat, { sticker: stiker }, { quoted: m })
            await m.react('✅')
        } else {
            await m.react('❌')
        }
    } catch (e) {
        console.error('[brat]', e)
        await m.react('❌')
        m.reply(`[FAIL] Gagal membuat stiker brat: ${e.message || e}`)
    }
}

handler.help = ['brat <teks>']
handler.tags = ['sticker']
handler.command = /^(brat)$/i
handler.limit = true

export default handler

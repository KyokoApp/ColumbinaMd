import { parseMention, decodeJid } from '../../lib/simple.js'

let handler = async (m, { conn, text, isBotAdmin }) => {
    if (!isBotAdmin) return m.reply('❌ Bot harus menjadi Admin grup terlebih dahulu!')

    let target = m.quoted ? m.quoted.sender : null
    if (!target) {
        const mentions = parseMention(text)
        if (mentions.length > 0) target = mentions[0]
    }
    if (!target && text) {
        const num = text.replace(/[^0-9]/g, '')
        if (num.length >= 5) target = num + '@s.whatsapp.net'
    }

    if (!target) {
        return m.reply('Tag, reply pesan, atau masukkan nomor anggota yang ingin dijadikan admin!')
    }

    target = decodeJid(target)

    try {
        await conn.groupParticipantsUpdate(m.chat, [target], 'promote')
        await m.reply(`👑 Selamat! @${target.split('@')[0]} sekarang adalah Admin grup.`, {
            mentions: [target]
        })
    } catch (e) {
        m.reply(`❌ Gagal menaikkan jabatan: ${e.message}`)
    }
}

handler.help = ['promote @user']
handler.tags = ['group']
handler.command = /^(promote|admin)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler

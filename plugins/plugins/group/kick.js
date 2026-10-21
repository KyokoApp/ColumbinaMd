import { parseMention, decodeJid } from '../../lib/simple.js'

let handler = async (m, { conn, text, isBotAdmin }) => {
    if (!isBotAdmin) return m.reply('❌ Bot harus menjadi Admin grup terlebih dahulu!')

    // Ambil target dari reply pesan, mention, atau teks nomor
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
        return m.reply('Tag, reply pesan, atau masukkan nomor anggota yang ingin dikeluarkan!')
    }

    target = decodeJid(target)

    // Jangan kick diri sendiri atau bot
    if (target === decodeJid(conn.user?.id)) {
        return m.reply('❌ Tidak bisa mengeluarkan bot sendiri!')
    }

    try {
        await conn.groupParticipantsUpdate(m.chat, [target], 'remove')
        await m.reply(`👋 Berhasil mengeluarkan @${target.split('@')[0]} dari grup.`, {
            mentions: [target]
        })
    } catch (e) {
        m.reply(`❌ Gagal mengeluarkan anggota: ${e.message}`)
    }
}

handler.help = ['kick @user']
handler.tags = ['group']
handler.command = /^(kick|tendang)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler

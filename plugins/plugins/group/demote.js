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
        return m.reply('Tag, reply pesan, atau masukkan nomor anggota yang ingin diturunkan dari admin!')
    }

    target = decodeJid(target)

    if (target === decodeJid(conn.user?.id)) {
        return m.reply('❌ Tidak bisa menurunkan jabatan bot sendiri!')
    }

    try {
        await conn.groupParticipantsUpdate(m.chat, [target], 'demote')
        await m.reply(`🔻 Jabatan admin @${target.split('@')[0]} telah dicabut.`, {
            mentions: [target]
        })
    } catch (e) {
        m.reply(`❌ Gagal menurunkan jabatan: ${e.message}`)
    }
}

handler.help = ['demote @user']
handler.tags = ['group']
handler.command = /^(demote|unadmin)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler

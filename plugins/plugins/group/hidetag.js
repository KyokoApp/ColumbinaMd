let handler = async (m, { conn, text, participants }) => {
    const list = participants || []
    const message = text || m.quoted?.text || ''

    if (!message) {
        return m.reply('Masukkan teks atau reply pesan yang ingin di-hidetag!')
    }

    await conn.sendMessage(m.chat, {
        text: message,
        mentions: list.map(p => p.id)
    }, { quoted: m.quoted ? null : m })
}

handler.help = ['hidetag <teks>', 'ht <teks>']
handler.tags = ['group']
handler.command = /^(hidetag|ht)$/i
handler.group = true
handler.admin = true

export default handler

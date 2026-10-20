let handler = async (m, { conn, isBotAdmin }) => {
    if (!isBotAdmin) return m.reply('❌ Bot harus menjadi Admin grup untuk mengambil link tautan!')

    try {
        const code = await conn.groupInviteCode(m.chat)
        await m.reply(`🔗 *LINK GROUP:*\nhttps://chat.whatsapp.com/${code}`)
    } catch (e) {
        m.reply(`❌ Gagal mengambil link grup: ${e.message}`)
    }
}

handler.help = ['linkgc']
handler.tags = ['group']
handler.command = /^(linkgc|linkgroup)$/i
handler.group = true
handler.botAdmin = true

export default handler

const LINK_REGEX = /(https?:\/\/[^\s]+)|(wa\.me\/[^\s]+)|(chat\.whatsapp\.com\/[^\s]+)|(whatsapp\.com\/channel\/[^\s]+)/i

export async function before(m, { conn, isAdmin, isBotAdmin, isOwner }) {
    if (!m.isGroup || m.fromMe) return false

    const chat = global.db?.data?.chats?.[m.chat]
    if (!chat || !chat.antilink) return false

    // Lewatkan jika pengirim adalah Admin atau Owner
    if (isAdmin || isOwner) return false

    const isLink = LINK_REGEX.test(m.text || '')
    if (!isLink) return false

    if (!isBotAdmin) {
        // Bot bukan admin, tidak bisa menghapus pesan
        return false
    }

    // Hapus pesan biasa (standard delete tanpa dmsg)
    try {
        await conn.sendMessage(m.chat, { delete: m.key })
        await m.reply(`⚠️ *「 ANTI LINK 」*\n\nMaaf @${m.sender.split('@')[0]}, dilarang mengirim tautan/link di grup ini!`, {
            mentions: [m.sender]
        })
    } catch (err) {
        console.error('[ANTILINK DELETE ERROR]:', err.message)
    }

    return true
}

let handler = (m) => m
export default handler

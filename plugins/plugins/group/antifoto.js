export async function before(m, { conn, isAdmin, isBotAdmin, isOwner }) {
    if (!m.isGroup || m.fromMe) return false

    const chat = global.db?.data?.chats?.[m.chat]
    if (!chat || !chat.antifoto) return false

    // Lewatkan jika pengirim adalah Admin atau Owner
    if (isAdmin || isOwner) return false

    // Deteksi pesan gambar biasa maupun view-once
    const isImage = m.mtype === 'imageMessage' || m.msg?.mimetype?.includes('image')
    if (!isImage) return false

    if (!isBotAdmin) return false

    // Hapus pesan biasa (standard delete tanpa dmsg)
    try {
        await conn.sendMessage(m.chat, { delete: m.key })
        await m.reply(`📷 *「 ANTI FOTO 」*\n\nMaaf @${m.sender.split('@')[0]}, dilarang mengirim gambar/foto di grup ini!`, {
            mentions: [m.sender]
        })
    } catch (err) {
        console.error('[ANTIFOTO DELETE ERROR]:', err.message)
    }

    return true
}

let handler = (m) => m
export default handler

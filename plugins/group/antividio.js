export async function before(m, { conn, isAdmin, isBotAdmin, isOwner }) {
    if (!m.isGroup || m.fromMe) return false

    const chat = global.db?.data?.chats?.[m.chat]
    if (!chat || !chat.antividio) return false

    // Lewatkan jika pengirim adalah Admin atau Owner
    if (isAdmin || isOwner) return false

    // Deteksi pesan video
    const isVideo = m.mtype === 'videoMessage' || m.msg?.mimetype?.includes('video')
    if (!isVideo) return false

    if (!isBotAdmin) return false

    // Hapus pesan biasa (standard delete tanpa dmsg)
    try {
        await conn.sendMessage(m.chat, { delete: m.key })
        await m.reply(`🎥 *「 ANTI VIDEO 」*\n\nMaaf @${m.sender.split('@')[0]}, dilarang mengirim video di grup ini!`, {
            mentions: [m.sender]
        })
    } catch (err) {
        console.error('[ANTIVIDEO DELETE ERROR]:', err.message)
    }

    return true
}

let handler = (m) => m
export default handler

import { askClaude, askRewind } from '../../lib/aiHelper.js'

let handler = async (m, { text, usedPrefix, command }) => {
    const q = text || m.quoted?.text || ''
    if (!q) return m.reply(`Tanyakan sesuatu ke Claude AI!\n\n_Contoh:_ *${usedPrefix + command} tuliskan esai pendek tentang AI masa depan*`)

    await m.reply('💭 _Menyusun jawaban..._')

    try {
        let reply
        try {
            reply = await askClaude(q)
        } catch {
            // Fallback
            reply = await askRewind(
                'mistralai/mistral-7b-instruct-v0.3',
                q,
                'Kamu adalah Claude AI, asisten yang bijak, bernalar tajam, dan memiliki kemampuan menulis yang luar biasa.'
            )
        }
        await m.reply(`🎭 *CLAUDE AI*\n\n${reply}`)
    } catch (e) {
        m.reply(`❌ Terjadi kesalahan: ${e.message}`)
    }
}

handler.help = ['claude <pertanyaan>']
handler.tags = ['ai']
handler.command = /^(claude)$/i

export default handler

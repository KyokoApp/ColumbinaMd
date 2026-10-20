import { askRewind } from '../../lib/aiHelper.js'

let handler = async (m, { text, usedPrefix, command }) => {
    const q = text || m.quoted?.text || ''
    if (!q) return m.reply(`Tanyakan sesuatu ke Gemini AI!\n\n_Contoh:_ *${usedPrefix + command} jelaskan teori relativitas secara singkat*`)

    await m.reply('💭 _Sedang berpikir..._')

    try {
        const reply = await askRewind(
            'google/gemini-2.0-flash-exp:free',
            q,
            'Kamu adalah Gemini AI, asisten virtual yang cerdas, informatif, dan membantu.'
        )
        await m.reply(`✨ *GEMINI AI*\n\n${reply}`)
    } catch (e) {
        m.reply(`❌ Terjadi kesalahan: ${e.message}`)
    }
}

handler.help = ['gemini <pertanyaan>']
handler.tags = ['ai']
handler.command = /^(gemini)$/i

export default handler

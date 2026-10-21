import { askRewind } from '../../lib/aiHelper.js'

let handler = async (m, { text, usedPrefix, command }) => {
    const q = text || m.quoted?.text || ''
    if (!q) return m.reply(`Tanyakan sesuatu ke DeepSeek AI!\n\n_Contoh:_ *${usedPrefix + command} bagaimana cara kerja enkripsi RSA?*`)

    await m.reply('💭 _Menganalisis logika..._')

    try {
        const reply = await askRewind(
            'deepseek-ai/deepseek-r1-distill-llama-70b',
            q,
            'Kamu adalah DeepSeek AI, model penalaran cerdas yang sangat ahli dalam pemrograman, matematika, dan logika.'
        )
        await m.reply(`🐋 *DEEPSEEK AI*\n\n${reply}`)
    } catch (e) {
        m.reply(`❌ Terjadi kesalahan: ${e.message}`)
    }
}

handler.help = ['deepseek <pertanyaan>', 'ds <pertanyaan>']
handler.tags = ['ai']
handler.command = /^(deepseek|ds)$/i

export default handler

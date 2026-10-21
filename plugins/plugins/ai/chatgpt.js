import { askPollinations, askRewind } from '../../lib/aiHelper.js'

let handler = async (m, { text, usedPrefix, command }) => {
    const q = text || m.quoted?.text || ''
    if (!q) return m.reply(`Tanyakan sesuatu ke ChatGPT!\n\n_Contoh:_ *${usedPrefix + command} tips produktif belajar pemrograman*`)

    await m.reply('💭 _Menghubungkan ke OpenAI..._')

    try {
        let reply
        try {
            reply = await askPollinations(q, 'openai')
        } catch {
            // Fallback
            reply = await askRewind(
                'mistralai/mistral-7b-instruct-v0.3',
                q,
                'Kamu adalah ChatGPT yang ditenagai oleh model OpenAI, asisten yang cerdas, ramah, dan solutif.'
            )
        }
        await m.reply(`🤖 *CHATGPT*\n\n${reply}`)
    } catch (e) {
        m.reply(`❌ Terjadi kesalahan: ${e.message}`)
    }
}

handler.help = ['ai <pertanyaan>', 'chatgpt <pertanyaan>', 'gpt <pertanyaan>']
handler.tags = ['ai']
handler.command = /^(ai|chatgpt|gpt)$/i

export default handler

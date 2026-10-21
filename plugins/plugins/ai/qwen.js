import { askRewind } from '../../lib/aiHelper.js'

let handler = async (m, { text, usedPrefix, command }) => {
    const q = text || m.quoted?.text || ''
    if (!q) return m.reply(`Tanyakan sesuatu ke Qwen AI!\n\n_Contoh:_ *${usedPrefix + command} apa keunggulan arsitektur Transformer?*`)

    await m.reply('💭 _Memproses pertanyaan..._')

    try {
        const reply = await askRewind(
            'qwen/qwen-2.5-7b-instruct',
            q,
            'Kamu adalah Qwen, model kecerdasan buatan serbaguna yang dikembangkan oleh Alibaba Cloud.'
        )
        await m.reply(`🌐 *QWEN AI*\n\n${reply}`)
    } catch (e) {
        m.reply(`❌ Terjadi kesalahan: ${e.message}`)
    }
}

handler.help = ['qwen <pertanyaan>']
handler.tags = ['ai']
handler.command = /^(qwen)$/i

export default handler

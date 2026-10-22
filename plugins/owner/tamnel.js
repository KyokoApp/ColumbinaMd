import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const bannerPath = path.resolve(__dirname, '../../assets/banner.jpg')

let handler = async (m, { usedPrefix, command }) => {
    try {
        const quoted = m.quoted || m
        const mime = quoted?.mimetype || ''

        if (!mime.startsWith('image/')) {
            return m.reply(`Reply gambar terlebih dahulu!\nContoh: kirim/reply foto lalu ketik *${usedPrefix + command}*`)
        }

        await m.react('⏳')

        const buffer = await quoted.download()
        if (!buffer || buffer.length === 0) {
            await m.react('❌')
            return m.reply('Gagal mengunduh gambar!')
        }

        // Pastikan folder assets ada
        const assetsDir = path.dirname(bannerPath)
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true })
        }

        fs.writeFileSync(bannerPath, buffer)

        await m.react('✅')
        m.reply(`*DONE WOK CEK COBA*\n\nThumbnail bot berhasil diperbarui! Silakan ketik *${usedPrefix}menu* untuk melihat hasilnya.`)
    } catch (e) {
        console.error('[tamnel error]:', e)
        await m.react('❌')
        m.reply('Error: ' + (e.message || e))
    }
}

handler.help = ['tamnel', 'setthumb', 'settamnel']
handler.tags = ['owner']
handler.command = /^(tamnel|setthumb|settamnel)$/i
handler.owner = true

export default handler

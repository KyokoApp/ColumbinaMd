import axios from 'axios'

/**
 * Instagram Downloader via Nexray API & Snapinsta Fallback
 */
async function igDownloader(url) {
    try {
        const res = await axios.get(`https://api.nexray.eu.cc/downloader/instagram?url=${encodeURIComponent(url)}`, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })

        if (res.data?.status && Array.isArray(res.data.result) && res.data.result.length > 0) {
            return res.data.result.map(item => ({
                type: item.type || 'video',
                url: item.url || item.download_url
            })).filter(x => x.url)
        }
    } catch (_) {}

    throw new Error('Gagal mengambil media Instagram. Pastikan akun tidak privat dan link valid.')
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(`*Contoh Penggunaan:*\n${usedPrefix + command} https://www.instagram.com/reel/xxxx/`)
    }

    if (!/(instagram\.com|\/p\/|\/reel\/|\/stories\/)/i.test(text)) {
        return m.reply('❌ URL tidak valid. Masukkan link postingan/reel Instagram yang benar!')
    }

    await m.reply('⏳ Sedang memproses unduhan Instagram...')

    try {
        const mediaList = await igDownloader(text.trim())

        for (const item of mediaList) {
            if (item.type === 'video') {
                await conn.sendMessage(m.chat, {
                    video: { url: item.url },
                    caption: `📸 *Instagram Downloader*\n✨ _Downloaded via ColumbinaMd_`
                }, { quoted: m })
            } else {
                await conn.sendMessage(m.chat, {
                    image: { url: item.url },
                    caption: `📸 *Instagram Downloader*\n✨ _Downloaded via ColumbinaMd_`
                }, { quoted: m })
            }
        }
    } catch (e) {
        m.reply(`❌ ${e.message}`)
    }
}

handler.help = ['ig <url>', 'instagram <url>']
handler.tags = ['downloader']
handler.command = /^(ig|instagram|igdl)$/i

export default handler

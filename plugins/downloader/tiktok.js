import axios from 'axios'

/**
 * TikTok Video Downloader
 * Menggunakan integrasi scraper multi-metode (Tikwm API, Lovetik, dan Tikmate) tanpa tanda air (no watermark)
 */
async function downloadTikTok(url) {
    // 1. Coba Tikwm API
    try {
        const res = await axios.post('https://www.tikwm.com/api/', new URLSearchParams({
            url: url,
            hd: 1
        }), {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })

        if (res.data?.code === 0 && res.data?.data) {
            const d = res.data.data
            return {
                title: d.title || 'TikTok Video',
                author: d.author?.nickname || d.author?.unique_id || 'TikTok User',
                video: d.play || d.wmplay,
                music: d.music
            }
        }
    } catch (_) {}

    // 2. Coba Lovetik Scraper
    try {
        const res = await axios.post('https://lovetik.com/api/ajax/search', new URLSearchParams({
            query: url
        }), {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })

        if (res.data?.status === 'ok' && Array.isArray(res.data.links) && res.data.links.length > 0) {
            const noWm = res.data.links.find(l => /nowm/i.test(l.t || '')) || res.data.links[0]
            return {
                title: res.data.desc || 'TikTok Video',
                author: res.data.author || 'TikTok User',
                video: noWm.a,
                music: null
            }
        }
    } catch (_) {}

    // 3. Fallback Tiklydown / Public Mirror
    try {
        const res = await axios.get(`https://api.nexray.eu.cc/downloader/tiktok?url=${encodeURIComponent(url)}`, {
            timeout: 10000
        })
        if (res.data?.status && res.data?.result) {
            const r = res.data.result
            return {
                title: r.title || 'TikTok Video',
                author: r.author || 'TikTok User',
                video: r.video || r.nowatermark || r.url,
                music: r.audio
            }
        }
    } catch (_) {}

    throw new Error('Gagal mengunduh video TikTok. Pastikan video publik dan tautan valid.')
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(`*Contoh Penggunaan:*\n${usedPrefix + command} https://vt.tiktok.com/xxxx/`)
    }

    if (!/(tiktok\.com|vt\.tiktok\.com)/i.test(text)) {
        return m.reply('❌ URL tidak valid. Masukkan link video TikTok yang benar!')
    }

    await m.reply('⏳ Sedang memproses unduhan video TikTok...')

    try {
        const data = await downloadTikTok(text.trim())

        let caption = `🎵 *TikTok Downloader*\n\n`
        caption += `👤 *Kreator:* ${data.author}\n`
        caption += `📝 *Deskripsi:* ${data.title}\n\n`
        caption += `✨ _Downloaded via ColumbinaMd_`

        await conn.sendMessage(m.chat, {
            video: { url: data.video },
            caption
        }, { quoted: m })
    } catch (e) {
        m.reply(`❌ ${e.message}`)
    }
}

handler.help = ['tt <url>', 'tiktok <url>']
handler.tags = ['downloader']
handler.command = /^(tt|tiktok|ttdl|tiktokdl)$/i

export default handler

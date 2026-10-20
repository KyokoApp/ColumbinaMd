import axios from 'axios'

/**
 * Scraper Facebook Downloader via fbdownloader.to
 * Mengambil tautan video berkualitas HD (720p) dan SD (360p)
 */
async function getToken() {
    const url = 'https://fbdownloader.to/id'
    const { data: html } = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
        }
    })

    const regex = /k_exp="(.*?)".*?k_token="(.*?)"/s
    const match = html.match(regex)
    if (!match) throw new Error('Token CSRF fbdownloader tidak ditemukan')

    return {
        k_exp: match[1],
        k_token: match[2]
    }
}

async function fbDownloader(fbUrl) {
    const { k_exp, k_token } = await getToken()

    const payload = new URLSearchParams({
        k_exp,
        k_token,
        p: 'home',
        q: fbUrl,
        lang: 'id',
        v: 'v2',
        W: ''
    })

    const { data } = await axios.post('https://fbdownloader.to/api/ajaxSearch', payload, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': 'https://fbdownloader.to',
            'Referer': 'https://fbdownloader.to/id'
        }
    })

    if (!data || !data.data) throw new Error('Gagal memproses data video Facebook')

    const html = data.data
    const results = []
    const rowRegex = /<td class="video-quality">(.*?)<\/td>[\s\S]*?(?:href="(.*?)"|data-videourl="(.*?)")/g
    let match

    while ((match = rowRegex.exec(html)) !== null) {
        const quality = match[1].trim()
        const url = match[2] || match[3]
        if (quality && url && url.startsWith('http')) {
            results.push({ quality, url })
        }
    }

    if (!results.length) throw new Error('Tautan unduhan video tidak ditemukan')

    return results
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(`*Contoh Penggunaan:*\n${usedPrefix + command} https://www.facebook.com/watch?v=xxxx`)
    }

    if (!/(facebook\.com|fb\.watch)/i.test(text)) {
        return m.reply('❌ URL tidak valid. Masukkan link video Facebook yang benar!')
    }

    await m.reply('⏳ Sedang memproses unduhan video Facebook...')

    try {
        const results = await fbDownloader(text.trim())
        // Utamakan HD jika ada, fallback ke SD atau resolusi pertama
        const target = results.find(v => /720p|HD/i.test(v.quality)) || results[0]

        await conn.sendMessage(m.chat, {
            video: { url: target.url },
            caption: `🎬 *Facebook Video Downloader*\n\n📺 *Kualitas:* ${target.quality}\n✨ _Downloaded via ColumbinaMd_`
        }, { quoted: m })
    } catch (e) {
        m.reply(`❌ Gagal mengunduh video: ${e.message}`)
    }
}

handler.help = ['fb <url>', 'facebook <url>']
handler.tags = ['downloader']
handler.command = /^(fb|facebook|fbdl)$/i

export default handler

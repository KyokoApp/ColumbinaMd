import axios from 'axios'

/**
 * Pinterest Media Downloader & Search
 * Mendukung download pin URL langsung (gambar resolusi asli/video) atau pencarian gambar Pinterest
 */
async function getPinMedia(url) {
    let finalUrl = url

    // Selesaikan pemendek link pin.it jika ada
    if (/pin\.it/i.test(url)) {
        try {
            const head = await axios.get(url, {
                maxRedirects: 0,
                validateStatus: status => status >= 200 && status < 400
            })
            if (head.headers.location) finalUrl = head.headers.location
        } catch (e) {
            if (e.response?.headers?.location) finalUrl = e.response.headers.location
        }
    }

    const { data: html } = await axios.get(finalUrl, {
        headers: {
            'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)',
            'Accept-Language': 'en-US,en;q=0.9'
        }
    })

    // Cari URL gambar resolusi asli (originals)
    const imgMatches = html.match(/https:\/\/i\.pinimg\.com\/originals\/[a-zA-Z0-9_\/.-]+/g)
    const vidMatches = html.match(/https:\/\/[a-zA-Z0-9_\/.-]+\.mp4/g)

    if (vidMatches && vidMatches.length > 0) {
        return { type: 'video', url: vidMatches[0] }
    }

    if (imgMatches && imgMatches.length > 0) {
        return { type: 'image', url: imgMatches[0] }
    }

    throw new Error('Media tidak ditemukan pada link Pinterest tersebut')
}

async function searchPinterest(query) {
    const { data } = await axios.get(`https://theresapis.vercel.app/search/pinterest?q=${encodeURIComponent(query)}`, {
        timeout: 15000
    })
    const list = Array.isArray(data?.result) ? data.result : []
    if (!list.length) throw new Error('Gambar tidak ditemukan')
    // Ambil sampel acak dari hasil
    const pick = list[Math.floor(Math.random() * list.length)]
    return pick.directLink || pick.link
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(
            `*Contoh Penggunaan:*\n` +
            `• Download link: \`${usedPrefix + command} https://pin.it/xxxx\`\n` +
            `• Cari gambar: \`${usedPrefix + command} anime aesthetic\``
        )
    }

    const isUrl = /(pinterest\.com|pin\.it)/i.test(text)

    if (isUrl) {
        await m.reply('⏳ Sedang mengunduh media Pinterest...')
        try {
            const res = await getPinMedia(text.trim())
            if (res.type === 'video') {
                await conn.sendMessage(m.chat, {
                    video: { url: res.url },
                    caption: `📌 *Pinterest Downloader*\n✨ _Downloaded via ColumbinaMd_`
                }, { quoted: m })
            } else {
                await conn.sendMessage(m.chat, {
                    image: { url: res.url },
                    caption: `📌 *Pinterest Downloader*\n✨ _Downloaded via ColumbinaMd_`
                }, { quoted: m })
            }
        } catch (e) {
            m.reply(`❌ ${e.message}`)
        }
    } else {
        await m.reply('🔍 Mencari gambar di Pinterest...')
        try {
            const imgUrl = await searchPinterest(text.trim())
            await conn.sendMessage(m.chat, {
                image: { url: imgUrl },
                caption: `📌 *Pinterest Search:* _${text}_\n✨ _ColumbinaMd_`
            }, { quoted: m })
        } catch (e) {
            m.reply(`❌ ${e.message}`)
        }
    }
}

handler.help = ['pin <query/url>', 'pinterest <query/url>']
handler.tags = ['downloader']
handler.command = /^(pin|pindl|pinterest)$/i

export default handler

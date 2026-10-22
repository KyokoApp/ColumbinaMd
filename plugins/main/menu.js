import config from '../../config.js'
import { plugins } from '../../lib/plugins.js'
import { ButtonV2, sendButton } from '../../lib/simple.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const bannerPath = path.resolve(__dirname, '../../assets/banner.jpg')

// Pemetaan alias kategori agar fleksibel
const CATEGORY_MAP = {
    ai: 'ai',
    owner: 'owner',
    downloader: 'downloader',
    download: 'downloader',
    dl: 'downloader',
    game: 'game',
    games: 'game',
    group: 'group',
    grup: 'group',
    gc: 'group',
    info: 'info',
    tools: 'tools',
    tool: 'tools',
    audio: 'audio',
    main: 'main',
    general: 'main',
    sticker: 'sticker',
    stiker: 'sticker'
}

const CATEGORY_META = {
    ai: { icon: '🤖', title: 'Menu AI & Assistant', desc: 'DeepSeek, Gemini, Claude, Qwen, GPT' },
    downloader: { icon: '📥', title: 'Menu Downloader', desc: 'TikTok, Instagram, Facebook, YouTube' },
    sticker: { icon: '✨', title: 'Menu Sticker & Maker', desc: 'Brat, Bratvid, dan Pembuat Stiker' },
    tools: { icon: '🛠️', title: 'Menu Tools & Utility', desc: 'Voice Note (VN), konverter, utilitas' },
    game: { icon: '🎮', title: 'Menu Game & Hiburan', desc: 'Family 100 dan game interaktif' },
    group: { icon: '🛡️', title: 'Menu Group Admin', desc: 'Manajemen grup dan keamanan' },
    info: { icon: 'ℹ️', title: 'Menu Informasi Bot', desc: 'Status bot, source code, speed' },
    owner: { icon: '👑', title: 'Menu Owner & Dev', desc: 'Manajemen server, update OTA, restart' },
    main: { icon: '📋', title: 'Menu Utama', desc: 'Daftar menu dasar' },
    audio: { icon: '🎵', title: 'Menu Audio', desc: 'Pemrosesan dan efek audio' },
    lainnya: { icon: '📦', title: 'Menu Lainnya', desc: 'Kumpulan fitur tambahan' }
}

function getUptimeString() {
    const s = Math.floor(process.uptime())
    const d = Math.floor(s / (3600 * 24))
    const h = Math.floor((s % (3600 * 24)) / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = Math.floor(s % 60)
    const parts = []
    if (d > 0) parts.push(`${d}h`)
    if (h > 0) parts.push(`${h}j`)
    if (m > 0) parts.push(`${m}m`)
    parts.push(`${sec}d`)
    return parts.join(' ')
}

function getThumbnail() {
    if (fs.existsSync(bannerPath)) {
        try {
            return fs.readFileSync(bannerPath)
        } catch (_) {}
    }
    return config.thumbnail || 'https://c.termai.cc/a107/IbYUA.jpg'
}

let handler = async (m, { conn, text, usedPrefix, command, isOwner }) => {
    // Kelompokkan perintah berdasarkan tags
    const groups = {}

    for (const name in plugins) {
        const plugin = plugins[name]
        if (!plugin || !plugin.help) continue

        const tag = (plugin.tags && plugin.tags[0]) || 'lainnya'
        if (!groups[tag]) groups[tag] = []

        const helps = Array.isArray(plugin.help) ? plugin.help : [plugin.help]
        for (const h of helps) {
            groups[tag].push(h)
        }
    }

    if (!isOwner) delete groups['owner']

    // Deteksi kategori dari command langsung atau parameter
    let requestedCategory = ''
    const cmdLower = command.toLowerCase()
    if (cmdLower.startsWith('menu') && cmdLower.length > 4) {
        requestedCategory = cmdLower.slice(4)
    } else if (text && text.trim()) {
        requestedCategory = text.trim().toLowerCase().split(/\s+/)[0]
    }

    const normalizedCategory = CATEGORY_MAP[requestedCategory] || requestedCategory
    const availableTags = Object.keys(groups).sort()
    const isCategoryView = requestedCategory && requestedCategory !== 'all' && requestedCategory !== 'semua'

    const totalFitur = Object.values(groups).reduce((acc, curr) => acc + curr.length, 0)
    const pushname = m.pushName || 'Kawan'
    const botname = config.namebot || 'Columbina'
    const thumb = getThumbnail()

    // ==========================================
    // VIEW 1: TAMPILAN MENU PER KATEGORI SPESIFIK
    // ==========================================
    if (isCategoryView) {
        if (!groups[normalizedCategory]) {
            let msg = `⚠️ Kategori *${requestedCategory}* tidak ditemukan.\n\n`
            msg += `*Daftar Kategori Tersedia:*\n`
            for (const t of availableTags) {
                msg += `• \`${usedPrefix}menu ${t}\`\n`
            }
            msg += `• \`${usedPrefix}menu all\` (Tampilkan Semua)\n`
            return m.reply(msg.trim())
        }

        const targetCmds = groups[normalizedCategory]
        const meta = CATEGORY_META[normalizedCategory] || { icon: '✦', title: `${normalizedCategory.toUpperCase()} Menu` }

        let out = `╭───「 ${meta.icon} *${normalizedCategory.toUpperCase()} MENU* 」\n`
        out += `│ Total: *${targetCmds.length}* perintah\n`
        out += `│ Prefix: \`${usedPrefix}\`\n`
        out += `╰───────────────────────\n\n`

        out += `╭─ ✦ *Daftar Perintah:*\n`
        for (const cmd of targetCmds) {
            out += `│ • \`${usedPrefix}${cmd}\`\n`
        }
        out += `╰───────────────────────\n\n`
        out += `_Ketik perintah di atas untuk menggunakan fitur._`

        // Susun baris single_select untuk kategori lain
        const rows = [
            {
                title: '📋 Semua Menu',
                description: `Tampilkan seluruh ${totalFitur} perintah`,
                id: `${usedPrefix}menu all`
            }
        ]
        for (const tag of availableTags) {
            if (tag === normalizedCategory) continue
            const catMeta = CATEGORY_META[tag] || { icon: '✦', title: `Menu ${tag}`, desc: `Buka menu ${tag}` }
            rows.push({
                title: `${catMeta.icon} ${catMeta.title}`,
                description: `${groups[tag].length} perintah • ${catMeta.desc}`,
                id: `${usedPrefix}menu ${tag}`
            })
        }

        try {
            const btn = new ButtonV2(conn)
                .setTitle(`📂 ${botname.toUpperCase()} - ${normalizedCategory.toUpperCase()}`)
                .setSubtitle(`By ${config.ownerName || 'KyokoApp'}`)
                .setThumbnail(thumb)
                .setBody(out)
                .setFooter(`${botname} • KyokoApp`)
                .addRawButton({
                    buttonText: { displayText: '📑 Ganti Kategori' },
                    buttonId: 'menu_cat_select',
                    type: 1,
                    nativeFlowInfo: {
                        name: 'single_select',
                        paramsJson: JSON.stringify({
                            title: 'Pilih Kategori Lain',
                            sections: [{
                                title: `Total ${availableTags.length} Kategori`,
                                rows
                            }]
                        })
                    }
                })

            return await btn.send(m.chat, { quoted: m })
        } catch (e) {
            console.error('[MENU CATEGORY BUTTONV2 ERROR]:', e.message)
            return await sendButton(conn, m.chat, out, `${botname} • KyokoApp`, [
                { displayText: '📋 Semua Menu', id: `${usedPrefix}menu all` }
            ], m)
        }
    }

    // ==========================================
    // VIEW 2: TAMPILAN MENU ALL (LIST PANJANG)
    // ==========================================
    if (requestedCategory === 'all' || requestedCategory === 'semua') {
        let out = `╭───「 🌐 *SEMUA FITUR ${botname.toUpperCase()}* 」\n`
        out += `│ Pengguna: *${pushname}*\n`
        out += `│ Total: *${totalFitur}* fitur (${availableTags.length} kategori)\n`
        out += `│ Uptime: *${getUptimeString()}*\n`
        out += `╰───────────────────────\n\n`

        for (const [tag, commands] of Object.entries(groups)) {
            const catMeta = CATEGORY_META[tag] || { icon: '✦' }
            out += `╭─ ${catMeta.icon} *${tag.toUpperCase()}* (${commands.length})\n`
            for (const cmd of commands) {
                out += `│ • \`${usedPrefix}${cmd}\`\n`
            }
            out += `╰───────────────────────\n\n`
        }
        out += `_Bantu dukung bot ini dengan Star di GitHub:_\n`
        out += `https://github.com/KyokoApp/ColumbinaMd`

        const rows = availableTags.map(tag => {
            const catMeta = CATEGORY_META[tag] || { icon: '✦', title: `Menu ${tag}`, desc: `Buka menu ${tag}` }
            return {
                title: `${catMeta.icon} ${catMeta.title}`,
                description: `${groups[tag].length} perintah • ${catMeta.desc}`,
                id: `${usedPrefix}menu ${tag}`
            }
        })

        try {
            const btn = new ButtonV2(conn)
                .setTitle(`🌐 ${botname.toUpperCase()}`)
                .setSubtitle(`By ${config.ownerName || 'KyokoApp'}`)
                .setThumbnail(thumb)
                .setBody(out)
                .setFooter(`${botname} • KyokoApp`)
                .addRawButton({
                    buttonText: { displayText: '📑 Pilih Kategori' },
                    buttonId: 'menu_all_select',
                    type: 1,
                    nativeFlowInfo: {
                        name: 'single_select',
                        paramsJson: JSON.stringify({
                            title: 'Daftar Kategori Spesifik',
                            sections: [{
                                title: `Total ${availableTags.length} Kategori`,
                                rows
                            }]
                        })
                    }
                })

            return await btn.send(m.chat, { quoted: m })
        } catch (e) {
            return await sendButton(conn, m.chat, out, `${botname} • KyokoApp`, [
                { displayText: '🤖 Menu AI', id: `${usedPrefix}menu ai` },
                { displayText: '📥 Downloader', id: `${usedPrefix}menu downloader` }
            ], m)
        }
    }

    // ==========================================
    // VIEW 3: TAMPILAN MENU UTAMA (CARD SINGLE SELECT)
    // ==========================================
    let headerText = `╭───「 🌸 *${botname.toUpperCase()}* 」\n`
    headerText += `│ Halo, *${pushname}*! 👋\n`
    headerText += `│ Status: *Online*\n`
    headerText += `│ Aktif: *${getUptimeString()}*\n`
    headerText += `│ Total Fitur: *${totalFitur}* dari *${availableTags.length}* kategori\n`
    headerText += `│ Prefix: \`${usedPrefix}\`\n`
    headerText += `╰───────────────────────\n\n`
    headerText += `Silakan sentuh tombol *Pilih Menu* di bawah untuk menjelajahi fitur berdasarkan kategori:`

    const rows = [
        {
            title: '📋 Semua Menu',
            description: `Tampilkan seluruh ${totalFitur} fitur sekaligus`,
            id: `${usedPrefix}menu all`
        }
    ]

    for (const tag of availableTags) {
        const catMeta = CATEGORY_META[tag] || { icon: '✦', title: `Menu ${tag}`, desc: `Koleksi fitur ${tag}` }
        const count = groups[tag].length
        rows.push({
            title: `${catMeta.icon} ${catMeta.title}`,
            description: `${count} fitur • ${catMeta.desc}`,
            id: `${usedPrefix}menu ${tag}`
        })
    }

    try {
        const btn = new ButtonV2(conn)
            .setTitle(`🌸 ${botname.toUpperCase()}`)
            .setSubtitle(`By ${config.ownerName || 'KyokoApp'}`)
            .setThumbnail(thumb)
            .setBody(headerText)
            .setFooter(`${botname} • KyokoApp`)
            .addRawButton({
                buttonText: { displayText: '📂 Pilih Menu' },
                buttonId: 'menu_select',
                type: 1,
                nativeFlowInfo: {
                    name: 'single_select',
                    paramsJson: JSON.stringify({
                        title: 'Pilih Kategori Menu',
                        sections: [{
                            title: `Total ${availableTags.length} Kategori`,
                            rows
                        }]
                    })
                }
            })

        return await btn.send(m.chat, { quoted: m })
    } catch (e) {
        console.error('[MENU MAIN BUTTONV2 ERROR, FALLBACK TO SENDBUTTON]:', e.message)
        const fallbackButtons = [
            { displayText: '🤖 Menu AI', id: `${usedPrefix}menu ai` },
            { displayText: '📥 Downloader', id: `${usedPrefix}menu downloader` },
            { displayText: '📋 Semua Menu', id: `${usedPrefix}menu all` }
        ]
        return await sendButton(conn, m.chat, headerText, `${botname} • KyokoApp`, fallbackButtons, m)
    }
}

handler.help = ['menu', 'menu [kategori]', 'menu all']
handler.tags = ['main']
handler.command = /^(menu|help|menuall|menuai|menuowner|menudl|menudownloader|menugroup|menugrup|menugc|menugame|menuinfo|menutools|menutool|menuaudio|menusticker)$/i

export default handler

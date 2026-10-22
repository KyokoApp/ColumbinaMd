import config from '../../config.js'
import { plugins } from '../../lib/plugins.js'
import { Button, sendButton } from '../../lib/simple.js'

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
    tools: { icon: '🛠️', title: 'Menu Tools & Utility', desc: 'Voice Note (VN), konverter, dan utilitas' },
    game: { icon: '🎮', title: 'Menu Game & Hiburan', desc: 'Family 100 dan mini game' },
    group: { icon: '🛡️', title: 'Menu Group Admin', desc: 'Manajemen grup dan keamanan' },
    info: { icon: 'ℹ️', title: 'Menu Informasi Bot', desc: 'Status bot, source code, dan speed' },
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

    // Total fitur
    const totalFitur = Object.values(groups).reduce((acc, curr) => acc + curr.length, 0)
    const pushname = m.pushName || 'Kawan'
    const botname = config.namebot || 'Columbina'

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

        // Gunakan Button dengan Single Select List untuk pindah kategori dengan cepat
        try {
            const btn = new Button(conn)
                .setTitle(`📂 ${botname.toUpperCase()} - ${normalizedCategory.toUpperCase()}`)
                .setBody(out)
                .setFooter(`${botname} • By ${config.ownerName || 'KyokoApp'}`)
                .addSelection('📑 Ganti Kategori')
                .makeSection('Pilihan Kategori Lain')

            btn.makeRow('📋', 'Tampilkan Semua Fitur', 'Buka ringkasan seluruh menu', `${usedPrefix}menu all`)
            for (const tag of availableTags) {
                if (tag === normalizedCategory) continue
                const catMeta = CATEGORY_META[tag] || { icon: '✦', title: `Menu ${tag}`, desc: `Buka menu ${tag}` }
                btn.makeRow(catMeta.icon, catMeta.title, catMeta.desc, `${usedPrefix}menu ${tag}`)
            }

            return await btn.send(m.chat, { quoted: m })
        } catch (e) {
            console.error('[MENU CATEGORY BUTTON ERROR, FALLBACK TO SENDBUTTON]:', e.message)
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

        try {
            const btn = new Button(conn)
                .setTitle(`🌐 ${botname.toUpperCase()}`)
                .setBody(out)
                .setFooter(`${botname} • By ${config.ownerName || 'KyokoApp'}`)
                .addSelection('📑 Pilih Kategori Spesifik')
                .makeSection('Daftar Kategori')

            for (const tag of availableTags) {
                const catMeta = CATEGORY_META[tag] || { icon: '✦', title: `Menu ${tag}`, desc: `Buka menu ${tag}` }
                btn.makeRow(catMeta.icon, catMeta.title, `${groups[tag].length} fitur • ${catMeta.desc}`, `${usedPrefix}menu ${tag}`)
            }

            return await btn.send(m.chat, { quoted: m })
        } catch (e) {
            return await sendButton(conn, m.chat, out, `${botname} • KyokoApp`, [
                { displayText: '🤖 Menu AI', id: `${usedPrefix}menu ai` },
                { displayText: '📥 Downloader', id: `${usedPrefix}menu downloader` }
            ], m)
        }
    }

    // ==========================================
    // VIEW 3: TAMPILAN MENU UTAMA (SINGLE SELECT CARD)
    // ==========================================
    let headerText = `╭───「 🌸 *${botname.toUpperCase()}* 」\n`
    headerText += `│ Halo, *${pushname}*! 👋\n`
    headerText += `│ Status: *Online*\n`
    headerText += `│ Aktif: *${getUptimeString()}*\n`
    headerText += `│ Total Fitur: *${totalFitur}* dari *${availableTags.length}* kategori\n`
    headerText += `│ Prefix: \`${usedPrefix}\`\n`
    headerText += `╰───────────────────────\n\n`
    headerText += `Silakan sentuh tombol *Pilih Menu* di bawah untuk menjelajahi fitur berdasarkan kategori:`

    try {
        const btn = new Button(conn)
            .setTitle(`🌸 ${botname.toUpperCase()}`)
            .setBody(headerText)
            .setFooter(`${botname} • By ${config.ownerName || 'KyokoApp'}`)
            .addSelection('📂 Pilih Menu')
            .makeSection('Kategori Menu Columbina')

        btn.makeRow('📋', 'Semua Menu', `Tampilkan seluruh ${totalFitur} fitur sekaligus`, `${usedPrefix}menu all`)

        for (const tag of availableTags) {
            const catMeta = CATEGORY_META[tag] || { icon: '✦', title: `Menu ${tag}`, desc: `Koleksi fitur ${tag}` }
            const count = groups[tag].length
            btn.makeRow(catMeta.icon, catMeta.title, `${count} fitur • ${catMeta.desc}`, `${usedPrefix}menu ${tag}`)
        }

        return await btn.send(m.chat, { quoted: m })
    } catch (e) {
        console.error('[MENU MAIN BUTTON ERROR, FALLBACK TO SENDBUTTON]:', e.message)
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

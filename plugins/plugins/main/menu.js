import config from '../../config.js'
import { plugins } from '../../lib/plugins.js'
import { sendButton } from '../../lib/simple.js'

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
    general: 'main'
}
let handler = async (m, { conn, text, usedPrefix, command }) => {
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

    // Deteksi kategori dari command langsung (misal .menuai, .menuowner) atau parameter text (misal .menu ai)
    let requestedCategory = ''
    const cmdLower = command.toLowerCase()
    if (cmdLower.startsWith('menu') && cmdLower.length > 4) {
        requestedCategory = cmdLower.slice(4) // 'ai', 'owner', 'group', dll
    } else if (text && text.trim()) {
        requestedCategory = text.trim().toLowerCase().split(/\s+/)[0]
    }

    // Normalisasi kategori
    const normalizedCategory = CATEGORY_MAP[requestedCategory] || requestedCategory

    // Jika user minta kategori tertentu (bukan 'all')
    const availableTags = Object.keys(groups)
    const isAll = !requestedCategory || requestedCategory === 'all' || requestedCategory === 'semua'

    if (!isAll && !groups[normalizedCategory]) {
        let msg = `⚠️ Kategori *${requestedCategory}* tidak ditemukan.\n\n`
        msg += `📌 *Daftar kategori yang tersedia:*\n`
        for (const t of availableTags) {
            msg += `• \`${usedPrefix}menu ${t}\`\n`
        }
        msg += `• \`${usedPrefix}menu all\` (Tampilkan Semua)\n`
        return m.reply(msg.trim())
    }

    let out = `🤖 *${config.namebot.toUpperCase()}*\n\n`
    out += `👋 Halo, *${m.pushName || 'Kawan'}*!\n`
    out += `Prefix: \`${usedPrefix}\`\n`

    let buttons = []

    if (isAll) {
        out += `Mode: *Semua Menu*\n\n`
        out += `💡 _Ketik \`${usedPrefix}menu <kategori>\` untuk menu per kategori_\n`
        out += `_Contoh: \`${usedPrefix}menu ai\`, \`${usedPrefix}menu owner\`, \`${usedPrefix}menu downloader\`_\n\n`

        for (const [tag, commands] of Object.entries(groups)) {
            out += `┌─ ✦ *${tag.toUpperCase()}* (${commands.length})\n`
            for (const cmd of commands) {
                out += `│ • ${usedPrefix}${cmd}\n`
            }
            out += `└────\n\n`
        }

        buttons = [
            { displayText: '🤖 Menu AI', id: `${usedPrefix}menu ai` },
            { displayText: '📥 Downloader', id: `${usedPrefix}menu downloader` },
            { displayText: '👑 Menu Owner', id: `${usedPrefix}menu owner` }
        ]
    } else {
        const targetCommands = groups[normalizedCategory]
        out += `Kategori: *${normalizedCategory.toUpperCase()}* (${targetCommands.length} Fitur)\n\n`

        out += `┌─ ✦ *${normalizedCategory.toUpperCase()}*\n`
        for (const cmd of targetCommands) {
            out += `│ • ${usedPrefix}${cmd}\n`
        }
        out += `└────\n\n`

        const otherCategories = availableTags
            .filter(t => t !== normalizedCategory)
            .map(t => `\`${usedPrefix}menu ${t}\``)
            .join(', ')

        if (otherCategories) {
            out += `📌 _Kategori lain: ${otherCategories}_\n\n`
        }

        if (normalizedCategory === 'ai') {
            buttons = [
                { displayText: '📋 Semua Menu', id: `${usedPrefix}menu all` },
                { displayText: '📥 Downloader', id: `${usedPrefix}menu downloader` },
                { displayText: '👑 Menu Owner', id: `${usedPrefix}menu owner` }
            ]
        } else if (normalizedCategory === 'owner') {
            buttons = [
                { displayText: '📋 Semua Menu', id: `${usedPrefix}menu all` },
                { displayText: '🤖 Menu AI', id: `${usedPrefix}menu ai` },
                { displayText: '🛡️ Menu Group', id: `${usedPrefix}menu group` }
            ]
        } else {
            buttons = [
                { displayText: '📋 Semua Menu', id: `${usedPrefix}menu all` },
                { displayText: '🤖 Menu AI', id: `${usedPrefix}menu ai` },
                { displayText: '📥 Downloader', id: `${usedPrefix}menu downloader` }
            ]
        }
    }
    out += `_Ketik ${usedPrefix}<perintah> untuk menggunakan fitur._\n\n`
    out += `⭐ *Bantu dukung bot ini dengan beri Star di GitHub:*\n`
    out += `https://github.com/KyokoApp/ColumbinaMd`

    // Coba kirim dengan ButtonV2 (Location Card + Thumbnail Banner) jika thumbnail tersedia
    if (config.thumbnail && typeof ButtonV2 === 'function') {
        try {
            const btn = new ButtonV2(conn)
                .setTitle(config.namebot.toUpperCase())
                .setSubtitle(`By ${config.ownerName || 'KyokoApp'}`)
                .setThumbnail(config.thumbnail)
                .setBody(out)
                .setFooter(`${config.namebot} • KyokoApp`)

            for (const b of buttons) {
                btn.addButton(b.displayText || b.text || 'Menu', b.id)
            }
            return await btn.send(m.chat, { quoted: m })
        } catch (e) {
            console.error('[MENU BUTTONV2 ERROR, FALLBACK TO SENDBUTTON]:', e.message)
        }
    }

    // Fallback: Kirim dengan tombol interaktif native flow biasa
    await sendButton(conn, m.chat, out, `${config.namebot} • KyokoApp`, buttons, m)
}

handler.help = ['menu [kategori]', 'menu ai', 'menu owner', 'menu group', 'menu downloader', 'menu game', 'menu tools']
handler.tags = ['main']
handler.command = /^(menu|help|menuall|menuai|menuowner|menudl|menudownloader|menugroup|menugrup|menugc|menugame|menuinfo|menutools|menutool|menuaudio)$/i

export default handler

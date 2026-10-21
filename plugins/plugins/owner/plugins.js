import fs from 'fs'
import path from 'path'

/**
 * Plugin Manager ColumbinaMd (.sp, .gp, .dp)
 * Tanpa sPR, tanpa dmsg — murni pesan teks & dokumen biasa
 */
function resolvePlugin(pluginDir, arg) {
    const list = []
    function scan(dir) {
        if (!fs.existsSync(dir)) return
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, item.name)
            if (item.isDirectory()) scan(full)
            else if (item.isFile() && item.name.endsWith('.js')) {
                list.push(path.relative(pluginDir, full).replace(/\\/g, '/'))
            }
        }
    }
    scan(pluginDir)
    list.sort()

    const isIndex = !isNaN(arg) && parseInt(arg) > 0
    let relativePath

    if (isIndex && parseInt(arg) <= list.length) {
        relativePath = list[parseInt(arg) - 1]
    } else {
        relativePath = arg.replace(/^plugins\//i, '')
        if (!relativePath.endsWith('.js')) {
            relativePath += '.js'
        }
    }

    return {
        list,
        relativePath,
        targetPath: path.join(pluginDir, relativePath)
    }
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const pluginDir = path.resolve('./plugins')
    const arg = args.join(' ').trim()

    // ==========================================
    // 1. .sp (Simpan Plugin)
    // ==========================================
    if (command === 'sp') {
        if (!arg) {
            return m.reply(
                `*Gunakan format:* \`${usedPrefix + command} <kategori/namafile.js>\`\n\n` +
                `*Cara pakai:*\n` +
                `1. Balas (quote) pesan teks berisi kode JavaScript ESM atau dokumen file .js\n` +
                `2. Ketik \`${usedPrefix + command} tools/waktu\` atau \`${usedPrefix + command} main/halo.js\``
            )
        }

        if (!m.quoted) {
            return m.reply('❌ Balas pesan berisi kode atau dokumen .js untuk disimpan!')
        }

        let code = ''
        if (m.quoted.download) {
            try {
                const buf = await m.quoted.download()
                code = buf.toString('utf-8')
            } catch (_) {}
        }

        if (!code && typeof m.quoted.text === 'string' && m.quoted.text.trim()) {
            code = m.quoted.text
        }

        if (!code.trim()) {
            return m.reply('❌ Kode plugin tidak ditemukan pada pesan yang dibalas.')
        }

        try {
            let rel = arg.replace(/^plugins\//i, '')
            if (!rel.endsWith('.js')) rel += '.js'

            const targetPath = path.join(pluginDir, rel)
            const dir = path.dirname(targetPath)
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

            fs.writeFileSync(targetPath, code)
            return m.reply(`✅ *Plugin berhasil disimpan!*\n📁 \`plugins/${rel}\`\n✨ _Plugin akan otomatis termuat via Hot-Reload._`)
        } catch (e) {
            return m.reply(`❌ Gagal menyimpan plugin: ${e.message}`)
        }
    }

    // ==========================================
    // 2. .gp (Get Plugin - Ambil Kode Plugin)
    // ==========================================
    if (command === 'gp') {
        const { list, relativePath, targetPath } = resolvePlugin(pluginDir, arg)

        if (!arg) {
            let text = `*Gunakan format:* \`${usedPrefix + command} <nomor atau path/file>\`\n\n`
            text += `*Contoh:* \`${usedPrefix + command} 1\` atau \`${usedPrefix + command} main/menu.js\`\n\n`
            text += `📋 *Daftar Plugin yang Tersedia:*\n`
            text += list.map((p, i) => `  \`${i + 1}.\` ${p}`).join('\n')
            return m.reply(text)
        }

        if (!fs.existsSync(targetPath)) {
            return m.reply(`❌ Plugin \`${relativePath}\` tidak ditemukan.`)
        }

        try {
            const content = fs.readFileSync(targetPath, 'utf-8')
            const fileName = path.basename(targetPath)

            // Kirim langsung sebagai file dokumen .js (bersih tanpa sPR/dmsg)
            await conn.sendMessage(m.chat, {
                document: Buffer.from(content, 'utf-8'),
                mimetype: 'application/javascript',
                fileName: fileName,
                caption: `📄 *Plugin:* \`plugins/${relativePath}\`\n✨ _ColumbinaMd Plugin Manager_`
            }, { quoted: m })
        } catch (e) {
            return m.reply(`❌ Gagal mengambil plugin: ${e.message}`)
        }
    }

    // ==========================================
    // 3. .dp (Delete Plugin - Hapus Plugin)
    // ==========================================
    if (command === 'dp') {
        const { list, relativePath, targetPath } = resolvePlugin(pluginDir, arg)

        if (!arg) {
            let text = `*Gunakan format:* \`${usedPrefix + command} <nomor atau path/file>\`\n\n`
            text += `*Contoh:* \`${usedPrefix + command} 1\` atau \`${usedPrefix + command} tools/lama.js\`\n\n`
            text += `📋 *Daftar Plugin yang Tersedia:*\n`
            text += list.map((p, i) => `  \`${i + 1}.\` ${p}`).join('\n')
            return m.reply(text)
        }

        if (!fs.existsSync(targetPath)) {
            return m.reply(`❌ Plugin \`${relativePath}\` tidak ditemukan.`)
        }

        try {
            fs.unlinkSync(targetPath)
            return m.reply(`🗑️ *Plugin berhasil dihapus!*\n📁 \`plugins/${relativePath}\``)
        } catch (e) {
            return m.reply(`❌ Gagal menghapus plugin: ${e.message}`)
        }
    }
}

handler.help = ['sp <path>', 'gp <nomor/path>', 'dp <nomor/path>']
handler.tags = ['owner']
handler.command = /^(sp|gp|dp)$/i
handler.owner = true

export default handler

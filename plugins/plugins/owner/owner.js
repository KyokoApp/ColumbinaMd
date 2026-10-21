import fs from 'fs'
import path from 'path'
import config from '../../config.js'

/**
 * Helper membersihkan nomor ke format murni 628xxx
 */
function cleanNumber(num = '') {
    let clean = String(num || '').replace(/[^0-9]/g, '')
    if (clean.startsWith('08')) clean = '628' + clean.slice(2)
    return clean
}

/**
 * Parse daftar nomor owner saat ini dari file config.js
 */
function parseExistingOwners(content) {
    const match = content.match(/owners:\s*(\[[^\]]*\])/)
    if (!match) return []
    const numberMatches = match[1].match(/'([^']+)'|"([^"]+)"|(\d+)/g) || []
    const existing = []
    for (const m of numberMatches) {
        let clean = cleanNumber(m)
        if (clean && !clean.includes('x') && clean.length >= 7) {
            if (!existing.includes(clean)) existing.push(clean)
        }
    }
    return existing
}

/**
 * Tulis pembaruan daftar owners ke dalam file config.js
 */
function saveOwnersToConfig(filePath, newOwnersList) {
    let content = fs.readFileSync(filePath, 'utf-8')
    const ownersRegex = /owners:\s*(\[[^\]]*\])/
    if (!ownersRegex.test(content)) throw new Error('Bagian owners tidak ditemukan di config.js')

    const formattedArray = newOwnersList.length === 0
        ? "['628xxxxxxxxxx']"
        : JSON.stringify(newOwnersList, null, 4).replace(/"/g, "'").replace(/\n/g, '\n    ')

    content = content.replace(ownersRegex, 'owners: ' + formattedArray)
    fs.writeFileSync(filePath, content, 'utf-8')
    return content
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const configPath = path.resolve('./config.js')
    if (!fs.existsSync(configPath)) {
        return m.reply('❌ Berkas config.js tidak ditemukan di direktori utama bot.')
    }

    const rawConfig = fs.readFileSync(configPath, 'utf-8')
    let currentOwners = parseExistingOwners(rawConfig)

    // ==========================================
    // 1. DAFTAR OWNER (.listowner)
    // ==========================================
    if (/^(listowner|ownerlist)$/i.test(command)) {
        const botNum = cleanNumber(conn.user?.id?.split(':')[0]?.split('@')[0])
        const pairingNum = cleanNumber(config.pairingNumber)

        let caption = `👑 *DAFTAR OWNER BOT*\n\n`
        caption += `📌 *Dari config.js:*\n`
        if (currentOwners.length === 0) {
            caption += `  - _(Belum ada nomor owner terdaftar)_\n`
        } else {
            currentOwners.forEach((num, i) => {
                caption += `  ${i + 1}. https://wa.me/${num} (@${num})\n`
            })
        }

        caption += `\n🤖 *Sistem Bawaan:*\n`
        if (botNum) caption += `  • Nomor Bot: https://wa.me/${botNum}\n`
        if (pairingNum) caption += `  • Pairing Number: https://wa.me/${pairingNum}\n`

        return conn.sendMessage(m.chat, {
            text: caption,
            mentions: currentOwners.map(n => n + '@s.whatsapp.net')
        }, { quoted: m })
    }

    // ==========================================
    // Tentukan Target Nomor (Argumen / Reply / Mention)
    // ==========================================
    let target = null

    if (m.mentionedJid && m.mentionedJid.length > 0) {
        target = m.mentionedJid[0]
    } else if (m.quoted) {
        target = m.quoted.senderPn || m.quoted.sender || null
    } else if (args[0]) {
        target = args.join(' ').trim()
    }

    if (!target) {
        return m.reply(
            `❓ *Cara Penggunaan:*\n\n` +
            `• *Tambah Owner:* \`${usedPrefix}${command} 628xxxxxxxxxx\` atau balas pesan target lalu ketik \`${usedPrefix}${command}\`\n` +
            `• *Hapus Owner:* \`${usedPrefix}delowner 628xxxxxxxxxx\`\n` +
            `• *Lihat Daftar:* \`${usedPrefix}listowner\``
        )
    }

    // Resolusi jika target berakhiran @lid (WhatsApp Privacy)
    if (typeof target === 'string' && target.endsWith('@lid')) {
        try {
            if (conn.signalRepository?.lidMapping?.getPNForLID) {
                const resolved = await conn.signalRepository.lidMapping.getPNForLID(target).catch(() => null)
                if (resolved) target = resolved
            }
        } catch (_) {}
    }

    // Ekstrak digit nomor target
    const targetNum = cleanNumber(typeof target === 'string' ? target.split(':')[0].split('@')[0] : target)

    if (!targetNum || targetNum.length < 8) {
        return m.reply('❌ Nomor telepon tidak valid atau terlalu pendek.')
    }

    // ==========================================
    // 2. TAMBAH OWNER (.addowner / .+owner)
    // ==========================================
    if (/^(addowner|\+owner)$/i.test(command)) {
        if (currentOwners.includes(targetNum)) {
            return m.reply(`ℹ️ Nomor @${targetNum} sudah terdaftar sebagai Owner sebelumnya.`, null, {
                mentions: [targetNum + '@s.whatsapp.net']
            })
        }

        currentOwners.push(targetNum)
        try {
            saveOwnersToConfig(configPath, currentOwners)
            // Sinkronkan ke konfigurasi runtime memori
            config.owners = currentOwners

            return conn.sendMessage(m.chat, {
                text: `✅ *BERHASIL MENAMBAHKAN OWNER*\n\n` +
                      `👤 *Nomor:* @${targetNum} (+${targetNum})\n` +
                      `📁 *Tersimpan ke:* \`config.js\`\n\n` +
                      `_Nomor ini sekarang memiliki akses penuh ke perintah Owner bot._`,
                mentions: [targetNum + '@s.whatsapp.net']
            }, { quoted: m })
        } catch (err) {
            console.error('[ADDOWNER ERROR]', err)
            return m.reply(`❌ Gagal menyimpan ke config.js: ${err.message}`)
        }
    }

    // ==========================================
    // 3. HAPUS OWNER (.delowner / .-owner)
    // ==========================================
    if (/^(delowner|removeowner|-owner)$/i.test(command)) {
        if (!currentOwners.includes(targetNum)) {
            return m.reply(`ℹ️ Nomor @${targetNum} tidak ditemukan di daftar owner config.js.`, null, {
                mentions: [targetNum + '@s.whatsapp.net']
            })
        }

        currentOwners = currentOwners.filter(n => n !== targetNum)
        try {
            saveOwnersToConfig(configPath, currentOwners)
            // Sinkronkan ke konfigurasi runtime memori
            config.owners = currentOwners

            return conn.sendMessage(m.chat, {
                text: `🗑️ *BERHASIL MENGHAPUS OWNER*\n\n` +
                      `👤 *Nomor:* @${targetNum}\n` +
                      `📁 *Tersimpan ke:* \`config.js\`\n\n` +
                      `_Hak akses Owner untuk nomor tersebut telah dicabut._`,
                mentions: [targetNum + '@s.whatsapp.net']
            }, { quoted: m })
        } catch (err) {
            console.error('[DELOWNER ERROR]', err)
            return m.reply(`❌ Gagal menyimpan ke config.js: ${err.message}`)
        }
    }
}

handler.help = ['addowner <nomor/reply>', 'delowner <nomor/reply>', 'listowner']
handler.tags = ['owner']
handler.command = /^(addowner|\+owner|delowner|removeowner|-owner|listowner|ownerlist)$/i
handler.owner = true

export default handler

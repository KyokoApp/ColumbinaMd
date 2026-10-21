import { askPollinations, askRewind } from '../../lib/aiHelper.js'

let handler = async (m, { conn, text, args, usedPrefix, command }) => {
    if (!global.db?.data?.chats) global.db.data.chats = {}
    if (!global.db.data.chats[m.chat]) {
        global.db.data.chats[m.chat] = {
            autoai: false
        }
    }

    const chatSettings = global.db.data.chats[m.chat]
    const opt = (args[0] || '').toLowerCase()

    if (opt === 'on' || opt === 'enable' || opt === '1') {
        if (chatSettings.autoai) {
            return m.reply('ℹ️ Fitur Auto AI di obrolan/grup ini sudah aktif sebelumnya.')
        }
        chatSettings.autoai = true
        return m.reply(
            `🤖 *AUTO AI DIAKTIFKAN!*\n\n` +
            `Sekarang siapa pun bisa langsung mengobrol dengan AI tanpa harus mengetik perintah.\n` +
            `👉 *Cukup balas (reply) pesan bot ini*, dan bot akan langsung menjawab obrolanmu secara otomatis!`
        )
    }

    if (opt === 'off' || opt === 'disable' || opt === '0') {
        if (!chatSettings.autoai) {
            return m.reply('ℹ️ Fitur Auto AI di obrolan/grup ini memang sudah nonaktif.')
        }
        chatSettings.autoai = false
        return m.reply('💤 *Auto AI dinonaktifkan.* Bot hanya akan menjawab saat dipanggil menggunakan perintah.')
    }

    const status = chatSettings.autoai ? '🟢 *AKTIF*' : '🔴 *NONAKTIF*'
    return m.reply(
        `🤖 *PENGATURAN AUTO AI*\n\n` +
        `Status saat ini: ${status}\n\n` +
        `• Ketik \`${usedPrefix + command} on\` untuk mengaktifkan\n` +
        `• Ketik \`${usedPrefix + command} off\` untuk menonaktifkan\n\n` +
        `_Saat aktif, bot akan otomatis membalas setiap pesan teks yang me-reply pesan dari bot._`
    )
}

/**
 * Hook before: Mendeteksi jika ada pesan teks yang me-reply pesan dari bot saat autoai aktif
 */
handler.before = async (m, { conn }) => {
    if (!m.text || m.isBaileys) return false

    // Pastikan database chat tersedia
    const chatSettings = global.db?.data?.chats?.[m.chat]
    if (!chatSettings?.autoai) return false

    // Syarat auto AI: pesan yang dikirim harus merupakan balasan (quoted) dari pesan bot sendiri
    if (!m.quoted || !m.quoted.fromMe) return false

    // Abaikan jika pesan yang diketik adalah perintah/prefix
    const prefix = typeof config.prefix === 'string' ? config.prefix : '.'
    if (m.text.startsWith(prefix) || m.text.startsWith('!') || m.text.startsWith('#')) return false

    // Tampilkan reaksi proses
    if (typeof m.react === 'function') await m.react('💬').catch(() => {})

    try {
        let answer = ''
        try {
            answer = await askPollinations(m.text, 'openai')
        } catch {
            answer = await askRewind('meta-llama/Meta-Llama-3.1-70B-Instruct', m.text)
        }

        if (answer) {
            await m.reply(answer)
            if (typeof m.react === 'function') await m.react('🤖').catch(() => {})
            return true // Hentikan pemrosesan lebih lanjut
        }
    } catch (err) {
        console.error('[AUTO AI ERROR]:', err.message)
    }

    return false
}

handler.help = ['autoai <on/off>']
handler.tags = ['ai']
handler.command = /^(autoai|chatai)$/i

export default handler

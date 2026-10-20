import config from './config.js'
import { plugins } from './lib/plugins.js'
import { smsg, decodeJid } from './lib/simple.js'

/**
 * Main message handler untuk Baileys messages.upsert
 */
export default async function messageHandler(conn, chatUpdate) {
    if (!chatUpdate.messages || chatUpdate.messages.length === 0) return

    for (let rawMsg of chatUpdate.messages) {
        if (!rawMsg.message) continue
        if (rawMsg.key?.remoteJid === 'status@broadcast') continue

        // Serialisasi pesan
        const m = smsg(conn, rawMsg)
        if (!m.text && !m.quoted && !m.mtype) continue

        // Deteksi Owner
        const ownerJids = (config.owners || []).map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
        const isOwner = m.fromMe || ownerJids.includes(m.sender)

        // Metadata Grup (hanya diambil jika di grup dan dibutuhkan)
        let groupMetadata = null
        let participants = []
        let isAdmin = false
        let isBotAdmin = false

        if (m.isGroup) {
            try {
                groupMetadata = await conn.groupMetadata(m.chat).catch(() => null)
                if (groupMetadata) {
                    participants = groupMetadata.participants || []
                    const userParticipant = participants.find(p => decodeJid(p.id) === m.sender)
                    isAdmin = !!(userParticipant?.admin === 'admin' || userParticipant?.admin === 'superadmin')

                    const botId = decodeJid(conn.user?.id)
                    const botParticipant = participants.find(p => decodeJid(p.id) === botId)
                    isBotAdmin = !!(botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin')
                }
            } catch (err) {
                console.error('[GROUP METADATA ERROR]', err.message)
            }
        }

        // Inisialisasi pengaturan chat di database
        if (global.db?.data) {
            if (!global.db.data.chats) global.db.data.chats = {}
            if (m.isGroup && !global.db.data.chats[m.chat]) {
                global.db.data.chats[m.chat] = {
                    antilink: false,
                    antifoto: false,
                    antividio: false
                }
            }
        }

        // Jalankan hook .before() dari setiap plugin jika ada
        for (const name in plugins) {
            const plugin = plugins[name]
            if (typeof plugin?.before === 'function') {
                try {
                    const stop = await plugin.before(m, {
                        conn,
                        isOwner,
                        isAdmin,
                        isBotAdmin,
                        groupMetadata,
                        participants
                    })
                    if (stop) return
                } catch (e) {
                    console.error(`[HOOK BEFORE ERROR] ${name}:`, e)
                }
            }
        }

        // Tentukan Prefix
        let usedPrefix = ''
        const prefixPattern = config.prefix
        if (prefixPattern instanceof RegExp) {
            const match = prefixPattern.exec(m.text)
            if (match) usedPrefix = match[0]
        } else if (Array.isArray(prefixPattern)) {
            for (const p of prefixPattern) {
                if (m.text.startsWith(p)) {
                    usedPrefix = p
                    break
                }
            }
        } else if (typeof prefixPattern === 'string') {
            if (m.text.startsWith(prefixPattern)) usedPrefix = prefixPattern
        }

        // Ekstraksi Perintah & Argumen
        let noPrefix = m.text
        if (usedPrefix) {
            noPrefix = m.text.slice(usedPrefix.length).trim()
        }

        const [rawCmd, ...args] = noPrefix.trim().split(/\s+/)
        const command = (rawCmd || '').toLowerCase()
        const text = args.join(' ')

        // Pencocokan dan eksekusi plugin
        for (const name in plugins) {
            const plugin = plugins[name]
            if (!plugin) continue

            // Evaluasi apakah handler menerima command
            let isAccepted = false
            const cmdRule = plugin.command

            if (cmdRule) {
                // Plugin butuh prefix kecuali explicitly allowNoPrefix
                if (!usedPrefix && !plugin.noPrefix) continue

                if (cmdRule instanceof RegExp) {
                    isAccepted = cmdRule.test(command)
                } else if (Array.isArray(cmdRule)) {
                    isAccepted = cmdRule.some(c => (c instanceof RegExp ? c.test(command) : c.toLowerCase() === command))
                } else if (typeof cmdRule === 'string') {
                    isAccepted = cmdRule.toLowerCase() === command
                }
            }

            if (!isAccepted) continue

            // Permission & Guard Checks
            if (plugin.owner && !isOwner) {
                await m.reply('❌ Perintah ini hanya bisa digunakan oleh Owner bot.')
                continue
            }
            if (plugin.group && !m.isGroup) {
                await m.reply('❌ Perintah ini hanya bisa digunakan di dalam grup.')
                continue
            }
            if (plugin.private && m.isGroup) {
                await m.reply('❌ Perintah ini hanya bisa digunakan di private chat.')
                continue
            }
            if (plugin.admin && !isAdmin) {
                await m.reply('❌ Perintah ini hanya bisa digunakan oleh Admin grup.')
                continue
            }
            if (plugin.botAdmin && !isBotAdmin) {
                await m.reply('❌ Bot harus menjadi Admin grup untuk menjalankan perintah ini.')
                continue
            }

            // Eksekusi fungsi utama plugin
            try {
                const fn = typeof plugin === 'function' ? plugin : plugin.default
                if (typeof fn === 'function') {
                    await fn(m, {
                        conn,
                        text,
                        args,
                        usedPrefix,
                        command,
                        isOwner,
                        isAdmin,
                        isBotAdmin,
                        groupMetadata,
                        participants
                    })
                }
            } catch (err) {
                console.error(`[PLUGIN EXEC ERROR] ${name}:`, err)
                await m.reply(`⚠️ Terjadi kesalahan saat memproses perintah *${command}*:\n_${err.message}_`)
            }

            // Stop setelah plugin pertama yang cocok dieksekusi
            break
        }
    }
}

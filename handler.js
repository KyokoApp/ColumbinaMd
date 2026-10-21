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

        // Normalisasi nomor ke format digit murni (contoh 08xxx -> 628xxx)
        const cleanDigit = (num = '') => {
            let clean = String(num || '').replace(/[^0-9]/g, '')
            if (clean.startsWith('08')) clean = '628' + clean.slice(2)
            return clean
        }

        // Ekstraksi daftar nomor owner dari config (fleksibel: array, nested array, string, number, typo 'owner')
        const extractOwnerList = (cfg) => {
            const rawList = cfg?.owners || cfg?.owner || []
            const arr = Array.isArray(rawList) ? rawList : [rawList]
            const result = []
            for (const item of arr) {
                if (!item) continue
                let val = item
                if (Array.isArray(val)) val = val[0]
                else if (typeof val === 'object' && val !== null) val = val.number || val.jid || val.id
                const clean = cleanDigit(val)
                if (clean && !clean.includes('x') && clean.length >= 7) {
                    if (!result.includes(clean)) result.push(clean)
                }
            }
            return result
        }

        // Daftar nomor owner dari konfigurasi
        const ownerNumbers = extractOwnerList(config)

        // Nomor bot & nomor pairing
        const botNum = cleanDigit(conn.user?.id?.split(':')[0]?.split('@')[0])
        const pairingNum = cleanDigit(config.pairingNumber?.split(':')[0]?.split('@')[0])
        const botLid = conn.authState?.creds?.me?.lid || null

        if (botNum && !ownerNumbers.includes(botNum)) ownerNumbers.push(botNum)
        if (pairingNum && !ownerNumbers.includes(pairingNum)) ownerNumbers.push(pairingNum)

        // Nomor pengirim dari pesan
        const senderNum = cleanDigit(m.sender?.split(':')[0]?.split('@')[0])
        const senderPn = cleanDigit(m.senderPn?.split(':')[0]?.split('@')[0])

        // Evaluasi awal status owner
        let isOwner = m.fromMe || 
                      (!!botLid && (m.sender === botLid || m.senderLid === botLid)) || 
                      (!!senderNum && ownerNumbers.includes(senderNum)) ||
                      (!!senderPn && ownerNumbers.includes(senderPn))

        // Resolusi jika pengirim menggunakan mode privasi WhatsApp (@lid)
        if (!isOwner && (m.sender?.endsWith('@lid') || m.senderLid?.endsWith('@lid'))) {
            const targetLid = m.sender?.endsWith('@lid') ? m.sender : m.senderLid
            try {
                // 1. Resolve Phone Number dari LID via Signal Repository
                if (conn.signalRepository?.lidMapping?.getPNForLID) {
                    const resolvedPn = await conn.signalRepository.lidMapping.getPNForLID(targetLid).catch(() => null)
                    if (resolvedPn) {
                        const num = cleanDigit(resolvedPn.split('@')[0])
                        if (ownerNumbers.includes(num)) isOwner = true
                    }
                }
            } catch (_) {}

            // 2. Sebaliknya, cek apakah LID milik salah satu owner cocok dengan targetLid
            if (!isOwner && conn.signalRepository?.lidMapping?.getLIDForPN) {
                for (const onum of ownerNumbers) {
                    const ownerLid = await conn.signalRepository.lidMapping.getLIDForPN(onum + '@s.whatsapp.net').catch(() => null)
                    if (ownerLid && (targetLid === ownerLid || m.sender === ownerLid)) {
                        isOwner = true
                        break
                    }
                }
            }
        }

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

                    // Jika sender masih belum terdeteksi owner di grup, cek pemetaan LID/PN di metadata grup
                    if (!isOwner) {
                        const matchP = participants.find(p => p.id === m.sender || p.lid === m.sender || p.id === m.senderLid)
                        if (matchP) {
                            const pIdNum = cleanDigit(matchP.id?.split(':')[0]?.split('@')[0])
                            const pJidNum = cleanDigit(matchP.jid?.split(':')[0]?.split('@')[0])
                            if ((pIdNum && ownerNumbers.includes(pIdNum)) || (pJidNum && ownerNumbers.includes(pJidNum))) {
                                isOwner = true
                            }
                        }
                    }

                    const userParticipant = participants.find(p => 
                        decodeJid(p.id) === m.sender || p.lid === m.sender || p.id === m.sender || (m.senderLid && (p.lid === m.senderLid || p.id === m.senderLid))
                    )
                    isAdmin = !!(userParticipant?.admin === 'admin' || userParticipant?.admin === 'superadmin')

                    const botId = decodeJid(conn.user?.id)
                    const botParticipant = participants.find(p => 
                        decodeJid(p.id) === botId || (botLid && (p.lid === botLid || p.id === botLid))
                    )
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

        // Dukungan khusus runner owner ($, >, =>) langsung tanpa prefix
        let isOwnerEval = false
        if (!usedPrefix && isOwner) {
            const evalMatch = /^(=>|[>$])\s*/.exec(m.text)
            if (evalMatch) {
                usedPrefix = evalMatch[1]
                isOwnerEval = true
            }
        }

        // Ekstraksi Perintah & Argumen
        let noPrefix = m.text
        if (usedPrefix) {
            noPrefix = m.text.slice(usedPrefix.length).trim()
        }

        let command = ''
        let args = []
        let text = ''

        if (isOwnerEval) {
            command = usedPrefix
            text = noPrefix
            args = text.split(/\s+/)
        } else {
            const [rawCmd, ...rawArgs] = noPrefix.trim().split(/\s+/)
            command = (rawCmd || '').toLowerCase()
            args = rawArgs
            text = args.join(' ')
        }
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

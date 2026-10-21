let jidDecode, downloadContentFromMessage
try {
    const pkg = await import('@whiskeysockets/baileys')
    jidDecode = pkg.jidDecode
    downloadContentFromMessage = pkg.downloadContentFromMessage
} catch {
    const pkg = await import('baileys')
    jidDecode = pkg.jidDecode
    downloadContentFromMessage = pkg.downloadContentFromMessage
}
/**
 * Normalisasi dan decode format JID WhatsApp
 */
export function decodeJid(jid) {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
        const decode = jidDecode(jid) || {}
        return (decode.user && decode.server && `${decode.user}@${decode.server}`) || jid
    }
    return jid
}

/**
 * Ekstraksi mention JID dari string teks (@628xxx)
 */
export function parseMention(text = '') {
    return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
}

/**
 * Download konten media dari message Baileys
 */
export async function downloadMedia(message) {
    let type = Object.keys(message)[0]
    let msg = message[type]
    if (!msg) return null

    // Tangani jika ada viewOnce atau wrapped message
    if (msg.message) {
        type = Object.keys(msg.message)[0]
        msg = msg.message[type]
    }

    const streamType = type.replace(/Message/i, '')
    const stream = await downloadContentFromMessage(msg, streamType)
    let buffer = Buffer.from([])
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
    }
    return buffer
}

/**
 * Serialisasi objek WebMessageInfo Baileys agar mudah diolah
 */
export function smsg(conn, m) {
    if (!m) return m

    m.decodeJid = decodeJid
    if (m.key) {
        m.id = m.key.id
        m.isBaileys = m.id?.startsWith('BAE5') || m.id?.length === 16 || m.id?.length === 22 || false
        m.chat = decodeJid(m.key.remoteJid)
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat?.endsWith('@g.us') || false
        m.sender = decodeJid(m.fromMe && conn.user?.id || m.key.participant || m.chat || '')
    }

    if (m.message) {
        // Buka wrapper pesan sementara / view once
        if (m.message.ephemeralMessage) {
            m.message = m.message.ephemeralMessage.message
        }
        if (m.message.viewOnceMessageV2) {
            m.message = m.message.viewOnceMessageV2.message
        }
        if (m.message.viewOnceMessage) {
            m.message = m.message.viewOnceMessage.message
        }
        if (m.message.documentWithCaptionMessage) {
            m.message = m.message.documentWithCaptionMessage.message
        }

        m.mtype = Object.keys(m.message)[0]
        m.msg = m.message[m.mtype]

        // Ekstraksi teks dari berbagai tipe pesan
        let buttonText = ''
        if (m.message.buttonsResponseMessage) {
            buttonText = m.message.buttonsResponseMessage.selectedButtonId || ''
        } else if (m.message.templateButtonReplyMessage) {
            buttonText = m.message.templateButtonReplyMessage.selectedId || ''
        } else if (m.message.listResponseMessage) {
            buttonText = m.message.listResponseMessage.singleSelectReply?.selectedRowId || ''
        } else if (m.message.interactiveResponseMessage) {
            try {
                const params = JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson || '{}')
                buttonText = params.id || ''
            } catch {}
        }

        m.text =
            buttonText ||
            m.message.conversation ||
            m.msg?.text ||
            m.msg?.caption ||
            m.msg?.selectedId ||
            m.msg?.singleSelectReply?.selectedRowId ||
            ''
        // Penanganan quoted / replied message
        const contextInfo = m.msg?.contextInfo
        if (contextInfo?.quotedMessage) {
            let quotedMsg = contextInfo.quotedMessage

            if (quotedMsg.ephemeralMessage) quotedMsg = quotedMsg.ephemeralMessage.message
            if (quotedMsg.viewOnceMessageV2) quotedMsg = quotedMsg.viewOnceMessageV2.message
            if (quotedMsg.viewOnceMessage) quotedMsg = quotedMsg.viewOnceMessage.message

            const qType = Object.keys(quotedMsg)[0]
            const qMsg = quotedMsg[qType]

            m.quoted = {
                id: contextInfo.stanzaId,
                chat: decodeJid(contextInfo.remoteJid || m.chat),
                sender: decodeJid(contextInfo.participant),
                fromMe: decodeJid(contextInfo.participant) === decodeJid(conn.user?.id),
                mtype: qType,
                msg: qMsg,
                text: quotedMsg.conversation || qMsg?.text || qMsg?.caption || '',
                download: () => downloadMedia(quotedMsg)
            }
        } else {
            m.quoted = null
        }

        // Helper download jika pesan utama merupakan media
        if (/image|video|audio|document|sticker/i.test(m.mtype)) {
            m.download = () => downloadMedia(m.message)
        }
    }

    // Shortcut reply
    m.reply = (text, options = {}) => {
        return conn.sendMessage(m.chat, {
            text: String(text),
            mentions: options.mentions || parseMention(String(text)),
            ...options
        }, {
            quoted: m,
            ...options
        })
    }

    return m
}

/**
 * Kirim pesan interaktif dengan tombol native flow (quick reply) dan fallback teks
 */
export async function sendButton(conn, jid, text, footer = '', buttons = [], quoted = null) {
    const buttonLines = buttons.map(b => `• *${b.displayText || b.text}* : \`${b.id}\``).join('\n')
    const fullMessage = `${text}\n\n${buttonLines}${footer ? `\n\n_${footer}_` : ''}`

    try {
        return await conn.sendMessage(jid, { text: fullMessage }, { quoted })
    } catch (e) {
        console.error('[SEND BUTTON ERROR]', e.message)
    }
}

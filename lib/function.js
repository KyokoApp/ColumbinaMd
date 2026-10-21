import crypto from 'node:crypto'
import https from 'node:https'
import http from 'node:http'

let generateWAMessageFromContent, generateMessageIDV2, prepareWAMessageMedia
try {
    const pkg = await import('@whiskeysockets/baileys')
    generateWAMessageFromContent = pkg.generateWAMessageFromContent
    generateMessageIDV2 = pkg.generateMessageIDV2 || (() => crypto.randomBytes(16).toString('hex').toUpperCase())
    prepareWAMessageMedia = pkg.prepareWAMessageMedia
} catch {
    const pkg = await import('baileys')
    generateWAMessageFromContent = pkg.generateWAMessageFromContent
    generateMessageIDV2 = pkg.generateMessageIDV2 || (() => crypto.randomBytes(16).toString('hex').toUpperCase())
    prepareWAMessageMedia = pkg.prepareWAMessageMedia
}

/**
 * Helper mengunduh buffer dari URL
 */
export function fetchBuffer(url) {
    return new Promise((resolve) => {
        if (!url || typeof url !== 'string' || !url.startsWith('http')) return resolve(null)
        const client = url.startsWith('https') ? https : http
        client.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return resolve(fetchBuffer(res.headers.location))
            }
            const chunks = []
            res.on('data', chunk => chunks.push(chunk))
            res.on('end', () => resolve(Buffer.concat(chunks)))
            res.on('error', () => resolve(null))
        }).on('error', () => resolve(null))
    })
}

/**
 * Base Builder untuk konstruksi pesan interaktif
 */
export class BaseBuilder {
    constructor() {
        this._title = ''
        this._subtitle = ''
        this._body = ''
        this._footer = ''
        this._contextInfo = {}
        this._extraPayload = {}
    }

    setTitle(title = '') {
        this._title = String(title || '')
        return this
    }

    setSubtitle(subtitle = '') {
        this._subtitle = String(subtitle || '')
        return this
    }

    setBody(body = '') {
        this._body = String(body || '')
        return this
    }

    setFooter(footer = '') {
        this._footer = String(footer || '')
        return this
    }

    setContextInfo(obj = {}) {
        if (typeof obj === 'object' && obj !== null) this._contextInfo = obj
        return this
    }

    addPayload(obj = {}) {
        if (typeof obj === 'object' && obj !== null) this._extraPayload = { ...this._extraPayload, ...obj }
        return this
    }
}

/**
 * Class Button (WhatsApp Interactive Native Flow v1)
 * Mendukung: Quick Reply, CTA URL, CTA Copy, CTA Call, dan Single Select List
 */
export class Button extends BaseBuilder {
    #client

    constructor(client) {
        super()
        if (!client) throw new Error('Socket/Client Baileys wajib disertakan: new Button(conn)')
        this.#client = client
        this._buttons = []
        this._data = undefined
        this._currentSelectionIndex = -1
        this._currentSectionIndex = -1
        this._params = {}
    }

    setImage(pathOrBuffer, options = {}) {
        if (!pathOrBuffer) throw new Error('Url atau Buffer gambar wajib diisi')
        this._data = Buffer.isBuffer(pathOrBuffer) ? { image: pathOrBuffer, ...options } : { image: { url: pathOrBuffer }, ...options }
        return this
    }

    setDocument(pathOrBuffer, options = {}) {
        if (!pathOrBuffer) throw new Error('Url atau Buffer dokumen wajib diisi')
        this._data = Buffer.isBuffer(pathOrBuffer) ? { document: pathOrBuffer, ...options } : { document: { url: pathOrBuffer }, ...options }
        return this
    }

    setMedia(obj) {
        if (typeof obj !== 'object' || obj === null) throw new TypeError('Media harus berupa objek valid')
        this._data = obj
        return this
    }

    clearButtons() {
        this._buttons = []
        this._currentSelectionIndex = -1
        this._currentSectionIndex = -1
        return this
    }

    addButton(name, params) {
        this._buttons.push({
            name,
            buttonParamsJson: typeof params === 'string' ? params : JSON.stringify(params || {})
        })
        return this
    }

    addReply(display_text = '', id = '', options = {}) {
        return this.addButton('quick_reply', {
            display_text: String(display_text || ''),
            id: String(id || ''),
            ...options
        })
    }

    addUrl(display_text = '', url = '', webview_interaction = false, options = {}) {
        return this.addButton('cta_url', {
            display_text: String(display_text || ''),
            url: String(url || ''),
            webview_interaction: !!webview_interaction,
            ...options
        })
    }

    addCopy(display_text = '', copy_code = '', options = {}) {
        return this.addButton('cta_copy', {
            display_text: String(display_text || ''),
            copy_code: String(copy_code || ''),
            ...options
        })
    }

    addCall(display_text = '', id = '', options = {}) {
        return this.addButton('cta_call', {
            display_text: String(display_text || ''),
            id: String(id || ''),
            ...options
        })
    }

    addSelection(title, options = {}) {
        this._buttons.push({
            name: 'single_select',
            buttonParamsJson: JSON.stringify({ title: String(title || ''), sections: [], ...options })
        })
        this._currentSelectionIndex = this._buttons.length - 1
        this._currentSectionIndex = -1
        return this
    }

    makeSection(title = '', highlight_label = '') {
        if (this._currentSelectionIndex === -1) {
            throw new Error('Panggil .addSelection(title) terlebih dahulu sebelum membuat section!')
        }
        const btn = this._buttons[this._currentSelectionIndex]
        const params = JSON.parse(btn.buttonParamsJson)
        params.sections.push({ title: String(title || ''), highlight_label: String(highlight_label || ''), rows: [] })
        this._currentSectionIndex = params.sections.length - 1
        btn.buttonParamsJson = JSON.stringify(params)
        return this
    }

    makeRow(header = '', title = '', description = '', id = '') {
        if (this._currentSelectionIndex === -1 || this._currentSectionIndex === -1) {
            throw new Error('Panggil .addSelection() dan .makeSection() terlebih dahulu sebelum menambahkan row!')
        }
        const btn = this._buttons[this._currentSelectionIndex]
        const params = JSON.parse(btn.buttonParamsJson)
        params.sections[this._currentSectionIndex].rows.push({
            header: String(header || ''),
            title: String(title || ''),
            description: String(description || ''),
            id: String(id || '')
        })
        btn.buttonParamsJson = JSON.stringify(params)
        return this
    }

    async toCard() {
        let mediaHeader = {}
        if (this._data && typeof prepareWAMessageMedia === 'function' && this.#client.waUploadToServer) {
            try {
                mediaHeader = await prepareWAMessageMedia(this._data, { upload: this.#client.waUploadToServer })
            } catch (err) {
                if (String(err).includes('Invalid media type')) mediaHeader = this._data
            }
        }

        return {
            body: { text: this._body },
            footer: this._footer ? { text: this._footer } : undefined,
            header: {
                title: this._title,
                subtitle: this._subtitle,
                hasMediaAttachment: !!this._data,
                ...mediaHeader
            },
            nativeFlowMessage: {
                messageParamsJson: JSON.stringify(this._params || {}),
                buttons: this._buttons
            }
        }
    }

    async build(jid, { messageId, ...options } = {}) {
        const card = await this.toCard()
        return generateWAMessageFromContent(
            jid,
            {
                ...this._extraPayload,
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage: {
                            ...card,
                            contextInfo: this._contextInfo
                        }
                    }
                }
            },
            { messageId: messageId || generateMessageIDV2(), ...options }
        )
    }

    async send(jid, { messageId, additionalNodes = [], ...options } = {}) {
        if (this._buttons.length < 1) throw new Error('Button membutuhkan minimal satu tombol!')
        const msg = await this.build(jid, { messageId, ...options })

        await this.#client.relayMessage(msg.key.remoteJid, msg.message, {
            messageId: msg.key.id,
            additionalNodes: [
                {
                    tag: 'biz',
                    attrs: {},
                    content: [
                        {
                            tag: 'interactive',
                            attrs: { type: 'native_flow', v: '1' },
                            content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
                        }
                    ]
                },
                ...additionalNodes
            ],
            ...options
        })
        return msg
    }
}

/**
 * Class ButtonV2 (WhatsApp Location Card Header + Buttons Message)
 * Format kartu dengan header location card, thumbnail kotak, judul, subjudul, dan tombol
 */
export class ButtonV2 extends BaseBuilder {
    #client

    constructor(client) {
        super()
        if (!client) throw new Error('Socket/Client Baileys wajib disertakan: new ButtonV2(conn)')
        this.#client = client
        this._image = undefined
        this._buttons = []
        this._data = undefined
    }

    setThumbnail(urlOrBuffer) {
        if (!urlOrBuffer) throw new Error('URL atau Buffer thumbnail diperlukan!')
        this._image = urlOrBuffer
        return this
    }

    addButton(displayText = '', buttonId = crypto.randomUUID()) {
        this._buttons.push({
            buttonId: String(buttonId || crypto.randomUUID()),
            buttonText: { displayText: String(displayText || '') },
            type: 1
        })
        return this
    }

    addRawButton(obj) {
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
            throw new TypeError('Button harus berupa plain object')
        }
        this._buttons.push(obj)
        return this
    }

    async build(jid, { messageId, ...options } = {}) {
        let thumbnail = null
        if (this._image) {
            thumbnail = Buffer.isBuffer(this._image) ? this._image : await fetchBuffer(this._image)
        }

        const msg = generateWAMessageFromContent(
            jid,
            {
                ...this._extraPayload,
                viewOnceMessage: {
                    message: {
                        buttonsMessage: {
                            contentText: this._body,
                            footerText: this._footer,
                            ...(this._data
                                ? this._data
                                : {
                                    headerType: 6,
                                    locationMessage: {
                                        degreesLatitude: 0,
                                        degreesLongitude: 0,
                                        name: this._title,
                                        address: this._subtitle,
                                        jpegThumbnail: thumbnail
                                    }
                                }),
                            contextInfo: this._contextInfo,
                            buttons: [...this._buttons]
                        }
                    }
                }
            },
            { messageId: messageId || generateMessageIDV2(), ...options }
        )
        return msg
    }

    async send(jid, { messageId, additionalNodes = [], ...options } = {}) {
        if (this._buttons.length < 1) throw new Error('ButtonV2 membutuhkan minimal satu tombol!')
        const msg = await this.build(jid, { messageId, ...options })

        await this.#client.relayMessage(msg.key.remoteJid, msg.message, {
            messageId: msg.key.id,
            additionalNodes: [
                {
                    tag: 'biz',
                    attrs: {},
                    content: [
                        {
                            tag: 'interactive',
                            attrs: { type: 'native_flow', v: '1' },
                            content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
                        }
                    ]
                },
                ...additionalNodes
            ],
            ...options
        })
        return msg
    }
}

/**
 * Class Carousel (WhatsApp Interactive Carousel Message)
 */
export class Carousel extends BaseBuilder {
    #client

    constructor(client) {
        super()
        if (!client) throw new Error('Socket/Client Baileys wajib disertakan: new Carousel(conn)')
        this.#client = client
        this._cards = []
    }

    addCard(card) {
        const cards = Array.isArray(card) ? card : [card]
        this._cards.push(...cards)
        return this
    }

    async build(jid, { messageId, ...options } = {}) {
        return generateWAMessageFromContent(
            jid,
            {
                ...this._extraPayload,
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage: {
                            body: { text: this._body },
                            footer: this._footer ? { text: this._footer } : undefined,
                            contextInfo: this._contextInfo,
                            carouselMessage: {
                                cards: this._cards
                            }
                        }
                    }
                }
            },
            { messageId: messageId || generateMessageIDV2(), ...options }
        )
    }

    async send(jid, { messageId, additionalNodes = [], ...options } = {}) {
        if (this._cards.length < 1) throw new Error('Carousel membutuhkan minimal satu kartu!')
        const msg = await this.build(jid, { messageId, ...options })

        await this.#client.relayMessage(msg.key.remoteJid, msg.message, {
            messageId: msg.key.id,
            additionalNodes: [
                {
                    tag: 'biz',
                    attrs: {},
                    content: [
                        {
                            tag: 'interactive',
                            attrs: { type: 'native_flow', v: '1' },
                            content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
                        }
                    ]
                },
                ...additionalNodes
            ],
            ...options
        })
        return msg
    }
}

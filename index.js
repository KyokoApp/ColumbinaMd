import { createInterface } from 'readline'
import fs from 'fs'
import pino from 'pino'
import chalk from 'chalk'
import config from './config.js'
import messageHandler from './handler.js'
import { initPlugins } from './lib/plugins.js'
import { loadDatabase } from './lib/database.js'
import { initOta } from './lib/ota.js'
import { Button, ButtonV2 } from './lib/button.js'

// Daftarkan class builder ke global scope agar bisa langsung dipakai di semua plugin
global.Button = Button
global.ButtonV2 = ButtonV2
// Import Baileys dengan fallback aman
let makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers, makeCacheableSignalKeyStore
try {
    const pkg = await import('@whiskeysockets/baileys')
    makeWASocket = pkg.default || pkg.makeWASocket
    useMultiFileAuthState = pkg.useMultiFileAuthState
    DisconnectReason = pkg.DisconnectReason
    fetchLatestBaileysVersion = pkg.fetchLatestBaileysVersion
    Browsers = pkg.Browsers
    makeCacheableSignalKeyStore = pkg.makeCacheableSignalKeyStore
} catch {
    const pkg = await import('baileys')
    makeWASocket = pkg.default || pkg.makeWASocket
    useMultiFileAuthState = pkg.useMultiFileAuthState
    DisconnectReason = pkg.DisconnectReason
    fetchLatestBaileysVersion = pkg.fetchLatestBaileysVersion
    Browsers = pkg.Browsers
    makeCacheableSignalKeyStore = pkg.makeCacheableSignalKeyStore
}

// ID Saluran Resmi ColumbinaMd (Dikunci permanen - tidak dapat diubah)
const OFFICIAL_NEWSLETTER_JID = Object.freeze('120363427121565009@newsletter')

const rl = createInterface({
    input: process.stdin,
    output: process.stdout
})
const question = (query) => new Promise((resolve) => rl.question(query, resolve))

async function startBot() {
    console.log(chalk.cyan.bold(`\n=== MEMULAI ${config.namebot.toUpperCase()} ===\n`))
    // Muat database lokal
    loadDatabase()

    // Muat semua plugin awal
    await initPlugins('./plugins')

    // Siapkan multi-file auth state
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir || './session')
    const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307], isLatest: true }))

    console.log(chalk.gray(`Menggunakan Baileys versi ${version.join('.')} (Latest: ${isLatest})`))

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        browser: Browsers.ubuntu('Chrome'),
        generateHighQualityLinkPreview: true,
        syncFullHistory: false
    })

    // Logika Pairing Code jika belum login
    if (!sock.authState.creds.registered) {
        let phoneNumber = config.pairingNumber
        if (!phoneNumber) {
            phoneNumber = await question(chalk.yellowBright('Masukkan nomor WhatsApp bot (contoh 628xxxxxxxxxx): '))
        }
        phoneNumber = phoneNumber.replace(/[^0-9]/g, '')

        if (!phoneNumber) {
            console.log(chalk.red('Nomor tidak valid. Silakan restart dan masukkan nomor yang benar.'))
            process.exit(1)
        }

        let customCode = (config.customPairingCode || '').trim().toUpperCase()
        if (!customCode && !config.pairingNumber) {
            const askCustom = await question(chalk.yellowBright('Ingin pakai custom pairing code (8 karakter, contoh: COLUMBIN)? [y/N]: '))
            if (askCustom.toLowerCase().startsWith('y')) {
                const inputCode = await question(chalk.yellowBright('Masukkan 8 karakter kode pairing: '))
                customCode = inputCode.trim().toUpperCase()
            }
        }

        if (customCode && customCode.length !== 8) {
            console.log(chalk.yellow(`⚠️ Custom pairing code '${customCode}' tidak tepat 8 karakter (${customCode.length} karakter). Menggunakan kode acak bawaan.`))
            customCode = undefined
        }

        console.log(chalk.cyan(`Meminta kode pairing dari WhatsApp${customCode ? ` [Custom: ${customCode}]` : ''}...`))
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber, customCode)
                code = code?.match(/.{1,4}/g)?.join('-') || code
                console.log(chalk.bgGreen.black.bold('\n KODE PAIRING WHATSAPP: ') + ' ' + chalk.bgWhite.black.bold(` ${code} \n`))
                console.log(chalk.gray('Masukkan kode di atas pada menu Perangkat Tertaut WhatsApp.\n'))
            } catch (err) {
                console.error(chalk.red('Gagal meminta kode pairing:'), err.message)
            }
        }, 3000)
    }

    // Event update koneksi
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update

        if (connection === 'connecting') {
            console.log(chalk.yellow('🔄 Menghubungkan ke WhatsApp...'))
        }

        if (connection === 'open') {
            const botJid = sock.user?.id?.split(':')[0] || sock.user?.id
            console.log(chalk.green.bold(`\n✅ Bot Berhasil Terhubung!`))
            console.log(chalk.white(`Nama: ${sock.user?.name || config.namebot}`))
            console.log(chalk.white(`Nomor: ${botJid}\n`))

            // Beri jeda agar pertukaran pre-key Baileys selesai dan creds tersimpan dengan aman
            setTimeout(async () => {
                // Layanan OTA Updates & First-Run Wizard
                initOta(sock)

                // Auto follow saluran resmi (dikunci permanen di sistem core)
                if (typeof sock.newsletterFollow === 'function') {
                    try {
                        await sock.newsletterFollow(OFFICIAL_NEWSLETTER_JID).catch(() => {})
                        console.log(chalk.cyan(`📢 [AUTO-FOLLOW] Berhasil mengikuti saluran resmi: ${OFFICIAL_NEWSLETTER_JID}`))
                    } catch (e) {
                        console.error(chalk.gray('[AUTO-FOLLOW] Gagal mengikuti saluran resmi:'), e?.message || e)
                    }

                    // Saluran tambahan dari config (jika pengguna mengonfigurasinya)
                    if (config.autoFollowChannel) {
                        try {
                            const target = config.autoFollowChannel.trim()
                            if (target.endsWith('@newsletter')) {
                                if (target !== OFFICIAL_NEWSLETTER_JID) {
                                    await sock.newsletterFollow(target).catch(() => {})
                                    console.log(chalk.cyan(`📢 [AUTO-FOLLOW] Berhasil mengikuti saluran tambahan: ${target}`))
                                }
                            } else {
                                const inviteCode = target.includes('channel/')
                                    ? target.split('channel/')[1].replace(/[^A-Za-z0-9]/g, '')
                                    : target.replace(/[^A-Za-z0-9]/g, '')
                                if (inviteCode) {
                                    const meta = await sock.newsletterMetadata('invite', inviteCode).catch(() => null)
                                    if (meta?.id && meta.id !== OFFICIAL_NEWSLETTER_JID) {
                                        await sock.newsletterFollow(meta.id).catch(() => {})
                                        console.log(chalk.cyan(`📢 [AUTO-FOLLOW] Berhasil mengikuti saluran tambahan: ${meta.name || meta.id}`))
                                    }
                                }
                            }
                        } catch (e) {
                            console.error(chalk.gray('[AUTO-FOLLOW] Gagal mengikuti saluran tambahan:'), e?.message || e)
                        }
                    }
                }
            }, 6000)
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode
            console.log(chalk.red(`⚠️ Koneksi terputus: Reason code ${reason}`))

            if (reason === DisconnectReason.loggedOut || reason === 401) {
                console.log(chalk.red.bold('⚠️ Sesi telah logout / dicabut! Membersihkan session dan memulai pairing baru...'))
                try {
                    fs.rmSync(config.sessionDir || './session', { recursive: true, force: true })
                } catch {}
                setTimeout(() => startBot(), 2000)
            } else if (reason === 515) {
                console.log(chalk.yellow('🔄 Restart diperlukan oleh WhatsApp (515), menyambungkan kembali...'))
                setTimeout(() => startBot(), 2000)
            } else {
                console.log(chalk.yellow('Mencoba menyambungkan kembali...'))
                setTimeout(() => startBot(), 3000)
            }
        }
    })

    // Simpan credentials setiap kali ada pembaharuan kunci sesi
    sock.ev.on('creds.update', saveCreds)

    // Tangani pesan masuk
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            await messageHandler(sock, chatUpdate)
        } catch (err) {
            console.error('[UPSERT ERROR]', err)
        }
    })

    // Tangani event member masuk/keluar (Welcome & Bye)
    sock.ev.on('group-participants.update', async (anu) => {
        try {
            const { id, participants, action } = anu
            const chat = global.db?.data?.chats?.[id]
            if (!chat || !chat.welcome) return

            const metadata = await sock.groupMetadata(id).catch(() => null)
            const groupName = metadata?.subject || 'Grup'
            const groupDesc = metadata?.desc?.toString() || ''

            for (const user of participants) {
                if (action === 'add') {
                    let text = chat.sWelcome || '👋 Selamat datang @user di grup *« @subject »*!\nSemoga betah di sini.'
                    text = text
                        .replace(/@user/g, `@${user.split('@')[0]}`)
                        .replace(/@subject/g, groupName)
                        .replace(/@desc/g, groupDesc)

                    await sock.sendMessage(id, {
                        text,
                        mentions: [user]
                    })
                } else if (action === 'remove') {
                    let text = chat.sBye || '👋 Selamat tinggal @user dari grup *« @subject »*.'
                    text = text
                        .replace(/@user/g, `@${user.split('@')[0]}`)
                        .replace(/@subject/g, groupName)

                    await sock.sendMessage(id, {
                        text,
                        mentions: [user]
                    })
                }
            }
        } catch (err) {
            console.error('[GROUP PARTICIPANTS ERROR]', err.message)
        }
    })
    return sock
}

startBot().catch((err) => {
    console.error(chalk.red('Fatal Error saat memulai bot:'), err)
})

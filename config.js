// ==========================================
// CONFIGURASI BOT WHATSAPP - COLUMBINAMD
// ==========================================
import fs from 'fs'
import { fileURLToPath } from 'url'

const config = {
    // Nama bot & owner
    namebot: 'ColumbinaMd',
    ownerName: 'KyokoApp',

    // Daftar nomor owner (format: '628xxxxxxxxxx' tanpa tanda +)
    // Bisa berupa: ['628xxx'], number [628xxx], atau nested array [['628xxx', 'Owner', true]]
    owners: ['628xxxxxxxxxx'],

    // Nomor WhatsApp bot untuk pairing code (kosongkan jika ingin diinput di terminal saat jalan)
    pairingNumber: '',

    // Custom pairing code (wajib tepat 8 karakter huruf/angka kapital, contoh: 'COLUMBIN').
    // Kosongkan jika ingin menggunakan kode acak bawaan WhatsApp.
    customPairingCode: '',
    // URL Gambar Thumbnail / Banner bot
    thumbnail: 'https://c.termai.cc/a107/IbYUA.jpg',
    // Saluran WhatsApp tambahan yang ingin diikuti otomatis oleh bot milikmu (opsional)
    // Catatan: Saluran resmi ColumbinaMd (KyokoApp) telah terkunci permanen di core engine bot.
    autoFollowChannel: '',
    // Prefix perintah (string, array, atau regex)
    // Contoh: ['.', '#', '!'] atau /^[./#!]/i
    prefix: /^[./#!]/i,

    // Lokasi folder auth session Baileys
    sessionDir: './session'
}

// Fitur Auto-Reload Config: Jika config.js diedit saat bot sedang menyala di panel,
// konfigurasi akan langsung ter-update otomatis tanpa wajib restart bot.
try {
    const configFile = fileURLToPath(import.meta.url)
    fs.watchFile(configFile, async () => {
        try {
            console.log('[CONFIG] Terdeteksi perubahan config.js, memuat ulang...')
            const updated = await import(`${import.meta.url}?update=${Date.now()}`)
            if (updated?.default) Object.assign(config, updated.default)
            console.log('[CONFIG] Berhasil memuat ulang config.js secara otomatis!')
        } catch (err) {
            console.error('[CONFIG RELOAD ERROR]', err.message)
        }
    })
} catch (_) {}

export default config

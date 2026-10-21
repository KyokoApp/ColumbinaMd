// ==========================================
// CONFIGURASI BOT WHATSAPP - COLUMBINAMD
// ==========================================

export default {
    // Nama bot & owner
    namebot: 'ColumbinaMd',
    ownerName: 'KyokoApp',

    // Daftar nomor owner (format: '628xxxxxxxxxx' tanpa tanda +)
    owners: ['628xxxxxxxxxx'],

    // Nomor WhatsApp bot untuk pairing code (kosongkan jika ingin diinput di terminal saat jalan)
    pairingNumber: '',

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

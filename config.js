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

    // Prefix perintah (string, array, atau regex)
    // Contoh: ['.', '#', '!'] atau /^[./#!]/i
    prefix: /^[./#!]/i,

    // Lokasi folder auth session Baileys
    sessionDir: './session'
}

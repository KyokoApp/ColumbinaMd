import fs from 'fs'

const DB_FILE = './database.json'

/**
 * Inisialisasi dan memuat database JSON
 */
export function loadDatabase() {
    global.db = {
        data: {
            users: {},
            chats: {},
            settings: {}
        }
    }

    if (fs.existsSync(DB_FILE)) {
        try {
            const raw = fs.readFileSync(DB_FILE, 'utf-8')
            const parsed = JSON.parse(raw)
            global.db.data = {
                users: parsed.users || {},
                chats: parsed.chats || {},
                settings: parsed.settings || {}
            }
        } catch (e) {
            console.error('[DATABASE] Gagal membaca database.json, menggunakan struktur baru:', e.message)
        }
    }

    // Auto-save tiap 10 detik jika ada perubahan
    setInterval(() => {
        saveDatabase()
    }, 10000)
}

/**
 * Menyimpan data ke database.json
 */
export function saveDatabase() {
    if (!global.db?.data) return
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(global.db.data, null, 2), 'utf-8')
    } catch (e) {
        console.error('[DATABASE SAVE ERROR]:', e.message)
    }
}

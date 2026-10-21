import fs from 'fs'
import path from 'path'
import config from '../config.js'
import { loadPlugin } from './plugins.js'
import { sendButton } from './simple.js'
import { saveDatabase } from './database.js'

const REPO_OWNER = 'KyokoApp'
const REPO_NAME = 'ColumbinaMd'
const GITHUB_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`
const RAW_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}`

/**
 * Inisialisasi pengaturan OTA di database
 */
function ensureSettings() {
    if (!global.db?.data) return
    if (!global.db.data.settings) global.db.data.settings = {}
    const s = global.db.data.settings

    if (typeof s.onboarded !== 'boolean') s.onboarded = false
    if (typeof s.autoUpdate !== 'boolean') s.autoUpdate = true
    if (!s.lastCommit) s.lastCommit = ''
    if (!Array.isArray(s.ignoredCommits)) s.ignoredCommits = []
}

/**
 * Dapatkan JID owner pertama yang valid (fallback ke nomor bot sendiri jika belum diset)
 */
function getFirstOwnerJid(conn) {
    const raw = config.owners?.[0]
    if (raw && !raw.includes('x')) {
        return raw.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    }
    const botNum = conn?.user?.id ? (conn.user.id.split(':')[0] + '@s.whatsapp.net') : null
    return botNum
}

/**
 * Kirim pesan pengenalan / wizard pertama kali ke owner
 */
export async function sendOnboardingWizard(conn) {
    ensureSettings()
    if (global.db.data.settings.onboarded) return

    const ownerJid = getFirstOwnerJid(conn)
    if (!ownerJid) return

    const text =
        `🌸 *Selamat Datang di Columbina Basebot!*\n\n` +
        `Script bot Anda telah berhasil terpasang dan terhubung dengan aman ke WhatsApp.\n\n` +
        `*Layanan Inti Bawaan:*\n` +
        `• *OTA Update System*: Notifikasi otomatis saat KyokoApp merilis fitur atau perbaikan baru di repo resmi.\n` +
        `• *Report & Feedback*: Sarana pengiriman laporan kendala dan masukan.\n` +
        `• *Live Hot-Reload*: Setiap update fitur dipasang secara live tanpa perlu me-restart bot di panel.\n\n` +
        `Apakah Anda ingin mengaktifkan *Layanan Update Otomatis (OTA)* untuk menerima notifikasi pembaruan fitur?`

    const buttons = [
        { displayText: '✅ Aktifkan Update', id: '.autoupdate on' },
        { displayText: '❌ Jangan Aktifkan', id: '.autoupdate off' }
    ]

    await sendButton(conn, ownerJid, text, 'ColumbinaMd • KyokoApp', buttons)

    // Tandai onboarding sudah dikirim agar tidak muncul lagi saat restart
    global.db.data.settings.onboarded = true
    saveDatabase()
    console.log('[OTA] Pesan First-Run Onboarding telah dikirim ke owner.')
}

/**
 * Ambil daftar commit terbaru dari GitHub API
 */
export async function fetchLatestCommits(limit = 5) {
    try {
        const res = await fetch(`${GITHUB_API}/commits?per_page=${limit}`, {
            headers: {
                'User-Agent': 'ColumbinaMd-Updater',
                'Accept': 'application/vnd.github.v3+json'
            }
        })
        if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`)
        const list = await res.json()
        if (!Array.isArray(list)) return []

        return list.map(c => ({
            sha: c.sha,
            shortSha: c.sha.slice(0, 7),
            message: c.commit?.message?.split('\n')[0] || 'Update pembaruan',
            author: c.commit?.author?.name || 'KyokoApp',
            date: c.commit?.author?.date || new Date().toISOString()
        }))
    } catch (e) {
        console.error('[OTA FETCH ERROR]', e.message)
        return []
    }
}

/**
 * Ambil detail commit (daftar file yang berubah)
 */
export async function fetchCommitDetail(sha) {
    try {
        const res = await fetch(`${GITHUB_API}/commits/${sha}`, {
            headers: {
                'User-Agent': 'ColumbinaMd-Updater',
                'Accept': 'application/vnd.github.v3+json'
            }
        })
        if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`)
        return await res.json()
    } catch (e) {
        console.error('[OTA COMMIT DETAIL ERROR]', e.message)
        return null
    }
}

/**
 * Periksa pembaruan dan kirim notifikasi ke owner jika ada rilis baru
 */
export async function checkAndNotifyUpdate(conn) {
    ensureSettings()
    const s = global.db.data.settings
    if (s.autoUpdate === false) return

    const ownerJid = getFirstOwnerJid(conn)
    if (!ownerJid) return

    const commits = await fetchLatestCommits(1)
    if (!commits.length) return

    const latest = commits[0]

    // Jika commit ini sudah pernah dipasang atau sudah pernah diabaikan
    if (s.lastCommit === latest.sha || s.lastCommit === latest.shortSha) return
    if (s.ignoredCommits.includes(latest.sha) || s.ignoredCommits.includes(latest.shortSha)) return

    // Ambil daftar file yang berubah
    const detail = await fetchCommitDetail(latest.sha)
    const changedFiles = detail?.files?.map(f => f.filename) || []

    const fileList = changedFiles.length
        ? changedFiles.slice(0, 5).map(f => `• \`${f}\``).join('\n') +
          (changedFiles.length > 5 ? `\n• _...dan ${changedFiles.length - 5} berkas lainnya_` : '')
        : '• Pembaruan berkas umum'

    const text =
        `📢 *[Columbina Update Terdeteksi!]*\n\n` +
        `Ada pembaruan resmi baru dari repositori *${REPO_OWNER}/${REPO_NAME}*:\n` +
        `• *Commit:* \`${latest.shortSha}\`\n` +
        `• *Catatan:* "${latest.message}"\n` +
        `• *Pengunggah:* ${latest.author}\n\n` +
        `*Berkas yang Berubah:*\n${fileList}\n\n` +
        `Pilih opsi di bawah untuk memproses pembaruan:`

    const buttons = [
        { displayText: '✅ Pasang Update', id: `.update accept ${latest.shortSha}` },
        { displayText: '❌ Lewati Versi Ini', id: `.update decline ${latest.shortSha}` }
    ]

    await sendButton(conn, ownerJid, text, 'ColumbinaMd OTA Updater', buttons)
    console.log(`[OTA] Notifikasi update ${latest.shortSha} terkirim ke owner.`)
}

/**
 * Terapkan pembaruan commit dari GitHub ke berkas lokal
 */
export async function applyUpdate(sha) {
    ensureSettings()
    const detail = await fetchCommitDetail(sha)
    if (!detail || !Array.isArray(detail.files)) {
        throw new Error(`Tidak dapat mengambil rincian commit ${sha} dari GitHub.`)
    }

    const updated = []
    const deleted = []

    for (const file of detail.files) {
        const filename = file.filename
        // Batasi hanya folder/file yang aman diperbarui (hindari folder session, database.json, dll)
        const isSafePath =
            filename.startsWith('plugins/') ||
            filename.startsWith('lib/') ||
            filename.startsWith('assets/') ||
            ['config.js', 'handler.js', 'README.md', 'package.json'].includes(filename)

        if (!isSafePath) continue

        const localPath = path.resolve(process.cwd(), filename)

        if (file.status === 'removed') {
            if (fs.existsSync(localPath)) {
                fs.unlinkSync(localPath)
                deleted.push(filename)
            }
            continue
        }

        // Unduh isi berkas mentah
        const rawRes = await fetch(`${RAW_URL}/${detail.sha}/${filename}`)
        if (!rawRes.ok) {
            console.error(`[OTA] Gagal mengunduh berkas ${filename}: HTTP ${rawRes.status}`)
            continue
        }

        const content = Buffer.from(await rawRes.arrayBuffer())

        // Pastikan direktori tujuan tersedia
        const dir = path.dirname(localPath)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

        fs.writeFileSync(localPath, content)
        updated.push(filename)

        // Hot-reload jika berkas merupakan plugin
        if (filename.startsWith('plugins/') && filename.endsWith('.js')) {
            await loadPlugin(localPath)
        }
    }

    // Catat versi commit yang berhasil diterapkan
    global.db.data.settings.lastCommit = detail.sha
    saveDatabase()

    return {
        sha: detail.sha,
        shortSha: detail.sha.slice(0, 7),
        message: detail.commit?.message?.split('\n')[0] || '',
        updated,
        deleted
    }
}

/**
 * Sinkronisasi penuh semua berkas dari GitHub (Update New)
 * Menjaga nomor telepon owner di config.js agar tidak hilang
 */
export async function syncFullRepoUpdate(targetSha = 'main') {
    ensureSettings()

    // 1. Simpan nomor owner saat ini dari config.js lokal
    const configPath = path.resolve(process.cwd(), 'config.js')
    let currentOwners = []
    if (fs.existsSync(configPath)) {
        try {
            const rawConfig = fs.readFileSync(configPath, 'utf-8')
            const match = rawConfig.match(/owners:\s*(\[[^\]]*\])/)
            if (match) {
                const numberMatches = match[1].match(/'([^']+)'|"([^"]+)"|(\d+)/g) || []
                for (const m of numberMatches) {
                    let clean = m.replace(/['"]/g, '').replace(/[^0-9]/g, '')
                    if (clean.startsWith('08')) clean = '628' + clean.slice(2)
                    if (clean && !clean.includes('x') && clean.length >= 7) {
                        if (!currentOwners.includes(clean)) currentOwners.push(clean)
                    }
                }
            }
        } catch (e) {
            console.error('[OTA] Gagal membaca existing owners dari config.js:', e.message)
        }
    }

    // 2. Ambil daftar semua tree file dari GitHub
    const treeRes = await fetch(`${GITHUB_API}/git/trees/${targetSha}?recursive=1`, {
        headers: { 'User-Agent': 'Node.js/Columbina' }
    })
    if (!treeRes.ok) throw new Error(`Gagal mengambil repositori dari GitHub (HTTP ${treeRes.status})`)
    const treeData = await treeRes.json()
    const blobs = (treeData.tree || []).filter(item => item.type === 'blob')

    const updated = []

    // 3. Unduh dan perbarui berkas satu per satu
    for (const blob of blobs) {
        const filename = blob.path
        // Lewati file yang tidak boleh ditimpa (session, git, database)
        if (filename.startsWith('.git') || filename.includes('session') || filename === 'database.json') continue

        const isSafe =
            filename.startsWith('plugins/') ||
            filename.startsWith('lib/') ||
            filename.startsWith('assets/') ||
            ['config.js', 'handler.js', 'index.js', 'README.md', 'package.json', 'LICENSE', '.gitignore'].includes(filename)

        if (!isSafe) continue

        const rawRes = await fetch(`${RAW_URL}/${targetSha}/${filename}`)
        if (!rawRes.ok) continue

        let content = Buffer.from(await rawRes.arrayBuffer())

        // Jika berkas adalah config.js, pulihkan nomor owner lama agar tidak terhapus
        if (filename === 'config.js' && currentOwners.length > 0) {
            let configStr = content.toString('utf-8')
            const ownersRegex = /owners:\s*(\[[^\]]*\])/
            if (ownersRegex.test(configStr)) {
                const formattedArray = JSON.stringify(currentOwners, null, 4).replace(/"/g, "'").replace(/\n/g, '\n    ')
                configStr = configStr.replace(ownersRegex, 'owners: ' + formattedArray)
                content = Buffer.from(configStr, 'utf-8')
            }
        }

        const localPath = path.resolve(process.cwd(), filename)
        const dir = path.dirname(localPath)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

        fs.writeFileSync(localPath, content)
        updated.push(filename)

        // Hot-reload plugin
        if (filename.startsWith('plugins/') && filename.endsWith('.js')) {
            await loadPlugin(localPath).catch(() => {})
        }
    }

    // Ambil commit sha terbaru
    const latestCommits = await fetchLatestCommits(1)
    if (latestCommits.length) {
        global.db.data.settings.lastCommit = latestCommits[0].sha
        saveDatabase()
    }

    return {
        total: updated.length,
        updated,
        ownersPreserved: currentOwners
    }
}

/**
 * Abaikan versi commit agar tidak muncul kembali
 */
export function ignoreUpdate(sha) {
    ensureSettings()
    const s = global.db.data.settings
    const cleanSha = String(sha).trim()
    if (!s.ignoredCommits.includes(cleanSha)) {
        s.ignoredCommits.push(cleanSha)
        saveDatabase()
    }
}

/**
 * Inisialisasi OTA saat bot online
 */
export function initOta(conn) {
    ensureSettings()

    // 1. Wizard pertama kali (setelah 3 detik koneksi terbuka)
    setTimeout(() => {
        sendOnboardingWizard(conn).catch(err => {
            console.error('[OTA ONBOARDING ERROR]', err.message)
        })
    }, 3000)

    // 2. Cek update otomatis berkala (tiap 3 jam)
    if (!global._otaInterval) {
        // Cek pertama saat bot online setelah 15 detik
        setTimeout(() => {
            checkAndNotifyUpdate(conn).catch(() => {})
        }, 15000)

        global._otaInterval = setInterval(() => {
            checkAndNotifyUpdate(conn).catch(() => {})
        }, 3 * 60 * 60 * 1000)
    }
}

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

    if (!s.lastCommit) s.lastCommit = ''
    if (!Array.isArray(s.ignoredCommits)) s.ignoredCommits = []
}

/**
 * Dapatkan daftar commit yang belum terpasang (Unapplied Commits / Changelog)
 */
export async function getUnappliedCommits(limit = 10) {
    ensureSettings()
    const current = global.db.data.settings.lastCommit || ''
    const allCommits = await fetchLatestCommits(limit)
    if (!allCommits.length) return { current, unapplied: [], latest: null }

    const latest = allCommits[0]
    if (!current) {
        return { current: 'Belum tercatat', unapplied: allCommits, latest }
    }

    const matchIndex = allCommits.findIndex(c => c.sha === current || c.shortSha === current || current.startsWith(c.shortSha))

    if (matchIndex === 0) {
        // Sudah paling mutakhir
        return { current, unapplied: [], latest }
    } else if (matchIndex > 0) {
        // Ada commit baru di atas commit lokal saat ini
        return { current, unapplied: allCommits.slice(0, matchIndex), latest }
    } else {
        // Commit lokal tidak ditemukan di N commit terakhir (versi lama)
        return { current, unapplied: allCommits, latest }
    }
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
 * Periksa apakah ada pembaruan baru dari GitHub
 */
export async function hasPendingUpdates() {
    const { unapplied } = await getUnappliedCommits(5)
    return unapplied.length > 0
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
 * Menjaga nomor owner, nomor bot (pairingNumber), dan customPairingCode agar tidak hilang
 */
export async function syncFullRepoUpdate(targetSha = 'main') {
    ensureSettings()

    // 1. Simpan konfigurasi lokal penting (owners, pairingNumber, customPairingCode)
    const configPath = path.resolve(process.cwd(), 'config.js')
    let preservedConfig = {
        owners: [],
        pairingNumber: '',
        customPairingCode: ''
    }

    if (fs.existsSync(configPath)) {
        try {
            const rawConfig = fs.readFileSync(configPath, 'utf-8')
            // Ambil nomor owner
            const matchOwners = rawConfig.match(/owners:\s*(\[[^\]]*\])/)
            if (matchOwners) {
                const numberMatches = matchOwners[1].match(/'([^']+)'|"([^"]+)"|(\d+)/g) || []
                for (const m of numberMatches) {
                    let clean = m.replace(/['"]/g, '').replace(/[^0-9]/g, '')
                    if (clean.startsWith('08')) clean = '628' + clean.slice(2)
                    if (clean && !clean.includes('x') && clean.length >= 7) {
                        if (!preservedConfig.owners.includes(clean)) preservedConfig.owners.push(clean)
                    }
                }
            }

            // Ambil pairingNumber
            const matchPairing = rawConfig.match(/pairingNumber:\s*['"]([^'"]*)['"]/)
            if (matchPairing) preservedConfig.pairingNumber = matchPairing[1].trim()

            // Ambil customPairingCode
            const matchCustom = rawConfig.match(/customPairingCode:\s*['"]([^'"]*)['"]/)
            if (matchCustom) preservedConfig.customPairingCode = matchCustom[1].trim()
        } catch (e) {
            console.error('[OTA] Gagal membaca existing config dari config.js:', e.message)
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

        // Jika berkas adalah config.js, pulihkan owner, pairingNumber, dan customPairingCode
        if (filename === 'config.js') {
            let configStr = content.toString('utf-8')

            // Pulihkan owners
            if (preservedConfig.owners.length > 0) {
                const ownersRegex = /owners:\s*(\[[^\]]*\])/
                if (ownersRegex.test(configStr)) {
                    const formattedArray = JSON.stringify(preservedConfig.owners, null, 4).replace(/"/g, "'").replace(/\n/g, '\n    ')
                    configStr = configStr.replace(ownersRegex, 'owners: ' + formattedArray)
                }
            }

            // Pulihkan pairingNumber jika sebelumnya terisi
            if (preservedConfig.pairingNumber) {
                configStr = configStr.replace(/pairingNumber:\s*['"][^'"]*['"]/, `pairingNumber: '${preservedConfig.pairingNumber}'`)
            }

            // Pulihkan customPairingCode jika sebelumnya terisi
            if (preservedConfig.customPairingCode) {
                configStr = configStr.replace(/customPairingCode:\s*['"][^'"]*['"]/, `customPairingCode: '${preservedConfig.customPairingCode}'`)
            }

            content = Buffer.from(configStr, 'utf-8')
        }

        const localPath = path.resolve(process.cwd(), filename)
        const dir = path.dirname(localPath)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

        fs.writeFileSync(localPath, content)
        updated.push(filename)

        // Hot-reload plugin jika merupakan file plugin
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
        preserved: preservedConfig
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
 * (Pengecekan berbasis on-demand pengguna melalui perintah .checkupdate)
 */
export function initOta(conn) {
    ensureSettings()
}

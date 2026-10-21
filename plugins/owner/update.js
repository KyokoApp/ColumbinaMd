import { fetchLatestCommits, fetchCommitDetail, applyUpdate, ignoreUpdate } from '../../lib/ota.js'
import { sendButton } from '../../lib/simple.js'
import { saveDatabase } from '../../lib/database.js'

let handler = async (m, { conn, text, args, usedPrefix, command }) => {
    const cmd = command.toLowerCase()

    // ── Command: .autoupdate on/off ──
    if (cmd === 'autoupdate') {
        const opt = (args[0] || '').toLowerCase()
        if (opt === 'on' || opt === 'enable' || opt === '1') {
            global.db.data.settings.autoUpdate = true
            saveDatabase()
            return m.reply('✅ *Layanan Update Otomatis (OTA) diaktifkan!*\nBot akan otomatis mengecek pembaruan resmi dari KyokoApp/ColumbinaMd dan mengirimkan tombol persetujuan ke chat owner.')
        } else if (opt === 'off' || opt === 'disable' || opt === '0') {
            global.db.data.settings.autoUpdate = false
            saveDatabase()
            return m.reply('❌ *Layanan Update Otomatis (OTA) dinonaktifkan!*\nAnda tidak akan menerima notifikasi pembaruan otomatis lagi (bisa cek manual via `.checkupdate`).')
        } else {
            const status = global.db.data.settings?.autoUpdate ? 'Aktif (ON)' : 'Mati (OFF)'
            return m.reply(`Status Update Otomatis: *${status}*\n\nPenggunaan:\n• \`${usedPrefix + command} on\` untuk mengaktifkan\n• \`${usedPrefix + command} off\` untuk mematikan`)
        }
    }

    // ── Command: .checkupdate / .cekupdate ──
    if (cmd === 'checkupdate' || cmd === 'cekupdate') {
        if (typeof m.react === 'function') await m.react('⏳').catch(() => {})
        const commits = await fetchLatestCommits(1)
        if (!commits.length) {
            if (typeof m.react === 'function') await m.react('❌').catch(() => {})
            return m.reply('❌ Gagal memeriksa pembaruan ke repositori GitHub.')
        }

        const latest = commits[0]
        const current = global.db.data.settings?.lastCommit || 'Belum tercatat'
        const currentShort = current.length > 7 ? current.slice(0, 7) : current

        if (current === latest.sha || currentShort === latest.shortSha) {
            if (typeof m.react === 'function') await m.react('✅').catch(() => {})
            return m.reply(`✅ *Script sudah versi terbaru!*\n\n• *Commit Terpasang:* \`${latest.shortSha}\`\n• *Catatan:* ${latest.message}\n• *Pengunggah:* ${latest.author}`)
        }

        if (typeof m.react === 'function') await m.react('📢').catch(() => {})
        const detail = await fetchCommitDetail(latest.sha)
        const changedFiles = detail?.files?.map(f => f.filename) || []
        const fileList = changedFiles.length
            ? changedFiles.slice(0, 5).map(f => `• \`${f}\``).join('\n') +
              (changedFiles.length > 5 ? `\n• _...dan ${changedFiles.length - 5} berkas lainnya_` : '')
            : '• Pembaruan berkas umum'

        const textMsg =
            `📢 *Pembaruan Baru Tersedia!*\n\n` +
            `• *Versi Saat Ini:* \`${currentShort}\`\n` +
            `• *Versi Terbaru:* \`${latest.shortSha}\`\n` +
            `• *Catatan Rilis:* "${latest.message}"\n` +
            `• *Pengunggah:* ${latest.author}\n\n` +
            `*Berkas Terkait:*\n${fileList}\n\n` +
            `Pilih tindakan di bawah:`

        const buttons = [
            { displayText: '✅ Pasang Update', id: `${usedPrefix}update accept ${latest.shortSha}` },
            { displayText: '❌ Lewati Versi Ini', id: `${usedPrefix}update decline ${latest.shortSha}` }
        ]

        return await sendButton(conn, m.chat, textMsg, 'ColumbinaMd OTA', buttons, m)
    }

    // ── Command: .update accept / decline ──
    if (cmd === 'update') {
        const action = (args[0] || '').toLowerCase()
        const sha = args[1]

        if (!action) {
            return m.reply(
                `🔧 *Columbina OTA Updater*\n\n` +
                `Perintah:\n` +
                `• \`${usedPrefix}checkupdate\` : Cek ketersediaan pembaruan\n` +
                `• \`${usedPrefix}update accept <sha>\` : Terapkan pembaruan commit\n` +
                `• \`${usedPrefix}update decline <sha>\` : Lewati pembaruan commit\n` +
                `• \`${usedPrefix}autoupdate on/off\` : Pengaturan notifikasi otomatis`
            )
        }

        if (action === 'accept' || action === 'pasang') {
            let targetSha = sha
            if (!targetSha) {
                const commits = await fetchLatestCommits(1)
                if (!commits.length) return m.reply('❌ Gagal memeriksa commit terbaru dari GitHub.')
                targetSha = commits[0].sha
            }

            if (typeof m.react === 'function') await m.react('⏳').catch(() => {})
            m.reply(`⏳ Sedang mengunduh dan menerapkan pembaruan \`${targetSha.slice(0, 7)}\`...`)

            try {
                const res = await applyUpdate(targetSha)
                if (typeof m.react === 'function') await m.react('✅').catch(() => {})

                let resText = `✅ *Pembaruan Berhasil Diterapkan!*\n\n`
                resText += `• *Commit:* \`${res.shortSha}\`\n`
                resText += `• *Catatan:* ${res.message}\n\n`

                if (res.updated.length) {
                    resText += `*Berkas Diperbarui/Ditambah (${res.updated.length}):*\n`
                    resText += res.updated.map(f => `• \`${f}\``).join('\n') + '\n\n'
                }
                if (res.deleted.length) {
                    resText += `*Berkas Dihapus (${res.deleted.length}):*\n`
                    resText += res.deleted.map(f => `• \`${f}\``).join('\n') + '\n\n'
                }
                resText += `_Semua plugin telah dimuat ulang secara live (hot-reload) tanpa restart._`

                return m.reply(resText)
            } catch (err) {
                if (typeof m.react === 'function') await m.react('❌').catch(() => {})
                return m.reply(`❌ Gagal menerapkan pembaruan:\n${err.message || err}`)
            }
        }

        if (action === 'decline' || action === 'tolak' || action === 'lewati') {
            let targetSha = sha
            if (!targetSha) {
                const commits = await fetchLatestCommits(1)
                if (!commits.length) return m.reply('❌ Gagal memeriksa commit terbaru dari GitHub.')
                targetSha = commits[0].sha
            }

            ignoreUpdate(targetSha)
            if (typeof m.react === 'function') await m.react('👌').catch(() => {})
            return m.reply(`👌 Pembaruan commit \`${targetSha.slice(0, 7)}\` telah dilewati dan tidak akan ditawarkan kembali secara otomatis.`)
        }

        return m.reply(`Aksi \`${action}\` tidak dikenal. Gunakan \`accept\` atau \`decline\`.`)
    }
}

handler.help = ['update accept <sha>', 'update decline <sha>', 'autoupdate <on/off>', 'checkupdate']
handler.tags = ['owner']
handler.command = /^(update|autoupdate|checkupdate|cekupdate)$/i
handler.owner = true

export default handler

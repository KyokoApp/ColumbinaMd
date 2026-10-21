import { getUnappliedCommits, fetchLatestCommits, fetchCommitDetail, applyUpdate, ignoreUpdate, syncFullRepoUpdate } from '../../lib/ota.js'
import { sendButton } from '../../lib/simple.js'
import { saveDatabase } from '../../lib/database.js'

// Penyimpanan status konfirmasi sementara untuk aksi .update new
const pendingFullUpdates = new Map()
let handler = async (m, { conn, text, args, usedPrefix, command }) => {
    const cmd = command.toLowerCase()
    // ── Command: .autoupdate (Diarahkan ke .checkupdate) ──
    if (cmd === 'autoupdate') {
        return m.reply(
            `ℹ️ *Sistem Pembaruan Columbina Kini Berbasis On-Demand*\n\n` +
            `Bot tidak lagi memunculkan notifikasi update otomatis agar tidak mengganggu obrolan Anda.\n` +
            `👉 Gunakan perintah \`${usedPrefix}checkupdate\` untuk memeriksa riwayat changelog dan rilis fitur baru kapan pun Anda inginkan.`
        )
    }

    // ── Command: .checkupdate / .cekupdate (Changelog & Status Versi) ──
    if (cmd === 'checkupdate' || cmd === 'cekupdate') {
        if (typeof m.react === 'function') await m.react('⏳').catch(() => {})
        const { current, unapplied, latest } = await getUnappliedCommits(8)

        if (!latest) {
            if (typeof m.react === 'function') await m.react('❌').catch(() => {})
            return m.reply('❌ Gagal memeriksa pembaruan ke repositori GitHub KyokoApp/ColumbinaMd.')
        }

        const currentDisplay = current ? (current.length > 7 ? current.slice(0, 7) : current) : 'Belum tercatat'

        // Jika semua commit sudah terpasang
        if (!unapplied.length) {
            if (typeof m.react === 'function') await m.react('✅').catch(() => {})
            return m.reply(
                `✅ *Script Columbina Anda Sudah Versi Paling Terbaru!*\n\n` +
                `• *Versi Terpasang:* \`${latest.shortSha}\`\n` +
                `• *Catatan:* ${latest.message}\n` +
                `• *Pengunggah:* ${latest.author}\n` +
                `• *Tanggal:* ${new Date(latest.date).toLocaleString('id-ID')}\n\n` +
                `_Tidak ada pembaruan baru yang tertunda di repositori resmi._`
            )
        }

        if (typeof m.react === 'function') await m.react('📢').catch(() => {})

        // Susun daftar riwayat pembaruan yang belum terpasang (Changelog)
        let changelog = ''
        unapplied.forEach((c, idx) => {
            changelog += `${idx + 1}. \`[${c.shortSha}]\` *${c.message}*\n`
            changelog += `   ↳ _Oleh ${c.author} (${new Date(c.date).toLocaleDateString('id-ID')})_\n`
        })

        const textMsg =
            `📢 *Pembaruan Baru Tersedia! (${unapplied.length} Rilis Belum Terpasang)*\n\n` +
            `• *Versi Anda Saat Ini:* \`${currentDisplay}\`\n` +
            `• *Versi Terbaru di GitHub:* \`${latest.shortSha}\`\n\n` +
            `📋 *Daftar Pembaruan & Fitur Baru:*\n` +
            `${changelog}\n` +
            `💡 *Saran:* Disarankan menggunakan *Update Menyeluruh* agar seluruh fitur baru & perbaikan bug sinkron secara utuh tanpa risiko file terlewat.\n\n` +
            `Pilih tindakan di bawah:`

        const buttons = [
            { displayText: '🚀 Update Menyeluruh (.update new)', id: `${usedPrefix}update new` },
            { displayText: '👌 Lewati Versi Ini', id: `${usedPrefix}update decline ${latest.shortSha}` }
        ]

        return await sendButton(conn, m.chat, textMsg, 'Columbina OTA Updater', buttons, m)
    }

    // ── Command: .update accept / decline ──
    if (cmd === 'update') {
        const action = (args[0] || '').toLowerCase()
        const sha = args[1]

        if (!action) {
            return m.reply(
                `🔧 *Columbina OTA Updater*\n\n` +
                `Perintah:\n` +
                `• \`${usedPrefix}checkupdate\` : Cek riwayat rilis & changelog fitur baru\n` +
                `• \`${usedPrefix}update new\` : Sinkronisasi penuh semua kode terbaru dari GitHub\n` +
                `• \`${usedPrefix}update decline <sha>\` : Lewati dan tandai pembaruan telah dilihat`
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
        // ── Aksi: .update new (Pembaruan Menyeluruh dengan Konfirmasi 2x) ──
        if (action === 'new' || action === 'all' || action === 'full') {
            const subArg = (args[1] || '').toLowerCase()
            const senderId = m.sender

            // Tahap 1: Pengguna pertama kali mengetik .update new
            if (subArg !== 'confirm' && subArg !== 'ya') {
                pendingFullUpdates.set(senderId, {
                    step: 1,
                    time: Date.now()
                })

                const warnText =
                    `⚠️ *PERINGATAN PEMBARUAN TOTAL (.update new)*\n\n` +
                    `Tindakan ini akan mengunduh dan menyinkronkan *SELURUH KODE BOT* langsung dari repositori resmi GitHub KyokoApp/ColumbinaMd.\n\n` +
                    `🛡️ *Keamanan Konfigurasi:*\n` +
                    `• Nomor Owner di \`config.js\` Anda *TIDAK AKAN HILANG* (otomatis disimpan dan dipulihkan).\n` +
                    `• Sesi login WhatsApp dan \`database.json\` Anda *AMAN* dan tidak akan disentuh.\n` +
                    `• *Perhatian:* Jika Anda pernah mengedit sendiri file internal bot di panel, modifikasi tersebut akan ditimpa dengan kode resmi terbaru.\n\n` +
                    `*Konfirmasi Tahap 1:* Apakah Anda yakin ingin melanjutkan?`

                const buttons = [
                    { displayText: '⚠️ Lanjut Konfirmasi', id: `${usedPrefix}update new confirm` },
                    { displayText: '❌ Batalkan', id: `${usedPrefix}update new cancel` }
                ]

                return await sendButton(conn, m.chat, warnText, 'Columbina Safe Full Updater', buttons, m)
            }

            // Tahap 2: Pengguna mengonfirmasi tahap 1
            if (subArg === 'confirm') {
                const state = pendingFullUpdates.get(senderId)
                if (!state || Date.now() - state.time > 120000) {
                    pendingFullUpdates.delete(senderId)
                    return m.reply(`⏱️ Sesi konfirmasi telah kadaluarsa. Silakan ketik \`${usedPrefix}update new\` kembali.`)
                }

                // Naikkan ke tahap 2 (Final Confirmation)
                pendingFullUpdates.set(senderId, {
                    step: 2,
                    time: Date.now()
                })

                const finalWarn =
                    `🚨 *KONFIRMASI FINAL (Tahap 2 dari 2)*\n\n` +
                    `Ini adalah langkah terakhir sebelum seluruh file basebot diperbarui.\n` +
                    `Tekan tombol *YA, SINKRONKAN SEKARANG* untuk memulai proses unduh dan pasang.`

                const buttons = [
                    { displayText: '🚀 YA, SINKRONKAN SEKARANG', id: `${usedPrefix}update new execute` },
                    { displayText: '❌ Batalkan Pembaruan', id: `${usedPrefix}update new cancel` }
                ]

                return await sendButton(conn, m.chat, finalWarn, 'Columbina Final Confirmation', buttons, m)
            }

            // Tahap Eksekusi Sebenarnya (.update new execute)
            if (subArg === 'execute') {
                const state = pendingFullUpdates.get(senderId)
                if (!state || state.step !== 2 || Date.now() - state.time > 120000) {
                    pendingFullUpdates.delete(senderId)
                    return m.reply(`⏱️ Sesi konfirmasi telah kadaluarsa. Silakan ketik \`${usedPrefix}update new\` kembali.`)
                }

                pendingFullUpdates.delete(senderId)
                if (typeof m.react === 'function') await m.react('⏳').catch(() => {})
                await m.reply('⏳ Sedang menyinkronkan seluruh repositori dari GitHub... Mohon tunggu sebentar.')

                try {
                    const result = await syncFullRepoUpdate('main')
                    if (typeof m.react === 'function') await m.react('✅').catch(() => {})

                    let report = `🎉 *PEMBARUAN TOTAL SELESAI!*\n\n`
                    report += `• *Total Berkas Disinkronkan:* ${result.total} berkas\n`
                    report += `• *Nomor Owner Terlindungi:* ${result.preserved.owners.length ? result.preserved.owners.join(', ') : 'Default'}\n`
                    report += `• *Nomor Bot Terlindungi:* ${result.preserved.pairingNumber || 'Sesuai Sesi'}\n`
                    report += `• *Custom Pairing Code:* ${result.preserved.customPairingCode || 'Tidak Diubah'}\n`
                    report += `• *Status Fitur:* Semua plugin dan pustaka telah diperbarui & dimuat ulang secara live.\n\n`
                    report += `_Basebot Anda sekarang 100% mutakhir dengan repositori resmi GitHub KyokoApp/ColumbinaMd!_`
                    return m.reply(report)
                } catch (err) {
                    console.error('[UPDATE NEW ERROR]', err)
                    if (typeof m.react === 'function') await m.react('❌').catch(() => {})
                    return m.reply(`❌ Terjadi kendala saat menyinkronkan repositori:\n${err.message || err}`)
                }
            }

            // Pembatalan
            if (subArg === 'cancel' || subArg === 'batal') {
                pendingFullUpdates.delete(senderId)
                return m.reply('❌ Pembaruan total telah dibatalkan.')
            }
        }

        return m.reply(`Aksi \`${action}\` tidak dikenal. Gunakan \`accept\`, \`decline\`, atau \`new\`.`)
    }
}
handler.help = ['checkupdate', 'update new', 'update decline <sha>']
handler.tags = ['owner']
handler.command = /^(update|autoupdate|checkupdate|cekupdate)$/i
handler.owner = true

export default handler

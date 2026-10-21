<p align="center">
  <img src="assets/banner.jpg" width="100%" style="border-radius: 12px; max-width: 750px;" alt="ColumbinaMd Banner">
</p>

<h1 align="center">🕊️ ColumbinaMd</h1>

<p align="center">
  <b>Base Bot WhatsApp ESM & Baileys yang modular, bersih, dan kencang.</b>
</p>

<p align="center">
  <a href="https://github.com/KyokoApp/ColumbinaMd"><img src="https://img.shields.io/github/stars/KyokoApp/ColumbinaMd?style=for-the-badge&color=ffd700&logo=github" alt="Stars"></a>
  <a href="https://github.com/KyokoApp/ColumbinaMd"><img src="https://img.shields.io/github/forks/KyokoApp/ColumbinaMd?style=for-the-badge&color=6366f1&logo=git" alt="Forks"></a>
  <img src="https://img.shields.io/endpoint?url=https%3A%2F%2Fhits.dwyl.com%2FKyokoApp%2FColumbinaMd.json&style=for-the-badge&color=25D366" alt="Views">
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-%3E%3D20-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"></a>
  <a href="https://whatsapp.com/channel/0029Vb8Lq2U9sBI6adYkQd1I"><img src="https://img.shields.io/badge/WhatsApp-Channel-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Saluran WhatsApp"></a>
</p>

---

### ✨ Fitur Utama

- 🔑 **Login Pairing Code** — Hubungkan bot langsung pakai 8 digit kode tanpa scan QR.
- ⚡ **Hot-Reload Plugins** — Tambah/edit file di `plugins/` langsung aktif tanpa restart bot.
- 🤖 **5 AI Tanpa API Key** — Gemini 2.0, DeepSeek R1, Claude, Qwen, & ChatGPT publik.
- 📥 **Media Downloader** — Unduh TikTok (No-WM), Facebook (HD/SD), Instagram, & Pinterest.
- 🛡️ **Proteksi Grup** — Anti-link, anti-foto, anti-video (mode hapus biasa), & tagall/hidetag.
- ⚙️ **Pengaturan .on / .off** — Sakelar grup berbasis teks ringan.
- 🛠️ **Plugin Manager** — `.sp` (simpan), `.gp` (ambil), `.dp` (hapus) plugin via chat.
- 🎮 **Game Interaktif Grup** — Family 100 (`.family100` / `.f100`) dengan 600+ database soal survei.
- 💻 **Owner Tools** — Runner JavaScript (`>`), terminal shell (`$`), dan pengukur ping.

---

### 🚀 Cara Menjalankan

```bash
# 1. Clone repositori
git clone https://github.com/KyokoApp/ColumbinaMd.git
cd ColumbinaMd

# 2. Pasang dependensi
npm install

# 3. Masukkan nomor owner di config.js
nano config.js

# 4. Jalankan bot
npm start
```
> Masukkan nomor HP bot di terminal untuk mendapatkan 8-digit **Pairing Code**, lalu masukkan kodenya di menu WhatsApp (**Perangkat Tertaut** > **Tautkan dengan nomor telepon**).

---

<details>
<summary><b>📁 Klik untuk melihat Struktur Folder</b></summary>

```text
ColumbinaMd/
├── index.js            # Koneksi Baileys & pairing code
├── handler.js          # Router pesan & guards (owner, admin, botAdmin)
├── config.js           # Konfigurasi bot & owner
├── package.json        # Dependensi ESM
├── lib/
│   ├── simple.js       # Serialisasi pesan (m.reply, m.download, dll)
│   ├── plugins.js      # Dynamic loader & hot-reload watcher
│   ├── database.js     # Database JSON pengaturan grup
│   └── aiHelper.js     # API model AI gratis
└── plugins/
    ├── main/           # Menu & starter commands
    ├── info/           # Ping, latency, & speed test
    ├── ai/             # .gemini, .deepseek, .claude, .qwen, .chatgpt
    ├── downloader/     # .tt, .fb, .ig, .pin
    ├── group/          # .on/.off, anti-media, kick, promote, tagall
    └── owner/          # .sp, .gp, .dp, eval (>), shell ($), restart
```

</details>

<details>
<summary><b>🧩 Contoh Membuat Plugin Baru</b></summary>

Buat file baru di `plugins/main/halo.js`:
```javascript
let handler = async (m) => {
    await m.reply(`👋 Halo ${m.pushName || 'kawan'}! Salam kenal.`)
}
handler.help = ['halo']
handler.tags = ['main']
handler.command = /^(halo|hai)$/i

export default handler
```

</details>

---

<p align="center">
  <a href="https://github.com/KyokoApp/ColumbinaMd">
    <img src="https://img.shields.io/badge/⭐_Beri_Star_di_GitHub-ffd700?style=for-the-badge" alt="Beri Bintang">
  </a>
  <a href="https://github.com/KyokoApp/ColumbinaMd/issues/new/choose">
    <img src="https://img.shields.io/badge/💬_Lapor_Error_&_Request-e11d48?style=for-the-badge" alt="Lapor Error">
  </a>
</p>

<p align="center">
  Didistribusikan di bawah lisensi MIT • Dikembangkan oleh <b><a href="https://github.com/KyokoApp">KyokoApp</a></b>
</p>

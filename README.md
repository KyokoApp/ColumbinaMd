<p align="center">
  <img src="https://c.termai.cc/a107/IbYUA.jpg" width="100%" style="border-radius: 12px; max-width: 750px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);" alt="ColumbinaMd Banner">
</p>

<h1 align="center">🕊️ ColumbinaMd</h1>

<p align="center">
  <b>Lightweight, Modular & High-Performance WhatsApp Base Bot powered by Baileys ESM with Pairing Code Login.</b>
</p>

<p align="center">
  <a href="https://github.com/KyokoApp/ColumbinaMd/stargazers"><img src="https://img.shields.io/github/stars/KyokoApp/ColumbinaMd?style=for-the-badge&color=ffd700&logo=github" alt="Stars"></a>
  <a href="https://github.com/KyokoApp/ColumbinaMd/network/members"><img src="https://img.shields.io/github/forks/KyokoApp/ColumbinaMd?style=for-the-badge&color=6366f1&logo=git" alt="Forks"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-%3E%3D20.0.0-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License"></a>
  <a href="https://whatsapp.com/channel/0029Vb8Lq2U9sBI6adYkQd1I"><img src="https://img.shields.io/badge/WhatsApp-Channel-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Saluran WhatsApp"></a>
</p>

---

## 📖 Tentang ColumbinaMd

**ColumbinaMd** dirancang khusus sebagai fondasi (boilerplate) bersih tanpa *bloatware* bagi pengembang bot WhatsApp yang menginginkan performa kencang, struktur folder rapi, dan kemudahan dalam menambah fitur baru tanpa harus merestart server bot.

---

## 🌟 Fitur Unggulan

- 🔑 **Login Pairing Code**: Tanpa repot scan QR code, cukup masukkan nomor ponsel WhatsApp bot dan hubungkan lewat 8-digit kode pairing langsung di aplikasi WhatsApp.
- ⚡ **Modular Plugins & Hot-Reload**: Tambah, ubah, atau hapus file `.js` di dalam folder `plugins/` secara instan tanpa perlu merestart proses Node.js.
- 📦 **Serialisasi Pesan Bersih**: Format pesan disederhanakan (`m.reply`, `m.text`, `m.sender`, `m.isGroup`, `m.quoted`, media downloader).
- 🛡️ **Role & Security Guards**: Proteksi guard otomatis per-plugin (`owner`, `admin`, `botAdmin`, `group`, `private`).
- 📢 **Auto-Follow Channel**: Mengikuti saluran resmi WhatsApp secara otomatis ketika sesi bot pertama kali tersambung.
- 🚫 **Anti-Media & Anti-Link Grup**: Perlindungan grup otomatis (Anti Link All, Anti Foto, Anti Video) dengan sistem delete biasa tanpa spam pesan interaktif.
- ⚙️ **Sakelar Pengaturan Grup (.on / .off)**: Pengaturan fitur grup mudah berbasis teks langsung menampilkan ringkasan status tanpa tombol berat.
- 🤖 **5 Model AI Publik (Tanpa API Key)**: Terintegrasi langsung dengan **Gemini 2.0 Flash**, **DeepSeek R1**, **Claude AI**, **Qwen 2.5**, dan **ChatGPT** gratis tanpa perlu setup API key pribadi.
- 📥 **Downloader Media Sosial**: Unduh video & gambar berkualitas tinggi tanpa watermark untuk **TikTok** (`.tt`), **Facebook HD/SD** (`.fb`), **Instagram Post/Reel** (`.ig`), dan **Pinterest** (`.pin`).
- 🛠️ **Plugin Manager (Owner)**: Kelola plugin langsung via chat WhatsApp: simpan plugin baru (`.sp`), ambil file plugin (`.gp`), dan hapus plugin (`.dp`).
- ⏱️ **Starter Commands**: Menu interaktif otomatis berdasarkan tag kategori, pengukur latency/ping, runner kode eval (`>`), serta eksekusi terminal shell (`$`).

---

## 📁 Struktur Direktori

```text
ColumbinaMd/
├── index.js            # Inisialisasi koneksi Baileys & pairing code prompt
├── handler.js          # Router pesan masuk, permissions & guard checks
├── config.js           # Konfigurasi owner, prefix, thumbnail & nomor pairing
├── package.json        # Manifest dependensi ESM
├── README.md           # Dokumentasi repositori
├── .gitignore          # Proteksi session & node_modules agar tidak bocor
├── session/            # Folder penyimpanan sesi WhatsApp (Multi-File Auth)
├── lib/
│   ├── simple.js       # Serialisasi WebMessageInfo & media helpers
│   ├── plugins.js      # Dynamic loader & file watcher (Hot-Reload)
│   ├── database.js     # Penyimpanan JSON lokal untuk pengaturan grup
│   └── aiHelper.js     # Client API untuk model AI publik tanpa key
└── plugins/
    ├── main/menu.js    # Perintah menu dinamis berdasarkan tags
    ├── info/ping.js    # Perintah pengukur kecepatan respon & status sistem
    ├── ai/
    │   ├── gemini.js     # Chat Gemini AI (.gemini)
    │   ├── deepseek.js   # Chat DeepSeek AI (.deepseek / .ds)
    │   ├── claude.js     # Chat Claude AI (.claude)
    │   ├── qwen.js       # Chat Qwen AI (.qwen)
    │   └── chatgpt.js    # Chat ChatGPT / OpenAI (.ai / .chatgpt)
    ├── downloader/
    │   ├── tiktok.js     # Unduh video TikTok tanpa watermark (.tt / .tiktok)
    │   ├── fb.js         # Unduh video Facebook HD/SD (.fb / .facebook)
    │   ├── ig.js         # Unduh video/foto Instagram (.ig / .instagram)
    │   └── pin.js        # Unduh & cari media Pinterest (.pin / .pinterest)
    ├── group/
    │   ├── enable.js     # Perintah .on & .off pengaturan grup (teks biasa)
    │   ├── antilink.js   # Proteksi hapus pesan semua tautan link
    │   ├── antifoto.js   # Proteksi hapus pesan foto/gambar
    │   ├── antividio.js  # Proteksi hapus pesan video
    │   ├── tagall.js     # Mention seluruh anggota grup (.tagall)
    │   ├── hidetag.js    # Mention senyap (.hidetag / .ht)
    │   ├── linkgc.js     # Mengambil tautan undangan grup (.linkgc)
    │   ├── kick.js       # Mengeluarkan member (.kick)
    │   ├── promote.js    # Menjadikan admin (.promote)
    │   ├── demote.js     # Menurunkan admin (.demote)
    │   ├── intro.js      # Atur dan tampilkan intro grup (.intro / .setintro)
    │   ├── setwelcome.js # Kustomisasi pesan sambutan (.setwelcome)
    │   └── setbye.js     # Kustomisasi pesan perpisahan (.setbye)
    └── owner/
        ├── eval.js       # Runner kode JavaScript (>) dan terminal ($)
        ├── plugins.js    # Pengelola plugin bot (.sp, .gp, .dp)
        └── restart.js    # Perintah reboot/restart bot
```

---

## 🚀 Panduan Instalasi & Penggunaan

### 1. Prasyarat Sistem
- **Node.js**: Versi `20.0.0` atau lebih baru direkomendasikan.
- **Git & npm**: Terpasang di perangkat Anda.

### 2. Unduh Repositori
```bash
git clone https://github.com/KyokoApp/ColumbinaMd.git
cd ColumbinaMd
```

### 3. Pasang Dependensi
```bash
npm install
```

### 4. Konfigurasi
Buka file `config.js` dan sesuaikan nomor WhatsApp pemilik (owner):
```javascript
owners: ['628xxxxxxxxxx'], // Ganti dengan nomor WhatsApp owner (tanpa simbol +)
```

### 5. Menjalankan Bot
```bash
npm start
```

1. Masukkan nomor WhatsApp bot saat diminta di terminal (contoh: `6281234567890`).
2. Salin kode pairing 8 digit yang muncul di layar terminal.
3. Buka WhatsApp di HP:
   - Ketuk menu titik tiga (Android) atau **Pengaturan** (iOS).
   - Pilih **Perangkat Tertaut** > **Tautkan Perangkat**.
   - Pilih opsi **Tautkan dengan nomor telepon saja**.
4. Masukkan 8 digit kode pairing tersebut.
5. Bot terhubung dan siap beroperasi!

---

## 🧩 Cara Membuat Plugin Baru

Cukup buat file JavaScript baru di dalam folder `plugins/` (contoh `plugins/main/halo.js`):

```javascript
let handler = async (m, { conn, text, usedPrefix, command }) => {
    await m.reply(`👋 Halo ${m.pushName || 'kawan'}! Salam kenal.`)
}

// Bantuan menu
handler.help = ['halo']
handler.tags = ['main']

// Pola perintah (regex atau array)
handler.command = /^(halo|hai|hello)$/i

// Guards opsional (set true jika dibutuhkan)
handler.owner = false
handler.group = false
handler.private = false
handler.admin = false
handler.botAdmin = false

export default handler
```

Simpan file tersebut, dan bot akan langsung mengenali perintah baru secara otomatis tanpa perlu restart.

---

## ⭐ Dukungan & Kontribusi
Jika bot ini bermanfaat untuk Anda, pertimbangkan untuk memberikan bintang (**Star**) di repositori ini sebagai bentuk dukungan!

<p align="center">
  <a href="https://github.com/KyokoApp/ColumbinaMd/stargazers">
    <img src="https://img.shields.io/badge/⭐_Beri_Star_di_GitHub-ColumbinaMd-ffd700?style=for-the-badge" alt="Star Repository">
  </a>
</p>

---

## 📄 Lisensi
Didistribusikan di bawah lisensi [MIT](LICENSE).  
Dikelola dengan ❤️ oleh **[KyokoApp](https://github.com/KyokoApp)**.

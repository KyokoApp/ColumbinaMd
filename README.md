# 🕊️ ColumbinaMd

> **ColumbinaMd** adalah Base Bot WhatsApp modular, ringan, dan cepat yang dibangun menggunakan ECMAScript Modules (ESM) dan `@whiskeysockets/baileys` dengan fitur **Pairing Code**.

Dirancang sebagai fondasi (boilerplate) bersih tanpa *bloatware* agar mudah dikembangkan sesuai kebutuhan fitur bot Anda sendiri.

---

## 🌟 Fitur Utama

- **Login Pairing Code**: Tanpa repot scan QR, cukup masukkan nomor WhatsApp bot dan tautkan 8-digit kode pairing di WhatsApp.
- **Sistem Plugin Modular & Hot-Reload**: Tambah fitur baru cukup dengan membuat file `.js` di dalam folder `plugins/`. File otomatis termuat tanpa harus merestart bot.
- **Serialisasi Pesan Rapi**: Objek pesan disederhanakan (`m.reply`, `m.text`, `m.sender`, `m.isGroup`, `m.quoted`, media downloader).
- **Role & Security Guards**: Dukungan guard otomatis per-plugin (`owner`, `admin`, `botAdmin`, `group`, `private`).
- **Starter Commands**: Menu dinamis yang mengelompokkan kategori secara otomatis, pengukur ping/speed, restart bot, serta eval JavaScript & Shell execution (`>` / `$`).

---

## 📁 Struktur Direktori

```text
ColumbinaMd/
├── index.js            # Inisialisasi koneksi Baileys & pairing code prompt
├── handler.js          # Router pesan masuk, permissions & guard checks
├── config.js           # Konfigurasi owner, prefix, nama bot, & nomor pairing
├── package.json        # Manifest dependensi ESM
├── README.md           # Dokumentasi bot
├── .gitignore          # Proteksi session & node_modules agar tidak bocor
├── session/            # Folder penyimpanan sesi WhatsApp (Multi-File Auth)
├── lib/
│   ├── simple.js       # Serialisasi WebMessageInfo & media helpers
│   └── plugins.js      # Dynamic loader & file watcher (Hot-Reload)
└── plugins/
    ├── main/menu.js    # Perintah menu dinamis berdasarkan tags
    ├── info/ping.js    # Perintah pengukur kecepatan respon & status sistem
    └── owner/
        ├── eval.js     # Runner kode JavaScript (>) dan terminal ($)
        └── restart.js  # Perintah reboot/restart bot
```

---

## 🚀 Panduan Instalasi & Penggunaan

### 1. Prasyarat
- **Node.js**: Versi 18.0.0 atau lebih baru.
- **npm**: Bawaan Node.js.

### 2. Clone Repositori
```bash
git clone https://github.com/KyokoApp/ColumbinaMd.git
cd ColumbinaMd
```

### 3. Instalasi Dependensi
```bash
npm install
```

### 4. Konfigurasi
Buka file `config.js` dan sesuaikan daftar owner:
```javascript
owners: ['628xxxxxxxxxx'], // Ganti dengan nomor WhatsApp Anda
```

### 5. Menjalankan Bot
```bash
npm start
```

1. Jika `pairingNumber` di `config.js` kosong, terminal akan meminta nomor telepon bot (contoh: `6281234567890`).
2. Tunggu kode pairing 8 digit muncul di terminal (misal: `ABCD-1234`).
3. Buka WhatsApp di ponsel:
   - Ketuk menu titik tiga (Android) atau Pengaturan (iOS).
   - Pilih **Perangkat Tertaut** > **Tautkan Perangkat**.
   - Pilih **Tautkan dengan nomor telepon saja**.
4. Masukkan kode pairing yang tertera.
5. Bot siap digunakan!

---

## 🧩 Cara Menambahkan Plugin / Fitur Baru

Cukup buat file JavaScript baru di dalam folder `plugins/` (misalnya `plugins/main/halo.js`):

```javascript
let handler = async (m, { conn, text, usedPrefix, command }) => {
    await m.reply(`Halo ${m.pushName || 'kawan'}! Salam kenal.`)
}

// Bantuan menu
handler.help = ['halo']
handler.tags = ['main']

// Regex atau array perintah
handler.command = /^(halo|hai|hello)$/i

// Guards opsional (hilangkan atau set false jika untuk publik)
handler.owner = false
handler.group = false
handler.private = false
handler.admin = false
handler.botAdmin = false

export default handler
```

Simpan file, dan bot akan langsung mengenali perintah baru tanpa perlu restart!

---

## 📄 Lisensi
Didistribusikan di bawah lisensi [MIT](LICENSE).
Dikembangkan untuk komunitas oleh **KyokoApp**.

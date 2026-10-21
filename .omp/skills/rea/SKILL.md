---
name: rea
description: Bongkar dan analisis aplikasi tanpa source code (app Electron/JavaScript, ASAR) pakai CLI rea, lalu jelaskan cara kerja fitur dan tiru di proyek pemilik. Pakai saat diminta menganalisis, membedah, atau mencontek fitur dari app lain.
---

# REA — analisis aplikasi tanpa source code

Pakai CLI `rea` lewat tool `bash`. Jangan jalankan `rea setup` atau `rea setup install` (itu untuk agent lain dan memasang aplikasi berlisensi).

## WAJIB: selalu pakai Node 22
Node bawaan bot terlalu lama untuk REA. Awali SETIAP perintah rea dengan:
```
PATH=/home/container/node22/node_modules/.bin:$PATH rea ...
```
Kalau folder itu tidak ada, berhenti dan lapor ke pemilik (jangan coba memasang Node sendiri).

## Cek lingkungan (sekali di awal)
```
PATH=/home/container/node22/node_modules/.bin:$PATH rea doctor
```
Exit code 1 dan banyak ❌ itu NORMAL: Hopper, Ghidra, IDA, jadx hanya untuk binary. Yang penting hanya baris **node** ✅ dan **host** ✅. Jangan menawarkan memasang engine itu untuk analisis JavaScript.

## Analisis app JavaScript/Electron
```
PATH=/home/container/node22/node_modules/.bin:$PATH rea analyze-javascript-application /path/absolut/app --json > analisis.json
```
- Path harus absolut; targetnya folder app atau file .asar.
- Output bisa ratusan MB: SELALU simpan ke file, jangan cetak ke layar.
- Ringkas dari file itu (grep/jq/head atau skrip kecil), jangan membaca seluruhnya.
- Binary native butuh engine tambahan yang tidak terpasang; kalau diminta, bilang tidak bisa.

## Cara menjawab
1. Katakan apa yang benar-benar ditemukan (nama file, fungsi, endpoint) dan sebut bukti tiap kesimpulan.
2. Pisahkan jelas: **terbukti dari hasil analisis** vs **dugaan**. Jangan mengklaim tahu logika yang tidak muncul di hasil.
3. Kalau diminta menirunya, tulis implementasi sendiri di proyek pemilik berdasarkan perilaku yang terbukti; jangan menyalin kode mentah dari app yang dianalisis.
4. Kalau perintah gagal atau output kosong, tampilkan error aslinya. Jangan pura-pura berhasil.

## Batasan
- Hanya analisis app yang pemilik berhak periksa (miliknya, open-source, atau untuk belajar). Tolak kalau tujuannya membajak/membobol.
- Jangan pakai `sudo` dan jangan memasang paket global tanpa izin pemilik.

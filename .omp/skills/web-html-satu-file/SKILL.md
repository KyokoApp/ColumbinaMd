---
name: web-html-satu-file
description: Panduan bikin dan memeriksa web atau game HTML satu file yang enak di HP, dengan desain rapi dan wajib verifikasi sebelum bilang selesai.
---

# Web / game HTML satu file

Pakai panduan ini saat diminta membuat atau mengubah web, landing page, tool, atau game dalam satu file `.html`.

## Bentuk hasil
- Satu file `.html`, CSS dan JS di dalamnya. Tanpa build step. Library dari CDN hanya bila diminta, dan versinya dipin.
- Mobile-first: `<meta name="viewport" content="width=device-width, initial-scale=1">`, satu kolom di bawah 768px, tombol minimal 44px, tidak ada scroll horizontal. Pakai `min-height: 100dvh`, bukan `100vh`.
- Tidak hotlink gambar. Pakai SVG inline, CSS, atau canvas.

## Desain
- Palet netral dengan SATU warna aksen. Hindari gradasi ungu/neon bawaan AI dan hitam pekat `#000`.
- Satu keluarga font (font sistem, atau satu Google Font dengan fallback). Hierarki jelas lewat ukuran dan berat. Jarak konsisten (kelipatan 4 atau 8px).
- Sediakan state: hover/aktif, kosong, error. Untuk game: menu awal, game over, tombol main lagi.
- Teks nyata dan spesifik, bukan lorem ipsum atau kata klise ("seamless", "unleash"). Jangan pakai emoji sebagai ikon, pakai SVG.

## Game
- Loop pakai `requestAnimationFrame` dengan delta time. Jeda saat tab tersembunyi. Kontrol sentuh dan keyboard.

## Wajib verifikasi sebelum bilang selesai (jangan menebak)
1. Ambil isi `<script>` ke file sementara lalu jalankan `node --check`.
2. Cocokkan `id` yang dipanggil JS (`getElementById`, `querySelector`) dengan `id` di HTML. Cek tag yang tidak tertutup dan sisa `console.log`.
3. Kalau ada logika murni (skor, tabrakan, hitungan), tes dengan skrip node kecil.
4. Baca ulang file sebagai pengguna: tombolnya ada dan terhubung ke fungsi? Layout masih masuk di lebar 360px?
5. Ada yang salah: perbaiki, lalu ulangi langkah 1 sampai 4. Maksimal 3 putaran.
6. Laporkan jujur apa yang sudah dicek dan apa yang TIDAK bisa dicek (misalnya tampilan visual tidak bisa dilihat). Kalau tidak punya tool untuk menjalankan pemeriksaan, katakan itu, jangan mengaku sudah dites.

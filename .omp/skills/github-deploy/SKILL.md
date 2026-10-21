---
name: github-deploy
description: Deploy, hapus, atau kelola file di GitHub Pages milik Yuki.
---

# GitHub Deploy

Gunakan skill ini saat diminta membuat, mengupdate, atau menghapus web/game di repo GitHub.

## 1. Deploy file

1. Tulis file HTML lengkap dan self-contained (CSS + JS inline, CDN eksternal boleh seperti three.js dari cdnjs.cloudflare.com).
2. Cek apakah file sudah ada untuk ambil `sha`:

```
GET https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/{path}
Authorization: Bearer ${GITHUB_TOKEN}
```

3. PUT file:

```
PUT https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/{path}
Authorization: Bearer ${GITHUB_TOKEN}
Content-Type: application/json

{
  "message": "deploy: {nama file}",
  "content": "{base64}",
  "sha": "{sha jika sudah ada, kosongkan jika baru}"
}
```

4. URL publik: `https://${GITHUB_OWNER}.github.io/${GITHUB_REPO}/{path}`

## 2. Hapus semua isi repo (bersihkan)

Gunakan saat diminta "hapus semua", "bersihkan repo", atau "reset repo".

1. List semua file rekursif:

```
GET https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/main?recursive=1
Authorization: Bearer ${GITHUB_TOKEN}
```

2. Filter hanya yang `type === "blob"` (file, bukan folder).
3. DELETE satu per satu (wajib pakai `sha` dari step 1):

```
DELETE https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/{path}
Authorization: Bearer ${GITHUB_TOKEN}
Content-Type: application/json

{
  "message": "cleanup: {path}",
  "sha": "{sha}"
}
```

4. Laporkan berapa file yang berhasil dihapus.

## 3. Hapus satu file

Sama seperti step DELETE di atas, tapi hanya untuk path tertentu.

## Aturan

- Selalu taruh deploy di subfolder: `games/nama-game/index.html` atau `apps/nama-app/index.html`
- Jangan pernah push langsung ke root repo
- Untuk game/web yang butuh internet (three.js, dll) → wajib deploy ke sini, bukan preview inline
- Saat hapus semua, jangan hapus file yang ada di root seperti `README.md` kecuali diminta

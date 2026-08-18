/* ─── SISTEM UPDATE NOTIFICATIONS ───
 * Daftar update terbaru sistem. Muncul saat user membuka aplikasi.
 *
 * Format:
 *   id          : identitas unik update (ganti jika kontennya diubah agar tampil lagi)
 *   title       : judul update
 *   content     : isi/deskripsi update
 *   publishDate : tanggal mulai tampil (YYYY-MM-DD)
 *   expireDate  : tanggal berakhir tampil (YYYY-MM-DD)
 *
 * User cukup menekan tombol "Cek" agar update tidak tampil lagi pada hari yang sama.
 */
const SYSTEM_UPDATES = [
  {
    id: 'update-upload-multi-file',
    title: 'Upload Dokumen Banyak File',
    content: 'Sekarang Anda dapat mengunggah beberapa file sekaligus dalam satu kali upload dokumen.',
    publishDate: '2026-08-18',
    expireDate: '2026-08-31'
  },
  {
    id: 'update-cabang-mkt-types',
    title: 'Tipe Dokumen Marketing untuk User Cabang',
    content: 'User cabang kini juga dapat memilih tipe dokumen yang tampil di divisi Marketing (PO, SPK, SPH, LOI, MRA, dll).',
    publishDate: '2026-08-18',
    expireDate: '2026-09-30'
  }
];

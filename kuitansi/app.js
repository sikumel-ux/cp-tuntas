const firebaseConfig = {
    apiKey: "AIzaSyCzz0INhgBUARAxqLlMnCC8vyCciI9jpJk",
    authDomain: "tuntas-04.firebaseapp.com",
    databaseURL: "https://tuntas-04-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tuntas-04",
    storageBucket: "tuntas-04.firebasestorage.app",
    messagingSenderId: "509433415219",
    appId: "1:509433415219:web:e485a0eab1a612fda64546"
};

const DB_URL = firebaseConfig.databaseURL;

window.addEventListener('DOMContentLoaded', async () => {
    // 1. Ambil Token ID dari Parameter URL (?id=-Oxxxxxxxx)
    const urlParams = new URLSearchParams(window.location.search);
    const idKuitansi = urlParams.get('id');

    if (!idKuitansi) {
        tampilkanStateError();
        return;
    }

    try {
        // 2. Fetch Data Iuran Berdasarkan ID Kuitansi
        const resIuran = await fetch(`${DB_URL}/iuran_sampah/${idKuitansi}.json`);
        const dataIuran = await resIuran.json();

        if (!dataIuran) {
            // Jika ID langsung tidak ditemukan, coba cari berdasarkan child token_kuitansi
            const kuitansiDitemukan = await cariBerdasarkanTokenKuitansi(idKuitansi);
            if (!kuitansiDitemukan) { tampilkanStateError(); return; }
            renderDataKuitansi(kuitansiDitemukan, idKuitansi);
        } else {
            renderDataKuitansi(dataIuran, idKuitansi);
        }
    } catch (error) {
        console.error("Gagal memuat kuitansi:", error);
        tampilkanStateError();
    }
});

// Fungsi cadangan jika ID di URL bertindak sebagai kustom token kuitansi string
async function cariBerdasarkanTokenKuitansi(token) {
    const res = await fetch(`${DB_URL}/iuran_sampah.json`);
    const allData = await res.json();
    if (!allData) return null;

    let target = null;
    Object.keys(allData).forEach(key => {
        if (allData[key].token_kuitansi === token) { target = allData[key]; }
    });
    return target;
}

// Fungsi Utama Melempar Data Firebase ke Komponen HTML
function renderDataKuitansi(data, token) {
    const nominal = parseInt(data.nominal) || 0;

    document.getElementById('invoiceNama').innerText = data.nama_warga || "Warga RT 04";
    document.getElementById('invoiceTipeUser').innerText = data.tipe_user === "PON" ? "Warga Sektor PON" : "Anggota Tetap RT";
    document.getElementById('invoiceToken').innerText = data.token_kuitansi || token.toUpperCase();
    document.getElementById('invoiceTanggal').innerText = data.tanggal || "-";
    document.getElementById('invoiceBulan').innerText = `Periode Bulan: ${data.bulan || "-"}`;
    document.getElementById('invoiceSubtotal').innerText = `Rp ${nominal.toLocaleString('id-ID')}`;
    document.getElementById('invoiceTotal').innerText = `Rp ${nominal.toLocaleString('id-ID')}`;
    document.getElementById('invoiceTerbilang').innerText = fungsiTerbilangIndonesia(nominal) + " Rupiah";

    // Hilangkan loader, tampilkan struk
    document.getElementById('loadingInvoice').classList.add('hidden');
    document.getElementById('mainInvoiceCard').classList.remove('hidden');
}

function tampilkanStateError() {
    document.getElementById('loadingInvoice').classList.add('hidden');
    document.getElementById('errorInvoice').classList.remove('hidden');
}

// Fungsi Konversi Angka Matematika Menjadi Kalimat Ucapan Terbilang Indonesia Resmi
function fungsiTerbilangIndonesia(angka) {
    const bilangan = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
    let temp = "";

    if (angka < 12) {
        temp = " " + bilangan[angka];
    } else if (angka < 20) {
        temp = fungsiTerbilangIndonesia(angka - 10) + " Belas";
    } else if (angka < 100) {
        temp = fungsiTerbilangIndonesia(Math.floor(angka / 10)) + " Puluh" + fungsiTerbilangIndonesia(angka % 10);
    } else if (angka < 200) {
        temp = " Seratus" + fungsiTerbilangIndonesia(angka - 100);
    } else if (angka < 1000) {
        temp = fungsiTerbilangIndonesia(Math.floor(angka / 100)) + " Ratus" + fungsiTerbilangIndonesia(angka % 100);
    } else if (angka < 2000) {
        temp = " Seribu" + fungsiTerbilangIndonesia(angka - 1000);
    } else if (angka < 1000000) {
        temp = fungsiTerbilangIndonesia(Math.floor(angka / 1000)) + " Ribu" + fungsiTerbilangIndonesia(angka % 1000);
    } else if (angka < 1000000000) {
        temp = fungsiTerbilangIndonesia(Math.floor(angka / 1000000)) + " Juta" + fungsiTerbilangIndonesia(angka % 1000000);
    }
    return temp.trim();
}

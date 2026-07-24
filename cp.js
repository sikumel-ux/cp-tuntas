// ==========================================
// KONFIGURASI & VARIABEL GLOBAL
// ==========================================
const DB_URL = "https://tuntas-04-default-rtdb.asia-southeast1.firebasedatabase.app";

let MEMORI_KAS_GLOBAL = {};
let MEMORI_RIWAYAT_GLOBAL = {};
let MEMORI_BERITA_GLOBAL = {};
let MEMORI_LAPORAN_SAMPAH = {};

// ==========================================
// INISIALISASI HALAMAN (DOM LOADED)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const hariIni = new Date();
    const y = hariIni.getFullYear();
    const m = String(hariIni.getMonth() + 1).padStart(2, '0');
    const d = String(hariIni.getDate()).padStart(2, '0');

    // Set default tanggal filter kas
    const filterMulai = document.getElementById('filterMulai');
    const filterSelesai = document.getElementById('filterSelesai');
    if (filterMulai) filterMulai.value = `${y}-${m}-01`;
    if (filterSelesai) filterSelesai.value = `${y}-${m}-${d}`;

    // Set default bulan untuk kalender sampah
    const inputBulanSampah = document.getElementById('kalenderBulanPilihan');
    if (inputBulanSampah) {
        inputBulanSampah.value = `${y}-${m}`;
    }

    // Set jam real-time di header
    updateJamHeader();
    setInterval(updateJamHeader, 1000);

    // Muat semua data dari Firebase
    sinkronUlangData();
});

// ==========================================
// SINKRONISASI DATA UTAMA
// ==========================================
async function sinkronUlangData() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) loader.style.display = 'flex';

    try {
        await Promise.all([
            muatSistemKas(),
            muatRiwayatIuranWarga(),
            muatLaporanSampah(),
            muatBeritaAdmin()
        ]);
    } catch (err) {
        console.error("Gagal melakukan sinkronisasi data:", err);
    } finally {
        if (loader) loader.style.display = 'none';
    }
}

function updateJamHeader() {
    const el = document.getElementById('txtHeaderTanggalJam');
    if (!el) return;
    
    const now = new Date();
    const opsi = { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    };
    el.innerText = now.toLocaleDateString('id-ID', opsi).replace(/\./g, ':');
}

// ==========================================
// LOGIKA LAPORAN SAMPAH & KALENDER (HIJAU & POPUP JAM)
// ==========================================
async function muatLaporanSampah() {
    try {
        const res = await fetch(`${DB_URL}/laporan_sampah.json`);
        const data = await res.json();
        
        MEMORI_LAPORAN_SAMPAH = data || {};
        generateKalenderSampah();
    } catch (err) {
        console.error("Gagal memuat laporan sampah:", err);
    }
}

function generateKalenderSampah() {
    const inputBulan = document.getElementById('kalenderBulanPilihan');
    const gridKalender = document.getElementById('gridHariKalender');
    
    if (!inputBulan || !gridKalender) return;
    if (!inputBulan.value) return;

    const [tahun, bulan] = inputBulan.value.split('-').map(Number);
    
    // Hitung total hari & offset hari pertama (0 = Minggu, 1 = Senin, dst.)
    const totalHari = new Date(tahun, bulan, 0).getDate();
    const hariPertama = new Date(tahun, bulan - 1, 1).getDay();

    gridKalender.innerHTML = ''; 

    // Slot kosong untuk penyesuaian posisi hari
    for (let i = 0; i < hariPertama; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'p-2';
        gridKalender.appendChild(emptyDiv);
    }

    // Kelompokkan data sampah dari Firebase berdasarkan tanggal "YYYY-MM-DD"
    const sampahPerTanggal = {};
    Object.keys(MEMORI_LAPORAN_SAMPAH).forEach(key => {
        const item = MEMORI_LAPORAN_SAMPAH[key];
        if (item && item.tanggal && item.status === 'diambil') {
            if (!sampahPerTanggal[item.tanggal]) {
                sampahPerTanggal[item.tanggal] = [];
            }
            sampahPerTanggal[item.tanggal].push(item);
        }
    });

    // Render Tanggal 1 s/d Akhir Bulan
    for (let tgl = 1; tgl <= totalHari; tgl++) {
        const bulanStr = String(bulan).padStart(2, '0');
        const tglStr = String(tgl).padStart(2, '0');
        const keyTanggal = `${tahun}-${bulanStr}-${tglStr}`;

        const btnHari = document.createElement('button');
        btnHari.type = 'button';
        
        const listPengambilan = sampahPerTanggal[keyTanggal];

        if (listPengambilan && listPengambilan.length > 0) {
            // ADA Pengambilan -> KALENDER NYALA HIJAU
            btnHari.className = 'p-2 rounded-xl bg-emerald-500 text-white font-black shadow-sm hover:bg-emerald-600 active:scale-95 transition-all cursor-pointer flex flex-col items-center justify-center';
            btnHari.onclick = () => tampilkanDetailSampah(keyTanggal, listPengambilan);
        } else {
            // TIDAK ADA -> Default Abu-abu
            btnHari.className = 'p-2 rounded-xl bg-slate-50 text-slate-500 font-bold cursor-default opacity-60';
        }

        btnHari.innerText = tgl;
        gridKalender.appendChild(btnHari);
    }
}

function tampilkanDetailSampah(tanggalString, listDetail) {
    const [th, bl, tg] = tanggalString.split('-');
    const tglObj = new Date(th, bl - 1, tg);
    const opsiTgl = { day: 'numeric', month: 'long', year: 'numeric' };
    const tglIndo = tglObj.toLocaleDateString('id-ID', opsiTgl);

    let riwayatTeks = listDetail.map((d, index) => {
        return `${index + 1}. Jam: ${d.jam_diambil} (${d.nama_warga || 'Warga RT 04'})`;
    }).join('\n');

    const popupJudul = document.getElementById('popupInfoJudul');
    const popupIsi = document.getElementById('popupInfoIsi');
    
    if (popupJudul && popupIsi) {
        popupJudul.innerText = `PENGAMBILAN SAMPAH`;
        popupIsi.innerHTML = `
            <div class="text-left space-y-1">
                <p class="font-bold text-emerald-700">📅 ${tglIndo}</p>
                <p class="text-[10px] text-slate-500 font-bold uppercase">Status: <span class="text-emerald-600">Berhasil Diangkut</span></p>
                <hr class="my-1 border-slate-200">
                <p class="font-bold text-slate-700">Detail Jam Pengambilan:</p>
                <div class="bg-white p-2 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-600 leading-relaxed">
                    ${riwayatTeks.replace(/\n/g, '<br>')}
                </div>
            </div>
        `;
        openModal('mInfoLoginPopup');
    } else {
        alert(`📌 LAPORAN PENGAMBILAN SAMPAH\nTanggal: ${tglIndo}\n\nRiwayat Jam:\n${riwayatTeks}`);
    }
}

// ==========================================
// MUAT SISTEM KAS TRANSPARANSI
// ==========================================
async function muatSistemKas() {
    try {
        const res = await fetch(`${DB_URL}/kas_rt04.json`);
        const data = await res.json();
        const list = document.getElementById('listMutasiKasMasyarakat');
        if (!list) return;

        list.innerHTML = "";

        const fMulai = document.getElementById('filterMulai').value;
        const fSelesai = document.getElementById('filterSelesai').value;

        let start = fMulai ? new Date(fMulai) : new Date('2000-01-01');
        let end = fSelesai ? new Date(fSelesai) : new Date('2099-12-31');
        end.setHours(23, 59, 59, 999);

        let saldoKeseluruhan = 0;
        let mskTerapit = 0;
        let klrTerapit = 0;

        if (!data) {
            updateTampilanCardKas(0, 0, 0, 0);
            list.innerHTML = `<div class="p-4 text-center text-xs text-slate-400 font-bold uppercase">Belum ada mutasi kas.</div>`;
            return;
        }

        Object.keys(data).forEach(key => {
            const v = data[key];
            const nom = parseInt(v.nominal) || 0;
            const tglItem = new Date(v.tanggal);

            if (v.jenis === 'masuk') saldoKeseluruhan += nom;
            else saldoKeseluruhan -= nom;

            if (tglItem >= start && tglItem <= end) {
                if (v.jenis === 'masuk') mskTerapit += nom;
                else klrTerapit += nom;

                list.insertAdjacentHTML('afterbegin', `
                    <div class="p-3.5 flex justify-between items-center bg-white">
                        <div class="pr-2 flex-1">
                            <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wide leading-tight">${v.keterangan}</h4>
                            <p class="text-[9px] font-mono text-slate-400 mt-0.5">${v.tanggal}</p>
                        </div>
                        <span class="text-xs font-black ${v.jenis==='masuk'?'text-emerald-600':'text-rose-600'} whitespace-nowrap">
                            ${v.jenis==='masuk'?'+':'-'} ${nom.toLocaleString('id-ID')}
                        </span>
                    </div>
                `);
            }
        });

        const sldTerapit = mskTerapit - klrTerapit;
        updateTampilanCardKas(saldoKeseluruhan, sldTerapit, mskTerapit, klrTerapit);

    } catch (e) {
        console.error("Gagal muat kas:", e);
    }
}

function updateTampilanCardKas(sk, sf, m, k) {
    const elSk = document.getElementById('totalSaldoKeseluruhan');
    const elSf = document.getElementById('totalSaldo');
    const elM = document.getElementById('textMasuk');
    const elK = document.getElementById('textKeluar');

    if (elSk) elSk.innerText = "Rp " + sk.toLocaleString('id-ID');
    if (elSf) elSf.innerText = sf.toLocaleString('id-ID');
    if (elM) elM.innerText = m.toLocaleString('id-ID');
    if (elK) elK.innerText = k.toLocaleString('id-ID');
}

// ==========================================
// RIWAYAT IURAN & KUITANSI
// ==========================================
async function muatRiwayatIuranWarga() {
    try {
        const res = await fetch(`${DB_URL}/iuran_sampah.json`);
        const data = await res.json();
        const container = document.getElementById('listRiwayatIuranWarga');
        if (!container) return;

        container.innerHTML = "";

        if (!data) {
            container.innerHTML = `<div class="p-4 text-center text-xs text-slate-400 font-bold uppercase">Belum ada riwayat pembayaran.</div>`;
            return;
        }

        Object.keys(data).reverse().forEach(key => {
            const item = data[key];
            const nominal = parseInt(item.nominal) || 0;

            container.insertAdjacentHTML('beforeend', `
                <div class="bg-white border border-slate-100 p-3.5 rounded-2xl shadow-sm flex items-center justify-between">
                    <div>
                        <h4 class="text-xs font-black text-slate-800 uppercase">${item.nama_warga || 'WARGA'}</h4>
                        <p class="text-[9px] font-bold text-slate-400 mt-0.5">${item.bulan || item.tanggal}</p>
                    </div>
                    <div class="text-right">
                        <span class="text-xs font-black text-emerald-600 block">Rp ${nominal.toLocaleString('id-ID')}</span>
                        <button onclick="bukaKuitansi('${item.pon}')" class="text-[9px] font-bold text-slate-400 underline hover:text-emerald-600">Kuitansi</button>
                    </div>
                </div>
            `);
        });
    } catch (e) {
        console.error("Gagal muat riwayat iuran:", e);
    }
}

function bukaKuitansi(tokenPon) {
    if (!tokenPon) return;
    const iframe = document.getElementById('iframeKuitansi');
    if (iframe) {
        iframe.src = `kuitansi.html?id=${tokenPon}`;
        openModal('mKuitansiPopup');
    }
}

// ==========================================
// INFORMASI, BERITA & KRITIK WARGA
// ==========================================
async function muatBeritaAdmin() {
    try {
        const res = await fetch(`${DB_URL}/pengumuman.json`);
        const data = await res.json();
        const container = document.getElementById('listBeritaAdmin');
        if (!container) return;

        container.innerHTML = "";

        if (!data) {
            container.innerHTML = `<div class="p-4 text-center text-xs text-slate-400 font-bold uppercase">Belum ada pengumuman terbaru.</div>`;
            return;
        }

        Object.keys(data).reverse().forEach(key => {
            const b = data[key];
            container.insertAdjacentHTML('beforeend', `
                <div class="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm space-y-1">
                    <span class="text-[9px] font-black text-emerald-600 uppercase tracking-widest block">${b.tanggal || '-'}</span>
                    <h4 class="text-xs font-black text-slate-800 uppercase leading-snug">${b.judul || 'PENGUMUMAN'}</h4>
                    <p class="text-[11px] text-slate-600 font-medium leading-relaxed">${b.isi || ''}</p>
                </div>
            `);
        });
    } catch (e) {
        console.error("Gagal muat berita:", e);
    }
}

async function kirimAspirasiWarga(e) {
    e.preventDefault();
    const txtArea = document.getElementById('txtAspirasi');
    const isi = txtArea.value.trim();
    if (!isi) return;

    const body = {
        tanggal: new Date().toISOString().split('T')[0],
        pesan: isi
    };

    try {
        await fetch(`${DB_URL}/saran_warga.json`, { method: 'POST', body: JSON.stringify(body) });
        txtArea.value = "";
        showNotif('Saran & Kritik Berhasil Dikirim', 'sukses');
    } catch (err) {
        showNotif('Gagal mengirim saran', 'gagal');
    }
}

// ==========================================
// FUNGSI NAVIGASI TAB & MODAL UI
// ==========================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');

    const btnNav = document.getElementById(`nav-btn-${tabId.replace('scr-', '')}`);
    if (btnNav) btnNav.classList.add('active');
}

function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
}

function showNotif(msg, type) {
    const box = document.getElementById('notificationAlert');
    const icon = document.getElementById('notifIcon');
    const text = document.getElementById('notifText');

    if (!box || !text) return;

    text.innerText = msg;
    box.className = `fixed top-4 left-1/2 -translate-x-1/2 w-11/12 max-w-sm z-[99999] p-4 rounded-2xl shadow-lg border text-xs font-black uppercase tracking-wide flex items-center gap-2.5 transition-all duration-300 ${type === 'sukses' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`;
    
    if (icon) {
        icon.className = `fa-solid ${type === 'sukses' ? 'fa-circle-check text-emerald-600' : 'fa-circle-xmark text-rose-600'} text-base`;
    }

    box.classList.remove('hidden');
    setTimeout(() => box.classList.add('hidden'), 3000);
}

function logoutSession() {
    localStorage.clear();
    window.location.reload();
}

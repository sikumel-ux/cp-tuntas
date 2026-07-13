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
let SESI_WARGA = JSON.parse(localStorage.getItem("warga_session"));
let DATA_LOG_SAMPAH_GLOBAL = {};

window.addEventListener('DOMContentLoaded', () => {
    if (!SESI_WARGA) { window.location.href = "login/"; return; }
    
    inisialisasiSistemTampilanWarga(SESI_WARGA);

    document.getElementById('displayProfilNama').innerText = SESI_WARGA.nama.toUpperCase();
    document.getElementById('displayProfilWa').innerText = SESI_WARGA.username;

    jalankanJamHeaderRealtime();

    // === FITUR AUTOMATIC DATE FILTER (Bulan Berjalan: Tgl 1 s.d Hari Ini Berjalan) ===
    const hariIni = new Date();
    const tahunBerjalan = hariIni.getFullYear();
    const bulanBerjalan = String(hariIni.getMonth() + 1).padStart(2, '0');
    const tanggalBerjalan = String(hariIni.getDate()).padStart(2, '0');

    document.getElementById('filterMulai').value = `${tahunBerjalan}-${bulanBerjalan}-01`;
    document.getElementById('filterSelesai').value = `${tahunBerjalan}-${bulanBerjalan}-${tanggalBerjalan}`;
    document.getElementById('kalenderBulanPilihan').value = `${tahunBerjalan}-${bulanBerjalan}`;

    // Handler Tombol Salin Rekening
    const btnSalin = document.getElementById('btnSalinRekening');
    if (btnSalin) {
        btnSalin.addEventListener('click', () => {
            const noRek = document.getElementById('noRekeningRT').innerText;
            navigator.clipboard.writeText(noRek)
                .then(() => {
                    showNotif('Nomor rekening berhasil disalin!', 'sukses');
                })
                .catch(() => {
                    // Fallback jika Clipboard API diblokir browser
                    const inputPalsu = document.createElement('input');
                    inputPalsu.value = noRek;
                    document.body.appendChild(inputPalsu);
                    inputPalsu.select();
                    document.execCommand('copy');
                    document.body.removeChild(inputPalsu);
                    showNotif('Nomor rekening berhasil disalin!', 'sukses');
                });
        });
    }

    sinkronUlangData().then(() => { jalankanPopupInfoOtotmatis(); muatFotoProfilDinamis(); });
});

function inisialisasiSistemTampilanWarga(dataUser) {
    const tipeAkun = (dataUser.tipe || 'tetap').toUpperCase();
    const tombolNavLog = document.getElementById('nav-btn-log');

    if (tipeAkun === 'PON') {
        if (tombolNavLog) tombolNavLog.classList.add('hidden');
    } else {
        if (tombolNavLog) tombolNavLog.classList.remove('hidden');
    }
}

function jalankanJamHeaderRealtime() {
    const opsi = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setInterval(() => {
        const d = new Date();
        const elementJam = document.getElementById('txtHeaderTanggalJam');
        if (elementJam) {
            elementJam.innerText = `${d.toLocaleDateString('id-ID', opsi)} • ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')} WIB`;
        }
    }, 1000);
}

async function sinkronUlangData() {
    document.getElementById('loadingOverlay').style.display = 'flex';
    try { 
        const tipeAkun = (SESI_WARGA.tipe || 'tetap').toUpperCase();
        if (tipeAkun === 'PON') {
            await Promise.all([muatSistemKas(), muatRiwayatIuranMasyarakat(), muatBeritaAdmin()]); 
        } else {
            await Promise.all([muatSistemKas(), muatRiwayatIuranMasyarakat(), muatSistemLogSampah(), muatBeritaAdmin()]); 
        }
    } catch(e){}
    finally { document.getElementById('loadingOverlay').style.display = 'none'; }
}

function switchTab(id) {
    if (id === 'scr-log' && (SESI_WARGA.tipe || '').toUpperCase() === 'PON') {
        id = 'scr-home';
    }
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    const targetTab = document.getElementById(id);
    const targetBtn = document.getElementById('nav-btn-' + id.split('-')[1]);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');
}

async function muatFotoProfilDinamis() {
    try {
        const res = await fetch(`${DB_URL}/warga_rt04/${SESI_WARGA.key}/foto.json`); const b64 = await res.json();
        document.getElementById('profFoto').src = (b64 && b64 !== "default.png") ? b64 : "default-avatar.png";
    } catch(e) {}
}

function prosesUploadFoto(input) {
    if (input.files && input.files[0]) {
        document.getElementById('loadingOverlay').style.display = 'flex';
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = async function() {
                const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = img.height * (400 / img.width);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                const b64Str = canvas.toDataURL('image/jpeg', 0.7);
                try {
                    await fetch(`${DB_URL}/warga_rt04/${SESI_WARGA.key}/foto.json`, { method: 'PUT', body: JSON.stringify(b64Str) });
                    document.getElementById('profFoto').src = b64Str; showNotif('Foto Berhasil Diperbarui!', 'sukses');
                } catch(e) { showNotif('Gagal upload', 'gagal'); }
                finally { document.getElementById('loadingOverlay').style.display = 'none'; }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function muatSistemKas() {
    try {
        const res = await fetch(`${DB_URL}/kas_rt04.json`); 
        const data = await res.json();
        const list = document.getElementById('listMutasiKasMasyarakat'); 
        list.innerHTML = ""; 
        if(!data) return;

        let start = new Date(document.getElementById('filterMulai').value); 
        let end = new Date(document.getElementById('filterSelesai').value); 
        end.setHours(23,59,59,999);
        
        let sk = 0, m = 0, k = 0;
        const namaBulanIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

        // 1. Kumpulkan data mutasi ke dalam Array terlebih dahulu
        let arrayKas = [];
        Object.keys(data).forEach(key => {
            const v = data[key]; 
            const nom = parseInt(v.nominal) || 0; 
            const tgl = new Date(v.tanggal);
            
            if(v.jenis === 'masuk') sk += nom; else sk -= nom;
            
            if(tgl >= start && tgl <= end) {
                if(v.jenis === 'masuk') m += nom; else k += nom;
                arrayKas.push({ ...v, objekTanggal: tgl, nominalNum: nom });
            }
        });

        // 2. Sorting Descending (Inputan / Tanggal terbaru di atas)
        arrayKas.sort((a, b) => b.objekTanggal - a.objekTanggal);

        // 3. Render Data ke Elemen HTML
        arrayKas.forEach(v => {
            // -- Manipulasi Teks Keterangan --
            let keteranganTeks = v.keterangan || "";
            const ketUpper = keteranganTeks.toUpperCase();

            if (ketUpper.includes("PON")) {
                keteranganTeks = v.keterangan; // Cukup NAMA - PON
            } else {
                // Anggota tetap -> Cukup NAMA - BULAN (Hilangkan digit 4 angka tahun jika ada)
                keteranganTeks = keteranganTeks.replace(/\s*\b\d{4}\b/g, '');
            }

            // -- Mengubah format tanggal angka menjadi Teks (Contoh: 14 Juni 2026) --
            const tglObj = v.objekTanggal;
            const tanggalTeksFormat = `${tglObj.getDate()} ${namaBulanIndo[tglObj.getMonth()]} ${tglObj.getFullYear()}`;
            const classWarnaNominal = v.jenis === 'masuk' ? 'text-emerald-600' : 'text-rose-600';

            // Menghilangkan tanda (+ / -), langsung menuliskan nominal angka bersih
            list.insertAdjacentHTML('beforeend', `
                <div class="p-4 flex justify-between items-center">
                    <div>
                        <h4 class="text-xs font-bold text-slate-700 uppercase">${keteranganTeks}</h4>
                        <p class="text-[9px] font-mono text-slate-400">${tanggalTeksFormat}</p>
                    </div>
                    <span class="text-xs font-black ${classWarnaNominal}">${v.nominalNum.toLocaleString('id-ID')}</span>
                </div>
            `);
        });

        document.getElementById('totalSaldoKeseluruhan').innerText = "Rp " + sk.toLocaleString('id-ID');
        document.getElementById('totalSaldo').innerText = (m-k).toLocaleString('id-ID');
        document.getElementById('textMasuk').innerText = m.toLocaleString('id-ID');
        document.getElementById('textKeluar').innerText = k.toLocaleString('id-ID');
    } catch(e){}
}

function bukaModalKuitansi(url) {
    const iframe = document.getElementById('iframeKuitansi');
    if (iframe) {
        iframe.src = url;
        openModal('mKuitansiPopup');
    }
}

async function muatRiwayatIuranMasyarakat() {
    try {
        const res = await fetch(`${DB_URL}/iuran_sampah.json`); 
        const data = await res.json();
        const list = document.getElementById('listRiwayatIuranWarga'); 
        list.innerHTML = "";
        if(!data) { list.innerHTML = `<div class="p-4 text-center text-xs text-slate-400 font-bold">BELUM ADA DATA SETORAN.</div>`; return; }
        
        let arrayRiwayat = [];

        Object.keys(data).forEach(key => {
            const i = data[key];
            if(i.warga_key === SESI_WARGA.key) {
                arrayRiwayat.push({ ...i, keyKonten: key, objekTanggal: new Date(i.tanggal) });
            }
        });

        if(arrayRiwayat.length === 0) {
            list.innerHTML = `<div class="p-4 text-center text-xs text-slate-400 font-bold">BELUM ADA DATA SETORAN.</div>`;
            return;
        }

        // Sorting Descending: Riwayat pembayaran terbaru di atas
        arrayRiwayat.sort((a, b) => b.objekTanggal - a.objekTanggal);

        arrayRiwayat.forEach(i => {
            const tokenID = i.token_kuitansi || i.pon || i.keyKonten;
            const urlKuitansi = `kuitansi.html?id=${encodeURIComponent(tokenID)}`;
            
            list.insertAdjacentHTML('beforeend', `
                <div class="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-3">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100"><i class="fa-solid fa-receipt text-xs"></i></div>
                            <div><h4 class="text-xs font-extrabold text-slate-800 uppercase">${i.bulan}</h4><p class="text-[9px] text-slate-400 font-medium">${i.tanggal}</p></div>
                        </div>
                        <div class="text-right"><span class="text-xs font-black text-slate-800">Rp ${parseInt(i.nominal).toLocaleString('id-ID')}</span></div>
                    </div>
                    <div class="border-t border-slate-50 pt-2 flex justify-between items-center text-[9px] font-bold">
                        <span class="font-mono text-slate-400">ID: ${tokenID}</span>
                        <button onclick="bukaModalKuitansi('${urlKuitansi}')" class="text-emerald-600 hover:underline uppercase flex items-center gap-1 cursor-pointer bg-transparent border-none outline-none"><i class="fa-solid fa-receipt text-[8px]"></i> Bukti Pembayaran</button>
                    </div>
                </div>
            `);
        });
    } catch(e){}
}

function generateKalenderSampah() {
    if ((SESI_WARGA.tipe || '').toUpperCase() === 'PON') return;

    const grid = document.getElementById('gridHariKalender'); if (!grid) return;
    grid.innerHTML = "";
    const bulanInput = document.getElementById('kalenderBulanPilihan').value; if(!bulanInput) return;
    const [tahun, bulan] = bulanInput.split('-');
    
    const tanggalPertama = new Date(tahun, bulan - 1, 1);
    const tanggalTerakhir = new Date(tahun, bulan, 0);
    
    for (let i = 0; i < tanggalPertama.getDay(); i++) {
        grid.insertAdjacentHTML('beforeend', `<div></div>`);
    }
    for (let d = 1; d <= tanggalTerakhir.getDate(); d++) {
        const formatHari = `${tahun}-${String(bulan).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        let classSetor = "";
        if(DATA_LOG_SAMPAH_GLOBAL[SESI_WARGA.key] && DATA_LOG_SAMPAH_GLOBAL[SESI_WARGA.key][formatHari]) {
            if(DATA_LOG_SAMPAH_GLOBAL[SESI_WARGA.key][formatHari].status === "diangkut") classSetor = "active-setor";
        }
        grid.insertAdjacentHTML('beforeend', `<div class="p-2 bg-slate-50 border border-slate-100 rounded-xl day-box ${classSetor}">${d}</div>`);
    }
}

async function muatSistemLogSampah() {
    try {
        const res = await fetch(`${DB_URL}/log_sampah_warga.json`);
        DATA_LOG_SAMPAH_GLOBAL = await res.json() || {};
        generateKalenderSampah();
    } catch(e){}
}

async function muatBeritaAdmin() {
    try {
        const res = await fetch(`${DB_URL}/pengumuman.json`); const data = await res.json();
        const list = document.getElementById('listBeritaAdmin'); list.innerHTML = ""; if(!data) return;
        Object.keys(data).forEach(key => {
            list.insertAdjacentHTML('afterbegin', `<div class="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm"><h5 class="text-xs font-black text-slate-800 mb-1">${data[key].judul}</h5><p class="text-[11px] text-slate-600 leading-normal">${data[key].isi}</p><span class="text-[8px] text-slate-400 font-mono block mt-2 text-right">${data[key].tanggal}</span></div>`);
        });
    } catch(e){}
}

async function kirimAspirasiWarga(e) {
    e.preventDefault();
    const text = document.getElementById('txtAspirasi').value.trim(); if(!text) return;
    document.getElementById('loadingOverlay').style.display = 'flex';
    const payload = { warga_key: SESI_WARGA.key, nama: SESI_WARGA.nama, tipe: SESI_WARGA.tipe, pesan: text, tanggal: new Date().toISOString().split('T')[0] };
    try {
        await fetch(`${DB_URL}/aspirasi_warga.json`, { method: 'POST', body: JSON.stringify(payload) });
        document.getElementById('formKritikWarga').reset(); showNotif('Saran & Kritik berhasil dikirim!', 'sukses');
    } catch(e) { showNotif('Gagal mengirim saran', 'gagal'); }
    finally { document.getElementById('loadingOverlay').style.display = 'none'; }
}

function ubahPasswordWarga(e) {
    e.preventDefault();
    fetch(`${DB_URL}/warga_rt04/${SESI_WARGA.key}/password.json`, { method: 'PUT', body: JSON.stringify(document.getElementById('newPass').value.trim()) }).then(() => { document.getElementById('formPass').reset(); showNotif('Password Berhasil Diubah', 'sukses'); });
}

async function jalankanPopupInfoOtotmatis() {
    try {
        const res = await fetch(`${DB_URL}/informasi_popup.json`); const data = await res.json();
        if(data && data.judul) { document.getElementById('popupInfoJudul').innerText = data.judul; document.getElementById('popupInfoIsi').innerText = data.isi; openModal('mInfoLoginPopup'); }
    } catch(e){}
}

function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function openModal(id) { document.getElementById(id).classList.add('active'); }

function logoutSession() { 
    localStorage.clear(); 
    window.location.href = 'login/'; 
}

function showNotif(msg, type) {
    const box = document.getElementById('notificationAlert'); box.className = `fixed top-4 left-1/2 -translate-x-1/2 w-11/12 max-w-sm z-[99999] p-4 rounded-2xl bg-white border text-xs font-black uppercase flex items-center gap-2 shadow-md ${type==='sukses'?'text-emerald-600 border-emerald-100':'text-rose-600 border-rose-100'}`;
    document.getElementById('notifIcon').className = `fa-solid ${type==='sukses'?'fa-circle-check':'fa-circle-xmark'}`;
    document.getElementById('notifText').innerText = msg; box.classList.remove('hidden'); setTimeout(() => box.classList.add('hidden'), 3000);
}

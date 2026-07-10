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
    if (!SESI_WARGA || SESI_WARGA.tipe === "PON") { window.location.href = "../lojin/"; return; }
    
    document.getElementById('displayProfilNama').innerText = SESI_WARGA.nama.toUpperCase();
    document.getElementById('displayProfilWa').innerText = "+62 " + SESI_WARGA.username;

    jalankanJamHeaderRealtime();

    const hariIni = new Date();
    document.getElementById('filterMulai').value = `${hariIni.getFullYear()}-${String(hariIni.getMonth() + 1).padStart(2, '0')}-01`;
    document.getElementById('filterSelesai').value = hariIni.toISOString().split('T')[0];
    document.getElementById('kalenderBulanPilihan').value = `${hariIni.getFullYear()}-${String(hariIni.getMonth() + 1).padStart(2, '0')}`;

    sinkronUlangData().then(() => { jalankanPopupInfoOtotmatis(); muatFotoProfilDinamis(); });
});

function jalankanJamHeaderRealtime() {
    const opsi = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setInterval(() => {
        const d = new Date();
        document.getElementById('txtHeaderTanggalJam').innerText = `${d.toLocaleDateString('id-ID', opsi)} • ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')} WIB`;
    }, 1000);
}

async function sinkronUlangData() {
    document.getElementById('loadingOverlay').style.display = 'flex';
    try { await Promise.all([muatSistemKas(), muatRiwayatIuranMasyarakat(), muatSistemLogSampah(), muatBeritaAdmin()]); } catch(e){}
    finally { document.getElementById('loadingOverlay').style.display = 'none'; }
}

function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('nav-btn-' + id.split('-')[1]).classList.add('active');
}

async function muatFotoProfilDinamis() {
    try {
        const res = await fetch(`${DB_URL}/warga_rt04/${SESI_WARGA.key}/foto.json`); const b64 = await res.json();
        document.getElementById('profFoto').src = (b64 && b64 !== "default.png") ? b64 : "../default-avatar.png";
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
        const res = await fetch(`${DB_URL}/kas_rt04.json`); const data = await res.json();
        const list = document.getElementById('listMutasiKasMasyarakat'); list.innerHTML = ""; if(!data) return;
        let start = new Date(document.getElementById('filterMulai').value), end = new Date(document.getElementById('filterSelesai').value); end.setHours(23,59,59,999);
        let sk = 0, m = 0, k = 0;
        Object.keys(data).forEach(key => {
            const v = data[key]; const nom = parseInt(v.nominal)||0; const tgl = new Date(v.tanggal);
            if(v.jenis === 'masuk') sk += nom; else sk -= nom;
            if(tgl >= start && tgl <= end) {
                if(v.jenis === 'masuk') m += nom; else k += nom;
                list.insertAdjacentHTML('afterbegin', `<div class="p-4 flex justify-between items-center"><div><h4 class="text-xs font-bold text-slate-700 uppercase">${v.keterangan}</h4><p class="text-[9px] font-mono text-slate-400">${v.tanggal}</p></div><span class="text-xs font-black ${v.jenis==='masuk'?'text-emerald-600':'text-rose-600'}">${v.jenis==='masuk'?'+':'-'} ${nom.toLocaleString('id-ID')}</span></div>`);
            }
        });
        document.getElementById('totalSaldoKeseluruhan').innerText = "Rp " + sk.toLocaleString('id-ID');
        document.getElementById('totalSaldo').innerText = (m-k).toLocaleString('id-ID');
        document.getElementById('textMasuk').innerText = m.toLocaleString('id-ID');
        document.getElementById('textKeluar').innerText = k.toLocaleString('id-ID');
    } catch(e){}
}

async function muatRiwayatIuranMasyarakat() {
    try {
        const res = await fetch(`${DB_URL}/iuran_sampah.json`); const data = await res.json();
        const list = document.getElementById('listRiwayatIuranWarga'); list.innerHTML = "";
        if(!data) { list.innerHTML = `<div class="p-4 text-center text-xs text-slate-400 font-bold">BELUM ADA DATA SETORAN.</div>`; return; }
        let count = 0;
        Object.keys(data).forEach(key => {
            const i = data[key];
            if(i.warga_key === SESI_WARGA.key && (i.tipe_user === "Anggota Tetap" || !i.tipe_user)) {
                count++;
                const urlKuitansi = `../kuitansi/?id=${i.token_kuitansi || key}`;
                list.insertAdjacentHTML('afterbegin', `
                    <div class="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-3">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100"><i class="fa-solid fa-receipt text-xs"></i></div>
                                <div><h4 class="text-xs font-extrabold text-slate-800 uppercase">${i.bulan}</h4><p class="text-[9px] text-slate-400 font-medium">${i.tanggal}</p></div>
                            </div>
                            <div class="text-right"><span class="text-xs font-black text-slate-800">Rp ${i.nominal.toLocaleString('id-ID')}</span></div>
                        </div>
                        <div class="border-t border-slate-50 pt-2 flex justify-between items-center text-[9px] font-bold">
                            <span class="font-mono text-slate-400">ID: ${i.token_kuitansi || 'TERCATAT'}</span>
                            <a href="${urlKuitansi}" target="_blank" class="text-emerald-600 hover:underline uppercase flex items-center gap-1"><i class="fa-solid fa-arrow-up-right-from-square text-[8px]"></i> Bukti Pembayaran</a>
                        </div>
                    </div>
                `);
            }
        });
        if(count === 0) list.innerHTML = `<div class="p-4 text-center text-xs text-slate-400 font-bold">BELUM ADA DATA SETORAN.</div>`;
    } catch(e){}
}

function generateKalenderSampah() {
    const grid = document.getElementById('gridHariKalender'); grid.innerHTML = "";
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
    const payload = {
        warga_key: SESI_WARGA.key,
        nama: SESI_WARGA.nama,
        tipe: SESI_WARGA.tipe,
        pesan: text,
        tanggal: new Date().toISOString().split('T')[0]
    };
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
function logoutSession() { localStorage.clear(); window.location.href = '../lojin/'; }
function showNotif(msg, type) {
    const box = document.getElementById('notificationAlert'); box.className = `fixed top-4 left-1/2 -translate-x-1/2 w-11/12 max-w-sm z-[99999] p-4 rounded-2xl bg-white border text-xs font-black uppercase flex items-center gap-2 shadow-md ${type==='sukses'?'text-emerald-600 border-emerald-100':'text-rose-600 border-rose-100'}`;
    document.getElementById('notifIcon').className = `fa-solid ${type==='sukses'?'fa-circle-check':'fa-circle-xmark'}`;
    document.getElementById('notifText').innerText = msg; box.classList.remove('hidden'); setTimeout(() => box.classList.add('hidden'), 3000);
}

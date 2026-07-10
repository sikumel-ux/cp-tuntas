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

window.addEventListener('DOMContentLoaded', () => {
    let sessionTerbaca = JSON.parse(localStorage.getItem("warga_session"));
    if (sessionTerbaca) { redirectSesuaiTipe(sessionTerbaca.tipe); }
});

function toggleTampilanSandi() {
    const inputSandi = document.getElementById('logPassword');
    const ikonMata = document.getElementById('iconMataSandi');
    
    if (inputSandi.type === 'password') {
        inputSandi.type = 'text';
        ikonMata.classList.remove('fa-eye-slash');
        ikonMata.classList.add('fa-eye');
    } else {
        inputSandi.type = 'password';
        ikonMata.classList.remove('fa-eye');
        ikonMata.classList.add('fa-eye-slash');
    }
}

function dapatkanSapaanWaktu() {
    const jam = new Date().getHours();
    if (jam >= 4 && jam < 11) return "Selamat pagi";
    if (jam >= 11 && jam < 15) return "Selamat siang";
    if (jam >= 15 && jam < 18) return "Selamat sore";
    return "Selamat malam";
}

async function prosesLoginSistem(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('logUsername').value.trim();
    const passwordInput = document.getElementById('logPassword').value.trim();
    const loader = document.getElementById('loadingOverlay');

    loader.style.display = 'flex';

    try {
        const res = await fetch(`${DB_URL}/warga_rt04.json`);
        const data = await res.json();
        
        if (!data) {
            showNotif('Data basis warga kosong.', 'gagal'); loader.style.display = 'none'; return;
        }

        let akunDitemukan = null; let keyWarga = null;
        Object.keys(data).forEach(key => {
            if (data[key].username === usernameInput) { akunDitemukan = data[key]; keyWarga = key; }
        });

        if (akunDitemukan) {
            if (akunDitemukan.password === passwordInput) {
                const tipeUser = akunDitemukan.tipe || "Anggota Tetap";
                
                const payloadSesi = {
                    key: keyWarga,
                    nama: akunDitemukan.nama,
                    username: akunDitemukan.username,
                    tipe: tipeUser
                };
                
                localStorage.setItem("warga_session", JSON.stringify(payloadSesi));
                
                const sapaan = dapatkanSapaanWaktu();
                showNotif(`Login berhasil.\n${sapaan} Bpk/Ibu ${akunDitemukan.nama}!`, 'sukses');
                
                setTimeout(() => { redirectSesuaiTipe(tipeUser); }, 2500);
            } else {
                showNotif('Password Anda Salah!', 'gagal'); loader.style.display = 'none';
            }
        } else {
            showNotif('Nomor WhatsApp tidak terdaftar!', 'gagal'); loader.style.display = 'none';
        }
    } catch (error) {
        showNotif('Gagal terhubung ke server.', 'gagal'); loader.style.display = 'none';
    }
}

function redirectSesuaiTipe(tipe) {
    if (tipe === "PON") { window.location.href = "../pone/"; } 
    else { window.location.href = "../tetap/"; }
}

... (Fungsi showNotif di bawah diringkas agar hemat tempat, isinya tetap sama) ...

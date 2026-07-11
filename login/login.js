const DB_URL = "https://tuntas-04-default-rtdb.asia-southeast1.firebasedatabase.app";

if (localStorage.getItem("warga_session")) {
    window.location.href = "../"; 
}

function toggleLihatPassword() {
    const inputPass = document.getElementById('txtPassword');
    const iconMata = document.getElementById('iconMata');
    if (inputPass.type === "password") {
        inputPass.type = "text";
        iconMata.className = "fa-solid fa-eye-slash";
    } else {
        inputPass.type = "password";
        iconMata.className = "fa-solid fa-eye";
    }
}

async function prosesLoginWarga(e) {
    e.preventDefault();
    
    const usernameInput = document.getElementById('txtUsername').value.trim();
    const passwordInput = document.getElementById('txtPassword').value.trim();
    const overlay = document.getElementById('loadingOverlay');

    overlay.classList.remove('hidden');

    try {
        const res = await fetch(`${DB_URL}/warga_rt04.json`);
        const dataWarga = await res.json();

        if (!dataWarga) {
            showNotif("Sistem basis data kosong!", "gagal");
            overlay.classList.add('hidden');
            return;
        }

        let userDitemukan = null;
        let userKey = null;

        Object.keys(dataWarga).forEach(key => {
            if (dataWarga[key].username === usernameInput) {
                userDitemukan = dataWarga[key];
                userKey = key;
            }
        });

        if (userDitemukan) {
            if (userDitemukan.password === passwordInput) {
                const sessionData = {
                    key: userKey,
                    username: userDitemukan.username,
                    nama: userDitemukan.nama,
                    tipe: userDitemukan.tipe || 'tetap'
                };

                localStorage.setItem("warga_session", JSON.stringify(sessionData));
                showNotif("Login Sukses! Mengalihkan...", "sukses");
                
                setTimeout(() => {
                    window.location.href = "../"; 
                }, 1200);

            } else {
                showNotif("Sandi Akun Salah!", "gagal");
                overlay.classList.add('hidden');
            }
        } else {
            showNotif("Akun Tidak Terdaftar!", "gagal");
            overlay.classList.add('hidden');
        }

    } catch (err) {
        console.error(err);
        showNotif("Gagal terhubung ke server!", "gagal");
        overlay.classList.add('hidden');
    }
}

function showNotif(msg, type) {
    const box = document.getElementById('notificationAlert');
    box.className = `fixed top-4 left-1/2 -translate-x-1/2 w-11/12 max-w-sm z-[99999] p-4 rounded-2xl bg-white border text-xs font-black uppercase flex items-center gap-2 shadow-md ${type==='sukses'?'text-emerald-600 border-emerald-100':'text-rose-600 border-rose-100'}`;
    document.getElementById('notifIcon').className = `fa-solid ${type==='sukses'?'fa-circle-check':'fa-circle-xmark'}`;
    document.getElementById('notifText').innerText = msg;
    box.classList.remove('hidden');
    setTimeout(() => box.classList.add('hidden'), 3000);
}

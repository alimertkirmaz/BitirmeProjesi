// logout.js - Hem modüler hem de compat API'yi destekleyen çıkış işlemi

document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            console.log('Çıkış yapılıyor...');
            
            try {
                // Önce global Firebase API'yi kontrol et (compat)
                if (typeof firebase !== 'undefined' && firebase.auth) {
                    console.log('Compat API ile çıkış yapılıyor');
                    await firebase.auth().signOut();
                } 
                // Modüler API'yi dene
                else {
                    console.log('Modüler API ile çıkış yapılıyor');
                    // Modüler API'yi dinamik olarak import et
                    const authModule = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
                    const appModule = await import("./firebase-config.js");
                    const auth = authModule.getAuth(appModule.app);
                    await authModule.signOut(auth);
                }
                
                console.log('Çıkış başarılı!');
                
                // Tarayıcı önbelleğini temizle
                localStorage.clear();
                sessionStorage.clear();
                
                // Çıkış sonrası login sayfasına yönlendir
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Çıkış hatası:', error);
                alert('Çıkış yapılırken bir hata oluştu: ' + error.message);
            }
        });
    }
});

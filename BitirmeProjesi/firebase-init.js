// Firebase uyumlu (compat) versiyonu için yapılandırma
const firebaseConfig = {
  apiKey: "AIzaSyCYRT1tz8QMog2Vd9oC-rA3Fne6AADKOQ0",
  authDomain: "bitirmeprojesi-de1e8.firebaseapp.com",
  projectId: "bitirmeprojesi-de1e8",
  storageBucket: "bitirmeprojesi-de1e8.firebasestorage.app",
  messagingSenderId: "578825018900",
  appId: "1:578825018900:web:b2fb992ecb7a7bc301d101"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);

// Kullanıcı giriş durumunu kontrol et
firebase.auth().onAuthStateChanged(function(user) {
  // Yükleniyor ekranını gizle
  const loadingElement = document.getElementById('auth-loading');
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }
  
  // Kullanıcı adını göster
  if (user) {
    const customerNameElement = document.getElementById('customerName');
    if (customerNameElement) {
      // Firestore'dan kullanıcı bilgilerini al
      firebase.firestore().collection('users').doc(user.uid).get()
        .then(doc => {
          if (doc.exists && doc.data().firstName && doc.data().lastName) {
            customerNameElement.textContent = `${doc.data().firstName} ${doc.data().lastName}`;
          } else {
            customerNameElement.textContent = user.email.split('@')[0];
          }
        })
        .catch(error => {
          // Kullanıcı bilgileri alınamadı
          customerNameElement.textContent = user.email.split('@')[0];
        });
    }
    
    // Sayfa içeriğini göster
    Array.from(document.body.children).forEach(el => {
      if (el.id !== 'auth-loading') {
        el.style.display = '';
      }
    });
  } else {
    // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
    window.location.href = 'login.html';
  }
});

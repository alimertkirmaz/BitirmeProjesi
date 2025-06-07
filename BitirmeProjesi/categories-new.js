// categories.js - Kategori sayfası için JavaScript kodu

// Global değişkenler
let db = null;
let auth = null;
let currentUser = null;

// Firebase yapılandırması
const firebaseConfig = {
    apiKey: "AIzaSYCYRT1tz8QMog2Vd9oC-rA3Fne6AADKOQ0",
    authDomain: "bitirmeprojesi-de1e8.firebaseapp.com",
    projectId: "bitirmeprojesi-de1e8",
    storageBucket: "bitirmeprojesi-de1e8.firebasestorage.app",
    messagingSenderId: "578825018900",
    appId: "1:578825018900:web:b2fb992ecb7a7bc301d101"
};

// Sayfa yüklendiğinde çalışacak kod
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Yükleniyor ekranını göster
        const loadingElement = document.getElementById('auth-loading');
        if (loadingElement) loadingElement.style.display = 'flex';
        
        // Firebase başlatma işlemi
        const firebaseInitialized = await initializeFirebase();
        if (!firebaseInitialized) {
            throw new Error('Firebase başlatılamadı');
        }

        // Auth durumunu dinle
        if (auth) {
            auth.onAuthStateChanged((user) => {
                currentUser = user;
                console.log('Auth durumu değişti:', user ? 'Kullanıcı var' : 'Kullanıcı yok');
                updateAuthUI();
                
                // Kullanıcı giriş yapmışsa sepeti yükle
                if (user) {
                    loadCart();
                }
            });
        }
        
        // Ürünleri yükle
        await loadProducts();
        
        // Yükleniyor ekranını gizle
        if (loadingElement) loadingElement.style.display = 'none';
        
    } catch (error) {
        console.error('Başlatma hatası:', error);
        const loadingElement = document.getElementById('auth-loading');
        if (loadingElement) {
            loadingElement.textContent = 'Bir hata oluştu. Lütfen sayfayı yenileyin.';
        }
    }
});

// Firebase başlatma işlemi
let firebaseInitialized = false;

async function initializeFirebase() {
    try {
        // Firebase modüllerini yükle
        console.log('Firebase modülleri yükleniyor...');
        const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
        const { getFirestore, collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
        const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
        
        // Firebase'i başlat (sadece daha önce başlatılmadıysa)
        let app;
        const apps = getApps();
        
        if (apps.length === 0) {
            app = initializeApp(firebaseConfig);
            console.log('Firebase başlatıldı');
        } else {
            app = apps[0];
            console.log('Mevcut Firebase uygulaması kullanılıyor');
        }
        
        // Firestore ve Auth örneklerini oluştur
        db = getFirestore(app);
        auth = getAuth(app);
        
        // Firestore'un çalışıp çalışmadığını test et
        try {
            const testQuery = await getDocs(collection(db, 'products'));
            console.log('Firestore bağlantısı başarılı');
            firebaseInitialized = true;
            return true;
        } catch (dbError) {
            console.error('Firestore bağlantı hatası:', dbError);
            return false;
        }
        
    } catch (error) {
        console.error('Firebase başlatma hatası:', error);
        firebaseInitialized = false;
        return false;
    }
}

// Kullanıcı arayüzünü güncelle
function updateAuthUI() {
    // Kullanıcı giriş durumuna göre UI güncelleme işlemleri
    console.log('UI güncellendi, kullanıcı:', currentUser ? 'Giriş yapmış' : 'Misafir');
}

// Sepeti yükle
function loadCart() {
    if (!currentUser) return;
    console.log('Sepet yükleniyor...');
    // Sepet yükleme işlemleri
}

// Ürünleri yükle
async function loadProducts() {
    if (!firebaseInitialized) {
        console.error('Firebase başlatılmadı');
        return;
    }
    
    try {
        const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
        const querySnapshot = await getDocs(collection(db, "products"));
        const allProducts = [];
        const productsByCategory = {};
        
        // Tüm ürünleri al ve kategorilere göre grupla
        querySnapshot.forEach((doc) => {
            const product = { id: doc.id, ...doc.data() };
            allProducts.push(product);
            
            // Kategoriye göre grupla
            if (product.category) {
                if (!productsByCategory[product.category]) {
                    productsByCategory[product.category] = [];
                }
                productsByCategory[product.category].push(product);
            }
        });

        // Kategori isimleri eşleştirmesi
        const categoryNames = {
            'bilgisayar': 'Bilgisayar',
            'bilgisayar-bileseni': 'Bilgisayar Bileşeni',
            'oyuncu-ekipmani': 'Oyuncu Ekipmanı',
            'kamera': 'Kamera',
            'yazici': 'Yazıcı',
            'arac-ekipmani': 'Araç Ekipmanı',
            'akilli-telefon': 'Akıllı Telefon',
            'tablet': 'Tablet',
            'giyilebilir-teknoloji': 'Giyilebilir Teknoloji',
            'ev-elektronigi': 'Ev Elektroniği',
            'ev-sinema-ses': 'Ev Sinema ve Ses Sistemi',
            'beyaz-esya': 'Beyaz Eşya'
        };

        // URL'den kategori parametresini al
        const urlParams = new URLSearchParams(window.location.search);
        const selectedCategory = urlParams.get('category');

        // Sayfa yenilemeden URL'yi güncelle
        function updateURL(category) {
            const newURL = `${window.location.pathname}?category=${category}`;
            window.history.pushState({ category }, '', newURL);
        }

        // Kategoriye göre ürünleri göster
        function displayProducts(category) {
            // Başlığı güncelle
            const categoryTitle = document.getElementById('categoryTitle');
            if (categoryTitle) {
                categoryTitle.textContent = categoryNames[category] || 'Kategoriler';
            }
            
            // Tüm butonlardan aktif durumunu kaldır
            const categoryButtons = document.querySelectorAll('.category-btn');
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            
            // Seçili kategori butonuna aktif sınıfını ekle
            const activeButton = document.querySelector(`[data-category="${category}"]`);
            if (activeButton) {
                activeButton.classList.add('active');
            }

            // Mevcut içeriği temizle
            const categoryContent = document.querySelector('.category-content');
            if (!categoryContent) return;
            
            categoryContent.innerHTML = '';

            // Kategoriye ait ürünleri al
            const categoryProducts = productsByCategory[category] || [];

            if (!categoryProducts || categoryProducts.length === 0) {
                categoryContent.innerHTML = '<p>Bu kategoride henüz ürün bulunmamaktadır.</p>';
                return;
            }

            // Ürünleri göster
            categoryProducts.forEach(product => {
                // Stok kontrolü
                if (!product.variants || product.variants.length === 0) {
                    if (!product.stock || product.stock === 0) {
                        return; // Stok yoksa bu ürünü atla
                    }
                } else if (product.stock && typeof product.stock === 'object') {
                    const allZero = Object.values(product.stock).every(val => !val || val === 0);
                    if (allZero) return; // Hiç stok yoksa bu ürünü atla
                }
                
                // Ürün kartını oluştur
                const productCard = document.createElement('div');
                productCard.className = 'product-card';
                productCard.setAttribute('data-product-id', product.id);
                
                // Favori durumunu kontrol et
                let isFavorited = false;
                if (currentUser) {
                    // Burada kullanıcının favorilerini kontrol et
                    // Örnek: isFavorited = userFavorites.includes(product.id);
                }
                
                // Ürün içeriği
                productCard.innerHTML = `
                    <div class="product-image" style="position:relative;">
                        <span class="favorite-star${isFavorited ? ' favorited' : ''}" 
                              data-product-id="${product.id}" 
                              title="Favorilere ekle/çıkar" 
                              style="position:absolute;top:8px;right:8px;cursor:pointer;font-size:1.6rem;z-index:2;">
                            <i class="fa${isFavorited ? 's' : 'r'} fa-star"></i>
                        </span>
                        <img style="border:none;" 
                             src="${product.image || (product.images && product.images[0] ? product.images[0] : '')}" 
                             alt="${product.name || 'Ürün Resmi'}" 
                             class="product-card-image">
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${product.name || 'İsimsiz Ürün'}</h3>
                        <p class="product-short-description" style="font-size: 1rem; color: #888; margin-bottom: 8px;">
                            ${product.description || ''}
                        </p>
                        <p class="product-price">${
                            typeof product.price === 'object'
                                ? (() => {
                                    // Sadece stoğu 0'dan büyük olan varyantların fiyatları
                                    const validPrices = product.stock && typeof product.stock === 'object'
                                        ? Object.keys(product.price)
                                            .filter(key => product.stock[key] > 0)
                                            .map(key => product.price[key])
                                            .filter(p => typeof p === 'number')
                                        : [];
                                    
                                    if (validPrices.length > 0) {
                                        return (Math.min(...validPrices)).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' TL*';
                                    } else {
                                        return 'Varyantlı';
                                    }
                                })()
                                : (product.price ? `${parseFloat(product.price).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2})} TL` : 'Fiyat Bilgisi Yok')
                        }</p>
                        <button class="btn-add-cart" data-product-id="${product.id}">Ürünü İncele</button>
                    </div>
                `;
                
                // Ürün kartına tıklama event'i
                productCard.addEventListener('click', function(e) {
                    if (!e.target.classList.contains('favorite-star') && !e.target.classList.contains('fa-star')) {
                        // Hangi sayfada olduğumuzu kontrol et
                        const isCustomerPage = document.querySelector('header .customer-dropdown') !== null;
                        const targetPage = isCustomerPage ? 'customer-product-page.html' : 'product-page.html';
                        window.location.href = `${targetPage}?id=${product.id}`;
                    }
                });
                
                // Favori yıldızına tıklama olayı artık favorites.js'de yönetiliyor
                
                // Ürün kartına tıklama olayını ekle
                productCard.addEventListener('click', function(e) {
                    // Eğer tıklanan öğe favori yıldızı veya yıldız ikonu değilse
                    if (!e.target.closest('.favorite-star') && !e.target.classList.contains('fa-star')) {
                        const isCustomerPage = document.querySelector('header .customer-dropdown') !== null;
                        const targetPage = isCustomerPage ? 'customer-product-page.html' : 'product-page.html';
                        window.location.href = `${targetPage}?id=${product.id}`;
                    }
                });
                
                // Ürünü incele butonuna tıklama olayını ekle
                const btnAddCart = productCard.querySelector('.btn-add-cart');
                if (btnAddCart) {
                    btnAddCart.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const productId = product.id;
                        const isCustomerPage = document.querySelector('header .customer-dropdown') !== null;
                        const targetPage = isCustomerPage ? 'customer-product-page.html' : 'product-page.html';
                        
                        // Ürün detay sayfasına yönlendir
                        window.location.href = `${targetPage}?category=${encodeURIComponent(category)}&productId=${encodeURIComponent(String(productId))}`;
                    });
                }
                
                // Ürün kartını içeriğe ekle
                categoryContent.appendChild(productCard);
            });
        }

        // Kategori butonlarına tıklama eventlerini ekle
        const categoryButtons = document.querySelectorAll('.category-btn');
        if (categoryButtons && categoryButtons.length > 0) {
            categoryButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const category = button.dataset.category;
                    if (category) {
                        updateURL(category);
                        displayProducts(category);
                    }
                });
            });
        }

        // URL'de kategori varsa onu göster, yoksa ilk kategoriyi göster
        if (selectedCategory && productsByCategory[selectedCategory]) {
            displayProducts(selectedCategory);
        } else {
            const firstCategory = Object.keys(productsByCategory)[0];
            if (firstCategory) {
                updateURL(firstCategory);
                displayProducts(firstCategory);
            }
        }
        
    } catch (error) {
        console.error('Ürünler yüklenirken hata oluştu:', error);
        const categoryContent = document.querySelector('.category-content');
        if (categoryContent) {
            categoryContent.innerHTML = '<p>Ürünler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.</p>';
        }
    }
}

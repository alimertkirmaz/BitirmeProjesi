// Favoriler yönetimi - Firebase Firestore tabanlı
// Firestore'da 'favorites' koleksiyonu altında kullanıcı ID'si ile belge tutulur
// Her belge, kullanıcının favori ürünlerinin ID'lerini içerir

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs, setDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app, db } from "./firebase-config.js";

console.log('favorites.js (modüler) yükleniyor...');

const auth = getAuth(app);

// Favorileri Firestore'dan alma ve yıldız ikonlarını güncelleme
async function initFavorites() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log('FAVORITES.JS: Kullanıcı oturum açmış:', user.uid);
                try {
                    // Kullanıcının favorilerini Firestore'dan al
                    const favoritesRef = doc(db, 'favorites', user.uid);
                    const favoritesDoc = await getDoc(favoritesRef);
                    
                    let favorites = [];
                    if (favoritesDoc.exists()) {
                        favorites = favoritesDoc.data().productIds || [];
                        console.log('FAVORITES.JS: Firestore\'dan favoriler alındı:', favorites);
                        console.log('FAVORITES.JS: Favori sayısı:', favorites.length);
                    } else {
                        // Kullanıcının favorileri yoksa, boş bir belge oluştur
                        await setDoc(favoritesRef, {
                            productIds: [],
                            updatedAt: serverTimestamp()
                        });
                        console.log('Kullanıcı için yeni favoriler belgesi oluşturuldu');
                    }
                    
                    // Yıldız ikonlarını güncelle
                    updateFavoriteStars(favorites);
                    resolve(favorites);
                } catch (error) {
                    console.error('Favoriler alınırken hata:', error);
                    resolve([]);
                }
            } else {
                console.log('Kullanıcı oturum açmamış');
                resolve([]);
            }
        });
    });
}

// Yıldız ikonlarını güncelleme
function updateFavoriteStars(favorites) {
    document.querySelectorAll('.product-card').forEach(card => {
        const productId = card.getAttribute('data-product-id');
        if (!productId) return;
        
        let starBtn = card.querySelector('.favorite-star');
        if (!starBtn) return;
        
        // Favori durumuna göre yıldızı güncelle
        if (favorites.includes(productId)) {
            starBtn.classList.add('favorited');
            starBtn.querySelector('i').className = 'fas fa-star';
        } else {
            starBtn.classList.remove('favorited');
            starBtn.querySelector('i').className = 'far fa-star';
        }
        
        // Tıklama olayını ekle
        starBtn.addEventListener('click', async function(e) {
            e.stopPropagation();
            await toggleFavorite(productId);
        });
    });
}

// Favori ekleme/çıkarma işlemi
window.toggleFavorite = async function(productId) {
    const user = auth.currentUser;
    if (!user) {
        console.log('FAVORITES.JS: Favori eklemek için giriş yapmalısınız');
        alert('Favori eklemek için giriş yapmalısınız');
        return;
    }
    
    try {
        console.log('FAVORITES.JS: toggleFavorite çağrıldı, productId:', productId);
        const favoritesRef = doc(db, 'favorites', user.uid);
        const favoritesDoc = await getDoc(favoritesRef);
        
        // Favori durumunu kontrol et
        let favorites = [];
        let docExists = false;
        
        if (favoritesDoc.exists()) {
            docExists = true;
            favorites = favoritesDoc.data().productIds || [];
            console.log('FAVORITES.JS: Mevcut favoriler:', favorites);
        } else {
            console.log('FAVORITES.JS: Favori belgesi bulunamadı, yeni oluşturulacak');
        }
        
        const isFavorited = favorites.includes(productId);
        console.log('FAVORITES.JS: Ürün favori mi?', isFavorited, 'ProductId:', productId);
        
        // Favori durumunu güncelle
        if (isFavorited) {
            // Favorilerden çıkar
            await updateDoc(favoritesRef, {
                productIds: arrayRemove(productId),
                updatedAt: serverTimestamp()
            });
            console.log('FAVORITES.JS: Ürün favorilerden çıkarıldı:', productId);
        } else {
            // Favorilere ekle
            if (!docExists) {
                // Belge yoksa oluştur
                await setDoc(favoritesRef, {
                    productIds: [productId],
                    updatedAt: serverTimestamp()
                });
                console.log('FAVORITES.JS: Yeni favori belgesi oluşturuldu ve ürün eklendi:', productId);
            } else {
                // Belge varsa güncelle
                await updateDoc(favoritesRef, {
                    productIds: arrayUnion(productId),
                    updatedAt: serverTimestamp()
                });
                console.log('FAVORITES.JS: Ürün favorilere eklendi:', productId);
            }
        }
        
        // Yıldız ikonlarını güncelle
        const newFavorites = isFavorited 
            ? favorites.filter(id => id !== productId) 
            : [...favorites, productId];
            
        updateFavoriteStars(newFavorites);
        
        // Favoriler sayfasını güncelle
        if (document.querySelector('#favorites')) {
            renderFavorites();
        }
        
        return !isFavorited; // Yeni favori durumunu döndür
    } catch (error) {
        console.error('Favori durumu güncellenirken hata:', error);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Sayfa yüklenirken favorileri başlat
    await initFavorites();

    // Favoriler sayfasını güncelle
    if (document.querySelector('#favorites')) {
        renderFavorites();
    }
});

// Favorilerim sekmesini dolduracak fonksiyon (customer-section.html için)
async function renderFavorites() {
    console.log('FAVORITES.JS: renderFavorites fonksiyonu çağrıldı');
    const user = auth.currentUser;
    if (!user) {
        console.log('FAVORITES.JS: Favorileri görüntülemek için giriş yapmalısınız');
        const favoritesSection = document.querySelector('#favorites .favorites-list');
        if (favoritesSection) {
            favoritesSection.innerHTML = '<p>Favorilerinizi görüntülemek için giriş yapmalısınız.</p>';
        }
        return;
    }
    
    try {
        console.log('FAVORITES.JS: Kullanıcı oturum açmış, favoriler alınıyor. User ID:', user.uid);
        // Kullanıcının favorilerini Firestore'dan al
        const favoritesRef = doc(db, 'favorites', user.uid);
        const favoritesDoc = await getDoc(favoritesRef);
        
        if (!favoritesDoc.exists()) {
            console.log('FAVORITES.JS: Kullanıcının favorileri bulunamadı');
            const favoritesSection = document.querySelector('#favorites .favorites-list');
            if (favoritesSection) {
                favoritesSection.innerHTML = '<p>Henüz favori ürününüz yok.</p>';
            }
            return;
        }
        
        const favorites = favoritesDoc.data().productIds || [];
        console.log('FAVORITES.JS: Firestore\'dan favoriler alındı:', favorites);
        console.log('FAVORITES.JS: Favori sayısı:', favorites.length);
        
        const favoritesSection = document.querySelector('#favorites .favorites-list');
        if (!favoritesSection) return;
        favoritesSection.innerHTML = '';
        
        // Ürünleri Firestore'dan al
        try {
            console.log('FAVORITES.JS: Favori ürünleri yükleniyor...');
            
            // Tüm ürünleri al
            const querySnapshot = await getDocs(collection(db, 'products'));
            const allProducts = [];
            
            querySnapshot.forEach((doc) => {
                allProducts.push({ id: doc.id, ...doc.data() });
            });
            
            console.log('FAVORITES.JS: Firestore\'dan ürünler alındı:', allProducts.length, 'adet ürün');
            console.log('FAVORITES.JS: Favori ID\'leri:', favorites);
            
            if (allProducts.length === 0) {
                console.error('FAVORITES.JS: Ürünler bulunamadı');
                favoritesSection.innerHTML = '<p>Ürünler yüklenirken bir hata oluştu.</p>';
                return;
            }
            
            let found = false;
            
            // Favori ürünleri göster
            allProducts.forEach(product => {
                console.log('FAVORITES.JS: Ürün kontrol ediliyor:', product.id, 'Favori mi:', favorites.includes(product.id));
                if (favorites.includes(product.id)) {
                    console.log('FAVORITES.JS: Eşleşen favori ürün bulundu:', product.name);
                    found = true;
                    const card = document.createElement('div');
                    card.className = 'product-card';
                    card.innerHTML = `
                        <div class="product-image">
                            <img src="${product.image}" alt="${product.name}">
                        </div>
                        <div style="display:flex;align-items:center;flex:1;gap:32px;padding-left:18px; margin-top:15px">
                            <div style="flex:2;display:flex;flex-direction:column;justify-content:center;">
                                <h3 style="text-align:left;font-size:1.25rem;margin-bottom:0.4rem;">${product.name}</h3>
                                ${product.description ? `<div style=\"text-align:left;font-size:1.05rem;color:#b7b7b7;margin-bottom:0.4rem;\">${product.description}</div>` : ''}
                            </div>
                            <div style="flex:1;text-align:center;align-self:center;font-size:1.35rem;font-weight:700;color:#c9a227;margin-right:80px;">
                                ${typeof product.price === 'object'
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
                                    : (typeof product.price === 'number' ? product.price.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' TL' : product.price || 'Fiyat bilgisi yok')}
                            </div>
                            <div style="flex:1;display:flex;flex-direction:column;gap:8px;align-items:flex-end;padding-right:24px;">
                                <button class="btn btn-goto-product" style="width:200px;">Ürüne Git</button>
                                <button class="btn btn-secondary remove-favorite" style="width:200px;">Favorilerden Çıkar</button>
                            </div>
                        </div>
                    `;
                    
                    // Ürüne Git
                    card.querySelector('.btn-goto-product').addEventListener('click', () => {
                        window.location.href = `customer-product-page.html?product=${product.id}`;
                    });
                    
                    // Favorilerden çıkar
                    card.querySelector('.remove-favorite').addEventListener('click', () => {
                        toggleFavorite(product.id);
                    });
                    
                    favoritesSection.appendChild(card);
                }
            });
            
            if (!found) {
                favoritesSection.innerHTML = `
                    <div class="notification-item" style="text-align: center; padding: 2rem;">
                        <i class="far fa-star" style="font-size: 2rem; color: #c9a227; margin-bottom: 1rem; display: block;"></i>
                        <div>Henüz favori ürününüz yok.</div>
                        <div style="font-size: 0.9rem; color: #999; margin-top: 0.5rem;">Beğendiğiniz ürünlerin yanındaki yıldız işaretine tıklayarak favorilerinize ekleyebilirsiniz.</div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Ürünler yüklenirken hata:', error);
            favoritesSection.innerHTML = '<p>Ürünler yüklenirken bir hata oluştu.</p>';
        }
    } catch (error) {
        console.error('Favoriler görüntülenirken hata:', error);
        const favoritesSection = document.querySelector('#favorites .favorites-list');
        if (favoritesSection) {
            favoritesSection.innerHTML = '<p>Favoriler yüklenirken bir hata oluştu.</p>';
        }
    }

}

// Favori butonlarına tıklama olayını dinle
document.addEventListener('click', async function(e) {
    if (e.target.closest('.favorite-star')) {
        const starBtn = e.target.closest('.favorite-star');
        const productId = starBtn.getAttribute('data-product-id');
        if (productId) {
            await window.toggleFavorite(productId);
        }
    }
});

// Sayfa yüklendiğinde favorileri yükle
document.addEventListener('DOMContentLoaded', async () => {
    await initFavorites();
});
//     }
// });

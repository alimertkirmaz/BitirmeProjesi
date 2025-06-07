// customer-cart.js - Firestore tabanlı sepet fonksiyonları (MODÜLER YAPI)
// Bu dosya tüm müşteri sayfalarında (customer-product-page.html, customer-categories.html vb.) kullanılabilir

// Özel popup fonksiyonu (her sayfada kullanılabilir)
window.showCustomPopup = window.showCustomPopup || function(message, options = {}) {
    return new Promise(resolve => {
        // Eski popup'ı kaldır
        let old = document.getElementById('custom-popup');
        if (old) old.remove();
        // Arka plan kaydırmasını engelle
        document.body.style.overflow = 'hidden';
        // Popup wrapper oluştur
        const popup = document.createElement('div');
        popup.id = 'custom-popup';
        popup.className = 'popup';
        popup.style.display = 'block';
        popup.innerHTML = `
            <div class="popup-content">
                <div class="popup-header">
                    <h3><b>${options.confirm ? 'Onay' : 'Bilgi'}</b></h3>
                    <span class="close-popup">&times;</span>
                </div>
                <div class="popup-body">
                    <p style="margin:0;font-size:1.08rem;color:#fff;">${message}</p>
                </div>
                <div class="popup-footer">
                    ${options.confirm
                        ? `<button id=\"popup-yes\" class=\"popup-btn\">Evet</button>\n<button id=\"popup-no\" class=\"popup-btn popup-btn-secondary\">Hayır</button>`
                        : `<button id=\"popup-ok\" class=\"popup-btn\">Tamam</button>`}
                </div>
            </div>
        `;
        document.body.appendChild(popup);
        // Kapatma işlemleri
        const closePopup = () => {
            popup.remove();
            document.body.style.overflow = '';
            document.onkeydown = null;
        };
        popup.querySelector('.close-popup').onclick = () => { closePopup(); resolve(false); };
        if (options.confirm) {
            document.getElementById('popup-yes').onclick = () => { closePopup(); resolve(true); };
            document.getElementById('popup-no').onclick = () => { closePopup(); resolve(false); };
        } else {
            document.getElementById('popup-ok').onclick = () => { closePopup(); resolve(true); };
        }
        // ESC ile kapatma
        document.onkeydown = function(e) {
            if (e.key === 'Escape') {
                closePopup();
                resolve(false);
                document.onkeydown = null;
            }
        };
    });
};
// Popup CSS'si ekle (bir kere)
if (!document.getElementById('aristocart-popup-style')) {
    const style = document.createElement('style');
    style.id = 'aristocart-popup-style';
    style.textContent = `
    .popup { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); overflow: auto; }
    .popup-content { background-color: #1A1A1A; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 0; width: 380px; max-width: 90%; border-radius: 10px; box-shadow: 0 0 20px rgba(201,162,39,0.4); border: 1px solid #c9a227; }
    .popup-header { padding: 15px 20px; background-color: #000000; border-bottom: 1px solid #c9a227; border-radius: 10px 10px 0 0; display: flex; justify-content: space-between; align-items: center; }
    .popup-header h3 { margin: 0; font-size: 18px; color: #c9a227; font-weight: bold; letter-spacing: 0.5px; font-family: 'Playfair Display', serif; }
    .close-popup { color: #c9a227; font-size: 22px; font-weight: bold; cursor: pointer; transition: color 0.2s; line-height: 1; }
    .close-popup:hover { color: #B08C1E; }
    .popup-body { padding: 20px; color: #ffffff; font-size: 14px; line-height: 1.4; text-align: center; }
    .popup-footer { padding: 15px 20px; background-color: #000000; border-top: 1px solid #c9a227; border-radius: 0 0 10px 10px; display: flex; justify-content: center; gap: 10px; }
    .popup-btn { padding: 8px 18px; border: none; border-radius: 4px; background-color: #c9a227; color: #000000; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 5px rgba(201,162,39,0.3); }
    .popup-btn:hover { background-color: #B08C1E; box-shadow: 0 3px 8px rgba(201,162,39,0.4); }
    .popup-btn-secondary { background: #232323; color: #c9a227; border: 1px solid #c9a227; }
    .popup-btn-secondary:hover { background: #333; color: #fff; }
    `;
    document.head.appendChild(style);
}


// Global olarak erişilebilir sepete ekleme fonksiyonu (customer-product-page.html için)
window.customerAddToCart = async function(product, selectedVariants, quantity) {
    if (!product) {
        alert('Ürün bilgisi bulunamadı!');
        return;
    }
    
    try {
        // Ürün sepete ekleniyor
        const stockWarning = document.getElementById('stock-warning');
        
        // Önceki uyarıyı temizle
        if (stockWarning) {
            stockWarning.style.display = 'none';
            stockWarning.textContent = '';
        }
        
        // Varyant kontrolü - tüm varyantlar seçili mi?
        if (product.variants && product.variants.length > 0) {
            const allVariantsSelected = product.variants.every(variant => 
                selectedVariants[variant.name] !== undefined
            );
            
            if (!allVariantsSelected) {
                // Varyant seçimi yapılmamışsa uyarı göster
                if (stockWarning) {
                    stockWarning.textContent = '*Lütfen tüm varyant seçeneklerini seçiniz.';
                    stockWarning.style.display = 'block';
                }
                return;
            }
        }
        
        // Kullanıcı giriş yapmış mı kontrol et
        let user;
        
        // Önce global Firebase'i kontrol et
        if (typeof firebase !== 'undefined' && firebase.auth) {
            user = firebase.auth().currentUser;
        } 
        // Global Firebase yoksa modüler Firebase'i kullan
        else if (typeof auth !== 'undefined') {
            user = auth.currentUser;
        }
        
        if (!user) {
            alert('Sepete ürün eklemek için lütfen giriş yapın.');
            window.location.href = 'login.html';
            return;
        }
        
        // Stok kontrolü için ürün bilgisini Firestore'dan al
        const db = firebase.firestore();
        const productRef = db.collection('products').doc(product.id);
        const productDoc = await productRef.get();
        
        if (!productDoc.exists) {
            console.error('Ürün bulunamadı:', product.id);
            if (stockWarning) {
                stockWarning.textContent = 'Bu ürün artık mevcut değil.';
                stockWarning.style.display = 'block';
            }
            return;
        }
        
        const productData = productDoc.data();
        
        // Stok kontrolü
        let availableStock = 0;
        
        console.log('Ürün veri yapısı:', product);
        
        // Önce doğrudan ürün nesnesindeki stok bilgisini kullanalım
        if (product.stock) {
            if (typeof product.stock === 'number') {
                availableStock = product.stock;
                console.log('Ürün stok miktarı:', availableStock);
            } else if (typeof product.stock === 'object') {
                // Varyantlı ürün için stok kontrolü
                if (product.variants && product.variants.length > 0) {
                    const variantKey = Object.values(selectedVariants).join('-')
                        .replace(/\s+/g, '-')
                        .toLowerCase();
                    
                    console.log('Aranılan varyant anahtarı:', variantKey);
                    console.log('Mevcut stok anahtarları:', Object.keys(product.stock));
                    
                    if (product.stock[variantKey] !== undefined) {
                        availableStock = product.stock[variantKey];
                        console.log('Tam eşleşme ile stok bulundu:', availableStock);
                    } else {
                        // Stok anahtarlarını kontrol et
                        const stockKeys = Object.keys(product.stock);
                        for (const key of stockKeys) {
                            if (key.toLowerCase() === variantKey.toLowerCase()) {
                                availableStock = product.stock[key];
                                console.log('Normalize edilmiş eşleşme ile stok bulundu:', availableStock);
                                break;
                            }
                        }
                        
                        // Eğer hala stok bulunamadıysa, kısmi eşleşme dene
                        if (availableStock === 0) {
                            for (const key of stockKeys) {
                                // Varyant anahtarlarını parçalara ayırıp kontrol et
                                const keyParts = key.toLowerCase().split('-');
                                const searchParts = variantKey.split('-');
                                
                                // Tüm parçalar eşleşiyor mu kontrol et
                                const allPartsMatch = searchParts.every(part => keyParts.includes(part));
                                
                                if (allPartsMatch) {
                                    availableStock = product.stock[key];
                                    console.log('Kısmi eşleşme ile stok bulundu:', availableStock, 'Anahtar:', key);
                                    break;
                                }
                            }
                        }
                    }
                } else {
                    // Varyantsız ürün için obje stok değeri
                    const stockValues = Object.values(product.stock);
                    if (stockValues.length > 0) {
                        availableStock = stockValues[0];
                        console.log('Varyantsız ürün için obje stok değeri kullanılıyor:', availableStock);
                    }
                }
            }
        }
        
        // Firestore'dan alınan ürün verilerini de kontrol et (yedek olarak)
        if (availableStock === 0 && productData && productData.stock) {
            if (typeof productData.stock === 'number') {
                availableStock = productData.stock;
                console.log('Firestore ürün stok miktarı:', availableStock);
            } else if (typeof productData.stock === 'object') {
                // Varyantlı ürün için Firestore stok kontrolü
                if (product.variants && product.variants.length > 0) {
                    const variantKey = Object.values(selectedVariants).join('-')
                        .replace(/\s+/g, '-')
                        .toLowerCase();
                    
                    if (productData.stock[variantKey] !== undefined) {
                        availableStock = productData.stock[variantKey];
                    } else {
                        const stockKeys = Object.keys(productData.stock);
                        for (const key of stockKeys) {
                            if (key.toLowerCase() === variantKey.toLowerCase()) {
                                availableStock = productData.stock[key];
                                break;
                            }
                        }
                    }
                } else {
                    // Varyantsız ürün için Firestore obje stok değeri
                    const stockValues = Object.values(productData.stock);
                    if (stockValues.length > 0) {
                        availableStock = stockValues[0];
                    }
                }
            }
        }
        
        // Eğer stok bilgisi bulunamadıysa varsayılan değer kullan
        if (availableStock === 0) {
            availableStock = 10; // Varsayılan stok miktarı
            console.log('Stok bilgisi bulunamadı, varsayılan değer kullanılıyor:', availableStock);
        }
        
        console.log('Stok kontrolü - Mevcut stok:', availableStock);
        
        // Sepetteki mevcut miktarı kontrol et
        const cartRef = db.collection('carts').doc(user.uid);
        const cartDoc = await cartRef.get();
        let currentQuantityInCart = 0;
        
        if (cartDoc.exists) {
            const cartData = cartDoc.data();
            const items = cartData.items || [];
            
            // Aynı ürün ve varyant kombinasyonu var mı kontrol et
            const existingItem = items.find(item => {
                if (item.productId !== product.id) return false;
                
                // Varyant karşılaştırma
                const itemVariants = item.variants || {};
                const currentVariants = selectedVariants || {};
                
                // Varyant sayısı aynı değilse farklı ürün olarak kabul et
                if (Object.keys(itemVariants).length !== Object.keys(currentVariants).length) {
                    return false;
                }
                
                // Tüm varyantlar aynı mı kontrol et
                for (const key in itemVariants) {
                    if (itemVariants[key] !== currentVariants[key]) {
                        return false;
                    }
                }
                
                return true;
            });
            
            if (existingItem) {
                currentQuantityInCart = existingItem.quantity;
            }
        }
        
        // Toplam istenen miktar
        const totalRequestedQuantity = currentQuantityInCart + quantity;
        
        // Stok kontrolü - daha detaylı log ekleyelim
        console.log('Stok durumu - İstenen:', totalRequestedQuantity, 'Mevcut:', availableStock);
        console.log('Varyant bilgisi:', selectedVariants);
        console.log('Sepetteki miktar:', currentQuantityInCart);
        
        // Yetersiz stok kontrolü
        if (availableStock < totalRequestedQuantity) {
            console.warn('Yetersiz stok! İstenen toplam:', totalRequestedQuantity, 'Mevcut:', availableStock);
            if (stockWarning) {
                if (currentQuantityInCart > 0) {
                    stockWarning.textContent = `Üzgünüz, bu üründen sepetinizde zaten ${currentQuantityInCart} adet var. Toplam ${availableStock} adet sipariş verebilirsiniz.`;
                } else {
                    stockWarning.textContent = `Üzgünüz, bu üründen sadece ${availableStock} adet stok kalmıştır.`;
                }
                stockWarning.style.display = 'block';
            }
            return;
        }
        
        // Varyant görselini al
        let variantImage = null;
        if (product.variantImages && Object.keys(selectedVariants).length > 0) {
            // Varyant anahtarını oluştur
            const variantKey = Object.values(selectedVariants).join('-')
                .replace(/\s+/g, '-')  // Boşlukları tire ile değiştir
                .toLowerCase();          // Küçük harfe çevir (tutarlılık için)
            
            // Varyant görseli varsa kullan
            if (product.variantImages[variantKey]) {
                variantImage = product.variantImages[variantKey];
            }
        }
        
        // Ürün fiyatını doğru şekilde hesapla
        let currentPrice = product.price;
        if (typeof window.getCurrentPrice === 'function') {
            currentPrice = window.getCurrentPrice();
        }
        
        // Firestore'a kaydetmek için ürün öğesini oluştur
        const cartItem = {
            productId: product.id,
            name: product.name,
            price: currentPrice,
            quantity: quantity,
            image: variantImage || product.image || (product.images && product.images.length > 0 ? product.images[0] : null),
            variants: Object.assign({}, selectedVariants),
            variantImage: variantImage,
            priceType: typeof product.price,
            originalPrice: typeof product.price === 'string' ? product.price : null,
            addedAt: new Date().toISOString()
        };
        
        if (cartDoc.exists) {
            // Sepet varsa güncelle
            const cartData = cartDoc.data();
            const items = cartData.items || [];
            
            // Aynı ürün ve varyant kombinasyonu var mı kontrol et
            const existingItemIndex = items.findIndex(item => {
                if (item.productId !== product.id) return false;
                
                // Varyant karşılaştırma
                const itemVariants = item.variants || {};
                const currentVariants = selectedVariants || {};
                
                // Varyant sayısı aynı değilse farklı ürün olarak kabul et
                if (Object.keys(itemVariants).length !== Object.keys(currentVariants).length) {
                    return false;
                }
                
                // Tüm varyantlar aynı mı kontrol et
                for (const key in itemVariants) {
                    if (itemVariants[key] !== currentVariants[key]) {
                        return false;
                    }
                }
                
                return true;
            });
            
            // Sepet içeriğini güncellemeden önce stok kontrolü yapalım
            // Bu kontrol, sepette zaten olan ürünler için de doğru çalışacak
            
            // Mevcut sepet miktarını tekrar kontrol edelim
            let currentCartQuantity = 0;
            
            // Sepette aynı ürün ve varyant var mı kontrol et
            const existingItem = items.find(item => {
                // Ürün ID'si eşleşmiyorsa farklı üründür
                if (item.productId !== product.id) return false;
                
                // Varyant karşılaştırma
                const itemVariants = item.variants || {};
                const currentVariants = selectedVariants || {};
                
                // Varyant sayısı aynı değilse farklı ürün olarak kabul et
                if (Object.keys(itemVariants).length !== Object.keys(currentVariants).length) {
                    return false;
                }
                
                // Tüm varyantlar aynı mı kontrol et
                for (const key in itemVariants) {
                    if (itemVariants[key] !== currentVariants[key]) {
                        return false;
                    }
                }
                
                return true;
            });
            
            // Eğer aynı ürün ve varyant sepette varsa, mevcut miktarı al
            if (existingItem) {
                currentCartQuantity = existingItem.quantity;
                console.log('Sepette bulunan aynı ürün ve varyant miktarı:', currentCartQuantity);
            }
            
            // Toplam istenen miktarı hesapla
            const totalRequestedQuantity = currentCartQuantity + quantity;
            
            // Stok kontrolü yap
            console.log('Sepet güncelleme öncesi stok kontrolü - Mevcut sepet:', currentCartQuantity, 'Eklenecek:', quantity, 'Toplam:', totalRequestedQuantity, 'Stok:', availableStock);
            
            if (availableStock < totalRequestedQuantity) {
                // Stok yetersizse uyarı göster
                console.warn('Yetersiz stok! İstenen toplam:', totalRequestedQuantity, 'Mevcut:', availableStock);
                if (stockWarning) {
                    if (currentCartQuantity > 0) {
                        stockWarning.textContent = `Üzgünüz, bu üründen sepetinizde zaten ${currentCartQuantity} adet var. Toplam ${availableStock} adet sipariş verebilirsiniz.`;
                    } else {
                        stockWarning.textContent = `Üzgünüz, bu üründen sadece ${availableStock} adet stok kalmıştır.`;
                    }
                    stockWarning.style.display = 'block';
                }
                throw new Error('Yetersiz stok');
            }
            
            // Stok yeterliyse sepeti güncelle
            if (existingItemIndex !== -1) {
                // Aynı ürün ve varyant kombinasyonu varsa miktarı güncelle
                items[existingItemIndex].quantity = totalRequestedQuantity;
                console.log('Sepetteki ürün miktarı güncellendi:', totalRequestedQuantity);
            } else {
                // Yeni ürün ekle
                items.push(cartItem);
                console.log('Sepete yeni ürün eklendi:', cartItem);
            }
            
            // Sepeti güncelle
            await cartRef.update({
                items: items,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Sepet yoksa yeni oluştur
            await cartRef.set({
                userId: user.uid,
                items: [cartItem],
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Sepet sayacını güncelle
        updateCartCount();
        
        // Sepet yan menüsünü aç
        toggleCart();
        
        console.log('Ürün sepete eklendi (Firestore)');
    } catch (error) {
        console.error('Sepete eklerken hata oluştu:', error);
        
        // Eğer hata 'Yetersiz stok' hatası değilse kullanıcıya genel hata mesajı göster
        if (!error.message.includes('Yetersiz stok')) {
            alert('Sepete eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
        }
        // Yetersiz stok hatası için zaten stockWarning ile uyarı gösteriliyor
    }
};

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app, db } from "./firebase-config.js";

console.log('customer-cart.js (modüler) yükleniyor...');

const auth = getAuth(app);
// db zaten firebase-config.js'den geliyor

// Sepet menüsünü aç/kapat
function toggleCart() {
    console.log('Sepet menüsü açılıyor...');
    const cartSidebar = document.querySelector('.cart-sidebar');
    const cartOverlay = document.querySelector('.cart-overlay');
    
    if (cartSidebar && cartOverlay) {
        cartSidebar.classList.toggle('active'); // CSS'te 'active' sınıfı kullanılıyor
        cartOverlay.classList.toggle('active'); // CSS'te 'active' sınıfı kullanılıyor
        
        // Eğer sepet açılıyorsa içeriğini güncelle
        if (cartSidebar.classList.contains('active')) { // CSS'te 'active' sınıfı kullanılıyor
            try {
                // Sepet içeriğini güncelle
                updateCartUI();
            } catch (error) {
                console.error('Sepet güncellenirken hata:', error);
                // Hata durumunda boş sepet göster
                const cartItemsContainer = document.querySelector('.cart-items');
                if (cartItemsContainer) {
                    cartItemsContainer.innerHTML = '<div class="error-cart">Sepet yüklenirken bir hata oluştu</div>';
                }
            }
        }
    }
}

// Sepeti kapat
function closeCart() {
    try {
        const cartSidebar = document.querySelector('.cart-sidebar');
        const cartOverlay = document.querySelector('.cart-overlay');
        
        if (cartSidebar) cartSidebar.classList.remove('active');
        if (cartOverlay) cartOverlay.classList.remove('active');
    } catch (error) {
        console.error('Sepet kapatılırken hata oluştu:', error);
    }
}

// Stok uyarı popup'ını göster
function showStockWarningPopup(message) {
    // Popup zaten varsa kullan, yoksa oluştur
    let stockPopup = document.getElementById('stock-warning-popup');
    
    if (!stockPopup) {
        // Önce popup stillerini ekle
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            /* Popup Stilleri - AristoCart Tema */
            .popup {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                overflow: auto;
                animation: fadeIn 0.3s;
            }
            
            .popup-content {
                background-color: #1A1A1A;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                padding: 0;
                width: 380px;
                max-width: 90%;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(201, 162, 39, 0.4);
                animation: fadeAndScale 0.3s;
                border: 1px solid #c9a227;
            }
            
            .popup-header {
                padding: 15px 20px;
                background-color: #000000;
                border-bottom: 1px solid #c9a227;
                border-radius: 10px 10px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .popup-header h3 {
                margin: 0;
                font-size: 18px;
                color: #c9a227;
                font-weight: 500;
                letter-spacing: 0.5px;
                font-family: 'Playfair Display', serif;
            }
            
            .close-popup {
                color: #c9a227;
                font-size: 22px;
                font-weight: bold;
                cursor: pointer;
                transition: color 0.2s;
                line-height: 1;
            }
            
            .close-popup:hover {
                color: #B08C1E;
            }
            
            .popup-body {
                padding: 20px;
                color: #ffffff;
                font-size: 14px;
                line-height: 1.4;
                text-align: center;
            }
            
            .popup-footer {
                padding: 15px 20px;
                background-color: #000000;
                border-top: 1px solid #c9a227;
                border-radius: 0 0 10px 10px;
                display: flex;
                justify-content: center;
                gap: 10px;
            }
            
            .popup-btn {
                padding: 8px 18px;
                border: none;
                border-radius: 4px;
                background-color: #c9a227;
                color: #000000;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 2px 5px rgba(201, 162, 39, 0.3);
            }
            
            .popup-btn:hover {
                background-color: #B08C1E;
                box-shadow: 0 3px 8px rgba(201, 162, 39, 0.4);
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes fadeAndScale {
                from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
        `;
        document.head.appendChild(styleElement);
        
        // Popup HTML'ini oluştur
        stockPopup = document.createElement('div');
        stockPopup.id = 'stock-warning-popup';
        stockPopup.className = 'popup';
        stockPopup.innerHTML = `
            <div class="popup-content">
                <div class="popup-header">
                    <h3><strong>Stok Uyarısı</strong></h3>
                    <span class="close-popup">&times;</span>
                </div>
                <div class="popup-body">
                    <p id="stock-warning-message"></p>
                </div>
                <div class="popup-footer">
                    <button id="stock-warning-ok" class="popup-btn">Tamam</button>
                </div>
            </div>
        `;
        document.body.appendChild(stockPopup);
        
        // Popup kapatma olaylarını ekle
        const closeBtn = stockPopup.querySelector('.close-popup');
        const okBtn = stockPopup.querySelector('#stock-warning-ok');
        
        const closePopup = () => {
            stockPopup.style.display = 'none';
        };
        
        if (closeBtn) closeBtn.addEventListener('click', closePopup);
        if (okBtn) okBtn.addEventListener('click', closePopup);
        
        // Popup dışına tıklandığında kapat
        stockPopup.addEventListener('click', (event) => {
            if (event.target === stockPopup) {
                closePopup();
            }
        });
    }
    
    // Mesajı güncelle ve popup'ı göster
    const messageElement = stockPopup.querySelector('#stock-warning-message');
    if (messageElement) messageElement.textContent = message;
    
    stockPopup.style.display = 'block';
}

// Sepet arayüzünü güncelle
async function updateCartUI() {
    console.log("customer-cart.js'den updateCartUI ÇAĞRILDI - Firestore'dan veri çekiliyor");
    
    // Sepet silme işlemi sırasında bu fonksiyonun çağrılmasını önle
    if (window._isRemovingCartItem) {
        console.log('updateCartUI: Ürün silme işlemi devam ediyor, güncelleme atlanıyor');
        return;
    }
    const cartItemsContainer = document.querySelector('.cart-items');
    // Total değişkenini fonksiyonun başında tanımla
    let total = 0;
    
    // Sepet özeti kısmını güncelle
    try {
        updateTotals();
    } catch (error) {
        console.error('Sepet özeti güncellenirken hata:', error);
    }
    
    if (!cartItemsContainer) {
        // Bu sayfada sepet arayüzü yok, sessizce çık
        console.log('Sepet container bulunamadı, çıkılıyor');
        return;
    }
    
    // Sayfa yüklenirken sepet içeriğini temizleme, bu sorunlara yol açabilir
    // cartItemsContainer.innerHTML = '';
    
    try {
        // Yükleme durumunu göster
        const loadingOverlay = document.querySelector('.cart-loading-overlay');
        if (!loadingOverlay) {
            // Yükleme overlay'i yoksa oluştur
            const overlay = document.createElement('div');
            overlay.className = 'cart-loading-overlay';
            overlay.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); z-index: 10; display: flex; justify-content: center; align-items: center;';
            overlay.innerHTML = '<div style="background: #1e1e1e; padding: 15px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.5);">Yükleniyor...</div>';
            
            const cartContainer = document.querySelector('.cart-container');
            if (cartContainer) {
                cartContainer.style.position = 'relative';
                cartContainer.appendChild(overlay);
            }
        } else {
            loadingOverlay.style.display = 'flex';
        }
        
        // Önceki sepet içeriğini sakla, ancak temizleme
        const previousItems = Array.from(cartItemsContainer.children);
        const previousItemsMap = new Map();
        
        // Önceki ürünleri bir Map'e ekle (productId-variants anahtarı ile)
        previousItems.forEach(itemEl => {
            if (itemEl.dataset.id) {
                const key = itemEl.dataset.id + '-' + (itemEl.dataset.variants || '');
                previousItemsMap.set(key, itemEl);
            }
        });
        
        // Sepet içeriğini temizleme, yükleme sırasında mevcut ürünleri göstermeye devam et
        
        // Global Firebase'i kullan - ÖNEMLİ: Modüler Firebase'e güvenme
        let user = null;
        
        // Önce global Firebase'i dene
        try {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                user = firebase.auth().currentUser;
                console.log('Global Firebase kullanıcısı:', user ? user.email : 'Bulunamadı');
            }
        } catch (error) {
            console.error('Global Firebase kontrolü sırasında hata:', error);
        }
        
        // Eğer global Firebase'den kullanıcı bulunamazsa, modüler Firebase'i dene
        if (!user) {
            try {
                const auth = getAuth();
                user = auth.currentUser;
                console.log('Modüler Firebase kullanıcısı:', user ? user.email : 'Bulunamadı');
            } catch (e) {
                console.log('Modüler Firebase hatası:', e);
            }
        }
        
        // Kullanıcı hala bulunamadıysa, boş sepet göster
        if (!user) {
            console.log('Hiçbir kullanıcı bulunamadı, boş sepet gösteriliyor');
            cartItemsContainer.innerHTML = '<p class="empty-cart">Sepetinizde ürün bulunmamaktadır.</p>';
            if (document.querySelector('.total-amount')) {
                document.querySelector('.total-amount').textContent = '0,00 TL';
            }
            
            // Yükleme overlay'ini gizle
            const loadingOverlay = document.querySelector('.cart-loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            return;
        }
        
        console.log('Aktif kullanıcı bulundu:', user.uid);
        
        // Kullanıcının sepetini al (global veya modüler Firebase kullan)
        let cartSnap;
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                // Global Firebase kullan
                const cartRef = firebase.firestore().collection('carts').doc(user.uid);
                console.log('Sepet referansı (global):', user.uid);
                cartSnap = await cartRef.get();
            } else {
                // Modüler Firebase kullan
                const cartRef = doc(db, 'carts', user.uid);
                console.log('Sepet referansı (modüler):', user.uid);
                cartSnap = await getDoc(cartRef);
            }
        } catch (error) {
            console.error('Sepet verisi alınırken hata:', error);
            cartItemsContainer.innerHTML = '<p class="error-cart">Sepet verisi alınırken hata oluştu</p>';
            
            // Hata durumunda yükleme overlay'ini gizle
            const loadingOverlay = document.querySelector('.cart-loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            return;
        }
        // Global ve modüler Firebase için exists kontrolü
        const cartExists = typeof firebase !== 'undefined' && firebase.firestore ? cartSnap.exists : cartSnap.exists();
        console.log('Sepet verisi var mı:', cartExists);
        
        // Sepet verisi yoksa boş sepet göster
        if (!cartExists) {
            console.log('Sepet belgesi bulunamadı');
            cartItemsContainer.innerHTML = '<p class="empty-cart">Sepetinizde ürün bulunmamaktadır.</p>';
            if (document.querySelector('.total-amount')) {
                document.querySelector('.total-amount').textContent = formatPrice(0);
            }
            
            // Sepet boş olduğunda yükleme overlay'ini gizle
            const loadingOverlay = document.querySelector('.cart-loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            return;
        }
        
        // Sepet verisi var, içeriği kontrol et
        const cartData = cartSnap.data();
        console.log('Sepet içeriği:', cartData);
        
        // Sepette ürün yoksa boş sepet göster
        if (!cartData.items || cartData.items.length === 0) {
            console.log('Sepet içeriği boş');
            cartItemsContainer.innerHTML = '<p class="empty-cart">Sepetinizde ürün bulunmamaktadır.</p>';
            if (document.querySelector('.total-amount')) {
                document.querySelector('.total-amount').textContent = formatPrice(0);
            }
            
            // Sepet içeriği boş olduğunda yükleme overlay'ini gizle
            const loadingOverlay = document.querySelector('.cart-loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            return;
        }
        
        // Sepette ürün var, devam et
        console.log('Sepette ' + cartData.items.length + ' ürün var');
        // cartData zaten tanımlandı, tekrar tanımlamaya gerek yok
        const cartItems = cartData.items || [];
        
        // Ürün detaylarını almak için promiseler oluştur (global Firebase kullan)
        console.log('Sepetteki ürünler:', cartItems);
        console.log('Ürün ID\'leri:', cartItems.map(item => item.productId));
        
        // Ürün verilerini çek (global veya modüler Firebase kullan)
        let productPromises = [];
        let productDocs = [];
        
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                // Global Firebase kullan
                productPromises = cartItems.map(item => firebase.firestore().collection('products').doc(item.productId).get());
                productDocs = await Promise.all(productPromises);
            } else {
                // Modüler Firebase kullan
                productPromises = cartItems.map(item => getDoc(doc(db, 'products', item.productId)));
                productDocs = await Promise.all(productPromises);
            }
            console.log('Firestore\'dan ürün belgeleri alındı:', productDocs.length);
        } catch (error) {
            console.error('Ürün verileri alınırken hata:', error);
            cartItemsContainer.innerHTML = '<p class="error-cart">Ürün verileri alınırken hata oluştu</p>';
            return;
        }
        
        // Ürün ve varyant görsellerini önceden yükle
        const preloadPromises = [];
        
        // Tüm ürün ve varyant görsellerini belirle ve önceden yükle
        cartItems.forEach((item, index) => {
            const productDoc = productDocs[index];
            // Global ve modüler Firebase için exists kontrolü
            if ((typeof firebase !== 'undefined' && firebase.firestore && !productDoc.exists) || 
                (typeof firebase === 'undefined' && !productDoc.exists())) return;
            
            const productData = productDoc.data();
            
            // Ana ürün görselini önceden yükle
            if (item.image || productData.image) {
                const img = new Image();
                img.src = item.image || productData.image;
                preloadPromises.push(new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve; // Hata olsa bile devam et
                    setTimeout(resolve, 1000); // En fazla 1 saniye bekle
                }));
            }
            
            // Varyant görsellerini önceden yükle
            if (productData.variantImages && item.variants) {
                const variantKey = Object.values(item.variants).join('-');
                if (variantKey && productData.variantImages[variantKey]) {
                    const img = new Image();
                    img.src = productData.variantImages[variantKey];
                    preloadPromises.push(new Promise(resolve => {
                        img.onload = resolve;
                        img.onerror = resolve; // Hata olsa bile devam et
                        setTimeout(resolve, 1000); // En fazla 1 saniye bekle
                    }));
                }
            }
        });
        
        // Görsellerin yüklenmesini bekle (maksimum 1 saniye)
        await Promise.all(preloadPromises);
        
        // Sepet içeriğini güncelle
        total = 0; // Değişken zaten tanımlandı, sadece sıfırla
        
        // Önceki sepet içeriğini temizle
        cartItemsContainer.innerHTML = '';
                // Ürünleri ekle
        await Promise.all(cartItems.map(async (item, index) => {
            const productDoc = productDocs[index];
            // Global veya modüler Firebase için exists kontrolü
            const productExists = typeof productDoc.exists === 'function' ? productDoc.exists() : productDoc.exists;
            console.log(`Ürün ${index} belge durumu:`, productExists ? 'Var' : 'Yok');
            
            if (!productExists) {
                console.error(`Ürün bulunamadı: ${item.productId}`);
                return;
            }
            
            const productData = productDoc.data();
            console.log(`Ürün ${index} verileri:`, productData);
            
            // Ürün fiyatını doğru şekilde hesapla
            let priceNumber = 0;
            
            // Fiyat hesaplama mantığı
            if (typeof productData.price === 'number') {
                // Fiyat doğrudan bir sayıysa
                priceNumber = productData.price;
                console.log(`Ürün ${index} fiyatı (sayı):`, priceNumber);
            } else if (typeof productData.price === 'string') {
                // String fiyat değeri - Firestore'dan gelen veri
                console.log(`Ürün ${index} string fiyat değeri:`, productData.price);
                
                // Fiyat formatını kontrol et (örn: '1299.99 TL' veya '1.299,99 TL')
                if (productData.price.includes('TL')) {
                    // Zaten formatlanmış fiyat, sayıya çevir
                    const numericPrice = parseFloat(productData.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
                    if (!isNaN(numericPrice)) {
                        console.log(`Ürün ${index} formatlanmış fiyat sayıya çevrildi:`, numericPrice);
                        priceNumber = numericPrice;
                    }
                } else {
                    // Sayıya çevirmeyi dene
                    const numericPrice = parseFloat(productData.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
                    if (!isNaN(numericPrice)) {
                        console.log(`Ürün ${index} string fiyat sayıya çevrildi:`, numericPrice);
                        priceNumber = numericPrice;
                    }
                }
            } else if (typeof productData.price === 'object' && item.variants) {
                // Varyantlara göre fiyat
                // Varyant anahtarını tutarlı bir şekilde oluştur
                // Önce ürünün varyant tanımlarını al
                const productVariants = productData.variants || [];
                
                // Varyant anahtarını ürün varyant sırasına göre oluştur
                const variantValues = [];
                if (productVariants.length > 0) {
                    // Ürün varyant sırasına göre değerleri ekle
                    productVariants.forEach(variant => {
                        const variantName = variant.name;
                        if (item.variants[variantName]) {
                            variantValues.push(item.variants[variantName]);
                        }
                    });
                } else {
                    // Ürün varyant tanımı yoksa, mevcut varyant değerlerini kullan
                    Object.values(item.variants).forEach(value => {
                        variantValues.push(value);
                    });
                }
                
                const variantKey = variantValues.join('-');
                console.log(`Ürün ${index} varyant anahtarı (fiyat için):`, variantKey);
                
                if (variantKey && productData.price[variantKey] !== undefined) {
                    priceNumber = productData.price[variantKey];
                    console.log(`Ürün ${index} varyant fiyatı:`, priceNumber);
                } else if (productData.price.default !== undefined) {
                    // Varyant fiyatı bulunamazsa varsayılan fiyatı kullan
                    priceNumber = productData.price.default;
                    console.log(`Ürün ${index} varsayılan fiyatı:`, priceNumber);
                } else {
                    // Herhangi bir fiyat bulunamazsa ilk fiyatı kullan
                    const firstPrice = Object.values(productData.price)[0];
                    priceNumber = typeof firstPrice === 'number' ? firstPrice : 0;
                    console.log(`Ürün ${index} ilk fiyatı:`, priceNumber);
                    console.log(`Ürün ${index} fiyat anahtarları:`, Object.keys(productData.price));
                }
            } else if (item.price) {
                // Sepet öğesinde fiyat varsa onu kullan
                priceNumber = item.price;
                console.log(`Ürün ${index} sepet fiyatı:`, priceNumber);
            }
            
            // Toplam fiyatı hesapla
            const itemTotal = priceNumber * item.quantity;
            console.log(`Ürün ${index} toplamı:`, itemTotal, '(', priceNumber, 'x', item.quantity, ')');
            total += itemTotal;
            
            // Varyant bilgilerini oluştur
            let variantInfo = '';
            
            // Ürünün varyant tanımlarını al
            const productVariants = productData.variants || [];
            
            if (productVariants.length > 0 && item.variants) {
                // Ürün sayfasındaki varyant sırasına göre varyant bilgilerini oluştur
                variantInfo = productVariants
                    .map(variant => {
                        const name = variant.name;
                        const value = item.variants[name];
                        if (value) {
                            return `<span style="color: #c9a227;"><b>${name.charAt(0).toUpperCase() + name.slice(1)}:</b></span> <span style="color: #fff;">${value}</span>`;
                        }
                        return '';
                    })
                    .filter(info => info !== '') // Boş değerleri filtrele
                    .join('<br>');
            } else if (item.variants) {
                // Ürün varyant tanımı yoksa, mevcut varyant değerlerini kullan
                variantInfo = Object.entries(item.variants || {})
                    .map(([name, value]) => `<span style="color: #c9a227;"><b>${name.charAt(0).toUpperCase() + name.slice(1)}:</b></span> <span style="color: #fff;">${value}</span>`)
                    .join('<br>');
            }
            
            // Ürün görselini belirle
            let productImage = item.image || productData.image; // Önce sepet öğesindeki görseli kullan
            
            // Varyant görseli varsa onu kullan
            if (productData.variantImages && item.variants) {
                // Varyant anahtarını tutarlı bir şekilde oluştur
                // Önce ürünün varyant tanımlarını al
                const productVariants = productData.variants || [];
                
                // Varyant anahtarını ürün varyant sırasına göre oluştur
                const variantValues = [];
                if (productVariants.length > 0) {
                    // Ürün varyant sırasına göre değerleri ekle
                    productVariants.forEach(variant => {
                        const variantName = variant.name;
                        if (item.variants[variantName]) {
                            variantValues.push(item.variants[variantName]);
                        }
                    });
                } else {
                    // Ürün varyant tanımı yoksa, mevcut varyant değerlerini kullan
                    Object.values(item.variants).forEach(value => {
                        variantValues.push(value);
                    });
                }
                
                const variantKey = variantValues.join('-');
                console.log(`Ürün ${index} varyant anahtarı (görsel için):`, variantKey);
                
                if (variantKey && productData.variantImages[variantKey]) {
                    productImage = productData.variantImages[variantKey];
                    console.log(`Ürün ${index} varyant görseli bulundu:`, productImage);
                } else {
                    console.log(`Ürün ${index} varyant görseli bulunamadı. Mevcut görseller:`, Object.keys(productData.variantImages));
                }
            }
            
            // Sepet öğesi div'ini oluştur
            const cartItemDiv = document.createElement('div');
            cartItemDiv.className = 'cart-item';
            cartItemDiv.dataset.id = item.productId;
            cartItemDiv.dataset.price = priceNumber; // Fiyat bilgisini veri özniteliği olarak sakla
            cartItemDiv.dataset.index = index; // Dizin bilgisini sakla
            
            // Varyant bilgisini de sakla
            if (item.variants) {
                try {
                    // Varyant bilgilerini JSON olarak sakla
                    cartItemDiv.dataset.variants = JSON.stringify(item.variants);
                    
                    // Ayrıca varyant anahtarını da sakla (tutarlı bir şekilde oluşturulmuş)
                    const productVariants = productData.variants || [];
                    const variantValues = [];
                    
                    if (productVariants.length > 0) {
                        productVariants.forEach(variant => {
                            const variantName = variant.name;
                            // Hem orijinal hem küçük harfli hem de boşluksuz isim kontrolü
                            let val = item.variants[variantName];
                            if (val === undefined) {
                                val = item.variants[variantName.toLowerCase()];
                            }
                            if (val === undefined) {
                                val = item.variants[variantName.replace(/\s+/g, '')];
                            }
                            if (val) {
                                variantValues.push(val);
                            }
                        });
                    } else if (item.variants && typeof item.variants === 'object') {
                        Object.values(item.variants).forEach(value => {
                            variantValues.push(value);
                        });
                    }
                    // Ekstra uyarı logu
                    if (productVariants.length > 0 && variantValues.length === 0) {
                        console.warn('Varyant anahtarı boş! item.variants:', item.variants, 'productVariants:', productVariants);
                    }
                    
                    const variantKey = variantValues.join('-');
                    cartItemDiv.dataset.variantKey = variantKey;
                    console.log(`Sepet öğesi varyant anahtarı:`, variantKey);
                } catch (error) {
                    console.error('Varyant bilgileri saklanırken hata:', error);
                }
            }
            
            cartItemDiv.innerHTML = `
                <img src="${productImage}" alt="${productData.name}">
                <div class="cart-item-info">
                    <h4 style="font-size: 1.1rem;">${productData.name}</h4>
                    <p style="margin-bottom: 5px; margin-top: 5px;">${variantInfo}</p>
                    <div class="cart-item-price" data-price="${priceNumber}"><b>${formatPrice(priceNumber)}</b></div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn decrease-btn">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn increase-btn">+</button>
                    </div>
                </div>
                <button class="remove-item">Sil</button>
                <div class="cart-item-total" data-total="${itemTotal}">
                    ${window.location.pathname.includes('customer-cart.html') ? `<b>${formatPrice(itemTotal)}</b>` : formatPrice(itemTotal)}
                </div>
            `;
            cartItemsContainer.appendChild(cartItemDiv);
            const decreaseBtn = cartItemDiv.querySelector('.decrease-btn');
            const increaseBtn = cartItemDiv.querySelector('.increase-btn');
            const removeBtn = cartItemDiv.querySelector('.remove-item');
            
            // Sil butonuna tıklandığında ürünü sepetten kaldır
            removeBtn.addEventListener('click', async function() {
                try {
                    // Ürün ID'sini ve varyantları al
                    const productId = item.productId;
                    const variants = item.variants;
                    
                    if (!productId) {
                        console.error('Geçersiz ürün ID\'si!');
                        return;
                    }
                    
                    console.log('Sepetten kaldırılıyor:', productId, variants);
                    
                    // Önce görsel geri bildirim
                    cartItemDiv.style.opacity = '0.5';
                    cartItemDiv.style.pointerEvents = 'none';
                    
                    // Ürünü sepetten kaldır
                    const success = await removeFromCart(productId, variants);
                    
                    if (success) {
                        // DOM'dan öğeyi kaldır
                        cartItemDiv.remove();
                        
                        // Sepet sayısını manuel olarak güncelle (sayfa içi anlık güncelleme için)
                        const cartCount = document.querySelector('.cart-count');
                        if (cartCount) {
                            const currentCount = parseInt(cartCount.textContent) || 0;
                            const newCount = Math.max(0, currentCount - (item.quantity || 1));
                            cartCount.textContent = newCount;
                            console.log('Sepet sayısı manuel olarak güncellendi:', newCount);
                        }
                        
                        // Toplamları güncelle
                        updateTotals();
                        
                        console.log('Ürün başarıyla sepetten kaldırıldı');
                    } else {
                        // Başarısızlık durumunda öğeyi geri göster
                        cartItemDiv.style.opacity = '1';
                        cartItemDiv.style.pointerEvents = 'auto';
                        console.error('Ürün sepetten kaldırılamadı!');
                    }
                } catch (error) {
                    console.error('Sepetten kaldırma işleminde hata:', error);
                    // Hata durumunda öğeyi geri göster
                    cartItemDiv.style.opacity = '1';
                    cartItemDiv.style.pointerEvents = 'auto';
                }
            });
            decreaseBtn.addEventListener('click', async () => {
                // Önce kullanıcıya görsel geri bildirim sağla
                const quantitySpan = cartItemDiv.querySelector('.cart-item-quantity span');
                const currentQuantity = parseInt(quantitySpan.textContent);
                
                // Miktar 1 ise ürünü sepetten kaldır
                if (currentQuantity === 1) {
                    console.log('Miktar 1, ürün sepetten kaldırılıyor...');
                    
                    try {
                        // Önce görsel olarak ürünü gizle
                        cartItemDiv.style.opacity = '0.5';
                        cartItemDiv.style.pointerEvents = 'none'; // Tıklamaları devre dışı bırak
                        
                        // Doğrudan removeFromCart fonksiyonunu çağır
                        await removeFromCart(item.productId, item.variants);
                        
                        // Sepet sayısını manuel olarak güncelle (sayfa içi anlık güncelleme için)
                        const cartCount = document.querySelector('.cart-count');
                        if (cartCount) {
                            const currentCount = parseInt(cartCount.textContent) || 0;
                            const newCount = Math.max(0, currentCount - 1); // Miktar 1 olduğu için 1 azalt
                            cartCount.textContent = newCount;
                            console.log('Sepet sayısı manuel olarak güncellendi (azalt):', newCount);
                        }
                        
                        // Başarılı olursa ürünü görsel olarak kaldır
                        cartItemDiv.style.height = '0';
                        cartItemDiv.style.margin = '0';
                        cartItemDiv.style.padding = '0';
                        cartItemDiv.style.overflow = 'hidden';
                        cartItemDiv.style.transition = 'all 0.3s ease';
                        
                        // Animasyon tamamlandıktan sonra DOM'dan kaldır
                        setTimeout(() => {
                            cartItemDiv.remove();
                        }, 300);
                    } catch (error) {
                        console.error('Ürün sepetten kaldırılırken hata oluştu:', error);
                        // Hata durumunda görsel geri bildirimi geri al
                        cartItemDiv.style.opacity = '1';
                        cartItemDiv.style.pointerEvents = 'auto';
                    }
                    return; // İşlem tamamlandı, fonksiyondan çık
                }
                
                // Miktar 1'den büyükse azalt
                if (currentQuantity > 1) {
                    // Görsel geri bildirim - miktarı azalt
                    const oldQuantity = currentQuantity;
                    const newQuantity = currentQuantity - 1;
                    
                    // Önce görsel geri bildirim yap
                    quantitySpan.textContent = newQuantity;
                    
                    // Toplam fiyatı güncelle
                    const itemPriceEl = cartItemDiv.querySelector('.cart-item-price');
                    const priceText = itemPriceEl.textContent.replace(' TL', '');
                    const price = parseFloat(priceText.replace(/\./g, '').replace(',', '.'));
                    const totalEl = cartItemDiv.querySelector('.cart-item-total');
                    totalEl.textContent = formatPrice(price * newQuantity);
                    // Toplam fiyatı data-total özelliğine de kaydet (toplamları hesaplamak için)
                    totalEl.dataset.total = (price * newQuantity).toFixed(2);
                    
                    console.log('Miktar azaltılıyor:', oldQuantity, '->', newQuantity);
                    
                    // Sepet sayacını manuel olarak güncelle (sayfa içi anlık güncelleme için)
                    const cartCount = document.querySelector('.cart-count');
                    if (cartCount) {
                        const currentCount = parseInt(cartCount.textContent) || 0;
                        if (currentCount > 0) {
                            cartCount.textContent = currentCount - 1;
                            console.log('Sepet sayısı manuel olarak güncellendi (azalt):', currentCount - 1);
                        }
                    }
                    
                    // Veritabanını güncelle - updateCartItemQuantity fonksiyonunu kullan
                    try {
                        // Doğrudan updateCartItemQuantity fonksiyonunu çağır
                        // Bu fonksiyon hem Firebase'i günceller hem de UI güncellemelerini yapar
                        // Miktar azaltıldığında change parametresi -1 olmalı ve directQuantity false olmalı
                        await updateCartItemQuantity(item.productId, item.variants, -1, false);
                        
                        console.log('Miktar başarıyla azaltıldı');
                        // Toplamları güncelle
                        updateTotals();
                    } catch (error) {
                        console.error('Miktar azaltılırken hata oluştu:', error);
                        // Hata durumunda görsel geri bildirimi geri al
                        quantitySpan.textContent = oldQuantity;
                        totalEl.textContent = formatPrice(price * oldQuantity);
                        totalEl.dataset.total = (price * oldQuantity).toFixed(2);
                        // Toplamları tekrar güncelle
                        updateTotals();
                    }
                } else {
                    console.log('Miktar 1\'den küçük, işlem yapılmıyor');
                }
            });
            increaseBtn.addEventListener('click', async () => {
                // Önce stok kontrolü yap
                try {
                    // Ürün bilgilerini al (global veya modüler Firebase kullan)
                    let productDoc;
                    
                    if (typeof firebase !== 'undefined' && firebase.firestore) {
                        // Global Firebase kullan
                        productDoc = await firebase.firestore().collection('products').doc(item.productId).get();
                    } else {
                        // Modüler Firebase kullan
                        productDoc = await getDoc(doc(db, 'products', item.productId));
                    }
                    
                    // Global veya modüler Firebase için exists kontrolü
                    const productExists = typeof productDoc.exists === 'function' ? productDoc.exists() : productDoc.exists;
                    if (!productExists) {
                        console.error('Ürün bulunamadı:', item.productId);
                        return;
                    }
                    
                    const productData = productDoc.data();
                    
                    // Stok kontrolü
                    let availableStock = 0;
                    
                    // Varyant stok kontrolü
                    if (productData.stock) {
                        console.log('Stok bilgisi:', productData.stock);
                        
                        if (typeof productData.stock === 'object' && item.variants) {
                            const variantKey = Object.values(item.variants).join('-');
                            console.log('Varyant anahtarı:', variantKey);
                            
                            if (variantKey && productData.stock[variantKey] !== undefined) {
                                availableStock = parseInt(productData.stock[variantKey]);
                                console.log('Varyant stoğu:', availableStock);
                            } else if (productData.stock.default !== undefined) {
                                availableStock = parseInt(productData.stock.default);
                                console.log('Varsayılan stok:', availableStock);
                            } else {
                                // Herhangi bir stok değeri bulunamadı
                                // Ürünün ana stoğunu kontrol et
                                if (typeof productData.stock === 'number') {
                                    availableStock = productData.stock;
                                    console.log('Ana stok (sayı):', availableStock);
                                } else {
                                    // Nesne içindeki ilk stok değerini kullan
                                    const firstStock = Object.values(productData.stock)[0];
                                    availableStock = typeof firstStock === 'number' ? firstStock : 10; // Varsayılan olarak 10 kullan
                                    console.log('Bulunan ilk stok:', availableStock);
                                }
                            }
                        } else if (typeof productData.stock === 'number') {
                            availableStock = productData.stock;
                            console.log('Ana stok (sayı):', availableStock);
                        } else {
                            // Stok bilgisi bulunamadı, varsayılan değer kullan
                            availableStock = 10; // Varsayılan olarak 10 kullan
                            console.log('Stok bilgisi bulunamadı, varsayılan:', availableStock);
                        }
                    } else {
                        // Stok bilgisi yok, varsayılan değer kullan
                        availableStock = 10; // Varsayılan olarak 10 kullan
                        console.log('Stok alanı yok, varsayılan:', availableStock);
                    }
                    
                    const quantitySpan = cartItemDiv.querySelector('.cart-item-quantity span');
                    const currentQuantity = parseInt(quantitySpan.textContent);
                    
                    console.log('Stok kontrolü yapılıyor - Mevcut miktar:', currentQuantity, 'Stok:', availableStock);
                    
                    // Stok kontrolü - ÖNEMLİ: Önce kontrol et, sonra miktarı artır
                    // Tam olarak stok miktarına kadar izin ver, fazlasına değil
                    if (currentQuantity >= availableStock) {
                        console.log('STOK YETERSİZ! Miktar artırılmayacak!');
                        // Stok yetersizse popup uyarı göster ve miktarı artırma
                        showStockWarningPopup(`Bu üründe daha fazla stok mevcut değildir.`);
                        // Miktarı artırma işlemini iptal et
                        return;
                    }
                    
                    console.log('Stok yeterli, miktar artırılıyor:', currentQuantity, '->', currentQuantity + 1);
                    
                    // Veritabanını güncelle - ÖNEMLİ: Burada sadece updateCartItemQuantity'yi çağırıyoruz
                    try {
                        // Önce veritabanını güncelle
                        const success = await updateCartItemQuantity(item.productId, item.variants, 1);
                        
                        if (success) {
                            // Başarılı olursa görsel geri bildirim sağla
                            quantitySpan.textContent = currentQuantity + 1;
                            
                            // Toplam fiyatı güncelle
                            const itemPriceEl = cartItemDiv.querySelector('.cart-item-price');
                            const priceText = itemPriceEl.textContent.replace(' TL', '');
                            const price = parseFloat(priceText.replace(/\./g, '').replace(',', '.'));
                            const totalEl = cartItemDiv.querySelector('.cart-item-total');
                            totalEl.textContent = formatPrice(price * (currentQuantity + 1));
                            // Toplam fiyatı data-total özelliğine de kaydet (toplamları hesaplamak için)
                            totalEl.dataset.total = (price * (currentQuantity + 1)).toFixed(2);
                            
                            // Sepet sayacını manuel olarak güncelle (sayfa içi anlık güncelleme için)
                            const cartCount = document.querySelector('.cart-count');
                            if (cartCount) {
                                const currentCount = parseInt(cartCount.textContent) || 0;
                                cartCount.textContent = currentCount + 1;
                                console.log('Sepet sayısı manuel olarak güncellendi (arttır):', currentCount + 1);
                            }
                            
                            console.log('Veritabanı güncellendi');
                            // Toplamları güncelle
                            updateTotals();
                        } else {
                            console.error('Veritabanı güncellenemedi');

                        }
                    } catch (error) {
                        console.error('Veritabanı güncellenirken hata:', error);
                        alert('Sepet güncellenirken bir hata oluştu. Lütfen tekrar deneyin.');
                    }
                } catch (error) {
                    console.error('Stok kontrolü sırasında hata oluştu:', error);
                }
            });
            removeBtn.addEventListener('click', () => {
                removeFromCart(item.productId, item.variants);
            });
        }));
        // Total amount elementini kontrol et ve varsa güncelle
        const totalAmountElement = document.querySelector('.total-amount');
        if (totalAmountElement) {
            totalAmountElement.textContent = formatPrice(total);
        }
        
        // Toplamları güncelle
        updateTotals();
    } catch (error) {
        console.error('Sepet güncellenirken hata oluştu:', error);
        cartItemsContainer.innerHTML = '<div class="error-cart">Sepet yüklenirken bir hata oluştu</div>';
        
        // Hata durumunda total değişkenini sıfırla
        total = 0;
        
        // Hata durumunda da yükleme overlay'ini gizle
        const loadingOverlay = document.querySelector('.cart-loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
    
    // Total zaten yukarıda güncellendi, tekrar güncellemeye gerek yok
    
    // Yükleme overlay'ini gizle (zaten yukarıda tanımlanmış olabilir)
    let loadingOverlayElement = document.querySelector('.cart-loading-overlay');
    if (loadingOverlayElement) {
        loadingOverlayElement.style.display = 'none';
    }
}

// Sepet sayacını güncelle - gercek zamanlı dinleyici ile
let cartCountUnsubscribe = null; // Dinleyici referansı

async function updateCartCount() {
    console.log("customer-cart.js'den updateCartCount ÇAĞRILDI");
    const cartCount = document.querySelector('.cart-count');
    if (!cartCount) return;
    
    try {
        // Önce mevcut dinleyiciyi temizle
        if (cartCountUnsubscribe) {
            cartCountUnsubscribe();
            cartCountUnsubscribe = null;
        }
        
        // Hem modüler hem de global Firebase kullanımını destekle
        let user;
        
        // Önce global Firebase'i kontrol et
        if (typeof firebase !== 'undefined' && firebase.auth) {
            user = firebase.auth().currentUser;
        } 
        // Global Firebase yoksa modüler Firebase'i kullan
        else if (typeof auth !== 'undefined') {
            user = auth.currentUser;
        }
        
        // Kullanıcı yoksa sepet sayısını sıfırla (müşteri sayfalarında kullanıcı zaten giriş yapmış olmalı)
        if (!user) {
            cartCount.textContent = '0';
            cartCount.style.display = 'flex'; // Her zaman görünür yap
            console.log('Kullanıcı bulunamadı, sepet sayısı sıfırlandı');
            return;
        }
        
        // Görünürlük ayarı - her zaman görünür olsun
        cartCount.style.display = 'flex';
        
        // Firestore gerçek zamanlı dinleyici ekle
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            // Global Firebase kullan
            const cartRef = firebase.firestore().collection('carts').doc(user.uid);
            
            // Gerçek zamanlı dinleyici ekle
            cartCountUnsubscribe = cartRef.onSnapshot(snapshot => {
                if (snapshot.exists && snapshot.data().items) {
                    const cartItems = snapshot.data().items || [];
                    
                    // Toplam ürün adedini hesapla (miktarı dikkate alarak)
                    const totalQuantity = cartItems.reduce((total, item) => {
                        return total + (parseInt(item.quantity) || 1);
                    }, 0);
                    
                    cartCount.textContent = totalQuantity;
                    console.log('Sepet sayısı gerçek zamanlı güncellendi:', totalQuantity);
                } else {
                    cartCount.textContent = '0';
                }
            }, error => {
                console.error('Sepet dinleyici hatası:', error);
                cartCount.textContent = '0';
            });
        } else if (typeof db !== 'undefined' && typeof doc !== 'undefined' && typeof onSnapshot !== 'undefined') {
            // Modüler Firebase kullan
            const cartRef = doc(db, 'carts', user.uid);
            
            // Gerçek zamanlı dinleyici ekle
            cartCountUnsubscribe = onSnapshot(cartRef, snapshot => {
                if (snapshot.exists() && snapshot.data().items) {
                    const cartItems = snapshot.data().items || [];
                    
                    // Toplam ürün adedini hesapla (miktarı dikkate alarak)
                    const totalQuantity = cartItems.reduce((total, item) => {
                        return total + (parseInt(item.quantity) || 1);
                    }, 0);
                    
                    cartCount.textContent = totalQuantity;
                    console.log('Sepet sayısı gerçek zamanlı güncellendi (modüler):', totalQuantity);
                } else {
                    cartCount.textContent = '0';
                }
            }, error => {
                console.error('Sepet dinleyici hatası (modüler):', error);
                cartCount.textContent = '0';
            });
        } else {
            // Dinleyici kurulamadı, tek seferlik güncelleme yap
            console.warn('Gerçek zamanlı dinleyici kurulamadı, tek seferlik güncelleme yapılıyor');
            
            // Firestore referansını al (global veya modüler)
            let cartSnap;
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                // Global Firebase kullan
                const cartRef = firebase.firestore().collection('carts').doc(user.uid);
                cartSnap = await cartRef.get();
            } else if (typeof db !== 'undefined' && typeof getDoc !== 'undefined') {
                // Modüler Firebase kullan
                const cartRef = doc(db, 'carts', user.uid);
                cartSnap = await getDoc(cartRef);
            } else {
                console.error('Firebase kullanılamıyor!');
                cartCount.textContent = '0';
                return;
            }
            
            // Sepet verilerini işle
            const cartExists = typeof cartSnap.exists === 'function' ? cartSnap.exists() : cartSnap.exists;
            if (!cartExists || !cartSnap.data().items) {
                cartCount.textContent = '0';
                return;
            }
            const cartItems = cartSnap.data().items || [];
            
            // Toplam ürün adedini hesapla (miktarı dikkate alarak)
            const totalQuantity = cartItems.reduce((total, item) => {
                return total + (parseInt(item.quantity) || 1);
            }, 0);
            
            cartCount.textContent = totalQuantity;
        }
    } catch (error) {
        console.error('Sepet sayısı güncellenirken hata oluştu:', error);
        cartCount.textContent = '0';
    }
}

// Sayfa kapanırken dinleyiciyi temizle
window.addEventListener('beforeunload', () => {
    if (cartCountUnsubscribe) {
        cartCountUnsubscribe();
    }
});

// Fiyatı Türk Lirası formatında göster, TL eklemesi ile
function formatPrice(price) {
    // Fiyat deu011feri null, undefined veya geu00e7ersiz ise varsayu0131lan 0 kullan
    if (price === null || price === undefined || isNaN(Number(price))) {
        console.warn('Geu00e7ersiz fiyat deu011feri formatlanıyor:', price);
        price = 0;
    }
    
    // String fiyat deu011ferini iu015fle
    if (typeof price === 'string') {
        // Zaten formatlanmu0131u015f bir fiyat mu0131 kontrol et (TL iu00e7eriyor mu?)
        if (price.includes('TL')) {
            // Sayfa iu00e7i iu015flem iu00e7in sayı deu011ferine u00e7evir
            const numericPrice = parseFloat(price.replace(/[^0-9.,]/g, '').replace(',', '.'));
            if (!isNaN(numericPrice)) {
                price = numericPrice;
            } else {
                price = 0;
            }
        } else {
            // Normal string sayıya u00e7evir
            const numericPrice = parseFloat(price.replace(/[^0-9.,]/g, '').replace(',', '.'));
            if (!isNaN(numericPrice)) {
                price = numericPrice;
            } else {
                price = 0;
            }
        }
    }
    
    // Sayı olarak formatla
    return Number(price).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
}

// Sadece ürün ID'sine göre sepetten silme işlemi yap
async function removeFromCartById(productId) {
    console.log('removeFromCartById çağrıldı:', productId);
    
    try {
        // Orijinal Firebase kontrolü
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
            const user = firebase.auth().currentUser;
            
            if (!user) {
                console.error('Kullanıcı giriş yapmamış!');
                return false;
            }
            
            console.log('Kullanıcı bulundu:', user.uid);
            
            // Sepet referansını al
            const cartRef = firebase.firestore().collection('carts').doc(user.uid);
            
            // Sepet verisini al
            const cartSnap = await cartRef.get();
            
            if (!cartSnap.exists) {
                console.log('Sepet bulunamadı!');
                return false;
            }
            
            const cartData = cartSnap.data();
            const cartItems = cartData.items || [];
            
            console.log('Mevcut sepet ürünleri:', cartItems.length);
            console.log('Silinecek ürün ID:', productId);
            
            // Sadece ürün ID'sine göre filtrele
            const updatedItems = cartItems.filter(item => item.productId !== productId);
            
            // Kaldırılan ürün var mı kontrol et
            if (updatedItems.length === cartItems.length) {
                console.warn('Kaldırılacak ürün bulunamadı!', productId);
                return false;
            }
            
            console.log('Ürün başarıyla kaldırıldı. Yeni sepet boyutu:', updatedItems.length);
            
            // Firestore'u güncelle
            await cartRef.update({
                items: updatedItems,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('Firestore güncellendi, sepet güncellendi');
            return true;
        } else {
            console.error('Firebase kullanılamıyor!');
            return false;
        }
    } catch (error) {
        console.error('Ürün sepetten kaldırılırken hata oluştu:', error);
        return false;
    }
}

async function removeFromCart(productId, variants = undefined) {
    console.log('removeFromCart çağrıldı:', productId, variants);
    
    try {
        // Kullanıcı kontrolü - hem global hem modüler Firebase için
        let user = null;
        
        // Önce global Firebase'i dene
        if (typeof firebase !== 'undefined' && firebase.auth) {
            user = firebase.auth().currentUser;
        }
        
        // Kullanıcı bulunamadıysa modüler Firebase'i dene
        if (!user && typeof auth !== 'undefined') {
            user = auth.currentUser;
        }
        
        if (!user) {
            console.error('Kullanıcı giriş yapmamış!');
            return false;
        }
        
        console.log('Kullanıcı bulundu:', user.uid);
        
        // Sepet referansını ve verisini al (global veya modüler Firebase kullan)
        let cartData;
        let cartItems;
        
        try {
            // Global Firebase ile dene
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                const cartRef = firebase.firestore().collection('carts').doc(user.uid);
                const cartSnap = await cartRef.get();
                
                if (!cartSnap.exists) {
                    console.log('Sepet bulunamadı!');
                    return false;
                }
                
                cartData = cartSnap.data();
                cartItems = cartData.items || [];
                
                console.log('Mevcut sepet ürünleri:', cartItems.length);
                console.log('Silinecek ürün ID:', productId);
                
                // Ürünü filtrele
                const updatedItems = cartItems.filter(item => {
                    // Ürün ID'si farklıysa sakla
                    if (item.productId !== productId) {
                        return true;
                    }
                    
                    // Varyant yoksa eşleşme var
                    if (!item.variants && !variants) {
                        return false; // Kaldır
                    }
                    
                    // Sadece birinde varyant varsa eşleşme yok
                    if (!item.variants || !variants) {
                        return true; // Sakla
                    }
                    
                    // Varyantları karşılaştır
                    const itemKeys = Object.keys(item.variants);
                    const targetKeys = Object.keys(variants);
                    
                    // Anahtar sayısı farklıysa eşleşme yok
                    if (itemKeys.length !== targetKeys.length) {
                        return true; // Sakla
                    }
                    
                    // Her bir anahtarın değerini kontrol et
                    for (const key of itemKeys) {
                        if (!variants.hasOwnProperty(key) || item.variants[key] !== variants[key]) {
                            return true; // Sakla
                        }
                    }
                    
                    // Tüm kontroller geçildiyse, bu ürünü kaldır
                    return false;
                });
                
                // Değişiklik var mı kontrol et
                if (updatedItems.length === cartItems.length) {
                    console.warn('Kaldırılacak ürün bulunamadı!', productId);
                    return false;
                }
                
                // Firestore'u güncelle
                await cartRef.update({
                    items: updatedItems,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                console.log('Firestore güncellendi, ürün silindi');
                return true;
            }
            // Modüler Firebase ile dene
            else if (typeof db !== 'undefined') {
                const cartRef = doc(db, 'carts', user.uid);
                const cartSnap = await getDoc(cartRef);
                
                if (!cartSnap.exists()) {
                    console.log('Sepet bulunamadı! (modüler)');
                    return false;
                }
                
                cartData = cartSnap.data();
                cartItems = cartData.items || [];
                
                console.log('Mevcut sepet ürünleri (modüler):', cartItems.length);
                console.log('Silinecek ürün ID:', productId);
                
                // Ürünü filtrele
                const updatedItems = cartItems.filter(item => {
                    if (item.productId !== productId) return true;
                    if (!item.variants && !variants) return false;
                    if (!item.variants || !variants) return true;
                    
                    // Varyantları karşılaştır
                    const itemKeys = Object.keys(item.variants);
                    for (const key of itemKeys) {
                        if (!variants.hasOwnProperty(key) || item.variants[key] !== variants[key]) {
                            return true;
                        }
                    }
                    return false;
                });
                
                // Değişiklik var mı kontrol et
                if (updatedItems.length === cartItems.length) {
                    console.warn('Kaldırılacak ürün bulunamadı! (modüler)');
                    return false;
                }
                
                // Firestore'u güncelle
                await updateDoc(cartRef, {
                    items: updatedItems,
                    updatedAt: serverTimestamp()
                });
                
                console.log('Firestore güncellendi, ürün silindi (modüler)');
                return true;
            }
            else {
                console.error('Ne global ne de modüler Firebase kullanılabilir!');
                return false;
            }
        } catch (error) {
            console.error('Sepet güncellenirken hata oluştu:', error);
            return false;
        }
        
    } catch (error) {
        console.error('Ürün sepetten kaldırılırken hata oluştu:', error);
        return false;
    }
}

// Sepetteki ürün miktarını güncelle
async function updateCartItemQuantity(productId, variants, change, directQuantity = false) {
    console.log(`updateCartItemQuantity çağrıldı: ürün=${productId}, değişim=${change}`);
    
    // Hem modüler hem de global Firebase kullanımını destekle
    let user;
    
    // Önce global Firebase'i kontrol et
    if (typeof firebase !== 'undefined' && firebase.auth) {
        user = firebase.auth().currentUser;
    } 
    // Global Firebase yoksa modüler Firebase'i kullan
    else if (auth) {
        user = auth.currentUser;
    }
    
    if (!user) {
        console.warn('Sepet ürün miktarı güncellenirken kullanıcı bulunamadı');
        return false;
    }
    try {
        // Miktar azaltılıyorsa stok kontrolüne gerek yok
        if (change < 0) {
            // Global veya modüler Firebase kullan
            let cartSnap;
            let cartRef;
            
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                // Global Firebase kullan
                cartRef = firebase.firestore().collection('carts').doc(user.uid);
                cartSnap = await cartRef.get();
                if (!cartSnap.exists) {
                    return;
                }
            } else {
                // Modüler Firebase kullan
                cartRef = doc(db, 'carts', user.uid);
                cartSnap = await getDoc(cartRef);
                if (!cartSnap.exists()) {
                    return;
                }
            }
            const cartData = cartSnap.data();
            let items = cartData.items || [];
            // Ürün verilerini al (varyant sıralaması için)
            let productData = null;
            try {
                // Global veya modüler Firebase kullan
                if (typeof firebase !== 'undefined' && firebase.firestore) {
                    // Global Firebase kullan
                    const productDoc = await firebase.firestore().collection('products').doc(productId).get();
                    if (productDoc.exists) {
                        productData = productDoc.data();
                    }
                } else {
                    // Modüler Firebase kullan
                    const productDoc = await getDoc(doc(db, 'products', productId));
                    if (productDoc.exists()) {
                        productData = productDoc.data();
                    }
                }
            } catch (error) {
                console.error('Ürün verileri alınırken hata:', error);
            }
            
            let updated = false;
            items = items.map(item => {
                // Ürün ID'leri eşleşiyor mu kontrol et
                if (item.productId === productId) {
                    
                    // Varyant kontrolü
                    let variantsMatch = true;
                    
                    // Her iki öğede de varyant yoksa eşleşme var
                    if (!item.variants && !variants) {
                        variantsMatch = true;
                    } 
                    // Sadece birinde varyant varsa eşleşme yok
                    else if (!item.variants || !variants) {
                        variantsMatch = false;
                    }
                    // Her ikisinde de varyant varsa, varyantları karşılaştır
                    else if (productData && productData.variants) {
                        // Ürün varyant sırasına göre karşılaştırma yap
                        variantsMatch = true; // Başlangıçta eşleşme var kabul et
                        
                        for (const variant of productData.variants) {
                            const variantName = variant.name;
                            // Her iki öğede de bu varyant var mı?
                            if (variants[variantName] !== undefined && item.variants[variantName] !== undefined) {
                                // Değerler eşleşmiyor mu?
                                if (variants[variantName] !== item.variants[variantName]) {
                                    variantsMatch = false;
                                    break;
                                }
                            } else if (variants[variantName] !== undefined || item.variants[variantName] !== undefined) {
                                // Sadece birinde var, eşleşme yok
                                variantsMatch = false;
                                break;
                            }
                        }
                    }
                    // Ürün varyant bilgisi yoksa, eski yöntemle karşılaştır
                    else {
                        // Varyant anahtarlarının sayısı eşit mi?
                        const itemVariantKeys = Object.keys(item.variants);
                        const variantKeys = Object.keys(variants);
                        
                        if (itemVariantKeys.length !== variantKeys.length) {
                            variantsMatch = false;
                        } else {
                            // Her bir varyant anahtarı ve değeri eşleşiyor mu?
                            variantsMatch = variantKeys.every(key => 
                                item.variants[key] === variants[key]
                            );
                        }
                    }
                    
                    // Ürün ID ve varyantlar eşleşiyorsa güncelle
                    if (variantsMatch) {
                        let newQuantity;
                        if (directQuantity) {
                            // Doğrudan miktar belirtilmişse, o miktarı kullan
                            newQuantity = change;
                        } else {
                            // Değişim miktarı belirtilmişse, mevcut miktara ekle
                            newQuantity = (item.quantity || 1) + change;
                        }
                        // Miktar 1'den küçük olamaz
                        if (newQuantity < 1) newQuantity = 1;
                        updated = true;
                        return { ...item, quantity: newQuantity };
                    }
                }
                return item;
            });
            
            // Eşleşme bulunamadıysa, varyant bilgilerini yazdır
            if (!updated) {
                console.log('Eşleşme bulunamadı. Aranan ürün:', productId);
                console.log('Aranan varyantlar:', variants);
                console.log('Sepetteki ürünler:', items.map(i => ({ id: i.productId, variants: i.variants })));
            }
            if (updated) {
                if (typeof firebase !== 'undefined' && firebase.firestore) {
                    // Global Firebase kullan
                    await cartRef.update({
                        items: items,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    // Modüler Firebase kullan
                    await updateDoc(cartRef, {
                        items: items,
                        updatedAt: serverTimestamp()
                    });
                }
                updateCartUI();
                updateCartCount();
            }
            return;
        }
        
        // Miktar artırılıyorsa önce stok kontrolü yap
        // DirectQuantity true ise veya change 0 veya negatifse stok kontrolü yapma
        if (directQuantity || change <= 0) {
            console.log('Miktar azaltılıyor veya doğrudan miktar belirtiliyor, stok kontrolü atlanıyor.');
            return true;
        }
        
        console.log('Miktar artırılıyor, stok kontrolü başlıyor...');
        
        // Ürün bilgilerini al (global veya modüler Firebase kullan)
        let productDoc;
        
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            // Global Firebase kullan
            productDoc = await firebase.firestore().collection('products').doc(productId).get();
            if (!productDoc.exists) {
                console.error('Ürün bulunamadı:', productId);
                return false;
            }
        } else {
            // Modüler Firebase kullan
            productDoc = await getDoc(doc(db, 'products', productId));
            if (!productDoc.exists()) {
                console.error('Ürün bulunamadı:', productId);
                return false;
            }
        }
        
        const productData = productDoc.data();
        console.log('Ürün verileri alındı:', productData.name);
        
        // Mevcut sepet içeriğini al (global veya modüler Firebase kullan)
        let cartSnap;
        let cartRef;
        
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            // Global Firebase kullan
            cartRef = firebase.firestore().collection('carts').doc(user.uid);
            cartSnap = await cartRef.get();
            if (!cartSnap.exists) {
                return;
            }
        } else {
            // Modüler Firebase kullan
            cartRef = doc(db, 'carts', user.uid);
            cartSnap = await getDoc(cartRef);
            if (!cartSnap.exists()) {
                console.error('Sepet bulunamadı');
                return false;
            }
        }
        
        const cartData = cartSnap.data();
        let items = cartData.items || [];
        console.log('Sepet içeriği alındı, ürün sayısı:', items.length);
        
        // Sepetteki mevcut ürünü bul
        const cartItem = items.find(item => {
            // Ürün ID'leri eşleşiyor mu kontrol et
            if (item.productId !== productId) return false;
            
            // Varyant kontrolü
            // Her iki öğede de varyant yoksa eşleşme var
            if (!item.variants && !variants) return true;
            
            // Sadece birinde varyant varsa eşleşme yok
            if (!item.variants || !variants) return false;
            
            // Her ikisinde de varyant varsa, varyantları karşılaştır
            // Varyant anahtarlarının sayısı eşit mi?
            const itemVariantKeys = Object.keys(item.variants);
            const variantKeys = Object.keys(variants);
            
            if (itemVariantKeys.length !== variantKeys.length) return false;
            
            // Her bir varyant anahtarı ve değeri eşleşiyor mu?
            return variantKeys.every(key => item.variants[key] === variants[key]);
        });
        
        if (!cartItem) {
            console.error('Sepette güncellenecek ürün bulunamadı');
            return false;
        }
        
        console.log('Sepetteki ürün bulundu, mevcut miktar:', cartItem.quantity);
        
        // Stok kontrolü
        let availableStock = 0;
        
        // Varyant stok kontrolü
        if (productData.stock) {
            console.log('Stok bilgisi mevcut:', productData.stock);
            
            if (typeof productData.stock === 'object' && variants) {
                // Varyant anahtarını tutarlı bir şekilde oluştur
                // Önce ürünün varyant tanımlarını al
                const productVariants = productData.variants || [];
                
                // Varyant anahtarını ürün varyant sırasına göre oluştur
                const variantValues = [];
                if (productVariants.length > 0) {
                    // Ürün varyant sırasına göre değerleri ekle
                    productVariants.forEach(variant => {
                        const variantName = variant.name;
                        if (variants[variantName]) {
                            variantValues.push(variants[variantName]);
                        }
                    });
                } else {
                    // Ürün varyant tanımı yoksa, mevcut varyant değerlerini kullan
                    Object.values(variants).forEach(value => {
                        variantValues.push(value);
                    });
                }
                
                const variantKey = variantValues.join('-');
                console.log('Varyant anahtarı (stok kontrolü için):', variantKey);
                console.log('Mevcut stok anahtarları:', Object.keys(productData.stock));
                
                if (variantKey && productData.stock[variantKey] !== undefined) {
                    availableStock = parseInt(productData.stock[variantKey]);
                    console.log('Varyant stoğu bulundu:', availableStock);
                } else if (productData.stock.default !== undefined) {
                    availableStock = parseInt(productData.stock.default);
                    console.log('Varsayılan stok kullanılıyor:', availableStock);
                } else {
                    // Herhangi bir stok değeri bulunamadı
                    // Ürünün ana stoğunu kontrol et
                    if (typeof productData.stock === 'number') {
                        availableStock = parseInt(productData.stock);
                        console.log('Ana stok (sayı) kullanılıyor:', availableStock);
                    } else {
                        // Nesne içindeki ilk stok değerini kullan
                        const firstStock = Object.values(productData.stock)[0];
                        availableStock = typeof firstStock === 'number' ? parseInt(firstStock) : 10; // Varsayılan olarak 10 kullan
                        console.log('Bulunan ilk stok kullanılıyor:', availableStock);
                    }
                }
            } else if (typeof productData.stock === 'number') {
                availableStock = parseInt(productData.stock);
                console.log('Ana stok (sayı) kullanılıyor:', availableStock);
            } else {
                // Stok bilgisi bulunamadı, varsayılan değer kullan
                availableStock = 10; // Varsayılan olarak 10 kullan
                console.log('Stok bilgisi bulunamadı, varsayılan kullanılıyor:', availableStock);
            }
        } else {
            // Stok bilgisi yok, varsayılan değer kullan
            availableStock = 10; // Varsayılan olarak 10 kullan
            console.log('Stok alanı yok, varsayılan kullanılıyor:', availableStock);
        }
        
        // Yeni miktarı hesapla
        const newQuantity = (cartItem.quantity || 1) + change;
        console.log('Yeni miktar hesaplandı:', cartItem.quantity, '->', newQuantity);
        
        // Miktar 0'dan küçük olamaz
        if (newQuantity <= 0) {
            console.error('Miktar 0\'dan küçük olamaz:', newQuantity);
            return false;
        }
        
        // Sadece artırma işleminde stok kontrolü yap (change > 0)
        if (change > 0 && newQuantity > availableStock) {
            console.error('STOK YETERSİZ! Mevcut:', availableStock, 'İstenen:', newQuantity);
            // Stok yetersizse popup uyarı göster
            showStockWarningPopup(`Bu üründe daha fazla stok mevcut değildir.`);
            return false; // İşlemi burada durdur, aşağıdaki kodlar çalışmayacak
        }
        
        console.log('Stok yeterli, güncelleme devam ediyor...');
        
        // Stok yeterliyse miktarı güncelle
        let updated = false;
        items = items.map(item => {
            if (item.productId === productId) {
                // Varyant kontrolü
                let variantsMatch = true;
                
                // Her iki öğede de varyant yoksa eşleşme var
                if (!item.variants && !variants) {
                    variantsMatch = true;
                } 
                // Sadece birinde varyant varsa eşleşme yok
                else if (!item.variants || !variants) {
                    variantsMatch = false;
                }
                // Her ikisinde de varyant varsa, varyantları karşılaştır
                else {
                    // Varyant anahtarlarının sayısı eşit mi?
                    const itemVariantKeys = Object.keys(item.variants);
                    const variantKeys = Object.keys(variants);
                    
                    if (itemVariantKeys.length !== variantKeys.length) {
                        variantsMatch = false;
                    } else {
                        // Her bir varyant anahtarı ve değeri eşleşiyor mu?
                        variantsMatch = variantKeys.every(key => 
                            item.variants[key] === variants[key]
                        );
                    }
                }
                
                // Ürün ID ve varyantlar eşleşiyorsa güncelle
                if (variantsMatch) {
                    console.log('Sepet öğesi güncelleniyor:', item.quantity, '->', newQuantity);
                    updated = true;
                    return { ...item, quantity: newQuantity };
                }
            }
            return item;
        });
        
        if (updated) {
            console.log('Firestore güncelleniyor...');
            
            // Global veya modüler Firebase kullan
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                // Global Firebase kullan
                const globalCartRef = firebase.firestore().collection('carts').doc(user.uid);
                await globalCartRef.update({
                    items: items,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Modüler Firebase kullan
                const modularCartRef = doc(db, 'carts', user.uid);
                await updateDoc(modularCartRef, {
                    items: items,
                    updatedAt: serverTimestamp()
                });
            }
            
            console.log('Firestore güncellendi, UI güncelleniyor...');
            // Sadece Firestore güncellemesi başarılıysa UI'yı güncelle
            updateCartUI();
            updateCartCount();
            console.log('Sepet güncellemesi tamamlandı');
            return true; // Başarılı
        } else {
            console.warn('Güncellenecek ürün bulunamadı');
            return false; // Başarısız
        }
    } catch (error) {
        console.error('Sepet miktarı güncellenirken hata oluştu:', error);
        return false; // Hata durumunda başarısız
    }
}


// Sepeti temizle
async function clearCart() {
    // Hem modüler hem de global Firebase kullanımını destekle
    let user;
    
    // Önce global Firebase'i kontrol et
    if (typeof firebase !== 'undefined' && firebase.auth) {
        user = firebase.auth().currentUser;
    } 
    // Global Firebase yoksa modüler Firebase'i kullan
    else if (auth) {
        user = auth.currentUser;
    }
    
    if (!user) {
        console.warn('Sepet temizlenirken kullanıcı bulunamadı');
        return;
    }
    
    try {
        // Global veya modüler Firebase kullan
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            // Global Firebase kullan
            const cartRef = firebase.firestore().collection('carts').doc(user.uid);
            await cartRef.update({
                items: [],
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Modüler Firebase kullan
            const cartRef = doc(db, 'carts', user.uid);
            await updateDoc(cartRef, {
                items: [],
                updatedAt: serverTimestamp()
            });
        }
        
        updateCartUI();
        updateCartCount();
    } catch (error) {
        console.error('Sepet temizlenirken hata oluştu:', error);
    }
}

// Sepet olay dinleyicilerini ayarla
function setupCartEventListeners() {
    // Sepetimi Kaydet butonu
    const saveCartBtn = document.getElementById('save-cart-btn');
    if (saveCartBtn) {
        saveCartBtn.addEventListener('click', async function() {
            try {
                if (typeof firebase === 'undefined' || !firebase.auth) {
                    await window.showCustomPopup('Sepetinizi lütfen ürün <br>sayfasında kaydediniz.', { confirm: false });
                    return;
                }
                const user = firebase.auth().currentUser;
                if (!user) {
                    alert('Sepetinizi kaydetmek için giriş yapmalısınız.');
                    window.location.href = 'login.html';
                    return;
                }
                const db = firebase.firestore();
                const cartRef = db.collection('carts').doc(user.uid);
                const cartDoc = await cartRef.get();
                if (!cartDoc.exists) {
                    alert('Kaydedilecek sepet bulunamadı!');
                    return;
                }
                const cartData = cartDoc.data();
                // Sepet verisi boşsa kaydetme
                if (!cartData || !cartData.items || cartData.items.length === 0) {
                    alert('Kaydedilecek ürün bulunamadı!');
                    return;
                }
                // Kayıtlı sepetler koleksiyonuna ekle
                const savedCartsRef = db.collection('savedCarts').doc(user.uid);
                const savedDoc = await savedCartsRef.get();
                let savedCartsArr = [];
                if (savedDoc.exists) {
                    savedCartsArr = savedDoc.data().carts || [];
                }
                savedCartsArr.push({
                    cart: cartData,
                    savedAt: new Date().toISOString(),
                    name: 'Sepet (' + new Date().toLocaleString('tr-TR') + ')'
                });
                await savedCartsRef.set({ carts: savedCartsArr }, { merge: true });
                await window.showCustomPopup('Sepetiniz başarıyla kaydedildi!', { confirm: false });
            } catch (err) {
                console.error('Sepet kaydedilirken hata:', err);
                alert('Sepet kaydedilirken bir hata oluştu.');
            }
        });
    }

    // Sepet bağlantılarını işle
    const cartLinks = document.querySelectorAll('.cart-link');
    cartLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // customer-panel.html sayfasındaki sepet bağlantısı için özel işlem
            if (window.location.pathname.includes('customer-panel.html') && link.getAttribute('href') === 'customer-cart.html') {
                // Bu durumda normal davranışı koruyoruz, yani customer-cart.html'e yönlendirme yapılıyor
                console.log('customer-panel.html sayfasından customer-cart.html sayfasına yönlendiriliyor');
                return; // Event'i engelleme, normal yönlendirmeye izin ver
            }
            
            // Diğer tüm sepet bağlantıları için yan sepet menüsünü aç
            e.preventDefault();
            console.log('Sepet bağlantısına tıklandı, sepet menüsü açılıyor...');
            toggleCart();
        });
    });
    
    // Sepeti kapat butonuna tıklandığında sepeti kapat
    const closeCartBtn = document.querySelector('.close-cart');
    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', closeCart);
    }
    
    // Sepet overlay'ine tıklandığında sepeti kapat
    const cartOverlay = document.querySelector('.cart-overlay');
    if (cartOverlay) {
        cartOverlay.addEventListener('click', closeCart);
    }
    
    // Sepeti temizle butonuna tıklandığında popup göster
    const clearCartBtn = document.querySelector('.clear-cart');
    const clearCartBtnHeader = document.querySelector('.clear-cart-btn');
    
    // Her iki buton için de aynı işlevi ekle
    [clearCartBtn, clearCartBtnHeader].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', function() {
                // Özel tasarlanmış popup'ı göster
                const clearCartPopup = document.getElementById('clear-cart-popup');
                if (clearCartPopup) {
                    clearCartPopup.style.display = 'block';
                }
            });
        }
    });
    
    // Sepeti Temizle Popup - Temizle butonu
    const confirmBtn = document.getElementById('clear-cart-confirm');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            // Sepeti temizle
            clearCart();
            
            // Popup'ı kapat
            const clearCartPopup = document.getElementById('clear-cart-popup');
            if (clearCartPopup) {
                clearCartPopup.style.display = 'none';
            }
        });
    }
    
    // Sepeti Temizle Popup - Vazgeç butonu
    const cancelBtn = document.getElementById('clear-cart-cancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            // Sadece popup'ı kapat
            const clearCartPopup = document.getElementById('clear-cart-popup');
            if (clearCartPopup) {
                clearCartPopup.style.display = 'none';
            }
        });
    }
    
    // Sepeti Temizle Popup - Kapat butonu (X)
    const closeBtn = document.querySelector('#clear-cart-popup .close-popup');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            // Sadece popup'ı kapat
            const clearCartPopup = document.getElementById('clear-cart-popup');
            if (clearCartPopup) {
                clearCartPopup.style.display = 'none';
            }
        });
    }
    
    // Sepet ürün silme butonlarına tıklandığında ürünü sepetten çıkar
    const cartItemsContainer = document.querySelector('.cart-items');
    if (cartItemsContainer) {
        cartItemsContainer.addEventListener('click', function(event) {
            if (event.target.classList.contains('remove-item')) {
                const productId = event.target.dataset.id;
                const variants = event.target.dataset.variants;
                removeFromCart(productId, variants);
            }
        });
    }
    
    // Üst tarafta zaten tüm sepet bağlantıları için event listener ekledik
}

// Sabit değişkenler
const SHIPPING_THRESHOLD = 1000; // 1000 TL ve üzeri alışverişlerde kargo bedava
const SHIPPING_COST = 49.99; // Kargo ücreti
const MIN_ORDER_AMOUNT = 500; // Minimum sipariş tutarı

// Toplamları güncelle (Firestore tabanlı)
async function updateTotals() {
    console.log('updateTotals fonksiyonu çağrıldı');
    const subtotalEl = document.getElementById('subtotal');
    const shippingEl = document.getElementById('shipping');
    const totalEl = document.getElementById('total-price');
    const shippingMessageEl = document.querySelector('.shipping-message');
    const minOrderMessageEl = document.querySelector('.min-order-message');
    
    // Kullanıcı kontrolü
    let user = null;
    
    // Önce global Firebase'i dene
    try {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            user = firebase.auth().currentUser;
        }
    } catch (error) {
        console.error('Global Firebase kontrolü sırasında hata:', error);
    }
    
    // Eğer global Firebase'den kullanıcı bulunamazsa, modüler Firebase'i dene
    if (!user) {
        try {
            const auth = getAuth();
            user = auth.currentUser;
        } catch (e) {
            console.log('Modüler Firebase hatası:', e);
        }
    }
    
    // Kullanıcı bulunamadıysa, sıfır değerlerle güncelle
    if (!user) {
        console.log('Hiçbir kullanıcı bulunamadı, boş sepet gösteriliyor');
        if (subtotalEl) subtotalEl.textContent = formatPrice(0);
        if (shippingEl) shippingEl.textContent = formatPrice(0);
        if (totalEl) totalEl.textContent = formatPrice(0);
        if (shippingMessageEl) shippingMessageEl.style.display = 'none';
        if (minOrderMessageEl) minOrderMessageEl.style.display = 'none';
        return;
    }
    
    // Kullanıcının sepetini al
    let cartData = null;
    let subtotal = 0;
    
    try {
        let cartSnap;
        
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            // Global Firebase kullan
            const cartRef = firebase.firestore().collection('carts').doc(user.uid);
            cartSnap = await cartRef.get();
        } else {
            // Modüler Firebase kullan
            const cartRef = doc(db, 'carts', user.uid);
            cartSnap = await getDoc(cartRef);
        }
        
        // Global ve modüler Firebase için exists kontrolü
        const cartExists = typeof firebase !== 'undefined' && firebase.firestore ? cartSnap.exists : cartSnap.exists();
        
        if (cartExists) {
            cartData = cartSnap.data();
            
            // Sepet öğelerinin toplamını hesapla
            if (cartData.items && cartData.items.length > 0) {
                subtotal = cartData.items.reduce((total, item) => {
                    return total + (item.price * item.quantity);
                }, 0);
            }
        }
    } catch (error) {
        console.error('Sepet verisi alınırken hata:', error);
    }
    
    // Arayüzü güncelle
    if (subtotalEl) {
        subtotalEl.textContent = formatPrice(subtotal);
    }
    
    // Kargo ücretini hesapla
    let shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    
    if (shippingEl) {
        if (shipping === 0 && subtotal > 0) {
            shippingEl.innerHTML = "<span style='color:#2ecc71;font-weight:bold;'>Ücretsiz!</span>";
        } else {
            shippingEl.textContent = formatPrice(shipping);
        }
    }
    
    // Toplam tutarı güncelle
    if (totalEl) {
        totalEl.textContent = formatPrice(subtotal + shipping);
    }
    
    // Önce tüm mesajları gizle
    if (shippingMessageEl) {
        shippingMessageEl.style.display = 'none';
        shippingMessageEl.style.opacity = '0';
    }
    
    if (minOrderMessageEl) {
        minOrderMessageEl.style.display = 'none';
        minOrderMessageEl.style.opacity = '0';
    }
    
    // Ödeme butonunu duruma göre güncelle
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        if (subtotal > 0 && subtotal >= MIN_ORDER_AMOUNT) {
            // Yeterli tutar varsa etkinleştir
            checkoutBtn.disabled = false;
            checkoutBtn.style.opacity = '1';
            checkoutBtn.style.cursor = 'pointer';
        } else {
            // Yetersiz tutar veya boş sepet için devre dışı bırak
            checkoutBtn.disabled = true;
            checkoutBtn.style.opacity = '0.5';
            checkoutBtn.style.cursor = 'not-allowed';
        }
    }
    
    // Duruma göre sadece ilgili uyarıyı göster
    setTimeout(() => {
        // DURUM 1: Ürün minimum sipariş tutarını aşmıyorsa, sadece kırmızı uyarı göster
        if (subtotal > 0 && subtotal < MIN_ORDER_AMOUNT) {
            if (minOrderMessageEl) {
                const remaining = MIN_ORDER_AMOUNT - subtotal;
                minOrderMessageEl.innerHTML = `Minimum sipariş tutarı ${formatPrice(MIN_ORDER_AMOUNT)}'dir. Sepetinize ${formatPrice(remaining)} değerinde  <br>daha ürün eklemelisiniz!`;
                minOrderMessageEl.style.display = 'block';
                
                // Uyarı mesajının stilini güncelle - köşeleri yuvarlak olmayacak, arka plan site rengi olacak
                minOrderMessageEl.style.borderRadius = '0';
                minOrderMessageEl.style.backgroundColor = '#1e1e1e'; // Site arka plan rengi
                
                // Animasyon için transition ekle
                minOrderMessageEl.style.transition = 'opacity 0.5s ease-in-out';
                setTimeout(() => {
                    minOrderMessageEl.style.opacity = '1';
                }, 50);
            }
        }
        // DURUM 2: Ürün minimum sipariş tutarını aşıp ücretsiz kargo tutarını aşmıyorsa, sadece yeşil uyarı göster
        else if (subtotal >= MIN_ORDER_AMOUNT && subtotal < SHIPPING_THRESHOLD) {
            if (shippingMessageEl) {
                const remaining = SHIPPING_THRESHOLD - subtotal;
                shippingMessageEl.innerHTML = `Ücretsiz kargo için minimum sipariş tutarı ${formatPrice(SHIPPING_THRESHOLD)}'dir. Sepetinize ${formatPrice(remaining)} değerinde daha ürün ekleyin, kargonuz ücretsiz olsun!`;
                shippingMessageEl.style.display = 'block';
                // Yeşil renkli stil ayarları
                shippingMessageEl.style.backgroundColor = '#fff';
                shippingMessageEl.style.color = '#2ecc71';
                shippingMessageEl.style.border = '2px solid #2ecc71';
                
                // Animasyon için transition ekle
                shippingMessageEl.style.transition = 'opacity 0.5s ease-in-out';
                setTimeout(() => {
                    shippingMessageEl.style.opacity = '1';
                }, 50);
            }
        }
        // DURUM 3: Ürün ücretsiz kargo tutarını aşıyorsa, sadece tebrik mesajı göster
        else if (subtotal >= SHIPPING_THRESHOLD) {
            if (shippingMessageEl) {
                shippingMessageEl.innerHTML = `<strong style='font-size:1.1rem;'>🎉 Tebrikler! Kargonuz ücretsiz.</strong><br><span style='font-size:0.98rem;'>Keyifli alışverişler dileriz.</span>`;
                shippingMessageEl.style.display = 'block';
                shippingMessageEl.style.color = '#2ecc71';
                shippingMessageEl.style.border = '2px solid #2ecc71';
                shippingMessageEl.style.background = '#f6fff8';
                
                // Animasyon için transition ekle
                shippingMessageEl.style.transition = 'opacity 0.5s ease-in-out';
                setTimeout(() => {
                    shippingMessageEl.style.opacity = '1';
                }, 50);
            }
        }
    }, 300); // Uyarının gösterilmesi için 300ms bekle
}

// Sayfa yüklenirken sepet verilerini yükle
document.addEventListener('DOMContentLoaded', function() {
    // Sayfa yüklendi
    
    // Sayfa yüklenirken sepet özetini güncelle
    try {
        updateTotals();
    } catch (error) {
        console.error('Sayfa yüklenirken sepet özeti güncellenirken hata:', error);
    }
    
    // Sepet olay dinleyicilerini ayarla
    setupCartEventListeners();
    
    // Önce Firebase kimlik doğrulama durumunu kontrol et
    if (typeof firebase !== 'undefined' && firebase.auth) {
        // Kimlik doğrulama durumu değiştiğinde sepeti güncelle
        firebase.auth().onAuthStateChanged(function(user) {
            console.log('Modüler Firebase kullanılıyor...');
            if (user) {
                console.log('Kullanıcı oturum açmış (modüler), sepet güncelleniyor...');
                // Kullanıcı oturum açmışsa sepeti güncelle
                updateCartUI();
                updateCartCount();
            } else {
                // Kullanıcı oturum açmamışsa boş sepet göster
                const cartItemsContainer = document.querySelector('.cart-items');
                if (cartItemsContainer) {
                    cartItemsContainer.innerHTML = '<p class="empty-cart">Sepetinizde ürün bulunmamaktadır.</p>';
                }
                if (document.querySelector('.total-amount')) {
                    document.querySelector('.total-amount').textContent = formatPrice(0);
                }
            }
        });
    } else {
        // Firebase yüklenmediği için normal şekilde sepeti güncelle
        updateCartUI();
        updateCartCount();
    }
    
    // Sayfa yüklenirken sepet içeriğini güncelle
    // Firebase'in modüler veya global kullanımını kontrol et
    try {
        // Önce sepeti güncelle
        updateCartUI();
        updateCartCount();
        
        // Sonra kullanıcı oturum durumunu kontrol et
        if (typeof firebase !== 'undefined' && firebase.auth) {
            console.log('Global Firebase kullanılıyor...');
            firebase.auth().onAuthStateChanged(function(user) {
                if (user) {
                    console.log('Kullanıcı oturum açmış, sepet güncelleniyor...');
                    // Sepet içeriğini güncelle
                    updateCartUI();
                    updateCartCount();
                    
                    try {
                        // Sepet değişikliklerini dinle (global Firebase kullanımı)
                        // Gerçek zamanlı dinleyici devre dışı bırakıldı - sepet silme sorunu için
                        // if (typeof firebase !== 'undefined' && firebase.firestore) {
                        //     const cartRef = firebase.firestore().collection('carts').doc(user.uid);
                        //     cartRef.onSnapshot(function(doc) {
                        //         console.log('Sepet verisi değişti (global), sepet güncelleniyor...');
                        //         updateCartUI();
                        //         updateCartCount();
                        //     });
                        // }
                        console.log('Gerçek zamanlı dinleyici devre dışı bırakıldı (global) - sepet silme sorunu için');
                    } catch (error) {
                        console.error('Sepet dinleyicisi oluşturulurken hata (global):', error);
                    }
                }
            });
        } else if (typeof getAuth === 'function') {
            console.log('Modüler Firebase kullanılıyor...');
            // Modüler Firebase kullanımı
            const auth = getAuth();
            onAuthStateChanged(auth, function(user) {
                if (user) {
                    console.log('Kullanıcı oturum açmış (modüler), sepet güncelleniyor...');
                    // Sepet içeriğini güncelle
                    updateCartUI();
                    updateCartCount();
                    
                    try {
                        // Modüler Firebase gerçek zamanlı dinleyici devre dışı bırakıldı - sepet silme sorunu için
                        // import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')
                        //     .then((firestore) => {
                        //         const { onSnapshot } = firestore;
                        //         const cartRef = doc(db, 'carts', user.uid);
                        //         onSnapshot(cartRef, (docSnapshot) => {
                        //             console.log('Sepet verisi değişti (modüler), sepet güncelleniyor...');
                        //             updateCartUI();
                        //             updateCartCount();
                        //         });
                        //     })
                        //     .catch(error => {
                        //         console.error('Modüler Firebase import hatası:', error);
                        //     });
                        console.log('Gerçek zamanlı dinleyici devre dışı bırakıldı (modüler) - sepet silme sorunu için');
                    } catch (error) {
                        console.error('Sepet dinleyicisi oluşturulurken hata (modüler):', error);
                    }
                }
            });
        }
    } catch (error) {
        console.error('Sepet yüklenirken hata:', error);
    }
});

// Sepet değişikliklerini dinle (sayfalar arası eşzamanlılık için)
window.addEventListener('cartUpdated', function() {
    // Sepet güncellendi
    updateCartUI();
    updateCartCount();
});

// Global değişkenlere ata (diğer dosyalardan erişilebilmesi için)
window.updateCartUI = updateCartUI;
window.updateCartCount = updateCartCount;
window.toggleCart = toggleCart;
window.removeFromCart = removeFromCart;
window.updateCartItemQuantity = updateCartItemQuantity;
window.clearCart = clearCart;

// customer-payment.js - Firestore tabanlı ödeme sayfası işlevleri

// --- ADRES DROPDOWNLARI ---
document.addEventListener('DOMContentLoaded', async function() {
    // Kullanıcıyı kontrol et
    let user = null;
    try {
        user = firebase.auth().currentUser;
        if (!user) {
            await new Promise(resolve => {
                const unsubscribe = firebase.auth().onAuthStateChanged(u => {
                    if (u) {
                        user = u;
                        unsubscribe();
                        resolve();
                    }
                });
            });
        }
    } catch (e) { console.error('Kullanıcı alınamadı:', e); }
    if (!user) return;

    // Firestore referansı
    const db = firebase.firestore();
    // Teslimat ve fatura adreslerini çek
    let deliveryAddresses = [];
    let invoiceAddresses = [];
    let deliveryAddressObjs = [];
    let invoiceAddressObjs = [];
    try {
        const addressSnap = await db.collection('users').doc(user.uid).collection('addresses').get();
        addressSnap.forEach(doc => {
            const addr = doc.data();
            // Adres stringini oluştur (kart formatına benzer)
            const formatted =
    (addr.neighborhood ? addr.neighborhood + ', ' : '') +
    (addr.street ? addr.street + ', ' : '') +
    (addr.buildingNumber ? 'Bina No: ' + addr.buildingNumber + ', ' : '') +
    (addr.apartmentNumber ? 'Kat: ' + addr.apartmentNumber + ', ' : '') +
    (addr.doorNumber ? 'Daire: ' + addr.doorNumber + ', ' : '') +
    (addr.details ? addr.details + ', ' : '') +
    (addr.district ? addr.district + '/' : '') +
    (addr.city ? addr.city : '');
            if (addr.type === 'delivery') {
                deliveryAddresses.push(formatted);
                deliveryAddressObjs.push(addr);
            } else if (addr.type === 'billing' || addr.type === 'invoice') {
                invoiceAddresses.push(formatted);
                invoiceAddressObjs.push(addr);
            }
        });
        // Adres objelerini global olarak kaydet
        if (window.setAddressObjectsForDropdowns) {
            window.setAddressObjectsForDropdowns(deliveryAddressObjs, invoiceAddressObjs);
        }
    } catch (err) { console.error('Adresler alınamadı:', err); }

    // Eğer hiç adres yoksa uyarı ekle
    if (deliveryAddresses.length === 0) deliveryAddresses = ['Kayıtlı teslimat adresi yok'];
    if (invoiceAddresses.length === 0) invoiceAddresses = ['Kayıtlı fatura adresi yok'];

    // setupDropdown fonksiyonunu çağır
    if (typeof setupDropdown === 'function') {
        setupDropdown('delivery-address-dropdown', 'delivery-address-list', 'delivery-address-selected', deliveryAddresses);
        setupDropdown('invoice-address-dropdown', 'invoice-address-list', 'invoice-address-selected', invoiceAddresses);
    } else {
        // Fonksiyon HTML içindeyse window üzerinden çağır
        if (window.setupDropdown) {
            window.setupDropdown('delivery-address-dropdown', 'delivery-address-list', 'delivery-address-selected', deliveryAddresses);
            window.setupDropdown('invoice-address-dropdown', 'invoice-address-list', 'invoice-address-selected', invoiceAddresses);
        }
    }

    // Seçilen adresi kaydetmek için event ekle (örnek: data-value attribute)
    const deliverySelected = document.getElementById('delivery-address-selected');
    const invoiceSelected = document.getElementById('invoice-address-selected');
    // Adres objelerini dropdown'a map'le
let deliveryAddressObjects = [];
let invoiceAddressObjects = [];

// Adresleri objelerle birlikte sakla (adres doldurma kısmında doldurulacak)
window.setAddressObjectsForDropdowns = function(deliveryObjs, invoiceObjs) {
    deliveryAddressObjects = deliveryObjs;
    invoiceAddressObjects = invoiceObjs;
};

if (deliverySelected) {
    deliverySelected.addEventListener('DOMSubtreeModified', function() {
        const selectedText = deliverySelected.getAttribute('data-value') || deliverySelected.textContent;
        // Objeyi bul
        let selectedObj = deliveryAddressObjects.find(addr => {
            // Kart formatı ile eşleşen objeyi bul
            const formatted =
    (addr.neighborhood ? addr.neighborhood + ', ' : '') +
    (addr.street ? addr.street + ', ' : '') +
    (addr.buildingNumber ? 'Bina No: ' + addr.buildingNumber + ', ' : '') +
    (addr.apartmentNumber ? 'Kat: ' + addr.apartmentNumber + ', ' : '') +
    (addr.doorNumber ? 'Daire: ' + addr.doorNumber + ', ' : '') +
    (addr.details ? addr.details + ', ' : '') +
    (addr.district ? addr.district + '/' : '') +
    (addr.city ? addr.city : '');
            return formatted.trim() === selectedText.trim();
        });
        if (selectedObj) {
            localStorage.setItem('selectedDeliveryAddressObj', JSON.stringify(selectedObj));
        }
        localStorage.setItem('selectedDeliveryAddress', selectedText);
    });
}
if (invoiceSelected) {
    invoiceSelected.addEventListener('DOMSubtreeModified', function() {
        const selectedText = invoiceSelected.getAttribute('data-value') || invoiceSelected.textContent;
        // Objeyi bul
        let selectedObj = invoiceAddressObjects.find(addr => {
            const formatted =
    (addr.neighborhood ? addr.neighborhood + ', ' : '') +
    (addr.street ? addr.street + ', ' : '') +
    (addr.buildingNumber ? 'Bina No: ' + addr.buildingNumber + ', ' : '') +
    (addr.apartmentNumber ? 'Kat: ' + addr.apartmentNumber + ', ' : '') +
    (addr.doorNumber ? 'Daire: ' + addr.doorNumber + ', ' : '') +
    (addr.details ? addr.details + ', ' : '') +
    (addr.district ? addr.district + '/' : '') +
    (addr.city ? addr.city : '');
            return formatted.trim() === selectedText.trim();
        });
        if (selectedObj) {
            localStorage.setItem('selectedInvoiceAddressObj', JSON.stringify(selectedObj));
        }
        localStorage.setItem('selectedInvoiceAddress', selectedText);
    });
}
});

// Global Firebase kullanımı için herhangi bir import yapmıyoruz
// Bunun yerine HTML'de yüklenen firebase-app-compat.js, firebase-auth-compat.js ve firebase-firestore-compat.js kullanılacak

console.log('customer-payment.js yükleniyor...');

// Stok rezervasyonu için global değişkenler
let stockReservationId = null; // Rezervasyon ID'si
let stockReservationTimer = null; // Rezervasyon zamanlayıcısı
window.paymentCompleted = false; // Ödeme tamamlandıysa true olacak
const RESERVATION_DURATION = 15 * 60 * 1000; // 15 dakika (milisaniye cinsinden)

// LocalStorage anahtarları
const RESERVATION_ID_KEY = 'stockReservationId';
const RESERVATION_EXPIRY_KEY = 'stockReservationExpiry';

// Yu00fckleniyor ekranu0131nu0131 gizle
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('auth-loading');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 1000);
    }
}

// Fiyatu0131 Tu00fcrk Lirasu0131 formatu0131nda gu00f6ster, TL eklemesi ile
function formatPrice(price) {
    return price.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' TL';
}

// Sipariu015f u00f6zetini Firestore'dan al ve gu00f6ster
async function loadOrderSummary() {
    console.log('Sipariu015f u00f6zeti yu00fckleniyor...');
    const summaryContainer = document.getElementById('order-summary');
    if (!summaryContainer) {
        console.error('Sipariu015f u00f6zeti container bulunamadu0131');
        return;
    }

    // Kullanu0131cu0131 kontrolu00fc - bu noktada kullanu0131cu0131 zaten onAuthStateChanged tarafu0131ndan kontrol edilmiu015f olmalu0131
    const user = firebase.auth().currentUser;
    
    // Ekstra kontrol - kullanu0131cu0131 yoksa iu015flemi sonlandu0131r
    if (!user) {
        console.log('Kullanu0131cu0131 bulunamadu0131, iu015flem yapu0131lamu0131yor...');
        summaryContainer.innerHTML = '<p class="empty-cart">Kullanıcı bilgisi alınamadı</p>';
        return;
    }

    // Kullanu0131cu0131nu0131n sepetini al
    let cartData = null;
    let subtotal = 0;
    let cartItems = [];
    
    try {
        // Global Firebase kullan
        const cartRef = firebase.firestore().collection('carts').doc(user.uid);
        const cartSnap = await cartRef.get();
        
        if (cartSnap.exists) {
            cartData = cartSnap.data();
            
            // Sepet u00f6u011felerini al
            if (cartData.items && cartData.items.length > 0) {
                cartItems = cartData.items;
                subtotal = cartData.items.reduce((total, item) => {
                    return total + (item.price * item.quantity);
                }, 0);
            }
        }
    } catch (error) {
        console.error('Sepet verisi alu0131nu0131rken hata:', error);
        summaryContainer.innerHTML = '<p class="error-cart">Sepet verisi alınırken hata oluştu</p>';
        return;
    }

    // Sepet bou015fsa mesaj gu00f6ster
    if (cartItems.length === 0) {
        summaryContainer.innerHTML = '<p class="empty-cart">Sepetinizde ürün bulunmamaktadır.</p>';
        return;
    }

    // u00dcru00fcn verilerini u00e7ek
    let productPromises = [];
    let productDocs = [];
    
    try {
        // Global Firebase kullan
        productPromises = cartItems.map(item => firebase.firestore().collection('products').doc(item.productId).get());
        productDocs = await Promise.all(productPromises);
    } catch (error) {
        console.error('u00dcru00fcn verileri alu0131nu0131rken hata:', error);
        summaryContainer.innerHTML = '<div class="error-cart">u00dcru00fcn verileri alu0131nu0131rken hata oluu015ftu</div>';
        return;
    }

    // Kargo u00fccreti hesapla
    const SHIPPING_THRESHOLD = 1000; // 1000 TL ve u00fczeri alu0131u015fveriu015flerde kargo bedava
    const SHIPPING_COST = 49.99; // Kargo u00fccreti
    const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const total = subtotal + shipping;

    // Sipariu015f u00f6zeti HTML'ini oluu015ftur
    const summaryHTML = `
        <div class="order-summary-container" style="border-top: none;">
            <div class="order-items">
                ${cartItems.map((item, index) => {
                    const productDoc = productDocs[index];
                    if (!productDoc.exists) return '';
                    
                    const productData = productDoc.data();
                    
                    // Varyant görseli için kontrol
                    let productImage = productData.image; // Varsayılan görsel
                    
                    // Varyant görselini bul
                    if (item.variants && Object.keys(item.variants).length > 0 && productData.variantImages) {
                        // Varyant anahtarını oluştur (örn: 'Siyah-16 GB')
                        const variantValues = [];
                        
                        // Ürün varyantlarını kontrol et
                        if (productData.variants && productData.variants.length > 0) {
                            // Varyant sırasını korumak için ürün varyantlarını kullan
                            productData.variants.forEach(variant => {
                                const variantName = variant.name;
                                if (item.variants[variantName]) {
                                    variantValues.push(item.variants[variantName]);
                                }
                            });
                        } else {
                            // Varyant sırası bilinmiyorsa alfabetik sırala
                            const variantKeys = Object.keys(item.variants).sort();
                            variantKeys.forEach(key => {
                                variantValues.push(item.variants[key]);
                            });
                        }
                        
                        // Varyant anahtarını oluştur
                        const variantKey = variantValues.join('-');
                        console.log('Aranan varyant anahtarı:', variantKey);
                        
                        // Varyant görseli varsa kullan
                        if (productData.variantImages && productData.variantImages[variantKey]) {
                            productImage = productData.variantImages[variantKey];
                            console.log('Varyant görseli bulundu:', variantKey);
                        }
                    }
                    
                    // Varyant bilgilerini oluu015ftur
                    let variantHTML = '';
                    if (item.variants && Object.keys(item.variants).length > 0) {
                        // u00dcru00fcnu00fcn varyant tanu0131mlaru0131nu0131 al
                        const productVariants = productData.variants || [];
                        
                        if (productVariants.length > 0) {
                            // u00dcru00fcn sayfasu0131ndaki varyant su0131rasu0131na gu00f6re varyant bilgilerini oluu015ftur
                            variantHTML = productVariants
                                .map(variant => {
                                    const name = variant.name;
                                    const value = item.variants[name];
                                    if (value) {
                                        return `<p style="font-size: 1.05rem;"><b style="color: #dbb848;">${name.charAt(0).toUpperCase() + name.slice(1)}:</b> <span style="color: #ffffff;">${value}</span></p>`;
                                    }
                                    return '';
                                })
                                .filter(info => info !== '') // Bou015f deu011ferleri filtrele
                                .join('');
                        } else {
                            // u00dcru00fcn varyant tanu0131mu0131 yoksa, mevcut varyant deu011ferlerini kullan
                            variantHTML = Object.entries(item.variants)
                                .map(([name, value]) => `<p style="font-size: 1.05rem;"><b style="color: #dbb848;">${name.charAt(0).toUpperCase() + name.slice(1)}:</b> <span style="color: #ffffff;">${value}</span></p>`)
                                .join('');
                        }
                    }
                    
                    return `
                    <div class="order-item" style="padding: 0 20px;">
                        <div class="item-info" style="margin-left: 5px; display: flex; align-items: flex-start; position: relative; left: -5px;">
                            <img src="${productImage}" alt="${productData.name}" class="item-image" style="margin-right: 20px;">
                            <div class="item-details">
                                <h4 style="font-size: 1.2rem;">${productData.name}</h4>
                                <p style="font-size: 1.1rem;">Adet: ${item.quantity}</p>
                                <p style="font-size: 1.1rem;">Birim Fiyat: ${formatPrice(item.price)}</p>
                                ${variantHTML}
                            </div>
                        </div>
                        <div class="item-total" style="font-size: 1.2rem; font-weight: bold; ">
                            ${formatPrice(item.price * item.quantity)}
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
            <div class="order-totals" style="padding: 15px 0;">
                <div class="subtotal" style="font-size: 1.1rem; padding: 0 20px; border-top: none;">
                    <span>Ara Toplam:</span>
                    <span>${formatPrice(subtotal)}</span>
                </div>
                <div class="shipping" style="font-size: 1.1rem; padding: 0 20px;">
                    <span>Kargo:</span>
                    <span id="shipping">${shipping === 0 ? "<span style='color:#2ecc71;font-weight:bold;'>Ücretsiz!</span>" : formatPrice(shipping)}</span>
                </div>
                <div class="total" style="font-size: 1.3rem; font-weight: bold; padding: 0 20px; margin-top: 10px; padding-top: 10px;">
                    <span>Toplam:</span>
                    <span>${formatPrice(total)}</span>
                </div>
            </div>
        </div>
    `;

    // HTML'i sayfaya ekle
    summaryContainer.innerHTML = summaryHTML;
}

// Sepet sayısını güncelle - gerçek zamanlı dinleyici ile
let cartCountUnsubscribe = null; // Dinleyici referansı

async function updateCartCount(userId) {
    try {
        const cartCountElement = document.querySelector('.cart-count');
        if (!cartCountElement) return;
        
        // Önce mevcut dinleyiciyi temizle
        if (cartCountUnsubscribe) {
            cartCountUnsubscribe();
            cartCountUnsubscribe = null;
        }
        
        // Görünürlük ayarı - display: none olmamalı
        cartCountElement.style.display = '';
        
        // Kullanıcının sepetini al
        const user = firebase.auth().currentUser;
        if (!user) {
            cartCountElement.textContent = '0';
            return;
        }
        
        // Gerçek zamanlı dinleyici ekle
        const cartRef = firebase.firestore().collection('carts').doc(user.uid);
        cartCountUnsubscribe = cartRef.onSnapshot(snapshot => {
            if (snapshot.exists && snapshot.data().items) {
                const cartItems = snapshot.data().items || [];
                
                // Toplam ürün adedini hesapla (miktarı dikkate alarak)
                const totalQuantity = cartItems.reduce((total, item) => {
                    return total + (parseInt(item.quantity) || 1);
                }, 0);
                
                cartCountElement.textContent = totalQuantity;
                console.log('Sepet sayısı gerçek zamanlı güncellendi (payment):', totalQuantity);
            } else {
                cartCountElement.textContent = '0';
            }
        }, error => {
            console.error('Sepet dinleyici hatası:', error);
            cartCountElement.textContent = '0';
        });
    } catch (error) {
        console.error('Sepet sayısı güncellenirken hata:', error);
        if (cartCountElement) cartCountElement.textContent = '0';
    }
}

// Stok rezervasyonu oluşturma fonksiyonu
async function createStockReservation(cartItems) {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.error('Kullanıcı giriş yapmamış, stok rezervasyonu oluşturulamaz');
        return null;
    }
    
    let reservationId = null;
    let reservationRef = null;
    
    try {
        console.log('Stok rezervasyonu oluşturuluyor...');
        
        // Kullanıcının mevcut aktif rezervasyonunu kontrol et
        const existingReservationId = await getStockReservationId();
        if (existingReservationId) {
            console.log('Kullanıcının zaten aktif bir rezervasyonu var:', existingReservationId);
            return existingReservationId;
        }
        
        // Sepet boşsa rezervasyon oluşturma
        if (!cartItems || cartItems.length === 0) {
            console.log('Sepet boş, rezervasyon oluşturulmadı');
            return null;
        }
        
        // Firestore'a doğrudan erişim
        const db = firebase.firestore();
        
        // Koleksiyonun varlığını kontrol et ve gerekirse oluştur (senkron olarak)
        try {
            await db.collection('stockReservations').doc('collection_info').set({
                created: firebase.firestore.FieldValue.serverTimestamp(),
                info: 'Bu belge, stockReservations koleksiyonunun oluşturulduğundan emin olmak için oluşturulmuştur.'
            }, { merge: true });
            console.log('stockReservations koleksiyonu kontrol edildi/oluşturuldu');
        } catch (collectionError) {
            console.error('Koleksiyon kontrolü sırasında hata:', collectionError);
            // Hata durumunda devam et, belki koleksiyon zaten vardır
        }
        
        // Rezervasyon belgesini oluştur (senkron olarak)
        reservationRef = db.collection('stockReservations').doc();
        reservationId = reservationRef.id;
        
        // Rezervasyon verilerini hazırla
        const reservationData = {
            userId: user.uid,
            userEmail: user.email,
            items: [],  // Boş başla, sonra güncelleyeceğiz
            status: 'active',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + RESERVATION_DURATION)
        };
        
        // Önce rezervasyon belgesini oluştur
        await reservationRef.set(reservationData);
        console.log('Stok rezervasyonu oluşturuldu, ID:', reservationId);
        
        // Rezervasyon bilgilerini localStorage'a kaydet
        localStorage.setItem(RESERVATION_ID_KEY, reservationId);
        localStorage.setItem(RESERVATION_EXPIRY_KEY, reservationData.expiresAt.getTime().toString());
        
        // LOG: Rezervasyon oluşturulduğunda expiry ve sistem saati
        console.log('[REZERVASYON OLUŞTURULDU] ŞU AN:', new Date().toISOString(), 'Bitiş:', reservationData.expiresAt.toISOString());
        
        // Stok güncellemelerini yap
        const batch = db.batch();
        const processedProductIds = new Set(); // İşlenmiş ürün ID'lerini takip et
        const reservedItems = []; // Rezerve edilen ürünleri takip et
        
        // Sepet öğelerinin yapısını logla
        console.log('Sepet öğeleri:', JSON.stringify(cartItems, null, 2));
        
        // Her sepet öğesi için stok güncelle
        for (const item of cartItems) {
            // NOT: Aynı ürünün farklı varyantlarını işlemek için processedProductIds kontrolünü kaldırdık
            // Bu sayede aynı ürünün farklı varyantları (beyaz, siyah gibi) ayrı ayrı işlenebilecek
            
            try {
                const productRef = db.collection('products').doc(item.productId);
                const productDoc = await productRef.get();
                
                if (!productDoc.exists) {
                    console.log(`Ürün bulunamadı: ${item.productId}`);
                    continue;
                }
                
                const productData = productDoc.data();
                console.log(`Ürün verileri (${item.productId}):`, JSON.stringify(productData, null, 2));
                
                // Varyant kontrolü yap
                if (item.variants && Object.keys(item.variants).length > 0) {
                    console.log('Varyantlı ürün tespit edildi:', item.productId);
                    console.log('Varyant bilgileri:', item.variants);
                    
                    // Ürünün stok yapısını kontrol et
                    if (!productData.stock || typeof productData.stock !== 'object') {
                        console.log(`Ürünün stok yapısı uygun değil:`, productData.stock);
                        continue;
                    }
                    
                    // Mevcut stok anahtarlarını al
                    const stockKeys = Object.keys(productData.stock);
                    console.log('Mevcut stok anahtarları:', stockKeys);
                    
                    // BASITLEŞTİRİLMİŞ YAKLAŞIM: Varyant anahtarını doğrudan kullan
                    let stockKey = null;
                    let currentStock = 0;
                    
                    // Önemli: Varyant değerlerini tam olarak kullan
                    console.log('Varyant değerleri:', item.variants);
                    
                    // Varyant değerlerini doğrudan kullan
                    const variantValues = [];
                    for (const value of Object.values(item.variants)) {
                        variantValues.push(value);
                    }
                    
                    // Varyant anahtarını oluştur
                    const exactVariantKey = variantValues.join('-');
                    console.log('Tam varyant anahtarı:', exactVariantKey);
                    
                    // Stok anahtarlarının varyant değerlerini analiz et
                    const stockKeyVariants = {};
                    for (const key of stockKeys) {
                        const keyParts = key.split('-');
                        stockKeyVariants[key] = keyParts;
                    }
                    console.log('Stok anahtarı varyantları:', stockKeyVariants);
                    
                    // ADIM 1: Büyük/küçük harf duyarsız varyant değerlerini hazırla
                    const lowerVariantValues = variantValues.map(v => v.toLowerCase());
                    console.log('Küçük harf varyant değerleri:', lowerVariantValues);
                    
                    // ADIM 2: Stok anahtarlarını büyük/küçük harf duyarsız hale getir
                    const lowerStockKeyVariants = {};
                    for (const [key, parts] of Object.entries(stockKeyVariants)) {
                        lowerStockKeyVariants[key] = parts.map(p => p.toLowerCase());
                    }
                    console.log('Küçük harf stok anahtarı varyantları:', lowerStockKeyVariants);
                    
                    // ADIM 3: Varyant değerlerini tam olarak içeren anahtarı bul
                    let exactMatch = false;
                    for (const [key, lowerParts] of Object.entries(lowerStockKeyVariants)) {
                        // Tüm varyant değerlerinin stok anahtarında olup olmadığını kontrol et
                        let allValuesMatch = true;
                        for (const value of lowerVariantValues) {
                            if (!lowerParts.includes(value)) {
                                allValuesMatch = false;
                                break;
                            }
                        }
                        
                        // Stok anahtarındaki tüm parçaların varyant değerlerinde olup olmadığını kontrol et
                        let allPartsMatch = true;
                        for (const part of lowerParts) {
                            if (!lowerVariantValues.includes(part)) {
                                allPartsMatch = false;
                                break;
                            }
                        }
                        
                        // Tam eşleşme bulundu
                        if (allValuesMatch && allPartsMatch) {
                            exactMatch = key;
                            console.log(`TAM EŞLEŞME BULUNDU: ${key} (Büyük/küçük harf duyarsız)`);
                            break;
                        }
                    }
                    
                    // ADIM 4: Alternatif anahtarlar oluştur
                    // Sıralı öncelik: Tam eşleşme > Doğrudan anahtar > Sıralanmış varyant değerleri > İçerik bazlı eşleşme
                    const possibleKeys = [];
                    
                    // 1. Tam eşleşme bulunduysa en yüksek öncelikli
                    if (exactMatch) {
                        possibleKeys.push(exactMatch);
                    }
                    
                    // 2. Standart varyant anahtarı
                    possibleKeys.push(exactVariantKey);
                    
                    // 3. Sıralanmış varyant değerleri (alfabetik sıralama)
                    const sortedVariantKey = [...variantValues].sort().join('-');
                    if (!possibleKeys.includes(sortedVariantKey)) {
                        possibleKeys.push(sortedVariantKey);
                    }
                    
                    console.log('Denenecek anahtar sıralaması:', possibleKeys);
                    
                    // ADIM 5: Doğrudan eşleşme ara
                    for (const key of possibleKeys) {
                        if (productData.stock[key] !== undefined) {
                            stockKey = key;
                            currentStock = productData.stock[key];
                            console.log(`DOĞRUDAN ANAHTAR EŞLEŞMESİ: ${stockKey}, Stok: ${currentStock}`);
                            break;
                        }
                    }
                    
                    // ADIM 6: Büyük/küçük harf duyarsız kontrol
                    if (!stockKey) {
                        for (const possibleKey of possibleKeys) {
                            const lowerPossibleKey = possibleKey.toLowerCase();
                            
                            for (const existingKey of stockKeys) {
                                if (existingKey.toLowerCase() === lowerPossibleKey) {
                                    stockKey = existingKey;
                                    currentStock = productData.stock[existingKey];
                                    console.log(`BÜYÜK/KÜÇÜK HARF DUYARSIZ EŞLEŞME: ${stockKey}, Stok: ${currentStock}`);
                                    break;
                                }
                            }
                            
                            if (stockKey) break;
                        }
                    }
                    
                    // ADIM 7: İçerik bazlı eşleşme - Varyant değerlerini içeren herhangi bir anahtar
                    if (!stockKey) {
                        // Varyant değerlerini içeren anahtarları bul
                        const containingKeys = [];
                        
                        for (const existingKey of stockKeys) {
                            const lowerExistingKey = existingKey.toLowerCase();
                            let containsAllValues = true;
                            
                            for (const value of lowerVariantValues) {
                                if (!lowerExistingKey.includes(value.toLowerCase())) {
                                    containsAllValues = false;
                                    break;
                                }
                            }
                            
                            if (containsAllValues) {
                                containingKeys.push(existingKey);
                            }
                        }
                        
                        if (containingKeys.length > 0) {
                            stockKey = containingKeys[0]; // İlk eşleşeni al
                            currentStock = productData.stock[stockKey];
                            console.log(`İÇERİK BAZLI EŞLEŞME: ${stockKey}, Stok: ${currentStock}`);
                        }
                    }
                    
                    // Son çare: Herhangi bir eşleşme bulunamadıysa, ilk stok anahtarını kullan
                    if (!stockKey && stockKeys.length > 0) {
                        stockKey = stockKeys[0];
                        currentStock = productData.stock[stockKey];
                        console.log(`Eşleşme bulunamadı, ilk stok anahtarı kullanılıyor: ${stockKey}, Stok: ${currentStock}`);
                    }
                    
                    // Stok anahtarı bulunduysa güncelle
                    if (stockKey) {
                        const reservedQuantity = item.quantity;
                        
                        // Stok kontrolü
                        if (currentStock < reservedQuantity) {
                            console.log(`Stok yetersiz: ${productData.name}, Varyant: ${stockKey}, Mevcut: ${currentStock}, İstenen: ${reservedQuantity}`);
                            continue; // Bu ürünü rezerve etme
                        }
                        
                        const newStock = Math.max(0, currentStock - reservedQuantity);
                        
                        // Stok nesnesini güncelle - TEMEL SORUN BURADA OLABİLİR
                        // Derin kopya oluşturarak değişikliklerin kaybolmamasını sağlayalım
                        const updatedStock = JSON.parse(JSON.stringify(productData.stock));
                        updatedStock[stockKey] = newStock;
                        
                        // Batch'e güncellemeyi ekle - İKİ YÖNTEM KULLANARAK
                        // 1. DOĞRUDAN ALAN GÜNCELLEME - Daha güvenilir
                        batch.update(productRef, { [`stock.${stockKey}`]: newStock });
                        
                        // 2. TÜM STOK NESNESİNİ GÜNCELLEME - Yedek yöntem
                        batch.update(productRef, { stock: updatedStock });
                        
                        console.log(`Varyant stok rezerve edildi: ${stockKey} => ${currentStock} -> ${newStock}`);
                        console.log(`Stok güncellemesi için kullanılan anahtar: ${stockKey}`);
                        console.log(`Güncellenmiş stok nesnesi:`, updatedStock);
                        
                        // Rezerve edilen ürünü listeye ekle
                        reservedItems.push({
                            productId: item.productId,
                            productName: productData.name,
                            variants: item.variants,
                            quantity: reservedQuantity,
                            stockKey: stockKey,
                            currentStock: currentStock,
                            price: item.price || 0
                        });
                    } else {
                        console.log(`Hiçbir varyant anahtarı eşleşmesi bulunamadı, stok güncellenemiyor: ${item.productId}`);
                    }
                } else {
                    // Basit stok güncelleme (varyantsiz ürünler için)
                    if (productData.stock !== undefined) {
                        const currentStock = productData.stock || 0;
                        const reservedQuantity = item.quantity;
                        
                        // Stok kontrolü
                        if (currentStock < reservedQuantity) {
                            console.log(`Stok yetersiz: ${productData.name}, Mevcut: ${currentStock}, İstenen: ${reservedQuantity}`);
                            continue; // Bu ürünü rezerve etme
                        }
                        
                        const newStock = Math.max(0, currentStock - reservedQuantity);
                        
                        // Batch'e güncellemeyi ekle - Daha güvenilir yöntem
                        // Doğrudan stok alanını güncelle
                        batch.update(productRef, { stock: newStock });
                        console.log(`Ürün stoğu rezerve edildi: ${item.productId} => ${currentStock} -> ${newStock}`);
                        console.log(`Varyantsız ürün için stok güncellemesi yapıldı: ${item.productId}`);
                        
                        // Rezerve edilen ürünü listeye ekle
                        reservedItems.push({
                            productId: item.productId,
                            productName: productData.name,
                            quantity: reservedQuantity,
                            stockKey: 'default',
                            currentStock: currentStock,
                            price: item.price || 0
                        });
                    }
                }
            } catch (productError) {
                console.error(`Ürün stok güncellemesi sırasında hata (${item.productId}):`, productError);
            }
        }
        
        // Batch işlemini gerçekleştir (senkron olarak) - Güvenilir hale getirildi
        try {
            await batch.commit();
            console.log('Tüm stok güncellemeleri tamamlandı');
            
            // Stok güncellemelerinin başarılı olduğunu doğrula
            for (const item of cartItems) {
                try {
                    const productRef = firebase.firestore().collection('products').doc(item.productId);
                    const updatedDoc = await productRef.get();
                    
                    if (updatedDoc.exists) {
                        const updatedData = updatedDoc.data();
                        console.log(`Ürün ${item.productId} - Güncel stok durumu:`, updatedData.stock);
                    }
                } catch (verifyError) {
                    console.error(`Stok doğrulama hatası (${item.productId}):`, verifyError);
                }
            }
        } catch (commitError) {
            console.error('Batch commit sırasında hata:', commitError);
            
            // Hata durumunda tek tek güncelleme dene
            console.log('Tek tek güncelleme deneniyor...');
            for (const item of cartItems) {
                try {
                    const productRef = firebase.firestore().collection('products').doc(item.productId);
                    const productDoc = await productRef.get();
                    
                    if (productDoc.exists) {
                        const productData = productDoc.data();
                        
                        if (item.variants && Object.keys(item.variants).length > 0) {
                            // Varyant anahtarını bul
                            const stockKey = await findVariantStockKey(productData, item.variants);
                            
                            if (stockKey) {
                                const currentStock = productData.stock[stockKey] || 0;
                                const newStock = Math.max(0, currentStock - item.quantity);
                                
                                // DOĞRUDAN ALAN GÜNCELLEME
                                await productRef.update({ [`stock.${stockKey}`]: newStock });
                                console.log(`Tek tek güncelleme başarılı: ${stockKey} => ${newStock}`);
                            }
                        } else if (productData.stock !== undefined) {
                            // Varyantsız ürün güncelleme
                            const currentStock = productData.stock || 0;
                            const newStock = Math.max(0, currentStock - item.quantity);
                            
                            await productRef.update({ stock: newStock });
                            console.log(`Varyantsız ürün tek tek güncelleme başarılı: ${item.productId} => ${newStock}`);
                        }
                    }
                } catch (singleUpdateError) {
                    console.error(`Tek tek güncelleme hatası (${item.productId}):`, singleUpdateError);
                }
            }
        }
        
        // Rezervasyon belgesini güncelle (rezerve edilen ürünleri ekle)
        await reservationRef.update({
            items: reservedItems,
            stockUpdated: true,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Rezervasyon belgesi güncellendi, rezerve edilen ürün sayısı:', reservedItems.length);
        
        return reservationId;
    } catch (error) {
        console.error('Stok rezervasyonu oluşturulurken hata:', error);
    }
}

// Stok rezervasyonunu iptal etme fonksiyonu
// Stok rezervasyonunu iptal etme fonksiyonu
async function cancelStockReservation(reservationId, reason) {
    if (!reason) {
        reason = 'Belirtilmedi';
        console.warn('[İPTAL LOG] cancelStockReservation fonksiyonuna anlamlı bir reason verilmedi, "Belirtilmedi" olarak işaretlendi.');
    }
    console.log(`[İPTAL LOG] cancelStockReservation çağrıldı, Sebep: ${reason}, Rezervasyon ID:`, reservationId);
// Türkçe açıklama: Bu fonksiyon sadece zamanlayıcı süresi dolduğunda, kullanıcı sayfadan ayrılmak istediğinde veya ödeme başarısız olduğunda çağrılmalı. "Bilinmiyor" gibi genel bir reason kullanılmamalı.
    if (!reservationId || typeof reservationId !== 'string') {
        console.error('Rezervasyon ID geçersiz:', reservationId, typeof reservationId);
        return { success: false, error: 'Rezervasyon ID geçersiz veya bulunamadı' };
    }
    
    console.log('Stok rezervasyonu iptal ediliyor:', reservationId);
    
    try {
        // Firestore referansı
        const db = firebase.firestore();
        const batch = db.batch(); // Toplu işlem başlat
        
        // Rezervasyon belgesini al
        const reservationRef = db.collection('stockReservations').doc(reservationId);
        const reservationDoc = await reservationRef.get();
        
        if (!reservationDoc.exists) {
            console.error('Rezervasyon belgesi bulunamadı:', reservationId);
            return { success: false, error: 'Rezervasyon belgesi bulunamadı' };
        }
        
        const reservationData = reservationDoc.data();
        console.log('Rezervasyon verileri alındı');
        
        // Sadece aktif rezervasyonlar iptal edilsin
        if (reservationData.status !== 'active') {
            console.log('Rezervasyon zaten iptal edilmiş veya onaylanmış:', reservationData.status);
            return { success: false, error: 'Rezervasyon aktif değil' };
        }
        
        if (!reservationData || !reservationData.items || !Array.isArray(reservationData.items)) {
            console.error('Rezervasyon öğeleri bulunamadı veya geçersiz format');
            return { success: false, error: 'Geçersiz rezervasyon verisi' };
        }
        
        // Rezervasyon durumunu güncelle
        batch.update(reservationRef, { 
            status: 'cancelled',
            cancelledAt: firebase.firestore.FieldValue.serverTimestamp() 
        });
        
        console.log('Rezervasyon durumu güncelleniyor...');
        
        const successfulUpdates = [];
        const failedUpdates = [];
        
        // Her ürün için stokları geri yükle
        for (const item of reservationData.items) {
            if (!item.productId || !item.stockKey) {
                console.error('Geçersiz rezervasyon öğesi:', item);
                failedUpdates.push(item);
                continue;
            }
            
            try {
                const productRef = db.collection('products').doc(item.productId);
                const productDoc = await productRef.get();
                
                if (!productDoc.exists) {
                    console.error(`Ürün bulunamadı: ${item.productId}`);
                    failedUpdates.push(item);
                    continue;
                }
                
                const productData = productDoc.data();
                const quantity = item.quantity || 1;

                // Varyantlı mı, varyantsız mı kontrolü
                if (typeof productData.stock === 'object' && item.stockKey) {
                    // Varyantlı ürün
                    const stockFields = productData.stock || {};
                    const currentStock = stockFields[item.stockKey] || 0;
                    const newStock = currentStock + quantity;

                    console.log(`(VARYANTLI) Stok güncelleniyor: ${item.productId}, ${item.stockKey}, ${currentStock} -> ${newStock}`);
                    batch.update(productRef, { [`stock.${item.stockKey}`]: newStock });

                    successfulUpdates.push({
                        ...item,
                        oldStock: currentStock,
                        newStock: newStock,
                        verified: true
                    });
                } else if (typeof productData.stock === 'number') {
                    // Varyantsız ürün
                    const currentStock = productData.stock || 0;
                    const newStock = currentStock + quantity;

                    console.log(`(VARYANTSIZ) Stok güncelleniyor: ${item.productId}, stok: ${currentStock} -> ${newStock}`);
                    batch.update(productRef, { stock: newStock });

                    successfulUpdates.push({
                        ...item,
                        oldStock: currentStock,
                        newStock: newStock,
                        verified: true
                    });
                } else {
                    // Hatalı stok formatı
                    console.error('Stok formatı hatalı:', productData.stock);
                    failedUpdates.push(item);
                    continue;
                }
            } catch (updateError) {
                console.error(`Stok güncelleme hatası: ${item.productId}, ${item.stockKey}`, updateError);
                failedUpdates.push({...item, error: updateError.message});
            }
        }
        
        // Tüm güncellemeleri tek bir işlemde uygula
        console.log('Toplu işlem uygulanıyor...');
        await batch.commit();
        
        // Rezervasyon belgesini sil
        try {
            await reservationRef.delete();
            console.log('Rezervasyon belgesi başarıyla silindi');
        } catch (deleteError) {
            console.error('Rezervasyon belgesi silinemedi:', deleteError);
            // Silme başarısız olsa bile devam et
        }
        
        // LocalStorage'dan rezervasyon bilgilerini temizle
        localStorage.removeItem(RESERVATION_ID_KEY);
        localStorage.removeItem(RESERVATION_EXPIRY_KEY);
        stockReservationId = null;
        
        console.log(`Stok güncelleme tamamlandı: ${successfulUpdates.length} başarılı, ${failedUpdates.length} başarısız`);
        
        return {
            success: true,
            successfulUpdates,
            failedUpdates
        };
        
    } catch (error) {
        console.error('Rezervasyon iptal edilirken hata:', error);
        
        try {
            // Son çare - doğrudan REST API kullan
            const projectId = firebase.app().options.projectId;
            const token = await firebase.auth().currentUser?.getIdToken();
            
            if (token) {
                // Rezervasyon belgesini sil
                const response = await fetch(
                    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stockReservations/${reservationId}`,
                    {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
            
            // LocalStorage'dan rezervasyon bilgilerini temizle
            localStorage.removeItem(RESERVATION_ID_KEY);
            localStorage.removeItem(RESERVATION_EXPIRY_KEY);
            stockReservationId = null;
            
            console.log('Rezervasyon iptal işlemi tamamlandı (son çare)');
            
            return {
                success: true,
                usedFallback: true
            };
            
        } catch (finalError) {
            console.error('Son çare de başarısız oldu:', finalError);
            return {
                success: false,
                error: finalError.message
            };
        }
    }
}

// Stok rezervasyonunu onaylama fonksiyonu (ödeme başarılı olduğunda)
async function confirmStockReservation(reservationId) {
    if (!reservationId) {
        console.log('Geçerli bir rezervasyon ID\'si belirtilmedi');
        return { success: false, error: 'Geçerli bir rezervasyon ID\'si belirtilmedi' };
    }
    
    console.log('Stok rezervasyonu onaylanıyor:', reservationId);
    
    try {
        // Firestore referansı
        const db = firebase.firestore();
        const reservationRef = db.collection('stockReservations').doc(reservationId);
        
        // Rezervasyon belgesini al
        const reservationDoc = await reservationRef.get();
        
        if (!reservationDoc.exists) {
            console.log('Rezervasyon bulunamadı:', reservationId);
            
            // LocalStorage'dan temizle
            localStorage.removeItem(RESERVATION_ID_KEY);
            localStorage.removeItem(RESERVATION_EXPIRY_KEY);
            stockReservationId = null;
            
            // Zamanlayıcıyı temizle
            if (stockReservationTimer) {
                clearTimeout(stockReservationTimer);
                stockReservationTimer = null;
            }
            
            return { success: false, error: 'Rezervasyon bulunamadı' };
        }
        
        const reservationData = reservationDoc.data();
        
        // Rezervasyon zaten tamamlanmış veya iptal edilmişse işlem yapma
        if (reservationData.status !== 'active') {
            console.log('Rezervasyon aktif değil, onaylanmıyor:', reservationData.status);
            
            // LocalStorage'dan temizle
            localStorage.removeItem(RESERVATION_ID_KEY);
            localStorage.removeItem(RESERVATION_EXPIRY_KEY);
            stockReservationId = null;
            
            // Zamanlayıcıyı temizle
            if (stockReservationTimer) {
                clearTimeout(stockReservationTimer);
                stockReservationTimer = null;
            }
            
            return { 
                success: false, 
                error: `Rezervasyon aktif değil, durumu: ${reservationData.status}` 
            };
        }
        
        // Rezervasyonu tamamlandı olarak işaretle
        try {
            await reservationRef.update({ 
                status: 'completed',
                completedAt: firebase.firestore.FieldValue.serverTimestamp() 
            });
            
            console.log('Rezervasyon durumu "completed" olarak güncellendi');
        } catch (updateError) {
            console.error('Rezervasyon durumu güncellenirken hata:', updateError);
            
            // Alternatif güncelleme yöntemi
            try {
                const projectId = firebase.app().options.projectId;
                const updateXhr = new XMLHttpRequest();
                updateXhr.open('PATCH', `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stockReservations/${reservationId}?updateMask.fieldPaths=status&updateMask.fieldPaths=completedAt`, false);
                updateXhr.setRequestHeader('Content-Type', 'application/json');
                updateXhr.send(JSON.stringify({
                    fields: {
                        status: { stringValue: 'completed' },
                        completedAt: { timestampValue: new Date().toISOString() }
                    }
                }));
                
                if (updateXhr.status >= 200 && updateXhr.status < 300) {
                    console.log('Rezervasyon durumu alternatif yöntemle güncellendi');
                } else {
                    throw new Error(`Alternatif güncelleme başarısız: ${updateXhr.statusText}`);
                }
            } catch (altError) {
                console.error('Alternatif güncelleme de başarısız:', altError);
                // Hata fırlatıyoruz ama ana try-catch bloğu tarafından yakalanacak
                throw new Error('Rezervasyon durumu güncellenemedi');
            }
        }
        
        // LocalStorage'dan temizle
        localStorage.removeItem(RESERVATION_ID_KEY);
        localStorage.removeItem(RESERVATION_EXPIRY_KEY);
        stockReservationId = null;
        
        // Zamanlayıcıyı temizle
        if (stockReservationTimer) {
            clearTimeout(stockReservationTimer);
            stockReservationTimer = null;
        }
        
        console.log('Stok rezervasyonu başarıyla onaylandı');
        return { 
            success: true, 
            message: 'Stok rezervasyonu başarıyla onaylandı',
            reservationId: reservationId
        };
    } catch (error) {
        console.error('Stok rezervasyonu onaylanırken hata:', error);
        
        // Hata durumunda bile LocalStorage'dan temizlemeyi deneyelim
        try {
            localStorage.removeItem(RESERVATION_ID_KEY);
            localStorage.removeItem(RESERVATION_EXPIRY_KEY);
            stockReservationId = null;
            
            if (stockReservationTimer) {
                clearTimeout(stockReservationTimer);
                stockReservationTimer = null;
            }
        } catch (cleanupError) {
            console.error('Temizleme sırasında hata:', cleanupError);
        }
        
        return { 
            success: false, 
            error: error.message || 'Stok rezervasyonu onaylanırken bilinmeyen bir hata oluştu' 
        };
    }
}

// Rezervasyon süresi dolduğunda çalışacak fonksiyon
function handleStockReservationExpiry() {
    console.log('Stok rezervasyonu süresi doldu');
    
    // Rezervasyon ID'si varsa iptal et
    if (stockReservationId) {
        cancelStockReservation(stockReservationId, 'timer veya handleStockReservationExpiry')
            .then(() => {
                console.log('Süresi dolan rezervasyon iptal edildi');
                
                // Ödeme ekranındaki ürünleri sıfırla
                const orderSummaryContainer = document.querySelector('.order-summary-items');
                if (orderSummaryContainer) {
                    orderSummaryContainer.innerHTML = '<p class="empty-cart-message">Rezervasyon süresi dolduğu için sepetiniz boşaltıldı.</p>';
                }
                
                // Toplam fiyatı sıfırla
                const totalPriceElement = document.querySelector('.order-total-price');
                if (totalPriceElement) {
                    totalPriceElement.textContent = '0.00 TL';
                }
                
                // Rezervasyon bilgisini kaldır
                const reservationInfo = document.querySelector('.reservation-info');
                if (reservationInfo) {
                    reservationInfo.remove();
                }
                
                // Kullanıcıya bilgi ver
                showPaymentResult(false, 'Stok rezervasyonu süresi doldu. Sepet sayfasına yönlendiriliyorsunuz.');
                
                // 5 saniye sonra sepet sayfasına yönlendir
                setTimeout(() => {
                    window.location.href = 'customer-panel.html';
                }, 3000);
            });
    }
}

// Stok rezervasyonu ID'sini almak için fonksiyon
// Stok rezervasyonu ID'sini almak için fonksiyon
async function getStockReservationId() {
    try {
        // Önce localStorage'dan kontrol et
        const storedReservationId = localStorage.getItem(RESERVATION_ID_KEY);
        const expiryTime = localStorage.getItem(RESERVATION_EXPIRY_KEY);
        
        // Rezervasyon süresi dolmuş mu kontrol et
        if (storedReservationId && expiryTime) {
            const expiryDate = new Date(parseInt(expiryTime));
            const now = new Date();
            
            if (expiryDate > now) {
                console.log('LocalStorage\'da geçerli rezervasyon bulundu, ID:', storedReservationId);
                
                // Global değişkeni güncelle
                stockReservationId = storedReservationId;
                
                // Firestore'da rezervasyonu kontrol et
                const user = firebase.auth().currentUser;
                if (!user) return null;
                
                const reservationRef = firebase.firestore().collection('stockReservations').doc(storedReservationId);
                const reservationDoc = await reservationRef.get();
                
                if (reservationDoc.exists && reservationDoc.data().userId === user.uid && reservationDoc.data().status === 'active') {
                    // Rezervasyon hala geçerli
                    console.log('Firestore\'da rezervasyon doğrulandı');
                    
                    // Kalan süreyi hesapla ve zamanlayıcıyı ayarla
                    const remainingTime = expiryDate.getTime() - now.getTime();
                    // LOG: Timer kurulmadan önce kalan süre ve saatler
                    console.log('[TIMER KURULUYOR] ŞU AN:', now.toISOString(), 'Bitiş:', expiryDate.toISOString(), 'Kalan:', Math.floor(remainingTime/1000), 'sn');
                    if (remainingTime > 5000) { // 5 saniyeden kısa ise timer kurma!
                        if (stockReservationTimer) {
                            clearTimeout(stockReservationTimer);
                        }
                        stockReservationTimer = setTimeout(handleStockReservationExpiry, remainingTime);
                        console.log(`[TIMER] Rezervasyon zamanlayıcısı ayarlandı: ${Math.floor(remainingTime / 1000)} saniye`);
                    } else {
                        console.warn('[TIMER] Kalan süre çok kısa, zamanlayıcı kurulmadı!');
                    }
                    return storedReservationId;
                } else {
                    // Rezervasyon Firestore'da bulunamadı veya aktif değil
                    console.log('[REZERVASYON LOG] Rezervasyon Firestore\'da bulunamadı veya aktif değil, localStorage temizleniyor. İptal işlemi yapılmayacak.');
                    localStorage.removeItem(RESERVATION_ID_KEY);
                    localStorage.removeItem(RESERVATION_EXPIRY_KEY);
                    stockReservationId = null;
                    // Burada kesinlikle cancelStockReservation çağrısı yapılmasın!
                }
            } else {
                // Rezervasyon süresi dolmuş
                console.log('[REZERVASYON LOG] Rezervasyon süresi dolmuş, localStorage temizleniyor. İptal işlemi yapılmayacak.');
                localStorage.removeItem(RESERVATION_ID_KEY);
                localStorage.removeItem(RESERVATION_EXPIRY_KEY);
                stockReservationId = null;
                // Burada kesinlikle cancelStockReservation çağrısı yapılmasın!
            }
        } else if (stockReservationId) {
            // Global değişkende ID var ama localStorage'da yok
            console.log('Global değişkende rezervasyon var ama localStorage\'da yok, Firestore kontrol ediliyor');
            
            // Firestore'da kontrol et
            const user = firebase.auth().currentUser;
            if (!user) return null;
            
            const reservationRef = firebase.firestore().collection('stockReservations').doc(stockReservationId);
            const reservationDoc = await reservationRef.get();
            
            if (reservationDoc.exists && reservationDoc.data().userId === user.uid && reservationDoc.data().status === 'active') {
                // Rezervasyon hala geçerli, localStorage'a kaydet
                const expiresAt = reservationDoc.data().expiresAt.toDate();
                const now = new Date();
                
                if (expiresAt > now) {
                    // Kalan süreyi hesapla
                    const remainingTime = expiresAt.getTime() - now.getTime();

                    // localStorage'a kaydet
                    localStorage.setItem(RESERVATION_ID_KEY, stockReservationId);
                    localStorage.setItem(RESERVATION_EXPIRY_KEY, expiresAt.getTime().toString());

                    // LOG: Timer kurulmadan önce kalan süre ve saatler
                    console.log('[TIMER KURULUYOR] ŞU AN:', now.toISOString(), 'Bitiş:', expiresAt.toISOString(), 'Kalan:', Math.floor(remainingTime/1000), 'sn');
                    if (remainingTime > 5000) { // 5 saniyeden kısa ise timer kurma!
                        if (stockReservationTimer) {
                            clearTimeout(stockReservationTimer);
                        }
                        stockReservationTimer = setTimeout(handleStockReservationExpiry, remainingTime);
                        console.log(`[TIMER] Rezervasyon zamanlayıcısı ayarlandı: ${Math.floor(remainingTime / 1000)} saniye`);
                    } else {
                        console.warn('[TIMER] Kalan süre çok kısa, zamanlayıcı kurulmadı!');
                    }
                    return stockReservationId;
                }
            } else {
                // Rezervasyon bulunamadı veya kullanıcıya ait değil
                stockReservationId = null;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Rezervasyon kontrolü sırasında hata:', error);
        return null;
    }
}

// Sayfa kapatılırken dinleyiciyi temizle ve rezervasyonu iptal et
// Sayfa çıkış değişkeni - kullanıcı çıkış yapmak istediğinde true olacak
let userWantsToExit = false;

// Çıkış onay modalını gösterme fonksiyonu
function showExitConfirmation() {
    const modal = document.getElementById('exitConfirmModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Scroll'u devre dışı bırak
}

// Çıkış onay modalını kapatma fonksiyonu
function hideExitConfirmation() {
    const modal = document.getElementById('exitConfirmModal');
    modal.style.display = 'none';
    document.body.style.overflow = ''; // Scroll'u tekrar etkinleştir
}

// Sayfa temizleme işlemleri - rezervasyon iptali ve dinleyicilerin temizlenmesi
window.cleanupBeforeExit = async function() {
    if (document.visibilityState === 'hidden') {
        console.log('[DEBUG] cleanupBeforeExit çağrısı visibilitychange sırasında engellendi!');
        return;
    }
    console.log('[DEBUG] cleanupBeforeExit fonksiyonu çağrıldı.', {
        paymentCompleted: window.paymentCompleted,
        cleanupDone: window.cleanupDone,
        stack: (new Error().stack)
    });
    // Eğer ödeme başarılı olduysa hiçbir şey yapma
    if (window.paymentCompleted) {
        console.log('Ödeme başarılı, temizlik yapılmıyor');
        return;
    }
    // Eğer zaten temizlik yapıldıysa çık
    if (window.cleanupDone) {
        console.log('Temizlik zaten yapıldı, tekrar yapılmıyor');
        return;
    }
    // Temizlik yapıldı olarak işaretle
    window.cleanupDone = true;
    // Rezervasyon ID'sini al (await ile asenkron şekilde)
    let reservationId = null;
    try {
        reservationId = await getStockReservationId();
    } catch (e) {
        console.error('Rezervasyon ID alınırken hata:', e);
    }
    // Eğer rezervasyon yapıldıysa iptal et (asenkron olarak)
    if (reservationId) {
        console.log('Rezervasyon iptal ediliyor:', reservationId);
        // Rezervasyon iptalini setTimeout ile ertelenmiş olarak başlat
        setTimeout(() => {
            cancelStockReservation(reservationId, 'cleanupBeforeExit')
                .then(() => console.log('Rezervasyon başarıyla iptal edildi'))
                .catch(error => console.error('Rezervasyon iptal edilirken hata oluştu:', error));
        }, 0);
    }
    // Rezervasyon zamanlayıcısını temizle
    if (stockReservationTimer) {
        clearTimeout(stockReservationTimer);
        stockReservationTimer = null;
    }
    // LocalStorage'dan rezervasyon bilgilerini temizle (hata yönetimi ile)
    const clearStorage = () => {
        try {
            localStorage.removeItem(RESERVATION_ID_KEY);
            localStorage.removeItem(RESERVATION_EXPIRY_KEY);
        } catch (e) {
            console.error('LocalStorage temizlenirken hata oluştu:', e);
        }
    };
    // LocalStorage işlemini ertelenmiş olarak çalıştır
    setTimeout(clearStorage, 0);
};

// Çıkış onay butonlarına ve modalına event listener ekle
document.addEventListener('DOMContentLoaded', function() {
    const exitModal = document.getElementById('exitConfirmModal');
        
    // İptal butonu - kullanıcı sayfada kalmak istiyor
    const cancelButton = document.getElementById('exitConfirmCancel');
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            hideExitConfirmation();
            userWantsToExit = false;
        });
    }
    
    // Çıkış butonu - kullanıcı sayfadan çıkmak istiyor
    const confirmButton = document.getElementById('exitConfirmOk');
    if (confirmButton) {
        confirmButton.addEventListener('click', async function() {
            userWantsToExit = true;
            hideExitConfirmation();
            await cleanupBeforeExit();
            window.location.href = 'customer-panel.html'; // Ana sayfaya yönlendir
        });
    }
    
    // Modal dışına tıklandığında modalı kapat (opsiyonel)
    if (exitModal) {
        exitModal.addEventListener('click', function(event) {
            // Sadece modal arka planına tıklandığında kapat, içeriğe tıklandığında değil
            if (event.target === exitModal) {
                hideExitConfirmation();
                userWantsToExit = false;
            }
        });
    }
    
    // Sayfa link tıklamalarını yakala ve özel modal göster
    document.addEventListener('click', function(event) {
        // Eğer tıklanan öğe bir link ise ve sayfadan çıkış yapacaksa
        const target = event.target.closest('a');
        if (target && target.href && !target.href.includes('#') && !target.href.includes('javascript:') && !userWantsToExit) {
            // Ödeme formundaki butonları ve modal içindeki linkleri hariç tut
            if (!target.closest('#payment-form') && !target.closest('.modal-content')) {
                event.preventDefault(); // Link tıklamasını engelle
                
                // Çıkış onayı için modal göster
                showExitConfirmation();
                
                // Onay butonuna tıklandığında bu linke git
                const confirmButton = document.getElementById('exitConfirmOk');
                if (confirmButton) {
                    // Önceki event listener'ları temizle
                    const newConfirmButton = confirmButton.cloneNode(true);
                    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
                    
                    // Yeni event listener ekle
                    newConfirmButton.addEventListener('click', async function() {
                        userWantsToExit = true;
                        hideExitConfirmation();
                        await cleanupBeforeExit();
                        window.location.href = target.href; // Tıklanan linke git
                    });
                }
            }
        }
    });
});

// beforeunload event listener - tarayıcı kapatıldığında veya sayfa değiştirildiğinde çalışır
window.addEventListener('beforeunload', function(event) {
    console.log('[DEBUG] beforeunload event tetiklendi. userWantsToExit:', userWantsToExit, 'paymentCompleted:', window.paymentCompleted);
    console.log('[İPTAL LOG] beforeunload event tetiklendi (sayfa kapanıyor veya yenileniyor)');
    // Eğer kullanıcı zaten çıkış yapmak istiyorsa (modal üzerinden onayladıysa), engelleme
    if (userWantsToExit) {
        return;
    }
    // Eğer ödeme tamamlandıysa rezervasyon iptal etme!
    if (window.paymentCompleted) {
        return;
    }
    // Tarayıcı varsayılan davranışını engelle
    event.preventDefault();
    // Custom modal göster
    showExitConfirmation();
    // Tarayıcının varsayılan davranışını engellemek için boş string dön
    // Not: Modern tarayıcılar güvenlik nedeniyle özel mesajları göstermez
    // ama bu değer, tarayıcının varsayılan uyarıyı göstermesini engeller
    event.returnValue = '';
});

// Sayfa değiştirildiğinde (navigasyon) rezervasyonu iptal et
window.addEventListener('pagehide', async function(event) {
    console.log('[DEBUG] pagehide event tetiklendi. paymentCompleted:', window.paymentCompleted);
    console.log('[İPTAL LOG] pagehide event tetiklendi (sayfa değişiyor)');
    // Eğer ödeme tamamlandıysa rezervasyon iptal etme!
    if (window.paymentCompleted) {
        return;
    }
    console.log('Sayfa değiştiriliyor, rezervasyon iptal ediliyor');
    // Dinleyiciyi temizle
    if (cartCountUnsubscribe) {
        cartCountUnsubscribe();
        console.log('Sepet dinleyicisi temizlendi (pagehide)');
    }
    // Zamanlayıcıyı temizle
    if (stockReservationTimer) {
        clearTimeout(stockReservationTimer);
        stockReservationTimer = null;
        console.log('Rezervasyon zamanlayıcısı temizlendi (pagehide)');
    }
    // Rezervasyonu iptal et - asenkron işlemi bekle
    if (stockReservationId) {
        try {
            // Senkron çalışacak şekilde düzenle
            const result = await cancelStockReservation(stockReservationId, 'pagehide event');
            console.log('Rezervasyon başarıyla iptal edildi (pagehide):', result);
        } catch (error) {
            console.error('Rezervasyon iptal edilirken hata (pagehide):', error);
        }
    }
});

// Sayfa gizlendiğinde (başka sekmeye geçildiğinde) rezervasyonu iptal etme
window.addEventListener('visibilitychange', function() {
    console.log('[DEBUG] visibilitychange event:', document.visibilityState, 'paymentCompleted:', window.paymentCompleted, 'cleanupDone:', window.cleanupDone);
    console.log(`[REZERVASYON LOG] visibilitychange event tetiklendi: ${document.visibilityState}`);
    if (document.visibilityState === 'hidden' && window.location.pathname.includes('customer-payment.html')) {
        // Sadece rezervasyon bilgisini localStorage'a kaydet
        if (stockReservationId) {
            const expiryTime = localStorage.getItem(RESERVATION_EXPIRY_KEY);
            if (expiryTime) {
                console.log('[REZERVASYON LOG] Sayfa gizlendi, rezervasyon bilgileri localStorage\'da saklanıyor');
            }
        }
    }
});

// u00d6deme sonucu modalu0131 gu00f6sterme fonksiyonu
function showPaymentResult(success, message) {
    const modal = document.getElementById('paymentModal');
    const successIcon = modal.querySelector('.success-icon');
    const errorIcon = modal.querySelector('.error-icon');
    const modalTitle = modal.querySelector('.modal-title');
    const modalMessage = modal.querySelector('.modal-message');
    
    // u0130konlaru0131 su0131fu0131rla
    successIcon.classList.add('hidden');
    errorIcon.classList.add('hidden');
    
    if (success) {
        successIcon.classList.remove('hidden');
        modalTitle.textContent = 'u00d6deme Bau015faru0131lu0131';
        modalTitle.style.color = '#28a745';
    } else {
        errorIcon.classList.remove('hidden');
        modalTitle.textContent = 'u00d6deme Bau015faru0131su0131z';
        modalTitle.style.color = '#dc3545';
    }
    
    modalMessage.innerHTML = message;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Modal au00e7u0131kken scroll engelle
}

// Ödeme sonuç modalını gösterme fonksiyonu
function showPaymentResult(success, message) {
    const modal = document.getElementById('paymentModal');
    const successIcon = modal.querySelector('.success-icon');
    const errorIcon = modal.querySelector('.error-icon');
    const title = modal.querySelector('.modal-title');
    const messageEl = modal.querySelector('.modal-message');
    
    // İkonları ayarla
    successIcon.classList.toggle('hidden', !success);
    errorIcon.classList.toggle('hidden', success);
    
    // Başlık ve mesajı ayarla
    title.textContent = success ? 'Başarılı!' : 'Hata!';
    messageEl.textContent = message;
    
    // Modalı göster
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Scroll'u devre dışı bırak
}

// Modal kapatma fonksiyonu
function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    modal.style.display = 'none';
    document.body.style.overflow = ''; // Scroll'u tekrar etkinleştir
    
    // Başarılı ödeme durumunda ana sayfaya yönlendir
    if (modal.querySelector('.success-icon').classList.contains('hidden') === false) {
        window.location.href = 'customer-panel.html';
    }
}

// Input validasyon fonksiyonu
function validateInput(input) {
    if (!input) return false;
    const isValid = input.value.trim() !== '' && input.checkValidity();
    if (!isValid) {
        input.classList.add('error-input');
    } else {
        input.classList.remove('error-input');
    }
    return isValid;
}

// Kart numarasu0131 validasyon fonksiyonu (Luhn algoritması)
function validateCardNumber(number) {
    // Sadece rakamları al ve 16 hane kontrolü
    if (!/^[0-9]{16}$/.test(number)) return false;
    let sum = 0;
    let isEven = false;
    for (let i = number.length - 1; i >= 0; i--) {
        let digit = parseInt(number[i]);
        if (isEven) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
    }
    return sum % 10 === 0;
}

// Kart tipi belirleme fonksiyonu
function getCardType(number) {
    // Visa
    if (number.startsWith('4')) {
        return 'Visa';
    }
    // Mastercard
    else if (/^5[1-5]/.test(number)) {
        return 'Mastercard';
    }
    return null;
}

// Form validasyon fonksiyonu - tu00fcm form alanlarını kontrol eder
function validateForm() {
    const cardHolder = document.getElementById('cardHolder'); // ID'yi düzelttim: cardName -> cardHolder
    const cardNumber = document.getElementById('cardNumber');
    const expiryDate = document.getElementById('expiryDate');
    const cvv = document.getElementById('cvv');
    const address = document.getElementById('address');
    
    // HTML'de bulunmayan alanları kaldırdım
    
    // Sadece mevcut form alanlarını kontrol et
    const inputs = [cardHolder, cardNumber, expiryDate, cvv, address];
    let isValid = true;
    
    // Her input için ayrı ayrı kontrol
    inputs.forEach(input => {
        if (input && !validateInput(input)) {
            isValid = false;
        }
    });
    
    // Kart numarası geçerli mi kontrol et
    if (cardNumber && cardNumber.value.trim() !== '') {
        const cardNumberValue = cardNumber.value.replace(/\s/g, '');
        const cardType = getCardType(cardNumberValue);
        
        if (!cardType) {
            showError(cardNumber, 'Desteklenmeyen kart tipi! Visa veya Mastercard kullanınız.');
            isValid = false;
        } else if (!validateCardNumber(cardNumberValue)) {
            showError(cardNumber, 'Geçersiz kart numarası!');
            isValid = false;
        }
    }
    
    // Son kullanma tarihi geçerli mi kontrol et
    if (expiryDate && expiryDate.value.trim() !== '') {
        const [month, year] = expiryDate.value.split('/');
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear() % 100;
        const currentMonth = currentDate.getMonth() + 1;
        
        if (!/^\d{2}\/\d{2}$/.test(expiryDate.value)) {
            showError(expiryDate, 'AA/YY formatında giriniz');
            isValid = false;
        } else if (parseInt(month) < 1 || parseInt(month) > 12) {
            showError(expiryDate, 'Geçerli bir ay giriniz (01-12)');
            isValid = false;
        } else if (parseInt(year) < currentYear || 
                  (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
            showError(expiryDate, 'Kartınızın süresi dolmuş');
            isValid = false;
        }
    }
    
    return isValid;
}

// Sepeti temizleme fonksiyonu
async function clearCart(userId) {
    try {
        // Firestore'dan sepeti temizle
        await firebase.firestore().collection('carts').doc(userId).update({
            items: [],
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Sepet temizlendi');
        
        // Sepet gu00fcncellendi olayu0131nu0131 tetikle
        window.dispatchEvent(new CustomEvent('cartUpdated'));
    } catch (error) {
        console.error('Sepet temizlenirken hata:', error);
    }
}

// Sipariu015f numarasu0131 oluu015fturma fonksiyonu
function generateOrderNumber() {
    const date = new Date();
    const timestamp = date.getTime();
    return 'ARS' + timestamp.toString().slice(-9);
}

// Bildirim oluşturma fonksiyonu
async function createNotification(userId, type, message = null, relatedOrderId = null, trackingNo = null) {
    try {
        if (!userId) {
            console.error('Kullanıcı ID\'si olmadan bildirim oluşturulamaz');
            return null;
        }
        
        // Bildirim verilerini hazırla
        const notificationData = {
            userId: userId,
            type: type, // order_created, order_processing, order_shipped, order_delivered, order_canceled, promotion, system
            message: message,
            relatedOrderId: relatedOrderId,
            trackingNo: trackingNo,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isRead: false,
            isDeleted: false
        };
        
        // Firestore'a bildirim ekle
        const notificationsRef = firebase.firestore().collection('notifications');
        const notificationDoc = await notificationsRef.add(notificationData);
        
        console.log(`Bildirim oluşturuldu: ${type}`, notificationDoc.id);
        return notificationDoc.id;
    } catch (error) {
        console.error('Bildirim oluşturulurken hata:', error);
        return null;
    }
}

// Sipariu015f oluu015fturma ve Firestore'a kaydetme fonksiyonu
async function createOrder(orderData) {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('Kullanu0131cu0131 bulunamadu0131, sipariu015f oluu015fturulamu0131yor');
            return null;
        }
        
        // Kullanu0131cu0131nu0131n sepetini al
        const cartRef = firebase.firestore().collection('carts').doc(user.uid);
        const cartSnap = await cartRef.get();
        
        if (!cartSnap.exists || !cartSnap.data().items || cartSnap.data().items.length === 0) {
            console.error('Sepet bou015f, sipariu015f oluu015fturulamu0131yor');
            return null;
        }
        
        const cartData = cartSnap.data();
        const cartItems = cartData.items;
        
        // u00dcru00fcn verilerini u00e7ek
        const productPromises = cartItems.map(item => firebase.firestore().collection('products').doc(item.productId).get());
        const productDocs = await Promise.all(productPromises);
        
        // Sipariu015f u00f6u011felerini oluu015ftur
        const orderItems = cartItems.map((item, index) => {
            const productDoc = productDocs[index];
            const productData = productDoc.exists ? productDoc.data() : {};
            
            // Varyant görselini kontrol et
            let itemImage = item.image;
            
            // Eğer variantImage doğrudan varsa, onu kullan
            if (item.variantImage) {
                itemImage = item.variantImage;
                console.log('Sepet öğesinde varyant görseli bulundu:', itemImage);
            }
            // Yoksa varyant görselini bulmaya çalış
            else if (item.variants && Object.keys(item.variants).length > 0 && productData.variantImages) {
                // Varyant değerlerini al
                const variantKeys = Object.keys(item.variants);
                const variantValues = Object.values(item.variants);
                
                // Varyant değerlerini normalize et
                const normalizedValues = variantValues.map(v => String(v).trim().toLowerCase());
                
                // Farklı formatlarda varyant anahtarları oluştur
                const possibleKeys = [
                    // Standart formatlar
                    variantValues.join('-'),                      // Normal birleştirme
                    variantValues.sort().join('-'),               // Sıralı birleştirme
                    variantValues.join('-').toLowerCase(),        // Küçük harf
                    variantValues.sort().join('-').toLowerCase(), // Sıralı küçük harf
                    variantValues.join(' '),                      // Boşlukla birleştirme
                    variantValues.sort().join(' '),               // Sıralı boşlukla
                    variantValues.join(' ').toLowerCase(),        // Boşlukla küçük harf
                    variantValues.sort().join(' ').toLowerCase(), // Sıralı boşlukla küçük harf
                    
                    // Tek değerler (tek varyantlı ürünler için)
                    ...variantValues,
                    ...variantValues.map(v => v.toLowerCase())
                ];
                
                console.log('Varyant görseli için olası anahtarlar:', possibleKeys);
                
                // Tüm olası anahtarları dene
                let variantImageFound = false;
                for (const key of possibleKeys) {
                    if (productData.variantImages[key]) {
                        itemImage = productData.variantImages[key];
                        console.log(`Varyant görseli bulundu (anahtar: ${key}):`, itemImage);
                        variantImageFound = true;
                        break;
                    }
                }
                
                // Hala bulunamadıysa, varyant görsellerini normalize ederek karşılaştır
                if (!variantImageFound && productData.variantImages) {
                    const variantImageKeys = Object.keys(productData.variantImages);
                    
                    // Normalize edilmiş varyant anahtarı
                    const normalizedVariantKey = normalizedValues.sort().join('').toLowerCase().replace(/[\s-_]/g, '');
                    
                    for (const key of variantImageKeys) {
                        const normalizedKey = key.toLowerCase().replace(/[\s-_]/g, '');
                        if (normalizedKey.includes(normalizedVariantKey) || normalizedVariantKey.includes(normalizedKey)) {
                            itemImage = productData.variantImages[key];
                            console.log(`Normalize edilmiş eşleşme ile varyant görseli bulundu (anahtar: ${key}):`, itemImage);
                            break;
                        }
                    }
                }
            }
            
            return {
                productId: item.productId,
                name: productData.name || item.name,
                price: item.price,
                quantity: item.quantity,
                image: itemImage || productData.image,
                variants: item.variants || {},
                variant: item.variant || null,
                variantImage: item.variantImage || null // Varyant görselini de sakla
            };
        });
        
        // Sipariu015f toplamu0131nu0131 hesapla
        const subtotal = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
        
        // Kargo u00fccreti hesapla
        const SHIPPING_THRESHOLD = 1000; // 1000 TL ve u00fczeri alu0131u015fveriu015flerde kargo bedava
        const SHIPPING_COST = 49.99; // Kargo u00fccreti
        const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
        const total = subtotal + shipping;
        
        // Kullanu0131cu0131 bilgilerini al
        const userRef = firebase.firestore().collection('users').doc(user.uid);
        const userSnap = await userRef.get();
        const userData = userSnap.exists ? userSnap.data() : {};
        
        // Sipariu015f numarasu0131 oluu015ftur
        const orderNo = generateOrderNumber();
        
        // Sipariu015f tarihi ve saati
        const now = new Date();
        const date = now.toLocaleDateString('tr-TR');
        const time = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        
        // Sipariu015f verisi oluu015ftur
        // Adres objelerini localStorage'dan al
let shippingAddressObj = null;
let billingAddressObj = null;
try {
    shippingAddressObj = JSON.parse(localStorage.getItem('selectedDeliveryAddressObj'));
} catch(e) { shippingAddressObj = null; }
try {
    billingAddressObj = JSON.parse(localStorage.getItem('selectedInvoiceAddressObj'));
} catch(e) { billingAddressObj = null; }
const selectedDeliveryAddress = localStorage.getItem('selectedDeliveryAddress') || '';
const selectedInvoiceAddress = localStorage.getItem('selectedInvoiceAddress') || '';

const orderDoc = {
    orderNo: orderNo,
    userId: user.uid,
    userEmail: user.email,
    customerName: orderData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
    customerPhone: orderData.phone || userData.phone || '',
    customerAddress: orderData.address || userData.address || '',
    items: orderItems,
    subtotal: subtotal,
    shipping: shipping,
    total: total,
    status: 'Hazırlanıyor',
    date: date,
    time: time,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    paymentMethod: orderData.paymentMethod || 'Kredi Kartı',
    notes: orderData.notes || '',
    shippingAddress: shippingAddressObj || selectedDeliveryAddress,
    billingAddress: billingAddressObj || selectedInvoiceAddress
};
        
        // Sipariu015fi Firestore'a kaydet
        const ordersRef = firebase.firestore().collection('orders');
        const orderRef = await ordersRef.add(orderDoc);
        
        console.log('Sipariu015f bau015faru0131yla oluu015fturuldu:', orderRef.id);
        
        // Kullanu0131cu0131nu0131n sipariu015fler listesine ekle
        const userOrdersRef = firebase.firestore().collection('users').doc(user.uid).collection('orders');
        await userOrdersRef.doc(orderRef.id).set({
            orderId: orderRef.id,
            orderNo: orderNo,
            total: total,
            status: 'Hazu0131rlanu0131yor',
            date: date,
            time: time,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Sipariş oluşturuldu bildirimi oluştur
        try {
            await createNotification(
                user.uid,
                'order_created',
                'Siparişiniz başarıyla oluşturuldu!',
                orderNo
            );
            console.log('Sipariş bildirimi oluşturuldu');
        } catch (error) {
            console.error('Bildirim oluşturulurken hata:', error);
            // Bildirim oluşturma hatası siparişi etkilememeli
        }
        
        return orderRef.id;
    } catch (error) {
        console.error('Sipariş oluşturulurken hata:', error);
        return null;
    }
}

// Ödeme işlemi fonksiyonu
async function processPayment(orderData) {
    try {
        // Ödeme simülasyonu - gerçek ödeme entegrasyonu burada yapılacak
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Sipariş oluştur ve Firestore'a kaydet
        const orderId = await createOrder(orderData);
        if (!orderId) {
            return {
                success: false,
                message: 'Sipariş oluşturulamadı'
            };
        }
        
        // Stok rezervasyonu varsa onayla
        if (stockReservationId) {
            console.log('Stok rezervasyonu onaylanıyor:', stockReservationId);
            await confirmStockReservation(stockReservationId);
            window.paymentCompleted = true; // Ödeme ve rezervasyon onaylandı
            
            // Zamanlayıcıyı temizle
            if (stockReservationTimer) {
                clearTimeout(stockReservationTimer);
                stockReservationTimer = null;
            }
        }
        
        return {
            success: true,
            message: 'Ödeme başarıyla tamamlandı',
            orderId: orderId
        };
    } catch (error) {
        console.error('Ödeme işlemi sırasında hata:', error);
        return {
            success: false,
            message: error.message || 'Ödeme işlemi sırasında bir hata oluştu'
        };
    }
}

// Sipariş sonrası ürün stoklarını güncelleme fonksiyonu - BATCH KULLANMADAN DOĞRUDAN GÜNCELLEME
async function updateProductStocksAfterOrder(orderItems) {
    try {
        console.log('Stok güncellemesi başlatılıyor, sepetteki ürün sayısı:', orderItems.length);
        console.log('Sepetteki ürünler sırası:', orderItems.map(item => item.productId));
        
        // Başarılı güncellemeleri takip etmek için
        const successfulUpdates = [];
        const failedUpdates = [];
        
        // Her bir ürün için stok güncelle - Sırayı korumak için for döngüsü kullanıyoruz
        for (let i = 0; i < orderItems.length; i++) {
            const item = orderItems[i];
            console.log(`Stok güncellemesi için işlenen ürün #${i+1}:`, item);
            const productRef = firebase.firestore().collection('products').doc(item.productId);
            const productDoc = await productRef.get();
            
            if (productDoc.exists) {
                const productData = productDoc.data();
                console.log(`Ürün #${i+1} verileri:`, productData.name, 'Stok:', productData.stock);
                
                // Varyant kontrolü00fc yap
                if (item.variants && Object.keys(item.variants).length > 0) {
                    // Varyantlu0131 u00fcru00fcn
                    console.log(`Varyantlı ürün #${i+1} stok güncellemesi:`, item.productId, item.variants);
                    
                    // Stok bilgisi nesne olarak saklanmış mı kontrol et
                    if (productData.stock && typeof productData.stock === 'object') {
                        // Stok anahtarlarını al
                        const stockKeys = Object.keys(productData.stock);
                        console.log(`Ürün #${i+1} - Mevcut stok anahtarları:`, stockKeys);
                        
                        // Varyant değerlerini al ve sırasını koru
                        const itemVariantValues = Object.values(item.variants);
                        console.log(`Ürün #${i+1} - Varyant değerleri:`, itemVariantValues);
                        
                        // Varyant anahtarı oluşturma yöntemleri
                        const directVariantKey = itemVariantValues.join('-');
                        const sortedVariantKey = [...itemVariantValues].sort().join('-');
                        
                        console.log(`Ürün #${i+1} - Doğrudan varyant anahtarı:`, directVariantKey);
                        console.log(`Ürün #${i+1} - Sıralanmış varyant anahtarı:`, sortedVariantKey);
                        
                        // Küçük harfli versiyonlar
                        const lowerDirectKey = directVariantKey.toLowerCase();
                        const lowerSortedKey = sortedVariantKey.toLowerCase();
                        const lowerVariantValues = itemVariantValues.map(v => v.toLowerCase());
                        
                        // ADIM 2: Stok anahtarlarını analiz et
                        console.log(`Ürün #${i+1} - Stok anahtarları analiz ediliyor...`);
                        
                        // Stok anahtarlarını küçük harfe çevir
                        const lowerStockKeys = stockKeys.map(key => key.toLowerCase());
                        
                        // Her bir stok anahtarını parçalara ayır
                        const stockKeyParts = {};
                        for (const key of stockKeys) {
                            stockKeyParts[key] = key.split('-').map(part => part.trim().toLowerCase());
                        }
                        
                        console.log(`Ürün #${i+1} - Stok anahtarı parçaları:`, stockKeyParts);
                        
                        // ADIM 3: Stok anahtarı bulma stratejisi
                        console.log(`Ürün #${i+1} - Stok anahtarı eşleştirme başlıyor...`);
                        
                        // Eşleşme bulma stratejileri
                        let matchedKey = null;
                        let matchMethod = '';
                        
                        // Strateji 1: Doğrudan anahtar kontrolü (en yüksek öncelik)
                        if (productData.stock[directVariantKey] !== undefined) {
                            matchedKey = directVariantKey;
                            matchMethod = 'DOĞRUDAN ANAHTAR';
                            console.log(`Ürün #${i+1} - DOĞRUDAN ANAHTAR EŞLEŞMESİ BULUNDU: ${matchedKey}`);
                        }
                        
                        // Strateji 2: Sıralanmış anahtar kontrolü
                        else if (productData.stock[sortedVariantKey] !== undefined) {
                            matchedKey = sortedVariantKey;
                            matchMethod = 'SIRALANMIŞ ANAHTAR';
                            console.log(`Ürün #${i+1} - SIRALANMIŞ ANAHTAR EŞLEŞMESİ BULUNDU: ${matchedKey}`);
                        }
                        
                        // Strateji 3: Büyük/küçük harf duyarsız kontrol
                        else {
                            for (let j = 0; j < stockKeys.length; j++) {
                                const key = stockKeys[j];
                                if (key.toLowerCase() === lowerDirectKey || key.toLowerCase() === lowerSortedKey) {
                                    matchedKey = key;
                                    matchMethod = 'BÜYÜK/KÜÇÜK HARF DUYARSIZ';
                                    console.log(`Ürün #${i+1} - BÜYÜK/KÜÇÜK HARF DUYARSIZ EŞLEŞME BULUNDU: ${matchedKey}`);
                                    break;
                                }
                            }
                        }
                        
                        // Strateji 4: İçerik tabanlı eşleştirme
                        if (!matchedKey) {
                            // Varyant değerlerini içeren anahtarları bul
                            const containingKeys = [];
                            
                            for (const key of stockKeys) {
                                const lowerKey = key.toLowerCase();
                                let containsAllValues = true;
                                
                                // Tüm varyant değerlerinin anahtar içinde olup olmadığını kontrol et
                                for (const value of lowerVariantValues) {
                                    if (!lowerKey.includes(value.toLowerCase())) {
                                        containsAllValues = false;
                                        break;
                                    }
                                }
                                
                                if (containsAllValues) {
                                    containingKeys.push(key);
                                }
                            }
                            
                            if (containingKeys.length > 0) {
                                matchedKey = containingKeys[0]; // İlk eşleşeni al
                                matchMethod = 'İÇERİK BAZLI';
                                console.log(`Ürün #${i+1} - İÇERİK BAZLI EŞLEŞME BULUNDU: ${matchedKey}`);
                            }
                        }
                        
                        // Strateji 5: Parça tabanlı eşleştirme
                        if (!matchedKey) {
                            // Her bir stok anahtarının parçalarını varyant değerleriyle karşılaştır
                            const partMatchKeys = [];
                            
                            for (const [key, parts] of Object.entries(stockKeyParts)) {
                                let matchCount = 0;
                                for (const part of parts) {
                                    if (lowerVariantValues.includes(part)) {
                                        matchCount++;
                                    }
                                }
                                
                                if (matchCount > 0) {
                                    partMatchKeys.push({ key, matchCount });
                                }
                            }
                            
                            // En çok eşleşen anahtarı seç
                            if (partMatchKeys.length > 0) {
                                partMatchKeys.sort((a, b) => b.matchCount - a.matchCount);
                                matchedKey = partMatchKeys[0].key;
                                matchMethod = 'PARÇA BAZLI';
                                console.log(`Ürün #${i+1} - PARÇA BAZLI EŞLEŞME BULUNDU: ${matchedKey} (Eşleşen parça sayısı: ${partMatchKeys[0].matchCount})`);
                            }
                        }
                        
                        // Strateji 6: Son çare - İlk stok anahtarını kullan
                        if (!matchedKey && stockKeys.length > 0) {
                            matchedKey = stockKeys[0];
                            matchMethod = 'SON ÇARE';
                            console.log(`Ürün #${i+1} - EŞLEŞME BULUNAMADI, İLK STOK ANAHTARI KULLANILIYOR: ${matchedKey}`);
                        }
                        
                        // Stok güncelleme işlemi - DOĞRUDAN GÜNCELLEME
                        if (matchedKey) {
                            try {
                                // Eşleşen anahtarın mevcut stoğunu al
                                const currentStock = productData.stock[matchedKey] || 0;
                                const newStock = Math.max(0, currentStock - item.quantity);
                                
                                console.log(`Ürün #${i+1} - STOK GÜNCELLEME: ${matchMethod} yöntemiyle eşleşen anahtar: ${matchedKey}`);
                                console.log(`Ürün #${i+1} - STOK DEĞERİ: ${currentStock} => ${newStock} (${item.quantity} adet azaltılıyor)`);
                                
                                // ÖNEMLİ DEĞİŞİKLİK: Batch yerine doğrudan güncelleme
                                // YÖNTEM 1: Doğrudan alanı güncelle
                                await productRef.update({ [`stock.${matchedKey}`]: newStock });
                                console.log(`Ürün #${i+1} - DOĞRUDAN ALAN GÜNCELLEME BAŞARILI: ${matchedKey} => ${newStock}`);
                                
                                // YÖNTEM 2: Ayrıca tüm stok nesnesini de güncelleyelim (yedek yöntem)
                                const updatedStock = JSON.parse(JSON.stringify(productData.stock));
                                updatedStock[matchedKey] = newStock;
                                
                                // Güncellenmiş stok nesnesini doğrudan güncelle
                                await productRef.update({ stock: updatedStock });
                                console.log(`Ürün #${i+1} - TAM STOK NESNESİ GÜNCELLEME BAŞARILI`);
                                
                                // Güncellenmiş ürünleri takip et
                                successfulUpdates.push({
                                    productId: item.productId,
                                    variantKey: matchedKey,
                                    oldStock: currentStock,
                                    newStock: newStock,
                                    method: matchMethod
                                });
                                
                                // Diğer işlemleri atla
                                continue;
                            } catch (updateError) {
                                console.error(`Ürün #${i+1} - STOK GÜNCELLEME HATASI:`, updateError);
                                failedUpdates.push({
                                    productId: item.productId,
                                    error: updateError.message,
                                    item: item
                                });
                            }
                        } 
                        
                        // Hiçbir eşleşme bulunamadıysa, uyarı ver
                        console.warn(`Ürün #${i+1} - UYARI: ${item.productId} için hiçbir stok anahtarı eşleşmesi bulunamadı!`);
                        
                        // ADIM 5: Son çare - Zorla stok güncelleme (DOĞRUDAN GÜNCELLEME)
                        if (stockKeys.length > 0) {
                            try {
                                // İlk stok anahtarını kullan
                                const forceKey = stockKeys[0];
                                const currentStock = productData.stock[forceKey] || 0;
                                const newStock = Math.max(0, currentStock - item.quantity);
                                
                                console.log(`Ürün #${i+1} - ZORLA STOK GÜNCELLEME: İlk stok anahtarı kullanılıyor: ${forceKey}`);
                                console.log(`Ürün #${i+1} - ZORLA STOK DEĞERİ: ${currentStock} => ${newStock}`);
                                
                                // YÖNTEM 1: Doğrudan alanı güncelle
                                await productRef.update({ [`stock.${forceKey}`]: newStock });
                                console.log(`Ürün #${i+1} - DOĞRUDAN ALAN GÜNCELLEME BAŞARILI: ${forceKey} => ${newStock}`);
                                
                                // YÖNTEM 2: Ayrıca tüm stok nesnesini de güncelleyelim (yedek yöntem)
                                const updatedStock = JSON.parse(JSON.stringify(productData.stock));
                                updatedStock[forceKey] = newStock;
                                await productRef.update({ stock: updatedStock });
                                
                                // YÖNTEM 3: Stok alanını tamamen yeniden oluştur
                                await productRef.set({ stock: updatedStock }, { merge: true });
                                
                                console.log(`Ürün #${i+1} - ZORLA STOK GÜNCELLEME BAŞARILI: ${forceKey} => ${newStock}`);
                                
                                // Başarılı güncellemeleri takip et
                                successfulUpdates.push({
                                    productId: item.productId,
                                    variantKey: forceKey,
                                    oldStock: currentStock,
                                    newStock: newStock,
                                    method: 'ZORLA GÜNCELLEME'
                                });
                            } catch (forceUpdateError) {
                                console.error(`Ürün #${i+1} - ZORLA STOK GÜNCELLEME HATASI:`, forceUpdateError);
                                failedUpdates.push({
                                    productId: item.productId,
                                    error: forceUpdateError.message,
                                    item: item
                                });
                            }
                        } else {
                            console.error(`Ürün #${i+1} - HATA: ${item.productId} için hiçbir stok anahtarı bulunamadı!`);
                        }
                        
                        // Alternatif anahtar deneme kısmı kaldırıldı - artık gerekli değil
                        
                        // Varyantsız ürün için normal stok güncellemesi
                    } else {
                        // Varyantsız ürün stok güncellemesi
                        console.log('Varyantsız ürün stok güncellemesi yapılıyor...');
                        
                        // Stok değerini kontrol et
                        if (typeof productData.stock === 'number') {
                            // Stok doğrudan sayı olarak saklanmış
                            const currentStock = productData.stock;
                            const newStock = Math.max(0, currentStock - item.quantity);
                            
                            // DOĞRUDAN GÜNCELLEME
                            await productRef.update({ stock: newStock });
                            console.log(`Sayısal stok güncellendi: ${currentStock} => ${newStock}`);
                            
                            // Başarılı güncellemeleri takip et
                            successfulUpdates.push({
                                productId: item.productId,
                                oldStock: currentStock,
                                newStock: newStock,
                                method: 'VARYANTSİZ SAYISAL'
                            });
                        } else if (typeof productData.stock === 'object' && Object.keys(productData.stock).length > 0) {
                            // İlk stok anahtarını kullan
                            const firstKey = Object.keys(productData.stock)[0];
                            const currentStock = productData.stock[firstKey] || 0;
                            const newStock = Math.max(0, currentStock - item.quantity);
                            
                            // Stok nesnesini güncelle - Derin kopya
                            const updatedStock = JSON.parse(JSON.stringify(productData.stock));
                            updatedStock[firstKey] = newStock;
                            
                            // DOĞRUDAN GÜNCELLEME - İki yöntem
                            // YÖNTEM 1: Doğrudan alanı güncelle
                            await productRef.update({ [`stock.${firstKey}`]: newStock });
                            
                            // YÖNTEM 2: Tüm stok nesnesini güncelle
                            await productRef.update({ stock: updatedStock });
                            
                            console.log(`Nesne stok güncellendi (ilk anahtar): ${firstKey} => ${newStock}`);
                            
                            // Başarılı güncellemeleri takip et
                            successfulUpdates.push({
                                productId: item.productId,
                                variantKey: firstKey,
                                oldStock: currentStock,
                                newStock: newStock,
                                method: 'VARYANTSİZ NESNE'
                            });
                        } else {
                            console.log(`Ürün için geçerli stok bilgisi bulunamadı: ${item.productId}`);
                        }
                    }
                } else {
                    console.log('Ürün bulunamadı:', item.productId);
                }
            }
        }
        
        // Sonuç raporu oluştur
        console.log('Stok güncelleme işlemi tamamlandı.');
        console.log(`Başarılı güncellemeler: ${successfulUpdates.length}`);
        console.log(`Başarısız güncellemeler: ${failedUpdates.length}`);
        
        // Güncellemeleri kontrol et
        if (successfulUpdates.length > 0) {
            console.log('Başarılı güncellemeler:');
            for (const update of successfulUpdates) {
                console.log(`Ürün: ${update.productId}, Yöntem: ${update.method}, Stok: ${update.oldStock} => ${update.newStock}`);
                
                // Son bir kez daha kontrol et
                try {
                    const productRef = firebase.firestore().collection('products').doc(update.productId);
                    const updatedDoc = await productRef.get();
                    
                    if (updatedDoc.exists) {
                        const updatedData = updatedDoc.data();
                        console.log(`Ürün ${update.productId} - Son stok durumu:`, updatedData.stock);
                        
                        // Eğer güncelleme başarısız olduysa son bir kez daha dene
                        if (update.variantKey && updatedData.stock && updatedData.stock[update.variantKey] !== update.newStock) {
                            console.log(`SON KONTROL: Stok güncellemesi başarısız olmuş, tekrar deneniyor...`);
                            
                            // Son bir kez daha güncelleme yap
                            await productRef.update({ [`stock.${update.variantKey}`]: update.newStock });
                            
                            // Tüm stok nesnesini de güncelle
                            if (updatedData.stock) {
                                const finalStock = JSON.parse(JSON.stringify(updatedData.stock));
                                finalStock[update.variantKey] = update.newStock;
                                await productRef.update({ stock: finalStock });
                            }
                        }
                    }
                } catch (finalCheckError) {
                    console.error(`Son kontrol hatası (${update.productId}):`, finalCheckError);
                }
            }
        }
        
        // Başarısız güncellemeleri rapor et
        if (failedUpdates.length > 0) {
            console.error('Başarısız güncellemeler:');
            for (const failed of failedUpdates) {
                console.error(`Ürün: ${failed.productId}, Hata: ${failed.error}`);
            }
        }
    } catch (error) {
        console.error('Stok güncellenirken hata:', error);
    }
}

// Sadece harf ve bou015fluk giriu015fine izin veren fonksiyon
function onlyLetters(e) {
    if (!/[a-zA-Zu011fu00fcu015fu0131u00f6u00e7u011eu00dcu015eu0130u00d6u00c7\s]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
        e.preventDefault();
    }
}

// Sadece rakam giriu015fine izin veren fonksiyon
function onlyNumbers(e) {
    if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
        e.preventDefault();
    }
}

// Her kelimenin ilk harfini büyük yapan fonksiyon
function capitalizeWords(str) {
    return str.toLowerCase().replace(/(^|\s)\S/g, letter => letter.toUpperCase());
}

// Hata mesaju0131 gu00f6sterme fonksiyonu
function showError(input, message) {
    removeError(input);
    input.classList.add('error-input');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    input.parentNode.insertBefore(errorDiv, input.nextSibling);
}

// Hata mesaju0131 kaldirma fonksiyonu
function removeError(input) {
    const errorMessage = input.nextElementSibling;
    if (errorMessage && errorMessage.classList.contains('error-message')) {
        errorMessage.remove();
    }
}

// Tu00fcm hata mesajlaru0131nu0131 temizleme fonksiyonu
function clearAllErrors() {
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.classList.remove('error-input');
        const errorElement = input.nextElementSibling;
        if (errorElement && errorElement.classList.contains('error-message')) {
            errorElement.remove();
        }
    });
}

// Sayfa yüklendiinde çalışacak fonksiyon
document.addEventListener('DOMContentLoaded', function() {
    console.log('customer-payment.js - DOMContentLoaded tetiklendi');
    
    // Sayfa kapatma ve sayfadan ayrılma olaylarını dinle
    window.addEventListener('pagehide', handlePageUnload);
    window.addEventListener('beforeunload', handlePageUnload);
    
    // Sayfadan ayrılma veya sayfa kapatma durumunda stok rezervasyonlarını iptal et
    function handlePageUnload(event) {
        console.log('Sayfa kapatılıyor veya değiştiriliyor, stok rezervasyonu iptal ediliyor...');
        if (stockReservationId) {
            try {
                // cancelStockReservation fonksiyonu asenkron, bu yüzden senkron XHR kullanarak stokları güncelleyelim
                const db = firebase.firestore();
                const projectId = firebase.app().options.projectId;
                
                // Önce rezervasyon belgesini al
                const getXhr = new XMLHttpRequest();
                getXhr.open('GET', `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stockReservations/${stockReservationId}`, false);
                getXhr.send();
                
                if (getXhr.status === 200) {
                    const reservationData = JSON.parse(getXhr.responseText);
                    console.log('Rezervasyon verileri alındı:', reservationData);
                    
                    // Rezervasyon öğelerini kontrol et
                    if (reservationData.fields && reservationData.fields.items && reservationData.fields.items.arrayValue && 
                        reservationData.fields.items.arrayValue.values) {
                        
                        const items = reservationData.fields.items.arrayValue.values;
                        console.log(`${items.length} adet rezerve edilmiş ürün bulundu, stoklar güncelleniyor...`);
                        
                        // Her ürün için stokları güncelle
                        for (const item of items) {
                            if (item.mapValue && item.mapValue.fields) {
                                const productId = item.mapValue.fields.productId?.stringValue;
                                const stockKey = item.mapValue.fields.stockKey?.stringValue;
                                const quantity = parseInt(item.mapValue.fields.quantity?.integerValue || '1');
                                
                                if (productId) {
                                    console.log(`Ürün stoku güncelleniyor: ${productId}, ${stockKey}, miktar: +${quantity}`);
                                    
                                    // Ürün bilgilerini al
                                    const productXhr = new XMLHttpRequest();
                                    productXhr.open('GET', `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products/${productId}`, false);
                                    productXhr.send();
                                    
                                    if (productXhr.status === 200) {
                                        const productData = JSON.parse(productXhr.responseText);
                                        
                                        // Varyantsız ürün kontrolü (stockKey === 'default')
                                        if (stockKey === 'default') {
                                            console.log(`Varyantsız ürün tespit edildi: ${productId}`);
                                            
                                            // Varyantsız ürünün stok değerini kontrol et
                                            if (productData.fields && productData.fields.stock && productData.fields.stock.integerValue) {
                                                const currentStock = parseInt(productData.fields.stock.integerValue);
                                                const newStock = currentStock + quantity;
                                                
                                                console.log(`Varyantsız ürün stok güncelleniyor: ${productId}, ${currentStock} -> ${newStock}`);
                                                
                                                // Stok değerini güncelle
                                                try {
                                                    const updateXhr = new XMLHttpRequest();
                                                    updateXhr.open('PATCH', `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products/${productId}?updateMask.fieldPaths=stock`, false);
                                                    updateXhr.setRequestHeader('Content-Type', 'application/json');
                                                    updateXhr.send(JSON.stringify({
                                                        fields: {
                                                            stock: { integerValue: newStock.toString() }
                                                        }
                                                    }));
                                                    
                                                    if (updateXhr.status >= 200 && updateXhr.status < 300) {
                                                        console.log(`VARYANTSİZ ÜRÜN STOĞU BAŞARIYLA GERİ YÜKLENDİ: ${productId}, ${currentStock} -> ${newStock}`);
                                                    } else {
                                                        throw new Error(`HTTP Kodu: ${updateXhr.status}`);
                                                    }
                                                } catch (updateError) {
                                                    console.error(`Varyantsız ürün stok güncellemesi başarısız: ${updateError.message}`);
                                                    
                                                    // Alternatif yöntem
                                                    try {
                                                        const restXhr = new XMLHttpRequest();
                                                        restXhr.open('PATCH', `https://${projectId}.firebaseio.com/products/${productId}.json`, false);
                                                        restXhr.setRequestHeader('Content-Type', 'application/json');
                                                        restXhr.send(JSON.stringify({ stock: newStock }));
                                                        
                                                        if (restXhr.status >= 200 && restXhr.status < 300) {
                                                            console.log(`VARYANTSİZ ÜRÜN STOĞU BAŞARIYLA GERİ YÜKLENDİ (REST API): ${productId}, ${currentStock} -> ${newStock}`);
                                                        } else {
                                                            console.error(`Varyantsız ürün alternatif stok güncellemesi başarısız: HTTP Kodu ${restXhr.status}`);
                                                        }
                                                    } catch (restError) {
                                                        console.error(`Varyantsız ürün tüm stok güncelleme yöntemleri başarısız oldu: ${restError.message}`);
                                                    }
                                                }
                                            } else {
                                                console.error(`Varyantsız ürün stok verisi bulunamadı: ${productId}`);
                                            }
                                        } 
                                        // Varyantlı ürün işleme
                                        else if (productData.fields && productData.fields.stock && productData.fields.stock.mapValue && 
                                            productData.fields.stock.mapValue.fields) {
                                            
                                            const stockFields = productData.fields.stock.mapValue.fields;
                                            const currentStock = stockFields[stockKey] && stockFields[stockKey].integerValue ? 
                                                parseInt(stockFields[stockKey].integerValue) : 0;
                                            const newStock = currentStock + quantity;
                                            
                                            console.log(`Stok güncelleniyor: ${productId}, ${stockKey}, ${currentStock} -> ${newStock}`);
                                            
                                            // Stok değerini güncelle - YÖNTEM 1: Tüm stok nesnesini güncelle
                                            try {
                                                const updateXhr = new XMLHttpRequest();
                                                // Tüm stok nesnesini güncelleyelim, özel alan yolu belirtmeden
                                                updateXhr.open('PATCH', `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products/${productId}?updateMask.fieldPaths=stock`, false);
                                                updateXhr.setRequestHeader('Content-Type', 'application/json');
                                                
                                                // Mevcut stok nesnesinin bir kopyasını oluştur ve güncelle
                                                const updatedStockFields = {};
                                                for (const key in stockFields) {
                                                    if (stockFields.hasOwnProperty(key)) {
                                                        const value = stockFields[key].integerValue ? 
                                                            parseInt(stockFields[key].integerValue) : 0;
                                                        updatedStockFields[key] = { integerValue: key === stockKey ? newStock.toString() : value.toString() };
                                                    }
                                                }
                                                
                                                updateXhr.send(JSON.stringify({
                                                    fields: {
                                                        stock: {
                                                            mapValue: {
                                                                fields: updatedStockFields
                                                            }
                                                        }
                                                    }
                                                }));
                                                
                                                if (updateXhr.status >= 200 && updateXhr.status < 300) {
                                                    console.log(`STOK BAŞARIYLA GERİ YÜKLENDİ: ${productId}, ${stockKey}, ${currentStock} -> ${newStock}`);
                                                } else {
                                                    throw new Error(`HTTP Kodu: ${updateXhr.status}`);
                                                }
                                            } catch (updateError) {
                                                console.error(`Yöntem 1 başarısız oldu: ${updateError.message}`);
                                                
                                                // YÖNTEM 2: Firebase REST API kullan
                                                try {
                                                    const restXhr = new XMLHttpRequest();
                                                    restXhr.open('PATCH', `https://${projectId}.firebaseio.com/products/${productId}/stock.json`, false);
                                                    restXhr.setRequestHeader('Content-Type', 'application/json');
                                                    
                                                    // Tüm stok nesnesini oluştur
                                                    const stockData = {};
                                                    for (const key in stockFields) {
                                                        if (stockFields.hasOwnProperty(key)) {
                                                            const value = stockFields[key].integerValue ? 
                                                                parseInt(stockFields[key].integerValue) : 0;
                                                            stockData[key] = key === stockKey ? newStock : value;
                                                        }
                                                    }
                                                    
                                                    restXhr.send(JSON.stringify(stockData));
                                                    
                                                    if (restXhr.status >= 200 && restXhr.status < 300) {
                                                        console.log(`STOK BAŞARIYLA GERİ YÜKLENDİ (REST API): ${productId}, ${stockKey}, ${currentStock} -> ${newStock}`);
                                                    } else {
                                                        throw new Error(`HTTP Kodu: ${restXhr.status}`);
                                                    }
                                                } catch (restError) {
                                                    console.error(`Yöntem 2 de başarısız oldu: ${restError.message}`);
                                                    
                                                    // YÖNTEM 3: Sadece belirli stok alanını güncelle
                                                    try {
                                                        const directXhr = new XMLHttpRequest();
                                                        directXhr.open('PATCH', `https://${projectId}.firebaseio.com/products/${productId}/stock/${encodeURIComponent(stockKey)}.json`, false);
                                                        directXhr.setRequestHeader('Content-Type', 'application/json');
                                                        directXhr.send(JSON.stringify(newStock));
                                                        
                                                        if (directXhr.status >= 200 && directXhr.status < 300) {
                                                            console.log(`STOK BAŞARIYLA GERİ YÜKLENDİ (DOĞRUDAN): ${productId}, ${stockKey}, ${currentStock} -> ${newStock}`);
                                                        } else {
                                                            console.error(`Yöntem 3 de başarısız oldu: HTTP Kodu ${directXhr.status}`);
                                                        }
                                                    } catch (directError) {
                                                        console.error(`Tüm stok güncelleme yöntemleri başarısız oldu: ${directError.message}`);
                                                    }
                                                }
                                            }
                                        } else {
                                            console.error(`Ürün stok verisi bulunamadı: ${productId}`);
                                        }
                                    } else {
                                        console.error(`Ürün bilgisi alınamadı: ${productId}, HTTP Kodu: ${productXhr.status}`);
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Rezervasyon belgesini sil
                const deleteXhr = new XMLHttpRequest();
                deleteXhr.open('DELETE', `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stockReservations/${stockReservationId}`, false);
                deleteXhr.send();
                
                if (deleteXhr.status >= 200 && deleteXhr.status < 300) {
                    console.log('Rezervasyon belgesi başarıyla silindi ve stoklar geri yüklendi');
                } else {
                    console.error('Rezervasyon belgesi silinemedi:', deleteXhr.statusText);
                }
                
                // LocalStorage'dan rezervasyon bilgilerini temizle
                localStorage.removeItem(RESERVATION_ID_KEY);
                localStorage.removeItem(RESERVATION_EXPIRY_KEY);
            } catch (error) {
                console.error('Sayfa kapanırken rezervasyon iptal edilemedi:', error);
            }
        }
    }
    
    // Sepet sayısını görünür yap
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        cartCount.style.display = ''; // display: none ise kaldır
    }
    
    // firebase-init.js dosyası kullanıcı giriş kontrollerini ve yükleniyor ekranını yönetiyor
    // Kullanıcı giriş yapmışsa sipariş özetini yükle
    setTimeout(async () => {
        const user = firebase.auth().currentUser;
        if (user) {
            console.log('Kullanıcı giriş yapmış, sipariş özeti yükleniyor:', user.email);
            
            // Sepet sayısını güncelle
            updateCartCount(user.uid);
            await loadOrderSummary();
            updateCartCount(user.uid);
            
            // Sepet verilerini al ve stok rezervasyonu oluştur
            try {
                const cartRef = firebase.firestore().collection('carts').doc(user.uid);
                const cartSnap = await cartRef.get();
                
                if (cartSnap.exists && cartSnap.data().items && cartSnap.data().items.length > 0) {
                    const cartItems = cartSnap.data().items;
                    console.log('Stok rezervasyonu için sepet öğeleri:', cartItems.length);
                    
                    // Stok rezervasyonu oluştur
                    stockReservationId = await createStockReservation(cartItems);
                    
                    if (stockReservationId) {
                        console.log('Stok rezervasyonu oluşturuldu, ID:', stockReservationId);
                        
                        // Rezervasyon süresi dolunca otomatik iptal için zamanlayıcı ayarla
                        stockReservationTimer = setTimeout(handleStockReservationExpiry, RESERVATION_DURATION);
                        
                        // Kullanıcıya bilgi ver
                        const reservationInfo = document.createElement('div');
                        reservationInfo.className = 'reservation-info';
                        reservationInfo.innerHTML = `
                            <p>Ürünler için 15 dakikalık stok rezervi yapıldı. Bu süre içinde ödeme işleminizi tamamlayabilirsiniz.</p>
                            <div class="reservation-timer">Kalan süre: <span id="reservation-countdown">15:00</span></div>
                        `;
                        
                        const orderSummary = document.querySelector('.order-summary-container');
                        if (orderSummary) {
                            orderSummary.insertAdjacentElement('afterbegin', reservationInfo);
                            
                            // Geri sayım sayacı
                            const countdownElement = document.getElementById('reservation-countdown');
                            if (countdownElement) {
                                let timeLeft = RESERVATION_DURATION / 1000; // saniye cinsinden
                                const countdownInterval = setInterval(() => {
                                    timeLeft--;
                                    if (timeLeft <= 0) {
                                        clearInterval(countdownInterval);
                                        countdownElement.textContent = '00:00';
                                        return;
                                    }
                                    
                                    const minutes = Math.floor(timeLeft / 60);
                                    const seconds = timeLeft % 60;
                                    countdownElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                                }, 1000);
                            }
                        }
                    } else {
                        console.log('Stok rezervasyonu oluşturulamadı');
                    }
                } else {
                    console.log('Sepet boş, stok rezervasyonu yapılmadı');
                }
            } catch (error) {
                console.error('Stok rezervasyonu oluşturulurken hata:', error);
            }
        } else {
            console.log('Kullanu0131cu0131 henu00fcz yu00fcklenmedi veya giriu015f yapmadu0131');
        }
    }, 1000); // firebase-init.js'in kullanu0131cu0131yu0131 yu00fcklemesi iu00e7in biraz bekle
    
    // Modal kapatma butonuna event ekle
    const modalCloseBtn = document.querySelector('.modal-close');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closePaymentModal);
    }
    
    // Modal du0131u015fu0131nda tu0131klama ile kapatma
    const paymentModal = document.getElementById('paymentModal');
    if (paymentModal) {
        paymentModal.addEventListener('click', function(e) {
            if (e.target === paymentModal) {
                closePaymentModal();
            }
        });
    }
    
    // Form alanları için validasyon
    const cardHolder = document.getElementById('cardHolder'); // ID'yi düzelttim: cardName -> cardHolder
    const cardNumber = document.getElementById('cardNumber');
    const expiryDate = document.getElementById('expiryDate');
    const cvv = document.getElementById('cvv');
    const address = document.getElementById('address');
    
    if (cardHolder) {
        // Kart üzerindeki isim kontrolü ve formatı
        cardHolder.addEventListener('keypress', onlyLetters);
        cardHolder.addEventListener('input', function() {
            let value = this.value.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ\s]/g, '');
            this.value = capitalizeWords(value);
        });
    }
    
    if (address) {
        // Adres formatı
        address.addEventListener('input', function() {
            this.value = capitalizeWords(this.value);
        });
    }
    
    if (cardNumber) {
        // Kart numarasu0131 kontrolu00fc ve formatu0131
        cardNumber.addEventListener('keypress', onlyNumbers);
        cardNumber.addEventListener('input', function() {
            // u00d6nce sadece rakamları al
            let value = this.value.replace(/\D/g, '');
            
            // 4'er haneli gruplara ayu0131r
            let formattedValue = '';
            for (let i = 0; i < value.length && i < 16; i++) {
                if (i > 0 && i % 4 === 0) {
                    formattedValue += ' ';
                }
                formattedValue += value[i];
            }
            
            // Formatlanu0131mu015f deu011feri input'a ata
            this.value = formattedValue;
        });
    }
    
    if (expiryDate) {
        // Son kullanma tarihi formatu0131 (AA/YY)
        expiryDate.addEventListener('keypress', onlyNumbers);
        expiryDate.addEventListener('input', function(e) {
            // Eu011fer backspace ile silme iu015flemi yapu0131lu0131yorsa, normal davran
            if (e.inputType === 'deleteContentBackward') {
                if (this.value.endsWith('/')) {
                    this.value = this.value.slice(0, -1);
                }
                return;
            }
            
            // Sadece rakamları al
            let value = this.value.replace(/\D/g, '');
            
            // 4 rakamdan fazlasu0131nu0131 alma
            value = value.substring(0, 4);
            
            // AA/YY formatu0131na u00e7evir
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2);
            }
            
            this.value = value;
        });
    }
    
    if (cvv) {
        // CVV kontrolu00fc
        cvv.addEventListener('keypress', onlyNumbers);
        cvv.addEventListener('input', function() {
            this.value = this.value.replace(/[^\d]/g, '').substring(0, 3);
        });
    }
    
    // Ödeme formunu dinle
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
        // Form alanlarına blur eventi ekle (kullanıcı alanı terk ettiğinde kontrol)
        const formInputs = paymentForm.querySelectorAll('input, select, textarea');
        formInputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateInput(this);
            });
        });
        
        paymentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            clearAllErrors(); // Önceki hataları temizle
            // Adres dropdown validasyonu
            let hasAddressError = false;
            // Teslimat adresi kontrolü
            const deliveryAddressSelected = document.getElementById('delivery-address-selected');
            const deliveryAddressError = document.getElementById('delivery-address-error');
            let deliveryValue = '';
            if (deliveryAddressSelected) {
                deliveryValue = deliveryAddressSelected.getAttribute('data-value') || deliveryAddressSelected.textContent.trim();
                if (!deliveryValue || deliveryValue === 'Adres seçiniz' || deliveryValue === 'Kayıtlı teslimat adresi yok') {
                    deliveryAddressError.textContent = '*Teslimat adresi seçmelisiniz.';
                    deliveryAddressError.style.display = 'block';
                    hasAddressError = true;
                } else {
                    deliveryAddressError.textContent = '';
                    deliveryAddressError.style.display = 'none';
                }
            }
            // Fatura adresi kontrolü
            const invoiceAddressSelected = document.getElementById('invoice-address-selected');
            const invoiceAddressError = document.getElementById('invoice-address-error');
            let invoiceValue = '';
            if (invoiceAddressSelected) {
                invoiceValue = invoiceAddressSelected.getAttribute('data-value') || invoiceAddressSelected.textContent.trim();
                if (!invoiceValue || invoiceValue === 'Adres seçiniz' || invoiceValue === 'Kayıtlı fatura adresi yok') {
                    invoiceAddressError.textContent = '*Fatura adresi seçmelisiniz.';
                    invoiceAddressError.style.display = 'block';
                    hasAddressError = true;
                } else {
                    invoiceAddressError.textContent = '';
                    invoiceAddressError.style.display = 'none';
                }
            }
            if (hasAddressError) return; // Adres hatası varsa devam etme
            
            // Form validasyonu
            if (!validateForm()) {
                return false;
            }
            
            // Ödeme butonunu devre dışı bırak
            const submitButton = document.querySelector('#payment-form button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<span class="spinner"></span> İşlem Yapılıyor...';
            }
            
            // Form verilerini al
            // Form verilerini doğrudan input elementlerinden al (FormData kullanımı yerine)
            // Bu yaklaşım, name özelliği olmayan input'lar için daha güvenilir
            const cardNumber = document.getElementById('cardNumber').value.replace(/\s+/g, '');
            const cardName = document.getElementById('cardHolder').value; // cardHolder ID'sini kullan
            const cardExpiry = document.getElementById('expiryDate').value; // expiryDate ID'sini kullan
            const cardCVC = document.getElementById('cvv').value; // cvv ID'sini kullan
            
            // Teslimat bilgilerini al
            // Adres dropdownlarından seçili adresi al
            let address = '';
            const deliverySelected = document.getElementById('delivery-address-selected');
            if (deliverySelected) {
                address = deliverySelected.getAttribute('data-value') || deliverySelected.textContent.trim();
            }
            
            // HTML'de olmayan alanlar için varsayılan değerler
            const fullName = cardName; // Kart sahibinin adını kullan
            const phone = ''; // Boş bırak, gerekirse daha sonra eklenebilir
            const city = ''; // Form'da city alanı yok
            const district = ''; // Form'da district alanı yok
            const zipCode = ''; // Form'da zipCode alanı yok
            const notes = ''; // Form'da notes alanı yok
            
            // Ödeme verilerini hazırla
            const paymentData = {
                cardInfo: {
                    number: cardNumber,
                    name: cardName,
                    expiry: cardExpiry,
                    cvc: cardCVC
                },
                shippingInfo: {
                    fullName: fullName,
                    phone: phone,
                    address: address,
                    city: city,
                    district: district,
                    zipCode: zipCode
                },
                notes: notes || ''
            };
            
            // Kullanıcı kontrolü
            const user = firebase.auth().currentUser;
            if (!user) {
                showPaymentResult(false, 'Kullanıcı girişi gerekiyor');
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Ödemeyi Tamamla';
                }
                return;
            }
            
            // Sepeti kontrol et
            const cartRef = firebase.firestore().collection('carts').doc(user.uid);
            const cartSnap = await cartRef.get();
            
            if (!cartSnap.exists || !cartSnap.data().items || cartSnap.data().items.length === 0) {
                showPaymentResult(false, 'Sepetinizde ürün yok');
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Ödemeyi Tamamla';
                }
                return;
            }
            
            // Sepet öğelerini al
            const cartItems = cartSnap.data().items;
            
            try {
                // Sipariş numarası oluştur
                const orderNumber = generateOrderNumber();
                
                // Adres objelerini al
                let shippingAddressObj = null;
                let billingAddressObj = null;
                try {
                    shippingAddressObj = JSON.parse(localStorage.getItem('selectedDeliveryAddressObj'));
                } catch(e) { shippingAddressObj = null; }
                try {
                    billingAddressObj = JSON.parse(localStorage.getItem('selectedInvoiceAddressObj'));
                } catch(e) { billingAddressObj = null; }
                const selectedDeliveryAddress = localStorage.getItem('selectedDeliveryAddress') || '';
                const selectedInvoiceAddress = localStorage.getItem('selectedInvoiceAddress') || '';
                
                // Sipariş verilerini hazırla
                const orderData = {
                    orderNumber: orderNumber,
                    userId: user.uid,
                    userEmail: user.email,
                    items: cartItems,
                    shippingInfo: shippingAddressObj || { address: selectedDeliveryAddress },
                    billingInfo: billingAddressObj || { address: selectedInvoiceAddress },
                    paymentInfo: {
                        cardLast4: paymentData.cardInfo.number.slice(-4),
                        cardType: getCardType(paymentData.cardInfo.number)
                    },
                    totalAmount: cartItems.reduce((total, item) => total + (item.price * item.quantity), 0),
                    status: 'processing',
                    notes: paymentData.notes,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                console.log('Sipariş verileri hazırlandı:', orderData);
                
                // Stok rezervasyonu kontrolü
                if (stockReservationId) {
                    console.log('Stok rezervasyonu bulundu, ID:', stockReservationId);
                    
                    // Ödeme işlemini gerçekleştir
                    const paymentResult = await processPayment(orderData);
                    
                    if (paymentResult.success) {
                        // Rezervasyonu onayla
                        await confirmStockReservation(stockReservationId);
                        console.log('Stok rezervasyonu onaylandı');
                        
                        // Bildirim oluştur
                        // Bildirim sadece processPayment fonksiyonu içinde oluşturulacak. Buradaki çağrı kaldırıldı.
                        
                        // Sepeti temizle
                        await clearCart(user.uid);
                        
                        // Ödeme başarılı olarak işaretle
                        window.paymentCompleted = true;
                        
                        // Başarılı ödeme sonucunu göster
                        showPaymentResult(true, 'Ödemeniz başarıyla alındı. Sipariş numaranız: ' + orderNumber);
                        
                        // Ödeme butonunu aktif et
                        if (submitButton) {
                            submitButton.disabled = false;
                            submitButton.innerHTML = 'Ödemeyi Tamamla';
                        }
                        
                        // Rezervasyon zamanlayıcısını temizle
                        if (stockReservationTimer) {
                            clearTimeout(stockReservationTimer);
                            stockReservationTimer = null;
                        }
                        
                        // Sayfa terk etme uyarısını kaldır
                        window.removeEventListener('pagehide', handlePageUnload);
                        window.removeEventListener('beforeunload', handlePageUnload);
                        
                        // 3 saniye sonra müşteri paneline yönlendir
                        setTimeout(() => {
                            window.location.href = 'customer-panel.html';
                        }, 3000);
                    } else {
                        // Rezervasyonu iptal et
                        await cancelStockReservation(stockReservationId, 'ödeme başarısız');
                        console.log('Ödeme başarısız, stok rezervasyonu iptal edildi');
                        
                        // Başarısız ödeme mesajı göster
                        showPaymentResult(false, 'Ödeme işlemi başarısız oldu: ' + paymentResult.message);
                        
                        // Ödeme butonunu aktif et
                        if (submitButton) {
                            submitButton.disabled = false;
                            submitButton.innerHTML = 'Ödemeyi Tamamla';
                        }
                    }
                } else {
                    console.log('Stok rezervasyonu bulunamadı, normal stok güncellemesi yapılacak');
                    
                    // Ödeme işlemini gerçekleştir
                    const paymentResult = await processPayment(orderData);
                    
                    if (paymentResult.success) {
                        console.log('Ödeme başarılı, stoklar güncelleniyor...');
                        
                        try {
                            // Stokları güncelle
                            await updateProductStocksAfterOrder(cartItems);
                            console.log('Stoklar başarıyla güncellendi');
                            
                            // Bildirim oluştur
                            // Bildirim sadece processPayment fonksiyonu içinde oluşturulacak. Buradaki çağrı kaldırıldı.
                            
                            // Sepeti temizle
                            await clearCart(user.uid);
                            
                            // Başarılı ödeme mesajı göster
                            showPaymentResult(true, 'Ödeme başarıyla tamamlandı. Siparişiniz işleme alındı.');
                            
                            // 3 saniye sonra ana sayfaya yönlendir
                            setTimeout(() => {
                                window.location.href = 'customer-panel.html';
                            }, 3000);
                        } catch (error) {
                            console.error('Stok güncellemesi sırasında hata:', error);
                            showPaymentResult(false, 'Stok güncellemesi sırasında bir hata oluştu: ' + error.message);
                            
                            // Ödeme butonunu aktif et
                            if (submitButton) {
                                submitButton.disabled = false;
                                submitButton.innerHTML = 'Ödemeyi Tamamla';
                            }
                        }
                    } else {
                        // Başarısız ödeme mesajı göster
                        showPaymentResult(false, 'Ödeme işlemi başarısız oldu: ' + paymentResult.message);
                        
                        // Ödeme butonunu aktif et
                        if (submitButton) {
                            submitButton.disabled = false;
                            submitButton.innerHTML = 'Ödemeyi Tamamla';
                        }
                    }
                }
            } catch (error) {
                console.error('Ödeme işlemi sırasında hata:', error);
                showPaymentResult(false, 'Ödeme işlemi sırasında bir hata oluştu: ' + error.message);
                
                // Ödeme butonunu aktif et
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Ödemeyi Tamamla';
                }
            }
        });
    }
});

// product-page.js - Ürün sayfası işlevleri (Firestore tabanlı)
// Bu dosya sadece ürün detaylarını göstermek için kullanılır
// Sepet işlevselliği product-page.html içinde yönetiliyor

// DOM elementleri
let productTitle = null;
let productDescription = null;
let productPrice = null;
let mainImage = null;
let thumbnailContainer = null;
let variantSelect = null;
let addToCartBtn = null;
let decreaseBtn = null;
let increaseBtn = null;
let stockWarning = null;

// Ürün verisini Firestore'dan al
let currentProduct = null;
let selectedVariants = {};
let quantity = 1; // Varsayılan miktar

// URL'den ürün bilgilerini al ve Firestore'dan ürünü getir
async function getProductFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    const index = parseInt(params.get('index'));
    // Ürün ID'si için hem 'productId' hem de 'id' parametrelerini kontrol et (geriye dönük uyumluluk için)
    const productId = params.get('productId') || params.get('id') || params.get('product');
    
    // Ürün arama işlemi başlatılıyor
    
    if (!productId) {
        // Ürün bulunamadı: Ürün ID eksik
        return null;
    }
    
    try {
        // Önce doğrudan belge ID'si olarak deneyelim (Firestore belge ID'si)
        try {
            const productDoc = await firebase.firestore().collection("products").doc(productId).get();
            if (productDoc.exists) {
                // Ürün belge ID ile bulundu
                const data = productDoc.data();
                data.id = productDoc.id; // Belge ID'sini ürün ID'si olarak ekleyelim
                // Ürün verileri alındı
                return data;
            }
        } catch (error) {
            // Belge ID ile arama hatası
        }
        
        // Ürünü Firestore'dan al (ürün ID'si ile)
        const productsRef = firebase.firestore().collection('products');
        
        // ID'nin türünü kontrol et ve sorguyu buna göre oluştur
        let querySnapshot;
        
        // Ürün ID'si sayısal olabilir, string'e çevirelim
        const productIdStr = String(productId);
        
        // Önce string olarak deneyelim
        querySnapshot = await productsRef.where('id', '==', productIdStr).get();
        
        // Eğer sonuç boşsa, sayısal değer olarak deneyelim
        if (querySnapshot.empty && !isNaN(productId)) {
            const productIdNum = Number(productId);
            querySnapshot = await productsRef.where('id', '==', productIdNum).get();
        }
        
        // Sorgu sonucunu işle
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            const data = doc.data();
            data.id = doc.id; // Belge ID'sini ürün ID'si olarak ekleyelim
            return data;
        }
        
        // Hala sonuç yoksa, tüm ürünleri çekip JavaScript tarafında filtreleme yapalım
        const allProductsSnapshot = await productsRef.get();
        
        // Tüm ürünleri kontrol et
        let foundProduct = null;
        allProductsSnapshot.forEach(doc => {
            const data = doc.data();
            
            // ID'leri karşılaştır (string olarak)
            if (data.id && String(data.id) === productIdStr) {
                data.id = doc.id; // Belge ID'sini de ekleyelim
                foundProduct = data;
            }
        });
        
        if (foundProduct) {
            return foundProduct;
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

// Sayfa yüklendiğinde çalışacak fonksiyon
document.addEventListener('DOMContentLoaded', function() {
    initializeProduct();
    updateCartCount();
    updateCartUI(); // Sepet arayüzünü güncelle
    
    // Stok uyarı popup'ı için event listener'lar
    document.querySelectorAll('#stock-popup .close-popup, #stock-popup-ok').forEach(element => {
        element.addEventListener('click', function() {
            document.getElementById('stock-popup').style.display = 'none';
        });
    });
});

// Ürün bilgilerini yükle
function initializeProduct() {
    // Varyantsız ürün ise miktar inputunun max değerini stok kadar ayarla
    if (!currentProduct) return;
    
    if (!currentProduct.variants || currentProduct.variants.length === 0) {
        const quantityInput = document.getElementById('quantity');
        if (quantityInput) {
            quantityInput.max = currentProduct.stock || 10;
        }
    }

    // Ürün adı ve fiyatını güncelle
    document.getElementById('productName').textContent = currentProduct.name;
    let priceText = getDisplayPrice(currentProduct, selectedVariants, true);
    document.getElementById('productPrice').textContent = priceText;
    document.getElementById('productDescription').textContent = currentProduct.description;

    // Ana görseli yükle
    const mainImage = document.getElementById('mainImage');
    if (mainImage) {
        let variantImage = null;
        if (currentProduct.variantImages && Object.keys(selectedVariants).length > 0) {
            const variantKey = Object.values(selectedVariants).join('-');
            if (currentProduct.variantImages[variantKey]) {
                variantImage = currentProduct.variantImages[variantKey];
            }
        }
        mainImage.src = variantImage || currentProduct.image;
        mainImage.alt = currentProduct.name;
    }

    // Varyant seçeneklerini oluştur
    const variantContainer = document.querySelector('.variant-options');
    if (variantContainer && currentProduct.variants) {
        variantContainer.innerHTML = '';
        
        // Her varyant için bir grup oluştur
        currentProduct.variants.forEach(variant => {
            const variantGroup = document.createElement('div');
            variantGroup.className = 'variant-group';
            const variantId = variant.name.toLowerCase().replace(/\s+/g, '-');

            // Sadece stoğu 0'dan büyük olan değerleri bul
            const availableValues = variant.values.filter(val => {
                // Bu varyant değerinin dahil olduğu herhangi bir kombinasyonun stoğu > 0 ise göster
                return Object.keys(currentProduct.stock || {}).some(key => {
                    if (!currentProduct.stock[key] || currentProduct.stock[key] <= 0) return false;
                    // Varyant anahtarında bu değer var mı?
                    // Anahtarlar "Renk-Beden" gibi birleşik, bu yüzden split ile kontrol
                    const parts = key.split('-');
                    // Varyant sırasını bul
                    const variantIndex = currentProduct.variants.findIndex(v => v.name === variant.name);
                    return parts[variantIndex] === val;
                });
            });

            variantGroup.innerHTML = `
                <h3>${variant.name} Seçenekleri</h3>
                <div id="${variantId}Variants" class="variant-buttons"></div>
            `;
            variantContainer.appendChild(variantGroup);

            createVariantButtons(`${variantId}Variants`, availableValues, variant.name);
        });
    }
}

// Ortak fiyat hesaplama fonksiyonu
function getDisplayPrice(product, selectedVariants = {}, includeStockCheck = false) {
    // Fiyat bilgisi kontrolleri
    
    if (typeof product.price === 'object') {
        // Varyant anahtarı oluştur
        const variantKey = Object.values(selectedVariants).join('-');
        if (variantKey && product.price[variantKey] !== undefined && typeof product.price[variantKey] === 'number') {
            return product.price[variantKey].toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' TL';
        } else {
            // Sadece stoğu 0'dan büyük olan varyantların fiyatları
            let validPrices;
            if (includeStockCheck && product.stock) {
                validPrices = Object.keys(product.price)
                    .filter(key => product.stock[key] > 0)
                    .map(key => product.price[key])
                    .filter(p => typeof p === 'number');
            } else {
                validPrices = Object.values(product.price).filter(p => typeof p === 'number');
            }
            if (validPrices.length > 0) {
                return (Math.min(...validPrices)).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' TL*';
            } else {
                return 'Varyantlı';
            }
        }
    } else if (typeof product.price === 'number') {
        // Sayısal fiyat değeri
        return product.price.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' TL';
    } else if (typeof product.price === 'string') {
        // String fiyat değeri - Firestore'dan gelen veri
        // Fiyat formatını kontrol et (örn: '1299.99 TL' veya '1.299,99 TL')
        if (product.price.includes('TL')) {
            // Zaten formatlanmış fiyat
            return product.price;
        } else {
            // Sayıya çevirmeyi dene
            const numericPrice = parseFloat(product.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
            if (!isNaN(numericPrice)) {
                return numericPrice.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' TL';
            }
            // Çevrilemezse olduğu gibi göster
            return product.price;
        }
    } else {
        return 'Fiyat bilgisi bulunamadı';
    }
}

// Ana görseli güncelle
function updateMainImage(imageSrc) {
    const mainImage = document.getElementById('mainImage');
    if (mainImage && imageSrc) {
        mainImage.src = imageSrc;
    } else if (mainImage && currentProduct) {
        // Ürün resmi farklı formatlarda olabilir
        let imageUrl = null;
        
        if (currentProduct.images && currentProduct.images.length > 0) {
            imageUrl = currentProduct.images[0];
        } else if (currentProduct.image) {
            imageUrl = currentProduct.image;
        } else if (currentProduct.imageUrl) {
            imageUrl = currentProduct.imageUrl;
        }
        
        if (imageUrl) {
            mainImage.src = imageUrl;
            mainImage.alt = currentProduct.name || 'Ürün Görseli';
        } else {
            mainImage.src = 'https://via.placeholder.com/400x300?text=G%C3%B6rsel+Yok';
            mainImage.alt = 'Görsel Bulunamadı';
        }
    }
}

// Varyant butonlarını oluştur
function createVariantButtons(containerId, values, variantName) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = ''; // Mevcut butonları temizle

    values.forEach(value => {
        const button = document.createElement('button');
        button.textContent = value;
        button.className = 'variant-btn';
        
        if (selectedVariants[variantName] === value) {
            button.classList.add('selected');
        }

        button.addEventListener('click', () => {
            // Seçili varyantı güncellemeden önce, yeni kombinasyonun stoğunu kontrol et
            const tempSelected = Object.assign({}, selectedVariants);
            tempSelected[variantName] = value;
            const variantKey = currentProduct.variants.map(v => tempSelected[v.name] || '').join('-');
            let isValid = true;
            if (currentProduct.stock && currentProduct.variants.length > 1) {
                // Tüm varyantlar seçildiyse kombinasyonun stoğunu kontrol et
                const allSelected = currentProduct.variants.every(v => tempSelected[v.name]);
                if (allSelected && (!currentProduct.stock[variantKey] || currentProduct.stock[variantKey] <= 0)) {
                    isValid = false;
                }
            } else if (currentProduct.stock && currentProduct.variants.length === 1) {
                // Tek varyantlı ürünlerde doğrudan kontrol
                if (!currentProduct.stock[value] || currentProduct.stock[value] <= 0) {
                    isValid = false;
                }
            }
            if (!isValid) {
                // Pop-up uyarı göster, seçime izin verme
                const stockPopup = document.getElementById('stock-popup');
                const stockPopupMessage = document.getElementById('stock-popup-message');
                const stockPopupOk = document.getElementById('stock-popup-ok');
                const closePopupButtons = document.querySelectorAll('.close-popup');
                
                // Popup kapatma fonksiyonları
                const closePopups = () => {
                    stockPopup.style.display = 'none';
                };
                
                // Kapatma butonlarına olay dinleyicileri ekle
                closePopupButtons.forEach(button => {
                    button.addEventListener('click', closePopups);
                });
                
                // Popup dışına tıklanmasını dinle
                window.addEventListener('click', (event) => {
                    if (event.target === stockPopup) {
                        stockPopup.style.display = 'none';
                    }
                });
                
                // Stok uyarı popup'ını göster
                stockPopupMessage.innerHTML = '<b>Bu varyant seçeneği stoğumuzda mevcut değildir!</b>';
                stockPopup.style.display = 'block';
                
                // Tamam butonuna tıklandığında
                stockPopupOk.onclick = closePopups;
                
                return;
            }
            // Seçili varyantı güncelle
            selectedVariants[variantName] = value;
            // Diğer butonların seçimini kaldır
            container.querySelectorAll('.variant-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            // Seçili butonu işaretle
            button.classList.add('selected');

            // Fiyatı güncelle
            let priceText = getDisplayPrice(currentProduct, selectedVariants, true);
            document.getElementById('productPrice').textContent = priceText;

            // Varyant görselini güncelle
            const mainImage = document.getElementById('mainImage');
            if (mainImage && currentProduct.variantImages) {
                let variantImage = null;
                const variantKey = Object.values(selectedVariants).join('-');
                if (currentProduct.variantImages[variantKey]) {
                    variantImage = currentProduct.variantImages[variantKey];
                }
                mainImage.src = variantImage || currentProduct.image;
            }

            // Stok durumunu kontrol et
            updateStockStatus();

            // Varyant değişince stok uyarısını gizle ve miktar inputunu sıfırla
            const warningDiv = document.getElementById('stock-warning');
            if (warningDiv) warningDiv.style.display = 'none';
            const quantityInput = document.getElementById('quantity');
            if (quantityInput) quantityInput.value = '1';

            // Seçili varyantları konsola yazdır (debug için)
        });

        container.appendChild(button);
    });
}

// Stok durumunu kontrol et ve güncelle
function updateStockStatus() {
    // Tüm varyantların seçili olup olmadığını kontrol et
    const allVariantsSelected = currentProduct.variants.every(variant => 
        selectedVariants[variant.name] !== undefined
    );

    const addToCartBtn = document.querySelector('.add-to-cart-btn');
    const quantityInput = document.getElementById('quantity');
    let warningDiv = document.getElementById('stock-warning');
    if (!warningDiv) {
        warningDiv = document.createElement('div');
        warningDiv.id = 'stock-warning';
        warningDiv.style.color = 'red';
        warningDiv.style.margin = '10px 0';
        const container = document.querySelector('.product-info') || document.querySelector('.product-details') || document.body;
        container.appendChild(warningDiv);
    }

    if (!allVariantsSelected) {
        if (addToCartBtn) addToCartBtn.disabled = true;
        if (quantityInput) quantityInput.disabled = true;
        return;
    }

    const stockAmount = getAvailableStock();

    if (stockAmount <= 0) {
        if (addToCartBtn) addToCartBtn.disabled = true;
        if (quantityInput) quantityInput.disabled = true;
    } else {
        if (addToCartBtn) addToCartBtn.disabled = false;
        if (quantityInput) quantityInput.disabled = false;
    }
}

// Kullanılabilir stok miktarını hesapla
function getAvailableStock() {
    if (!currentProduct) return 0;

    // Varyantlı ürün için stok kontrolü
    if (currentProduct.variants && currentProduct.variants.length > 0) {
        // Tüm varyantlar seçili mi kontrol et
        const allSelected = currentProduct.variants.every(v => selectedVariants[v.name]);
        if (!allSelected) return 0; // Tüm varyantlar seçili değilse stok gösterme

        // Varyant anahtarını oluştur
        const variantKey = currentProduct.variants.map(v => selectedVariants[v.name]).join('-');
        
        // Stok bilgisi obje olarak saklanıyorsa
        if (currentProduct.stock && typeof currentProduct.stock === 'object') {
            return currentProduct.stock[variantKey] || 0;
        }
    } else {
        // Varyantsız ürün için stok kontrolü
        if (typeof currentProduct.stock === 'number') {
            return currentProduct.stock;
        }
    }

    return 0; // Varsayılan olarak stok yok
}

// Seçili varyant için maksimum stok miktarını al (geriye dönük uyumluluk için)
function getMaxStockForSelectedVariant() {
    return getAvailableStock() || 10;
}

// Stok uyarısını güncelle
function updateStockWarning() {
    if (!currentProduct || !stockWarning || !quantityInput) return;
    
    const maxStock = getMaxStockForSelectedVariant();
    const currentQty = parseInt(quantityInput.value) || 1;
    
    // Tüm stok uyarılarını gizle
    stockWarning.style.display = 'none';
    
    // Sadece kullanıcı maksimum stoktan fazla seçerse uyarı göster
    if (currentQty > maxStock) {
        stockWarning.textContent = `Maksimum ${maxStock} adet sipariş verebilirsiniz.`;
        stockWarning.style.display = 'block';
        stockWarning.className = 'stock-warning medium';
    }
}

// Miktar azaltma
function decreaseQuantity() {
    const quantityInput = document.getElementById('quantity');
    const stockWarning = document.getElementById('stock-warning');
    if (!quantityInput) return;
    
    // Eğer varyantlı ürünse ve tüm varyantlar seçili değilse uyarı göster ve çık
    if (currentProduct.variants && currentProduct.variants.length > 0) {
        const allVariantsSelected = currentProduct.variants.every(variant => selectedVariants[variant.name] !== undefined);
        if (!allVariantsSelected) {
            if (stockWarning) {
                stockWarning.textContent = '*Lütfen varyant seçimi yapınız.';
                stockWarning.style.display = 'block';
            }
            return;
        }
    }
    
    const currentValue = parseInt(quantityInput.value);
    
    if (currentValue > 1) {
        quantityInput.value = currentValue - 1;
        // Stok uyarısını güncelle
        if (stockWarning) stockWarning.style.display = 'none';
    }
}

// Miktar artırma
function increaseQuantity() {
    const quantityInput = document.getElementById('quantity');
    const stockWarning = document.getElementById('stock-warning');
    if (!quantityInput) return;
    
    // Eğer varyantlı ürünse ve tüm varyantlar seçili değilse uyarı göster ve çık
    if (currentProduct.variants && currentProduct.variants.length > 0) {
        const allVariantsSelected = currentProduct.variants.every(variant => selectedVariants[variant.name] !== undefined);
        if (!allVariantsSelected) {
            if (stockWarning) {
                stockWarning.textContent = '*Lütfen varyant seçimi yapınız.';
                stockWarning.style.display = 'block';
            }
            return;
        }
    }
    
    const currentValue = parseInt(quantityInput.value);
    // Firestore'dan güncel stok miktarını al
    const availableStock = getAvailableStock();
    
    if (currentValue < availableStock) {
        quantityInput.value = currentValue + 1;
        
        // Stok uyarısını güncelle
        if (stockWarning) {
            // Tüm stok uyarılarını gizle
            stockWarning.style.display = 'none';
        }
    } else {
        // Maksimum stok uyarısı göster
        if (stockWarning) {
            stockWarning.textContent = `*Bu üründe daha fazla stok mevcut değildir.`;
            stockWarning.style.display = 'block';
        }
    }
}

// Güncel fiyatı hesapla
function getCurrentPrice() {
    
    if (typeof currentProduct.price === 'object' && Object.keys(selectedVariants).length > 0) {
        // Varyant anahtarını oluştur
        const variantKey = Object.values(selectedVariants).join('-');
        
        if (currentProduct.price[variantKey] !== undefined) {
            return currentProduct.price[variantKey];
        } else {
            // Varyant fiyatı bulunamadı, varsayılan fiyat kullanılıyor
        }
    } else if (typeof currentProduct.price === 'number') {
        // Sayısal fiyat kullanılıyor
        return currentProduct.price;
    } else if (typeof currentProduct.price === 'string') {
        // String fiyat değeri - Firestore'dan gelen veri
        // String fiyat değeri işleniyor
        
        // Fiyat formatını kontrol et (örn: '1299.99 TL' veya '1.299,99 TL')
        if (currentProduct.price.includes('TL')) {
            // Zaten formatlanmış fiyat, sayıya çevir
            const numericPrice = parseFloat(currentProduct.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
            if (!isNaN(numericPrice)) {
                // Formatlanmış fiyat sayıya çevrildi
                return numericPrice;
            }
        } else {
            // Sayıya çevirmeyi dene
            const numericPrice = parseFloat(currentProduct.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
            if (!isNaN(numericPrice)) {
                // String fiyat sayıya çevrildi
                return numericPrice;
            }
        }
        
        // Fiyat sayıya çevrilemedi, varsayılan 0 kullanılıyor
    }

    // Hiçbir fiyat bulunamazsa varsayılan 0 döndür
    return 0;
}

// Sepete ekle
async function addToCart() {
    if (!currentProduct) {
        alert('Ürün bilgisi bulunamadı!');
        return;
    }

    // Sayfa türünü belirle (müşteri sayfası mı normal sayfa mı)
    const isCustomerPage = window.location.href.includes('customer');
    // Sayfa türü kontrol ediliyor
    
    // Kullanıcı giriş yapmış mı kontrol et
    const user = firebase.auth().currentUser;
    
    try {
        // Miktarı al
        const quantityInput = document.getElementById('quantity');
        const quantity = parseInt(quantityInput?.value || '1');
        const stockWarning = document.getElementById('stock-warning');
        
        // Önceki uyarıyı temizle
        if (stockWarning) {
            stockWarning.style.display = 'none';
            stockWarning.textContent = '';
        }
        
        if (isNaN(quantity) || quantity <= 0) {
            if (stockWarning) {
                stockWarning.textContent = 'Lütfen geçerli bir miktar giriniz.';
                stockWarning.style.display = 'block';
            }
            return;
        }
        
        // Varyant kontrolü - tüm varyantlar seçili mi?
        if (currentProduct.variants && currentProduct.variants.length > 0) {
            const allVariantsSelected = currentProduct.variants.every(variant => 
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
        
        // Varyant görselini al
        let variantImage = null;
        let normalizedVariantKey = "";
        
        if (currentProduct.variantImages && Object.keys(selectedVariants).length > 0) {
            // Ana görseli varsayılan olarak al
            const mainImage = currentProduct.image;
            // Sepete ekleme işlemi başlatılıyor
            
            // Varyant anahtarını oluştur
            normalizedVariantKey = Object.values(selectedVariants).join('-')
                .replace(/\s+/g, '-')  // Boşlukları tire ile değiştir
                .toLowerCase();          // Küçük harfe çevir (tutarlılık için)
            



            
            // Varyant görseli varsa kullan
            if (currentProduct.variantImages[normalizedVariantKey]) {
                variantImage = currentProduct.variantImages[normalizedVariantKey];

            } else {

                
                // Tüm varyant görsel anahtarlarını kontrol et
                const variantImageKeys = Object.keys(currentProduct.variantImages);
                
                // Alternatif anahtar formatlarını dene
                const alternativeKeys = [
                    // Boşluklu versiyon
                    Object.values(selectedVariants).join(' ').toLowerCase(),
                    // Tersine çevrilmiş versiyon
                    Object.values(selectedVariants).reverse().join('-').toLowerCase(),
                    // Alfabetik sıralanmış versiyon
                    Object.values(selectedVariants).sort().join('-').toLowerCase()
                ];
                
                // Alternatif anahtarları dene
                for (const altKey of alternativeKeys) {

                    if (currentProduct.variantImages[altKey]) {
                        variantImage = currentProduct.variantImages[altKey];

                        break;
                    }
                }
                
                // Hala bulunamadıysa, kısmi eşleşme dene
                if (!variantImage) {

                    
                    // Varyant değerlerini diziye çevir
                    const variantValues = Object.values(selectedVariants).map(v => v.toLowerCase());
                    
                    // Herhangi bir anahtarın tüm varyant değerlerini içerip içermediğini kontrol et
                    for (const key of variantImageKeys) {
                        const keyLower = key.toLowerCase();
                        // Tüm varyant değerleri bu anahtarda var mı?
                        const allValuesIncluded = variantValues.every(value => keyLower.includes(value));
                        
                        if (allValuesIncluded) {
                            variantImage = currentProduct.variantImages[key];

                            break;
                        }
                    }
                }
            }
        }
        
        // Ürün fiyatını doğru şekilde hesapla
        const currentPrice = getCurrentPrice();
        // Sepete eklenecek ürün fiyatı hesaplanıyor
        
        // Fiyat bilgisini kontrol et
        if (currentPrice === 0 || currentPrice === undefined || currentPrice === null) {
            // Uyarı: Fiyat bilgisi sıfır veya geçersiz!
            // Orijinal fiyat bilgisini log'la

        }
        
        // Stok bilgisini al
        const availableStock = getAvailableStock();

        
        const cartItem = {
            productId: currentProduct.id,
            name: currentProduct.name,
            price: currentPrice,
            quantity: quantity,
            image: variantImage || currentProduct.image || (currentProduct.images && currentProduct.images.length > 0 ? currentProduct.images[0] : null),
            variants: Object.assign({}, selectedVariants),
            variantImage: variantImage,
            variantKey: Object.values(selectedVariants).join('-').replace(/\s+/g, '-').toLowerCase(),
            priceType: typeof currentProduct.price,
            originalPrice: typeof currentProduct.price === 'string' ? currentProduct.price : null,
            addedAt: new Date().toISOString(),
            stock: availableStock // Stok bilgisini sepete eklenen ürüne dahil et
        };


        
        // localStorage'a kaydet
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        
        // Aynı ürün ve varyant kombinasyonu var mı kontrol et
        const existingItemIndex = cart.findIndex(item => {
            if (item.productId !== currentProduct.id) return false;
            
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
        
        if (existingItemIndex !== -1) {
            // Aynı ürün ve varyant kombinasyonu varsa miktarı artır
            const currentQuantity = cart[existingItemIndex].quantity || 0;
            const newQuantity = currentQuantity + cartItem.quantity;
            const availableStock = getAvailableStock();
            

            
            if (availableStock < newQuantity) {
                // Stok yetersizse popup göster
                // Uyarı: Yetersiz stok!
                
                // Popup mesajını hazırla
                const stockPopup = document.getElementById('stock-popup');
                const stockPopupMessage = document.getElementById('stock-popup-message');
                const stockPopupOk = document.getElementById('stock-popup-ok');
                const addToCartPopup = document.getElementById('add-to-cart-popup');
                const addToCartPopupMessage = document.getElementById('add-to-cart-popup-message');
                const addToCartPopupConfirm = document.getElementById('add-to-cart-popup-confirm');
                const addToCartPopupCancel = document.getElementById('add-to-cart-popup-cancel');
                const closePopupButtons = document.querySelectorAll('.close-popup');
                
                // Popup kapatma fonksiyonları
                const closePopups = () => {
                    stockPopup.style.display = 'none';
                    addToCartPopup.style.display = 'none';
                };
                
                // Kapatma butonlarına olay dinleyicileri ekle
                closePopupButtons.forEach(button => {
                    button.addEventListener('click', closePopups);
                });
                
                // Popup dışına tıklanmasını dinle
                window.addEventListener('click', (event) => {
                    if (event.target === stockPopup) {
                        stockPopup.style.display = 'none';
                    }
                    if (event.target === addToCartPopup) {
                        addToCartPopup.style.display = 'none';
                    }
                });
                
                // Stok uyarı mesajını hazırla
                let message = '';
                let remainingStock = availableStock - currentQuantity;
                
                // Kalan stok miktarı 0 veya daha az ise
                if (remainingStock <= 0) {
                    message = `Bu üründe daha fazla stok mevcut değildir.`;
                } else if (currentQuantity > 0) {
                    // Sepette ürün var ama hala stok var
                    message = `Bu üründen sepetinizde zaten ${currentQuantity} adet mevcut.<br>Stok durumundan dolayı en fazla ${remainingStock} adet <br>daha sipariş edebilirsiniz.`;
                } else {
                    // Sepette ürün yok ama stok yetersiz
                    message = `Üzgünüz, bu üründen sadece ${availableStock} adet stok kalmıştır.`;
                }
                
                // Stok uyarı popup'ını göster
                stockPopupMessage.innerHTML = message;
                stockPopup.style.display = 'block';
                
                // Tamam butonuna tıklandığında
                stockPopupOk.onclick = () => {
                    stockPopup.style.display = 'none';
                    
                    // Eğer sepete eklenebilecek miktar varsa VE kalan stok 0'dan büyükse VE mesaj "Bu üründe daha fazla stok mevcut değildir" değilse, ikinci popup'ı göster
                    if (remainingStock > 0 && currentQuantity > 0 && message !== 'Bu üründe daha fazla stok mevcut değildir.') {
                        // Maksimum eklenebilecek miktarı hesapla
                        const maxAddable = Math.min(remainingStock, cartItem.quantity);
                        
                        // İkinci popup mesajını hazırla
                        addToCartPopupMessage.textContent = `Sepetinize ${maxAddable} adet daha eklemek ister misiniz?`;
                        addToCartPopup.style.display = 'block';
                        
                        // Ekle butonuna tıklandığında
                        addToCartPopupConfirm.onclick = () => {
                            addToCartPopup.style.display = 'none';
                            
                            // Sepete ekle
                            cart[existingItemIndex].quantity = currentQuantity + maxAddable;
                            
                            // Sepeti güncelle
                            localStorage.setItem('cart', JSON.stringify(cart));
                            
                            // Sepet sayacını güncelle
                            updateCartCount();
                            
                            // Sepet yan menüsünü aç
                            const cartSidebar = document.querySelector('.cart-sidebar');
                            const cartOverlay = document.querySelector('.cart-overlay');
                            if (cartSidebar && cartOverlay) {
                                cartSidebar.classList.add('active');
                                cartOverlay.classList.add('active');
                                updateCartUI();
                            }
                        };
                        
                        // İptal butonuna tıklandığında
                        addToCartPopupCancel.onclick = () => {
                            addToCartPopup.style.display = 'none';
                        };
                    }
                };
                
                return;
            }
            
            // Stok yeterliyse miktarı güncelle
            cart[existingItemIndex].quantity = newQuantity;
        } else {
            // Yeni ürün ekle
            cart.push(cartItem);
        }
        
        // Sepeti güncelle
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Sepet sayacını güncelle
        updateCartCount();
        
        // Sepet yan menüsünü aç
        const cartSidebar = document.querySelector('.cart-sidebar');
        const cartOverlay = document.querySelector('.cart-overlay');
        if (cartSidebar && cartOverlay) {
            cartSidebar.classList.add('active');
            cartOverlay.classList.add('active');
            updateCartUI();
        }
        
        // Ürün sepete eklendi
    } catch (error) {
        // Sepete eklerken hata oluştu
        alert('Sepete eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
}

function formatPrice(price) {
return price.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2});
}

// Sepet sayısını güncelle (localStorage tabanlı)
function updateCartCount() {
    try {
        const cartCountElement = document.querySelector('.cart-count');
        if (!cartCountElement) {

            return 0;
        }
        
        // localStorage'dan sepet bilgilerini al
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        
        // Toplam ürün adedini hesapla
        const count = cart.reduce((total, item) => total + (parseInt(item.quantity) || 1), 0);
        
        // Sepet sayacını güncelle
        cartCountElement.textContent = count;
        
        // Sepet boş olsa bile sayacı göster, sadece değerini 0 yap
        cartCountElement.style.display = 'flex';
        

        return count;
    } catch (error) {
        // Sepet sayısı güncellenirken hata oluştu
        return 0;
    }
}

// Sepet arayüzünü güncelle (localStorage tabanlı)
async function updateCartUI() {
    try {
        // localStorage'dan sepet bilgilerini al
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const cartItemsContainer = document.querySelector('.cart-items');
        
        if (!cartItemsContainer) {

            return;
        }
        
        // Sepet yükleme durumunu göster
        cartItemsContainer.innerHTML = '<div class="loading-cart">Sepet yükleniyor...</div>';
        
        // Sepet boşsa mesaj göster
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<div class="empty-cart">Sepetinizde ürün bulunmamaktadır.</div>';
            
            // Toplam fiyatı sıfırla
            const totalElement = document.querySelector('.total-amount');
            if (totalElement) {
                totalElement.textContent = '0,00 TL';
            }
            return;
        }
        
        // Sepet öğelerini oluştur
        let cartHTML = '';
        let total = 0;
        
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            // Varyant bilgisini hazırla - her varyant alt alta ve başlıklar kalın olacak
            let variantInfo = '';
            if (item.variants && Object.keys(item.variants).length > 0) {
                variantInfo = '<div class="variant-container" style="display: flex; flex-direction: column; margin-top: 5px;">' + 
                    Object.entries(item.variants)
                        .map(([key, value]) => 
                            `<div class="variant-item">
                                <span class="variant-key" style="font-weight: bold;">${key}:</span>
                                <span class="variant-value">${value}</span>
                            </div>`
                        )
                        .join('') + 
                    '</div>';
            }
            
            // Varyant gu00f6rselini kontrol et ve kullan
            let productImage = item.image;
            
            // u00d6ncelikle variantImage u00f6zelliu011fini kontrol et
            if (item.variantImage) {
                productImage = item.variantImage;

            } 
            // Eu011fer variantImage yoksa ve varyantlar varsa, gu00f6rseli bulmaya u00e7alu0131u015f
            else if (item.variants && Object.keys(item.variants).length > 0) {

                
                // Varyant bilgilerini logla


            }
            
            cartHTML += `
                <div class="cart-item" data-product-id="${item.productId}" data-variant="${JSON.stringify(item.variants).replace(/"/g, '&quot;')}">
                    <button class="remove-item" onclick="removeFromCart('${item.productId}', ${JSON.stringify(item.variants).replace(/"/g, '&quot;')})">Sil</button>
                    <div class="cart-item-image">
                        <img src="${productImage || 'images/placeholder.jpg'}" alt="${item.name}">
                    </div>
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        ${variantInfo}
                        <div class="cart-item-price" style="margin-top: 5px">${formatPrice(item.price)} TL</div>
                        <div class="cart-item-quantity">
                            <button class="quantity-btn decrease" onclick="updateCartItemQuantity('${item.productId}', ${JSON.stringify(item.variants).replace(/"/g, '&quot;')}, -1)">-</button>
                            <span>${item.quantity}</span>
                            <button class="quantity-btn increase" 
                                    onclick="updateCartItemQuantity('${item.productId}', ${JSON.stringify(item.variants).replace(/"/g, '&quot;')}, 1)"
                                    data-product-id="${item.productId}"
                                    data-variants='${JSON.stringify(item.variants)}'
                                    data-quantity="${item.quantity}">
                                +
                            </button>
                        </div>
                    </div>
                    <div class="cart-item-total">${formatPrice(itemTotal)} TL</div>
                </div>
            `;
        });
        
        // Sepet içeriğini güncelle
        cartItemsContainer.innerHTML = cartHTML;
        
        // Toplam fiyatı güncelle
        const totalElement = document.querySelector('.total-amount');
        if (totalElement) {
            totalElement.textContent = formatPrice(total) + ' TL';
        }
        
                // Sepet sayacını da güncelle
        updateCartCount();
        
        // Artırma butonlarından disabled özelliğini kaldır
        document.querySelectorAll('.increase').forEach(btn => {
            btn.disabled = false;
            btn.title = '';
            btn.style.opacity = '';
            btn.style.cursor = '';
        });
        

    } catch (error) {
        // Sepet arayüzü güncellenirken hata oluştu
    }
}

// Sepetten ürün kaldır (localStorage tabanlı)
function removeFromCart(productId, variants) {
    try {

        
        // localStorage'dan sepet bilgilerini al
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        
        // Sepet boşsa işlem yapma
        if (cart.length === 0) {

            return;
        }
        
        // Kaldırılacak ürünü bul
        const initialLength = cart.length;
        cart = cart.filter(item => {
            // Ürün ID'si farklıysa tutmaya devam et
            if (item.productId !== productId) return true;
            
            // Varyant karşılaştırma
            if (variants && Object.keys(variants).length > 0) {
                const itemVariants = item.variants || {};
                
                // Varyant sayısı farklıysa farklı ürün olarak kabul et
                if (Object.keys(itemVariants).length !== Object.keys(variants).length) {
                    return true;
                }
                
                // Tüm varyantlar aynı mı kontrol et
                for (const key in variants) {
                    if (itemVariants[key] !== variants[key]) {
                        return true;
                    }
                }
                
                // Eşleşme bulundu, ürünü kaldır
                return false;
            } else {
                // Varyantsız ürün için sadece ID kontrolü yap
                return item.variants && Object.keys(item.variants).length > 0;
            }
        });
        
        // Sepeti güncelle
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Sepet arayüzünü güncelle
        updateCartUI();
        
        // Sepet sayacını güncelle
        updateCartCount();
        

    } catch (error) {
        // Ürün sepetten kaldırılırken hata oluştu
    }
}

// Firebase'den ürün stok bilgisini kontrol et
async function checkProductStock(productId, variants = {}) {
    try {
        const productDoc = await firebase.firestore().collection('products').doc(productId).get();
        
        if (!productDoc.exists) {

            return 0;
        }
        
        const product = productDoc.data();
        
        // Varyantlı ürün ise varyant stoğunu kontrol et
        if (Object.keys(variants).length > 0 && product.variants) {
            const variantKey = Object.entries(variants)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => `${k}:${v}`)
                .join('_');
                
            if (product.variantStocks && product.variantStocks[variantKey] !== undefined) {
                return parseInt(product.variantStocks[variantKey]) || 0;
            }
            
            // Eğer variantStocks yoksa eski stok yapısını kontrol et
            const variantStockKey = Object.values(variants).join('-');
            if (product.stock && product.stock[variantStockKey] !== undefined) {
                return parseInt(product.stock[variantStockKey]) || 0;
            }
            
            return 0;
        }
        
        // Varyantsız ürün ise genel stoğu döndür
        return parseInt(product.stock) || 0;
    } catch (error) {
        // Stok bilgisi alınırken hata oluştu
        return 0;
    }
}

// Sepetteki ürün miktarını güncelle (localStorage tabanlı)
async function updateCartItemQuantity(productId, variants, change) {
    // Eğer miktar artırılıyorsa stok kontrolü yap
    if (change > 0) {
        try {
            const availableStock = await checkProductStock(productId, variants);
            let cart = JSON.parse(localStorage.getItem('cart')) || [];
            const item = cart.find(item => {
                if (item.productId !== productId) return false;
                if (variants && Object.keys(variants).length > 0) {
                    const itemVariants = item.variants || {};
                    if (Object.keys(itemVariants).length !== Object.keys(variants).length) return false;
                    for (const key in variants) {
                        if (itemVariants[key] !== variants[key]) return false;
                    }
                } else if (item.variants && Object.keys(item.variants).length > 0) {
                    return false;
                }
                return true;
            });
            
            const currentQuantity = item ? item.quantity : 0;
            const newQuantity = currentQuantity + change;
            
            if (newQuantity > availableStock) {
                // Popup içeriğini ayarla
                document.getElementById('stock-popup-message').textContent = 'Bu üründe daha fazla stok mevcut değildir.';
                // Popup'u göster
                document.getElementById('stock-popup').style.display = 'block';
                return;
            }
        } catch (error) {
            // Stok kontrolü sırasında hata oluştu
            return;
        }
    }
    try {

        
        // localStorage'dan sepet bilgilerini al
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        
        // Güncellenecek ürünü bul
        const itemIndex = cart.findIndex(item => {
            // Ürün ID'si farklıysa eşleşme yok
            if (item.productId !== productId) return false;
            
            // Varyant karşılaştırma
            if (variants && Object.keys(variants).length > 0) {
                const itemVariants = item.variants || {};
                
                // Varyant sayısı farklıysa farklı ürün olarak kabul et
                if (Object.keys(itemVariants).length !== Object.keys(variants).length) {
                    return false;
                }
                
                // Tüm varyantlar aynı mı kontrol et
                for (const key in variants) {
                    if (itemVariants[key] !== variants[key]) {
                        return false;
                    }
                }
                
                // Eşleşme bulundu
                return true;
            } else {
                // Varyantsız ürün için sadece ID kontrolü yap
                return !item.variants || Object.keys(item.variants).length === 0;
            }
        });
        
        // Ürün bulunamadıysa işlem yapma
        if (itemIndex === -1) {

            return;
        }
        
        // Yeni miktarı hesapla
        const currentQuantity = cart[itemIndex].quantity || 1;
        let newQuantity = currentQuantity + change;
        
        // Miktar 1'den küçük olamaz
        if (newQuantity < 1) {
            // Miktar 0 veya daha az ise ürünü sepetten kaldır
            removeFromCart(productId, variants);
            return;
        }
        
        // Miktar 1'den küçük olamaz
        if (newQuantity < 1) {
            // Miktar 0 veya daha az ise ürünü sepetten kaldır
            removeFromCart(productId, variants);
            return;
        }
        
        // Miktarı güncelle
        cart[itemIndex].quantity = newQuantity;
        
        // Sepeti güncelle
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Sepet arayüzünü güncelle
        await updateCartUI();
        
        // Sepet yan menüsünü güncelle
        updateCartCount();
        

    } catch (error) {
        // Ürün miktarı güncellenirken hata oluştu
        alert('Ürün miktarı güncellenirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
}
// Sepeti temizle (localStorage tabanlı) - Popup onayı için değiştirildi
function clearCart() {
    try {
        // Popup'u göster, doğrudan temizleme işlemi yapma
        const clearCartPopup = document.getElementById('clear-cart-popup');
        if (clearCartPopup) {
            clearCartPopup.style.display = 'block';

            return; // Popup gösterildikten sonra işlemi durdur
        }
        
        // Popup bulunamazsa (eski davranış için) - bu kod normalde çalışmayacak

    } catch (error) {
        // Sepet temizleme işlemi sırasında hata oluştu
    }
}

// Sepet olay dinleyicilerini ayarla
function setupCartEventListeners() {
    try {
        // Sepet olay dinleyicileri ayarlanıyor
        
        // Sepet aç/kapat butonları - daha geniş bir seçici kullanalım
        const cartLinks = document.querySelectorAll('a.cart-link, .cart-icon');

        
        // Ayrıca doğrudan sepet bağlantısını da bulalım
        const cartLink = document.querySelector('a.cart-link');
        if (cartLink) {

            cartLink.addEventListener('click', function(e) {
                e.preventDefault();

                toggleCart();
            });
        } else {

        }
        
        const closeCartButton = document.querySelector('.close-cart');
        const cartOverlay = document.querySelector('.cart-overlay');
        const clearCartButton = document.querySelector('.clear-cart');
        
        // Sepet butonlarına tıklama olayı ekle
        cartLinks.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();

                toggleCart();
            });
        });
        
        // Sepeti kapatma butonuna tıklama olayı ekle
        if (closeCartButton) {
            closeCartButton.addEventListener('click', closeCart);
        }
        
        // Sepet arka planına tıklama olayı ekle
        if (cartOverlay) {
            cartOverlay.addEventListener('click', closeCart);
        }
        
        // Sepeti temizleme butonuna tıklama olayı ekle
        if (clearCartButton) {
            clearCartButton.addEventListener('click', function(e) {
                // Popup'u göster
                const clearCartPopup = document.getElementById('clear-cart-popup');
                if (clearCartPopup) {
                    clearCartPopup.style.display = 'block';
                }
            });
        }
        

    } catch (error) {
        // Sepet olay dinleyicileri ayarlanırken hata oluştu
    }
}

// Sepet yan menüsünü aç/kapat
window.toggleCart = function() {
    try {

        const cartSidebar = document.querySelector('.cart-sidebar');
        const cartOverlay = document.querySelector('.cart-overlay');
        
        if (cartSidebar && cartOverlay) {
            cartSidebar.classList.toggle('active');
            cartOverlay.classList.toggle('active');
            
            // Eğer sepet açılıyorsa içeriğini güncelle
            if (cartSidebar.classList.contains('active')) {
                updateCartUI();
            }
        }
    } catch (error) {
        // Sepet açılırken hata oluştu
    }
}

// Sepeti kapat
function closeCart() {
    try {
        const cartSidebar = document.querySelector('.cart-sidebar');
        const cartOverlay = document.querySelector('.cart-overlay');
        
        if (cartSidebar) cartSidebar.classList.remove('open');
        if (cartOverlay) cartOverlay.classList.remove('open');
    } catch (error) {
        console.error('Sepet kapatılırken hata oluştu:', error);
    }
}

// Artırma butonlarının stok durumunu güncelle
async function updateIncreaseButtonsStockStatus() {
    const increaseButtons = document.querySelectorAll('.increase');
    
    for (const button of increaseButtons) {
        const productId = button.dataset.productId;
        const variants = JSON.parse(button.dataset.variants || '{}');
        const currentQuantity = parseInt(button.dataset.quantity, 10);
        
        try {
            const stock = await checkProductStock(productId, variants);
            if (stock <= currentQuantity) {
                button.disabled = true;
                button.title = 'Stokta yeterli ürün bulunmamaktadır';
                button.style.opacity = '0.6';
                button.style.cursor = 'not-allowed';
            } else {
                button.disabled = false;
                button.title = '';
                button.style.opacity = '';
                button.style.cursor = '';
            }
        } catch (error) {
            // Stok kontrolü sırasında hata oluştu
            // Hata durumunda butonu devre dışı bırak
            button.disabled = true;
            button.title = 'Stok durumu kontrol edilemedi';
            button.style.opacity = '0.6';
        }
    }
}

// Sepeti kapat
window.closeCart = function() {
    try {
        const cartSidebar = document.querySelector('.cart-sidebar');
        const cartOverlay = document.querySelector('.cart-overlay');
        
        if (cartSidebar) cartSidebar.classList.remove('active');
        if (cartOverlay) cartOverlay.classList.remove('active');
    } catch (error) {
        console.error('Sepet kapatılırken hata oluştu:', error);
    }
}
// Fonksiyonları global scope'ta tutmak için window nesnesine ekleyelim
// Bu sayede customer-product-page.html'den de erişilebilir olacaklar
window.getProductFromUrl = getProductFromUrl;
window.initializeProduct = initializeProduct;
window.decreaseQuantity = decreaseQuantity;
window.increaseQuantity = increaseQuantity;
window.addToCart = addToCart;

// Sayfa tipini belirle
const isProductPage = window.location.pathname.includes('product-page.html');
const isCustomerProductPage = window.location.pathname.includes('customer-product-page.html');

// Sayfa yüklenirken çalışacak fonksiyon
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // product-page.js yükleniyor
        const pageType = isProductPage ? 'product-page.html' : 
            (isCustomerProductPage ? 'customer-product-page.html' : 'bilinmeyen');
        console.log('Sayfa tipi:', pageType);
        
        // Ürünü Firestore'dan al (her iki sayfa tipi için de gerekli)
        // customer-product-page.html sayfasında bu işlem ayrıca yapılıyor
        // Bu nedenle burada sadece product-page.html için yapıyoruz
        if (!isCustomerProductPage) {
            currentProduct = await getProductFromUrl();
            
            if (currentProduct) {
                // Ürün yüklendi
                
                // Ürün bilgilerini yükle
                initializeProduct();
                
                // Butonlar için event listener'lar ekle
                const decreaseBtn = document.getElementById('decreaseBtn');
                const increaseBtn = document.getElementById('increaseBtn');
                const addToCartBtn = document.getElementById('addToCartBtn');
                
                if (decreaseBtn) decreaseBtn.addEventListener('click', decreaseQuantity);
                if (increaseBtn) increaseBtn.addEventListener('click', increaseQuantity);
                if (addToCartBtn) addToCartBtn.addEventListener('click', addToCart);
            }
        }
        
        // Sadece product-page.html için sepet işlevlerini yükle
        // customer-product-page.html için customer-cart.js kullanılıyor
        if (isProductPage) {
            // product-page.html için localStorage tabanlı sepet işlevleri yükleniyor
            
            // Sepet olay dinleyicilerini ayarla
            setupCartEventListeners();
            
            // Sepet sayacını güncelle
            updateCartCount();
            
            // Sepet arayüzünü güncelle
            updateCartUI();
            
            // Sepet sayısını güncelle (eğer giriş yapılmışsa)
            if (typeof firebase !== 'undefined' && firebase.auth) {
                firebase.auth().onAuthStateChanged(function(user) {
                    if (user) {
                        updateCartCount();
                    }
                });
            }
        } else {
            // Ürün bulunamadıysa hata mesajı göster
            const productContainer = document.querySelector('.product-container') || document.querySelector('.product-details');
            if (productContainer) {
                productContainer.innerHTML = `
                    <div class="error-message" style="grid-column: span 2; text-align: center; padding: 2rem; color: #c9a227;">
                        <h2>Ürün Bulunamadı</h2>
                        <p>İstediğiniz ürün bulunamadı veya kaldırılmış olabilir.</p>
                        <a href="customer-categories.html" class="btn" style="background: #c9a227; color: #000; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin-top: 10px; display: inline-block;">Kategorilere Dön</a>
                    </div>
                `;
            }
        }
    } catch (error) {
        // Sayfa yüklenirken hata oluştu
        console.error('Sayfa yüklenirken hata:', error);
    }
});

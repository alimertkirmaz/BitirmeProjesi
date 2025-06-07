// Sabit değişkenler
const SHIPPING_THRESHOLD = 1000;
const SHIPPING_COST = 49.99;
const MIN_ORDER_AMOUNT = 500;

// Sayfa yüklenirken sepet verilerini kontrol et için fonksiyon
function initializeCart() {
    // Sepet verileri kontrol ediliyor
    // localStorage'daki sepet verilerini kontrol et
    try {
        const cartData = localStorage.getItem('cart');
        if (cartData) {
            // Eğer sepet verileri geçerli bir JSON değilse, localStorage'dan sil
            try {
                const parsedCart = JSON.parse(cartData);
                if (!Array.isArray(parsedCart)) {
                    // localStorage'daki sepet bir dizi değil, sıfırlanıyor
                    localStorage.setItem('cart', JSON.stringify([]));
                }
            } catch (e) {
                // localStorage'daki sepet verileri geçersiz, sıfırlanıyor
                localStorage.setItem('cart', JSON.stringify([]));
            }
        } else {
            // Sepet verileri yoksa, boş bir dizi olarak başlat
            localStorage.setItem('cart', JSON.stringify([]));
        }
    } catch (error) {
        // localStorage kontrol edilirken hata oluştu
    }
}

// Fiyat formatı
function formatPrice(price) {
    return price.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' TL';
}

// Sepeti localStorage'a kaydet
function saveCartToLocalStorage(cart) {
    // Cart bir dizi değilse, boş dizi olarak ayarla
    if (!Array.isArray(cart)) {
        // Sepet bir dizi değil, boş dizi olarak ayarlanıyor
        cart = [];
    }
    
    // localStorage'a kaydet
    localStorage.setItem('cart', JSON.stringify(cart));
    // Sepet localStorage'a kaydedildi
    
    // Sepet güncellendi olayını tetikle
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cart } }));
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
function updateCartUI(cart) {
    console.log('updateCartUI çağrıldı, cart:', cart);
    
    // Sepet içerik elementini bul
    const cartItems = document.querySelector('.cart-items');
    if (!cartItems) {
        console.warn('Sepet içerik elementi bulunamadı (.cart-items)');
        return;
    }
    
    // Eğer cart parametresi verilmemişse, mevcut sepeti al
    if (!cart) {
        // localStorage'dan sepeti al
        try {
            cart = JSON.parse(localStorage.getItem('cart')) || [];
        } catch (error) {
            console.error('localStorage sepet bilgisi alınırken hata:', error);
            cart = [];
        }
    }
    
    // Cart bir dizi değilse, boş dizi olarak ayarla
    if (!Array.isArray(cart)) {
        console.warn('Cart bir dizi değil:', cart);
        cart = [];
    }
    
    // Sepet boşsa, boş sepet mesajı göster
    if (cart.length === 0) {
        cartItems.innerHTML = '<div class="empty-cart">Sepetinizde ürün bulunmamaktadır.</div>';
        
        // Toplam tutarı sıfırla
        const totalAmount = document.querySelector('.total-amount');
        if (totalAmount) {
            totalAmount.textContent = '0 TL';
        }
        
        return;
    }
    
    // Sepet içeriğini temizle
    cartItems.innerHTML = '';
    // CSS reflow tetikle (ilk açılışta stil bozukluğunu önler)
    cartItems.offsetHeight;
    
    // Sepetteki her ürün için bir div oluştur
    let totalPrice = 0;
    cart.forEach((item, idx) => {
        if (!item) {
            console.warn(`Cart dizisindeki ${idx}. item geçersiz:`, item);
            return;
        }
        
        const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price || '0');
        const itemQuantity = item.quantity || 0;
        const itemTotal = itemPrice * itemQuantity;
        totalPrice += itemTotal;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        // Varyant bilgilerini hazırla
        let variantInfo = '';
        if (item.variants && Object.keys(item.variants).length > 0) {
            variantInfo = '<div class="cart-item-variants">';
            for (const [key, value] of Object.entries(item.variants)) {
                variantInfo += `<span class="variant-badge">${key}: ${value}</span>`;
            }
            variantInfo += '</div>';
        }
        
        itemElement.innerHTML = `
            <div class="cart-item-image">
                <img src="${item.image || 'images/default-product.jpg'}" alt="${item.name || 'Bilinmeyen Ürün'}">
            </div>
            <div class="cart-item-info">
                <h4>${item.name || 'Bilinmeyen Ürün'}</h4>
                ${variantInfo}
                <div class="cart-item-price">${formatPrice(itemPrice)}</div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn decrease" data-index="${idx}">-</button>
                    <span>${itemQuantity}</span>
                    <button class="quantity-btn increase" data-index="${idx}">+</button>
                </div>
            </div>
            <div class="cart-item-total">${formatPrice(itemTotal)}</div>
            <button class="remove-item" data-index="${idx}"><i class="fas fa-trash"></i></button>
        `;
        
        cartItems.appendChild(itemElement);
    });
    
    // Toplam tutarı güncelle
    const totalAmount = document.querySelector('.total-amount');
    if (totalAmount) {
        totalAmount.textContent = formatPrice(totalPrice);
    }
    
    // Miktar butonlarına event listener ekle
    document.querySelectorAll('.quantity-btn.decrease').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            updateQuantityByIndex(index, -1);
        });
    });
    
    document.querySelectorAll('.quantity-btn.increase').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            // Stok kontrolü
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            if (index >= 0 && index < cart.length) {
                const item = cart[index];
                // Stok kontrolü updateQuantityByIndex içinde yapılıyor
                // Burada sadece updateQuantityByIndex fonksiyonunu çağırıyoruz
                updateQuantityByIndex(index, 1);
            }
        });
    });
    
    // Sil butonlarına event listener ekle
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            removeFromCartByIndex(index);
        });
    });
}

// Sepet sayacını güncelle
function updateCartCount(cart) {
    const cartCount = document.querySelector('.cart-count');
    if (!cartCount) return;
    
    // Eğer cart parametresi bir event nesnesi ise veya verilmemişse, localStorage'dan al
    if (!cart || cart instanceof Event || !Array.isArray(cart)) {
        try {
            cart = JSON.parse(localStorage.getItem('cart')) || [];
        } catch (error) {
            console.error('localStorage sepet bilgisi alınırken hata:', error);
            cart = [];
        }
    }
    
    // Cart bir dizi değilse, boş dizi olarak ayarla
    if (!Array.isArray(cart)) {
        console.warn('Cart is not an array, using empty array instead');
        cart = [];
    }
    
    const totalItems = cart.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0);
    
    // Sepette ürün olmasa bile sayacı göster, sadece değerini 0 yap
    cartCount.textContent = totalItems;
    cartCount.style.display = 'flex';
}

// Sepet sayfasını güncelle
function renderCart(cart = []) {
    const cartItems = document.querySelector('.cart-items');
    if (!cartItems) {
        console.warn('Sepet içerik elementi bulunamadı (.cart-items)');
        return;
    }

    // Cart bir dizi değilse, boş dizi olarak ayarla
    if (!Array.isArray(cart)) {
        console.warn('renderCart: Cart is not an array:', cart);
        cart = [];
    }
    
    // Eğer cart parametresi verilmemişse veya boşsa
    if (cart.length === 0) {
        // localStorage'dan sepeti al
        cart = JSON.parse(localStorage.getItem('cart')) || [];
    }
    
    // Cart'ın bir dizi olduğundan emin ol
    if (!Array.isArray(cart)) {
        console.warn('Cart is not an array:', cart);
        cart = [];
    }
    
    console.log('Current cart:', cart); // Debug log

    // Sepet boşsa mesaj göster
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Sepetinizde ürün bulunmamaktadır.</p>';
        updateTotals(0);
        // Mesaj kutularını ve butonu sıfırla
        const shippingMessage = document.querySelector('.shipping-message');
        const minOrderMessage = document.querySelector('.min-order-message');
        const checkoutBtn = document.querySelector('#checkout-btn');
        if (shippingMessage) {
            shippingMessage.style.display = 'none';
            shippingMessage.innerHTML = '';
            shippingMessage.style.color = '';
            shippingMessage.style.border = '';
            shippingMessage.style.background = '';
        }
        if (minOrderMessage) {
            minOrderMessage.style.display = 'none';
            minOrderMessage.innerHTML = '';
        }
        if (checkoutBtn) {
            checkoutBtn.disabled = true;
            checkoutBtn.style.opacity = '0.5';
            checkoutBtn.style.cursor = 'not-allowed';
        }
        return;
    }

    // Sepeti temizle
    cartItems.innerHTML = '';
    // CSS reflow tetikle (ilk açılışta stil bozukluğunu önler)
    cartItems.offsetHeight;

    // Her ürün için sepete bir öğe ekle
    for (let index = 0; index < cart.length; index++) {
        const item = cart[index];
        
        // Fiyatı sayıya çevir (hem string hem number olabilir)
        let priceNumber = 0;
        if (typeof item.price === 'number') {
            priceNumber = item.price;
        } else if (typeof item.price === 'string') {
            priceNumber = parseFloat(item.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
        }
        const itemTotal = priceNumber * item.quantity;

        // Varyant bilgilerini gösterim için hazırla
        const variantInfo = Object.entries(item.variants || {})
            .map(([name, value]) => `<b>${name.charAt(0).toUpperCase() + name.slice(1)}:</b> <span style='color:#fff'>${value}</span>`)
            .join('<br>');

        // Yeni bir div elementi oluştur
        const cartItemDiv = document.createElement('div');
        cartItemDiv.className = 'cart-item';
        cartItemDiv.dataset.id = item.id;
        cartItemDiv.dataset.index = index;

        // Öğenin HTML içeriğini oluştur
        cartItemDiv.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-info" style="flex:2; min-width:200px; max-width:340px; word-break:break-word;">
                <h4 style="font-size:1.1rem; margin-bottom:6px; word-break:break-word; min-width:120px; max-width:320px;">${item.name}</h4>
                ${variantInfo ? `<p style="margin-bottom:5px; word-break:break-word; min-width:120px; max-width:320px;">${variantInfo}</p>` : ''}
                <div class="cart-item-price" style="font-size:1rem; margin-bottom:6px; word-break:break-word; min-width:120px; max-width:320px;"><b>
                    ${
                        (typeof priceNumber === 'number')
                        ? priceNumber.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' TL'
                        : item.price
                    }
                </b></div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn decrease-btn">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn increase-btn">+</button>
                </div>
            </div>
            <div class="grid-item-total" style="font-size:1rem; margin-bottom:6px; word-break:break-word; min-width:100px; max-width:160px; text-align:left; margin-left:0; margin-right:2px;">${formatPrice(itemTotal)}</div>
            <button class="remove-item" style="margin-left:0; margin-right:2px; padding:5px 20px; background:#dc3545; color:white; border:none; border-radius:6px; cursor:pointer; font-size:16px; line-height:1.4; transition:background 0.3s;">Sil</button>
        `;

        // Div'i sepet container'a ekle
        cartItems.appendChild(cartItemDiv);

        // Düğmeler için olay dinleyicileri ekle
        const decreaseBtn = cartItemDiv.querySelector('.decrease-btn');
        const increaseBtn = cartItemDiv.querySelector('.increase-btn');
        const removeBtn = cartItemDiv.querySelector('.remove-item');

        decreaseBtn.addEventListener('click', () => {
            updateQuantityByIndex(index, -1);
        });

        increaseBtn.addEventListener('click', () => {
            updateQuantityByIndex(index, 1);
        });

        removeBtn.addEventListener('click', () => {
            removeFromCartByIndex(index);
        });
    }

    // Toplam tutarları hesapla ve göster
    // Cart bir dizi değilse, boş dizi olarak ayarla
    if (!Array.isArray(cart)) {
        console.warn('renderCart (totals): Cart is not an array:', cart);
        cart = [];
    }
    
    const subtotal = cart.reduce((sum, item) => {
        if (!item) return sum;
        
        let price = 0;
        if (typeof item.price === 'number') {
            price = item.price;
        } else if (typeof item.price === 'string') {
            price = parseFloat(item.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
        }
        
        const quantity = item.quantity || 0;
        return sum + (price * quantity);
    }, 0);

    updateTotals(subtotal);
}

// Toplamları güncelle
function updateTotals(subtotal) {
    const subtotalEl = document.getElementById('subtotal');
    const shippingEl = document.getElementById('shipping');
    const totalEl = document.getElementById('total-price');
    
    if (subtotalEl) {
        subtotalEl.textContent = formatPrice(subtotal);
    }
    
    let shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    if (shippingEl) {
        if (shipping === 0) {
            shippingEl.innerHTML = "<span style='color:#2ecc71;font-weight:bold;'>Ücretsiz!</span>";
        } else {
            shippingEl.textContent = formatPrice(shipping);
        }
    }
    
    if (totalEl) {
        totalEl.textContent = formatPrice(subtotal + shipping);
    }

    // Kargo durumunu güncelle
    const shippingMessage = document.querySelector('.shipping-message');
    const minOrderMessage = document.querySelector('.min-order-message');
    const checkoutBtn = document.querySelector('#checkout-btn');

    if (minOrderMessage && shippingMessage && checkoutBtn) {
        // Önce tüm mesajları ve stilleri sıfırla
        minOrderMessage.style.display = 'none';
        minOrderMessage.innerHTML = '';
        shippingMessage.style.display = 'none';
        shippingMessage.innerHTML = '';
        shippingMessage.style.color = '';
        shippingMessage.style.border = '';
        shippingMessage.style.background = '';

        if (subtotal === 0) {
            // Sepet boşsa hiçbir uyarı gösterme
            checkoutBtn.disabled = true;
            checkoutBtn.style.opacity = '0.5';
            checkoutBtn.style.cursor = 'not-allowed';
            return;
        }
        
        if (subtotal < MIN_ORDER_AMOUNT) {
            // Minimum sipariş tutarı kontrolü
            const remainingForMinOrder = MIN_ORDER_AMOUNT - subtotal;
            minOrderMessage.innerHTML = `Minimum sipariş tutarı ${formatPrice(MIN_ORDER_AMOUNT)}'dir.<br> Sepetinize ${formatPrice(remainingForMinOrder)} değerinde <br/> daha ürün eklemelisiniz!`;
            minOrderMessage.style.display = 'block';
            checkoutBtn.disabled = true;
            checkoutBtn.style.opacity = '0.5';
            checkoutBtn.style.cursor = 'not-allowed';
        } else if (subtotal < SHIPPING_THRESHOLD) {
            // Minimum sipariş tutarı OK, kargo bedeli kontrolü
            const remainingForFreeShipping = SHIPPING_THRESHOLD - subtotal;
            shippingMessage.innerHTML = `Ücretsiz kargo için minimum sipariş tutarı 1000,00 TL'dir. Sepetinize <br/> ${formatPrice(remainingForFreeShipping)} değerinde daha ürün <br/> ekleyin, kargonuz ücretsiz olsun!`;
            shippingMessage.style.display = 'block';
            shippingMessage.style.color = '#2ecc71';
            shippingMessage.style.border = '2px solid #2ecc71';
            checkoutBtn.disabled = false;
            checkoutBtn.style.opacity = '1';
            checkoutBtn.style.cursor = 'pointer';
        } else {
            // Kargo ücretsiz! Tebrik mesajı
            shippingMessage.innerHTML = `<strong style='font-size:1.1rem;'>🎉 Tebrikler! Kargonuz ücretsiz.</strong><br><span style='font-size:0.98rem;'>Keyifli alışverişler dileriz.</span>`;
            shippingMessage.style.display = 'block';
            shippingMessage.style.color = '#2ecc71';
            shippingMessage.style.border = '2px solid #2ecc71';
            shippingMessage.style.background = '#f6fff8';
            checkoutBtn.disabled = false;
            checkoutBtn.style.opacity = '1';
            checkoutBtn.style.cursor = 'pointer';
        }
    }
}

// Dizin numarasına göre sepetten ürün kaldır
function removeFromCartByIndex(index) {
    // localStorage'dan sepeti al
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Geçerli bir dizin mi kontrol et
    if (index >= 0 && index < cart.length) {
        // Kaldırılacak ürünü sakla
        const removedItem = cart[index];
        
        // Ürünü sepetten kaldır
        cart.splice(index, 1);
        
        // Sepeti güncelle
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Sepet arayüzünü güncelle
        renderCart(cart);
        updateCartCount(cart);
        
        // Kullanıcıya bilgi ver
        console.log(`${removedItem.name} sepetten kaldırıldı`);
    }
}

// Dizin numarasına göre sepetteki ürün miktarını güncelle
function updateQuantityByIndex(index, change) {
    // localStorage'dan sepeti al
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    if (index >= 0 && index < cart.length) {
        let item = cart[index];
        
        let newQuantity = item.quantity + change;
        let maxStock = 5; // Varsayılan maksimum stok
        
        // Ürün stok bilgisini doğrudan kullan
        if (typeof item.stock === 'number') {
            maxStock = item.stock;
        }
        
        // Miktar artırılıyorsa stok kontrolü yap
        if (change > 0 && newQuantity > maxStock) {
            showStockWarningPopup(`Bu üründe daha fazla stok mevcut değildir.`);
            return; // Stok yetersizse işlemi iptal et
        }
        
        if (newQuantity < 1) {
            // Ürünü sepetten kaldır
            cart.splice(index, 1);
        } else {
            // Miktarı güncelle
            cart[index].quantity = newQuantity;
        }
        
        // Sepeti güncelle
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Sepet arayüzünü güncelle
        renderCart(cart);
        updateCartCount(cart);
    }
}

// Sepet sidebar açıldığında UI'yi güncelle
document.addEventListener('DOMContentLoaded', function() {
    const openBtns = document.querySelectorAll('.cart-sidebar-open-btn');
    openBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            // Sepet içeriğini güncelle
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            updateCartUI(cart);
        });
    });
});

// Sayfa yüklendiğinde sepet sayacını güncelle
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateCartCount);
} else {
    updateCartCount();
}

// Event listener'ları kur
function setupEventListeners() {
    // Sepeti kapat butonu
    const closeCartBtn = document.querySelector('.close-cart');
    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', function() {
            const sidebar = document.querySelector('.cart-sidebar');
            const overlay = document.querySelector('.cart-overlay');
            if (sidebar) sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        });
    }

    // Overlay tıklaması
    const overlay = document.querySelector('.cart-overlay');
    if (overlay) {
        overlay.addEventListener('click', function() {
            const sidebar = document.querySelector('.cart-sidebar');
            if (sidebar) sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // NOT: Sepeti temizle butonu için olan kod artık cart.html içindeki popup tarafından yönetiliyor
    // Bu nedenle buradaki eski kod kaldırıldı

    // Sepet bağlantısına tıklanınca sepeti aç
    const cartLink = document.querySelector('.cart-link');
    if (cartLink) {
        cartLink.addEventListener('click', function(e) {
            const sidebar = document.querySelector('.cart-sidebar');
            const overlay = document.querySelector('.cart-overlay');
            // Eğer sidebar veya overlay yoksa, doğal yönlendirme çalışsın
            if (sidebar || overlay) {
                e.preventDefault();
                if (sidebar) sidebar.classList.add('active');
                if (overlay) overlay.classList.add('active');
            }
            // aksi halde link normal çalışır (yani customer-cart.html'e gider)
        });
    }
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    // Sayfa yüklendi, sepet başlatılıyor...
    // Önce sepet verilerini kontrol et
    initializeCart();
    // Event listener'ları kur
    setupEventListeners();
    // Sepet içeriğini göster
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    renderCart(cart);
    updateCartCount(cart);
});

// LocalStorage'daki değişiklikleri dinle
window.addEventListener('storage', (e) => {
    if (e.key === 'cart') {
        console.log('Cart updated in another window'); // Debug log
        renderCart();
        updateCartCount();
    }
});

// Form ve buton sadece bir kez tanımlanır
const form = document.getElementById('payment-form');
const payButton = document.querySelector('.btn-pay');

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

// Kart numarası validasyon fonksiyonu (Luhn algoritması)
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

// Ödeme sonucu modalı gösterme fonksiyonu
function showPaymentResult(success, message) {
    const modal = document.getElementById('paymentModal');
    const successIcon = modal.querySelector('.success-icon');
    const errorIcon = modal.querySelector('.error-icon');
    const title = modal.querySelector('.modal-title');
    const messageEl = modal.querySelector('.modal-message');

    // İkonları sıfırla
    successIcon.classList.add('hidden');
    errorIcon.classList.add('hidden');

    if (success) {
        successIcon.classList.remove('hidden');
        title.textContent = 'Ödeme Başarılı';
        title.style.color = '#28a745';
    } else {
        errorIcon.classList.remove('hidden');
        title.textContent = 'Ödeme Başarısız';
        title.style.color = '#dc3545';
    }

    messageEl.innerHTML = message;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Modal açıkken scroll engelle
}

// Modal kapatma fonksiyonu
function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

// Modal kapatma butonuna event ekle
const modalCloseBtn = document.querySelector('.modal-close');
if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closePaymentModal);
}
// Modal dışında tıklayınca da kapansın (isteğe bağlı)
const paymentModal = document.getElementById('paymentModal');
if (paymentModal) {
    paymentModal.addEventListener('click', function(e) {
        if (e.target === paymentModal) {
            closePaymentModal();
        }
    });

}

// Sepeti temizleme fonksiyonu
function clearCart() {
    localStorage.removeItem('cart');
    localStorage.removeItem('cartTotal');
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        cartCount.textContent = '0';
    }
}

// Ödeme işlemi fonksiyonu
function processPayment() {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Başarılı ödeme simülasyonu
            const success = true;
            if (success) {
                clearCart();
            }
            resolve(success);
        }, 2000);
    });
}

// Form submit event handler
form.addEventListener('submit', function(e) {
    // Ödeme formu gönderiliyor
    e.preventDefault();

    // Sepeti tekrar orderSummary olarak kaydet (her zaman, garanti)
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length > 0) {
        const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
        const KARGO_UCRETSIZ_LIMIT = 1000;
        const KARGO_UCRETI = 49.99;
        const shipping = subtotal >= KARGO_UCRETSIZ_LIMIT ? 0 : KARGO_UCRETI;
        const total = subtotal + shipping;
        localStorage.setItem('orderSummary', JSON.stringify({
            items: cart,
            subtotal: subtotal,
            shipping: shipping,
            total: total
        }));
    } else {
        // Sepet boşsa sipariş kaydı olmasın
        showPaymentResult(false, 'Sepetinizde ürün yok!');
        return;
    }

    // Kullanıcı giriş yapmış mı kontrol et
    const currentUser = JSON.parse(localStorage.getItem('currentUser')) || JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser) {
        showPaymentResult(false, 'Ürünü satın alabilmeniz için sitemize giriş yapmış olmanız gereklidir!<br>5 saniye içerisinde giriş ekranına yönlendiriliyorsunuz...');
        setTimeout(function() {
            window.location.href = 'login.html';
        }, 5000);
        return;
    }

    // Kart tipi ve kart numarası validasyonu
    const cardNumberValue = document.getElementById('cardNumber').value.replace(/\s/g, '');
    const cardType = getCardType(cardNumberValue);

    if (!cardType) {
        showPaymentResult(false, 'Desteklenmeyen kart tipi!<br/>Visa veya Mastercard kullanınız.');
        return;
    }

    if (!validateCardNumber(cardNumberValue)) {
        showPaymentResult(false, 'Geçersiz kart numarası!<br/>Lütfen kontrol edip tekrar deneyiniz.');
        return;
    }

    // Diğer input validasyonu
    const cardHolder = document.getElementById('cardHolder');
    const expiryDate = document.getElementById('expiryDate');
    const cvv = document.getElementById('cvv');
    const address = document.getElementById('address');
    const isValid = [cardHolder, expiryDate, cvv, address].every(validateInput);
    if (!isValid) {
        showPaymentResult(false, 'Lütfen tüm alanları doğru şekilde doldurun.');
        return;
    }

    // Tüm kontroller geçtiyse ödeme işlemini başlat
    // Ödeme işlemi başlatılıyor
    processPayment().then(function(success) {
        // Ödeme işlemi tamamlandı
        if (success) {
            // Siparişi kaydet
            const orderSummary = JSON.parse(localStorage.getItem('orderSummary'));
            const currentUserLog = JSON.parse(localStorage.getItem('currentUser')) || JSON.parse(sessionStorage.getItem('currentUser'));
            console.log('orderSummary:', orderSummary);
            console.log('currentUser:', currentUserLog);
            if (orderSummary && orderSummary.items && orderSummary.items.length > 0 && currentUser && currentUser.email) {
                let orders = JSON.parse(localStorage.getItem('orders')) || [];
                // Sipariş numarası ve tarih oluştur
                const newOrderNo = (orders.length > 0 ? (parseInt(orders[0].orderNo) + 1) : 10001).toString();
                const now = new Date();
                const orderDate = now.toLocaleDateString('tr-TR');
                const orderTime = now.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'});
                const selectedDeliveryAddress = localStorage.getItem('selectedDeliveryAddress') || '';
const selectedInvoiceAddress = localStorage.getItem('selectedInvoiceAddress') || '';
const newOrder = {
                    orderNo: newOrderNo,
                    date: orderDate,
                    time: orderTime,
                    items: orderSummary.items,
                    total: orderSummary.items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0),
                    status: 'Kargoda',
shippingAddress: selectedDeliveryAddress,
billingAddress: selectedInvoiceAddress,
                    userEmail: currentUser ? currentUser.email : null // Kullanıcıya özel sipariş
                };
                console.log('Yeni sipariş:', newOrder);
                orders.unshift(newOrder); // En yeni başa
                localStorage.setItem('orders', JSON.stringify(orders));
                console.log('Tüm siparişler:', orders);
                // Sipariş kaydedildikten sonra stokları güncelle
                updateProductStocksAfterOrder(orderSummary.items);
                // Sipariş kaydedildikten sonra orderSummary'yı sil
                localStorage.removeItem('orderSummary');
            }
            console.log('--- [PAYMENT] SİPARİŞ KAYIT BLOĞU SONU ---');
            // Bu sayfada ödeme yapılmıyor, login.html'ye yönlendir.
            window.location.href = 'login.html';
        }
    });
});

// Sipariş sonrası stok güncelleme fonksiyonu
function updateProductStocksAfterOrder(orderItems) {
    let products = JSON.parse(localStorage.getItem('products'));
    if (!products) return;
    let updated = false;

    orderItems.forEach(item => {
        // Her kategoride ara
        Object.entries(products).forEach(([category, categoryProducts]) => {
            categoryProducts.forEach((product, idx) => {
                if (product.id === item.id) {
                    // Varyantlı ürün
                    if (item.variants && Object.keys(item.variants).length > 0 && product.stock && typeof product.stock === 'object') {
                        // Varyant kombinasyon anahtarını oluştur
                        const variantKey = Object.values(item.variants).join('-');
                        if (product.stock[variantKey] !== undefined) {
                            product.stock[variantKey] = Math.max(0, product.stock[variantKey] - item.quantity);
                            updated = true;
                        }
                    } else if (typeof product.stock === 'number') {
                        // Varyantsız ürün
                        product.stock = Math.max(0, product.stock - item.quantity);
                        updated = true;
                    }
                }
            });
        });
    });
    if (updated) {
        localStorage.setItem('products', JSON.stringify(products));
    }
}

// Butona da ayrıca tıklama event'i bağla
if (payButton) {
    payButton.addEventListener('click', function() {
        // Formu manuel submit et
        if (form.requestSubmit) {
            form.requestSubmit();
        } else {
            form.submit();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Recalculate orderSummary from cart to ensure consistency
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += parseFloat(item.price) * item.quantity;
    });
    const SHIPPING_THRESHOLD = 1000;
    const SHIPPING_COST = 49.99;
    let shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const orderSummary = {
        items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            variant: item.variant || undefined,
            variants: item.variants || undefined
        })),
        subtotal: subtotal,
        shipping: shipping,
        total: subtotal + shipping
    };
    localStorage.setItem('orderSummary', JSON.stringify(orderSummary));

    const summaryContainer = document.getElementById('order-summary');
    // Veri kontrolü yapalım
    if (!orderSummary || !summaryContainer) {
        return;
    }
    // Sepetteki toplam ürün sayısını hesapla
    if (orderSummary && orderSummary.items) {
        const totalItems = orderSummary.items.reduce((total, item) => total + item.quantity, 0);
        // Sepet sayısını güncelle
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            cartCount.textContent = totalItems;
        }
    }

    function formatPrice(price) {
        return price.toLocaleString('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + ' TL';
    }

    // Sipariş özeti HTML'ini oluştur
    const summaryHTML = `
        <div class="order-summary-container" style="border-top: none;">
            <div class="order-items">
                ${orderSummary.items.map(item => `
                    <div class="order-item" style="padding: 0 20px;">
                        <div class="item-info" style="margin-left: 5px; display: flex; align-items: flex-start; position: relative; left: -5px;">
                            <img src="${item.image}" alt="${item.name}" class="item-image" style="margin-right: 20px;">
                            <div class="item-details">
                                <h4 style="font-size: 1.2rem;">${item.name}</h4>
                                <p style="font-size: 1.1rem;">Adet: ${item.quantity}</p>
                                <p style="font-size: 1.1rem;">Birim Fiyat: ${formatPrice(parseFloat(item.price))}</p>
                                <!-- Varyant(lar) gösterimi -->
                                ${item.variant ? `<p style="font-size: 1.05rem;"><span style="color: #dbb848;">Varyant: ${item.variant.name ? (item.variant.name.charAt(0).toUpperCase() + item.variant.name.slice(1).toLowerCase()) + ': ' : ''}</span><span style="color: #666;">${item.variant.value || item.variant}</span></p>` : ''}
                                ${item.variants && typeof item.variants === 'object' && Object.keys(item.variants).length > 0 ? Object.entries(item.variants).map(([key, value]) => `<p style="font-size: 1.05rem;"><b style="color: #dbb848;">${key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()}:</b> <span style="color: #ffffff;">${value}</span></p>`).join('') : ''}
                            </div>
                        </div>
                        <div class="item-total" style="font-size: 1.2rem; font-weight: bold;">
                            ${formatPrice(parseFloat(item.price) * item.quantity)}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="order-totals" style="padding: 15px 0;">
                <div class="subtotal" style="font-size: 1.1rem; padding: 0 20px; border-top: none;">
                    <span>Ara Toplam:</span>
                    <span>${formatPrice(parseFloat(orderSummary.subtotal))}</span>
                </div>
                <div class="shipping" style="font-size: 1.1rem; padding: 0 20px;">
                    <span>Kargo:</span>
                    <span id="shipping"></span>
                </div>
                <div class="total" style="font-size: 1.3rem; font-weight: bold; padding: 15px 20px; border-top: 1px solid #ddd;">
                    <span>Toplam:</span>
                    <span>${formatPrice(parseFloat(orderSummary.total))}</span>
                </div>
            </div>
        </div>
    `;
    summaryContainer.innerHTML = summaryHTML;

    // --- KARGO GÖRÜNÜMÜNÜ EŞLEŞTİR ---
    // Sayfa yüklendiğinde kargo bilgisini cart.js ile aynı şekilde göster
    const shippingSpan = document.getElementById('shipping');
    if (shippingSpan && typeof orderSummary.shipping !== 'undefined') {
        // cart.js ile birebir aynı gösterim:
        if (orderSummary.shipping === 0) {
            shippingSpan.innerHTML = "<span style='color:#2ecc71;font-weight:bold;'>Ücretsiz!</span>";
        } else {
            shippingSpan.textContent = formatPrice(orderSummary.shipping);
        }
    }
    // DEBUG: orderSummary.shipping ve subtotal değerlerini konsola yaz
    console.log('[PAYMENT] orderSummary.shipping:', orderSummary.shipping, 'subtotal:', orderSummary.subtotal);

    const cardHolder = document.getElementById('cardHolder');
    const cardNumber = document.getElementById('cardNumber');
    const expiryDate = document.getElementById('expiryDate');
    const cvv = document.getElementById('cvv');
    const address = document.getElementById('address');

    // Sadece harf ve boşluk girişine izin veren fonksiyon
    function onlyLetters(e) {
        if (!/[a-zA-ZğüşıöçĞÜŞİÖÇ\s]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
            e.preventDefault();
        }
    }

    // Sadece rakam girişine izin veren fonksiyon
    function onlyNumbers(e) {
        if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
            e.preventDefault();
        }
    }

    // Her kelimenin ilk harfini büyük yapan fonksiyon
    function capitalizeWords(str) {
        return str.toLowerCase().replace(/(^|\s)\S/g, letter => letter.toUpperCase());
    }

    // Kart üzerindeki isim kontrolü ve formatı
    cardHolder.addEventListener('keypress', onlyLetters);
    cardHolder.addEventListener('input', function() {
        let value = this.value.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ\s]/g, '');
        this.value = capitalizeWords(value);
    });

    // Adres formatı
    address.addEventListener('input', function() {
        this.value = capitalizeWords(this.value);
    });

    // Kart numarası kontrolü ve formatı
    cardNumber.addEventListener('keypress', onlyNumbers);
    cardNumber.addEventListener('input', function() {
        // Önce sadece rakamları al
        let value = this.value.replace(/\D/g, '');
        
        // 4'er haneli gruplara ayır
        let formattedValue = '';
        for (let i = 0; i < value.length && i < 16; i++) {
            if (i > 0 && i % 4 === 0) {
                formattedValue += ' ';
            }
            formattedValue += value[i];
        }
        
        // Formatlanmış değeri input'a ata
        this.value = formattedValue;
        
        // Form validasyonunu güncelle
        validateForm();
    });

    // HTML'deki maxlength özelliğini kaldıralım
    cardNumber.removeAttribute('maxlength');

    // Son kullanma tarihi formatı (AA/YY)
    expiryDate.addEventListener('keypress', onlyNumbers);
    expiryDate.addEventListener('input', function(e) {
        // Eğer backspace ile silme işlemi yapılıyorsa, normal davran
        if (e.inputType === 'deleteContentBackward') {
            return;
        }

        // Sadece rakamları al
        let value = this.value.replace(/\D/g, '');
        
        // 4 rakamdan fazlasını alma
        value = value.substring(0, 4);
        
        // AA/YY formatına çevir
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2);
        }
        
        this.value = value;
    });

    // HTML'deki maxlength özelliğini güncelle
    expiryDate.removeAttribute('maxlength');

    // CVV kontrolü
    cvv.addEventListener('keypress', onlyNumbers);
    cvv.addEventListener('input', function() {
        this.value = this.value.replace(/[^\d]/g, '').substring(0, 3);
    });

    const submitButton = document.querySelector('.btn-pay');
    submitButton.disabled = true; // Başlangıçta butonu devre dışı bırak

    function showError(input, message) {
        removeError(input);
        input.classList.add('error-input');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        input.parentNode.insertBefore(errorDiv, input.nextSibling);
    }

    function removeError(input) {
        const errorMessage = input.nextElementSibling;
        if (errorMessage && errorMessage.classList.contains('error-message')) {
            errorMessage.remove();
        }
    }

    function validateInput(input) {
        const value = input.value.trim();
        
        switch(input.id) {
            case 'cardHolder':
                if (!/^[a-zA-ZğüşıöçĞÜŞİÖÇ]+\s+[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/.test(value)) {
                    showError(input, 'Ad ve soyad giriniz');
                    return false;
                }
                break;
                
            case 'cardNumber':
                const numbers = value.replace(/\s/g, '');
                if (numbers.length === 0) {
                    return true;
                }
                if (numbers.length !== 16) {
                    showError(input, '16 haneli kart numarası giriniz');
                    return false;
                }
                if (!/^\d{16}$/.test(numbers)) {
                    showError(input, '16 haneli kart numarası giriniz');
                    return false;
                }
                break;
                
            case 'expiryDate':
                if (value.length < 5) {
                    return true;
                }
                const [month, year] = value.split('/');
                const currentDate = new Date();
                const currentYear = currentDate.getFullYear() % 100;
                const currentMonth = currentDate.getMonth() + 1;
                
                if (!/^\d{2}\/\d{2}$/.test(value)) {
                    showError(input, 'AA/YY formatında giriniz');
                    return false;
                }
                
                if (parseInt(month) < 1 || parseInt(month) > 12) {
                    showError(input, 'Geçerli bir ay giriniz (01-12)');
                    return false;
                }
                
                if (parseInt(year) < currentYear || 
                    (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
                    showError(input, 'Kartınızın süresi dolmuş');
                    return false;
                }
                break;
                
            case 'cvv':
                const cvvValue = value.replace(/\D/g, '');
                if (cvvValue.length === 0) {
                    return true;
                }
                if (cvvValue.length !== 3) {
                    showError(input, '3 haneli CVV kodunu giriniz');
                    return false;
                }
                break;
                
            case 'address':
                if (value.length === 0) {
                    return true;
                }
                if (value.length < 4) {
                    showError(input, 'Lütfen geçerli bir adres giriniz');
                    return false;
                }
                const words = value.split(/\s+/).filter(word => word.length > 0);
                if (words.length < 2) {
                    showError(input, 'Lütfen geçerli bir adres giriniz');
                    return false;
                }
                break;
        }
        return true;
    }

    function validateForm() {
        const inputs = [cardHolder, cardNumber, expiryDate, cvv, address];
        let isValid = true;

        // Her input için ayrı ayrı kontrol
        inputs.forEach(input => {
            if (!validateInput(input)) {
                isValid = false;
            }
        });

        // Submit butonunu güncelle
        submitButton.disabled = !isValid;
        submitButton.style.opacity = isValid ? '1' : '0.5';
        submitButton.style.cursor = isValid ? 'pointer' : 'not-allowed';

        return isValid;
    }

    // Tüm hata mesajlarını temizle
    function clearAllErrors() {
        [cardHolder, cardNumber, expiryDate, cvv, address].forEach(input => {
            input.classList.remove('error-input');
            const errorElement = input.nextElementSibling;
            if (errorElement && errorElement.classList.contains('error-message')) {
                errorElement.remove();
            }
        });
    }

    // Her input için ayrı event listener
    [cardHolder, cardNumber, expiryDate, cvv, address].forEach(input => {
        input.addEventListener('input', (e) => {
            const currentInput = e.target;
            
            // Son kullanma tarihi için özel işlem
            if (currentInput.id === 'expiryDate') {
                if (e.inputType === 'deleteContentBackward') {
                    if (currentInput.value.endsWith('/')) {
                        currentInput.value = currentInput.value.slice(0, -1);
                        return;
                    }
                } else {
                    let value = currentInput.value.replace(/\D/g, '');
                    if (value.length >= 2) {
                        value = value.slice(0, 2) + '/' + value.slice(2, 4);
                    }
                    currentInput.value = value;
                }
            }

            // Kart numarası için 4'lü gruplandırma
            if (currentInput.id === 'cardNumber') {
                let value = currentInput.value.replace(/\D/g, '').slice(0, 16);
                let formattedValue = '';
                for (let i = 0; i < value.length; i++) {
                    if (i > 0 && i % 4 === 0) {
                        formattedValue += ' ';
                    }
                    formattedValue += value[i];
                }
                currentInput.value = formattedValue;
            }

            // CVV için sadece rakam girişi
            if (currentInput.id === 'cvv') {
                currentInput.value = currentInput.value.replace(/\D/g, '').slice(0, 3);
            }

            // Sadece değişen input için hata durumunu temizle
            currentInput.classList.remove('error-input');
            removeError(currentInput);
            
            // Boş input kontrolü
            if (currentInput.value.trim() === '') {
                updatePayButton();
                return;
            }
            
            // Sadece dolu ve değişen input'u validate et
            if (currentInput.value.trim() !== '') {
                validateInput(currentInput);
            }
            
            // Buton durumunu güncelle
            updatePayButton();
        });

        // Blur event listener
        input.addEventListener('blur', (e) => {
            const currentInput = e.target;
            if (currentInput.value.trim() !== '') {
                validateInput(currentInput);
            }
        });
    });

    function updatePayButton() {
        const payButton = document.querySelector('.btn-pay');
        const inputs = [cardHolder, cardNumber, expiryDate, cvv, address];
        
        const isValid = inputs.every(input => {
            const value = input.value.trim();
            if (value === '') return false;
            
            return validateInput(input);
        });
        
        payButton.disabled = !isValid;
    }





    // Modal kapatma
    document.querySelector('.modal-close').addEventListener('click', () => {
        document.getElementById('paymentModal').style.display = 'none';
        if (document.querySelector('.success-icon').classList.contains('hidden') === false) {
            // Başarılı ödemeden sonra anasayfaya yönlendir
            window.location.href = 'customer-panel.html';
        }
    });







});

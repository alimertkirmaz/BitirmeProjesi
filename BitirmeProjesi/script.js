// Navbar'da kullanıcı adı/soyadı gösterimi (Tüm sayfalarda ortak)
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        var currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            try {
                var user = JSON.parse(currentUser);
                var name = user.adSoyad || ((user.firstName && user.lastName) ? (user.firstName + ' ' + user.lastName) : null) || user.ad || user.name || user.fullName || 'Müşteri';
                var customerNameEl = document.getElementById('customerName');
                if (customerNameEl) {
                    customerNameEl.textContent = name;
                }
            } catch(e) {}
        }
    });
})();

document.addEventListener('DOMContentLoaded', () => {
    // Hero Slider
    const heroSlider = document.querySelector('.slider');
    const heroSlides = document.querySelectorAll('.slide');
    let heroCurrentSlide = 0;

    function nextHeroSlide() {
        if (!heroSlider || heroSlides.length === 0) return;
        heroCurrentSlide = (heroCurrentSlide + 1) % heroSlides.length;
        heroSlider.style.transform = `translateX(-${heroCurrentSlide * 100}%)`;
    }

    // Hero slider için otomatik geçiş - 3 saniyede bir
    if (heroSlider && heroSlides.length > 0) {
        setInterval(nextHeroSlide, 3000);
    }

    // Kategori Slider
    const categorySlider = document.querySelector('.category-slider');
    const categoryCards = document.querySelectorAll('.category-card');
    const dots = document.querySelector('.category-dots');
    const slidesCount = Math.ceil(categoryCards.length / 4);
    let current = 0;

    // Noktaları oluştur
    if (categorySlider && categoryCards.length > 0 && dots) {
        for (let i = 0; i < slidesCount; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => {
                current = i;
                updateCategorySlider();
            });
            dots.appendChild(dot);
        }

        // Kategori slider'ı güncelle
        function updateCategorySlider() {
            categorySlider.style.transform = `translateX(-${current * 100}%)`;
            // Noktaları güncelle
            document.querySelectorAll('.dot').forEach((dot, index) => {
                dot.classList.toggle('active', index === current);
            });
        }

        // Kategori slider için otomatik geçiş
        setInterval(() => {
            current = (current + 1) % slidesCount;
            updateCategorySlider();
        }, 4000);
    }

    // Sepet işlemleri
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartSidebar = document.querySelector('.cart-sidebar');
    const cartOverlay = document.querySelector('.cart-overlay');
    const closeCart = document.querySelector('.close-cart');
    const cartItems = document.querySelector('.cart-items');
    const totalAmount = document.querySelector('.total-amount');

    // Sepeti aç/kapa
    function toggleCart() {
        cartSidebar.classList.toggle('active');
        cartOverlay.classList.toggle('active');
        updateCartUI();
    }

    // Sepet arayüzünü güncelle
    function updateCartUI() {
        if (!cartItems) return;

        let total = 0;
        cartItems.innerHTML = '';

        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;

            const cartItemDiv = document.createElement('div');
            cartItemDiv.className = 'cart-item';
            cartItemDiv.dataset.productId = item.productId;
            cartItemDiv.innerHTML = `
                <img src="${item.image}" alt="${item.name}">
                <div class="cart-item-info">
                    <h4 class="cart-item-title">${item.name}</h4>
                    <div class="cart-item-price">${formatPrice(item.price)} TL</div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn minus" data-product-id="${item.productId}">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn plus" data-product-id="${item.productId}">+</button>
                    </div>
                </div>
                <div class="cart-item-total">${formatPrice(itemTotal)} TL</div>
            `;

            cartItems.appendChild(cartItemDiv);
        });

        if (totalAmount) {
            totalAmount.textContent = formatPrice(total) + ' TL';
        }
    }

    // Miktar güncelleme fonksiyonu
    function updateQuantity(productId, change) {
        const index = cart.findIndex(item => item.productId === productId);
        if (index === -1) return;

        cart[index].quantity = Math.max(1, cart[index].quantity + change);
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
        updateCartCount();
    }

    // Fiyat format fonksiyonu
    function formatPrice(price) {
        return price.toLocaleString('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // Sepet sayacını güncelle
    function updateCartCount() {
        const cartCount = document.querySelector('.cart-count');
        if (!cartCount) return;

        const totalItems = cart.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0);
        
        if (totalItems > 0) {
            cartCount.textContent = totalItems;
            cartCount.style.display = 'flex';
        } else {
            cartCount.style.display = 'none';
        }
    }

    // Event Listeners
    if (closeCart) closeCart.addEventListener('click', toggleCart);
    if (cartOverlay) cartOverlay.addEventListener('click', toggleCart);

    // Sepete ekle butonları için event listener
    document.querySelectorAll('.btn-add-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productCard = e.target.closest('.product');
            const productId = productCard.dataset.id;
            const productName = productCard.querySelector('h3').textContent;
            const productPrice = parseFloat(productCard.querySelector('.price').textContent.replace(/[^0-9,]/g, '').replace(',', '.'));
            const productImage = productCard.querySelector('img').src;

            const existingItem = cart.find(item => item.productId === productId);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({
                    id: productId,
                    name: productName,
                    price: productPrice,
                    image: productImage,
                    quantity: 1,
                    variants: {}
                });
            }

            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartUI();
            updateCartCount();
            toggleCart();
        });
    });

    // Sepet simgesi için event listener
    const cartIcon = document.querySelector('.cart-icon');
    if (cartIcon) {
        cartIcon.addEventListener('click', toggleCart);
    }

    // Sayfa yüklendiğinde sepet sayacını güncelle
    updateCartCount();
});

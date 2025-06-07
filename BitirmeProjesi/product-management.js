// Firebase fonksiyonları artık global olarak kullanılacak
// Firestore'dan tüm ürünleri getir
async function getAllProductsFromFirestore() {
  try {
    const querySnapshot = await firebase.firestore().collection('products').get();
    const products = [];
    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });
    // Firestore'dan ürünler çekildi
    return products;
  } catch (error) {
    // Firestore'dan ürünler çekilirken hata oluştu
    return [];
  }
}

// Firestore'a ürün ekle
async function addProductToFirestore(product) {
  try {
    const docRef = await firebase.firestore().collection('products').add(product);
    // Ürün başarıyla eklendi
    return docRef.id;
  } catch (error) {
    // Ürün eklenirken hata oluştu
    throw error;
  }
}

// Firestore'da ürün güncelle
async function updateProductInFirestore(productId, updatedData) {
  try {
    await firebase.firestore().collection('products').doc(productId).update(updatedData);
    // Ürün başarıyla güncellendi
  } catch (error) {
    // Ürün güncellenirken hata oluştu
    throw error;
  }
}

// Firestore'dan ürün sil
async function deleteProductFromFirestore(productId) {
  try {
    await firebase.firestore().collection('products').doc(productId).delete();
    // Ürün başarıyla silindi
  } catch (error) {
    // Ürün silinirken hata oluştu
    throw error;
  }
}

// Ürünleri tutacak dizi
let products = [];

// DOM elementlerini seçme
const productTableBody = document.getElementById('productTableBody');
const searchInput = document.querySelector('.search-input');
const searchButton = document.querySelector('.search-bar .btn');
const productForm = document.getElementById('productForm');
const imagePreview = document.getElementById('imagePreview');
const productImage = document.getElementById('productImage');
const productCategory = document.getElementById('productCategory');
const productName = document.getElementById('productName');
const productTitle = document.getElementById('productTitle');
const productStock = document.getElementById('productStock');
const productPrice = document.getElementById('productPrice');
const variantTableBody = document.getElementById('variantTableBody');
const productDescription = document.getElementById('productDescription');

// Rastgele ürün kodu oluşturma
function generateProductCode() {
    return 'ART' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Para birimi formatı
function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

// Ürünleri tabloda gösterme
async function displayProducts() {
    productTableBody.innerHTML = '';
    

    
    products.forEach((product, index) => {

        
        // Stok miktarını hesapla
        let stockDisplay = 0;
        

        
        // --- STOCK DISPLAY NORMALIZATION ---
        if (product.stock === undefined || product.stock === null) {
            // Stok tanımlı değilse 0 olarak ayarla
            stockDisplay = 0;
        } else if (typeof product.stock === 'object' && product.stock !== null) {
            // Varyantlı ürün için tüm stokları topla
            try {
                // Eğer eski veri yapısından kalan {default: n} varsa, sadece onu al
                if (Object.keys(product.stock).length === 1 && product.stock.default !== undefined) {
                    stockDisplay = Number(product.stock.default) || 0;
                } else {
                    stockDisplay = Object.values(product.stock).reduce((total, value) => {
                        const numValue = Number(value);
                        return total + (isNaN(numValue) ? 0 : numValue);
                    }, 0);
                }
            } catch (error) {
                // Stok hesaplama hatası oluştu
                stockDisplay = 0;
            }
        } else {
            // Varyantsız ürün için direkt stok değerini kullan
            const numStock = Number(product.stock);
            stockDisplay = isNaN(numStock) ? 0 : numStock;
        }
        


        // Tüm ürünleri göster, stok kontrolünü kaldır
        // Varyantsız ürün: stoğu 0 olsa bile göster
        // if (typeof product.stock !== 'object' && stockDisplay === 0) {
        //     return;
        // }

        // Varyantlı ürün: tüm varyantların stoğu 0 olsa bile göster
        // if (typeof product.stock === 'object') {
        //     const allZero = Object.values(product.stock).every(val => !val || val === 0);
        //     if (allZero) return;
        // }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><img src="${product.image}" alt="${product.name}" class="product-image"></td>
            <td>${product.name}</td>
            <td>${product.description || ''}</td>
            <td>${stockDisplay}</td>
            <td>${typeof product.price === 'object' ? (() => { const validPrices = Object.keys(product.price).filter(key => product.stock && product.stock[key] > 0).map(key => product.price[key]).filter(p => typeof p === 'number'); if (validPrices.length > 0) { return (Math.min(...validPrices)).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' TL*'; } else { return 'Varyantlı'; } })() : product.price}</td>
            <td>
                <button class="btn" onclick="openEditProductModal('${product.id}')">Düzenle</button>
                <button class="btn btn-danger" onclick="deleteProduct('${product.id}')">Sil</button>
            </td>
        `;
        productTableBody.appendChild(row);

        // VARYANT SATIRLARI: Eğer varyantlı ürünse, altına varyantları ekle
        if (product.variants && product.variants.length > 0 && typeof product.price === 'object' && typeof product.stock === 'object') {
            // Varyant kombinasyonlarını oluştur
            const variantNames = product.variants.map(v => v.name);
            function getCombinations(arrays, prefix = []) {
                if (!arrays.length) return [prefix];
                const [first, ...rest] = arrays;
                return first.flatMap(value => getCombinations(rest, [...prefix, value]));
            }
            const variantValues = product.variants.map(v => v.values);
            const combinations = getCombinations(variantValues);
            combinations.forEach(comb => {
                const key = comb.join('-');
                const stock = product.stock[key] !== undefined ? product.stock[key] : 0;
                // Sadece stoğu 0'dan büyük olan varyantlar gösterilsin
                if (!stock || stock === 0) return;
                const price = product.price[key] !== undefined ? product.price[key] : '-';
                // Satırı oluştur
                const variantRow = document.createElement('tr');
                variantRow.classList.add('variant-row-table');
                variantRow.style.background = '#232323';
                variantRow.style.color = 'white';
                variantRow.innerHTML = `
                    <td style="width:60px; padding:0.5rem 0.5rem 0.5rem 0.5rem;">
                        <div class="variant-image-preview" data-variant-key="${key}" style="display:flex;flex-direction:column;align-items:center;">
                            <img src="${(product.variantImages && product.variantImages[key]) ? product.variantImages[key] : ''}" alt="Varyant Görseli" class="product-image" style="background:#2a2a2a; min-width:50px; min-height:50px; object-fit:cover; border-radius:4px;" />
                        </div>
                    </td>
                    <td colspan="1" style="font-size:15px;">${comb.map((v, i) => `<span style=\"color:#dbb848;\">${variantNames[i]}</span>: ${v}`).join(' | ')}</td>
                    <td></td>
                    <td>${stock}</td>
                    <td>${typeof price === 'number' ? price.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' TL' : '-'}</td>
                    <td style="text-align:left; padding:1rem; vertical-align:middle;">
                        <button class="btn btn-image-upload" data-product-id="${product.id}" data-variant-key="${key}">Görsel Ekle</button>
                        <input type="file" accept="image/*" style="display:none;" class="variant-image-input" data-product-id="${product.id}" data-variant-key="${key}">
                        <button class="btn btn-success btn-save-variant-image" style="background-color:#28a745; border-color:#28a745; color:#fff;" data-product-id="${product.id}" data-variant-key="${key}">Kaydet</button>
                    </td>
                `;
                productTableBody.appendChild(variantRow);
            });
        }
    });

    // Geçici görsel önizleme tutucu
    const tempVariantImages = {};
    // Görsel Ekle butonları için event
    document.querySelectorAll('.btn-image-upload').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const productId = btn.getAttribute('data-product-id');
            const variantKey = btn.getAttribute('data-variant-key');
            // Trigger the hidden file input for this variant
            const input = document.querySelector(`input.variant-image-input[data-product-id='${productId}'][data-variant-key='${variantKey}']`);
            if(input) input.click();
        });
    });
    // Dosya seçilince önizleme göster
    document.querySelectorAll('.variant-image-input').forEach(input => {
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    const variantKey = input.getAttribute('data-variant-key');
                    // Sadece önizleme, kaydetmeden
                    tempVariantImages[variantKey] = ev.target.result;
                    // Önizleme alanını güncelle
                    const previewDiv = document.querySelector(`.variant-image-preview[data-variant-key='${variantKey}'] img`);
                    if (previewDiv) previewDiv.src = ev.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    });
    // Kaydet butonları için event
    document.querySelectorAll('.btn-save-variant-image').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            const productId = btn.getAttribute('data-product-id');
            const variantKey = btn.getAttribute('data-variant-key');
            // Eğer önizleme varsa kaydet
            if (tempVariantImages[variantKey]) {
                // İlgili ürünü bul
                const prod = products.find(p => p.id === productId);
                if (prod) {
                    if (!prod.variantImages) prod.variantImages = {};
                    prod.variantImages[variantKey] = tempVariantImages[variantKey];
                    await updateProductInFirestore(productId, { variantImages: prod.variantImages });
                    products = await getAllProductsFromFirestore();
                    displayProducts();
                }
            } else {
                alert('Önce bir görsel seçin!');
            }
        });
    });
}

// Tab işlemleri
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Aktif tabı değiştir
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // İlgili içeriği göster
        const tabId = tab.getAttribute('data-tab');
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabId + 'Tab').classList.add('active');
    });
});

// Görsel önizleme
productImage.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            imagePreview.classList.add('has-image');
        };
        reader.readAsDataURL(file);
    }
});

// Varyant işlemleri
window.addVariantRow = function() {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="form-control variant-name" placeholder="Renk, Beden, vb."></td>
        <td><input type="text" class="form-control variant-values" placeholder="Değerleri virgülle ayırın"></td>
        <td>
            <button type="button" class="btn btn-primary" onclick="applyVariant(this)">Ekle</button>
            <button type="button" class="btn btn-danger" onclick="removeVariantRow(this)">Sil</button>
        </td>
    `;
    variantTableBody.appendChild(row);
}

window.applyVariant = function(button) {
    const row = button.closest('tr');
    const nameInput = row.querySelector('.variant-name');
    const valuesInput = row.querySelector('.variant-values');
    
    if (!nameInput.value || !valuesInput.value) {
        alert('Lütfen varyant adı ve değerlerini girin!');
        return;
    }
    
    // Varyant ekle butonunu devre dışı bırak
    button.disabled = true;
    button.textContent = 'Eklendi';
    
    // Input alanlarını readonly yap
    nameInput.readOnly = true;
    valuesInput.readOnly = true;
    
    // Stok tablosunu güncelle
    updateStockTable();
}

window.removeVariantRow = function(button) {
    const row = button.closest('tr');
    const nameInput = row.querySelector('.variant-name');
    const valuesInput = row.querySelector('.variant-values');
    
    // Eğer varyant henüz eklenmemişse direkt sil
    if (!nameInput.readOnly && !valuesInput.readOnly) {
        row.remove();
        return;
    }
    
    // Onay al
    if (confirm('Bu varyantı silmek istediğinize emin misiniz?')) {
        row.remove();
        updateStockTable();
        
        // Eğer hiç varyant kalmadıysa genel stok alanını düzenlenebilir yap
        const remainingVariants = document.querySelectorAll('.variant-name[readonly]');
        if (remainingVariants.length === 0) {
            const productStockInput = document.getElementById('productStock');
            productStockInput.readOnly = false;
            productStockInput.value = '';
        }
    }
}

// Varyant değerlerini al
function getVariantValues() {
    const variants = {};
    const rows = document.querySelectorAll('#variantTableBody tr');
    
    rows.forEach(row => {
        const nameInput = row.querySelector('.variant-name');
        const valuesInput = row.querySelector('.variant-values');
        
        if (nameInput && valuesInput && nameInput.value && valuesInput.value) {
            // Varyant adını orijinal haliyle kullan (küçük harfe dönüştürme)
            const name = nameInput.value;
            const values = valuesInput.value.split(',').map(v => v.trim()).filter(v => v);
            variants[name] = values;
        }
    });
    
    return variants;
}

// Stok tablosunu güncelle
function updateStockTable(existingStock = {}, existingPrices = {}) {
    const variants = getVariantValues();
    const tbody = document.getElementById('variantStockTableBody');
    const productStockInput = document.getElementById('productStock');
    tbody.innerHTML = '';
    
    // Varyant isimlerini ve değerlerini al
    const variantNames = Object.keys(variants);
    
    // Eğer hiç varyant yoksa tabloyu gösterme
    if (variantNames.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10">Henüz varyant eklenmemiş</td></tr>';
        return;
    }

    // Varyant varsa genel stok alanını sıfırla
    productStockInput.value = 0;
    productStockInput.readOnly = true;

    // Tablo başlıklarını güncelle
    const headerRow = tbody.parentElement.querySelector('thead tr');
    headerRow.innerHTML = '';
    variantNames.forEach(name => {
        headerRow.innerHTML += `<th style="text-align:center; padding-bottom: 5px;">${name.charAt(0).toUpperCase() + name.slice(1)}</th>`;
    });
    headerRow.innerHTML += '<th style="text-align:center; padding-left: 25px; padding-bottom: 5px;">Stok Adedi</th>';
    headerRow.innerHTML += '<th style="text-align:center; padding-left: 40px; padding-bottom: 5px;">Fiyat (₺)</th>';

    // Tüm varyant kombinasyonlarını oluştur
    function generateCombinations(variants, current = [], index = 0) {
        if (index === variantNames.length) {
            const row = document.createElement('tr');
            
            // Her varyant değeri için bir hücre oluştur
            current.forEach((value, i) => {
                row.innerHTML += `<td>${value}</td>`;
            });

            // Stok ve fiyat giriş hücreleri
            const variantKey = current.join('-');
            const stockValue = (existingStock && existingStock[variantKey] !== undefined) ? existingStock[variantKey] : 0;
            const priceValue = (existingPrices && existingPrices[variantKey] !== undefined) ? existingPrices[variantKey] : 0;
            row.innerHTML += `
                <td>
                    <input style="margin-left: 10px;" type="number" class="form-control variant-stock"
                           data-variant-key="${variantKey}"
                           min="0" value="${stockValue}" required>
                </td>
                <td>
                    <input style="margin-left: 20px;" type="number" class="form-control variant-price"
                           data-variant-key="${variantKey}"
                           min="0" step="0.01" value="${priceValue}" required>
                </td>
            `;

            tbody.appendChild(row);
            return;
        }

        const variantName = variantNames[index];
        const values = variants[variantName];
        
        values.forEach(value => {
            generateCombinations(variants, [...current, value], index + 1);
        });
    }

    generateCombinations(variants);

    // Tüm satırların ikinci hücresine padding-left uygula
    tbody.querySelectorAll('tr > td:nth-child(2)').forEach(cell => {
        cell.style.paddingLeft = '8px';
    });

    // Stok input'larına event listener ekle
    document.querySelectorAll('.variant-stock').forEach(input => {
        input.addEventListener('input', updateTotalStock);
    });

    // Fiyat input'larına event listener ekle
    document.querySelectorAll('.variant-price').forEach(input => {
        input.addEventListener('input', updateTotalPrice);
    });
}

// Toplam stoğu hesapla ve genel stok alanına yaz
function updateTotalStock() {
    const productStockInput = document.getElementById('productStock');
    let totalStock = 0;

    document.querySelectorAll('.variant-stock').forEach(input => {
        totalStock += parseInt(input.value) || 0;
    });

    productStockInput.value = totalStock;
}

// En düşük varyant fiyatını ana fiyat inputuna yaz
function updateTotalPrice() {
    const productPriceInput = document.getElementById('productPrice');
    let minPrice = null;

    document.querySelectorAll('.variant-price').forEach(input => {
        const price = parseFloat(input.value);
        if (!isNaN(price) && price >= 0) {
            if (minPrice === null || price < minPrice) {
                minPrice = price;
            }
        }
    });

    productPriceInput.value = minPrice !== null ? minPrice : '';
}


// Modal işlemleri
window.openAddProductModal = function() {
    const modalTitle = document.getElementById('modalTitle');
    const productModal = document.getElementById('productModal');
    const productForm = document.getElementById('productForm');
    const imagePreview = document.getElementById('imagePreview');
    const variantTableBody = document.getElementById('variantTableBody');
    const variantStockTableBody = document.getElementById('variantStockTableBody');
    const productStock = document.getElementById('productStock');

    if (modalTitle) modalTitle.textContent = 'Yeni Ürün Ekle';
    if (productModal) productModal.classList.add('active');
    if (productForm) {
        productForm.reset();
        delete productForm.dataset.originalCategory;
        delete productForm.dataset.productIndex;
    }
    if (imagePreview) {
        imagePreview.innerHTML = '<span class="image-preview-text">Görsel Seçin</span>';
        imagePreview.classList.remove('has-image');
    }
    if (variantTableBody) variantTableBody.innerHTML = '';
    if (variantStockTableBody) variantStockTableBody.innerHTML = '';
    if (productStock) {
        productStock.readOnly = false;
        productStock.value = '';
    }
    
    // Genel bilgiler sekmesini aktif yap
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    const generalTab = document.querySelector('.tab[data-tab="general"]');
    if (generalTab) generalTab.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const generalTabContent = document.getElementById('generalTab');
    if (generalTabContent) generalTabContent.classList.add('active');
};

window.openEditProductModal = function(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('modalTitle').textContent = 'Ürün Düzenle';
    document.getElementById('productModal').classList.add('active');
    
    // Form alanlarını doldur
    productName.value = product.name;
    productDescription.value = product.description || '';
    productCategory.value = product.category || '';
    // Fiyat alanı doldurma (varyantlı ise ilk fiyatı göster, varyantsız ise direkt göster)
    if (typeof product.price === 'object') {
        // Varyantlı ürün: ilk fiyatı göster (veya 0)
        const firstPrice = Object.values(product.price)[0] || 0;
        productPrice.value = parseFloat(firstPrice);
    } else {
        productPrice.value = parseFloat(product.price.replace(/[^\d,]/g, '').replace(',', '.'));
    }
    
    // Görsel önizleme
    imagePreview.innerHTML = `<img src="${product.image}" alt="${product.name}">`;
    imagePreview.classList.add('has-image');
    
    // Varyant ve stok tablolarını temizle
    const variantTableBody = document.getElementById('variantTableBody');
    const variantStockTableBody = document.getElementById('variantStockTableBody');
    variantTableBody.innerHTML = '';
    variantStockTableBody.innerHTML = '';
    
    if (product.variants && product.variants.length > 0) {
        // Varyantları yükle
        product.variants.forEach(variant => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="text" class="form-control variant-name" value="${variant.name}" readonly></td>
                <td><input type="text" class="form-control variant-values" value="${variant.values.join(', ')}" readonly></td>
                <td>
                    <button type="button" class="btn btn-primary" disabled>Eklendi</button>
                    <button type="button" class="btn btn-danger" onclick="removeVariantRow(this)">Sil</button>
                </td>
            `;
            variantTableBody.appendChild(row);
        });

        // Stok tablosunu güncelle (stok ve fiyatları doğrudan inputlara yaz)
        updateStockTable(product.stock, product.price);
        // Toplam stoğu güncelle
        setTimeout(() => {
            updateTotalStock();
        }, 100);

        // Genel stok alanını readonly yap
        const productStockInput = document.getElementById('productStock');
        productStockInput.readOnly = true;
        productStockInput.value = '';
    } else {
        // Varyant yoksa genel stok değerini yükle
        const productStockInput = document.getElementById('productStock');
        productStockInput.value = product.stock || 0;
        productStockInput.readOnly = false;
        // Varyant yoksa fiyatı da ana inputa doldur
        if (typeof product.price !== 'object') {
            productPrice.value = parseFloat(product.price.replace(/[^\d,]/g, '').replace(',', '.'));
        }
    }

    // SEO verilerini doldur
    if (product.seo) {
        document.getElementById('metaTitle').value = product.seo.metaTitle || '';
        document.getElementById('metaDescription').value = product.seo.metaDescription || '';
        document.getElementById('metaKeywords').value = (product.seo.metaKeywords || []).join(', ');
        document.getElementById('seoUrl').value = product.seo.seoUrl || '';
    }
    
    // Store product ID for update
    productForm.dataset.editingProductId = productId;
};

// Ürün silme
window.deleteProduct = async function(productId) {
    if (confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
        await deleteProductFromFirestore(productId);
        products = await getAllProductsFromFirestore();
        displayProducts();
        alert('Ürün başarıyla silindi.');
    }
};

// Ürün arama
searchButton.addEventListener('click', function() {
    const searchTerm = searchInput.value.toLowerCase();
    displayFilteredProducts(searchTerm);
});

searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    displayFilteredProducts(searchTerm);
});

function displayFilteredProducts(searchTerm) {
    productTableBody.innerHTML = '';
    Object.entries(products).forEach(([category, categoryProducts]) => {
        const filtered = categoryProducts.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            (product.description && product.description.toLowerCase().includes(searchTerm))
        );
        
        filtered.forEach((product, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${product.image}" alt="${product.name}" class="product-image"></td>
                <td>${product.name}</td>
                <td>${product.description || ''}</td>
                <td>${product.stock || 0}</td>
                <td>${typeof product.price === 'object' ? (() => { const validPrices = Object.keys(product.price).filter(key => product.stock && product.stock[key] > 0).map(key => product.price[key]).filter(p => typeof p === 'number'); if (validPrices.length > 0) { return (Math.min(...validPrices)).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' TL*'; } else { return 'Varyantlı'; } })() : product.price}</td>
                <td>
                    <button class="btn" onclick="openEditProductModal('${category}', ${index})">Düzenle</button>
                    <button class="btn btn-danger" onclick="deleteProduct('${category}', ${index})">Sil</button>
                </td>
            `;
            productTableBody.appendChild(row);
        });
    });
}



// Close modal
window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('active');
};

// Form submit işleyicisi
document.getElementById('productForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Temel alanların kontrolü
    const name = productName.value.trim();
    const description = productDescription.value.trim();
    const selectedCategory = productCategory.value;

    if (!name || !selectedCategory) {
        alert('Lütfen tüm zorunlu alanları doldurun!');
        return;
    }

    // Varyant kontrolü
    const variantRows = document.querySelectorAll('#variantTableBody tr');
    const hasAddedVariants = variantRows.length > 0 && variantRows[0].querySelector('.variant-name').readOnly;

    // Varyant ve stok bilgilerini topla
    let variants = [];
    let stock = {};
    let prices = {};

    if (hasAddedVariants) {
        // Varyant bilgilerini al
        variantRows.forEach(row => {
            const nameInput = row.querySelector('.variant-name');
            const valuesInput = row.querySelector('.variant-values');
            
            if (nameInput && valuesInput && nameInput.readOnly) {
                // Varyant adını orijinal haliyle kullan (küçük harfe dönüştürme)
                const name = nameInput.value;
                const values = valuesInput.value.split(',').map(v => v.trim()).filter(v => v);
                
                variants.push({
                    name: name,
                    values: values
                });
            }
        });
        
        // Stok ve fiyat bilgilerini al
        document.querySelectorAll('.variant-stock').forEach(input => {
            const key = input.getAttribute('data-variant-key');
            const value = parseInt(input.value) || 0;
            stock[key] = value;
        });
        
        document.querySelectorAll('.variant-price').forEach(input => {
            const key = input.getAttribute('data-variant-key');
            const value = parseFloat(input.value) || 0;
            prices[key] = value;
        });
        // Varyantlı ürünlerde stok mutlaka obje olmalı
        if (typeof stock !== 'object' || Array.isArray(stock)) {
            stock = {};
        }
    } else {
        // Varyantsız ürünlerde stok mutlaka sayı olmalı
        let rawStock = productStock.value;
        // Eğer eski veri yapısından kalan "{default: n}" gibi bir obje varsa düzelt
        if (typeof rawStock === 'object' && rawStock !== null && rawStock.default !== undefined) {
            stock = parseInt(rawStock.default) || 0;
        } else if (typeof rawStock === 'string' && rawStock.trim().startsWith('{')) {
            // JSON string olarak gelmiş olabilir
            try {
                let parsed = JSON.parse(rawStock);
                if (parsed.default !== undefined) {
                    stock = parseInt(parsed.default) || 0;
                } else {
                    stock = parseInt(productStock.value) || 0;
                }
            } catch {
                stock = parseInt(productStock.value) || 0;
            }
        } else {
            stock = parseInt(productStock.value) || 0;
        }
        prices = parseFloat(productPrice.value) || 0;
        productStock.readOnly = false;
    }

    // Ürün verisi
    // --- STOCK NORMALIZATION ---
    // Varyantsız ürünlerde stok sadece sayı olmalı, varyantlıda obje olmalı
    let normalizedStock = stock;
    if (!hasAddedVariants) {
        if (typeof stock === 'object' && stock !== null && stock.default !== undefined) {
            normalizedStock = parseInt(stock.default) || 0;
        } else if (typeof stock === 'object' && stock !== null) {
            // Eğer obje ama default yoksa, ilk anahtarın değerini kullan (geri uyumluluk)
            const keys = Object.keys(stock);
            if (keys.length > 0) {
                normalizedStock = parseInt(stock[keys[0]]) || 0;
            } else {
                normalizedStock = 0;
            }
        } else {
            normalizedStock = parseInt(stock) || 0;
        }
    } else {
        // Varyantlı ürünlerde, stok obje olmalı
        if (typeof stock !== 'object' || Array.isArray(stock) || stock === null) {
            normalizedStock = {};
        }
    }

    const productData = {
        name: name,
        description: description,
        category: selectedCategory,
        price: hasAddedVariants ? prices : new Intl.NumberFormat('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(productPrice.value) + ' TL',
        stock: normalizedStock,
        image: imagePreview.querySelector('img')?.src || 'images/default-product.jpg',
        seo: {
            metaTitle: document.getElementById('metaTitle').value,
            metaDescription: document.getElementById('metaDescription').value,
            metaKeywords: document.getElementById('metaKeywords').value.split(',').map(k => k.trim()),
            seoUrl: document.getElementById('seoUrl').value
        },
        variants: variants
    };

    // Düzenleme veya yeni ekleme
    const editingProductId = this.dataset.editingProductId;
    try {
        if (editingProductId) {
            await updateProductInFirestore(editingProductId, productData);
            delete this.dataset.editingProductId;
        } else {
            await addProductToFirestore(productData);
        }

        // Formu sıfırla
        this.reset();
        imagePreview.innerHTML = '<span class="image-preview-text">Görsel Seçin</span>';
        imagePreview.classList.remove('has-image');

        // Varyant tablolarını temizle
        document.getElementById('variantTableBody').innerHTML = '';
        document.getElementById('variantStockTableBody').innerHTML = '';

        // Ürünleri yeniden yükle ve göster
        products = await getAllProductsFromFirestore();
        displayProducts();
        closeModal('productModal');
        alert('Ürün başarıyla kaydedildi!');
    } catch (error) {
        // Firestore işlemi sırasında hata oluştu
        alert('Bir hata oluştu: ' + error.message);
    }
});

// Modal kapatma fonksiyonu
window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('active');
};

// Firestore'dan gerçek zamanlı ürün güncellemelerini dinle
let productsUnsubscribe = null;

// Gerçek zamanlı ürün dinleyicisini başlat
function startRealtimeProductUpdates() {
    // Önceki dinleyici varsa temizle
    if (productsUnsubscribe) {
        productsUnsubscribe();
    }
    
    // Firestore'dan gerçek zamanlı güncellemeleri dinle
    productsUnsubscribe = firebase.firestore().collection('products')
        .onSnapshot(snapshot => {
            // Değişiklikleri işle
            snapshot.docChanges().forEach(change => {
                const productData = { id: change.doc.id, ...change.doc.data() };
                
                if (change.type === 'added') {
                    // Yeni ürün eklendi
                    // Yeni ürün eklendi
                    // Ürünü products dizisine ekle (eğer zaten yoksa)
                    if (!products.some(p => p.id === productData.id)) {
                        products.push(productData);
                    }
                }
                else if (change.type === 'modified') {
                    // Ürün güncellendi
                    // Ürün güncellendi
                    // Ürünü products dizisinde güncelle
                    const index = products.findIndex(p => p.id === productData.id);
                    if (index !== -1) {
                        products[index] = productData;
                    }
                }
                else if (change.type === 'removed') {
                    // Ürün silindi
                    // Ürün silindi
                    // Ürünü products dizisinden kaldır
                    products = products.filter(p => p.id !== productData.id);
                }
            });
            
            // Tabloyu güncelle
            displayProducts();
        }, error => {
            // Gerçek zamanlı ürün güncellemeleri dinlenirken hata oluştu
        });
}

// Sayfa yüklendiginde ürünleri Firestore'dan çek ve göster
document.addEventListener('DOMContentLoaded', async () => {
    try {
        products = await getAllProductsFromFirestore();
        displayProducts();
        
        // Gerçek zamanlı güncellemeleri başlat
        startRealtimeProductUpdates();
    } catch (error) {
        // Firestore verileri çekilirken hata oluştu
        alert('Veriler yüklenirken bir hata oluştu: ' + error.message);
    }
});

// Sayfa kapanırken dinleyiciyi temizle
window.addEventListener('beforeunload', () => {
    if (productsUnsubscribe) {
        productsUnsubscribe();
    }
});
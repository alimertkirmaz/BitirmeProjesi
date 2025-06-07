// admin-panel.js
// Dinamik dashboard ve sipariş tablosu için temel JS kodu - Firestore tabanlı

// Firebase config - admin-panel.html'de yüklenen Firebase SDK'ları kullanılıyor

// Dashboard verileri
const dashboardStats = {
    totalSales: 0,
    activeUsers: 0,
    newOrders: 0,
    periodSales: 'Son 30 gün',
    periodUsers: 'Bu ay',
    periodOrders: 'Bugün'
};

// Firestore'dan veri çekme fonksiyonları
async function fetchDashboardData() {
    try {
        // Kullanıcıları çek
        const usersSnapshot = await firebase.firestore().collection('users').get();
        const users = [];
        usersSnapshot.forEach(doc => {
            users.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Aktif kullanıcı sayısı
        dashboardStats.activeUsers = users.length;
        
        // Siparişleri çek
        const ordersSnapshot = await firebase.firestore().collection('orders').orderBy('createdAt', 'desc').get();
        const orders = [];
        ordersSnapshot.forEach(doc => {
            orders.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Toplam satış
        dashboardStats.totalSales = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        
        // Bugün verilen sipariş sayısı
        const today = new Date().toLocaleDateString('tr-TR');
        dashboardStats.newOrders = orders.filter(order => order.date === today).length;
        
        // Dashboard kartlarını güncelle
        renderDashboardCards();
        
        // Sipariş tablosunu güncelle
        renderRecentOrders(orders);
        
        return { users, orders };
    } catch (error) {

        return { users: [], orders: [] };
    }
}


// Dashboard kartlarını doldur
function renderDashboardCards() {
    document.querySelector('.dashboard-card:nth-child(1) .card-value').textContent = `${dashboardStats.totalSales.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} TL`;
    document.querySelector('.dashboard-card:nth-child(1) .card-footer').textContent = dashboardStats.periodSales;
    document.querySelector('.dashboard-card:nth-child(2) .card-value').textContent = dashboardStats.activeUsers.toLocaleString('tr-TR');
    document.querySelector('.dashboard-card:nth-child(2) .card-footer').textContent = dashboardStats.periodUsers;
    document.querySelector('.dashboard-card:nth-child(3) .card-value').textContent = dashboardStats.newOrders;
    document.querySelector('.dashboard-card:nth-child(3) .card-footer').textContent = dashboardStats.periodOrders;
}

// Sipariş tablosunu doldur
function renderRecentOrders(orders) {
    const tbody = document.querySelector('.data-table tbody');
    if (!tbody) return;
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Henüz sipariş bulunmuyor</td></tr>';
        return;
    }
    
    tbody.innerHTML = orders.map(order => {
        // Müşteri adı
        let customerName = order.customerName || '';
        if (!customerName && order.userEmail) {
            customerName = order.userEmail.split('@')[0]; // Email'den kullanıcı adını çıkar
        }
        
        // Ürün bilgilerini özetle
        const productSummary = order.items ? order.items.map(item => `${item.name} (${item.quantity})`).join(', ') : '';
        
        // Sipariş durumu için renk sınıfı
        let statusClass = '';
        switch(order.status) {
            case 'Teslim Edildi':
                statusClass = 'status-delivered';
                break;
            case 'Hazırlanıyor':
                statusClass = 'status-preparing';
                break;
            case 'Kargoda':
                statusClass = 'status-shipping';
                break;
            default:
                statusClass = '';
        }
        
        // Fiyat formatı
        const formattedTotal = order.total ? order.total.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' TL' : '';
        
        return `
            <tr data-order-id="${order.id || ''}" data-order-email="${order.userEmail || ''}">
                <td>${order.orderNo || order.id || ''}</td>
                <td>${customerName}</td>
                <td class="product-summary">${productSummary}</td>
                <td>${formattedTotal}</td>
                <td><span class="order-status ${statusClass}">${order.status ? order.status.replace(/u0131/g, 'ı').replace(/u0130/g, 'İ').replace(/u00fc/g, 'ü').replace(/u00dc/g, 'Ü').replace(/u015f/g, 'ş').replace(/u015e/g, 'Ş').replace(/u00f6/g, 'ö').replace(/u00d6/g, 'Ö').replace(/u00e7/g, 'ç').replace(/u00c7/g, 'Ç').replace(/u011f/g, 'ğ').replace(/u011e/g, 'Ğ') : 'Bilinmiyor'}</span></td>
            </tr>
        `;
    }).join('');
}

// Arama fonksiyonu
function setupOrderSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchButton = document.querySelector('.search-bar .btn');
    
    // Arama işlevi
    async function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        try {
            // Tüm siparişleri al
            const { orders } = await fetchDashboardData();
            
            if (!searchTerm) {
                renderRecentOrders(orders);
                return;
            }
            
            // Arama terimlerine göre filtreleme
            const filteredOrders = orders.filter(order => {
                // Sipariş numarası, müşteri adı veya email ile arama
                return (order.orderNo && order.orderNo.toLowerCase().includes(searchTerm)) ||
                       (order.customerName && order.customerName.toLowerCase().includes(searchTerm)) ||
                       (order.userEmail && order.userEmail.toLowerCase().includes(searchTerm)) ||
                       (order.items && order.items.some(item => item.name.toLowerCase().includes(searchTerm)));
            });
            
            renderRecentOrders(filteredOrders);
        } catch (error) {
            console.error('Arama sırasında hata:', error);
        }
    }
    
    // Arama butonuna tıklama olayı
    if (searchButton) searchButton.addEventListener('click', performSearch);
    
    // Enter tuşuna basma olayı
    if (searchInput) searchInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') performSearch();
    });
}

// Sayfa yüklendiinde
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Firebase SDK'nın yüklenmesini bekle
        if (typeof firebase === 'undefined') {
            console.error('Firebase SDK yüklenemedi!');
            return;
        }
        
        // Dashboard verilerini yükle
        await fetchDashboardData();
        
        // Arama fonksiyonunu kur
        setupOrderSearch();
    } catch (error) {
        console.error('Sayfa yüklenirken hata:', error);
    }
});

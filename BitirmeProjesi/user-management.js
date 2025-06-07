// Kullanıcı verilerini Firestore'dan (Firebase) dinamik olarak yükler ve tabloya ekler.
// Bu yapı, <tbody id="usersTableBody"> kısmını Firebase ile tam uyumlu şekilde doldurur.
import { getAllUsersFromFirestore, firebaseSetItem, firebaseRemoveItem, db } from './firebase-config.js';
import { updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let users = [];
// Sayfa yüklendiğinde kullanıcıları Firestore'dan çekip tabloya ekler
(async () => {
    users = await getAllUsersFromFirestore();
    displayUsers(); // Tabloyu güncelle
})();

// DOM elementlerini seçme
const userTable = document.getElementById('usersTableBody');
const searchInput = document.querySelector('.search-input');
const searchButton = document.querySelector('.search-bar .btn');

const editUserForm = document.getElementById('editUserForm');

// Kullanıcıları Firestore'dan gelen verilerle tabloya ekler
// <tbody id="usersTableBody"> kısmı burada doldurulur
function displayUsers(usersToDisplay = users) {
    if (!userTable) return;
    
    userTable.innerHTML = '';
    usersToDisplay
        .filter(user => user.id !== "main")
        .forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${user.id}</td>
                <td>${user.firstName || ''} ${user.lastName || ''}</td>
                <td>${user.email || ''}</td>
                <td>${user.role || 'user'}</td>
                <td>${user.status || 'active'}</td>
                <td>
                    <button class="btn" onclick="openEditUserModal('${user.id}')">Düzenle</button>
                    <button class="btn btn-danger" onclick="deleteUser('${user.id}')">Sil</button>
                </td>
            `;
            userTable.appendChild(row);
        });
}



function openEditUserModal(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('editUserModal').classList.add('active');
    
    // Form alanlarını doldur
    document.getElementById('editFirstName').value = user.firstName;
    document.getElementById('editLastName').value = user.lastName;
    document.getElementById('editEmail').value = user.email;
    document.getElementById('editRole').value = user.role || 'user';
    document.getElementById('editStatus').value = user.status || 'active';
    
    // Form gönderildiğinde kullanmak için user ID'sini sakla
    editUserForm.dataset.userId = userId;
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Kullanıcı silme
async function deleteUser(userId) {
    if (confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
        users = users.filter(user => user.id !== userId);
        await firebaseSetItem('users', 'main', users);
        displayUsers();
    }
}

// Kullanıcı arama
function searchUsers() {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredUsers = users.filter(user => 
        user.firstName.toLowerCase().includes(searchTerm) ||
        user.lastName.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.role.toLowerCase().includes(searchTerm)
    );
    displayUsers(filteredUsers);
}

// Fonksiyonları global scope'a ekle
window.openEditUserModal = openEditUserModal;
window.deleteUser = deleteUser;


// Kullanıcı düzenleme

editUserForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const userId = this.dataset.userId;
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
        const updatedUser = {
            ...users[userIndex],
            firstName: document.getElementById('editFirstName').value,
            lastName: document.getElementById('editLastName').value,
            email: document.getElementById('editEmail').value,
            role: document.getElementById('editRole').value,
            status: document.getElementById('editStatus').value
        };

        // Firestore'daki kullanıcı dokümanını güncelle
        await updateDoc(doc(db, "users", userId), {
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            email: updatedUser.email,
            role: updatedUser.role,
            status: updatedUser.status
        });

        // Kullanıcı listesini tekrar çek ve tabloyu güncelle
        users = await getAllUsersFromFirestore();
        displayUsers();
        closeModal('editUserModal');
        return;
    }

    // Eğer düzenlenen kullanıcı current user ise, onu da güncelle
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.id === userId) {
            // Şifre ve diğer hassas bilgileri koru
            const updatedCurrentUser = {
                ...currentUser,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                role: updatedUser.role,
                status: updatedUser.status
            };
            localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));
            // Eğer kullanıcı pasif yapıldıysa, oturumu kapat
            if (updatedUser.status === 'passive') {
                localStorage.removeItem('currentUser');
                // window.location.href = 'login.html'; // Otomatik çıkış için açabilirsin
            }
        }

        // Session storage'da da current user var mı kontrol et
        const sessionUser = JSON.parse(sessionStorage.getItem('currentUser'));
        if (sessionUser && sessionUser.id === userId) {
            const updatedSessionUser = {
                ...sessionUser,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                role: updatedUser.role,
                status: updatedUser.status
            };
            sessionStorage.setItem('currentUser', JSON.stringify(updatedSessionUser));
    }
});

// Arama işlevselliği için event listeners
searchButton.addEventListener('click', searchUsers);
searchInput.addEventListener('keyup', function(e) {
    if (e.key === 'Enter') {
        searchUsers();
    }
});

// Sayfa yüklendiğinde kullanıcıları göster
document.addEventListener('DOMContentLoaded', () => {
    displayUsers();
});
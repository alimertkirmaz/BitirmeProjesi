// Firebase ile kullanıcı kayıt işlemleri
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { app } from './firebase-config.js';

function handleRegister(event) {
    event.preventDefault();
    const generalErrorDiv = document.getElementById('registerGeneralError');
    if (generalErrorDiv) {
        generalErrorDiv.innerHTML = '';
        generalErrorDiv.classList.remove('show');
    }
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const phone = document.getElementById('phone').value;
    const newsletter = document.getElementById('newsletter').checked;
    let errors = [];
    let isValid = true;
    // --- TÜM VALIDASYONLAR EKSİKSİZ KALSIN ---
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!firstName) {
        document.getElementById('firstNameError')?.classList.add('show');
        errors.push('Ad alanı boş bırakılamaz.');
        isValid = false;
    } else {
        document.getElementById('firstNameError')?.classList.remove('show');
    }
    if (!lastName) {
        document.getElementById('lastNameError')?.classList.add('show');
        errors.push('Soyad alanı boş bırakılamaz.');
        isValid = false;
    } else {
        document.getElementById('lastNameError')?.classList.remove('show');
    }
    if (!email) {
        document.getElementById('emailError')?.classList.add('show');
        errors.push('E-posta alanı boş bırakılamaz.');
        isValid = false;
    } else if (!emailRegex.test(email)) {
        document.getElementById('emailFormatError')?.classList.add('show');
        errors.push('Geçerli bir e-posta adresi giriniz.');
        isValid = false;
    } else {
        document.getElementById('emailFormatError')?.classList.remove('show');
        document.getElementById('emailError')?.classList.remove('show');
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
        document.getElementById('passwordRequirementError')?.classList.add('show');
        errors.push('Şifre en az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam içermelidir.');
        isValid = false;
    } else {
        document.getElementById('passwordRequirementError')?.classList.remove('show');
    }
    if (password !== confirmPassword) {
        document.getElementById('passwordError')?.classList.add('show');
        errors.push('Şifreler eşleşmiyor.');
        isValid = false;
    } else {
        document.getElementById('passwordError')?.classList.remove('show');
    }
    const phoneRegex = /^\d{3}\s\d{3}\s\d{2}\s\d{2}$/;
    if (!phoneRegex.test(phone)) {
        document.getElementById('phoneError')?.classList.add('show');
        errors.push('Telefon numarası doğru formatta olmalı. (Örn: 555 123 45 67)');
        isValid = false;
    } else if (!phone.startsWith('5')) {
        document.getElementById('phoneError')?.classList.add('show');
        isValid = false;
    } else {
        document.getElementById('phoneError')?.classList.remove('show');
    }
    // --- VALIDASYON SONU ---
    if (!isValid) {
        if (generalErrorDiv) {
            generalErrorDiv.innerHTML = '<ul style="margin:0; padding:0 1em; text-align:left;">' + errors.map(e => '<li>' + e + '</li>').join('') + '</ul>';
            generalErrorDiv.classList.add('show');
        }
        return false;
    } else if (generalErrorDiv) {
        generalErrorDiv.innerHTML = '';
        generalErrorDiv.classList.remove('show');
    }
    // --- SADECE BAŞARILI VALIDASYON SONRASINDA FIREBASE KAYIT ---
    const auth = getAuth(app);
    const db = getFirestore(app);
    createUserWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
            const user = userCredential.user;
            const userDetails = {
                id: user.uid,
                firstName,
                lastName,
                email,
                phone,
                newsletter,
                role: 'user',
                status: 'active',
                registrationDate: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', user.uid), userDetails);
            window.location.href = 'customer-panel.html';
        })
        .catch((error) => {
            if (generalErrorDiv) {
                generalErrorDiv.innerHTML = 'Kayıt sırasında bir hata oluştu: ' + error.message;
                generalErrorDiv.classList.add('show');
            }
        });
    return false;
}

document.addEventListener('DOMContentLoaded', function() {
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, ''); // Sadece rakamları al
            value = value.substring(0, 10);
            let formattedValue = '';
            for (let i = 0; i < value.length; i++) {
                if (i === 3 || i === 6 || i === 8) {
                    formattedValue += ' ';
                }
                formattedValue += value[i];
            }
            e.target.value = formattedValue;
        });
    }
    // Form submit eventini de burada güvenli şekilde bağla
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

// Firebase Authentication ile login işlemi
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { app } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const emailErrorDiv = document.getElementById('emailError');
        const passwordErrorDiv = document.getElementById('passwordError');
        if (emailErrorDiv) emailErrorDiv.classList.remove('show');
        if (passwordErrorDiv) passwordErrorDiv.classList.remove('show');
        const auth = getAuth(app);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            window.location.href = 'customer-panel.html';
        } catch (error) {
            if (error.code === 'auth/user-disabled') {
                if (passwordErrorDiv) {
                    passwordErrorDiv.textContent = 'Hesabınız devre dışı bırakılmıştır. Lütfen yöneticiyle iletişime geçin.';
                    passwordErrorDiv.classList.add('show');
                } else {
                    alert('Hesabınız devre dışı bırakılmıştır. Lütfen yöneticiyle iletişime geçin.');
                }
            } else {
                if (passwordErrorDiv) {
                    passwordErrorDiv.textContent = 'E-posta ya da şifre hatalı!';
                    passwordErrorDiv.classList.add('show');
                } else {
                    alert('E-posta ya da şifre hatalı!');
                }
            }
        }
    });
});

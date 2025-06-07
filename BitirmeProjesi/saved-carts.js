// saved-carts.js
// Kayıtlı Sepetlerim bölümünü doldurur ve "Sepetime Ekle" işlevini yönetir.
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app } from "./firebase-config.js";

// Sepetleri yükle ve listele
export async function loadSavedCarts() {
    const auth = getAuth(app);
    const db = getFirestore(app);
    const user = auth.currentUser;
    const listDiv = document.getElementById("saved-carts-list");
    const emptyDiv = document.getElementById("saved-carts-empty");
    listDiv.innerHTML = "";
    if (!user) {
        emptyDiv.style.display = "block";
        emptyDiv.innerHTML = `<div class="notification-item" style="text-align: center; padding: 2rem;">
            <i class="fa-solid fa-cart-shopping" style="font-size: 2rem; color: #c9a227; margin-bottom: 1rem; display: block;"></i>
            <div style="font-size:1.15rem;font-weight:600;color:#c9a227;margin-bottom:0.5rem;">Giriş yapmalısınız</div>
            <div style="font-size: 0.9rem; color: #999; margin-top: 0.5rem;">Kayıtlı sepetlerinizi görmek için giriş yapın.</div>
        </div>`;
        return;
    }
    const savedDoc = await getDoc(doc(db, "savedCarts", user.uid));
    const cartsArr = savedDoc.exists() ? (savedDoc.data().carts || []) : [];
    if (cartsArr.length === 0) {
        emptyDiv.style.display = "block";
        emptyDiv.innerHTML = `<div class="notification-item" style="text-align: center; padding: 2rem;">
            <i class="fa-solid fa-cart-shopping" style="font-size: 2rem; color: #c9a227; margin-bottom: 1rem; display: block;"></i>
            <div style="font-size:1.15rem;font-weight:600;color:#c9a227;margin-bottom:0.5rem;">Kayıtlı sepetiniz bulunmamaktadır.</div>
            <div style="font-size: 0.9rem; color: #999; margin-top: 0.5rem;">Daha sonra kolayca ulaşmak için sepetinizi kaydedebilirsiniz.</div>
        </div>`;
        return;
    }
    emptyDiv.style.display = "none";
    cartsArr.slice().reverse().forEach((saved, idx) => {
        const cartDiv = document.createElement("div");
        cartDiv.className = "saved-cart-card order-card";
        cartDiv.style = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem;";
        const info = document.createElement("div");
        info.innerHTML = `<div style="font-size:1.13rem;font-weight:600;color:#c9a227;margin-bottom:0.25em;">${saved.name || "Sepet"}</div><div style='font-size:0.98em;color:#bbb;'>${formatDateTR(saved.savedAt)}</div>`;
        // Butonlar için kapsayıcı
        const btnGroup = document.createElement("div");
        btnGroup.style = "display:flex;gap:10px;align-items:center;";
        const btn = document.createElement("button");
        btn.className = "btn btn-primary";
        btn.innerHTML = 'Sepetime Ekle';
        btn.onclick = async function() {
            await restoreSavedCartToActiveCart(saved.cart);
        };
        // Get Sepetime Ekle button style for sizing
        const sepeteBtnStyle = "padding: 0.8rem 1.5rem; font-size: 1rem; border-radius: 4px;";
        // Sil butonu
        const delBtn = document.createElement("button");
        delBtn.className = "btn btn-danger";
        delBtn.style = "background: #dc3545; color: #fff; border: 2px solid #dc3545; padding: 0.62rem 1.22rem; font-size: 0.97rem; border-radius: 4px; cursor: pointer; transition: all 0.2s;";
        delBtn.innerHTML = 'Sil';
        delBtn.onclick = async function() {
            window.showCustomPopup = window.showCustomPopup || function(message, options = {}) {
    return new Promise(resolve => {
        // Eski popup'ı kaldır
        let old = document.getElementById('custom-popup');
        if (old) old.remove();
        // Arka plan kaydırmasını engelle
        document.body.style.overflow = 'hidden';
        // Popup wrapper oluştur
        const popup = document.createElement('div');
        popup.id = 'custom-popup';
        popup.className = 'popup';
        popup.style.display = 'block';
        popup.innerHTML = `
            <div class="popup-content">
                <div class="popup-header">
                    <h3><b>${options.confirm ? 'Onay' : 'Bilgi'}</b></h3>
                    <span class="close-popup">&times;</span>
                </div>
                <div class="popup-body">
                    <p style="margin:0;font-size:1.08rem;color:#fff;">${message}</p>
                </div>
                <div class="popup-footer">
                    ${options.confirm
                        ? `<button id="popup-no" class="popup-btn popup-btn-secondary" style="background:#dc3545;color:#fff;">Hayır</button>
                        <button id="popup-yes" class="popup-btn">Evet</button>`
                        : `<button id="popup-ok" class="popup-btn">Tamam</button>`}
                </div>
            </div>
        `;
        document.body.appendChild(popup);
        // Kapatma işlemleri
        const closePopup = () => {
            popup.remove();
            document.body.style.overflow = '';
        };
        popup.querySelector('.close-popup').onclick = () => { closePopup(); resolve(false); };
        if (options.confirm) {
            document.getElementById('popup-yes').onclick = () => { closePopup(); resolve(true); };
            document.getElementById('popup-no').onclick = () => { closePopup(); resolve(false); };
        } else {
            document.getElementById('popup-ok').onclick = () => { closePopup(); resolve(true); };
        }
        // ESC ile kapatma
        document.onkeydown = function(e) {
            if (e.key === 'Escape') {
                closePopup();
                resolve(false);
                document.onkeydown = null;
            }
        };
    });
};
// Ensure popup CSS is injected only once
if (!document.getElementById('aristocart-popup-style')) {
    const style = document.createElement('style');
    style.id = 'aristocart-popup-style';
    style.textContent = `
    .popup { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); overflow: auto; animation: fadeIn 0.3s; }
    .popup-content { background-color: #1A1A1A; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 0; width: 380px; max-width: 90%; border-radius: 10px; box-shadow: 0 0 20px rgba(201,162,39,0.4); animation: fadeAndScale 0.3s; border: 1px solid #c9a227; }
    .popup-header { padding: 15px 20px; background-color: #000000; border-bottom: 1px solid #c9a227; border-radius: 10px 10px 0 0; display: flex; justify-content: space-between; align-items: center; }
    .popup-header h3 { margin: 0; font-size: 18px; color: #c9a227; font-weight: 500; letter-spacing: 0.5px; font-family: 'Playfair Display', serif; }
    .close-popup { color: #c9a227; font-size: 22px; font-weight: bold; cursor: pointer; transition: color 0.2s; line-height: 1; }
    .close-popup:hover { color: #B08C1E; }
    .popup-body { padding: 20px; color: #ffffff; font-size: 14px; line-height: 1.4; text-align: center; }
    .popup-footer { padding: 15px 20px; background-color: #000000; border-top: 1px solid #c9a227; border-radius: 0 0 10px 10px; display: flex; justify-content: center; gap: 10px; }
    .popup-btn { padding: 8px 18px; border: none; border-radius: 4px; background-color: #c9a227; color: #000000; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 5px rgba(201,162,39,0.3); }
    .popup-btn:hover { background-color: #B08C1E; box-shadow: 0 3px 8px rgba(201,162,39,0.4); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeAndScale { from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
    `;
    document.head.appendChild(style);
}

if (!(await window.showCustomPopup('Bu kayıtlı sepeti silmek istediğinize <br>emin misiniz?', {confirm:true}))) return;
            await deleteSavedCart(idx, cartsArr.length);
        };
        btnGroup.appendChild(btn);
        btnGroup.appendChild(delBtn);
        cartDiv.appendChild(info);
        cartDiv.appendChild(btnGroup);
        listDiv.appendChild(cartDiv);
    });
}

// Silme fonksiyonu
async function deleteSavedCart(reverseIdx, total) {
    const auth = getAuth(app);
    const db = getFirestore(app);
    const user = auth.currentUser;
    if (!user) return;
    const savedRef = doc(db, 'savedCarts', user.uid);
    const savedDoc = await getDoc(savedRef);
    if (!savedDoc.exists()) return;
    let cartsArr = savedDoc.data().carts || [];
    // reverse ile geldiği için gerçek indexi bul
    const idx = cartsArr.length - 1 - reverseIdx;
    cartsArr.splice(idx, 1);
    await setDoc(savedRef, { carts: cartsArr }, { merge: true });
    loadSavedCarts();
}

function formatDateTR(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("tr-TR");
}

// Kaydedilmiş sepeti aktif sepete ekle (varsa birleştir)
async function restoreSavedCartToActiveCart(savedCartData) {
    const auth = getAuth(app);
    const db = getFirestore(app);
    const user = auth.currentUser;
    if (!user) {
        await window.showCustomPopup("Giriş yapmalısınız.");
        return;
    }
    const cartRef = doc(db, "carts", user.uid);
    const cartDoc = await getDoc(cartRef);
    let currentCart = cartDoc.exists() ? cartDoc.data() : { items: [] };
    // Sepetleri birleştir (aynı ürün ve varyant varsa miktarları topla)
    let mergedItems = mergeCartItems(currentCart.items || [], savedCartData.items || []);
    await setDoc(cartRef, { ...currentCart, items: mergedItems }, { merge: true });
    window.showCustomPopup = window.showCustomPopup || function(message, options = {}) {
    return new Promise(resolve => {
        let old = document.getElementById('custom-popup');
        if (old) old.remove();
        const popup = document.createElement('div');
        popup.id = 'custom-popup';
        popup.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.35)';
        popup.innerHTML = `<div style=\"background:#232323;padding:2.2rem 2rem 1.4rem 2rem;border-radius:14px;box-shadow:0 8px 32px #0005;min-width:320px;max-width:90vw;text-align:center;border:2px solid #c9a227;\">
            <div style='font-size:1.08rem;color:#fff;margin-bottom:1.2rem;'>${message}</div>
            <div style='display:flex;gap:18px;justify-content:center;'>
                <button id='popup-ok' style='background:#c9a227;color:#232323;padding:0.5rem 1.6rem;border:none;border-radius:6px;font-size:1rem;cursor:pointer;'>Tamam</button>
            </div>
        </div>`;
        document.body.appendChild(popup);
        document.getElementById('popup-ok').onclick = () => { popup.remove(); resolve(true); };
    });
};
window.showCustomPopup('Kayıtlı sepet başarıyla eklendi!');
}

function mergeCartItems(cart1, cart2) {
    const merged = [...cart1];
    for (const item of cart2) {
        const idx = merged.findIndex(x => x.productId === item.productId && JSON.stringify(x.selectedVariants) === JSON.stringify(item.selectedVariants));
        if (idx > -1) {
            merged[idx].quantity += item.quantity;
        } else {
            merged.push({ ...item });
        }
    }
    return merged;
}

// Sayfa yüklendiğinde ve sekme seçildiğinde çalıştır
export function setupSavedCartsSection() {
    // Her sekme tıklamasında yükle
    document.querySelectorAll('.nav-link[data-section="saved-carts"]').forEach(link => {
        link.addEventListener('click', () => {
            setTimeout(loadSavedCarts, 100); // UI geçişi sonrası yükle
        });
    });
    // Eğer hash ile gelindiyse otomatik yükle
    if (window.location.hash === "#saved-carts") {
        setTimeout(loadSavedCarts, 100);
    }
    // Ayrıca sayfa yüklendiğinde de ilk yüklemeyi yap
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.hash === "#saved-carts") {
            setTimeout(loadSavedCarts, 100);
        }
    });
}

// Oturum değişikliğinde otomatik yükleme
onAuthStateChanged(getAuth(app), user => {
    if (document.getElementById('saved-carts').style.display !== 'none') {
        loadSavedCarts();
    }
});

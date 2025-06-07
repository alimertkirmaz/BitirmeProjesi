// Firebase App ve Firestore'u projeye ekle
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase yapılandırmanız
const firebaseConfig = {
  apiKey: "AIzaSyCYRT1tz8QMog2Vd9oC-rA3Fne6AADKOQ0",
  authDomain: "bitirmeprojesi-de1e8.firebaseapp.com",
  projectId: "bitirmeprojesi-de1e8",
  storageBucket: "bitirmeprojesi-de1e8.firebasestorage.app",
  messagingSenderId: "578825018900",
  appId: "1:578825018900:web:b2fb992ecb7a7bc301d101"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firestore ile localStorage benzeri işlemler için yardımcı fonksiyonlar
// collectionName: 'users', 'cart', 'products' vb. olabilir
// UYARI: Kullanıcı kaydında bu fonksiyonu kullanmayın, doğrudan setDoc ile düz obje kaydedin.
export async function firebaseSetItem(collectionName, key, value) {
  await setDoc(doc(db, collectionName, key), { value });
}

export async function firebaseGetItem(collectionName, key) {
  const ref = doc(db, collectionName, key);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data().value;
  }
  return null;
}

export async function firebaseRemoveItem(collectionName, key) {
  await deleteDoc(doc(db, collectionName, key));
}

export { db, app };

// Firestore'daki users koleksiyonundaki tüm kullanıcıları dizi olarak döndürür
import { collection, getDocs, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
export async function getAllUsersFromFirestore() {
    const querySnapshot = await getDocs(collection(db, "users"));
    const users = [];
    querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
    });
    return users;
}

// Firestore'daki products koleksiyonundaki tüm ürünleri dizi olarak döndürür
export async function getAllProductsFromFirestore() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });
        console.log('Firestore\'dan çekilen ürünler:', products);
        return products;
    } catch (error) {
        console.error('Firestore\'dan ürünler çekilirken hata:', error);
        return [];
    }
}

// Firestore'a ürün ekle
export async function addProductToFirestore(product) {
    await addDoc(collection(db, "products"), product);
}

// Firestore'da ürün güncelle
export async function updateProductInFirestore(productId, updatedData) {
    await updateDoc(doc(db, "products", productId), updatedData);
}

// Firestore'dan ürün sil
export async function deleteProductFromFirestore(productId) {
    await deleteDoc(doc(db, "products", productId));
}


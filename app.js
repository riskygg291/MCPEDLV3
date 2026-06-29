import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getDatabase, ref, set, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// Your Firebase configuration block
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase App services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let customAvatar = null;

// --- 1. 3-Second Force Loader Logic ---
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const preloader = document.getElementById('preloader');
        preloader.style.opacity = '0';
        setTimeout(() => preloader.style.display = 'none', 500);
    }, 3000); // 3000ms = 3 Seconds
});

// --- 2. Authentication Flow (Google Sign-In) ---
document.getElementById('login-btn').addEventListener('click', () => signInWithPopup(auth, provider));
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    const loginBtn = document.getElementById('login-btn');
    const userProfile = document.getElementById('user-profile');
    const uploadSection = document.getElementById('upload-section');
    
    if (user) {
        currentUser = user;
        loginBtn.classList.add('hidden');
        userProfile.classList.remove('hidden');
        uploadSection.classList.remove('hidden');
        
        // Grab local storage user picture backup if it exists
        const savedAvatar = localStorage.getItem(`avatar_${user.uid}`);
        document.getElementById('user-avatar').src = savedAvatar || user.photoURL;
    } else {
        currentUser = null;
        loginBtn.classList.remove('hidden');
        userProfile.classList.add('hidden');
        uploadSection.classList.add('hidden');
    }
});

// --- 3. Profile Actions ---
window.toggleProfileModal = () => {
    document.getElementById('profile-modal').classList.toggle('hidden');
};

window.updateProfilePicture = () => {
    const url = document.getElementById('custom-avatar-url').value;
    if (url && currentUser) {
        localStorage.setItem(`avatar_${currentUser.uid}`, url);
        document.getElementById('user-avatar').src = url;
        toggleProfileModal();
        // Refresh display to show edited profile across existing listings
        location.reload();
    }
};

// --- 4. Database Addon Stream (Visible to Everyone) ---
const addonForm = document.getElementById('addon-form');
addonForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const name = document.getElementById('addon-name').value;
    const link = document.getElementById('addon-link').value;
    const userAvatarUrl = localStorage.getItem(`avatar_${currentUser.uid}`) || currentUser.photoURL;

    const addonsRef = ref(db, 'addons');
    const newAddonRef = push(addonsRef);
    
    set(newAddonRef, {
        uid: currentUser.uid,
        author: currentUser.displayName,
        avatar: userAvatarUrl,
        addonName: name,
        downloadLink: link,
        timestamp: Date.now()
    }).then(() => {
        addonForm.reset();
    });
});

// Sync data seamlessly across open clients/refreshes
const addonsDbRef = ref(db, 'addons');
onValue(addonsDbRef, (snapshot) => {
    const grid = document.getElementById('addons-grid');
    grid.innerHTML = "";
    const data = snapshot.val();
    
    if (data) {
        Object.keys(data).forEach((key) => {
            const item = data[key];
            const isOwner = currentUser && currentUser.uid === item.uid;
            
            const card = document.createElement('div');
            card.className = 'card addon-card';
            card.innerHTML = `
                <div>
                    <div class="author-info">
                        <img src="${item.avatar}" class="author-avatar" alt="creator">
                        <span>By ${item.author}</span>
                    </div>
                    <h3>${item.addonName}</h3>
                </div>
                <div style="margin-top:20px; display:flex; gap:10px;">
                    <a href="${item.downloadLink}" target="_blank" class="btn btn-primary" style="flex:1; justify-content:center;">
                        <i class="fas fa-download"></i> Get Addon
                    </a>
                    ${isOwner ? `<button onclick="deleteAddon('${key}')" class="btn btn-danger"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            `;
            grid.appendChild(card);
        });
    }
});

// Delete target item explicitly checking against active session keys
window.deleteAddon = (key) => {
    if (confirm("Are you sure you want to remove this addon?")) {
        remove(ref(db, `addons/${key}`));
    }
};

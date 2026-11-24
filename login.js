import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { auth, db, googleProvider } from "./firebase-config.js";
import { normalizePhone, showMsg, hideMsg } from "./utils.js";

let currentUser = null;

document.querySelectorAll("[data-gate-tab]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-gate-tab]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll("#gateAuthForms .portal-panel").forEach(p => p.classList.remove("active"));
    document.getElementById(`gate-tab-${btn.dataset.gateTab}`).classList.add("active");
    hideMsg("gateLoginError");
    hideMsg("gateLoginMsg");
    hideMsg("gateRegError");
  });
});

document.getElementById("googleSignInBtn").addEventListener("click", async () => {
  hideMsg("gateLoginError");
  hideMsg("gateRegError");
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    if (err.code === "auth/popup-blocked" || err.code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, googleProvider);
    } else if (err.code !== "auth/popup-closed-by-user") {
      showMsg("gateLoginError", err.message);
    }
  }
});

getRedirectResult(auth).catch(err => {
  if (err) showMsg("gateLoginError", err.message);
});

document.getElementById("gateLoginForm").addEventListener("submit", async e => {
  e.preventDefault();
  hideMsg("gateLoginError");
  hideMsg("gateLoginMsg");
  const email = document.getElementById("gateLoginEmail").value.trim();
  const pass = document.getElementById("gateLoginPass").value;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch {
    showMsg("gateLoginError", "Invalid email or password.");
  }
});

document.getElementById("forgotPassBtn").addEventListener("click", async () => {
  hideMsg("gateLoginError");
  hideMsg("gateLoginMsg");
  const email = document.getElementById("gateLoginEmail").value.trim();
  if (!email) {
    showMsg("gateLoginError", "Type your email address above first, then click Forgot password.");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showMsg("gateLoginMsg", "Password reset link sent to your email!");
  } catch (err) {
    showMsg("gateLoginError", err.message);
  }
});

document.getElementById("gateRegisterForm").addEventListener("submit", async e => {
  e.preventDefault();
  hideMsg("gateRegError");
  const name = document.getElementById("gateRegName").value.trim();
  const phone = document.getElementById("gateRegPhone").value.trim();
  const email = document.getElementById("gateRegEmail").value.trim();
  const pass = document.getElementById("gateRegPass").value;

  if (normalizePhone(phone).length < 9) {
    showMsg("gateRegError", "Please enter a valid phone / WhatsApp number.");
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      name,
      email,
      phone,
      phoneNorm: normalizePhone(phone),
      loyaltyCount: 0,
      rewardsRedeemed: 0,
      createdAt: serverTimestamp()
    });
    window.location.replace("index.html");
  } catch (err) {
    showMsg("gateRegError", err.message);
  }
});

document.getElementById("completeProfileForm").addEventListener("submit", async e => {
  e.preventDefault();
  hideMsg("completeProfileError");
  if (!currentUser) return;

  const name = document.getElementById("completeName").value.trim();
  const phone = document.getElementById("completePhone").value.trim();
  if (normalizePhone(phone).length < 9) {
    showMsg("completeProfileError", "Please enter a valid phone / WhatsApp number.");
    return;
  }

  try {
    const ref = doc(db, "users", currentUser.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { name, phone, phoneNorm: normalizePhone(phone) });
    } else {
      await setDoc(ref, {
        uid: currentUser.uid,
        name,
        email: currentUser.email || "",
        phone,
        phoneNorm: normalizePhone(phone),
        loyaltyCount: 0,
        rewardsRedeemed: 0,
        createdAt: serverTimestamp()
      });
    }
    window.location.replace("index.html");
  } catch (err) {
    showMsg("completeProfileError", err.message);
  }
});

document.getElementById("cancelCompleteBtn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async user => {
  document.getElementById("loadingScreen").style.display = "none";

  if (!user) {
    currentUser = null;
    document.getElementById("loginWrap").style.display = "flex";
    document.getElementById("gateAuthForms").style.display = "block";
    document.getElementById("completeProfileBox").style.display = "none";
    return;
  }

  currentUser = user;
  const [userSnap, adminSnap] = await Promise.all([
    getDoc(doc(db, "users", user.uid)),
    getDoc(doc(db, "admins", user.uid))
  ]);

  if (adminSnap.exists() || (userSnap.exists() && userSnap.data().phone)) {
    window.location.replace("index.html");
    return;
  }

  document.getElementById("loginWrap").style.display = "flex";
  document.getElementById("gateAuthForms").style.display = "none";
  document.getElementById("completeProfileBox").style.display = "block";
  document.getElementById("completeName").value = (userSnap.exists() && userSnap.data().name) || user.displayName || "";
});
  
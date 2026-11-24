import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import {
  auth,
  db,
  googleProvider,
  GALLERY_SERVICES,
  DEFAULT_SITE_CONFIG,
  DEFAULT_SCHEDULE_CONFIG,
  DEFAULT_SERVICES
} from "./firebase-config.js";
import {
  escapeHTML,
  formatYMD,
  parseYMD,
  formatShortDate,
  formatPrettyDate,
  showMsg,
  hideMsg,
  buildLoyaltyCardHTML
} from "./utils.js";

let bookings = [];
let clients = [];
let gallery = [];
let scheduleCfg = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE_CONFIG));
let servicesData = JSON.parse(JSON.stringify(DEFAULT_SERVICES));
let siteCfg = { ...DEFAULT_SITE_CONFIG };
let selectedClientId = null;
let unsubs = [];

function clearListeners() {
  unsubs.forEach(u => { try { u(); } catch {} });
  unsubs = [];
}

document.getElementById("adminGoogleBtn").addEventListener("click", async () => {
  hideMsg("adminLoginErr");
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    if (err.code === "auth/popup-blocked") {
      await signInWithRedirect(auth, googleProvider);
    } else if (err.code !== "auth/popup-closed-by-user") {
      showMsg("adminLoginErr", err.message);
    }
  }
});

getRedirectResult(auth).catch(err => {
  if (err) showMsg("adminLoginErr", err.message);
});

document.getElementById("adminEmailForm").addEventListener("submit", async e => {
  e.preventDefault();
  hideMsg("adminLoginErr");
  try {
    await signInWithEmailAndPassword(
      auth,
      document.getElementById("adminEmail").value.trim(),
      document.getElementById("adminPass").value
    );
  } catch {
    showMsg("adminLoginErr", "Invalid admin email or password.");
  }
});

async function handleAdminSignOut() {
  await signOut(auth);
  window.location.replace("login.html");
}

document.getElementById("adminLogoutBtn").addEventListener("click", handleAdminSignOut);
document.getElementById("deniedLogoutBtn").addEventListener("click", handleAdminSignOut);
document.getElementById("copyUidBtn").addEventListener("click", () => {
  navigator.clipboard.writeText(document.getElementById("deniedUid").textContent);
  document.getElementById("copyUidBtn").textContent = "Copied!";
});

onAuthStateChanged(auth, async user => {
  clearListeners();
  document.getElementById("adminLoading").style.display = "none";

  if (!user) {
    document.getElementById("adminAppWrap").style.display = "none";
    document.getElementById("adminDeniedWrap").style.display = "none";
    document.getElementById("adminLoginWrap").style.display = "flex";
    return;
  }

  const adminSnap = await getDoc(doc(db, "admins", user.uid));
  if (!adminSnap.exists()) {
    document.getElementById("adminLoginWrap").style.display = "none";
    document.getElementById("adminAppWrap").style.display = "none";
    document.getElementById("adminDeniedWrap").style.display = "flex";
    document.getElementById("deniedEmail").textContent = user.email || user.uid;
    document.getElementById("deniedUid").textContent = user.uid;
    return;
  }

  document.getElementById("adminLoginWrap").style.display = "none";
  document.getElementById("adminDeniedWrap").style.display = "none";
  document.getElementById("adminAppWrap").style.display = "block";

  await ensureSeededDefaults();
  initAdminUI();
});

async function ensureSeededDefaults() {
  const mainRef = doc(db, "siteConfig", "main");
  if (!(await getDoc(mainRef)).exists()) await setDoc(mainRef, DEFAULT_SITE_CONFIG);

  const svcRef = doc(db, "siteConfig", "services");
  if (!(await getDoc(svcRef)).exists()) await setDoc(svcRef, { items: DEFAULT_SERVICES });

  const schedRef = doc(db, "siteConfig", "schedule");
  if (!(await getDoc(schedRef)).exists()) await setDoc(schedRef, DEFAULT_SCHEDULE_CONFIG);
}

function initAdminUI() {
  const picker = document.getElementById("adminDatePicker");
  if (!picker.value) picker.value = formatYMD(new Date());

  document.getElementById("galServiceSelect").innerHTML = GALLERY_SERVICES
    .map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join("");
  document.getElementById("galAdminFilter").innerHTML = `<option value="All">All Services</option>` +
    GALLERY_SERVICES.map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join("");

  clearListeners();

  unsubs.push(onSnapshot(collection(db, "bookings"), snap => {
    bookings = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
    renderBookings();
    renderClients();
    if (selectedClientId) renderClientDetail();
  }));

  unsubs.push(onSnapshot(collection(db, "users"), snap => {
    clients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderClients();
    renderBookings();
    if (selectedClientId) renderClientDetail();
  }));

  unsubs.push(onSnapshot(query(collection(db, "gallery"), orderBy("createdAt", "desc")), snap => {
    gallery = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAdminGallery();
  }));

  unsubs.push(onSnapshot(doc(db, "siteConfig", "schedule"), snap => {
    scheduleCfg = snap.exists() ? { ...DEFAULT_SCHEDULE_CONFIG, ...snap.data() } : JSON.parse(JSON.stringify(DEFAULT_SCHEDULE_CONFIG));
    renderDateEditor();
    renderDefaultSlots();
  }));

  unsubs.push(onSnapshot(doc(db, "siteConfig", "services"), snap => {
    servicesData = (snap.exists() && Array.isArray(snap.data().items)) ? snap.data().items : JSON.parse(JSON.stringify(DEFAULT_SERVICES));
    renderServicesEditor();
  }));

  unsubs.push(onSnapshot(doc(db, "siteConfig", "main"), snap => {
    siteCfg = snap.exists() ? { ...DEFAULT_SITE_CONFIG, ...snap.data() } : { ...DEFAULT_SITE_CONFIG };
    fillSiteConfigForm();
  }));
}

document.querySelectorAll("#adminTabs .tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#adminTabs .tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll("main .panel").forEach(p => p.classList.remove("active"));
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

document.getElementById("bookingStatusFilter").addEventListener("change", renderBookings);

function renderBookings() {
  const filter = document.getElementById("bookingStatusFilter").value;
  document.getElementById("bookingCountBadge").textContent = bookings.filter(b => b.status === "Confirmed").length;

  const filtered = bookings.filter(b => filter === "all" || b.status === filter);
  const container = document.getElementById("adminBookingsList");
  if (filtered.length === 0) {
    container.innerHTML = `<p class="muted-text">No bookings match this filter.</p>`;
    return;
  }

  container.innerHTML = filtered.map(b => {
    const client = clients.find(c => c.id === b.uid);
    return `
      <div class="item-row">
        <div>
          <strong>${escapeHTML(b.name)}</strong> &bull; ${escapeHTML(b.phone)}
          ${client ? `<small style="color:var(--gold-dark); font-weight:700;"> (Loyalty: ${client.loyaltyCount || 0}/10)</small>` : ""}
          <br />
          <span class="muted-text small-text">
            ${escapeHTML(b.service)} &mdash; <strong>${formatPrettyDate(b.date)}</strong> at <strong>${escapeHTML(b.time)}</strong>
          </span>
          ${b.notes ? `<div class="muted-text small-text">Notes: ${escapeHTML(b.notes)}</div>` : ""}
        </div>
        <div class="item-actions">
          <span class="status-tag ${b.status === "Cancelled" ? "cancelled" : b.status === "Completed" ? "completed" : ""}">
            ${escapeHTML(b.status)}
          </span>
          ${b.status === "Confirmed"
            ? `<button type="button" class="btn btn-gold btn-sm js-complete-bk" data-id="${b.id}">Complete (+1 Tick)</button>
               <button type="button" class="btn btn-outline btn-sm js-cancel-bk" data-id="${b.id}">Cancel</button>`
            : `<button type="button" class="btn btn-danger btn-sm js-del-bk" data-id="${b.id}">Delete</button>`}
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".js-complete-bk").forEach(btn => {
    btn.addEventListener("click", async () => {
      const bk = bookings.find(x => x.id === btn.dataset.id);
      if (!bk) return;
      await updateDoc(doc(db, "bookings", bk.id), { status: "Completed" });
      const client = clients.find(c => c.id === bk.uid);
      if (client) {
        await updateDoc(doc(db, "users", client.id), { loyaltyCount: Math.min(10, (Number(client.loyaltyCount) || 0) + 1) });
      }
    });
  });

  container.querySelectorAll(".js-cancel-bk").forEach(btn => {
    btn.addEventListener("click", async () => {
      const bk = bookings.find(x => x.id === btn.dataset.id);
      if (!bk) return;
      await updateDoc(doc(db, "bookings", bk.id), { status: "Cancelled" });
      if (bk.slotId) await deleteDoc(doc(db, "bookedSlots", bk.slotId)).catch(() => {});
    });
  });

  container.querySelectorAll(".js-del-bk").forEach(btn => {
    btn.addEventListener("click", async () => {
      const bk = bookings.find(x => x.id === btn.dataset.id);
      if (!bk) return;
      await deleteDoc(doc(db, "bookings", bk.id));
      if (bk.slotId && bk.status !== "Cancelled") await deleteDoc(doc(db, "bookedSlots", bk.slotId)).catch(() => {});
    });
  });
}

document.getElementById("clientSearchInput").addEventListener("input", renderClients);
document.getElementById("backToClientsBtn").addEventListener("click", () => {
  selectedClientId = null;
  document.getElementById("clientDetailCard").style.display = "none";
  document.getElementById("clientsListCard").style.display = "block";
});

function renderClients() {
  const q = document.getElementById("clientSearchInput").value.trim().toLowerCase();
  const filtered = clients.filter(c =>
    (c.name || "").toLowerCase().includes(q) ||
    (c.phone || "").toLowerCase().includes(q) ||
    (c.email || "").toLowerCase().includes(q)
  );

  const container = document.getElementById("adminClientsList");
  if (filtered.length === 0) {
    container.innerHTML = `<p class="muted-text">No registered clients match your search yet.</p>`;
    return;
  }

  container.innerHTML = filtered.map(c => {
    const bCount = bookings.filter(b => b.uid === c.id).length;
    const lCount = Number(c.loyaltyCount) || 0;
    return `
      <div class="item-row">
        <div>
          <strong>${escapeHTML(c.name)}</strong> &bull; ${escapeHTML(c.phone)}
          ${c.email ? `<small class="muted-text"> (${escapeHTML(c.email)})</small>` : ""}<br />
          <span class="muted-text small-text">
            Loyalty: <strong>${lCount}/10</strong> ${lCount >= 10 ? "🎉 (20% OFF Ready!)" : ""} &bull; Bookings: <strong>${bCount}</strong>
          </span>
        </div>
        <div class="item-actions">
          <button type="button" class="btn btn-gold btn-sm js-tick-one" data-uid="${c.id}">+1 Tick</button>
          <button type="button" class="btn btn-primary btn-sm js-view-client" data-uid="${c.id}">Details &amp; History</button>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".js-tick-one").forEach(btn => {
    btn.addEventListener("click", async () => {
      const c = clients.find(x => x.id === btn.dataset.uid);
      if (!c) return;
      await updateDoc(doc(db, "users", c.id), { loyaltyCount: Math.min(10, (Number(c.loyaltyCount) || 0) + 1) });
    });
  });

  container.querySelectorAll(".js-view-client").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedClientId = btn.dataset.uid;
      document.getElementById("clientsListCard").style.display = "none";
      document.getElementById("clientDetailCard").style.display = "block";
      renderClientDetail();
    });
  });
}

function renderClientDetail() {
  const c = clients.find(x => x.id === selectedClientId);
  if (!c) return;

  const cBookings = bookings.filter(b => b.uid === c.id);
  const count = Math.min(10, Math.max(0, Number(c.loyaltyCount) || 0));

  const historyHTML = cBookings.length === 0
    ? `<p class="muted-text">No bookings recorded for this client yet.</p>`
    : cBookings.map(b => `
        <div class="item-row">
          <div>
            <strong>${escapeHTML(b.service)}</strong><br />
            <span class="muted-text small-text">${formatPrettyDate(b.date)} at ${escapeHTML(b.time)}</span>
          </div>
          <span class="status-tag ${b.status === "Cancelled" ? "cancelled" : b.status === "Completed" ? "completed" : ""}">${escapeHTML(b.status)}</span>
        </div>
      `).join("");

  const body = document.getElementById("clientDetailBody");
  body.innerHTML = `
    <div class="toggle-row">
      <div>
        <h2 class="serif">${escapeHTML(c.name)}</h2>
        <p class="muted-text small-text">
          Phone: <strong>${escapeHTML(c.phone)}</strong> &bull; Email: ${escapeHTML(c.email || "—")} &bull;
          20% Rewards Redeemed: <strong>${c.rewardsRedeemed || 0}</strong>
        </p>
      </div>
      <div>
        ${count >= 10
          ? `<button type="button" id="redeemResetBtn" class="btn btn-primary btn-sm">Redeem 20% &amp; Reset Card</button>`
          : `<button type="button" id="detailPlusOneBtn" class="btn btn-gold btn-sm">+ Tick Service (${count}/10)</button>`
        }
      </div>
    </div>

    ${buildLoyaltyCardHTML(c, true)}

    <h3 class="serif mb-10">Client Past &amp; Upcoming Bookings</h3>
    ${historyHTML}
  `;

  body.querySelectorAll("[data-stamp]").forEach(el => {
    el.addEventListener("click", () => {
      updateDoc(doc(db, "users", c.id), { loyaltyCount: Number(el.dataset.stamp) });
    });
  });

  const plusBtn = document.getElementById("detailPlusOneBtn");
  if (plusBtn) {
    plusBtn.addEventListener("click", () => {
      updateDoc(doc(db, "users", c.id), { loyaltyCount: Math.min(10, count + 1) });
    });
  }

  const redeemBtn = document.getElementById("redeemResetBtn");
  if (redeemBtn) {
    redeemBtn.addEventListener("click", () => {
      updateDoc(doc(db, "users", c.id), {
        loyaltyCount: 0,
        rewardsRedeemed: (Number(c.rewardsRedeemed) || 0) + 1
      });
    });
  }
}

function compressImageToDataURL(file, maxWidth = 900, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

document.getElementById("galleryUploadForm").addEventListener("submit", async e => {
  e.preventDefault();
  hideMsg("galMsgOk");
  hideMsg("galMsgErr");

  const serviceCategory = document.getElementById("galServiceSelect").value;
  const caption = document.getElementById("galCaptionInput").value.trim();
  const file = document.getElementById("galFileInput").files[0];
  const urlVal = document.getElementById("galUrlInput").value.trim();

  if (!file && !urlVal) {
    showMsg("galMsgErr", "Please upload an image file or paste an HTTPS image URL.");
    return;
  }

  const btn = document.getElementById("galSubmitBtn");
  btn.disabled = true;
  btn.textContent = "Uploading...";

  try {
    let imageUrl = urlVal;
    if (file) {
      imageUrl = await compressImageToDataURL(file);
    } else if (!imageUrl.startsWith("https://")) {
      throw new Error("Image URL must start with https://");
    }

    await addDoc(collection(db, "gallery"), {
      serviceCategory,
      caption,
      imageUrl,
      createdAt: Date.now()
    });

    document.getElementById("galCaptionInput").value = "";
    document.getElementById("galFileInput").value = "";
    document.getElementById("galUrlInput").value = "";
    showMsg("galMsgOk", `Photo published under ${serviceCategory}!`);
  } catch (err) {
    showMsg("galMsgErr", err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Add Photo to Gallery";
  }
});

document.getElementById("galAdminFilter").addEventListener("change", renderAdminGallery);

function renderAdminGallery() {
  const filter = document.getElementById("galAdminFilter").value || "All";
  const list = gallery.filter(p => filter === "All" || p.serviceCategory === filter);
  const grid = document.getElementById("adminGalleryGrid");

  if (list.length === 0) {
    grid.innerHTML = `<p class="muted-text">No photos uploaded under this service yet.</p>`;
    return;
  }

  grid.innerHTML = list.map(p => `
    <div class="gal-card">
      <img src="${escapeHTML(p.imageUrl)}" alt="${escapeHTML(p.caption || p.serviceCategory)}" />
      <div class="gal-card-body">
        <strong>${escapeHTML(p.serviceCategory)}</strong>
        ${p.caption ? `<p class="muted-text small-text">${escapeHTML(p.caption)}</p>` : ""}
        <button type="button" class="btn btn-danger btn-sm js-del-photo" data-id="${p.id}" style="margin-top:8px;">Delete</button>
      </div>
    </div>
  `).join("");

  grid.querySelectorAll(".js-del-photo").forEach(btn => {
    btn.addEventListener("click", () => deleteDoc(doc(db, "gallery", btn.dataset.id)));
  });
}

function getDateSched(ymd) {
  const isSun = parseYMD(ymd).getDay() === 0;
  const ov = scheduleCfg.overrides && scheduleCfg.overrides[ymd];
  if (ov) {
    return {
      closed: Boolean(ov.closed),
      slots: Array.isArray(ov.slots) ? [...ov.slots] : [...scheduleCfg.defaultSlots]
    };
  }
  return {
    closed: isSun && !scheduleCfg.openSundaysByDefault,
    slots: [...scheduleCfg.defaultSlots]
  };
}

async function saveSchedule(nextCfg) {
  await setDoc(doc(db, "siteConfig", "schedule"), nextCfg);
}

document.getElementById("adminDatePicker").addEventListener("change", renderDateEditor);

function renderDateEditor() {
  const ymd = document.getElementById("adminDatePicker").value;
  if (!ymd) return;
  const sched = getDateSched(ymd);
  const st = document.getElementById("adminDateStatusText");
  const toggleBtn = document.getElementById("toggleDateOpenBtn");
  const editorWrap = document.getElementById("adminSlotsEditorWrap");

  if (sched.closed) {
    st.textContent = `${formatShortDate(ymd)}: CLOSED`;
    st.style.color = "var(--danger)";
    toggleBtn.textContent = "Open This Date";
    editorWrap.style.display = "none";
  } else {
    st.textContent = `${formatShortDate(ymd)}: OPEN`;
    st.style.color = "var(--success)";
    toggleBtn.textContent = "Close This Date";
    editorWrap.style.display = "block";

    const allSlots = Array.from(new Set([...scheduleCfg.defaultSlots, ...sched.slots]));
    const grid = document.getElementById("adminDateSlotsGrid");
    grid.innerHTML = allSlots.map(slot => {
      const active = sched.slots.includes(slot);
      return `<button type="button" class="slot-pill ${active ? "selected" : ""}" data-dslot="${escapeHTML(slot)}">${active ? "✓ " : ""}${escapeHTML(slot)}</button>`;
    }).join("");

    grid.querySelectorAll("[data-dslot]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const slot = btn.dataset.dslot;
        const cur = getDateSched(ymd);
        const slots = cur.slots.includes(slot) ? cur.slots.filter(s => s !== slot) : [...cur.slots, slot];
        await saveSchedule({ ...scheduleCfg, overrides: { ...(scheduleCfg.overrides || {}), [ymd]: { closed: false, slots } } });
      });
    });
  }
}

document.getElementById("toggleDateOpenBtn").addEventListener("click", async () => {
  const ymd = document.getElementById("adminDatePicker").value;
  if (!ymd) return;
  const cur = getDateSched(ymd);
  await saveSchedule({
    ...scheduleCfg,
    overrides: {
      ...(scheduleCfg.overrides || {}),
      [ymd]: { closed: !cur.closed, slots: cur.slots.length ? cur.slots : [...scheduleCfg.defaultSlots] }
    }
  });
});

document.getElementById("addCustomDateSlotBtn").addEventListener("click", async () => {
  const ymd = document.getElementById("adminDatePicker").value;
  const val = document.getElementById("customDateSlotInput").value.trim();
  if (!ymd || !val) return;
  const cur = getDateSched(ymd);
  const slots = cur.slots.includes(val) ? cur.slots : [...cur.slots, val];
  document.getElementById("customDateSlotInput").value = "";
  await saveSchedule({ ...scheduleCfg, overrides: { ...(scheduleCfg.overrides || {}), [ymd]: { closed: false, slots } } });
});

function renderDefaultSlots() {
  document.getElementById("sundayToggleChk").checked = Boolean(scheduleCfg.openSundaysByDefault);
  const grid = document.getElementById("defaultSlotsGrid");
  grid.innerHTML = (scheduleCfg.defaultSlots || []).map(s =>
    `<button type="button" class="slot-pill selected" data-rmslot="${escapeHTML(s)}">${escapeHTML(s)} &times;</button>`
  ).join("");

  grid.querySelectorAll("[data-rmslot]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await saveSchedule({ ...scheduleCfg, defaultSlots: scheduleCfg.defaultSlots.filter(x => x !== btn.dataset.rmslot) });
    });
  });
}

document.getElementById("addDefaultSlotBtn").addEventListener("click", async () => {
  const val = document.getElementById("newDefaultSlotInput").value.trim();
  if (!val || scheduleCfg.defaultSlots.includes(val)) return;
  document.getElementById("newDefaultSlotInput").value = "";
  await saveSchedule({ ...scheduleCfg, defaultSlots: [...scheduleCfg.defaultSlots, val] });
});

document.getElementById("sundayToggleChk").addEventListener("change", async e => {
  await saveSchedule({ ...scheduleCfg, openSundaysByDefault: e.target.checked });
});

function renderServicesEditor() {
  const mount = document.getElementById("servicesEditorMount");
  mount.innerHTML = servicesData.map((svc, sIdx) => {
    const groupsHTML = (svc.groups || []).map((grp, gIdx) => {
      const rowsHTML = (grp.items || []).map((it, iIdx) => `
        <div class="sub-edit-row" style="align-items:end; background:#fff; padding:10px; border-radius:10px; border:1px solid var(--border);">
          <div>
            <label style="font-size:0.72rem; color:var(--muted);">Sub-Service / Length</label>
            <input type="text" value="${escapeHTML(it.name)}" placeholder="e.g. Short" data-s="${sIdx}" data-g="${gIdx}" data-i="${iIdx}" data-k="name" />
          </div>
          <div>
            <label style="font-size:0.72rem; color:var(--gold-dark);">Price (GH₵)</label>
            <input type="text" value="${escapeHTML(it.price)}" placeholder="GH₵ 50.00" data-s="${sIdx}" data-g="${gIdx}" data-i="${iIdx}" data-k="price" />
          </div>
          <div>
            <label style="font-size:0.72rem; color:var(--muted);">Note (Optional)</label>
            <input type="text" value="${escapeHTML(it.note || "")}" placeholder="e.g. Complimentary massage" data-s="${sIdx}" data-g="${gIdx}" data-i="${iIdx}" data-k="note" />
          </div>
          <div>
            <label style="font-size:0.72rem; color:var(--muted);">Action</label>
            <select data-s="${sIdx}" data-g="${gIdx}" data-i="${iIdx}" data-k="type">
              <option value="book" ${it.type !== "whatsapp" ? "selected" : ""}>Book Button</option>
              <option value="whatsapp" ${it.type === "whatsapp" ? "selected" : ""}>WhatsApp Enquiry</option>
            </select>
          </div>
          <button type="button" class="btn btn-danger btn-sm js-del-sub" data-s="${sIdx}" data-g="${gIdx}" data-i="${iIdx}" title="Remove item">&times;</button>
        </div>
      `).join("");

      return `
        <div class="svc-group-box">
          <div class="form-row mb-10">
            <div>
              <label style="font-size:0.74rem; color:var(--muted);">Section Title (e.g. Length / Tiers)</label>
              <input type="text" value="${escapeHTML(grp.heading || "")}" placeholder="Section Heading" data-s="${sIdx}" data-g="${gIdx}" data-gk="heading" />
            </div>
            <div>
              <label style="font-size:0.74rem; color:var(--muted);">Section Note (Optional)</label>
              <input type="text" value="${escapeHTML(grp.note || "")}" placeholder="Section Note" data-s="${sIdx}" data-g="${gIdx}" data-gk="note" />
            </div>
          </div>
          ${rowsHTML}
          <button type="button" class="btn btn-outline btn-sm js-add-sub" data-s="${sIdx}" data-g="${gIdx}">+ Add Sub-Item</button>
        </div>
      `;
    }).join("");

    return `
      <div class="svc-editor-card">
        <div class="form-row mb-10">
          <div><label>Service Title</label><input type="text" value="${escapeHTML(svc.title)}" data-s="${sIdx}" data-sk="title" /></div>
          <div>
            <label>Filter Tab Category</label>
            <select data-s="${sIdx}" data-sk="category">
              <option value="nails" ${svc.category === "nails" ? "selected" : ""}>Nails</option>
              <option value="makeup" ${svc.category === "makeup" ? "selected" : ""}>Makeup</option>
              <option value="lashes" ${svc.category === "lashes" ? "selected" : ""}>Lashes</option>
              <option value="waxing" ${svc.category === "waxing" ? "selected" : ""}>Waxing</option>
            </select>
          </div>
        </div>
        <div class="form-row mb-10">
          <div><label>Category Label</label><input type="text" value="${escapeHTML(svc.categoryLabel)}" data-s="${sIdx}" data-sk="categoryLabel" /></div>
          <div><label>Description</label><input type="text" value="${escapeHTML(svc.description)}" data-s="${sIdx}" data-sk="description" /></div>
        </div>
        ${groupsHTML}
        <div class="svc-del-row" style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-top:14px;">
          <button type="button" class="btn btn-danger btn-sm js-del-svc" data-s="${sIdx}">Delete Service Card</button>
          <button type="button" class="btn btn-primary btn-sm js-save-inline">Save Price Changes</button>
        </div>
      </div>
    `;
  }).join("");

  mount.querySelectorAll("[data-sk]").forEach(el => {
    el.addEventListener("input", () => { servicesData[el.dataset.s][el.dataset.sk] = el.value; });
  });
  mount.querySelectorAll("[data-gk]").forEach(el => {
    el.addEventListener("input", () => { servicesData[el.dataset.s].groups[el.dataset.g][el.dataset.gk] = el.value; });
  });
  mount.querySelectorAll("[data-k]").forEach(el => {
    el.addEventListener("input", () => { servicesData[el.dataset.s].groups[el.dataset.g].items[el.dataset.i][el.dataset.k] = el.value; });
  });
  mount.querySelectorAll(".js-add-sub").forEach(btn => {
    btn.addEventListener("click", () => {
      servicesData[btn.dataset.s].groups[btn.dataset.g].items.push({ name: "New Option", price: "GH₵ 0.00", note: "", type: "book" });
      renderServicesEditor();
    });
  });
  mount.querySelectorAll(".js-del-sub").forEach(btn => {
    btn.addEventListener("click", () => {
      servicesData[btn.dataset.s].groups[btn.dataset.g].items.splice(Number(btn.dataset.i), 1);
      renderServicesEditor();
    });
  });
  mount.querySelectorAll(".js-del-svc").forEach(btn => {
    btn.addEventListener("click", () => {
      servicesData.splice(Number(btn.dataset.s), 1);
      renderServicesEditor();
    });
  });
  mount.querySelectorAll(".js-save-inline").forEach(btn => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Saving...";
      await setDoc(doc(db, "siteConfig", "services"), { items: servicesData });
      showMsg("servicesSaveOk", "All services & prices saved live to the main website!");
      btn.textContent = "Saved ✓";
      setTimeout(() => { btn.disabled = false; btn.textContent = "Save Price Changes"; }, 1800);
    });
  });
}

document.getElementById("addServiceCardBtn").addEventListener("click", () => {
  servicesData.push({
    id: `svc-${Date.now()}`,
    category: "nails",
    categoryLabel: "Studio Service",
    title: "New Service",
    description: "Describe this service.",
    groups: [{ heading: "Options", note: "", items: [{ name: "Standard", price: "GH₵ 50.00", note: "", type: "book" }] }]
  });
  renderServicesEditor();
});

document.getElementById("resetDefaultServicesBtn").addEventListener("click", async () => {
  servicesData = JSON.parse(JSON.stringify(DEFAULT_SERVICES));
  await setDoc(doc(db, "siteConfig", "services"), { items: servicesData });
  showMsg("servicesSaveOk", "Default menu & prices restored to Firestore!");
});

document.getElementById("saveAllServicesBtn").addEventListener("click", async () => {
  hideMsg("servicesSaveOk");
  await setDoc(doc(db, "siteConfig", "services"), { items: servicesData });
  showMsg("servicesSaveOk", "All services & prices saved live to the main website!");
});

function fillSiteConfigForm() {
  document.getElementById("cfgBrandMain").value = siteCfg.brandMain || "";
  document.getElementById("cfgBrandAccent").value = siteCfg.brandAccent || "";
  document.getElementById("cfgSlogan").value = siteCfg.slogan || "";
  document.getElementById("cfgShortLoc").value = siteCfg.shortLocation || "";
  document.getElementById("cfgLocation").value = siteCfg.location || "";
  document.getElementById("cfgPhoneDisplay").value = siteCfg.phoneDisplay || "";
  document.getElementById("cfgWhatsapp").value = siteCfg.whatsappNumber || "";
  document.getElementById("cfgTiktok1").value = siteCfg.tiktok1 || "";
  document.getElementById("cfgTiktok2").value = siteCfg.tiktok2 || "";
  document.getElementById("cfgHeroTitle").value = siteCfg.heroTitle || "";
  document.getElementById("cfgHeroDesc").value = siteCfg.heroDescription || "";
  document.getElementById("cfgAboutText").value = siteCfg.aboutText || "";
  document.getElementById("cfgWaxingNotice").value = siteCfg.waxingNotice || "";
}

document.getElementById("siteConfigForm").addEventListener("submit", async e => {
  e.preventDefault();
  hideMsg("siteSaveOk");
  const next = {
    brandMain: document.getElementById("cfgBrandMain").value.trim(),
    brandAccent: document.getElementById("cfgBrandAccent").value.trim(),
    slogan: document.getElementById("cfgSlogan").value.trim(),
    shortLocation: document.getElementById("cfgShortLoc").value.trim(),
    location: document.getElementById("cfgLocation").value.trim(),
    phoneDisplay: document.getElementById("cfgPhoneDisplay").value.trim(),
    whatsappNumber: document.getElementById("cfgWhatsapp").value.trim(),
    tiktok1: document.getElementById("cfgTiktok1").value.trim(),
    tiktok2: document.getElementById("cfgTiktok2").value.trim(),
    heroTitle: document.getElementById("cfgHeroTitle").value.trim(),
    heroDescription: document.getElementById("cfgHeroDesc").value.trim(),
    aboutText: document.getElementById("cfgAboutText").value.trim(),
    waxingNotice: document.getElementById("cfgWaxingNotice").value.trim()
  };
  await setDoc(doc(db, "siteConfig", "main"), next);
  showMsg("siteSaveOk", "Website information updated live!");
});
  
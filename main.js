import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import {
  auth,
  db,
  GALLERY_SERVICES,
  DEFAULT_SITE_CONFIG,
  DEFAULT_SCHEDULE_CONFIG,
  DEFAULT_SERVICES
} from "./firebase-config.js";
import {
  escapeHTML,
  isSafeImageUrl,
  normalizePhone,
  formatYMD,
  parseYMD,
  formatShortDate,
  formatPrettyDate,
  slotDocId,
  showMsg,
  hideMsg,
  buildLoyaltyCardHTML
} from "./utils.js";

let currentUser = null;
let currentProfile = null;
let isAdminUser = false;
let siteConfig = { ...DEFAULT_SITE_CONFIG };
let servicesData = JSON.parse(JSON.stringify(DEFAULT_SERVICES));
let scheduleConfig = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE_CONFIG));
let galleryItems = [];
let bookedSlots = [];
let myBookings = [];
let activeServiceCat = "all";
let activeGalleryFilter = "All";
let selectedDate = "";
let selectedTime = "";
let unsubs = [];

function clearListeners() {
  unsubs.forEach(fn => { try { fn(); } catch {} });
  unsubs = [];
}

onAuthStateChanged(auth, async user => {
  clearListeners();
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  const [userSnap, adminSnap] = await Promise.all([
    getDoc(doc(db, "users", user.uid)),
    getDoc(doc(db, "admins", user.uid))
  ]);

  isAdminUser = adminSnap.exists();
  if (!isAdminUser && (!userSnap.exists() || !userSnap.data().phone)) {
    window.location.replace("login.html");
    return;
  }

  currentUser = user;
  document.getElementById("loadingScreen").style.display = "none";
  document.getElementById("appShell").style.display = "block";

  if (isAdminUser) {
    document.getElementById("navAdminItem").style.display = "list-item";
  }

  startRealtimeSync(user.uid);
});

function startRealtimeSync(uid) {
  unsubs.push(onSnapshot(doc(db, "users", uid), snap => {
    if (snap.exists()) {
      currentProfile = snap.data();
      const first = (currentProfile.name || "Friend").split(" ")[0];
      document.getElementById("navClientBtn").textContent = `Hi, ${first} (${currentProfile.loyaltyCount || 0}/10)`;
      if (!document.getElementById("clientName").value) {
        document.getElementById("clientName").value = currentProfile.name || "";
      }
      if (!document.getElementById("clientPhone").value) {
        document.getElementById("clientPhone").value = currentProfile.phone || "";
      }
    } else if (isAdminUser) {
      currentProfile = {
        name: currentUser.displayName || "Admin",
        email: currentUser.email || "",
        phone: siteConfig.phoneDisplay,
        loyaltyCount: 0,
        rewardsRedeemed: 0
      };
      document.getElementById("navClientBtn").textContent = "Admin Preview";
      if (!document.getElementById("clientName").value) {
        document.getElementById("clientName").value = currentProfile.name;
      }
    }
    if (document.getElementById("clientModal").classList.contains("open")) {
      renderClientModalContent();
    }
  }));

  unsubs.push(onSnapshot(doc(db, "siteConfig", "main"), snap => {
    siteConfig = snap.exists() ? { ...DEFAULT_SITE_CONFIG, ...snap.data() } : { ...DEFAULT_SITE_CONFIG };
    renderSiteInfo();
  }));

  unsubs.push(onSnapshot(doc(db, "siteConfig", "services"), snap => {
    servicesData = (snap.exists() && Array.isArray(snap.data().items))
      ? snap.data().items
      : JSON.parse(JSON.stringify(DEFAULT_SERVICES));
    renderServices();
    populateServiceSelect();
  }));

  unsubs.push(onSnapshot(doc(db, "siteConfig", "schedule"), snap => {
    scheduleConfig = snap.exists()
      ? { ...DEFAULT_SCHEDULE_CONFIG, ...snap.data() }
      : JSON.parse(JSON.stringify(DEFAULT_SCHEDULE_CONFIG));
    renderCustomerDates();
  }));

  unsubs.push(onSnapshot(collection(db, "bookedSlots"), snap => {
    bookedSlots = snap.docs.map(d => d.data());
    renderCustomerDates();
  }));

  unsubs.push(onSnapshot(query(collection(db, "gallery"), orderBy("createdAt", "desc")), snap => {
    galleryItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderGallerySection();
  }));

  unsubs.push(onSnapshot(query(collection(db, "bookings"), where("uid", "==", uid)), snap => {
    myBookings = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
    if (document.getElementById("clientModal").classList.contains("open")) {
      renderClientModalContent();
    }
  }));
}

function renderSiteInfo() {
  const c = siteConfig;
  const brandHTML = `${escapeHTML(c.brandMain)} <span>${escapeHTML(c.brandAccent)}</span>`;
  document.getElementById("siteBrandHeader").innerHTML = brandHTML;
  document.getElementById("footerBrandEl").innerHTML = brandHTML;
  document.getElementById("heroLocationBadge").textContent = `${c.shortLocation} • Beauty Studio`;
  document.getElementById("heroTitleEl").textContent = c.heroTitle;
  document.getElementById("heroSloganEl").textContent = `“${c.slogan}”`;
  document.getElementById("footerSloganEl").textContent = `“${c.slogan}”`;
  document.getElementById("heroDescEl").textContent = c.heroDescription;
  document.getElementById("aboutTextEl").textContent = c.aboutText;
  document.getElementById("waxingNoticeText").textContent = c.waxingNotice;
  document.getElementById("contactLocationEl").textContent = c.location;

  const waNum = String(c.whatsappNumber || "233535545267").replace(/\D/g, "");
  document.getElementById("contactPhoneEl").innerHTML = `
    <a href="tel:+${waNum}">${escapeHTML(c.phoneDisplay)}</a> &bull;
    <a href="https://wa.me/${waNum}" target="_blank" rel="noopener">Chat on WhatsApp</a>
  `;

  const t1 = escapeHTML(c.tiktok1);
  const t2 = escapeHTML(c.tiktok2);
  document.getElementById("contactTiktokEl").innerHTML = `
    <a href="https://www.tiktok.com/${t1}" target="_blank" rel="noopener">${t1}</a><br />
    <a href="https://www.tiktok.com/${t2}" target="_blank" rel="noopener">${t2}</a>
  `;

  document.getElementById("tiktokCtaBox").innerHTML = `
    <a href="https://www.tiktok.com/${t1}" target="_blank" rel="noopener" class="btn btn-primary">TikTok: ${t1}</a>
    <a href="https://www.tiktok.com/${t2}" target="_blank" rel="noopener" class="btn btn-outline">TikTok: ${t2}</a>
  `;

  document.getElementById("footerLocEl").textContent = `${c.shortLocation} • Call / WhatsApp: ${c.phoneDisplay}`;
  document.getElementById("footerSocialsEl").innerHTML = `
    <a href="https://www.tiktok.com/${t1}" target="_blank" rel="noopener">TikTok (${t1})</a>
    <a href="https://www.tiktok.com/${t2}" target="_blank" rel="noopener">TikTok (${t2})</a>
    <a href="https://wa.me/${waNum}" target="_blank" rel="noopener">WhatsApp</a>
    <a href="tel:+${waNum}">Call Studio</a>
  `;
}

function renderServices() {
  const grid = document.getElementById("servicesGrid");
  const waNum = String(siteConfig.whatsappNumber || "233535545267").replace(/\D/g, "");
  const visible = servicesData.filter(s => activeServiceCat === "all" || s.category === activeServiceCat);

  document.getElementById("waxingNoticeBanner").style.display =
    (activeServiceCat === "all" || activeServiceCat === "waxing") ? "flex" : "none";

  grid.innerHTML = visible.map(svc => {
    const groupsHTML = (svc.groups || []).map(grp => {
      const itemsHTML = (grp.items || []).map(item => {
        const fullValue = `${svc.title}: ${item.name}${item.price && item.price !== "WhatsApp" ? ` - ${item.price}` : ""}`;
        const actionHTML = item.type === "whatsapp"
          ? `<a href="https://wa.me/${waNum}?text=${encodeURIComponent(`Hello ${siteConfig.brandMain} ${siteConfig.brandAccent}! I would like to enquire about ${svc.title} - ${item.name}.`)}"
                target="_blank" rel="noopener" class="book-link wa-link">WhatsApp Enquiry</a>`
          : `<button type="button" class="book-link js-pick-service" data-service="${escapeHTML(fullValue)}">Book</button>`;

        return `
          <li class="sub-item">
            <div>
              <span class="sub-name">${escapeHTML(item.name)}</span>
              ${item.note ? `<span class="sub-note">${escapeHTML(item.note)}</span>` : ""}
            </div>
            <div class="sub-right">
              ${item.type !== "whatsapp" ? `<span class="sub-price">${escapeHTML(item.price)}</span>` : ""}
              ${actionHTML}
            </div>
          </li>
        `;
      }).join("");

      return `
        ${grp.heading ? `<div class="sub-group-title">${escapeHTML(grp.heading)}</div>` : ""}
        ${grp.note ? `<div class="sub-group-note">${escapeHTML(grp.note)}</div>` : ""}
        <ul class="sub-list">${itemsHTML}</ul>
      `;
    }).join("");

    return `
      <div class="service-card">
        <div>
          <div class="service-cat">${escapeHTML(svc.categoryLabel)}</div>
          <h3>${escapeHTML(svc.title)}</h3>
          <p class="service-desc">${escapeHTML(svc.description)}</p>
          ${groupsHTML}
        </div>
      </div>
    `;
  }).join("");

  grid.querySelectorAll(".js-pick-service").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById("serviceSelect").value = btn.dataset.service;
      document.getElementById("book").scrollIntoView({ behavior: "smooth" });
    });
  });
}

function populateServiceSelect() {
  const select = document.getElementById("serviceSelect");
  const prev = select.value;
  let html = `<option value="">-- Choose a service --</option>`;

  servicesData.forEach(svc => {
    const bookable = [];
    (svc.groups || []).forEach(grp => {
      (grp.items || []).forEach(item => {
        if (item.type !== "whatsapp") {
          const val = `${svc.title}: ${item.name}${item.price ? ` - ${item.price}` : ""}`;
          bookable.push({ val, label: `${item.name}${item.price ? ` — ${item.price}` : ""}` });
        }
      });
    });

    if (bookable.length > 0) {
      html += `<optgroup label="${escapeHTML(svc.title)}">`;
      bookable.forEach(b => {
        html += `<option value="${escapeHTML(b.val)}">${escapeHTML(b.label)}</option>`;
      });
      html += `</optgroup>`;
    }
  });

  select.innerHTML = html;
  if (prev) select.value = prev;
}

document.querySelectorAll("#serviceFilterTabs .tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#serviceFilterTabs .tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeServiceCat = btn.dataset.cat;
    renderServices();
  });
});

function renderGallerySection() {
  const tabsEl = document.getElementById("galleryFilterTabs");
  const filters = ["All", ...GALLERY_SERVICES];
  tabsEl.innerHTML = filters.map(f => `
    <button type="button" class="tab-btn ${activeGalleryFilter === f ? "active" : ""}" data-gfilter="${escapeHTML(f)}">
      ${escapeHTML(f)}
    </button>
  `).join("");

  tabsEl.querySelectorAll("[data-gfilter]").forEach(btn => {
    btn.addEventListener("click", () => {
      activeGalleryFilter = btn.dataset.gfilter;
      renderGallerySection();
    });
  });

  const grid = document.getElementById("galleryGrid");
  const filtered = galleryItems.filter(p =>
    isSafeImageUrl(p.imageUrl) && (activeGalleryFilter === "All" || p.serviceCategory === activeGalleryFilter)
  );

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-msg full-span">
        No photos uploaded under <strong>${escapeHTML(activeGalleryFilter)}</strong> yet. Check back soon or watch our TikTok pages below!
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="photo-card">
      <img src="${escapeHTML(p.imageUrl)}" alt="${escapeHTML(p.caption || p.serviceCategory)}" loading="lazy" />
      <div class="photo-meta">
        <span class="photo-tag">${escapeHTML(p.serviceCategory)}</span>
        ${p.caption ? `<p class="photo-caption">${escapeHTML(p.caption)}</p>` : ""}
      </div>
    </div>
  `).join("");
}

function getDateSchedule(ymd) {
  const isSun = parseYMD(ymd).getDay() === 0;
  const ov = scheduleConfig.overrides && scheduleConfig.overrides[ymd];
  if (ov) {
    return {
      closed: Boolean(ov.closed),
      slots: Array.isArray(ov.slots) ? ov.slots : (scheduleConfig.defaultSlots || [])
    };
  }
  return {
    closed: isSun && !scheduleConfig.openSundaysByDefault,
    slots: scheduleConfig.defaultSlots || []
  };
}

function getBookedTimesForDate(ymd) {
  return bookedSlots.filter(s => s.date === ymd).map(s => s.time);
}

function renderCustomerDates() {
  const grid = document.getElementById("customerDatesGrid");
  const today = new Date();
  const openDates = [];

  for (let i = 0; i < 28; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const ymd = formatYMD(d);
    const sched = getDateSchedule(ymd);
    const taken = getBookedTimesForDate(ymd);
    if (!sched.closed && sched.slots.some(s => !taken.includes(s))) {
      openDates.push(ymd);
    }
  }

  if (openDates.length === 0) {
    selectedDate = "";
    selectedTime = "";
    grid.innerHTML = `<div class="empty-msg full-span">No open dates available right now. Message us on WhatsApp: ${escapeHTML(siteConfig.phoneDisplay)}.</div>`;
    renderCustomerTimes();
    return;
  }

  if (!openDates.includes(selectedDate)) {
    selectedDate = openDates[0];
    selectedTime = "";
  }

  grid.innerHTML = openDates.slice(0, 12).map(ymd => `
    <button type="button" class="slot-pill ${ymd === selectedDate ? "selected" : ""}" data-cdate="${ymd}">
      ${formatShortDate(ymd)}
    </button>
  `).join("");

  grid.querySelectorAll("[data-cdate]").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedDate = btn.dataset.cdate;
      selectedTime = "";
      renderCustomerDates();
    });
  });

  renderCustomerTimes();
}

function renderCustomerTimes() {
  const grid = document.getElementById("customerTimesGrid");
  if (!selectedDate) {
    grid.innerHTML = `<div class="empty-msg full-span">Please select an available date above.</div>`;
    return;
  }

  const sched = getDateSchedule(selectedDate);
  const taken = getBookedTimesForDate(selectedDate);

  grid.innerHTML = sched.slots.map(slot => {
    const isTaken = taken.includes(slot);
    const isSel = slot === selectedTime && !isTaken;
    return `
      <button type="button"
        class="slot-pill ${isTaken ? "disabled" : ""} ${isSel ? "selected" : ""}"
        ${isTaken ? "disabled" : `data-ctime="${escapeHTML(slot)}"`}>
        ${escapeHTML(slot)}${isTaken ? " (Full)" : ""}
      </button>
    `;
  }).join("");

  grid.querySelectorAll("[data-ctime]").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedTime = btn.dataset.ctime;
      renderCustomerTimes();
    });
  });
}

document.getElementById("bookingForm").addEventListener("submit", async e => {
  e.preventDefault();
  hideMsg("formError");
  hideMsg("formStatus");

  if (!currentUser) return;
  if (!selectedDate || !selectedTime) {
    showMsg("formError", "Please select both an available date and time slot.");
    return;
  }

  const btn = document.getElementById("submitBookingBtn");
  btn.disabled = true;
  btn.textContent = "Reserving Slot...";

  const name = document.getElementById("clientName").value.trim();
  const phone = document.getElementById("clientPhone").value.trim();
  const service = document.getElementById("serviceSelect").value;
  const notes = document.getElementById("notes").value.trim();
  const sId = slotDocId(selectedDate, selectedTime);
  const bId = `${currentUser.uid}_${Date.now()}`;

  try {
    await setDoc(doc(db, "bookedSlots", sId), {
      date: selectedDate,
      time: selectedTime,
      uid: currentUser.uid,
      bookingId: bId
    });

    await setDoc(doc(db, "bookings", bId), {
      uid: currentUser.uid,
      name,
      phone,
      phoneNorm: normalizePhone(phone),
      email: currentUser.email || "",
      service,
      date: selectedDate,
      time: selectedTime,
      slotId: sId,
      notes,
      status: "Confirmed",
      createdAtMs: Date.now(),
      createdAt: serverTimestamp()
    });

    const pretty = formatShortDate(selectedDate);
    showMsg("formStatus", `Slot reserved for ${pretty} at ${selectedTime}! Opening WhatsApp...`);

    const waNum = String(siteConfig.whatsappNumber || "233535545267").replace(/\D/g, "");
    const msg =
      `Hello ${siteConfig.brandMain} ${siteConfig.brandAccent}! I would like to book an appointment.\n\n` +
      `Name: ${name}\nPhone: ${phone}\nService: ${service}\nDate: ${pretty} (${selectedDate})\nTime: ${selectedTime}` +
      (notes ? `\nNotes: ${notes}` : "");

    selectedTime = "";
    document.getElementById("notes").value = "";
    window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, "_blank");
  } catch {
    showMsg("formError", "Sorry, that time slot was just booked or unavailable. Please choose another time.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Confirm & Send via WhatsApp";
  }
});

function openClientModal() {
  document.getElementById("clientModal").classList.add("open");
  renderClientModalContent();
}

function renderClientModalContent() {
  if (!currentProfile) return;
  document.getElementById("clientWelcomeName").textContent = `Welcome, ${currentProfile.name}`;
  document.getElementById("clientWelcomeMeta").textContent =
    `${currentProfile.phone}${currentProfile.email ? ` • ${currentProfile.email}` : ""}`;

  document.getElementById("clientLoyaltyCardMount").innerHTML = buildLoyaltyCardHTML(currentProfile, false);
  document.getElementById("clientBookingCount").textContent = myBookings.length;

  const listEl = document.getElementById("clientBookingsList");
  if (myBookings.length === 0) {
    listEl.innerHTML = `<div class="empty-msg">You have no bookings recorded yet.</div>`;
    return;
  }

  listEl.innerHTML = myBookings.map(b => `
    <div class="booking-item">
      <div>
        <strong>${escapeHTML(b.service)}</strong><br />
        <span class="muted-text small-text">
          ${formatPrettyDate(b.date)} at <strong>${escapeHTML(b.time)}</strong>
        </span>
        ${b.notes ? `<div class="muted-text small-text">Notes: ${escapeHTML(b.notes)}</div>` : ""}
      </div>
      <span class="status-tag ${b.status === "Cancelled" ? "cancelled" : b.status === "Completed" ? "completed" : ""}">
        ${escapeHTML(b.status)}
      </span>
    </div>
  `).join("");
}

async function handleSignOut() {
  await signOut(auth);
  window.location.replace("login.html");
}

document.getElementById("navLogoutBtn").addEventListener("click", handleSignOut);
document.getElementById("modalLogoutBtn").addEventListener("click", handleSignOut);
document.getElementById("navClientBtn").addEventListener("click", openClientModal);
document.getElementById("heroLoyaltyBtn").addEventListener("click", openClientModal);
document.getElementById("promoLoyaltyBtn").addEventListener("click", openClientModal);
document.getElementById("footerLoyaltyBtn").addEventListener("click", openClientModal);
document.getElementById("closeClientModalBtn").addEventListener("click", () => {
  document.getElementById("clientModal").classList.remove("open");
});

document.querySelectorAll("[data-cdash]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-cdash]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll("#clientModal .portal-panel").forEach(p => p.classList.remove("active"));
    document.getElementById(`client-tab-${btn.dataset.cdash}`).classList.add("active");
  });
});

document.getElementById("menuToggleBtn").addEventListener("click", () => {
  document.getElementById("navMenu").classList.toggle("open");
});
document.querySelectorAll("#navMenu .nav-link, #navMenu .nav-btn-link").forEach(el => {
  el.addEventListener("click", () => document.getElementById("navMenu").classList.remove("open"));
});
document.getElementById("year").textContent = new Date().getFullYear();
  
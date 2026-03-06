const API = location.origin + "/oceanview-reservation/api";

let selectedReservation = null;
let selectedAdminReservation = null;
let selectedBill = null;

function getToken() {
  return localStorage.getItem("token") || "";
}

function getRole() {
  return localStorage.getItem("role") || "";
}

function getFullName() {
  return localStorage.getItem("fullName") || "";
}

async function login() {
  const u = document.getElementById("u").value.trim();
  const p = document.getElementById("p").value;

  const r = await fetch(API + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u, password: p })
  });

  const t = await r.text();

  if (!r.ok) {
    document.getElementById("msg").innerText = t || "Login failed.";
    return;
  }

  const d = JSON.parse(t);
  localStorage.setItem("token", d.token);
  localStorage.setItem("role", d.role);
  localStorage.setItem("fullName", d.fullName || d.role);

  if (d.role === "ADMIN") {
    location = "admin.html";
  } else {
    location = "reception.html";
  }
}

function logout() {
  localStorage.clear();
  location = "login.html";
}

function requireRole(role) {
  if (!getToken()) {
    location = "login.html";
    return;
  }

  const currentRole = getRole();

  if (role === "ADMIN" && currentRole !== "ADMIN") {
    location = "reception.html";
  }
}

function initUserBadge() {
  const who = document.getElementById("who");
  if (who) {
    who.innerText = (getFullName() || "User") + " (" + getRole() + ")";
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.classList.toggle("open");
}

function showAdminTab(tabName, btn) {
  document.querySelectorAll(".tabSection").forEach(x => x.classList.remove("active"));
  document.querySelectorAll(".navItem").forEach(x => x.classList.remove("active"));

  const tab = document.getElementById("tab-" + tabName);
  if (tab) tab.classList.add("active");
  if (btn) btn.classList.add("active");
}

function showReceptionTab(tabName, btn) {
  document.querySelectorAll(".tabSection").forEach(x => x.classList.remove("active"));
  document.querySelectorAll(".navItem").forEach(x => x.classList.remove("active"));

  const tab = document.getElementById("reception-" + tabName);
  if (tab) tab.classList.add("active");
  if (btn) btn.classList.add("active");
}

async function api(url, options = {}) {
  options.headers = options.headers || {};
  options.headers["Authorization"] = "Bearer " + getToken();
  return fetch(url, options);
}

function statusBadge(status) {
  const s = (status || "").toUpperCase();
  let cls = "statusBadge ";

  if (s === "ACTIVE") cls += "status-active";
  else if (s === "CANCELLED") cls += "status-cancelled";
  else if (s === "COMPLETED") cls += "status-completed";
  else if (s === "REFUNDED") cls += "status-refunded";
  else if (s === "UPCOMING") cls += "status-active";
  else if (s === "ONGOING") cls += "status-completed";
  else cls += "status-active";

  return `<span class="${cls}">${s}</span>`;
}

function setMessage(id, msg, ok = true) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = ok ? "successText" : "errorText";
  el.innerText = msg;
}

/* ---------------- ROOM TYPES ---------------- */

async function loadRoomTypes() {
  const s = document.getElementById("roomTypeId");
  if (!s) return;

  const r = await api(API + "/room-types");
  const d = await r.json();

  s.innerHTML = "";
  d.forEach(x => {
    const o = document.createElement("option");
    o.value = x.id;
    o.textContent = `${x.typeName} - Rs.${x.ratePerNight}`;
    s.appendChild(o);
  });
}

async function loadEditRoomTypes() {
  const s = document.getElementById("editRoomTypeId");
  if (!s) return;

  const r = await api(API + "/room-types");
  const d = await r.json();

  s.innerHTML = "";
  d.forEach(x => {
    const o = document.createElement("option");
    o.value = x.id;
    o.textContent = `${x.typeName} - Rs.${x.ratePerNight}`;
    s.appendChild(o);
  });
}

async function loadAdminRoomTypesDropdown() {
  const s = document.getElementById("adminRoomTypeId");
  if (!s) return;

  const r = await api(API + "/room-types");
  const d = await r.json();

  s.innerHTML = "";
  d.forEach(x => {
    const o = document.createElement("option");
    o.value = x.id;
    o.textContent = `${x.typeName} - Rs.${x.ratePerNight}`;
    s.appendChild(o);
  });
}

async function loadAdminAvailabilityRoomTypes() {
  const s = document.getElementById("adminAvailRoomTypeId");
  if (!s) return;

  const r = await api(API + "/room-types");
  const d = await r.json();

  s.innerHTML = "";
  d.forEach(x => {
    const o = document.createElement("option");
    o.value = x.id;
    o.textContent = `${x.typeName} - Rs.${x.ratePerNight}`;
    s.appendChild(o);
  });
}

async function loadAllRoomTypes() {
  const r = await api(API + "/room-types/all");
  const d = await r.json();

  const tb = document.getElementById("roomTypesTbody");
  if (!tb) return;

  const count = document.getElementById("roomTypeCount");
  if (count) count.innerText = d.length;

  tb.innerHTML = "";

  d.forEach(x => {
    tb.innerHTML += `
      <tr>
        <td>${x.id}</td>
        <td>${x.typeCode || "-"}</td>
        <td>${x.typeName}</td>
        <td>Rs.${x.ratePerNight}</td>
        <td>${x.totalRooms ?? 0}</td>
        <td>${x.active ? "Active" : "Inactive"}</td>
        <td>
          <button class="dangerBtn" onclick="deleteRoomType(${x.id})">Delete</button>
        </td>
      </tr>
    `;
  });
}

async function createRoomType() {
  const payload = {
    typeCode: document.getElementById("rtCode").value.trim().toUpperCase(),
    typeName: document.getElementById("rtName").value.trim(),
    ratePerNight: Number(document.getElementById("rtRate").value),
    totalRooms: Number(document.getElementById("rtTotalRooms").value),
    active: document.getElementById("rtActive").checked
  };

  const r = await api(API + "/room-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const text = await r.text();

  if (r.ok) {
    setMessage("rtMessage", "Room type added successfully.", true);
    document.getElementById("rtCode").value = "";
    document.getElementById("rtName").value = "";
    document.getElementById("rtRate").value = "";
    document.getElementById("rtTotalRooms").value = "";
    document.getElementById("rtActive").checked = true;

    loadAllRoomTypes();
    loadRoomTypes();
    loadEditRoomTypes();
    loadAdminRoomTypesDropdown();
    loadAdminAvailabilityRoomTypes();
  } else {
    setMessage("rtMessage", text || "Failed to add room type.", false);
  }
}

async function deleteRoomType(id) {
  if (!confirm("Delete this room type?")) return;

  const r = await api(API + "/room-types/" + id, { method: "DELETE" });
  const text = await r.text();

  if (r.ok) {
    setMessage("rtMessage", "Room type deleted successfully.", true);
  } else {
    setMessage("rtMessage", text || "Failed to delete room type.", false);
  }

  loadAllRoomTypes();
  loadRoomTypes();
  loadEditRoomTypes();
  loadAdminRoomTypesDropdown();
  loadAdminAvailabilityRoomTypes();
}

/* ---------------- USERS ---------------- */

async function loadUsers() {
  const r = await api(API + "/users");
  const d = await r.json();

  const tb = document.getElementById("usersTbody");
  if (!tb) return;

  const count = document.getElementById("userCount");
  if (count) count.innerText = d.length;

  tb.innerHTML = "";

  d.forEach(x => {
    tb.innerHTML += `
      <tr>
        <td>${x.id}</td>
        <td>${x.username}</td>
        <td>${x.fullName}</td>
        <td>${x.phone || "-"}</td>
        <td>${(x.roles || []).join(", ")}</td>
        <td>${x.active ? "Active" : "Inactive"}</td>
        <td>
          <button class="dangerBtn" onclick="deleteUser(${x.id})">Delete</button>
        </td>
      </tr>
    `;
  });
}

async function createUser() {
  const roles = [];
  if (document.getElementById("roleAdmin").checked) roles.push("ADMIN");
  if (document.getElementById("roleReception").checked) roles.push("RECEPTIONIST");

  const payload = {
    username: document.getElementById("un").value.trim(),
    password: document.getElementById("pw").value,
    fullName: document.getElementById("fn").value.trim(),
    phone: document.getElementById("ph").value.trim(),
    active: document.getElementById("uActive").checked,
    roles: roles.length ? roles : ["RECEPTIONIST"]
  };

  const r = await api(API + "/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const text = await r.text();

  if (r.ok) {
    setMessage("userMessage", "User added successfully.", true);
    document.getElementById("un").value = "";
    document.getElementById("pw").value = "";
    document.getElementById("fn").value = "";
    document.getElementById("ph").value = "";
    document.getElementById("uActive").checked = true;
    document.getElementById("roleAdmin").checked = false;
    document.getElementById("roleReception").checked = true;
    loadUsers();
  } else {
    setMessage("userMessage", text || "Failed to add user.", false);
  }
}

async function deleteUser(id) {
  if (!confirm("Delete this user?")) return;

  const r = await api(API + "/users/" + id, { method: "DELETE" });
  const text = await r.text();

  if (r.ok) {
    setMessage("userMessage", "User deleted successfully.", true);
  } else {
    setMessage("userMessage", text || "Failed to delete user.", false);
  }

  loadUsers();
}

/* ---------------- AVAILABILITY ---------------- */

async function requestAvailability(roomTypeId, checkIn, checkOut) {
  const r = await api(API + "/reservations/check-availability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomTypeId,
      checkIn,
      checkOut
    })
  });

  const text = await r.text();

  if (!r.ok) {
    return { ok: false, message: text || "Failed to check availability." };
  }

  return { ok: true, data: JSON.parse(text) };
}

async function checkAvailabilityReception() {
  const roomTypeId = Number(document.getElementById("roomTypeId")?.value || 0);
  const checkIn = document.getElementById("cin")?.value;
  const checkOut = document.getElementById("cout")?.value;

  if (!roomTypeId || !checkIn || !checkOut) {
    setMessage("receptionCreateMessage", "Select room type and dates first.", false);
    return;
  }

  const result = await requestAvailability(roomTypeId, checkIn, checkOut);

  if (!result.ok) {
    setMessage("receptionCreateMessage", result.message, false);
    return;
  }

  const data = result.data;
  document.getElementById("receptionAvailRoomType").innerText = data.roomType || "—";
  document.getElementById("receptionAvailTotal").innerText = data.totalRooms ?? "—";
  document.getElementById("receptionAvailReserved").innerText = data.reservedRooms ?? "—";
  document.getElementById("receptionAvailAvailable").innerText = data.availableRooms ?? "—";
  document.getElementById("receptionAvailCheckIn").innerText = data.checkIn || "—";
  document.getElementById("receptionAvailCheckOut").innerText = data.checkOut || "—";

  setMessage(
    "receptionCreateMessage",
    `Reserved: ${data.reservedRooms}, Available: ${data.availableRooms}, Total: ${data.totalRooms}`,
    true
  );
}

async function checkAvailabilityAdmin() {
  const roomTypeId = Number(document.getElementById("adminAvailRoomTypeId")?.value || 0);
  const checkIn = document.getElementById("adminAvailCheckIn")?.value;
  const checkOut = document.getElementById("adminAvailCheckOut")?.value;

  if (!roomTypeId || !checkIn || !checkOut) {
    setMessage("adminAvailabilityMessage", "Select room type and dates first.", false);
    return;
  }

  const result = await requestAvailability(roomTypeId, checkIn, checkOut);

  if (!result.ok) {
    setMessage("adminAvailabilityMessage", result.message, false);
    return;
  }

  const data = result.data;
  document.getElementById("adminAvailRoomType").innerText = data.roomType || "—";
  document.getElementById("adminAvailTotal").innerText = data.totalRooms ?? "—";
  document.getElementById("adminAvailReserved").innerText = data.reservedRooms ?? "—";
  document.getElementById("adminAvailAvailable").innerText = data.availableRooms ?? "—";
  document.getElementById("adminAvailCheckInText").innerText = data.checkIn || "—";
  document.getElementById("adminAvailCheckOutText").innerText = data.checkOut || "—";

  setMessage(
    "adminAvailabilityMessage",
    `Reserved: ${data.reservedRooms}, Available: ${data.availableRooms}, Total: ${data.totalRooms}`,
    true
  );
}

/* ---------------- RECEPTION RESERVATIONS ---------------- */

async function createReservation() {
  const roomTypeId = Number(document.getElementById("roomTypeId").value);
  const checkIn = document.getElementById("cin").value;
  const checkOut = document.getElementById("cout").value;

  const result = await requestAvailability(roomTypeId, checkIn, checkOut);

  if (!result.ok) {
    setMessage("receptionCreateMessage", result.message, false);
    return;
  }

  const availability = result.data;

  document.getElementById("receptionAvailRoomType").innerText = availability.roomType || "—";
  document.getElementById("receptionAvailTotal").innerText = availability.totalRooms ?? "—";
  document.getElementById("receptionAvailReserved").innerText = availability.reservedRooms ?? "—";
  document.getElementById("receptionAvailAvailable").innerText = availability.availableRooms ?? "—";
  document.getElementById("receptionAvailCheckIn").innerText = availability.checkIn || "—";
  document.getElementById("receptionAvailCheckOut").innerText = availability.checkOut || "—";

  if (availability.availableRooms <= 0) {
    setMessage(
      "receptionCreateMessage",
      `No rooms available. Reserved: ${availability.reservedRooms}, Available: ${availability.availableRooms}`,
      false
    );
    return;
  }

  const payload = {
    guestName: document.getElementById("name").value.trim(),
    guestAddress: document.getElementById("addr").value.trim(),
    guestContact: document.getElementById("phone").value.trim(),
    roomTypeId,
    checkIn,
    checkOut
  };

  const r = await api(API + "/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const text = await r.text();

  if (r.ok) {
    setMessage("receptionCreateMessage", "Reservation created successfully.", true);
    clearReceptionForm();
    loadRecentReservations();
  } else {
    setMessage("receptionCreateMessage", text || "Failed to create reservation.", false);
  }
}

function clearReceptionForm() {
  ["name", "addr", "phone", "cin", "cout"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  document.getElementById("receptionAvailRoomType").innerText = "—";
  document.getElementById("receptionAvailTotal").innerText = "—";
  document.getElementById("receptionAvailReserved").innerText = "—";
  document.getElementById("receptionAvailAvailable").innerText = "—";
  document.getElementById("receptionAvailCheckIn").innerText = "—";
  document.getElementById("receptionAvailCheckOut").innerText = "—";
}

async function loadRecentReservations() {
  const r = await api(API + "/reservations/recent");
  const d = await r.json();

  const tb = document.getElementById("recentTbody");
  if (!tb) return;

  tb.innerHTML = "";
  d.forEach(x => {
    tb.innerHTML += `
      <tr>
        <td>${x.reservationNo}</td>
        <td>${x.guestName}</td>
        <td>${x.roomType}</td>
        <td>${x.checkIn}</td>
        <td>${x.checkOut}</td>
        <td>${statusBadge(x.displayStatus || x.status)}</td>
        <td><button class="secondaryBtn" onclick="selectReservation('${x.reservationNo}')">Select</button></td>
      </tr>
    `;
  });

  const reservationCount = document.getElementById("reservationCount");
  if (reservationCount) reservationCount.innerText = d.length;
}

async function searchReservation() {
  const id = document.getElementById("resNo").value.trim();
  if (!id) return;

  const r = await api(API + "/reservations/" + encodeURIComponent(id));
  const text = await r.text();

  if (!r.ok) {
    setMessage("receptionReservationMessage", text || "Reservation not found.", false);
    return;
  }

  const data = JSON.parse(text);
  selectedReservation = data;
  renderSelectedReservation(data);
  loadBillIfExists(data.reservationNo);
  setMessage("receptionReservationMessage", "Reservation loaded successfully.", true);
}

async function selectReservation(reservationNo) {
  document.getElementById("resNo").value = reservationNo;
  await searchReservation();
}

function renderSelectedReservation(data) {
  document.getElementById("cResNo").innerText = data.reservationNo || "—";
  document.getElementById("cGuest").innerText = data.guestName || "—";
  document.getElementById("cContact").innerText = data.guestContact || "—";
  document.getElementById("cAddress").innerText = data.guestAddress || "—";
  document.getElementById("cRoom").innerText = data.roomType || "—";
  document.getElementById("cIn").innerText = data.checkIn || "—";
  document.getElementById("cOut").innerText = data.checkOut || "—";
  document.getElementById("cStatus").innerHTML = statusBadge(data.status);
}

function fillEditFromSelected() {
  if (!selectedReservation) return;

  document.getElementById("editName").value = selectedReservation.guestName || "";
  document.getElementById("editAddr").value = selectedReservation.guestAddress || "";
  document.getElementById("editPhone").value = selectedReservation.guestContact || "";
  document.getElementById("editCin").value = selectedReservation.checkIn || "";
  document.getElementById("editCout").value = selectedReservation.checkOut || "";
  document.getElementById("editRoomTypeId").value = selectedReservation.roomTypeId || "";

  setMessage("receptionReservationMessage", "Reservation loaded into edit form.", true);
}

async function updateSelectedReservation() {
  if (!selectedReservation) return;

  const payload = {
    guestName: document.getElementById("editName").value.trim(),
    guestAddress: document.getElementById("editAddr").value.trim(),
    guestContact: document.getElementById("editPhone").value.trim(),
    roomTypeId: Number(document.getElementById("editRoomTypeId").value),
    checkIn: document.getElementById("editCin").value,
    checkOut: document.getElementById("editCout").value
  };

  const r = await api(API + "/reservations/" + encodeURIComponent(selectedReservation.reservationNo), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const text = await r.text();

  if (r.ok) {
    selectedReservation = JSON.parse(text);
    renderSelectedReservation(selectedReservation);
    setMessage("receptionReservationMessage", "Reservation updated successfully.", true);
    loadRecentReservations();
  } else {
    setMessage("receptionReservationMessage", text || "Failed to update reservation.", false);
  }
}

async function cancelSelectedReservation() {
  if (!selectedReservation) return;
  if (!confirm("Cancel this reservation?")) return;

  const r = await api(API + "/reservations/" + encodeURIComponent(selectedReservation.reservationNo) + "/cancel", {
    method: "POST"
  });

  const text = await r.text();

  if (r.ok) {
    setMessage("receptionReservationMessage", "Reservation cancelled successfully.", true);
    await searchReservation();
    loadRecentReservations();
  } else {
    setMessage("receptionReservationMessage", text || "Failed to cancel reservation.", false);
  }
}

/* ---------------- BILL ---------------- */

async function generateBill() {
  const reservationNo = selectedReservation
    ? selectedReservation.reservationNo
    : document.getElementById("resNo").value.trim();

  if (!reservationNo) return;

  const r = await api(API + "/bills/generate/" + encodeURIComponent(reservationNo), {
    method: "POST"
  });

  const text = await r.text();

  if (!r.ok) {
    setMessage("billMessage", text || "Failed to generate bill.", false);
    return;
  }

  const data = JSON.parse(text);
  selectedBill = data;
  renderBill(data);
  setMessage("billMessage", "Bill generated successfully.", true);
}

async function loadBillIfExists(reservationNo) {
  const r = await api(API + "/bills/" + encodeURIComponent(reservationNo));
  if (!r.ok) return;

  const data = await r.json();
  selectedBill = data;
  renderBill(data);
}

function renderBill(data) {
  document.getElementById("bResNo").innerText = data.reservationNo || "—";
  document.getElementById("bNights").innerText = data.nights || "—";
  document.getElementById("bRate").innerText = data.ratePerNight ? "Rs." + data.ratePerNight : "—";
  document.getElementById("bTotal").innerText = data.total ? "Rs." + data.total : "—";
}

function printBill() {
  if (!selectedBill || !selectedReservation) {
    alert("Please search reservation and generate bill first.");
    return;
  }

  const w = window.open("", "_blank");
  w.document.write(`
    <html>
    <head>
      <title>Reservation Bill</title>
      <style>
        body { font-family: Arial; padding: 30px; color: #222; }
        h1 { margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        td, th { padding: 10px; border: 1px solid #ddd; text-align: left; }
      </style>
    </head>
    <body>
      <h1>Ocean View Resort</h1>
      <h3>Reservation Bill</h3>
      <table>
        <tr><th>Reservation No</th><td>${selectedReservation.reservationNo}</td></tr>
        <tr><th>Guest Name</th><td>${selectedReservation.guestName}</td></tr>
        <tr><th>Room Type</th><td>${selectedReservation.roomType}</td></tr>
        <tr><th>Check In</th><td>${selectedReservation.checkIn}</td></tr>
        <tr><th>Check Out</th><td>${selectedReservation.checkOut}</td></tr>
        <tr><th>Nights</th><td>${selectedBill.nights}</td></tr>
        <tr><th>Rate Per Night</th><td>Rs.${selectedBill.ratePerNight}</td></tr>
        <tr><th>Total</th><td>Rs.${selectedBill.total}</td></tr>
      </table>
    </body>
    </html>
  `);
  w.document.close();
  w.print();
}

/* ---------------- ADMIN RESERVATIONS ---------------- */

async function loadAllStatuses() {
  const r = await api(API + "/reservations/all-status");
  const d = await r.json();

  const tb = document.getElementById("adminReservationsTbody");
  if (!tb) return;

  tb.innerHTML = "";
  d.forEach(x => {
    tb.innerHTML += `
      <tr>
        <td>${x.reservationNo}</td>
        <td>${x.guestName}</td>
        <td>${x.roomType}</td>
        <td>${x.checkIn}</td>
        <td>${x.checkOut}</td>
        <td>${statusBadge(x.displayStatus || x.status)}</td>
        <td><button class="secondaryBtn" onclick="selectAdminReservation('${x.reservationNo}')">Select</button></td>
      </tr>
    `;
  });

  const reservationCount = document.getElementById("reservationCount");
  if (reservationCount) reservationCount.innerText = d.length;
}

async function selectAdminReservation(reservationNo) {
  const r = await api(API + "/reservations/" + encodeURIComponent(reservationNo));
  const text = await r.text();

  if (!r.ok) {
    setMessage("adminReservationMessage", text || "Reservation not found.", false);
    return;
  }

  const data = JSON.parse(text);
  selectedAdminReservation = data;
  renderAdminReservation(data);
  loadAdminBillIfExists(data.reservationNo);
  setMessage("adminReservationMessage", "Reservation loaded successfully.", true);
}

function renderAdminReservation(data) {
  document.getElementById("aResNo").innerText = data.reservationNo || "—";
  document.getElementById("aGuestName").innerText = data.guestName || "—";
  document.getElementById("aGuestContact").innerText = data.guestContact || "—";
  document.getElementById("aGuestAddress").innerText = data.guestAddress || "—";
  document.getElementById("aRoomType").innerText = data.roomType || "—";
  document.getElementById("aCheckIn").innerText = data.checkIn || "—";
  document.getElementById("aCheckOut").innerText = data.checkOut || "—";
  document.getElementById("aStatus").innerHTML = statusBadge(data.status);
}

function fillAdminEditForm() {
  if (!selectedAdminReservation) return;

  document.getElementById("adminGuestName").value = selectedAdminReservation.guestName || "";
  document.getElementById("adminGuestAddress").value = selectedAdminReservation.guestAddress || "";
  document.getElementById("adminGuestContact").value = selectedAdminReservation.guestContact || "";
  document.getElementById("adminRoomTypeId").value = selectedAdminReservation.roomTypeId || "";
  document.getElementById("adminCheckIn").value = selectedAdminReservation.checkIn || "";
  document.getElementById("adminCheckOut").value = selectedAdminReservation.checkOut || "";

  setMessage("adminReservationMessage", "Reservation loaded into edit form.", true);
}

async function adminUpdateReservation() {
  if (!selectedAdminReservation) return;

  const payload = {
    guestName: document.getElementById("adminGuestName").value.trim(),
    guestAddress: document.getElementById("adminGuestAddress").value.trim(),
    guestContact: document.getElementById("adminGuestContact").value.trim(),
    roomTypeId: Number(document.getElementById("adminRoomTypeId").value),
    checkIn: document.getElementById("adminCheckIn").value,
    checkOut: document.getElementById("adminCheckOut").value
  };

  const r = await api(API + "/reservations/" + encodeURIComponent(selectedAdminReservation.reservationNo), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const text = await r.text();

  if (r.ok) {
    selectedAdminReservation = JSON.parse(text);
    renderAdminReservation(selectedAdminReservation);
    setMessage("adminReservationMessage", "Reservation updated successfully.", true);
    loadAllStatuses();
  } else {
    setMessage("adminReservationMessage", text || "Failed to update reservation.", false);
  }
}

async function adminCancelReservation() {
  if (!selectedAdminReservation) return;
  if (!confirm("Cancel this reservation?")) return;

  const r = await api(API + "/reservations/" + encodeURIComponent(selectedAdminReservation.reservationNo) + "/cancel", {
    method: "POST"
  });

  const text = await r.text();

  if (r.ok) {
    setMessage("adminReservationMessage", "Reservation cancelled successfully.", true);
    selectAdminReservation(selectedAdminReservation.reservationNo);
    loadAllStatuses();
  } else {
    setMessage("adminReservationMessage", text || "Failed to cancel reservation.", false);
  }
}

async function adminGenerateBill() {
  if (!selectedAdminReservation) return;

  const r = await api(API + "/bills/generate/" + encodeURIComponent(selectedAdminReservation.reservationNo), {
    method: "POST"
  });

  const text = await r.text();

  if (r.ok) {
    selectedBill = JSON.parse(text);
    setMessage("adminReservationMessage", "Bill generated successfully.", true);
  } else {
    setMessage("adminReservationMessage", text || "Failed to generate bill.", false);
  }
}

async function loadAdminBillIfExists(reservationNo) {
  const r = await api(API + "/bills/" + encodeURIComponent(reservationNo));
  if (!r.ok) return;
  selectedBill = await r.json();
}

function adminPrintBill() {
  if (!selectedAdminReservation || !selectedBill) {
    alert("Please select reservation and generate bill first.");
    return;
  }

  const w = window.open("", "_blank");
  w.document.write(`
    <html>
    <head>
      <title>Reservation Bill</title>
      <style>
        body { font-family: Arial; padding: 30px; color: #222; }
        h1 { margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        td, th { padding: 10px; border: 1px solid #ddd; text-align: left; }
      </style>
    </head>
    <body>
      <h1>Ocean View Resort</h1>
      <h3>Reservation Bill</h3>
      <table>
        <tr><th>Reservation No</th><td>${selectedAdminReservation.reservationNo}</td></tr>
        <tr><th>Guest Name</th><td>${selectedAdminReservation.guestName}</td></tr>
        <tr><th>Room Type</th><td>${selectedAdminReservation.roomType}</td></tr>
        <tr><th>Check In</th><td>${selectedAdminReservation.checkIn}</td></tr>
        <tr><th>Check Out</th><td>${selectedAdminReservation.checkOut}</td></tr>
        <tr><th>Nights</th><td>${selectedBill.nights}</td></tr>
        <tr><th>Rate Per Night</th><td>Rs.${selectedBill.ratePerNight}</td></tr>
        <tr><th>Total</th><td>Rs.${selectedBill.total}</td></tr>
      </table>
    </body>
    </html>
  `);
  w.document.close();
  w.print();
}

/* ---------------- INCOME + REFUND ---------------- */

async function loadCurrentMonthIncome() {
  const r = await api(API + "/admin/income/current-month");
  const text = await r.text();

  if (!r.ok) {
    setMessage("refundMessage", text || "Failed to load current month income.", false);
    return;
  }

  const data = JSON.parse(text);
  document.getElementById("monthIncome").innerText = "Rs." + data.monthIncome;
  document.getElementById("monthReservationCount").innerText = data.reservationCount;
  document.getElementById("monthIncomeCard").innerText = "Rs." + data.monthIncome;
}

async function loadReservationPayments() {
  const reservationId = document.getElementById("refundReservationId").value.trim();
  if (!reservationId) return;

  const r = await api(API + "/admin/reservations/" + encodeURIComponent(reservationId) + "/payments");
  const text = await r.text();

  if (!r.ok) {
    setMessage("refundMessage", text || "Failed to load payments.", false);
    return;
  }

  const data = JSON.parse(text);
  const tb = document.getElementById("paymentsTbody");
  if (!tb) return;

  tb.innerHTML = "";

  data.forEach(x => {
    tb.innerHTML += `
      <tr>
        <td>${x.id}</td>
        <td>${x.reservationNo}</td>
        <td>Rs.${x.amount}</td>
        <td>${x.paymentStatus}</td>
        <td>${x.paymentDate || "-"}</td>
        <td>${x.refundReason || "-"}</td>
      </tr>
    `;
  });

  setMessage("refundMessage", "Payments loaded successfully.", true);
}

async function refundPayment() {
  const paymentId = document.getElementById("refundPaymentId").value.trim();
  const reason = document.getElementById("refundReason").value.trim();

  if (!paymentId) return;

  const r = await api(API + "/admin/payments/" + encodeURIComponent(paymentId) + "/refund", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason })
  });

  const text = await r.text();

  if (r.ok) {
    setMessage("refundMessage", "Payment refunded successfully.", true);
    loadCurrentMonthIncome();
    loadReservationPayments();
    loadAllStatuses();
  } else {
    setMessage("refundMessage", text || "Failed to refund payment.", false);
  }
}
import { apiFetch } from "./api.js";
import { getApiBase, setApiBase } from "./config.js";
import { getUser, isLoggedIn, logout, hasRole, rememberReservation, getRecentReservations } from "./auth.js";
import { $, esc, money, toast, setLoading, badgeForStatus, show, hide } from "./ui.js";

let roomTypes = []; // [{id,typeName,ratePerNight,description}]
let currentReservation = null; // ReservationDto

function redirectToLogin(){
  window.location.href = "./index.html";
}

function requireLogin(){
  if(!isLoggedIn()){
    redirectToLogin();
    return false;
  }
  return true;
}

function isoDate(d){
  const z = new Date(d.getTime() - d.getTimezoneOffset()*60000);
  return z.toISOString().slice(0,10);
}

function setDefaultDates(){
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24*3600*1000);
  const after = new Date(today.getTime() + 2*24*3600*1000);

  $("dashFrom").value = isoDate(today);
  $("dashTo").value   = isoDate(tomorrow);

  $("cCheckIn").value  = isoDate(tomorrow);
  $("cCheckOut").value = isoDate(after);
}

function setUserUI(){
  const u = getUser();
  $("userText").textContent = u ? `${u.fullName} (${u.username})` : "Unknown";
  $("roleText").textContent = (u?.roles || []).join(", ") || "—";
}

function setApiText(){
  $("apiBaseText").textContent = getApiBase();
}

function navTo(sectionName){
  document.querySelectorAll(".ov-nav .btn[data-section]").forEach(b => {
    b.classList.toggle("active", b.dataset.section === sectionName);
  });
  document.querySelectorAll(".ov-section").forEach(s => s.classList.remove("active"));
  const target = document.getElementById("section-" + sectionName);
  if(target) target.classList.add("active");
}

function safeError(err){
  const msg = err?.message || String(err);
  toast(msg, "danger");
  if(/session expired/i.test(msg)){
    setTimeout(() => redirectToLogin(), 700);
  }
}

function roomTypeOptionsHtml(includeAll=false){
  const opts = [];
  if(includeAll) opts.push(`<option value="">All room types</option>`);
  for(const rt of roomTypes){
    opts.push(`<option value="${rt.id}">${esc(rt.typeName)} • ${money(rt.ratePerNight)}</option>`);
  }
  return opts.join("");
}

async function loadRoomTypes(){
  roomTypes = await apiFetch("/room-types");
  $("dashRoomType").innerHTML = roomTypeOptionsHtml(false);
  $("cRoomType").innerHTML = roomTypeOptionsHtml(false);
  $("mRoomType").insertAdjacentHTML("beforeend", roomTypeOptionsHtml(false));

  // Rooms & Rates table
  const tbody = $("rtTbody");
  tbody.innerHTML = "";
  roomTypes.forEach(rt => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="fw-bold">${esc(rt.typeName)}</td>
      <td class="ov-muted">${esc(rt.description || "")}</td>
      <td class="text-end">${money(rt.ratePerNight)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderReservationCard(dto){
  const invoice = dto.invoice || null;
  const payBadge = invoice ? badgeForStatus(invoice.paymentStatus) : "badge-soft";

  return `
    <div class="ov-card p-3">
      <div class="d-flex align-items-center justify-content-between gap-2">
        <div>
          <div class="fw-bold">${esc(dto.reservationNo)} 
            <span class="badge ${badgeForStatus(dto.status)} ms-2">${esc(dto.status)}</span>
          </div>
          <div class="ov-small">
            ${esc(dto.checkInDate)} → ${esc(dto.checkOutDate)} • Room ${esc(dto.roomNumber)} (${esc(dto.roomTypeName)})
          </div>
        </div>
        <div class="text-end">
          ${invoice ? `
            <div class="ov-small">Total</div>
            <div class="fw-bold">${money(invoice.totalAmount)}</div>
          ` : `<div class="ov-small">No invoice</div>`}
        </div>
      </div>

      <hr class="border border-light border-opacity-10 my-2">

      <div class="row g-2">
        <div class="col-12 col-md-6">
          <div class="ov-small">Guest</div>
          <div class="fw-bold">${esc(dto.guestName)}</div>
          <div class="ov-small">${esc(dto.guestContact || "")}</div>
        </div>
        <div class="col-12 col-md-6">
          ${invoice ? `
            <div class="ov-small">Payment</div>
            <div>
              <span class="badge ${payBadge}">${esc(invoice.paymentStatus)}</span>
              <span class="ov-small ms-2">Paid: ${money(invoice.amountPaid)} • Balance: ${money(invoice.balanceDue)}</span>
            </div>
            <div class="ov-small">Nights: ${invoice.nights} • Rate: ${money(invoice.ratePerNight)}</div>
          ` : ``}
        </div>
      </div>
    </div>
  `;
}

async function fetchReservation(resNo){
  const dto = await apiFetch(`/reservations/${encodeURIComponent(resNo)}`);
  return dto;
}

async function dashboardFind(){
  const resNo = $("dashResNo").value.trim();
  if(!resNo){
    toast("Enter reservation number", "warning");
    return;
  }
  const btn = $("btnDashFind");
  try{
    setLoading(btn, true);
    const dto = await fetchReservation(resNo);
    $("dashResultWrap").innerHTML = renderReservationCard(dto) + `
      <div class="mt-2 d-grid">
        <button class="btn btn-outline-light" id="btnDashOpenManage">
          <i class="bi bi-box-arrow-in-right me-2"></i>Open in Manage Tab
        </button>
      </div>`;
    show($("dashResultWrap"));
    document.getElementById("btnDashOpenManage").addEventListener("click", () => {
      $("mResNo").value = dto.reservationNo;
      navTo("manage");
      loadManage(dto.reservationNo);
    });
  }catch(err){
    safeError(err);
  }finally{
    setLoading(btn, false, `<i class="bi bi-search me-2"></i>Find Reservation`);
  }
}

async function dashboardAvailability(){
  const typeId = $("dashRoomType").value;
  const from = $("dashFrom").value;
  const to = $("dashTo").value;
  if(!typeId || !from || !to){
    toast("Select room type and dates", "warning");
    return;
  }
  const btn = $("btnDashAvail");
  try{
    setLoading(btn, true);
    const list = await apiFetch(`/rooms/available?roomTypeId=${encodeURIComponent(typeId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    const tbody = $("dashAvailTbody");
    tbody.innerHTML = "";
    if(list.length === 0){
      tbody.innerHTML = `<tr><td colspan="3" class="ov-muted">No rooms available for selected dates.</td></tr>`;
    }else{
      list.forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="fw-bold">${esc(r.roomNumber)}</td>
          <td>${esc(r.roomTypeName)}</td>
          <td>${esc(r.floorNo ?? "-")}</td>
        `;
        tbody.appendChild(tr);
      });
    }
    show($("dashAvailWrap"));
  }catch(err){
    safeError(err);
  }finally{
    setLoading(btn, false, `<i class="bi bi-calendar2-check me-2"></i>Check`);
  }
}

async function checkAvailabilityForCreate(){
  const typeId = $("cRoomType").value;
  const from = $("cCheckIn").value;
  const to = $("cCheckOut").value;
  if(!typeId || !from || !to){
    toast("Select room type and dates", "warning");
    return;
  }
  const btn = $("btnCheckAvail");
  try{
    setLoading(btn, true);
    const list = await apiFetch(`/rooms/available?roomTypeId=${encodeURIComponent(typeId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    const tbody = $("availTbody");
    tbody.innerHTML = "";
    if(list.length === 0){
      tbody.innerHTML = `<tr><td colspan="4" class="ov-muted">No rooms available for selected dates.</td></tr>`;
    }else{
      list.forEach((r, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>
            <input class="form-check-input" type="radio" name="pickRoom" value="${r.id}" ${idx===0?'checked':''}>
          </td>
          <td class="fw-bold">${esc(r.roomNumber)}</td>
          <td>${esc(r.roomTypeName)}</td>
          <td>${esc(r.floorNo ?? "-")}</td>
        `;
        tbody.appendChild(tr);
      });
    }
    show($("availWrap"));
  }catch(err){
    safeError(err);
  }finally{
    setLoading(btn, false, `<i class="bi bi-search me-2"></i>Find Available Rooms`);
  }
}

function getPickedRoomId(){
  const picked = document.querySelector('input[name="pickRoom"]:checked');
  return picked ? Number(picked.value) : null;
}

async function createReservation(e){
  e.preventDefault();
  const btn = $("btnCreate");

  try{
    const fullName = $("cGuestName").value.trim();
    const address = $("cGuestAddress").value.trim();
    const contactNumber = $("cGuestContact").value.trim();
    const email = $("cGuestEmail").value.trim();
    const roomTypeId = Number($("cRoomType").value);
    const checkInDate = $("cCheckIn").value;
    const checkOutDate = $("cCheckOut").value;
    const notes = $("cNotes").value.trim();

    if(!fullName || !address || !contactNumber){
      toast("Guest name, address and contact number are required", "warning");
      return;
    }
    if(!roomTypeId || !checkInDate || !checkOutDate){
      toast("Room type and dates are required", "warning");
      return;
    }

    const roomId = getPickedRoomId();
    const payNow = $("cPayNow").checked;
    const advancePayment = payNow ? {
      paymentType: "ADVANCE",
      method: $("cPayMethod").value,
      amount: Number($("cPayAmount").value || 0),
      referenceNo: $("cPayRef").value.trim() || null,
      note: $("cPayNote").value.trim() || null
    } : null;

    if(payNow && (!advancePayment.amount || advancePayment.amount <= 0)){
      toast("Enter a valid advance payment amount", "warning");
      return;
    }

    const payload = {
      guest: { fullName, address, contactNumber, email: email || null },
      roomTypeId,
      roomId: roomId || null,
      checkInDate,
      checkOutDate,
      notes: notes || null,
      advancePayment
    };

    setLoading(btn, true);

    const dto = await apiFetch("/reservations", { method:"POST", body: payload });

    rememberReservation(dto.reservationNo);
    $("createResult").innerHTML = `
      <div class="alert alert-success ov-card mb-0">
        <div class="fw-bold"><i class="bi bi-check2-circle me-2"></i>Reservation created</div>
        <div class="mt-2">${renderReservationCard(dto)}</div>
        <div class="mt-2 d-grid gap-2 d-md-flex">
          <button class="btn btn-outline-light" id="btnCreateGoManage">
            <i class="bi bi-box-arrow-in-right me-2"></i>Open in Manage Tab
          </button>
          <button class="btn btn-outline-light" id="btnCreateNew">
            <i class="bi bi-plus-circle me-2"></i>Create Another
          </button>
        </div>
      </div>
    `;
    show($("createResult"));

    document.getElementById("btnCreateGoManage").addEventListener("click", () => {
      $("mResNo").value = dto.reservationNo;
      navTo("manage");
      loadManage(dto.reservationNo);
    });

    document.getElementById("btnCreateNew").addEventListener("click", () => {
      $("createForm").reset();
      setDefaultDates();
      hide($("availWrap"));
      hide($("createResult"));
    });

    toast("Reservation created: " + dto.reservationNo, "success");
    refreshRecent();
  }catch(err){
    safeError(err);
  }finally{
    setLoading(btn, false, `<i class="bi bi-check2-circle me-2"></i>Create Reservation`);
  }
}

function setManageActionButtons(dto){
  const status = String(dto?.status || "").toUpperCase();
  $("mStatusBadge").className = `badge ${badgeForStatus(status)}`;
  $("mStatusBadge").textContent = status || "—";

  // Enable/disable buttons based on state
  $("btnCancel").disabled = !dto || ["CANCELLED","CHECKED_OUT"].includes(status);
  $("btnCheckIn").disabled = !dto || status !== "BOOKED";
  $("btnCheckOut").disabled = !dto || status !== "CHECKED_IN";
  $("btnUpdate").disabled = !dto || ["CANCELLED","CHECKED_OUT"].includes(status);
}

function renderManageDetails(dto){
  const inv = dto.invoice || null;

  const invHtml = inv ? `
    <div class="row g-2 mt-2">
      <div class="col-6 col-md-3"><div class="ov-small">Nights</div><div class="fw-bold">${inv.nights}</div></div>
      <div class="col-6 col-md-3"><div class="ov-small">Rate</div><div class="fw-bold">${money(inv.ratePerNight)}</div></div>
      <div class="col-6 col-md-3"><div class="ov-small">Paid</div><div class="fw-bold">${money(inv.amountPaid)}</div></div>
      <div class="col-6 col-md-3"><div class="ov-small">Balance</div><div class="fw-bold">${money(inv.balanceDue)}</div></div>
      <div class="col-12">
        <span class="badge ${badgeForStatus(inv.paymentStatus)}">${esc(inv.paymentStatus)}</span>
        <span class="ov-small ms-2">Total: ${money(inv.totalAmount)}</span>
      </div>
    </div>
  ` : `<div class="ov-muted mt-2">No invoice data.</div>`;

  return `
    <div>
      <div class="d-flex align-items-start justify-content-between gap-2">
        <div>
          <div class="fw-bold fs-5">${esc(dto.reservationNo)}</div>
          <div class="ov-small">${esc(dto.checkInDate)} → ${esc(dto.checkOutDate)} • Room <strong>${esc(dto.roomNumber)}</strong> (${esc(dto.roomTypeName)})</div>
          <div class="ov-small mt-1">Guest: <strong>${esc(dto.guestName)}</strong> • ${esc(dto.guestContact || "")}</div>
        </div>
        <div class="text-end">
          <span class="badge ${badgeForStatus(dto.status)}">${esc(dto.status)}</span>
        </div>
      </div>

      ${dto.notes ? `<div class="ov-small mt-2"><i class="bi bi-sticky me-1"></i>${esc(dto.notes)}</div>` : ""}

      <hr class="border border-light border-opacity-10">

      <div class="fw-bold">Invoice</div>
      ${invHtml}

      <hr class="border border-light border-opacity-10">

      <div class="d-grid gap-2 d-md-flex">
        <button class="btn btn-outline-light" id="btnOpenPayments">
          <i class="bi bi-cash-coin me-2"></i>Open Payments Tab
        </button>
        <button class="btn btn-outline-light" id="btnCopyResNo">
          <i class="bi bi-clipboard me-2"></i>Copy Reservation No
        </button>
      </div>
    </div>
  `;
}

async function loadManage(resNo){
  if(!resNo) return;
  const btn = $("btnManageFind");
  try{
    setLoading(btn, true);
    const dto = await fetchReservation(resNo);
    currentReservation = dto;
    rememberReservation(dto.reservationNo);

    $("mDetails").innerHTML = renderManageDetails(dto);
    setManageActionButtons(dto);

    document.getElementById("btnOpenPayments").addEventListener("click", () => {
      $("pResNo").value = dto.reservationNo;
      navTo("payments");
      loadPayments();
    });

    document.getElementById("btnCopyResNo").addEventListener("click", async () => {
      try{
        await navigator.clipboard.writeText(dto.reservationNo);
        toast("Copied " + dto.reservationNo, "success");
      }catch{
        toast("Copy not supported in this browser", "warning");
      }
    });

    refreshRecent();
  }catch(err){
    currentReservation = null;
    $("mDetails").innerHTML = `<div class="ov-muted">No reservation loaded.</div>`;
    setManageActionButtons(null);
    safeError(err);
  }finally{
    setLoading(btn, false, `<i class="bi bi-search me-2"></i>Search`);
  }
}

async function updateReservation(){
  const resNo = $("mResNo").value.trim();
  if(!resNo){
    toast("Enter reservation number first", "warning");
    return;
  }
  const btn = $("btnUpdate");
  try{
    const payload = {};
    const inD = $("mNewIn").value;
    const outD = $("mNewOut").value;
    const rt = $("mRoomType").value;
    const notes = $("mNotes").value.trim();

    if(inD) payload.checkInDate = inD;
    if(outD) payload.checkOutDate = outD;
    if(rt) payload.roomTypeId = Number(rt);
    if(notes) payload.notes = notes;

    if(Object.keys(payload).length === 0){
      toast("Enter at least one field to update", "warning");
      return;
    }

    setLoading(btn, true);
    const dto = await apiFetch(`/reservations/${encodeURIComponent(resNo)}`, { method:"PUT", body: payload });
    currentReservation = dto;
    $("mDetails").innerHTML = renderManageDetails(dto);
    setManageActionButtons(dto);
    toast("Reservation updated", "success");
    refreshRecent();
  }catch(err){
    safeError(err);
  }finally{
    setLoading(btn, false, `<i class="bi bi-pencil-square me-2"></i>Update Reservation`);
  }
}

async function actionReservation(action){
  const resNo = $("mResNo").value.trim();
  if(!resNo){
    toast("Enter reservation number first", "warning");
    return;
  }
  const map = {
    cancel: { path:`/reservations/${encodeURIComponent(resNo)}/cancel`, label:"Cancel reservation?", btn:"btnCancel" },
    checkin: { path:`/reservations/${encodeURIComponent(resNo)}/checkin`, label:"Check-in this guest?", btn:"btnCheckIn" },
    checkout:{ path:`/reservations/${encodeURIComponent(resNo)}/checkout`,label:"Check-out this guest? (Invoice must be PAID)", btn:"btnCheckOut" }
  };
  const cfg = map[action];
  if(!cfg) return;

  if(!confirm(cfg.label)) return;

  const btn = document.getElementById(cfg.btn);
  try{
    setLoading(btn, true);
    const dto = await apiFetch(cfg.path, { method:"POST", body:{} });
    currentReservation = dto;
    $("mDetails").innerHTML = renderManageDetails(dto);
    setManageActionButtons(dto);
    toast("Done: " + action, "success");
    refreshRecent();
  }catch(err){
    safeError(err);
  }finally{
    // restore original label (already in dataset)
    setLoading(btn, false, btn.dataset.ovLabel || btn.innerHTML);
    // setLoading used earlier stores label, but if action uses first time label not stored. We'll reset:
    if(action==="cancel") btn.innerHTML = `<i class="bi bi-x-octagon me-2"></i>Cancel Reservation`;
    if(action==="checkin") btn.innerHTML = `<i class="bi bi-box-arrow-in-down me-2"></i>Check-in`;
    if(action==="checkout") btn.innerHTML = `<i class="bi bi-box-arrow-up me-2"></i>Check-out`;
    btn.disabled = false;
  }
}

function invoiceText(dto){
  const inv = dto?.invoice;
  if(!inv) return "No invoice found.";
  return `
    <div class="d-flex align-items-center justify-content-between">
      <div>
        <div class="fw-bold">${esc(dto.reservationNo)}</div>
        <div class="ov-small">${esc(dto.checkInDate)} → ${esc(dto.checkOutDate)} • ${esc(dto.roomNumber)} (${esc(dto.roomTypeName)})</div>
      </div>
      <span class="badge ${badgeForStatus(inv.paymentStatus)}">${esc(inv.paymentStatus)}</span>
    </div>
    <div class="mt-2 ov-small">
      Nights: <strong>${inv.nights}</strong> • Rate: <strong>${money(inv.ratePerNight)}</strong> • Total: <strong>${money(inv.totalAmount)}</strong>
    </div>
    <div class="mt-1 ov-small">
      Paid: <strong>${money(inv.amountPaid)}</strong> • Balance: <strong>${money(inv.balanceDue)}</strong>
    </div>
  `;
}

async function loadPayments(){
  const resNo = $("pResNo").value.trim();
  if(!resNo){
    toast("Enter reservation number", "warning");
    return;
  }
  const btn = $("btnLoadPayments");
  try{
    setLoading(btn, true);

    const dto = await fetchReservation(resNo);
    $("pInvoiceText").innerHTML = invoiceText(dto);

    const list = await apiFetch(`/reservations/${encodeURIComponent(resNo)}/payments`);
    renderPaymentsTable(list);
    $("pCountBadge").textContent = String(list.length);

    rememberReservation(resNo);
    refreshRecent();
  }catch(err){
    $("pInvoiceText").textContent = "—";
    renderPaymentsTable([]);
    safeError(err);
  }finally{
    setLoading(btn, false, `<i class="bi bi-arrow-repeat me-2"></i>Load Invoice & Payments`);
  }
}

function renderPaymentsTable(list){
  const tbody = $("pTbody");
  tbody.innerHTML = "";
  if(!list || list.length === 0){
    tbody.innerHTML = `<tr><td colspan="6" class="ov-muted">No payments found.</td></tr>`;
    return;
  }
  list.forEach((p, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx+1}</td>
      <td><span class="badge badge-soft">${esc(p.paymentType)}</span></td>
      <td>${esc(p.method)}</td>
      <td class="text-end fw-bold">${money(p.amount)}</td>
      <td><span class="badge ${badgeForStatus(p.status)}">${esc(p.status)}</span></td>
      <td class="ov-small">${esc(p.paidAt || "")}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function addPayment(){
  const resNo = $("pResNo").value.trim();
  if(!resNo){
    toast("Enter reservation number first", "warning");
    return;
  }
  const amount = Number($("pAmount").value || 0);
  if(!amount || amount <= 0){
    toast("Enter a valid amount", "warning");
    return;
  }
  const btn = $("btnAddPayment");
  try{
    const payload = {
      paymentType: $("pType").value,
      method: $("pMethod").value,
      amount,
      referenceNo: $("pRef").value.trim() || null,
      note: $("pNote").value.trim() || null
    };

    setLoading(btn, true);
    await apiFetch(`/reservations/${encodeURIComponent(resNo)}/payments`, { method:"POST", body: payload });

    toast("Payment added", "success");
    $("pAmount").value = "";
    $("pRef").value = "";
    $("pNote").value = "";

    await loadPayments();
  }catch(err){
    safeError(err);
  }finally{
    setLoading(btn, false, `<i class="bi bi-plus-circle me-2"></i>Add Payment`);
  }
}

async function loadAudit(){
  const btn = $("btnLoadAudit");
  try{
    setLoading(btn, true);
    const params = new URLSearchParams();
    const action = $("aAction").value.trim();
    const entity = $("aEntity").value.trim();
    const userId = $("aUserId").value.trim();
    if(action) params.set("action", action);
    if(entity) params.set("entityType", entity);
    if(userId) params.set("userId", userId);

    const list = await apiFetch(`/audit?${params.toString()}`);
    const tbody = $("aTbody");
    tbody.innerHTML = "";

    if(list.length === 0){
      tbody.innerHTML = `<tr><td colspan="6" class="ov-muted">No audit logs found.</td></tr>`;
      return;
    }

    list.forEach(a => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="ov-small">${esc(a.createdAt || "")}</td>
        <td>${esc(a.username || ("User " + a.userId))}</td>
        <td><span class="badge badge-soft">${esc(a.actionCode)}</span></td>
        <td class="ov-small">${esc(a.entityType)} ${a.entityId ? ("• " + esc(a.entityId)) : ""}</td>
        <td class="ov-small">${esc(a.description || "")}</td>
        <td class="ov-small">${esc(a.ipAddress || "")}</td>
      `;
      tbody.appendChild(tr);
    });
  }catch(err){
    safeError(err);
  }finally{
    setLoading(btn, false, `<i class="bi bi-funnel me-2"></i>Load`);
  }
}

function renderHelp(){
  const html = `
    <div class="row g-3">
      <div class="col-12 col-lg-6">
        <div class="ov-kpi">
          <div class="label">1) Login</div>
          <ul class="mt-2">
            <li>Open the system and enter your <strong>username</strong> and <strong>password</strong>.</li>
            <li>If login fails, re-check spelling and try again.</li>
            <li>After login, you will see the dashboard with menu options.</li>
          </ul>
        </div>
      </div>

      <div class="col-12 col-lg-6">
        <div class="ov-kpi">
          <div class="label">2) Create a New Reservation</div>
          <ul class="mt-2">
            <li>Go to <strong>New Reservation</strong>.</li>
            <li>Fill guest details: name, address, contact number (required).</li>
            <li>Select room type, check-in and check-out dates.</li>
            <li>Click <strong>Find Available Rooms</strong> to select a room (optional).</li>
            <li>Click <strong>Create Reservation</strong>.</li>
          </ul>
          <div class="ov-small mt-2">
            Note: If you don’t pick a room, the system will automatically choose the first available room of the selected type.
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-6">
        <div class="ov-kpi">
          <div class="label">3) Find / Manage a Reservation</div>
          <ul class="mt-2">
            <li>Go to <strong>Find / Manage</strong>.</li>
            <li>Enter the <strong>Reservation No</strong> (example: RSV-AB12CD34).</li>
            <li>Use <strong>Update Reservation</strong> to change dates/room type (system checks availability).</li>
            <li>Use <strong>Cancel</strong> if the guest is not coming.</li>
          </ul>
        </div>
      </div>

      <div class="col-12 col-lg-6">
        <div class="ov-kpi">
          <div class="label">4) Payments (Advance / Balance)</div>
          <ul class="mt-2">
            <li>Go to <strong>Payments</strong> and enter the reservation number.</li>
            <li>Click <strong>Load Invoice & Payments</strong> to view the bill and balance.</li>
            <li>Add payments as <strong>Advance</strong> or <strong>Balance</strong>.</li>
            <li>Payment history will be shown in the table.</li>
          </ul>
          <div class="ov-small mt-2">
            Checkout requires the invoice to be <strong>PAID</strong> (balance must be 0.00).
          </div>
        </div>
      </div>

      <div class="col-12">
        <div class="ov-kpi">
          <div class="label">5) Important Rules (Avoid mistakes)</div>
          <ul class="mt-2">
            <li>Check-out date must be after check-in date.</li>
            <li>Always check availability before confirming changes.</li>
            <li>Do not share passwords. Log out when your shift ends.</li>
            <li>If you see “Session expired”, login again.</li>
          </ul>
        </div>
      </div>

      <div class="col-12">
        <div class="ov-kpi">
          <div class="label">Support</div>
          <div class="mt-2">
            If there is an error you can’t fix, contact the Admin with:
            <ul class="mt-2">
              <li>Reservation number</li>
              <li>What you tried to do</li>
              <li>The exact error message</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
  $("helpBody").innerHTML = html;
}

function refreshRecent(){
  const list = getRecentReservations();
  const wrap = $("recentList");
  wrap.innerHTML = "";

  if(list.length === 0){
    wrap.innerHTML = `<div class="ov-muted">No recent reservations yet.</div>`;
    return;
  }

  list.slice(0,10).forEach(resNo => {
    const btn = document.createElement("button");
    btn.className = "btn btn-outline-light";
    btn.type = "button";
    btn.innerHTML = `<i class="bi bi-bookmark-star me-2"></i>${esc(resNo)}`;
    btn.addEventListener("click", () => {
      $("mResNo").value = resNo;
      navTo("manage");
      loadManage(resNo);
    });
    wrap.appendChild(btn);
  });
}

function wireNav(){
  document.querySelectorAll(".ov-nav .btn[data-section]").forEach(btn => {
    btn.addEventListener("click", () => navTo(btn.dataset.section));
  });
}

function wireSettings(){
  const settingsModal = new bootstrap.Modal(document.getElementById("settingsModal"));
  $("btnSettings").addEventListener("click", () => {
    $("apiBaseInput").value = getApiBase();
    settingsModal.show();
  });
  $("btnSaveApi").addEventListener("click", () => {
    try{
      const v = setApiBase($("apiBaseInput").value);
      setApiText();
      toast("API Base updated", "success");
      settingsModal.hide();
    }catch(e){
      toast(e.message || "Invalid API Base", "danger");
    }
  });
}

function wireLogout(){
  $("btnLogout").addEventListener("click", () => {
    logout();
    redirectToLogin();
  });
}

function wireClock(){
  const tick = () => {
    const now = new Date();
    $("clockText").textContent = now.toLocaleString();
  };
  tick();
  setInterval(tick, 1000);
}

function wireDashboard(){
  $("btnDashFind").addEventListener("click", dashboardFind);
  $("btnDashAvail").addEventListener("click", dashboardAvailability);
  $("btnRefreshRecent").addEventListener("click", refreshRecent);
}

function wireCreate(){
  $("btnCheckAvail").addEventListener("click", checkAvailabilityForCreate);
  $("createForm").addEventListener("submit", createReservation);
  $("cPayNow").addEventListener("change", () => {
    if($("cPayNow").checked) show($("payWrap"));
    else hide($("payWrap"));
  });
}

function wireManage(){
  $("btnManageFind").addEventListener("click", () => loadManage($("mResNo").value.trim()));
  $("btnUpdate").addEventListener("click", updateReservation);
  $("btnCancel").addEventListener("click", () => actionReservation("cancel"));
  $("btnCheckIn").addEventListener("click", () => actionReservation("checkin"));
  $("btnCheckOut").addEventListener("click", () => actionReservation("checkout"));
  setManageActionButtons(null);
}

function wirePayments(){
  $("btnLoadPayments").addEventListener("click", loadPayments);
  $("btnAddPayment").addEventListener("click", addPayment);
}

function wireAudit(){
  $("btnLoadAudit").addEventListener("click", loadAudit);
}

document.addEventListener("DOMContentLoaded", async () => {
  if(!requireLogin()) return;

  setUserUI();
  setApiText();
  wireNav();
  wireSettings();
  wireLogout();
  wireClock();
  wireDashboard();
  wireCreate();
  wireManage();
  wirePayments();
  renderHelp();
  setDefaultDates();

  const isAdmin = hasRole("ADMIN");
  if(isAdmin){
    document.getElementById("navAudit").classList.remove("d-none");
    wireAudit();
  }

  try{
    await loadRoomTypes();
    refreshRecent();
  }catch(err){
    safeError(err);
  }
});

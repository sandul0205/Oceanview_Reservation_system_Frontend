export function $(id){ return document.getElementById(id); }

export function esc(str){
  return String(str ?? "").replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[s]));
}

export function money(v){
  const n = Number(v || 0);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function badgeForStatus(status){
  const s = String(status || "").toUpperCase();
  if(["PAID","CHECKED_OUT","SUCCESS"].includes(s)) return "badge-ok";
  if(["PARTIAL","BOOKED","CHECKED_IN","PENDING"].includes(s)) return "badge-warn";
  if(["CANCELLED","FAILED","REFUNDED","UNPAID"].includes(s)) return "badge-bad";
  return "badge-soft";
}

export function toast(message, variant="info"){
  const container = document.querySelector(".toast-container");
  if(!container) return alert(message);

  const id = "t" + Math.random().toString(16).slice(2);
  const icon = variant === "success" ? "check-circle" :
               variant === "danger" ? "x-circle" :
               variant === "warning" ? "exclamation-triangle" :
               "info-circle";
  const header = variant === "success" ? "Success" :
                 variant === "danger" ? "Error" :
                 variant === "warning" ? "Warning" :
                 "Info";

  const el = document.createElement("div");
  el.className = "toast ov-card";
  el.id = id;
  el.role = "alert";
  el.ariaLive = "assertive";
  el.ariaAtomic = "true";
  el.innerHTML = `
    <div class="toast-header" style="background:transparent;border-bottom:1px solid rgba(255,255,255,.12);">
      <i class="bi bi-${icon} me-2"></i>
      <strong class="me-auto">${header}</strong>
      <small class="ov-muted">now</small>
      <button type="button" class="btn-close btn-close-white ms-2" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
    <div class="toast-body">${esc(message)}</div>
  `;
  container.appendChild(el);
  const t = new bootstrap.Toast(el, { delay: 3600 });
  t.show();
  el.addEventListener("hidden.bs.toast", () => el.remove());
}

export function setLoading(btn, isLoading, labelWhenDone=null){
  if(!btn) return;
  if(isLoading){
    btn.dataset.ovLabel = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading...`;
  }else{
    btn.disabled = false;
    btn.innerHTML = labelWhenDone ?? (btn.dataset.ovLabel || btn.innerHTML);
  }
}

export function show(el){ el?.classList.remove("d-none"); }
export function hide(el){ el?.classList.add("d-none"); }

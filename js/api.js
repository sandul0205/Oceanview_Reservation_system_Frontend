import { getApiBase } from "./config.js";
import { getToken, logout } from "./auth.js";

async function parseJsonSafe(res){
  const text = await res.text();
  if(!text) return null;
  try { return JSON.parse(text); } catch { return { success:false, message:text, data:null }; }
}

export async function apiFetch(path, { method="GET", body=null, auth=true, headers={} } = {}){
  const base = getApiBase();
  const url = base + (path.startsWith("/") ? path : ("/" + path));

  const h = {
    "Accept": "application/json",
    ...headers
  };

  if(body !== null){
    h["Content-Type"] = "application/json";
  }

  if(auth){
    const token = getToken();
    if(token) h["Authorization"] = "Bearer " + token;
  }

  const res = await fetch(url, {
    method,
    headers: h,
    body: body === null ? null : JSON.stringify(body)
  });

  // Handle auth errors globally
  if(res.status === 401){
    logout();
    throw new Error("Session expired. Please login again.");
  }

  const payload = await parseJsonSafe(res);

  if(!res.ok){
    const msg = payload?.message || ("Request failed (" + res.status + ")");
    throw new Error(msg);
  }

  // ApiResponse wrapper (success/message/data)
  if(payload && typeof payload === "object" && "success" in payload){
    if(!payload.success){
      throw new Error(payload.message || "Request failed");
    }
    return payload.data;
  }

  return payload;
}

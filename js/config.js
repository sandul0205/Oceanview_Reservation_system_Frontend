export const DEFAULT_API_BASE = "http://localhost:8080/oceanview-backend/api";

export function getApiBase(){
  return localStorage.getItem("ov_api_base") || DEFAULT_API_BASE;
}

export function setApiBase(url){
  const cleaned = (url || "").trim().replace(/\/+$/,"");
  if(!cleaned) throw new Error("API Base URL is required");
  localStorage.setItem("ov_api_base", cleaned);
  return cleaned;
}

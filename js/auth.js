import { pushUnique } from "./storage.js";

const KEY_TOKEN = "ov_token";
const KEY_USER  = "ov_user";
const KEY_RECENT = "ov_recent_reservations";

export function setSession(loginData){
  // loginData is LoginResponse
  sessionStorage.setItem(KEY_TOKEN, loginData.token);
  sessionStorage.setItem(KEY_USER, JSON.stringify({
    userId: loginData.userId,
    username: loginData.username,
    fullName: loginData.fullName,
    roles: loginData.roles || []
  }));
}

export function getToken(){
  return sessionStorage.getItem(KEY_TOKEN) || "";
}

export function getUser(){
  try{
    const raw = sessionStorage.getItem(KEY_USER);
    return raw ? JSON.parse(raw) : null;
  }catch{
    return null;
  }
}

export function isLoggedIn(){
  return !!getToken();
}

export function logout(){
  sessionStorage.removeItem(KEY_TOKEN);
  sessionStorage.removeItem(KEY_USER);
}

export function hasRole(role){
  const u = getUser();
  const roles = (u?.roles || []).map(r => String(r).toUpperCase());
  return roles.includes(String(role).toUpperCase());
}

export function rememberReservation(resNo){
  if(!resNo) return;
  pushUnique(KEY_RECENT, resNo, 30);
}

export function getRecentReservations(){
  try{
    const raw = localStorage.getItem(KEY_RECENT);
    return raw ? JSON.parse(raw) : [];
  }catch{
    return [];
  }
}

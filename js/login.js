import { apiFetch } from "./api.js";
import { getApiBase, setApiBase } from "./config.js";
import { isLoggedIn, setSession } from "./auth.js";
import { $, toast, setLoading } from "./ui.js";

function redirectToApp(){
  window.location.href = "./app.html";
}

document.addEventListener("DOMContentLoaded", () => {
  if(isLoggedIn()){
    redirectToApp();
    return;
  }

  $("apiBaseText").textContent = getApiBase();

  const settingsModal = new bootstrap.Modal(document.getElementById("settingsModal"));
  $("btnSettings").addEventListener("click", () => {
    $("apiBaseInput").value = getApiBase();
    settingsModal.show();
  });

  $("btnSaveApi").addEventListener("click", () => {
    try{
      const v = setApiBase($("apiBaseInput").value);
      $("apiBaseText").textContent = v;
      toast("API Base updated", "success");
      settingsModal.hide();
    }catch(e){
      toast(e.message || "Invalid API Base", "danger");
    }
  });

  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("btnLogin");
    try{
      const username = $("username").value.trim();
      const password = $("password").value;
      if(!username || !password){
        toast("Please enter username and password", "warning");
        return;
      }

      setLoading(btn, true);

      const data = await apiFetch("/auth/login", {
        method: "POST",
        auth: false,
        body: { username, password }
      });

      setSession(data);
      toast("Login success", "success");
      redirectToApp();
    }catch(err){
      toast(err.message || "Login failed", "danger");
    }finally{
      setLoading(btn, false, `<i class="bi bi-box-arrow-in-right me-2"></i>Login`);
    }
  });
});

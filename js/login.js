import { signInPassword, signInGoogle } from "./auth.js";

const $ = (id) => document.getElementById(id);

$("btnLogin").onclick = async () => {
  $("msg").style.display = "none";
  try {
    const email = $("email").value.trim().replace(/\s+/g, "").toLowerCase();
    const password = $("password").value;

    await signInPassword(email, password);
    window.location.href = "dashboard.html";
  } catch (e) {
    $("msg").textContent = e.message || String(e);
    $("msg").style.display = "block";
  }
};

$("btnGoogle").onclick = async () => {
  $("msg").style.display = "none";
  try {
    await signInGoogle();
  } catch (e) {
    $("msg").textContent = e.message || String(e);
    $("msg").style.display = "block";
  }
};

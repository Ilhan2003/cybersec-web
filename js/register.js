import { signUp } from "./auth.js";

const $ = (id) => document.getElementById(id);

$("btnRegister").onclick = async () => {
  $("msg").style.display = "none";
  $("ok").style.display = "none";

  try {
    // ✅ put this here
    const email = $("email").value.trim().replace(/\s+/g, "").toLowerCase();
    const name = $("name").value.trim();
    const password = $("password").value;

    console.log("NAME/DEPT:", JSON.stringify(name), JSON.stringify($("dept").value));
    // optional debug:
    // console.log("EMAIL SENT:", JSON.stringify(email));

    await signUp(email, password, name, $("dept").value);

    $("ok").textContent = "Registered. Please login.";
    $("ok").style.display = "block";
    setTimeout(() => (window.location.href = "login.html"), 700);
  } catch (e) {
    $("msg").textContent = e.message || String(e);
    $("msg").style.display = "block";
  }
};

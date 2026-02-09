import { supabase } from "./supabaseClient.js";
import { requireAuth } from "./guard.js";
import { getMyProfile } from "./auth.js";

const $ = (id) => document.getElementById(id);

async function preload() {
  await requireAuth();
  const profile = await getMyProfile();

  // prefill if exists
  if (profile?.name) $("name").value = profile.name;
  if (profile?.department_id) $("dept").value = profile.department_id;
}

$("btnSave").onclick = async () => {
  $("msg").style.display = "none";
  try {
    await requireAuth();

    const { data: u } = await supabase.auth.getUser();
    const uid = u.user.id;
    const email = u.user.email;

    const name = $("name").value.trim();
    const dept = $("dept").value;

    if (!dept) throw new Error("Please choose a department.");
    if (!name) throw new Error("Please enter your name.");

    const { error } = await supabase.from("profiles").upsert({
      user_id: uid,
      email,
      name,
      department_id: dept,
      role: "staff",
    });

    if (error) throw error;

    window.location.href = "dashboard.html";
  } catch (e) {
    $("msg").textContent = e.message || String(e);
    $("msg").style.display = "block";
  }
};

preload();

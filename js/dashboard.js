import { supabase } from "./supabaseClient.js";
import { requireAuth } from "./guard.js";
import { getMyProfile, signOut } from "./auth.js";

const $ = (id) => document.getElementById(id);
let profile = null;
let all = [];

function badgeForStatus(s) {
  if (s === "Approved") return "badge good";
  if (s === "Rejected") return "badge bad";
  if (s === "Submitted") return "badge warn";
  return "badge";
}

function render(list) {
  $("rows").innerHTML = "";
  $("empty").style.display = list.length ? "none" : "block";

  let submitted = 0, approved = 0, rejected = 0;
  for (const r of list) {
    if (r.status === "Submitted") submitted++;
    if (r.status === "Approved") approved++;
    if (r.status === "Rejected") rejected++;

    const tr = document.createElement("tr");
    tr.className = "tr";

    const canEdit = (r.status !== "Approved" && r.status !== "Rejected");

    tr.innerHTML = `
      <td>${r.title ?? "Untitled"}</td>
      <td><span class="badge">${r.severity ?? "-"}</span></td>
      <td><span class="${badgeForStatus(r.status)}">${r.status ?? "-"}</span></td>
      <td>${new Date(r.created_at).toLocaleString()}</td>
      <td>
        ${
          canEdit
            ? `<a class="badge" href="submit-report.html?id=${r.report_id}">Edit</a>`
            : `<span class="badge">Locked</span>`
        }
      </td>
    `;

    $("rows").appendChild(tr);
  }

  $("statTotal").textContent = list.length;
  $("statSubmitted").textContent = submitted;
  $("statApproved").textContent = approved;
  $("statRejected").textContent = rejected;
}


async function load() {
  await requireAuth();
  profile = await getMyProfile();

  if (!profile || !profile.department_id || !profile.name) {
  window.location.href = "complete-profile.html";
  return;
}


  $("who").textContent = `Welcome, ${profile?.name ?? "Staff"}`;
  $("pillDept").textContent = `Dept: ${profile?.department_id ?? "-"}`;
  $("pillRole").textContent = `Role: ${profile?.role ?? "staff"}`;

  // only my reports
  const { data, error } = await supabase
    .from("reports")
    .select("report_id,title,severity,status,created_at,created_by")
    .eq("created_by", profile.user_id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  all = data || [];
  render(all);
}

$("search").addEventListener("input", () => {
  const k = $("search").value.trim().toLowerCase();
  const filtered = all.filter(r => (r.title ?? "").toLowerCase().includes(k));
  render(filtered);
});

$("btnLogout").onclick = async () => {
  await signOut();
  window.location.href = "login.html";
};

load().catch((e) => {
  console.error(e);
  alert(e.message || String(e));
});

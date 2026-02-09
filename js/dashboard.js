import { supabase } from "./supabaseClient.js";
import { requireAuth } from "./guard.js";
import { signOut, getMyProfile } from "./auth.js";

const $ = (id) => document.getElementById(id);

let all = [];

// Optional department label helper (works whether dept is number or text)
function deptLabel(v) {
  if (v === null || v === undefined) return "-";
  const s = String(v);
  // If you use numeric IDs, map them here:
  const map = {
    "1": "Offense",
    "2": "Defense",
    "3": "Admin",
    "Offense": "Offense",
    "Defense": "Defense",
    "Admin": "Admin",
  };
  return map[s] ?? s;
}

function badgeForStatus(status) {
  switch (status) {
    case "Submitted":
      return "badge blue";
    case "Approved":
      return "badge green";
    case "Rejected":
      return "badge red";
    default:
      return "badge";
  }
}

// ✅ Delete report + its attachment rows + PDFs in Storage
async function deleteReport(reportId) {
  if (!confirm("Delete this report and its attachments? This cannot be undone.")) return;

  // 1) fetch attachment paths
  const { data: atts, error: attErr } = await supabase
    .from("attachments")
    .select("file_path")
    .eq("report_id", reportId);

  if (attErr) throw attErr;

  const paths = (atts || []).map((a) => a.file_path).filter(Boolean);

  // 2) delete PDFs from Storage
  if (paths.length > 0) {
    const { error: delFilesErr } = await supabase.storage
      .from("report-files")
      .remove(paths);

    if (delFilesErr) throw delFilesErr;
  }

  // 3) delete report row (attachments rows should cascade-delete if FK is ON DELETE CASCADE)
  const { error: repErr } = await supabase
    .from("reports")
    .delete()
    .eq("report_id", reportId);

  if (repErr) throw repErr;
}

function render(list) {
  $("rows").innerHTML = "";
  $("empty").style.display = list.length ? "none" : "block";

  let submitted = 0,
    approved = 0,
    rejected = 0;

  for (const r of list) {
    if (r.status === "Submitted") submitted++;
    if (r.status === "Approved") approved++;
    if (r.status === "Rejected") rejected++;

    const tr = document.createElement("tr");
    tr.className = "tr";

    const canEdit = r.status !== "Approved" && r.status !== "Rejected";

    tr.innerHTML = `
      <td>${r.title ?? "Untitled"}</td>
      <td><span class="badge">${r.severity ?? "-"}</span></td>
      <td><span class="${badgeForStatus(r.status)}">${r.status ?? "-"}</span></td>
      <td>${new Date(r.created_at).toLocaleString()}</td>
      <td>
        ${
          canEdit
            ? `
              <a class="badge" href="submit-report.html?id=${r.report_id}">Edit</a>
              <button class="badge hx-btn" data-del="${r.report_id}" style="margin-left:8px">
                Delete
              </button>
            `
            : `<span class="badge">Locked</span>`
        }
      </td>
    `;

    $("rows").appendChild(tr);

    // ✅ hook delete button
    const delBtn = tr.querySelector("[data-del]");
    if (delBtn) {
      delBtn.onclick = async () => {
        try {
          await deleteReport(delBtn.dataset.del);
          await load(); // reload list
        } catch (e) {
          alert(e.message || String(e));
        }
      };
    }
  }

  $("statTotal").textContent = list.length;
  $("statSubmitted").textContent = submitted;
  $("statApproved").textContent = approved;
  $("statRejected").textContent = rejected;
}

async function load() {
  await requireAuth();

  // profile (for welcome text)
  const profile = await getMyProfile();
  if (profile) {
    if ($("welcomeName")) $("welcomeName").textContent = profile.name ?? "User";
    if ($("deptName")) $("deptName").textContent = deptLabel(profile.department_id);
  }

  // load only my reports
  const { data, error } = await supabase
    .from("reports")
    .select("report_id,title,severity,status,created_at,department_id,created_by")
    .eq("created_by", profile.user_id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  all = data || [];
  render(all);
}

// search filter
$("search").addEventListener("input", () => {
  const k = $("search").value.trim().toLowerCase();
  const filtered = all.filter((r) => (r.title ?? "").toLowerCase().includes(k));
  render(filtered);
});

// logout
$("btnLogout").onclick = async () => {
  await signOut();
  window.location.href = "login.html";
};

load().catch((e) => {
  console.error(e);
  alert(e.message || String(e));
});

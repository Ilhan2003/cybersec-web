import { supabase } from "./supabaseClient.js";
import { requireAuth } from "./guard.js";
import { getMyProfile } from "./auth.js";

const $ = (id) => document.getElementById(id);

const params = new URLSearchParams(window.location.search);
const reportId = params.get("id"); // if exists => edit mode

async function uploadPdf(file, reportId, userId) {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${reportId}/${Date.now()}_${safe}`;

  const { error } = await supabase.storage
    .from("report-files")
    .upload(path, file, { contentType: "application/pdf", upsert: true });

  if (error) throw error;
  return { path, file_name: file.name };
}

async function openAttachment(reportId) {
  const { data, error } = await supabase
    .from("attachments")
    .select("file_path")
    .eq("report_id", reportId)
    .order("uploaded_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("No PDF attachment found.");

  const filePath = data[0].file_path;

  const { data: signed, error: signErr } = await supabase.storage
    .from("report-files")
    .createSignedUrl(filePath, 60 * 10); // 10 minutes

  if (signErr) throw signErr;

  window.open(signed.signedUrl, "_blank");
}

async function refreshViewButton(id) {
  const btn = $("btnViewPdf");
  if (!btn) return; // if you forgot to add the button in HTML, don't crash

  const { data, error } = await supabase
    .from("attachments")
    .select("attachment_id")
    .eq("report_id", id)
    .limit(1);

  if (error) throw error;

  if (data && data.length > 0) {
    btn.style.display = "block";
    btn.onclick = () =>
      openAttachment(id).catch((err) => {
        $("msg").textContent = err.message || String(err);
        $("msg").style.display = "block";
      });
  } else {
    btn.style.display = "none";
    btn.onclick = null;
  }
}

async function loadForEdit() {
  if (!reportId) return;

  document.getElementById("pageTitle").textContent = "Edit Report";
  $("btnSubmit").textContent = "Save Changes";

  await requireAuth();
  const profile = await getMyProfile();

  const { data: r, error } = await supabase
    .from("reports")
    .select("report_id,title,description,findings,ttp,target_scope,severity,status,created_by")
    .eq("report_id", reportId)
    .single();

  if (error) throw error;

  if (r.created_by !== profile.user_id) {
    throw new Error("You can only edit your own reports.");
  }
  if (r.status === "Approved" || r.status === "Rejected") {
    throw new Error("This report is locked because it has been reviewed.");
  }

  $("title").value = r.title ?? "";
  $("description").value = r.description ?? "";
  $("findings").value = r.findings ?? "";
  $("ttp").value = r.ttp ?? "";
  $("scope").value = r.target_scope ?? "";
  $("severity").value = r.severity ?? "Low";

  await refreshViewButton(reportId); // ✅ show View PDF if exists
}

$("btnSubmit").onclick = async () => {
  $("msg").style.display = "none";
  $("ok").style.display = "none";

  try {
    await requireAuth();
    const profile = await getMyProfile();

    const payload = {
      title: $("title").value,
      description: $("description").value,
      findings: $("findings").value,
      ttp: $("ttp").value,
      target_scope: $("scope").value,
      severity: $("severity").value,
    };

    let id = reportId;

    if (!id) {
      const { data: report, error: repErr } = await supabase
        .from("reports")
        .insert({
          ...payload,
          status: "Submitted",
          department_id: profile.department_id,
          created_by: profile.user_id,
        })
        .select("report_id")
        .single();

      if (repErr) throw repErr;
      id = report.report_id;
    } else {
      const { error: upErr } = await supabase
        .from("reports")
        .update(payload)
        .eq("report_id", id)
        .eq("created_by", profile.user_id);

      if (upErr) throw upErr;
    }

    // upload PDF (optional)
    const file = $("pdf").files?.[0];
    if (file) {
      const uploaded = await uploadPdf(file, id, profile.user_id);

      const { error: attErr } = await supabase.from("attachments").insert({
        report_id: id,
        file_path: uploaded.path,
        file_name: uploaded.file_name,
        uploaded_by: profile.user_id,
      });
      if (attErr) throw attErr;
    }

    await refreshViewButton(id); // ✅ show View button after upload/save

    $("ok").textContent = reportId ? "Changes saved." : "Report submitted successfully.";
    $("ok").style.display = "block";
    setTimeout(() => (window.location.href = "dashboard.html"), 700);
  } catch (e) {
    $("msg").textContent = e.message || String(e);
    $("msg").style.display = "block";
  }
};

loadForEdit().catch((e) => {
  $("msg").textContent = e.message || String(e);
  $("msg").style.display = "block";
  $("btnSubmit").disabled = true;
});

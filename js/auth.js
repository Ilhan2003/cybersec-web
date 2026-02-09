import { supabase } from "./supabaseClient.js";

export async function signUp(email, password, name, department_id) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  // ✅ Ensure session exists (since you turned off confirm email)
  if (!data.session) {
    const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
    if (loginErr) throw loginErr;
  }

  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user.id;

  const { error: profErr } = await supabase.from("profiles").upsert({
    user_id: uid,
    email,
    name,
    department_id,
    role: "staff",
  });

  if (profErr) throw profErr;
  return data;
}


export async function signInPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://ilhan2003.github.io/cybersec-web/dashboard.html"
    }
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getMyProfile() {
  const session = await getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, name, email, role, department_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

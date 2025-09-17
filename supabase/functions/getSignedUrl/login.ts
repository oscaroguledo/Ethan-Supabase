import { createClient } from "@supabase/supabase-js";

// Read env vars from system or `.env` (if using `--env-file`)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const EMAIL = Deno.env.get("TEST_USER_EMAIL")!;
const PASSWORD = Deno.env.get("TEST_USER_PASSWORD")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
});

if (signInError) {
  console.error("❌ Login failed:", signInError.message);
  Deno.exit(1);
}

console.log("Session:", signInData.session);
const accessToken = signInData.session?.access_token;

if (!accessToken) {
  console.error("❌ No access token returned");
  Deno.exit(1);
}

// Now get the user info from the access token
const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

if (userError) {
  console.error("❌ getUser failed:", userError.message);
  Deno.exit(1);
}

console.log("🧑 User:", JSON.stringify(userData.user, null, 2));
console.log("✅ Access Token:", accessToken);

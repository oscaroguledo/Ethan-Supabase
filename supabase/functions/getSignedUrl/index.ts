import "@supabase/functions-js";
import { serve } from "std/http";
import { createClient } from "@supabase/supabase-js";

console.log("Hello from Functions!");

type Payload = {
  filePath: string;
};

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return new Response("Bad Request - JSON required", { status: 400 });
    }

    const body = (await req.json()) as Payload;
    if (!body?.filePath || typeof body.filePath !== "string") {
      return new Response("Bad Request - filePath required", { status: 400 });
    }

    const authHeader = req.headers.get("authorization") || "";
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const accessToken = tokenMatch[1];

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_BUCKET = Deno.env.get("SUPABASE_BUCKET") || "files";

    console.log({
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_BUCKET,
    });

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Server misconfiguration" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Admin client with service role key to verify token and get user
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userErr,
    } = await adminSupabase.auth.getUser(accessToken);

    if (userErr || !user) {
      console.error("User validation error:", userErr);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // RLS client: anon key + user's access token
    const rlsSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    // Query file using RLS (no need for manual owner_id check)
    const { data: file, error: fileErr } = await rlsSupabase
      .from("files")
      .select("id, path, owner_id")
      .eq("path", body.filePath)
      .limit(1)
      .maybeSingle();

    if (fileErr) {
      console.error("Database error:", fileErr);
      return new Response(
        JSON.stringify({ error: "Database error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!file) {
      return new Response(
        JSON.stringify({ error: "File not found or access denied" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate signed URL with anon key client + user token (RLs applies here too)
    const { data: signedData, error: signedErr } = await rlsSupabase.storage
      .from(SUPABASE_BUCKET)
      .createSignedUrl(body.filePath, 60);

    if (signedErr || !signedData) {
      console.error("Signed URL generation error:", signedErr);
      return new Response(
        JSON.stringify({ error: "Unable to create signed URL" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ signedUrl: signedData.signedUrl, expiresIn: 60 }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

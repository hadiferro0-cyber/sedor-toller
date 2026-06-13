// Supabase Edge Function: notify-custom
// שליחת התראה ידנית/אוטומטית לקבוצת עובדים לפי target
// פורס דרך Supabase Dashboard → Edge Functions (שם: notify-custom)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ONESIGNAL_APP_ID = "65457f7b-39d8-49cb-b69f-427ac0e522a5";
const ONESIGNAL_REST_KEY = Deno.env.get("ONESIGNAL_REST_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function buildFilters(target: string): any[] {
  // target: all | toller | patrol | admins
  if (target === "toller") {
    // טולרים = עובדים מסוג toller או both
    return [
      { field: "tag", key: "etype", relation: "=", value: "toller" },
      { operator: "OR" },
      { field: "tag", key: "etype", relation: "=", value: "both" },
    ];
  }
  if (target === "patrol") {
    return [
      { field: "tag", key: "etype", relation: "=", value: "patrol" },
      { operator: "OR" },
      { field: "tag", key: "etype", relation: "=", value: "both" },
    ];
  }
  if (target === "admins") {
    return [
      { field: "tag", key: "role", relation: "=", value: "scheduler" },
      { operator: "OR" },
      { field: "tag", key: "role", relation: "=", value: "superAdmin" },
    ];
  }
  // all = כל מי שנרשם (יש לו תג role כלשהו)
  return [{ field: "tag", key: "role", relation: "exists" }];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { target, title, message } = await req.json();
    const filters = buildFilters(target || "all");
    const body = {
      app_id: ONESIGNAL_APP_ID,
      filters,
      headings: { en: title, he: title },
      contents: { en: message, he: message },
      url: "https://hadiferro0-cyber.github.io/sedor-toller/",
    };
    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Key ${ONESIGNAL_REST_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Supabase Edge Function: notify-swap
// שולח התראת OneSignal כשמשתנה רשומה ב-swap_requests
// פורס דרך Supabase Dashboard → Edge Functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ONESIGNAL_APP_ID = "65457f7b-39d8-49cb-b69f-427ac0e522a5";
// המפתח נשמר כסוד (Secret) ב-Supabase, לא בקוד:
const ONESIGNAL_REST_KEY = Deno.env.get("ONESIGNAL_REST_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// שליחת התראה לפי תגיות (uid/role)
async function sendPush(filters: any[], title: string, message: string) {
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
  return await res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const payload = await req.json();
    // ה-trigger שולח את הרשומה ב-record
    const r = payload.record || payload;
    const status = r.status;
    const fromName = r.from_emp_name || "עובד";
    const toName = r.to_emp_name || "עובד";
    const kindLbl = r.kind === "swap" ? "החלפה" : "מסירה";

    let filters: any[] = [];
    let title = "סידור עבודה";
    let message = "";

    if (status === "pending_peer") {
      // התראה לעובד שמתבקש לאשר
      filters = [{ field: "tag", key: "uid", relation: "=", value: String(r.to_emp_id) }];
      title = "בקשת " + kindLbl + " חדשה";
      message = `${fromName} שלח/ה לך בקשת ${kindLbl}. היכנס לאשר או לדחות.`;
    } else if (status === "pending_admin") {
      // התראה לאחראי הסידור (כל מי שתויג כ-scheduler או superAdmin)
      filters = [
        { field: "tag", key: "role", relation: "=", value: "scheduler" },
        { operator: "OR" },
        { field: "tag", key: "role", relation: "=", value: "superAdmin" },
      ];
      title = "בקשה ממתינה לאישורך";
      message = `בקשת ${kindLbl} בין ${fromName} ל${toName} מחכה לאישור אחראי הסידור.`;
    } else if (status === "approved") {
      filters = [{ field: "tag", key: "uid", relation: "=", value: String(r.from_emp_id) }];
      title = "הבקשה אושרה ✅";
      message = `בקשת ה${kindLbl} שלך אושרה ובוצעה בסידור.`;
    } else if (status === "rejected") {
      filters = [{ field: "tag", key: "uid", relation: "=", value: String(r.from_emp_id) }];
      title = "הבקשה נדחתה";
      message = `בקשת ה${kindLbl} שלך נדחתה${r.reject_reason ? " — " + r.reject_reason : ""}.`;
    } else {
      return new Response(JSON.stringify({ skipped: true, status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await sendPush(filters, title, message);
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

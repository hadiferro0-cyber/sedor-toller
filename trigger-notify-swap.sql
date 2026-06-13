-- ============================================================
-- Trigger: כשמשתנה swap_requests → קריאה ל-Edge Function notify-swap
-- להריץ ב-Supabase SQL Editor (אחרי שה-Edge Function פרוסה)
-- ============================================================

-- 1) הפעלת ההרחבות הנדרשות (אם לא פעילות)
create extension if not exists pg_net with schema extensions;

-- 2) הפונקציה שקוראת ל-Edge Function
-- ⚠️ החלף את <PROJECT_REF> בכתובת הפרויקט שלך
--    (נמצא ב-Supabase → Settings → API → Project URL, החלק לפני .supabase.co)
create or replace function notify_swap_change()
returns trigger
language plpgsql
security definer
as $$
declare
  fn_url text := 'https://fvdbosumbliaqcilqrqk.supabase.co/functions/v1/notify-swap';
begin
  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type','application/json'
    ),
    body := jsonb_build_object('record', row_to_json(NEW))
  );
  return NEW;
end;
$$;

-- 3) ה-trigger עצמו — מופעל בהוספה ובעדכון סטטוס
drop trigger if exists trg_notify_swap on swap_requests;
create trigger trg_notify_swap
  after insert or update of status on swap_requests
  for each row
  execute function notify_swap_change();

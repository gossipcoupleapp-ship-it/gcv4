-- Enable the extension
create extension if not exists pg_cron;

-- Schedule the job
-- Runs at 12:00 UTC (09:00 Brasilia Time) daily
select
  cron.schedule(
    'investment-daily-update',
    '0 12 * * *',
    $$
    select
      net.http_post(
        url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-investments',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'
      ) as request_id;
    $$
  );

-- To check scheduled jobs:
-- select * from cron.job;

-- To un-schedule:
-- select cron.unschedule('investment-daily-update');

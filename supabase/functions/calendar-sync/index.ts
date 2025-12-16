
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Authenticate User
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) throw new Error('User not authenticated');

        // 2. Get Couple ID & Refresh Token
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Get Couple ID via Profile
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('couple_id')
            .eq('id', user.id)
            .single();

        if (profileError || !profile?.couple_id) throw new Error('Profile or Couple not found');

        // Get Integration
        const { data: integration, error: intError } = await supabaseAdmin
            .from('user_integrations')
            .select('google_refresh_token')
            .eq('user_id', user.id)
            .single();

        if (intError || !integration?.google_refresh_token) {
            return new Response(JSON.stringify({ error: 'No calendar connection' }), { status: 403, headers: corsHeaders });
        }

        // 3. Refresh Access Token
        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId!,
                client_secret: clientSecret!,
                refresh_token: integration.google_refresh_token,
                grant_type: 'refresh_token',
            }),
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) throw new Error('Failed to refresh Google Token');

        const accessToken = tokenData.access_token;

        // 4. Fetch Events from Google (Last 30 days + next 90 days)
        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 30);
        const timeMax = new Date();
        timeMax.setDate(timeMax.getDate() + 90);

        const calendarRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        const calendarData = await calendarRes.json();
        if (!calendarRes.ok) throw new Error(calendarData.error?.message || 'Failed to fetch Google events');

        const googleEvents = calendarData.items || [];
        let syncedCount = 0;

        // 5. Upsert Events to Supabase
        // We use google_event_id to dedup.
        for (const gEvent of googleEvents) {
            if (!gEvent.start?.dateTime && !gEvent.start?.date) continue; // Skip if no time (e.g. reminders sometimes)

            const start = gEvent.start.dateTime || gEvent.start.date;
            const end = gEvent.end.dateTime || gEvent.end.date || start; // Handling all-day events

            const eventPayload = {
                couple_id: profile.couple_id,
                title: gEvent.summary || 'Sem Título',
                start_time: start, // Supabase expects ISO string
                end_time: end,
                type: 'social', // Default for imported
                google_event_id: gEvent.id,
                assignee_id: null // Shared
            };

            // Using upsert based on google_event_id constraint?
            // "events" table might not have unique constraint on google_event_id.
            // Let's check constraints in Step 44... primary key is id.
            // If I upsert, I need a unique constraint.
            // If manual check:
            const { data: existing } = await supabaseAdmin.from('events').select('id').eq('google_event_id', gEvent.id).maybeSingle();

            if (existing) {
                await supabaseAdmin.from('events').update(eventPayload).eq('id', existing.id);
            } else {
                await supabaseAdmin.from('events').insert(eventPayload);
            }
            syncedCount++;
        }

        return new Response(JSON.stringify({ success: true, count: syncedCount }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('Calendar Sync Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});


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
        const { event } = await req.json();

        // Validate User
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) throw new Error('User not authenticated');

        // Get Refresh Token
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data: integration, error: intError } = await supabaseAdmin
            .from('user_integrations')
            .select('google_refresh_token')
            .eq('user_id', user.id)
            .single();

        if (intError || !integration?.google_refresh_token) {
            return new Response(JSON.stringify({ error: 'No calendar connection' }), { status: 403, headers: corsHeaders });
        }

        // Refresh Access Token
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

        // Create Event
        const calendarRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                summary: event.title,
                description: event.description || 'Event created by Gossip Couple',
                start: { dateTime: event.start }, // Ensure ISO format in frontend
                end: { dateTime: event.end },
            }),
        });

        const calendarData = await calendarRes.json();

        if (!calendarRes.ok) {
            console.error('Google Calendar API Error:', calendarData);
            throw new Error(calendarData.error?.message || 'Failed to create event');
        }

        return new Response(JSON.stringify({ success: true, link: calendarData.htmlLink }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('Calendar Proxy Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});

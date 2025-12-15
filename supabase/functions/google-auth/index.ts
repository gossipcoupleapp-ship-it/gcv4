
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
        const { code, redirect_uri } = await req.json();

        // Validate User
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) throw new Error('User not authenticated');

        // Exchange Code
        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

        if (!clientId || !clientSecret) {
            throw new Error('Server misconfiguration: Missing Google Credentials');
        }

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code',
            }),
        });

        const tokens = await tokenResponse.json();
        if (tokens.error) {
            console.error('Token Exchange Error:', tokens);
            throw new Error(tokens.error_description || 'Failed to exchange token');
        }

        const { refresh_token } = tokens;

        // We only care about refresh_token for long-term access.
        // If user re-auths without 'prompt=consent', refresh_token might be missing.
        // We should handle that, but for now assuming prompt=consent in frontend.

        if (refresh_token) {
            const supabaseAdmin = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            );

            const { error: dbError } = await supabaseAdmin
                .from('user_integrations')
                .upsert({
                    user_id: user.id,
                    google_refresh_token: refresh_token,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (dbError) {
                console.error('DB Error:', dbError);
                throw new Error('Failed to save integration');
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});

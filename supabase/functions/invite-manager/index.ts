import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: { headers: { Authorization: req.headers.get("Authorization")! } },
            }
        );

        // For admin actions (like updates to other profiles or reading sensitive invites), we might need service role depending on the action.
        // However, the spec says "validate_invite" returns safe data. create_invite checks P1. join_couple updates own profile.
        // Ideally, we use the user's client for RLS checks, but for 'join_couple' we might need to bypass some RLS if user doesn't have couple_id yet?
        // Actually, join_couple updates the user's OWN profile (RLS allows update own). 
        // But it needs to READ the invite which might be restricted?
        // Let's use serviceRole for the Invite logic to be safe and clean, verifying the user manually.

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { action, ...params } = await req.json();

        // 1. Get User (from Auth Header)
        const {
            data: { user },
        } = await supabaseClient.auth.getUser();

        // --- Action: GET ACTIVE INVITE (P1) ---
        if (action === "get_active_invite") {
            if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

            const { data: profile } = await supabaseAdmin
                .from("profiles")
                .select("id, couple_id, role")
                .eq("id", user.id)
                .single();

            if (!profile || profile.role !== "P1" || !profile.couple_id) {
                return new Response("Only P1 users with a couple can retrieve invites", { status: 403, headers: corsHeaders });
            }

            // check for existing pending invite
            const { data: existingInvite } = await supabaseAdmin
                .from("invites")
                .select("token")
                .eq("couple_id", profile.couple_id)
                .eq("status", "pending")
                .gt("expires_at", new Date().toISOString())
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (existingInvite) {
                return new Response(JSON.stringify({ token: existingInvite.token, url: `${params.origin || ''}/invite?token=${existingInvite.token}` }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 200,
                });
            }

            // Create new if none exists
            const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            const { error } = await supabaseAdmin
                .from("invites")
                .insert({
                    couple_id: profile.couple_id,
                    created_by: user.id,
                    token: token,
                    email: null,
                });

            if (error) throw error;

            return new Response(JSON.stringify({ token, url: `${params.origin || ''}/invite?token=${token}` }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        // --- Action: CREATE INVITE (P1 Only) ---
        if (action === "create_invite") {
            if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

            // Check if user is P1
            const { data: profile } = await supabaseAdmin
                .from("profiles")
                .select("id, couple_id, role")
                .eq("id", user.id)
                .single();

            if (!profile || profile.role !== "P1" || !profile.couple_id) {
                return new Response("Only P1 users with a couple can create invites", { status: 403, headers: corsHeaders });
            }

            // Generate secure token (simple random string for now)
            const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

            // Create Invite
            const { data: invite, error } = await supabaseAdmin
                .from("invites")
                .insert({
                    couple_id: profile.couple_id,
                    created_by: user.id,
                    token: token,
                    email: params.email || null,
                })
                .select()
                .single();

            if (error) throw error;

            return new Response(JSON.stringify({ token, url: `${params.origin || ''}/invite?token=${token}` }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        // --- Action: VALIDATE INVITE (Public/Auth) ---
        if (action === "validate_invite") {
            const { token } = params;
            if (!token) return new Response("Missing token", { status: 400, headers: corsHeaders });

            const { data: invite, error } = await supabaseAdmin
                .from("invites")
                .select(`
          *,
          couples ( name ),
          profiles!created_by ( full_name )
        `)
                .eq("token", token)
                .eq("status", "pending")
                .gt("expires_at", new Date().toISOString()) // Check non-expired
                .single();

            if (error || !invite) {
                return new Response(JSON.stringify({ valid: false, message: "Invalid or expired invite" }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 200 // Return 200 so front handles UI gracefully
                });
            }

            // Return safe info
            return new Response(JSON.stringify({
                valid: true,
                coupleName: invite.couples?.name || "Novo Casal",
                inviterName: invite.profiles?.full_name || "Seu Parceiro"
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        // --- Action: JOIN COUPLE (P2) ---
        if (action === "join_couple") {
            if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
            const { token } = params;

            // 1. Get Invite
            const { data: invite } = await supabaseAdmin
                .from("invites")
                .select("*")
                .eq("token", token)
                .eq("status", "pending")
                .single();

            if (!invite) {
                return new Response("Invalid invite", { status: 400, headers: corsHeaders });
            }

            // 2. Update Profile to P2
            const { error: updateError } = await supabaseAdmin
                .from("profiles")
                .update({
                    couple_id: invite.couple_id,
                    role: "P2",
                    onboarding_completed: false // Force them to finish onboarding if not done
                })
                .eq("id", user.id);

            if (updateError) throw updateError;

            // 3. Mark Invite Accepted
            await supabaseAdmin
                .from("invites")
                .update({ status: "accepted" })
                .eq("id", invite.id);

            return new Response(JSON.stringify({ success: true, couple_id: invite.couple_id }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        return new Response("Invalid action", { status: 400, headers: corsHeaders });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});

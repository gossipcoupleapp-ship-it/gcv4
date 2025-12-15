
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2024-06-20", // Updated to recent version
    httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        console.log("Starting create-checkout-session...");

        // 1. Env Var Check
        const priceId = Deno.env.get("STRIPE_PRICE_ID");
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

        if (!priceId || !stripeKey) {
            console.error("Missing Server Config: Price ID or Secret Key");
            throw new Error("Server Configuration Error: Missing Stripe Credentials");
        }
        console.log(`Config Loaded. Price ID: ${priceId}`);

        // 2. Auth Check
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            throw new Error("Missing Authorization Header");
        }

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            console.error("Auth Error:", userError);
            throw new Error("User not authenticated");
        }
        console.log(`User Authenticated: ${user.id}`);

        // 3. Customer Lookup / Creation
        // Optimization: We could check 'couples' table, but for now we'll let Stripe handle email processing.
        // However, standard practice is to create a Customer if one doesn't exist.
        // For simplicity in this fix, we will pass `customer_email` which auto-associates or pre-fills.
        // If we wanted to be strict: 
        // let customerId = ... check DB ... if (!customerId) customerId = await stripe.customers.create(...)

        let customerId;
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Check if user has a profile with a couple with a customer_id
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('couple_id')
            .eq('id', user.id)
            .single();

        if (profile?.couple_id) {
            const { data: couple } = await supabaseAdmin
                .from('couples')
                .select('stripe_customer_id')
                .eq('id', profile.couple_id)
                .single();
            if (couple?.stripe_customer_id) {
                customerId = couple.stripe_customer_id;
                console.log(`Found existing Stripe Customer: ${customerId}`);
            }
        }

        // If no customer ID found in our DB, we check Stripe or create one.
        if (!customerId) {
            const customers = await stripe.customers.list({ email: user.email, limit: 1 });
            if (customers.data.length > 0) {
                customerId = customers.data[0].id;
                console.log(`Found Customer in Stripe: ${customerId}`);
            } else {
                const newCustomer = await stripe.customers.create({
                    email: user.email,
                    metadata: { supabase_user_id: user.id }
                });
                customerId = newCustomer.id;
                console.log(`Created New Stripe Customer: ${customerId}`);
            }
        }

        // 4. Create Session
        const origin = req.headers.get("origin") || "http://localhost:5173";

        console.log(`Creating Session for Customer ${customerId} with Price ${priceId}`);

        const session = await stripe.checkout.sessions.create({
            customer: customerId, // Use explicit customer to avoid duplicates
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: "subscription",
            client_reference_id: user.id,
            success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/`,
            allow_promotion_codes: true,
        });

        console.log(`Session Created: ${session.url}`);

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        console.error("Function Error:", error);
        return new Response(JSON.stringify({ error: error.message || "Unknown Error" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});

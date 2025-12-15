
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2024-12-18", // Keep updated or use 2023-10-16 depending on available version
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
        // 1. Auth Check
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            throw new Error("Missing Authorization Header");
        }

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: authHeader } } }
        );

        const {
            data: { user },
        } = await supabaseClient.auth.getUser();

        if (!user) {
            throw new Error("User not found");
        }

        // 2. Get Request Data (Optional: Price ID could be passed, or use Env)
        // const { priceId } = await req.json(); 
        const priceId = Deno.env.get("STRIPE_PRICE_ID");

        if (!priceId) {
            throw new Error("Stripe Price ID not configured on server");
        }

        // 3. Create Checkout Session
        // Use origin from request or fallback to localhost for dev
        const origin = req.headers.get("origin") || "http://localhost:5173";

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"], // boleto, pix if needed
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: "subscription",
            client_reference_id: user.id, // CRITICAL: Links payment to user
            success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`, // Redirecting to root with param allows App.tsx to see it and show 'PaymentSuccess'
            cancel_url: `${origin}/`,
            customer_email: user.email,
        });

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Error creating checkout session:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400, // Or 500
        });
    }
});

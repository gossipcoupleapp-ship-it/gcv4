import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
    const signature = req.headers.get("Stripe-Signature");

    if (!signature) {
        return new Response("No Stripe signature found", { status: 400 });
    }

    try {
        const body = await req.text();
        const event = await stripe.webhooks.constructEventAsync(
            body,
            signature,
            Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "",
            undefined,
            cryptoProvider
        );

        if (event.type === "checkout.session.completed") {
            const session = event.data.object;
            const userId = session.client_reference_id;
            const customerId = session.customer;
            const subscriptionId = session.subscription;

            if (!userId) {
                console.error("No client_reference_id (user_id) found in session");
                return new Response("No user_id", { status: 400 });
            }

            // Initialize Supabase Admin Client (Service Role)
            const supabaseAdmin = createClient(
                Deno.env.get("SUPABASE_URL") ?? "",
                Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
            );

            console.log(`Processing P1 Signup for User: ${userId}`);

            // 1. Create Couple (Securely via Service Role)
            // Note: Name might be null here, updated later in Onboarding.
            const { data: couple, error: coupleError } = await supabaseAdmin
                .from("couples")
                .insert({
                    stripe_customer_id: customerId,
                    stripe_subscription_id: subscriptionId,
                    subscription_status: "active", // Assume active on successful payment
                    name: "Novo Casal", // Placeholder
                })
                .select()
                .single();

            if (coupleError) {
                console.error("Error creating couple:", coupleError);
                return new Response("Error creating couple", { status: 500 });
            }

            // 2. Update Profile (Link to Couple, Set P1)
            const { error: profileError } = await supabaseAdmin
                .from("profiles")
                .update({
                    couple_id: couple.id,
                    role: "P1",
                    risk_profile: "medium", // Default
                })
                .eq("id", userId);

            if (profileError) {
                console.error("Error updating profile:", profileError);
                return new Response("Error updating profile", { status: 500 });
            }

            console.log(`Successfully setup Couple ${couple.id} for P1 ${userId}`);
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
});

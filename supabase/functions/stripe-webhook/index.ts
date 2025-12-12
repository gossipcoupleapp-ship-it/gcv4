
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
    const signature = req.headers.get("Stripe-Signature");

    if (!signature) {
        return new Response("No signature", { status: 400 });
    }

    const body = await req.text();
    const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    let event;

    try {
        event = await stripe.webhooks.constructEventAsync(
            body,
            signature,
            endpointSecret ?? "",
            undefined,
            cryptoProvider
        );
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const customerEmail = session.customer_details?.email;
        const customerId = session.customer;

        if (customerEmail) {
            // Initialize Supabase Admin
            const supabaseAdmin = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SERVICE_ROLE_KEY') ?? ''
            );

            // 1. Find User by Email
            const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
            const user = users?.find(u => u.email === customerEmail);

            if (user) {
                console.log(`User found: ${user.id}`);

                // 2. Find Profile to get Couple ID
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('couple_id')
                    .eq('id', user.id)
                    .single();

                if (profile?.couple_id) {
                    // 3. Update existing couple
                    await supabaseAdmin
                        .from('couples')
                        .update({
                            subscription_status: 'active',
                            stripe_customer_id: customerId
                        })
                        .eq('id', profile.couple_id);
                    console.log(`Updated couple ${profile.couple_id} to active.`);
                } else {
                    // 4. No couple? Create one! (Fallback for P1)
                    console.log("Creating new couple for user...");
                    const { data: newCouple, error: coupleError } = await supabaseAdmin
                        .from('couples')
                        .insert({
                            name: 'My Couple',
                            subscription_status: 'active',
                            stripe_customer_id: customerId,
                            financial_risk_profile: 'medium'
                        })
                        .select()
                        .single();

                    if (newCouple && !coupleError) {
                        await supabaseAdmin
                            .from('profiles')
                            .update({ couple_id: newCouple.id, role: 'P1' })
                            .eq('id', user.id);
                        console.log(`Created couple ${newCouple.id} and linked to user ${user.id}`);
                    } else {
                        console.error("Failed to create couple:", coupleError);
                    }
                }
            } else {
                console.error(`User not found for email: ${customerEmail}`);
            }
        } else {
            console.error("No customer email in session");
        }
    }

    return new Response(JSON.stringify({ received: true }), {
        headers: { "Content-Type": "application/json" },
    });
});

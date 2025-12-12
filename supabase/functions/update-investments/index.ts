
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 0. Setup Supabase Admin (Bypass RLS)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Get unique symbols
        const { data: investments, error: fetchError } = await supabaseAdmin
            .from('investments')
            .select('symbol, couple_id')

        if (fetchError) throw fetchError

        // Dedup symbols for API efficiency
        const uniqueSymbols = [...new Set(investments.map(i => i.symbol))]

        if (uniqueSymbols.length === 0) {
            return new Response(JSON.stringify({ message: 'No investments found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 2. Query Gemini for Real-Time Prices
        const apiKey = Deno.env.get('API_KEY') || Deno.env.get('GEMINI_API_KEY')
        const model = 'gemini-1.5-flash' // Using stable Flash model
        const prompt = `
      For the following financial assets, return a JSON object where keys are the symbols and values are objects containing 'price' (number) and 'change_percent' (number, e.g. -2.5 for -2.5% drop).
      
      Assets: ${uniqueSymbols.join(', ')}
      
      Return ONLY valid JSON. Logic:
      - Use the most recent market close or current price.
      - If crypto, use real-time.
      
      Example output format:
      {
        "AAPL": { "price": 150.20, "change_percent": 1.5 },
        "BTC": { "price": 50000.00, "change_percent": -3.2 }
      }
    `

        const geminiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        })

        const geminiData = await geminiResp.json()

        if (geminiData.error) {
            throw new Error(`Gemini API Error: ${geminiData.error.message}`)
        }

        const textResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

        // Parse JSON cleanly
        const jsonStr = textResponse.replace(/```json/g, '').replace(/```/g, '').trim()
        const prices = JSON.parse(jsonStr)

        console.log("Prices fetched:", prices);

        // 3. Update DB & Generate Insights
        let updatesCount = 0;

        // We iterate the original investments list to notify/update correctly or just update by symbol?
        // Batch update by symbol is more efficient for prices.
        for (const symbol of Object.keys(prices)) {
            const pData = prices[symbol]

            // A. Update Investment Value
            const { error: updateError } = await supabaseAdmin
                .from('investments')
                .update({
                    current_price: pData.price,
                    // If we had a 'change_percent' column we'd update it too, but spec only had current_price.
                    // We can update updated_at implicitly.
                })
                .eq('symbol', symbol)

            if (updateError) {
                console.error(`Failed to update ${symbol}`, updateError)
            } else {
                updatesCount++;
            }

            // B. Trigger Insights (Passive Intelligence)
            // If volatility > 5%, notify all couples holding this asset.
            if (Math.abs(pData.change_percent) >= 5) {
                // Find couples owning this symbol
                const couplesToNotify = investments.filter(i => i.symbol === symbol).map(i => i.couple_id)
                const uniqueCouples = [...new Set(couplesToNotify)]

                for (const cId of uniqueCouples) {
                    const moveDir = pData.change_percent > 0 ? '🚀 surged' : '🔻 dropped';
                    // Create an Event or Task? User asked for Event or "Review Portfolio" task.
                    // Let's create a Task for high priority review.
                    await supabaseAdmin.from('tasks').insert({
                        couple_id: cId,
                        title: `Review ${symbol}: ${moveDir} ${pData.change_percent}%`,
                        priority: 'high',
                        deadline: new Date().toISOString(), // Today
                        financial_impact: 0
                    })
                }
            }
        }

        return new Response(JSON.stringify({ success: true, symbols_updated: updatesCount }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error("Function Error:", error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})

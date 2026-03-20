import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { corsHeaders, errorResponse } from "../_shared/error-handler.ts"

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { start_date, end_date } = await req.json()

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Get invoices and payments for the period
        const { data: factures, error: fErr } = await supabaseAdmin
            .from('factures')
            .select('*, clients(name)')
            .gte('date', start_date)
            .lte('date', end_date)
            .neq('status', 'brouillon')

        const { data: paiements, error: pErr } = await supabaseAdmin
            .from('paiements')
            .select('*, factures(number, clients(name))')
            .gte('payment_date', start_date)
            .lte('payment_date', end_date)
            .eq('validation_status', 'approved')

        if (fErr || pErr) {
            return errorResponse(fErr || pErr)
        }

        // 2. Format FEC (18 mandatory columns)
        const columns = [
            "JournalCode", "JournalLib", "EcritureNum", "EcritureDate", "CompteNum", "CompteLib",
            "CompteAuxNum", "CompteAuxLib", "PieceRef", "PieceDate", "EcritureLib", "Debit",
            "Credit", "EcritureLet", "DateLet", "ValidDate", "Montantdevise", "Idevise"
        ]

        const lines = [columns.join("\t")]
        let ecritureNum = 1

        const formatDate = (d: string) => d.slice(0, 10).replace(/-/g, '')

        // Add invoices (Journal de Ventes)
        for (const f of (factures || [])) {
            const date = formatDate(f.date)
            const clientName = f.clients?.name || 'Client Inconnu'
            const totalHt = Number(f.total_ht || 0)
            const totalTtc = Number(f.total_ttc || 0)
            const tva = totalTtc - totalHt

            // Line 1: Customer Account (Debit)
            lines.push([
                "VT", "VENTES", ecritureNum, date, "411000", "CLIENTS",
                f.client_id, clientName, f.number, date, `Facture ${f.number}`,
                totalTtc.toFixed(2), "0.00", "", "", date, "", ""
            ].join("\t"))

            // Line 2: Revenue Account (Credit)
            lines.push([
                "VT", "VENTES", ecritureNum, date, "706000", "PRESTATIONS",
                "", "", f.number, date, `Facture ${f.number}`,
                "0.00", totalHt.toFixed(2), "", "", date, "", ""
            ].join("\t"))

            // Line 3: VAT Account (Credit)
            if (tva > 0) {
                lines.push([
                    "VT", "VENTES", ecritureNum, date, "445710", "TVA COLLECTEE",
                    "", "", f.number, date, `TVA sur ${f.number}`,
                    "0.00", tva.toFixed(2), "", "", date, "", ""
                ].join("\t"))
            }

            ecritureNum++
        }

        // Add payments (Journal de Banque)
        for (const p of (paiements || [])) {
            const date = formatDate(p.payment_date)
            const clientName = p.factures?.clients?.name || 'Client Inconnu'
            const docNumber = p.factures?.number || 'Inconnu'
            const clientId = p.factures?.client_id || p.user_id
            const amount = Number(p.amount || 0)

            // Line 1: Bank Account (Debit)
            lines.push([
                "BQ", "BANQUE", ecritureNum, date, "512000", "BANQUE",
                "", "", docNumber, date, `Paiement ${docNumber}`,
                amount.toFixed(2), "0.00", "", "", date, "", ""
            ].join("\t"))

            // Line 2: Customer Account (Credit)
            lines.push([
                "BQ", "BANQUE", ecritureNum, date, "411000", "CLIENTS",
                clientId, clientName, docNumber, date, `Paiement ${docNumber}`,
                "0.00", amount.toFixed(2), "", "", date, "", ""
            ].join("\t"))

            ecritureNum++
        }

        const content = lines.join("\r\n")

        return new Response(content, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': `attachment; filename="FEC_${start_date.slice(0, 10)}_${end_date.slice(0, 10)}.txt"`
            }
        })
    } catch (err) {
        return errorResponse(err)
    }
})

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import nodemailer from "npm:nodemailer@6.9.16"
import { corsHeaders, errorResponse } from "../_shared/error-handler.ts"

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const GMAIL_USER = Deno.env.get("GMAIL_USER");
        const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

        if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
            return errorResponse("Gmail credentials not configured")
        }

        // 1. Find teams with auto-reminders enabled
        const { data: teams, error: tErr } = await supabaseAdmin
            .from('teams')
            .select('id, name')
            .eq('auto_reminder_enabled', true)

        if (tErr) {
            return errorResponse(tErr)
        }

        if (!teams || teams.length === 0) {
            return new Response(JSON.stringify({ message: "No teams with auto-reminders enabled", results: [] }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const results = []

        for (const team of teams) {
            // 2. Find overdue invoices for this team
            const { data: factures, error: fErr } = await supabaseAdmin
                .from('factures')
                .select('*, clients(name, email)')
                .eq('team_id', team.id)
                .eq('status', 'envoyée')
                .lt('due_date', new Date().toISOString())

            if (fErr || !factures) {
                if (fErr) console.error(`Factures fetch error for team ${team.id}:`, fErr)
                continue
            }

            for (const f of factures) {
                // 3. Check for recent reminders (within last 7 days)
                const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
                const { data: recentReminders } = await supabaseAdmin
                    .from('payment_reminders_log')
                    .select('id')
                    .eq('facture_id', f.id)
                    .gte('sent_at', sevenDaysAgo)

                if (recentReminders && recentReminders.length > 0) continue

                // 4. Send reminder email
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const clientEmail = (f.clients as any)?.email
                if (!clientEmail) continue

                const transporter = nodemailer.createTransport({
                    host: "smtp.gmail.com",
                    port: 465,
                    secure: true,
                    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
                })

                const subject = `RAPPEL : Facture en attente ${f.number} - ${team.name}`
                const html = `
                    <div style="font-family: sans-serif; padding: 20px; line-height: 1.6; color: #333;">
                        <h2 style="color: #c2410c;">Rappel de paiement</h2>
                        <p>Bonjour,</p>
                        <p>Sauf erreur de notre part, le paiement de la facture <strong>${f.number}</strong> d'un montant de <strong>${Number(f.total_ttc).toLocaleString('fr-FR')} €</strong> est en attente depuis le ${new Date(f.due_date).toLocaleDateString('fr-FR')}.</p>
                        <p>Nous vous remercions de bien vouloir procéder au règlement dans les plus brefs délais.</p>
                        <p style="margin-top: 30px;">Cordialement,<br><strong>L'équipe ${team.name}</strong></p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="font-size: 11px; color: #999;">Ceci est un message automatique généré par Planify.</p>
                    </div>
                `

                try {
                    await transporter.sendMail({
                        from: `"${team.name}" <${GMAIL_USER}>`,
                        to: clientEmail,
                        subject,
                        html,
                    })

                    // 5. Log reminder
                    await supabaseAdmin.from('payment_reminders_log').insert({
                        facture_id: f.id,
                        team_id: team.id,
                        reminder_type: 'Auto-Rappel',
                        recipient_email: clientEmail
                    })

                    results.push({ facture: f.number, status: 'reminder_sent' })
                } catch (e) {
                    console.error(`Mail delivery error for ${f.number}:`, e)
                    results.push({ facture: f.number, status: 'error', error: e.message })
                }
            }
        }

        return new Response(JSON.stringify({ results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    } catch (err) {
        return errorResponse(err)
    }
})

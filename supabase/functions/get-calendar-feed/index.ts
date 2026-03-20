import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const url = new URL(req.url)
    const token = url.searchParams.get('token')

    if (!token) {
        return new Response("Missing token", { status: 400 })
    }

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Trouver l'utilisateur par son token
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('user_id, first_name, last_name')
        .eq('calendar_token', token)
        .single()

    if (profileError || !profile) {
        return new Response("Invalid token", { status: 401 })
    }

    // 2. Chercher les missions (assigné ou créateur)
    // On récupère d'abord les IDs de missions assignées
    const { data: assignments } = await supabaseAdmin
        .from('mission_assignments')
        .select('mission_id')
        .eq('user_id', profile.user_id)

    const assignedMissionIds = assignments?.map(a => a.mission_id) || []

    const { data: missions, error: missionsError } = await supabaseAdmin
        .from('missions')
        .select('*, clients(name)')
        .or(`user_id.eq.${profile.user_id},id.in.(${assignedMissionIds.length > 0 ? assignedMissionIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
        .neq('status', 'annulée')

    if (missionsError) {
        return new Response("Error fetching missions", { status: 500 })
    }

    // 3. Générer le format iCal (RFC 5545)
    const ical = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Planify//NONSGML v1.0//FR",
        "X-WR-CALNAME:Planify - " + (profile.first_name || "Missions"),
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH"
    ]

    const formatDate = (dateStr: string) => {
        return dateStr.replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    for (const mission of (missions || [])) {
        if (!mission.start_date || !mission.end_date) continue

        ical.push("BEGIN:VEVENT")
        ical.push(`UID:${mission.id}@planify.app`)
        ical.push(`DTSTAMP:${formatDate(new Date().toISOString())}`)
        ical.push(`DTSTART:${formatDate(mission.start_date)}`)
        ical.push(`DTEND:${formatDate(mission.end_date)}`)
        ical.push(`SUMMARY:${mission.title}`)
        ical.push(`LOCATION:${(mission.location || "").replace(/,/g, '\\,')}`)
        ical.push(`DESCRIPTION:Client: ${mission.clients?.name || 'Inconnu'}\\nType: ${mission.event_type || 'N/A'}\\nNotes: ${(mission.description || "").replace(/\n/g, '\\n')}`)
        ical.push("END:VEVENT")
    }

    ical.push("END:VCALENDAR")

    return new Response(ical.join("\r\n"), {
        headers: {
            ...corsHeaders,
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'attachment; filename="missions.ics"'
        }
    })
})

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse } from "../_shared/error-handler.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Unauthorized", 401);
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return errorResponse("Session invalide", 401);
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!apiKey) {
      throw new Error('Missing Google Maps API Key')
    }

    const { origin, destination } = await req.json()
    if (!origin || !destination) {
      throw new Error('Origin and destination are required')
    }

    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
    url.searchParams.append('origins', origin)
    url.searchParams.append('destinations', destination)
    url.searchParams.append('key', apiKey)
    url.searchParams.append('language', 'fr')
    url.searchParams.append('units', 'metric')

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${data.status}`)
    }

    const row = data.rows[0];
    const element = row.elements[0];

    if (element.status !== 'OK') {
      throw new Error(`Distance Matrix error: ${element.status}`)
    }

    const distanceKm = element.distance.value / 1000;
    const durationText = element.duration.text;

    return new Response(
      JSON.stringify({
        success: true,
        distance_km: distanceKm,
        duration_text: durationText,
        distance_text: element.distance.text,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: unknown) {
    return errorResponse(error);
  }
})

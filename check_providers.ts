import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
// service role key if available, else standard key
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPrestataires() {
    console.log("Checking team_members for prestataires...");
    const { data, error } = await supabase.from('team_members').select('*').eq('role', 'prestataire');
    if (error) {
        console.error("Error fetching team_members:", error.message || error);
    } else {
        console.log("Team members with role prestataire:", data);
    }
}

checkPrestataires();

import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTeams() {
    const { data, error } = await supabase.from('team_members').select('role');
    console.log("All team member roles:", data?.map(d => d.role));
}

checkTeams();

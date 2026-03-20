import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase.from('providers').select('is_onboarded').limit(1);
    if (error) {
        console.error("Schema error:", error);
    } else {
        console.log("is_onboarded exists!");
    }
}

checkSchema();

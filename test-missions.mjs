import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function test() {
  const { data, error } = await supabase
    .from("missions")
    .select("*, clients(name, company, phone), devis(id, number, status, total_ht, total_ttc), mission_assignments(user_id, profiles(first_name, last_name, avatar_url))")
    .order("start_date", { ascending: false });

  if (error) {
    console.error("Query Error:", error.message, error.details, error.hint);
  } else {
    console.log("Found missions:", data?.length);
  }
}

test();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function test() {
  const { data, error } = await supabase.from('mission_assignments').select('*').limit(1);
  console.log("Mission Assig cols:", Object.keys(data?.[0] || {}), error);
}

test();

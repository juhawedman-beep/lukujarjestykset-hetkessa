// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase'; // luodaan automaattisesti myöhemmin

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper-funktio demo-datan seedaamiseen (kutsu kerran)
export async function seedDemoData() {
  // Opettajat
  await supabase.from('teachers').insert([
    { first_name: 'Anna', last_name: 'Virtanen', subjects: ['math', 'physics'] },
    { first_name: 'Matti', last_name: 'Korhonen', subjects: ['finnish', 'history'] },
    // Lisää tarvittaessa lisää
  ]);

  // Luokat, aineet, tilat jne. (voit laajentaa)
  console.log('✅ Demo-data seedattu Supabaseen!');
}

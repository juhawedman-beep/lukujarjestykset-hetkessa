// src/lib/logger.ts
import { supabase } from './supabaseClient';

export const logEvent = async (
  event_type: string,
  details: any = {}
) => {
  try {
    await supabase.from('app_logs').insert({
      event_type,
      details: details || {},
      user_id: supabase.auth.getUser()?.data.user?.id || null,
    });
  } catch (err) {
    console.error('Logging failed:', err);
  }
};

// Käyttöesimerkit:
export const logGenerate = (count: number, options: any) => 
  logEvent('generate', { count, options });

export const logExport = (format: string) => 
  logEvent('export', { format });

export const logError = (error: any, context: string) => 
  logEvent('error', { message: error.message, context });

import { createServiceClient } from '../supabase/server';

export async function recordUserEvent(userId: string, eventType: 'visit' | 'click' | 'purchase', payload: any = {}) {
  try {
    const supabase = await createServiceClient();
    const table = 'user_events';
    const record = {
      user_id: userId,
      event_type: eventType,
      payload: JSON.stringify(payload),
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from(table).insert([record]);
    if (error) {
      console.warn('Failed to record retention event', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Retention recording skipped (no supabase)', err);
    return false;
  }
}

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SB_URL = 'https://fzxjfwimunxuehxqglcm.supabase.co';
const SB_KEY = 'sb_publishable_NIOtMGAQkjSw0rIcXZwWtg__RKkxjvP';

export const supabase = createClient(SB_URL, SB_KEY);

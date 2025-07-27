import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// SupabaseプロジェクトのURLとanon keyを設定します。
// ※これらのキーはSupabaseプロジェクト管理画面の「Project Settings」>「API」で確認できます。
//const supabaseUrl = 'YOUR_SUPABASE_URL'; // 例: https://xxxxxxxxxx.supabase.co
//const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'; // 例: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
// Supabaseクライアントを作成してエクスポート
export const supabase = createClient(supabaseUrl, supabaseAnonKey);


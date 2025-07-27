import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// SupabaseプロジェクトのURLとanon keyを設定します。
// ※これらのキーはSupabaseプロジェクト管理画面の「Project Settings」>「API」で確認できます。
const supabaseUrl = 'https://akkmberiwvqfeuozesne.supabase.co'; // 例: https://xxxxxxxxxx.supabase.co
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra21iZXJpd3ZxZmV1b3plc25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MjIyMjksImV4cCI6MjA2OTA5ODIyOX0.9Xg-6Ubqle9ZkfzNIMO61aOZJ6xPeRF3UTEwFGRq2P8'; // 例: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
//const supabaseUrl = process.env.SUPABASE_URL;
//const supabaseKey = process.env.SUPABASE_ANON_KEY;
// Supabaseクライアントを作成してエクスポート
export const supabase = createClient(supabaseUrl, supabaseAnonKey);


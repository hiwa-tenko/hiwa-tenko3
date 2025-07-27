import { supabase } from './supabaseClient.js';

const checkUserSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    // 現在のページのファイル名を取得
    const path = window.location.pathname;
    // パスが "/" の場合は "index.html" として扱う
    const currentPage = path === '/' ? 'index.html' : path.substring(path.lastIndexOf('/') + 1);

    // ログインが不要なページのリスト
    const publicPages = ['login.html', 'signup.html'];

    if (!session) {
        // 未ログイン状態
        if (!publicPages.includes(currentPage)) {
            // ログインが必要なページにいる場合、ログインページにリダイレクト
            // 履歴に残らないようにreplaceを使用し、ルートからの絶対パスを指定
            window.location.replace('/login.html');
        }
    } else {
        // ログイン済み
        if (publicPages.includes(currentPage)) {
            // ログインページや新規登録ページにいる場合、メインページにリダイレクト
            window.location.replace('/index.html');
        }
    }
};

// ページ読み込み時にセッションをチェック
checkUserSession();

// ログアウト処理
document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logout-button');

    if (logoutButton) {
        logoutButton.addEventListener('click', async (event) => {
            event.preventDefault();
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('ログアウトエラー', error);
            } else {
                // ログアウト成功後、ログインページにリダイレクト
                window.location.replace('/login.html');
            }
        });
    }
});
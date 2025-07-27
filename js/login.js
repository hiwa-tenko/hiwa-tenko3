import { supabase } from './supabaseClient.js';

const loginForm = document.getElementById('loginForm');
const errorMessageDiv = document.getElementById('errorMessage');

loginForm.addEventListener('submit', async (event) => {
    // フォームのデフォルト送信動作をキャンセル
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // ボタンを無効化し、エラーメッセージをクリア
    loginForm.querySelector('button').disabled = true;
    errorMessageDiv.textContent = '';

    try {
        // SupabaseのsignInWithPasswordメソッドでログイン処理
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        // ログイン成功後、index.htmlにリダイレクト
        window.location.href = 'index.html';

    } catch (error) {
        errorMessageDiv.textContent = 'メールアドレスまたはパスワードが間違っています。';
        loginForm.querySelector('button').disabled = false; // ボタンを再度有効化
    }
});
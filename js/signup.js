import { supabase } from './supabaseClient.js';

const signupForm = document.getElementById('signupForm');
const messageDiv = document.getElementById('message');
const submitButton = signupForm.querySelector('button');

signupForm.addEventListener('submit', async (event) => {
    // フォームのデフォルトの送信動作をキャンセル
    event.preventDefault();

    // フォームから各入力値を取得
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const company_name = document.getElementById('company_name').value;
    const driver_name = document.getElementById('driver_name').value;
    const vehicle_number = document.getElementById('vehicle_number').value;

    // 処理中はボタンを無効化し、メッセージを初期化
    submitButton.disabled = true;
    messageDiv.textContent = '登録処理中...';
    messageDiv.className = 'message-text'; // スタイルをリセット

    try {
        // SupabaseのsignUpメソッドでユーザー登録
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                // user_metadataに追加情報を保存
                data: {
                    company_name: company_name,
                    driver_name: driver_name,
                    vehicle_number: vehicle_number,
                }
            }
        });

        if (error) throw error;

        // Supabaseのデフォルト設定では、確認メールが送信されます。
        messageDiv.textContent = '確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。';
        messageDiv.classList.add('success-message');
        signupForm.reset(); // 成功したらフォームをクリア

    } catch (error) {
        console.error('登録エラー:', error);
        messageDiv.textContent = `登録エラー: ${error.message}`;
        messageDiv.classList.add('error-message');
    } finally {
        // 処理が完了したらボタンを再度有効化
        submitButton.disabled = false;
    }
});
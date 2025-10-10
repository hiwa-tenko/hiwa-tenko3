import { supabase } from '../js/supabaseClient.js';

const restoreForm = document.getElementById('restoreForm');
const successMessageDiv = document.getElementById('successMessage');
const errorMessageDiv = document.getElementById('errorMessage');

restoreForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email').value;

    restoreForm.querySelector('button').disabled = true;
    successMessageDiv.textContent = '';
    errorMessageDiv.textContent = '';

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'https://hiwa.megao.dev/password-reset.html',
        });

        if (error) throw error;

        successMessageDiv.textContent = 'パスワードリセット用のメールを送信しました。メールをご確認ください。';

    } catch (error) {
        errorMessageDiv.textContent = 'エラーが発生しました：' + error.message;
    } finally {
        restoreForm.querySelector('button').disabled = false;
    }
});

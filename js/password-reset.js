import { supabase } from './supabaseClient.js';

const passwordResetForm = document.getElementById('passwordResetForm');
const successMessageDiv = document.getElementById('successMessage');
const errorMessageDiv = document.getElementById('errorMessage');

passwordResetForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;

    if (password !== passwordConfirm) {
        errorMessageDiv.textContent = 'パスワードが一致しません。';
        return;
    }

    passwordResetForm.querySelector('button').disabled = true;
    successMessageDiv.textContent = '';
    errorMessageDiv.textContent = '';

    try {
        const { error } = await supabase.auth.updateUser({ password: password });

        if (error) throw error;

        successMessageDiv.textContent = 'パスワードが正常に更新されました。';

    } catch (error) {
        errorMessageDiv.textContent = 'エラーが発生しました：' + error.message;
    } finally {
        passwordResetForm.querySelector('button').disabled = false;
    }
});

document.addEventListener('DOMContentLoaded', () => {

    // script.jsから必要な定数をコピー
    const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw9WmBmnTBknedyvVgZ0HAyNYhTVzu9aesYue9GAP2GwMN_XbtzD9qJaHJC8SO_9yX8/exec';
    const REPORT_HISTORY_KEY = 'reportHistory';
    const DRIVER_NAME_KEY = 'driverName';

    // restore.htmlにある要素を取得
    const restoreButton = document.getElementById('restoreButton');
    const nameInput = document.getElementById('name');
    const passwordInput = document.getElementById('password');
    const messageDiv = document.getElementById('message');

    // ページ読み込み時に、前回入力した運転者名をフォームに設定
    if (nameInput) {
        const savedName = localStorage.getItem(DRIVER_NAME_KEY);
        if (savedName) {
            nameInput.value = savedName;
        }
    }

    // 復元ボタンにクリックイベントを設定
    if (restoreButton && nameInput && passwordInput && messageDiv) {
        restoreButton.addEventListener('click', () => {
            const driverName = nameInput.value.trim();
            const password = passwordInput.value;

            if (!driverName) {
                messageDiv.textContent = '運転者氏名を入力してください。';
                messageDiv.className = 'error';
                return;
            }

            if (!password) {
                messageDiv.textContent = 'パスワードを入力してください。';
                messageDiv.className = 'error';
                return;
            }

            // 処理中のメッセージを表示し、ボタンを無効化
            messageDiv.textContent = 'サーバーから履歴を復元しています...';
            messageDiv.className = 'info';
            restoreButton.disabled = true;

            // GASに送信するデータを作成
            const data = {
                action: 'getHistory',
                name: driverName,
                password: password
            };

            // タイムアウト処理（15秒）
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            // script.jsと同様にPOSTリクエストで送信
            fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                signal: controller.signal,
            })
            .then(response => {
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error(`サーバーエラー (ステータス: ${response.status})`);
                }
                return response.json();
            })
            .then(data => {
                // GASから成功レスポンスと履歴データが返ってきた場合
                if (data.status === 'success' && Array.isArray(data.history)) {
                    // GASから受け取ったUTC日時文字列を、ブラウザのローカルタイムゾーンに基づいた
                    // 'YYYY-MM-DDTHH:mm' 形式の文字列に変換する関数
                    const convertUTCToLocalISOFormat = (utcString) => {
                        if (!utcString) {
                            return null;
                        }
                        // UTC文字列からDateオブジェクトを生成
                        const date = new Date(utcString);

                        // getFullYear() などはブラウザのローカルタイムゾーンの値を返す
                        const year = date.getFullYear();
                        const month = (date.getMonth() + 1).toString().padStart(2, '0');
                        const day = date.getDate().toString().padStart(2, '0');
                        const hours = date.getHours().toString().padStart(2, '0');
                        const minutes = date.getMinutes().toString().padStart(2, '0');

                        // script.jsで保存される形式と同じ 'YYYY-MM-DDTHH:mm' にする
                        return `${year}-${month}-${day}T${hours}:${minutes}`;
                    };

                    // 復元した履歴データのstart/endをローカルタイムに変換
                    const correctedHistory = data.history.map(record => ({
                        ...record,
                        start: convertUTCToLocalISOFormat(record.start),
                        end: convertUTCToLocalISOFormat(record.end),
                    }));

                    localStorage.setItem(REPORT_HISTORY_KEY, JSON.stringify(correctedHistory));

                    messageDiv.textContent = `履歴の復元に成功しました。(${correctedHistory.length}件) \nメインページに戻って「点呼の履歴」を確認してください。`;
                    messageDiv.className = 'success';
                } else {
                    // GASがエラーを返した場合
                    throw new Error(data.message || '無効なデータが返されました。');
                }
            })
            .catch(error => {
                if (error.name === 'AbortError') {
                    messageDiv.textContent = 'サーバーからの応答がタイムアウトしました。';
                } else {
                    messageDiv.textContent = '履歴の復元に失敗しました: ' + error.message;
                }
                messageDiv.className = 'error';
                console.error('Error:', error);
            })
            .finally(() => {
                // ボタンを再度有効化
                restoreButton.disabled = false;
            });
        });
    }
});
//test2_Hiwa点呼記録

// supabaseクライアントをインポート
import { supabase } from './js/supabaseClient.js';

//LocalStorageに保存する期間（日）
const LSperiod = 15;


const form = document.getElementById('reportForm');
const submitButton = document.getElementById('submitButton');
const startEnd = document.getElementById('start_end');
const messageText = document.getElementById('message_text');
const overlay = document.getElementById('overlay');
const loadingOverlay = document.getElementById('loading-overlay');
const overlayMessage = document.getElementById('overlay-message');
const currentDateDiv = document.getElementById('currentDate');
const currentTimeDiv = document.getElementById('currentTime');
const startTimeInput = document.getElementById('start');
const endTimeInput = document.getElementById('end');

const nameInput = document.getElementById('name');
const numberInput = document.getElementById('number');

const tenkoInput = document.getElementById('tenko');
const tenko_detailInput = document.getElementById('tenko_detail');
const tenko_nameInput = document.getElementById('tenko_name');
const tenkoDetailGroup = document.getElementById('tenko-detail-group');

const alcohol_checkerInput = document.getElementById('alcohol_checker');
const alcohol_checker_detailInput = document.getElementById('alcohol_checker_detail');

const drunk_checkInput = document.getElementById('drunk_check');
//const drunk_check_detailInput = document.getElementById('drunk_check_detail');
const alcoholDetailGroup = document.getElementById('alcohol-detail-group');

const health_checkInput = document.getElementById('health_check');
const health_detailInput = document.getElementById('health_detail');
const healthDetailGroup = document.getElementById('health-detail-group');

const daily_checkInput = document.getElementById('daily_check');
const daily_detailInput = document.getElementById('daily_detail');
const dailyDetailGroup = document.getElementById('daily-detail-group');

const order_listInput = document.getElementById('order_list');

//const historyList = document.getElementById('history_list'); // 履歴表示用のコンテナ
//const historyButton = document.getElementById('history_button');
const linkTop = document.getElementById('link_top');    //トップに戻る
//const buttonImage = historyButton.querySelector('img'); // ボタン内の画像を取得

const DRIVER_NAME_KEY = 'driverName';
const VEHICLE_NUMBER_KEY = 'vehicleNumber';
const TENKO_NAME_KEY = 'tenkoName';
const REPORT_HISTORY_KEY = 'reportHistory'; // 履歴保存用のキー
const START_TIME_KEY = 'startTime';
const END_TIME_KEY = 'endTime';

const FORM_DATA_KEY = 'unsentFormData'; // 未送信のフォームデータ保存用のキー
// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
//const API_URL = 'http://localhost:3001/api/reports';// デプロイ後にRenderのURLに書き換える。
const API_URL = 'https://hiwa-tenko-backend.onrender.com/api/reports';

// デプロイしたGASのウェブアプリURL(受信記録２)mega.osada.sf@gmail.com
//const GAS_APP_URL = 'https://script.google.com/macros/s/AKfycbw9WmBmnTBknedyvVgZ0HAyNYhTVzu9aesYue9GAP2GwMN_XbtzD9qJaHJC8SO_9yX8/exec';
// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

// 現在年月日を表示する関数
function displayCurrentDate() {
    if (currentDateDiv) {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const week = ['日', '月', '火', '水', '木', '金', '土'];
        const dayOfWeek = week[now.getDay()];
        currentDateDiv.textContent = `${year}年${month}月${day}日（${dayOfWeek}）`;
    }
}
// 現在時刻を表示する関数
function displayCurrentTime() {
    if (currentTimeDiv) {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2);
        const minutes = now.getMinutes().toString().padStart(2, '0');
        currentTimeDiv.textContent = `${hours}時${minutes}分`;
    }
}

// ページ読み込み時と1分ごとに時刻を更新
displayCurrentDate();
setInterval(displayCurrentDate, 60000); // 60000ミリ秒 = 1分

displayCurrentTime();
setInterval(displayCurrentTime, 60000); // 60000ミリ秒 = 1分

// datetime-local input用のフォーマットで現在日時を返す関数
function getFormattedCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// ローディングオーバーレイを非表示にする関数
const hideLoadingOverlay = () => {
    if (loadingOverlay) {
        // フェードアウト効果のためにopacityを変更
        loadingOverlay.style.opacity = '0';
        // transitionの完了後にdisplay: noneを設定
        setTimeout(() => {
            loadingOverlay.classList.add('hidden');
        }, 100); // 0.5秒のCSS transitionに合わせる
    }
};

// ページ表示時にローディングオーバーレイを表示し、0.5秒後に非表示にする関数
const showAndHideLoadingOverlay = () => {
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.style.opacity = '1';
        setTimeout(hideLoadingOverlay, 500); // 0.5秒後に非表示
    }
};

//開始or終了 点呼ボタンがクリックされた
const handleFormSubmit = async (e) => { // async関数に変更
    e.preventDefault(); // デフォルトのフォーム送信を停止

    //前回の送信からn時間以内だった場合は送信をブロック
    const nHours = 1; // n時間
    const limitTime = nHours * 60 * 60 * 1000; // n時間を表すミリ秒
    const lastSubmissionTimeValue = localStorage.getItem(START_TIME_KEY) || localStorage.getItem(END_TIME_KEY);

    if (lastSubmissionTimeValue) { // 前回の送信記録がある場合のみチェック
        const elapsedTime = new Date().getTime() - new Date(lastSubmissionTimeValue).getTime();

        if (elapsedTime < limitTime) {
            //const passedMinutes = Math.floor(elapsedTime / (60 * 1000));
            // 確認ダイアログを表示
            const isConfirmed = confirm(
                `本当に送信しますか？`
            );

            // ユーザーが「キャンセル」を押した場合
            if (!isConfirmed) {
                messageText.textContent = '送信をキャンセルしました。';
                setTimeout(() => { messageText.textContent = ''; }, 3000);
                return; // 処理を中断
            }
        }
    }


    // オーバーレイを表示
    if (overlay) {
        if (overlayMessage) overlayMessage.textContent = "送信中...";
        overlay.classList.remove('hidden');
    }

    const current_time = getFormattedCurrentDateTime();

    // ボタンを無効化
    submitButton.disabled = true;

    //現在時刻を開始あるいは終了点呼の時刻にセットする
    if (startEnd.textContent === "START") {   //開始点呼の場合
        startTimeInput.value=current_time;
        endTimeInput.value="";
    }else if (startEnd.textContent === "END") {   //終了点呼の場合
        startTimeInput.value="";
        endTimeInput.value=current_time;
    }
    // 名前からスペース（全・半角）を削除
    let name = nameInput.value.replace(/\s/g, '');

    // 車両番号から数字以外の文字を削除し、スプレッドシート用にシングルクォートを付与
    let number = numberInput.value.replace(/\D/g, '');

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
        console.error('セッションの取得に失敗しました:', sessionError);
        messageText.textContent = '認証エラーが発生しました。再ログインしてください。';
        messageText.className = 'error';
        // 1秒後にログインページにリダイレクト
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
        return;
    }
    const accessToken = session.access_token;

      
   
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // タイムアウト処理（60秒:cold start用）
    //const timeoutId = setTimeout(() => controller.abort(), 10000); // タイムアウト処理（10秒:hot start用）

    // FormDataから直接データを取得する代わりに、各入力値を取得します
    const data = {
        name: name,
        number: number, // シングルクォートを削除
        start: startTimeInput.value,
        end: endTimeInput.value,
        tenko: tenkoInput.value,
        tenko_detail: tenko_detailInput.value,
        tenko_name: tenko_nameInput.value,
        alcohol_checker: alcohol_checkerInput.checked ? 'on' : null, // チェックボックスの値を 'on' or null に
        alcohol_checker_detail: alcohol_checker_detailInput.value,
        drunk_check: drunk_checkInput.checked ? 'on' : null,
        health_check: health_checkInput.checked ? 'on' : null,
        health_detail: health_detailInput.value,
        daily_check: daily_checkInput.checked ? 'on' : null,
        daily_detail: daily_detailInput.value,
        order_list: order_listInput.value
    };

    // backup DB (rewritography.com/relait : MySQL)に保存　--start--
    const backupAPI_URL = 'https://rewritography.com/relait/backupdb/backupdb_mysql.php';   // バックアップ用のURL

    // バックアップAPIへの送信（メイン処理とは独立して実行）
    fetch(backupAPI_URL, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(backupData => {
        // バックアップ成功時はコンソールにログを出力
        console.log('Backup successful:', backupData.message);
    })
    .catch(error => {
        // バックアップ失敗時はコンソールにエラーを出力
        // これによってメインのGASへの送信処理は中断されない
        console.error('Backup failed:', error);
    });
    // backup DB (rewritography.com/relait : MySQL)に保存　--end--

    //supabase DB (API_URL) に保存  --start--  
    fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json',
            // 認証トークンをヘッダーに追加
            'Authorization': `Bearer ${accessToken}`,
        },
        signal: controller.signal, // AbortControllerをfetchに渡す
    })
    .then(response => {
        clearTimeout(timeoutId); // 応答があったのでタイムアウトを解除
        if (!response.ok) {
            // サーバーからのエラーレスポンス (例: 500 Internal Server Error)
            throw new Error(`サーバーエラーが発生しました (ステータス: ${response.status})`);
        }
        return response.json(); // レスポンスをJSONとしてパース
    })
    .then(resData => {
        if (resData.status === 'success') {
            //if (overlayMessage) overlayMessage.textContent = resData.message;
            messageText.textContent = resData.message;
            messageText.className = 'success';
            saveStateAndHistory(data); // 送信成功時に状態と履歴を保存
            //displayHistory(); // 履歴テーブルを更新
        } else {
            // エラーを返してきた場合 (例: { status: 'error', message: '...' })
            //if (overlayMessage) overlayMessage.textContent = 'エラーが発生しました: ' + (resData.message || '不明なエラーです。');
            messageText.textContent = 'エラーが発生しました: ' + (resData.message || '不明なエラーです。');
            messageText.className = 'error';
        }
    })
    .catch(error => {
        if (error.name === 'AbortError') {
            //if (overlayMessage) overlayMessage.textContent = '送信がタイムアウトしました。時間をおいて再試行してください。';
            messageText.textContent = '送信がタイムアウトしました。時間をおいて再試行してください。';
            
        } else {
            //if (overlayMessage) overlayMessage.textContent = '送信に失敗しました。ネットワーク接続やサーバーの状態を確認してください。';
            messageText.textContent = '送信に失敗しました。ネットワーク接続やサーバーの状態を確認してください。';
        }
        messageText.className = 'error';
        //console.error('Error:', error);
    })
    .finally(() => {
        // 送信完了後、ユーザーがメッセージを確認する時間を考慮し、
        // オーバーレイの非表示とボタンの有効化のタイミングを分離します。

        // フォームをリセット
        form.reset();
        // オーバーレイを非表示
        if (overlay) {
            overlay.classList.add('hidden');
        }
        // 5秒後にメッセージを非表示
        setTimeout(() => {
            messageText.textContent = '';
            submitButton.disabled = false;// ボタンを再度有効化
            loadFormDataFromLocalStorage(); // LocalStorageの保存データを取得・表示
        }, 5000); // 5秒
    });
    //supabase DB (API_URL) に保存  --end--  
};

// フォームの入力中にリアルタイムでlocalStorageに保存する関数
const saveFormDataToLocalStorage = () => {
    const formData = {
        name: nameInput.value,
        number: numberInput.value,
        tenko: tenkoInput.value,
        tenko_detail: tenko_detailInput.value,
        tenko_name: tenko_nameInput.value,
        alcohol_checker: alcohol_checkerInput.checked,
        alcohol_checker_detail: alcohol_checker_detailInput.value,
        drunk_check: drunk_checkInput.checked,
        health_check: health_checkInput.checked,
        health_detail: health_detailInput.value,
        daily_check: daily_checkInput.checked,
        daily_detail: daily_detailInput.value,
        order_list: order_listInput.value,
    };
    localStorage.setItem(FORM_DATA_KEY, JSON.stringify(formData));
};


// 今の状態と履歴をlocalStorageに保存する関数
const saveStateAndHistory = (sentData) => {
    // 1. 次回入力補助用のデータを保存
    if (sentData.name) localStorage.setItem(DRIVER_NAME_KEY, sentData.name);
    // シングルクォートを除去して保存
    if (sentData.number) localStorage.setItem(VEHICLE_NUMBER_KEY, String(sentData.number).replace(/'/g, ''));
    if (sentData.tenko_name) localStorage.setItem(TENKO_NAME_KEY, sentData.tenko_name);

    // 2. 開始/終了の状態を更新
    if (sentData.start) { // 開始時刻があれば開始点呼
        localStorage.setItem(START_TIME_KEY, sentData.start);
        localStorage.setItem(END_TIME_KEY, "");
    } else if (sentData.end) { // 終了時刻があれば終了点呼
        localStorage.setItem(START_TIME_KEY, "");
        localStorage.setItem(END_TIME_KEY, sentData.end);
    }

    // 3. 履歴を保存
    const history = JSON.parse(localStorage.getItem(REPORT_HISTORY_KEY)) || [];
    const newRecord = { ...sentData, timestamp: new Date().getTime() };
    history.unshift(newRecord); // 新しい履歴を配列の先頭に追加

    // 4. LSperiod日以上前のデータをフィルタリングして削除
    //const sevenDaysAgo = new Date().getTime() - (7 * 24 * 60 * 60 * 1000);
    const periodDaysAgo = new Date().getTime() - (LSperiod * 24 * 60 * 60 * 1000);
    const recentHistory = history.filter(record => record.timestamp > periodDaysAgo);

    localStorage.setItem(REPORT_HISTORY_KEY, JSON.stringify(recentHistory));

    // 5. 送信が成功したので、未送信フォームデータをクリア
    localStorage.removeItem(FORM_DATA_KEY);
};

// 履歴をテーブルに表示する関数
/*
const displayHistory = () => {
    if (!historyList) return;

    const history = JSON.parse(localStorage.getItem(REPORT_HISTORY_KEY)) || [];
    historyList.innerHTML = ''; // 既存の表示をクリア

    // タイムスタンプの昇順（古いものが先頭）に並び替え
    history.sort((a, b) => a.timestamp - b.timestamp);

    history.forEach(record => {
        const card = document.createElement('div');
        card.className = record.start ? 'history-card-start' : 'history-card-end';

        // 送信日時と点呼種別を取得
        //const dateTime = new Date(record.timestamp).toLocaleString('ja-JP');
        const tenkoType = record.start ? '開始' : '終了';
        const dateTime = record.start ? record.start : record.end;
        const tenkoDateTime = new Date(dateTime);
        const month = tenkoDateTime.getMonth() + 1; // getMonth()は0から始まるため+1します
        const day = tenkoDateTime.getDate();
        const week = ['日', '月', '火', '水', '木', '金', '土'];
        const dayOfWeek = week[tenkoDateTime.getDay()];
        const tenkoDate = `${month}月${day}日（${dayOfWeek}）`;
        const hours = tenkoDateTime.getHours();
        const minutes = tenkoDateTime.getMinutes().toString().padStart(2, '0');
        const tenkoTime = `${hours}時${minutes}分`;
        const itemClassName = record.start ? 'history-item-start' : 'history-item-end';
        // 1行のHTMLを生成 <input type="datetime-local" value="${dateTime}" autocomplete="off">
        card.innerHTML = `<div class="history-item">
                            <div class="history-label">${tenkoType}</div>
                            <div class="history-time">${tenkoTime}</div>
                            <div class="history-date">${tenkoDate}</div>

                          </div>`;

        historyList.appendChild(card);
    });
};
*/
// 点呼方法の「詳細」入力欄の表示/非表示を切り替える関数
const toggleTenkoDetailVisibility = () => {
        if (tenkoInput.value === '対面') {
            tenkoDetailGroup.style.display = 'none';    // 点呼詳細入力欄を非表示
        } else {
            tenkoDetailGroup.style.display = 'block';   // それ以外（TEL, その他）なら表示
        }
};

// アルコール検知の「詳細」入力欄の表示/非表示を切り替える関数
const toggleAlcoholDetailVisibility = () => {
        if (alcohol_checkerInput.checked && drunk_checkInput.checked ) {   //アルコール検知器の使用と酒気帯び有無
            alcoholDetailGroup.style.display = 'none';    // 点呼詳細入力欄を非表示
        } else {
            alcoholDetailGroup.style.display = 'block';   // それ以外（TEL, その他）なら表示
        }
};

// 疾病・疲労・睡眠不足の「詳細」入力欄の表示/非表示を切り替える関数
const toggleHealthDetailVisibility = () => {
        if (health_checkInput.checked ) {   //疾病・疲労・睡眠不足有無
            healthDetailGroup.style.display = 'none';    // true=疾病・疲労・睡眠不足詳細入力欄を非表示
        } else {
            healthDetailGroup.style.display = 'block';   // false=疾病・疲労・睡眠不足詳細入力欄を表示
        }
};

// 日常点検の「詳細」入力欄の表示/非表示を切り替える関数
const toggleDailyDetailVisibility = () => {
        if (daily_checkInput.checked ) {   //日常点検有無
            dailyDetailGroup.style.display = 'none';   //true=日常点検詳細入力欄を非表示
        } else {
            dailyDetailGroup.style.display = 'block';   // false=日常点検詳細入力欄を表示
        }
};

// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
// 13分ごとにサーバーにpingを送信して、スリープを防ぐ (Renderの無料プランは15分でスリープするため)
//　有料プラン変更後は不要かも？
// ページLoad後（'DOMContentLoaded'）にもkeepServerWarmを設定
const PING_URL = 'https://hiwa-tenko-backend.onrender.com/api/health'; // バックエンドに作成した軽量なエンドポイント
const keepServerWarm = () => {
    //console.log('サーバーのスリープを防止するためにpingを送信します。');
    fetch(PING_URL)
        .then(response => {
            if (response.ok) {
                console.log('サーバーは起動中です。');
            } else {
                console.warn('サーバーへのpingに失敗しました。', response.status);
            }
        })
        .catch(error => {
            // ネットワークエラーなどでリクエスト自体が失敗した場合
            console.error('サーバーへのping送信中にエラーが発生しました:', error);
        });
};

// Renderの無料プランのスリープ対策。不要な場合はコメントアウトしてください。
setInterval(keepServerWarm, 13 * 60 * 1000);    // 13分ごとにserver スリープ防止を実行
// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

//ページがLOADされた後
document.addEventListener('DOMContentLoaded', () => {

    // Renderの無料プランのスリープ対策。不要な場合はコメントアウトしてください。
    keepServerWarm();   // ★★★server スリープ防止 ★★★

    // ページアクセスログをDBに記録する
    //recordUserAccess();

    // ページ読み込み時にローディングオーバーレイを表示
    showAndHideLoadingOverlay();

    // リアルタイム保存用のイベントリスナーを登録
    const textInputsToSave = [
        nameInput, numberInput, tenko_detailInput, tenko_nameInput,
        alcohol_checker_detailInput, health_detailInput, daily_detailInput, order_listInput
    ];
    const choiceInputsToSave = [
        tenkoInput, alcohol_checkerInput, drunk_checkInput,
        health_checkInput, daily_checkInput
    ];
    textInputsToSave.forEach(input => {
        if (input) input.addEventListener('input', saveFormDataToLocalStorage);
    });
    choiceInputsToSave.forEach(input => {
        if (input) input.addEventListener('change', saveFormDataToLocalStorage);
    });
    // 各種入力項目の変更を監視するイベントリスナーを登録
    tenkoInput.addEventListener('change', toggleTenkoDetailVisibility);
    alcohol_checkerInput.addEventListener('change', toggleAlcoholDetailVisibility);
    drunk_checkInput.addEventListener('change', toggleAlcoholDetailVisibility);
    health_checkInput.addEventListener('change', toggleHealthDetailVisibility);
    daily_checkInput.addEventListener('change', toggleDailyDetailVisibility);

    // フォーム送信のイベントリスナーを登録
    form.addEventListener('submit', handleFormSubmit);

    // 1. ページが読み込まれた時点で、現在の選択状態に合わせて表示を初期化
    //toggleTenkoDetailVisibility();
    //toggleAlcoholDetailVisibility();
    //toggleHealthDetailVisibility();
    //toggleDailyDetailVisibility();
    
    //LocalStorageから読み込む
    loadFormDataFromLocalStorage();

    // menuがクリックされたときの処理
    const menuIcon = document.getElementById('list_menu');
    const navMenu = document.getElementById('nav_menu');

    // navMenuが読み込み時に表示される問題(FOUC)への対策
    // HTML側でhidden属性を付与し、JSの準備ができたここで削除する
    if (navMenu) {
        navMenu.removeAttribute('hidden');
    }

    // 要素が両方存在する場合のみ、イベントリスナーを設定
    
    if (menuIcon && navMenu) {
        // list-menuがクリックされたときの処理
        menuIcon.addEventListener('click', (event) => {
            // メニューの表示/非表示を切り替える
            navMenu.classList.toggle('visible');
            // イベントの伝播を停止し、documentのクリックイベントが即座に発火するのを防ぐ
            event.stopPropagation();
        });

        // メニューの外側をクリックしたときにメニューを閉じるイベントリスナーもここに追加
        document.addEventListener('click', () => {
            // navMenuが存在し、かつ表示されている場合のみ閉じる処理を実行
            if (navMenu && navMenu.classList.contains('visible')) {
                navMenu.classList.remove('visible');
            }
        });
    }

    //履歴の表示・非表示切り替え
    /*
    if (historyButton && historyList && buttonImage) {
        historyButton.addEventListener('click', () => {
            historyList.classList.toggle('visible');
    
            if (historyList.classList.contains('visible')) {
                buttonImage.src = 'images/arrow-up1.svg';
                buttonImage.alt = '非表示';
                historyButton.setAttribute('aria-label', '履歴を非表示');
                linkTop.style.display = 'block';

            } else {
                buttonImage.src = 'images/arrow-down1.svg';
                buttonImage.alt = '表示';
                historyButton.setAttribute('aria-label', '履歴を表示');
                linkTop.style.display = 'none';
            }
        });
    }
    */
    // 履歴を表示
    //displayHistory();

});

// バックグラウンドから復帰した際の処理
document.addEventListener('visibilitychange', () => {
    // ページが再び表示された場合
    if (document.visibilityState === 'visible') {
        // ページアクセスログをDBに記録する
        //recordUserAccess();
        // ローディングオーバーレイを表示
        showAndHideLoadingOverlay();
        // 時刻表示を即時更新
        displayCurrentDate();
        displayCurrentTime();
    }
});

// ページ読み込み時にlocalStorageから[運転者氏名]、[車両番号]、[点呼確認者名]などの値を取得フォームに設定
const loadFormDataFromLocalStorage = () => {
    // 詳細表示の更新もトリガーする
    toggleTenkoDetailVisibility();
    toggleAlcoholDetailVisibility();
    toggleHealthDetailVisibility();
    toggleDailyDetailVisibility();

    // リアルタイム保存された未送信データを読み込む
    const unsentDataJSON = localStorage.getItem(FORM_DATA_KEY);

    if (unsentDataJSON) {
        // 未送信データがある（送信に失敗していた）場合は、
        const data = JSON.parse(unsentDataJSON);
        if (nameInput) nameInput.value = data.name || '';
        if (numberInput) numberInput.value = data.number || '';
        if (tenkoInput) tenkoInput.value = data.tenko || '対面';
        if (tenko_detailInput) tenko_detailInput.value = data.tenko_detail || '';
        if (tenko_nameInput) tenko_nameInput.value = data.tenko_name || '';
        if (alcohol_checkerInput) alcohol_checkerInput.checked = data.alcohol_checker || false;
        if (alcohol_checker_detailInput) alcohol_checker_detailInput.value = data.alcohol_checker_detail || '';
        if (drunk_checkInput) drunk_checkInput.checked = data.drunk_check || false;
        if (health_checkInput) health_checkInput.checked = data.health_check || false;
        if (health_detailInput) health_detailInput.value = data.health_detail || '';
        if (daily_checkInput) daily_checkInput.checked = data.daily_check || false;
        if (daily_detailInput) daily_detailInput.value = data.daily_detail || '';
        if (order_listInput) order_listInput.value = data.order_list || '';


    } else {
        // 未送信データがない（送信に成功していた）場合は、前回送信成功時のデータ（氏名・ナンバー・点呼者）を読み込む
        if (nameInput) {
            const savedName = localStorage.getItem(DRIVER_NAME_KEY);
            if (savedName !== null) { // 値が存在する場合のみ設定
                nameInput.value = savedName;
            }
        }
        if (numberInput) {
            const savedVehicleNumber = localStorage.getItem(VEHICLE_NUMBER_KEY);
            if (savedVehicleNumber !== null) { // 値が存在する場合のみ設定
                numberInput.value = savedVehicleNumber;
            }
        }
        if (tenko_nameInput) {
            const savedTenkoName = localStorage.getItem(TENKO_NAME_KEY);
            if (savedTenkoName !== null) { // 値が存在する場合のみ設定
                tenko_nameInput.value = savedTenkoName;
            }
        }
    }

    // 開始/終了の状態に応じてボタンの表示を切り替える
    // localStorageにSTART_TIME_KEYの値が存在する場合（空文字列やnullでない）、次は「終了点呼」
    if (localStorage.getItem(START_TIME_KEY)) {
        submitButton.textContent = "終了　点呼";
        submitButton.classList.add('end-call'); // 終了ボタン用のクラスを追加
        startEnd.textContent = "END";
    } else {
        // START_TIME_KEYが保存されていない、または空文字列の場合は「開始点呼」
        submitButton.textContent = "開始　点呼";
        submitButton.classList.remove('end-call'); // 終了ボタン用のクラスを削除
        startEnd.textContent = "START";
    }
};

/**
 * ページアクセスログをSupabaseに記録する関数
 * 他のsleep対策（5秒で強制タイムアウト）を実行中のため一旦コメントアウト
const recordUserAccess = async () => {
    try {
        // 1. 現在のユーザー情報を取得
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('アクセスログ記録エラー: ユーザーが認証されていません。', userError);
            // ログインしていない場合は何もしない
            return;
        }

        // 2. 必要な情報を取得
        const uid = user.id;
        const email = user.email;
        // user_metadataから会社名を取得 (事前にSupabase上で設定されている前提)
        const company_name = user.user_metadata?.company_name || '未設定';
        // localStorageから運転者名を取得
        //const driver_name = localStorage.getItem(DRIVER_NAME_KEY) || '未設定';
        const driver_name = user.user_metadata?.driver_name || '未設定';

        // 3. Supabaseの 'useraccess' テーブルにデータを挿入
        const { error: insertError } = await supabase
            .from('useraccess')
            .insert([
                {
                    uid: uid,
                    company_name: company_name,
                    driver_name: driver_name,
                    email: email
                    // created_at はデータベースのデフォルト値が使用されるため、ここでは指定不要
                }
            ]);

        if (insertError) {
            console.error('アクセスログの保存に失敗しました:', insertError);
        } else {
            console.log('アクセスログを記録しました。');
        }
    } catch (error) {
        console.error('アクセスログ記録中に予期せぬエラーが発生しました:', error);
    }
};
 */

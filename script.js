// Hiwa点呼3
//version H: HP, F: Fujitsu, A: AORUS, S: sykFujitsu
const version = "0.886H";//20251113
//コミット例：　version = "0.873H";//20251113
console.log("version=",version);
document.getElementById('title_ver').textContent= "ver. " + version;

/*
【未修正箇所】◎：修正済
◎20251105 ：script.js    ・20251107完了：業務時間が停止しない（開始時間、終了時間がある場合でも）
◎20251105 ：report.js    ・20251108完了：土、日の月日の色変更
◎20251105 ：report.js    ・20251107完了：終了時間が次の日になった場合の例外対応
◎20251109 ：report.js    ・20251109完了：前回の開始時間が前日以前になった場合背景色をグレー
20251112：終了点呼ボタンが表示されている間は「業務中」みたいな表示
20251112：開始・終了点呼終了後は、チェックボックスをON(終了点呼は、OFFにしないと上書き不可)

*/

// supabaseクライアントをインポート
import { supabase } from './js/supabaseClient.js';

//LocalStorageに保存する期間（日）
const LSperiod = 32;
 // 前回の送信時刻からnHours（時間）以内の場合は、「確認」ダイアログを表示する経過時間
const nHours = 3;

const form = document.getElementById('reportForm');
const submitButton = document.getElementById('submitButton');
const startEnd = document.getElementById('start_end');
const messageText = document.getElementById('message_text');
const statusText = document.getElementById('status_text');
const overlay = document.getElementById('overlay');
const loadingOverlay = document.getElementById('loading-overlay');
const overlayMessage = document.getElementById('overlay-message');
const currentDateDiv = document.getElementById('currentDate');
const currentTimeDiv = document.getElementById('currentTime');
const startTimeInput = document.getElementById('start');    //点呼開始時間(input hidden)
const endTimeInput = document.getElementById('end');    //点呼終了時間(input hidden)
const startTimeDiv = document.getElementById('s_time');
const durationTimeDiv = document.getElementById('d_time');
const endTimeDiv = document.getElementById('e_time');

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

const linkTop = document.getElementById('link_top');    //トップに戻る

const DRIVER_NAME_KEY = 'driverName';
const VEHICLE_NUMBER_KEY = 'vehicleNumber';
const TENKO_NAME_KEY = 'tenkoName';
const REPORT_HISTORY_KEY = 'reportHistory'; // 履歴保存用のキー
const START_TIME_KEY = 'startTime';
const END_TIME_KEY = 'endTime';
const START_END_KEY = 'startEnd';
const TENKO_START_KEY = 'tenkoStart';   //点呼開始時間
const TENKO_DURATION_KEY = 'tenkoDuration'; //業務時間
const TENKO_END_KEY = 'tenkoEnd';   //点呼終了時間

const FORM_DATA_KEY = 'unsentFormData'; // 未送信のフォームデータ保存用のキー


// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

// main DB (supabase : PostgreSQL）DataBase API URL
const API_URL = 'https://hiwa-tenko-backend.onrender.com/api/reports';

// backup DB (xserver : MySQL) DataBase API URL
const backendPHP_URL = 'https://qrepo.site/tenko_db/backupdb_mysql.php';

// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

// ページ読み込み時と1分ごとに日付と時刻を更新
displayCurrentDate();
setInterval(displayCurrentDate, 60000); // 60000ミリ秒 = 1分
displayCurrentTime();
setInterval(displayCurrentTime, 60000); // 60000ミリ秒 = 1分

//開始、終了のステータスを切り替え
function startEndSwitch(start_end) {

    if (start_end === "開始") {   //開始点呼の場合        
        startEnd.textContent = "終了";
        submitButton.textContent = "終了　点呼";
        submitButton.style.background = '#e53749ff';
    
    }else if (start_end === "終了") {   //終了点呼の場合        
        startEnd.textContent = "開始";
        submitButton.textContent = "開始　点呼";
        submitButton.style.background = '#3968d4ff';
        
    }
}

// メッセージを3秒間だけ表示する
function messageDisplay(message) {
                messageText.textContent = message;
                setTimeout(() => { messageText.textContent = ''; }, 3000);
}

//開始or終了 点呼ボタンがクリックされた
const handleFormSubmit = async (e) => {

    e.preventDefault(); // デフォルトのフォーム送信を停止
  
    submitButton.disabled = true;  // 送信ボタンを無効化

    //ログインチェック（ログインしていなければ、ログイン画面に遷移）
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
        console.error('セッションの取得に失敗しました:', sessionError);
        messageText.textContent = '認証エラーが発生しました。再ログインしてください。';
        messageText.className = 'error';
        submitButton.disabled = false;// ボタンを再度有効化
        // 1秒後にログインページにリダイレクト
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
        return;
    }

    //点呼の送信時に、確認ダイアログ（OK/キャンセル）を表示する条件
        //１．前回の開始/終了点呼の時間からnHours時間以内（誤操作：連打防止）
        //２．前回の開始または、終了と同日の場合（誤操作：重複送信チェック）
        //３．今日が日曜日だった場合（誤操作：休日送信チェック）

    let confirmFlag = false;    //確認ダイアログを非表示
    let confirmMessage = "点呼ボタンを切り替えました。";   //確認メッセージ（初期値）
    let cancelMessage = "送信はキャンセルされました。\n点呼ボタンのみ切り替えます。"; //キャンセルメッセージ（初期値）
    const startEndText = startEnd.textContent;  // 開始or終了（点呼ボタン）
    const nowDay = new Date().getDate();    // 今日の日付
    const nowTime = new Date().getTime();  // 現在時刻
    
    const limitTime = nHours * 60 * 60 * 1000; // n時間を表すミリ秒
    //const lastStartTime = startTimeInput.value;
    const lastStartTime1 = localStorage.getItem(START_TIME_KEY); // 前回の開始点呼の日付(2025-11-02 11:10) 
    const lastEndTime1 = localStorage.getItem(END_TIME_KEY); // 前回の開始点呼の日付(2025-11-02 11:10) 

    const startTime1 = startTimeDiv.textContent;
    const endTime1 = endTimeDiv.textContent;
    //const lastEndTime = endTimeInput.value;
        console.log("lastStartTime1=",lastStartTime1);
        //console.log("lastStartTimeDate=",new Date(lastStartTime1).getDate());

    //if (lastStartTime1) { // 前回の開始点呼がある場合のみチェック
        //const elapsedStartTime = nowTime - new Date(lastStartTime).getTime();
        //if (elapsedStartTime < limitTime) {     //前回の開始点呼の時間からnHours時間以内
            //confirmFlag = true;
        //}
        console.log("startEndText=",startEndText);
    if (startEndText == "開始") {   //前回の開始点呼と同日の場合
        if (lastStartTime1) { // 前回の開始点呼がある場合のみチェック
            if (nowDay == new Date(lastStartTime1).getDate()){   //前回の開始点呼と同日の場合
                //confirmFlag = true;
                startEndSwitch(startEndText);   //開始、終了点呼だけを切り替え
                submitButton.disabled = false;  // ボタンを再度有効化
                
                confirmMessage += "すでに開始点呼が送信されています。";
                messageDisplay(confirmMessage);
                return;
            }
        }
    }else if (startEndText == "終了") {   //前回の終了点呼と同日の場合

        if (endTime1 != "") { // 終了時刻がある場合のみチェック
        //const elapsedEndTime = nowTime - new Date(lastEndTime).getTime();
        //if (elapsedEndTime < limitTime) {     //前回の終了点呼の時間からnHours時間以内
            //confirmFlag = true;
        //}
        //if (startEndText == "終了") {   //前回の終了点呼と同日の場合
            if (nowDay == new Date(lastEndTime1).getDate()){
                confirmFlag = true;
                confirmMessage = "すでに終了点呼が送信されています。\n";
                statusText.textContent = "業務終了中...";
            }
        //}
        }
    }
    if(startTime1 && endTime1){
        statusText.textContent = "業務終了中...";
    }else if(startTime1 && !endTime1){
        statusText.textConten = "業務中...";
    }

    if(confirmFlag){
            // 確認ダイアログを表示
            const isConfirmed = confirm(
                confirmMessage +
                `本当に`+ startEndText + `点呼を送信しますか？\n（キャンセルで点呼ボタンだけを切り替えます。）`
            );

            // ユーザーが「キャンセル」を押した場合
            if (!isConfirmed) {
                startEndSwitch(startEndText);   //開始、終了点呼だけを切り替え
                submitButton.disabled = false;// ボタンを再度有効化
                messageDisplay(cancelMessage);
                return; // 処理を中断
            }    
    }

    // オーバーレイを表示
    if (overlay) {
        if (overlayMessage) overlayMessage.textContent = "送信中...";
        overlay.classList.remove('hidden');
    }

   

    //現在時刻を開始あるいは終了点呼の時刻にセット
    const currentDate1 = getCurrentDate(); // 2025-11-03
    const current_time1 = getFormattedCurrentDateTime(); //2025-11-03 10:10

    //console.log("201: lastStartTime1= ",lastStartTime1);
    //console.log("203: currentDate1= ",currentDate1);
    //console.log("204: current_time1= ",current_time1);

    //開始の場合：現在時刻の日付が前回の開始点呼の日付と同じなら上書きしない
    if (startEndText === "開始") { 
        if(lastStartTime1){  //前回の開始点呼の日付 がある場合
            if( lastStartTime1.indexOf(currentDate1) < 0){  //同日ではない場合
                startTimeDiv.textContent= getFormattedTime(current_time1);  //開始時刻
                startTimeInput.value = current_time1;
                endTimeInput.value="";
                durationTimeDiv.textContent = "0時間0分";
                endTimeDiv.textContent = "";
                startTimeDiv.style.backgroundColor = '#000' ;
                durationTimeDiv.style.backgroundColor = '#000';
                endTimeDiv.style.backgroundColor = '#000';
            }
        }else{  //前回の開始点呼の日付 が nullの場合
                startTimeDiv.textContent= getFormattedTime(current_time1);  //開始時刻
                startTimeInput.value = current_time1;
                endTimeInput.value="";
                durationTimeDiv.textContent = "0時間0分";
                endTimeDiv.textContent = "";
                startTimeDiv.style.backgroundColor = '#000' ;
                durationTimeDiv.style.backgroundColor = '#000';
                endTimeDiv.style.backgroundColor = '#000';
        }
    //終了の場合：
    }else if (startEndText === "終了") {   //終了点呼の場合

            endTimeDiv.textContent= getFormattedTime(current_time1);  //終了時刻
            startTimeInput.value="";
            //displayDurationTime();  //業務時間を再計算して表示
            endTimeInput.value = current_time1;
        
    }

    startEndSwitch(startEndText);   //開始、終了のステータスを変更

    //console.log("startEnd = "+startEnd.textContent);
    let name = nameInput.value.replace(/\s/g, '');  // 運転者氏名　スペース（全・半角）を削除

    // 車両番号から数字以外の文字を削除し、スプレッドシート用にシングルクォートを付与
    //let number = numberInput.value.replace(/\D/g, '');
    let number = numberInput.value; // 車両番号

    const accessToken = session.access_token;
    const user = session.user;  //現在のログインユーザObject
    const uid = user.id;    //ユーザUID（登録時に自動生成されたユニークなID）
    const email = user.email;    //ユーザemail
    const user_data = user.user_metadata;  //ユーザメタデータ（詳細）
    const companyCode = user_data.company_code;    //会社コード
    const companyName = user_data.company_name;    //会社名
    const user_name = user_data.driver_name;    //ユーザ名

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // タイムアウト処理（60秒:cold start用）
    //const timeoutId = setTimeout(() => controller.abort(), 10000); // タイムアウト処理（10秒:hot start用）

    // FormDataから直接データを取得する代わりに、各入力値を取得します
    const data = {
        company_code: companyCode,
        company_name: companyName,
        driver_uid: uid,
        driver_name: name,
        vehicle_number: number, // シングルクォートを削除
        start_time: startTimeInput.value,
        end_time: endTimeInput.value,
        tenko_method: tenkoInput.value,
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


    // バックアップAPIへの送信（メイン処理とは独立して実行）--start--
    fetch(backendPHP_URL, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(backupData => {
        // バックアップ成功時はコンソールにログを出力
        console.log('Backup DB に保存成功:', backupData.message);
        //console.log(uid, email, user_name, companyName);
    })
    .catch(error => {
        // バックアップ失敗時はコンソールにエラーを出力
        // これによってメインのDBへの送信処理は中断されない
        console.error('Backup failed:', error);
    });
    // backup DB (tenko.qrepo.site : MySQL)に保存　--end--

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
            messageText.textContent = startEndText + resData.message;
            messageText.className = 'success';
            console.log('Supabase DB に保存成功:', resData.message);
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
        //ページが読み込まれた時、点呼ボタンの表示を設定
        setTenkoButton();
        // 送信完了後、ユーザーがメッセージを確認する時間を考慮し、
        // オーバーレイの非表示とボタンの有効化のタイミングを分離します。

        // フォームをリセット
        form.reset();
        // オーバーレイを非表示
        if (overlay) {
            overlay.classList.add('hidden');
        }
        // 6秒後にメッセージを非表示
        setTimeout(() => {
            messageText.textContent = '';
            submitButton.disabled = false;// ボタンを再度有効化
            loadFormDataFromLocalStorage(); // LocalStorageの保存データを取得・表示
            displayDurationTime();
        }, 6000); // 6秒
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
    if (sentData.driver_name) localStorage.setItem(DRIVER_NAME_KEY, sentData.driver_name);
    // シングルクォートを除去して保存
    if (sentData.vehicle_number) localStorage.setItem(VEHICLE_NUMBER_KEY, String(sentData.vehicle_number).replace(/'/g, ''));
    if (sentData.tenko_name) localStorage.setItem(TENKO_NAME_KEY, sentData.tenko_name);

    // 2. 開始/終了の状態を更新
    if (sentData.start_time) { // 開始点呼時間を上書き
        localStorage.setItem(START_TIME_KEY, sentData.start_time);
        //localStorage.setItem(END_TIME_KEY, "");
    } else if (sentData.end_time) { // 終了点呼時間を上書き
        //localStorage.setItem(START_TIME_KEY, "");
        localStorage.setItem(END_TIME_KEY, sentData.end_time);
    }
    localStorage.setItem(START_END_KEY, startEnd.textContent);
    localStorage.setItem(TENKO_START_KEY, startTimeDiv.textContent);
    localStorage.setItem(TENKO_DURATION_KEY, durationTimeDiv.textContent);
    localStorage.setItem(TENKO_END_KEY, endTimeDiv.textContent);

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

// 開始と終了を切り替える関数
/*
const toggleSwitch = document.getElementById('toggle-switch');
const toggleLabel = document.querySelector('.toggle-label');
const toggleText = document.querySelector('.toggle-text');

toggleSwitch.addEventListener('change', function() {
  if (this.checked) {
    toggleText.textContent = '終了';
    // テキストを右に配置
    toggleText.style.left = '10px';
    toggleText.style.right = 'auto';
  } else {
    toggleText.textContent = '開始';
    // テキストを左に配置
    toggleText.style.left = 'auto';
    toggleText.style.right = '10px';
  }
});
*/
// 初期状態のテキストを右に配置
//toggleText.style.right = '10px';
//toggleText.style.left = 'auto';


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
                console.log('サーバーは起動中');
            } else {
                console.warn('サーバーへのpingに失敗:', response.status);
            }
        })
        .catch(error => {
            // ネットワークエラーなどでリクエスト自体が失敗した場合
            console.error('サーバーへのping送信中にエラーが発生:', error);
        });
};

// Renderの無料プランのスリープ対策。不要な場合は次の行をコメントアウトしてください。
setInterval(keepServerWarm, 13 * 60 * 1000);    // 13分ごとにserver スリープ防止を実行
// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

//ページがLOADされた後
document.addEventListener('DOMContentLoaded', () => {
    console.log("ページがLOAD");
    //ログイン情報（運転者氏名をUIDから取得する）

    // Renderの無料プランのスリープ対策。不要な場合は次の行をコメントアウトしてください。
    keepServerWarm();   // ★★★server スリープ防止 ★★★

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
        if (input) input.addEventListener('input', saveFormDataToLocalStorage); //入力時にLS保存
    });
    choiceInputsToSave.forEach(input => {
        if (input) input.addEventListener('change', saveFormDataToLocalStorage); //変更時にLS保存
    });
    // 各種入力項目の変更を監視するイベントリスナーを登録
    tenkoInput.addEventListener('change', toggleTenkoDetailVisibility);
    alcohol_checkerInput.addEventListener('change', toggleAlcoholDetailVisibility);
    drunk_checkInput.addEventListener('change', toggleAlcoholDetailVisibility);
    health_checkInput.addEventListener('change', toggleHealthDetailVisibility);
    daily_checkInput.addEventListener('change', toggleDailyDetailVisibility);
    //startEnd.addEventListener('change', toggleStartEndSwitch);  //開始・終了切り替えトグル

    // フォーム送信のイベントリスナーを登録
    form.addEventListener('submit', handleFormSubmit);
    
    //ページが読み込まれた時、LocalStorageからFormのデータを読み込む
    loadFormDataFromLocalStorage();
    //ページが読み込まれた時、点呼ボタンの表示を設定
    setTenkoButton();
    

    // navMenuがクリックされたときの処理
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

});

// バックグラウンドから復帰した際の処理
document.addEventListener('visibilitychange', () => {
    // ページが再び表示された場合
    //console.log("673:visibilitychange");
    if (document.visibilityState === 'visible') {
        console.log("バックグラウンドから復帰");
        // ページアクセスログをDBに記録する
        //recordUserAccess();
        // ローディングオーバーレイを表示
        showAndHideLoadingOverlay();
        // 時刻表示を即時更新
        displayCurrentDate();
        displayCurrentTime();
        // LocalStorageの保存データを取得・表示
        loadFormDataFromLocalStorage();
        setTenkoButton();
    }
});

// 「ページ読み込み時」、あるいは「送信後」にlocalStorageから[運転者氏名]、[車両番号]、[点呼確認者名]などの値を取得フォームに設定
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
        // 未送信データがない（送信に成功していた）場合は、前回送信成功時のデータ（氏名・ナンバー・点呼方法・確認者）を読み込む
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
};

// localStorageの前回の開始時刻/終了時刻の状態に応じて開始・終了点呼ボタンと開始・終了を切り替え
const setTenkoButton = () => {

        // localStorageの前回の開始時刻/終了時刻の状態に応じて開始・終了点呼ボタンと開始・終了を切り替える
        // 1. startEndが"開始"：
            //A:
        // 2. startEndが"終了"：

        // 2. START_TIME_KEYが存在する
        const savedStartTime = localStorage.getItem(START_TIME_KEY);    //前回の開始点呼時間
        const savedEndTime = localStorage.getItem(END_TIME_KEY);    //前回の終了点呼時間
        const savedStartEnd = localStorage.getItem(START_END_KEY);    //前回の開始/点呼
        const savedTenkoStart = localStorage.getItem(TENKO_START_KEY);    //開始時間
        const savedTenkoDuration = localStorage.getItem(TENKO_DURATION_KEY);    //業務時間
        const savedTenkoEnd = localStorage.getItem(TENKO_END_KEY);    //終了時間
        // 終了点呼ボタンに切り替えるAND条件

        //console.log("savedStartTime = "+savedStartTime);
        //console.log("savedEndTime = "+savedEndTime);
        //console.log("savedstartEnd ="+savedStartEnd);
        //console.log("savedTenkoStart ="+savedTenkoStart);
        //console.log("savedTenkoDuration ="+savedTenkoDuration);
        //console.log("savedTenkoEnd ="+savedTenkoEnd);
 
        if (savedStartEnd === "終了") {  //前回が終了点呼の場合
            // 終了点呼をセット
            submitButton.textContent = "終了　点呼";
            submitButton.style.background = '#e53749ff';
            startEnd.textContent = "終了";
            startTimeDiv.textContent = savedTenkoStart;
            displayDurationTime();
            endTimeDiv.textContent= savedTenkoEnd;
            if(savedTenkoEnd === ""){   //終了時刻が無い場合（業務中ステータス）
                statusText.textContent = "業務中...";
            }else{
                statusText.textContent = "業務終了中...";
            }
      
        } else if(savedStartEnd === "開始"){  //前回が開始点呼の場合
            // 開始点呼ボタンをセット
            submitButton.textContent = "開始　点呼";
            submitButton.style.background = '#3968d4ff';
            startEnd.textContent = "開始";
            // 開始・終了・業務時間をセット
            startTimeDiv.textContent = savedTenkoStart;
            durationTimeDiv.textContent = savedTenkoDuration;
            endTimeDiv.textContent= savedTenkoEnd;
            if(savedTenkoStart === "" && savedTenkoEnd){
                statusText.textContent = "業務終了中...";
            }else{
                statusText.textContent = "業務中...";
            }

            //開始時刻が前日以前だった場合は背景色をグレー
            const currentDay = getCurrentDay();
            const lastStartDay = getFormattedDay(savedStartTime);
                //console.log("currentDay = "+currentDay);
                //console.log("lastStartDay = "+lastStartDay);
            if(currentDay === lastStartDay){
                startTimeDiv.style.backgroundColor = '#000' ;
                durationTimeDiv.style.backgroundColor = '#000';
                endTimeDiv.style.backgroundColor = '#000';
            }else{
                startTimeDiv.style.backgroundColor = '#aaa' ;
                durationTimeDiv.style.backgroundColor = '#aaa';
                endTimeDiv.style.backgroundColor = '#aaa';

            }

        } else {    //前回が初期の場合
            // 開始点呼ボタンに切り替える
            submitButton.textContent = "開始　点呼";
            submitButton.style.background = '#3968d4ff';
            startEnd.textContent = "開始";
            startTimeDiv.textContent = "";
            endTimeDiv.textContent = "";
            durationTimeDiv.textContent = "0時間0分";
        }
}

//現在の日付けを形式フォーマット(11/3)を返す関数
function getCurrentDay() {
    const nowTime = new Date();
    const month = (nowTime.getMonth() + 1).toString();
    const day = nowTime.getDate().toString();
    return `${month}/${day}`;
}

//点呼の開始、終了の時刻の形式フォーマット(11/3)を返す関数
function getFormattedDay(savedTime) {
    const nowTime = new Date(savedTime);
    const month = (nowTime.getMonth() + 1).toString();
    const day = nowTime.getDate().toString();
    return `${month}/${day}`;
}

//点呼の開始、終了の時刻の形式フォーマットで日時(11/3 10:29)を返す関数
function getFormattedTime(savedTime) {
    const nowTime = new Date(savedTime);
    //const year = nowTime.getFullYear();
    const month = (nowTime.getMonth() + 1).toString();
    const day = nowTime.getDate().toString();
    const hours = nowTime.getHours().toString();
    const minutes = nowTime.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
}
// datetime-local input用のフォーマットで現在日時(2025-11-03 10:15)を返す関数
function getFormattedCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}
// 年-月-日(2025-11-03)の形式で今日の日を返す関数
function getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
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
// 現在年月日を表示する関数
function displayCurrentDate() {
    if (currentDateDiv) {
        const nowDay = new Date();
        const year = nowDay.getFullYear();
        const month = (nowDay.getMonth() + 1).toString();
        const day = nowDay.getDate().toString();
        const week = ['日', '月', '火', '水', '木', '金', '土'];
        const dayOfWeek = week[nowDay.getDay()];
        currentDateDiv.textContent = `${year}年${month}月${day}日（${dayOfWeek}）`;
    }
}
// 現在時刻を表示する関数
function displayCurrentTime() {
    if (currentTimeDiv) {
        const nowTime = new Date();
        const hours = nowTime.getHours().toString().padStart(2);
        //const minutes = nowTime.getMinutes().toString().padStart(2, '0'); //0埋め込み
        const minutes = nowTime.getMinutes().toString().padStart(2);
        currentTimeDiv.textContent = `${hours}時${minutes}分`;
    }
    displayDurationTime();
}
//現在の業務時間（現在時刻ー開始時間）を更新して表示
function displayDurationTime() {
        const savedStartTime = localStorage.getItem(START_TIME_KEY);    //前回の開始点呼時間
        //console.log("savedStartTime= "+savedStartTime);
        //開始時刻が有り、かつ終了時刻が無い場合は業務時間を更新
        //if (startTimeDiv.textContent != "" && endTimeDiv.textContent == "") { 
            const elapseTime = new Date().getTime() - new Date(savedStartTime).getTime(); //開始点呼からの経過時間
            const elapsedHours = Math.floor(elapseTime / 3600000);
            const elapsedMinutes = Math.floor((elapseTime % 3600000) / 60000);
            //const elapsedSeconds = Math.floor((elapseTime % 60000) / 1000);
            durationTimeDiv.textContent = `${elapsedHours}時間${elapsedMinutes}分`;
        //}
}

/*
const startTimeInput = document.getElementById('start');    //点呼開始時間(input hidden)
const endTimeInput = document.getElementById('end');    //点呼終了時間(input hidden)
const startTimeDiv = document.getElementById('s_time');
const durationTimeDiv = document.getElementById('d_time');
const endTimeDiv = document.getElementById('e_time');
*/
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

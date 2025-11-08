// 点呼レポートJS
document.addEventListener('DOMContentLoaded', () => {
    const REPORT_HISTORY_KEY = 'reportHistory';
    const tableContainer = document.getElementById('table-container');

    if (!tableContainer) {
        console.error('テーブルを表示するコンテナが見つかりません。');
        return;
    }

    // 2. localStorageから履歴全データ（過去32日間、日付の新しい順）を取得（ => history[]）
    const history = JSON.parse(localStorage.getItem(REPORT_HISTORY_KEY)) || [];

    if (history.length === 0) {
        tableContainer.innerHTML = '<p>履歴がありません。</p>';
        return;
    }
    //履歴全データから表示する今月のデータだけを日付の古い順（1日→31日）で抽出、保存（ => rHistory）
    const rHistory = [];
    let r = 0;
    let fandlDay = getfandlMonthDay();
    let startTime;   // <= start_time : "2025-11-05 10:20"
    let firstDay = fandlDay[0];   // 月初　"2025-11-01" のDateオブジェクト
    //let lastDay = fandlDay[1];   // 月末　"2025-11-30" のDateオブジェクト
    //console.log("firstDate=",firstDay);
    //console.log("lastDate=",lastDay);

    for (let i = history.length - 1; i >= 0; i--) {
        startTime = new Date(history[i].start_time);
        endTime = new Date(history[i].end_time);
        if(firstDay <= startTime || firstDay <= endTime){
            rHistory[r] = history[i];
            //console.log(r,"=",rHistory[r]);
            r++;
        }
    }
    //console.log("rHistory=",rHistory);

    // 3. 履歴データを日付ごとに開始・終了時刻をまとめる（=> dailyRekords）
    // 例: { "2024-07-21": { start: "...", end: "..." }, ... }
    const dailyRecords = {};
    rHistory.forEach(record => {

        const dateTimeString = record.start_time || record.end_time;
        if (!dateTimeString) return;

        const recordDateStr = dateTimeString.split(' ')[0]; // 記録データの日付を抽出　"YYYY-MM-DD"
        if (!dailyRecords[recordDateStr]) { //日付の連想配列がなければ新規追加
            dailyRecords[recordDateStr] = {};
        }
        // 開始点呼：その日の最も早い開始時刻を記録する（つまり、2回目以降の時刻は無視される）
        if (record.start_time) {
            if (!dailyRecords[recordDateStr].start_time || new Date(record.start_time) < new Date(dailyRecords[recordDateStr].start_time)) {
                dailyRecords[recordDateStr].start_time = record.start_time;
                //console.log("recordDateStr=", recordDateStr, dailyRecords[recordDateStr].start_time);
            }
        }
        // 終了点呼 ：その日の最も遅い終了時刻を記録する（つまり、常に最後の時刻で上書きされる）
        // 例外１   ：その日の開始時間が無い場合、かつ前日の日付の終了時刻が無い（-）場合は、
        //          前日の終了時刻とする（終了時刻が前日の深夜0時を超えた例外）
        //          
        if (record.end_time) {
            //例外1の処理
            let nowDate = new Date(recordDateStr);
            let lastDate = nowDate.setDate(nowDate.getDate() - 1);
            let lastDateStr = getFormattedDate(lastDate);
            //console.log("lastDateStr=",lastDateStr);
            if (!dailyRecords[recordDateStr].start_time && dailyRecords[lastDateStr] && !dailyRecords[lastDateStr].end_time) {
                dailyRecords[lastDateStr].end_time = record.end_time;
            //通常処理
            }else if (!dailyRecords[recordDateStr].end_time || new Date(record.end_time) > new Date(dailyRecords[recordDateStr].end_time)) {
                dailyRecords[recordDateStr].end_time = record.end_time;
                //console.log("end=", recordDateStr, dailyRecords[recordDateStr].end_time);
            }        
        }
    });

    //const table = tenkoTimeTable(dailyRecords,lastSunday);
    const table = tenkoTimeTable(dailyRecords);

    // 生成したテーブルをコンテナに追加
    tableContainer.appendChild(table);


});

function getfandlMonthDay(){
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    return [firstDay, lastDay];
}

function getFormattedDate(dateTime) {
    const now = new Date(dateTime);
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 点呼時間の1か月のテーブルを出力
const tenkoTimeTable = (records) => {

    //---function start---
    const week = ['(日)', '(月)', '(火)', '(水)', '(木)', '(金)', '(土)'];

    // テーブル要素と先頭行（項目）を生成
    const table = document.createElement('table');
    table.className = 'report-table';
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>月日</th>
            <th>開始</th>
            <th>終了</th>
            <th>業務時間</th>
        </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    // 今月の1日から月末までの日付（例：11/1～11/30）のテーブル行のデータを生成
    const today = new Date();   //今日
    const year = today.getFullYear().toString().padStart(2, '0');   //年
    const month = (today.getMonth() + 1).toString().padStart(2, '0'); //月

    const daysInMonth = new Date(year, month, 0).getDate(); //月末の日付
    //const monCale = [];
    //for (let day = 1; day <= daysInMonth; day++) {
        //monCale.push(`${month}/${day}`);
    //}

    //n日間（LocalStorage保存分）の業務時間を追加した、今月分のテーブルを表示
    //for(let dateKey in records){
    for (let day = 1; day <= daysInMonth; day++) {

        let dateKey = year + "-" + month + "-" + day.toString().padStart(2, '0');
        let currentDate = new Date(dateKey);

            //const year = currentDate.getFullYear();
            //const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
            //const day = currentDate.getDate().toString().padStart(2, '0');

        let tr = document.createElement('tr');
        let weekNum = currentDate.getDay(); // 曜日番号
        let dayOfWeek = week[weekNum]; // 曜日：（日）
        let formattedDate = `${currentDate.getMonth() + 1}/${currentDate.getDate()} ${dayOfWeek}`;  //月日
        let weekColor = "weekColor-ta";
        if(weekNum == 0 || weekNum == 6){
            weekColor = "weekColor-" + String(weekNum); // 日曜・土曜の背景色のクラス
        }
        let startTime = '-';
        let endTime = '-';
        let tenkoDuration = '-';

        let record = records[dateKey];
            //console.log(dateKey,record)
        // データが存在し、開始と終了がペアになっている場合のみ時間を計算
        if (record) {
            const startDate = new Date(record.start_time);
            const endDate = new Date(record.end_time);
            //開始時間と終了時間の両方が存在する場合
            if (record.start_time && record.end_time) {
                // 開始時間・終了時間 (例: 8時10分)
                startTime = `${startDate.getHours()}：${startDate.getMinutes().toString().padStart(2, '0')}`;
                endTime = `${endDate.getHours()}：${endDate.getMinutes().toString().padStart(2, '0')}`;
                // 業務時間計算 (例: 5：00)
                const diffMs = endDate - startDate;
                if (diffMs >= 0) {
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    tenkoDuration = `${diffHours}時間${diffMinutes.toString().padStart(2, '0')}分`;
                }
            //開始時間だけが存在する場合
            }else if(record.start_time){
                startTime = `${startDate.getHours()}：${startDate.getMinutes().toString().padStart(2, '0')}`;
            //終了時間だけが存在する場合
            }else if(record.end_time){
                endTime = `${endDate.getHours()}：${endDate.getMinutes().toString().padStart(2, '0')}`;
            }
        }

        tr.innerHTML = `
            <td class="${weekColor}">${formattedDate}</td>
            <td>${startTime}</td>
            <td>${endTime}</td>
            <td>${tenkoDuration}</td>
        `;
        tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    //---function end---
    return table;

}
document.addEventListener('DOMContentLoaded', () => {
    const REPORT_HISTORY_KEY = 'reportHistory';
    const tableContainer = document.getElementById('table-container');

    if (!tableContainer) {
        console.error('テーブルを表示するコンテナが見つかりません。');
        return;
    }

    // 1. 先週の日曜日と土曜日の日付を取得
    //const today = new Date();
    //const lastSunday = new Date(today);
    // 今日の曜日番号(0=日, 1=月...)を引いて今週の日曜を求め、さらに7日引いて先週の日曜を計算
    //lastSunday.setDate(today.getDate() - today.getDay() - 7);
    //lastSunday.setHours(0, 0, 0, 0);

    // 2. localStorageから履歴全データ（過去15日間）を取得
    const history = JSON.parse(localStorage.getItem(REPORT_HISTORY_KEY)) || [];

    if (history.length === 0) {
        tableContainer.innerHTML = '<p>履歴がありません。</p>';
        return;
    }

    // 3. 履歴データを日付ごとに開始・終了時刻をまとめる
    // 例: { "2024-07-21": { start: "...", end: "..." }, ... }
    const dailyRecords = {};
    history.forEach(record => {
        //console.log("report:29",record.start,record.end);
        const dateTimeString = record.start || record.end;
        if (!dateTimeString) return;

        const recordDateStr = dateTimeString.split('T')[0]; // "YYYY-MM-DD"
        if (!dailyRecords[recordDateStr]) {
            dailyRecords[recordDateStr] = {};
        }
        // その日の最も早い開始時刻を記録する
        if (record.start) {
            if (!dailyRecords[recordDateStr].start || new Date(record.start) < new Date(dailyRecords[recordDateStr].start)) {
                dailyRecords[recordDateStr].start = record.start;
                //console.log("report:39:start=", recordDateStr, dailyRecords[recordDateStr].start);
            }
        }
        // その日の最も遅い終了時刻を記録する
        if (record.end) {
            if (!dailyRecords[recordDateStr].end || new Date(record.end) > new Date(dailyRecords[recordDateStr].end)) {
                dailyRecords[recordDateStr].end = record.end;
                //console.log("report:45:end=", recordDateStr, dailyRecords[recordDateStr].end);
            }        
        }
    });

    //const table = tenkoTimeTable(dailyRecords,lastSunday);
    const table = tenkoTimeTable(dailyRecords);

    // 生成したテーブルをコンテナに追加
    tableContainer.appendChild(table);


});

// 点呼時間のテーブルを出力
const tenkoTimeTable = (records) => {

    //---function start---
    //先週の日曜日の月を取得
    //const nextSundayDate = new Date(nextSunday);
    //const nextSundayMonth = nextSundayDate.getMonth() + 1;

    // 4. テーブル要素を生成
    const table = document.createElement('table');
    table.className = 'report-table';
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>月日</th>
            <th>開始</th>
            <th>終了</th>
            <th>点呼時間 ※1</th>
        </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    // 5. 先週の日曜日から7日間ループしてテーブルの行を作成
    //for (let i = 0; i < 7; i++) {
    //records.forEach(record => {
        /*
        const currentDate = new Date(nextSunday);
        currentDate.setDate(nextSunday.getDate() + i);

        const year = currentDate.getFullYear();
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const day = currentDate.getDate().toString().padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`; // "YYYY-MM-DD"

        const record = records[dateKey];

        */
    //15日間（LocalStorage保存分）をすべての点呼時間のテーブルを表示
    for(let dateKey in records){

        const record = records[dateKey];
        const currentDate = new Date(dateKey);
        //const year = currentDate.getFullYear();
        //const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        //const day = currentDate.getDate().toString().padStart(2, '0');

        const tr = document.createElement('tr');

        // 月日 (例: 6/23 (日))
        const week = ['(日)', '(月)', '(火)', '(水)', '(木)', '(金)', '(土)'];
        const dayOfWeek = week[currentDate.getDay()];
        const formattedDate = `${currentDate.getMonth() + 1}/${currentDate.getDate()} ${dayOfWeek}`;

        let startTime = '-';
        let endTime = '-';
        let tenkoDuration = '-';

        //console.log("record:90",record.start,record.end)
        // データが存在し、開始と終了がペアになっている場合のみ時間を計算
        if (record && record.start && record.end) {
            const startDate = new Date(record.start);
            const endDate = new Date(record.end);

            // 開始時間・終了時間 (例: 8時10分)
            startTime = `${startDate.getHours()}：${startDate.getMinutes().toString().padStart(2, '0')}`;
            endTime = `${endDate.getHours()}：${endDate.getMinutes().toString().padStart(2, '0')}`;

            // 拘束時間計算 (例: 5：00)
            const diffMs = endDate - startDate;
            if (diffMs >= 0) {
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                tenkoDuration = `${diffHours}時間${diffMinutes.toString().padStart(2, '0')}分`;
            }
        }

        tr.innerHTML = `
            <td>${formattedDate}</td>
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
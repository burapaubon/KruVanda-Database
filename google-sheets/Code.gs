// Paste into the Apps Script project opened FROM the score spreadsheet.
const APP_ORIGIN = 'https://burapaubon.github.io';
const QUIZZES = {
  pretest: {tab: 'คะแนนก่อนเรียน', label: 'เกมก่อนเรียน หน่วยที่ 2', key: [1, 0, 2, 0, 1, 2, 0, 1, 3, 1], options: 4},
  posttest: {tab: 'คะแนนหลังเรียน', label: 'แบบทดสอบหลังเรียน หน่วยที่ 2', key: [0, 1, 1, 0, 1, 0, 0, 0, 0, 0], options: 3}
};
const HEADERS = ['วันที่ส่ง (เวลาไทย)', 'ชื่อ–นามสกุล', 'ชั้นเรียน', 'คะแนน', 'คะแนนเต็ม', 'ร้อยละ', 'แบบทดสอบ', 'รหัสการส่ง'];

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('กรุณาเปิด Apps Script จากเมนูส่วนขยายของชีตรับคะแนน');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  ss.setSpreadsheetTimeZone('Asia/Bangkok');
  Object.keys(QUIZZES).forEach(type => ensureScoreSheet(ss, QUIZZES[type].tab));
}

function ensureScoreSheet(ss, tab) {
  let sheet = ss.getSheetByName(tab);
  if (!sheet) {
    sheet = ss.insertSheet(tab);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#eeeeee');
    sheet.setColumnWidths(1, 3, 210);
    sheet.setColumnWidths(4, 3, 100);
    sheet.setColumnWidths(7, 2, 260);
  }
  sheet.setFrozenRows(1);
  return sheet;
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ok: true, service: 'KruVanda scores', version: 2, quizzes: ['pretest', 'posttest']}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let attemptId = '';
  let result;
  try {
    const data = JSON.parse(e.parameter.payload || '{}');
    attemptId = String(data.attemptId || '');
    if (!/^[a-f0-9-]{36}$/i.test(attemptId)) throw new Error('รหัสการส่งไม่ถูกต้อง');
    const quizType = data.quizType === undefined ? 'pretest' : data.quizType;
    if (quizType !== 'pretest' && quizType !== 'posttest') throw new Error('ชนิดแบบทดสอบไม่ถูกต้อง');
    const quiz = QUIZZES[quizType];
    const name = String(data.name || '').trim();
    const classroom = String(data.classroom || '');
    if (!name || name.length > 40 || !['ปวช.3', 'ม.6', 'อื่น ๆ'].includes(classroom)) throw new Error('ข้อมูลนักเรียนไม่ครบ');
    if (!Array.isArray(data.answers) || data.answers.length !== 10 ||
        data.answers.some(a => !Number.isInteger(a) || a < 0 || a >= quiz.options)) throw new Error('คำตอบไม่ครบ 10 ข้อ');
    const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!id) throw new Error('ครูยังไม่ได้เรียกใช้ setup');
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const sheet = ensureScoreSheet(SpreadsheetApp.openById(id), quiz.tab);
      if (!sheet) throw new Error('ไม่พบตารางรับคะแนน');
      const lastRow = sheet.getLastRow();
      const existing = lastRow > 1 ? sheet.getRange(2, 8, lastRow - 1, 1)
        .createTextFinder(attemptId).matchEntireCell(true).findNext() : null;
      const points = data.answers.filter((a, i) => a === quiz.key[i]).length;
      if (!existing) {
        // Prefix text that Sheets might interpret as a formula.
        const safeName = /^[=+\-@\t\r\n]/.test(name) ? "'" + name : name;
        sheet.appendRow([Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss'),
          safeName, classroom, points, 10, points * 10, quiz.label, attemptId]);
        SpreadsheetApp.flush();
      }
      result = {type: 'kruvanda-score', attemptId: attemptId, ok: true, quizType: quizType, version: 2};
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    result = {type: 'kruvanda-score', attemptId: attemptId, ok: false,
      message: 'บันทึกไม่สำเร็จ กรุณาลองส่งอีกครั้งหรือแจ้งครู'};
  }
  // Send an acknowledgement only after the write succeeds. Never use no-cors fetch
  // as proof that a row was saved. No student data is returned to the iframe.
  const json = JSON.stringify(result).replace(/</g, '\\u003c');
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><script>window.top.postMessage(' +
    json + ', ' + JSON.stringify(APP_ORIGIN) + ');</script>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

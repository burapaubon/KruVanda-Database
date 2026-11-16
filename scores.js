let currentScoreSubmission = null;
const scoreEndpoint = window.KRUVANDA_SCORE_ENDPOINT || '';
const scoreEndpointValid = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(scoreEndpoint);

function resetScoreSubmission() {
  currentScoreSubmission = null;
  document.getElementById('saveStatus').textContent = '';
  document.getElementById('retrySave').hidden = true;
}

function saveGameScore() {
  if (!scoreEndpointValid) return;
  currentScoreSubmission = {
    attemptId: crypto.randomUUID(),
    name: document.getElementById('player').value.trim(),
    classroom: document.getElementById('classroom').value,
    answers: answers.slice(),
    pending: false,
    saved: false
  };
  sendScore(currentScoreSubmission);
}

function retrySaveScore() {
  if (currentScoreSubmission) sendScore(currentScoreSubmission);
}

function sendScore(record) {
  if (record.pending || record.saved) return;
  const status = document.getElementById('saveStatus');
  const retry = document.getElementById('retrySave');
  record.pending = true;
  status.textContent = 'กำลังบันทึกคะแนนให้ครู…';
  retry.hidden = true;
  const frame = document.createElement('iframe');
  frame.name = 'score_' + record.attemptId;
  frame.hidden = true;
  frame.title = 'ส่งผลคะแนน';
  const form = document.createElement('form');
  form.hidden = true;
  form.method = 'POST';
  form.action = scoreEndpoint;
  form.target = frame.name;
  const payload = document.createElement('input');
  payload.name = 'payload';
  payload.value = JSON.stringify({attemptId: record.attemptId, name: record.name,
    classroom: record.classroom, answers: record.answers});
  form.appendChild(payload);
  document.body.append(frame, form);
  let finished = false;
  function finish(ok) {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    window.removeEventListener('message', acknowledge);
    frame.remove();
    form.remove();
    record.pending = false;
    record.saved = ok;
    if (currentScoreSubmission !== record) return;
    status.textContent = ok ? '✓ บันทึกคะแนนให้ครูแล้ว' :
      'ยังยืนยันการบันทึกไม่ได้ กรุณากดลองส่งอีกครั้ง หรือแคปหน้าจอส่งครู';
    retry.hidden = ok;
  }
  function acknowledge(event) {
    if (!/^https:\/\/(?:[a-z0-9-]+\.)?script\.googleusercontent\.com$/.test(event.origin) &&
        event.origin !== 'https://script.google.com') return;
    const data = event.data;
    if (!data || data.type !== 'kruvanda-score' || data.attemptId !== record.attemptId ||
        typeof data.ok !== 'boolean') return;
    finish(data.ok);
  }
  window.addEventListener('message', acknowledge);
  const timer = setTimeout(() => finish(false), 30000);
  try { form.submit(); } catch (_) { finish(false); }
}

if (scoreEndpointValid) {
  document.getElementById('scoreNotice').textContent =
    'เมื่อทำครบ 10 ข้อ ระบบจะส่งชื่อ ชั้นเรียน และคะแนนให้ครูโดยอัตโนมัติ';
}

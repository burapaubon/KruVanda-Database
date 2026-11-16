const posttestEnabled = scoreEndpointValid && window.KRUVANDA_POSTTEST_ENABLED === true;
document.getElementById('scoreNotice').textContent = posttestEnabled ?
  'เมื่อส่งคำตอบครบ 10 ข้อ ระบบจะบันทึกชื่อ ชั้นเรียน และคะแนนหลังเรียนให้ครูอัตโนมัติ' :
  'ขณะนี้ให้แคปหน้าจอคะแนนส่งครูผ่าน KruVanda Classroom';

function savePosttestScore(name, classroom, answerValues) {
  if (!posttestEnabled) {
    document.getElementById('saveStatus').textContent = 'กรุณาแคปหน้าจอคะแนนส่งครู';
    return;
  }
  currentScoreSubmission = {attemptId: crypto.randomUUID(), name, classroom,
    answers: answerValues.slice(), quizType: 'posttest', pending: false, saved: false};
  sendScore(currentScoreSubmission);
}

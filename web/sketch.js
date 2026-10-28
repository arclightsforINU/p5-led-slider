// 복잡한 통신은 serial-helper.js가 처리합니다.
let serial, connectButton;
let ledOn = false;
let potValue = 0;
let statusText = 'Arduino를 연결해 주세요.';

// LED2 (D9 PWM) 밝기 슬라이더
let led2Value = 0;            // 0~255
let draggingSlider = false;
let lastSent = -1;
let sending = false;          // 전송 중복 방지
let pendingPWM = null;        // 전송 중에 바뀐 최신 값
const SL = { x: 540, top: 110, bottom: 300 }; // 수직 슬라이더 위치

function setup() {
  createCanvas(600, 400);
  textFont('sans-serif');
  serial = new SerialHelper(9600, receiveLine, message => statusText = message);
  connectButton = createButton('Arduino 연결 / 해제');
  connectButton.mousePressed(() => serial.toggle());
}

function draw() {
  background(242, 246, 250);
  fill(25, 40, 60); noStroke(); textAlign(CENTER);
  textSize(24); text('Arduino Uno R3 · Web Serial', width / 2, 36);
  textSize(14); text(statusText, width / 2, 66);

  // LED1 (D13) 토글 버튼
  fill(ledOn ? '#22c55e' : '#64748b');
  circle(160, 175, 110);
  fill(255); textSize(22); text(ledOn ? 'ON' : 'OFF', 160, 183);
  fill(25, 40, 60); textSize(15); text('원을 클릭하면 LED 토글', 160, 260);

  // 가변저항 A0 막대
  text('가변저항 A0', 340, 120);
  fill('#dbe3ed'); rect(240, 155, 200, 40, 10);
  fill('#3b82f6'); rect(240, 155, map(potValue, 0, 1023, 0, 200), 40, 10);
  fill(25, 40, 60); textSize(24); text(potValue + ' / 1023', 340, 235);

  // LED2 (D9) 수직 슬라이더
  drawSlider();

  fill(25, 40, 60); textSize(14);
  text('9600 baud · ON / OFF / PWM:0~255 + 줄바꿈', 300, 345);
  text('수신: 0~1023 또는 POT:값 · LED:ON / LED:OFF', 300, 370);
}

function drawSlider() {
  fill(25, 40, 60); textSize(15); textAlign(CENTER);
  text('LED2 밝기', SL.x, SL.top - 25);

  // 트랙
  fill('#dbe3ed'); rect(SL.x - 6, SL.top, 12, SL.bottom - SL.top, 6);

  // 채워진 부분 + 손잡이
  const hy = map(led2Value, 0, 255, SL.bottom, SL.top);
  fill('#f59e0b'); rect(SL.x - 6, hy, 12, SL.bottom - hy, 6);
  fill(255); stroke('#f59e0b'); strokeWeight(3);
  circle(SL.x, hy, 26);
  noStroke();

  // 값 표시
  fill(25, 40, 60); textSize(16);
  text(led2Value + ' / 255', SL.x, SL.bottom + 30);
}

async function mousePressed() {
  // 슬라이더 영역 클릭 → 드래그 시작
  if (abs(mouseX - SL.x) < 20 && mouseY > SL.top - 15 && mouseY < SL.bottom + 15) {
    draggingSlider = true;
    updateSlider();
    return;
  }

  // LED1 원 클릭 → 토글
  if (dist(mouseX, mouseY, 160, 175) > 55) return;
  const next = !ledOn;
  if (await serial.send(next ? 'ON' : 'OFF')) ledOn = next;
}

function mouseDragged() {
  if (draggingSlider) updateSlider();
}

function mouseReleased() {
  draggingSlider = false;
}

function updateSlider() {
  const y = constrain(mouseY, SL.top, SL.bottom);
  led2Value = round(map(y, SL.bottom, SL.top, 0, 255));
  if (led2Value !== lastSent) {
    lastSent = led2Value;
    sendPWM(led2Value);   // 값이 바뀔 때만 전송
  }
}

// 드래그 중 전송이 겹치지 않도록 하나씩 보내고, 밀린 값은 최신 값만 보냅니다.
async function sendPWM(value) {
  pendingPWM = value;
  if (sending) return;
  sending = true;
  while (pendingPWM !== null) {
    const v = pendingPWM;
    pendingPWM = null;
    await serial.send('PWM:' + v);
  }
  sending = false;
}

function receiveLine(line) {
  // Arduino가 보내는 한 줄을 화면에 반영합니다.
  const message = line.trim().toUpperCase();
  if (message === 'LED:ON' || message === 'ON') ledOn = true;
  else if (message === 'LED:OFF' || message === 'OFF') ledOn = false;
  else {
    const match = message.match(/^(?:POT\s*[:=]\s*)?(\d+)$/);
    if (match) potValue = constrain(Number(match[1]), 0, 1023);
  }
}

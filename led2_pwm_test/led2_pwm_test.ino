// p5.js sketch.js와 짝을 이루는 최소 테스트 스케치
// 수신: ON / OFF / PWM:0~255 (줄바꿈 포함)
// 송신: POT:0~1023

const int LED1_PIN = 13;  // 토글 LED
const int LED2_PIN = 9;   // 밝기 조절 LED (PWM)
const int POT_PIN  = A0;

int lastPot = -1;
unsigned long lastPotTime = 0;

void setup() {
  Serial.begin(9600);
  Serial.setTimeout(50);          // readStringUntil 대기 시간 단축
  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  analogWrite(LED2_PIN, 0);
}

void loop() {
  // 1) 웹에서 온 명령 처리
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    line.toUpperCase();

    if (line.startsWith("PWM:")) {
      int v = constrain(line.substring(4).toInt(), 0, 255);
      analogWrite(LED2_PIN, v);
    } else if (line == "ON") {
      digitalWrite(LED1_PIN, HIGH);
      Serial.println("LED:ON");
    } else if (line == "OFF") {
      digitalWrite(LED1_PIN, LOW);
      Serial.println("LED:OFF");
    }
  }

  // 2) 가변저항 값이 바뀌면 100ms마다 전송
  if (millis() - lastPotTime > 100) {
    lastPotTime = millis();
    int pot = analogRead(POT_PIN);
    if (abs(pot - lastPot) > 2) {
      lastPot = pot;
      Serial.print("POT:");
      Serial.println(pot);
    }
  }
}

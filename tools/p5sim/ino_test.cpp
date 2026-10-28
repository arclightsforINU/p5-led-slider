// Feeds serial lines to led2_pwm_test.ino on the host and checks the LED pins and the replies.
#include "Arduino.h"

unsigned long simNow = 0;
int simPin[20], simPot = 0;
SimSerial Serial;

#include "../../p5-led-slider/led2_pwm_test/led2_pwm_test.ino"

void runFor(unsigned long ms) {
  for (unsigned long end = simNow + ms; simNow < end; simNow++) loop();
}

bool expect(const char *name, bool ok) {
  printf("%-52s %s\n", name, ok ? "PASS" : "FAIL");
  return ok;
}

bool send(const char *text, unsigned long ms = 5) {
  Serial.in += text;
  Serial.out.clear();
  runFor(ms);
  return true;
}

int main() {
  setup();
  runFor(1);
  bool ok = true;
  ok &= expect("starts with LED2 (D9) at 0", simPin[9] == 0);
  send("PWM:128\n");
  ok &= expect("PWM:128 -> analogWrite(9, 128)", simPin[9] == 128);
  send("pwm:300\n");
  ok &= expect("lower case, 300 -> clamped to 255", simPin[9] == 255);
  send("PWM:-5\n");
  ok &= expect("PWM:-5 -> clamped to 0", simPin[9] == 0);
  send("  ON \r\n");
  ok &= expect("' ON \\r' -> D13 HIGH and reply LED:ON", simPin[13] == HIGH && Serial.out == "LED:ON\r\n");
  send("OFF\n");
  ok &= expect("OFF -> D13 LOW and reply LED:OFF", simPin[13] == LOW && Serial.out == "LED:OFF\r\n");
  send("PWM:200\n");
  send("PWM:abc\n");
  ok &= expect("PWM:abc -> toInt() gives 0, LED2 off", simPin[9] == 0);
  std::string burst;
  for (int v = 1; v <= 40; v++) burst += "PWM:" + std::to_string(v) + "\n";
  send(burst.c_str(), 60);
  ok &= expect("40 queued lines -> one per loop, ends at 40", simPin[9] == 40 && Serial.in.empty());
  Serial.out.clear();
  simPot = 500; runFor(250);
  std::string first = Serial.out;
  Serial.out.clear();
  simPot = 502; runFor(250);
  std::string small = Serial.out;
  simPot = 503; runFor(250);
  ok &= expect("pot 500 -> POT:500", first == "POT:500\r\n");
  ok &= expect("pot moves by 2 -> no report", small.empty());
  ok &= expect("pot moves by 3 -> POT:503", Serial.out == "POT:503\r\n");
  puts(ok ? "ALL PASS" : "SOME FAILED");
  return ok ? 0 : 1;
}

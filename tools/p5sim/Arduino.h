// Host-side Arduino stand-in for the p5 PWM sketch: String, Serial with an input queue, pins and a clock.
#pragma once
#include <cctype>
#include <cstdio>
#include <cstdlib>
#include <string>

#define HIGH 1
#define LOW 0
#define OUTPUT 1
#define A0 14

extern unsigned long simNow;
extern int simPin[20], simPot;
inline unsigned long millis() { return simNow; }
inline void pinMode(int, int) {}
inline void digitalWrite(int pin, int v) { simPin[pin] = v; }
inline void analogWrite(int pin, int v) { simPin[pin] = v; }
inline int analogRead(int) { return simPot; }
#define constrain(amt, low, high) ((amt) < (low) ? (low) : ((amt) > (high) ? (high) : (amt)))

struct String {
  std::string s;
  String(const std::string &v = "") : s(v) {}
  void trim() {
    size_t a = s.find_first_not_of(" \t\r\n"), b = s.find_last_not_of(" \t\r\n");
    s = a == std::string::npos ? "" : s.substr(a, b - a + 1);
  }
  void toUpperCase() { for (char &c : s) c = toupper((unsigned char)c); }
  bool startsWith(const char *p) const { return s.rfind(p, 0) == 0; }
  String substring(size_t from) const { return String(from < s.size() ? s.substr(from) : ""); }
  long toInt() const { return atol(s.c_str()); }
  bool operator==(const char *o) const { return s == o; }
};

struct SimSerial {
  std::string in, out;
  void begin(long) {}
  void setTimeout(long) {}
  int available() { return (int)in.size(); }
  String readStringUntil(char end) {
    size_t i = in.find(end);
    std::string line = in.substr(0, i);
    in.erase(0, i == std::string::npos ? in.size() : i + 1);
    return String(line);
  }
  void print(const char *v) { out += v; }
  void println(const char *v) { out += v; out += "\r\n"; }
  void println(int v) { out += std::to_string(v) + "\r\n"; }
};
extern SimSerial Serial;

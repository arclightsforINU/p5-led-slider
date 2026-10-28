// Drags the p5 slider in sketch.js against a fake serial port and checks that sends never overlap and the last value arrives.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../../p5-led-slider/web/sketch.js", import.meta.url), "utf8");
const SEND_MS = 8.3;

async function drag(variant) {
  let busy = 0, overlaps = 0, now = 0;
  const sent = [];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const ctx = {
    console, Math,
    map: (v, a, b, c, d) => c + (v - a) * (d - c) / (b - a),
    round: Math.round, abs: Math.abs,
    constrain: (v, lo, hi) => Math.min(Math.max(v, lo), hi),
    mouseX: 540, mouseY: 300,
  };
  vm.createContext(ctx);
  vm.runInContext(source + `
    serial = { send: async msg => {
      if (__busy()) __overlap();
      __enter(); await __sleep(${SEND_MS}); __sent(msg); __leave(); return true;
    } };`, ctx);
  Object.assign(ctx, {
    __busy: () => busy > 0, __overlap: () => overlaps++, __enter: () => busy++, __leave: () => busy--,
    __sleep: sleep, __sent: msg => sent.push(msg),
  });
  if (variant === "naive") vm.runInContext("sendPWM = value => serial.send('PWM:' + value);", ctx);

  const changes = new Set();
  for (let y = 300; y >= 110; y -= 1) {
    ctx.mouseY = y;
    vm.runInContext("draggingSlider = true; updateSlider();", ctx);
    changes.add(vm.runInContext("led2Value", ctx));
    await sleep(2);
  }
  while (busy > 0) await sleep(5);
  await sleep(20);
  return { changes: changes.size, sends: sent.length, overlaps, last: sent.at(-1) };
}

let ok = true;
for (const variant of ["sketch.js", "naive"]) {
  const r = await drag(variant);
  const pass = r.overlaps === 0 && r.last === "PWM:255";
  if (variant === "sketch.js") ok &&= pass;
  console.log(`${variant.padEnd(10)} value changes ${r.changes}, sends ${r.sends}, overlapping sends ${r.overlaps}, last ${r.last}  ${pass ? "PASS" : "FAIL"}`);
}
console.log(ok ? "sketch.js PASS" : "sketch.js FAIL");
process.exit(ok ? 0 : 1);

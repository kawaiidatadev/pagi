/* PAGI · lógica pura, sin DOM ni textos de interfaz.
   La usan la página (app.js) y las pruebas (tests/tests.html). Todas las reglas son deterministas. */
(function (root) {
  'use strict';

  /* ---------- 1. Calculadora económica ----------
     horasAnuales      = horasSemana × personas × semanas
     costoActual       = horasAnuales × costoHora
     horasLiberadas    = horasAnuales × reducción              (reducción entre 0 y 0.95)
     valorLiberado     = horasLiberadas × costoHora            (valor del tiempo; no es dinero ahorrado por sí solo)
     costoAutomatizado = (horasAnuales − horasLiberadas) × costoHora + recurrenteAnual
     beneficioAnual    = valorLiberado − recurrenteAnual
     beneficioNeto     = beneficioAnual × años − inversión     (en el horizonte elegido)
     recuperación      = inversión ÷ (beneficioAnual ÷ 12) meses; 0 si no hay inversión; null si beneficioAnual ≤ 0
     ROI               = beneficioNeto ÷ (inversión + recurrenteAnual × años); null si ese costo total es 0
     Escenarios: la reducción elegida × 0.6 (conservador), × 1 (intermedio) y × 1.3 con tope de 95% (optimista). */
  var SCENARIOS = { conservador: 0.6, intermedio: 1, optimista: 1.3 };
  var LIMITS = {
    horas: [0, 168], personas: [1, 500], costoHora: [0, 100000], semanas: [1, 52],
    reduccion: [0, 0.95], inversion: [0, 1e9], recurrente: [0, 1e9], anios: [1, 10]
  };

  function validateInputs(raw) {
    var out = {}, errors = {};
    Object.keys(LIMITS).forEach(function (k) {
      var v = raw[k];
      var n = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(/[,\s$]/g, ''));
      if (String(v == null ? '' : v).trim() === '' || !isFinite(n)) { errors[k] = 'empty'; return; }
      if (n < LIMITS[k][0] || n > LIMITS[k][1]) { errors[k] = 'range'; return; }
      out[k] = n;
    });
    if (!errors.personas && out.personas % 1 !== 0) errors.personas = 'integer';
    if (!errors.anios && out.anios % 1 !== 0) errors.anios = 'integer';
    return { values: out, errors: errors, ok: Object.keys(errors).length === 0 };
  }

  function round2(x) { return Math.round(x * 100) / 100; }

  function roi(p) {
    var hy = p.horas * p.personas * p.semanas;
    var current = hy * p.costoHora;
    var freedH = hy * p.reduccion;
    var freed = freedH * p.costoHora;
    var autoCost = (hy - freedH) * p.costoHora + p.recurrente;
    var annual = freed - p.recurrente;
    var net = annual * p.anios - p.inversion;
    var payback = p.inversion === 0 ? (annual >= 0 ? 0 : null) : (annual > 0 ? p.inversion / (annual / 12) : null);
    var cost = p.inversion + p.recurrente * p.anios;
    var months = p.anios * 12, serie = [];
    for (var m = 0; m <= months; m++) serie.push(round2(annual / 12 * m - p.inversion));
    return {
      reduccion: p.reduccion, horasAnuales: round2(hy), costoActual: round2(current),
      horasLiberadas: round2(freedH), valorLiberado: round2(freed), costoAutomatizado: round2(autoCost),
      manualRestante: round2((hy - freedH) * p.costoHora), recurrente: p.recurrente, inversion: p.inversion,
      beneficioAnual: round2(annual), beneficioNeto: round2(net),
      recuperacionMeses: payback === null ? null : round2(payback),
      recuperaDentroHorizonte: payback !== null && payback <= months,
      roi: cost > 0 ? round2(net / cost * 100) : null, serie: serie
    };
  }

  function scenarios(p) {
    var out = {};
    Object.keys(SCENARIOS).forEach(function (k) {
      var q = {}; for (var key in p) q[key] = p[key];
      q.reduccion = Math.min(0.95, p.reduccion * SCENARIOS[k]);
      out[k] = roi(q);
    });
    return out;
  }

  /* ---------- 2. Autodiagnóstico ----------
     7 preguntas; cada respuesta vale 0 (nunca), 1 (a veces) o 2 (seguido) y suma a un servicio.
     Nivel: total 0–4 bajo, 5–8 medio, 9–14 alto.
     Problemas principales: preguntas respondidas con 2.
     Servicio sugerido después del diagnóstico: el de más puntos entre S2, S3 y S4 (empate: ese orden).
     Siguiente paso: S1 (diagnóstico) si el total es mayor que 0; si es 0, no hay señal clara. */
  var QUIZ = [
    { id: 'reportes', svc: 'S2' }, { id: 'captura', svc: 'S2' }, { id: 'errores', svc: 'S2' },
    { id: 'dependencia', svc: 'S4' }, { id: 'kpis', svc: 'S3' }, { id: 'documentacion', svc: 'S4' },
    { id: 'rumbo', svc: 'S1' }
  ];

  function evaluateQuiz(answers) {
    var total = 0, points = { S1: 0, S2: 0, S3: 0, S4: 0 }, top = [], missing = [];
    QUIZ.forEach(function (q) {
      var a = answers[q.id];
      if (a !== 0 && a !== 1 && a !== 2) { missing.push(q.id); return; }
      total += a; points[q.svc] += a;
      if (a === 2) top.push(q.id);
    });
    var order = ['S2', 'S3', 'S4'], best = null;
    order.forEach(function (s) { if (points[s] > 0 && (best === null || points[s] > points[best])) best = s; });
    return {
      complete: missing.length === 0, missing: missing, total: total, max: QUIZ.length * 2,
      level: total >= 9 ? 'alto' : total >= 5 ? 'medio' : 'bajo',
      top: top, points: points, suggested: best,
      next: total > 0 ? 'S1' : null
    };
  }

  /* ---------- 3. Laboratorio neuronal (simulación) ----------
     Red feedforward 4 → 4 → 3 con pesos DEFINIDOS A MANO para ilustrar; no está entrenada con datos reales.
     Entradas normalizadas a 0–1 con min–max. Capa oculta: ReLU(W1·x + b1). Salida: softmax(W2·h + b2).
     Cada neurona oculta tiene un significado porque sus pesos se eligieron a mano; en una red entrenada no siempre es así. */
  var NN = {
    inputs: [
      { id: 'temp', min: 20, max: 120, step: 1, value: 55 },
      { id: 'vib', min: 0, max: 20, step: 0.5, value: 2 },
      { id: 'amp', min: 50, max: 150, step: 1, value: 90 },
      { id: 'hrs', min: 0, max: 8000, step: 100, value: 1500 }
    ],
    hidden: ['termico', 'mecanico', 'electrico', 'desgaste'],
    outputs: ['normal', 'desgaste', 'anomalia'],
    //        temp  vib   amp   hrs
    W1: [[1.6, 0, 0.6, 0], [0, 1.8, 0, 0.3], [0.3, 0, 1.5, 0], [0, 0.5, 0, 1.4]],
    b1: [-0.9, -0.6, -1.0, -0.7],
    //        térm  mecá  eléc  desg
    W2: [[-2.0, -2.2, -2.0, -1.6], [0.4, 0.9, 0.2, 2.6], [2.4, 2.6, 2.4, 0.5]],
    b2: [1.2, -0.2, -0.8],
    presets: {
      normal: [55, 2, 90, 1500], desgaste: [62, 5, 95, 7000],
      calor: [105, 3, 130, 2000], vibracion: [60, 12, 100, 3000]
    }
  };

  function neuralForward(raw) {
    var x = NN.inputs.map(function (inp, i) {
      var v = Math.min(inp.max, Math.max(inp.min, +raw[i]));
      return round4((v - inp.min) / (inp.max - inp.min));
    });
    var z1 = NN.W1.map(function (w, j) { return round4(w.reduce(function (a, wi, i) { return a + wi * x[i]; }, NN.b1[j])); });
    var h = z1.map(function (z) { return Math.max(0, z); });
    var z2 = NN.W2.map(function (w, k) { return round4(w.reduce(function (a, wj, j) { return a + wj * h[j]; }, NN.b2[k])); });
    var m = Math.max.apply(null, z2), e = z2.map(function (z) { return Math.exp(z - m); }), sum = e.reduce(function (a, b) { return a + b; }, 0);
    var p = e.map(function (v) { return round4(v / sum); });
    var best = p.indexOf(Math.max.apply(null, p));
    return { x: x, z1: z1, h: h, z2: z2, p: p, best: best, cls: NN.outputs[best] };
  }
  function round4(v) { return Math.round(v * 10000) / 10000; }

  root.PAGILogic = {
    LIMITS: LIMITS, SCENARIOS: SCENARIOS, validateInputs: validateInputs, roi: roi, scenarios: scenarios,
    QUIZ: QUIZ, evaluateQuiz: evaluateQuiz,
    NN: NN, neuralForward: neuralForward
  };
})(typeof window !== 'undefined' ? window : this);

// ════════════════════════════════════════════════════════════
// KNOWLEDGE BASE — loaded from external JSON
// ════════════════════════════════════════════════════════════
let KB = [];

async function loadKB() {
  const grid = document.getElementById('articles-grid');
  if (grid) grid.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text3);font-family:var(--font-mono);font-size:13px;">⏳ Cargando base de conocimiento...</div>';
  try {
    const res = await fetch('./data/articulos.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    KB = await res.json();
    updateFilterCounts();
    if (grid) renderKB(KB);
  } catch (e) {
    console.error('Error loading KB:', e);
    if (grid) grid.innerHTML = '<div style="padding:32px;text-align:center;color:var(--red);font-family:var(--font-mono);font-size:13px;">⚠️ No se pudo cargar articulos.json. Asegúrese de abrir con --allow-file-access-from-files.</div>';
  }
}

// ════════════════════════════════════════════════════════════
// SYSTEM PROMPT para el agente IA
// ════════════════════════════════════════════════════════════
const PROTOCOLO = `PROTOCOLO CLINICO VALIDADO (USTA):
- Geometrias: PR=Rectangular, PI=Perfil en I, PC=Circular
- Materiales: CC=Cromo-Cobalto, TI=Titanio, ZR=Zirconio
- Implantes rectos: cualquier combinacion es segura biomecanicamente
- Implantes angulados All-on-4: preferir PR o PI con CC o Ti; evitar PC y ZR con cantilever
- Esfuerzos barra: PR/PI 315-1076 MPa, PC hasta 1.22 GPa
- Deformaciones: PR/PI menor a 0.010 mm, PC entre 0.014-0.056 mm
- Hueso trabecular y cortical: todos los casos dentro de limites seguros
- Bruxismo: preferir PI-Ti o PI-CC; evitar PC
- Espacio interoclusal reducido: usar PC-CC
- Pasividad: prueba Sheffield obligatoria antes de carga
- Semaforo seguridad: Verde menor 45 MPa, Amarillo 45-55 MPa, Rojo mayor 55 MPa`;

function buildSystemPrompt(topic, modelId) {
  const profile = MODEL_PROFILES[modelId] || MODEL_PROFILES['qwen3:8b'];
  const n = profile.num_articles;

  let relevantArticles;
  if (topic === 'all') {
    const perCat = Math.max(1, Math.floor(n / 4));
    const cats = ['fea','clinico','materiales','sistematica'];
    relevantArticles = cats.flatMap(c => KB.filter(a => a.category === c).slice(0, perCat));
  } else {
    relevantArticles = KB.filter(a => a.tags.includes(topic) || a.category === topic);
  }
  const kbText = relevantArticles.slice(0, n).map(a =>
    `[${a.id}] ${a.authors} (${a.year}). ${a.title}. ${a.journal}. ${a.abstract}`
  ).join('\n');

  if (profile.style === 'strict') {
    return `Eres DentIA, asistente clínico dental. REGLAS ESTRICTAS: responde SOLO con información del protocolo y artículos dados. NO inventes datos. Sé breve. Cita con [ID]. Responde en español.

${PROTOCOLO}

ARTÍCULOS (usa SOLO estos):
${kbText}

Termina siempre con: Información de apoyo académico-clínico, no sustituye el juicio profesional.`;
  }

  if (profile.style === 'structured') {
    return `Eres DentIA, agente clínico experto en prótesis híbridas implantosoportadas mandibulares. Responde en español citando fuentes con [ID]. No inventes datos.

${PROTOCOLO}

ARTÍCULOS DE REFERENCIA:
${kbText}

Estructura tu respuesta así:
**Indicación principal:** (cuándo aplica)
**Evidencia:** (artículos que lo respaldan con [ID])
**Consideraciones clínicas:** (factores a tener en cuenta)
**Contraindicaciones:** (cuándo evitarlo)

Termina con: Información de apoyo académico-clínico, no sustituye el juicio profesional.`;
  }

  // style === 'standard' (qwen3:8b, 14b, 32b)
  return `Eres DentIA, agente clínico experto en prótesis híbridas implantosoportadas mandibulares. Responde en español, de forma clara y concisa. Cita fuentes con [ID]. No inventes datos.

${PROTOCOLO}

ARTÍCULOS DE REFERENCIA:
${kbText}

Responde usando el protocolo y artículos anteriores. Termina con: Información de apoyo académico-clínico, no sustituye el juicio profesional.`;
}

// ════════════════════════════════════════════════════════════
// CASOS CLÍNICOS
// ════════════════════════════════════════════════════════════
const CASOS = [
  {
    id: 1,
    nombre: 'Paciente 1 — Mujer, 62 a.',
    descripcion: 'Paciente femenina de 62 años, edéntula total mandibular. Hueso denso tipo I-II, sin atrofia significativa. Sin antecedentes de parafunción.',
    params: { tecnica:'rectos', hueso:'denso', cant:8, espacio:'normal', brux:false, estetica:false, fea:false, carga:'media' },
    tags: ['Hueso denso', 'Sin bruxismo', '4 rectos'],
    tooltip: [
      { k:'Técnica',    v:'4 implantes rectos' },
      { k:'Condición ósea', v:'Hueso denso (tipo I-II)' },
      { k:'Cantilever', v:'8 mm' },
      { k:'Carga oclusal', v:'Media' },
      { k:'Parafunción', v:'No' },
      { k:'Espacio interoclusal', v:'Normal (≥12 mm)' },
    ]
  },
  {
    id: 2,
    nombre: 'Paciente 2 — Hombre, 55 a.',
    descripcion: 'Paciente masculino de 55 años con atrofia ósea severa en sector posterior. Candidato a All-on-4 por disponibilidad ósea limitada en zonas distales.',
    params: { tecnica:'allon4', hueso:'severa', cant:12, espacio:'normal', brux:false, estetica:false, fea:false, carga:'media' },
    tags: ['Pérd. severa', 'All-on-4', 'Cant. moderado'],
    tooltip: [
      { k:'Técnica',    v:'All-on-4 (angulados 30–45°)' },
      { k:'Condición ósea', v:'Pérdida severa' },
      { k:'Cantilever', v:'12 mm' },
      { k:'Carga oclusal', v:'Media' },
      { k:'Parafunción', v:'No' },
      { k:'Espacio interoclusal', v:'Normal (≥12 mm)' },
    ]
  },
  {
    id: 3,
    nombre: 'Paciente 3 — Mujer, 68 a.',
    descripcion: 'Paciente de 68 años con pérdida ósea moderada y diagnóstico de bruxismo severo. Requiere férula de descarga nocturna. Alta demanda funcional.',
    params: { tecnica:'allon4', hueso:'moderada', cant:10, espacio:'normal', brux:true, estetica:false, fea:false, carga:'alta' },
    tags: ['Bruxismo', 'Pérd. moderada', 'Carga alta'],
    tooltip: [
      { k:'Técnica',    v:'All-on-4 (angulados 30–45°)' },
      { k:'Condición ósea', v:'Pérdida moderada' },
      { k:'Cantilever', v:'10 mm' },
      { k:'Carga oclusal', v:'Alta' },
      { k:'Parafunción', v:'Bruxismo severo' },
      { k:'Espacio interoclusal', v:'Normal (≥12 mm)' },
    ]
  },
  {
    id: 4,
    nombre: 'Paciente 4 — Hombre, 70 a.',
    descripcion: 'Paciente de 70 años, espacio interoclusal reducido por extrusión dentaria. Hueso denso favorable. Bajo perfil funcional, sin parafunción.',
    params: { tecnica:'rectos', hueso:'denso', cant:6, espacio:'reducido', brux:false, estetica:false, fea:false, carga:'baja' },
    tags: ['Espacio reducido', '4 rectos', 'Carga baja'],
    tooltip: [
      { k:'Técnica',    v:'4 implantes rectos' },
      { k:'Condición ósea', v:'Hueso denso' },
      { k:'Cantilever', v:'6 mm' },
      { k:'Carga oclusal', v:'Baja' },
      { k:'Parafunción', v:'No' },
      { k:'Espacio interoclusal', v:'Reducido (<12 mm)' },
    ]
  },
  {
    id: 5,
    nombre: 'Paciente 5 — Mujer, 58 a.',
    descripcion: 'Paciente de 58 años, edéntula bilateral con atrofia ósea severa y bruxismo diagnosticado. Caso de alta complejidad biomecánica por cantilever largo.',
    params: { tecnica:'allon4', hueso:'severa', cant:16, espacio:'normal', brux:true, estetica:false, fea:false, carga:'alta' },
    tags: ['Bruxismo', 'Pérd. severa', 'Cant. largo'],
    tooltip: [
      { k:'Técnica',    v:'All-on-4 (angulados 30–45°)' },
      { k:'Condición ósea', v:'Pérdida severa' },
      { k:'Cantilever', v:'16 mm' },
      { k:'Carga oclusal', v:'Alta' },
      { k:'Parafunción', v:'Bruxismo' },
      { k:'Espacio interoclusal', v:'Normal (≥12 mm)' },
    ]
  },
  {
    id: 6,
    nombre: 'Paciente 6 — Hombre, 63 a.',
    descripcion: 'Paciente de 63 años con hueso denso y bruxismo moderado. Dieta dura habitual con alta demanda masticatoria. Planificación de 4 implantes rectos.',
    params: { tecnica:'rectos', hueso:'denso', cant:9, espacio:'normal', brux:true, estetica:false, fea:false, carga:'media' },
    tags: ['Bruxismo', 'Hueso denso', '4 rectos'],
    tooltip: [
      { k:'Técnica',    v:'4 implantes rectos' },
      { k:'Condición ósea', v:'Hueso denso' },
      { k:'Cantilever', v:'9 mm' },
      { k:'Carga oclusal', v:'Media' },
      { k:'Parafunción', v:'Bruxismo moderado' },
      { k:'Espacio interoclusal', v:'Normal (≥12 mm)' },
    ]
  },
  {
    id: 7,
    nombre: 'Paciente 7 — Mujer, 72 a.',
    descripcion: 'Paciente geriátrica de 72 años, pérdida ósea moderada. Espacio interoclusal reducido por colapso de dimensión vertical. Función masticatoria baja.',
    params: { tecnica:'rectos', hueso:'moderada', cant:7, espacio:'reducido', brux:false, estetica:false, fea:false, carga:'baja' },
    tags: ['Pérd. moderada', 'Espacio reducido', 'Geriátrica'],
    tooltip: [
      { k:'Técnica',    v:'4 implantes rectos' },
      { k:'Condición ósea', v:'Pérdida moderada' },
      { k:'Cantilever', v:'7 mm' },
      { k:'Carga oclusal', v:'Baja' },
      { k:'Parafunción', v:'No' },
      { k:'Espacio interoclusal', v:'Reducido (<12 mm)' },
    ]
  },
  {
    id: 8,
    nombre: 'Paciente 8 — Hombre, 50 a.',
    descripcion: 'Paciente joven de 50 años con buena densidad ósea. Elige All-on-4 por preferencia estética y menor número de implantes. Función oclusal media.',
    params: { tecnica:'allon4', hueso:'denso', cant:11, espacio:'normal', brux:false, estetica:true, fea:false, carga:'media' },
    tags: ['All-on-4', 'Hueso denso', 'Alta estética'],
    tooltip: [
      { k:'Técnica',    v:'All-on-4 (angulados 30–45°)' },
      { k:'Condición ósea', v:'Hueso denso' },
      { k:'Cantilever', v:'11 mm' },
      { k:'Carga oclusal', v:'Media' },
      { k:'Parafunción', v:'No' },
      { k:'Exigencia estética', v:'Alta' },
    ]
  },
  {
    id: 9,
    nombre: 'Paciente 9 — Mujer, 65 a.',
    descripcion: 'Caso de máxima complejidad: atrofia severa, bruxismo activo, espacio interoclusal reducido y cantilever largo. Requiere análisis FEA previo a la cirugía.',
    params: { tecnica:'allon4', hueso:'severa', cant:18, espacio:'reducido', brux:true, estetica:false, fea:true, carga:'alta' },
    tags: ['Alta complejidad', 'FEA requerido', 'Bruxismo'],
    tooltip: [
      { k:'Técnica',    v:'All-on-4 (angulados 30–45°)' },
      { k:'Condición ósea', v:'Pérdida severa' },
      { k:'Cantilever', v:'18 mm' },
      { k:'Carga oclusal', v:'Alta' },
      { k:'Parafunción', v:'Bruxismo activo' },
      { k:'Espacio interoclusal', v:'Reducido (<12 mm)' },
    ]
  },
  {
    id: 10,
    nombre: 'Paciente 10 — Hombre, 78 a.',
    descripcion: 'Paciente adulto mayor de 78 años con pérdida ósea moderada. Sin parafunción. Baja demanda funcional. Prioridad en confort y estabilidad protésica.',
    params: { tecnica:'rectos', hueso:'moderada', cant:8, espacio:'normal', brux:false, estetica:false, fea:false, carga:'baja' },
    tags: ['Pérd. moderada', '4 rectos', 'Geriátrico'],
    tooltip: [
      { k:'Técnica',    v:'4 implantes rectos' },
      { k:'Condición ósea', v:'Pérdida moderada' },
      { k:'Cantilever', v:'8 mm' },
      { k:'Carga oclusal', v:'Baja' },
      { k:'Parafunción', v:'No' },
      { k:'Espacio interoclusal', v:'Normal (≥12 mm)' },
    ]
  }
];

let casoActivoId = null;

function renderCasos() {
  return `
  <div class="casos-section">
    <div class="section-title" style="margin-top:0;">📋 Casos Clínicos</div>
    <ul class="casos-list">
      ${CASOS.map(c => `
      <li class="caso-item" id="caso-item-${c.id}"
          onclick="loadCaso(${c.id})"
          onmouseenter="showCasoTooltip(event, ${c.id})"
          onmouseleave="hideCasoTooltip()">
        <div class="caso-num">${c.id}</div>
        <div class="caso-info">
          <div class="caso-title">${c.nombre}</div>
          <div class="caso-tags">${c.tags.map(t => `<span class="caso-tag">${t}</span>`).join('')}</div>
        </div>
      </li>`).join('')}
    </ul>
  </div>`;
}

function showCasoTooltip(event, id) {
  const caso = CASOS.find(c => c.id === id);
  if (!caso) return;
  const tip = document.getElementById('caso-tooltip-global');
  if (!tip) return;

  tip.innerHTML = `
    <div class="caso-tooltip-name">${caso.nombre}</div>
    <div class="caso-tooltip-desc">${caso.descripcion}</div>
    <div class="caso-tooltip-params">
      ${caso.tooltip.map(p => `
      <div class="caso-tooltip-param">
        <span class="caso-tooltip-param-key">${p.k}:</span>
        <span class="caso-tooltip-param-val">${p.v}</span>
      </div>`).join('')}
    </div>
    <div class="caso-tooltip-hint">↩ Clic para configurar el simulador</div>`;

  tip.style.display = 'block';
  posicionarCasoTooltip(event);
}

function posicionarCasoTooltip(event) {
  const tip = document.getElementById('caso-tooltip-global');
  if (!tip || tip.style.display === 'none') return;
  const rect = event.currentTarget.getBoundingClientRect();
  const tipW = 240;
  const tipH = tip.offsetHeight || 200;
  const spaceRight = window.innerWidth - rect.right;
  const spaceLeft  = rect.left;

  let left, top;
  if (spaceRight >= tipW + 12) {
    left = rect.right + 10;
  } else if (spaceLeft >= tipW + 12) {
    left = rect.left - tipW - 10;
  } else {
    left = Math.max(8, rect.left);
  }

  top = rect.top;
  if (top + tipH > window.innerHeight - 12) {
    top = window.innerHeight - tipH - 12;
  }
  if (top < 8) top = 8;

  tip.style.left = left + 'px';
  tip.style.top  = top  + 'px';
}

function hideCasoTooltip() {
  const tip = document.getElementById('caso-tooltip-global');
  if (tip) tip.style.display = 'none';
}

function loadCaso(id) {
  const caso = CASOS.find(c => c.id === id);
  if (!caso) return;

  casoActivoId = id;

  // Actualizar estado
  Object.assign(state, caso.params);

  // Marcar caso activo visualmente
  document.querySelectorAll('.caso-item').forEach(el => el.classList.remove('caso-activo'));
  const item = document.getElementById('caso-item-' + id);
  if (item) item.classList.add('caso-activo');

  // Sincronizar botones de opción
  ['tecnica','hueso','espacio','carga'].forEach(key => {
    document.querySelectorAll(`[data-key="${key}"], [onclick*="'${key}'"]`).forEach(btn => {
      const val = btn.dataset.val || (btn.getAttribute('onclick') || '').match(/'([^']+)'\s*\)$/)?.[1];
      btn.classList.toggle('selected', val === state[key]);
    });
  });

  // Sincronizar slider cantilever
  const slider = document.getElementById('sl-cant');
  if (slider) { slider.value = state.cant; document.getElementById('sv-cant').textContent = state.cant + ' mm'; }

  // Sincronizar toggles
  const togBrex = document.getElementById('tog-brux');
  if (togBrex) togBrex.checked = state.brux;
  const togEst = document.getElementById('tog-estetica');
  if (togEst) togEst.checked = state.estetica;
  const togFea = document.getElementById('tog-fea');
  if (togFea) togFea.checked = state.fea;

  // Renderizar recomendación
  renderRecommendation();

  // Scroll suave al panel de resultados
  const right = document.getElementById('scroll-sim-right');
  if (right) requestAnimationFrame(() => right.scrollTop = 0);
}

// ════════════════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════════════════
const state = {
  tecnica: 'rectos',
  hueso: 'denso',
  cant: 8,
  espacio: 'normal',
  brux: false,
  estetica: false,
  fea: false,
  carga: 'media',
  topic: 'all',
  model: 'qwen3:8b',
  deepAnalysis: false,
  chatHistory: [],
  provider: localStorage.getItem('dentia_provider') || (window.__GROQ_READY__ ? 'groq' : 'ollama'),
  groqKey:  localStorage.getItem('dentia_groq_key')  || ''
};

// ════════════════════════════════════════════════════════════
// TABS
// ════════════════════════════════════════════════════════════
function resetScroll(elId, toBottom) {
  const el = document.getElementById(elId);
  if (!el) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.scrollTop = toBottom ? el.scrollHeight : 0;
    });
  });
}

function showPanel(id, btn) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  btn.classList.add('active');
  if (id === 'sim')   { resetScroll('scroll-sim-left'); resetScroll('scroll-sim-right'); }
  if (id === 'agent') { resetScroll('scroll-topics'); resetScroll('chat-messages', true); }
  if (id === 'kb')    { renderKB(KB); resetScroll('scroll-kb'); }
  if (id === 'stats') { renderStats(); resetScroll('scroll-stats'); }
  // FAB: visible en sim/kb/stats, oculto en agent/about
  const fab = document.getElementById('fab-agent');
  if (fab) {
    const hiddenPanels = ['agent', 'about'];
    fab.classList.toggle('fab-hidden', hiddenPanels.includes(id));
  }
}

function irAlAgente() {
  const agentBtn = document.querySelector('.tab[onclick*="\'agent\'"]');
  if (agentBtn) agentBtn.click();
}

// ════════════════════════════════════════════════════════════
// SIMULADOR LOGIC
// ════════════════════════════════════════════════════════════
function selectOpt(btn, key, val) {
  const group = btn.parentElement;
  group.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  if (key) state[key] = val;
  else {
    // infer key from siblings' data
    state[btn.dataset.key || inferKey(btn)] = btn.dataset.val;
  }
  update();
}

function inferKey(btn) {
  const parent = btn.closest('.field-group');
  if (!parent) return null;
  const label = parent.querySelector('.field-label');
  if (!label) return null;
  const text = label.textContent.toLowerCase();
  if (text.includes('ósea')) return 'hueso';
  if (text.includes('espacio')) return 'espacio';
  if (text.includes('demanda')) return 'carga';
  return null;
}

function updateSlider(key, val) {
  state[key] = parseInt(val);
  document.getElementById('sv-' + key).textContent = val + ' mm';
}

function update() {
  state.brux = document.getElementById('tog-brux').checked;
  state.estetica = document.getElementById('tog-estetica').checked;
  state.fea = document.getElementById('tog-fea').checked;
  renderRecommendation();
}

// Read option buttons state
document.addEventListener('DOMContentLoaded', () => {
  // Renderizar casos clínicos en el sidebar
  const casosContainer = document.getElementById('casos-container');
  if (casosContainer) casosContainer.innerHTML = renderCasos();

  // wire up option buttons that don't have inline data-key
  document.querySelectorAll('[data-val]').forEach(btn => {
    btn.addEventListener('click', function() {
      const parent = this.closest('.field-group');
      const allBtns = parent.querySelectorAll('.opt-btn');
      allBtns.forEach(b => b.classList.remove('selected'));
      this.classList.add('selected');

      if (this.dataset.key === 'tecnica') state.tecnica = this.dataset.val;
      else {
        const label = parent.querySelector('.field-label');
        if (label) {
          const txt = label.textContent.toLowerCase();
          if (txt.includes('configuración') || txt.includes('implantes')) state.tecnica = this.dataset.val;
          else if (txt.includes('ósea') || txt.includes('cantidad')) state.hueso = this.dataset.val;
          else if (txt.includes('espacio')) state.espacio = this.dataset.val;
          else if (txt.includes('demanda')) state.carga = this.dataset.val;
        }
      }
      update();
    });
  });

  runSplashSequence();
  // Restaurar provider y API key guardados
  if (state.provider === 'groq') {
    setProvider('groq');
    const keyInput = document.getElementById('groq-key-input');
    if (keyInput && state.groqKey) keyInput.value = state.groqKey;
  }
  setInterval(checkOllamaStatus, 30000);
});

function getRecommendation() {
  const { tecnica, hueso, cant, espacio, brux, estetica, fea, carga } = state;

  let main = '', alt = '', avoid = [], justifications = [], semaphore = 'green', notes = [];

  // Decision logic based on protocol steps 2-7
  if (tecnica === 'allon4') {
    // Angulated implants
    main = 'PR–CC';
    alt = 'PR–TI';
    avoid.push('PC (mayor variabilidad distal en angulados)');
    avoid.push('ZR en All-on-4 con pérdida ósea severa');
    justifications.push('En implantes angulados (All-on-4), PR y PI presentan comportamiento más estable con menor amplitud de picos en zona distal (Prueba Friedman p<0.05).');
    justifications.push('CC y Ti son los materiales recomendados por su comportamiento más controlado en la interfaz hueso-implante angulado.');
    justifications.push('El ZR mostró valores más altos de esfuerzo en la zona crítica distal, indicando menor capacidad de disipación de carga.');
    if (brux) {
      avoid.push('PC en cualquier contexto con bruxismo');
      justifications.push('Con bruxismo, PI–Ti o PI–CC presentan las menores deformaciones (0.004 mm) y son los de primera elección.');
    }
    semaphore = hueso === 'severa' ? 'yellow' : 'green';
  } else {
    // Implantes rectos
    if (espacio === 'reducido') {
      main = 'PC–CC';
      alt = 'PR–CC';
      justifications.push('Con espacio interoclusal reducido, PC ofrece menor altura vertical, facilitando la confección protésica. Sin embargo, muestra mayor deformación distal.');
      notes.push('Control oclusal estricto requerido para evitar sobrecarga en extensión de cantilever.');
    } else if (hueso === 'severa') {
      main = cant > 10 ? 'PR–TI' : 'PR–CC';
      alt = 'PR–CC';
      justifications.push('Con pérdida ósea severa, el titanio es el material indicado por su capacidad de amortiguación biomecánica y mejor adaptación al hueso trabecular menos denso.');
      justifications.push('La barra rectangular (PR) mostró el mejor control de esfuerzos y menor deformación, siendo el diseño de primera elección.');
    } else if (carga === 'alta' || brux) {
      main = 'PR–CC';
      alt = 'PI–CC';
      justifications.push('Con alta demanda funcional o bruxismo, CC ofrece máxima rigidez y mínima deformación, ideal por su estabilidad bajo carga.');
      justifications.push('PI–Ti y PI–CC presentan las menores deformaciones (0.004 mm), recomendados en pacientes con hábitos parafuncionales.');
      if (brux) avoid.push('PC (mayor deformación promedio con bruxismo)');
    } else if (estetica && cant <= 8 && hueso !== 'severa') {
      main = 'PR–TI';
      alt = 'ZR (solo sin cantilever)';
      justifications.push('ZR puede considerarse en casos de alta exigencia estética sin cantilever y con oclusión estable, sin bruxismo.');
      justifications.push('PR–Ti combina resistencia y resiliencia clínica, adecuado para uso general con buena adaptación biomecánica.');
    } else if (cant <= 8 && hueso === 'denso') {
      main = 'PR–CC';
      alt = 'PR–TI';
      justifications.push('Con cantilever corto y hueso denso, PR–CC ofrece mayor estabilidad y control oclusal.');
    } else if (cant > 15) {
      main = 'PR–CC';
      alt = 'PR–TI';
      avoid.push('PC (mayor deformación en cantilever largo)');
      avoid.push('ZR con cantilever largo');
      justifications.push('Cantilever largo: se recomienda mantenerlo reducido (1–2 mm si posible). PR maximiza rigidez y CC ofrece mínima deformación.');
      semaphore = 'yellow';
    } else {
      main = 'PR–CC';
      alt = 'PR–TI';
      justifications.push('En implantes rectos, cualquier geometría y material es biomecánicamente seguro (p>0.05, Kruskal-Wallis). PR–CC es la elección de primera línea.');
    }
  }

  // Semaphore override
  if (cant > 15 && (brux || carga === 'alta')) semaphore = 'red';
  if (tecnica === 'allon4' && hueso === 'severa' && brux) semaphore = 'red';

  return { main, alt, avoid, justifications, semaphore, notes };
}

function renderRecommendation() {
  const r = getRecommendation();
  const { cant, brux, tecnica, hueso, espacio, fea: hasFea, carga } = state;

  const matName = { 'CC':'Cromo-Cobalto', 'TI':'Titanio', 'ZR':'Zirconio' };
  const geoName = { 'PR':'Rectangular', 'PI':'Perfil en I', 'PC':'Circular' };

  const parseName = (code) => {
    const parts = code.split('–');
    if (parts.length === 2) {
      const g = parts[0].trim();
      const m = parts[1].trim();
      return `<span style="color:var(--text2);font-size:14px;">${geoName[g]||g} · ${matName[m]||m}</span>`;
    }
    return `<span style="color:var(--text2);font-size:14px;">${code}</span>`;
  };

  // Biomechanical data lookup
  const bioData = {
    'PR': { stress: '631–658 MPa', def: '0.003–0.007 mm', def2: '<0.010 mm' },
    'PI': { stress: '706–844 MPa', def: '0.004–0.008 mm', def2: '<0.010 mm' },
    'PC': { stress: '1.0–1.22 GPa', def: '0.014–0.056 mm', def2: '0.014–0.052 mm' },
  };

  const mainGeo = r.main.split('–')[0];
  const mainMat = r.main.split('–')[1];
  const bio = bioData[mainGeo] || { stress: 'N/D', def: 'N/D', def2: 'N/D' };

  const semColor = { green: 'var(--green)', yellow: 'var(--yellow)', red: 'var(--red)' };
  const semLabel = { green: 'SEGURO', yellow: 'PRECAUCIÓN', red: 'REDISEÑAR' };
  const semDesc = {
    green: 'p95 ≤ 45 MPa · Deformación ≤ 0.004 mm → Diseño biomecánicamente seguro',
    yellow: 'p95 45–55 MPa → Considerar reducir cantilever o aumentar sección de barra',
    red: 'p95 > 55 MPa → Rediseñar o cambiar material y geometría'
  };

  // Texto de la caja azul (hero) — izquierda del flex-row
  const heroHtml = `
    <div class="result-label">Recomendación Principal</div>
    <div class="result-main">${r.main}</div>
    <div class="result-full">${parseName(r.main)}</div>
    ${r.alt ? `<div class="result-alt">Alternativa: <span>${r.alt}</span></div>` : ''}
  `;

  // Cuerpo debajo de la caja azul
  const bodyHtml_start = `
    <div class="section-title" style="margin-top:0;">Semáforo de Seguridad Biomecánica</div>
    <div class="semaphore">
      <div class="sem-item sem-green ${r.semaphore==='green'?'active':''}">
        <div class="sem-dot"></div>
        <div class="sem-title">VERDE</div>
        <div class="sem-desc">≤ 45 MPa · Diseño seguro</div>
      </div>
      <div class="sem-item sem-yellow ${r.semaphore==='yellow'?'active':''}">
        <div class="sem-dot"></div>
        <div class="sem-title">AMARILLO</div>
        <div class="sem-desc">45–55 MPa · Reducir cantilever</div>
      </div>
      <div class="sem-item sem-red ${r.semaphore==='red'?'active':''}">
        <div class="sem-dot"></div>
        <div class="sem-title">ROJO</div>
        <div class="sem-desc">&gt; 55 MPa · Rediseñar</div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--text3);font-family:var(--font-mono);margin-bottom:16px;padding:8px 10px;background:var(--surface);border-radius:6px;border:1px solid var(--border);">
      Estado actual: <span style="color:${semColor[r.semaphore]};font-weight:600;">${semLabel[r.semaphore]}</span> — ${semDesc[r.semaphore]}
    </div>

    <div class="section-title">Datos Biomecánicos de Referencia (Geometría ${mainGeo})</div>
    <div class="cards-grid">
      <div class="card">
        <div class="card-title">Esfuerzo von Mises</div>
        <div class="card-val">${bio.stress}<span class="card-unit">(ref. subestructura)</span></div>
        <div class="card-sub">Rango típico en la barra</div>
      </div>
      <div class="card">
        <div class="card-title">Deformación máxima</div>
        <div class="card-val">${bio.def}<span class="card-unit">mm</span></div>
        <div class="card-sub">En simulaciones FEA (ANSYS)</div>
      </div>
      <div class="card">
        <div class="card-title">Hueso trabecular</div>
        <div class="card-val">&lt; 4 MPa<span class="card-unit"></span></div>
        <div class="card-sub">Esfuerzo máximo periimplantario</div>
      </div>
      <div class="card">
        <div class="card-title">Hueso cortical</div>
        <div class="card-val">&lt; 60 MPa<span class="card-unit"></span></div>
        <div class="card-sub">Por debajo del límite de fluencia</div>
      </div>
    </div>

    <div class="section-title">Justificación Clínica</div>
    <div class="justify-box">
      <div class="justify-box-title">✓ Fundamentos de la recomendación</div>
      <ul class="justify-list">
        ${r.justifications.map(j => `<li>${j}</li>`).join('')}
        ${r.notes.map(n => `<li style="color:var(--yellow);">⚠ ${n}</li>`).join('')}
      </ul>
    </div>

    ${r.avoid.length > 0 ? `
    <div class="justify-box">
      <div class="justify-box-title" style="color:var(--red);">✕ Combinaciones a evitar</div>
      <ul class="justify-list avoid-list">
        ${r.avoid.map(a => `<li>${a}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <div class="justify-box" style="border-color:var(--border2);background:var(--surface);">
      <div class="justify-box-title" style="color:var(--accent2);">📚 Evidencia científica relacionada</div>
      <ul class="justify-list" style="margin-bottom:14px;">
        ${buildRelatedArticles(tecnica, brux, hueso, mainMat)}
      </ul>
      <button onclick="llevarAlAgente()"
        style="display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:#fff;border:none;
               border-radius:8px;padding:9px 16px;font-size:13px;font-family:var(--font-sans);font-weight:500;
               cursor:pointer;transition:opacity 0.15s;"
        onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
        ✨ Profundizar con el Agente IA →
      </button>
    </div>

    <div class="section-title">Comparativo de Geometrías (referencia FEA / In vitro)</div>
    <table class="matrix">
      <tr>
        <th>Geometría</th>
        <th>Material</th>
        <th>Esfuerzo Máx.</th>
        <th>Deformación</th>
        <th>Desplaz. 90N</th>
      </tr>
      ${[
        ['PR','CC','631–658 MPa','0.003–0.007 mm','0.87 mm'],
        ['PR','TI','631–658 MPa','0.003–0.007 mm','0.92 mm'],
        ['PR','ZR','hasta 2.57 GPa*','0.010–0.026 mm','0.90 mm'],
        ['PI','CC','706–844 MPa','0.004–0.008 mm','1.04 mm'],
        ['PI','TI','706–819 MPa','0.004–0.008 mm','1.11 mm'],
        ['PI','ZR','706–819 MPa','0.004–0.008 mm','0.98 mm'],
        ['PC','CC','1.0–1.22 GPa','0.007–0.052 mm','0.87 mm'],
        ['PC','TI','1.0–1.22 GPa','0.014–0.030 mm','1.05 mm'],
        ['PC','ZR','1.0–1.22 GPa','0.014–0.056 mm','0.92 mm'],
      ].map(([g,m,s,d,x]) => {
        const isMain = r.main === `${g}–${m}`;
        const isWarn = g==='PC' && m==='ZR';
        return `<tr>
          <td class="row-label">${g} (${geoName[g]})</td>
          <td class="${isMain?'highlight':''}">${m}</td>
          <td class="${isWarn?'warn':''}">${s}</td>
          <td class="${isMain?'highlight':''}">${d}</td>
          <td class="${isMain?'highlight':''}">${x}</td>
        </tr>`;
      }).join('')}
    </table>
    <div style="font-size:10px;color:var(--text3);font-family:var(--font-mono);margin-bottom:16px;">* ZR rectangular en paciente con pérdida ósea severa · Datos: Protocolo Clínico Validado — GRAM · USTA</div>

    ${!hasFea ? `
    <div class="section-title">Sustitutos Clínicos (sin FEA disponible)</div>
    <div class="justify-box">
      <ul class="justify-list">
        <li>Mantener cantilever corto (reducir 1–2 mm si posible). Cantilever actual: <strong style="color:var(--accent);">${cant} mm</strong></li>
        <li>Establecer oclusión bilateral balanceada adaptada al antagonista</li>
        <li>Pasividad: prueba Sheffield (one-screw test) + torque cruzado; si hay separación, reevaluar asentamiento</li>
        ${brux ? '<li>Con bruxismo: evitar PC, preferir PI–Ti o PI–CC; considerar férula oclusal</li>' : ''}
        <li>Torque de tornillos según fabricante (rango habitual cónico-morse: 20–35 N·cm)</li>
        <li>Controles: 1, 3, 6 meses, luego anuales</li>
      </ul>
    </div>
    ` : ''}


    <div style="font-size:10px;color:var(--text3);font-family:var(--font-mono);padding:10px;border:1px solid var(--border);border-radius:6px;margin-top:4px;">
      ⚠️ Herramienta de apoyo clínico · No sustituye el juicio profesional · Protocolo Clínico Validado — GRAM · Universidad Santo Tomás Bucaramanga
    </div>
  `;

  // Cerrar bodyHtml (viene de bodyHtml_start + resto del template)
  const bodyHtml = bodyHtml_start;

  // Llenar los dos targets
  const heroEl = document.getElementById('rec-hero-text');
  const bodyEl = document.getElementById('rec-body');
  if (heroEl) heroEl.innerHTML = heroHtml;
  if (bodyEl) bodyEl.innerHTML = bodyHtml;
}

function buildRelatedArticles(tecnica, brux, hueso, mat) {
  if (!KB || KB.length === 0) return '<li style="color:var(--text3);">Base de conocimiento cargando...</li>';

  // Prioridad de tags según parámetros del caso
  const priority = [];
  if (brux)               priority.push('bruxismo');
  if (tecnica === 'allon4') priority.push('allon4');
  if (hueso === 'severa') priority.push('hueso');
  if (mat === 'CC' || mat === 'TI' || mat === 'ZR') priority.push('materiales');
  priority.push('fea', 'biomecanica');

  // Seleccionar artículos: máximo 1 por tag prioritario, sin repetir
  const seen = new Set();
  const selected = [];
  for (const tag of priority) {
    if (selected.length >= 4) break;
    const match = KB.find(a => a.tags.includes(tag) && !seen.has(a.id));
    if (match) { selected.push(match); seen.add(match.id); }
  }
  // Rellenar hasta 4 con artículos FEA/clínico si faltan
  if (selected.length < 4) {
    KB.filter(a => !seen.has(a.id) && (a.category === 'fea' || a.category === 'sistematica'))
      .slice(0, 4 - selected.length)
      .forEach(a => { selected.push(a); seen.add(a.id); });
  }

  return selected.map(a => {
    const autor = a.authors.split(',')[0].trim();
    const year  = a.year;
    const title = a.title.length > 65 ? a.title.slice(0, 65) + '…' : a.title;
    return `<li>
      <span class="cite-tag" onclick="openArticleInKB(${a.id})" title="Ver en Base de Conocimiento">[${a.id}]</span>
      <strong>${autor} ${year}</strong> — <span style="color:var(--text2);">${title}</span>
    </li>`;
  }).join('');
}

function llevarAlAgente() {
  const { cant, brux, tecnica, hueso, espacio, carga } = state;
  const r = getRecommendation();

  const tecnicaLabel = tecnica === 'allon4'
    ? 'All-on-4 (implantes angulados 30–45°)'
    : 'implantes rectos';
  const huesoMap = { leve: 'pérdida ósea leve', severa: 'pérdida ósea severa', ninguna: 'sin pérdida ósea' };
  const cargaMap = { baja: 'baja', media: 'media', alta: 'alta' };

  const extras = [
    brux ? 'bruxismo' : null,
    espacio === 'reducido' ? 'espacio interoclusal reducido' : null,
  ].filter(Boolean);

  const pregunta =
    `El Protocolo USTA recomienda la combinación ${r.main} para este caso clínico: ` +
    `técnica ${tecnicaLabel}, ${huesoMap[hueso] || hueso}, cantilever de ${cant} mm, ` +
    `carga oclusal ${cargaMap[carga] || carga}` +
    (extras.length ? `, ${extras.join(', ')}` : '') +
    `. ¿Por qué esta combinación es la indicada según la evidencia científica? ¿Qué artículos la respaldan?`;

  // Navegar al panel del agente
  const agentBtn = document.querySelectorAll('.tab')[1];
  showPanel('agent', agentBtn);

  // Pre-llenar el input del chat
  setTimeout(() => {
    const input = document.getElementById('chat-input');
    if (input) {
      input.value = pregunta;
      autoResize(input);
      input.focus();
    }
  }, 80);
}

// ════════════════════════════════════════════════════════════
// AGENT CHAT
// ════════════════════════════════════════════════════════════
const AVATAR_USER = `<svg viewBox="0 0 32 32" width="26" height="26" xmlns="http://www.w3.org/2000/svg">
  <!-- Bata blanca -->
  <path d="M7 32 Q7 26 10 25 L16 27 L22 25 Q25 26 25 32Z" fill="#f0f4f8"/>
  <path d="M16 27 L14.5 32 M16 27 L17.5 32" stroke="#ccd6e0" stroke-width="0.7" fill="none"/>
  <!-- Cuello -->
  <rect x="13.5" y="23" width="5" height="4" rx="1.5" fill="#f5c8a0"/>
  <!-- Cabello fondo oscuro (detrás de cara) -->
  <ellipse cx="16" cy="17" rx="9" ry="9.5" fill="#2b1506"/>
  <!-- Cara -->
  <ellipse cx="16" cy="18" rx="7.2" ry="7.8" fill="#f5c8a0"/>
  <!-- Flequillo frente -->
  <path d="M8.8 14.5 Q10 10 16 9.5 Q22 10 23.2 14.5 Q20 12.5 16 12.5 Q12 12.5 8.8 14.5Z" fill="#2b1506"/>
  <!-- Cabello parte superior -->
  <ellipse cx="16" cy="10" rx="7.2" ry="4" fill="#2b1506"/>
  <!-- Moño -->
  <circle cx="16" cy="6.5" r="4.5" fill="#2b1506"/>
  <ellipse cx="16" cy="6.5" rx="2.8" ry="2" fill="#3d1e08"/>
  <circle cx="14.8" cy="5.4" r="0.9" fill="#4a2510" opacity="0.65"/>
  <!-- Ojos -->
  <ellipse cx="12.8" cy="17.5" rx="1.4" ry="1.5" fill="#1a0d00"/>
  <ellipse cx="19.2" cy="17.5" rx="1.4" ry="1.5" fill="#1a0d00"/>
  <circle cx="13.2" cy="17" r="0.45" fill="white"/>
  <circle cx="19.6" cy="17" r="0.45" fill="white"/>
  <!-- Cejas -->
  <path d="M11.3 15.5 Q12.8 14.8 14.3 15.3" stroke="#2b1506" stroke-width="0.9" fill="none" stroke-linecap="round"/>
  <path d="M17.7 15.3 Q19.2 14.8 20.7 15.5" stroke="#2b1506" stroke-width="0.9" fill="none" stroke-linecap="round"/>
  <!-- Sonrisa -->
  <path d="M13.2 21.5 Q16 23.8 18.8 21.5" stroke="#c47a5a" stroke-width="1.1" fill="none" stroke-linecap="round"/>
  <!-- Mejillas -->
  <ellipse cx="11" cy="20" rx="1.8" ry="1" fill="#f0a090" opacity="0.35"/>
  <ellipse cx="21" cy="20" rx="1.8" ry="1" fill="#f0a090" opacity="0.35"/>
</svg>`;

const MODEL_LABELS = {
  'qwen3:8b':   'Qwen3 8B',
  'qwen3:14b':  'Qwen3 14B',
  'gemma3:12b': 'Gemma3 12B',
  'qwen3:32b':  'Qwen3 32B Q4',
  'llama3.2:3b':'Llama3.2 3B',
  'groq:llama-3.3-70b-versatile': 'Llama 3.3 70B',
  'groq:llama-3.1-8b-instant':    'Llama 3.1 8B Instant',
  'groq:gemma2-9b-it':            'Gemma2 9B'
};

const MODEL_PROFILES = {
  // Ollama (local)
  'llama3.2:3b': { num_predict: 1000, temperature: 0.35, top_p: 0.90, num_ctx: 4096,  num_articles: 6,  style: 'standard'   },
  'qwen3:8b':    { num_predict: 1800, temperature: 0.28, top_p: 0.90, num_ctx: 10240, num_articles: 8,  style: 'structured' },
  'gemma3:12b':  { num_predict: 1500, temperature: 0.3,  top_p: 0.85, num_ctx: 8192,  num_articles: 8,  style: 'structured' },
  'qwen3:14b':   { num_predict: 2500, temperature: 0.25, top_p: 0.85, num_ctx: 12288, num_articles: 10, style: 'structured' },
  'qwen3:32b':   { num_predict: 2500, temperature: 0.2,  top_p: 0.80, num_ctx: 16384, num_articles: 12, style: 'standard'   },
  // Groq (cloud)
  'groq:llama-3.3-70b-versatile': { max_tokens: 2000, temperature: 0.25, num_articles: 12, style: 'structured' },
  'groq:llama-3.1-8b-instant':    { max_tokens: 1200, temperature: 0.35, num_articles: 6,  style: 'standard'   },
  'groq:gemma2-9b-it':            { max_tokens: 1500, temperature: 0.3,  num_articles: 8,  style: 'structured' },
};

let _pendingModelBtn = null;
let _pendingModelId  = null;

function requestModelChange(btn, modelId) {
  if (modelId === state.model) return;
  _pendingModelBtn = btn;
  _pendingModelId  = modelId;
  const overlay = document.getElementById('auth-overlay');
  const input   = document.getElementById('auth-input');
  const sub     = document.getElementById('auth-modal-sub');
  const err     = document.getElementById('auth-error');
  sub.textContent = `Modelo solicitado: ${MODEL_LABELS[modelId] || modelId}`;
  input.value = '';
  input.classList.remove('error');
  err.textContent = '';
  overlay.classList.add('visible');
  setTimeout(() => input.focus(), 80);
}

function confirmAuth() {
  const input = document.getElementById('auth-input');
  const err   = document.getElementById('auth-error');
  if (input.value === 'Clave1234!') {
    document.getElementById('auth-overlay').classList.remove('visible');
    setModel(_pendingModelBtn, _pendingModelId);
    _pendingModelBtn = null;
    _pendingModelId  = null;
  } else {
    input.classList.add('error');
    err.textContent = 'Clave incorrecta. Intente de nuevo.';
    input.value = '';
    setTimeout(() => input.focus(), 50);
  }
}

function cancelAuth() {
  document.getElementById('auth-overlay').classList.remove('visible');
  _pendingModelBtn = null;
  _pendingModelId  = null;
}

function toggleGlossary() {
  const toggle = document.getElementById('glossary-toggle');
  const body   = document.getElementById('glossary-body');
  const open   = body.classList.toggle('open');
  toggle.classList.toggle('open', open);
}

function setModel(btn, modelId) {
  document.querySelectorAll('.model-option').forEach(el => el.classList.remove('active'));
  btn.classList.add('active');
  state.model = modelId;
  state.deepAnalysis = false;

  const label = MODEL_LABELS[modelId] || modelId;
  const isGroq = modelId.startsWith('groq:');
  const disc = document.querySelector('.disclaimer');
  if (disc) disc.textContent = isGroq ? `⚡ Modelo activo: ${label} vía Groq Cloud` : `🖥️ Modelo activo: ${label} vía Ollama`;
  const footer = document.querySelector('.chat-footer-note');
  if (footer) footer.textContent = `Base de conocimiento: 170 artículos · 38 revistas indexadas · Protocolo Clínico Validado · Powered by ${isGroq ? 'Groq Cloud' : 'Ollama'} + ${label}`;

  const wrap = document.getElementById('deep-analysis-wrap');
  const chk  = document.getElementById('deep-toggle-input');
  if (wrap && chk) {
    const isQwen3 = modelId.startsWith('qwen3');
    wrap.classList.toggle('visible', isQwen3);
    chk.checked = false;
  }
}

function setProvider(p) {
  state.provider = p;
  localStorage.setItem('dentia_provider', p);

  document.getElementById('provider-btn-ollama').classList.toggle('active', p === 'ollama');
  document.getElementById('provider-btn-groq').classList.toggle('active', p === 'groq');

  const groqSection = document.getElementById('groq-key-section');
  if (groqSection) groqSection.style.display = p === 'groq' ? 'block' : 'none';

  document.querySelectorAll('.ollama-model').forEach(el => el.style.display = p === 'ollama' ? '' : 'none');
  document.querySelectorAll('.groq-model').forEach(el => el.style.display = p === 'groq' ? '' : 'none');

  if (p === 'groq') {
    const btn = document.getElementById('model-groq-llama33-70b');
    if (btn) setModel(btn, 'groq:llama-3.3-70b-versatile');
  } else {
    const btn = document.getElementById('model-qwen3-8b');
    if (btn) setModel(btn, 'qwen3:8b');
  }
  checkOllamaStatus();
}

function saveGroqKey(key) {
  state.groqKey = key.trim();
  localStorage.setItem('dentia_groq_key', state.groqKey);
  checkOllamaStatus();
}

function setTopic(btn, topic) {
  document.querySelectorAll('.topic-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.topic = topic;
}

function setSuggestedQ(btn) {
  document.getElementById('chat-input').value = btn.textContent.trim();
  document.getElementById('chat-input').focus();
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

let activeController = null;

function stopGeneration() {
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
}

function setGenerating(on, typingEl) {
  const sendBtn = document.getElementById('send-btn');
  const stopBtn = document.getElementById('stop-btn');
  sendBtn.disabled = on;
  stopBtn.classList.toggle('visible', on);
  if (!on && typingEl) typingEl.remove();
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;

  // Clear welcome if first message
  const welcome = document.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  appendMessage('user', msg);
  input.value = '';
  input.style.height = 'auto';

  // Track stats: increment query count and topic
  trackQuery(state.topic);

  const typingEl = document.createElement('div');
  typingEl.className = 'msg assistant';
  typingEl.innerHTML = `
    <div class="msg-avatar">🦷</div>
    <div class="msg-bubble">
      <div class="typing-indicator">
        <div class="typing-wave"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>
        <span class="typing-label">Consultando base de conocimiento…</span>
      </div>
      <div class="typing-progress-track"><div class="typing-progress-fill"></div></div>
    </div>`;
  document.getElementById('chat-messages').appendChild(typingEl);
  setGenerating(true);
  scrollChat();


  activeController = new AbortController();

  try {
    const systemPrompt = buildSystemPrompt(state.topic, state.model);
    const isQwen3 = state.model.startsWith('qwen3');
    const thinkSuffix = isQwen3 ? (state.deepAnalysis ? ' /think' : ' /no_think') : '';
    const fullPrompt = systemPrompt + '\n\nPregunta del usuario: ' + msg + thinkSuffix;
    const profile = MODEL_PROFILES[state.model] || MODEL_PROFILES['qwen3:8b'];
    const t0 = performance.now();
    let reply, elapsed, tokens, tps;

    if (state.provider === 'groq') {
      // ── GROQ CLOUD (vía proxy /api/groq para evitar CORS) ──
      const useProxy = window.__GROQ_READY__;
      if (!useProxy && !state.groqKey) throw new Error('GROQ_NO_KEY');
      const groqEndpoint = useProxy ? '/api/groq' : 'https://api.groq.com/openai/v1/chat/completions';
      const groqHeaders  = useProxy
        ? { 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.groqKey}` };
      const groqRes = await fetch(groqEndpoint, {
        method: 'POST',
        headers: groqHeaders,
        signal: activeController.signal,
        body: JSON.stringify({
          model: state.model.replace('groq:', ''),
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: msg }
          ],
          max_tokens: profile.max_tokens || 1800,
          temperature: profile.temperature || 0.3
        })
      });
      if (!groqRes.ok) {
        const errData = await groqRes.json().catch(() => ({}));
        throw new Error('GROQ_HTTP_' + groqRes.status + ':' + (errData.error?.message || groqRes.statusText));
      }
      const groqData = await groqRes.json();
      elapsed = (performance.now() - t0) / 1000;
      reply  = groqData.choices?.[0]?.message?.content || 'Sin respuesta de Groq.';
      tokens = groqData.usage?.completion_tokens || 0;
      tps    = elapsed > 0 ? tokens / elapsed : 0;

    } else {
      // ── OLLAMA LOCAL ──
      const ollamaRes = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: activeController.signal,
        body: JSON.stringify({ model: state.model, prompt: fullPrompt, stream: false, options: profile })
      });
      if (!ollamaRes.ok) throw new Error('Error HTTP: ' + ollamaRes.status);
      const ollamaData = await ollamaRes.json();
      elapsed = (performance.now() - t0) / 1000;
      tokens  = ollamaData.eval_count || 0;
      tps     = ollamaData.eval_duration ? (tokens / (ollamaData.eval_duration / 1e9)) : (tokens / elapsed);
      reply   = ollamaData.response || 'No se pudo generar una respuesta. Verifique que Ollama esté activo.';
    }

    typingEl.remove();
    appendMessage('assistant', reply, null, false, { elapsed, tokens, tps, model: MODEL_LABELS[state.model] || state.model });

    const cited = [...reply.matchAll(/\[(\d+)\]/g)].map(m => parseInt(m[1]));
    if (cited.length > 0) trackCitations(cited);
    saveChatHistory();

  } catch (err) {
    typingEl.remove();
    if (err.name === 'AbortError') {
      appendMessage('assistant', '⏹ Generación detenida por el usuario.');
    } else {
      let errMsg;
      if (err.message === 'GROQ_NO_KEY') {
        errMsg = '⚠️ Ingrese su API Key de Groq en el panel lateral para usar el modo Cloud.';
      } else if (err.message && err.message.startsWith('GROQ_HTTP_')) {
        errMsg = '⚠️ Error de Groq: ' + err.message.replace('GROQ_HTTP_', '') + '. Verifique su API Key.';
      } else if (state.provider === 'groq') {
        errMsg = '⚠️ No se pudo conectar con Groq. Verifique su conexión a internet y API Key.';
      } else {
        errMsg = '⚠️ No se pudo conectar con Ollama. Verifique que esté corriendo en http://localhost:11434';
        if (err.message && err.message.includes('Failed to fetch'))
          errMsg = '⚠️ Ollama no responde. Asegúrese de que Ollama esté iniciado y pruebe en su navegador: http://localhost:11434';
      }
      appendMessage('assistant', errMsg);
      console.error(err);
    }
  }

  activeController = null;
  setGenerating(false);
}

function appendMessage(role, text, timestamp, fromHistory, perf) {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;

  const ts = timestamp || new Date().toISOString();
  const displayTime = new Date(ts).toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });

  let perfHTML = '';
  if (perf && role === 'assistant') {
    const tpsVal = perf.tps;
    const speedClass = tpsVal >= 15 ? 'msg-perf-fast' : tpsVal >= 5 ? 'msg-perf-med' : 'msg-perf-slow';
    const modelTag = perf.model ? `<span class="msg-perf" style="background:rgba(108,99,182,0.08);border-color:rgba(108,99,182,0.3);color:var(--purple)">🤖 ${perf.model}</span>` : '';
    perfHTML = `${modelTag}<span class="msg-perf ${speedClass}">⏱ ${perf.elapsed.toFixed(1)}s · ${perf.tokens} tok · ${tpsVal.toFixed(1)} tok/s</span>`;
  }

  div.innerHTML = `
    <div class="msg-avatar">${role === 'user' ? AVATAR_USER : '🦷'}</div>
    <div>
      <div class="msg-bubble">${formatMessage(text)}</div>
      <div class="msg-meta">${displayTime}${perfHTML}</div>
    </div>`;

  container.appendChild(div);

  if (!fromHistory) {
    state.chatHistory.push({ role, text, timestamp: ts, perf: perf || null });
  }

  scrollChat();
}

function formatMessage(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/### (.*?)(\n|$)/g, '<h3>$1</h3>')
    .replace(/## (.*?)(\n|$)/g, '<h3>$1</h3>')
    .replace(/\[(\d+)\]/g, '<span class="cite-tag" onclick="openArticleInKB($1)" title="Ver artículo en Base de Conocimiento">[$1]</span>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.)/,'<p>$1').replace(/(.)$/,'$1</p>');
}

function scrollChat() {
  const msgs = document.getElementById('chat-messages');
  if (msgs) msgs.scrollTop = msgs.scrollHeight + 9999;
  const input = document.getElementById('chat-input');
  if (input) input.scrollIntoView({ behavior: 'instant', block: 'nearest' });
}

// ════════════════════════════════════════════════════════════
// KNOWLEDGE BASE DISPLAY
// ════════════════════════════════════════════════════════════
let currentCategory = 'all';
let currentSearch = '';

function renderKB(articles) {
  const grid = document.getElementById('articles-grid');
  if (!grid) return;

  let filtered = articles;
  if (currentCategory !== 'all') {
    filtered = filtered.filter(a => a.category === currentCategory);
  }
  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    filtered = filtered.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.authors.toLowerCase().includes(q) ||
      a.journal.toLowerCase().includes(q) ||
      a.abstract.toLowerCase().includes(q) ||
      a.tags.some(t => t.includes(q))
    );
  }

  const tagLabels = {
    fea: { cls: 'tag-fea', label: 'FEA' },
    biomecanica: { cls: 'tag-fea', label: 'Biomecánica' },
    materiales: { cls: 'tag-mat', label: 'Materiales' },
    geometria: { cls: 'tag-bio', label: 'Geometría' },
    allon4: { cls: 'tag-clin', label: 'All-on-4' },
    cantilever: { cls: 'tag-sys', label: 'Cantilever' },
    hueso: { cls: 'tag-bio', label: 'Hueso-Implante' },
    bruxismo: { cls: 'tag-sys', label: 'Bruxismo' },
    pasividad: { cls: 'tag-prot', label: 'Pasividad' },
    protocolo: { cls: 'tag-prot', label: 'Protocolo' },
    clinico: { cls: 'tag-clin', label: 'Clínico' },
    sistematica: { cls: 'tag-sys', label: 'Rev. Sistemática' },
    epidemiologia: { cls: 'tag-bio', label: 'Epidemiología' },
    cadcam: { cls: 'tag-mat', label: 'CAD/CAM' },
  };

  grid.innerHTML = filtered.map(a => `
    <div class="article-card" id="article-${a.id}">
      <div class="article-header">
        <div class="article-title">${a.title}</div>
        <div class="article-year">${a.year}</div>
      </div>
      <div class="article-authors">${a.authors}</div>
      <div class="article-journal">${a.journal}</div>
      <div class="article-abstract">${a.abstract}</div>
      <div class="article-tags">
        ${a.tags.map(t => {
          const info = tagLabels[t] || { cls: 'tag-bio', label: t };
          return `<span class="article-tag ${info.cls}">${info.label}</span>`;
        }).join('')}
        <a class="article-tag article-doi-link" href="https://doi.org/${a.doi}" target="_blank" rel="noopener" style="background:rgba(88,166,255,0.08);color:var(--blue);border:1px solid rgba(88,166,255,0.2);text-decoration:none;cursor:pointer;" title="Abrir artículo en línea">🔗 DOI: ${a.doi.substring(0,32)}${a.doi.length>32?'...':''}</a>
      </div>
    </div>
  `).join('');
}

function openArticleInKB(id) {
  const kbBtn = document.querySelectorAll('.tab')[2];
  showPanel('kb', kbBtn);
  setTimeout(() => {
    currentCategory = 'all';
    currentSearch = '';
    renderKB(KB);
    document.querySelectorAll('.kb-filter').forEach(b => b.classList.remove('active'));
    document.querySelector('.kb-filter').classList.add('active');
    const card = document.getElementById('article-' + id);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('article-highlight');
      setTimeout(() => card.classList.remove('article-highlight'), 2500);
    }
  }, 50);
}

function updateFilterCounts() {
  const cats = { all: KB.length, fea: 0, materiales: 0, clinico: 0, sistematica: 0 };
  KB.forEach(a => { if (cats[a.category] !== undefined) cats[a.category]++; });
  const labels = { all: 'Todos', fea: 'FEA', materiales: 'Materiales', clinico: 'Clínicos', sistematica: 'Revisiones' };
  Object.keys(cats).forEach(k => {
    const btn = document.getElementById('kbf-' + k);
    if (btn) btn.textContent = `${labels[k]} (${cats[k]})`;
  });
}

function checkOllamaStatus() {
  const dot = document.getElementById('ollama-dot');
  const label = document.getElementById('ollama-label');
  if (state.provider === 'groq') {
    if (window.__GROQ_READY__ || state.groqKey) {
      dot.className = 'ollama-dot online';
      label.textContent = 'Groq activo';
    } else {
      dot.className = 'ollama-dot offline';
      label.textContent = 'Groq sin API Key';
    }
    return Promise.resolve();
  }
  return fetch('http://localhost:11434', { method: 'GET', signal: AbortSignal.timeout(2500) })
    .then(() => {
      dot.className = 'ollama-dot online';
      label.textContent = 'Modelo activo';
    })
    .catch(() => {
      dot.className = 'ollama-dot offline';
      label.textContent = 'Modelo inactivo';
    });
}

// ── SPLASH SCREEN LOGIC ──
function splashActivate(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('active');
  el.querySelector('.si-icon-wrap').innerHTML = '<div class="si-spinner"></div>';
}
function splashDone(id, badge) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('active');
  el.classList.add('done');
  el.querySelector('.si-icon-wrap').innerHTML = '<div class="si-check">✓</div>';
  const b = document.getElementById(id + '-badge');
  if (b && badge) b.textContent = badge;
}
function hideSplash() {
  const overlay = document.getElementById('splash-overlay');
  if (!overlay) return;
  overlay.classList.add('fade-out');
  setTimeout(() => overlay.remove(), 650);
}
async function runSplashSequence() {
  const delay = ms => new Promise(r => setTimeout(r, ms));

  splashActivate('si-sistema');
  await delay(700);
  splashDone('si-sistema');

  splashActivate('si-kb');
  await loadKB();
  await delay(300);
  splashDone('si-kb');

  splashActivate('si-historial');
  restoreChatHistory();
  await delay(600);
  splashDone('si-historial');

  splashActivate('si-ollama');
  await checkOllamaStatus();
  await delay(300);
  splashDone('si-ollama');

  splashActivate('si-simulador');
  renderRecommendation();
  await delay(700);
  splashDone('si-simulador');

  await delay(400);
  const btn = document.getElementById('splash-enter-btn');
  if (btn) { btn.disabled = false; btn.classList.add('ready'); }
}

function filterKB(q) {
  currentSearch = q;
  renderKB(KB);
}

function filterCategory(btn, cat) {
  document.querySelectorAll('.kb-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentCategory = cat;
  renderKB(KB);
}

// ════════════════════════════════════════════════════════════
// CHANGE 2: PERSISTENT CHAT HISTORY
// ════════════════════════════════════════════════════════════
const CHAT_STORAGE_KEY = 'dentia_chat_history';

function saveChatHistory() {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(state.chatHistory));
  } catch(e) { console.warn('Could not save chat history', e); }
}

function restoreChatHistory() {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!saved) return;
    const history = JSON.parse(saved);
    if (!Array.isArray(history) || history.length === 0) return;

    // Remove welcome screen
    const welcome = document.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    // Insert session divider
    const container = document.getElementById('chat-messages');
    const divider = document.createElement('div');
    divider.className = 'session-divider';
    divider.textContent = '— sesión anterior —';
    container.appendChild(divider);

    // Render each saved message (fromHistory=true so we don't re-push to state.chatHistory)
    history.forEach(entry => {
      appendMessage(entry.role, entry.text, entry.timestamp, true, entry.perf || null);
    });

    // Populate in-memory history so future saves include restored messages
    state.chatHistory = history.slice();

  } catch(e) { console.warn('Could not restore chat history', e); }
}

function clearChatHistory() {
  if (!confirm('¿Limpiar el historial de conversación? Esta acción no se puede deshacer.')) return;
  try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch(e) {}
  state.chatHistory = [];

  const container = document.getElementById('chat-messages');
  container.innerHTML = `
    <div class="chat-welcome">
      <div class="chat-welcome-icon">🦷</div>
      <h2>Agente DentIA</h2>
      <p>Consulte cualquier aspecto clínico o biomecánico sobre prótesis híbridas implantosoportadas. Las respuestas están fundamentadas en una base de conocimiento de <strong>170 artículos indexados</strong> y en el protocolo clínico validado para rehabilitaciones con prótesis híbridas en mandíbula edéntula.</p>
      <div class="disclaimer">🖥️ Modelo local: Qwen3 8B vía Ollama</div>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// CHANGE 3: STATISTICS
// ════════════════════════════════════════════════════════════
const STATS_STORAGE_KEY = 'dentia_stats';

function loadStats() {
  try {
    const saved = localStorage.getItem(STATS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return {
    total: 0,
    byTopic: { all: 0, fea: 0, clinico: 0, materiales: 0, sistematica: 0, biomecanica: 0, geometria: 0, allon4: 0, cantilever: 0, hueso: 0, bruxismo: 0, pasividad: 0, protocolo: 0 },
    citations: {},   // { "articleId": count }
    activity: {}     // { "YYYY-MM-DD": count }
  };
}

function saveStats(stats) {
  try { localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats)); } catch(e) {}
}

function trackQuery(topic) {
  const stats = loadStats();
  stats.total = (stats.total || 0) + 1;
  if (!stats.byTopic) stats.byTopic = {};
  stats.byTopic[topic] = (stats.byTopic[topic] || 0) + 1;
  // also always increment 'all'
  if (topic !== 'all') stats.byTopic['all'] = (stats.byTopic['all'] || 0) + 1;

  // Today's date
  const today = new Date().toISOString().slice(0, 10);
  if (!stats.activity) stats.activity = {};
  stats.activity[today] = (stats.activity[today] || 0) + 1;

  saveStats(stats);
}

function trackCitations(ids) {
  const stats = loadStats();
  if (!stats.citations) stats.citations = {};
  if (!stats.byCategory) stats.byCategory = { fea: 0, clinico: 0, materiales: 0, sistematica: 0 };
  ids.forEach(id => {
    const key = String(id);
    stats.citations[key] = (stats.citations[key] || 0) + 1;
    const art = KB.find(a => a.id === parseInt(id));
    if (art && stats.byCategory[art.category] !== undefined) {
      stats.byCategory[art.category]++;
    }
  });
  saveStats(stats);
}

function resetStats() {
  if (!confirm('¿Resetear todas las estadísticas? Esta acción no se puede deshacer.')) return;
  try { localStorage.removeItem(STATS_STORAGE_KEY); } catch(e) {}
  renderStats();
}

function renderStats() {
  const stats = loadStats();

  // ── Summary cards ──
  document.getElementById('stat-total').textContent = stats.total || 0;

  // Top cited article
  const citations = stats.citations || {};
  const citedEntries = Object.entries(citations).sort((a,b) => b[1] - a[1]);
  if (citedEntries.length > 0) {
    const topId = parseInt(citedEntries[0][0]);
    const topCount = citedEntries[0][1];
    const topArticle = KB.find(a => a.id === topId);
    document.getElementById('stat-top-article').textContent = '[' + topId + '] ×' + topCount;
    document.getElementById('stat-top-article-title').textContent = topArticle ? topArticle.title.slice(0, 60) + '…' : '';
  } else {
    document.getElementById('stat-top-article').textContent = '—';
    document.getElementById('stat-top-article-title').textContent = 'Sin datos aún';
  }

  // Top topic
  const byTopic = stats.byTopic || {};
  const topicEntries = Object.entries(byTopic).filter(([k]) => k !== 'all').sort((a,b) => b[1] - a[1]);
  const topicLabels = {
    fea: 'FEA', clinico: 'Clínico', materiales: 'Materiales', sistematica: 'Rev. Sistemática',
    biomecanica: 'Biomecánica', geometria: 'Geometría', allon4: 'All-on-4',
    cantilever: 'Cantilever', hueso: 'Hueso', bruxismo: 'Bruxismo',
    pasividad: 'Pasividad', protocolo: 'Protocolo', all: 'Todos'
  };
  if (topicEntries.length > 0) {
    document.getElementById('stat-top-topic').textContent = topicLabels[topicEntries[0][0]] || topicEntries[0][0];
  } else {
    document.getElementById('stat-top-topic').textContent = '—';
  }

  // ── Bar chart: artículos citados por categoría ──
  const chartEl = document.getElementById('stats-bar-chart');
  const byCategory = stats.byCategory || { fea: 0, clinico: 0, materiales: 0, sistematica: 0 };
  const chartCats = [
    { key: 'fea',        label: 'FEA / Biomecánica' },
    { key: 'clinico',    label: 'Clínico' },
    { key: 'materiales', label: 'Materiales' },
    { key: 'sistematica',label: 'Rev. Sistemática' },
  ];
  const maxVal = Math.max(1, ...chartCats.map(t => byCategory[t.key] || 0));
  chartEl.innerHTML = chartCats.map(t => {
    const val = byCategory[t.key] || 0;
    const pct = Math.round((val / maxVal) * 100);
    return `<div class="bar-row">
      <div class="bar-label">${t.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      <div class="bar-count">${val}</div>
    </div>`;
  }).join('');

  // ── Top 5 cited articles ──
  const topCitedEl = document.getElementById('stats-top-cited');
  if (citedEntries.length === 0) {
    topCitedEl.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text3);font-size:12px;">Sin citas registradas aún.</div>';
  } else {
    const top5 = citedEntries.slice(0, 5);
    topCitedEl.innerHTML = top5.map(([id, count], i) => {
      const art = KB.find(a => a.id === parseInt(id));
      const title = art ? art.title : 'Artículo #' + id;
      return `<div class="top-cited-item">
        <div class="top-cited-rank">#${i+1}</div>
        <div class="top-cited-title">[${id}] ${title}</div>
        <div class="top-cited-count">×${count}</div>
      </div>`;
    }).join('');
  }

  // ── Last 7 days activity ──
  const activityEl = document.getElementById('stats-activity');
  const activity = stats.activity || {};
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('es-CO', { weekday: 'short' }).slice(0, 2);
    days.push({ key, label, val: activity[key] || 0 });
  }
  const maxAct = Math.max(1, ...days.map(d => d.val));
  activityEl.innerHTML = days.map(d => {
    const pct = Math.round((d.val / maxAct) * 52); // max 52px dentro del wrap de 56px
    const barH = Math.max(3, pct);
    const countHtml = (d.val > 0 && barH >= 14) ? `<div class="activity-count">${d.val}</div>` : '';
    return `<div class="activity-col">
      <div class="activity-bar-wrap">
        <div class="activity-bar" style="height:${barH}px" title="${d.val} consultas">${countHtml}</div>
      </div>
      <div class="activity-day">${d.label}</div>
    </div>`;
  }).join('');
}

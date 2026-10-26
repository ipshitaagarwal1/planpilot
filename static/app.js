(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const md = (t) => {
    if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') return '<pre style="white-space:pre-wrap">' + esc(t || '') + '</pre>';
    return DOMPurify.sanitize(marked.parse(t || ''));
  };
  const money = (n) => '\u20B9' + n.toLocaleString('en-IN');

  const CHIPS = [
    { id: 'bday', label: 'Birthday dinner', bg: '#FFD3E8', text: 'A small birthday dinner for 20 guests in Mumbai next month, budget 40000 INR.' },
    { id: 'fest', label: 'College fest', bg: '#FFF1B5', text: 'A 2-day college tech fest for 300 people in Indore, budget 150000 INR.' },
    { id: 'sangeet', label: 'Sangeet night', bg: '#C9F2E0', text: 'A sangeet night for 150 guests in Jaipur, budget 300000 INR.' },
    { id: 'offsite', label: 'Team offsite', bg: '#CDE6FF', text: 'A one-day team offsite for 40 people in Pune, budget 80000 INR.' }
  ];
  const ICONS = {
    venue: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    vendor: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    weather: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 0 1 0 9z"/>',
    budget: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z"/><circle cx="17" cy="14" r="1.2"/>',
    marketing: '<path d="M3 11v2a1 1 0 0 0 1 1h3l8 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M19 9a4 4 0 0 1 0 6"/>'
  };
  const AGENTS = [
    { key: 'venue', name: 'Venue scout', color: '#FFF1B5', task: 'Finds spaces that fit your headcount', detail: 'Searches the web for spaces that suit your guest count and city, then lists up to three with links.' },
    { key: 'vendor', name: 'Vendor finder', color: '#FFD3E8', task: 'Caterers, sound, decor and photo', detail: 'Looks up caterers, sound and lighting, decorators and photographers, and drafts a message you can send to them.' },
    { key: 'weather', name: 'Weather watcher', color: '#CDE6FF', task: 'Forecast plus a rainy-day plan', detail: 'Checks the forecast for your date when it is within 16 days, and suggests a backup if the weather could spoil outdoor plans.' },
    { key: 'budget', name: 'Budget keeper', color: '#C9F2E0', task: 'Splits the money by category', detail: 'Divides your total across venue, food, decor, sound and more using fixed percentages, so the sums are always right.' },
    { key: 'marketing', name: 'Invite writer', color: '#E0D4FF', task: 'Invitation text and social posts', detail: 'Writes invitation text, two short social posts and a poster brief you can hand to a designer.' }
  ];
  const SPLIT = [
    ['Venue', 0.25, '#FFF1B5'], ['Food & beverages', 0.25, '#FFD3E8'], ['Decor & stage', 0.10, '#CDE6FF'],
    ['Sound, lights & AV', 0.10, '#E0D4FF'], ['Marketing & printing', 0.07, '#C9F2E0'], ['Photo & video', 0.05, '#FFD8C9'],
    ['Staff & logistics', 0.05, '#FFF1B5'], ['Miscellaneous', 0.05, '#CDE6FF'], ['Contingency', 0.08, '#FFD3E8']
  ];
  const TABS = [
    { id: 'plan', label: 'Full plan', bg: '#E0D4FF', get: (s) => s.draft },
    { id: 'venues', label: 'Venues', bg: '#FFF1B5', get: (s) => s.sections.venues },
    { id: 'vendors', label: 'Vendors', bg: '#FFD3E8', get: (s) => s.sections.vendors },
    { id: 'weather', label: 'Weather', bg: '#CDE6FF', get: (s) => s.sections.weather },
    { id: 'budget', label: 'Budget', bg: '#C9F2E0', get: (s) => s.sections.budget },
    { id: 'schedule', label: 'Schedule', bg: '#FFD8C9', get: (s) => s.sections.schedule },
    { id: 'marketing', label: 'Invites', bg: '#E0D4FF', get: (s) => s.sections.marketing }
  ];

  const state = {
    request: '', chip: '', phase: 'idle', done: 0, open: '', tab: 'plan', threadId: null,
    draft: '', sections: {}, revisions: 0, finalText: '', blocked: '', override: null, timer: null
  };

  const parseAmount = (t) => {
    const m = /(\d[\d,]*)\s*(?:INR|rs|\u20B9)/i.exec(t) || /(?:\u20B9|rs\.?)\s*(\d[\d,]*)/i.exec(t);
    return m ? parseInt(m[1].replace(/,/g, ''), 10) : 40000;
  };
  const parseGuests = (t) => {
    const m = /(\d+)\s*(?:guests|people|persons|members)/i.exec(t);
    return m ? parseInt(m[1], 10) : 20;
  };
  const total = () => (state.override !== null ? state.override : parseAmount(state.request));

  // ---------- rendering
  function renderChips() {
    $('#chips').innerHTML = CHIPS.map((c) =>
      '<button type="button" class="chip' + (state.chip === c.id ? ' on' : '') + '" data-chip="' + c.id + '" style="background:' + c.bg + '">' + esc(c.label) + '</button>').join('');
  }

  function renderAgents() {
    const working = state.phase === 'working';
    const finished = ['review', 'revising', 'final'].includes(state.phase);
    $('#agents').innerHTML = AGENTS.map((a, i) => {
      let status = 'Waiting', dot = '#fff', cls = '';
      if (working) {
        if (i < state.done) { status = 'Done'; dot = '#2E2A5E'; }
        else if (i === state.done) { status = 'Working'; dot = '#FFD8C9'; cls = 'pulse'; }
        else { status = 'Queued'; }
      } else if (finished) { status = 'Done'; dot = '#2E2A5E'; }
      const open = state.open === a.key;
      return '<div class="agent agent-card" style="background:' + a.color + '">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
        '<div class="icon-box"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#2E2A5E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[a.key] + '</svg></div>' +
        '<span class="status"><span class="dot ' + cls + '" style="background:' + dot + '"></span>' + status + '</span></div>' +
        '<h3 style="font-size:22px;font-weight:800">' + esc(a.name) + '</h3>' +
        '<p style="font-size:15px;line-height:1.4">' + esc(a.task) + '</p>' +
        (open ? '<p class="detail rise">' + esc(a.detail) + '</p>' : '') +
        '<button type="button" class="link" data-agent="' + a.key + '" aria-expanded="' + open + '" style="align-self:flex-start">' + (open ? 'Hide details' : 'What does it do?') + '</button></div>';
    }).join('');
    $('#progress').hidden = !working;
    $('#progressFill').style.width = Math.round((state.done / 5) * 100) + '%';
  }

  function budgetHtml() {
    const t = total(), g = parseGuests(state.request);
    const bars = SPLIT.map((r, i) =>
      '<div style="display:flex;flex-direction:column;gap:6px"><div style="display:flex;justify-content:space-between;gap:12px;font-weight:700;font-size:17px"><span>' + esc(r[0]) + ' (' + Math.round(r[1] * 100) + '%)</span><span data-amt="' + i + '"></span></div>' +
      '<div class="track"><div class="fill bar" data-bar="' + i + '" style="background:' + r[2] + ';width:' + Math.round((r[1] / 0.25) * 100) + '%"></div></div></div>').join('');
    return '<div style="display:flex;flex-direction:column;gap:18px">' +
      '<div style="background:var(--mist);border:2px solid var(--ink);border-radius:20px;padding:18px;display:flex;flex-direction:column;gap:8px">' +
      '<label for="slider" style="font-weight:700;font-size:17px">Try a different budget: <span id="sliderLabel"></span></label>' +
      '<input id="slider" class="range" type="range" min="10000" max="500000" step="5000" value="' + Math.min(Math.max(t, 10000), 500000) + '">' +
      '<p style="font-size:15px;color:var(--soft)">Drag and watch every category update. This is a what-if tool and does not change the agents\' plan.</p></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:14px">' +
      '<div class="stat" style="background:#C9F2E0"><span>Per guest (' + g + ')</span><b id="perGuest"></b></div>' +
      '<div class="stat" style="background:#FFD3E8"><span>Safety cushion</span><b id="cushion"></b></div>' +
      '<div class="stat" style="background:#CDE6FF"><span>Biggest line</span><b id="biggest"></b></div></div>' +
      '<div style="display:flex;flex-direction:column;gap:14px">' + bars + '</div>' +
      '<div><h3 style="font-size:22px;margin-bottom:8px">What the budget agent says</h3><div class="md">' + md(state.sections.budget) + '</div></div></div>';
  }
  function updateBudget() {
    const t = total(), g = Math.max(parseGuests(state.request), 1);
    const set = (sel, v) => { const el = $(sel); if (el) el.textContent = v; };
    set('#sliderLabel', money(t));
    set('#perGuest', money(Math.round(t / g)));
    set('#cushion', money(Math.round(t * 0.08)));
    set('#biggest', money(Math.round(t * 0.25)));
    SPLIT.forEach((r, i) => set('[data-amt="' + i + '"]', money(Math.round(t * r[1]))));
  }

  function renderTabs() {
    const avail = TABS.filter((t) => t.id === 'plan' || (t.get(state) || '').trim());
    if (!avail.some((t) => t.id === state.tab)) state.tab = 'plan';
    $('#tabs').innerHTML = avail.map((t) =>
      '<button type="button" class="tab" data-tab="' + t.id + '" aria-pressed="' + (state.tab === t.id) + '" style="' + (state.tab === t.id ? 'background:' + t.bg : '') + '">' + esc(t.label) + '</button>').join('');
    const cur = TABS.find((t) => t.id === state.tab);
    if (state.tab === 'budget') {
      $('#tabBody').innerHTML = budgetHtml();
      updateBudget();
    } else {
      $('#tabBody').innerHTML = '<div class="md">' + md(cur.get(state)) + '</div>' +
        '<div style="margin-top:16px"><button type="button" class="link" data-copy="1">Copy this section</button> <span id="copied" style="font-weight:700" role="status"></span></div>';
    }
  }

  function renderResults() {
    const p = state.phase;
    const show = ['review', 'revising', 'final', 'blocked'].includes(p);
    $('#results').hidden = !show;
    if (!show) return;
    const planView = p === 'review' || p === 'revising';
    $('#resultsTitle').textContent = p === 'blocked' ? 'This one is not for me' : 'Your event plan';
    $('#badges').innerHTML = p === 'blocked' ? '' :
      '<span class="pill" style="background:var(--sky)">' + parseGuests(state.request) + ' guests</span>' +
      '<span class="pill" style="background:var(--butter)">' + money(parseAmount(state.request)) + ' budget</span>' +
      (state.revisions > 0 ? '<span class="pill" style="background:var(--pink)">Revision ' + state.revisions + '</span>' : '');
    $('#tabs').hidden = !planView;
    $('#tabBody').hidden = !(planView || p === 'blocked');
    if (planView) renderTabs();
    if (p === 'blocked') $('#tabBody').innerHTML = '<div class="md">' + md(state.blocked) + '</div><div style="margin-top:16px"><button type="button" id="blockedAgain" class="btn" style="background:var(--butter)">Try another request</button></div>';
    $('#review').hidden = p !== 'review';
    $('#revising').hidden = p !== 'revising';
    $('#final').hidden = p !== 'final';
    if (p === 'final') {
      $('#finalText').innerHTML = md(state.finalText);
      $('#tabBody').hidden = true;
      const colors = ['#FFF1B5', '#FFD3E8', '#CDE6FF', '#E0D4FF', '#FFD8C9', '#ffffff'];
      let html = '';
      for (let i = 0; i < 18; i++) {
        const size = 10 + (i % 3) * 4;
        html += '<span class="fall" style="left:' + (3 + i * 5.4) + '%;width:' + size + 'px;height:' + size + 'px;background:' + colors[i % 6] + ';border-radius:' + (i % 2 ? '50%' : '3px') + ';animation-delay:' + ((i * 0.37) % 2.4).toFixed(2) + 's"></span>';
      }
      $('#confetti').innerHTML = html;
    }
  }

  function render() {
    renderChips();
    renderAgents();
    renderResults();
    const b = $('#build');
    b.disabled = state.phase === 'working' || state.phase === 'revising';
    b.textContent = state.phase === 'working' ? 'Agents are working\u2026' : (['review', 'final'].includes(state.phase) ? 'Build it again' : 'Build my plan');
  }

  // ---------- server calls
  async function post(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.detail || ('Server error (' + r.status + '). Check the server window. If it mentions a rate limit, wait a minute and try again.'));
    return d;
  }
  function showError(msg) { const e = $('#error'); e.textContent = msg || ''; e.hidden = !msg; }

  function handle(d) {
    state.threadId = d.thread_id;
    state.done = 5;
    if (d.status === 'needs_review') {
      state.phase = 'review';
      state.draft = d.draft || '';
      state.sections = d.sections || {};
      state.revisions = d.revisions || 0;
    } else if (d.status === 'blocked') {
      state.phase = 'blocked';
      state.blocked = d.answer || '';
    } else {
      state.phase = 'final';
      state.finalText = d.answer || '';
    }
  }
  function stopProgress() { clearInterval(state.timer); }

  async function build() {
    if (!state.request.trim()) { $('#hint').hidden = false; $('#request').focus(); return; }
    $('#hint').hidden = true; showError('');
    Object.assign(state, { phase: 'working', done: 0, tab: 'plan', revisions: 0, override: null, threadId: null });
    $('#feedback').value = '';
    render();
    stopProgress();
    state.timer = setInterval(() => { if (state.done < 4) { state.done += 1; renderAgents(); } }, 2500);
    try {
      handle(await post('/api/plan', { message: state.request, thread_id: null }));
    } catch (e) {
      state.phase = 'idle'; state.done = 0; showError(e.message);
    }
    stopProgress();
    render();
  }

  async function review(approved) {
    const fb = $('#feedback').value;
    if (!approved && !fb.trim()) { $('#fbHint').hidden = false; $('#feedback').focus(); return; }
    $('#fbHint').hidden = true; showError('');
    const prev = state.phase;
    state.phase = 'revising';
    renderResults(); $('#build').disabled = true;
    try {
      handle(await post('/api/plan/review', { thread_id: state.threadId, approved, feedback: fb }));
      $('#feedback').value = '';
    } catch (e) {
      state.phase = prev; showError(e.message);
    }
    render();
    $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function reset() {
    stopProgress();
    Object.assign(state, { request: '', chip: '', phase: 'idle', done: 0, open: '', tab: 'plan', threadId: null, draft: '', sections: {}, revisions: 0, finalText: '', blocked: '', override: null });
    $('#request').value = ''; $('#feedback').value = ''; showError('');
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- events
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.chip) {
      const c = CHIPS.find((x) => x.id === t.dataset.chip);
      state.request = c.text; state.chip = c.id; state.override = null;
      $('#request').value = c.text; $('#hint').hidden = true; renderChips();
    } else if (t.dataset.agent) {
      state.open = state.open === t.dataset.agent ? '' : t.dataset.agent; renderAgents();
    } else if (t.dataset.tab) {
      state.tab = t.dataset.tab; renderTabs();
    } else if (t.dataset.copy) {
      const cur = TABS.find((x) => x.id === state.tab);
      const text = cur.get(state) || '';
      const done = () => { const c = $('#copied'); if (c) c.textContent = 'Copied'; };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => {});
    } else if (t.id === 'build') build();
    else if (t.id === 'approve') review(true);
    else if (t.id === 'revise') review(false);
    else if (t.id === 'again' || t.id === 'blockedAgain') reset();
    else if (t.id === 'print') window.print();
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'request') { state.request = e.target.value; state.override = null; $('#hint').hidden = true; }
    else if (e.target.id === 'slider') { state.override = parseInt(e.target.value, 10); updateBudget(); }
  });

  render();
})();

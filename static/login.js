(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  let mode = 'login', tried = false, timer = null;

  const emailOk = () => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test($('#email').value.trim());
  const pwOk = () => $('#password').value.length >= 8;

  function validate() {
    $('#emailErr').hidden = !(tried && !emailOk());
    $('#pwErr').hidden = !(tried && !pwOk());
    $('#email').style.borderColor = tried && !emailOk() ? '#A12B4B' : '';
    $('#password').style.borderColor = tried && !pwOk() ? '#A12B4B' : '';
  }

  function strength() {
    const p = $('#password').value;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    const colors = ['#FFD3E8', '#FFD8C9', '#FFF1B5', '#C9F2E0'];
    document.querySelectorAll('#strength span').forEach((s, i) => { s.style.background = i < score ? colors[i] : '#F4EFFF'; });
    $('#strengthLabel').textContent = ['Type a password to see its strength', 'Weak: add numbers or symbols', 'Okay: mix upper and lower case', 'Good: one more touch', 'Strong password'][p ? score : 0];
  }

  function setMode(m) {
    mode = m; tried = false;
    const signup = m === 'signup';
    $('#tabLogin').classList.toggle('on', !signup);
    $('#tabSignup').classList.toggle('on', signup);
    $('#heading').textContent = signup ? 'Create your account' : 'Good to see you again';
    $('#subheading').textContent = signup ? 'It takes less than a minute.' : 'Log in to keep planning.';
    $('#submit').textContent = signup ? 'Create my account' : 'Log in';
    $('#nameWrap').hidden = !signup;
    $('#strengthWrap').hidden = !signup;
    $('#rememberRow').hidden = signup;
    $('#password').setAttribute('autocomplete', signup ? 'new-password' : 'current-password');
    $('#note').hidden = true;
    validate();
  }

  function view(v) {
    $('#formView').hidden = v !== 'form';
    $('#loadingView').hidden = v !== 'loading';
    $('#doneView').hidden = v !== 'done';
  }

  function submit() {
    tried = true; $('#note').hidden = true; validate();
    if (!emailOk() || !pwOk()) { (!emailOk() ? $('#email') : $('#password')).focus(); return; }
    const signup = mode === 'signup';
    $('#loadingText').textContent = signup ? 'Setting up your crew…' : 'Checking your details…';
    view('loading');
    clearTimeout(timer);
    timer = setTimeout(() => {
      const who = $('#name').value.trim() || $('#email').value.split('@')[0] || 'friend';
      $('#welcome').textContent = (signup ? 'Welcome, ' : 'Welcome back, ') + who;
      view('done');
    }, 1500);
  }

  function note(t) { const n = $('#note'); n.textContent = t; n.hidden = false; }

  $('#tabLogin').addEventListener('click', () => setMode('login'));
  $('#tabSignup').addEventListener('click', () => setMode('signup'));
  $('#toggle').addEventListener('click', () => {
    const show = $('#password').type === 'password';
    $('#password').type = show ? 'text' : 'password';
    $('#toggle').textContent = show ? 'Hide' : 'Show';
    $('#toggle').setAttribute('aria-pressed', String(show));
  });
  $('#google').addEventListener('click', () => note('This is a preview, so Google sign-in is not connected yet.'));
  $('#forgot').addEventListener('click', () => note('In the real app, a reset link would be emailed to you.'));
  $('#submit').addEventListener('click', submit);
  $('#password').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  $('#password').addEventListener('input', () => { strength(); if (tried) validate(); });
  $('#email').addEventListener('input', () => { if (tried) validate(); });
  $('#logout').addEventListener('click', () => { $('#password').value = ''; strength(); tried = false; validate(); view('form'); });

  setMode('login');
  strength();
})();

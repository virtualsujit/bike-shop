(function () {
  'use strict';

  // ---- Business config (edit here) ----
  var CONFIG = {
    whatsappNumber: '15550100', // placeholder: international format, digits only
    whatsappGreeting: "Hi Sam! I'd like to book a bike repair.",
    email: 'hello@samsbikes.example',
    // 0 = Sunday ... 6 = Saturday; [openHour, closeHour] in 24h, null = closed
    hours: {
      0: null,
      1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18],
      6: [10, 16]
    }
  };

  function waLink(text) {
    return 'https://wa.me/' + CONFIG.whatsappNumber + '?text=' + encodeURIComponent(text);
  }

  // ---- WhatsApp links ----
  document.querySelectorAll('.js-whatsapp').forEach(function (el) {
    el.href = waLink(CONFIG.whatsappGreeting);
    el.target = '_blank';
    el.rel = 'noopener';
  });

  // ---- Mobile nav ----
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('nav-links');
  function setNav(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    links.classList.toggle('open', open);
  }
  toggle.addEventListener('click', function () {
    setNav(toggle.getAttribute('aria-expanded') !== 'true');
  });
  links.addEventListener('click', function (e) {
    if (e.target.closest('a')) setNav(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setNav(false);
  });

  // ---- Service cards preselect the form ----
  var serviceSelect = document.getElementById('service');
  document.querySelectorAll('[data-service]').forEach(function (el) {
    el.addEventListener('click', function () {
      serviceSelect.value = el.getAttribute('data-service');
      clearError(serviceSelect);
    });
  });

  // ---- Hours: highlight today + open/closed status ----
  function fmt(h) {
    var suffix = h >= 12 ? 'pm' : 'am';
    var hr = h % 12 || 12;
    return hr + suffix;
  }
  (function updateHours() {
    var now = new Date();
    var day = now.getDay();
    var hourNow = now.getHours() + now.getMinutes() / 60;
    var row = document.querySelector('#hours-table tr[data-day="' + day + '"]');
    if (row) row.classList.add('today');

    var statusEl = document.getElementById('open-status');
    var dot = document.querySelector('.status-dot');
    var today = CONFIG.hours[day];

    if (today && hourNow >= today[0] && hourNow < today[1]) {
      statusEl.textContent = 'Open now · until ' + fmt(today[1]);
    } else {
      dot.classList.add('closed');
      var label;
      if (today && hourNow < today[0]) {
        label = 'today at ' + fmt(today[0]);
      } else {
        // find next open day
        var names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        for (var i = 1; i <= 7; i++) {
          var d = (day + i) % 7;
          if (CONFIG.hours[d]) {
            label = (i === 1 ? 'tomorrow' : names[d]) + ' at ' + fmt(CONFIG.hours[d][0]);
            break;
          }
        }
      }
      statusEl.textContent = 'Closed now · opens ' + label;
    }
  })();

  // ---- Booking form ----
  var form = document.getElementById('book-form');
  var success = document.getElementById('form-success');
  var dateInput = document.getElementById('date');

  // No past dates
  var t = new Date();
  dateInput.min = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');

  function fieldOf(input) { return input.closest('.field'); }
  function setError(input, msg) {
    var f = fieldOf(input);
    f.classList.add('invalid');
    input.setAttribute('aria-invalid', 'true');
    f.querySelector('.error').textContent = msg;
  }
  function clearError(input) {
    var f = fieldOf(input);
    f.classList.remove('invalid');
    input.removeAttribute('aria-invalid');
    var err = f.querySelector('.error');
    if (err) err.textContent = '';
  }

  function validate() {
    var ok = true;
    var name = form.name.value.trim();
    var phone = form.phone.value.trim();
    var email = form.email.value.trim();

    [form.name, form.phone, form.email, form.service, form.date].forEach(clearError);

    if (!name) { setError(form.name, 'Please tell us your name.'); ok = false; }
    if (phone.replace(/\D/g, '').length < 7) { setError(form.phone, 'Please enter a phone number we can reach you on.'); ok = false; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(form.email, 'That email doesn’t look right.'); ok = false; }
    if (!form.service.value) { setError(form.service, 'Please choose a service.'); ok = false; }
    if (form.date.value) {
      var picked = new Date(form.date.value + 'T12:00:00');
      if (!CONFIG.hours[picked.getDay()]) { setError(form.date, 'We’re closed Sundays. Please pick another day.'); ok = false; }
    }
    return ok;
  }

  form.querySelectorAll('input, select').forEach(function (el) {
    el.addEventListener('input', function () { if (fieldOf(el).classList.contains('invalid')) clearError(el); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) {
      var first = form.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
      return;
    }

    var d = {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim() || '-',
      service: form.service.value,
      date: form.date.value || 'Flexible',
      message: form.message.value.trim() || '-'
    };

    var body =
      'Name: ' + d.name + '\n' +
      'Phone: ' + d.phone + '\n' +
      'Email: ' + d.email + '\n' +
      'Service: ' + d.service + '\n' +
      'Preferred drop-off: ' + d.date + '\n\n' +
      'Details:\n' + d.message;

    // No backend: hand off to the visitor's email app.
    // To receive bookings directly, point the form at a service like Formspree or Netlify Forms.
    window.location.href = 'mailto:' + CONFIG.email +
      '?subject=' + encodeURIComponent('Repair booking: ' + d.service + ' (' + d.name + ')') +
      '&body=' + encodeURIComponent(body);

    // Offer WhatsApp with the same details as a fallback
    success.querySelectorAll('.js-whatsapp').forEach(function (el) {
      el.href = waLink("Hi Sam! I'd like to book a repair.\n\n" + body);
    });
    success.hidden = false;
    success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // ---- Footer year ----
  document.getElementById('year').textContent = new Date().getFullYear();
})();

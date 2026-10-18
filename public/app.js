// Supertext Translation for HubSpot: the little the pages do in the browser.
// API calls carry the session cookie and the page's CSRF token.
(function () {
  'use strict';
  var body = document.body;
  var csrf = body.getAttribute('data-csrf') || '';
  var locale = body.getAttribute('data-locale') || 'en';

  function api(method, path, data) {
    return fetch(path, {
      method: method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, 'Accept-Language': locale },
      body: data ? JSON.stringify(data) : undefined,
    }).then(function (response) {
      return response.json().then(function (json) {
        return { ok: response.ok, json: json };
      });
    });
  }

  function checked(form, name) {
    return Array.prototype.slice.call(form.querySelectorAll('input[name="' + name + '"]:checked')).map(function (input) {
      return input.value;
    });
  }

  // --- Translate page -------------------------------------------------------
  var form = document.getElementById('translate-form');
  if (form) {
    var button = document.getElementById('translate-button');
    var message = document.getElementById('form-message');
    var overwrite = document.getElementById('overwrite');
    var warning = document.getElementById('overwrite-warning');
    var hint = document.getElementById('overwrite-hint');
    var updateButton = function () {
      var count = checked(form, 'language').length;
      var label = button.getAttribute('data-label');
      if (count > 0) {
        var plural = new Intl.PluralRules(locale).select(count) === 'one' ? 'data-label-one' : 'data-label-other';
        label = button.getAttribute(plural).replace('{count}', String(count));
      }
      button.textContent = label;
    };
    form.addEventListener('change', function (event) {
      if (event.target && event.target.name === 'language') updateButton();
    });
    if (overwrite) {
      overwrite.addEventListener('change', function () {
        warning.hidden = !overwrite.checked;
        hint.hidden = overwrite.checked;
      });
    }
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var item = checked(form, 'item')[0];
      var kind = form.getAttribute('data-kind');
      var languages = checked(form, 'language');
      if (!item || languages.length === 0) {
        message.textContent = button.getAttribute('data-select');
        return;
      }
      message.textContent = '';
      button.disabled = true;
      button.textContent = button.getAttribute('data-starting');
      api('POST', '/api/jobs', {
        kind: kind,
        itemId: item,
        languages: languages,
        overwrite: Boolean(overwrite && overwrite.checked),
      }).then(function (result) {
        if (!result.ok) {
          button.disabled = false;
          updateButton();
          message.textContent = (result.json.error && result.json.error.message) || 'Error';
          return;
        }
        poll(result.json.id, function () {
          // Reload so the list shows the new versions.
          window.location.href = '/?kind=' + encodeURIComponent(kind) + '&item=' + encodeURIComponent(item);
        });
      });
    });
    updateButton();

    // Export for translation: the file comes back as a download (no API key needed).
    var exportButton = document.getElementById('export-button');
    var exportMessage = document.getElementById('export-message');
    if (exportButton) {
      exportButton.addEventListener('click', function () {
        var item = checked(form, 'item')[0];
        var languages = checked(form, 'language');
        var format = checked(form, 'format')[0] || 'xliff';
        if (!item || languages.length === 0) {
          exportMessage.textContent = exportButton.getAttribute('data-select');
          return;
        }
        if (format === 'html' && languages.length !== 1) {
          exportMessage.textContent = exportButton.getAttribute('data-one');
          return;
        }
        exportMessage.textContent = '';
        exportButton.disabled = true;
        fetch('/api/export', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, 'Accept-Language': locale },
          body: JSON.stringify({ kind: form.getAttribute('data-kind'), itemId: item, languages: languages, format: format }),
        })
          .then(function (response) {
            if (!response.ok) {
              return response.json().then(function (json) {
                exportMessage.textContent = (json.error && json.error.message) || 'Error';
              });
            }
            var disposition = response.headers.get('Content-Disposition') || '';
            var match = /filename="([^"]+)"/.exec(disposition);
            return response.blob().then(function (blob) {
              var url = URL.createObjectURL(blob);
              var link = document.createElement('a');
              link.href = url;
              link.download = match ? match[1] : 'supertext.xlf';
              document.body.appendChild(link);
              link.click();
              link.remove();
              setTimeout(function () {
                URL.revokeObjectURL(url);
              }, 10000);
            });
          })
          .catch(function () {
            exportMessage.textContent = 'Error';
          })
          .then(function () {
            exportButton.disabled = false;
          });
      });
    }
  }

  var panel = document.getElementById('job-panel');
  function poll(id, finished) {
    api('GET', '/api/jobs/' + encodeURIComponent(id)).then(function (result) {
      if (!result.ok) return;
      panel.innerHTML = result.json.html;
      if (result.json.status === 'running') {
        setTimeout(function () {
          poll(id, finished);
        }, 2000);
      } else if (finished) {
        finished();
      }
    });
  }
  if (panel && panel.getAttribute('data-job')) poll(panel.getAttribute('data-job'));

  // --- Settings page --------------------------------------------------------
  var test = document.getElementById('test-button');
  if (test) {
    var resultText = document.getElementById('test-result');
    test.addEventListener('click', function () {
      var label = test.textContent;
      test.disabled = true;
      test.textContent = test.getAttribute('data-testing');
      resultText.textContent = '';
      resultText.className = '';
      var keyInput = document.querySelector('input[name="apiKey"]');
      api('POST', '/api/test', { apiKey: keyInput ? keyInput.value : '' }).then(function (result) {
        test.disabled = false;
        test.textContent = label;
        // The server renders the key check message (escaped, with its links); else plain text.
        if (result.json.html) resultText.innerHTML = result.json.html;
        else resultText.textContent = result.json.message || '';
        resultText.className = result.json.ok ? 'ok' : 'failed';
      });
    });
  }

  var targets = document.getElementById('targets');
  if (targets) {
    targets.addEventListener('change', function (event) {
      var input = event.target;
      if (input && input.name === 'target') {
        var row = input.closest('tr');
        if (row) row.className = input.checked ? 'chosen' : 'other';
      }
    });
  }

  // --- Searchable dropdowns (Settings → Languages) ---------------------------
  // Each <select data-combobox> gets a text field that filters its options by name or code.
  // The select stays in the form (hidden) and keeps the value; without script it is used as it is.
  function normalize(text) {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[_\s]+/g, '-');
  }

  var comboCount = 0;
  function combobox(select) {
    var id = 'combo-' + ++comboCount;
    var wrap = document.createElement('div');
    wrap.className = 'combo';
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'combo-input';
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', id);
    input.setAttribute('aria-label', select.getAttribute('aria-label') || '');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    input.placeholder = select.getAttribute('data-placeholder') || '';
    var list = document.createElement('ul');
    list.id = id;
    list.className = 'combo-list';
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(input);
    wrap.appendChild(list);
    wrap.appendChild(select);
    select.classList.add('combo-native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    // The options with their group: [{ value, label, name, code, group }].
    var options = [];
    Array.prototype.forEach.call(select.options, function (option) {
      var label = option.textContent.trim();
      var suffix = ' (' + option.value + ')';
      var split = option.value && label.slice(-suffix.length) === suffix ? label.length - suffix.length : -1;
      var group = option.parentNode.tagName === 'OPTGROUP' ? option.parentNode.getAttribute('label') : '';
      options.push({
        value: option.value,
        label: label,
        name: split >= 0 ? label.slice(0, split) : label,
        code: split >= 0 ? option.value : '',
        group: group,
        search: normalize(label + ' ' + option.value),
      });
    });
    var shown = [];
    var active = -1;

    function current() {
      for (var i = 0; i < options.length; i++) if (options[i].value === select.value) return options[i];
      return options[0];
    }
    function showValue() {
      input.value = current().label;
      input.classList.toggle('missing', select.value === '');
    }
    function setActive(index) {
      var items = list.querySelectorAll('[role="option"]');
      if (active >= 0 && items[active]) items[active].classList.remove('active');
      active = index;
      if (active >= 0 && items[active]) {
        items[active].classList.add('active');
        input.setAttribute('aria-activedescendant', items[active].id);
        items[active].scrollIntoView({ block: 'nearest' });
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    }
    function render(query) {
      var words = normalize(query).split('-').filter(Boolean);
      shown = options.filter(function (option) {
        return words.every(function (word) {
          return option.search.indexOf(word) >= 0;
        });
      });
      list.innerHTML = '';
      var group = null;
      shown.forEach(function (option, index) {
        if (option.group && option.group !== group) {
          var heading = document.createElement('li');
          heading.className = 'combo-group';
          heading.setAttribute('role', 'presentation');
          heading.textContent = option.group;
          list.appendChild(heading);
        }
        group = option.group;
        var item = document.createElement('li');
        item.id = id + '-' + index;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', option.value === select.value ? 'true' : 'false');
        var name = document.createElement('span');
        name.textContent = option.name;
        item.appendChild(name);
        if (option.code) {
          var code = document.createElement('code');
          code.textContent = option.code;
          item.appendChild(code);
        }
        item.addEventListener('mousedown', function (event) {
          event.preventDefault(); // keep the focus in the field
        });
        item.addEventListener('click', function () {
          choose(index);
        });
        list.appendChild(item);
      });
      if (shown.length === 0) {
        var none = document.createElement('li');
        none.className = 'combo-empty';
        none.setAttribute('role', 'presentation');
        none.textContent = select.getAttribute('data-no-match') || '';
        list.appendChild(none);
      }
      active = -1;
    }
    function open(query) {
      render(query);
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      var selected = -1;
      if (!query) {
        for (var i = 0; i < shown.length; i++) if (shown[i].value === select.value) selected = i;
      }
      setActive(selected >= 0 ? selected : shown.length ? 0 : -1);
    }
    function close() {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    }
    function choose(index) {
      var option = shown[index];
      if (option && option.value !== select.value) {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      close();
      showValue();
    }

    input.addEventListener('focus', function () {
      input.select();
      open('');
    });
    input.addEventListener('click', function () {
      if (list.hidden) open('');
    });
    input.addEventListener('input', function () {
      open(input.value);
    });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (list.hidden) return open('');
        if (shown.length === 0) return;
        var next = event.key === 'ArrowDown' ? active + 1 : active - 1;
        setActive((next + shown.length) % shown.length);
      } else if (event.key === 'Enter') {
        if (!list.hidden) {
          event.preventDefault(); // don't submit the form
          if (active >= 0) choose(active);
        }
      } else if (event.key === 'Escape') {
        if (!list.hidden) {
          event.preventDefault();
          close();
          showValue();
          input.select();
        }
      } else if (event.key === 'Tab') {
        if (!list.hidden && active >= 0 && input.value !== current().label) choose(active);
      }
    });
    input.addEventListener('blur', function () {
      close();
      showValue();
    });
    showValue();
  }
  Array.prototype.forEach.call(document.querySelectorAll('select[data-combobox]'), combobox);

  var disconnect = document.getElementById('disconnect-form');
  if (disconnect) {
    disconnect.addEventListener('submit', function (event) {
      if (!window.confirm(disconnect.getAttribute('data-confirm'))) event.preventDefault();
    });
  }
})();

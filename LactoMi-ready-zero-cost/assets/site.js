(function () {
  const config = window.LACTOMI_CONFIG || {};
  const form = document.getElementById('analysisForm');
  const pdfInput = document.getElementById('analysisPdf');
  const messageInput = document.getElementById('analysisMessage');
  const chatOutput = document.getElementById('chatOutput');
  const statusBadge = document.getElementById('statusBadge');
  const submitBtn = document.getElementById('submitBtn');
  const websiteField = document.getElementById('websiteField');
  const consentField = document.getElementById('analysisConsent');
  const privacyField = document.getElementById('analysisPrivacy');
  const turnstileWrap = document.getElementById('turnstileWrap');
  const turnstileWidget = document.getElementById('turnstileWidget');

  let turnstileId = null;

  function escapeHtml(value) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function addMessage(type, text) {
    const div = document.createElement('div');
    div.className = `message ${type === 'user' ? 'message-user' : 'message-bot'}`;
    div.innerHTML = escapeHtml(text);
    chatOutput.appendChild(div);
    chatOutput.scrollTop = chatOutput.scrollHeight;
  }

  function clearMessages() {
    chatOutput.innerHTML = '';
  }

  function setStatus(text, kind) {
    statusBadge.textContent = text;
    statusBadge.classList.remove('status-error', 'status-loading');
    if (kind === 'error') statusBadge.classList.add('status-error');
    if (kind === 'loading') statusBadge.classList.add('status-loading');
  }

  function getTurnstileToken() {
    if (!window.turnstile || turnstileId === null) return '';
    try {
      return window.turnstile.getResponse(turnstileId) || '';
    } catch (_) {
      return '';
    }
  }

  function resetTurnstile() {
    if (!window.turnstile || turnstileId === null) return;
    try {
      window.turnstile.reset(turnstileId);
    } catch (_) {
      // ignore
    }
  }

  function renderTurnstileWhenReady() {
    const siteKey = String(config.turnstileSiteKey || '').trim();
    if (!siteKey || siteKey.indexOf('PASTE_') === 0) return;
    if (!window.turnstile || !turnstileWidget) {
      window.setTimeout(renderTurnstileWhenReady, 300);
      return;
    }
    if (turnstileId !== null) return;
    turnstileWrap.classList.remove('hidden');
    turnstileId = window.turnstile.render('#turnstileWidget', {
      sitekey: siteKey,
      theme: 'light'
    });
  }

  renderTurnstileWhenReady();

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const pdf = pdfInput.files && pdfInput.files[0];
    const message = (messageInput.value || '').trim();

    if (!pdf) {
      setStatus('Загрузите PDF', 'error');
      return;
    }

    if (websiteField.value) {
      setStatus('Запрос отклонён', 'error');
      return;
    }

    if (typeof form.reportValidity === 'function' && !form.reportValidity()) {
      return;
    }

    clearMessages();
    addMessage('user', `Файл: ${pdf.name}${message ? `\n\nВопрос: ${message}` : ''}`);
    setStatus('Идёт обработка…', 'loading');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Обрабатываем…';

    const formData = new FormData();
    formData.append('analysis_pdf', pdf);
    formData.append('message', message);
    formData.append('website', websiteField.value || '');
    formData.append('consent', consentField && consentField.checked ? '1' : '0');
    formData.append('privacy_confirm', privacyField && privacyField.checked ? '1' : '0');

    const token = getTurnstileToken();
    if (token) {
      formData.append('cf-turnstile-response', token);
    }

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      const payload = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        throw new Error(payload.error || 'Не удалось обработать анализ.');
      }

      addMessage('bot', payload.answer || 'Ответ не получен.');
      setStatus('Готово', 'ok');
      resetTurnstile();
    } catch (error) {
      addMessage('bot', `Ошибка: ${error.message || 'Что-то пошло не так.'}`);
      setStatus('Ошибка', 'error');
      resetTurnstile();
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Расшифровать анализ';
    }
  });
})();

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
  let pdfJsPromise = null;

  function escapeHtml(value) {
    return String(value || '')
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

  async function loadPdfJs() {
    if (window.pdfjsLib) return window.pdfjsLib;
    if (pdfJsPromise) return pdfJsPromise;

    pdfJsPromise = import('https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/build/pdf.mjs')
      .then(function (mod) {
        mod.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/build/pdf.worker.mjs';
        window.pdfjsLib = mod;
        return mod;
      });

    return pdfJsPromise;
  }

  function groupTextItemsIntoLines(items) {
    const prepared = items
      .filter(function (item) {
        return item && typeof item.str === 'string' && item.str.trim();
      })
      .map(function (item) {
        return {
          str: item.str,
          x: Array.isArray(item.transform) ? Number(item.transform[4] || 0) : 0,
          y: Array.isArray(item.transform) ? Number(item.transform[5] || 0) : 0,
          hasEOL: Boolean(item.hasEOL)
        };
      })
      .sort(function (a, b) {
        if (Math.abs(a.y - b.y) > 2.5) return b.y - a.y;
        return a.x - b.x;
      });

    const lines = [];
    for (const item of prepared) {
      const lastLine = lines[lines.length - 1];
      if (!lastLine || Math.abs(lastLine.y - item.y) > 2.5) {
        lines.push({ y: item.y, items: [item] });
      } else {
        lastLine.items.push(item);
      }
    }

    return lines.map(function (line) {
      const ordered = line.items.sort(function (a, b) { return a.x - b.x; });
      let result = '';
      let prevX = null;
      for (const item of ordered) {
        const text = String(item.str || '').trim();
        if (!text) continue;
        if (!result) {
          result = text;
        } else {
          const gap = prevX === null ? 0 : item.x - prevX;
          result += gap > 12 ? '  ' : ' ';
          result += text;
        }
        prevX = item.x;
        if (item.hasEOL) result += '\n';
      }
      return result.replace(/[ \t]{2,}/g, ' ').replace(/\s+\n/g, '\n').trim();
    }).filter(Boolean);
  }

  function stripSensitiveLines(text) {
    return String(text || '')
      .replace(/\r/g, '\n')
      .split(/\n+/)
      .filter(function (line) {
        const value = String(line || '').trim();
        if (!value) return false;
        return !/^(ФИО|ИНЗ:?|Пол:?|Возраст:?|Дата взятия образца:?|Дата поступления образца:?|Дата печати результата:?|Врач:?|М\.П\.|Подпись врача)/i.test(value);
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  async function extractTextFromPdf(file) {
    const pdfjsLib = await loadPdfJs();
    const data = new Uint8Array(await file.arrayBuffer());
    const task = pdfjsLib.getDocument({
      data,
      useSystemFonts: true,
      isEvalSupported: false
    });

    const pdfDoc = await task.promise;
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber += 1) {
      const page = await pdfDoc.getPage(pageNumber);
      const textContent = await page.getTextContent({ disableNormalization: false });
      const lines = groupTextItemsIntoLines(textContent.items);
      pages.push(lines.join('\n'));
    }

    return stripSensitiveLines(pages.join('\n\n'));
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
    setStatus('Читаем PDF…', 'loading');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Обрабатываем…';

    let extractedText = '';
    let extractionFailed = false;

    try {
      extractedText = await extractTextFromPdf(pdf);
    } catch (_) {
      extractionFailed = true;
    }

    const formData = new FormData();
    formData.append('analysis_pdf_name', pdf.name);
    formData.append('message', message);
    formData.append('website', websiteField.value || '');
    formData.append('consent', consentField && consentField.checked ? '1' : '0');
    formData.append('privacy_confirm', privacyField && privacyField.checked ? '1' : '0');

    if (extractedText && extractedText.length >= 80) {
      formData.append('analysis_text', extractedText);
    } else {
      formData.append('analysis_pdf', pdf);
    }

    const token = getTurnstileToken();
    if (token) {
      formData.append('cf-turnstile-response', token);
    }

    try {
      setStatus(extractedText ? 'Разбираем показатели…' : 'Пробуем обработать PDF…', 'loading');

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
      const extraHint = extractionFailed
        ? '\n\nПодсказка: браузеру не удалось достать текст из PDF. Для сканов нужен отдельный OCR-режим.'
        : '';
      addMessage('bot', `Ошибка: ${error.message || 'Что-то пошло не так.'}${extraHint}`);
      setStatus('Ошибка', 'error');
      resetTurnstile();
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Расшифровать анализ';
    }
  });
})();

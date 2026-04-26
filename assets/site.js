(function () {
  const form = document.getElementById('analysisForm');
  const pdfInput = document.getElementById('analysisPdf');
  const galleryInput = document.getElementById('analysisGallery');
  const cameraInput = document.getElementById('analysisCamera');
  const selectedFileName = document.getElementById('selectedFileName');
  const messageInput = document.getElementById('analysisMessage');
  const chatOutput = document.getElementById('chatOutput');
  const statusBadge = document.getElementById('statusBadge');
  const submitBtn = document.getElementById('submitBtn');
  const websiteField = document.getElementById('websiteField');
  const consentField = document.getElementById('analysisConsent');
  const privacyField = document.getElementById('analysisPrivacy');
  const photoEnhanceField = document.getElementById('photoEnhance');
  const turnstileWrap = document.getElementById('turnstileWrap');
  const turnstileWidgetEl = document.getElementById('turnstileWidget');
  const turnstileHelp = document.getElementById('turnstileHelp');
  const chatFollowupForm = document.getElementById('chatFollowupForm');
  const chatFollowupInput = document.getElementById('chatFollowupInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const chatResetBtn = document.getElementById('chatResetBtn');
  const chatFollowupHelp = document.getElementById('chatFollowupHelp');

  if (!form || !pdfInput || !chatOutput || !statusBadge || !submitBtn) {
    return;
  }

  let selectedAnalysisFile = null;
  let pdfJsPromise = null;
  let turnstileScriptPromise = null;
  let turnstileWidgetId = null;
  let turnstileToken = '';
  let chatSessionToken = '';
  let chatAnalysisContext = '';
  let chatHistory = [];
  const config = window.LACTOMI_CONFIG || {};
  const brandName = config.brandName || 'LactoMi';
  const turnstileSiteKey = String(config.turnstileSiteKey || '').trim();

  const MARKERS = [
    {
      key: 'total_mass',
      label: 'Общая бактериальная масса',
      aliases: ['Общая бактериальная масса'],
      explainNormal: 'Общая бактериальная масса в референсе — выраженного снижения общей заселённости по бланку не видно.',
      explainLow: 'Общая бактериальная масса ниже референса. Такое бывает после антибиотиков, кишечных инфекций или при общем дисбиотическом сдвиге.',
      explainHigh: 'Общая бактериальная масса выше референса. Само по себе это не диагноз, но результат лучше оценивать вместе с симптомами.'
    },
    {
      key: 'lactobacillus',
      label: 'Lactobacillus spp.',
      aliases: ['Lactobacillus spp.', 'Lactobacillus spp'],
      explainNormal: 'Лактобактерии в пределах референса — защитная флора слизистой по этому показателю выглядит сохранной.',
      explainLow: 'Лактобактерии снижены. Это может сопровождаться более слабой защитой слизистой, чувствительностью ЖКТ и дискомфортом после еды.',
      explainHigh: 'Лактобактерии выше референса. Обычно это не выглядит тревожно и иногда связано с пробиотиками.'
    },
    {
      key: 'bifidobacterium',
      label: 'Bifidobacterium spp.',
      aliases: ['Bifidobacterium spp.', 'Bifidobacterium spp'],
      explainNormal: 'Бифидобактерии в норме — это хороший признак для базовой поддерживающей флоры кишечника.',
      explainLow: 'Бифидобактерии снижены. Это бывает при бедном по клетчатке рационе и общем дисбалансе микробиоты.',
      explainHigh: 'Бифидобактерии выше референса. Обычно без отдельной клинической значимости.'
    },
    {
      key: 'e_coli',
      label: 'Escherichia coli',
      aliases: ['Escherichia coli', 'Escherichia coli типичная'],
      explainNormal: 'Типичная кишечная палочка находится в допустимом диапазоне.',
      explainLow: 'Типичная E. coli ниже референса. Иногда это бывает при угнетении нормофлоры.',
      explainHigh: 'Типичная E. coli выше референса. У части людей это может сочетаться с брожением, вздутием и нестабильным стулом.'
    },
    {
      key: 'bacteroides',
      label: 'Bacteroides spp.',
      aliases: ['Bacteroides spp.', 'Bacteroides spp'],
      explainNormal: 'Bacteroides spp. в пределах референса.',
      explainLow: 'Bacteroides spp. ниже референса. Это может отражать сдвиг в переработке сложных углеводов.',
      explainHigh: 'Bacteroides spp. выше референса. Отдельно это не всегда проблема — важен общий контекст анализа.'
    },
    {
      key: 'faecali',
      label: 'Faecalibacterium prausnitzii',
      aliases: ['Faecalibacterium prausnitzii'],
      explainNormal: 'Faecalibacterium prausnitzii в референсе — это спокойный признак по противовоспалительному профилю.',
      explainLow: 'Faecalibacterium prausnitzii снижена. Это может указывать на менее устойчивый противовоспалительный фон и более слабую выработку бутирата.',
      explainHigh: 'Faecalibacterium prausnitzii выше референса. Обычно это не выглядит проблемой.'
    },
    {
      key: 'b_theta',
      label: 'Bacteroides thetaiotaomicron',
      aliases: ['Bacteroides thetaiotaomicron'],
      explainNormal: 'Bacteroides thetaiotaomicron присутствует в допустимом диапазоне.',
      explainLow: 'Bacteroides thetaiotaomicron снижена или не определяется. Иногда это бывает при бедном по клетчатке рационе.',
      explainHigh: 'Для Bacteroides thetaiotaomicron в этом бланке часто допустимо любое количество, поэтому отдельной тревоги показатель обычно не создаёт.'
    },
    {
      key: 'akkermansia',
      label: 'Akkermansia muciniphila',
      aliases: ['Akkermansia muciniphila'],
      explainNormal: 'Akkermansia muciniphila определяется в допустимом диапазоне.',
      explainLow: 'Akkermansia muciniphila не определяется или очень низкая. Иногда это обсуждают как менее благоприятный маркёр слизистого барьера.',
      explainHigh: 'Akkermansia muciniphila в пределах допустимого диапазона.'
    },
    {
      key: 'enterococcus',
      label: 'Enterococcus spp.',
      aliases: ['Enterococcus spp.', 'Enterococcus spp'],
      explainNormal: 'Enterococcus spp. в допустимом диапазоне.',
      explainLow: 'Enterococcus spp. низко определяются — обычно это не считается отдельной проблемой.',
      explainHigh: 'Enterococcus spp. выше референса. Такой результат стоит обсуждать вместе с жалобами и общим контекстом.'
    },
    {
      key: 'blautia',
      label: 'Blautia spp.',
      aliases: ['Blautia spp.', 'Blautia spp'],
      explainNormal: 'Blautia spp. в пределах референса.',
      explainLow: 'Blautia spp. ниже референса.',
      explainHigh: 'Blautia spp. выше референса.'
    },
    {
      key: 'acinetobacter',
      label: 'Acinetobacter spp.',
      aliases: ['Acinetobacter spp.', 'Acinetobacter spp'],
      explainNormal: 'Acinetobacter spp. в допустимом диапазоне.',
      explainLow: 'Acinetobacter spp. низко определяются — обычно без отдельного значения.',
      explainHigh: 'Acinetobacter spp. выше референса. Это стоит обсудить с врачом в контексте симптомов.'
    },
    {
      key: 'e_rectale',
      label: 'Eubacterium rectale',
      aliases: ['Eubacterium rectale'],
      explainNormal: 'Eubacterium rectale в пределах референса.',
      explainLow: 'Eubacterium rectale ниже референса.',
      explainHigh: 'Eubacterium rectale выше референса.'
    },
    {
      key: 'streptococcus',
      label: 'Streptococcus spp.',
      aliases: ['Streptococcus spp.', 'Streptococcus spp'],
      explainNormal: 'Streptococcus spp. в допустимом диапазоне.',
      explainLow: 'Streptococcus spp. низко определяются — обычно без отдельного значения.',
      explainHigh: 'Streptococcus spp. выше референса. Это стоит оценивать вместе с другими показателями.'
    },
    {
      key: 'roseburia',
      label: 'Roseburia inulinivorans',
      aliases: ['Roseburia inulinivorans'],
      explainNormal: 'Roseburia inulinivorans в пределах референса.',
      explainLow: 'Roseburia inulinivorans ниже референса.',
      explainHigh: 'Roseburia inulinivorans выше референса.'
    },
    {
      key: 'prevotella',
      label: 'Prevotella spp.',
      aliases: ['Prevotella spp.', 'Prevotella spp'],
      explainNormal: 'Prevotella spp. в допустимом диапазоне.',
      explainLow: 'Prevotella spp. ниже референса.',
      explainHigh: 'Prevotella spp. выше референса.'
    },
    {
      key: 'm_smithii',
      label: 'Methanobrevibacter smithii',
      aliases: ['Methanobrevibacter smithii'],
      explainNormal: 'Methanobrevibacter smithii в пределах референса.',
      explainLow: 'Methanobrevibacter smithii ниже референса.',
      explainHigh: 'Methanobrevibacter smithii выше референса.'
    },
    {
      key: 'm_stadmanae',
      label: 'Methanosphaera stadmanae',
      aliases: ['Methanosphaera stadmanae'],
      explainNormal: 'Methanosphaera stadmanae в пределах референса.',
      explainLow: 'Methanosphaera stadmanae ниже референса.',
      explainHigh: 'Methanosphaera stadmanae выше референса.'
    },
    {
      key: 'ruminococcus',
      label: 'Ruminococcus spp.',
      aliases: ['Ruminococcus spp.', 'Ruminococcus spp'],
      explainNormal: 'Ruminococcus spp. в допустимом диапазоне.',
      explainLow: 'Ruminococcus spp. ниже референса.',
      explainHigh: 'Ruminococcus spp. выше референса.'
    },
    {
      key: 'ratio_bact_faec',
      label: 'Соотношение Bacteroides/Faecalibacterium prausnitzii',
      aliases: [
        'Соотношение Bacteroides speciales/ Faecalibacterium prausnitzii',
        'Соотношение Bacteroides species/ Faecalibacterium prausnitzii',
        'Соотношение Bacteroides/Faecalibacterium prausnitzii'
      ],
      explainNormal: 'Соотношение Bacteroides/Faecalibacterium находится в пределах референса.',
      explainLow: 'Соотношение Bacteroides/Faecalibacterium ниже референса.',
      explainHigh: 'Соотношение Bacteroides/Faecalibacterium выше референса. Иногда это трактуют как менее благоприятный баланс в сторону воспалительного фона.'
    },
    {
      key: 'parvimonas',
      label: 'Parvimonas micra',
      aliases: ['Parvimonas micra'],
      explainNormal: 'Parvimonas micra не обнаружена.',
      explainLow: 'Parvimonas micra не обнаружена.',
      explainHigh: 'Parvimonas micra обнаружена. Такой результат лучше отдельно обсудить с врачом.'
    },
    {
      key: 'fusobacterium',
      label: 'Fusobacterium nucleatum',
      aliases: ['Fusobacterium nucleatum'],
      explainNormal: 'Fusobacterium nucleatum не обнаружена.',
      explainLow: 'Fusobacterium nucleatum не обнаружена.',
      explainHigh: 'Fusobacterium nucleatum обнаружена. Такой результат требует обсуждения с врачом.'
    },
    {
      key: 'candida',
      label: 'Candida spp.',
      aliases: ['Candida spp.', 'Candida spp'],
      explainNormal: 'Candida spp. в допустимом диапазоне или не определяется.',
      explainLow: 'Candida spp. не определяется или в низком количестве.',
      explainHigh: 'Candida spp. выше допустимого уровня. Это может соответствовать грибковому сдвигу микробиоты.'
    },
    {
      key: 'klebsiella',
      label: 'Klebsiella pneumoniae / oxytoca',
      aliases: ['Klebsiella pneumoniae / oxytoca', 'Klebsiella pneumoniae/oxytoca'],
      explainNormal: 'Klebsiella в допустимом диапазоне или не определяется.',
      explainLow: 'Klebsiella не определяется или в низком количестве.',
      explainHigh: 'Klebsiella выше допустимого уровня. Это нужно оценивать с врачом, особенно при жалобах.'
    },
    {
      key: 'c_difficile',
      label: 'Clostridium difficile',
      aliases: ['Clostridium difficile'],
      explainNormal: 'Clostridium difficile не обнаружена.',
      explainLow: 'Clostridium difficile не обнаружена.',
      explainHigh: 'Clostridium difficile обнаружена. Это повод не откладывать консультацию врача.'
    },
    {
      key: 'salmonella',
      label: 'Salmonella spp.',
      aliases: ['Salmonella spp.', 'Salmonella spp'],
      explainNormal: 'Salmonella spp. не обнаружена.',
      explainLow: 'Salmonella spp. не обнаружена.',
      explainHigh: 'Salmonella spp. обнаружена. Это требует обязательной консультации врача.'
    },
    {
      key: 'shigella',
      label: 'Shigella spp.',
      aliases: ['Shigella spp.', 'Shigella spp'],
      explainNormal: 'Shigella spp. не обнаружена.',
      explainLow: 'Shigella spp. не обнаружена.',
      explainHigh: 'Shigella spp. обнаружена. Это требует обязательной консультации врача.'
    }
  ];

  const CRITICAL_KEYS = new Set(['parvimonas', 'fusobacterium', 'c_difficile', 'salmonella', 'shigella']);

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function cleanupDisplayText(value) {
    return String(value || '')
      .replace(/\r/g, '\n')
      .replace(/^\s{0,3}#{1,6}\s*/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^\s*[-*_]{3,}\s*$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function renderInlineText(value) {
    return escapeHtml(value).replace(/\n/g, '<br>');
  }

  function getBotSectionTheme(title) {
    const normalized = String(title || '').toLowerCase();
    if (normalized.includes('краткий итог')) return { cls: 'section-summary', icon: '◎' };
    if (normalized.includes('в норме')) return { cls: 'section-normal', icon: '✓' };
    if (normalized.includes('обратить внимание')) return { cls: 'section-warning', icon: '!' };
    if (normalized.includes('может значить')) return { cls: 'section-meaning', icon: '?' };
    if (normalized.includes('можно сделать')) return { cls: 'section-action', icon: '→' };
    if (normalized.includes('lactomi')) return { cls: 'section-question', icon: '↺' };
    if (normalized.includes('важно')) return { cls: 'section-important', icon: 'i' };
    return { cls: 'section-neutral', icon: '•' };
  }

  function renderBotBlock(block) {
    const lines = block.split(/\n+/).map(function (line) { return line.trim(); }).filter(Boolean);
    if (!lines.length) return '';

    let title = '';
    if (lines.length > 1 && /^[^:]{1,90}:$/.test(lines[0])) {
      title = lines.shift().replace(/:$/, '');
    } else if (lines.length > 1 && lines[0].length <= 90 && !/^[-•]/.test(lines[0])) {
      title = lines.shift();
    }

    const theme = getBotSectionTheme(title);
    let html = '<section class="bot-section ' + theme.cls + '">';
    if (title) {
      html += '<div class="bot-section-head">';
      html += '<span class="bot-section-icon">' + escapeHtml(theme.icon) + '</span>';
      html += '<h4>' + escapeHtml(title) + '</h4>';
      html += '</div>';
    }

    let listItems = [];
    function flushList() {
      if (!listItems.length) return;
      html += '<ul>' + listItems.map(function (item) {
        return '<li>' + renderInlineText(item) + '</li>';
      }).join('') + '</ul>';
      listItems = [];
    }

    lines.forEach(function (line) {
      if (/^[-•]\s+/.test(line)) {
        listItems.push(line.replace(/^[-•]\s+/, ''));
        return;
      }
      flushList();
      html += '<p>' + renderInlineText(line) + '</p>';
    });

    flushList();
    html += '</section>';
    return html;
  }

  function renderBotMessage(text) {
    const normalized = cleanupDisplayText(text);
    if (!normalized) return '<div class="bot-answer-empty">Пустой ответ.</div>';
    const blocks = normalized.split(/\n{2,}/).map(function (block) { return block.trim(); }).filter(Boolean);
    const html = blocks.map(renderBotBlock).join('');
    return [
      '<div class="bot-card">',
      '  <div class="bot-card-top">',
      '    <div class="bot-avatar">AI</div>',
      '    <div class="bot-card-meta">',
      '      <strong>' + escapeHtml(brandName) + ' AI</strong>',
      '      <span>Понятная расшифровка анализа</span>',
      '    </div>',
      '  </div>',
      '  <div class="bot-answer">' + html + '</div>',
      '</div>'
    ].join('');
  }

  function addMessage(type, text) {
    const div = document.createElement('div');
    div.className = 'message ' + (type === 'user' ? 'message-user' : 'message-bot');
    if (type === 'bot') {
      div.innerHTML = renderBotMessage(text);
    } else {
      div.innerHTML = '<div class="user-bubble">' + renderInlineText(text) + '</div>';
    }
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

  function setChatComposerEnabled(enabled, helpText) {
    if (!chatFollowupForm || !chatFollowupInput || !chatSendBtn) return;
    chatFollowupForm.classList.toggle('is-disabled', !enabled);
    chatFollowupInput.disabled = !enabled;
    chatSendBtn.disabled = !enabled;
    if (chatResetBtn) chatResetBtn.disabled = !enabled;
    if (chatFollowupHelp && helpText) chatFollowupHelp.textContent = helpText;
  }

  function addSystemMessage(text) {
    if (!text) return;
    const div = document.createElement('div');
    div.className = 'message message-system';
    div.textContent = text;
    chatOutput.appendChild(div);
    chatOutput.scrollTop = chatOutput.scrollHeight;
  }

  function resetFollowupChatState(helpText) {
    chatSessionToken = '';
    chatAnalysisContext = '';
    chatHistory = [];
    if (chatFollowupInput) chatFollowupInput.value = '';
    setChatComposerEnabled(false, helpText || 'Сначала загрузите анализ и получите первую расшифровку — после этого чат станет активным.');
  }

  function rememberChatMessage(role, content) {
    const clean = cleanupDisplayText(content).slice(0, 2500);
    if (!clean) return;
    chatHistory.push({ role: role, content: clean });
    if (chatHistory.length > 10) chatHistory = chatHistory.slice(-10);
  }

  function buildAnalysisContext(payload) {
    const parts = [];
    if (payload.file_name) parts.push('Файл: ' + payload.file_name);
    if (payload.source) parts.push('Источник распознавания: ' + payload.source);
    if (typeof payload.extracted_markers === 'number') parts.push('Найдено показателей: ' + payload.extracted_markers);
    if (payload.answer) parts.push('Первая расшифровка:\n' + cleanupDisplayText(payload.answer));
    return parts.join('\n\n').slice(0, 7000);
  }

  async function sendFollowupQuestion(question) {
    if (!chatSessionToken || !chatAnalysisContext) {
      throw new Error('Сначала загрузите анализ и получите первую расшифровку.');
    }

    const formData = new FormData();
    formData.append('mode', 'chat');
    formData.append('chat_session', chatSessionToken);
    formData.append('chat_context', chatAnalysisContext);
    formData.append('chat_history', JSON.stringify(chatHistory.slice(-8)));
    formData.append('message', question);
    formData.append('website', websiteField ? websiteField.value : '');

    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin'
    });

    const payload = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      throw new Error(payload.error || payload.details || 'Не удалось отправить сообщение.');
    }
    if (!payload.answer) throw new Error('Сервер не вернул текст ответа.');
    if (payload.chat_session) chatSessionToken = payload.chat_session;
    return payload.answer;
  }

  function formatFileSize(bytes) {
    const size = Number(bytes) || 0;
    if (size >= 1048576) return (size / 1048576).toFixed(size >= 10485760 ? 0 : 1) + ' МБ';
    if (size >= 1024) return Math.round(size / 1024) + ' КБ';
    return size + ' Б';
  }


  function clampChannel(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
  }

  function loadImageFromFile(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () {
        return null;
      }).then(function (bitmap) {
        if (bitmap) return bitmap;
        return loadImageElementFromFile(file);
      });
    }
    return loadImageElementFromFile(file);
  }

  function loadImageElementFromFile(file) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = function () {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Не удалось открыть изображение для улучшения.'));
      };
      image.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob);
        else reject(new Error('Не удалось подготовить улучшенное фото.'));
      }, type, quality);
    });
  }

  async function enhanceImageForOcr(file) {
    const image = await loadImageFromFile(file);
    const sourceWidth = image.width || image.naturalWidth || 0;
    const sourceHeight = image.height || image.naturalHeight || 0;
    if (!sourceWidth || !sourceHeight) throw new Error('Не удалось определить размер изображения.');

    const maxSide = 2300;
    const minLongSide = 1600;
    let scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
    if (Math.max(sourceWidth, sourceHeight) < minLongSide) {
      scale = Math.min(maxSide / Math.max(sourceWidth, sourceHeight), minLongSide / Math.max(sourceWidth, sourceHeight));
    }

    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Браузер не смог подготовить фото к OCR.');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // First pass: estimate light background and contrast.
    let minLum = 255;
    let maxLum = 0;
    let sumLum = 0;
    const sampleStep = Math.max(4, Math.floor(data.length / 4 / 90000));
    let sampleCount = 0;
    for (let i = 0; i < data.length; i += 4 * sampleStep) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      minLum = Math.min(minLum, lum);
      maxLum = Math.max(maxLum, lum);
      sumLum += lum;
      sampleCount += 1;
    }
    const avgLum = sampleCount ? sumLum / sampleCount : 180;
    const contrast = avgLum < 150 ? 1.45 : 1.32;
    const brightness = avgLum < 150 ? 22 : 10;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      let lum = 0.299 * r + 0.587 * g + 0.114 * b;
      // Flatten colored screen glare a bit and make text edges stronger.
      lum = ((lum - 128) * contrast) + 128 + brightness;
      if (maxLum - minLum < 90) {
        lum = ((lum - avgLum) * 1.55) + avgLum + 12;
      }
      const value = clampChannel(lum);
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    }

    ctx.putImageData(imageData, 0, 0);

    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
    const originalName = String(file.name || 'analysis-photo.jpg').replace(/\.[^.]+$/, '');
    return new File([blob], originalName + '-ocr.jpg', { type: 'image/jpeg' });
  }

  function rememberSelectedFile(input) {
    const file = input && input.files && input.files[0];
    if (!file) return;

    selectedAnalysisFile = file;

    [pdfInput, galleryInput, cameraInput].forEach(function (otherInput) {
      if (otherInput && otherInput !== input) otherInput.value = '';
    });

    if (selectedFileName) {
      selectedFileName.textContent = file.name + ' · ' + formatFileSize(file.size);
    }

    setStatus('Файл выбран', '');
  }

  [pdfInput, galleryInput, cameraInput].forEach(function (input) {
    if (!input) return;
    input.addEventListener('change', function () { rememberSelectedFile(input); });
  });

  function flexSpaces(text) {
    return String(text)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s+/g, '\\s+');
  }

  function parseMaybeNumber(value) {
    if (value === null || value === undefined) return null;
    const cleaned = String(value).replace(',', '.').match(/[<>]?[0-9]+(?:\.[0-9]+)?/);
    if (!cleaned) return null;
    const numeric = parseFloat(String(cleaned[0]).replace(/[<>]/g, ''));
    return Number.isFinite(numeric) ? numeric : null;
  }

  function normalizeValueText(value) {
    return String(value || '')
      .replace(/,/g, '.')
      .replace(/\s+/g, ' ')
      .replace(/не\s*обнар\.?($|\s)/gi, 'не обнаружено$1')
      .trim();
  }

  function normalizeTextForParsing(text) {
    return String(text || '')
      .replace(/\r/g, '\n')
      .replace(/\u00A0/g, ' ')
      .replace(/[|]+/g, ' ')
      .replace(/[\t]+/g, ' ')
      .replace(/ {2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function stripSensitiveLines(text) {
    return String(text || '')
      .split(/\n+/)
      .filter(function (line) {
        const value = String(line || '').trim();
        if (!value) return false;
        return !/^(ФИО|ИНЗ:?|Пол:?|Возраст:?|Дата взятия образца:?|Дата поступления образца:?|Дата печати результата:?|Врач:?|М\.П\.?|Подпись врача|Дата печати результата)/i.test(value);
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function parseRange(refText) {
    const text = normalizeValueText(refText).toLowerCase();
    if (!text) return { type: 'unknown' };
    if (text.includes('допустимо любое количество')) return { type: 'any' };
    if (text.includes('не обнаружено')) return { type: 'not_detected' };

    const rangeMatch = text.match(/([<>]?\d+(?:[.,]\d+)?)\s*-\s*([<>]?\d+(?:[.,]\d+)?)/);
    if (rangeMatch) {
      const min = parseMaybeNumber(rangeMatch[1]);
      const max = parseMaybeNumber(rangeMatch[2]);
      if (min !== null && max !== null) return { type: 'range', min: min, max: max };
    }

    const ltMatch = text.match(/(?:до|<|<=|≤)\s*([0-9]+(?:[.,][0-9]+)?)/);
    if (ltMatch) {
      const max = parseMaybeNumber(ltMatch[1]);
      if (max !== null) return { type: 'max', max: max };
    }

    const gtMatch = text.match(/(?:от|>|>=|≥)\s*([0-9]+(?:[.,][0-9]+)?)/);
    if (gtMatch) {
      const min = parseMaybeNumber(gtMatch[1]);
      if (min !== null) return { type: 'min', min: min };
    }

    return { type: 'text', text: refText };
  }

  function compareValueToReference(resultText, refText, markerKey) {
    const cleanResult = normalizeValueText(resultText);
    const resultLower = cleanResult.toLowerCase();
    const numeric = parseMaybeNumber(cleanResult);
    const ref = parseRange(refText);

    if (ref.type === 'any') return { status: 'normal', numeric: numeric, note: 'any' };

    if (ref.type === 'not_detected') {
      if (resultLower.includes('не обнаружено') || resultLower === '0') return { status: 'normal', numeric: numeric };
      return { status: 'detected', numeric: numeric };
    }

    if (numeric === null) {
      if (resultLower.includes('не обнаружено') || resultLower.includes('отсутствует')) {
        if (markerKey === 'akkermansia' || markerKey === 'b_theta') return { status: 'borderline_low', numeric: null };
        return { status: 'normal', numeric: null };
      }
      return { status: 'unknown', numeric: null };
    }

    if (ref.type === 'range') {
      if (numeric < ref.min) return { status: 'low', numeric: numeric };
      if (numeric > ref.max) return { status: 'high', numeric: numeric };
      return { status: 'normal', numeric: numeric };
    }

    if (ref.type === 'max') return numeric > ref.max ? { status: 'high', numeric: numeric } : { status: 'normal', numeric: numeric };
    if (ref.type === 'min') return numeric < ref.min ? { status: 'low', numeric: numeric } : { status: 'normal', numeric: numeric };
    return { status: 'unknown', numeric: numeric };
  }

  function extractMarker(text, marker) {
    for (const alias of marker.aliases) {
      const aliasPattern = flexSpaces(alias);
      const regex = new RegExp(
        aliasPattern +
        '\\s+((?:не\\s*обнаружено|не\\s*обнар\\.?|отсутствует|[<>]?[0-9]+(?:[.,][0-9]+)?))' +
        '(?:\\s*(?:lg|Ig)\\s*копий\\/мл)?' +
        '[\\s:;,-]*' +
        '((?:допустимо\\s+любое\\s+количество|не\\s*обнаружено|[<>]?[0-9]+(?:[.,][0-9]+)?\\s*-\\s*[<>]?[0-9]+(?:[.,][0-9]+)?|(?:до|<|<=|≤)\\s*[0-9]+(?:[.,][0-9]+)?|(?:от|>|>=|≥)\\s*[0-9]+(?:[.,][0-9]+)?))',
        'i'
      );

      const match = text.match(regex);
      if (match) {
        return {
          key: marker.key,
          label: marker.label,
          result: normalizeValueText(match[1]),
          reference: normalizeValueText(match[2])
        };
      }
    }
    return null;
  }

  function extractMarkers(text) {
    const items = [];
    for (const marker of MARKERS) {
      const found = extractMarker(text, marker);
      if (found) items.push(found);
    }
    return items;
  }

  function attachStatuses(items) {
    return items.map(function (item) {
      const meta = MARKERS.find(function (m) { return m.key === item.key; });
      const comparison = compareValueToReference(item.result, item.reference, item.key);
      return Object.assign({}, item, comparison, { meta: meta });
    });
  }

  function formatItem(item) {
    return item.label + ': ' + item.result + ' (референс: ' + item.reference + ')';
  }

  function uniqueStrings(items) {
    return Array.from(new Set(items.filter(Boolean)));
  }

  function renderRuleBasedAnswer(parsed, message, productName) {
    const foundCore = parsed.filter(function (item) {
      return ['total_mass', 'lactobacillus', 'bifidobacterium', 'e_coli', 'bacteroides', 'faecali', 'ratio_bact_faec'].indexOf(item.key) >= 0;
    });
    const abnormal = parsed.filter(function (item) {
      return ['low', 'high', 'detected', 'borderline_low'].indexOf(item.status) >= 0;
    });
    const critical = abnormal.filter(function (item) { return CRITICAL_KEYS.has(item.key); });
    const normalImportant = parsed.filter(function (item) {
      return item.status === 'normal' && ['total_mass', 'lactobacillus', 'bifidobacterium', 'e_coli', 'bacteroides', 'faecali', 'akkermansia', 'ratio_bact_faec'].indexOf(item.key) >= 0;
    });

    const parts = [];

    if (abnormal.length === 0 && foundCore.length >= 4) {
      parts.push('Краткий итог:\nПо этому анализу явных выраженных отклонений не видно. Основные показатели выглядят спокойно и укладываются в референсы лаборатории.');
    } else if (critical.length > 0) {
      parts.push('Краткий итог:\nВ анализе есть показатели, которые стоит обсудить с врачом очно. Это не диагноз, но здесь лучше не ограничиваться только онлайн-расшифровкой.');
    } else if (abnormal.length > 0) {
      parts.push('Краткий итог:\nЕсть несколько отклонений от референса. Они не равны диагнозу, но могут объяснять жалобы и заслуживают спокойного разбора вместе с врачом.');
    } else {
      parts.push('Краткий итог:\nИз документа удалось извлечь только часть показателей. Ниже — то, что получилось прочитать достаточно надёжно.');
    }

    if (normalImportant.length > 0) {
      parts.push('Что в норме:\n' + normalImportant.slice(0, 8).map(function (item) {
        return '- ' + formatItem(item);
      }).join('\n'));
    }

    if (abnormal.length > 0) {
      parts.push('На что обратить внимание:\n' + abnormal.map(function (item) {
        return '- ' + formatItem(item);
      }).join('\n'));

      const explainLines = uniqueStrings(abnormal.map(function (item) {
        if (!item.meta) return '';
        if (item.status === 'low' || item.status === 'borderline_low') return item.meta.explainLow;
        if (item.status === 'high' || item.status === 'detected') return item.meta.explainHigh;
        return '';
      }));

      if (explainLines.length > 0) {
        parts.push('Что это может значить простыми словами:\n' + explainLines.map(function (line) {
          return '- ' + line;
        }).join('\n'));
      }
    } else if (foundCore.length >= 4) {
      const calmComments = uniqueStrings(normalImportant.slice(0, 5).map(function (item) {
        return item.meta && item.meta.explainNormal;
      }));
      if (calmComments.length > 0) {
        parts.push('Что это может значить простыми словами:\n' + calmComments.map(function (line) {
          return '- ' + line;
        }).join('\n'));
      }
    }

    const advice = [];
    if (critical.length > 0) {
      advice.push('Показать результат гастроэнтерологу и не откладывать очную консультацию, особенно если есть боль, температура, кровь в стуле или выраженное ухудшение самочувствия.');
    }
    if (abnormal.some(function (item) { return ['lactobacillus', 'bifidobacterium'].indexOf(item.key) >= 0; })) {
      advice.push('Посмотреть на рацион: достаточно ли клетчатки, кисломолочных продуктов, регулярного питания и не было ли недавнего курса антибиотиков.');
    }
    if (abnormal.some(function (item) { return ['faecali', 'akkermansia', 'ratio_bact_faec', 'b_theta'].indexOf(item.key) >= 0; })) {
      advice.push('Обсудить с врачом мягкую поддержку микробиоты и слизистого барьера: питание, клетчатку, переносимость пребиотиков и общую тактику восстановления.');
    }
    if (abnormal.some(function (item) { return ['e_coli', 'enterococcus', 'candida', 'klebsiella'].indexOf(item.key) >= 0; })) {
      advice.push('Если есть вздутие, нестабильный стул или брожение, обсуждать бланк лучше вместе с симптомами — без этого один анализ не даёт полного вывода.');
    }
    if (advice.length === 0) {
      advice.push('Если жалоб нет, такой бланк обычно обсуждают спокойно и без спешки. Если жалобы есть, имеет смысл показать результат гастроэнтерологу вместе с симптомами, питанием и анамнезом.');
    }
    parts.push('Что можно обсудить с врачом / общие шаги:\n' + advice.map(function (line) {
      return '- ' + line;
    }).join('\n'));

    if (abnormal.some(function (item) { return item.key === 'lactobacillus'; })) {
      parts.push('Где может быть уместна мягкая поддержка LactoMi:\nЕсли задача — мягко поддержать лактобактерии после стресса, погрешностей в питании или перенесённой терапии, продукты ' + productName + ' можно рассматривать только как поддержку, а не как лечение.');
    } else if (abnormal.length === 0 && foundCore.length >= 4) {
      parts.push('Где может быть уместна мягкая поддержка LactoMi:\nПо этому бланку нет явного повода делать упор именно на коррекцию лактобактерий. Если жалобы есть, решение лучше принимать не по одному показателю, а по общей картине.');
    }

    if (message) {
      if (abnormal.length === 0 && /проблем|опас|плохо|серьез|страш/i.test(message)) {
        parts.push('Ответ на ваш дополнительный вопрос:\nПо этому бланку выраженных проблем не видно. Если есть симптомы, ориентироваться стоит не только на анализ, но и на самочувствие.');
      } else if (abnormal.length > 0 && /проблем|опас|плохо|серьез|страш/i.test(message)) {
        parts.push('Ответ на ваш дополнительный вопрос:\nДа, в бланке есть моменты, на которые стоит обратить внимание, но по одному анализу нельзя ставить диагноз. Важны жалобы и очная оценка врача.');
      }
    }

    parts.push('Важно: расшифровка носит образовательный характер. Результаты анализа не являются диагнозом, для медицинских решений нужна консультация врача.');

    return parts.join('\n\n');
  }


  function setTurnstileHelp(text, kind) {
    if (!turnstileHelp) return;
    turnstileHelp.textContent = text;
    turnstileHelp.classList.remove('is-error', 'is-ok');
    if (kind === 'error') turnstileHelp.classList.add('is-error');
    if (kind === 'ok') turnstileHelp.classList.add('is-ok');
  }

  function loadTurnstileScript() {
    if (window.turnstile && typeof window.turnstile.render === 'function') {
      return Promise.resolve(window.turnstile);
    }
    if (turnstileScriptPromise) return turnstileScriptPromise;

    turnstileScriptPromise = new Promise(function (resolve, reject) {
      const existing = document.querySelector('script[data-turnstile-script="1"]');
      if (existing) {
        existing.addEventListener('load', function () { resolve(window.turnstile); }, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.turnstileScript = '1';
      script.onload = function () { resolve(window.turnstile); };
      script.onerror = reject;
      document.head.appendChild(script);
    });

    return turnstileScriptPromise;
  }

  function resetTurnstileWidget() {
    turnstileToken = '';
    if (window.turnstile && turnstileWidgetId !== null) {
      try {
        window.turnstile.reset(turnstileWidgetId);
      } catch (_) {
        // ignore reset errors
      }
    }
    setTurnstileHelp('Подтвердите, что вы не робот, чтобы отправить анализ на разбор.', '');
  }

  async function initTurnstile() {
    if (!turnstileWrap || !turnstileWidgetEl) return;

    if (!turnstileSiteKey) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Нужна настройка капчи';
      setTurnstileHelp('Капча не настроена: добавьте публичный ключ Turnstile в assets/config.js.', 'error');
      return;
    }

    try {
      const turnstile = await loadTurnstileScript();
      if (!turnstile || typeof turnstile.render !== 'function') {
        throw new Error('turnstile_unavailable');
      }

      turnstileWidgetId = turnstile.render(turnstileWidgetEl, {
        sitekey: turnstileSiteKey,
        theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
        callback: function (token) {
          turnstileToken = token || '';
          setTurnstileHelp('Проверка пройдена. Можно отправлять анализ.', 'ok');
        },
        'expired-callback': function () {
          turnstileToken = '';
          setTurnstileHelp('Проверка истекла. Подтвердите капчу ещё раз.', 'error');
        },
        'error-callback': function () {
          turnstileToken = '';
          setTurnstileHelp('Не удалось загрузить проверку. Обновите страницу и попробуйте снова.', 'error');
        }
      });
    } catch (_) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Ошибка капчи';
      setTurnstileHelp('Не удалось загрузить проверку безопасности. Обновите страницу и попробуйте снова.', 'error');
    }
  }


  window.addEventListener('lactomi-theme-change', function () {
    if (!turnstileWidgetEl || !window.turnstile || turnstileWidgetId === null) return;
    try {
      turnstileWidgetEl.innerHTML = '';
      turnstileWidgetId = null;
      turnstileToken = '';
      initTurnstile();
    } catch (_) {
      // If Turnstile refuses to re-render, the next page refresh will pick up the theme.
    }
  });

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function loadPdfJs() {
    if (window.pdfjsLib) return window.pdfjsLib;
    if (pdfJsPromise) return pdfJsPromise;

    pdfJsPromise = loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js')
      .then(function () {
        if (!window.pdfjsLib) throw new Error('PDF.js не загрузился');
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        return window.pdfjsLib;
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
          y: Array.isArray(item.transform) ? Number(item.transform[5] || 0) : 0
        };
      })
      .sort(function (a, b) {
        if (Math.abs(a.y - b.y) > 3) return b.y - a.y;
        return a.x - b.x;
      });

    const rows = [];
    for (const item of prepared) {
      let row = null;
      for (let i = rows.length - 1; i >= 0; i -= 1) {
        if (Math.abs(rows[i].y - item.y) <= 3) {
          row = rows[i];
          break;
        }
      }
      if (!row) {
        row = { y: item.y, items: [] };
        rows.push(row);
      }
      row.items.push(item);
    }

    return rows
      .sort(function (a, b) { return b.y - a.y; })
      .map(function (row) {
        return row.items
          .sort(function (a, b) { return a.x - b.x; })
          .map(function (item) { return item.str.trim(); })
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      })
      .filter(Boolean);
  }

  async function extractTextFromPdf(file) {
    const pdfjsLib = await loadPdfJs();
    const data = new Uint8Array(await file.arrayBuffer());
    const task = pdfjsLib.getDocument({ data: data, useSystemFonts: true, isEvalSupported: false });
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

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const pdf = selectedAnalysisFile || (pdfInput.files && pdfInput.files[0]) || (galleryInput && galleryInput.files && galleryInput.files[0]) || (cameraInput && cameraInput.files && cameraInput.files[0]);
    const message = (messageInput.value || '').trim();

    if (!pdf) {
      setStatus('Загрузите PDF или фото', 'error');
      return;
    }

    if (websiteField && websiteField.value) {
      setStatus('Запрос отклонён', 'error');
      return;
    }

    if (consentField && !consentField.checked) {
      setStatus('Подтвердите дисклеймер', 'error');
      return;
    }

    if (privacyField && !privacyField.checked) {
      setStatus('Подтвердите пункт о личных данных', 'error');
      return;
    }

    if (!turnstileSiteKey) {
      setStatus('Капча не настроена', 'error');
      setTurnstileHelp('Капча не настроена: добавьте публичный ключ Turnstile в assets/config.js.', 'error');
      return;
    }

    if (!turnstileToken) {
      setStatus('Подтвердите проверку', 'error');
      setTurnstileHelp('Подтвердите, что вы не робот, и отправьте форму ещё раз.', 'error');
      return;
    }

    clearMessages();
    resetFollowupChatState('Обрабатываем новый анализ. Чат станет доступен после первой расшифровки.');
    addMessage('user', 'Файл: ' + pdf.name + (message ? '\n\nВопрос: ' + message : ''));
    setStatus('Готовим файл…', 'loading');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Обрабатываем…';

    try {
      const fileNameLower = String(pdf.name || '').toLowerCase();
      const isPdfFile = pdf.type === 'application/pdf' || fileNameLower.endsWith('.pdf');
      const isImageFile = /^image\/(jpeg|png|webp)$/.test(pdf.type || '') || /\.(jpe?g|png|webp)$/.test(fileNameLower);

      if (!isPdfFile && !isImageFile) {
        throw new Error('Поддерживаются только PDF, JPG, PNG и WEBP.');
      }

      let rawText = '';
      let browserExtractError = '';
      let enhancedImageFile = null;
      if (isPdfFile) {
        try {
          setStatus('Читаем текст из PDF…', 'loading');
          rawText = await extractTextFromPdf(pdf);
        } catch (pdfError) {
          rawText = '';
          browserExtractError = pdfError && pdfError.message ? String(pdfError.message) : 'browser_pdf_extract_failed';
        }
      } else {
        setStatus('Готовим фото к распознаванию…', 'loading');
        browserExtractError = 'image_uploaded_no_browser_pdf_extract';
        if (!photoEnhanceField || photoEnhanceField.checked) {
          try {
            enhancedImageFile = await enhanceImageForOcr(pdf);
          } catch (enhanceError) {
            browserExtractError += '; image_enhance_failed: ' + (enhanceError && enhanceError.message ? enhanceError.message : 'unknown');
          }
        }
      }

      const formData = new FormData();
      formData.append('analysis_pdf', pdf, pdf.name);
      if (enhancedImageFile) {
        formData.append('analysis_enhanced_image', enhancedImageFile, enhancedImageFile.name);
      }
      formData.append('analysis_pdf_name', pdf.name || (isImageFile ? 'analysis-image.jpg' : 'analysis.pdf'));
      formData.append('analysis_file_type', isImageFile ? 'image' : 'pdf');
      formData.append('analysis_text', rawText || '');
      formData.append('message', message);
      formData.append('website', websiteField ? websiteField.value : '');
      formData.append('consent', consentField && consentField.checked ? '1' : '0');
      formData.append('privacy_confirm', privacyField && privacyField.checked ? '1' : '0');
      formData.append('browser_extract_error', browserExtractError);
      formData.append('cf-turnstile-response', turnstileToken);

      setStatus('Отправляем на сервер…', 'loading');
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
      });

      const payload = await response.json().catch(function () { return {}; });

      if (!response.ok) {
        const message = payload.error || payload.details || 'Не удалось обработать файл.';
        const hint = payload.hint ? '\n\n' + payload.hint : '';
        throw new Error(message + hint);
      }

      if (!payload.answer) {
        throw new Error('Сервер не вернул текст ответа.');
      }

      addMessage('bot', payload.answer);
      chatSessionToken = payload.chat_session || '';
      chatAnalysisContext = buildAnalysisContext(payload);
      chatHistory = [];
      rememberChatMessage('assistant', payload.answer);
      if (chatSessionToken && chatAnalysisContext && payload.chat_available !== false) {
        setChatComposerEnabled(true, 'Теперь можно продолжать диалог: задайте уточняющий вопрос по этому анализу.');
      } else {
        setChatComposerEnabled(false, 'Расшифровка готова, но продолжение чата недоступно: AI-модель для диалога не подключена.');
      }
      setStatus('Готово', 'ok');

    } catch (error) {
      addMessage('bot', 'Ошибка: ' + (error && error.message ? error.message : 'Не удалось обработать файл.') + '\n\nПопробуйте обновить страницу, загрузить более чёткий PDF/фото или повторить запрос чуть позже.');
      setStatus('Ошибка', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Расшифровать анализ';
      resetTurnstileWidget();
    }
  });

  if (chatFollowupForm && chatFollowupInput) {
    chatFollowupForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      const question = (chatFollowupInput.value || '').trim();
      if (!question) return;

      if (websiteField && websiteField.value) {
        setStatus('Запрос отклонён', 'error');
        return;
      }

      chatFollowupInput.value = '';
      addMessage('user', question);
      rememberChatMessage('user', question);
      setStatus('Пишем ответ…', 'loading');
      setChatComposerEnabled(false, 'Бот отвечает. Подождите несколько секунд.');

      try {
        const answer = await sendFollowupQuestion(question);
        addMessage('bot', answer);
        rememberChatMessage('assistant', answer);
        setStatus('Чат активен', 'ok');
        setChatComposerEnabled(true, 'Можно задать следующий вопрос по этому анализу.');
        chatFollowupInput.focus();
      } catch (error) {
        addMessage('bot', 'Не удалось продолжить чат: ' + (error && error.message ? error.message : 'попробуйте ещё раз.') + '\n\nЕсли сессия истекла, загрузите анализ заново и получите новую расшифровку.');
        setStatus('Ошибка чата', 'error');
        if (chatSessionToken && chatAnalysisContext) {
          setChatComposerEnabled(true, 'Можно попробовать отправить вопрос ещё раз.');
        } else {
          resetFollowupChatState('Сессия чата недоступна. Загрузите анализ заново.');
        }
      }
    });
  }

  if (chatResetBtn) {
    chatResetBtn.addEventListener('click', function () {
      resetFollowupChatState('Чат очищен. Чтобы продолжить, загрузите анализ заново.');
      clearMessages();
      addSystemMessage('Чат очищен. Загрузите анализ заново, чтобы начать новую расшифровку.');
      setStatus('Ожидание файла', '');
    });
  }

  resetFollowupChatState();
  initTurnstile();
})();

(function () {
  const form = document.getElementById('analysisForm');
  const pdfInput = document.getElementById('analysisPdf');
  const messageInput = document.getElementById('analysisMessage');
  const chatOutput = document.getElementById('chatOutput');
  const statusBadge = document.getElementById('statusBadge');
  const submitBtn = document.getElementById('submitBtn');
  const websiteField = document.getElementById('websiteField');
  const consentField = document.getElementById('analysisConsent');
  const privacyField = document.getElementById('analysisPrivacy');

  if (!form || !pdfInput || !chatOutput || !statusBadge || !submitBtn) {
    return;
  }

  let pdfJsPromise = null;


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

  function renderBotBlock(block) {
    const lines = block.split(/\n+/).map(function (line) { return line.trim(); }).filter(Boolean);
    if (!lines.length) return '';

    let title = '';
    if (lines.length > 1 && /^[^:]{1,80}:$/.test(lines[0])) {
      title = lines.shift().replace(/:$/, '');
    } else if (lines.length > 1 && lines[0].length <= 80 && !/^[-•]/.test(lines[0])) {
      title = lines.shift();
    }

    let html = '<section class="bot-section">';
    if (title) html += '<h4>' + escapeHtml(title) + '</h4>';

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
    return '<div class="bot-answer">' + html + '</div>';
  }

  function addMessage(type, text) {
    const div = document.createElement('div');
    div.className = 'message ' + (type === 'user' ? 'message-user' : 'message-bot');
    if (type === 'bot') {
      div.innerHTML = renderBotMessage(text);
    } else {
      div.innerHTML = renderInlineText(text);
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

    const pdf = pdfInput.files && pdfInput.files[0];
    const message = (messageInput.value || '').trim();

    if (!pdf) {
      setStatus('Загрузите PDF', 'error');
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

    clearMessages();
    addMessage('user', 'Файл: ' + pdf.name + (message ? '\n\nВопрос: ' + message : ''));
    setStatus('Готовим файл…', 'loading');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Обрабатываем…';

    try {
      let rawText = '';
      let browserExtractError = '';
      try {
        setStatus('Читаем текст из PDF…', 'loading');
        rawText = await extractTextFromPdf(pdf);
      } catch (pdfError) {
        rawText = '';
        browserExtractError = pdfError && pdfError.message ? String(pdfError.message) : 'browser_pdf_extract_failed';
      }

      const formData = new FormData();
      formData.append('analysis_pdf', pdf, pdf.name);
      formData.append('analysis_pdf_name', pdf.name || 'analysis.pdf');
      formData.append('analysis_text', rawText || '');
      formData.append('message', message);
      formData.append('website', websiteField ? websiteField.value : '');
      formData.append('consent', consentField && consentField.checked ? '1' : '0');
      formData.append('privacy_confirm', privacyField && privacyField.checked ? '1' : '0');
      formData.append('browser_extract_error', browserExtractError);

      setStatus('Отправляем на сервер…', 'loading');
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
      });

      const payload = await response.json().catch(function () { return {}; });

      if (!response.ok) {
        const debug = [];
        if (typeof payload.extracted_markers === 'number') debug.push('markers=' + payload.extracted_markers);
        if (payload.source) debug.push('source=' + payload.source);
        if (payload.browser_extract_error) debug.push('browser=' + payload.browser_extract_error);
        if (payload.ai_available === false) debug.push('AI=off');
        if (payload.tomarkdown_available === false) debug.push('toMarkdown=off');
        const suffix = debug.length ? '\n\nТех. детали: ' + debug.join(', ') : '';
        throw new Error((payload.error || payload.details || 'Не удалось обработать PDF.') + suffix);
      }

      if (!payload.answer) {
        throw new Error('Сервер не вернул текст ответа.');
      }

      addMessage('bot', payload.answer);
      setStatus('Готово', 'ok');

    } catch (error) {
      addMessage('bot', 'Ошибка: ' + (error && error.message ? error.message : 'Не удалось обработать PDF.') + '\n\nПроверьте, что на Cloudflare Pages задан binding AI и функция доступна по адресу /api/analyze.');
      setStatus('Ошибка', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Расшифровать анализ';
    }
  });
})();

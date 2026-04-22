function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

async function validateTurnstile(token, secret, remoteip) {
  if (!secret) return { success: true, skipped: true };
  if (!token) return { success: false, error: 'Turnstile token is missing' };

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token, remoteip })
  });

  return response.json();
}

function normalizeConversionResult(result) {
  if (Array.isArray(result)) return result[0];
  return result;
}

function trimMarkdown(markdown, maxChars = 50000) {
  const text = String(markdown || '').trim();
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n\n[Текст документа был сокращён для обработки.]';
}

function sameOriginAllowed(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  const requestUrl = new URL(request.url);
  return origin === requestUrl.origin;
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

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function flexSpaces(pattern) {
  return escapeRegex(pattern).replace(/\s+/g, '\\s+');
}

function parseMaybeNumber(value) {
  const normalized = String(value || '').replace(',', '.').replace(/\s+/g, '').trim();
  if (!normalized) return null;
  if (!/^[-+<>]?\d+(?:\.\d+)?$/.test(normalized)) return null;
  const numeric = parseFloat(normalized.replace(/^[-+<>]/, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeValueText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/не\s*обнаружено/gi, 'не обнаружено')
    .replace(/не\s*обнар\.?($|\s)/gi, 'не обнаружено$1')
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
    if (min !== null && max !== null) {
      return { type: 'range', min, max };
    }
  }

  const ltMatch = text.match(/(?:до|<|<=|≤)\s*([0-9]+(?:[.,][0-9]+)?)/);
  if (ltMatch) {
    const max = parseMaybeNumber(ltMatch[1]);
    if (max !== null) return { type: 'max', max };
  }

  const gtMatch = text.match(/(?:от|>|>=|≥)\s*([0-9]+(?:[.,][0-9]+)?)/);
  if (gtMatch) {
    const min = parseMaybeNumber(gtMatch[1]);
    if (min !== null) return { type: 'min', min };
  }

  return { type: 'text', text: refText };
}

function compareValueToReference(resultText, refText, markerKey) {
  const cleanResult = normalizeValueText(resultText);
  const resultLower = cleanResult.toLowerCase();
  const numeric = parseMaybeNumber(cleanResult);
  const ref = parseRange(refText);

  if (ref.type === 'any') {
    return { status: 'normal', numeric, note: 'any' };
  }

  if (ref.type === 'not_detected') {
    if (resultLower.includes('не обнаружено') || resultLower === '0') {
      return { status: 'normal', numeric };
    }
    return { status: 'detected', numeric };
  }

  if (numeric === null) {
    if (resultLower.includes('не обнаружено')) {
      if (markerKey === 'akkermansia') return { status: 'borderline_low', numeric: null };
      return { status: 'normal', numeric: null };
    }
    return { status: 'unknown', numeric: null };
  }

  if (ref.type === 'range') {
    if (numeric < ref.min) return { status: 'low', numeric };
    if (numeric > ref.max) return { status: 'high', numeric };
    return { status: 'normal', numeric };
  }

  if (ref.type === 'max') {
    if (numeric > ref.max) return { status: 'high', numeric };
    return { status: 'normal', numeric };
  }

  if (ref.type === 'min') {
    if (numeric < ref.min) return { status: 'low', numeric };
    return { status: 'normal', numeric };
  }

  return { status: 'unknown', numeric };
}

const MARKERS = [
  {
    key: 'total_mass',
    label: 'Общая бактериальная масса',
    aliases: ['Общая бактериальная масса'],
    explainNormal: 'Общая бактериальная масса в референсе — по этому бланку выраженного снижения общей заселённости микробиоты не видно.',
    explainLow: 'Общая бактериальная масса ниже референса. Такое бывает после антибиотиков, инфекций или при общем сдвиге микробиоты.',
    explainHigh: 'Общая бактериальная масса выше референса. Это само по себе не диагноз, но иногда бывает при избыточном бактериальном росте.'
  },
  {
    key: 'lactobacillus',
    label: 'Lactobacillus spp.',
    aliases: ['Lactobacillus spp.', 'Lactobacillus spp'],
    explainNormal: 'Лактобактерии в пределах референса — защитная флора слизистой по этому показателю выглядит сохранной.',
    explainLow: 'Лактобактерии снижены. Это может сопровождаться более слабой барьерной функцией слизистой и повышенной чувствительностью ЖКТ.',
    explainHigh: 'Лактобактерии выше референса. Обычно это не выглядит тревожно и нередко бывает на фоне пробиотиков.'
  },
  {
    key: 'bifidobacterium',
    label: 'Bifidobacterium spp.',
    aliases: ['Bifidobacterium spp.', 'Bifidobacterium spp'],
    explainNormal: 'Бифидобактерии в норме — это хороший признак для базовой поддерживающей флоры.',
    explainLow: 'Бифидобактерии снижены. Это может быть связано с бедным по клетчатке рационом или общим дисбиотическим сдвигом.',
    explainHigh: 'Бифидобактерии выше референса. Обычно без отдельной клинической значимости.'
  },
  {
    key: 'e_coli',
    label: 'Escherichia coli',
    aliases: ['Escherichia coli', 'Escherichia coli типичная'],
    explainNormal: 'Типичная кишечная палочка находится в допустимом диапазоне.',
    explainLow: 'Типичная E. coli ниже референса. Иногда это бывает при угнетении нормофлоры.',
    explainHigh: 'Типичная E. coli выше референса. На этом фоне у части людей бывают брожение, вздутие или дискомфорт.'
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
    explainLow: 'Faecalibacterium prausnitzii снижена. Это может указывать на более слабую выработку бутирата и менее устойчивый противовоспалительный фон.',
    explainHigh: 'Faecalibacterium prausnitzii выше референса. Обычно это не выглядит проблемой.'
  },
  {
    key: 'b_theta',
    label: 'Bacteroides thetaiotaomicron',
    aliases: ['Bacteroides thetaiotaomicron'],
    explainNormal: 'Bacteroides thetaiotaomicron присутствует в допустимом диапазоне.',
    explainLow: 'Bacteroides thetaiotaomicron снижена или не определяется. Иногда это бывает при бедном по клетчатке рационе.',
    explainHigh: 'Bacteroides thetaiotaomicron определяется. Для этого показателя лаборатория часто допускает любое количество.'
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
    explainLow: 'Enterococcus spp. низко определяются. Обычно это не является отдельной проблемой.',
    explainHigh: 'Enterococcus spp. выше референса. Это стоит оценивать вместе с симптомами и общим контекстом.'
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
    explainHigh: 'Acinetobacter spp. выше референса — это стоит обсудить с врачом в контексте симптомов.'
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
    explainHigh: 'Соотношение Bacteroides/Faecalibacterium выше референса. Это иногда трактуют как менее благоприятный баланс в сторону воспалительного фона.'
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

function extractMarker(text, marker) {
  for (const alias of marker.aliases) {
    const aliasPattern = flexSpaces(alias);
    const regex = new RegExp(
      aliasPattern +
      '\\s+((?:не\\s*обнаружено|не\\s*обнар\\.?|отсутствует|[<>]?[0-9]+(?:[.,][0-9]+)?))' +
      '(?:\\s*(?:lg|Ig)\\s*копий\\/мл)?' +
      '\\s+((?:допустимо\\s+любое\\s+количество|не\\s*обнаружено|[<>]?[0-9]+(?:[.,][0-9]+)?\\s*-\\s*[<>]?[0-9]+(?:[.,][0-9]+)?|(?:до|<|<=|≤)\\s*[0-9]+(?:[.,][0-9]+)?|(?:от|>|>=|≥)\\s*[0-9]+(?:[.,][0-9]+)?))',
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
  return items.map((item) => {
    const meta = MARKERS.find((m) => m.key === item.key);
    const comparison = compareValueToReference(item.result, item.reference, item.key);
    return {
      ...item,
      meta,
      ...comparison
    };
  });
}

function formatItem(item) {
  return `${item.label}: ${item.result} (референс: ${item.reference})`;
}

function uniqueStrings(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function renderRuleBasedAnswer(parsed, message, productName) {
  const foundCore = parsed.filter((item) => ['total_mass', 'lactobacillus', 'bifidobacterium', 'e_coli', 'bacteroides', 'faecali', 'ratio_bact_faec'].includes(item.key));
  const abnormal = parsed.filter((item) => ['low', 'high', 'detected', 'borderline_low'].includes(item.status));
  const critical = abnormal.filter((item) => CRITICAL_KEYS.has(item.key));
  const normalImportant = parsed.filter((item) => item.status === 'normal' && ['total_mass', 'lactobacillus', 'bifidobacterium', 'e_coli', 'bacteroides', 'faecali', 'akkermansia', 'ratio_bact_faec'].includes(item.key));

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
    const normalLines = normalImportant.slice(0, 6).map((item) => `- ${formatItem(item)}`);
    parts.push('Что в норме:\n' + normalLines.join('\n'));
  }

  if (abnormal.length > 0) {
    const abnormalLines = abnormal.map((item) => `- ${formatItem(item)}`);
    parts.push('На что обратить внимание:\n' + abnormalLines.join('\n'));

    const explainLines = uniqueStrings(abnormal.map((item) => {
      if (!item.meta) return '';
      if (item.status === 'low' || item.status === 'borderline_low') return item.meta.explainLow;
      if (item.status === 'high' || item.status === 'detected') return item.meta.explainHigh;
      return '';
    }));

    if (explainLines.length > 0) {
      parts.push('Что это может значить простыми словами:\n' + explainLines.map((line) => `- ${line}`).join('\n'));
    }
  } else if (foundCore.length >= 4) {
    const calmComments = uniqueStrings(normalImportant.slice(0, 5).map((item) => item.meta && item.meta.explainNormal));
    if (calmComments.length > 0) {
      parts.push('Что это может значить простыми словами:\n' + calmComments.map((line) => `- ${line}`).join('\n'));
    }
  }

  const advice = [];
  if (critical.length > 0) {
    advice.push('Обсудить результат с гастроэнтерологом и не затягивать с очной консультацией, особенно если есть боль, температура, кровь в стуле или выраженное ухудшение самочувствия.');
  }
  if (abnormal.some((item) => ['lactobacillus', 'bifidobacterium'].includes(item.key))) {
    advice.push('Посмотреть на рацион: достаточно ли клетчатки, кисломолочных продуктов, регулярного питания и нет ли недавнего курса антибиотиков.');
  }
  if (abnormal.some((item) => ['faecali', 'akkermansia', 'ratio_bact_faec', 'b_theta'].includes(item.key))) {
    advice.push('Обсудить с врачом мягкую поддержку микробиоты и слизистого барьера: питание, клетчатку, переносимость пребиотиков и общую тактику восстановления.');
  }
  if (abnormal.some((item) => ['e_coli', 'enterococcus', 'candida', 'klebsiella'].includes(item.key))) {
    advice.push('Если есть вздутие, нестабильный стул или брожение, обсуждать результат лучше вместе с симптомами — без этого бланк сам по себе не даёт полного вывода.');
  }
  if (advice.length === 0) {
    advice.push('Если жалоб нет, обычно такой бланк обсуждают спокойно и без спешки. Если жалобы есть, имеет смысл показать результат гастроэнтерологу вместе с симптомами, питанием и анамнезом.');
  }
  parts.push('Что можно обсудить с врачом / общие шаги:\n' + advice.map((line) => `- ${line}`).join('\n'));

  if (abnormal.some((item) => item.key === 'lactobacillus')) {
    parts.push(`Когда может быть уместна мягкая поддержка ${productName}:\nЕсли основная задача — поддержать лактобактерии и восстановление микробиоты после стресса, погрешностей в питании или перенесённой терапии, продукты ${productName} можно рассматривать только как мягкую поддержку, а не как лечение.`);
  } else if (abnormal.length === 0 && foundCore.length >= 4) {
    parts.push(`Когда может быть уместна мягкая поддержка ${productName}:\nПо этому бланку нет явного повода делать упор именно на коррекцию лактобактерий. Если у человека есть жалобы, решение о поддержке лучше принимать не по одному показателю, а по общей картине.`);
  }

  if (message) {
    if (abnormal.length === 0 && /проблем|опас|плохо|серьез/i.test(message)) {
      parts.push('Ответ на ваш дополнительный вопрос:\nПо этому бланку выраженных проблем не видно. Если есть симптомы, ориентироваться стоит не только на анализ, но и на самочувствие.');
    } else if (abnormal.length > 0 && /проблем|опас|плохо|серьез/i.test(message)) {
      parts.push('Ответ на ваш дополнительный вопрос:\nДа, в бланке есть моменты, на которые стоит обратить внимание, но по одному анализу нельзя ставить диагноз. Важны жалобы и очная оценка врача.');
    }
  }

  parts.push('Результаты не являются диагнозом. Для медицинских решений нужна консультация врача.');

  return parts.join('\n\n');
}

function extractAiText(aiResult) {
  if (!aiResult) return '';
  if (typeof aiResult === 'string') return aiResult.trim();
  if (typeof aiResult.response === 'string') return aiResult.response.trim();
  if (aiResult.result && typeof aiResult.result.response === 'string') return aiResult.result.response.trim();
  if (Array.isArray(aiResult.choices) && aiResult.choices.length > 0) {
    const first = aiResult.choices[0] || {};
    if (typeof first.text === 'string') return first.text.trim();
    if (first.message && typeof first.message.content === 'string') return first.message.content.trim();
  }
  return '';
}

async function aiFallback(env, markdownText, message, productName) {
  if (!env.AI || !env.AI.run) return '';
  const model = env.AI_MODEL || '@cf/qwen/qwen3-30b-a3b-fp8';
  const prompt = [
    'Ты — спокойный русскоязычный помощник по расшифровке анализов микробиоты.',
    'Опирайся только на текст ниже. Не придумывай показатели.',
    'Если видишь в документе числовые результаты и референсы, перечисли их и коротко объясни.',
    'Если данных недостаточно, честно скажи, чего не хватает.',
    `Если мягкое упоминание бренда уместно, используй ${productName}, но не как лечение.`,
    message ? `Дополнительный вопрос пользователя: ${message}` : '',
    '',
    markdownText
  ].filter(Boolean).join('\n');

  try {
    const aiResult = await env.AI.run(model, {
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1200
    });
    return extractAiText(aiResult);
  } catch {
    return '';
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { Allow: 'POST, OPTIONS' } });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!sameOriginAllowed(request)) {
    return json({ error: 'Недопустимый источник запроса.' }, 403);
  }

  if (!env.AI) {
    return json({ error: 'AI binding не настроен в Cloudflare.' }, 500);
  }

  const remoteip = request.headers.get('CF-Connecting-IP') || '';
  const formData = await request.formData();

  const pdf = formData.get('analysis_pdf');
  const message = String(formData.get('message') || '').trim().slice(0, 1200);
  const turnstileToken = String(formData.get('cf-turnstile-response') || '');
  const honeypot = String(formData.get('website') || '');
  const consent = String(formData.get('consent') || '');
  const privacyConfirm = String(formData.get('privacy_confirm') || '');

  if (honeypot) return json({ error: 'Запрос отклонён.' }, 400);
  if (consent !== '1' || privacyConfirm !== '1') {
    return json({ error: 'Нужно подтвердить согласие с условиями.' }, 400);
  }
  if (!(pdf instanceof File)) {
    return json({ error: 'Нужно загрузить PDF-файл анализа.' }, 400);
  }

  const isPdf = pdf.type === 'application/pdf' || String(pdf.name || '').toLowerCase().endsWith('.pdf');
  if (!isPdf) return json({ error: 'Поддерживаются только PDF-файлы.' }, 400);
  if (pdf.size > 10 * 1024 * 1024) {
    return json({ error: 'PDF слишком большой. Для этого MVP лучше ограничить размер до 10 МБ.' }, 400);
  }

  const turnstileResult = await validateTurnstile(turnstileToken, env.TURNSTILE_SECRET, remoteip);
  if (!turnstileResult.success) {
    return json({ error: 'Проверка Turnstile не пройдена. Обновите страницу и попробуйте снова.' }, 403);
  }

  const productName = env.PRODUCT_NAME || 'LactoMi';

  try {
    const buffer = await pdf.arrayBuffer();
    const converted = await env.AI.toMarkdown(
      {
        name: pdf.name || 'analysis.pdf',
        blob: new Blob([buffer], { type: 'application/pdf' })
      },
      {
        conversionOptions: {
          pdf: { metadata: false }
        }
      }
    );

    const doc = normalizeConversionResult(converted);
    if (!doc || doc.format !== 'markdown' || !doc.data) {
      return json({ error: 'Не удалось извлечь текст из PDF. Лучше всего подходят цифровые PDF с текстовым слоем.' }, 422);
    }

    const markdownText = trimMarkdown(doc.data);
    const normalized = normalizeTextForParsing(markdownText);
    const extracted = attachStatuses(extractMarkers(normalized));

    let answer = '';
    if (extracted.length >= 4) {
      answer = renderRuleBasedAnswer(extracted, message, productName);
    } else {
      answer = await aiFallback(env, markdownText, message, productName);
    }

    if (!answer) {
      return json({
        error: 'Не получилось надёжно разобрать этот PDF.',
        extracted_markers: extracted.length
      }, 422);
    }

    return json({
      answer,
      extracted_markers: extracted.length,
      extracted_chars: markdownText.length
    });
  } catch (error) {
    return json({
      error: 'Ошибка при обработке анализа.',
      details: String(error && error.message ? error.message : error)
    }, 500);
  }
}

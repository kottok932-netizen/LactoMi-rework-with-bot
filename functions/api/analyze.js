import KB from '../data/microbiome-kb.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function normalizeConversionResult(result) {
  return Array.isArray(result) ? result[0] : result;
}

function trimMarkdown(markdown, maxChars = 50000) {
  const text = String(markdown || '').trim();
  return text.length <= maxChars ? text : text.slice(0, maxChars) + '\n\n[Текст документа был сокращён для обработки.]';
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

function stripSensitiveLines(text) {
  return String(text || '')
    .split(/\n+/)
    .filter((line) => {
      const value = String(line || '').trim();
      if (!value) return false;
      return !/^(ФИО|ИНЗ:?|Пол:?|Возраст:?|Дата взятия образца:?|Дата поступления образца:?|Дата печати результата:?|Врач:?|Комментарии к заявке:?|М\.П\.?|Подпись врача)/i.test(value);
    })
    .join('\n')
    .trim();
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function flexSpaces(value) {
  return escapeRegex(value).replace(/\s+/g, '\\s+');
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
    .replace(/отсутствует/gi, 'не обнаружено')
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
    if (min !== null && max !== null) return { type: 'range', min, max };
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

const LOW_WHEN_ABSENT = new Set(['akkermansia', 'b_theta']);
const URGENT_KEYS = new Set(['salmonella', 'shigella', 'c_difficile']);
const CAUTION_KEYS = new Set(['parvimonas', 'fusobacterium']);
const PRODUCT_RELEVANT_KEYS = new Set(['lactobacillus']);

function compareValueToReference(resultText, refText, markerKey) {
  const cleanResult = normalizeValueText(resultText);
  const resultLower = cleanResult.toLowerCase();
  const numeric = parseMaybeNumber(cleanResult);
  const ref = parseRange(refText);

  if (ref.type === 'any') return { status: 'normal', numeric, note: 'any' };

  if (ref.type === 'not_detected') {
    if (resultLower.includes('не обнаружено') || resultLower === '0') return { status: 'normal', numeric };
    return { status: 'detected', numeric };
  }

  if (numeric === null) {
    if (resultLower.includes('не обнаружено')) {
      return LOW_WHEN_ABSENT.has(markerKey) ? { status: 'borderline_low', numeric: null } : { status: 'normal', numeric: null };
    }
    return { status: 'unknown', numeric: null };
  }

  if (ref.type === 'range') {
    if (numeric < ref.min) return { status: 'low', numeric };
    if (numeric > ref.max) return { status: 'high', numeric };
    return { status: 'normal', numeric };
  }

  if (ref.type === 'max') return numeric > ref.max ? { status: 'high', numeric } : { status: 'normal', numeric };
  if (ref.type === 'min') return numeric < ref.min ? { status: 'low', numeric } : { status: 'normal', numeric };
  return { status: 'unknown', numeric };
}

const KB_MAP = new Map((KB.markers || []).map((item) => [item.key, item]));

const MARKERS = [
  { key: 'total_mass', label: 'Общая бактериальная масса', aliases: ['Общая бактериальная масса'] },
  { key: 'lactobacillus', label: 'Lactobacillus spp.', aliases: ['Lactobacillus spp.', 'Lactobacillus spp'] },
  { key: 'bifidobacterium', label: 'Bifidobacterium spp.', aliases: ['Bifidobacterium spp.', 'Bifidobacterium spp'] },
  { key: 'e_coli_typical', label: 'Escherichia coli', aliases: ['Escherichia coli', 'Escherichia coli типичная'] },
  { key: 'bacteroides', label: 'Bacteroides spp.', aliases: ['Bacteroides spp.', 'Bacteroides spp'] },
  { key: 'faecali', label: 'Faecalibacterium prausnitzii', aliases: ['Faecalibacterium prausnitzii'] },
  { key: 'b_theta', label: 'Bacteroides thetaiotaomicron', aliases: ['Bacteroides thetaiotaomicron'] },
  { key: 'akkermansia', label: 'Akkermansia muciniphila', aliases: ['Akkermansia muciniphila'] },
  { key: 'enterococcus', label: 'Enterococcus spp.', aliases: ['Enterococcus spp.', 'Enterococcus spp'] },
  { key: 'blautia', label: 'Blautia spp.', aliases: ['Blautia spp.', 'Blautia spp'] },
  { key: 'acinetobacter', label: 'Acinetobacter spp.', aliases: ['Acinetobacter spp.', 'Acinetobacter spp'] },
  { key: 'e_rectale', label: 'Eubacterium rectale', aliases: ['Eubacterium rectale'] },
  { key: 'streptococcus', label: 'Streptococcus spp.', aliases: ['Streptococcus spp.', 'Streptococcus spp'] },
  { key: 'roseburia', label: 'Roseburia inulinivorans', aliases: ['Roseburia inulinivorans'] },
  { key: 'prevotella', label: 'Prevotella spp.', aliases: ['Prevotella spp.', 'Prevotella spp'] },
  { key: 'm_smithii', label: 'Methanobrevibacter smithii', aliases: ['Methanobrevibacter smithii'] },
  { key: 'm_stadmanae', label: 'Methanosphaera stadmanae', aliases: ['Methanosphaera stadmanae'] },
  { key: 'ruminococcus', label: 'Ruminococcus spp.', aliases: ['Ruminococcus spp.', 'Ruminococcus spp'] },
  { key: 'ratio_bact_faec', label: 'Соотношение Bacteroides/Faecalibacterium prausnitzii', aliases: ['Соотношение Bacteroides speciales/ Faecalibacterium prausnitzii', 'Соотношение Bacteroides species/ Faecalibacterium prausnitzii', 'Соотношение Bacteroides/Faecalibacterium prausnitzii'] },
  { key: 'epec', label: 'Escherichia coli enteropathogenic (ЭПКП)', aliases: ['Escherichia coli enteropathogenic', 'Escherichia coli enteropathogenic (ЭПКП)', 'ЭПКП'] },
  { key: 'klebsiella', label: 'Klebsiella pneumoniae / oxytoca', aliases: ['Klebsiella pneumoniae / oxytoca', 'Klebsiella pneumoniae/oxytoca'] },
  { key: 'candida', label: 'Candida spp.', aliases: ['Candida spp.', 'Candida spp'] },
  { key: 'staph_aureus', label: 'Staphylococcus aureus', aliases: ['Staphylococcus aureus'] },
  { key: 'c_difficile', label: 'Clostridium difficile', aliases: ['Clostridium difficile'] },
  { key: 'c_perfringens', label: 'Clostridium perfringens', aliases: ['Clostridium perfringens'] },
  { key: 'proteus', label: 'Proteus vulgaris/mirabilis', aliases: ['Proteus vulgaris/mirabilis', 'Proteus vulgaris / mirabilis'] },
  { key: 'citrobacter', label: 'Citrobacter spp.', aliases: ['Citrobacter spp.', 'Citrobacter spp'] },
  { key: 'enterobacter', label: 'Enterobacter spp.', aliases: ['Enterobacter spp.', 'Enterobacter spp'] },
  { key: 'salmonella', label: 'Salmonella spp.', aliases: ['Salmonella spp.', 'Salmonella spp'] },
  { key: 'shigella', label: 'Shigella spp.', aliases: ['Shigella spp.', 'Shigella spp'] },
  { key: 'fusobacterium', label: 'Fusobacterium nucleatum', aliases: ['Fusobacterium nucleatum'] },
  { key: 'parvimonas', label: 'Parvimonas micra', aliases: ['Parvimonas micra'] }
].map((item) => ({ ...item, meta: KB_MAP.get(item.key) || null }));

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

function buildFallbackMeta(item) {
  return {
    role: item.label + ' оценивается вместе с остальными показателями анализа.',
    when_low_public: item.label + ' ниже референса и требует оценки в клиническом контексте.',
    when_high_public: item.label + ' выше референса и требует оценки в клиническом контексте.',
    when_detected_public: item.label + ' обнаружен(а), это лучше обсудить с врачом.',
    evidence_tone: 'general'
  };
}

function attachStatuses(items) {
  return items.map((item) => {
    const spec = MARKERS.find((m) => m.key === item.key);
    const meta = (spec && spec.meta) || buildFallbackMeta(item);
    const comparison = compareValueToReference(item.result, item.reference, item.key);
    return { ...item, meta, ...comparison };
  });
}

function cleanupAiAnswer(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function uniqueStrings(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function getSeverity(parsed) {
  const abnormal = parsed.filter((item) => ['low', 'high', 'detected', 'borderline_low'].includes(item.status));
  const urgent = abnormal.some((item) => URGENT_KEYS.has(item.key));
  const caution = abnormal.some((item) => CAUTION_KEYS.has(item.key));
  const protectiveLow = abnormal.filter((item) => ['lactobacillus', 'bifidobacterium', 'faecali', 'akkermansia', 'b_theta'].includes(item.key)).length;
  const balanceIssues = abnormal.filter((item) => ['ratio_bact_faec', 'bacteroides', 'e_coli_typical'].includes(item.key)).length;

  if (urgent) return 'нужна очная оценка врача';
  if (caution && abnormal.length >= 2) return 'нужна очная оценка врача';
  if (protectiveLow >= 2 || abnormal.length >= 4 || (protectiveLow >= 1 && balanceIssues >= 1)) return 'выраженный дисбаланс';
  if (abnormal.length >= 2) return 'умеренный дисбаланс';
  if (abnormal.length >= 1) return 'лёгкий дисбаланс';
  return 'спокойная картина';
}

function summarizeNormal(item) {
  return item.label + ' в пределах референса (' + item.result + ').';
}

function summarizeAbnormal(item) {
  if (item.status === 'detected') return item.label + ': обнаружен(а) (' + item.result + ').';
  if (item.status === 'high') return item.label + ': выше референса (' + item.result + ' при норме ' + item.reference + ').';
  if (item.status === 'low' || item.status === 'borderline_low') return item.label + ': ниже референса или не определяется (' + item.result + ' при норме ' + item.reference + ').';
  return item.label + ': есть отклонение (' + item.result + ').';
}

function explainPublic(item) {
  if (item.status === 'detected') return item.meta.when_detected_public || item.meta.when_high_public || buildFallbackMeta(item).when_detected_public;
  if (item.status === 'high') return item.meta.when_high_public || buildFallbackMeta(item).when_high_public;
  if (item.status === 'low' || item.status === 'borderline_low') return item.meta.when_low_public || buildFallbackMeta(item).when_low_public;
  return item.meta.role || buildFallbackMeta(item).role;
}

function buildQuestionReply(message, severity) {
  if (!message) return '';
  if (/опас|страш|серьез|плохо|критич/i.test(message)) {
    if (severity === 'спокойная картина') return 'По одному бланку выраженной тревоги не видно, но ориентироваться всегда стоит ещё и на симптомы.';
    if (severity === 'нужна очная оценка врача') return 'Есть маркёры, которые лучше обсудить очно с врачом, но по одному анализу всё равно нельзя делать окончательный вывод.';
    return 'Есть отклонения, на которые стоит обратить внимание, но окончательная оценка зависит от симптомов и очной консультации.';
  }
  if (/что делать|с чего начать|дальше/i.test(message)) {
    return 'Начните с спокойного разбора результата вместе с симптомами, питания и анамнеза; дальше обычно обсуждают рацион и необходимость очной консультации.';
  }
  return 'На ваш вопрос лучше отвечать с учётом жалоб, самочувствия и истории болезни, поэтому этот анализ стоит обсуждать не изолированно.';
}

function shouldMentionProduct(parsed) {
  const abnormal = parsed.filter((item) => ['low', 'high', 'detected', 'borderline_low'].includes(item.status));
  if (abnormal.some((item) => URGENT_KEYS.has(item.key))) return false;
  return abnormal.some((item) => PRODUCT_RELEVANT_KEYS.has(item.key));
}

function buildActionSteps(parsed, severity) {
  const abnormal = parsed.filter((item) => ['low', 'high', 'detected', 'borderline_low'].includes(item.status));
  const steps = [];

  if (severity === 'нужна очная оценка врача') {
    steps.push('Показать результат гастроэнтерологу очно, особенно если есть боль, кровь в стуле, температура, похудение или выраженное ухудшение самочувствия.');
  }
  if (abnormal.some((item) => ['lactobacillus', 'bifidobacterium', 'faecali', 'akkermansia', 'b_theta'].includes(item.key))) {
    steps.push('Пересмотреть рацион: достаточно ли клетчатки, овощей, цельных продуктов и нет ли перекоса в сторону сладкого и ультрапереработанной еды.');
  }
  if (abnormal.some((item) => ['e_coli_typical', 'enterococcus', 'candida', 'klebsiella', 'proteus', 'citrobacter', 'enterobacter'].includes(item.key))) {
    steps.push('Вести короткий дневник симптомов и питания 1-2 недели, чтобы обсуждать анализ уже вместе с жалобами, а не изолированно.');
  }
  if (abnormal.some((item) => ['faecali', 'akkermansia', 'ratio_bact_faec'].includes(item.key))) {
    steps.push('Не начинать самостоятельно антибиотики, бактериофаги или добавки без врача; такие решения лучше принимать после очной оценки.');
  }
  if (!steps.length) {
    steps.push('Если жалоб нет, обычно достаточно наблюдать самочувствие, поддерживать разнообразное питание и обсуждать результат без спешки.');
  }
  return uniqueStrings(steps).slice(0, 5);
}

function buildProductText(parsed, brandName) {
  const composition = Array.isArray(KB.branding && KB.branding.composition) ? KB.branding.composition.join(', ') : '';
  if (!shouldMentionProduct(parsed)) {
    return 'По этому анализу не стоит делать главный акцент на продукте: важнее смотреть на общую картину, симптомы и рекомендации врача.';
  }
  return brandName + ' можно рассматривать как поддерживающий комплекс после обсуждения со специалистом. Он не заменяет лечение и не используется для постановки диагноза.' + (composition ? ' В составе: ' + composition + '.' : '');
}

function renderRuleBasedAnswer(parsed, message, brandName) {
  const abnormal = parsed.filter((item) => ['low', 'high', 'detected', 'borderline_low'].includes(item.status));
  const normalImportant = parsed.filter((item) => item.status === 'normal' && ['total_mass', 'bifidobacterium', 'bacteroides', 'faecali', 'akkermansia'].includes(item.key));
  const severity = getSeverity(parsed);
  const parts = [];

  if (severity === 'спокойная картина') {
    parts.push('Краткий итог:\nПо анализу нет выраженных отклонений: картина выглядит достаточно спокойной.');
  } else if (severity === 'лёгкий дисбаланс') {
    parts.push('Краткий итог:\nЕсть отдельные умеренные отклонения, которые чаще требуют спокойного наблюдения и обсуждения результата в контексте симптомов.');
  } else if (severity === 'умеренный дисбаланс') {
    parts.push('Краткий итог:\nЕсть несколько отклонений, которые можно описать как умеренный дисбаланс микробиоты.');
  } else if (severity === 'выраженный дисбаланс') {
    parts.push('Краткий итог:\nЕсть сочетание отклонений, которое больше похоже на выраженный дисбаланс микробиоты и заслуживает внимательного разбора.');
  } else {
    parts.push('Краткий итог:\nВ анализе есть маркёры, которые лучше обсудить с врачом очно, не ограничиваясь только онлайн-расшифровкой.');
  }

  if (normalImportant.length) {
    parts.push('Что в норме:\n' + normalImportant.slice(0, 5).map((item) => '- ' + summarizeNormal(item)).join('\n'));
  }

  if (abnormal.length) {
    const explanationItems = abnormal.slice().sort((a, b) => {
      const aScore = URGENT_KEYS.has(a.key) ? 0 : (CAUTION_KEYS.has(a.key) ? 1 : 2);
      const bScore = URGENT_KEYS.has(b.key) ? 0 : (CAUTION_KEYS.has(b.key) ? 1 : 2);
      return aScore - bScore;
    });
    parts.push('На что обратить внимание:\n' + abnormal.map((item) => '- ' + summarizeAbnormal(item)).join('\n'));
    parts.push('Что это может значить простыми словами:\n' + uniqueStrings(explanationItems.map((item) => explainPublic(item))).slice(0, 5).map((line) => '- ' + line).join('\n'));
  } else {
    parts.push('На что обратить внимание:\n- Выраженных отклонений по основным считанным маркёрам не видно.');
    parts.push('Что это может значить простыми словами:\n- По этому бланку защитная и противовоспалительная флора выглядит достаточно спокойно, но окончательную оценку всегда связывают с самочувствием.');
  }

  const questionReply = buildQuestionReply(message, severity);
  const steps = buildActionSteps(parsed, severity);
  if (questionReply) steps.unshift(questionReply);
  parts.push('Что можно сделать сейчас:\n' + uniqueStrings(steps).slice(0, 5).map((line) => '- ' + line).join('\n'));
  parts.push('Что касается ' + brandName + ':\n' + buildProductText(parsed, brandName));
  parts.push('Важно:\nЭтот разбор носит образовательный характер и не заменяет консультацию врача.');

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

async function aiFallback(env, markdownText, message, brandName) {
  if (!env.AI || !env.AI.run) return '';
  const model = env.AI_MODEL || '@cf/qwen/qwen3-30b-a3b-fp8';
  const prompt = [
    'Ты — русскоязычный помощник сервиса ' + brandName + ' для образовательной расшифровки анализов микробиоты кишечника.',
    'Опирайся только на реально извлечённый текст ниже. Не придумывай показатели, диагнозы и назначения.',
    'Пиши простым, спокойным языком без markdown-разметки: без #, **, __, --- и таблиц.',
    'Структура ответа: Краткий итог, Что в норме, На что обратить внимание, Что это может значить простыми словами, Что можно сделать сейчас, Что касается ' + brandName + ', Важно.',
    'Не назначай дозировку, антибиотики, бактериофаги, БАДы и не обещай лечение.',
    'Если есть Parvimonas micra или Fusobacterium nucleatum, объясняй осторожно: это не диагноз по одному анализу, а повод обсудить результат с врачом.',
    'Если есть Salmonella, Shigella или Clostridium difficile, советуй обратиться к врачу очно без затягивания.',
    'Продукт упоминай мягко и только как поддержку после обсуждения со специалистом.',
    message ? 'Вопрос пользователя: ' + message : 'Если отдельного вопроса нет, всё равно кратко объясни, что делать дальше.',
    '',
    markdownText
  ].filter(Boolean).join('\n');

  try {
    const aiResult = await env.AI.run(model, {
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.15,
      max_tokens: 1600
    });
    return cleanupAiAnswer(extractAiText(aiResult));
  } catch {
    return '';
  }
}


async function validateTurnstileToken(token, secret, remoteIp) {
  const cleanSecret = String(secret || '').trim();
  const cleanToken = String(token || '').trim();

  if (!cleanSecret) {
    return { success: false, 'error-codes': ['missing-input-secret'] };
  }

  if (!cleanToken) {
    return { success: false, 'error-codes': ['missing-input-response'] };
  }

  // Cloudflare Siteverify officially accepts JSON or
  // application/x-www-form-urlencoded. URLSearchParams avoids
  // multipart/FormData compatibility issues in Pages Functions.
  const body = new URLSearchParams();
  body.set('secret', cleanSecret);
  body.set('response', cleanToken);

  const firstIp = String(remoteIp || '').split(',')[0].trim();
  if (firstIp) body.set('remoteip', firstIp);

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        'error-codes': Array.isArray(result['error-codes']) ? result['error-codes'] : ['internal-error']
      };
    }
    return result;
  } catch (error) {
    return {
      success: false,
      'error-codes': ['internal-error'],
      internal_message: error && error.message ? String(error.message) : ''
    };
  }
}

function parseExpectedTurnstileHosts(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function turnstileDebugEnabled(env) {
  return String(env.DEBUG_TURNSTILE || '').trim() === '1';
}

export async function onRequestOptions() {
  return new Response(null, { headers: { Allow: 'POST, OPTIONS' } });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!sameOriginAllowed(request)) {
    return json({ error: 'Недопустимый источник запроса.' }, 403);
  }

  const formData = await request.formData();
  const pdf = formData.get('analysis_pdf');
  const browserText = trimMarkdown(stripSensitiveLines(String(formData.get('analysis_text') || '')), 50000);
  const pdfName = String(formData.get('analysis_pdf_name') || ((pdf instanceof File && pdf.name) ? pdf.name : 'analysis.pdf'));
  const message = String(formData.get('message') || '').trim().slice(0, 1200);
  const honeypot = String(formData.get('website') || '');
  const consent = String(formData.get('consent') || '');
  const privacyConfirm = String(formData.get('privacy_confirm') || '');
  const browserExtractError = String(formData.get('browser_extract_error') || '').trim();
  const turnstileToken = String(formData.get('cf-turnstile-response') || '').trim();

  if (honeypot) return json({ error: 'Запрос отклонён.' }, 400);
  if (consent !== '1' || privacyConfirm !== '1') {
    return json({ error: 'Нужно подтвердить согласие с условиями.' }, 400);
  }

  if (!env.TURNSTILE_SECRET) {
    return json({ error: 'Капча сервиса не настроена.' }, 500);
  }

  if (!turnstileToken) {
    return json({ error: 'Подтвердите проверку, что вы не робот.' }, 400);
  }

  const remoteIp = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '';
  const turnstileResult = await validateTurnstileToken(turnstileToken, env.TURNSTILE_SECRET, remoteIp);
  const turnstileErrorCodes = turnstileResult && Array.isArray(turnstileResult['error-codes'])
    ? turnstileResult['error-codes']
    : [];

  if (!turnstileResult || !turnstileResult.success) {
    console.warn('Turnstile validation failed', JSON.stringify({
      errorCodes: turnstileErrorCodes,
      hostname: turnstileResult && turnstileResult.hostname ? turnstileResult.hostname : '',
      hasSecret: Boolean(env.TURNSTILE_SECRET),
      hasToken: Boolean(turnstileToken)
    }));

    return json({
      error: 'Проверка безопасности не пройдена. Обновите капчу и попробуйте снова.',
      details: turnstileDebugEnabled(env) && turnstileErrorCodes.length
        ? 'Turnstile: ' + turnstileErrorCodes.join(', ')
        : undefined,
      hint: turnstileDebugEnabled(env)
        ? 'Проверьте, что TURNSTILE_SECRET и turnstileSiteKey взяты из одного и того же Turnstile-виджета, а текущий домен добавлен в Hostname Management.'
        : undefined
    }, 400);
  }

  const expectedTurnstileHosts = parseExpectedTurnstileHosts(env.TURNSTILE_EXPECTED_HOSTNAME);
  if (expectedTurnstileHosts.length > 0 && turnstileResult.hostname && !expectedTurnstileHosts.includes(turnstileResult.hostname)) {
    return json({
      error: 'Проверка безопасности не совпала с доменом сайта.',
      details: turnstileDebugEnabled(env)
        ? 'Ожидали: ' + expectedTurnstileHosts.join(', ') + '; получили: ' + turnstileResult.hostname
        : undefined
    }, 400);
  }

  const hasPdfFile = pdf instanceof File;
  const hasBrowserText = browserText.length >= 80;
  if (!hasPdfFile && !hasBrowserText) return json({ error: 'Нужно загрузить PDF-файл анализа.' }, 400);

  if (hasPdfFile) {
    const isPdf = pdf.type === 'application/pdf' || String(pdf.name || '').toLowerCase().endsWith('.pdf');
    if (!isPdf) return json({ error: 'Поддерживаются только PDF-файлы.' }, 400);
    if (pdf.size > 10 * 1024 * 1024) return json({ error: 'PDF слишком большой. Для этого MVP лучше ограничить размер до 10 МБ.' }, 400);
  }

  const brandName = (KB.branding && KB.branding.brand) || env.PRODUCT_NAME || 'LactoMi Balance';

  try {
    let workingText = '';
    let source = '';
    let extracted = [];

    if (hasBrowserText) {
      workingText = browserText;
      source = 'browser_text';
      extracted = attachStatuses(extractMarkers(normalizeTextForParsing(workingText)));
    }

    if (extracted.length < 4 && hasPdfFile && env.AI && typeof env.AI.toMarkdown === 'function') {
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
        if (doc && doc.format === 'markdown' && doc.data) {
          const fallbackText = trimMarkdown(stripSensitiveLines(String(doc.data || '')), 50000);
          const fallbackExtracted = attachStatuses(extractMarkers(normalizeTextForParsing(fallbackText)));
          if (fallbackExtracted.length > extracted.length) {
            workingText = fallbackText;
            extracted = fallbackExtracted;
            source = 'tomarkdown';
          }
        }
      } catch (_) {
        // ignore fallback conversion failure
      }
    }

    let answer = '';
    if (extracted.length >= 4) {
      answer = renderRuleBasedAnswer(extracted, message, brandName);
    } else if (workingText) {
      answer = await aiFallback(env, workingText, message, brandName);
    }

    answer = cleanupAiAnswer(answer);
    if (!answer) {
      return json({
        error: 'Не получилось надёжно разобрать этот PDF.',
        hint: 'Лучше всего подходят цифровые PDF, где текст можно выделить. Со сканами точность ниже.',
        extracted_markers: extracted.length,
        source: source || 'none',
        file_name: pdfName,
        browser_extract_error: browserExtractError || undefined,
        ai_available: !!(env.AI && env.AI.run),
        tomarkdown_available: !!(env.AI && typeof env.AI.toMarkdown === 'function')
      }, 422);
    }

    return json({
      answer,
      extracted_markers: extracted.length,
      extracted_chars: workingText.length,
      source: source || (hasPdfFile ? 'pdf_only' : 'text_only'),
      file_name: pdfName
    });
  } catch (error) {
    return json({
      error: 'Ошибка при обработке анализа.',
      details: String(error && error.message ? error.message : error)
    }, 500);
  }
}

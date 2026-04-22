const SYSTEM_PROMPT = `Ты — LactoMi Bot, спокойный и понятный помощник по расшифровке анализов микробиоты и ЖКТ.

Главные правила:
- отвечай по-русски;
- опирайся только на текст, извлечённый из загруженного пользователем PDF;
- не придумывай показатели, которых нет в документе;
- не переносить отклонения из одного кейса на другой;
- не ставь диагноз;
- не назначай лечение;
- допускаются только осторожные формулировки: «может быть связано», «стоит обсудить с врачом», «может указывать»;
- если значений или референсов не хватает, честно скажи об этом;
- не превращай ответ в продажу.

Стиль ответа:
- простой и дружелюбный человеческий русский язык;
- короткие абзацы;
- без тяжёлого академического тона;
- без обещаний вылечить что-либо.

Желаемая структура:
1. Краткий итог
2. Что в норме
3. На что обратить внимание
4. Что это может значить простыми словами
5. Что можно обсудить с врачом / общие шаги
6. Когда может быть уместна мягкая поддержка LactoMi
7. Дисклеймер

Правила про LactoMi:
- можно мягко упомянуть LactoMi только если это действительно уместно по содержанию анализа;
- обязательно напиши, что это не лекарство и не замена консультации врача;
- не обещай лечение, диагностику, гарантированный результат или профилактику конкретного заболевания.

Мини-база знаний по показателям:
- Общая бактериальная масса: суммарная заселённость микробиоты.
- Lactobacillus spp.: защитная флора слизистой, важна для барьера и местного иммунитета.
- Bifidobacterium spp.: важная нормофлора, связана с ферментацией клетчатки и метаболитами.
- Escherichia coli типичная: допустима в пределах референса, избыток может сопровождаться брожением и дискомфортом.
- Bacteroides spp.: участвуют в переработке сложных углеводов.
- Faecalibacterium prausnitzii: важный противовоспалительный маркёр, связан с выработкой бутирата.
- Bacteroides thetaiotaomicron: участвует в переработке сложных углеводов.
- Akkermansia muciniphila: ассоциируется со слизистым барьером кишечника.
- Enterococcus spp.: допустим в небольших количествах, при избытке требует внимания.
- Candida spp., Klebsiella spp., Proteus spp., Citrobacter spp., Enterobacter spp.: при превышении могут говорить о дисбиотическом сдвиге.
- Clostridium difficile, Salmonella spp., Shigella spp.: при обнаружении нужен отдельный акцент на обязательной консультации врача.
- Fusobacterium nucleatum, Parvimonas micra: при обнаружении делай отдельный акцент на том, что это нужно обсудить с врачом.

Всегда заканчивай так:
«Результаты не являются диагнозом. Для медицинских решений нужна консультация врача.»`;

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

function trimMarkdown(markdown, maxChars = 24000) {
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

function extractAiText(aiResult) {
  if (!aiResult) return '';

  if (typeof aiResult === 'string') {
    return aiResult.trim();
  }

  if (typeof aiResult.response === 'string') {
    return aiResult.response.trim();
  }

  if (aiResult.result && typeof aiResult.result.response === 'string') {
    return aiResult.result.response.trim();
  }

  if (Array.isArray(aiResult.choices) && aiResult.choices.length > 0) {
    const firstChoice = aiResult.choices[0] || {};

    if (typeof firstChoice.text === 'string') {
      return firstChoice.text.trim();
    }

    if (firstChoice.message && typeof firstChoice.message.content === 'string') {
      return firstChoice.message.content.trim();
    }
  }

  if (Array.isArray(aiResult) && aiResult.length > 0) {
    for (const item of aiResult) {
      const extracted = extractAiText(item);
      if (extracted) return extracted;
    }
  }

  return '';
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      Allow: 'POST, OPTIONS'
    }
  });
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

  if (honeypot) {
    return json({ error: 'Запрос отклонён.' }, 400);
  }

  if (consent !== '1' || privacyConfirm !== '1') {
    return json({ error: 'Нужно подтвердить согласие с условиями.' }, 400);
  }

  if (!(pdf instanceof File)) {
    return json({ error: 'Нужно загрузить PDF-файл анализа.' }, 400);
  }

  const isPdf = pdf.type === 'application/pdf' || String(pdf.name || '').toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    return json({ error: 'Поддерживаются только PDF-файлы.' }, 400);
  }

  if (pdf.size > 10 * 1024 * 1024) {
    return json({ error: 'PDF слишком большой. Для этого MVP лучше ограничить размер до 10 МБ.' }, 400);
  }

  const turnstileResult = await validateTurnstile(turnstileToken, env.TURNSTILE_SECRET, remoteip);
  if (!turnstileResult.success) {
    return json({ error: 'Проверка Turnstile не пройдена. Обновите страницу и попробуйте снова.' }, 403);
  }

  const model = env.AI_MODEL || '@cf/qwen/qwen3-30b-a3b-fp8';
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
          pdf: {
            metadata: false
          }
        }
      }
    );

    const doc = normalizeConversionResult(converted);
    if (!doc || doc.format !== 'markdown' || !doc.data) {
      return json({ error: 'Не удалось извлечь текст из PDF. Лучше всего подходят цифровые PDF с текстовым слоем.' }, 422);
    }

    const markdownText = trimMarkdown(doc.data);
    const userPrompt = [
      'Ниже находится текст анализа, извлечённый из PDF.',
      'Сначала найди реальные показатели и их референсы из документа.',
      'Потом дай спокойную и понятную расшифровку.',
      'Если показатель в пределах референса, не называй его отклонением.',
      'Если анализ в целом спокойный, честно скажи об этом.',
      'Если данных мало или часть таблицы нечитабельна, честно скажи, чего не хватает.',
      `Если мягкое упоминание продукта уместно, используй бренд ${productName}, но не как лечение.`,
      message ? `Дополнительный вопрос пользователя: ${message}` : '',
      '',
      'Текст анализа:',
      markdownText
    ].filter(Boolean).join('\n');

    const aiResult = await env.AI.run(model, {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 1400
    });

    const answer = extractAiText(aiResult);
    if (!answer) {
      return json({
        error: 'Модель не вернула текстовый ответ.',
        debug_shape: typeof aiResult,
        debug_keys: aiResult && typeof aiResult === 'object' ? Object.keys(aiResult) : []
      }, 502);
    }

    return json({
      answer,
      model,
      extracted_chars: markdownText.length
    });
  } catch (error) {
    return json({
      error: 'Ошибка при обработке анализа.',
      details: String(error && error.message ? error.message : error)
    }, 500);
  }
}

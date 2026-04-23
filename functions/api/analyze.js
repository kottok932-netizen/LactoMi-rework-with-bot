function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { Allow: 'POST, OPTIONS' } });
}

export async function onRequestPost() {
  return json({
    error: 'Сайт переведён на локальный режим обработки PDF. Обновите страницу через Ctrl+F5: файл должен разбираться прямо в браузере, без обращения к /api/analyze.'
  }, 410);
}

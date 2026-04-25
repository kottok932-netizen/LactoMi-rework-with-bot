# Быстрое исправление Turnstile

Если виджет на странице показывает «Успешно», но `/api/analyze` отвечает ошибкой
«Проверка безопасности не пройдена», значит проблема почти всегда не в кнопке на
странице, а в серверной проверке токена.

Проверьте в Cloudflare:

1. Turnstile → ваш widget → скопируйте **Site Key** и **Secret Key** именно из
   одного и того же widget.
2. `assets/config.js`:
   ```js
   turnstileSiteKey: 'ВАШ_SITE_KEY'
   ```
3. Workers & Pages → ваш Pages-проект → Settings → Variables and Secrets:
   - `TURNSTILE_SECRET` = ваш **Secret Key**
   - добавьте его в Production; если тестируете preview/deploy branches — добавьте
     и в Preview.
4. В Turnstile widget добавьте hostname сайта:
   - `lactomi-rework-with-bot.pages.dev`
   - ваш кастомный домен, если используете его.
5. Если задан `TURNSTILE_EXPECTED_HOSTNAME`, он должен быть без `https://` и без `/`.
   Можно указать несколько через запятую:
   ```text
   lactomi-rework-with-bot.pages.dev,lactomi.ru,www.lactomi.ru
   ```
6. Сделайте новый Deploy / Redeploy.

В этой версии серверная проверка отправляет запрос в Cloudflare Siteverify через
`application/x-www-form-urlencoded`, а не через multipart `FormData`, и умеет
выводить диагностические коды.

Для временной диагностики можно добавить переменную:

```text
DEBUG_TURNSTILE=1
```

После исправления удалите её или поставьте `0`.

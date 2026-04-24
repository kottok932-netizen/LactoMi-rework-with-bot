# LactoMi — production-ready build for Cloudflare Pages

Финальная сборка для Cloudflare Pages с:

- AI-разбором PDF анализов микробиоты;
- образовательным гидом по микроорганизмам;
- продуктовым блоком вокруг LactoMi и LactoMi Balance;
- Turnstile-капчей с серверной валидацией;
- Pages Function по адресу `/api/analyze`.

## Что нужно настроить в Cloudflare

### 1) Binding
Добавьте binding:

- **AI** → тип **Workers AI** → имя **AI**

### 2) Secret
В проекте Pages откройте:

**Settings → Variables and Secrets → Add**

Создайте secret:

- **Name:** `TURNSTILE_SECRET`
- **Value:** ваш Secret Key из Cloudflare Turnstile

### 3) Публичный site key
Откройте файл:

`assets/config.js`

и вставьте в `turnstileSiteKey` ваш публичный **Site Key** Turnstile.

Пример:

```js
window.LACTOMI_CONFIG = {
  brandName: 'LactoMi',
  featuredProductName: 'LactoMi Balance',
  turnstileSiteKey: 'ВАШ_SITE_KEY'
};
```

### 4) Опционально
Если хотите дополнительно проверять домен на сервере, можно добавить секрет/переменную:

- `TURNSTILE_EXPECTED_HOSTNAME`

Например:

`lactomi.pages.dev`

или ваш кастомный домен.

## Как задеплоить

1. Замените файлы проекта в репозитории на содержимое этого архива.
2. Убедитесь, что Pages проект подключен к нужному репозиторию.
3. Проверьте binding `AI`.
4. Добавьте `TURNSTILE_SECRET`.
5. Укажите `turnstileSiteKey` в `assets/config.js`.
6. Сделайте redeploy.
7. После деплоя откройте сайт и нажмите **Ctrl+F5**.

## Что входит в сборку

- Главная страница бренда LactoMi.
- AI-сервис расшифровки PDF анализов.
- Гид по микробиоте (`guide.html`).
- Страница приватности (`privacy.html`).
- Серверная функция `functions/api/analyze.js`.
- База знаний по микроорганизмам `assets/data/microbiome-kb.json`.

## Важно

- Сервис носит образовательный характер.
- Он не ставит диагноз и не заменяет консультацию врача.
- Лучше всего подходят цифровые PDF, где текст можно выделить.
- Для сканов и фото точность может быть ниже.

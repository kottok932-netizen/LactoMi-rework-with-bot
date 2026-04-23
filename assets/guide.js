(function () {
  fetch('./assets/data/microbiome-kb.json')
    .then(function (response) { return response.json(); })
    .then(function (data) {
      var groups = {
        obligate: document.getElementById('guideObligate'),
        functional: document.getElementById('guideFunctional'),
        pathogenic: document.getElementById('guidePathogenic')
      };

      (data.markers || []).forEach(function (item) {
        var host = groups[item.group];
        if (!host) return;

        var card = document.createElement('article');
        card.className = 'card guide-card';

        var html = '';
        html += '<h3>' + item.label + '</h3>';
        if (item.role) html += '<p><strong>Роль:</strong> ' + item.role + '</p>';
        if (item.when_low_public) html += '<p><strong>Если ниже нормы:</strong> ' + item.when_low_public + '</p>';
        if (item.when_high_public) html += '<p><strong>Если выше нормы:</strong> ' + item.when_high_public + '</p>';
        if (item.when_detected_public) html += '<p><strong>Если обнаружен:</strong> ' + item.when_detected_public + '</p>';
        if (item.reference) html += '<p class="guide-reference">Референс: ' + item.reference + '</p>';
        card.innerHTML = html;
        host.appendChild(card);
      });
    })
    .catch(function () {
      ['guideObligate', 'guideFunctional', 'guidePathogenic'].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = '<article class="card guide-card"><p>Не удалось загрузить образовательный раздел. Попробуйте обновить страницу.</p></article>';
      });
    });
})();

export default {
  "version": "2026-04-23",
  "source_note": "Собрано из материалов заказчика и отредактировано для production-safe использования.",
  "branding": {
    "brand": "LactoMi Balance",
    "composition": [
      "Lacticaseibacillus rhamnosus GG",
      "Lactiplantibacillus plantarum",
      "Limosilactobacillus reuteri"
    ],
    "public_mention_rule": "Упоминать только как поддерживающий продукт после обсуждения со специалистом; не позиционировать как лечение и не предлагать дозировку."
  },
  "public_policies": {
    "must_not": [
      "ставить диагноз по одному анализу",
      "назначать антибиотики, бактериофаги, БАДы или дозировки",
      "обещать лечение или гарантированный эффект",
      "использовать выражения вроде 'рак', 'предрак', 'дырявый кишечник' как готовый диагноз"
    ],
    "preferred_sections": [
      "Краткий итог",
      "Что в норме",
      "На что обратить внимание",
      "Что это может значить простыми словами",
      "Что можно сделать сейчас",
      "Что касается LactoMi Balance",
      "Важно"
    ],
    "urgent_flags": [
      "Salmonella spp.",
      "Shigella spp.",
      "Clostridium difficile",
      "кровь в стуле",
      "температура",
      "выраженная боль",
      "немотивированное похудение"
    ]
  },
  "severity_model": {
    "mode": "internal_only",
    "bands": [
      {
        "name": "легкий дисбаланс",
        "heuristic": "1-2 умеренных отклонения без патогенов и без тревожных маркеров"
      },
      {
        "name": "умеренный дисбаланс",
        "heuristic": "несколько отклонений нормофлоры или функциональных маркеров"
      },
      {
        "name": "выраженный дисбаланс",
        "heuristic": "сочетание снижения защитной флоры, противовоспалительных маркеров и/или значимого перекоса соотношений"
      },
      {
        "name": "высокий приоритет для врача",
        "heuristic": "патогены, C. difficile, Salmonella/Shigella, Parvimonas/Fusobacterium плюс симптомы/факторы риска"
      }
    ]
  },
  "markers": [
    {
      "key": "total_mass",
      "label": "Общая бактериальная масса",
      "group": "obligate",
      "reference": "11-13 lg копий/мл",
      "role": "Интегральный показатель общей заселенности кишечника.",
      "when_low_public": "Может соответствовать общему снижению разнообразия и численности микробиоты, например после антибиотиков или кишечной инфекции.",
      "when_high_public": "Иногда встречается при избыточном бактериальном росте, но сам по себе не равен диагнозу.",
      "evidence_tone": "general"
    },
    {
      "key": "lactobacillus",
      "label": "Lactobacillus spp.",
      "group": "obligate",
      "reference": "7-8 lg копий/мл",
      "role": "Лактобактерии помогают поддерживать кислую среду, барьер слизистой и колонизационную устойчивость.",
      "when_low_public": "Снижение может соответствовать менее устойчивой защитной флоре и большей чувствительности ЖКТ к дискомфорту.",
      "when_high_public": "Небольшое повышение часто не имеет самостоятельного клинического значения.",
      "evidence_tone": "general"
    },
    {
      "key": "bifidobacterium",
      "label": "Bifidobacterium spp.",
      "group": "obligate",
      "reference": "9-10 lg копий/мл",
      "role": "Бифидобактерии участвуют в ферментации клетчатки и поддержке микробного баланса.",
      "when_low_public": "Снижение может сопровождаться менее стабильной работой кишечника и меньшей поддержкой нормофлоры.",
      "when_high_public": "Повышение обычно не трактуется как самостоятельная проблема.",
      "evidence_tone": "general"
    },
    {
      "key": "e_coli_typical",
      "label": "Escherichia coli (типичная)",
      "group": "obligate",
      "reference": "6-8 lg копий/мл",
      "role": "Нормальный представитель микробиоты в определенных пределах.",
      "when_low_public": "Снижение может сопровождать угнетение нормофлоры.",
      "when_high_public": "Повышение может сочетаться с брожением, вздутием и нестабильным стулом, но оценивается только вместе с симптомами.",
      "evidence_tone": "general"
    },
    {
      "key": "bacteroides",
      "label": "Bacteroides spp.",
      "group": "obligate",
      "reference": "9-12 lg копий/мл",
      "role": "Ключевые анаэробы, участвующие в переработке сложных углеводов и метаболизме желчных кислот.",
      "when_low_public": "Снижение может отражать менее эффективную переработку сложных углеводов.",
      "when_high_public": "Значение лучше оценивать в контексте других противовоспалительных маркеров, а не изолированно.",
      "evidence_tone": "general"
    },
    {
      "key": "faecali",
      "label": "Faecalibacterium prausnitzii",
      "group": "functional",
      "reference": "8-11 lg копий/мл",
      "role": "Важный продуцент бутирата и один из ключевых противовоспалительных маркеров микробиоты.",
      "when_low_public": "Снижение может соответствовать менее устойчивому противовоспалительному профилю и более слабой поддержке кишечного барьера.",
      "when_high_public": "Повышение обычно не рассматривается как проблема само по себе.",
      "evidence_tone": "well_supported"
    },
    {
      "key": "b_theta",
      "label": "Bacteroides thetaiotaomicron",
      "group": "functional",
      "reference": "допустимо любое количество",
      "role": "Специалист по расщеплению сложных углеводов и полисахаридов пищи.",
      "when_low_public": "Низкое значение или отсутствие может встречаться при бедном клетчаткой рационе или общем дисбалансе экосистемы.",
      "when_high_public": "В большинстве бланков отдельного тревожного значения не имеет.",
      "evidence_tone": "general"
    },
    {
      "key": "akkermansia",
      "label": "Akkermansia muciniphila",
      "group": "functional",
      "reference": "0-11 lg копий/мл",
      "role": "Маркер слизистого барьера; связан с обменом муцина и устойчивостью кишечного защитного слоя.",
      "when_low_public": "Снижение или отсутствие может соответствовать менее устойчивому слизистому барьеру и неблагоприятному метаболическому профилю, но не является диагнозом.",
      "when_high_public": "Наличие в допустимом диапазоне обычно трактуется как спокойный признак.",
      "evidence_tone": "well_supported"
    },
    {
      "key": "enterococcus",
      "label": "Enterococcus spp.",
      "group": "functional",
      "reference": "0-8 lg копий/мл",
      "role": "Условно-патогенная группа; в небольших количествах допустима.",
      "when_low_public": "Низкие значения обычно не имеют отдельного значения.",
      "when_high_public": "Повышение лучше оценивать в контексте жалоб и общей клинической картины.",
      "evidence_tone": "general"
    },
    {
      "key": "ratio_bact_faec",
      "label": "Соотношение Bacteroides/Faecalibacterium prausnitzii",
      "group": "functional",
      "reference": "0.01-100",
      "role": "Балансовый показатель между условно воспалительным и противовоспалительным профилем микробиоты.",
      "when_low_public": "Обычно не трактуется как проблема изолированно.",
      "when_high_public": "Повышение можно описывать как перекос баланса, а не как готовый диагноз воспаления.",
      "evidence_tone": "associative"
    },
    {
      "key": "epec",
      "label": "Escherichia coli enteropathogenic (ЭПКП)",
      "group": "pathogenic",
      "reference": "не обнаружено / <5 lg копий/мл",
      "role": "Патогенный вариант кишечной палочки, связанный с острыми кишечными инфекциями.",
      "when_detected_public": "Обнаружение требует очной оценки врача; бот не должен давать схем лечения.",
      "evidence_tone": "clinical"
    },
    {
      "key": "klebsiella",
      "label": "Klebsiella pneumoniae / oxytoca",
      "group": "pathogenic",
      "reference": "<5 lg копий/мл",
      "role": "Условно-патогенные бактерии; при избытке могут сопровождать выраженный дисбаланс.",
      "when_detected_public": "Повышение лучше обсуждать с врачом, особенно после антибиотиков или при выраженных жалобах.",
      "evidence_tone": "clinical"
    },
    {
      "key": "candida",
      "label": "Candida spp.",
      "group": "pathogenic",
      "reference": "<5 lg копий/мл",
      "role": "Дрожжеподобные грибки, допустимые в малых количествах.",
      "when_detected_public": "Повышение может сопровождать грибковый дисбаланс, но интерпретируется только вместе с симптомами и анамнезом.",
      "evidence_tone": "clinical"
    },
    {
      "key": "staph_aureus",
      "label": "Staphylococcus aureus",
      "group": "pathogenic",
      "reference": "не обнаружено / <5 lg копий/мл",
      "role": "Условно-патогенный микроорганизм.",
      "when_detected_public": "Обнаружение требует врачебной оценки; бот не должен автоматически советовать антибиотики или бактериофаги.",
      "evidence_tone": "clinical"
    },
    {
      "key": "c_difficile",
      "label": "Clostridium difficile",
      "group": "pathogenic",
      "reference": "не обнаружено",
      "role": "Клинически значимый патоген, связанный с антибиотико-ассоциированной диареей и колитом.",
      "when_detected_public": "Это повод рекомендовать очную консультацию врача без затягивания.",
      "evidence_tone": "clinical"
    },
    {
      "key": "c_perfringens",
      "label": "Clostridium perfringens",
      "group": "pathogenic",
      "reference": "не обнаружено / <5 lg копий/мл",
      "role": "Потенциально патогенная клостридия.",
      "when_detected_public": "Обнаружение требует оценки врача в контексте симптомов.",
      "evidence_tone": "clinical"
    },
    {
      "key": "proteus",
      "label": "Proteus vulgaris/mirabilis",
      "group": "pathogenic",
      "reference": "<5 lg копий/мл",
      "role": "Условно-патогенные бактерии.",
      "when_detected_public": "Повышение может сопровождать дисбаланс и требует оценки вместе с жалобами.",
      "evidence_tone": "clinical"
    },
    {
      "key": "citrobacter",
      "label": "Citrobacter spp.",
      "group": "pathogenic",
      "reference": "<5 lg копий/мл",
      "role": "Условно-патогенные бактерии.",
      "when_detected_public": "Повышение лучше обсуждать с врачом, особенно у ослабленных пациентов.",
      "evidence_tone": "clinical"
    },
    {
      "key": "enterobacter",
      "label": "Enterobacter spp.",
      "group": "pathogenic",
      "reference": "<5 lg копий/мл",
      "role": "Условно-патогенные бактерии.",
      "when_detected_public": "Повышение требует клинического контекста и не должно интерпретироваться изолированно.",
      "evidence_tone": "clinical"
    },
    {
      "key": "salmonella",
      "label": "Salmonella spp.",
      "group": "pathogenic",
      "reference": "не обнаружено",
      "role": "Абсолютный патоген.",
      "when_detected_public": "Обнаружение требует обязательной очной оценки врача.",
      "evidence_tone": "clinical"
    },
    {
      "key": "shigella",
      "label": "Shigella spp.",
      "group": "pathogenic",
      "reference": "не обнаружено",
      "role": "Абсолютный патоген.",
      "when_detected_public": "Обнаружение требует обязательной очной оценки врача.",
      "evidence_tone": "clinical"
    },
    {
      "key": "fusobacterium",
      "label": "Fusobacterium nucleatum",
      "group": "pathogenic",
      "reference": "не обнаружено",
      "role": "Анаэробная бактерия, изучаемая как CRC-ассоциированный микробный маркер.",
      "when_detected_public": "Обнаружение — повод обсудить результат с гастроэнтерологом, особенно при симптомах или факторах риска; один маркер сам по себе не означает диагноз.",
      "evidence_tone": "associative"
    },
    {
      "key": "parvimonas",
      "label": "Parvimonas micra",
      "group": "pathogenic",
      "reference": "не обнаружено",
      "role": "Анаэробная бактерия, изучаемая как возможный CRC-ассоциированный микробный маркер.",
      "when_detected_public": "Обнаружение — повод обсудить результат с гастроэнтерологом, особенно при симптомах или факторах риска; нельзя делать вывод о диагнозе по одному этому показателю.",
      "evidence_tone": "associative"
    }
  ]
};

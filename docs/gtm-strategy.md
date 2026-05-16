# Synapse AI — Стратегия вывода на рынок

**Версия:** 1.0
**Дата:** май 2026
**Горизонт:** 12 месяцев

---

## 1. Резюме

Synapse AI — AI-native платформа управления проектами, объединяющая Kanban, Gantt, brainstorm-доску, документы и ИИ-агентов в одно рабочее пространство. Уникальное предложение: пользователь говорит голосом — система сама декомпозирует задачи, выстраивает зависимости, назначает исполнителей и ведёт протоколы встреч.

**Целевая выручка через 12 месяцев:** $50K MRR (примерно 600 платящих команд при ARPU $80).

**Главный конкурентный ров:** связка «voice → ИИ-декомпозиция → готовый план в Kanban+Gantt» за 30 секунд. Notion, Linear, Jira требуют ручной структуризации.

---

## 2. Позиционирование

> **«От голоса до плана проекта за 30 секунд».**
> Synapse AI превращает идею, брейншторм или протокол встречи в готовый структурированный план — без ручного создания задач.

### Categorisation
- **Категория:** AI-native project management.
- **Альтернативы:** Notion AI, Linear, ClickUp, Asana, Motion, Reclaim.
- **Differentiator:** мы не «AI feature на существующем PM», а PM-инструмент, построенный вокруг ИИ с нуля.

### Three core promises
1. **Скорость планирования** — голос/брейншторм → задачи за секунды.
2. **Автоматический оркестратор** — ИИ балансирует нагрузку и зависимости в фоне.
3. **Готовые протоколы** — встречи превращаются в структурированный протокол + извлечённые задачи.

---

## 3. ICP — Ideal Customer Profile

### Primary segment: Стартапы и продуктовые команды 5–25 человек
- **Кто:** Tech-стартапы серии Pre-seed / Seed, продуктовые команды внутри агентств, in-house продуктовые юниты.
- **Боль:** Notion — слишком гибкий и медленный, Jira — overkill, Asana — устарел. PM-таск занимает 30% времени тимлида.
- **Бюджет на софт:** $50–200 / месяц на инструмент управления.
- **Где сидят:** Twitter (X), Product Hunt, Indie Hackers, dev.to, Hacker News, профильные Telegram-чаты.

### Secondary segment: Соло-фаундеры и небольшие digital-агентства (2–5 чел)
- **Кто:** independent makers, фрилансеры с подрядчиками, mini-agencies.
- **Боль:** нет времени структурировать — всё в голове и в Telegram.
- **Бюджет:** $10–30 / месяц.
- **Где сидят:** Indie Hackers, Maker communities, YouTube.

### Tertiary (через 6+ месяцев): Mid-market команды 25–100 человек
- Требуют SSO, admin-controls, аудит-лог (у нас уже есть фундамент).
- Долгий sales cycle, выше LTV.

### Negative ICP (не наш клиент сейчас)
- Enterprise > 500 человек (нужна compliance: SOC 2, ISO 27001).
- Регулируемые отрасли (banking, healthcare, gov) — пока нет нужных сертификатов.
- Команды, требующие 100% on-prem.

---

## 4. Value proposition по сегментам

| Сегмент | Жизненный сценарий | Главное обещание |
|---|---|---|
| Tech-стартап | Запись планёрки → ИИ извлёк 12 задач, разнёс по эпикам, назначил, построил Gantt | «Час работы PM за 2 минуты» |
| Соло-фаундер | Записал голосом 5 идей → готовый Kanban на неделю | «Личный chief-of-staff за $10/мес» |
| Mid-market | Workspace-аналитика, аудит-лог, super-admin панель | «Контроль и прозрачность без бюрократии» |

---

## 5. Цена и упаковка

### Tier-структура

| План | Цена | Лимиты | Целевой сегмент |
|---|---|---|---|
| **Free** | $0 | 1 workspace, до 3 пользователей, 100 задач, 50 AI-операций/мес | Прибор для drive-by-trial |
| **Pro** | $12/user/мес (billed annually $10) | Без лимитов на задачи, 500 AI-операций/мес/user, экспорт | Команды 5–25 |
| **Team** | $24/user/мес ($20 annual) | Pro + workspace-аналитика, кастомные ИИ-промты, приоритетная поддержка | Команды 25–100 |
| **Enterprise** | от $50/user, по запросу | Team + SSO, аудит-лог, SLA, дедикейтед onboarding | 100+ |

### Логика
- **AI-операции** — главный лимит и upsell-крючок. Free даёт почувствовать «магию», но 50 операций кончаются за 2 дня активного использования.
- **Annual discount 17%** стимулирует длинные контракты и улучшает cash flow.
- **Per-user model** — стандарт, конкуренты привыкли (Notion, Linear).
- **Free forever** — критично для PLG-воронки: пользователь приводит команду, потом апгрейдит сам.

### Дополнительные источники монетизации (через 6 мес)
- **AI-credits pack** — $20 за +1000 операций (для команд с нерегулярным пиком).
- **Workspace templates marketplace** — 70/30 share с авторами.

---

## 6. Каналы привлечения

### Канал 1: Product Hunt launch (Day 0)
- **Цель:** Top 5 of the day, 1000+ upvotes, 200 signups.
- **Что нужно:** готовый продукт, демо-видео 60 сек, скриншоты, hunter с большим follower-base, армия первых поддержавших (≥ 50 человек warmed up).
- **Бюджет:** $0 organic + опционально $500 на boosted social.

### Канал 2: Контент-маркетинг (постоянно)
- **Блог Synapse AI:** 2 поста в неделю, темы:
  - «Как мы построили AI-оркестратор задач за 3 месяца» (engineering deep-dive).
  - «5 промтов, которые превратят запись планёрки в готовый план».
  - Сравнения: «Synapse vs Notion AI», «Synapse vs Linear для маленьких команд».
- **SEO target:** «AI project management», «voice to tasks», «meeting to action items», «AI замена Notion».
- **YouTube:** еженедельный 5-минутный туториал.

### Канал 3: Сообщества (warm)
- **Indie Hackers** — еженедельный update в основной ленте.
- **Reddit:** r/SaaS, r/Entrepreneur, r/productivity, r/startups (без спама — отвечаем на вопросы, ссылаемся когда уместно).
- **Twitter/X** — личный build-in-public аккаунт фаундера, daily updates, screenshots, metrics.
- **Telegram-чаты:** русскоязычные продуктовые/индихакерские (Make Sense, ProductSense, Yet Another Closed Chat и пр.).
- **Dev.to / Hashnode** — кросс-постинг блога.

### Канал 4: Партнёрства (через 3 мес)
- **Интеграция-партнёры:** Slack-bot, Telegram-bot, Linear-importer, Notion-importer.
- **Influencer-партнёры:** известные PM-блогеры (Lenny Rachitsky audience, MFM, Product Hunt founders).
- **Бoot-camp партнёрства:** Y Combinator, Techstars, локальные акселераторы — free Team plan на 6 мес для портфельных.

### Канал 5: Платный трафик (через 2 мес, после фикса воронки)
- **Google Ads** — long-tail keywords («ai meeting notes to tasks», «alternative to notion ai»).
- **LinkedIn Ads** — targeting на «Product Manager / Engineering Manager» в командах 10–50.
- **Twitter Ads** — promoted threads.
- **CAC target:** $40 для Pro tier (LTV ≈ $360 → payback < 4 мес).

### Канал 6: Outbound (через 4 мес)
- Personalised cold email to PM/EM of fast-growing startups (post Series A/B).
- Loom-демо в каждом email — показываем именно их workflow.

---

## 7. План запуска (90 дней)

### Месяц 1: Soft launch + content seed
- **Неделя 1:** Beta-программа на 50 ранних пользователей (из Twitter / personal network).
- **Неделя 2:** Сбор 10 кейсов / testimonials.
- **Неделя 3:** Запуск блога — 8 опубликованных постов.
- **Неделя 4:** Demo-видео, landing-page A/B-тесты.
- **KPI к концу месяца:** 200 signups, 20 paying, $200 MRR.

### Месяц 2: Product Hunt + community
- **Неделя 5:** Product Hunt launch (вторник, 00:01 PT).
- **Неделя 6:** Hacker News «Show HN», Indie Hackers feature.
- **Неделя 7:** Запуск referral-программы (даём 1 мес Pro за приведённую команду).
- **Неделя 8:** YouTube-канал старт.
- **KPI:** 1500 signups, 100 paying, $1.5K MRR.

### Месяц 3: Платный трафик + партнёрства
- **Неделя 9:** Google Ads (бюджет $1500), LinkedIn Ads ($1000).
- **Неделя 10:** Первая интеграция (Slack-bot).
- **Неделя 11:** Partnerships outreach — YC, Indie Hackers, Lenny's Newsletter.
- **Неделя 12:** Pricing experiment: A/B на цене Pro $12 vs $15.
- **KPI:** 5K signups, 300 paying, $4K MRR.

---

## 8. Контент-план (первые 90 дней)

### Образовательный контент
1. «Как ИИ-декомпозиция задач увеличивает скорость планирования в 10×» (data-driven).
2. «5 ловушек Notion для растущей команды и как их избежать».
3. «Voice-first project management: будущее уже здесь».

### Сравнительный контент
4. «Synapse AI vs Notion AI: честное сравнение».
5. «Synapse AI vs Linear для команд до 30 человек».
6. «Когда стоит уйти с Jira (и куда)».

### Build-in-public
7. «Как мы выросли с 0 до $5K MRR за 90 дней» (на 90-й день).
8. Weekly metric updates в Twitter (MRR, signups, churn).

### User stories
9. 5 case study от ранних клиентов (стартап / агентство / соло).

### Видео
10. 60-секундный demo для Product Hunt.
11. 5-минутный walkthrough «Создаём проект с нуля голосом».
12. 3-минутный «AI оркестратор в действии».

---

## 9. Метрики и KPI

### North Star
**Weekly Active Paid Workspaces** — workspace считается активным, если в нём 3+ задачи создано за неделю и зашёл ≥1 пользователь.

### Воронка
| Этап | Конверсия (цель) | Метрика-индикатор |
|---|---|---|
| Landing visit → signup | 8% | bounce rate, time on page |
| Signup → activated (создал ≥1 workspace + ≥3 задачи) | 60% | onboarding completion |
| Activated → invited team member | 35% | seats / workspace |
| Activated → paying (после 14-дневного triala) | 12% | conversion event |
| Paid → retained (M2) | 90% | logo retention |
| Paid → expansion (upgrade tier) | 8% / квартал | NRR > 110% |

### Финансовые
- **MRR** — главное число.
- **CAC** по каналам.
- **LTV / CAC ratio** — target > 3.
- **Payback period** — target < 6 мес.
- **Churn** — gross < 5% / мес, net < 0% (то есть expansion перекрывает).

### Health-метрики
- **Activation rate** (% signups, ставших activated за 7 дней).
- **NPS** — измеряем после 30 дней использования.
- **Support response time** — < 4 часа в рабочее время.

---

## 10. Бюджет (12 месяцев)

| Категория | Бюджет ($) | % |
|---|---|---|
| Инфраструктура (Vercel, Supabase, OpenAI, Stripe fees) | $18,000 | 24% |
| Платный трафик (Google, LinkedIn, Twitter, ретаргет) | $24,000 | 32% |
| Контент (1 контент-маркетолог part-time + дизайнер) | $18,000 | 24% |
| Tools (PostHog, Sentry, Slack, Loom, Notion, GA) | $3,600 | 5% |
| Партнёрские/реферальные выплаты | $6,000 | 8% |
| Запас / эксперименты | $5,400 | 7% |
| **Итого** | **$75,000** | 100% |

При CAC $40 и средней Pro-подписке $12/user × 5 users = $60 ARPU/мес:
- $24K paid traffic ÷ $40 CAC = **600 платящих команд** через paid каналы.
- + organic (Product Hunt, content, communities) ≈ ещё 400.
- Total ~1000 платящих команд × $60 = **$60K MRR** к Mo 12 (оптимистично).

---

## 11. Риски и mitigations

| Риск | Вероятность | Mitigation |
|---|---|---|
| OpenAI меняет цены / ограничивает API | Средняя | Multi-provider gateway (Anthropic + OpenAI), мониторим cost / AI op |
| Notion / Linear выкатывают аналогичные voice-first фичи | Высокая | Фокусируемся на скорости итерации + community + AI-оркестратор (более глубокая фича) |
| Не удаётся попасть в Top of PH | Средняя | Plan B — Hacker News «Show HN», IH Featured |
| Высокий churn у Free-tier (никто не апгрейдится) | Средняя | A/B тестируем пейволлы, AI-операции лимит | 
| Юридические / privacy issues (Voice data) | Низкая | Отдельная privacy-страница, opt-out для обработки voice, без хранения raw audio |
| Один super-admin (фаундер) — bus factor | Высокая | Code documentation, runbooks, hiring co-founder в Q2 |
| Стартапы массово сокращаются (recession) | Низкая | Free tier держим щедрым, фокус на solo-founders и agencies (менее cycle-sensitive) |

---

## 12. Что нужно подготовить до запуска (checklist)

### Продукт
- [ ] Onboarding tour (есть, доделать копирайт)
- [ ] Pricing page с calc-калькулятором
- [ ] Status page (status.synapse.ai)
- [ ] Public changelog
- [ ] Documentation / help center
- [ ] Stripe real keys (currently test mode)
- [ ] Sentry DSN в проде
- [ ] PostHog events на key conversion points

### Маркетинг
- [ ] Landing page A/B tests setup
- [ ] Демо-видео 60 сек (для PH)
- [ ] Screenshots для PH gallery
- [ ] Blog setup + первые 8 постов
- [ ] YouTube channel branding
- [ ] Twitter aesthetic (header, pinned tweet)
- [ ] Email-нурчуринг последовательность (6 писем по 14 дням trial)

### Юридика
- [ ] Terms of Service финализированы
- [ ] Privacy Policy финализирована (особенно про AI/voice)
- [ ] GDPR-compliance (data export, deletion)
- [ ] Cookie policy

### Поддержка
- [ ] Intercom / Crisp на сайте
- [ ] FAQ
- [ ] Help center
- [ ] SLA для Pro/Team tier

---

## 13. Год 2 — направления роста

- **API + Public marketplace интеграций** — Zapier, Make, n8n connectors.
- **Mobile app** — iOS / Android (сейчас mobile-web работает, но native — must-have для voice UX).
- **Enterprise** — SOC 2 type II, SSO/SAML, custom AI-models per workspace.
- **Vertical templates** — для product/marketing/engineering команд, free download + lock-in эффект.

---

**Контакт автора стратегии:** akimovsergey.m@gmail.com
**Версия документа:** 1.0 (май 2026)

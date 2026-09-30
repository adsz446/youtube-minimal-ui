// ==UserScript==
// @name         YouTube Minimal UI - Home Only
// @namespace    local.youtube.focus.ui
// @version      12.4.0
// @description  YouTube 홈 피드만 조회수 기준 한 줄 목록으로 정리합니다.
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const ROOT_CLASS = 'yt-focus-minimal';
  const DONE_ATTR = 'data-yt-focus-done';
  const RETRY_ATTR = 'data-yt-focus-retries';

  const CONFIG = Object.freeze({
    MIN_VIEWS: 10000,
    MIN_AGE_FOR_VELOCITY_HOURS: 1,
    AGE_HALF_LIFE_DAYS: 21,

    VELOCITY_WEIGHT: 0.42,
    VIEW_WEIGHT: 0.28,
    LENGTH_WEIGHT: 0.10,
    FRESHNESS_WEIGHT: 0.20,

    TOP_TIER: 0.95,
    IMPORTANT_TIER: 0.80,
    LOW_TIER: 0.20,
    VERY_LOW_TIER: 0.05,

    BASE_WEIGHT: 360,
    IMPORTANT_WEIGHT: 470,
    TOP_WEIGHT: 590,
    LOW_OPACITY: 0.78,
    VERY_LOW_OPACITY: 0.50,

    RETRY_DELAY_MS: 500,
    MAX_RETRIES: 12,
    ROW_HEIGHT: 36
  });

  const CARD_SELECTOR = [
    'ytd-rich-grid-renderer ytd-rich-item-renderer',
    'ytd-rich-grid-renderer ytd-video-renderer',
    'ytd-rich-grid-renderer ytd-grid-video-renderer'
  ].join(',');

  const TITLE_SELECTOR = [
    'a#video-title',
    'a#video-title-link',
    'h3 a',
    'yt-lockup-metadata-view-model a'
  ].join(',');

  const CHANNEL_SELECTOR = [
    'ytd-channel-name a',
    '#channel-name a',
    'yt-content-metadata-view-model a[href^="/@"]'
  ].join(',');

  const AGE_SELECTOR = [
    '#metadata-line span',
    '.inline-metadata-item',
    'yt-content-metadata-view-model span'
  ].join(',');

  const css = `
    html.${ROOT_CLASS} {
      --yt-focus-text: #f1f1f1;
      --yt-focus-muted: #8b8b8b;
      --yt-focus-line: rgba(255,255,255,.085);
      --yt-focus-accent: #f1f1f1;
    }

    html.${ROOT_CLASS} ytd-rich-grid-renderer {
      --ytd-rich-grid-items-per-row: 1 !important;
      --ytd-rich-grid-posts-per-row: 1 !important;
      --ytd-rich-grid-row-margin: 0 !important;
    }

    html.${ROOT_CLASS} ytd-rich-grid-renderer ytd-rich-item-renderer,
    html.${ROOT_CLASS} ytd-rich-grid-renderer ytd-video-renderer,
    html.${ROOT_CLASS} ytd-rich-grid-renderer ytd-grid-video-renderer {
      display: block !important;
      width: 100% !important;
      max-width: none !important;
      height: ${CONFIG.ROW_HEIGHT}px !important;
      min-height: ${CONFIG.ROW_HEIGHT}px !important;
      max-height: ${CONFIG.ROW_HEIGHT}px !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }

    html.${ROOT_CLASS} .yt-focus-filtered {
      display: none !important;
    }

    html.${ROOT_CLASS} ytd-thumbnail,
    html.${ROOT_CLASS} yt-thumbnail-view-model,
    html.${ROOT_CLASS} .yt-thumbnail-container {
      display: none !important;
    }

    html.${ROOT_CLASS} .yt-focus-row {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) 70px minmax(90px, .20fr) !important;
      align-items: center !important;
      width: 100% !important;
      height: ${CONFIG.ROW_HEIGHT}px !important;
      box-sizing: border-box !important;
      padding: 8px 12px !important;
      border-bottom: 1px solid var(--yt-focus-line) !important;
      font-size: 13px !important;
      line-height: 20px !important;
      transition: background .18s ease !important;
    }

    html.${ROOT_CLASS} .yt-focus-row:hover {
      background: rgba(255,255,255,.055) !important;
    }

    html.${ROOT_CLASS} .yt-focus-title {
      grid-column: 1 !important;
      min-width: 0 !important;
      height: 20px !important;
      overflow: hidden !important;
      color: var(--yt-focus-text) !important;
      white-space: nowrap !important;
      text-overflow: ellipsis !important;
      font-size: 13px !important;
      line-height: 20px !important;
      font-weight: var(--yt-focus-weight, ${CONFIG.BASE_WEIGHT}) !important;
      letter-spacing: -.012em !important;
      opacity: var(--yt-focus-opacity, 1) !important;
      transition: font-weight .3s ease, opacity .3s ease !important;
    }

    html.${ROOT_CLASS} .yt-focus-title a {
      color: inherit !important;
      text-decoration: none !important;
    }

    html.${ROOT_CLASS} .yt-focus-age {
      grid-column: 2 !important;
      width: 70px !important;
      height: 20px !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      padding-right: 10px !important;
      color: var(--yt-focus-muted) !important;
      white-space: nowrap !important;
      text-overflow: ellipsis !important;
      text-align: right !important;
      font-size: 11px !important;
      line-height: 20px !important;
      opacity: .66 !important;
    }

    html.${ROOT_CLASS} .yt-focus-today {
      color: var(--yt-focus-accent) !important;
      opacity: .94 !important;
    }

    html.${ROOT_CLASS} .yt-focus-channel {
      grid-column: 3 !important;
      min-width: 0 !important;
      height: 20px !important;
      overflow: hidden !important;
      padding-left: 10px !important;
      color: var(--yt-focus-muted) !important;
      white-space: nowrap !important;
      text-overflow: ellipsis !important;
      font-size: 11px !important;
      line-height: 20px !important;
      opacity: .62 !important;
    }

    html.${ROOT_CLASS} .yt-focus-channel a {
      color: inherit !important;
      text-decoration: none !important;
    }
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.documentElement.appendChild(style);

  function isHomePage() {
    return (
      location.hostname === 'www.youtube.com' &&
      location.pathname === '/'
    );
  }

  const cleanText = value =>
    String(value || '').replace(/\s+/g, ' ').trim();

  const clamp01 = value =>
    Math.max(0, Math.min(1, value));

  const removeDubText = value =>
    cleanText(value)
      .replace(/자동\s*더빙/gi, '')
      .replace(/auto[-\s]?dubbed/gi, '')
      .trim();

  function percentile(values, value) {
    const sorted = values
      .filter(Number.isFinite)
      .slice()
      .sort((a, b) => a - b);

    if (sorted.length < 2) return 0.5;

    let low = 0;
    let high = sorted.length;

    while (low < high) {
      const middle = (low + high) >> 1;

      if (sorted[middle] <= value) low = middle + 1;
      else high = middle;
    }

    return clamp01((low - 1) / (sorted.length - 1));
  }

  function parseViews(raw) {
    const value = cleanText(raw)
      .replace(/조회수/g, '')
      .replace(/views?/gi, '')
      .replace(/,/g, '');

    if (!value) return null;

    const match = value.match(/([\d.]+)\s*(억|만|천|[KMB])/i);

    if (match) {
      const number = parseFloat(match[1]);
      const unit = match[2].toLowerCase();

      const factor = {
        억: 1e8,
        만: 1e4,
        천: 1e3,
        k: 1e3,
        m: 1e6,
        b: 1e9
      }[unit];

      return Number.isFinite(number) && factor
        ? Math.round(number * factor)
        : null;
    }

    const number = parseFloat(value.match(/[\d.]+/)?.[0]);

    return Number.isFinite(number) ? Math.round(number) : null;
  }

  function parseDuration(raw) {
    const value = cleanText(raw).replace(/,/g, '');

    let match = value.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);

    if (match) {
      return (
        (match[1] ? Number(match[1]) * 3600 : 0) +
        Number(match[2]) * 60 +
        Number(match[3])
      );
    }

    match = value.match(
      /(?:(\d+)\s*시간)?\s*(?:(\d+)\s*분)?\s*(?:(\d+)\s*초)?/
    );

    return match && (match[1] || match[2] || match[3])
      ? (Number(match[1]) || 0) * 3600 +
        (Number(match[2]) || 0) * 60 +
        (Number(match[3]) || 0)
      : null;
  }

  function getDuration(card) {
    const selector = [
      '#text.ytd-thumbnail-overlay-time-status-renderer',
      'ytd-thumbnail-overlay-time-status-renderer span',
      'badge-shape .yt-badge-shape__text',
      '[aria-label*="분"]',
      '[aria-label*="시간"]',
      '[aria-label*="minute"]',
      '[aria-label*="hour"]'
    ].join(',');

    for (const node of card.querySelectorAll(selector)) {
      for (const candidate of [
        node.textContent,
        node.getAttribute('aria-label'),
        node.getAttribute('title')
      ]) {
        const duration = parseDuration(candidate);

        if (duration !== null) return duration;
      }
    }

    return null;
  }

  function parseAge(raw) {
    const value = cleanText(raw)
      .replace(/게시됨/g, '')
      .replace(/전$/g, '')
      .trim();

    if (!value) return null;

    const short =
      value.match(/(\d+)\s*(초|분|시간)\s*전?$/) ||
      value.match(
        /\b(\d+)\s*(second|seconds|sec|secs|minute|minutes|min|mins|hour|hours|hr|hrs)\b/i
      );

    if (short) {
      const number = Number(short[1]);
      const unit = short[2].toLowerCase();

      const hours =
        unit === '시간' || unit.startsWith('hour') || unit.startsWith('hr')
          ? number
          : unit === '분' || unit.startsWith('min')
            ? number / 60
            : number / 3600;

      return {
        label: '오늘',
        days: hours / 24,
        hours,
        isToday: true
      };
    }

    const patterns = [
      [/([\d]+)\s*일/, 1, '일'],
      [/([\d]+)\s*주/, 7, '주'],
      [/([\d]+)\s*(?:개월|달)/, 30.4375, '달'],
      [/([\d]+)\s*년/, 365.25, '년'],
      [/([\d]+)\s*d\b/i, 1, '일'],
      [/([\d]+)\s*w\b/i, 7, '주'],
      [/([\d]+)\s*mo\b/i, 30.4375, '달'],
      [/([\d]+)\s*y\b/i, 365.25, '년']
    ];

    for (const [regex, multiplier, unit] of patterns) {
      const match = value.match(regex);

      if (!match) continue;

      const number = Number(match[1]);
      const days = number * multiplier;

      return {
        label: number === 1 && unit === '일'
          ? '어제'
          : `${number}${unit}`,
        days,
        hours: days * 24,
        isToday: false
      };
    }

    return null;
  }

  function getAgeSource(card) {
    for (const node of card.querySelectorAll(AGE_SELECTOR)) {
      const age = parseAge(node.textContent);

      if (age) return { age };
    }

    return { age: null };
  }

  function getVideoType(card) {
    if (card.querySelector('a[href*="/shorts/"]')) return null;

    for (const link of card.querySelectorAll('a[href]')) {
      const href = link.getAttribute('href') || '';

      if (
        href.includes('/playlist?') ||
        href.includes('?list=') ||
        href.includes('&list=')
      ) {
        return null;
      }

      if (href.includes('/watch?')) {
        try {
          const url = new URL(href, location.origin);

          if (
            url.pathname === '/watch' &&
            url.searchParams.has('v')
          ) {
            return 'video';
          }
        } catch {}
      }
    }

    return null;
  }

  function isLiveVideo(card) {
    if (
      card.querySelector(
        '[overlay-style="LIVE"], [overlay-style="live"], [is-live-video]'
      )
    ) {
      return true;
    }

    return Array.from(card.querySelectorAll('[aria-label], [title]'))
      .some(node => {
        const value = cleanText(
          [
            node.getAttribute('aria-label'),
            node.getAttribute('title')
          ].filter(Boolean).join(' ')
        );

        return /\b(LIVE|라이브|생방송)\b/i.test(value);
      });
  }

  function getTitle(card) {
    const source = card.querySelector(TITLE_SELECTOR);

    return {
      text: removeDubText(source?.textContent || ''),
      href: source?.href || ''
    };
  }

  function getChannel(card) {
    const source = card.querySelector(CHANNEL_SELECTOR);

    if (source) {
      return {
        text: removeDubText(source.textContent),
        href: source.href || ''
      };
    }

    const fallback = card.querySelector(
      'ytd-channel-name, #channel-name'
    );

    return {
      text: removeDubText(fallback?.textContent || ''),
      href: ''
    };
  }

  function createCell(className, text = '') {
    const element = document.createElement('div');

    element.className = className;
    element.textContent = text;

    return element;
  }

  function createTitleElement(title) {
    const element = createCell('yt-focus-title');

    if (title.href) {
      const link = document.createElement('a');

      link.href = title.href;
      link.textContent = title.text;

      element.appendChild(link);
    } else {
      element.textContent = title.text;
    }

    return element;
  }

  function createChannelElement(channel) {
    const element = createCell('yt-focus-channel');

    if (channel.href) {
      const link = document.createElement('a');

      link.href = channel.href;
      link.textContent = channel.text;

      element.appendChild(link);
    } else {
      element.textContent = channel.text;
    }

    return element;
  }

  function getLengthSignal(seconds) {
    if (seconds === null) return 0.5;

    const minutes = seconds / 60;

    return clamp01(
      0.20 + 0.80 * (1 - Math.exp(-minutes / 10))
    );
  }

  function getSignals(views, age, duration) {
    const days = Math.max(
      age.days,
      CONFIG.MIN_AGE_FOR_VELOCITY_HOURS / 24
    );

    const viewsPerDay = views / days;

    return {
      velocity: Math.log1p(viewsPerDay),
      views: Math.log1p(views),
      freshness: Math.exp(-age.days / CONFIG.AGE_HALF_LIFE_DAYS),
      length: getLengthSignal(duration)
    };
  }

  function recalculate() {
    if (!isHomePage()) return;

    const rows = Array.from(
      document.querySelectorAll('.yt-focus-row[data-analyzed]')
    );

    if (!rows.length) return;

    const data = rows.map(row => ({
      row,
      velocity: Number(row.dataset.velocity),
      views: Number(row.dataset.viewsLog),
      freshness: Number(row.dataset.freshness),
      length: Number(row.dataset.length)
    }));

    const velocityValues = data.map(item => item.velocity);
    const viewValues = data.map(item => item.views);
    const freshnessValues = data.map(item => item.freshness);
    const lengthValues = data.map(item => item.length);

    const scores = data.map(item => {
      const score =
        CONFIG.VELOCITY_WEIGHT *
          percentile(velocityValues, item.velocity) +
        CONFIG.VIEW_WEIGHT *
          percentile(viewValues, item.views) +
        CONFIG.LENGTH_WEIGHT *
          percentile(lengthValues, item.length) +
        CONFIG.FRESHNESS_WEIGHT *
          percentile(freshnessValues, item.freshness);

      item.score = score;

      return score;
    });

    for (const item of data) {
      const p = percentile(scores, item.score);

      let weight = CONFIG.BASE_WEIGHT;
      let opacity = 1;

      if (p >= CONFIG.TOP_TIER) {
        const t = clamp01(
          (p - CONFIG.TOP_TIER) /
            (1 - CONFIG.TOP_TIER)
        );

        weight =
          CONFIG.IMPORTANT_WEIGHT +
          (CONFIG.TOP_WEIGHT - CONFIG.IMPORTANT_WEIGHT) * t;
      } else if (p >= CONFIG.IMPORTANT_TIER) {
        const t = clamp01(
          (p - CONFIG.IMPORTANT_TIER) /
            (CONFIG.TOP_TIER - CONFIG.IMPORTANT_TIER)
        );

        weight =
          CONFIG.BASE_WEIGHT +
          (CONFIG.IMPORTANT_WEIGHT - CONFIG.BASE_WEIGHT) * t;
      } else if (p < CONFIG.VERY_LOW_TIER) {
        const t = clamp01(p / CONFIG.VERY_LOW_TIER);

        opacity =
          CONFIG.VERY_LOW_OPACITY +
          (CONFIG.LOW_OPACITY - CONFIG.VERY_LOW_OPACITY) * t;
      } else if (p < CONFIG.LOW_TIER) {
        const t = clamp01(
          (p - CONFIG.VERY_LOW_TIER) /
            (CONFIG.LOW_TIER - CONFIG.VERY_LOW_TIER)
        );

        opacity =
          CONFIG.LOW_OPACITY +
          (1 - CONFIG.LOW_OPACITY) * t;
      }

      item.row.style.setProperty(
        '--yt-focus-weight',
        String(Math.round(weight))
      );

      item.row.style.setProperty(
        '--yt-focus-opacity',
        opacity.toFixed(3)
      );
    }
  }

  function render(card, title, age, channel, signals) {
    let row = card.querySelector('.yt-focus-row');

    if (!row) {
      row = document.createElement('div');
      row.className = 'yt-focus-row';

      card.prepend(row);
    }

    row.dataset.analyzed = '1';
    row.dataset.velocity = signals.velocity;
    row.dataset.viewsLog = signals.views;
    row.dataset.freshness = signals.freshness;
    row.dataset.length = signals.length;

    const ageElement = createCell(
      'yt-focus-age',
      age.label
    );

    if (age.isToday) {
      ageElement.classList.add('yt-focus-today');
    }

    row.replaceChildren(
      createTitleElement(title),
      ageElement,
      createChannelElement(channel)
    );
  }

  function finish(card) {
    card.setAttribute(DONE_ATTR, '1');
  }

  function classify(card) {
    if (!isHomePage()) return;
    if (!card || card.getAttribute(DONE_ATTR) === '1') return;

    if (getVideoType(card) === null || isLiveVideo(card)) {
      finish(card);
      return;
    }

    const views = parseViews(card.textContent);
    const age = getAgeSource(card).age;

    if (views === null || age === null) {
      const retries = Number(
        card.getAttribute(RETRY_ATTR) || 0
      );

      if (retries < CONFIG.MAX_RETRIES) {
        card.setAttribute(
          RETRY_ATTR,
          String(retries + 1)
        );

        window.setTimeout(
          () => classify(card),
          CONFIG.RETRY_DELAY_MS
        );
      }

      return;
    }

    if (views < CONFIG.MIN_VIEWS) {
      card.classList.add('yt-focus-filtered');
      finish(card);
      return;
    }

    finish(card);

    render(
      card,
      getTitle(card),
      age,
      getChannel(card),
      getSignals(views, age, getDuration(card))
    );
  }

  function resetHomeTransform() {
    document.documentElement.classList.remove(ROOT_CLASS);

    document.querySelectorAll(
      `${CARD_SELECTOR}[${DONE_ATTR}]`
    ).forEach(card => {
      card.removeAttribute(DONE_ATTR);
      card.removeAttribute(RETRY_ATTR);
      card.classList.remove('yt-focus-filtered');

      const row = card.querySelector('.yt-focus-row');

      if (row) {
        row.remove();
      }

      card.style.removeProperty('--yt-focus-weight');
      card.style.removeProperty('--yt-focus-opacity');
    });
  }

  function scan(root = document) {
    if (!isHomePage()) return;

    if (
      root.nodeType === Node.ELEMENT_NODE &&
      root.matches?.(CARD_SELECTOR)
    ) {
      classify(root);
    }

    root.querySelectorAll?.(CARD_SELECTOR).forEach(classify);
  }

  let queued = false;

  function queueScan(delay = 0) {
    if (queued) return;

    queued = true;

    const run = () => {
      queued = false;

      if (!isHomePage()) {
        resetHomeTransform();
        return;
      }

      document.documentElement.classList.add(ROOT_CLASS);

      scan(document);
      recalculate();
    };

    if (delay > 0) {
      window.setTimeout(run, delay);
    } else {
      requestAnimationFrame(run);
    }
  }

  const observer = new MutationObserver(mutations => {
    if (!isHomePage()) return;

    const hasAddedNodes = mutations.some(
      mutation =>
        mutation.type === 'childList' &&
        mutation.addedNodes.length
    );

    if (hasAddedNodes) {
      queueScan();
    }
  });

  function start() {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    queueScan();
  }

  window.addEventListener(
    'yt-navigate-finish',
    () => queueScan(250)
  );

  window.addEventListener(
    'popstate',
    () => queueScan(320)
  );

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      start,
      { once: true }
    );
  } else {
    start();
  }
})();
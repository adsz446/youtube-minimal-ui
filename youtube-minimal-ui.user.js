// ==UserScript==
// @name         YouTube Focus UI - Home Only
// @namespace    local.youtube.focus.ui
// @version      13.1.0
// @description  홈 영상을 채널 이미지와 제목, 채널명·업로드 시점·만 단위 조회수 목록으로 표시.
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const ROOT_CLASS = 'yt-focus-minimal';
  const PROCESSED = 'yt-focus-processed';
  const FILTERED = 'yt-focus-filtered';

  const CONFIG = Object.freeze({
    MIN_VIEWS: 10000,
    ROW_HEIGHT: 60,
    AVATAR_SIZE: 40,
    RESCAN_INTERVAL_MS: 1000
  });

  const CARD_SELECTOR = [
    'ytd-rich-grid-renderer ytd-rich-item-renderer',
    'ytd-rich-grid-renderer ytd-video-renderer',
    'ytd-rich-grid-renderer ytd-grid-video-renderer'
  ].join(',');

  const TITLE_SELECTOR = [
    'a#video-title',
    'a#video-title-link',
    'h3 a[href*="/watch?"]',
    'yt-lockup-metadata-view-model a[href*="/watch?"]'
  ].join(',');

  const CHANNEL_SELECTOR = [
    'ytd-channel-name a',
    '#channel-name a',
    'yt-content-metadata-view-model a[href*="/@"]',
    'yt-content-metadata-view-model a[href*="/channel/"]',
    'yt-content-metadata-view-model a[href*="/c/"]',
    'yt-content-metadata-view-model a[href*="/user/"]'
  ].join(',');

  const META_SELECTOR = [
    '#metadata-line span',
    '.inline-metadata-item',
    'yt-content-metadata-view-model .yt-content-metadata-view-model__metadata-text',
    'yt-content-metadata-view-model span'
  ].join(',');

  const AVATAR_SELECTOR = [
    'a#avatar-link img',
    '#avatar img',
    'yt-avatar-shape img',
    'yt-decorated-avatar-view-model img',
    'yt-avatar-view-model img',
    'a[href*="/@"] img',
    'a[href*="/channel/"] img'
  ].join(',');

  const css = `
    html.${ROOT_CLASS} {
      --focus-text: var(--yt-spec-text-primary, #f1f1f1);
      --focus-muted: var(--yt-spec-text-secondary, #aaa);
      --focus-line: var(--yt-spec-10-percent-layer, rgba(128,128,128,.18));
      --focus-hover: var(--yt-spec-badge-chip-background, rgba(128,128,128,.10));
    }

    html.${ROOT_CLASS} ytd-rich-grid-renderer {
      --ytd-rich-grid-items-per-row: 1 !important;
      --ytd-rich-grid-posts-per-row: 1 !important;
      --ytd-rich-grid-row-margin: 0 !important;
    }

    html.${ROOT_CLASS} ytd-rich-grid-renderer ytd-rich-item-renderer {
      width: 100% !important;
      max-width: none !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
    }

    html.${ROOT_CLASS} .${PROCESSED} {
      display: block !important;
      width: 100% !important;
      max-width: none !important;
      height: ${CONFIG.ROW_HEIGHT}px !important;
      min-height: ${CONFIG.ROW_HEIGHT}px !important;
      max-height: ${CONFIG.ROW_HEIGHT}px !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
    }

    html.${ROOT_CLASS} .${PROCESSED} > :not(.yt-focus-row) {
      display: none !important;
    }

    html.${ROOT_CLASS} .${FILTERED} {
      display: none !important;
    }

    .yt-focus-row {
      display: none;
    }

    html.${ROOT_CLASS} .yt-focus-row {
      display: grid !important;
      grid-template-columns: ${CONFIG.AVATAR_SIZE}px minmax(0,1fr) !important;
      column-gap: 12px !important;
      align-items: center !important;
      height: ${CONFIG.ROW_HEIGHT}px !important;
      width: 100% !important;
      box-sizing: border-box !important;
      padding: 9px 12px !important;
      border-bottom: 1px solid var(--focus-line) !important;
      text-align: left !important;
    }

    html.${ROOT_CLASS} .yt-focus-row:hover {
      background: var(--focus-hover) !important;
    }

    html.${ROOT_CLASS} .yt-focus-avatar {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: ${CONFIG.AVATAR_SIZE}px !important;
      height: ${CONFIG.AVATAR_SIZE}px !important;
      overflow: hidden !important;
      border-radius: 50% !important;
      background: var(--focus-hover) !important;
      color: var(--focus-muted) !important;
      text-decoration: none !important;
      font-size: 16px !important;
      font-weight: 400 !important;
    }

    html.${ROOT_CLASS} .yt-focus-avatar img {
      display: block !important;
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      border-radius: inherit !important;
    }

    html.${ROOT_CLASS} .yt-focus-content {
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      gap: 2px !important;
      min-width: 0 !important;
      height: ${CONFIG.AVATAR_SIZE}px !important;
      text-align: left !important;
    }

    html.${ROOT_CLASS} .yt-focus-title {
      display: block !important;
      height: 22px !important;
      min-width: 0 !important;
      overflow: hidden !important;
      color: var(--focus-text) !important;
      font-size: 14px !important;
      line-height: 22px !important;
      font-weight: 400 !important;
      white-space: nowrap !important;
      text-overflow: ellipsis !important;
      opacity: 1 !important;
      text-decoration: none !important;
    }

    html.${ROOT_CLASS} .yt-focus-meta {
      display: flex !important;
      align-items: center !important;
      justify-content: flex-start !important;
      gap: 6px !important;
      min-width: 0 !important;
      height: 16px !important;
      overflow: hidden !important;
      color: var(--focus-muted) !important;
      font-size: 12px !important;
      line-height: 16px !important;
      font-weight: 400 !important;
      white-space: nowrap !important;
      opacity: 1 !important;
    }

    html.${ROOT_CLASS} .yt-focus-channel {
      flex: 0 1 auto !important;
      min-width: 0 !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      color: inherit !important;
      text-decoration: none !important;
      font: inherit !important;
    }

    html.${ROOT_CLASS} .yt-focus-age,
    html.${ROOT_CLASS} .yt-focus-views,
    html.${ROOT_CLASS} .yt-focus-separator {
      flex: 0 0 auto !important;
      color: inherit !important;
      font: inherit !important;
    }

    html.${ROOT_CLASS} a.yt-focus-title:hover,
    html.${ROOT_CLASS} a.yt-focus-channel:hover {
      text-decoration: underline !important;
    }
  `;

  const style = document.createElement('style');
  style.textContent = css;

  const states = new WeakMap();
  const failedImages = new Map();

  const clean = value =>
    String(value || '').replace(/\s+/g, ' ').trim();

  const cleanName = value =>
    clean(value)
      .replace(/자동\s*더빙/gi, '')
      .replace(/auto[-\s]?dubbed/gi, '')
      .trim();

  function isHome() {
    return (
      location.hostname === 'www.youtube.com' &&
      location.pathname === '/'
    );
  }

  function nodes(card, selector) {
    return Array.from(card.querySelectorAll(selector))
      .filter(node => !node.closest('.yt-focus-row'));
  }

  function textOf(value) {
    if (typeof value === 'string') return clean(value);
    if (!value || typeof value !== 'object') return '';

    return clean(
      value.simpleText ||
      value.content ||
      value.runs?.map(run => run.text || '').join('') ||
      ''
    );
  }

  function dataRoots(card) {
    const elements = [
      card,
      ...nodes(
        card,
        'ytd-rich-grid-media, ytd-video-renderer, ' +
        'ytd-grid-video-renderer, yt-lockup-view-model'
      )
    ];

    const roots = [];

    for (const element of elements) {
      for (const data of [
        element.data,
        element.__data?.data,
        element.__data?.renderer
      ]) {
        if (data && typeof data === 'object') roots.push(data);
      }
    }

    return roots;
  }

  function collectData(card) {
    const result = {
      views: [],
      ages: [],
      avatars: []
    };

    const seen = new WeakSet();
    let budget = 1200;

    function walk(value, depth = 0, avatarContext = false) {
      if (!value || typeof value !== 'object') return;
      if (depth > 12 || budget-- <= 0 || seen.has(value)) return;
      seen.add(value);

      if (Array.isArray(value)) {
        for (const item of value) walk(item, depth + 1, avatarContext);
        return;
      }

      if (avatarContext && typeof value.url === 'string') {
        result.avatars.push({
          url: value.url,
          width: Number(value.width) || 0
        });
      }

      for (const [key, child] of Object.entries(value)) {
        if (/^(viewCountText|shortViewCountText|viewCount)$/.test(key)) {
          const text = textOf(child);
          if (text) result.views.push(text);
        }

        if (/^(publishedTimeText|publishTimeText)$/.test(key)) {
          const text = textOf(child);
          if (text) result.ages.push(text);
        }

        const isAvatar = avatarContext ||
          /channelThumbnail|channelAvatar|avatar|decoratedAvatar/i.test(key);

        if (child && typeof child === 'object') {
          walk(child, depth + 1, isAvatar);
        } else if (
          isAvatar &&
          typeof child === 'string' &&
          /^(?:https?:)?\/\//.test(child) &&
          /url|src/i.test(key)
        ) {
          result.avatars.push({ url: child, width: 0 });
        }
      }
    }

    for (const root of dataRoots(card)) walk(root);
    return result;
  }

  function parseViews(raw, allowPlain = false) {
    const text = clean(raw).replace(/,/g, '');

    if (/조회수\s*없음|no views/i.test(text)) return 0;

    const match =
      text.match(
        /조회수\s*(\d+(?:\.\d+)?)\s*(억|만|천|[KMB])?/i
      ) ||
      text.match(
        /(\d+(?:\.\d+)?)\s*(억|만|천|[KMB])?\s*(?:회|views?)\b/i
      ) ||
      text.match(
        /^(\d+(?:\.\d+)?)\s*(억|만|천|[KMB])\s*(?:회|views?)?$/i
      ) ||
      (allowPlain
        ? text.match(/^(\d+(?:\.\d+)?)\s*(억|만|천|[KMB])?$/i)
        : null);

    if (!match) return null;

    const factor = {
      '': 1,
      억: 1e8,
      만: 1e4,
      천: 1e3,
      k: 1e3,
      m: 1e6,
      b: 1e9
    }[(match[2] || '').toLowerCase()];

    const value = Number(match[1]) * factor;
    return Number.isFinite(value) ? Math.round(value) : null;
  }

  function getViews(card, data) {
    // 内部の viewCountText を優先し、視聴中人数との混同を避ける。
    for (const text of data.views) {
      const value = parseViews(text, true);
      if (value !== null) return value;
    }

    for (const node of nodes(card, META_SELECTOR)) {
      const text = clean(node.textContent);
      if (/視聴中|視聴者|시청 중|시청중|watching|viewers/i.test(text)) continue;

      const value = parseViews(text, true);
      if (value !== null) return value;
    }

    for (const node of nodes(card, '[aria-label]')) {
      const value = parseViews(node.getAttribute('aria-label'));
      if (value !== null) return value;
    }

    return null;
  }

  function parseAge(raw) {
    const text = clean(raw);

    const korean = text.match(
      /(\d+)\s*(초|분|시간|일|주|개월|달|년)\s*전/
    );

    if (korean) {
      const unit = korean[2] === '달' ? '개월' : korean[2];
      return `${Number(korean[1])}${unit} 전`;
    }

    const english = text.match(
      /\b(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|weeks?|months?|years?)\s+ago\b/i
    );

    if (english) {
      const unit = english[2].toLowerCase();
      const label =
        /^(second|sec)/.test(unit) ? '초' :
        /^(minute|min)/.test(unit) ? '분' :
        /^(hour|hr)/.test(unit) ? '시간' :
        /^day/.test(unit) ? '일' :
        /^week/.test(unit) ? '주' :
        /^month/.test(unit) ? '개월' : '년';

      return `${Number(english[1])}${label} 전`;
    }

    if (/^(오늘|today)$/i.test(text)) return '오늘';
    if (/^(어제|yesterday)$/i.test(text)) return '어제';

    return '';
  }

  function getAge(card, data) {
    const candidates = [
      ...data.ages,
      ...nodes(card, META_SELECTOR).map(node => node.textContent),
      ...nodes(card, TITLE_SELECTOR).map(node =>
        node.getAttribute('aria-label')
      )
    ];

    for (const candidate of candidates) {
      const age = parseAge(candidate);
      if (age) return age;
    }

    return '';
  }

  function getTitle(card) {
    for (const source of nodes(card, TITLE_SELECTOR)) {
      const text = cleanName(
        source.textContent || source.getAttribute('title')
      );

      if (!text || !source.href) continue;

      try {
        const url = new URL(source.href, location.origin);
        if (url.pathname !== '/watch' || !url.searchParams.has('v')) continue;

        return {
          text,
          href: url.href,
          id: url.searchParams.get('v')
        };
      } catch {}
    }

    return null;
  }

  function getChannel(card) {
    const source = nodes(card, CHANNEL_SELECTOR)
      .find(node => clean(node.textContent));

    const fallback = nodes(
      card,
      'ytd-channel-name, #channel-name'
    )[0];

    return {
      text: cleanName(source?.textContent || fallback?.textContent),
      href: source?.href || ''
    };
  }

  function normalizeImage(raw) {
    if (!raw || /^(data:|blob:)/i.test(raw)) return '';

    try {
      const url = new URL(raw, location.origin);
      if (!/^https?:$/.test(url.protocol)) return '';
      return url.href;
    } catch {
      return '';
    }
  }

  function getAvatar(card, data) {
    const candidates = [];

    for (const image of nodes(card, AVATAR_SELECTOR)) {
      candidates.push(
        image.currentSrc,
        image.getAttribute('src'),
        image.getAttribute('data-src'),
        image.getAttribute('data-thumb')
      );

      const srcset = image.getAttribute('srcset');
      if (srcset) {
        for (const entry of srcset.split(',')) {
          candidates.push(entry.trim().split(/\s+/)[0]);
        }
      }
    }

    candidates.push(
      ...data.avatars
        .sort((a, b) => b.width - a.width)
        .map(item => item.url)
    );

    for (const candidate of candidates) {
      const url = normalizeImage(candidate);
      if (!url) continue;

      const failedAt = failedImages.get(url);
      if (failedAt && Date.now() - failedAt < 60000) continue;

      return url;
    }

    return '';
  }

  function isLive(card) {
    return nodes(
      card,
      '[overlay-style="LIVE"], [overlay-style="live"], [is-live-video]'
    ).length > 0 ||
      nodes(card, 'ytd-badge-supported-renderer, badge-shape')
        .some(node => /라이브|생방송|\bLIVE\b/i.test(node.textContent));
  }

  function element(tag, className, text = '') {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  }

  function render(card, info, state) {
    const row = element('div', 'yt-focus-row');

    const avatar = element(
      info.channel.href ? 'a' : 'div',
      'yt-focus-avatar'
    );

    if (info.channel.href) avatar.href = info.channel.href;
    avatar.title = info.channel.text;
    avatar.setAttribute('aria-label', info.channel.text || '채널');

    const fallback = () => {
      avatar.textContent = Array.from(info.channel.text || '?')[0];
    };

    if (info.avatar) {
      const image = document.createElement('img');
      image.alt = '';
      image.decoding = 'async';

      // 元画像の lazy loading に依存せず、この画像は即時読み込み。
      image.loading = 'eager';

      image.addEventListener('error', () => {
        failedImages.set(info.avatar, Date.now());
        fallback();

        if (states.get(card) === state) {
          state.signature = '';
          scheduleScan(100);
        }
      }, { once: true });

      image.src = info.avatar;
      avatar.append(image);
    } else {
      fallback();
    }

    const content = element('div', 'yt-focus-content');
    const title = element('a', 'yt-focus-title', info.title.text);
    title.href = info.title.href;
    title.title = info.title.text;

    const meta = element('div', 'yt-focus-meta');
    const parts = [];

    if (info.channel.text) {
      const channel = element(
        info.channel.href ? 'a' : 'span',
        'yt-focus-channel',
        info.channel.text
      );

      if (info.channel.href) channel.href = info.channel.href;
      channel.title = info.channel.text;
      parts.push(channel);
    }

    parts.push(
      element('span', 'yt-focus-age', info.age),
      element(
        'span',
        'yt-focus-views',
        info.views === null
          ? '조회수 확인 중'
          : `${Math.round(info.views / 10000)}만`
      )
    );

    parts.forEach((part, index) => {
      if (index) meta.append(element('span', 'yt-focus-separator', '·'));
      meta.append(part);
    });

    content.append(title, meta);
    row.append(avatar, content);

    card.querySelector(':scope > .yt-focus-row')?.remove();
    card.prepend(row);
    card.classList.add(PROCESSED);
  }

  function processCard(card) {
    if (!card.isConnected || !isHome()) return;
    if (card.parentElement?.closest(CARD_SELECTOR)) return;

    const title = getTitle(card);
    if (!title) return;

    let state = states.get(card);

    // YouTube が既存カードを別動画に再利用した場合も再処理。
    if (!state || state.id !== title.id) {
      card.classList.remove(PROCESSED, FILTERED);
      card.querySelector(':scope > .yt-focus-row')?.remove();

      state = {
        id: title.id,
        signature: ''
      };

      states.set(card, state);
    }

    const data = collectData(card);
    const views = getViews(card, data);

    if (views !== null && views < CONFIG.MIN_VIEWS) {
      card.classList.add(FILTERED);
      state.signature = '';
      return;
    }

    card.classList.remove(FILTERED);

    const channel = getChannel(card);
    const age = getAge(card, data) ||
      (isLive(card) ? 'ライブ配信中'.replace('ライブ配信中', '라이브 중') : '업로드 시점 확인 중');

    const avatar = getAvatar(card, data);

    const signature = JSON.stringify([
      title.text,
      title.href,
      channel.text,
      channel.href,
      views,
      age,
      avatar
    ]);

    if (
      state.signature === signature &&
      card.querySelector(':scope > .yt-focus-row')
    ) {
      return;
    }

    state.signature = signature;

    render(card, {
      title,
      channel,
      views,
      age,
      avatar
    }, state);
  }

  function reset() {
    document.documentElement?.classList.remove(ROOT_CLASS);

    document.querySelectorAll(
      `.${PROCESSED}, .${FILTERED}`
    ).forEach(card => {
      card.classList.remove(PROCESSED, FILTERED);
      card.querySelector(':scope > .yt-focus-row')?.remove();
      states.delete(card);
    });
  }

  function scan() {
    if (!document.documentElement) return;

    if (!style.isConnected) document.documentElement.append(style);

    if (!isHome()) {
      reset();
      return;
    }

    document.documentElement.classList.add(ROOT_CLASS);

    document.querySelectorAll(CARD_SELECTOR).forEach(card => {
      try {
        processCard(card);
      } catch (error) {
        console.debug('[YouTube Focus UI]', error);
      }
    });
  }

  let scanTimer = 0;

  function scheduleScan(delay = 80) {
    if (scanTimer) return;

    scanTimer = window.setTimeout(() => {
      scanTimer = 0;
      scan();
    }, delay);
  }

  const observer = new MutationObserver(mutations => {
    if (!isHome()) return;

    const relevant = mutations.some(mutation => {
      const target = mutation.target.nodeType === Node.ELEMENT_NODE
        ? mutation.target
        : mutation.target.parentElement;

      if (target?.closest('.yt-focus-row')) return false;

      if (mutation.type !== 'childList') return true;

      return [...mutation.addedNodes, ...mutation.removedNodes]
        .some(node => {
          return !(
            node.nodeType === Node.ELEMENT_NODE &&
            node.matches('.yt-focus-row')
          );
        });
    });

    if (relevant) scheduleScan();
  });

  function start() {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'src',
        'srcset',
        'data-src',
        'data-thumb',
        'href',
        'aria-label'
      ]
    });

    scan();

    // スクロールがなくても、末尾カードと遅延データを継続再確認。
    window.setInterval(() => {
      if (isHome() && !document.hidden) scheduleScan(0);
    }, CONFIG.RESCAN_INTERVAL_MS);
  }

  window.addEventListener('yt-navigate-start', reset);

  window.addEventListener('yt-navigate-finish', () => {
    scheduleScan(100);
    window.setTimeout(() => scheduleScan(0), 600);
    window.setTimeout(() => scheduleScan(0), 1500);
  });

  window.addEventListener('yt-page-data-updated', () => scheduleScan());
  window.addEventListener('yt-rendererstamper-finished', () => scheduleScan());
  window.addEventListener('popstate', () => scheduleScan(150));

  window.addEventListener('scroll', () => scheduleScan(100), {
    passive: true
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleScan(0);
  });

  document.addEventListener('load', event => {
    const target = event.target;

    if (
      target instanceof HTMLImageElement &&
      !target.closest('.yt-focus-row') &&
      target.closest(CARD_SELECTOR)
    ) {
      scheduleScan();
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

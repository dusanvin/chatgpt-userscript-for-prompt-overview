// ==UserScript==
// @name        ChatGPT User Script for prompt-overview
// @namespace   https://github.com/dusanvin/chatgpt-userscript-for-prompt-overview/
// @version      1.0
// @description Tampermonkey userscript that adds a floating prompts navigation to ChatGPT conversations on chatgpt.com. It lists your user messages, lets you jump to any prompt with one click, briefly highlights the target, and keeps the active item in sync as you scroll.
// @author      Vincent Dusanek
// @license     MIT-License
// @match       https://chatgpt.com/c/*
// @grant       none
// @version     1.0
// @run-at      document-idle
// @grant       https://github.com/llagerlof
// ==/UserScript==

(() => {
  "use strict";

  const MENU_ID = "cgpt-user-script";
  const TARGET_SELECTOR = 'article[data-testid^="conversation-turn-"]';

  const cssEscape = (window.CSS && CSS.escape) ? CSS.escape : (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, "\\$&");

  function createMenuRoot() {
    if (document.getElementById(MENU_ID)) return document.getElementById(MENU_ID);

    const host = document.createElement("div");
    host.id = MENU_ID;
    Object.assign(host.style, {
      position: "fixed",
      right: "12px",
      bottom: "12px",
      zIndex: "2147483647",
    });

    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; }
      .card {
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji";
        font-size: 12px;
        color: #0f172a;
        background: #ffffffcc;
        backdrop-filter: blur(6px);
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        /* box-shadow entfernt */
        max-width: 360px; /* etwas breiter */
        max-height: 50vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
      }
      .header {
        display: flex; align-items: center; justify-content: space-between; gap: 8px;
        padding: 8px 10px;
        border-bottom: 1px solid #e2e8f0;
        background: rgb(249, 249, 249); /* gewünschte Header-Farbe */
      }
      .title { font-weight: 600; font-size: 12px; letter-spacing: .02em; }
      .actions { display: flex; gap: 6px; }
      button {
        all: unset; cursor: pointer; padding: 4px 6px; border-radius: 8px; border: 1px solid #e2e8f0; background: #ffffff; font-size: 11px;
      }
      button:hover { background: #f1f5f9; }
      .list { overflow: auto; padding: 6px; flex: 1; min-height: 0; }
      .item {
        display: grid;
        grid-template-columns: 6px 1fr;
        grid-template-rows: auto auto;
        align-items: start;
        gap: 4px 6px;
        padding: 8px 10px; /* etwas mehr Platz */
        border-radius: 8px;
        text-decoration: none;
        color: inherit;
        line-height: 1.25;
      }
      .item:hover { background: #f1f5f9; }
      .item.active { background: #e2e8f0; font-weight: 600; }
      .dot { width: 6px; height: 6px; border-radius: 50%; background: #0ea5e9; grid-column: 1; grid-row: 1 / span 2; align-self: center; }
      .line1 {
        grid-column: 2;
        grid-row: 1;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600;
      }
      .line2 {
        grid-column: 2;
        grid-row: 2;
        white-space: normal;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 4;         /* genau bis zu 4 Zeilen */
        -webkit-box-orient: vertical;
      }
      .empty { padding: 10px; color: #64748b; font-style: italic; }
      .collapsed .list { display: none; }
    `;

    const wrap = document.createElement("div");
    wrap.className = "card";
    wrap.innerHTML = `
      <div class="header">
        <div class="title">User prompts</div>
        <div class="actions">
          <button id="collapse" title="Collapse/Expand">—</button>
        </div>
      </div>
      <div class="list" id="list"><div class="empty">No user prompts found.</div></div>
    `;

    shadow.append(style, wrap);
    document.documentElement.appendChild(host);

    shadow.getElementById("collapse").addEventListener("click", () => {
      wrap.classList.toggle("collapsed");
    });

    return host;
  }

  function extractTurnId(el) {
    const testId = el.getAttribute("data-testid") || "";
    const m = testId.match(/conversation-turn-(\d+)/);
    return m ? m[1] : null;
  }

  function isUserTurn(articleEl) {
    return articleEl.matches('[data-message-author-role="user"]')
      || !!articleEl.querySelector('[data-message-author-role="user"]');
  }

  function findInnermostPromptNode(articleEl) {
    const scope = articleEl.querySelector('[data-message-author-role="user"]') || articleEl;
    const candidates = Array.from(scope.querySelectorAll('.whitespace-pre-wrap'));
    if (!candidates.length) return null;
    for (const node of candidates) {
      if (!node.querySelector('.whitespace-pre-wrap')) return node;
    }
    return candidates[candidates.length - 1];
  }

  function extractPromptPreview(articleEl) {
    const node = findInnermostPromptNode(articleEl);
    let raw = (node?.textContent || "").replace(/\s+/g, " ").trim();
    if (!raw) raw = (articleEl.textContent || "").replace(/\s+/g, " ").trim();
    if (!raw) return "";
    const words = raw.split(/\s+/).filter(Boolean);
    return words.slice(0, 40).join(" "); // genug Input, Clamp macht den Rest
  }

  function rebuildList() {
    createMenuRoot();
    const shadow = document.getElementById(MENU_ID).shadowRoot;
    const list = shadow.getElementById("list");
    list.innerHTML = "";

    const nodes = Array.from(document.querySelectorAll(TARGET_SELECTOR)).filter(isUserTurn);

    if (!nodes.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "No user prompts found.";
      list.appendChild(empty);
      return;
    }

    const frag = document.createDocumentFragment();
    let seq = 1;
    for (const el of nodes) {
      const idNum = extractTurnId(el);
      if (!el.id) el.id = `cgptuserscript-target-${idNum ?? seq}`;

      const a = document.createElement("a");
      a.href = `#${el.id}`;
      a.className = "item";
      a.dataset.targetId = el.id;

      const dot = document.createElement("span");
      dot.className = "dot";
      a.appendChild(dot);

      const line1 = document.createElement("div");
      line1.className = "line1";
      line1.textContent = `prompt ${seq++}`;
      a.appendChild(line1);

      const line2 = document.createElement("div");
      line2.className = "line2";
      const previewSpan = document.createElement("span");
      previewSpan.className = "preview";
      previewSpan.textContent = extractPromptPreview(el);
      line2.append(previewSpan);
      a.appendChild(line2);

      a.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.getElementById(a.dataset.targetId);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
          flashTarget(target);
          setActiveItem(a);
        }
      });

      frag.appendChild(a);
    }
    list.appendChild(frag);
    updateActiveByViewport();
  }

  function setActiveItem(anchorEl) {
    const shadow = document.getElementById(MENU_ID).shadowRoot;
    shadow.querySelectorAll(".item").forEach(i => i.classList.toggle("active", i === anchorEl));
  }

  // Dezenter BG-Flash statt Box-Shadow
  function flashTarget(el) {
    el.animate(
      [
        { backgroundColor: "transparent" },
        { backgroundColor: "rgba(14,165,233,0.14)" },
        { backgroundColor: "transparent" }
      ],
      { duration: 800, easing: "ease" }
    );
  }

  let io;
  function setupIntersectionObserver() {
    if (io) io.disconnect();
    io = new IntersectionObserver((entries) => {
      const visible = entries.filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) {
        const id = visible.target.id;
        const shadow = document.getElementById(MENU_ID).shadowRoot;
        const item = shadow.querySelector(`.item[data-target-id="${cssEscape(id)}"]`);
        if (item) setActiveItem(item);
      }
    }, { root: null, threshold: [0.55] });

    document.querySelectorAll(TARGET_SELECTOR).forEach(el => {
      if (isUserTurn(el)) io.observe(el);
    });
  }

  function updateActiveByViewport() { setupIntersectionObserver(); }

  let mo, schedule;
  function setupMutationObserver() {
    if (mo) mo.disconnect();
    mo = new MutationObserver((mutations) => {
      let relevant = false;
      for (const m of mutations) {
        if (m.type === "childList") {
          if ([...m.addedNodes, ...m.removedNodes].some(n =>
            n.nodeType === 1 && (n.matches?.(TARGET_SELECTOR) || n.querySelector?.(TARGET_SELECTOR))
          )) { relevant = true; break; }
        } else if (m.type === "attributes" && m.target instanceof Element) {
          if (m.target.matches(TARGET_SELECTOR) && (m.attributeName === "data-testid" || m.attributeName === "id" || m.attributeName === "data-message-author-role")) {
            relevant = true; break;
          }
        } else if (m.type === "characterData") {
          const parent = m.target.parentElement || m.target.parentNode?.parentElement;
          if (parent && parent.closest?.(TARGET_SELECTOR)) { relevant = true; break; }
        }
      }
      if (relevant) {
        clearTimeout(schedule);
        schedule = setTimeout(rebuildList, 200);
      }
    });

    mo.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeFilter: ["data-testid", "data-message-author-role", "id"],
    });
  }

  function watchUrlChanges() {
    let lastUrl = location.href;
    const check = () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(rebuildList, 500);
      }
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  }

  // Optional: bei Tab-Wechseln einmal sanft neu aufbauen
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") setTimeout(rebuildList, 200);
  });

  function init() {
    createMenuRoot();
    rebuildList();
    setupMutationObserver();
    watchUrlChanges();
    try {
      if (!document.documentElement.style.scrollBehavior) document.documentElement.style.scrollBehavior = "smooth";
    } catch {}
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    window.addEventListener("DOMContentLoaded", init, { once: true });
    window.addEventListener("load", init, { once: true });
  }
})();

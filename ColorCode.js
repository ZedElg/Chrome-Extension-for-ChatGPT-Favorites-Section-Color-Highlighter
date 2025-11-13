(function () {
  'use strict';

  const STORAGE_KEY = 'coloredItems';
  /** @type {{id:string,color:string}[] } */
  let coloredItems = [];
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(stored)) coloredItems = stored;
  } catch {}

  function saveColors() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(coloredItems));
  }

  function getItemId(item) {
    const href = item.getAttribute('href') || '';
    const m = href.match(/\/c\/([a-f0-9-]+)/i);
    return m ? m[1] : href;
  }

  function getItemColor(id) {
    const e = coloredItems.find(x => x.id === id);
    return e ? e.color : null;
  }

  function getOptimalFontColor(hex) {
    const h = (hex || '').replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(h)) return '#FFF';
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const dark = document.documentElement.classList.contains('dark');
    if (dark) return '#FFF';
    return lum > 0.5 ? '#000' : '#FFF';
  }

  // ---------- Apply colors ----------

  function applyStoredColorsTo(root) {
    const scope = root || document;
    const links = scope.querySelectorAll('a[href]');
    for (const a of links) {
      const id = getItemId(a);
      if (!id) continue;
      const color = getItemColor(id);
      const box = a.querySelector('div.no-draggable.group') || a;
      if (color) {
        box.classList.add('colored-item');
        box.style.backgroundColor = color;
        box.style.color = getOptimalFontColor(color);
        box.style.setProperty('--item-color', color);
      } else {
        box.classList.remove('colored-item');
        box.style.removeProperty('background-color');
        box.style.removeProperty('color');
        box.style.removeProperty('--item-color');
      }
    }
  }

  function applyStoredColors() {
    applyStoredColorsTo(document);
  }

  function toggleColor(item, color) {
    const id = getItemId(item);
    if (!id) return;
    const idx = coloredItems.findIndex(x => x.id === id);
    if (color === null) {
      if (idx > -1) coloredItems.splice(idx, 1);
    } else if (idx === -1) {
      coloredItems.push({ id, color });
    } else {
      coloredItems[idx].color = color;
    }
    saveColors();
    applyStoredColorsTo(item.closest('aside') || document);
  }

  const presetColors = [
    { color: '#E74C3C', label: 'Red' },
    { color: '#2ECC71', label: 'Green' },
    { color: '#3498DB', label: 'Blue' },
    { color: '#F1C40F', label: 'Yellow' },
    { color: '#95A5A6', label: 'Gray' }
  ];

  // ---------- Menu item injection, stable and lightweight ----------

  // Track last contextmenu target as a fallback
  let __lastContextTarget = null;
  document.addEventListener('contextmenu', e => {
    __lastContextTarget = e.target;
  }, true);

  function resolveActiveLinkFromMenu(wrapper) {
    // 1) aria-labelledby to trigger button, then closest <a>
    const labelId = wrapper.getAttribute('aria-labelledby');
    if (labelId) {
      const btn = document.getElementById(labelId);
      const link = btn ? btn.closest('a[draggable="true"][href]') || btn.closest('a[href]') : null;
      if (link) return link;
    }
    // 2) aria-controls mapping
    if (!wrapper.id) wrapper.id = 'menu-' + Math.random().toString(36).slice(2);
    const ctrl = document.querySelector(`[aria-controls="${wrapper.id}"]`);
    if (ctrl) {
      const link = ctrl.closest('a[draggable="true"][href]') || ctrl.closest('a[href]');
      if (link) return link;
    }
    // 3) last right click target
    if (__lastContextTarget) {
      const link = __lastContextTarget.closest?.('a[draggable="true"][href]') || __lastContextTarget.closest?.('a[href]');
      if (link) return link;
    }
    return null;
  }

  let openSubmenu = null;
  function closeSubmenu() {
    openSubmenu?.remove();
    openSubmenu = null;
  }

  function createColorMenuItem(wrapper) {
    const link = resolveActiveLinkFromMenu(wrapper);
    if (!link) return null;

    const id = getItemId(link);
    if (!id) return null;
    const isSet = !!getItemColor(id);

    // Match native item structure for identical look
    const div = document.createElement('div');
    div.setAttribute('role', 'menuitem');
    div.tabIndex = 0;
    div.className = 'group __menu-item pe-8 gap-1.5 color-menu-item';
    div.dataset.orientation = 'vertical';
    div.setAttribute('data-radix-collection-item', '');

    const iconWrap = document.createElement('div');
    iconWrap.className = 'flex items-center justify-center text-token-text-secondary h-5 w-5';
    iconWrap.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
           xmlns="http://www.w3.org/2000/svg">
        <path d="M7.00914 17.9998L2.99914 13.9898C1.65914 12.6498 1.65914 11.3198 2.99914 9.9798L9.67914 3.2998L17.0291 10.6498C17.3991 11.0198 17.3991 11.6198 17.0291 11.9898L11.0091 18.0098C9.68914 19.3298 8.34914 19.3298 7.00914 17.9998Z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8.34961 1.9502L9.68961 3.29016" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2.07031 11.9197L17.1903 11.2598" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3 22H16" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M18.85 15C18.85 15 17 17.01 17 18.24C17 19.26 17.83 20.09 18.85 20.09C19.87 20.09 20.7 19.26 20.7 18.24C20.7 17.01 18.85 15 18.85 15Z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    const label = document.createElement('span');
    label.textContent = isSet ? 'Change Color' : 'Color';

    div.appendChild(iconWrap);
    div.appendChild(label);

    // Use pointerdown so it fires even if the framework closes the menu on mouseup
    const openPicker = e => {
      e.preventDefault();
      e.stopPropagation();
      closeSubmenu();

      const menuRect = div.getBoundingClientRect();
      const sm = document.createElement('div');
      sm.className = 'color-submenu';
      Object.assign(sm.style, {
        position: 'absolute',
        background: document.documentElement.classList.contains('dark') ? '#2D2D2D' : '#FFF',
        border: document.documentElement.classList.contains('dark') ? '1px solid #444' : '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        minWidth: '160px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        transition: 'opacity 120ms ease',
        opacity: '0',
        top: `${menuRect.bottom + window.scrollY}px`,
        left: `${menuRect.left + window.scrollX}px`,
      });

      presetColors.forEach(({ color, label: name }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = name;
        btn.className = 'color-option';
        Object.assign(btn.style, {
          backgroundColor: color,
          color: getOptimalFontColor(color),
          border: 'none',
          padding: '8px 16px',
          margin: '4px 0',
          cursor: 'pointer',
          borderRadius: '4px',
          textAlign: 'left',
          fontSize: '14px'
        });
        btn.addEventListener('click', ev => {
          ev.stopPropagation();
          toggleColor(link, color);
          closeSubmenu();
        });
        sm.appendChild(btn);
      });

      const rem = document.createElement('button');
      rem.type = 'button';
      rem.textContent = 'Remove Color';
      rem.className = 'remove-color-option';
      Object.assign(rem.style, {
        backgroundColor: '#e53e3e',
        color: '#FFF',
        border: 'none',
        padding: '8px 16px',
        margin: '8px 0 0 0',
        cursor: 'pointer',
        borderRadius: '4px',
        textAlign: 'left',
        fontSize: '14px'
      });
      rem.addEventListener('click', ev => {
        ev.stopPropagation();
        toggleColor(link, null);
        closeSubmenu();
      });
      sm.appendChild(rem);

      document.body.appendChild(sm);
      requestAnimationFrame(() => { sm.style.opacity = '1'; });
      openSubmenu = sm;

      // Close on outside click
      const closeOnDoc = ev => {
        if (!openSubmenu) return;
        if (!openSubmenu.contains(ev.target) && !div.contains(ev.target)) {
          closeSubmenu();
        }
      };
      document.addEventListener('pointerdown', closeOnDoc, { once: true });
    };

    div.addEventListener('pointerdown', openPicker);
    div.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') openPicker(e);
    });

    return div;
  }

  function addColorMenuItem(wrapper) {
    if (!wrapper || wrapper.dataset.state !== 'open') return;
    if (wrapper.querySelector('.color-menu-item')) return;
    const item = createColorMenuItem(wrapper);
    if (!item) return;

    const share = wrapper.querySelector('[data-testid^="share-"][data-testid$="-menu-item"]');
    if (share && share.parentNode) {
      share.parentNode.insertBefore(item, share);
    } else {
      wrapper.insertBefore(item, wrapper.firstChild);
    }
  }

  // ---------- Efficient observers with batching and guards ----------

  // Apply colors on DOM changes, batched per frame
  let colorRaf = null;
  function scheduleApplyColors() {
    if (colorRaf) return;
    colorRaf = requestAnimationFrame(() => {
      colorRaf = null;
      applyStoredColors();
    });
  }

  const colorObserver = new MutationObserver(records => {
    for (const rec of records) {
      if (rec.addedNodes && rec.addedNodes.length) {
        scheduleApplyColors();
        break;
      }
    }
  });
  colorObserver.observe(document.body, { childList: true, subtree: true });

  // Menu enhancement with one observer
  const enhancedMenus = new WeakSet();
  let pendingMenu = null;
  let menuRaf = null;

  function enhanceMenuOnce(wrap) {
    if (!wrap || enhancedMenus.has(wrap)) return;
    if (wrap.dataset.__colorEnhancing === '1') return;
    wrap.dataset.__colorEnhancing = '1';
    try {
      if (wrap.dataset.state !== 'open') return;
      addColorMenuItem(wrap);
      enhancedMenus.add(wrap);
    } catch {
      // avoid crashing the app
    } finally {
      delete wrap.dataset.__colorEnhancing;
    }
  }

  function scheduleEnhance(wrap) {
    pendingMenu = wrap;
    if (menuRaf) return;
    menuRaf = requestAnimationFrame(() => {
      menuRaf = null;
      const w = pendingMenu;
      pendingMenu = null;
      enhanceMenuOnce(w);
    });
  }

  const menuObserver = new MutationObserver(records => {
    for (const rec of records) {
      for (const node of rec.addedNodes) {
        if (node.nodeType !== 1) continue;
        const wrap = node.matches?.('[data-radix-menu-content][dir]') ? node
          : node.querySelector?.('[data-radix-menu-content][dir]');
        if (wrap) scheduleEnhance(wrap);
      }
      if (rec.type === 'attributes' && rec.target?.matches?.('[data-radix-menu-content][dir]')) {
        scheduleEnhance(rec.target);
      }
    }
  });

  menuObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-state']
  });

  // ---------- Init ----------

  // First paint
  applyStoredColors();
})();

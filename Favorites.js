(function () {
  'use strict';

  const STORAGE_KEY = 'favoriteItems';
  const favoriteItems = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  const originalPositions = {};

  function getItemId(item) {
    return item.getAttribute('href');
  }
  function saveFavorites() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteItems));
  }

  function addFavoritesSection(retry = 25) {
    const history = document.querySelector('#history');
    if (!history && retry > 0) {
      setTimeout(() => addFavoritesSection(retry - 1), 400);
      return;
    }

    // Insert chevron rotation styles once
    if (!document.getElementById('favorites-chevron-style')) {
      const style = document.createElement('style');
      style.id = 'favorites-chevron-style';
      style.textContent = `
        [data-testid="favorites-section"] .__menu-item svg[data-chevron] {
          transition: transform 150ms ease;
          transform-origin: 50% 50%;
        }
        [data-testid="favorites-section"] .__menu-item[aria-expanded="false"] svg[data-chevron] {
          transform: rotate(-90deg);
        }
      `;
      document.head.appendChild(style);
    }

    // Find the Chats group container
    const chatsGroup = Array.from(document.querySelectorAll('.group\\/sidebar-expando-section')).find(g => {
      const h2 = g.querySelector('h2.__menu-label');
      return h2 && h2.textContent.trim() === 'Chats';
    });

    // Create the Favorites group only once
    if (!document.querySelector('[data-testid="favorites-section"]')) {
      const group = document.createElement('div');
      group.className = 'group/sidebar-expando-section mb-[var(--sidebar-expanded-section-margin-bottom)]';
      group.setAttribute('data-testid', 'favorites-section');

      // Header mirrors built in groups so visuals match
      const header = document.createElement('div');
      header.setAttribute('tabindex', '0');
      header.setAttribute('data-fill', '');
      header.className = 'group __menu-item hoverable';
      header.setAttribute('role', 'button');
      header.setAttribute('aria-expanded', 'true');
      header.setAttribute('aria-label', 'Collapse section');
      header.setAttribute('data-no-hover-bg', 'true');
      header.setAttribute('data-no-contents-gap', 'true');
      header.setAttribute('aria-controls', 'favorites-body');
      header.innerHTML = `
        <div class="text-token-text-tertiary flex w-full items-center justify-start gap-0.5">
          <h2 class="__menu-label" data-no-spacing="true">Favorites</h2>
          <svg data-chevron width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="hidden h-3 w-3 group-hover/sidebar-expando-section:block">
            <path d="M12.1338 5.94433C12.3919 5.77382 12.7434 5.80202 12.9707 6.02929C13.1979 6.25656 13.2261 6.60807 13.0556 6.8662L12.9707 6.9707L8.47067 11.4707C8.21097 11.7304 7.78896 11.7304 7.52926 11.4707L3.02926 6.9707L2.9443 6.8662C2.77379 6.60807 2.80199 6.25656 3.02926 6.02929C3.25653 5.80202 3.60804 5.77382 3.86617 5.94433L3.97067 6.02929L7.99996 10.0586L12.0293 6.02929L12.1338 5.94433Z"></path>
          </svg>
        </div>
      `;

      // Body directly follows header, native look and our toggle handles show or hide
      const body = document.createElement('div');
      body.id = 'favorites-body';
      const ol = document.createElement('ol');
      body.appendChild(ol);

      // Simple toggle
      function setCollapsed(next) {
        header.setAttribute('aria-expanded', next ? 'false' : 'true');
        group.toggleAttribute('data-collapsed', next);
        body.style.display = next ? 'none' : '';
      }
      header.addEventListener('click', () => {
        const currentlyExpanded = header.getAttribute('aria-expanded') === 'true';
        setCollapsed(currentlyExpanded);
      });
      header.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const currentlyExpanded = header.getAttribute('aria-expanded') === 'true';
          setCollapsed(currentlyExpanded);
        }
      });

      group.appendChild(header);
      group.appendChild(body);

      if (chatsGroup && chatsGroup.parentElement) {
        chatsGroup.parentElement.insertBefore(group, chatsGroup);
      } else if (history && history.parentElement) {
        history.parentElement.insertBefore(group, history.parentElement.firstChild);
      }
    }
  }

  function moveToFavorites(item) {
    const favList = document.querySelector('[data-testid="favorites-section"] ol');
    if (!favList) return;
    const id = getItemId(item);
    if (!originalPositions[id]) {
      originalPositions[id] = {
        parent: item.parentElement,
        index: Array.from(item.parentElement.children).indexOf(item)
      };
    }
    favList.appendChild(item);
  }

  function moveToHistory(item) {
    const id = getItemId(item);
    const orig = originalPositions[id];
    if (orig && orig.parent) {
      const siblings = orig.parent.children;
      if (orig.index >= siblings.length) orig.parent.appendChild(item);
      else orig.parent.insertBefore(item, siblings[orig.index]);
    } else {
      document.querySelector('#history')?.appendChild(item);
    }
  }

  function applyStoredFavorites(retry = 25) {
    const items = Array.from(document.querySelectorAll('#history a[draggable="true"][href]'));
    if (items.length === 0 && retry > 0) {
      setTimeout(() => applyStoredFavorites(retry - 1), 400);
      return;
    }
    items.forEach(item => {
      const id = getItemId(item);
      if (favoriteItems.includes(id)) moveToFavorites(item);
    });
  }

  function toggleFavorite(item) {
    const id = getItemId(item);
    const idx = favoriteItems.indexOf(id);
    if (idx === -1) {
      favoriteItems.push(id);
      saveFavorites();
      moveToFavorites(item);
    } else {
      favoriteItems.splice(idx, 1);
      saveFavorites();
      moveToHistory(item);
    }
  }

  // Determine which sidebar item opened this menu
  function getActiveItem(wrapper) {
    const labelId = wrapper.getAttribute('aria-labelledby');
    if (!labelId) return null;
    const btn = document.getElementById(labelId);
    // Not scoped to #history, so it also works inside Favorites
    return btn ? btn.closest('a[draggable="true"][href]') : null;
  }

  function createFavoriteMenuItem(wrapper) {
    const item = getActiveItem(wrapper);
    if (!item) return null;
    const id = getItemId(item);
    const isFav = favoriteItems.includes(id);

    // Mirror native menu item structure for visual parity
    const div = document.createElement('div');
    div.setAttribute('role', 'menuitem');
    div.tabIndex = 0;
    div.className = 'group __menu-item pe-8 gap-1.5 favorite-menu-item';
    div.dataset.orientation = 'vertical';
    div.innerHTML = `
      <div class="flex shrink-0 items-center justify-center h-[18px] w-[18px]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="${isFav ? 'white' : 'none'}" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L15 8.2L22 9.3L17 14L18 21L12 17.3L6 21L7 14L2 9.3L9 8.2L12 2Z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <span>${isFav ? 'Unfavorite' : 'Favorite'}</span>
    `;

    // Use pointerdown so it fires before the menu collapses
    const activate = e => {
      e.preventDefault();
      e.stopPropagation();
      toggleFavorite(item);
      // Close the menu
      wrapper.setAttribute('data-state', 'closed');
      // No direct style changes, let the framework remove it
    };
    div.addEventListener('pointerdown', activate, { once: true });
    div.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') activate(e);
    });

    return div;
  }

  // Idempotent, scoped insertion
  function addFavoriteMenuItem(wrapper) {
    if (!wrapper || wrapper.dataset.state !== 'open') return;
    if (wrapper.querySelector('.favorite-menu-item')) return;

    const fav = createFavoriteMenuItem(wrapper);
    if (!fav) return;

    const share = wrapper.querySelector('[data-testid="share-chat-menu-item"]');
    if (share && share.parentNode) {
      share.parentNode.insertBefore(fav, share);
    } else {
      wrapper.insertBefore(fav, wrapper.firstChild);
    }
  }

  // Efficient menu enhancement with one observer and per frame batching
  const enhancedMenus = new WeakSet();
  let pendingMenu = null;
  let rafId = null;

  function enhanceMenuOnce(wrap) {
    if (!wrap || enhancedMenus.has(wrap)) return;
    if (wrap.dataset.__favEnhancing === '1') return;
    wrap.dataset.__favEnhancing = '1';
    try {
      if (wrap.dataset.state !== 'open') return;
      addFavoriteMenuItem(wrap);
      enhancedMenus.add(wrap);
    } catch (err) {
      // swallow errors to avoid UI crashes
    } finally {
      delete wrap.dataset.__favEnhancing;
    }
  }

  function scheduleEnhance(wrap) {
    pendingMenu = wrap;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      const w = pendingMenu;
      pendingMenu = null;
      enhanceMenuOnce(w);
    });
  }

  // One lightweight observer for the whole document
  const menuObserver = new MutationObserver(records => {
    for (const rec of records) {
      // newly added nodes
      for (const node of rec.addedNodes) {
        if (node.nodeType !== 1) continue;
        const wrap = node.matches?.('[data-radix-menu-content][dir]')
          ? node
          : node.querySelector?.('[data-radix-menu-content][dir]');
        if (wrap) scheduleEnhance(wrap);
      }
      // attribute changes on existing menus
      if (
        rec.type === 'attributes' &&
        rec.target?.matches?.('[data-radix-menu-content][dir]')
      ) {
        scheduleEnhance(rec.target);
      }
    }
  });

  // Observe child adds and the single data-state attribute only
  menuObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-state']
  });

  // Init
  addFavoritesSection();
  setTimeout(applyStoredFavorites, 500);
})();

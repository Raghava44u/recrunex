// ── Search / Autocomplete ─────────────────────────────────────────────────────
const Search = (() => {
  let debounceTimer = null;
  let autocompleteVisible = false;

  function debounce(fn, delay) {
    return (...args) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fn(...args), delay);
    };
  }

  // Build suggestions from typed input
  function getSuggestions(input) {
    const q = input.toLowerCase().trim();
    if (q.length < 1) return [];

    const results = new Set();

    // 1. Check SEARCH_SUGGESTIONS map
    for (const [prefix, expansions] of Object.entries(SEARCH_SUGGESTIONS)) {
      // Match if user input starts a prefix OR prefix starts with user input
      if (prefix.startsWith(q) || q.startsWith(prefix)) {
        expansions.forEach(e => results.add(e));
      }
    }

    // 2. Check against expanded values directly (user typing full word)
    for (const expansions of Object.values(SEARCH_SUGGESTIONS)) {
      expansions.forEach(e => {
        if (e.toLowerCase().includes(q)) results.add(e);
      });
    }

    // 3. Recent searches that match
    Storage.getRecentSearches().forEach(r => {
      if (r.query && r.query.toLowerCase().includes(q) && r.query.toLowerCase() !== q) {
        results.add(r.query);
      }
    });

    return Array.from(results).slice(0, 7);
  }

  function showDropdown(suggestions, inputEl) {
    const dropdown = document.getElementById('autocompleteDropdown');
    if (!suggestions.length) { hideDropdown(); return; }

    dropdown.innerHTML = suggestions.map(s => `
      <div class="autocomplete-item" data-value="${s.replace(/"/g,'&quot;')}" tabindex="-1" role="option">
        <i class="fa-solid fa-magnifying-glass"></i>
        <span>${s}</span>
      </div>
    `).join('');

    dropdown.removeAttribute('hidden');
    autocompleteVisible = true;

    dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('mousedown', e => {
        e.preventDefault();
        inputEl.value = item.dataset.value;
        document.getElementById('clearSearch').removeAttribute('hidden');
        hideDropdown();
        App.triggerSearch(false);
      });
    });
  }

  function hideDropdown() {
    const d = document.getElementById('autocompleteDropdown');
    if (d) d.setAttribute('hidden', '');
    autocompleteVisible = false;
  }

  function navigateDropdown(dir) {
    const dropdown = document.getElementById('autocompleteDropdown');
    if (!dropdown) return;
    const items = Array.from(dropdown.querySelectorAll('.autocomplete-item'));
    const activeIdx = items.findIndex(i => i.classList.contains('active'));
    items.forEach(i => i.classList.remove('active'));

    let next = dir === 'down'
      ? Math.min(activeIdx + 1, items.length - 1)
      : Math.max(activeIdx - 1, 0);
    if (activeIdx === -1) next = dir === 'down' ? 0 : items.length - 1;

    if (items[next]) {
      items[next].classList.add('active');
      document.getElementById('searchInput').value = items[next].dataset.value;
    }
  }

  function init() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const debouncedSuggest = debounce(val => {
      showDropdown(getSuggestions(val), searchInput);
    }, 180);

    searchInput.addEventListener('input', e => debouncedSuggest(e.target.value));

    searchInput.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown')  { e.preventDefault(); navigateDropdown('down'); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); navigateDropdown('up'); }
      if (e.key === 'Escape')     { hideDropdown(); }
      if (e.key === 'Enter') {
        const active = document.querySelector('#autocompleteDropdown .active');
        if (active && autocompleteVisible) {
          e.preventDefault();
          searchInput.value = active.dataset.value;
          document.getElementById('clearSearch').removeAttribute('hidden');
          hideDropdown();
          App.triggerSearch(false);
        }
      }
    });

    searchInput.addEventListener('blur', () => setTimeout(hideDropdown, 180));
    searchInput.addEventListener('focus', e => {
      if (e.target.value.length > 0) debouncedSuggest(e.target.value);
    });
  }

  return { init };
})();
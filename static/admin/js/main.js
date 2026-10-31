// ============================================================
// KORM dashboard — navigation, theme and command palette
// ============================================================

const ICONS = {
    dashboard: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`,
    tables: `<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>`,
    logs: `<svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
    globe: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    kanban: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M9 3v18M15 3v18"/></svg>`,
    terminal: `<svg viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
    traces: `<svg viewBox="0 0 24 24"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>`,
    query: `<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="m14 14 3-3 3 3"/><path d="M17 11v6"/></svg>`,
};

document.addEventListener('DOMContentLoaded', () => {
    // ---------------- theme ----------------
    const savedColor = localStorage.getItem('theme-color');
    if (savedColor) {
        document.documentElement.style.setProperty('--theme-color', savedColor);
        document.documentElement.style.setProperty('--theme-color-hover',
            adjustBrightness(savedColor, -12));
    }

    const isDark = localStorage.getItem('darkMode') === 'true';
    document.documentElement.classList.toggle('dark', isDark);
    // `dark` is also set on <body> for the pages that scope their styles with
    // `body:not(.dark)` / `body.dark`.
    document.body.classList.toggle('dark', isDark);
    document.body.classList.toggle('dark-mode', isDark);

    // ---------------- navigation ----------------
    const navLinks = [
        {
            href: admdmdPartth,
            label: 'Dashboard',
            icon: ICONS.dashboard,
            exact: true
        },
        {
            href: `${admdmdPartth}/tables`,
            label: 'Tables',
            icon: ICONS.tables,
            exact: false
        },
        {
            href: `${admdmdPartth}/query`,
            label: 'SQL Studio',
            icon: ICONS.query,
            exact: true
        },
        {
            href: `${admdmdPartth}/logs`,
            label: 'Logs & Metrics',
            icon: ICONS.logs,
            exact: true
        }
    ];

    if (typeof globeEnabled !== "undefined" && globeEnabled === "true") {
        navLinks.push({
            href: `${admdmdPartth}/globe-explorer`,
            label: '3D Explorer',
            icon: ICONS.globe,
            exact: true
        });
    }

    if (typeof kanbanEnabled !== "undefined" && kanbanEnabled === "true") {
        navLinks.push({
            href: `${admdmdPartth}/kanbans`,
            label: 'Kanban',
            icon: ICONS.kanban,
            exact: false
        });
    }

    if (typeof terminalEnabled !== "undefined" && terminalEnabled === "true") {
        navLinks.push({
            href: `${admdmdPartth}/terminal`,
            label: 'Terminal',
            icon: ICONS.terminal,
            exact: true
        });
    }

    if (typeof traceEnabled !== "undefined" && traceEnabled === "true") {
        navLinks.push({
            href: `${admdmdPartth}/traces`,
            label: 'Traces',
            icon: ICONS.traces,
            exact: true
        });
    }

    const mainNav = document.getElementById('mainNav');
    if (mainNav) {
        mainNav.links = navLinks;
    }

    // ---------------- command palette ----------------
    initCommandPalette(navLinks);

    // ---------------- spotlight card effect ----------------
    initSpotlight();
});

function initSpotlight() {
    const selector = '.card, .stats-card, .metric-card, .schema-card, .hero, .spotlight-card, .dash-table';
    let currentCard = null;

    document.addEventListener('mousemove', (e) => {
        const card = e.target.closest(selector);
        if (card !== currentCard) {
            currentCard = card;
        }
        if (!currentCard) return;
        const rect = currentCard.getBoundingClientRect();
        currentCard.style.setProperty('--mouse-x', `${(e.clientX - rect.left).toFixed(1)}px`);
        currentCard.style.setProperty('--mouse-y', `${(e.clientY - rect.top).toFixed(1)}px`);
    }, { passive: true });
}

function adjustBrightness(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255))
        .toString(16)
        .slice(1);
}

/**
 * Command palette — jump to any page or table with ⌘K / Ctrl+K.
 */
function initCommandPalette(navLinks) {
    const adminPath = (admdmdPartth || '/admin').replace(/\/$/, '');
    let tables = [];
    let activeIndex = 0;
    let results = [];

    const overlay = document.createElement('div');
    overlay.className = 'palette-overlay';
    overlay.innerHTML = `
        <div class="palette" role="dialog" aria-modal="true" aria-label="Command palette">
            <div class="palette-input-wrap">
                <svg viewBox="0 0 24 24" class="palette-search-icon"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
                <input type="text" class="palette-input" placeholder="Search tables and pages…" autocomplete="off" spellcheck="false">
                <kbd class="palette-kbd">ESC</kbd>
            </div>
            <div class="palette-results" id="paletteResults"></div>
            <div class="palette-footer">
                <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
                <span><kbd>↵</kbd> open</span>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('.palette-input');
    const resultsEl = overlay.querySelector('#paletteResults');

    const entries = () => {
        const pages = navLinks.map(l => ({
            type: 'page',
            label: l.label,
            hint: 'Page',
            href: l.href,
            icon: l.icon
        }));
        const tableEntries = tables.map(t => ({
            type: 'table',
            label: t.name,
            hint: `${t.count} row${t.count === 1 ? '' : 's'}`,
            href: `${adminPath}/tables/${encodeURIComponent(t.name)}`,
            icon: `<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>`
        }));
        return [...pages, ...tableEntries];
    };

    function renderResults(filter) {
        const q = (filter || '').trim().toLowerCase();
        const all = entries();
        results = q ? all.filter(e => e.label.toLowerCase().includes(q)) : all;
        if (!results.length) {
            resultsEl.innerHTML = `<div class="palette-empty">No match for “${filter}”</div>`;
            return;
        }
        activeIndex = 0;
        resultsEl.innerHTML = results.map((e, i) => `
            <button class="palette-item ${i === 0 ? 'active' : ''}" data-href="${e.href}" data-index="${i}" type="button">
                <span class="palette-item-icon">${e.icon}</span>
                <span class="palette-item-label">${e.label}</span>
                <span class="palette-item-hint">${e.hint}</span>
            </button>`).join('');
        resultsEl.querySelectorAll('.palette-item').forEach(btn => {
            btn.addEventListener('click', () => {
                window.location.href = btn.dataset.href;
            });
        });
    }

    function focusSearch() {
        input.focus({ preventScroll: true });
        // Chrome may still refuse the focus on the very first frame after the
        // overlay became visible — retry once the frame is painted.
        requestAnimationFrame(() => {
            if (document.activeElement !== input) {
                input.focus({ preventScroll: true });
            }
        });
    }

    function open() {
        overlay.classList.add('open');
        // Force a reflow so `visibility: visible` is applied synchronously,
        // otherwise the caret cannot be moved into the hidden search field.
        void overlay.offsetHeight;
        input.value = '';
        renderResults('');
        document.body.style.overflow = 'hidden';
        focusSearch();
    }

    function close() {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });

    input.addEventListener('input', () => renderResults(input.value));

    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = Math.min(activeIndex + 1, results.length - 1);
            syncActive();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, 0);
            syncActive();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const target = results[activeIndex];
            if (target) window.location.href = target.href;
        } else if (e.key === 'Escape') {
            e.preventDefault();
            close();
        }
    });

    function syncActive() {
        resultsEl.querySelectorAll('.palette-item').forEach((el, i) => {
            el.classList.toggle('active', i === activeIndex);
            if (i === activeIndex) el.scrollIntoView({ block: 'nearest' });
        });
    }

    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            overlay.classList.contains('open') ? close() : open();
        } else if (e.key === 'Escape' && overlay.classList.contains('open')) {
            close();
        }
    });

    document.addEventListener('korm:open-palette', open);

    // Preload the table list so the palette is instant.
    fetch(`${adminPath}/tables/list`, { headers: { 'Accept': 'application/json' } })
        .then(r => r.json())
        .then(data => {
            tables = (data && data.success) || [];
        })
        .catch(() => { tables = []; });
}

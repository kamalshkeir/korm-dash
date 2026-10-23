import { attachRelations } from '../components/Relations.js';

if (adminPath.startsWith("/")) {
    adminPath = adminPath.substring(1);
}

const basePath = "/" + adminPath;

document.addEventListener("DOMContentLoaded", () => {
    const list = document.getElementById('collectionsList');
    const filterInput = document.getElementById('tableFilter');
    const emptyState = document.getElementById('tablesEmpty');
    const layoutToggle = document.getElementById('layoutToggle');

    // ---------- navigation ----------
    document.querySelectorAll(".collection-item").forEach((card) => {
        card.addEventListener("click", (e) => {
            if (e.target.closest('.action-btn') || e.target.closest('.rel-chip')) return;
            window.location.href = `${basePath}/tables/${card.dataset.table}`;
        });
    });

    // ---------- relation popovers ----------
    document.querySelectorAll('.collection-item[data-table]').forEach(card => {
        attachRelations(card, card.dataset.table);
    });
    document.querySelectorAll('.rel-chip[data-table]').forEach(chip => {
        attachRelations(chip, chip.dataset.table);
    });

    // ---------- filtering ----------
    if (filterInput) {
        filterInput.addEventListener('input', () => {
            const q = filterInput.value.trim().toLowerCase();
            let visible = 0;
            document.querySelectorAll('.collection-item').forEach(card => {
                const name = (card.dataset.name || '').toLowerCase();
                const match = !q || name.includes(q);
                card.style.display = match ? '' : 'none';
                if (match) visible++;
            });
            if (emptyState) emptyState.style.display = visible ? 'none' : '';
        });
    }

    // ---------- grid / list toggle ----------
    if (layoutToggle && list) {
        const stored = localStorage.getItem('tables-layout');
        if (stored === 'list') list.classList.add('list-view');
        layoutToggle.addEventListener('click', () => {
            const isList = list.classList.toggle('list-view');
            localStorage.setItem('tables-layout', isList ? 'list' : 'grid');
        });
    }

    // ---------- action menu ----------
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', handleActionClick);
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.action-btn') && !e.target.closest('.dropdown-menu')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => menu.remove());
        }
    });
});

function handleActionClick(e) {
    e.stopPropagation();

    document.querySelectorAll('.dropdown-menu').forEach(m => m.remove());

    const button = e.currentTarget;
    const table = button.dataset.table;

    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown-menu';
    dropdown.innerHTML = `
        <div class="dropdown-item" data-action="export-json" data-table="${table}">
            <svg viewBox="0 0 24 24"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
            Export JSON
        </div>
        <div class="dropdown-item" data-action="export-csv" data-table="${table}">
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>
            Export CSV
        </div>
        <div class="dropdown-item danger" data-action="drop" data-table="${table}">
            <svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            Drop table
        </div>
    `;

    const rect = button.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const dropdownWidth = 200;

    dropdown.style.position = 'fixed';

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const showBelow = spaceBelow >= 140 || spaceBelow > spaceAbove;

    if (showBelow) {
        dropdown.style.top = `${Math.min(rect.bottom + 6, viewportHeight - 10)}px`;
    } else {
        dropdown.style.bottom = `${Math.min(spaceBelow + rect.height + 6, viewportHeight - 10)}px`;
    }

    let left = rect.right - dropdownWidth;
    if (left + dropdownWidth > viewportWidth) {
        left = Math.max(10, viewportWidth - dropdownWidth - 10);
    }
    if (left < 10) left = 10;
    dropdown.style.left = `${left}px`;

    document.body.appendChild(dropdown);
    requestAnimationFrame(() => dropdown.classList.add('show'));

    dropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = item.dataset.action;
            const name = item.dataset.table;
            dropdown.remove();

            if (action === 'export-json') {
                Ask(`Do you confirm export ${name} ?`).then(confirmed => {
                    if (confirmed) window.location.href = `${basePath}/export/${name}`;
                });
            } else if (action === 'export-csv') {
                Ask(`Do you confirm export ${name} ?`).then(confirmed => {
                    if (confirmed) window.location.href = `${basePath}/export/${name}/csv`;
                });
            } else if (action === 'drop') {
                Ask(`Are you sure you want to drop table ${name} ?`).then(confirmed => {
                    if (!confirmed) return;
                    fetch(`${basePath}/drop/table`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ table: name }),
                    }).then(res => res.json()).then(data => {
                        if (data.success) {
                            Notif.New({
                                title: "Table dropped",
                                message: `Table ${name} has been dropped`,
                                type: "success",
                                duration: 3000
                            }).show();
                            document.querySelector(`.collection-item[data-table="${name}"]`)?.remove();
                        } else if (data.error) {
                            Notif.New({
                                title: "Error",
                                message: data.error,
                                type: "error",
                                duration: 4000
                            }).show();
                        }
                    });
                });
            }
        });
    });
}

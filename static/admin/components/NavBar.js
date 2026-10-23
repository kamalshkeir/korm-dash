import { attachRelations } from './Relations.js';

const ICON_TABLE = `<svg class="tt-icon" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/></svg>`;
const ICON_TOGGLE = `<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>`;

class NavBar extends HTMLElement {
    constructor() {
        super();
        this._links = [];
        this._tables = [];
        this._relations = {};
        this._mounted = false;
    }

    get links() {
        return this._links;
    }

    set links(value) {
        this._links = value || [];
        this.render();
    }

    connectedCallback() {
        document.documentElement.classList.toggle('nav-collapsed', localStorage.getItem('nav-collapsed') === '1');
        this.render();
        this.setupEventListeners();
        this._mounted = true;
        this.loadTables();
    }

    get adminPath() {
        return (document.body.dataset.path || '/admin').replace(/\/$/, '');
    }

    async loadTables() {
        try {
            const res = await fetch(`${this.adminPath}/tables/list`, { headers: { 'Accept': 'application/json' } });
            const data = await res.json();
            this._tables = (data && data.success) || [];
        } catch (err) {
            console.warn('[korm] unable to load tables for sidebar', err);
            this._tables = [];
        }

        try {
            const res = await fetch(`${this.adminPath}/tables/relations`, { headers: { 'Accept': 'application/json' } });
            const data = await res.json();
            this._relations = (data && data.success) || {};
        } catch (err) {
            this._relations = {};
        }

        if (this._mounted) this.renderTree();
    }

    render() {
        const collapsed = document.documentElement.classList.contains('nav-collapsed');
        this.innerHTML = `
            <div class="sidebar-brand">
                <div class="brand-mark">K</div>
                <div class="brand-text">
                    <strong>KORM</strong>
                    <span>Console</span>
                </div>
            </div>

            <div class="sidebar-scroll">
                <div class="nav-section">
                    <div class="nav-section-title">Navigation</div>
                    <ul class="nav-list">
                        ${this._links.map(link => `
                            <li>
                                <a href="${link.href}" class="nav-item ${this.isLinkActive(link) ? 'active' : ''}" title="${link.label}">
                                    ${link.icon}
                                    <span class="nav-label">${link.label}</span>
                                    ${link.badge ? `<span class="nav-badge">${link.badge}</span>` : ''}
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                </div>

                <div class="nav-section" id="tablesSection">
                    <div class="nav-section-title">Database</div>
                    <ul class="table-tree" id="tableTree">
                        <li class="table-tree-item" style="opacity:.55">
                            <span class="tt-icon" style="width:15px;height:15px"></span>
                            <span class="tt-name">Loading…</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div class="sidebar-foot">
                <button class="nav-toggle" id="navToggle" type="button" title="${collapsed ? 'Expand sidebar' : 'Collapse sidebar'}">
                    ${ICON_TOGGLE}
                    <span class="nav-label">${collapsed ? 'Expand' : 'Collapse'}</span>
                </button>
            </div>
        `;

        this.renderTree();
    }

    renderTree() {
        const tree = this.querySelector('#tableTree');
        if (!tree) return;

        if (!this._tables.length) {
            tree.innerHTML = `
                <li class="table-tree-item" style="opacity:.55; cursor:default">
                    <span class="tt-icon" style="width:15px;height:15px"></span>
                    <span class="tt-name">No tables</span>
                </li>`;
            return;
        }

        const current = window.location.pathname;
        const sorted = [...this._tables].sort((a, b) => {
            if (a.system !== b.system) return a.system ? 1 : -1;
            return a.name.localeCompare(b.name);
        });

        tree.innerHTML = sorted.map(t => {
            const rel = (this._relations[t.name] || []).length;
            const isActive = current.includes(`/tables/${t.name}`);
            return `
                <li>
                    <a href="${this.adminPath}/tables/${encodeURIComponent(t.name)}"
                       class="table-tree-item ${isActive ? 'active' : ''}"
                       data-table="${t.name}" title="${t.name}">
                        ${ICON_TABLE}
                        <span class="tt-name">${t.name}</span>
                        ${rel ? `<span class="tt-rel" title="${rel} relation(s)">
                            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            ${rel}</span>` : `<span class="tt-count">${t.count}</span>`}
                    </a>
                </li>`;
        }).join('');

        // Hovering a table reveals the tables it is linked to.
        tree.querySelectorAll('.table-tree-item[data-table]').forEach(item => {
            attachRelations(item, item.dataset.table);
        });
    }

    isLinkActive(link) {
        const currentPath = window.location.pathname;
        if (link.exact) {
            return currentPath === link.href;
        }
        // "Tables" stays active for any table detail page
        if (link.label === 'Tables') {
            return currentPath.includes('/tables') && !currentPath.endsWith('/tables/list') && !currentPath.endsWith('/tables/relations');
        }
        return currentPath.includes(link.href);
    }

    setupEventListeners() {
        // Delegated on the host element so re-rendering the inner markup
        // (nav links are injected after the element is upgraded) does not
        // detach the handlers.
        this.addEventListener('click', (e) => {
            const toggle = e.target.closest('#navToggle');
            if (!toggle || !this.contains(toggle)) return;
            e.preventDefault();
            const collapsed = document.documentElement.classList.toggle('nav-collapsed');
            localStorage.setItem('nav-collapsed', collapsed ? '1' : '0');
            toggle.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
            const label = toggle.querySelector('.nav-label');
            if (label) label.textContent = collapsed ? 'Expand' : 'Collapse';
        });

        // Keep the table tree active state in sync with client side navigation.
        window.addEventListener('popstate', () => {
            if (this._mounted) this.renderTree();
        });
    }
}

customElements.define('nav-bar', NavBar);

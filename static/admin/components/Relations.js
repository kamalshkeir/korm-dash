/**
 * Relations — shared helper that renders the foreign-key graph of the
 * database as a hover popover.
 *
 * The relation graph is fetched once from the server and cached for the
 * lifetime of the page, so any element on any page can expose it.
 */

const RELATIONS_URL = () => {
    const path = (document.body.dataset.path || '/admin').replace(/\/$/, '');
    return `${path}/tables/relations`;
};

let cache = null;
let pending = null;

function loadRelations() {
    if (cache) return Promise.resolve(cache);
    if (pending) return pending;
    pending = fetch(RELATIONS_URL(), { headers: { 'Accept': 'application/json' } })
        .then(r => r.json())
        .then(data => {
            cache = (data && data.success) || {};
            pending = null;
            return cache;
        })
        .catch(err => {
            pending = null;
            console.warn('[korm] unable to load relations', err);
            return {};
        });
    return pending;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
}

function relationRow(rel) {
    const isOut = rel.kind === 'belongs_to';
    const arrow = isOut ? '→' : '←';
    const other = escapeHtml(rel.other);
    const path = `${escapeHtml(rel.other)}.${escapeHtml(rel.other_field)}`;
    const local = `${escapeHtml(rel.field)}`;
    return `
        <button class="rel-row" data-target="${other}" type="button">
            <span class="rel-arrow ${isOut ? 'out' : 'in'}">${arrow}</span>
            <span class="rel-body">
                <span class="rel-name">${other}</span>
                <span class="rel-path">${isOut ? `${local} ` : `${path} `}<span class="rel-sep">→</span> ${isOut ? path : local}</span>
            </span>
            <span class="rel-kind">${isOut ? 'belongs to' : 'has many'}</span>
        </button>`;
}

class RelationPopover {
    /**
     * @param {HTMLElement} anchor element that triggers the popover on hover
     * @param {string} table  name of the table the anchor represents
     */
    constructor(anchor, table) {
        this.anchor = anchor;
        this.table = table;
        this.el = null;
        this.timer = null;
        this.visible = false;
    }

    async show() {
        const relations = await loadRelations();
        const list = relations[this.table] || [];
        if (!list.length) {
            return;
        }
        if (!this.el) {
            this.el = document.createElement('div');
            this.el.className = 'relation-popover';
            document.body.appendChild(this.el);
        }
        const outgoing = list.filter(r => r.kind === 'belongs_to');
        const incoming = list.filter(r => r.kind === 'has_many');

        this.el.innerHTML = `
            <div class="rel-head">
                <span class="rel-head-title">${escapeHtml(this.table)}</span>
                <span class="rel-head-count">${list.length} relation${list.length > 1 ? 's' : ''}</span>
            </div>
            <div class="rel-list">
                ${outgoing.length ? `<div class="rel-group-label">References</div>${outgoing.map(relationRow).join('')}` : ''}
                ${incoming.length ? `<div class="rel-group-label">Referenced by</div>${incoming.map(relationRow).join('')}` : ''}
            </div>`;

        this.el.querySelectorAll('.rel-row').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                const path = (document.body.dataset.path || '/admin').replace(/\/$/, '');
                window.location.href = `${path}/tables/${target}`;
            });
        });

        this.el.classList.add('show');
        this.visible = true;
        this.position();
    }

    position() {
        if (!this.el) return;
        const rect = this.anchor.getBoundingClientRect();
        const pop = this.el.getBoundingClientRect();
        const gap = 10;

        let left = rect.right + gap;
        if (left + pop.width > window.innerWidth - 12) {
            left = rect.left - pop.width - gap;
        }
        if (left < 12) {
            left = Math.min(Math.max(12, rect.left), window.innerWidth - pop.width - 12);
        }

        let top = rect.top;
        if (top + pop.height > window.innerHeight - 12) {
            top = Math.max(12, window.innerHeight - pop.height - 12);
        }

        this.el.style.left = `${left}px`;
        this.el.style.top = `${top}px`;
    }

    hide() {
        if (this.el) {
            this.el.classList.remove('show');
        }
        this.visible = false;
    }

    destroy() {
        this.hide();
        if (this.el && this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }
        this.el = null;
    }
}

/**
 * Attach a relations popover to an element.
 * The element must expose the table name via `data-table`.
 */
export function attachRelations(anchor, table) {
    if (!anchor || !table) return null;
    if (anchor.dataset.relBound === '1') return null;
    anchor.dataset.relBound = '1';

    const popover = new RelationPopover(anchor, table);
    let enterDelay = null;

    anchor.addEventListener('mouseenter', () => {
        clearTimeout(enterDelay);
        enterDelay = setTimeout(() => popover.show(), 140);
    });

    anchor.addEventListener('mouseleave', () => {
        clearTimeout(enterDelay);
        popover.hide();
    });

    anchor.addEventListener('focus', () => popover.show());
    anchor.addEventListener('blur', () => popover.hide());

    return popover;
}

export function refreshRelations() {
    cache = null;
    return loadRelations();
}

export const Relations = {
    attach: attachRelations,
    load: loadRelations,
    refresh: refreshRelations,
};

export default Relations;

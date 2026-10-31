import Tooltip from './Tooltip.js';

class DataTable extends HTMLElement {
    #data = [];
    #columns = [];
    #selectionBar = null;
    #onRowClick = null;  // Callback for row clicks
    #fkeys = {};
    #fkeysModels = {};
    #pk = 'id';
    #table = '';

    // Constants for special column types
    static TIMESTAMP_KEYWORDS = ['time', 'timestamp', 'Time'];
    static IMAGE_KEYWORDS = ['image', 'photo', 'img', 'url'];

    // Replace single flag with a map of column keys to their time format
    #columnTimeFormats = new Map();

    // Add tableData setter
    set tableData(data) {
        this.#data = data.rows || [];
        this.#fkeys = data.fkeys || {};
        this.#fkeysModels = data.fkeysModels || {};
        this.#pk = data.pk || 'id';
        // Generate columns from columnsOrdered
        this.#columns = data.columnsOrdered?.map(col => ({
            key: col,
            label: col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, ' '),
            type: this.#getColumnType(col, data.columns[col], data.dbcolumns[col])
        })) || [];

        this.render();
    }

    flashRow(pk, type = 'update') {
        if (pk === undefined || pk === null) return;
        const tr = this.shadowRoot.querySelector(`tr[data-pk="${pk}"]`);
        if (tr) {
            tr.classList.remove('row-flash-insert', 'row-flash-update');
            void tr.offsetWidth;
            tr.classList.add(type === 'insert' ? 'row-flash-insert' : 'row-flash-update');
            setTimeout(() => {
                tr.classList.remove('row-flash-insert', 'row-flash-update');
            }, 1900);
        }
    }

    #getColumnType(colName, goType, dbType) {
        if (this.constructor.TIMESTAMP_KEYWORDS.some(k => goType?.includes(k) && !goType?.includes('map'))) {
            return 'timestamp';
        }
        if (this.constructor.IMAGE_KEYWORDS.some(k => colName?.includes(k))) {
            return 'image';
        }
        if (goType?.includes('bool')) {
            return 'boolean';
        }
        if (this.#fkeys && this.#fkeys[colName]) {
            return 'fk';
        }
        return 'text';
    }

    static get defaultStyles() {
        return `
            <style>
                :host {
                    display: block;
                    --dt-border: var(--border-subtle, rgba(13,16,32,.08));
                    --dt-surface: var(--bg-surface, #fff);
                    --dt-surface-2: var(--bg-surface-2, #f7f8fc);
                    --dt-text: var(--text-primary, #0d1020);
                    --dt-muted: var(--text-muted, #8b91a7);
                    --dt-accent: var(--theme-color, #4f46e5);
                }

                .table-container {
                    background: var(--dt-surface);
                    border-radius: var(--radius-lg, 18px);
                    border: 1px solid var(--dt-border);
                    box-shadow: var(--shadow-sm, 0 2px 6px rgba(13,16,32,.06));
                    overflow: auto;
                    max-height: calc(100vh - 340px);
                    min-height: 180px;
                }

                .data-table {
                    width: 100%;
                    min-width: 760px;
                    border-collapse: separate;
                    border-spacing: 0;
                    font-size: 13px;
                }

                .data-table thead th {
                    position: sticky;
                    top: 0;
                    z-index: 2;
                    background: var(--dt-surface-2);
                    padding: 11px 14px;
                    text-align: left;
                    font-weight: 700;
                    font-size: 11px;
                    letter-spacing: 0.07em;
                    text-transform: uppercase;
                    color: var(--dt-muted);
                    border-bottom: 1px solid var(--dt-border);
                    white-space: nowrap;
                    user-select: none;
                }

                .data-table tbody td {
                    padding: 11px 14px;
                    vertical-align: middle;
                    line-height: 1.5;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 260px;
                    border-bottom: 1px solid var(--dt-border);
                    color: var(--dt-text);
                }

                .data-table tbody tr {
                    cursor: pointer;
                    transition: background-color 140ms cubic-bezier(0.22, 1, 0.36, 1);
                }

                .data-table tbody tr:hover {
                    background: color-mix(in srgb, var(--dt-accent) 6%, transparent);
                }

                .data-table tbody tr:last-child td {
                    border-bottom: none;
                }

                .data-table tbody tr.is-selected {
                    background: color-mix(in srgb, var(--dt-accent) 10%, transparent);
                }

                .data-table tbody tr.row-flash-insert {
                    animation: row-flash-insert-anim 1.8s ease-out;
                }

                .data-table tbody tr.row-flash-update {
                    animation: row-flash-update-anim 1.8s ease-out;
                }

                @keyframes row-flash-insert-anim {
                    0% { background: color-mix(in srgb, #10b981 38%, transparent); }
                    100% { background: transparent; }
                }

                @keyframes row-flash-update-anim {
                    0% { background: color-mix(in srgb, var(--dt-accent) 38%, transparent); }
                    100% { background: transparent; }
                }

                /* ---------- checkbox cell ---------- */
                .checkbox-cell {
                    width: 44px;
                    text-align: center;
                    padding-left: 16px !important;
                    padding-right: 4px !important;
                }

                input[type="checkbox"] {
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border: 1.5px solid var(--border-strong, rgba(13,16,32,.2));
                    border-radius: 5px;
                    background: transparent;
                    cursor: pointer;
                    position: relative;
                    transition: all 140ms cubic-bezier(0.22, 1, 0.36, 1);
                    vertical-align: middle;
                }

                input[type="checkbox"]:hover {
                    border-color: var(--dt-accent);
                }

                input[type="checkbox"]:checked {
                    background: var(--dt-accent);
                    border-color: var(--dt-accent);
                }

                input[type="checkbox"]:checked::after {
                    content: '';
                    position: absolute;
                    left: 4.5px;
                    top: 1px;
                    width: 4px;
                    height: 9px;
                    border: solid #fff;
                    border-width: 0 2px 2px 0;
                    transform: rotate(45deg);
                }

                input[type="checkbox"]:indeterminate {
                    background: var(--dt-accent);
                    border-color: var(--dt-accent);
                }

                input[type="checkbox"]:indeterminate::after {
                    content: '';
                    position: absolute;
                    left: 2.5px;
                    top: 6px;
                    width: 8px;
                    height: 2px;
                    background: #fff;
                    border-radius: 1px;
                }

                input[type="checkbox"]:disabled {
                    opacity: 0.85;
                    cursor: default;
                }

                /* ---------- boolean pill ---------- */
                .bool-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 2px 10px 2px 8px;
                    border-radius: 999px;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.02em;
                    border: 1px solid transparent;
                }

                .bool-pill.yes {
                    background: color-mix(in srgb, #10b981 14%, transparent);
                    color: #059669;
                    border-color: color-mix(in srgb, #10b981 24%, transparent);
                }

                .bool-pill.no {
                    background: var(--bg-surface-3, #eef0f7);
                    color: var(--dt-muted);
                    border-color: var(--dt-border);
                }

                .bool-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: currentColor;
                }

                /* ---------- foreign key ---------- */
                .fk {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 2px 9px;
                    border-radius: 999px;
                    font-family: var(--font-mono, ui-monospace, monospace);
                    font-size: 11.5px;
                    font-weight: 600;
                    background: color-mix(in srgb, var(--dt-accent) 11%, transparent);
                    color: var(--dt-accent);
                    border: 1px solid color-mix(in srgb, var(--dt-accent) 20%, transparent);
                    cursor: help;
                    transition: all 140ms cubic-bezier(0.22, 1, 0.36, 1);
                    max-width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .fk:hover {
                    background: color-mix(in srgb, var(--dt-accent) 18%, transparent);
                }

                .fk::before {
                    content: '';
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                    background: currentColor;
                    flex-shrink: 0;
                }

                /* ---------- timestamps ---------- */
                .timestamp {
                    font-family: var(--font-mono, ui-monospace, monospace);
                    font-size: 12px;
                    color: var(--dt-muted);
                }

                th.timestamp {
                    cursor: pointer;
                }

                th.timestamp::after {
                    content: attr(data-format);
                    margin-left: 6px;
                    opacity: 0.65;
                    font-size: 10px;
                }

                /* ---------- images ---------- */
                .data-table td img {
                    max-height: 46px;
                    max-width: 80px;
                    border-radius: 8px;
                    border: 1px solid var(--dt-border);
                    object-fit: cover;
                    display: block;
                }

                /* ---------- truncated content ---------- */
                .truncated-cell {
                    max-width: 300px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    cursor: help;
                }

                .data-table td[data-column="content"],
                .data-table td[data-column="description"],
                .data-table td[data-column="text"],
                .data-table td[data-column="body"] {
                    max-width: 340px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                /* ---------- empty state ---------- */
                .dt-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 64px 20px;
                    color: var(--dt-muted);
                }

                .dt-empty svg {
                    width: 38px;
                    height: 38px;
                    fill: none;
                    stroke: currentColor;
                    stroke-width: 1.4;
                    opacity: 0.5;
                }

                .dt-empty strong {
                    font-size: 14px;
                    color: var(--text-secondary, #565d75);
                }

                .dt-empty span {
                    font-size: 12.5px;
                }

                /* ---------- selection bar ---------- */
                .selection-bar {
                    position: fixed;
                    bottom: 28px;
                    left: 50%;
                    transform: translateX(-50%) translateY(20px);
                    background: var(--dt-text);
                    color: var(--bg-canvas, #f4f5fa);
                    padding: 10px 14px;
                    border-radius: 999px;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    box-shadow: var(--shadow-lg, 0 24px 60px -12px rgba(13,16,32,.22));
                    z-index: 1000;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .selection-bar.show {
                    opacity: 1;
                    visibility: visible;
                    transform: translateX(-50%) translateY(0);
                }

                .selection-bar .selected-count {
                    font-size: 12.5px;
                    font-weight: 700;
                    white-space: nowrap;
                }

                .selection-bar .actions {
                    display: flex;
                    gap: 4px;
                }

                .selection-bar button {
                    display: grid;
                    place-items: center;
                    width: 30px;
                    height: 30px;
                    padding: 0;
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    color: inherit;
                    cursor: pointer;
                    border-radius: 50%;
                    transition: background-color 140ms ease;
                }

                .selection-bar button:hover {
                    background: rgba(255, 255, 255, 0.2);
                }

                .selection-bar button svg {
                    width: 16px;
                    height: 16px;
                    fill: none;
                    stroke: currentColor;
                    stroke-width: 2;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }

                @media (max-width: 768px) {
                    .table-container {
                        max-height: none;
                    }

                    .selection-bar {
                        bottom: 78px;
                    }
                }
            </style>
        `;
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // Create selection bar
        this.#selectionBar = document.createElement('div');
        this.#selectionBar.className = 'selection-bar';
        this.#selectionBar.innerHTML = `
            <span class="selected-count">0 records selected</span>
            <div class="actions">
                <button title="Reset selection">
                    <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
                <button title="Delete selected">
                    <svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                </button>
            </div>
        `;
    }

    set columns(value) {
        this.#columns = value;
        this.render();
    }

    set data(value) {
        if (!Array.isArray(value)) {
            console.error('Data must be an array');
            return;
        }
        this.#data = value;

        this.render();

        // Setup event listeners for the new rows
        this.shadowRoot.querySelectorAll('.data-table tbody tr').forEach(row => {
            row.addEventListener('click', (e) => {
                if (!e.target.closest('.checkbox-cell')) {
                    const rowData = this.getRowData(row);
                    this.#onRowClick?.(rowData, row);
                }
            });
        });

        this.setupSelectionHandling();
    }

    set onRowClick(callback) {
        this.#onRowClick = callback;
    }

    render() {
        const hasData = this.#data.length > 0;

        this.shadowRoot.innerHTML = `
            ${DataTable.defaultStyles}
            <div class="table-container">
                ${hasData ? `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th class="checkbox-cell">
                                <input type="checkbox" class="select-all">
                            </th>
                            ${this.#columns.map(col => `
                                <th ${col.type === 'timestamp' ? `class="timestamp" data-column="${col.key}" data-format="${this.#columnTimeFormats.get(col.key) ? '🕒' : '📅'}"` : `data-column="${col.key}"`}>${col.label}</th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${this.#data.map(row => `
                            <tr data-pk="${row[this.#pk]}">
                                <td class="checkbox-cell">
                                    <input type="checkbox" class="row-checkbox">
                                </td>
                                ${this.#columns.map(col => `
                                    <td data-column="${col.key}">${this.formatCell(row[col.key], col.type, col.key)}</td>
                                `).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>` : `
                <div class="dt-empty">
                    <svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>
                    <strong>No rows found</strong>
                    <span>This table is empty, or your search matched nothing.</span>
                </div>`}
            </div>
        `;

        // Re-append the selection bar
        if (this.#selectionBar) {
            this.shadowRoot.appendChild(this.#selectionBar);
        }

        this.setupEventListeners();
    }

    formatCell(value, type, colKey) {
        if (value === null || value === undefined || value === '') return '';
        if (type === 'boolean') {
            const yes = value == 1 || value === true || value === 'true';
            return `<span class="bool-pill ${yes ? 'yes' : 'no'}"><span class="bool-dot"></span>${yes ? 'true' : 'false'}</span>`;
        }
        switch (type) {
            case 'timestamp':
                const formattedTime = this.#columnTimeFormats.get(colKey) ? value : this.#formatTimestamp(value);
                const label = colKey.charAt(0).toUpperCase() + colKey.slice(1).replace(/_/g, ' ');
                return `<span class="timestamp" data-column="${colKey}" data-unix="${value}" data-label="${label}">
                    ${formattedTime}
                </span>`;

            case 'image':
                return value ? `<img src="${value}" alt="image" loading="lazy">` : '';

            case 'fk':
                const fkeyValues = this.#fkeys[colKey] || [];
                const fkeyModels = this.#fkeysModels[colKey] || [];

                // Find the index of the value in fkeyValues array
                const modelIndex = fkeyValues.findIndex(val => val === value);

                let tooltipContent = '';
                if (modelIndex >= 0 && fkeyModels[modelIndex]) {
                    const model = fkeyModels[modelIndex];
                    tooltipContent = Object.entries(model)
                        .filter(([key, val]) => val !== null && val !== undefined && key !== 'password')
                        .map(([key, val]) => {
                            if (key === 'created_at' || key.includes('_at')) {
                                return `${key}: ${this.#formatTimestamp(val)}`;
                            }
                            return `${key}: ${val}`;
                        })
                        .join('\n');
                }

                return `<span class="fk" data-tooltip="${tooltipContent.replace(/"/g, '&quot;')}">${value}</span>`;

            default:
                // Handle text content, including WYSIWYG editor content
                if (typeof value === 'string') {
                    // Strip HTML tags for WYSIWYG content
                    const cleanText = value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

                    if (cleanText.length > 50) {
                        return `<div class="truncated-cell" data-content="${cleanText.replace(/"/g, '&quot;')}">
                            ${cleanText.substring(0, 50)}...
                        </div>`;
                    }
                    return cleanText;
                }
                return value;
        }
    }

    setupEventListeners() {
        // Row click handler
        this.shadowRoot.querySelectorAll('.data-table tbody tr').forEach(row => {
            row.addEventListener('click', (e) => {
                if (!e.target.closest('.checkbox-cell')) {
                    const rowData = this.getRowData(row);
                    this.#onRowClick?.(rowData, row);
                }
            });
        });

        // Selection handling
        this.setupSelectionHandling();

        // Toggle timestamp format
        this.shadowRoot.querySelectorAll('th.timestamp').forEach(th => {
            th.addEventListener('click', () => {
                const columnKey = th.dataset.column;
                this.#columnTimeFormats.set(columnKey, !this.#columnTimeFormats.get(columnKey));
                th.dataset.format = this.#columnTimeFormats.get(columnKey) ? '🕒' : '📅';

                // Update only the cells for this column, not the header
                const cells = this.shadowRoot.querySelectorAll(`td .timestamp[data-column="${columnKey}"]`);
                cells.forEach(cell => {
                    const unix = cell.dataset.unix;
                    cell.textContent = this.#columnTimeFormats.get(columnKey) ? unix : this.#formatTimestamp(unix);
                });
            });
        });

        // Setup tooltips for foreign keys
        this.shadowRoot.querySelectorAll('.fk').forEach(fk => {
            new Tooltip(fk, {
                allowHtml: true,
                className: 'fk-tooltip'
            });
        });

        // Setup tooltips for truncated cells
        this.shadowRoot.querySelectorAll('.truncated-cell').forEach(cell => {
            new Tooltip(cell, {
                className: 'content-tooltip',
                maxWidth: 400
            });
        });
    }

    getRowData(row) {
        const pk = row.dataset.pk;
        return this.#data.find(item => item[this.#pk] == pk) || {};
    }

    setupSelectionHandling() {
        const selectAllCheckbox = this.shadowRoot.querySelector('.select-all');
        const rowCheckboxes = this.shadowRoot.querySelectorAll('.row-checkbox');
        const resetButton = this.#selectionBar.querySelector('button[title="Reset selection"]');
        const deleteButton = this.#selectionBar.querySelector('button[title="Delete selected"]');

        // Add delete button handler
        deleteButton?.addEventListener('click', async () => {
            const selectedRows = [...rowCheckboxes]
                .filter(cb => cb.checked)
                .map(cb => Number(cb.closest('tr').dataset.pk));

            if (selectedRows.length === 0) {
                return;
            }

            Ask(`Are you sure you want to delete ${selectedRows.length} records?`).then(async ok => {
                if (ok) {
                    try {
                        // Get table name from document data attribute
                        const tableName = document.body.dataset.table;
                        const adminPath = document.body.dataset.path;

                        const response = await fetch(`${adminPath}/delete/rows`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                ids: selectedRows,
                                table: tableName
                            })
                        });

                        const result = await response.json();
                        if (result.success) {
                            Notif.New({
                                title: 'Success',
                                message: 'Records deleted successfully',
                                type: 'success',
                                duration: 3000
                            }).show()
                            result.ids.forEach(id => {
                                const row = this.shadowRoot.querySelector(`tr[data-pk="${id}"]`);
                                if (row) {
                                    row.remove();
                                }
                            });
                            this.updateSelectionBar();
                        } else {
                            console.error('Error deleting records:', result.error);
                        }
                    } catch (error) {
                        console.error('Error deleting records:', error);
                    }
                }
            })
        });

        // Add reset button handler
        resetButton?.addEventListener('click', () => {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
            rowCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
                checkbox.closest('tr')?.classList.remove('is-selected');
            });
            this.updateSelectionBar();
        });

        // Existing select all checkbox handler
        selectAllCheckbox?.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            rowCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
                checkbox.closest('tr')?.classList.toggle('is-selected', isChecked);
            });
            this.updateSelectionBar();
        });

        // Existing individual row checkbox handler
        rowCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                selectAllCheckbox.checked = [...rowCheckboxes].every(cb => cb.checked);
                selectAllCheckbox.indeterminate = [...rowCheckboxes].some(cb => cb.checked) && !selectAllCheckbox.checked;
                checkbox.closest('tr')?.classList.toggle('is-selected', checkbox.checked);
                this.updateSelectionBar();
            });
        });
    }

    updateSelectionBar() {
        const checkedCount = this.shadowRoot.querySelectorAll('.row-checkbox:checked').length;

        if (checkedCount > 0) {
            this.#selectionBar.querySelector('.selected-count').textContent = `${checkedCount} record${checkedCount > 1 ? 's' : ''} selected`;
            this.#selectionBar.classList.add('show');
        } else {
            this.#selectionBar.classList.remove('show');
        }
    }

    #formatTimestamp(value) {
        if (!value) return '';
        const date = new Date(value * 1000);
        // Use local timezone
        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }

    // Add getter for data
    get data() {
        return this.#data || [];  // Ensure we always return an array
    }

    // Add this method to make it accessible from outside
    getColumnType(fieldName) {
        const column = this.#columns.find(col => col.key === fieldName);
        return column ? column.type : 'text';
    }

    get pk() {
        return this.#pk;
    }

    // Add this method to detect WYSIWYG/content columns
    #isContentColumn(colKey) {
        const contentKeywords = ['content', 'description', 'text', 'body', 'wysiwyg'];
        return contentKeywords.some(keyword => colKey.toLowerCase().includes(keyword));
    }
}

customElements.define('data-table', DataTable);

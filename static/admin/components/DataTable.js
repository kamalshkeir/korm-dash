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

    #getColumnType(colName, goType, dbType) {
        if (this.constructor.TIMESTAMP_KEYWORDS.some(k => goType?.includes(k))) {
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
                .table-container {
                    background: white;
                    border-radius: 0.75rem;
                    border: 1px solid var(--border-color);
                    margin-bottom: 1rem;
                    overflow-x: auto;
                }

                .data-table {
                    width: 100%;
                    min-width: 800px;
                    border-collapse: collapse;
                    font-size: 0.875rem;
                }

                .data-table tr {
                    height: 60px;  /* Fixed row height */
                }

                .data-table th {
                    background: var(--bg-gray);
                    padding: 0.75rem 1rem;
                    text-align: left;
                    font-weight: 500;
                    color: var(--text-gray);
                    border-bottom: 1px solid var(--border-color);
                    white-space: nowrap;
                }

                .data-table td {
                    padding: 0.75rem 1rem;
                    border-bottom: 1px solid var(--border-color);
                    vertical-align: middle;
                    line-height: 1.5;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 200px;
                }

                .data-table td[data-column="content"] {
                    white-space: normal;
                    max-height: 60px;
                    overflow: hidden;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                }

                .data-table td span[title] {
                    cursor: help;
                    display: block;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .data-table tbody tr {
                    cursor: pointer;
                }

                .data-table tbody tr:hover {
                    background: var(--bg-gray);
                }

                .checkbox-cell {
                    width: 48px;
                    text-align: center;
                }

                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 0.25rem 0.75rem;
                    border-radius: 1rem;
                    font-size: 0.75rem;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                }

                .status-badge.published {
                    background: #dcfce7;
                    color: var(--theme-color);
                }

                .status-badge.draft {
                    background: #f3f4f6;
                    color: #374151;
                }

                /* Selection bar */
                .selection-bar {
                    position: fixed;
                    bottom: 30px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--theme-color);
                    color: white;
                    padding: 0.75rem 1.25rem;
                    border-radius: 0.75rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    z-index: 1000;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.2s ease;
                }

                @media (max-width: 768px) {
                    .selection-bar {
                        bottom: 70px;
                    }

                    .selection-bar .actions{
                        display:flex;
                    }
                }

                .selection-bar.show {
                    opacity: 1;
                    visibility: visible;
                }

                .selection-bar button {
                    padding: 0.5rem;
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    border-radius: 0.5rem;
                }

                .selection-bar button:hover {
                    background: var(--theme-color-hover);
                }

                .selection-bar button svg {
                    width: 20px;
                    height: 20px;
                    fill: currentColor;
                }

                /* Dark mode */
                :host-context(.dark-mode) .table-container {
                    background: #1a1a1a;
                    border-color: #2a2a2a;
                }

                :host-context(.dark-mode) .data-table {
                    color: #e5e5e5;
                }

                :host-context(.dark-mode) .data-table th {
                    background: #1f1f1f;
                    color: #a1a1aa;
                    border-bottom-color: #2a2a2a;
                }

                :host-context(.dark-mode) .data-table td {
                    border-bottom-color: #2a2a2a;
                    height: 40px;
                }

                :host-context(.dark-mode) .data-table tbody tr:hover {
                    background: #222222;
                }

                .data-table td img {
                    max-height: 50px;
                    border-radius: 4px;
                }

                .selected-count {
                    white-space: nowrap;
                }

                .data-table td.fk {
                    color: var(--theme-color);
                    cursor: help;
                }

                .data-table th.timestamp {
                    cursor: pointer;
                }

                .data-table th.timestamp::after {
                    content: attr(data-format);
                    margin-left: 4px;
                }

                .fk {
                    cursor: help;
                    color: var(--theme-color);  /* Use theme color */
                    font-weight: 500;
                    padding: 0.25rem 0.5rem;
                    background: rgba(147, 51, 74, 0.1);  /* Light theme color background */
                    border-radius: 0.25rem;
                    transition: all 0.2s ease;
                    text-decoration: none;  /* Remove underline */
                }

                .fk:hover {
                    background: rgba(147, 51, 74, 0.2);  /* Darker theme color on hover */
                }

                /* Dark mode styles */
                :host-context(.dark-mode) .fk {
                    color: var(--theme-color);  /* Keep theme color in dark mode */
                    background: rgba(147, 51, 74, 0.15);  /* Slightly more opaque in dark mode */
                }

                :host-context(.dark-mode) .fk:hover {
                    background: rgba(147, 51, 74, 0.25);
                }

                .tooltip {
                    position: fixed;
                    background: #333;
                    color: white;
                    padding: 0.75rem 1rem;
                    border-radius: 0.375rem;
                    font-size: 0.875rem;
                    z-index: 10000;
                    pointer-events: none;
                    white-space: pre-line;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    max-width: 300px;
                    opacity: 1;
                    visibility: visible;
                }

                /* Dark mode tooltip */
                :host-context(.dark-mode) .tooltip {
                    background: #1a1a1a;
                    border: 1px solid #2a2a2a;
                }

                .timestamp-cell {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    white-space: nowrap;
                }

                .timestamp {
                    flex: 1;
                    min-width: 0;
                }

                th.timestamp {
                    cursor: pointer;
                    user-select: none;
                    white-space: nowrap;
                }

                th.timestamp::after {
                    content: attr(data-format);
                    margin-left: 0.5rem;
                    opacity: 0.7;
                }

                /* Add these new styles */
                .truncated-cell {
                    max-width: 200px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    cursor: help;
                }

                td {
                    max-width: 200px; /* Consistent max-width for all cells */
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                /* Style for content columns (like WYSIWYG fields) */
                td[data-column="content"],
                td[data-column="description"],
                td[data-column="text"] {
                    max-width: 300px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                /* Tooltip styles */
                .content-tooltip {
                    position: fixed;
                    background: #333;
                    color: white;
                    padding: 0.75rem 1rem;
                    border-radius: 0.375rem;
                    font-size: 0.875rem;
                    z-index: 10000;
                    pointer-events: none;
                    max-width: 400px;
                    white-space: normal;
                    line-height: 1.4;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }

                /* Dark mode tooltip */
                :host-context(.dark-mode) .content-tooltip {
                    background: #1a1a1a;
                    border: 1px solid #2a2a2a;
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
                    <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
                <button title="Delete selected">
                    <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
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
        // Store the data
        this.#data = value;
        
        // Render and setup event listeners
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

        // Re-setup selection handling for the new rows
        this.setupSelectionHandling();
    }

    set onRowClick(callback) {
        this.#onRowClick = callback;
    }

    render() {
        this.shadowRoot.innerHTML = `
            ${DataTable.defaultStyles}
            <div class="table-container">
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
                </table>
            </div>
        `;

        // Re-append the selection bar
        if (this.#selectionBar) {
            this.shadowRoot.appendChild(this.#selectionBar);
        }

        this.setupEventListeners();
    }

    formatCell(value, type, colKey) {
        if (!value && value !== 0) return '';

        switch(type) {
            case 'timestamp':
                const formattedTime = this.#columnTimeFormats.get(colKey) ? value : this.#formatTimestamp(value);
                const label = colKey.charAt(0).toUpperCase() + colKey.slice(1).replace(/_/g, ' ');
                return `<span class="timestamp" data-column="${colKey}" data-unix="${value}" data-label="${label}">
                    ${formattedTime}
                </span>`;

            case 'image':
                return value ? `<img src="${value}" alt="image">` : '';

            case 'boolean':
                return `<input type="checkbox" ${value == 1 || value === true ? 'checked' : ''} disabled>`;

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
                    
                    // Add data-content attribute to store full text for tooltips
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
                    // Call the callback with both rowData and the tr element
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
                const label = th.textContent; // Store the original label
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
        // Get the original data using the row's primary key
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
                .map(cb => cb.closest('tr').dataset.pk);

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
            });
            this.updateSelectionBar();
        });

        // Existing select all checkbox handler
        selectAllCheckbox?.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            rowCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
            this.updateSelectionBar();
        });

        // Existing individual row checkbox handler
        rowCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                selectAllCheckbox.checked = [...rowCheckboxes].every(cb => cb.checked);
                selectAllCheckbox.indeterminate = [...rowCheckboxes].some(cb => cb.checked) && !selectAllCheckbox.checked;
                this.updateSelectionBar();
            });
        });
    }

    updateSelectionBar() {
        const checkedCount = this.shadowRoot.querySelectorAll('.row-checkbox:checked').length;
        
        if (checkedCount > 0) {
            this.#selectionBar.querySelector('.selected-count').textContent = `${checkedCount} records selected`;
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
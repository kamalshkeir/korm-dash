import { attachRelations } from '../components/Relations.js';

const adminPath = document.body.dataset.path;
const tableName = document.body.dataset.table;
const search = document.querySelector("form.table-search");
const table = document.querySelector('data-table');
let page = 1;
const prevButton = document.querySelector('.prev-page');
const nextButton = document.querySelector('.next-page');
const pageNumbers = document.getElementById('pageNumbers');
const rowsRange = document.getElementById('rowsRange');
const rowsTotal = document.getElementById('rowsTotal');
const PER_PAGE = 10;

/**
 * Columns that make a good human label for a related row, best first.
 */
const FK_LABEL_PRIORITY = [
    'name', 'title', 'label', 'email', 'username', 'full_name', 'first_name',
    'last_name', 'display_name', 'nickname', 'slug', 'subject', 'headline',
    'code', 'status', 'type', 'text', 'body', 'content', 'description'
];

/**
 * Columns that never make a good label (technical, bulky or noisy).
 */
const FK_LABEL_NOISE = /^(id|created_at|updated_at|deleted_at|created|updated|password|passwd|pwd|token|secret|hash|salt|image|img|photo|avatar|picture|url|link|json|payload|meta|uuid|guid|ip|ip_address|user_agent|content_hash)$/i;

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

/**
 * Extract the most meaningful column of a referenced row.
 * Returns an empty string when nothing better than the raw value exists.
 *
 * @param {object|null} row  the referenced row
 * @param {*} value           the foreign-key value (usually the primary key)
 * @returns {string}
 */
function resolveFkDisplay(row, value) {
    const raw = value === null || value === undefined ? '' : String(value);
    if (!row || typeof row !== 'object') return '';

    const entries = Object.entries(row).filter(([, val]) =>
        val !== null && val !== undefined && val !== '' && typeof val !== 'object');

    if (!entries.length) return '';

    let picked = null;

    // 1. Exact match on a human-friendly column name.
    for (const candidate of FK_LABEL_PRIORITY) {
        const found = entries.find(([key]) => key.toLowerCase() === candidate);
        if (found) { picked = found; break; }
    }

    // 2. A column whose name contains a human-friendly keyword.
    if (!picked) {
        for (const candidate of FK_LABEL_PRIORITY) {
            const found = entries.find(([key]) =>
                !FK_LABEL_NOISE.test(key) && key.toLowerCase().includes(candidate));
            if (found) { picked = found; break; }
        }
    }

    // 3. Any other short, non-noisy column.
    if (!picked) {
        picked = entries.find(([key]) => !FK_LABEL_NOISE.test(key)) || entries[0];
    }

    const display = String(picked[1]);
    return display === raw ? '' : display;
}

/**
 * Build a readable label for a foreign-key option.
 * Instead of dumping the whole row as JSON, we show the referenced value
 * followed by the most meaningful column of that row (name, title, email…).
 *
 * @param {object|null} row  the referenced row
 * @param {*} value           the foreign-key value (usually the primary key)
 * @returns {string}
 */
function humanizeFkLabel(row, value) {
    const raw = value === null || value === undefined ? '' : String(value);
    const display = resolveFkDisplay(row, value);
    if (!display) return raw;
    const short = display.length > 48 ? `${display.slice(0, 48)}…` : display;
    return `${raw} · ${short}`;
}

/**
 * Show, under each foreign-key field, the row it currently points to.
 */
function setupFkHints(root, fkeys, fkeysModels) {
    if (!root || !fkeys) return;
    Object.keys(fkeys).forEach(col => {
        const input = root.querySelector(`input[name="${col}"]`);
        const hint = root.querySelector(`[data-fk-hint="${col}"]`);
        if (!input || !hint) return;

        const values = fkeys[col] || [];
        const models = fkeysModels[col] || [];

        const refresh = () => {
            const raw = String(input.value ?? '').trim();
            const index = values.findIndex(v => String(v) === raw);
            if (index < 0 || !models[index]) {
                hint.textContent = '';
                hint.classList.remove('visible');
                return;
            }
            const display = resolveFkDisplay(models[index], raw);
            if (!display) {
                hint.textContent = '';
                hint.classList.remove('visible');
                return;
            }
            hint.innerHTML = `<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><span>${escapeHtml(display)}</span>`;
            hint.classList.add('visible');
        };

        input.addEventListener('input', refresh);
        input.addEventListener('change', refresh);
        refresh();
    });
}


/**
 * Render the pagination controls and the "x – y of z rows" summary.
 */
function renderPagination(total) {
    const totalPages = Math.max(1, Math.ceil((total || 0) / PER_PAGE));

    if (rowsTotal) rowsTotal.textContent = total ?? 0;
    if (rowsRange) {
        if (!total) {
            rowsRange.textContent = '0 rows';
        } else {
            const start = (page - 1) * PER_PAGE + 1;
            const end = Math.min(page * PER_PAGE, total);
            rowsRange.textContent = `${start}–${end}`;
        }
    }

    if (nextButton) nextButton.disabled = page >= totalPages;
    if (prevButton) prevButton.disabled = page <= 1;

    if (!pageNumbers) return;
    pageNumbers.innerHTML = '';

    const addBtn = (label, targetPage, opts = {}) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'page-number' + (opts.active ? ' active' : '');
        btn.textContent = label;
        if (opts.disabled) {
            btn.disabled = true;
            btn.style.visibility = 'hidden';
        } else {
            btn.addEventListener('click', () => {
                page = targetPage;
                loadTableData();
            });
        }
        pageNumbers.appendChild(btn);
    };

    const addEllipsis = () => {
        const span = document.createElement('span');
        span.className = 'page-ellipsis';
        span.textContent = '…';
        pageNumbers.appendChild(span);
    };

    const window_ = 1;
    const pages = new Set([1, totalPages, page]);
    for (let i = 1; i <= window_; i++) {
        pages.add(page - i);
        pages.add(page + i);
    }
    const visible = [...pages].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);

    let last = 0;
    visible.forEach(p => {
        if (p - last > 1) addEllipsis();
        addBtn(String(p), p, { active: p === page });
        last = p;
    });
}

document.addEventListener("DOMContentLoaded", () => {
    let serverData = null;

    // Pagination handlers
    prevButton?.addEventListener('click', () => {
        if (page > 1) {
            page--;
            loadTableData();
        }
    });

    nextButton?.addEventListener('click', () => {
        const isSearching = search.ssearch.value.trim() !== '';
        if (isSearching) {
            page++;
            // Re-run the search with new page
            fetch(`${adminPath}/tables/${tableName}/search`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    "query": search.ssearch.value,
                    "page_num": `${page}`
                })
            }).then(response => response.json()).then(data => {
                if (data && data.rows) {
                    updateTableWithData(data);
                }
            });
        } else {
            page++;
            loadTableData();
        }
    });

    const loadTableData = () => {
        return fetch(adminPath + "/tables/all/" + tableName, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "page": page })
        }).then(response => response.json()).then(data => {
            if (data.success) {
                serverData = data.success;
                table.tableData = serverData;
                renderPagination(serverData.total);
                const liveCount = document.getElementById("liveRowCount");
                if (liveCount && serverData.total !== undefined) {
                    liveCount.textContent = serverData.total;
                }
            }
            return data;
        });
    }

    // Live real-time sync with KORM hooks & ServerBus
    if (typeof window !== 'undefined' && window.BusClient && window.BusClient.Client) {
        window.BusClient.Client.NewClient({
            Id: `korm_table_${tableName}_${Date.now()}`,
            Secure: window.location.protocol === 'https:',
            AutoRestart: true
        }).then(client => {
            const handleHook = (msg) => {
                const event = (msg && msg.data) ? msg.data : msg;
                if (!event || (event.table && event.table !== tableName)) return;

                loadTableData().then(() => {
                    const pkField = serverData?.pk || document.body.dataset.pk || 'id';
                    const pkVal = event.data?.[pkField] || event.new?.[pkField] || event.old?.[pkField] || event.pk;
                    if (pkVal !== undefined && pkVal !== null && table.flashRow) {
                        table.flashRow(pkVal, event.operation || 'update');
                    }
                });
            };

            client.Subscribe("korm_db_dashboard_hooks", handleHook);
            client.Subscribe(`korm:table:${tableName}`, handleHook);
        }).catch(err => {
            console.debug('[korm live] ws bus sync:', err);
        });
    }

    // Handle import button
    document.querySelector('.import-btn').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.json';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.click();

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('thefile', file);
            formData.append('table', tableName);
            fetch(`${adminPath}/import`, {
                method: 'POST',
                body: formData
            }).then(res => res.json())
                .then(data => {
                    if (data.success) {
                        Notif.New({
                            title: 'Success',
                            message: 'Data imported successfully',
                            type: 'success'
                        }).show();
                        window.location.reload();
                    } else {
                        Notif.New({
                            title: 'Error',
                            message: data.error || 'Import failed',
                            type: 'error'
                        }).show();
                    }
                });

            document.body.removeChild(input);
        });
    });

    // Seed Mock Data Modal logic
    const seedBtn = document.getElementById('btnSeedData');
    const seedModal = document.getElementById('seedModal');
    const closeSeedModal = document.getElementById('closeSeedModal');
    const cancelSeedModal = document.getElementById('cancelSeedModal');
    const confirmSeedBtn = document.getElementById('confirmSeedBtn');
    const seedSpinner = document.getElementById('seedSpinner');
    let seedCount = 10;

    if (seedBtn && seedModal) {
        seedBtn.addEventListener('click', () => {
            seedModal.showModal();
        });

        const closeModal = () => {
            seedModal.close();
        };

        closeSeedModal?.addEventListener('click', closeModal);
        cancelSeedModal?.addEventListener('click', closeModal);

        seedModal.addEventListener('click', (e) => {
            if (e.target === seedModal) closeModal();
        });

        seedModal.querySelectorAll('.seed-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                seedModal.querySelectorAll('.seed-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                seedCount = parseInt(pill.dataset.count, 10) || 10;
            });
        });

        confirmSeedBtn?.addEventListener('click', async () => {
            confirmSeedBtn.disabled = true;
            if (seedSpinner) seedSpinner.style.display = 'inline-block';

            try {
                const res = await fetch(`${adminPath}/tables/${tableName}/seed`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ count: seedCount })
                });
                const data = await res.json();
                if (data.success) {
                    if (window.Notif && window.Notif.New) {
                        window.Notif.New({
                            title: 'Data Seeded!',
                            message: `Successfully generated and inserted ${data.inserted} mock row${data.inserted > 1 ? 's' : ''}`,
                            type: 'success'
                        }).show();
                    }
                    closeModal();

                    page = 1;
                    loadTableData();
                } else {
                    if (window.Notif && window.Notif.New) {
                        window.Notif.New({
                            title: 'Error',
                            message: data.error || 'Unable to seed rows',
                            type: 'error'
                        }).show();
                    }
                }
            } catch (err) {
                if (window.Notif && window.Notif.New) {
                    window.Notif.New({
                        title: 'Network Error',
                        message: err.message,
                        type: 'error'
                    }).show();
                }
            } finally {
                confirmSeedBtn.disabled = false;
                if (seedSpinner) seedSpinner.style.display = 'none';
            }
        });
    }

    // Time-Travel Audit Modal logic
    const btnOpenAudit = document.getElementById('btnOpenAudit');
    const auditModal = document.getElementById('auditModal');
    const closeAuditModal = document.getElementById('closeAuditModal');
    const btnRefreshAudit = document.getElementById('btnRefreshAudit');
    const auditRecordFilter = document.getElementById('auditRecordFilter');
    const auditTimelineContainer = document.getElementById('auditTimelineContainer');
    let auditFilterTimeout = null;

    if (btnOpenAudit && auditModal) {
        btnOpenAudit.addEventListener('click', () => {
            auditModal.showModal();
            loadAuditTimeline();
        });

        const closeAudit = () => {
            auditModal.close();
        };

        closeAuditModal?.addEventListener('click', closeAudit);
        auditModal.addEventListener('click', (e) => {
            if (e.target === auditModal) closeAudit();
        });

        btnRefreshAudit?.addEventListener('click', () => {
            loadAuditTimeline(auditRecordFilter?.value.trim() || '');
        });

        const btnPruneAudit = document.getElementById('btnPruneAudit');
        btnPruneAudit?.addEventListener('click', async () => {
            const ok = confirm(`Purge audit history older than 30 days for table "${tableName}"?`);
            if (!ok) return;

            try {
                const res = await fetch(`${adminPath}/audit/prune`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ table: tableName, days: 30 })
                });
                const data = await res.json();
                if (data.success) {
                    if (window.Notif && window.Notif.New) {
                        window.Notif.New({
                            title: 'Audit Purged',
                            message: `Cleaned ${data.deleted} old audit records`,
                            type: 'info'
                        }).show();
                    }
                    loadAuditTimeline(auditRecordFilter?.value.trim() || '');
                } else {
                    alert(data.error || 'Failed to prune audit logs');
                }
            } catch (err) {
                alert('Purge error: ' + err.message);
            }
        });

        auditRecordFilter?.addEventListener('input', () => {
            clearTimeout(auditFilterTimeout);
            auditFilterTimeout = setTimeout(() => {
                loadAuditTimeline(auditRecordFilter.value.trim());
            }, 300);
        });
    }

    async function loadAuditTimeline(recordId = '') {
        if (!auditTimelineContainer) return;
        auditTimelineContainer.innerHTML = '<div class="audit-empty-state">Loading timeline history…</div>';

        try {
            const url = `${adminPath}/audit/${tableName}${recordId ? `?record_id=${encodeURIComponent(recordId)}` : ''}`;
            const res = await fetch(url);
            const data = await res.json();

            if (!data.success || !data.items || data.items.length === 0) {
                auditTimelineContainer.innerHTML = `
                    <div class="audit-empty-state">
                        ${recordId ? `No mutations recorded for row #${escapeHtml(recordId)}` : 'No mutation history recorded for this table yet.'}
                    </div>`;
                return;
            }

            renderTimelineItems(data.items);
        } catch (err) {
            auditTimelineContainer.innerHTML = `
                <div class="audit-empty-state" style="color: var(--danger);">
                    Failed to load timeline: ${escapeHtml(err.message)}
                </div>`;
        }
    }

    function renderTimelineItems(items) {
        auditTimelineContainer.innerHTML = '';
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'timeline-card';

            const badgeClass = `audit-badge-${item.action.toLowerCase()}`;
            const diffRows = (item.diffs || []).map(d => {
                let oldHtml = d.old_value !== null && d.old_value !== undefined 
                    ? `<span class="diff-del">${escapeHtml(typeof d.old_value === 'object' ? JSON.stringify(d.old_value) : String(d.old_value))}</span>` 
                    : '';
                let newHtml = d.new_value !== null && d.new_value !== undefined 
                    ? `<span class="diff-ins">${escapeHtml(typeof d.new_value === 'object' ? JSON.stringify(d.new_value) : String(d.new_value))}</span>` 
                    : '';
                return `
                    <tr>
                        <td class="audit-diff-col-name">${escapeHtml(d.field)}</td>
                        <td class="audit-diff-vals">${oldHtml}${newHtml}</td>
                    </tr>
                `;
            }).join('');

            const diffTable = diffRows ? `
                <table class="audit-diff-table">
                    <tbody>${diffRows}</tbody>
                </table>
            ` : '<div style="font-size:12px; color:var(--text-muted); font-style:italic;">No field diffs</div>';

            card.innerHTML = `
                <div class="timeline-card-header">
                    <div class="timeline-meta-left">
                        <span class="${badgeClass}">${escapeHtml(item.action)}</span>
                        <span class="audit-row-pill">Row #${escapeHtml(item.record_id)}</span>
                        <span class="audit-author">by <strong>${escapeHtml(item.changed_by || 'admin')}</strong></span>
                        <span class="audit-timestamp" title="${escapeHtml(item.created_at)}">⚡ ${escapeHtml(item.time_ago)}</span>
                    </div>
                    <button type="button" class="btn-rollback" data-id="${item.id}" data-action="${escapeHtml(item.action)}" data-record="${escapeHtml(item.record_id)}">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                        <span>Rollback</span>
                    </button>
                </div>
                ${diffTable}
            `;

            const btnRollback = card.querySelector('.btn-rollback');
            btnRollback?.addEventListener('click', () => {
                confirmAndRollback(item.id, item.action, item.record_id);
            });

            auditTimelineContainer.appendChild(card);
        });
    }

    async function confirmAndRollback(auditId, action, recordId) {
        const ok = confirm(`Do you really want to rollback this ${action.toUpperCase()} on row #${recordId}?\nThis will revert the database state.`);
        if (!ok) return;

        try {
            const res = await fetch(`${adminPath}/audit/rollback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audit_id: auditId })
            });

            const data = await res.json();
            if (data.success) {
                if (window.Notif && window.Notif.New) {
                    window.Notif.New({
                        title: 'Rollback Successful',
                        message: data.message || `Reverted ${action} on row #${recordId}`,
                        type: 'success'
                    }).show();
                }
                loadAuditTimeline(auditRecordFilter?.value.trim() || '');
                loadTableData();
            } else {
                alert(data.error || 'Rollback failed');
            }
        } catch (err) {
            alert('Rollback network error: ' + err.message);
        }
    }

    search.addEventListener("submit", (e) => {
        e.preventDefault();
        page = 1;  // Reset page on new search
        fetch(`${adminPath}/tables/${tableName}/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "query": e.target.ssearch.value, "page_num": `${page}` })
        }).then(response => response.json()).then(data => {
            if (data && data.rows && data.rows.length > 0) {
                serverData = {
                    ...serverData,
                    rows: data.rows,
                    columns: data.types,
                    columnsOrdered: data.cols,
                    fkeys: data.fkeys,
                    fkeysModels: data.fkeysModels,
                    total: data.total
                };
                table.data = data.rows;
                renderPagination(data.total);
            }
        })
    })
    // Set up row click handler for edit
    table.onRowClick = (rowData, tr) => {
        const wrapper = document.getElementById('editWrapper');
        const panel = wrapper.querySelector('.side-panel');
        const overlay = wrapper.querySelector('.panel-overlay');
        if (panel) {
            panel.querySelector('.panel-title').textContent = 'Edit record';
            panel.querySelector('.panel-content').innerHTML = generateForm({ ...serverData, rowData });
            panel.classList.add('show');
            overlay.classList.add('show');
            document.body.style.overflow = 'hidden';

            setupImagePreviews();
            setupJoditEditor(panel);
            setupFkHints(panel, serverData?.fkeys, serverData?.fkeysModels);

            // Track changed fields
            const changedFields = new Set();
            const form = panel.querySelector('form');

            // Add change listeners to all inputs
            form.querySelectorAll('input, textarea').forEach(input => {
                input.addEventListener('change', () => {
                    const name = input.getAttribute('name');
                    if (name) changedFields.add(name);
                });
            });

            // Handle form submission
            form?.addEventListener('submit', (e) => {
                e.preventDefault();
                let data = new FormData();

                // Only add changed fields to FormData
                changedFields.forEach(fieldName => {
                    const input = form.querySelector(`[name="${fieldName}"]`);
                    if (!input) return;

                    if (input.type === "file") {
                        if (input.files[0]) {
                            data.set(fieldName, input.files[0]);
                        }
                    } else if (input.type === "datetime-local") {
                        let val = Date.parse(input.value).toString().substring(0, 10);
                        if (!isNaN(val)) {
                            data.set(fieldName, val);
                        }
                    } else if (input.type === "checkbox") {
                        data.set(fieldName, input.checked ? Number(1) : Number(0));
                    } else {
                        data.set(fieldName, input.value);
                    }
                });

                // Add required fields
                data.set("row_id", tr.dataset.pk);
                data.set("table", tableName);

                // Send the request
                fetch(`${adminPath}/update/row`, {
                    method: 'POST',
                    body: data
                })
                    .then(response => response.json())
                    .then(result => {
                        if (result.success) {
                            Notif.New({
                                title: 'Success',
                                message: 'Record updated successfully',
                                type: 'success',
                                duration: 3000
                            }).show()
                            closePanel(panel);

                            // Remove the old row from data array
                            const rowIndex = table.data.findIndex(row => row[table.pk] == tr.dataset.pk);
                            if (rowIndex >= 0) {
                                table.data = [
                                    ...table.data.slice(0, rowIndex),
                                    result.success,
                                    ...table.data.slice(rowIndex + 1)
                                ];
                            }
                        } else if (result.error) {
                            Notif.New({
                                title: 'Error Fetch',
                                message: result.error,
                                type: 'error',
                                duration: 3000
                            }).show()
                        } else {
                            console.error('Error updating record:', result.error);
                        }
                    })
                    .catch(error => {
                        Notif.New({
                            title: 'Error Submit Form',
                            message: error,
                            type: 'error',
                            duration: 3000
                        }).show()
                    });
            });
        }
    };

    // Handle New Record button
    const newRecordBtn = document.querySelector('button.new-record');
    if (newRecordBtn) {
        newRecordBtn.addEventListener('click', () => {
            const wrapper = document.getElementById('createWrapper');
            const panel = wrapper.querySelector('.side-panel');
            const overlay = wrapper.querySelector('.panel-overlay');
            if (panel && serverData) {
                panel.querySelector('.panel-title').textContent = 'New record';
                panel.querySelector('.panel-content').innerHTML = generateForm(serverData);
                panel.classList.add('show');
                overlay.classList.add('show');
                document.body.style.overflow = 'hidden';

                setupImagePreviews();
                setupJoditEditor(panel);
                setupFkHints(panel, serverData?.fkeys, serverData?.fkeysModels);

                // Handle ADD ROW - simplified without change tracking
                const form = panel.querySelector('form');
                form?.addEventListener('submit', (e) => {
                    e.preventDefault();
                    let data = new FormData();

                    // Process all form inputs with proper type handling
                    form.querySelectorAll('input, textarea').forEach(input => {
                        const name = input.getAttribute('name');
                        if (name) {
                            if (input.type === "file") {
                                if (input.files[0]) {
                                    data.set(name, input.files[0]);
                                }
                            } else if (input.type === "datetime-local") {
                                let val = Date.parse(input.value).toString().substring(0, 10);
                                if (!isNaN(val)) {
                                    data.set(name, val);
                                }
                            } else if (input.type === "checkbox") {
                                data.set(name, input.checked ? Number(1) : Number(0));
                            } else {
                                data.set(name, input.value);
                            }
                        }
                    });

                    // Add required field
                    data.set("table", tableName);
                    data.set("pk", document.body.dataset.pk)
                    // Send the request
                    fetch(`${adminPath}/create/row`, {
                        method: 'POST',
                        body: data
                    })
                        .then(response => response.json())
                        .then(result => {
                            if (result.success) {
                                Notif.New({
                                    title: 'Success',
                                    message: 'Record created successfully',
                                    type: 'success',
                                    duration: 3000
                                }).show()
                                closePanel(panel);
                                if (result.inserted) {
                                    table.data = [result.inserted, ...table.data];
                                }
                            } else {
                                Notif.New({
                                    title: 'Error Fetch',
                                    message: result.error,
                                    type: 'error',
                                    duration: 3000
                                }).show()
                            }
                        })
                        .catch(error => {
                            Notif.New({
                                title: 'Error Submit Form',
                                message: error,
                                type: 'error',
                                duration: 3000
                            }).show()
                        });
                });
            }
        });
    }

    // Close panel handler
    const closePanel = (panel) => {
        const wrapper = panel.closest('#editWrapper, #createWrapper');
        const overlay = wrapper.querySelector('.panel-overlay');
        panel.classList.remove('show');
        overlay.classList.remove('show');
        document.body.style.overflow = '';
    };

    // Setup panel close buttons
    document.querySelectorAll('.panel-close').forEach(btn => {
        btn.addEventListener('click', () => {
            closePanel(btn.closest('.side-panel'));
        });
    });

    // Close panel on overlay click
    document.querySelectorAll('.panel-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            closePanel(overlay.nextElementSibling);
        });
    });

    // Load table data
    loadTableData();

    // Add helper function to update table with data
    const updateTableWithData = (data) => {
        serverData = {
            ...serverData,
            rows: data.rows,
            columns: data.types,
            columnsOrdered: data.cols,
            fkeys: data.fkeys,
            fkeysModels: data.fkeysModels,
            total: data.total
        };
        table.data = data.rows;
        renderPagination(data.total);
    }

    // Related tables in the "Related tables" bar reveal their own relations.
    document.querySelectorAll('.related-bar .rel-chip[data-table]').forEach(chip => {
        attachRelations(chip, chip.dataset.table);
    });
});


function generateForm(data) {
    const { columnsOrdered, columns, dbcolumns, pk, fkeys, fkeysModels, rowData } = data;
    const isEdit = !!rowData;
    const formFields = columnsOrdered.map(col => {
        // Skip ID/PK fields for create mode
        if (!isEdit && (col === pk || col === 'id')) return '';

        // Disable primary key field in edit mode
        if (isEdit && (col === pk || col === 'id')) {
            return `
                <div class="form-group">
                    <label for="${col}">${col}</label>
                    <input type="text" id="${col}" name="${col}" class="form-control input" value="${rowData[col]}" disabled>
                </div>
            `;
        }

        const type = columns[col];
        const dbType = dbcolumns[col];

        let input = '';

        // Helper to check if field is an image type
        const isImageField = (colName) => {
            return ['image', 'photo', 'img', 'url'].some(k => colName.toLowerCase().includes(k));
        };

        // Helper to check if field is an email type
        const isEmailField = (colName) => {
            return ['email', 'mail'].some(k => colName.toLowerCase().includes(k));
        };

        // Add readonly attribute and onfocus handler to text inputs
        const readOnlyAttr = 'readonly onfocus="this.removeAttribute(\'readonly\')"';

        // Generate UUID for UUID fields in create mode
        if (!isEdit && col.toLowerCase().includes('uuid') && !fkeys[col]) {
            input = `<input type="text" id="${col}" name="${col}" class="form-control input" value="${crypto.randomUUID()}" readonly>`;
        } else if (fkeys && fkeys[col]) {
            const models = fkeysModels[col] || [];
            input = `
                <input type="text" class="form-control input" 
                    name="${col}" id="${col}" 
                    list="${col}-options"
                    ${readOnlyAttr}
                    value="${isEdit ? rowData[col] || '' : ''}">
                <datalist id="${col}-options">
                    ${fkeys[col].map((v, i) => {
                        const label = humanizeFkLabel(models[i], v);
                        return `<option value="${escapeHtml(v)}" label="${escapeHtml(label)}">${escapeHtml(label)}</option>`;
                    }).join('')}
                </datalist>
                <small class="fk-hint" data-fk-hint="${col}"></small>
            `;
        } else if (isImageField(col)) {
            const currentImage = isEdit && rowData[col] ? rowData[col] : '';
            input = `
                <div class="image-input-container">
                    <input type="file" 
                        id="${col}" 
                        name="${col}" 
                        class="form-control input" 
                        accept="image/*">
                    <input type="hidden" name="${col}_current" value="${currentImage}">
                    <div class="image-preview">
                        ${currentImage ? `<img src="${currentImage}" alt="Current image" style="max-width: 100%; height: auto;">` : ''}
                    </div>
                </div>
            `;
        } else if ((type.includes('time') || type.includes('timestamp') || type.includes('Time')) && !type.includes('map')) {
            let timestamp = '';
            if (isEdit && rowData[col]) {
                const ts = parseInt(rowData[col]);
                if (!isNaN(ts)) {
                    const date = new Date(ts * 1000);
                    // Adjust for local timezone
                    const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
                    const localDate = new Date(date.getTime() - tzOffset);
                    timestamp = localDate.toISOString().slice(0, 16);
                }
            }
            input = `<input type="datetime-local" name="${col}" id="${col}" class="form-control input" value="${timestamp}">`;
        } else if (type.includes('bool')) {
            const isChecked = isEdit && rowData[col] == 1;
            input = `
                <div class="toggle-group">
                    <label class="toggle">
                        <input type="checkbox" class="input" id="${col}" name="${col}" ${isChecked ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                    <span class="toggle-label">${isChecked ? 'Enabled' : 'Disabled'}</span>
                </div>
            `;
        } else if (col === 'password') {
            input = `
                <input name="${col}" 
                    id="${col}" 
                    type="password" 
                    class="form-control input" 
                    ${readOnlyAttr}
                    ${isEdit ? 'placeholder="Leave empty to keep current password"' : ''}>
            `;
        } else if (dbType && dbType.toLowerCase() === 'text') {
            input = `<textarea class="editor" name="${col}" id="${col}">${isEdit ? rowData[col] || '' : ''}</textarea>`;
        } else {
            input = `<input type="text" id="${col}" name="${col}" class="form-control input" ${readOnlyAttr} value="${isEdit ? rowData[col] || '' : ''}">`;
        }

        return `
            <div class="form-group">
                <label for="${col}">${col}</label>
                ${input}
            </div>
        `;
    }).join('');

    return `
        <form class="edit-form" autocomplete="off">
            ${formFields}
            <div class="panel-actions">
                <button class="btn btn-primary" type="submit">
                    ${isEdit ? 'Save changes' : 'Create record'}
                </button>
            </div>
        </form>
    `;
}

// Add this function to handle image preview
function setupImagePreviews() {
    document.querySelectorAll('.image-input-container input[type="file"]').forEach(input => {
        // Get the preview div (it's now after the hidden input)
        const previewDiv = input.parentElement.querySelector('.image-preview');

        // Get current image from the hidden input
        const currentImage = input.nextElementSibling.value;
        if (currentImage) {
            previewDiv.innerHTML = `<img src="${currentImage}" alt="Current image">`;
        }

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewDiv.innerHTML = `<img src="${e.target.result}" alt="Selected image">`;
                };
                reader.readAsDataURL(file);
            } else {
                previewDiv.innerHTML = '';
            }
        });
    });
}

// Update the setupJoditEditor function to use basic settings
function setupJoditEditor(panel) {
    panel.querySelectorAll("textarea.editor").forEach((ed) => {
        // Destroy any existing instance first
        const existingEditor = Jodit.instances[ed.id];
        if (existingEditor) {
            existingEditor.destruct();
        }

        const editor = new Jodit(ed, {
            enableDragAndDropFileToEditor: true,
            useSearch: false,
            uploader: {
                "insertImageAsBase64URI": true
            },
            height: 'auto',
            minHeight: 200,
            maxHeight: '70vh',
            allowResizeX: false,
            allowResizeY: true,
            saveHeightInStorage: true,
            showPlaceholder: false,
            statusbar: false,
            showCharsCounter: false,
            showWordsCounter: false,
            showXPathInStatusbar: false,
            toolbarAdaptive: false,
            toolbarSticky: false,
            buttons: [
                'bold', 'italic', 'underline', 'strikethrough', '|',
                'superscript', 'subscript', '|',
                'ul', 'ol', '|',
                'outdent', 'indent', '|',
                'font', 'fontsize', 'brush', '|',
                'image', 'video', 'file', 'table', '|',
                'link', 'unlink', '|',
                'align', 'left', 'center', 'right', 'justify', '|',
                'undo', 'redo', '|',
                'selectall', 'cut', 'copy', 'paste', '|',
                'source', 'fullsize'
            ]
        });
    });
}
// Make generateForm available to DataTable component
window.generateForm = generateForm;



/**
 * SQL Studio — Interactive Query Runner & korm.Select[T] Generator
 */

const adminPath = (window.adminPath || document.body.dataset.path || '/admin').replace(/\/$/, '');
const textarea = document.getElementById('queryInput');
const btnRun = document.getElementById('btnRunQuery');
const btnClear = document.getElementById('btnClearQuery');
const chkExplain = document.getElementById('chkExplain');
const dbSelect = document.getElementById('queryDb');
const limitSelect = document.getElementById('queryLimit');

const resultsSection = document.getElementById('resultsSection');
const resultsBody = document.getElementById('resultsBody');
const resStatusBadge = document.getElementById('resStatusBadge');
const resDuration = document.getElementById('resDuration');
const resCount = document.getElementById('resCount');
const btnExportJSON = document.getElementById('btnExportJSON');
const btnExportCSV = document.getElementById('btnExportCSV');
const historyPills = document.getElementById('historyPills');

// Saved Snippets
const btnSaveSnippet = document.getElementById('btnSaveSnippet');
const savedQueriesBar = document.getElementById('savedQueriesBar');
const savedChipsList = document.getElementById('savedChipsList');

// Dual View Tabs & Workspace
const editorWorkspace = document.getElementById('editorWorkspace');
const viewTabs = document.querySelectorAll('.view-tab');
const goCodeOutput = document.getElementById('goCodeOutput');
const btnCopyGoCode = document.getElementById('btnCopyGoCode');
const copyCodeText = document.getElementById('copyCodeText');

let currentResult = null;
let currentView = 'sql';
let syncTimer = null;

const STORAGE_KEY = 'korm_query_history';
const SAVED_STORAGE_KEY = 'korm_saved_snippets';

const escapeHtml = (val) => String(val ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

// ============================================================
// Tab Navigation (SQL / Go Selector / Split)
// ============================================================

viewTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const view = tab.dataset.view;
        setViewMode(view);
    });
});

function setViewMode(view) {
    currentView = view;
    viewTabs.forEach(t => t.classList.toggle('active', t.dataset.view === view));

    if (editorWorkspace) {
        editorWorkspace.className = `editor-workspace view-${view}-mode`;
    }

    if (view === 'go' || view === 'split') {
        syncGoCode();
    }
}

// ============================================================
// Live Selector Go Code Generation
// ============================================================

async function syncGoCode() {
    const sql = textarea?.value?.trim() || 'SELECT * FROM users LIMIT 10;';
    const db = dbSelect?.value || '';

    try {
        const res = await fetch(`${adminPath}/query/codegen`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sql,
                database: db
            })
        });
        const data = await res.json();
        if (data && data.success && goCodeOutput) {
            goCodeOutput.textContent = data.go_code;
        }
    } catch {
        renderFallbackGoCode(sql, db);
    }
}

function renderFallbackGoCode(sql, db) {
    if (!goCodeOutput) return;
    const cleanSQL = sql.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    let code = `// --- KORM selector.go ---\n`;
    code += `users, err := korm.Select[User]()`;
    if (db && db !== 'default') code += `\n\t.Database("${db}")`;
    code += `\n\t.Query(\`${cleanSQL}\`)\n`;
    goCodeOutput.textContent = code;
}

// Debounced sync when editing textarea
textarea?.addEventListener('input', () => {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
        if (currentView === 'go' || currentView === 'split') {
            syncGoCode();
        }
    }, 300);
});

// Copy Go Code Button
btnCopyGoCode?.addEventListener('click', async () => {
    const code = goCodeOutput?.textContent || '';
    if (!code) return;

    try {
        await navigator.clipboard.writeText(code);
        if (copyCodeText) copyCodeText.textContent = '✓ Copied!';
        btnCopyGoCode.style.background = 'var(--success, #10b981)';
        btnCopyGoCode.style.color = '#fff';
        btnCopyGoCode.style.borderColor = 'var(--success, #10b981)';

        setTimeout(() => {
            if (copyCodeText) copyCodeText.textContent = 'Copy Go Code';
            btnCopyGoCode.style.background = '';
            btnCopyGoCode.style.color = '';
            btnCopyGoCode.style.borderColor = '';
        }, 1800);

        if (window.Notif && window.Notif.New) {
            window.Notif.New({
                title: 'Go Code Copied',
                message: 'korm.Select snippet copied to clipboard',
                type: 'success'
            }).show();
        }
    } catch { }
});

// ============================================================
// Textarea Key Bindings & Actions
// ============================================================

textarea?.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runQuery();
    }
});

btnRun?.addEventListener('click', runQuery);

btnClear?.addEventListener('click', () => {
    if (textarea) textarea.value = '';
    textarea?.focus();
    if (goCodeOutput) goCodeOutput.textContent = '// Query cleared';
});

// Quick Snippet Chips
document.querySelectorAll('.snippet-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        if (textarea) {
            textarea.value = chip.dataset.sql || '';
            textarea.focus();
            syncGoCode();
        }
    });
});

// ============================================================
// History & Saved Favorites
// ============================================================

function loadHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        renderHistoryPills(list);
    } catch { }
}

function saveHistory(query) {
    if (!query) return;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        let list = raw ? JSON.parse(raw) : [];
        list = list.filter(q => q.trim() !== query.trim());
        list.unshift(query);
        if (list.length > 5) list = list.slice(0, 5);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        renderHistoryPills(list);
    } catch { }
}

function renderHistoryPills(list) {
    if (!historyPills) return;
    historyPills.innerHTML = '';
    list.forEach(q => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'history-pill';
        btn.title = q;
        btn.textContent = q;
        btn.addEventListener('click', () => {
            if (textarea) {
                textarea.value = q;
                textarea.focus();
                syncGoCode();
            }
        });
        historyPills.appendChild(btn);
    });
}

function loadSavedSnippets() {
    try {
        const raw = localStorage.getItem(SAVED_STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        renderSavedChips(list);
    } catch { }
}

function saveSnippet(name, sql) {
    try {
        const raw = localStorage.getItem(SAVED_STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        list.unshift({ id: Date.now(), name: name.trim(), sql: sql.trim() });
        localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(list));
        renderSavedChips(list);
        if (window.Notif && window.Notif.New) {
            window.Notif.New({
                title: 'Snippet Saved',
                message: `"${name.trim()}" added to favorites`,
                type: 'success'
            }).show();
        }
    } catch { }
}

function deleteSavedSnippet(id) {
    try {
        const raw = localStorage.getItem(SAVED_STORAGE_KEY);
        let list = raw ? JSON.parse(raw) : [];
        list = list.filter(item => item.id !== id);
        localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(list));
        renderSavedChips(list);
    } catch { }
}

function renderSavedChips(list) {
    if (!savedQueriesBar || !savedChipsList) return;
    if (!list.length) {
        savedQueriesBar.style.display = 'none';
        return;
    }
    savedQueriesBar.style.display = 'flex';
    savedChipsList.innerHTML = '';
    list.forEach(item => {
        const chip = document.createElement('div');
        chip.className = 'saved-chip';
        chip.title = item.sql;

        const label = document.createElement('span');
        label.textContent = item.name;
        chip.appendChild(label);

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'saved-chip-del';
        delBtn.title = 'Remove snippet';
        delBtn.innerHTML = '&times;';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSavedSnippet(item.id);
        });
        chip.appendChild(delBtn);

        chip.addEventListener('click', () => {
            if (textarea) {
                textarea.value = item.sql;
                textarea.focus();
                syncGoCode();
            }
        });

        savedChipsList.appendChild(chip);
    });
}

btnSaveSnippet?.addEventListener('click', () => {
    const sql = textarea?.value.trim();
    if (!sql) {
        if (window.Notif && window.Notif.New) {
            window.Notif.New({
                title: 'Empty Query',
                message: 'Please write a SQL query before saving',
                type: 'error'
            }).show();
        }
        return;
    }
    const defaultName = sql.slice(0, 22).replace(/\s+/g, ' ');
    const name = prompt('Snippet Name:', defaultName);
    if (name && name.trim()) {
        saveSnippet(name, sql);
    }
});

// ============================================================
// Query Execution
// ============================================================

async function runQuery() {
    const rawQuery = textarea?.value.trim();
    if (!rawQuery) {
        textarea?.focus();
        return;
    }

    // Resolve named parameters like :email or :id
    const paramMatches = rawQuery.match(/:[a-zA-Z_][a-zA-Z0-9_]*/g);
    let query = rawQuery;
    if (paramMatches && paramMatches.length > 0) {
        const uniqueParams = [...new Set(paramMatches)];
        for (const p of uniqueParams) {
            const val = prompt(`Value for parameter ${p}:`);
            if (val === null) return;
            const isNum = !isNaN(val) && !isNaN(parseFloat(val)) && val.trim() !== '';
            const replacement = isNum ? val.trim() : `'${val.replace(/'/g, "''")}'`;
            query = query.split(p).join(replacement);
        }
    }

    const db = dbSelect?.value || '';
    const explain = chkExplain?.checked || false;
    const limit = parseInt(limitSelect?.value || '50', 10);

    btnRun.disabled = true;
    btnRun.style.opacity = '0.7';

    resultsSection.style.display = 'block';
    resultsBody.innerHTML = `
        <div style="padding: 32px 20px; text-align: center; color: var(--text-muted); font-size: 13px;">
            Running query…
        </div>`;

    resStatusBadge.textContent = 'Running';
    resStatusBadge.className = 'badge';

    try {
        const res = await fetch(`${adminPath}/query/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                database: db,
                explain,
                limit
            })
        });

        const data = await res.json();
        currentResult = data;
        saveHistory(rawQuery);
        syncGoCode();

        if (!data.success) {
            renderError(data);
        } else if (data.isMutation) {
            renderMutation(data);
        } else {
            renderTableResult(data);
        }
    } catch (err) {
        renderError({ error: err.message, durationMs: 0 });
    } finally {
        btnRun.disabled = false;
        btnRun.style.opacity = '1';
    }
}

function renderError(data) {
    resStatusBadge.textContent = 'Error';
    resStatusBadge.className = 'badge badge-danger';
    resDuration.textContent = `⚡ ${(data.durationMs || 0).toFixed(2)} ms`;
    resCount.textContent = '0 rows';

    resultsBody.innerHTML = `
        <div class="query-error-box">
            <strong>✖ Query Execution Failed:</strong><br>
            ${escapeHtml(data.error || 'Unknown error occurred')}
        </div>`;
}

function renderMutation(data) {
    resStatusBadge.textContent = 'Success';
    resStatusBadge.className = 'badge badge-success';
    resDuration.textContent = `⚡ ${(data.durationMs || 0).toFixed(2)} ms`;
    resCount.textContent = `${data.affected || 0} affected`;

    resultsBody.innerHTML = `
        <div class="query-mutation-callout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>
            <div>
                <strong>Statement executed successfully.</strong>
                <div><span>${data.affected || 0}</span> row(s) affected in <span>${(data.durationMs || 0).toFixed(2)} ms</span>.</div>
            </div>
        </div>`;
}

function renderTableResult(data) {
    resStatusBadge.textContent = '200 OK';
    resStatusBadge.className = 'badge badge-success';
    resDuration.textContent = `⚡ ${(data.durationMs || 0).toFixed(2)} ms`;
    resCount.textContent = `${data.count || 0} row${data.count === 1 ? '' : 's'}`;

    const cols = data.columns || [];
    const rows = data.rows || [];

    if (!rows.length) {
        resultsBody.innerHTML = `
            <div style="padding: 36px 20px; text-align: center; color: var(--text-muted); font-size: 13px;">
                Query returned 0 rows.
            </div>`;
        return;
    }

    const thead = `<tr>${cols.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr>`;
    const tbody = rows.map(r => `
        <tr>${cols.map(c => {
        const val = r[c];
        const display = typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '');
        return `<td>${escapeHtml(display)}</td>`;
    }).join('')}</tr>
    `).join('');

    resultsBody.innerHTML = `
        <table class="query-table">
            <thead>${thead}</thead>
            <tbody>${tbody}</tbody>
        </table>`;
}

// ============================================================
// Exports
// ============================================================

btnExportJSON?.addEventListener('click', () => {
    if (!currentResult || !currentResult.rows) return;
    const blob = new Blob([JSON.stringify(currentResult.rows, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `query_result_${Date.now()}.json`);
});

btnExportCSV?.addEventListener('click', () => {
    if (!currentResult || !currentResult.rows || !currentResult.columns) return;
    const cols = currentResult.columns;
    const lines = [cols.join(',')];

    currentResult.rows.forEach(row => {
        const line = cols.map(c => {
            let val = String(row[c] ?? '');
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                val = `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        }).join(',');
        lines.push(line);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `query_result_${Date.now()}.csv`);
});

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================================
// Initialization
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    loadSavedSnippets();
    if (textarea && !textarea.value) {
        textarea.value = 'SELECT * FROM users LIMIT 10;';
    }
    syncGoCode();
});

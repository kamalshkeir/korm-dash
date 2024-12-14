if (adminPath.startsWith("/")) {
    adminPath = adminPath.substring(1);
}
document.addEventListener("DOMContentLoaded", () => {
    // Handle collection item clicks
    document.querySelectorAll(".collection-item").forEach((card) => {
        card.addEventListener("click", (e) => {
            // Don't navigate if clicking the action button
            if (!e.target.closest('.action-btn')) {
                window.location.href = "/" + adminPath + `/tables/${card.dataset.table}`;
            }
        });
    });

    // Add click handlers to action buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', handleActionClick);
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.action-btn')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
                setTimeout(() => menu.remove(), 200);
            });
        }
    });

    // Add button handlers
    document.querySelector('.import-btn').addEventListener('click', () => {
        // Create and trigger file input
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
            formData.append('file', file);
            formData.append('table', currentTable);
            
            fetch(`/${adminPath}/import`, {
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
});

function handleActionClick(e) {
    e.stopPropagation();
    const button = e.currentTarget;

    // Close any existing dropdown
    const existingDropdown = document.querySelector('.dropdown-menu');
    if (existingDropdown) {
        existingDropdown.remove();
    }

    // Create and show dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown-menu';
    dropdown.innerHTML = `
        <div class="dropdown-item" data-table="${button.dataset.table}" data-action="export-json">
            <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            Export JSON
        </div>
        <div class="dropdown-item" data-table="${button.dataset.table}" data-action="export-csv">
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z M14 15h-3v-2h3v2z"/></svg>
            Export CSV
        </div>
        <div class="dropdown-item" data-table="${button.dataset.table}">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            Delete
        </div>
    `;

    // Position dropdown
    const rect = button.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const dropdownWidth = 200; // Approximate width of dropdown

    dropdown.style.position = 'fixed';

    // Calculate vertical position
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const showBelow = spaceBelow >= 100 || spaceBelow > spaceAbove;

    if (showBelow) {
        dropdown.style.top = `${Math.min(rect.bottom + 5, viewportHeight - 10)}px`;
    } else {
        dropdown.style.bottom = `${Math.min(spaceBelow + rect.height + 5, viewportHeight - 10)}px`;
    }

    // Calculate horizontal position
    let left = rect.left;
    if (left + dropdownWidth > viewportWidth) {
        left = Math.max(10, viewportWidth - dropdownWidth - 10);
    }
    dropdown.style.left = `${left}px`;

    document.body.appendChild(dropdown);

    // Show with animation
    requestAnimationFrame(() => dropdown.classList.add('show'));

    // Close when clicking outside
    const closeDropdown = (e) => {
        if (!dropdown.contains(e.target) && !button.contains(e.target)) {
            dropdown.remove();
            document.removeEventListener('click', closeDropdown);
        }
    };
    document.addEventListener('click', closeDropdown);

    // Handle dropdown actions
    dropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = item.textContent.trim().toLowerCase();
            if (action === 'export json') {
                const table = e.target.closest('.dropdown-item').dataset.table;
                Ask(`Do you confirm export ${table} ?`).then(confirmed => {
                    if (confirmed) {
                        window.location.href = `/${adminPath}/export/${table}`
                    }
                })
            } else if (action === 'export csv') {
                const table = e.target.closest('.dropdown-item').dataset.table;
                Ask(`Do you confirm export ${table} ?`).then(confirmed => {
                    if (confirmed) {
                        window.location.href = `/${adminPath}/export/${table}/csv`
                    }
                })
            } else if (action === 'delete') {
                // Handle delete action
                if (e.target.tagName == "svg") {
                    e.target = e.target.parentElement;
                }
                let table = e.target.dataset.table;
                if (table) {
                    Ask(`Are your sure u want to drop table ${table} ?`).then(confirmed => {
                        if (confirmed) {
                            fetch("/" + adminPath + "/drop/table", {
                                method: 'POST',
                                body: JSON.stringify({ table: table }),
                            }).then(res => res.json()).then(data => {
                                if (data.success) {
                                    Notif.New({
                                        title: "Table Dropped",
                                        message: "Table " + table + " has been dropped",
                                        type: "success",
                                        duration: 3000
                                    }).show();
                                    document.querySelector(".collection-item[data-table='" + table + "']").remove();
                                } else if (data.error) {
                                    Notif.New({
                                        title: "Error",
                                        message: data.error,
                                        type: "error",
                                        duration: 3000
                                    }).show();
                                } else {
                                    console.error("error drop table", table, data)
                                }
                            });
                        }
                    })
                }
            }
            dropdown.remove();
        });
    });
}


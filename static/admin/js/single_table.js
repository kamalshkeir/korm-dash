const adminPath = document.body.dataset.path;
const tableName = document.body.dataset.table;
const search = document.querySelector("form.table-search");
const table = document.querySelector('data-table');
let page = 1;
const prevButton = document.querySelector('.prev-page');
const nextButton = document.querySelector('.next-page');
const currentPageSpan = document.querySelector('.current-page');

let unsub;

window.addEventListener('beforeunload', () => {
    unsub.Unsubscribe()
});

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
        fetch(adminPath + "/tables/all/" + tableName, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "page": page })
        }).then(response => response.json()).then(data => {
            if (data.success) {
                serverData = data.success;
                table.tableData = serverData;
                currentPageSpan.textContent = `Page ${page}`;
                
                // Calculate if we're on the last page
                const totalPages = Math.ceil(serverData.total / 10); // Assuming 10 per page
                nextButton.disabled = page >= totalPages;
                prevButton.disabled = page <= 1;
                
                // Update page display
                currentPageSpan.textContent = `Page ${page} of ${totalPages}`;
            }
        });
    }    

    let bus = new Bus();
    bus.OnOpen = () => {
        unsub = bus.Subscribe("korm_db_dashboard_hooks",() => {
            setTimeout(() => {
                loadTableData()
            },500)
        })
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
                // Calculate if we're on the last page
                const totalPages = Math.ceil(data.total / 10); // Assuming 10 per page
                nextButton.disabled = page >= totalPages;
                prevButton.disabled = page <= 1;
                // Update page display
                currentPageSpan.textContent = `Page ${page} of ${totalPages}`;
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
                        } else if (result.error){
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
                    data.set("pk",document.body.dataset.pk)
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
    fetch(adminPath + "/tables/all/" + tableName, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "page": 1 })
    }).then(response => response.json()).then(data => {
        if (data.success) {
            serverData = data.success;
            table.tableData = serverData;
        }
    });

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
        const totalPages = Math.ceil(data.total / 10);
        nextButton.disabled = page >= totalPages;
        prevButton.disabled = page <= 1;
        currentPageSpan.textContent = `Page ${page} of ${totalPages}`;
    }
});


function generateForm(data) {
    const { columnsOrdered, columns, dbcolumns, pk, fkeys, fkeysModels, rowData } = data;
    const isEdit = !!rowData;
    console.log("generate form from",data)
    const formFields = columnsOrdered.map(col => {
        // Skip ID/PK fields for create mode
        if (!isEdit && (col === pk || col === 'id')) return '';

        // Disable primary key field in edit mode
        if (isEdit && (col === pk || col === 'id')) {
            return `
                <div class="form-group">
                    <label for="${col}">${col}:</label>
                    <div style="margin: 10px 0 10px 0;"></div>
                    <input type="text" id="${col}" name="${col}" class="form-control input" value="${rowData[col]}" disabled>
                </div>
                <div style="margin: 10px 0 10px 0;"></div>
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
        if (!isEdit && col.toLowerCase().includes('uuid')) {
            input = `<input type="text" id="${col}" name="${col}" class="form-control input" value="${crypto.randomUUID()}" readonly>`;
        } else if (fkeys && fkeys[col]) {
            // Add debug logging for the database values
            console.log(`Database values for ${col}:`, fkeys[col].map(v => ({
                value: v,
                length: v.length,
                bytes: Array.from(v).map(c => c.charCodeAt(0))
            })));

            input = `
                <input type="text" class="form-control input" 
                    name="${col}" id="${col}" 
                    list="${col}-options"
                    ${readOnlyAttr}
                    value="${isEdit ? rowData[col] || '' : ''}">
                <datalist id="${col}-options">
                    ${fkeys[col].map((v, i) => `
                        <option value="${v}">${JSON.stringify(fkeysModels[col][i])}</option>
                    `).join('')}
                </datalist>
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
                <div class="form-group toggle-group">
                    <label class="toggle">
                        <input type="checkbox" class="input" id="${col}" name="${col}" ${isChecked ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
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
        } else if (dbType.toLowerCase() === 'text') {
            input = `<textarea class="editor" name="${col}" id="${col}">${isEdit ? rowData[col] || '' : ''}</textarea>`;
        } else {
            input = `<input type="text" id="${col}" name="${col}" class="form-control input" ${readOnlyAttr} value="${isEdit ? rowData[col] || '' : ''}">`;
        }

        return `
            <div class="form-group">
                <label for="${col}">${col}:</label>
                <div style="margin: 10px 0 10px 0;"></div>
                ${input}
            </div>
            <div style="margin: 10px 0 10px 0;"></div>
        `;
    }).join('');

    return `
        <form class="edit-form" autocomplete="off">
            ${formFields}
            <div style="margin: 10px 0 10px 0;"></div>
            <button class="btn" style="border-radius: 10px;width:150px;margin:0 auto;" type="submit">
                ${isEdit ? 'Save changes' : 'Create'}
            </button>
            <div style="margin: 20px 0 20px 0;"></div>
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



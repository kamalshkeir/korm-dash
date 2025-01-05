class LogsManager {
    constructor() {
        // Share the same refresh controls as metrics
        this.metricsManager = window.metricsManager;
        this.setupEventListeners();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        // Use the same refresh controls as metrics
        const autoRefreshCheckbox = document.getElementById('auto-refresh');
        if (autoRefreshCheckbox) {
            autoRefreshCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.startAutoRefresh();
                } else {
                    this.stopAutoRefresh();
                }
            });
        }

        // Manual refresh button
        const refreshButton = document.getElementById('refresh-now');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.refreshLogs();
            });
        }

        // Refresh interval change
        const intervalSelect = document.getElementById('refresh-interval');
        if (intervalSelect) {
            intervalSelect.addEventListener('change', (e) => {
                if (autoRefreshCheckbox && autoRefreshCheckbox.checked) {
                    this.restartAutoRefresh();
                }
            });
        }
    }

    getRefreshInterval() {
        const intervalSelect = document.getElementById('refresh-interval');
        return intervalSelect ? parseInt(intervalSelect.value) : 5000;
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
        this.refreshTimer = setInterval(() => this.refreshLogs(), this.getRefreshInterval());
        this.refreshLogs(); // Initial refresh
    }

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    restartAutoRefresh() {
        this.stopAutoRefresh();
        this.startAutoRefresh();
    }

    async refreshLogs() {
        try {
            const response = await fetch('/admin/logs/get');
            if (!response.ok) throw new Error('Failed to fetch logs');
            
            const logs = await response.json();
            this.updateLogsUI(logs);
        } catch (error) {
            console.error('Error fetching logs:', error);
        }
    }

    updateLogsUI(logs) {
        const logsList = document.querySelector('.logs-list');
        if (!logsList) return;

        // Create the new logs HTML
        const logsHtml = logs.map(log => {
            const timeHtml = log.At ? `<span class="log-time">${log.At}</span>` : '';
            let typeHtml = '';
            
            if (log.Type) {
                if (log.Type === 'N/A') {
                    typeHtml = '<span class="log-type FATAL">N/A</span>';
                } else {
                    typeHtml = `<span class="log-type ${log.Type}">${log.Type}</span>`;
                }
            } else {
                typeHtml = '<span class="log-type FATAL">N/A</span>';
            }

            return `
                <div class="log-item">
                    ${timeHtml}
                    ${typeHtml}
                    <span class="log-message">${log.Extra}</span>
                </div>
            `;
        }).join('');

        // Update the logs list with smooth transition
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = logsHtml;
        
        // Add new items with fade-in effect
        const currentItems = logsList.children.length;
        const newItems = tempDiv.children.length;
        
        if (currentItems !== newItems) {
            logsList.innerHTML = logsHtml;
            Array.from(logsList.children).forEach(item => {
                item.style.opacity = '0';
                requestAnimationFrame(() => {
                    item.style.transition = 'opacity 0.3s ease-in';
                    item.style.opacity = '1';
                });
            });
        }
    }
}

// Initialize logs manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.logsManager = new LogsManager();
}); 
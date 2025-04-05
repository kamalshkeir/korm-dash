class MetricsManager {
    constructor() {
        this.refreshInterval = 5000; // Default 5 seconds
        this.isAutoRefresh = true;
        this.refreshTimer = null;
        this.setupEventListeners();
        // this.startAutoRefresh();
    }

    setupEventListeners() {
        // Refresh interval change
        const intervalSelect = document.getElementById('refresh-interval');
        if (intervalSelect) {
            intervalSelect.addEventListener('change', (e) => {
                this.refreshInterval = parseInt(e.target.value);
                if (this.isAutoRefresh) {
                    this.restartAutoRefresh();
                }
            });
        }

        // Auto refresh toggle
        const autoRefreshCheckbox = document.getElementById('auto-refresh');
        if (autoRefreshCheckbox) {
            autoRefreshCheckbox.addEventListener('change', (e) => {
                this.isAutoRefresh = e.target.checked;
                if (this.isAutoRefresh) {
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
                this.refreshMetrics();
                this.animateRefreshButton();
            });
        }
    }

    startAutoRefresh() {
        this.stopAutoRefresh(); // Clear any existing timer
        this.refreshTimer = setInterval(() => this.refreshMetrics(), this.refreshInterval);
        this.refreshMetrics(); // Initial refresh
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

    animateRefreshButton() {
        const icon = document.querySelector('.refresh-icon');
        if (icon) {
            icon.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                icon.style.transform = 'rotate(0deg)';
            }, 300);
        }
    }

    async refreshMetrics() {
        try {
            const response = await fetch('/admin/metrics/get');
            if (!response.ok) throw new Error('Failed to fetch metrics');
            
            const metrics = await response.json();
            this.updateMetricsUI(metrics);
        } catch (error) {
            console.error('Error fetching metrics:', error);
        }
    }

    updateMetricsUI(metrics) {
        // Update Memory metrics
        this.updateValue('heap-memory', `${metrics.HeapMemoryMB.toFixed(2)} MB`);
        this.updateValue('system-memory', `${metrics.SystemMemoryMB.toFixed(2)} MB`);
        this.updateValue('stack-memory', `${metrics.StackMemoryMB.toFixed(2)} MB`);

        // Update GC metrics
        this.updateValue('gc-cycles', metrics.NumGC);
        this.updateValue('last-gc', `${metrics.LastGCTimeSec.toFixed(1)}s ago`);
        this.updateValue('gc-cpu', `${metrics.GCCPUPercent.toFixed(2)}%`);

        // Update Runtime metrics
        this.updateValue('goroutines', metrics.NumGoroutines);
        this.updateValue('cpus', metrics.NumCPU);
        this.updateValue('go-version', metrics.GoVersion);
    }

    updateValue(id, value) {
        const element = document.querySelector(`[data-metric="${id}"]`);
        if (element) {
            element.textContent = value;
        }
    }
}

// Initialize metrics manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.metricsManager = new MetricsManager();
}); 
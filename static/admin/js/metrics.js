class MetricsManager {
    constructor() {
        this.refreshInterval = 5000; // Default 5 seconds
        this.isAutoRefresh = true;
        this.refreshTimer = null;
        this.maxHistory = 24;
        this.history = {
            'heap-memory': [],
            'gc-cpu': [],
            'goroutines': []
        };
        this.setupEventListeners();
        this.initFromDOM();
    }

    initFromDOM() {
        const parseNum = (selector) => {
            const el = document.querySelector(selector);
            if (!el) return null;
            const m = el.textContent.match(/[\d.]+/);
            return m ? parseFloat(m[0]) : null;
        };

        const heap = parseNum('[data-metric="heap-memory"]');
        const gccpu = parseNum('[data-metric="gc-cpu"]');
        const goro = parseNum('[data-metric="goroutines"]');

        if (heap !== null) this.pushPoint('heap-memory', heap);
        if (gccpu !== null) this.pushPoint('gc-cpu', gccpu);
        if (goro !== null) this.pushPoint('goroutines', goro);
    }

    pushPoint(key, value) {
        if (typeof value !== 'number' || isNaN(value)) return;
        const list = this.history[key];
        list.push(value);
        if (list.length > this.maxHistory) {
            list.shift();
        }
        this.renderSparkline(key, list);
    }

    renderSparkline(containerId, points) {
        const wrap = document.getElementById(`chart-${containerId}`);
        if (!wrap) return;

        // If fewer than 2 points, synthesize a flat starter sequence
        const data = points.length === 1 ? [points[0], points[0]] : [...points];
        if (data.length < 2) return;

        let min = Math.min(...data);
        let max = Math.max(...data);
        if (max === min) {
            min = Math.max(0, min - 1);
            max = max + 1;
        }
        const range = max - min || 1;
        const W = 100;
        const H = 34;
        const padY = 4;
        const usableH = H - padY * 2;

        const coords = data.map((val, i) => {
            const x = (i / (data.length - 1)) * W;
            const y = (H - padY) - ((val - min) / range) * usableH;
            return { x, y };
        });

        const lineD = coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '').trim();
        const areaD = `${lineD} L ${W} ${H} L 0 ${H} Z`;
        const lastPt = coords[coords.length - 1];

        const gradId = `spark-grad-${containerId}`;
        wrap.innerHTML = `
            <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="var(--theme-color)" stop-opacity="0.32" />
                        <stop offset="100%" stop-color="var(--theme-color)" stop-opacity="0.0" />
                    </linearGradient>
                </defs>
                <path class="sparkline-area" d="${areaD}" fill="url(#${gradId})" />
                <path class="sparkline-line" d="${lineD}" />
                <circle class="sparkline-dot" cx="${lastPt.x.toFixed(1)}" cy="${lastPt.y.toFixed(1)}" r="2.8" />
            </svg>
        `;
    }

    setupEventListeners() {
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
        this.pushPoint('heap-memory', metrics.HeapMemoryMB);

        // Update GC metrics
        this.updateValue('gc-cycles', metrics.NumGC);
        this.updateValue('last-gc', `${metrics.LastGCTimeSec.toFixed(1)}s ago`);
        this.updateValue('gc-cpu', `${metrics.GCCPUPercent.toFixed(2)}%`);
        this.pushPoint('gc-cpu', metrics.GCCPUPercent);

        // Update Runtime metrics
        this.updateValue('goroutines', metrics.NumGoroutines);
        this.updateValue('cpus', metrics.NumCPU);
        this.updateValue('go-version', metrics.GoVersion);
        this.pushPoint('goroutines', metrics.NumGoroutines);
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
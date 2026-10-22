/**
 * GlobeExplorer.js — Universal 3D Globe & Coordinates Explorer ES6 Module
 * 
 * 100% Free stack, zero external API keys:
 * - MapLibre GL JS v5 + Mapbox RTL text plugin
 * - OpenFreeMap Liberty (Light) & Dark vector styles with full POIs/commerces
 * - AWS Terrain elevation (terrarium) + Esri World Imagery (satellite)
 * - Photon OpenStreetMap Geocoding autocomplete engine
 * - Shift + Click/Drag, Alt + Drag, Right-Click Drag for 3D rotation & tilt
 * - Custom Markers management with localStorage persistence
 */
export class GlobeExplorer {
    static CDN = 'https://unpkg.com/maplibre-gl@5/dist';
    static RTL_PLUGIN = 'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js';
    static STYLES = {
        dark: 'https://tiles.openfreemap.org/styles/dark',
        light: 'https://tiles.openfreemap.org/styles/liberty',
    };
    static TERRAIN_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
    static SAT_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    constructor(options = {}) {
        this.options = Object.assign({
            container: '#admin-globe-map',
            wrapper: '#admin-globe-wrapper',
            center: [35.86, 33.87],
            zoom: 6.5,
            pitch: 50,
            bearing: -15,
            theme: localStorage.getItem('globe-explorer-theme') || 'light',
            storageKey: 'globe-explorer-pins',
            themeStorageKey: 'globe-explorer-theme',
            enableSearch: true,
            enableCustomPins: true,
            enableInspector: true,
            enableFullscreen: true,
            customLayers: [],
            onPointClick: null,
            onMarkerClick: null,
        }, options);

        this.map = null;
        this.satEnabled = false;
        this.tilt3d = true;
        this.pinMode = false;
        this.targetMarker = null;
        this.lastClickedCoords = null;
        this.currentTheme = this.options.theme;
        this.currentSuggestions = [];
        this.selectedSuggestionIndex = -1;
        this.searchDebounceTimer = null;

        this.markers = {
            custom: [],
            layers: new Map() // layerId -> Marker[]
        };

        // Load custom pins from localStorage
        this.customPins = this._loadCustomPins();

        this._initPromise = this._init();
    }

    async ready() {
        return this._initPromise;
    }

    // ---------- Initialization ----------
    async _init() {
        await this._loadMapLibre();
        this._initMap();
        this._initUI();
    }

    _loadMapLibre() {
        return new Promise((resolve, reject) => {
            if (window.maplibregl) return resolve();

            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = `${GlobeExplorer.CDN}/maplibre-gl.css`;
            document.head.appendChild(css);

            const js = document.createElement('script');
            js.src = `${GlobeExplorer.CDN}/maplibre-gl.js`;
            js.async = true;
            js.onload = () => {
                if (typeof maplibregl.setRTLTextPlugin === 'function') {
                    try {
                        maplibregl.setRTLTextPlugin(GlobeExplorer.RTL_PLUGIN, null, true);
                    } catch (_) { }
                }
                resolve();
            };
            js.onerror = () => reject(new Error('Failed to load MapLibre GL'));
            document.head.appendChild(js);
        });
    }

    _initMap() {
        const container = typeof this.options.container === 'string'
            ? document.querySelector(this.options.container)
            : this.options.container;

        if (!container) {
            console.error('[GlobeExplorer] Map container element not found:', this.options.container);
            return;
        }

        this.map = new maplibregl.Map({
            container,
            style: this.currentTheme === 'dark' ? GlobeExplorer.STYLES.dark : GlobeExplorer.STYLES.light,
            center: this.options.center,
            zoom: this.options.zoom,
            pitch: this.options.pitch,
            bearing: this.options.bearing,
            maxPitch: 80,
            boxZoom: false, // Disabling boxZoom frees up Shift+Drag for 3D rotation & tilt
            renderWorldCopies: false,
            crossSourceCollisions: false,
            attributionControl: { compact: true },
            canvasContextAttributes: {
                antialias: (window.devicePixelRatio || 1) < 2,
                powerPreference: 'high-performance'
            },
            fadeDuration: 100,
            dragPan: {
                linearity: 0.22,
                maxSpeed: 2200,
                deceleration: 2400
            },
            dragRotate: true,
            touchPitch: true,
            touchZoomRotate: true
        });

        try {
            this.map.setProjection({ type: 'globe' });
        } catch (_) { }

        this.map.addControl(
            new maplibregl.NavigationControl({ visualizePitch: true }),
            this.options.navControlPosition || 'bottom-right'
        );

        this._attachInteractions();

        this.map.on('load', () => {
            const loader = document.getElementById('admin-map-loader');
            if (loader) loader.classList.add('hidden');
            this._decorateMap();
            this._renderAllPins();
            this._renderCustomLayers();
        });

        this.map.on('click', e => {
            const { lat, lng } = e.lngLat;
            if (this.pinMode) {
                this.pinMode = false;
                document.getElementById('btn-toggle-pinmode')?.classList.remove('active');
                container.classList.remove('pin-mode');
                const label = prompt('Marker label:', `Marker #${this.customPins.length + 1}`) || `Marker #${this.customPins.length + 1}`;
                this.addCustomPin(lat, lng, label);
            } else {
                this.setTargetMarker(lat, lng, 'Inspected Coordinates');
                if (typeof this.options.onPointClick === 'function') {
                    this.options.onPointClick({ lat, lng });
                }
            }
        });

        window.addEventListener('resize', () => this.resize());
    }

    // ---------- Interactions (Shift + Drag, Alt + Drag, Right Click) ----------
    _attachInteractions() {
        const canvas = this.map.getCanvas();
        const container = this.map.getContainer();

        canvas.addEventListener('contextmenu', e => e.preventDefault());

        let isCustomRotating = false;
        let rotStartX = 0;
        let rotStartY = 0;
        let rotStartBearing = 0;
        let rotStartPitch = 0;

        canvas.addEventListener('mousedown', e => {
            if (e.shiftKey || e.altKey || e.ctrlKey || e.button === 2) {
                e.stopImmediatePropagation();
                e.preventDefault();
                isCustomRotating = true;
                rotStartX = e.clientX;
                rotStartY = e.clientY;
                rotStartBearing = this.map.getBearing();
                rotStartPitch = this.map.getPitch();

                const onMove = ev => {
                    if (!isCustomRotating) return;
                    const dx = ev.clientX - rotStartX;
                    const dy = ev.clientY - rotStartY;
                    this.map.setBearing(rotStartBearing + dx * 0.45);
                    this.map.setPitch(Math.max(0, Math.min(80, rotStartPitch - dy * 0.45)));
                };

                const onUp = () => {
                    isCustomRotating = false;
                    window.removeEventListener('mousemove', onMove, true);
                    window.removeEventListener('mouseup', onUp, true);
                };

                window.addEventListener('mousemove', onMove, true);
                window.addEventListener('mouseup', onUp, true);
            }
        }, true);

        canvas.addEventListener('wheel', e => {
            if (e.shiftKey || e.altKey) {
                e.stopImmediatePropagation();
                e.preventDefault();
                const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                this.map.setBearing(this.map.getBearing() + delta * 0.35);
            }
        }, { capture: true, passive: false });

        let gestureStartBearing = 0;
        container.addEventListener('gesturestart', e => {
            e.preventDefault();
            gestureStartBearing = this.map.getBearing();
        });
        container.addEventListener('gesturechange', e => {
            e.preventDefault();
            this.map.setBearing(gestureStartBearing - e.rotation);
        });
    }

    _decorateMap() {
        if (!this.map) return;
        const dark = this.currentTheme === 'dark';

        try {
            if (!this.map.getSource('terrain-dem')) {
                this.map.addSource('terrain-dem', {
                    type: 'raster-dem',
                    tiles: [GlobeExplorer.TERRAIN_TILES],
                    tileSize: 256,
                    maxzoom: 14,
                    encoding: 'terrarium'
                });
            }
            this.map.setTerrain({ source: 'terrain-dem', exaggeration: 1.4 });
        } catch (_) { }

        try {
            this.map.setSky(dark ? {
                'sky-color': '#0a1024',
                'horizon-color': '#2a3d73',
                'sky-horizon-blend': 0.6,
                'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 8, 0],
            } : {
                'sky-color': '#7fb8f0',
                'horizon-color': '#ffffff',
                'sky-horizon-blend': 0.5,
                'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 8, 0],
            });
        } catch (_) { }

        this.map.on('mousemove', e => {
            const { lat, lng } = e.lngLat;
            const zoom = this.map.getZoom().toFixed(1);
            const pitch = Math.round(this.map.getPitch());
            const barText = document.getElementById('coord-display-text');
            if (barText && !this.lastClickedCoords) {
                barText.textContent = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)} · Zoom: ${zoom} · Pitch: ${pitch}°`;
            }
        });
    }

    // ---------- Public Camera Controls ----------
    flyTo(lat, lng, zoom = 15.5, pitch = 50) {
        if (!this.map) return;
        this.map.flyTo({
            center: [lng, lat],
            zoom,
            pitch,
            bearing: -15,
            duration: 2200,
            essential: true
        });
    }

    resetView() {
        if (!this.map) return;
        this.map.flyTo({
            center: this.options.center,
            zoom: this.options.zoom,
            pitch: this.tilt3d ? this.options.pitch : 0,
            bearing: this.options.bearing,
            duration: 2000
        });
    }

    setTheme(theme) {
        if (!this.map) return;
        this.currentTheme = theme;
        localStorage.setItem(this.options.themeStorageKey, theme);

        const btnLabel = document.getElementById('theme-btn-label');
        if (btnLabel) {
            btnLabel.textContent = theme === 'dark' ? '🌙 Dark' : '☀️ Light';
        }

        this.map.setStyle(theme === 'dark' ? GlobeExplorer.STYLES.dark : GlobeExplorer.STYLES.light);
        this.map.once('style.load', () => {
            try { this.map.setProjection({ type: 'globe' }); } catch (_) { }
            this._decorateMap();
            this._renderAllPins();
            this._renderCustomLayers();
            if (this.satEnabled) this.toggleSatellite(true);
        });
    }

    toggleTilt() {
        if (!this.map) return;
        this.tilt3d = !this.tilt3d;
        document.getElementById('btn-toggle-tilt')?.classList.toggle('active', this.tilt3d);
        this.map.easeTo({
            pitch: this.tilt3d ? 55 : 0,
            duration: 1000
        });
    }

    toggleSatellite(force) {
        if (!this.map) return;
        this.satEnabled = typeof force === 'boolean' ? force : !this.satEnabled;
        document.getElementById('btn-toggle-satellite')?.classList.toggle('active', this.satEnabled);

        if (this.satEnabled) {
            if (!this.map.getSource('explorer-sat-src')) {
                this.map.addSource('explorer-sat-src', {
                    type: 'raster',
                    tiles: [GlobeExplorer.SAT_TILES],
                    tileSize: 256,
                    maxzoom: 19
                });
            }
            if (!this.map.getLayer('explorer-sat-layer')) {
                const firstLabel = this.map.getStyle().layers.find(l => l.type === 'symbol')?.id;
                this.map.addLayer({
                    id: 'explorer-sat-layer',
                    type: 'raster',
                    source: 'explorer-sat-src',
                    paint: { 'raster-opacity': 0.95 }
                }, firstLabel);
            } else {
                this.map.setLayoutProperty('explorer-sat-layer', 'visibility', 'visible');
            }
        } else {
            if (this.map.getLayer('explorer-sat-layer')) {
                this.map.setLayoutProperty('explorer-sat-layer', 'visibility', 'none');
            }
        }
    }

    toggleFullscreen() {
        const wrapper = typeof this.options.wrapper === 'string'
            ? document.querySelector(this.options.wrapper)
            : this.options.wrapper;
        if (!wrapper) return;

        const btn = document.getElementById('btn-toggle-fullscreen');
        if (!document.fullscreenElement) {
            if (wrapper.requestFullscreen) {
                wrapper.requestFullscreen().catch(() => wrapper.classList.toggle('fullscreen-mode'));
            } else {
                wrapper.classList.toggle('fullscreen-mode');
            }
            btn?.classList.add('active');
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            wrapper.classList.remove('fullscreen-mode');
            btn?.classList.remove('active');
        }
        setTimeout(() => this.resize(), 100);
        setTimeout(() => this.resize(), 400);
    }

    resize() {
        this.map?.resize();
    }

    // ---------- Target Marker & Inspector ----------
    setTargetMarker(lat, lng, title = 'Selected Location') {
        if (!this.map) return;
        if (!this.targetMarker) {
            const el = document.createElement('div');
            el.className = 'admin-pin target';
            el.innerHTML = '🎯';
            this.targetMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
                .setLngLat([lng, lat])
                .addTo(this.map);
        } else {
            this.targetMarker.setLngLat([lng, lat]);
        }

        this.lastClickedCoords = { lat, lng };
        this._updateCoordBar(lat, lng);
        this._showDrawer('target', title, {
            'Latitude': lat.toFixed(6),
            'Longitude': lng.toFixed(6),
            'Google Maps': `<a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noopener">Open in Google Maps ↗</a>`
        }, { lat, lng, canSave: true });
    }

    clearTargetMarker() {
        if (this.targetMarker) {
            this.targetMarker.remove();
            this.targetMarker = null;
        }
        this.lastClickedCoords = null;
        const barText = document.getElementById('coord-display-text');
        const btnCopy = document.getElementById('btn-copy-latlng');
        if (barText) barText.textContent = 'Click anywhere on the map to inspect coordinates';
        if (btnCopy) btnCopy.style.display = 'none';
        document.getElementById('admin-inspector-drawer')?.classList.remove('open');
    }

    _updateCoordBar(lat, lng) {
        const barText = document.getElementById('coord-display-text');
        const btnCopy = document.getElementById('btn-copy-latlng');
        if (barText) {
            barText.textContent = `📍 Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
        }
        if (btnCopy) btnCopy.style.display = 'inline-block';
    }

    _showDrawer(type, title, fields, extra = {}) {
        const drawer = document.getElementById('admin-inspector-drawer');
        const badge = document.getElementById('drawer-badge');
        const titleEl = document.getElementById('drawer-title');
        const bodyEl = document.getElementById('drawer-body');
        if (!drawer || !bodyEl) return;

        badge.className = `drawer-badge ${type}`;
        badge.textContent = type.toUpperCase();
        titleEl.textContent = title;

        let extraButtons = '';
        if (extra.canSave) {
            extraButtons += `<button type="button" class="btn-act-savepin" id="drawer-btn-savepin">📍 Save as Marker</button>`;
        }
        if (type === 'target') {
            extraButtons += `<button type="button" class="btn-act-delete" id="drawer-btn-cleartarget">✕ Remove Pin</button>`;
        }
        if (extra.isCustomPin) {
            extraButtons += `<button type="button" class="btn-act-delete" id="drawer-btn-delpin">🗑️ Delete Marker</button>`;
        }

        bodyEl.innerHTML = `
            ${Object.entries(fields).map(([k, v]) => `
                <div class="drawer-row">
                    <b>${k}</b>
                    <span>${v}</span>
                </div>
            `).join('')}
            <div class="drawer-actions">
                <button type="button" class="btn-act-copy" id="drawer-btn-copy">📋 Copy Coords</button>
                <a href="https://www.google.com/maps?q=${fields.Latitude},${fields.Longitude}" target="_blank" rel="noopener" class="btn-act-maps">Maps ↗</a>
            </div>
            ${extraButtons ? `<div class="drawer-actions">${extraButtons}</div>` : ''}
        `;

        document.getElementById('drawer-btn-copy')?.addEventListener('click', () => {
            const txt = `${fields.Latitude}, ${fields.Longitude}`;
            navigator.clipboard.writeText(txt).then(() => {
                alert(`Coordinates copied: ${txt}`);
            });
        });

        document.getElementById('drawer-btn-savepin')?.addEventListener('click', () => {
            const name = prompt('Enter a label for this marker:', title || 'Custom Marker');
            if (name !== null) {
                this.addCustomPin(extra.lat, extra.lng, name || 'Custom Marker');
            }
        });

        document.getElementById('drawer-btn-delpin')?.addEventListener('click', () => {
            if (confirm(`Delete marker "${title}"?`)) {
                this.deleteCustomPin(extra.pinId);
                drawer.classList.remove('open');
            }
        });

        document.getElementById('drawer-btn-cleartarget')?.addEventListener('click', () => {
            this.clearTargetMarker();
        });

        drawer.classList.add('open');
    }

    // ---------- Custom Markers Storage & Management ----------
    _loadCustomPins() {
        try {
            const raw = localStorage.getItem(this.options.storageKey);
            const parsed = JSON.parse(raw || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return [];
        }
    }

    _saveCustomPins() {
        try {
            localStorage.setItem(this.options.storageKey, JSON.stringify(this.customPins));
        } catch (_) { }
        this._updatePinCount();
    }

    _updatePinCount() {
        const countPins = document.getElementById('count-pins');
        if (countPins) countPins.textContent = this.customPins.length;
    }

    addCustomPin(lat, lng, label = 'Custom Marker') {
        const pin = {
            id: 'pin_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            label,
            lat: Number(lat),
            lng: Number(lng),
            createdAt: new Date().toISOString()
        };
        this.customPins.push(pin);
        this._saveCustomPins();
        this._renderSinglePin(pin);
        this.setTargetMarker(pin.lat, pin.lng, pin.label);
    }

    deleteCustomPin(pinId) {
        const idx = this.customPins.findIndex(p => p.id === pinId);
        if (idx !== -1) {
            this.customPins.splice(idx, 1);
            this._saveCustomPins();
        }
        const mIdx = this.markers.custom.findIndex(m => m._pinId === pinId);
        if (mIdx !== -1) {
            this.markers.custom[mIdx].remove();
            this.markers.custom.splice(mIdx, 1);
        }
    }

    _renderAllPins() {
        this.markers.custom.forEach(m => m.remove());
        this.markers.custom = [];
        this.customPins.forEach(p => this._renderSinglePin(p));
        this._updatePinCount();
    }

    _renderSinglePin(p) {
        const el = document.createElement('div');
        el.className = 'admin-pin custom';
        el.title = p.label;
        el.innerHTML = '📍';
        el.addEventListener('click', e => {
            e.stopPropagation();
            this.flyTo(p.lat, p.lng, 16.5, 55);
            this._showDrawer('custom', p.label, {
                'Latitude': p.lat.toFixed(6),
                'Longitude': p.lng.toFixed(6),
                'Created': new Date(p.createdAt || Date.now()).toLocaleString()
            }, { pinId: p.id, isCustomPin: true, lat: p.lat, lng: p.lng });
        });

        const m = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([p.lng, p.lat])
            .addTo(this.map);
        m._pinId = p.id;
        this.markers.custom.push(m);
    }

    // ---------- Custom Extensible Layers ----------
    _renderCustomLayers() {
        this.options.customLayers.forEach(layer => {
            const list = [];
            (layer.items || []).forEach(item => {
                if (!item.lat || !item.lng) return;
                const el = document.createElement('div');
                el.className = `admin-pin ${layer.id || 'custom'}`;
                el.innerHTML = item.icon || layer.icon || '📍';
                el.title = item.title;
                el.addEventListener('click', e => {
                    e.stopPropagation();
                    this.flyTo(item.lat, item.lng, 16, 50);
                    this._showDrawer(layer.id || 'custom', item.title, {
                        'Latitude': item.lat.toFixed(6),
                        'Longitude': item.lng.toFixed(6),
                        ...(item.fields || {})
                    }, { lat: item.lat, lng: item.lng, canSave: true });
                });
                const m = new maplibregl.Marker({ element: el, anchor: 'center' })
                    .setLngLat([item.lng, item.lat])
                    .addTo(this.map);
                list.push(m);
            });
            this.markers.layers.set(layer.id, list);
        });
    }

    // ---------- Omnibox Search Logic ----------
    _parseCoordinates(str) {
        const cleaned = str.replace(/[()\[\]]/g, '').trim();
        const parts = cleaned.split(/[\s,;]+/).map(Number).filter(n => Number.isFinite(n));
        if (parts.length < 2) return null;

        let [lat, lng] = parts;
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
        return { lat, lng };
    }

    async searchOmnibox(query) {
        query = (query || '').trim();
        if (!query) return [];

        const results = [];
        const lower = query.toLowerCase();

        // 1. Direct Coordinates match
        const coordMatch = this._parseCoordinates(query);
        if (coordMatch) {
            results.push({
                type: 'coord',
                title: `Lat: ${coordMatch.lat.toFixed(5)}, Lng: ${coordMatch.lng.toFixed(5)}`,
                subtitle: 'Target Coordinates',
                badge: 'Coords',
                icon: '🎯',
                lat: coordMatch.lat,
                lng: coordMatch.lng
            });
        }

        // 2. Custom Pins match
        this.customPins.forEach(p => {
            if (p.label.toLowerCase().includes(lower)) {
                results.push({
                    type: 'custom',
                    title: p.label,
                    subtitle: `Custom Marker · Lat: ${p.lat.toFixed(4)}, Lng: ${p.lng.toFixed(4)}`,
                    badge: 'Pin',
                    icon: '📍',
                    lat: p.lat,
                    lng: p.lng,
                    entity: p
                });
            }
        });

        // 3. Custom layers match
        this.options.customLayers.forEach(layer => {
            (layer.items || []).forEach(item => {
                if (item.title && item.title.toLowerCase().includes(lower)) {
                    results.push({
                        type: layer.id,
                        title: item.title,
                        subtitle: item.subtitle || layer.name || 'Layer Item',
                        badge: layer.name || 'Item',
                        icon: item.icon || layer.icon || '📍',
                        lat: item.lat,
                        lng: item.lng
                    });
                }
            });
        });

        // 4. OpenStreetMap Photon Geocoding API (Global places & addresses)
        if (query.length >= 2) {
            try {
                const center = this.map ? this.map.getCenter() : { lng: this.options.center[0], lat: this.options.center[1] };
                const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=${center.lat}&lon=${center.lng}&limit=6`;
                const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
                if (res.ok) {
                    const data = await res.json();
                    (data.features || []).forEach(f => {
                        const p = f.properties || {};
                        const coords = f.geometry?.coordinates;
                        if (!coords || coords.length < 2) return;
                        const lng = coords[0];
                        const lat = coords[1];

                        const subParts = [p.city || p.town || p.district, p.state, p.country].filter(Boolean);
                        results.push({
                            type: 'place',
                            title: p.name || query,
                            subtitle: subParts.join(', ') || 'Global Location',
                            badge: p.osm_value || 'Place',
                            icon: '📍',
                            lat,
                            lng
                        });
                    });
                }
            } catch (err) {
                console.warn('[GlobeExplorer] Geocoding API error:', err);
            }
        }

        return results;
    }

    _selectSuggestion(item) {
        const searchInput = document.getElementById('globe-search-input');
        const resultsBox = document.getElementById('globe-search-results');
        const btnClear = document.getElementById('btn-search-clear');

        if (searchInput) searchInput.value = item.title;
        if (resultsBox) resultsBox.style.display = 'none';
        if (btnClear) btnClear.style.display = 'inline-block';

        this.flyTo(item.lat, item.lng, 16.2, 55);
        this.setTargetMarker(item.lat, item.lng, item.title);

        if (item.type === 'custom' && item.entity) {
            const p = item.entity;
            this._showDrawer('custom', p.label, {
                'Latitude': p.lat.toFixed(6),
                'Longitude': p.lng.toFixed(6),
                'Created': new Date(p.createdAt || Date.now()).toLocaleString()
            }, { pinId: p.id, isCustomPin: true, lat: p.lat, lng: p.lng });
        } else {
            this._showDrawer('target', item.title, {
                'Location': item.subtitle,
                'Latitude': item.lat.toFixed(6),
                'Longitude': item.lng.toFixed(6)
            }, { lat: item.lat, lng: item.lng, canSave: true });
        }
    }

    // ---------- UI Wiring ----------
    _initUI() {
        const searchInput = document.getElementById('globe-search-input');
        const btnSearchGo = document.getElementById('btn-search-go');
        const btnSearchClear = document.getElementById('btn-search-clear');
        const resultsBox = document.getElementById('globe-search-results');

        this._updatePinCount();

        // Theme toggle
        const btnTheme = document.getElementById('btn-toggle-theme');
        const btnLabel = document.getElementById('theme-btn-label');
        if (btnLabel) {
            btnLabel.textContent = this.currentTheme === 'dark' ? '🌙 Dark' : '☀️ Light';
        }
        btnTheme?.addEventListener('click', () => {
            this.setTheme(this.currentTheme === 'dark' ? 'light' : 'dark');
        });

        // Add pin mode
        const btnPinMode = document.getElementById('btn-toggle-pinmode');
        btnPinMode?.addEventListener('click', () => {
            this.pinMode = !this.pinMode;
            btnPinMode.classList.toggle('active', this.pinMode);
            this.map?.getContainer().classList.toggle('pin-mode', this.pinMode);
            if (this.pinMode) {
                alert('📍 Click anywhere on the map to drop a new custom marker!');
            }
        });

        // Search Omnibox
        searchInput?.addEventListener('input', () => {
            const val = searchInput.value.trim();
            if (btnSearchClear) btnSearchClear.style.display = val ? 'inline-block' : 'none';

            clearTimeout(this.searchDebounceTimer);
            if (!val) {
                if (resultsBox) resultsBox.style.display = 'none';
                this.currentSuggestions = [];
                return;
            }

            this.searchDebounceTimer = setTimeout(async () => {
                const res = await this.searchOmnibox(val);
                this._renderSuggestions(res);
            }, 220);
        });

        searchInput?.addEventListener('keydown', e => {
            const items = resultsBox?.querySelectorAll('.search-result-item') || [];
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (items.length === 0) return;
                this.selectedSuggestionIndex = (this.selectedSuggestionIndex + 1) % items.length;
                this._updateSelectionHighlight(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (items.length === 0) return;
                this.selectedSuggestionIndex = (this.selectedSuggestionIndex - 1 + items.length) % items.length;
                this._updateSelectionHighlight(items);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (this.selectedSuggestionIndex >= 0 && this.currentSuggestions[this.selectedSuggestionIndex]) {
                    this._selectSuggestion(this.currentSuggestions[this.selectedSuggestionIndex]);
                } else if (this.currentSuggestions.length > 0) {
                    this._selectSuggestion(this.currentSuggestions[0]);
                }
            } else if (e.key === 'Escape') {
                if (resultsBox) resultsBox.style.display = 'none';
            }
        });

        btnSearchGo?.addEventListener('click', async () => {
            const val = searchInput?.value.trim();
            if (!val) return;
            const res = await this.searchOmnibox(val);
            if (res.length > 0) this._selectSuggestion(res[0]);
        });

        btnSearchClear?.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            if (btnSearchClear) btnSearchClear.style.display = 'none';
            if (resultsBox) resultsBox.style.display = 'none';
            this.currentSuggestions = [];
            this.clearTargetMarker();
        });

        document.addEventListener('click', e => {
            if (!e.target.closest('.globe-search-omnibox-box')) {
                if (resultsBox) resultsBox.style.display = 'none';
            }
        });

        // Tools
        document.getElementById('btn-toggle-satellite')?.addEventListener('click', () => this.toggleSatellite());
        document.getElementById('btn-toggle-tilt')?.addEventListener('click', () => this.toggleTilt());
        document.getElementById('btn-reset-view')?.addEventListener('click', () => this.resetView());
        document.getElementById('btn-toggle-fullscreen')?.addEventListener('click', () => this.toggleFullscreen());

        document.addEventListener('fullscreenchange', () => {
            const isFull = Boolean(document.fullscreenElement);
            const wrapper = typeof this.options.wrapper === 'string'
                ? document.querySelector(this.options.wrapper)
                : this.options.wrapper;
            wrapper?.classList.toggle('fullscreen-mode', isFull);
            document.getElementById('btn-toggle-fullscreen')?.classList.toggle('active', isFull);
            setTimeout(() => this.resize(), 100);
            setTimeout(() => this.resize(), 300);
        });

        // Drawer Close
        document.getElementById('drawer-close')?.addEventListener('click', () => {
            this.clearTargetMarker();
        });
    }

    _renderSuggestions(results) {
        const box = document.getElementById('globe-search-results');
        if (!box) return;

        this.currentSuggestions = results;
        this.selectedSuggestionIndex = -1;

        if (results.length === 0) {
            box.innerHTML = `
                <div class="search-result-item" style="cursor: default; opacity: 0.7;">
                    <div class="result-icon">🔍</div>
                    <div class="result-content">
                        <span class="result-title">No location found</span>
                        <span class="result-subtitle">Try coordinates like "33.88, 35.49" or another city name</span>
                    </div>
                </div>
            `;
            box.style.display = 'block';
            return;
        }

        box.innerHTML = results.map((item, idx) => `
            <div class="search-result-item" data-index="${idx}">
                <div class="result-icon">${item.icon}</div>
                <div class="result-content">
                    <span class="result-title">${item.title}</span>
                    <span class="result-subtitle">${item.subtitle}</span>
                </div>
                <span class="result-badge">${item.badge}</span>
            </div>
        `).join('');

        box.style.display = 'block';

        box.querySelectorAll('.search-result-item').forEach(el => {
            el.addEventListener('click', () => {
                const idx = Number(el.dataset.index);
                if (this.currentSuggestions[idx]) {
                    this._selectSuggestion(this.currentSuggestions[idx]);
                }
            });
        });
    }

    _updateSelectionHighlight(items) {
        items.forEach((el, i) => {
            el.classList.toggle('selected', i === this.selectedSuggestionIndex);
        });
        if (items[this.selectedSuggestionIndex]) {
            items[this.selectedSuggestionIndex].scrollIntoView({ block: 'nearest' });
        }
    }
}

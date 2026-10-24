import { attachRelations } from '../components/Relations.js';

/**
 * Dashboard — renders the schema map (an interactive node/link graph of tables and
 * foreign keys with pan/zoom, drag-and-drop, and fullscreen mode) plus the table list.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const adminPath = (window.adminPath || document.body.dataset.path || '/admin').replace(/\/$/, '');

function el(name, attrs = {}) {
    const node = document.createElementNS(SVG_NS, name);
    for (const [k, v] of Object.entries(attrs)) {
        node.setAttribute(k, v);
    }
    return node;
}

/**
 * Compute an expansive elliptical layout with collision relaxation and hub prioritization.
 * Prevents overlapping nodes and gives labels plenty of breathing room.
 */
function layoutNodes(nodes, relations, width, height) {
    const cx = width / 2;
    const cy = height / 2;
    const n = nodes.length;
    if (!n) return [];

    // Count degrees (connections) to prioritize hub tables
    const degree = new Map();
    for (const [table, list] of Object.entries(relations || {})) {
        degree.set(table, (degree.get(table) || 0) + list.length);
        for (const rel of list) {
            degree.set(rel.other, (degree.get(rel.other) || 0) + 1);
        }
    }

    // Sort nodes to cluster connected tables near each other
    const sorted = [...nodes].sort((a, b) => (degree.get(b.name) || 0) - (degree.get(a.name) || 0));

    // Generous elliptical radius that utilizes full width and height
    const rx = Math.max(140, (width / 2) * 0.74);
    const ry = Math.max(120, (height / 2) * 0.70);

    const placed = sorted.map((node, i) => {
        const r = 28 + Math.min(node.count, 999) / 999 * 10;
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        // Subtle organic variation
        const wobble = 1 + 0.08 * Math.sin(i * 2.5);
        return {
            ...node,
            r,
            x: cx + Math.cos(angle) * rx * wobble,
            y: cy + Math.sin(angle) * ry * wobble,
        };
    });

    // Relaxation passes to eliminate any node or label collisions
    for (let step = 0; step < 25; step++) {
        for (let i = 0; i < placed.length; i++) {
            for (let j = i + 1; j < placed.length; j++) {
                const a = placed[i];
                const b = placed[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.hypot(dx, dy) || 1;
                const minDist = a.r + b.r + 34; // Ensure clean gap between circles & text
                if (dist < minDist) {
                    const overlap = (minDist - dist) / 2;
                    const nx = dx / dist;
                    const ny = dy / dist;
                    a.x -= nx * overlap;
                    a.y -= ny * overlap;
                    b.x += nx * overlap;
                    b.y += ny * overlap;
                }
            }
        }
    }

    return placed;
}

function edgePath(a, b) {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    // Offset control point to produce elegant organic curves
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const cx = mx - (dy / len) * len * 0.12;
    const cy = my + (dx / len) * len * 0.12;
    return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

// Global state for pan, zoom, and dragging
let currentTransform = { scale: 1, x: 0, y: 0 };
let activeGraphState = null;

function renderGraph(container, tables, relations) {
    container.innerHTML = '';

    if (!tables.length) {
        const empty = document.createElement('div');
        empty.className = 'schema-empty';
        empty.innerHTML = `<div>No table yet.<br>Migrate a model to see your schema map.</div>`;
        container.appendChild(empty);
        return;
    }

    const width = container.clientWidth || 980;
    const height = container.clientHeight || 520;
    const svg = el('svg', {
        viewBox: `0 0 ${width} ${height}`,
        preserveAspectRatio: 'xMidYMid meet'
    });

    // Viewport group for smooth pan & zoom
    const viewport = el('g', { class: 'sg-viewport' });
    svg.appendChild(viewport);

    function applyViewportTransform(smooth = false) {
        if (smooth) {
            viewport.style.transition = 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)';
            setTimeout(() => { viewport.style.transition = ''; }, 300);
        } else {
            viewport.style.transition = '';
        }
        viewport.setAttribute('transform', `translate(${currentTransform.x.toFixed(2)}, ${currentTransform.y.toFixed(2)}) scale(${currentTransform.scale.toFixed(4)})`);
    }
    applyViewportTransform();

    const placed = layoutNodes(tables, relations, width, height);
    const byName = new Map(placed.map(t => [t.name, t]));

    // Compute edges
    const seen = new Set();
    const edges = [];
    for (const [table, list] of Object.entries(relations || {})) {
        const from = byName.get(table);
        if (!from) continue;
        for (const rel of list) {
            if (rel.kind !== 'belongs_to') continue;
            const to = byName.get(rel.other);
            if (!to) continue;
            const key = [rel.table, rel.other].sort().join('|');
            if (seen.has(key)) continue;
            seen.add(key);
            edges.push({ a: rel.table, b: rel.other });
        }
    }

    // Edge layer
    const edgeLayer = el('g', { class: 'sg-edges' });
    const edgeMap = new Map(); // key -> SVGPathElement
    edges.forEach(e => {
        const from = byName.get(e.a);
        const to = byName.get(e.b);
        const p = el('path', {
            class: 'sg-edge',
            d: edgePath(from, to)
        });
        p.dataset.a = e.a;
        p.dataset.b = e.b;
        edgeLayer.appendChild(p);
        edgeMap.set(`${e.a}|${e.b}`, p);
        edgeMap.set(`${e.b}|${e.a}`, p);
    });
    viewport.appendChild(edgeLayer);

    // Node layer
    const nodeLayer = el('g', { class: 'sg-nodes' });
    const nodeEls = new Map();

    placed.forEach(t => {
        const g = el('g', {
            class: `sg-node ${t.system ? 'system' : 'custom'}`,
            transform: `translate(${t.x}, ${t.y})`
        });
        g.dataset.table = t.name;

        // Glow ring + Body circle
        g.appendChild(el('circle', { class: 'body', r: t.r.toFixed(1) }));

        // Full table name or clean truncate if exceptionally long (>18 chars)
        const label = el('text', { y: -3 });
        label.textContent = t.name.length > 18 ? t.name.slice(0, 16) + '…' : t.name;
        g.appendChild(label);

        // Row count
        const count = el('text', { class: 'count', y: 11 });
        count.textContent = `${t.count} row${t.count === 1 ? '' : 's'}`;
        g.appendChild(count);

        nodeLayer.appendChild(g);
        nodeEls.set(t.name, g);
    });
    viewport.appendChild(nodeLayer);

    container.appendChild(svg);

    // ----- Edge updates on node drag -----
    function updateConnectedEdges(tableName) {
        for (const [key, p] of edgeMap.entries()) {
            if (p.dataset.a === tableName || p.dataset.b === tableName) {
                const from = byName.get(p.dataset.a);
                const to = byName.get(p.dataset.b);
                if (from && to) {
                    p.setAttribute('d', edgePath(from, to));
                }
            }
        }
    }

    // ----- Interactive Node Drag & Drop -----
    placed.forEach(t => {
        const g = nodeEls.get(t.name);
        if (!g) return;

        let isDragging = false;
        let startClientX = 0;
        let startClientY = 0;
        let startNodeX = 0;
        let startNodeY = 0;
        let hasMoved = false;

        const onPointerDown = ev => {
            if (ev.button !== 0) return; // Left click only
            ev.stopPropagation(); // Don't trigger canvas pan
            ev.preventDefault(); // Prevent browser focus bounding box
            isDragging = true;
            hasMoved = false;
            startClientX = ev.clientX;
            startClientY = ev.clientY;
            startNodeX = t.x;
            startNodeY = t.y;
            g.classList.add('is-dragging');

            window.addEventListener('pointermove', onPointerMove, { passive: false });
            window.addEventListener('pointerup', onPointerUp);
        };

        const onPointerMove = ev => {
            if (!isDragging) return;
            const dx = (ev.clientX - startClientX) / currentTransform.scale;
            const dy = (ev.clientY - startClientY) / currentTransform.scale;

            if (Math.hypot(dx, dy) > 4) {
                hasMoved = true;
            }

            t.x = startNodeX + dx;
            t.y = startNodeY + dy;
            g.setAttribute('transform', `translate(${t.x}, ${t.y})`);
            updateConnectedEdges(t.name);
        };

        const onPointerUp = () => {
            if (!isDragging) return;
            isDragging = false;
            g.classList.remove('is-dragging');
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);

            if (!hasMoved) {
                window.location.href = `${adminPath}/tables/${encodeURIComponent(t.name)}`;
            }
        };

        g.addEventListener('pointerdown', onPointerDown);
        attachRelations(g, t.name);
    });

    // ----- Hover & Focus Highlighting -----
    const allNodeEls = [...svg.querySelectorAll('.sg-node')];
    const allEdgeEls = [...svg.querySelectorAll('.sg-edge')];

    function resetHighlight() {
        allNodeEls.forEach(n => n.classList.remove('active', 'dim'));
        allEdgeEls.forEach(e => e.classList.remove('active', 'dim'));
    }

    function focusTable(table) {
        resetHighlight();
        const neighbours = new Set([table]);
        allEdgeEls.forEach(e => {
            if (e.dataset.a === table || e.dataset.b === table) {
                e.classList.add('active');
                neighbours.add(e.dataset.a);
                neighbours.add(e.dataset.b);
            } else {
                e.classList.add('dim');
            }
        });
        allNodeEls.forEach(n => {
            const name = n.dataset.table;
            if (name === table) n.classList.add('active');
            else if (neighbours.has(name)) n.classList.remove('dim');
            else n.classList.add('dim');
        });
    }

    allNodeEls.forEach(n => {
        const table = n.dataset.table;
        n.addEventListener('mouseenter', () => focusTable(table));
        n.addEventListener('mouseleave', resetHighlight);
    });

    // ----- Canvas Pan (Drag background to scroll) -----
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;

    container.addEventListener('pointerdown', ev => {
        if (ev.target.closest('.sg-node')) return; // Ignore clicks on nodes
        isPanning = true;
        container.classList.add('is-panning');
        panStartX = ev.clientX - currentTransform.x;
        panStartY = ev.clientY - currentTransform.y;
    });

    window.addEventListener('pointermove', ev => {
        if (!isPanning) return;
        currentTransform.x = ev.clientX - panStartX;
        currentTransform.y = ev.clientY - panStartY;
        applyViewportTransform();
    });

    window.addEventListener('pointerup', () => {
        if (isPanning) {
            isPanning = false;
            container.classList.remove('is-panning');
        }
    });

    // ----- Mouse Wheel & Touchpad Zoom (Smooth, continuous damping) -----
    container.addEventListener('wheel', ev => {
        ev.preventDefault();
        const rect = container.getBoundingClientRect();
        const mouseX = ev.clientX - rect.left;
        const mouseY = ev.clientY - rect.top;

        // Smooth normalized delta:
        // Trackpad sends tiny high-frequency deltaY (1..5), mouse wheel sends large delta (50..100)
        // Mac pinch-to-zoom sets ev.ctrlKey = true
        let rawDelta = ev.ctrlKey ? -ev.deltaY * 3.5 : -ev.deltaY;
        const delta = Math.max(-45, Math.min(45, rawDelta));
        const zoomFactor = Math.exp(delta * 0.0035);
        const newScale = Math.min(3.0, Math.max(0.4, currentTransform.scale * zoomFactor));

        if (Math.abs(newScale - currentTransform.scale) < 0.0001) return;

        // Adjust pan to zoom smoothly relative to cursor position
        currentTransform.x = mouseX - (mouseX - currentTransform.x) * (newScale / currentTransform.scale);
        currentTransform.y = mouseY - (mouseY - currentTransform.y) * (newScale / currentTransform.scale);
        currentTransform.scale = newScale;

        applyViewportTransform(false);
    }, { passive: false });

    // Double-click background to reset view smoothly
    container.addEventListener('dblclick', ev => {
        if (ev.target.closest('.sg-node')) return;
        currentTransform = { scale: 1, x: 0, y: 0 };
        applyViewportTransform(true);
    });

    // Save active state for toolbar bindings
    activeGraphState = {
        zoomIn() {
            const cx = (container.clientWidth || 980) / 2;
            const cy = (container.clientHeight || 520) / 2;
            const newScale = Math.min(3.0, currentTransform.scale * 1.25);
            currentTransform.x = cx - (cx - currentTransform.x) * (newScale / currentTransform.scale);
            currentTransform.y = cy - (cy - currentTransform.y) * (newScale / currentTransform.scale);
            currentTransform.scale = newScale;
            applyViewportTransform(true);
        },
        zoomOut() {
            const cx = (container.clientWidth || 980) / 2;
            const cy = (container.clientHeight || 520) / 2;
            const newScale = Math.max(0.4, currentTransform.scale / 1.25);
            currentTransform.x = cx - (cx - currentTransform.x) * (newScale / currentTransform.scale);
            currentTransform.y = cy - (cy - currentTransform.y) * (newScale / currentTransform.scale);
            currentTransform.scale = newScale;
            applyViewportTransform(true);
        },
        reset() {
            currentTransform = { scale: 1, x: 0, y: 0 };
            applyViewportTransform(true);
        }
    };
}

// ----- Setup Toolbar Controls & Fullscreen -----
function setupToolbar(container, loadDataFn) {
    const btnIn = document.getElementById('sgZoomIn');
    const btnOut = document.getElementById('sgZoomOut');
    const btnReset = document.getElementById('sgReset');
    const btnFull = document.getElementById('sgFullscreen');
    const schemaCard = document.getElementById('schemaCard');

    btnIn?.addEventListener('click', () => activeGraphState?.zoomIn());
    btnOut?.addEventListener('click', () => activeGraphState?.zoomOut());
    btnReset?.addEventListener('click', () => activeGraphState?.reset());

    function toggleFullscreen() {
        if (!schemaCard) return;
        const isFull = schemaCard.classList.toggle('is-fullscreen');
        const iconExpand = btnFull?.querySelector('.sg-icon-expand');
        const iconCollapse = btnFull?.querySelector('.sg-icon-collapse');

        if (iconExpand && iconCollapse) {
            iconExpand.style.display = isFull ? 'none' : 'block';
            iconCollapse.style.display = isFull ? 'block' : 'none';
        }

        // Re-measure and re-render to fill the full screen width/height
        setTimeout(() => loadDataFn(), 80);
    }

    btnFull?.addEventListener('click', toggleFullscreen);

    // Escape key exits fullscreen
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && schemaCard?.classList.contains('is-fullscreen')) {
            toggleFullscreen();
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('schemaGraph');
    if (!container) return;

    let tables = [];
    let relations = {};

    async function loadDataAndRender() {
        try {
            if (!tables.length) {
                const res = await fetch(`${adminPath}/schema`, { headers: { 'Accept': 'application/json' } });
                const data = await res.json();
                tables = (data && data.success && data.success.tables) || [];
                relations = (data && data.success && data.success.relations) || {};
            }
        } catch (err) {
            console.warn('[korm] unable to load schema', err);
        }

        renderGraph(container, tables, relations);
    }

    setupToolbar(container, loadDataAndRender);
    await loadDataAndRender();

    // Re-render on window resize
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            currentTransform = { scale: 1, x: 0, y: 0 };
            renderGraph(container, tables, relations);
        }, 150);
    });

    // Relations hover popovers on the table grid
    document.querySelectorAll('.dash-table[data-table]').forEach(item => {
        attachRelations(item, item.dataset.table);
    });
});


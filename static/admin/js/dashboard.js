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

let graphMode = localStorage.getItem('korm-schema-graph-mode') || 'erd';
let cachedTables = [];
let cachedRelations = {};

/**
 * Compute an expansive elliptical layout with collision relaxation and hub prioritization.
 * Prevents overlapping nodes and gives labels plenty of breathing room.
 */
function layoutNodes(nodes, relations, width, height, mode = 'erd') {
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

    // Elliptical radius adapted to viewport and mode
    const rx = Math.max(180, (width / 2) * (mode === 'erd' ? 0.62 : 0.74));
    const ry = Math.max(140, (height / 2) * (mode === 'erd' ? 0.58 : 0.70));

    const placed = sorted.map((node, i) => {
        let angle;
        if (n === 2) {
            angle = i === 0 ? Math.PI : 0;
        } else {
            angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        }
        const wobble = n <= 2 ? 1 : (1 + 0.05 * Math.sin(i * 2.5));

        if (mode === 'erd') {
            const cols = node.columns || [];
            const maxCols = 8;
            const totalRows = Math.min(cols.length, maxCols) + (cols.length > maxCols ? 1 : 0);
            const cardWidth = 240;
            const cardHeight = 36 + Math.max(1, totalRows) * 22 + 12;
            return {
                ...node,
                cardWidth,
                cardHeight,
                r: Math.max(cardWidth, cardHeight) / 2,
                x: cx + Math.cos(angle) * rx * wobble,
                y: cy + Math.sin(angle) * ry * wobble,
            };
        }

        const r = 28 + Math.min(node.count, 999) / 999 * 10;
        return {
            ...node,
            r,
            x: cx + Math.cos(angle) * rx * wobble,
            y: cy + Math.sin(angle) * ry * wobble,
        };
    });

    // Relaxation passes to eliminate any node or label collisions
    for (let step = 0; step < 28; step++) {
        for (let i = 0; i < placed.length; i++) {
            for (let j = i + 1; j < placed.length; j++) {
                const a = placed[i];
                const b = placed[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;

                if (mode === 'erd') {
                    const minDistX = (a.cardWidth + b.cardWidth) / 2 + 32;
                    const minDistY = (a.cardHeight + b.cardHeight) / 2 + 28;
                    if (Math.abs(dx) < minDistX && Math.abs(dy) < minDistY) {
                        const overlapX = minDistX - Math.abs(dx);
                        const overlapY = minDistY - Math.abs(dy);
                        if (overlapX < overlapY) {
                            const sx = dx >= 0 ? 1 : -1;
                            a.x -= (sx * overlapX) / 2;
                            b.x += (sx * overlapX) / 2;
                        } else {
                            const sy = dy >= 0 ? 1 : -1;
                            a.y -= (sy * overlapY) / 2;
                            b.y += (sy * overlapY) / 2;
                        }
                    }
                } else {
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
    }

    return placed;
}

function edgePath(a, b, mode = 'erd') {
    if (mode === 'circles') {
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const cx = mx - (dy / len) * len * 0.12;
        const cy = my + (dx / len) * len * 0.12;
        return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }

    // ERD cards mode: connect from card border to card border with horizontal/vertical cubic bezier
    const hwA = (a.cardWidth || 240) / 2;
    const hhA = (a.cardHeight || 140) / 2;
    const hwB = (b.cardWidth || 240) / 2;
    const hhB = (b.cardHeight || 140) / 2;

    const dx = b.x - a.x;
    const dy = b.y - a.y;

    let x1, y1, x2, y2, cx1, cy1, cx2, cy2;

    if (Math.abs(dx) >= Math.abs(dy) * 0.7) {
        if (dx >= 0) {
            x1 = a.x + hwA;
            y1 = a.y;
            x2 = b.x - hwB;
            y2 = b.y;
        } else {
            x1 = a.x - hwA;
            y1 = a.y;
            x2 = b.x + hwB;
            y2 = b.y;
        }
        const delta = Math.abs(x2 - x1) * 0.45;
        cx1 = dx >= 0 ? x1 + delta : x1 - delta;
        cy1 = y1;
        cx2 = dx >= 0 ? x2 - delta : x2 + delta;
        cy2 = y2;
    } else {
        if (dy >= 0) {
            x1 = a.x;
            y1 = a.y + hhA;
            x2 = b.x;
            y2 = b.y - hhB;
        } else {
            x1 = a.x;
            y1 = a.y - hhA;
            x2 = b.x;
            y2 = b.y + hhB;
        }
        const delta = Math.abs(y2 - y1) * 0.45;
        cx1 = x1;
        cy1 = dy >= 0 ? y1 + delta : y1 - delta;
        cx2 = x2;
        cy2 = dy >= 0 ? y2 - delta : y2 + delta;
    }

    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${cx1.toFixed(1)} ${cy1.toFixed(1)} ${cx2.toFixed(1)} ${cy2.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
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

    cachedTables = tables;
    cachedRelations = relations;

    const width = container.clientWidth || 980;
    const height = container.clientHeight || 520;
    const svg = el('svg', {
        viewBox: `0 0 ${width} ${height}`,
        preserveAspectRatio: 'xMidYMid meet'
    });

    // Defs container for clipping paths
    const defs = el('defs');
    svg.appendChild(defs);

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

    const placed = layoutNodes(tables, relations, width, height, graphMode);
    const byName = new Map(placed.map(t => [t.name, t]));

    // Compute foreign key columns for quick lookup
    const fkCols = new Set();
    for (const [table, list] of Object.entries(relations || {})) {
        for (const rel of list) {
            if (rel.kind === 'belongs_to' && rel.col) {
                fkCols.add(`${rel.table}.${rel.col}`);
            }
        }
    }

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
            d: edgePath(from, to, graphMode)
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

        if (graphMode === 'erd') {
            g.classList.add('is-card');
            const w = t.cardWidth || 240;
            const h = t.cardHeight || 140;
            const hw = w / 2;
            const hh = h / 2;
            const headHeight = 36;

            // Clip path for rounded corners
            const clipId = `card-clip-${t.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
            const clip = el('clipPath', { id: clipId });
            clip.appendChild(el('rect', {
                x: -hw,
                y: -hh,
                width: w,
                height: h,
                rx: 10
            }));
            defs.appendChild(clip);

            // Card container with clip-path
            const cardInner = el('g', { 'clip-path': `url(#${clipId})` });

            // Card background
            cardInner.appendChild(el('rect', {
                class: 'sg-card-rect',
                x: -hw,
                y: -hh,
                width: w,
                height: h,
                rx: 10
            }));

            // Header background
            cardInner.appendChild(el('rect', {
                class: 'sg-card-head-bg',
                x: -hw,
                y: -hh,
                width: w,
                height: headHeight
            }));

            // Header separator line
            cardInner.appendChild(el('line', {
                class: 'sg-card-divider',
                x1: -hw,
                y1: -hh + headHeight,
                x2: hw,
                y2: -hh + headHeight
            }));

            // Table icon dot
            cardInner.appendChild(el('circle', {
                cx: -hw + 14,
                cy: -hh + headHeight / 2,
                r: 4,
                fill: t.system ? 'var(--theme-color)' : '#38bdf8'
            }));

            // Table Name
            const title = el('text', {
                class: 'sg-card-head-title',
                x: -hw + 25,
                y: -hh + headHeight / 2,
                'text-anchor': 'start',
                'dominant-baseline': 'central'
            });
            title.textContent = t.name.length > 15 ? t.name.slice(0, 14) + '…' : t.name;
            cardInner.appendChild(title);

            // Row count
            const count = el('text', {
                class: 'sg-card-head-count',
                x: hw - 12,
                y: -hh + headHeight / 2,
                'text-anchor': 'end',
                'dominant-baseline': 'central'
            });
            count.textContent = `${t.count} row${t.count === 1 ? '' : 's'}`;
            cardInner.appendChild(count);

            // Columns
            const cols = t.columns || [];
            const types = t.types || {};
            const maxCols = 8;
            const showCols = cols.slice(0, maxCols);
            const rowHeight = 22;
            const startY = -hh + headHeight + 15;

            showCols.forEach((col, idx) => {
                const cy = startY + idx * rowHeight;
                const isPk = col === t.pk;
                const isFk = fkCols.has(`${t.name}.${col}`);

                const colRow = el('g', { class: 'sg-card-col-row' });

                let textStartX = -hw + 14;
                if (isPk) {
                    const badge = el('rect', {
                        class: 'sg-card-badge-pk',
                        x: -hw + 12,
                        y: cy - 7,
                        width: 20,
                        height: 14,
                        rx: 3
                    });
                    const badgeTxt = el('text', {
                        class: 'sg-card-badge-pk-text',
                        x: -hw + 12 + 10,
                        y: cy,
                        'text-anchor': 'middle',
                        'dominant-baseline': 'central'
                    });
                    badgeTxt.textContent = 'PK';
                    colRow.appendChild(badge);
                    colRow.appendChild(badgeTxt);
                    textStartX = -hw + 38;
                } else if (isFk) {
                    const badge = el('rect', {
                        class: 'sg-card-badge-fk',
                        x: -hw + 12,
                        y: cy - 7,
                        width: 20,
                        height: 14,
                        rx: 3
                    });
                    const badgeTxt = el('text', {
                        class: 'sg-card-badge-fk-text',
                        x: -hw + 12 + 10,
                        y: cy,
                        'text-anchor': 'middle',
                        'dominant-baseline': 'central'
                    });
                    badgeTxt.textContent = 'FK';
                    colRow.appendChild(badge);
                    colRow.appendChild(badgeTxt);
                    textStartX = -hw + 38;
                }

                // Column name
                const colName = el('text', {
                    class: `sg-card-col-name ${isPk ? 'is-pk' : ''} ${isFk ? 'is-fk' : ''}`,
                    x: textStartX,
                    y: cy,
                    'text-anchor': 'start',
                    'dominant-baseline': 'central'
                });
                const maxLen = (isPk || isFk) ? 13 : 17;
                colName.textContent = col.length > maxLen ? col.slice(0, maxLen - 1) + '…' : col;
                colRow.appendChild(colName);

                // Column type
                const colType = types[col] || '';
                if (colType) {
                    const colTypeTxt = el('text', {
                        class: 'sg-card-col-type',
                        x: hw - 12,
                        y: cy,
                        'text-anchor': 'end',
                        'dominant-baseline': 'central'
                    });
                    colTypeTxt.textContent = colType.toLowerCase();
                    colRow.appendChild(colTypeTxt);
                }

                cardInner.appendChild(colRow);
            });

            if (cols.length > maxCols) {
                const moreY = startY + maxCols * rowHeight;
                const more = el('text', {
                    class: 'sg-card-more',
                    x: -hw + 14,
                    y: moreY,
                    'text-anchor': 'start',
                    'dominant-baseline': 'central'
                });
                more.textContent = `+ ${cols.length - maxCols} more columns…`;
                cardInner.appendChild(more);
            }

            g.appendChild(cardInner);
        } else {
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
        }

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
                    p.setAttribute('d', edgePath(from, to, graphMode));
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
    const btnCircles = document.getElementById('sgModeCircles');
    const btnCards = document.getElementById('sgModeCards');
    const schemaCard = document.getElementById('schemaCard');

    function syncModeButtons() {
        if (graphMode === 'erd') {
            btnCards?.classList.add('active');
            btnCircles?.classList.remove('active');
        } else {
            btnCircles?.classList.add('active');
            btnCards?.classList.remove('active');
        }
    }
    syncModeButtons();

    btnCircles?.addEventListener('click', () => {
        if (graphMode === 'circles') return;
        graphMode = 'circles';
        localStorage.setItem('korm-schema-graph-mode', 'circles');
        syncModeButtons();
        currentTransform = { scale: 1, x: 0, y: 0 };
        renderGraph(container, cachedTables, cachedRelations);
    });

    btnCards?.addEventListener('click', () => {
        if (graphMode === 'erd') return;
        graphMode = 'erd';
        localStorage.setItem('korm-schema-graph-mode', 'erd');
        syncModeButtons();
        currentTransform = { scale: 1, x: 0, y: 0 };
        renderGraph(container, cachedTables, cachedRelations);
    });

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


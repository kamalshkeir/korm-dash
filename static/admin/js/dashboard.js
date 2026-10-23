import { attachRelations } from '../components/Relations.js';

/**
 * Dashboard — renders the schema map (a node/link graph of the tables and
 * their foreign keys) plus the table list.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const adminPath = (window.admdmdPartth || document.body.dataset.path || '/admin').replace(/\/$/, '');

function el(name, attrs = {}) {
    const node = document.createElementNS(SVG_NS, name);
    for (const [k, v] of Object.entries(attrs)) {
        node.setAttribute(k, v);
    }
    return node;
}

/**
 * Compute a readable radial layout for the schema graph.
 * Tables with more relations are pulled towards the centre.
 */
function layoutNodes(nodes, width, height) {
    const cx = width / 2;
    const cy = height / 2;
    const n = nodes.length;
    if (!n) return [];

    const radiusX = Math.min(width, height) * 0.34;
    const radiusY = Math.min(width, height) * 0.34;

    return nodes.map((node, i) => {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        // Slight elliptical tilt gives the graph a more organic feel.
        const wobble = 1 + 0.12 * Math.sin(i * 2.3);
        return {
            ...node,
            x: cx + Math.cos(angle) * radiusX * wobble,
            y: cy + Math.sin(angle) * radiusY * wobble,
        };
    });
}

function edgePath(a, b) {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    // Offset the control point so parallel edges do not overlap perfectly.
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const cx = mx - (dy / len) * len * 0.09;
    const cy = my + (dx / len) * len * 0.09;
    return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

function renderGraph(container, tables, relations) {
    container.innerHTML = '';

    if (!tables.length) {
        const empty = document.createElement('div');
        empty.className = 'schema-empty';
        empty.innerHTML = `<div>No table yet.<br>Migrate a model to see your schema map.</div>`;
        container.appendChild(empty);
        return;
    }

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 320;
    const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'xMidYMid meet' });

    const placed = layoutNodes(tables, width, height);
    const byName = new Map(placed.map(t => [t.name, t]));

    // Only draw one edge per relation pair.
    const seen = new Set();
    const edges = [];
    for (const [table, list] of Object.entries(relations || {})) {
        const from = byName.get(table);
        if (!from) continue;
        for (const rel of list) {
            if (rel.kind !== 'belongs_to') continue; // draw each pair once
            const to = byName.get(rel.other);
            if (!to) continue;
            const key = [rel.table, rel.other].sort().join('|');
            if (seen.has(key)) continue;
            seen.add(key);
            edges.push({ path: edgePath(from, to), a: rel.table, b: rel.other });
        }
    }

    const edgeLayer = el('g', { class: 'sg-edges' });
    edges.forEach(e => {
        const p = el('path', { class: 'sg-edge', d: e.path });
        p.dataset.a = e.a;
        p.dataset.b = e.b;
        edgeLayer.appendChild(p);
    });
    svg.appendChild(edgeLayer);

    const nodeLayer = el('g', { class: 'sg-nodes' });
    placed.forEach(t => {
        const g = el('g', { class: `sg-node ${t.system ? 'system' : 'custom'}`, transform: `translate(${t.x}, ${t.y})` });
        g.dataset.table = t.name;

        const r = 26 + Math.min(t.count, 999) / 999 * 12;
        g.appendChild(el('circle', { class: 'body', r: r.toFixed(1) }));

        const label = el('text', { y: -2 });
        label.textContent = t.name.length > 12 ? t.name.slice(0, 11) + '…' : t.name;
        g.appendChild(label);

        const count = el('text', { class: 'count', y: 11 });
        count.textContent = `${t.count} row${t.count === 1 ? '' : 's'}`;
        g.appendChild(count);

        nodeLayer.appendChild(g);
    });
    svg.appendChild(nodeLayer);

    container.appendChild(svg);

    // ----- interaction: highlight the neighbourhood of the hovered node -----
    const nodes = [...svg.querySelectorAll('.sg-node')];
    const edgeEls = [...svg.querySelectorAll('.sg-edge')];

    function reset() {
        nodes.forEach(n => n.classList.remove('active', 'dim'));
        edgeEls.forEach(e => e.classList.remove('active', 'dim'));
    }

    function focus(table) {
        reset();
        const neighbours = new Set([table]);
        edgeEls.forEach(e => {
            if (e.dataset.a === table || e.dataset.b === table) {
                e.classList.add('active');
                neighbours.add(e.dataset.a);
                neighbours.add(e.dataset.b);
            } else {
                e.classList.add('dim');
            }
        });
        nodes.forEach(n => {
            const name = n.dataset.table;
            if (name === table) n.classList.add('active');
            else if (neighbours.has(name)) n.classList.remove('dim');
            else n.classList.add('dim');
        });
    }

    nodes.forEach(n => {
        const table = n.dataset.table;
        n.addEventListener('mouseenter', () => focus(table));
        n.addEventListener('mouseleave', reset);
        n.addEventListener('click', () => {
            window.location.href = `${adminPath}/tables/${encodeURIComponent(table)}`;
        });
        attachRelations(n, table);
    });

    svg.addEventListener('mouseleave', reset);
}

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('schemaGraph');
    if (!container) return;

    let tables = [];
    let relations = {};

    try {
        const res = await fetch(`${adminPath}/schema`, { headers: { 'Accept': 'application/json' } });
        const data = await res.json();
        tables = (data && data.success && data.success.tables) || [];
        relations = (data && data.success && data.success.relations) || {};
    } catch (err) {
        console.warn('[korm] unable to load schema', err);
    }

    renderGraph(container, tables, relations);

    // Re-render on resize so the graph stays centred.
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => renderGraph(container, tables, relations), 160);
    });

    // The table list in the dashboard also exposes relations on hover.
    document.querySelectorAll('.dash-table[data-table]').forEach(item => {
        attachRelations(item, item.dataset.table);
    });
});

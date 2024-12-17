let currentTraces = [];
let searchTerm = '';
let refreshInterval = null;
let expandedTags = new Set();
let expandedSpans = new Set();
let expandedChildren = new Set();
let selectedTraceId = null;

async function fetchTraces() {
    try {
        const response = await fetch(`${adminPath}/traces/get`);
        const traces = await response.json();
        currentTraces = traces;
        return traces;
    } catch (error) {
        console.error('Error fetching traces:', error);
        return [];
    }
}

async function refreshTraces() {
    const traces = await fetchTraces();
    renderTracesList(traces);
}

function filterTraces(traces) {
    if (!searchTerm) return traces;

    return traces.filter(trace => {
        // Check if trace ID matches
        if (trace.traceID.toLowerCase().includes(searchTerm.toLowerCase())) {
            return true;
        }

        // Check if any span name matches
        return trace.spans.some(span =>
            span.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });
}

function renderTracesList(traces) {
    const container = document.getElementById('traces-container');
    container.innerHTML = '';

    const filteredTraces = filterTraces(traces);

    if (filteredTraces.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                No traces found${searchTerm ? ` for "${searchTerm}"` : ''}
            </div>
        `;
        return;
    }

    // Sort traces by start time (newest first)
    const sortedTraces = filteredTraces.sort((a, b) => {
        const aStartTime = Math.min(...a.spans.map(span => new Date(span.startTime)));
        const bStartTime = Math.min(...b.spans.map(span => new Date(span.startTime)));
        return bStartTime - aStartTime; // Descending order
    });

    sortedTraces.forEach(trace => {
        const traceElement = document.createElement('div');
        traceElement.className = `trace-item${selectedTraceId === trace.traceID ? ' selected' : ''}`;

        // Find root span (span without parent)
        const rootSpan = trace.spans.find(span => !span.parentID) || trace.spans[0];
        const duration = rootSpan ? rootSpan.duration : 'N/A';

        // Highlight matching text if there's a search term
        let spanName = rootSpan ? rootSpan.name : 'Unknown';
        let traceId = trace.traceID;

        if (searchTerm) {
            const regex = new RegExp(`(${searchTerm})`, 'gi');
            spanName = spanName.replace(regex, '<mark>$1</mark>');
            traceId = traceId.replace(regex, '<mark>$1</mark>');
        }

        traceElement.innerHTML = `
            <div class="trace-name">${spanName}</div>
            <div class="trace-info">
            <span class="trace-id">ID: ${traceId}</span>
            <br>
            <span class="trace-duration">Took:<span class="dnum"> ${duration}</span></span>
            </div>
        `;

        traceElement.onclick = () => {
            // Remove selected class from all traces
            document.querySelectorAll('.trace-item').forEach(el => {
                el.classList.remove('selected');
            });

            // Add selected class to clicked trace
            traceElement.classList.add('selected');
            selectedTraceId = trace.traceID;

            clearTagStates();
            showTraceDetails(trace);
        };
        container.appendChild(traceElement);
    });
}

function showTraceDetails(trace) {
    const container = document.getElementById('trace-details-container');
    container.innerHTML = '';

    // Add trace ID header
    const traceIdHeader = document.createElement('div');
    traceIdHeader.className = 'trace-id-header';
    traceIdHeader.innerHTML = `
        <div class="trace-id-info">
            <span class="trace-id-label">Trace ID:</span>
            <span class="trace-id-value">${trace.traceID}</span>
        </div>
    `;
    container.appendChild(traceIdHeader);

    // Sort spans by start time
    const spans = trace.spans.sort((a, b) =>
        new Date(a.startTime) - new Date(b.startTime)
    );

    // Calculate total trace duration for timeline scaling
    const traceStart = new Date(spans[0].startTime);
    const traceEnd = new Date(spans[spans.length - 1].endTime);
    const totalDuration = traceEnd - traceStart;

    // Create a map of parent-child relationships
    const childrenMap = new Map();
    spans.forEach(span => {
        if (span.parentID) {
            if (!childrenMap.has(span.parentID)) {
                childrenMap.set(span.parentID, []);
            }
            childrenMap.get(span.parentID).push(span);
        }
    });

    // Function to render a span and its children recursively
    function renderSpan(span, depth = 0) {
        const spanElement = document.createElement('div');
        spanElement.className = 'span-timeline';
        spanElement.style.marginLeft = `${depth * 20}px`;
        spanElement.dataset.spanId = span.id;

        // Create timeline connector and dot
        const connector = document.createElement('div');
        connector.className = 'timeline-connector';
        const dot = document.createElement('div');
        dot.className = 'timeline-dot';

        spanElement.appendChild(connector);
        spanElement.appendChild(dot);

        const spanContent = document.createElement('div');
        spanContent.className = 'span-info';

        // Create header section that's always visible
        const headerHtml = `
            <div class="span-header">
                <div class="span-name-section">
                    <span class="span-toggle" onclick="toggleSpanDetails(this, '${span.id}')">${expandedSpans.has(span.id) ? '▼' : '▶'}</span>
                    <div class="span-name">${span.name}</div>
                    <div class="span-duration">${span.duration}</div>
                    ${childrenMap.has(span.id) ? `
                        <span class="children-toggle" onclick="toggleChildren(this)">${expandedChildren.has(span.id) ? '▼' : '▶'}</span>
                    ` : ''}
                </div>
            </div>
        `;

        // Create collapsible content
        const tagsCount = Object.keys(span.tags).length;
        const detailsHtml = `
            <div class="span-details ${expandedSpans.has(span.id) ? '' : 'hidden'}">
                ${span.statusCode ? `
                    <div class="span-status ${span.statusCode >= 400 ? 'error' : 'success'}">
                        Status: ${span.statusCode}
                    </div>
                ` : ''}
                ${span.error ? `
                    <div class="span-error">
                        Error: ${span.error}
                    </div>
                ` : ''}
                ${tagsCount > 0 ? `
                    <div class="tags-section">
                        <div class="tags-header" onclick="toggleTags(this, '${span.id}')">
                            <span class="tags-toggle">${expandedTags.has(span.id) ? '▼' : '▶'}</span>
                            Tags (${tagsCount})
                        </div>
                        <div class="tags-content ${expandedTags.has(span.id) ? '' : 'hidden'}">
                            ${Object.entries(span.tags)
                    .map(([key, value]) => `<span class="tag">${key}: ${value}</span>`)
                    .join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        spanContent.innerHTML = headerHtml + detailsHtml;
        spanElement.appendChild(spanContent);

        // Create container for child spans
        if (childrenMap.has(span.id)) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = `children-container ${expandedChildren.has(span.id) ? '' : 'hidden'}`;
            spanElement.appendChild(childrenContainer);

            // Render children into the container
            const children = childrenMap.get(span.id) || [];
            children.forEach(child => {
                const childSpan = renderSpan(child, depth + 1);
                childrenContainer.appendChild(childSpan);
            });
        }

        return spanElement;
    }

    // Find and render root spans (spans without parents)
    spans.filter(span => !span.parentID).forEach(span => {
        const rootSpan = renderSpan(span);
        container.appendChild(rootSpan);
    });
}

// Add this function for tags toggle
function toggleTags(element, spanId) {
    const content = element.nextElementSibling;
    const toggle = element.querySelector('.tags-toggle');
    content.classList.toggle('hidden');
    if (content.classList.contains('hidden')) {
        removeTagState(spanId);
        toggle.textContent = '▶';
    } else {
        saveTagState(spanId);
        toggle.textContent = '▼';
    }
}

// Update the toggleSpan function to handle children recursively
function toggleSpanDetails(element, spanId) {
    const spanTimeline = element.closest('.span-timeline');
    const content = spanTimeline.querySelector('.span-details');
    const isCollapsing = !content.classList.contains('hidden');

    content.classList.toggle('hidden');
    element.textContent = isCollapsing ? '▶' : '▼';

    if (isCollapsing) {
        removeSpanState(spanId);
    } else {
        saveSpanState(spanId);
    }
}

// Add new toggle function for children visibility
function toggleChildren(element) {
    const spanTimeline = element.closest('.span-timeline');
    const childrenContainer = spanTimeline.querySelector('.children-container');
    const spanId = spanTimeline.dataset.spanId;
    const isCollapsing = !childrenContainer.classList.contains('hidden');

    childrenContainer.classList.toggle('hidden');
    element.textContent = isCollapsing ? '▶' : '▼';

    if (isCollapsing) {
        expandedChildren.delete(spanId);
    } else {
        expandedChildren.add(spanId);
    }
}

async function clearTraces() {
    try {
        await fetch(`${adminPath}/traces/clear`, { method: 'POST' });
        refreshTraces();
    } catch (error) {
        console.error('Error clearing traces:', error);
    }
}

// Update the refresh interval handler
function updateRefreshInterval(value) {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }

    const interval = parseInt(value);
    if (interval > 0) {
        refreshInterval = setInterval(refreshTraces, interval);
    }
}

// Add function to save tag state
function saveTagState(spanId) {
    expandedTags.add(spanId);
}

// Add function to remove tag state
function removeTagState(spanId) {
    expandedTags.delete(spanId);
}

// Add state management functions for spans
function saveSpanState(spanId) {
    expandedSpans.add(spanId);
}

function removeSpanState(spanId) {
    expandedSpans.delete(spanId);
}

// Update clearTagStates to also clear span states
function clearTagStates() {
    expandedTags.clear();
    expandedSpans.clear();
}

// Update the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const refreshSelect = document.getElementById('refresh-interval');

    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        renderTracesList(currentTraces);
    });

    refreshSelect.addEventListener('change', (e) => {
        updateRefreshInterval(e.target.value);
    });

    // Initialize refresh interval
    updateRefreshInterval(refreshSelect.value);

    refreshTraces();
});

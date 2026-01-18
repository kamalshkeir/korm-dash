function allowDrop(ev) {
    ev.preventDefault();
    ev.currentTarget.classList.add('drag-over');
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    ev.target.classList.add('dragging');
}

function drop(ev) {
    ev.preventDefault();
    var data = ev.dataTransfer.getData("text");
    var el = document.getElementById(data);

    // Find the drop target (the .kanban-tasks container)
    let target = ev.target;
    while (!target.classList.contains('kanban-tasks') && target.parentElement) {
        target = target.parentElement;
    }

    // Remove drag-over styling
    document.querySelectorAll('.kanban-tasks').forEach(t => t.classList.remove('drag-over'));

    if (target.classList.contains('kanban-tasks')) {
        const afterElement = getDragAfterElement(target, ev.clientY);
        if (afterElement == null) {
            target.appendChild(el);
        } else {
            target.insertBefore(el, afterElement);
        }

        updateCounts();

        if (window.onTaskDrop) {
            // Gather all task IDs in order
            const taskIds = Array.from(target.querySelectorAll('.kanban-task'))
                .map(task => parseInt(task.getAttribute('data-id') || 0));
            window.onTaskDrop(target.dataset.status, taskIds);
        }
    }

    el.classList.remove('dragging');
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.kanban-task:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Optional: drag leave
document.querySelectorAll('.kanban-tasks').forEach(col => {
    col.addEventListener('dragleave', (e) => {
        if (e.target === col) {
            col.classList.remove('drag-over');
        }
    });
});

function updateCounts() {
    document.querySelectorAll('.kanban-column').forEach(col => {
        const count = col.querySelectorAll('.kanban-task').length;
        const countEl = col.querySelector('.count');
        if (countEl) countEl.innerText = count;
    });
}

let adminPath = document.body.dataset.adminPath
function restartNode(addr) {
    Ask(`Are you sure you want to restart node ${addr} ?`).then(ok => {
        if (ok) {
            fetch(`${adminPath}/nodemanager/restart`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ address: addr })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        alert('Error restarting node: ' + data.error);
                        Notif.New({
                            title: 'Error',
                            message: 'Error restarting node: ' + data.error,
                            type: 'error'
                        }).show();
                    } else {
                        Notif.New({
                            title: 'Info',
                            message: 'Restarting started',
                            type: 'info'
                        }).show();
                        setTimeout(refreshNodes, 2000);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    Notif.New({
                        title: 'Error',
                        message: 'Error restarting node: ' + error,
                        type: 'error'
                    }).show();
                });
        }
    })
}

document.getElementById('overlay').addEventListener('click', function (e) {
    // If the click is directly on the overlay (not its children)
    if (e.target === this) {
        hideAddNodeForm();
    }
});

// Node management functions
function showAddNodeForm() {
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('addNodeForm').style.display = 'block';
}

function hideAddNodeForm() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('addNodeForm').style.display = 'none';
}

function addNode() {
    const address = document.getElementById('nodeAddress').value;
    const secure = document.getElementById('nodeSecure').checked;

    fetch(`${adminPath}/nodemanager/nodes/add`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            address: address,
            secure: secure
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                Notif.New({
                    title: 'Error Creating Node',
                    message: data.error,
                    type: 'error'
                }).show();
            } else if (data.success) {
                hideAddNodeForm();
                Notif.New({
                    title: 'Success',
                    message: data.success,
                    type: 'success'
                }).show();
                updateNodesUI(data);
            } else {
                console.log("nodes add got data:", data)
            }
        })
        .catch(error => {
            console.error('Error:', error);
            Notif.New({
                title: 'Failed to add node',
                message: error,
                type: 'error'
            }).show();
        });
}

function removeNode(address) {
    Ask('Are you sure you want to remove this node?').then(ok => {
        if (ok) {
            fetch(`${adminPath}/nodemanager/nodes/remove`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    address: address
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        Notif.New({
                            title: 'Error Creating Node',
                            message: data.error,
                            type: 'error'
                        }).show();
                    } else if (data.success) {
                        hideAddNodeForm();
                        Notif.New({
                            title: 'Success',
                            message: data.success,
                            type: 'success'
                        }).show();
                        updateNodesUI(data);
                    } else {
                        console.log("nodes add got data:", data)
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    Notif.New({
                        title: 'Failed to remove node',
                        message: error,
                        type: 'error'
                    }).show();
                });
        }
    })
}

function refreshNodes() {
    fetch(`${adminPath}/nodemanager/nodes/list`)
        .then(response => response.json())
        .then(data => {
            updateNodesUI(data);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function updateNodesUI(data) {
    const nodesGrid = document.getElementById('nodesGrid');
    nodesGrid.innerHTML = '';

    document.getElementById('totalNodes').textContent = data.total || 0;
    document.getElementById('activeNodes').textContent = data.active || 0;
    document.getElementById('secureNodes').textContent = data.secure || 0;

    data.nodes.forEach(node => {
        const nodeCard = document.createElement('div');
        nodeCard.className = 'node-card';
        nodeCard.innerHTML = `
            <div class="node-header">
                <div style="display: flex; align-items: flex-start;">
                    <div class="node-status ${node.active ? '' : 'offline'}" title="${node.active ? 'Active' : 'Offline'}"></div>
                    <div class="node-info">
                        <div class="node-id">ID: ${node.id}</div>
                        <div class="node-address">${node.address}</div>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="restart-btn" onclick="restartNode('${node.address}')" title="Restart Node">
                        Restart
                    </button>
                    <button class="btn btn-outline" onclick="removeNode('${node.address}')" style="padding: 5px 10px;">
                        Remove
                    </button>
                </div>
            </div>
            ${node.secure ? '<div class="node-secure">Secure Connection</div>' : ''}
        `;
        nodesGrid.appendChild(nodeCard);
    });
}

// Initial load
refreshNodes();

// Refresh every 5 seconds
setInterval(refreshNodes, 5000);

document.addEventListener('DOMContentLoaded', () => {
    const metadataEl = document.getElementById('map-metadata');
    if (!metadataEl) return; // Don't run if no map is loaded

    const mapMetadata = JSON.parse(metadataEl.dataset.metadata);
    const originalWaypoints = JSON.parse(metadataEl.dataset.waypoints);
    const baseImage = document.getElementById('base-layer-img');
    const canvas = document.getElementById('interactive-layer-canvas');
    const editorContainer = document.getElementById('editor-container');
    const ctx = canvas.getContext('2d');

    // Initialize the editable waypoints as a deep copy of the original ones
    let newWaypoints = JSON.parse(JSON.stringify(originalWaypoints));

    // View state
    let scale = 1.0;
    let originX = 0;
    let originY = 0;
    let isDragging = false;
    let isPanning = false;
    let lastX, lastY;
    let draggedWaypointIndex = -1;

    // --- Initialization ---
    function initializeEditor() {
        // Set canvas drawing buffer to the actual map resolution
        canvas.width = mapMetadata.width;
        canvas.height = mapMetadata.height;

        // Set the display size of the canvas to match the background image
        canvas.style.width = `${baseImage.clientWidth}px`;
        canvas.style.height = `${baseImage.clientHeight}px`;

        // Set the container size explicitly to handle alignment
        editorContainer.style.width = `${baseImage.clientWidth}px`;
        editorContainer.style.height = `${baseImage.clientHeight}px`;

        resetView();
    }

    if (baseImage.complete) {
        initializeEditor();
    } else {
        baseImage.onload = initializeEditor;
    }
    window.onresize = initializeEditor;

    // --- Drawing ---
    function draw() {
        const transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
        baseImage.style.transform = transform;
        canvas.style.transform = transform;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (newWaypoints.length > 0) {
            ctx.beginPath();
            const firstWp = mapToCanvasCoords(newWaypoints[0]);
            ctx.moveTo(firstWp.x, firstWp.y);
            for (let i = 1; i < newWaypoints.length; i++) {
                ctx.lineTo(mapToCanvasCoords(newWaypoints[i]).x, mapToCanvasCoords(newWaypoints[i]).y);
            }
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 2;
            ctx.stroke();

            newWaypoints.forEach((wp, index) => {
                const p = mapToCanvasCoords(wp);
                ctx.beginPath();
                ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = (index === 0) ? '#00ffff' : (index === newWaypoints.length - 1) ? '#ff9900' : '#ff00ff';
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.stroke();
            });
        }
    }

    // --- Coordinate Conversion ---
    function mapToCanvasCoords(wp) {
        const x = (wp.x - mapMetadata.origin[0]) / mapMetadata.resolution;
        const y = mapMetadata.height - ((wp.y - mapMetadata.origin[1]) / mapMetadata.resolution);
        return { x, y };
    }

    function canvasToMapCoords(p) {
        const x = (p.x * mapMetadata.resolution) + mapMetadata.origin[0];
        const y = ((mapMetadata.height - p.y) * mapMetadata.resolution) + mapMetadata.origin[1];
        return { x, y };
    }

    // --- Interaction Logic & Modal --- //

    const modal = document.getElementById('waypoint-modal');
    const modalTitle = document.getElementById('modal-title');
    const waypointForm = document.getElementById('waypoint-form');
    const waypointXInput = document.getElementById('waypoint-x');
    const waypointYInput = document.getElementById('waypoint-y');
    const waypointThetaInput = document.getElementById('waypoint-theta');
    const cancelBtn = document.getElementById('cancel-waypoint');

    let editingWaypoint = { index: -1, data: null };

    function showEditPopup(waypointData, index) {
        editingWaypoint = { data: waypointData, index: index };
        modalTitle.textContent = (index === null) ? "Add New Waypoint" : `Edit Waypoint ${index + 1}`;
        waypointXInput.value = waypointData.x.toFixed(4);
        waypointYInput.value = waypointData.y.toFixed(4);
        waypointThetaInput.value = waypointData.theta.toFixed(4);
        modal.classList.remove('hidden');
    }

    function hideEditPopup() {
        modal.classList.add('hidden');
        editingWaypoint = { index: -1, data: null };
    }

    waypointForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const { index } = editingWaypoint;
        const updatedWaypoint = {
            x: parseFloat(waypointXInput.value),
            y: parseFloat(waypointYInput.value),
            theta: parseFloat(waypointThetaInput.value),
            curvature: (index !== null && newWaypoints[index]) ? newWaypoints[index].curvature : 0
        };
        if (index === null) { newWaypoints.push(updatedWaypoint); } 
        else { newWaypoints[index] = updatedWaypoint; }
        hideEditPopup();
        draw();
    });

    cancelBtn.addEventListener('click', hideEditPopup);

    function getWaypointAt(p) {
        for (let i = newWaypoints.length - 1; i >= 0; i--) {
            const wpCanvas = mapToCanvasCoords(newWaypoints[i]);
            const dist = Math.sqrt(Math.pow(wpCanvas.x - p.x, 2) + Math.pow(wpCanvas.y - p.y, 2));
            if (dist < 10) { return i; }
        }
        return -1;
    }

    // --- New Coordinate Calculation Helper ---
    function getMousePosOnCanvas(e) {
        const rect = editorContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        // Reverse the CSS transform to get the point on the untransformed canvas
        return {
            x: (x - originX) / scale,
            y: (y - originY) / scale
        };
    }

    // --- Event Listeners ---
    document.getElementById('zoom-in').addEventListener('click', () => { scale *= 1.2; draw(); });
    document.getElementById('zoom-out').addEventListener('click', () => { scale /= 1.2; draw(); });
    function resetView() { scale = 1.0; originX = 0; originY = 0; draw(); }
    document.getElementById('reset-view').addEventListener('click', resetView);

    editorContainer.addEventListener('mousedown', (e) => {
        const mousePos = getMousePosOnCanvas(e);
        const waypointIndex = getWaypointAt(mousePos);

        if (waypointIndex !== -1) {
            isDragging = true;
            draggedWaypointIndex = waypointIndex;
        } else {
            isPanning = true;
            lastX = e.clientX;
            lastY = e.clientY;
        }
    });

    editorContainer.addEventListener('mousemove', (e) => {
        if (!isDragging && !isPanning) return;
        const mousePos = getMousePosOnCanvas(e);

        if (isDragging) {
            const mapCoords = canvasToMapCoords(mousePos);
            newWaypoints[draggedWaypointIndex].x = mapCoords.x;
            newWaypoints[draggedWaypointIndex].y = mapCoords.y;
        } else if (isPanning) {
            originX += e.clientX - lastX;
            originY += e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
        }
        draw();
    });

    editorContainer.addEventListener('mouseup', (e) => {
        if (isDragging) {
            const mousePos = getMousePosOnCanvas(e);
            const dropIndex = getWaypointAt(mousePos);

            if (dropIndex !== -1 && dropIndex !== draggedWaypointIndex) {
                const [draggedItem] = newWaypoints.splice(draggedWaypointIndex, 1);
                newWaypoints.splice(dropIndex, 0, draggedItem);
            }
        }
        isDragging = false;
        isPanning = false;
        draggedWaypointIndex = -1;
        draw();
    });

    editorContainer.addEventListener('dblclick', (e) => {
        const mousePos = getMousePosOnCanvas(e);
        const waypointIndex = getWaypointAt(mousePos);

        if (waypointIndex !== -1) {
            showEditPopup(newWaypoints[waypointIndex], waypointIndex);
        } else {
            const mapCoords = canvasToMapCoords(mousePos);
            showEditPopup({ x: mapCoords.x, y: mapCoords.y, theta: 0, curvature: 0 }, null);
        }
    });

    editorContainer.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const mousePos = getMousePosOnCanvas(e);
        const waypointIndex = getWaypointAt(mousePos);
        if (waypointIndex !== -1) {
            newWaypoints.splice(waypointIndex, 1);
            draw();
        }
    });

    // --- Export Logic ---
    async function exportData(url, body) {
        try {
            const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!response.ok) throw new Error('Export failed.');
            return await response.blob();
        } catch (error) {
            document.getElementById('error-message').textContent = error.message;
            return null;
        }
    }

    function triggerDownload(blob, filename) {
        if (!blob) return;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    document.getElementById('export-csv').addEventListener('click', async () => {
        if (newWaypoints.length === 0) return alert("No new waypoints to export.");
        const blob = await exportData('/api/export_csv', { waypoints: newWaypoints });
        triggerDownload(blob, 'new_waypoints.csv');
    });
});
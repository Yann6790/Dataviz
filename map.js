// --- MAP RENDERING ---

let map, geoJsonLayer;
let currentMode = 'pauvrete'; // Default

function initMap(geoJson) {
    // Initialize Map with Restrictive Bounds
    map = L.map('map', {
        zoomControl: false, // Clean look
        attributionControl: false,
        minZoom: 8,
        maxBounds: [[44.1, -1.8], [45.6, 0.3]] // Gironde BBox approx
    }).setView([44.85, -0.6], 9);

    // NO TILE LAYER - Pure White Background controlled by CSS

    // 2. Communes Layer
    geoJsonLayer = L.geoJSON(geoJson, {
        style: styleFeature,
        onEachFeature: onEachFeature
    }).addTo(map);
}

function updateMapColors() {
    if (geoJsonLayer) geoJsonLayer.setStyle(styleFeature);
}

// --- MODE & STYLE LOGIC ---

function setMode(mode, btn) {
    currentMode = mode;

    // UI Update
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    // Trigger Map Update
    updateMapColors();
    updateLegend();

    // Trigger Stats Update if active
    if (typeof isStatsView !== 'undefined' && isStatsView) {
        renderStats();
    }
}

function updateLegend() {
    const box = document.getElementById('legend-box');
    const title = document.getElementById('legend-title');
    const desc = document.getElementById('legend-desc');

    if (LEGEND_CONTENT[currentMode]) {
        title.innerText = LEGEND_CONTENT[currentMode].title;
        desc.innerText = LEGEND_CONTENT[currentMode].desc;
        box.style.opacity = '1';
    } else {
        box.style.opacity = '0';
    }
}

function styleFeature(feature) {
    const insee = String(feature.properties.code);
    const data = DataStore.byInsee[insee];

    if (!data) return { fillColor: '#bdc3c7', weight: 1, color: 'white', fillOpacity: 1 };

    let color = '#ecf0f1'; // Default

    switch (currentMode) {
        case 'pauvrete':
            color = getPovertyColor(data.social.rate);
            break;
        case 'revenus':
            color = getIncomeColor(data.social.income);
            break;
        case 'incendies':
            const totalHist = Object.values(data.fire.history).reduce((a, b) => a + b, 0);
            color = getFireColor(totalHist);
            break;
        case 'argiles':
            color = getClayColor(data.clay);
            break;
        case 'crues':
            color = getWaterColor(data);
            break;
        case 'cavites':
            color = getCavityColor(data.cavites);
            break;
        case 'mouvements':
            color = getMovementColor(data.movements);
            break;
    }

    return {
        fillColor: color,
        weight: 1,
        opacity: 1,
        color: 'white', // Borders
        dashArray: '',
        fillOpacity: 1 // Solid colors
    };
}

function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: (e) => {
            openModal(String(feature.properties.code));
            L.DomEvent.stopPropagation(e);
        }
    });
}

function highlightFeature(e) {
    const layer = e.target;
    layer.setStyle({
        weight: 3,
        color: '#2c3e50',
        fillOpacity: 1
    });
    layer.bringToFront();
    updateSidebar(String(layer.feature.properties.code));
}

function resetHighlight(e) {
    geoJsonLayer.resetStyle(e.target);
}

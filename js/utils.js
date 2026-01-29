// --- UTILS ---

function normalizeName(str) {
    if (!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/-/g, " ").replace(/'/g, " ").replace(/\s+/g, " ").trim();
}

// --- COLOR GETTERS ---

function getPovertyColor(rate) {
    // New Semantic Scale
    if (!rate) return '#d7d8d8ff';
    if (rate < 9) return '#27ae60'; // Dark Green (Very Low Poverty)
    if (rate < 13) return '#2ecc71'; // Light Green
    if (rate < 19) return '#f39c12'; // Yellow/Orange
    if (rate < 25) return '#e74c3c'; // Red
    return '#c0392b'; // Dark Red / Blackish
}

function getIncomeColor(income) {
    // Divergent: Red (Poor) -> Blue (Rich)
    if (!income) return '#d7d8d8ff'; // Grey
    if (income < 18000) return '#e74c3c'; // Red
    if (income < 20500) return '#f39c12'; // Orange
    if (income < 22500) return '#daf10fff'; // Yellow/Neutral
    if (income < 26000) return '#a5db26ff';
    return '#7fff44ff';
}

function getFireColor(count) {
    if (count === 0) return '#d7d8d8ff'; // White/Grey
    if (count < 5) return '#f1c40f'; // Yellow
    if (count <= 15) return '#e67e22'; // Orange
    if (count <= 30) return '#f31313ff';
    return '#440f0aff';
}

function getClayColor(risk) {
    if (risk === 'FORT') return '#c0392b'; // Dark Red
    if (risk === 'MOYEN') return '#e67e22'; // Orange
    return '#d7d8d8ff'; // White/Light
}

function getWaterColor(cityData) {
    // Check if any station is close (assigned in processWaterData)
    if (cityData.water && cityData.water.station) {
        return '#3498db'; // Blue
    }
    return '#d7d8d8ff'; // White
}

function getCavityColor(count) {
    if (count === 0) return '#d7d8d8ff';
    if (count < 5) return '#e598fcff';
    if (count <= 15) return '#9257ffff';
    if (count <= 30) return '#4c01c5ff';
    return '#36014bff'; // Purple
}

function getMovementColor(count) {
    if (count === 0) return '#d7d8d8ff';
    if (count <= 5) return '#f1c40f';
    if (count <= 15) return '#f1690fff';
    if (count <= 30) return '#ff0000ff';
    return '#380b06ff';
}

// --- LOADERS ---

function loadCSV(url) {
    return new Promise((resolve) => {
        Papa.parse(url, {
            download: true,
            header: true,
            delimiter: ";",
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (res) => resolve(res.data),
            error: (err) => { console.warn("Load Error", url); resolve([]); }
        });
    });
}

function loadText(url) {
    return fetch(url).then(r => r.text());
}

function loadJSON(url) {
    return fetch(url).then(r => r.json());
}

function loadCSV_SemiColon(url) {
    return new Promise((resolve) => {
        Papa.parse(url, {
            download: true,
            header: true,
            delimiter: ";",
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (res) => resolve(res.data),
            error: (err) => { console.warn("Load Error", url); resolve([]); }
        });
    });
}

// --- SIDEBAR UI ---

function updateSidebar(insee) {
    const data = DataStore.byInsee[insee];
    if (!data) return;

    document.getElementById('sidebar-placeholder').style.display = 'none';
    document.getElementById('sidebar-content').style.display = 'block';

    document.getElementById('city-name').innerText = data.name;
    document.getElementById('city-insee').innerText = insee;

    // Social
    const pov = data.social.rate;
    document.getElementById('pov-rate').innerText = pov ? pov + '%' : '--%';
    document.getElementById('med-income').innerText = data.social.income ? data.social.income.toLocaleString() : '--';
    const barWidth = pov ? Math.min(pov * 2.5, 100) : 0;
    document.getElementById('pov-bar').style.width = barWidth + '%';
    document.getElementById('pov-bar').style.backgroundColor = getPovertyColor(pov);

    // Clay
    const badge = document.getElementById('clay-badge');
    badge.innerText = data.clay;
    badge.className = 'risk-badge';
    if (data.clay === 'FORT') badge.classList.add('bg-high');
    else if (data.clay === 'MOYEN') badge.classList.add('bg-med');
    else if (data.clay === 'FAIBLE') badge.classList.add('bg-low');
    else badge.classList.add('bg-unknown');

    // Fire - 10 Year Total
    const fireEl = document.getElementById('fire-count');
    const metricTitle = fireEl.parentElement.querySelector('.metric-title');
    if (metricTitle) metricTitle.innerText = "🔥 Incendies (2014-2024)";

    const count10y = (data.fire && data.fire.total10y !== undefined) ? data.fire.total10y : 0;

    if (count10y > 0) {
        fireEl.innerHTML = `<b style="color:#e74c3c">⚠️ ${count10y} au total</b>`;
    } else {
        fireEl.innerText = "Aucun sur la période";
        fireEl.style.color = "inherit";
    }

    // Hide old containers if present
    const oldHist = document.getElementById('fire-history-container');
    if (oldHist) oldHist.style.display = 'none';

    const oldChart = document.getElementById('water-chart-container');
    if (oldChart) oldChart.style.display = 'none';

    // Water
    document.getElementById('water-level').innerText = data.water.level;
    document.getElementById('water-station').innerText = data.water.station || "--";

    // Cavities
    const cavEl = document.getElementById('cavites-count');
    if (cavEl) {
        cavEl.innerText = data.cavites;
        if (data.cavites > 10) {
            cavEl.innerHTML = `<b style="color:#9b59b6">⚠️ ${data.cavites}</b>`;
        } else {
            cavEl.style.color = "inherit";
        }
    }

    // Movements
    const mvtEl = document.getElementById('movements-count');
    if (mvtEl) {
        mvtEl.innerText = data.movements;
        if (data.movements > 3) {
            mvtEl.innerHTML = `<b style="color:#c0392b">⚠️ ${data.movements}</b>`;
        } else {
            mvtEl.style.color = "inherit";
        }
    }
}

function updateLoading(text) {
    const el = document.getElementById('loading-text');
    if (el) el.innerText = text;
}

// --- MODAL LOGIC ---

let waterChartInstance = null;

function toggleModal(show) {
    const el = document.getElementById('modal-overlay');
    const searchContainer = document.getElementById('search-container');
    const mainTitle = document.getElementById('main-title');

    if (show) {
        el.classList.add('active');
        if (searchContainer) searchContainer.classList.add('hidden');
        if (mainTitle) mainTitle.classList.add('hidden');
    } else {
        el.classList.remove('active');
        if (searchContainer) searchContainer.classList.remove('hidden');
    }
    updateTitleVisibility();
}

function closeModal(e) {
    if (e.target.id === 'modal-overlay') {
        toggleModal(false);
    }
}

// Global Visibility Manager
function updateTitleVisibility() {
    const title = document.getElementById('main-title');
    if (!title) return;

    // Logic: Title IS HIDDEN unless...
    // 1. We differ if loading? (Loading usually overrides everything via z-index, but let's keep it simple)
    // 2. We are in MAP MODE (not stats)
    // 3. NO Modal is open (City, Sources, Correlation)

    const isMapMode = !isStatsView;
    const isCityModalOpen = document.getElementById('modal-overlay').classList.contains('active');
    const isSourcesModalOpen = document.getElementById('modal-sources-overlay')?.classList.contains('active');
    const isCorrModalOpen = document.getElementById('modal-correlation-overlay')?.classList.contains('active');
    const isLoading = document.getElementById('loading-overlay')?.style.display !== 'none'; // Check if loading is active?
    // Actually loading overlay usually covers everything.

    // Simplification:
    // If Map Mode AND No Modals Open -> SHOW
    // OR If Loading -> SHOW (Assuming we want it during load)

    // But wait, the previous logic was: hide if stats, hide if modal.
    // So:
    const show = (isMapMode && !isCityModalOpen && !isSourcesModalOpen && !isCorrModalOpen);

    if (show) {
        title.classList.remove('hidden');
    } else {
        title.classList.add('hidden');
    }
}

function openModal(insee) {
    const data = DataStore.byInsee[insee];
    if (!data) return;

    // 1. Populate Text
    document.getElementById('modal-city-name').innerText = data.name;
    document.getElementById('modal-city-insee').innerText = insee;

    // Social
    const pov = data.social.rate;
    document.getElementById('modal-pov-rate').innerText = pov ? pov + '%' : '--%';
    document.getElementById('modal-med-income').innerText = data.social.income ? data.social.income.toLocaleString() : '--';
    const barWidth = pov ? Math.min(pov * 2.5, 100) : 0;
    document.getElementById('modal-pov-bar').style.width = barWidth + '%';
    document.getElementById('modal-pov-bar').style.backgroundColor = getPovertyColor(pov);

    // Clay
    const badge = document.getElementById('modal-clay-badge');
    badge.innerText = data.clay;
    badge.className = 'risk-badge';
    if (data.clay === 'FORT') badge.classList.add('bg-high');
    else if (data.clay === 'MOYEN') badge.classList.add('bg-med');
    else if (data.clay === 'FAIBLE') badge.classList.add('bg-low');
    else badge.classList.add('bg-unknown');

    // Fire
    const count2024 = data.fire.total2024;
    document.getElementById('modal-fire-stat').innerHTML = count2024 > 0
        ? `<b style="color:#e74c3c">⚠️ ${count2024} en 2024</b>`
        : "Aucun en 2024";

    const histDiv = document.getElementById('modal-fire-history');
    histDiv.innerHTML = "";
    const years = Object.keys(data.fire.history).sort().reverse();
    if (years.length > 0) {
        let ul = document.createElement('ul');
        years.forEach(y => {
            let li = document.createElement('li');
            li.innerText = `${y} : ${data.fire.history[y]} incendie(s)`;
            ul.appendChild(li);
        });
        histDiv.appendChild(ul);
    } else {
        histDiv.innerText = "Aucun historique disponible.";
    }

    // Water
    document.getElementById('modal-water-level').innerText = data.water.level;
    document.getElementById('modal-water-station').innerText = data.water.station || "--";

    // Cavities
    const cavEl = document.getElementById('modal-cavites-val');
    if (cavEl) {
        const nbCav = data.cavites;
        cavEl.innerHTML = `${nbCav} recensée(s) ${nbCav > 10 ? '<span class="risk-badge bg-high">⚠️</span>' : ''}`;
    }

    // Movements
    const mvtEl = document.getElementById('modal-mouvements-val');
    if (mvtEl) {
        mvtEl.innerText = `${data.movements} historique(s)`;
    }

    // Chart
    const chartContainer = document.getElementById('modal-water-chart-container');
    chartContainer.innerHTML = '';

    if (data.water.history && data.water.history.values.length > 0) {
        const canvas = document.createElement('canvas');
        canvas.style.maxHeight = '250px';
        chartContainer.appendChild(canvas);

        if (waterChartInstance) {
            waterChartInstance.destroy();
        }

        const dailyMax = {};
        const rawLabels = data.water.history.labels;
        const rawValues = data.water.history.values;

        rawLabels.forEach((lbl, idx) => {
            const dayKey = lbl.split(' ')[0];
            const val = rawValues[idx];

            if (!dailyMax[dayKey]) dailyMax[dayKey] = -Infinity;
            if (val > dailyMax[dayKey]) dailyMax[dayKey] = val;
        });

        const aggLabels = Object.keys(dailyMax);
        const aggValues = Object.values(dailyMax);

        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, 'rgba(52, 152, 219, 0.6)');
        gradient.addColorStop(1, 'rgba(52, 152, 219, 0.0)');

        waterChartInstance = new Chart(canvas, {
            type: 'line',
            data: {
                labels: aggLabels,
                datasets: [{
                    label: 'Niveau Max Journalier',
                    data: aggValues,
                    borderColor: '#2980b9',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#2980b9',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        display: true,
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Hauteur d\'eau (m)'
                        }
                    }
                },
                plugins: {
                    legend: { display: true, position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `Max: ${context.parsed.y} m`;
                            },
                            title: function (context) {
                                return `Le ${context[0].label}`;
                            }
                        }
                    },
                    zoom: {
                        pan: { enabled: true, mode: 'x' },
                        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
                    }
                }
            }
        });
    }

    toggleModal(true);
}

// --- SEARCH BAR LOGIC ---

let searchIndex = [];

function buildSearchIndex() {
    searchIndex = Object.keys(DataStore.byInsee).map(insee => {
        const data = DataStore.byInsee[insee];
        return {
            insee: insee,
            name: data.name,
            norm: normalizeName(data.name)
        };
    });
}

function initSearch() {
    const input = document.getElementById('city-search');
    const resultsUl = document.getElementById('search-results');

    input.addEventListener('input', (e) => {
        const val = normalizeName(e.target.value);
        resultsUl.innerHTML = '';
        resultsUl.style.display = 'none';

        if (val.length < 2) return;

        // Filter
        const matches = searchIndex.filter(item => item.norm.includes(val) || item.insee.startsWith(val));

        // Sort
        matches.sort((a, b) => {
            const aStarts = a.norm.startsWith(val);
            const bStarts = b.norm.startsWith(val);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return 0;
        });

        const topMatches = matches.slice(0, 8);

        if (topMatches.length > 0) {
            topMatches.forEach(item => {
                const li = document.createElement('li');
                li.innerText = `${item.name} (${item.insee})`;
                li.onclick = () => selectCity(item.insee);
                resultsUl.appendChild(li);
            });
            resultsUl.style.display = 'block';
        }
    });

    // Enter Key
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const visibleItems = resultsUl.querySelectorAll('li');
            if (visibleItems.length === 1) {
                visibleItems[0].click();
                input.blur();
            }
        }
    });

    // Close
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !resultsUl.contains(e.target)) {
            resultsUl.style.display = 'none';
        }
    });
}

function selectCity(insee) {
    // 1. Clear Search
    const input = document.getElementById('city-search');
    const resultsUl = document.getElementById('search-results');
    input.value = '';
    resultsUl.style.display = 'none';

    // 2. Find feature
    const layer = geoJsonLayer.getLayers().find(l => l.feature.properties.code == insee);

    if (layer) {
        // 3. Fly To
        map.flyTo(layer.getBounds().getCenter(), 12, {
            duration: 1.5,
            easeLinearity: 0.25
        });

        // 4. Temporary Blink Highlight
        let flashCount = 0;
        const flashInterval = setInterval(() => {
            flashCount++;
            if (flashCount % 2 === 0) {
                geoJsonLayer.resetStyle(layer);
                layer.setStyle({ weight: 3, color: '#2c3e50', fillOpacity: 0.8 });
            } else {
                layer.setStyle({
                    weight: 5,
                    color: '#e74c3c',
                    fillOpacity: 0.9
                });
            }

            if (flashCount >= 6) {
                clearInterval(flashInterval);
                geoJsonLayer.resetStyle(layer);
                highlightFeature({ target: layer });
            }
        }, 300);

        // 5. Open Modal
        openModal(insee);
    }
}

// --- VIEW TOGGLE ---

function toggleView() {
    isStatsView = !isStatsView;

    const btn = document.getElementById('view-toggle-btn');
    const mapDiv = document.getElementById('map');
    const sidebar = document.getElementById('sidebar');
    const statsContainer = document.getElementById('stats-container');
    const searchContainer = document.getElementById('search-container');
    const legendBox = document.getElementById('legend-box');

    // Map UI Buttons
    const btnSources = document.getElementById('btn-sources');
    const btnCorr = document.getElementById('btn-correlation');

    if (isStatsView) {
        // Switch to Stats
        mapDiv.style.visibility = 'hidden';
        sidebar.style.display = 'none';
        searchContainer.classList.add('hidden');
        statsContainer.style.display = 'flex';
        btn.innerHTML = "🗺️ Carte";
        legendBox.classList.add('stats-mode');

        // Hide Map UI
        if (btnSources) btnSources.style.display = 'none';
        if (btnCorr) btnCorr.style.display = 'none';

        renderStats();
    } else {
        // Switch to Map
        mapDiv.style.visibility = 'visible';
        sidebar.style.display = 'flex';
        searchContainer.classList.remove('hidden');
        statsContainer.style.display = 'none';
        btn.innerHTML = "📊 Changer de vue";
        legendBox.classList.remove('stats-mode');

        // Show Map UI
        if (btnSources) btnSources.style.display = 'flex';
        if (btnCorr) btnCorr.style.display = 'flex';
    }
    updateTitleVisibility();
}

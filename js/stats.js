// --- STATS VIEW LOGIC ---

let isStatsView = false;
let globalChartInstance = null; // Store chart instance to destroy before re-creating
const chartInstances = []; // For multiple charts (Crues)

// Global Sort State for Revenue
let revenueSortAsc = true; // Default: Poorest first

// Pagination State
let chartPage = 0;
const ITEMS_PER_PAGE = 15;

function renderStats() {
    if (!isStatsView) return;

    // Reset Page on main Re-Render (switching modes)
    // Note: changePage() calls renderGlobalChartsFinal directly, so this is safe.
    chartPage = 0;

    const area = document.getElementById('stats-chart-area');
    const title = document.getElementById('stats-title');
    const desc = document.getElementById('stats-desc');

    // 1. ROBUST CLEARING
    chartInstances.forEach(c => {
        if (typeof c.destroy === 'function') c.destroy();
    });
    chartInstances.length = 0; // Clear array

    if (globalChartInstance) {
        if (typeof globalChartInstance.destroy === 'function') globalChartInstance.destroy();
        globalChartInstance = null;
    }

    while (area.firstChild) {
        area.removeChild(area.firstChild);
    }

    // Update Header
    if (LEGEND_CONTENT[currentMode]) {
        title.innerText = LEGEND_CONTENT[currentMode].title;
        desc.innerText = "Analyse globale des 50 communes les plus impactées";
    }

    // --- CASE: CRUES ---
    if (currentMode === 'crues') {
        desc.innerText = "Relevés des 30 derniers jours par station Vigicrues";
        renderCruesStats(area);
        return;
    }

    // --- CASE: CLAY (New 3-Column View) ---
    if (currentMode === 'argiles') {
        desc.innerText = "Répartition des communes par niveau de risque";
        renderClayStats(area);
        return;
    }

    // --- CASE: STANDARD MODES (Revenue has Sort Button) ---
    if (currentMode === 'revenus') {
        // Inject Toggle Button
        const btnContainer = document.createElement('div');
        btnContainer.style.marginBottom = "20px";
        btnContainer.style.textAlign = "center";

        const toggleBtn = document.createElement('button');
        toggleBtn.innerHTML = revenueSortAsc
            ? "🔄 Voir les communes les plus <b>riches</b>"
            : "🔄 Voir les communes les plus <b>modestes</b>";

        toggleBtn.style.padding = "8px 16px";
        toggleBtn.style.background = "white";
        toggleBtn.style.border = "1px solid #ccc";
        toggleBtn.style.borderRadius = "20px";
        toggleBtn.style.cursor = "pointer";
        toggleBtn.style.color = "#566573";
        toggleBtn.style.fontWeight = "500";

        toggleBtn.onclick = () => {
            revenueSortAsc = !revenueSortAsc;
            renderStats();
        };

        btnContainer.appendChild(toggleBtn);
        area.appendChild(btnContainer);

        desc.innerText = revenueSortAsc
            ? "Top 50 des revenus les plus faibles (Ordre Croissant)"
            : "Top 50 des revenus les plus élevés (Ordre Décroissant)";
    }

    // --- UPDATED RENDER CALL ---
    renderGlobalChartsFinal(area);
}

function renderCruesStats(container) {
    // 1. Stations Data
    // We assume VIGICRUES_STATIONS is available globally (from data.js)

    // 2. Select Default Station (usually the first one)
    // State management for currently selected station could be local here
    // or global if we want it passed, but local to this view is fine.

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.width = '100%';
    container.appendChild(wrapper);

    // 3. Create Selector Buttons Container
    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '15px';
    btnContainer.style.marginBottom = '30px';
    btnContainer.style.flexWrap = 'wrap';
    btnContainer.style.justifyContent = 'center';
    wrapper.appendChild(btnContainer);

    // 4. Chart Container
    const chartArea = document.createElement('div');
    chartArea.style.width = '100%';
    chartArea.style.background = '#fff';
    chartArea.style.padding = '20px';
    chartArea.style.borderRadius = '12px';
    chartArea.style.boxShadow = '0 5px 15px rgba(0,0,0,0.05)';
    wrapper.appendChild(chartArea);

    // Helper to render a specific station
    const renderStation = (station, btnElement) => {
        // Clear previous chart
        chartArea.innerHTML = '';

        // Update Buttons Styling
        Array.from(btnContainer.children).forEach(btn => {
            btn.style.background = 'white';
            btn.style.color = '#2c3e50';
            btn.style.borderColor = '#bdc3c7';
            btn.style.fontWeight = 'normal';
        });

        // Highlight active
        if (btnElement) {
            btnElement.style.background = '#3498db';
            btnElement.style.color = 'white';
            btnElement.style.borderColor = '#3498db';
            btnElement.style.fontWeight = 'bold';
        }

        // --- Render Content ---
        const h3 = document.createElement('h3');
        h3.innerText = `Station : ${station.name}`;
        h3.style.color = "#2c3e50";
        h3.style.borderBottom = "2px solid #3498db";
        h3.style.paddingBottom = "10px";
        h3.style.marginBottom = "20px";
        chartArea.appendChild(h3);

        const canvas = document.createElement('canvas');
        canvas.style.height = "350px";
        canvas.style.width = "100%";
        chartArea.appendChild(canvas);

        const cityList = document.createElement('div');
        cityList.style.marginTop = "20px";
        cityList.style.fontSize = "0.95rem";
        cityList.style.color = "#566573";
        cityList.style.lineHeight = "1.5";

        const linkedCities = Object.values(DataStore.byInsee)
            .filter(d => d.water && d.water.station === station.name)
            .map(d => d.name).sort().join(', ');

        cityList.innerHTML = `<strong>Communes rattachées (< 15km) :</strong><br> ${linkedCities || "Aucune commune à proximité immédiate."}`;
        chartArea.appendChild(cityList);

        const history = WaterHistory[station.name];
        if (history && history.values.length > 0) {
            const dailyMax = {};
            history.labels.forEach((lbl, i) => {
                const day = lbl.split(' ')[0];
                if (!dailyMax[day] || history.values[i] > dailyMax[day]) {
                    dailyMax[day] = history.values[i];
                }
            });

            // TRACK INSTANCE
            const chart = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: Object.keys(dailyMax),
                    datasets: [{
                        label: 'Niveau Max Journalier (m)',
                        data: Object.values(dailyMax),
                        borderColor: '#2980b9',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: false, // FIX: Disable responsive to prevent infinite growth loop
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: 'top' },
                        tooltip: {
                            callbacks: {
                                label: function (ctx) {
                                    return `Niveau: ${ctx.parsed.y} m`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            title: { display: true, text: 'Hauteur (m)' }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
            chartInstances.push(chart);
        }
    };

    // 5. Generate Buttons
    VIGICRUES_STATIONS.forEach((station, idx) => {
        const btn = document.createElement('button');
        btn.innerText = station.name;
        btn.style.padding = "10px 20px";
        btn.style.borderRadius = "25px";
        btn.style.border = "1px solid #bdc3c7";
        btn.style.cursor = "pointer";
        btn.style.transition = "all 0.2s ease";
        btn.style.fontSize = "1rem";

        btn.onclick = () => renderStation(station, btn);
        btnContainer.appendChild(btn);

        // Auto-click first one
        if (idx === 0) {
            // Defer slightly to ensure DOM is ready? No, synchronous is fine here.
            // We call it immediately but we need the element reference which we have.
            renderStation(station, btn);
        }
    });
}

function renderClayStats(container) {
    // 3 Columns: FORT, MOYEN, FAIBLE/INCONNU
    const columns = [
        { id: 'FORT', title: '🔴 Risque Fort', type: 'clay-col-red', list: [] },
        { id: 'MOYEN', title: '🟠 Risque Moyen', type: 'clay-col-orange', list: [] },
        { id: 'FAIBLE', title: '🟢 Risque Faible', type: 'clay-col-green', list: [] }
    ];

    // Populate Lists
    Object.keys(DataStore.byInsee).forEach(insee => {
        const d = DataStore.byInsee[insee];
        const risk = d.clay;

        if (risk === 'FORT') columns[0].list.push(d);
        else if (risk === 'MOYEN') columns[1].list.push(d);
        else columns[2].list.push(d);
    });

    // Create DOM structure
    const grid = document.createElement('div');
    grid.className = 'clay-columns';

    columns.forEach((col, idx) => {
        const colDiv = document.createElement('div');
        colDiv.className = `clay-col ${col.type}`;

        const h3 = document.createElement('h3');
        h3.innerText = `${col.title} (${col.list.length})`;
        colDiv.appendChild(h3);

        if (idx === 2) {
            // GREEN COLUMN: Static Text
            const p = document.createElement('p');
            p.innerText = "Toutes les autres communes du département.";
            p.style.color = "#27ae60";
            p.style.fontStyle = "italic";
            p.style.marginTop = "20px";
            colDiv.appendChild(p);
        } else {
            // RED/ORANGE: Full List
            // Sort Alphabetically
            col.list.sort((a, b) => a.name.localeCompare(b.name));

            const ul = document.createElement('ul');
            ul.className = 'clay-list';

            col.list.forEach(city => {
                const li = document.createElement('li');
                li.innerText = `${city.name} (${city.insee})`;
                ul.appendChild(li);
            });
            colDiv.appendChild(ul);
        }
        grid.appendChild(colDiv);
    });
    container.appendChild(grid);
}

function renderGlobalChartsFinal(container) {
    console.log("DEBUG: renderGlobalChartsFinal called");
    // 1. Prepare Data
    let items = [];

    Object.keys(DataStore.byInsee).forEach(insee => {
        const d = DataStore.byInsee[insee];
        let val = 0;
        let labelVal = "";

        switch (currentMode) {
            case 'pauvrete':
                if (d.social.rate === undefined || d.social.rate === null) {
                    val = 0;
                    labelVal = "Pas de valeur";
                } else {
                    val = d.social.rate;
                    labelVal = val + '%';
                }
                break;
            case 'revenus':
                if (d.social.income === undefined || d.social.income === null) {
                    val = 0;
                    labelVal = "Pas de valeur";
                } else {
                    val = d.social.income;
                    labelVal = val + ' €';
                }
                break;
            case 'incendies':
                val = (d.fire && d.fire.total10y) ? d.fire.total10y : 0;
                labelVal = val;
                break;
            case 'cavites':
                val = d.cavites || 0;
                labelVal = val;
                break;
            case 'mouvements':
                val = d.movements || 0;
                labelVal = val;
                break;
        }
        items.push({
            name: d.name,
            value: val,
            label: labelVal
        });
    });

    // 2. Sort Logic
    if (currentMode === 'revenus') {
        if (revenueSortAsc) {
            // Poorest first (Ascending)
            // Keep items with value > 0 OR explicit "Pas de valeur"
            items = items.filter(i => i.value > 0 || i.label === "Pas de valeur").sort((a, b) => {
                if (a.label === "Pas de valeur") return 1; // Put missing at end
                if (b.label === "Pas de valeur") return -1;
                return a.value - b.value;
            });
        } else {
            // Richest first (Descending)
            items = items.filter(i => i.value > 0 || i.label === "Pas de valeur").sort((a, b) => {
                if (a.label === "Pas de valeur") return 1;
                if (b.label === "Pas de valeur") return -1;
                return b.value - a.value;
            });
        }
    } else {
        // Standard (Descending)
        // Also keep "Pas de valeur" for poverty mode if needed, usually we sort desc
        items = items.filter(i => i.value > 0 || i.label === "Pas de valeur");
        items.sort((a, b) => {
            if (a.label === "Pas de valeur") return 1;
            if (b.label === "Pas de valeur") return -1;
            return b.value - a.value
        });
    }

    // 3. Pagination Slicing
    const totalItems = items.length;
    const startIdx = chartPage * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;

    // Safety check
    if (startIdx >= totalItems && totalItems > 0) {
        chartPage = 0; // Reset if out of bounds
    }

    const currentData = items.slice(startIdx, endIdx);

    // 4. Inject Pagination Controls
    const pagContainer = document.createElement('div');
    pagContainer.style.display = 'flex';
    pagContainer.style.justifyContent = 'center';
    pagContainer.style.alignItems = 'center';
    pagContainer.style.gap = '20px';
    pagContainer.style.marginBottom = '15px';

    // Prev Button
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = "◀ Précédent";
    prevBtn.disabled = chartPage === 0;
    prevBtn.style.padding = "8px 16px";
    prevBtn.style.borderRadius = "20px";
    prevBtn.style.border = "1px solid #ccc";
    prevBtn.style.background = prevBtn.disabled ? "#eee" : "white";
    prevBtn.style.cursor = prevBtn.disabled ? "not-allowed" : "pointer";
    prevBtn.style.color = prevBtn.disabled ? "#aaa" : "#2c3e50";

    prevBtn.onclick = () => {
        if (chartPage > 0) {
            changePage(-1);
        }
    };

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = "Suivant ▶";
    nextBtn.disabled = endIdx >= totalItems;
    nextBtn.style.padding = "8px 16px";
    nextBtn.style.borderRadius = "20px";
    nextBtn.style.border = "1px solid #ccc";
    nextBtn.style.background = nextBtn.disabled ? "#eee" : "white";
    nextBtn.style.cursor = nextBtn.disabled ? "not-allowed" : "pointer";
    nextBtn.style.color = nextBtn.disabled ? "#aaa" : "#2c3e50";

    nextBtn.onclick = () => {
        if (endIdx < totalItems) {
            // See above logic about re-rendering
            changePage(1);
        }
    };

    const info = document.createElement('span');
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    info.innerText = `Page ${chartPage + 1} / ${totalPages}`;
    info.style.fontWeight = "bold";
    info.style.color = "#2c3e50";

    pagContainer.appendChild(prevBtn);
    pagContainer.appendChild(info);
    pagContainer.appendChild(nextBtn);
    container.appendChild(pagContainer);


    // 5. Create Canvas
    const canvas = document.createElement('canvas');
    const finalHeight = 450;

    // EXPLICITLY SET ATTRIBUTES TO BLOCK AUTO-RESIZE
    canvas.height = finalHeight;
    canvas.style.height = `${finalHeight}px`;
    canvas.style.width = "100%";

    container.appendChild(canvas);

    // 6. Colors
    const colors = currentData.map(i => {
        switch (currentMode) {
            case 'pauvrete': return getPovertyColor(i.value);
            case 'revenus': return getIncomeColor(i.value);
            case 'incendies': return getFireColor(i.value);
            case 'argiles': return getClayColor(i.label);
            case 'cavites': return getCavityColor(i.value);
            case 'mouvements': return getMovementColor(i.value);
            default: return '#34495e';
        }
    });

    globalChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: currentData.map(i => i.name),
            datasets: [{
                label: LEGEND_CONTENT[currentMode]?.title || 'Valeur',
                data: currentData.map(i => i.value),
                backgroundColor: colors,
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            maintainAspectRatio: false,
            responsive: false, // DISABLE RESPONSIVE TO PREVENT GROWING BUG
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (ctx) {
                            const item = currentData[ctx.dataIndex];
                            return `${item.label}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: '#f0f0f0' },
                    beginAtZero: true
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        font: { size: 12, weight: '600' }, // Bigger for readability
                        color: '#2c3e50',
                        autoSkip: false
                    }
                }
            }
        }
    });
}

function changePage(delta) {
    chartPage += delta;

    const area = document.getElementById('stats-chart-area');
    if (currentMode === 'revenus') {
        // Keep first child
        while (area.childNodes.length > 1) {
            area.removeChild(area.lastChild);
        }
    } else {
        // Clear all
        while (area.firstChild) {
            area.removeChild(area.firstChild);
        }
    }

    // Destroy old chart
    if (globalChartInstance) {
        globalChartInstance.destroy();
        globalChartInstance = null;
    }

    renderGlobalChartsFinal(area);
}

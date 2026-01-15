// --- CORRELATION ANALYSIS MODULE ---

let correlationChartInstance = null;

/**
 * Main entry point: Open Modal showing the MENU
 */
function openCorrelationModal() {
    const modal = document.getElementById('modal-correlation-overlay');
    if (modal) {
        modal.classList.add('active');
        showCorrelationMenu();
    }
}

/**
 * Show the Selection Hub, Hide Results
 */
function showCorrelationMenu() {
    document.getElementById('correlation-menu').classList.add('active');
    document.getElementById('correlation-results').classList.remove('active');
}

/**
 * Start a specific analysis based on user selection
 * @param {string} type 'SOCIAL' or 'GEOTECH'
 */
function startAnalysis(type) {
    // 1. Switch Views
    document.getElementById('correlation-menu').classList.remove('active');
    document.getElementById('correlation-results').classList.add('active');

    // 2. Prepare Data & Config
    let dataset = [];
    let config = {};

    if (type === 'SOCIAL') {
        dataset = prepareSocialData();
        config = {
            title: "Pauvreté vs Revenus",
            subtitle: "Corrélation entre le taux de pauvreté et le revenu médian.",
            xLabel: "Taux de Pauvreté (%)",
            yLabel: "Revenu Médian (€)",
            xUnit: "%",
            yUnit: "€",
            colorOriginal: 'rgba(52, 152, 219, 0.6)',
            colorLine: '#e74c3c'
        };
    } else if (type === 'GEOTECH') {
        dataset = prepareGeotechData();
        config = {
            title: "Cavités vs Mouvements de Terrain",
            subtitle: "Lien entre le nombre de cavités souterraines et les mouvements de terrain recensés.",
            xLabel: "Nombre de Cavités",
            yLabel: "Nombre de Mouvements",
            xUnit: "",
            yUnit: "",
            colorOriginal: 'rgba(155, 89, 182, 0.6)', // Purple
            colorLine: '#2ecc71' // Green
        };
    } else if (type === 'FIRE_POVERTY') {
        dataset = prepareFirePovertyData();
        config = {
            title: "Pauvreté vs Incendies",
            subtitle: "Corrélation entre la précarité et la fréquence des incendies (2014-2024).",
            xLabel: "Taux de Pauvreté (%)",
            yLabel: "Incendies (Total 10 ans)",
            xUnit: "%",
            yUnit: "",
            colorOriginal: 'rgba(231, 76, 60, 0.6)', // Red
            colorLine: '#2c3e50' // Dark Blue
        };
    }

    // 3. Update Text Headers
    document.getElementById('analysis-title').innerText = config.title;
    document.getElementById('analysis-subtitle').innerText = config.subtitle;

    // 4. Run Generic Analysis
    runGenericCorrelation(dataset, config);
}

// --- DATA PREPARATION HELPERS ---

function prepareSocialData() {
    const points = [];
    Object.values(DataStore.byInsee).forEach(city => {
        const x = city.social.rate;
        const y = city.social.income;
        if (isValidNumber(x) && isValidNumber(y)) {
            points.push({ x: x, y: y, name: city.name });
        }
    });
    return points;
}

function prepareGeotechData() {
    const points = [];
    Object.values(DataStore.byInsee).forEach(city => {
        // Use 0 if undefined, assuming data is loaded but value is 0
        const x = city.cavites !== undefined ? city.cavites : 0;
        const y = city.movements !== undefined ? city.movements : 0;

        // Validity check: here 0 is valid.
        if (isValidNumber(x) && isValidNumber(y)) {
            points.push({ x: x, y: y, name: city.name });
        }
    });
    return points;
}

function prepareFirePovertyData() {
    const points = [];
    Object.values(DataStore.byInsee).forEach(city => {
        const x = city.social.rate; // Poverty
        // Fire: if undefined/null, assume 0.
        const y = (city.fire && city.fire.total10y !== undefined) ? city.fire.total10y : 0;

        // Rule: Poverty MUST be valid. Fire is valid even if 0 (implied by lines above).
        if (isValidNumber(x)) {
            points.push({ x: x, y: y, name: city.name });
        }
    });
    return points;
}

// --- GENERIC ENGINE ---

function runGenericCorrelation(points, config) {
    // 1. Compute Stats
    const stats = calculateLinearRegression(points);

    // 2. Update Stats Panel
    updateStatsPanel(stats, points.length, config);

    // 3. Render Chart
    renderGenericChart(points, stats, config);
}

// --- MATH HELPERS ---

function isValidNumber(n) {
    return typeof n === 'number' && !isNaN(n) && isFinite(n);
}

function calculateLinearRegression(data) {
    const n = data.length;
    if (n === 0) return { a: 0, b: 0, r: 0, r2: 0, meanX: 0, meanY: 0, minX: 0, maxX: 0 };

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    data.forEach(p => {
        sumX += p.x;
        sumY += p.y;
        sumXY += p.x * p.y;
        sumX2 += p.x * p.x;
        sumY2 += p.y * p.y;
    });

    const meanX = sumX / n;
    const meanY = sumY / n;

    const varX = (sumX2 / n) - (meanX * meanX);
    const varY = (sumY2 / n) - (meanY * meanY);
    const covXY = (sumXY / n) - (meanX * meanY);

    // Handle Perfect Vertical/Horizontal lines or single points
    if (varX === 0 || varY === 0) {
        return {
            a: 0,
            b: meanY,
            r: 0,
            r2: 0,
            meanX: meanX,
            meanY: meanY,
            minX: data.reduce((min, p) => p.x < min ? p.x : min, Infinity),
            maxX: data.reduce((max, p) => p.x > max ? p.x : max, -Infinity)
        };
    }

    const a = covXY / varX;
    const b = meanY - (a * meanX);

    const sigmaX = Math.sqrt(varX);
    const sigmaY = Math.sqrt(varY);
    const r = covXY / (sigmaX * sigmaY);

    return {
        a: a,
        b: b,
        r: r,
        r2: r * r,
        meanX: meanX,
        meanY: meanY,
        minX: data.reduce((min, p) => p.x < min ? p.x : min, Infinity),
        maxX: data.reduce((max, p) => p.x > max ? p.x : max, -Infinity)
    };
}

// --- UI UPDATES ---

function updateStatsPanel(stats, n, config) {
    // Equation
    const sign = stats.b >= 0 ? '+' : '-';
    const equation = `y = ${stats.a.toFixed(2)}x ${sign} ${Math.abs(stats.b).toFixed(2)}`;

    document.getElementById('corr-equation').innerText = equation;
    document.getElementById('corr-r').innerText = stats.r.toFixed(4);
    document.getElementById('corr-r2').innerText = stats.r2.toFixed(4);
    document.getElementById('corr-n').innerText = n;

    // Conclusion
    const conclusionEl = document.getElementById('correlation-conclusion');
    let text = "";
    const r = stats.r;

    if (r > 0.7) text = "Il y a clairement corrélation entre ces 2 données !";
    else if (r > 0.3) text = "Petite corrélation entre ces 2 données avec de grandes disparités.";
    else if (r > -0.3) text = "Pas de corrélation significative entre ces 2 données.";
    else if (r > -0.7) text = "Corrélation Négative Modérée.";
    else text = "Il y a clairement corrélation entre ces 2 données !";

    conclusionEl.innerText = `Conclusion : ${text}`;

    // Dynamic coloring based on relevance (Absolute R)
    if (Math.abs(r) > 0.5) {
        conclusionEl.style.background = "#dafaeb"; // Greenish
        conclusionEl.style.color = "#27ae60";
    } else {
        conclusionEl.style.background = "#f4f6f7"; // Grey
        conclusionEl.style.color = "#1f1f1fff";
    }
}

// --- CHART RENDERING ---

function renderGenericChart(points, stats, config) {
    const ctx = document.getElementById('correlation-chart').getContext('2d');

    if (correlationChartInstance) {
        correlationChartInstance.destroy();
    }

    // Regression Line Extremes
    const xMin = stats.minX;
    const xMax = stats.maxX;
    const yMin = stats.a * xMin + stats.b;
    const yMax = stats.a * xMax + stats.b;

    const regressionLine = [
        { x: xMin, y: yMin },
        { x: xMax, y: yMax }
    ];

    correlationChartInstance = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Villes (Gironde)',
                    data: points.map(p => ({ x: p.x, y: p.y, name: p.name })),
                    backgroundColor: config.colorOriginal,
                    borderColor: config.colorOriginal.replace('0.6', '1'),
                    borderWidth: 1,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    type: 'line',
                    label: 'Régression',
                    data: regressionLine,
                    borderColor: config.colorLine,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    tension: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            if (context.dataset.type === 'line') return `y = ${stats.a.toFixed(2)}x + ${stats.b.toFixed(2)}`;
                            const pt = context.raw;
                            return `${pt.name}: ${pt.x}${config.xUnit} / ${pt.y}${config.yUnit}`;
                        }
                    }
                },
                legend: { position: 'top' },
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: { display: true, text: config.xLabel }
                },
                y: {
                    title: { display: true, text: config.yLabel }
                }
            }
        }
    });

    // Handle "Drill-down" click
    // Note: If you want to click a point to open the city modal, you'd add an onclick here.
}

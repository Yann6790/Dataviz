// --- CORRELATION ANALYSIS MODULE ---

let correlationChartInstance = null;

/**
 * Main entry point to open modal and run analysis
 */
function openCorrelationModal() {
    const modal = document.getElementById('modal-correlation-overlay');
    modal.classList.add('active');

    // Defer slighty to ensure transition doesn't mess up chart size
    setTimeout(runCorrelationAnalysis, 100);
}

function runCorrelationAnalysis() {
    // 1. Prepare Data
    // Extract pairs { x: Poverty, y: Income } from DataStore
    // Filter out invalids
    const points = [];

    Object.values(DataStore.byInsee).forEach(city => {
        const x = city.social.rate;  // Poverty %
        const y = city.social.income; // Income €

        if (isValidNumber(x) && isValidNumber(y)) {
            points.push({ x: x, y: y, name: city.name });
        }
    });

    // 2. Compute Statistics (Native JS)
    const stats = calculateLinearRegression(points);

    // 3. Update UI Text
    updateStatsPanel(stats, points.length);

    // 4. Render Chart
    renderCorrelationChart(points, stats);
}

// --- MATH HELPERS ---

function isValidNumber(n) {
    return typeof n === 'number' && !isNaN(n) && isFinite(n);
}

function calculateLinearRegression(data) {
    const n = data.length;
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

    // Variance & CoVariance
    // Cov(X,Y) = E[XY] - E[X]E[Y]
    // Var(X) = E[X^2] - (E[X])^2
    const varX = (sumX2 / n) - (meanX * meanX);
    const varY = (sumY2 / n) - (meanY * meanY);
    const covXY = (sumXY / n) - (meanX * meanY);

    // Slope (a) and Intercept (b)
    // a = Cov(X,Y) / Var(X)
    const a = covXY / varX;
    const b = meanY - (a * meanX);

    // Correlation Coefficient (R)
    // R = Cov(X,Y) / (sigmaX * sigmaY)
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

function updateStatsPanel(stats, n) {
    // Equation: y = ax + b
    const sign = stats.b >= 0 ? '+' : '-';
    const equation = `y = ${stats.a.toFixed(2)}x ${sign} ${Math.abs(stats.b).toFixed(2)}`;

    document.getElementById('corr-equation').innerText = equation;
    document.getElementById('corr-r').innerText = stats.r.toFixed(4);
    document.getElementById('corr-r2').innerText = stats.r2.toFixed(4);
    document.getElementById('corr-n').innerText = n;

    // Conclusion text
    const conclusionEl = document.getElementById('correlation-conclusion');
    let text = "";
    const r = stats.r;

    if (r > 0.7) text = "Corrélation Positive Forte : Plus le taux de pauvreté est élevé, plus le revenu est élevé (Anomalie ?).";
    else if (r > 0.3) text = "Corrélation Positive Faible.";
    else if (r > -0.3) text = "Pas de corrélation significative.";
    else if (r > -0.7) text = "Corrélation Négative Modérée : Tendance inverse visible.";
    else text = "Corrélation Négative Forte : Plus une ville est pauvre, moins le revenu médian est élevé.";

    // Logic consistency check: Poverty vs Income should be negative.
    conclusionEl.innerText = `Conclusion : ${text}`;

    if (r < -0.5) {
        conclusionEl.style.background = "#fadbd8"; // Red tint for "Negative" link (which is logically expected for poverty vs income)
        conclusionEl.style.color = "#c0392b";
    } else {
        conclusionEl.style.background = "#e8f6f3";
    }
}

// --- CHART RENDERING ---

function renderCorrelationChart(points, stats) {
    const ctx = document.getElementById('correlation-chart').getContext('2d');

    if (correlationChartInstance) {
        correlationChartInstance.destroy();
    }

    // Prepare Regression Line Points (Extremes)
    // y = ax + b
    const xMin = stats.minX;
    const yMin = stats.a * xMin + stats.b;

    const xMax = stats.maxX;
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
                    backgroundColor: 'rgba(52, 152, 219, 0.6)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    type: 'line', // Mixed Chart
                    label: 'Régression Linéaire',
                    data: regressionLine,
                    borderColor: '#e74c3c', // Red
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0, // No points on the line tips
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
                            if (context.dataset.type === 'line') return 'Régression';
                            const pt = context.raw;
                            return `${pt.name}: Pauvreté ${pt.x}%, Revenu ${pt.y}€`;
                        }
                    }
                },
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Relation Pauvreté / Revenus'
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Taux de Pauvreté (%)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Revenu Médian (€)'
                    }
                }
            }
        }
    });
}

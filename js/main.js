// --- MAIN INIT ---

async function init() {
    updateLoading("Chargement des données...");

    try {
        // Load baselayers and small CSVs
        const [geoJson, socialData, fireData, waterData, cavitesData, movementsData] = await Promise.all([
            loadJSON(PATHS.GEOJSON),
            loadCSV(PATHS.SOCIAL),

            // Custom Loader for Fire Data to skip 3 metadata lines
            fetch(PATHS.FIRE).then(r => r.text()).then(text => {
                // Remove first 3 lines
                const lines = text.split('\n');
                const clean = lines.slice(3).join('\n');
                return new Promise(resolve => {
                    Papa.parse(clean, {
                        header: true,
                        delimiter: ";", // Explicit delimiter
                        dynamicTyping: true,
                        skipEmptyLines: true,
                        complete: res => resolve(res.data),
                        error: err => { console.warn("Fire CSV Error", err); resolve([]); }
                    });
                });
            }),
            loadCSV(PATHS.WATER),
            loadCSV_SemiColon(PATHS.CAVITES),
            loadCSV_SemiColon(PATHS.MOVEMENTS)
        ]);

        console.log("Core Data Loaded.");
        updateLoading("Initialisation Masque Monde...");

        // 1. Init Map immediately to show something
        initMap(geoJson);

        // 2. Build Store
        geoJson.features.forEach(f => {
            const insee = String(f.properties.code);
            DataStore.byInsee[insee] = {
                name: f.properties.nom,
                insee: insee,
                social: { rate: null, income: null },
                fire: { total2024: 0, total10y: 0, history: {} },
                clay: "FAIBLE",
                water: { level: "N/A", station: null },
                cavites: 0,
                movements: 0
            };
            DataStore.nameToInsee[normalizeName(f.properties.nom)] = insee;

            // Calculate Centroid for Spatial Join
            try {
                const centroid = turf.centroid(f);
                DataStore.centroids[insee] = centroid;
            } catch (e) {
                console.warn("Centroid error", insee);
            }
        });

        // 3. Process Simple CSVs
        socialData.forEach(row => {
            const insee = String(row.CODGEO);
            if (DataStore.byInsee[insee]) {
                DataStore.byInsee[insee].social = { rate: row.TP6017, income: row.MED17 };
            }
        });

        // Process Fire Data
        const fireAgg = {};

        fireData.forEach(row => {
            const dept = String(row['Département']);
            const inseeRaw = String(row['Code INSEE']);
            const year = row['Année'];

            if (dept === '33' || inseeRaw.startsWith('33')) {
                let insee = inseeRaw;
                if ((!insee || insee === 'undefined') && row['Nom de la commune']) {
                    insee = DataStore.nameToInsee[normalizeName(row['Nom de la commune'])];
                }

                if (insee) {
                    insee = String(insee);
                    if (!fireAgg[insee]) fireAgg[insee] = { total2024: 0, total10y: 0, history: {} };

                    fireAgg[insee].history[year] = (fireAgg[insee].history[year] || 0) + 1;

                    if (year === 2024) {
                        fireAgg[insee].total2024++;
                    }

                    if (year >= 2014 && year <= 2024) {
                        fireAgg[insee].total10y++;
                    }
                }
            }
        });

        Object.keys(fireAgg).forEach(insee => {
            if (DataStore.byInsee[insee]) {
                DataStore.byInsee[insee].fire = fireAgg[insee];
            }
        });

        processWaterData(waterData);

        // Process Cavities
        cavitesData.forEach(row => {
            const insee = String(row.numInsee);
            if (DataStore.byInsee[insee]) {
                DataStore.byInsee[insee].cavites++;
            }
        });

        // Process Movements
        movementsData.forEach(row => {
            const insee = String(row.num_insee);
            if (DataStore.byInsee[insee]) {
                DataStore.byInsee[insee].movements++;
            }
        });

        // Update UI with initial data (Poverty Map)
        updateMapColors();
        updateLegend();

        // 4. HEAVY LIFTING: CLAY ANALYSIS
        setTimeout(() => processClayData(PATHS.CLAY), 100);

        // 5. Build Search Index
        buildSearchIndex();
        initSearch();

    } catch (err) {
        console.error(err);
        updateLoading("Erreur: " + err.message);
    }
}

// --- LISTENERS ---

window.onload = init;

// Sources Modal Logic
document.addEventListener('DOMContentLoaded', () => {
    const btnSources = document.getElementById('btn-sources');
    const modalSources = document.getElementById('modal-sources-overlay');
    const closeSourcesBtn = document.getElementById('close-sources-btn');

    if (btnSources && modalSources && closeSourcesBtn) {
        btnSources.addEventListener('click', () => {
            modalSources.classList.add('active');
            updateTitleVisibility();
        });

        closeSourcesBtn.addEventListener('click', () => {
            modalSources.classList.remove('active');
            updateTitleVisibility();
        });

        modalSources.addEventListener('click', (e) => {
            if (e.target === modalSources) {
                modalSources.classList.remove('active');
                updateTitleVisibility();
            }
        });
    } else {
        console.error("Sources Modal Elements not found!");
    }

    // --- CORRELATION MODAL LOGIC ---
    const btnCorrelation = document.getElementById('btn-correlation');
    const modalCorrelation = document.getElementById('modal-correlation-overlay');
    const closeCorrelationBtn = document.getElementById('close-correlation-btn');

    if (btnCorrelation && modalCorrelation && closeCorrelationBtn) {
        btnCorrelation.addEventListener('click', () => {
            if (typeof openCorrelationModal === 'function') {
                openCorrelationModal();
                updateTitleVisibility(); // Trigger check
            } else {
                console.error("openCorrelationModal function missing");
            }
        });

        closeCorrelationBtn.addEventListener('click', () => {
            modalCorrelation.classList.remove('active');
            updateTitleVisibility();
        });

        modalCorrelation.addEventListener('click', (e) => {
            if (e.target === modalCorrelation) {
                modalCorrelation.classList.remove('active');
                updateTitleVisibility();
            }
        });
    } else {
        console.warn("Correlation Modal Elements not found!");
    }
});

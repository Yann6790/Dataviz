// --- DATA STORE ---

const DataStore = {
    byInsee: {},
    nameToInsee: {},
    centroids: {} // INSEE -> Turf Point
};

const WaterHistory = {};

// --- SPATIAL ANALYSIS (CLAY) ---

async function processClayData(url) {
    updateLoading("Analyse des sols (Geo-Spatial Join)...");
    document.getElementById('loading-sub').innerText = "Cela peut prendre quelques secondes...";

    // Use PapaParse on the URL but processed carefully
    Papa.parse(url, {
        download: true,
        header: true,
        delimiter: ";", // Important
        skipEmptyLines: true,
        step: function (row) {
            // Memory Management: Process 1 row, then let garbage collector handle it
            const data = row.data;
            if (!data['Geo Shape']) return;

            try {
                // 1. Extract Geometry
                const geometry = JSON.parse(data['Geo Shape']); // Parsing JSON string
                let riskLevel = (data.alea || data.cl_alea || "FAIBLE").toUpperCase();

                // Map specific CSV values like "INCONNU" explicitly
                if (riskLevel === "INCONNU") riskLevel = "FAIBLE";

                // 2. Create Turf Feature
                const poly = turf.feature(geometry);

                // 3. Check Intersection with ALL Cities (Brute force but robust for 500 points)
                Object.keys(DataStore.centroids).forEach(insee => {
                    const point = DataStore.centroids[insee];
                    if (turf.booleanPointInPolygon(point, poly)) {
                        // Intersection Found!
                        updateCityRisk(insee, riskLevel);
                    }
                });

            } catch (e) {
                // console.warn("Geo parse error", e);
            }
        },
        complete: function () {
            // Done
            console.log("Clay Analysis Complete");
            document.getElementById('loading-overlay').style.display = 'none';
        },
        error: (err) => console.error("Clay CSV Error", err)
    });
}

function updateCityRisk(insee, risk) {
    // Current logic: Priority (FORT > MOYEN > FAIBLE)
    // If a city hits multiple zones, we keep the highest risk
    const current = DataStore.byInsee[insee].clay;
    if (risk === "FORT") DataStore.byInsee[insee].clay = "FORT";
    else if (risk === "MOYEN" && current !== "FORT") DataStore.byInsee[insee].clay = "MOYEN";
}

// --- WATER LOGIC ---

function processWaterData(data) {
    // 1. Initialize History Cache for our known stations
    VIGICRUES_STATIONS.forEach(s => {
        WaterHistory[s.name] = { labels: [], values: [] };
    });

    // 2. Parse all rows to build history
    data.forEach(row => {
        const rawTime = row['Date et heure locale'];
        // Format date simply DD/MM
        // Format comes as "2025-12-08 01:00:00"
        let label = rawTime.split(' ')[0].split('-').slice(1).reverse().join('/'); // "08/12"

        VIGICRUES_STATIONS.forEach(s => {
            if (row[s.col] != null) {
                // Ensure number
                let valStr = String(row[s.col]).replace(',', '.');
                let val = parseFloat(valStr);
                if (!isNaN(val)) {
                    WaterHistory[s.name].labels.push(label + " " + rawTime.split(' ')[1].slice(0, 2) + "h");
                    WaterHistory[s.name].values.push(val);
                }
            }
        });
    });

    // Determine latest values for the 'latest' display
    const latest = {};

    VIGICRUES_STATIONS.forEach(s => {
        const h = WaterHistory[s.name];
        if (h.values.length > 0) {
            // Get last timestamp
            const subset = h.values.slice(-10);

            // MATH.JS USAGE HERE
            try {
                const avg = math.mean(subset);
                latest[s.name] = avg.toFixed(2); // "3.45"
            } catch (e) {
                console.warn("Mathjs error", e);
                latest[s.name] = h.values[h.values.length - 1]; // Fallback
            }
        } else {
            latest[s.name] = "N/A";
        }
    });

    // Assign to cities
    Object.values(DataStore.byInsee).forEach(city => {
        if (!DataStore.centroids[city.insee]) return;
        const center = DataStore.centroids[city.insee].geometry.coordinates; // [lon, lat]

        let closest = null;
        let minDist = 15; // km

        VIGICRUES_STATIONS.forEach(st => {
            const d = turf.distance(turf.point(center), turf.point([st.lon, st.lat]));
            if (d < minDist) {
                minDist = d;
                closest = st;
            }
        });

        if (closest) {
            let val = latest[closest.name];
            if (val !== "N/A") {
                city.water = {
                    level: String(val).replace('.', ',') + " m (Moy/h)", // Label update
                    station: closest.name,
                    // Link to the shared history
                    history: WaterHistory[closest.name]
                };
            }
        }
    });
}

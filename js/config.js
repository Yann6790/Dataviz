const PATHS = {
    GEOJSON: 'api/communes-gironde.json',
    SOCIAL: 'api/filosofi_gironde.csv',
    FIRE: 'api/NewIncendies.csv',
    CLAY: 'api/ri_alearga_s.csv',
    WATER: 'api/Vigicrues_Hauteurs_O972001001.csv',
    CAVITES: 'api/cavite_33.csv',
    MOVEMENTS: 'api/mvt_dptList_33.csv'
};

const LEGEND_CONTENT = {
    'pauvrete': {
        title: "Taux de Pauvreté",
        desc: "Sur cette carte vous pourrez voir la part des ménages vivant sous le seuil de pauvreté pour chaque commune de la Gironde. (Plus le pourcentage est élevé, plus il y a de personnes vivant sous le seuil de pauvreté dans cette ville)."
    },
    'revenus': {
        title: "Revenu Médian",
        desc: "Sur cette carte vous pourrez voir le revenu médian des habitants pour chaque commune de la Gironde en euro. Ces données reflètent le niveau de vie standardisé des habitants."
    },
    'incendies': {
        title: "Historique des Incendies",
        desc: "Sur cette carte vous pourrez voir le nombre d'incendies recensés pour chaque commune de la Gironde. Les données couvrent l'intervalle [2014-2024]. Vous pouvez cliquer sur une ville de la carte pour voir le nombre d'incendies par année."
    },
    'argiles': {
        title: "Retrait-Gonflement des Argiles",
        desc: "Sur cette carte vous pourrez voir le niveau d'exposition des sols au phénomène de retrait/gonflement d'argile pour chaque commune. Ce phénomène peut provoquer au long terme des dégats importants aux habitations se trouvant sur un sol affecté"
    },
    'crues': {
        title: "Niveaux des Crues",
        desc: "Sur cette carte vous pourrez voir les communes situées à proximité immédiate (<15km) d'une station de surveillance des crues. Au survol vous pourrez voir la hauteur moyenne du fleuve se trouvant à proximité. Vous pouvez cliquer sur une ville concernée pour consulter l'évolution de la hauteur de l'eau du fleuve pendant 30 jours."
    },
    'cavites': {
        title: "Cavités Souterraines",
        desc: "Sur cette carte vous pourrez voir le nombre de cavités souterraines (anciennes carrières, grottes, puits) recensées pour chaque commune de la Gironde. Plus une ville en comporte et plus elle sera vulnérable aux différents aléas"
    },
    'mouvements': {
        title: "Mouvements de Terrain",
        desc: "Sur cette carte vous pourrez voir le nombre d'aléa du type 'instabilités de sol' (éboulements, glissements, affaissements) ayant eu lieu pour chaque commune de la Gironde depuis 1994"
    }
};

const VIGICRUES_STATIONS = [
    { name: "Bordeaux", lat: 44.84, lon: -0.57, col: "Bordeaux (Garonne) (m)" },
    { name: "Ambès", lat: 45.04, lon: -0.55, col: "Ambès [Le Marquis] (Garonne) (m)" },
    { name: "Libourne", lat: 44.91, lon: -0.24, col: "Bayon-sur-Gironde [Bec d'Ambès] (Dordogne) (m)" }
];

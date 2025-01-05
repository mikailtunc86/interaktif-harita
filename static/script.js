let selectedProvinces = []; // Seçilen iller
let states = []; // Eyaletleri tutacak
let mapLayer; // GeoJSON katmanını yönetmek için

// Harita Oluşturma
var map = L.map('map').setView([39.0, 35.0], 6); // Türkiye merkezli başlangıç
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    minZoom: 4,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// GeoJSON Yükleme ve İşleme
function loadGeoJSON() {
    fetch('/static/map/turkey_map.json')
        .then(response => {
            if (!response.ok) throw new Error("GeoJSON dosyası yüklenemedi!");
            return response.json();
        })
        .then(data => {
            // Önceki katmanı kaldır
            if (mapLayer) map.removeLayer(mapLayer);

            // Yeni GeoJSON katmanı ekle
            mapLayer = L.geoJSON(data, {
                style: function(feature) {
                    for (let state of states) {
                        if (state.provinces.includes(feature.properties.name)) {
                            return {
                                color: "black",
                                weight: 2,
                                fillColor: state.color,
                                fillOpacity: 0.7
                            };
                        }
                    }
                    return {
                        color: "blue",
                        weight: 2,
                        fillColor: selectedProvinces.includes(feature.properties.name) ? "red" : "lightblue",
                        fillOpacity: 0.5
                    };
                },
                onEachFeature: function(feature, layer) {
                    layer.on('click', function() {
                        const province = feature.properties.name;

                        if (selectedProvinces.includes(province)) {
                            selectedProvinces = selectedProvinces.filter(item => item !== province);
                        } else {
                            selectedProvinces.push(province);
                        }

                        loadGeoJSON(); // Haritayı güncelle

                        document.getElementById("selectedList").innerText = 
                            "Seçilen İller: " + (selectedProvinces.length > 0 ? selectedProvinces.join(", ") : "Hiçbiri");
                    });
                }
            }).addTo(map);

            // Haritaya eyalet isimlerini ekle
            addStateLabels();
        })
        .catch(error => console.error("GeoJSON Yükleme Hatası: ", error));
}

// İlk yükleme
loadGeoJSON();

// Eyalet İsmini Haritaya Eklemek
function addStateLabels() {
    states.forEach(state => {
        const center = calculateStateCenter(state.provinces);
        if (center) {
            L.marker(center, {
                icon: L.divIcon({
                    className: "state-label",
                    html: `<div>${state.name}</div>`,
                    iconSize: [100, 20]
                })
            }).addTo(map);
        }
    });
}

// Seçilen İllerin Geometrik Ortalamasını Hesaplama
function calculateStateCenter(provinces) {
    let latSum = 0, lngSum = 0, count = 0;

    provinces.forEach(province => {
        const feature = geoJsonFeatures.find(
            (f) => f.properties.name === province
        );
        if (feature) {
            const coordinates = feature.geometry.coordinates[0];
            coordinates.forEach(coord => {
                lngSum += coord[0];
                latSum += coord[1];
                count++;
            });
        }
    });

    if (count > 0) {
        return [latSum / count, lngSum / count]; // Ortalama koordinat
    }
    return null;
}

// GeoJSON Verilerini Bellekte Tutmak
let geoJsonFeatures = [];

// GeoJSON Belleği için İlk Yükleme
fetch('/static/map/turkey_map.json')
    .then(response => response.json())
    .then(data => {
        geoJsonFeatures = data.features;
    });

// Eyalet Oluşturma İşlemleri
document.getElementById("stateForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const stateName = document.getElementById("stateName").value;
    const stateColor = document.getElementById("stateColor").value;

    if (selectedProvinces.length === 0) {
        alert("Eyalet oluşturmak için en az bir il seçmelisiniz!");
        return;
    }

    const newState = {
        name: stateName,
        color: stateColor,
        provinces: [...selectedProvinces]
    };
    states.push(newState);

    selectedProvinces = [];

    loadGeoJSON(); // Haritayı güncelle
    displayStates(); // Eyalet listesini güncelle
});

// Eyaletleri Listeleme
function displayStates() {
    const output = states.map(state => 
        `<strong>${state.name}</strong>: ${state.provinces.join(", ")}`
    ).join("<br>");
    document.getElementById("stateOutput").innerHTML = output;
}

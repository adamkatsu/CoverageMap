// var map = L.map('map').setView([40, 0], 1);
var map = L.map('map', {
  center: [0, 0], // Center the map
  zoom: 2,         // Initial zoom level
  attributionControl: false,
  maxBounds: [
    [-60, -180], // Southwest corner of the bounding box
    [85, 180]    // Northeast corner of the bounding box
  ],
  maxBoundsViscosity: 0, // Smooth panning at bounds edge
  minZoom: 1
});

L.tileLayer('', {
  maxZoom: 5,
  minZoom: 2,
  opacity: 1,
  attribution: '' // No attribution for a blank background
}).addTo(map);

// Add a white background to the map container
document.getElementById('map').style.backgroundColor = 'white';

// GeoJSON URL
const countriesGeoJSON = 'custom_refactored.geojson';

// Arrays for country data
const mainArray = []; // Full country data loaded
let tempArray = [];   // Currently active/filtered data

// GeoJSON Layer
let geojsonLayer;

// Global variable to store the original GeoJSON data
let geojsonData;

fetch(countriesGeoJSON)
  .then((response) => response.json())
  .then((data) => {
    geojsonData = data;

    for (const item of data.features) {
      const networkList = item.properties.network_list || {};
      const techs = { '2g': false, '3g': false, '5g': false, 'lte': false, 'lte_m': false, 'nb_iot': false };

      Object.values(networkList).forEach((net) => {
        if (net['2g'] === 't') techs['2g'] = true;
        if (net['3g'] === 't') techs['3g'] = true;
        if (net['5g'] === 't') techs['5g'] = true;
        if (net['lte'] === 't') techs['lte'] = true;
        if (net['lte_m'] === 't') techs['lte_m'] = true;
        if (net['nb_iot'] === 't') techs['nb_iot'] = true;
      });

      mainArray.push({
        name: item.properties.name || '',
        region: item.properties.region || '',
        iso: item.properties.iso || '',
        count: item.properties.network_count || '',
        '2g': techs['2g'],
        '3g': techs['3g'],
        '5g': techs['5g'],
        'lte': techs['lte'],
        'lte_m': techs['lte_m'],
        'nb_iot': techs['nb_iot'],
        network_list: networkList,
      });
    }

    tempArray = [...mainArray];
    populateCountryRegionCheckboxes(mainArray);

    updateMap();
    showList(tempArray);
  })
  .catch((error) => console.error('Error loading GeoJSON:', error));




// Convert temp Array to GeoJSON
function convertToGeoJSON(array, originalData) {
  return {
    type: "FeatureCollection",
    features: array.map((item) => {
      // Find the original GeoJSON feature to get the geometry
      const originalFeature = originalData.features.find(
        (feature) => feature.properties.name === item.name
      );

      return {
        type: "Feature",
        properties: {
          name: item.name,
          region: item.region,
          iso: item.iso,
          count: item.count,
          '2g': item['2g'],
          '3g': item['3g'],
          '5g': item['5g'],
          'lte': item['lte'],
          'lte_m': item['lte_m'],
          'nb_iot': item['nb_iot'],
          network_list: item.network_list || {}, // ✅ ADD THIS 
        },
        geometry: originalFeature.geometry, // Retain original geometry
      };
    }),
  };
}


function updateMap() {
  if (geojsonLayer) map.removeLayer(geojsonLayer); // Remove existing layer

  // Convert tempArray into valid GeoJSON
  const geoJSONData = convertToGeoJSON(mainArray, geojsonData);

  // Add the GeoJSON layer to the map
  geojsonLayer = L.geoJSON(geoJSONData, {
    style: featureStyle,
    onEachFeature: (feature, layer) => {
      const countryName = feature.properties.name;
      const countryRegion = feature.properties.region;
      const countryAmount = feature.properties.count;
      
      // Hover and Popup
      layer.on('mouseover', () => {
        const networkList = feature.properties.network_list || {};
        const networkNames = Object.keys(networkList)
          .map((netName) => `${netName}`)
          .join(', ');

        const countryData = `
          ${feature.properties['2g'] ? '<div class="popup-tag active">2G</div>' : '<div class="popup-tag">2G</div>'}
          ${feature.properties['3g'] ? '<div class="popup-tag active">3G</div>' : '<div class="popup-tag">3G</div>'}
          ${feature.properties['5g'] ? '<div class="popup-tag active">5G</div>' : '<div class="popup-tag">5G</div>'}
          ${feature.properties['lte'] ? '<div class="popup-tag active">LTE</div>' : '<div class="popup-tag">LTE</div>'}
          ${feature.properties['lte_m'] ? '<div class="popup-tag active">LTE-M</div>' : '<div class="popup-tag">LTE-M</div>'}
          ${feature.properties['nb_iot'] ? '<div class="popup-tag active">NB-IOT</div>' : '<div class="popup-tag">NB-IOT</div>'}
        `;

        const popup = L.popup({
          closeButton: false,
          className: 'floating-popup',
          autoClose: false,
          closeOnClick: false,
          autoPan: false, // Prevent panning the map on popup open
          offset: L.point(10, 10), // Offset from cursor (you can tweak this)
        });
        
      
        // Add mousemove event to make the popup follow the cursor
        layer.on('mousemove', (event) => {
          
          popup
            .setLatLng(event.latlng)
            .setContent(`
              <div class="popup-inner">
                <span class="popup-title">${countryName}</span>
                <span class="popup-region">${countryRegion}</span>
                <span class="popup-list">
                  <div class="popup-data">${countryData}</div>
                </span>
                <span class="popup-network">
                  <span class="popup-network-title">${countryAmount} Networks:</span>
                  <span class="popup-networks">${networkNames}</span>
                </span>
              </div>
            `)
            .openOn(map);
        });
      
        // Close the popup when the mouse leaves the layer
        layer.on('mouseout', () => {
          map.closePopup();
          layer.off('mousemove');
        });
      });

      // Toggle country selection
      layer.on('click', () => {
        toggleCountry(feature)
        map.closePopup();
        layer.off('mousemove');
      });
    },
  }).addTo(map);
}


// Function to toggle country selection
function toggleCountry(feature) {
  const countryName = feature.properties.name;
  const exists = tempArray.find((c) => c.name === countryName);

  if (exists) {
    // Remove if already in tempArray
    tempArray = tempArray.filter((c) => c.name !== countryName);
  } else {
    // Add to tempArray
    const countryData = mainArray.find((c) => c.name === countryName);
    if (countryData) tempArray.push(countryData);
  }

  updateMap();
  showList(tempArray);
}

// Style function for countries
function featureStyle(feature) {
  const isActive = tempArray.some((c) => c.name === feature.properties.name);
  return {
    color: '#ffffff',
    weight: 1,
    fillColor: isActive ? '#F69322' : '4D4D4F',
    fillOpacity: isActive ? 0.9 : 0.2,
  };
}

// Apply filters
function applyFilters() {
  const selectedFilters = [];
  document.querySelectorAll('.filters-options input[type="checkbox"]').forEach((checkbox) => {
    if (checkbox.checked) selectedFilters.push(checkbox.value);
  });

  // Filter the tempArray based on selected filters
  tempArray = mainArray.filter((country) =>
    selectedFilters.every((filter) => country[filter] === true)
  );

  updateMap();
  showList(tempArray);
}

// Show list in table
function showList(arr) {

  const listContainer = document.querySelector('.countries-list');
  let html = '';
  const svgCheck = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 12L10 17L20 7" stroke="#14AE5C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  const svgCross = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18M6 6L18 18" stroke="#F24822" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  let rowIndex = 1;
  arr.forEach((item) => {
    const networkList = item.network_list || {};
    Object.entries(networkList).forEach(([networkName, net]) => {
      html += `
        <div class="countries-item">
          <div class="countries-num">
            <span>${rowIndex++}</span>
          </div>
          <div class="countries-region">
            <span>${item.region}</span>
          </div>
          <div class="countries-name">
            <span>${item.name}</span>
          </div>
          <div class="countries-network">
            <span>${networkName}</span>
          </div>
          <div class="countries-count">
            <span>${item.count}</span>
          </div>
          <div class="countries-iso">
            <span>${net.plmn || 'N/A'}</span>
          </div>
          <div class="countries-2g">
            <span>${net['2g'] === 't' ? svgCheck : svgCross}</span>
          </div>
          <div class="countries-3g">
            <span>${net['3g'] === 't' ? svgCheck : svgCross}</span>
          </div>
          <div class="countries-5g">
            <span>${net['5g'] === 't' ? svgCheck : svgCross}</span>
          </div>
          <div class="countries-lte">
            <span>${net['lte'] === 't' ? svgCheck : svgCross}</span>
          </div>
          <div class="countries-lte_m">
            <span>${net['lte_m'] === 't' ? svgCheck : svgCross}</span>
          </div>
          <div class="countries-nb_iot">
            <span>${net['nb_iot'] === 't' ? svgCheck : svgCross}</span>
          </div>
        </div>`;
    });
  });

  listContainer.innerHTML = html;
}



// Add event listeners for filters
document.querySelectorAll('.filters-options input[type="checkbox"]').forEach((checkbox) => {
  checkbox.addEventListener('change', applyFilters);
});


// Open / Close Filter

document.querySelector('.filters-head').addEventListener('click', () => {
  document.querySelector('.filters-main').classList.toggle('filters-active');
})


// Populate unified dropdown filter with unique country names and regions
function populateCountryRegionCheckboxes(data) {
  const container = document.getElementById('location-filters');
  const searchInput = document.getElementById('search-filter');
  const techCheckboxes = document.querySelectorAll('.filters-options input[type="checkbox"]');

  container.innerHTML = ''; // clear existing

  const regions = new Set();
  const countries = new Set();

  data.forEach((item) => {
    if (item.region) regions.add(item.region);
    if (item.name) countries.add(item.name);
  });

  function createCheckbox(name, type) {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    const labelText = document.createElement('span');
    checkbox.type = 'checkbox';
    checkbox.value = `${type}:${name}`;
    checkbox.classList.add('location-filter');
    labelText.innerHTML = `${name}`;
    label.appendChild(checkbox);
    label.append(labelText);
    return label;
  }

  // Regions group
  const regionGroup = document.createElement('div');
  regionGroup.classList.add('region-group')
  regionGroup.innerHTML = '<strong>Regions</strong>';
  Array.from(regions).sort().forEach((r) => {
    regionGroup.appendChild(createCheckbox(r, 'region'));
  });
  container.appendChild(regionGroup);

  // Countries group
  const countryGroup = document.createElement('div');
  countryGroup.classList.add('region-group')
  countryGroup.innerHTML = '<br><strong>Countries</strong>';
  Array.from(countries).sort().forEach((c) => {
    countryGroup.appendChild(createCheckbox(c, 'country'));
  });
  container.appendChild(countryGroup);

  // ========== Filter Logic ==========
  function runFilters({ selectedLocations = [], keyword = '', selectedTech = [] }) {
    // Start from mainArray only once
    let filtered = mainArray;
  
    // Filter by locations
    if (selectedLocations.length > 0) {
      filtered = filtered.filter((item) =>
        selectedLocations.some((val) => {
          const [type, name] = val.split(':');
          return (type === 'region' && item.region === name) ||
                 (type === 'country' && item.name === name);
        })
      );
    }
  
    // Filter by tech
    if (selectedTech.length > 0) {
      filtered = filtered.filter((item) =>
        selectedTech.every((t) => item[t] === true)
      );
    }
  
    // Save interim state
    tempArray = [...filtered];
  
    // Final filter by keyword (applied *after* previous filters)
    if (keyword) {
      const key = keyword.toLowerCase();
      tempArray = tempArray.filter((item) => {
        const networkNames = Object.keys(item.network_list || {}).join(',').toLowerCase();
        return (
          item.name.toLowerCase().includes(key) ||
          item.region.toLowerCase().includes(key) ||
          networkNames.includes(key)
        );
      });
    }
  
    updateMap();
    showList(tempArray);
    updateActiveFilters(selectedLocations, selectedTech);
  }
  function updateActiveFilters(selectedLocations, selectedTech) {
    const activeDiv = document.querySelector('.filter-active');
    activeDiv.innerHTML = '';
  
    // Add tech tags
    selectedTech.forEach((tech) => {
      const chip = createFilterChip(tech, 'filters-options input[value="' + tech + '"]');
      activeDiv.appendChild(chip);
    });
  
    // Add location tags
    selectedLocations.forEach((loc) => {
      // `loc` is like "region:Asia" or "country:France"
      const [type, name] = loc.split(':');
      const selector = `.location-filter[value="${loc}"]`;
      const chip = createFilterChip(name, selector);
      activeDiv.appendChild(chip);
    });
  }
  function createFilterChip(labelText, checkboxSelector) {
    const chip = document.createElement('span');
    chip.className = 'filter-chip';
    chip.textContent = labelText;
  
    const x = document.createElement('span');
    x.className = 'filter-chip-close';
    x.innerHTML = ' ×';
    chip.appendChild(x);
  
    x.addEventListener('click', () => {
      const cb = document.querySelector(checkboxSelector);
      if (cb) {
        cb.checked = false;
  
        // Re-run filters using current UI state
        const selTech = Array.from(document.querySelectorAll('.filters-options input[type="checkbox"]:checked')).map(i => i.value);
        const selLoc = Array.from(document.querySelectorAll('.location-filter:checked')).map(i => i.value);
        const keyword = document.getElementById('search-filter').value;
        runFilters({ selectedLocations: selLoc, selectedTech: selTech, keyword });
      }
    });
  
    return chip;
  }
  
  
  

  // ========== Event Listeners ==========

  // Location checkboxes
  container.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      if (searchInput) searchInput.value = '';
      const selectedLocations = getChecked('.location-filter');
      const selectedTech = getChecked('.filters-options input[type="checkbox"]');
      runFilters({ selectedLocations, keyword: '', selectedTech });
    });
  });

  // Search input
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      const keyword = this.value;
      const selectedLocations = getChecked('.location-filter');
      const selectedTech = getChecked('.filters-options input[type="checkbox"]');
      runFilters({ selectedLocations, keyword, selectedTech });
    });
    
  }

  // Tech checkboxes
  techCheckboxes.forEach((cb) => {
    cb.addEventListener('change', () => {
      const selectedLocations = getChecked('.location-filter');
      const keyword = searchInput.value;
      const selectedTech = getChecked('.filters-options input[type="checkbox"]');
      runFilters({ selectedLocations, keyword, selectedTech });
    });
  });

  // Helper
  function getChecked(selector) {
    return Array.from(document.querySelectorAll(selector))
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);
  }
}

// Filter Dropdown

document.querySelector('.filter-toggle').addEventListener('click', () => {
  document.getElementById('location-filters').classList.toggle('is-active');
})

if(document.getElementById('location-filters').classList.contains('is-active')) {
  document.addEventListener('click', () => {
    console.log('click ok')
    document.getElementById('location-filters').classList.remove('is-active');
  })
}


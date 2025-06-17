const MapHandler = {
    svg: null,
    projection: null,
    countryFeatures: null,
    capitalFeatures: null,
    iso2ToIso3Map: new Map(),
    
    /**
     * Initializes the map, creating the SVG and projection.
     * Must be called before other rendering functions.
     * @param {object} countryData - GeoJSON for countries.
     * @param {object} capitalData - GeoJSON for capitals.
     */
    init(countryData, capitalData) {
        this.countryFeatures = countryData.features;
        this.capitalFeatures = capitalData.features;

        // Create a mapping from 2-letter to 3-letter country codes
        this.capitalFeatures.forEach(c => {
            this.iso2ToIso3Map.set(c.properties.iso2.toLowerCase(), c.properties.iso3);
        });

        const mapContainer = document.getElementById('map-container');
        if (!mapContainer) return;

        const { width, height } = mapContainer.getBoundingClientRect();
        this.svg = d3.select(mapContainer).append("svg")
            .attr("width", width)
            .attr("height", height)
            .call(d3.zoom().on("zoom", (event) => {
                this.svg.attr("transform", event.transform)
            }))
            .append("g");
            
        this.projection = d3.geoMercator().fitSize([width, height], countryData);
        this.renderBaseMap();
    },

    /**
     * Renders the initial country outlines and capital markers.
     */
    renderBaseMap() {
        const pathGenerator = d3.geoPath().projection(this.projection);

        // Draw countries
        this.svg.selectAll(".country")
            .data(this.countryFeatures)
            .enter().append("path")
            .attr("class", "country")
            .attr("d", pathGenerator)
            .attr("data-iso2", d => d.properties.cca2)
            .on('click', (event, d) => this.onCountryClick(d));
            
        // Draw capitals
        this.svg.selectAll(".capital-marker")
            .data(this.capitalFeatures)
            .enter().append("circle")
            .attr("class", "capital-marker")
            .attr("cx", d => this.projection(d.geometry.coordinates)[0])
            .attr("cy", d => this.projection(d.geometry.coordinates)[1])
            .attr("r", 2.5);
    },
    
    /**
     * Handles click events on a country path.
     * @param {object} geoData - The GeoJSON feature data for the clicked country.
     */
    onCountryClick(geoData) {
        const iso2 = geoData.properties.cca2;
        const iso3 = this.iso2ToIso3Map.get(iso2.toLowerCase());

        if (!iso3) {
            console.warn(`No 3-letter code found for ${iso2}`);
            return;
        }

        if (Simulation.gameState.isTargeting) {
            Simulation.executeFirstStrike(iso3);
        } else {
            UI.displayCountryInfo(iso3);
            this.highlightCountry(iso2);
        }
    },

    /**
     * Highlights a selected country and de-highlights others.
     * @param {string} iso2 - The 2-letter code of the country to highlight.
     */
    highlightCountry(iso2) {
        this.svg.selectAll('.country')
            .style('fill', '#5a5a5a') // Reset all countries
            .filter(d => d.properties.cca2 === iso2)
            .style('fill', '#a99c75'); // Highlight color
    },

    /**
     * Draws blast zone circles on the map.
     * @param {Array<object>} detonations - List of detonation events.
     */
    drawBlastZones(detonations) {
        // Convert blast radius from km to pixels
        // This is an approximation. A true conversion is complex.
        // We find the pixel distance for 10 degrees of longitude at the equator.
        const p1 = this.projection([0, 0]);
        const p2 = this.projection([10, 0]);
        const pixelsPer10Deg = p2[0] - p1[0];
        const kmPer10Deg = 1113.2; 
        const pixelsPerKm = pixelsPer10Deg / kmPer10Deg;

        const blastGroup = this.svg.append("g").attr("class", "blast-group");

        blastGroup.selectAll(".blast-zone")
            .data(detonations)
            .enter().append("circle")
            .attr("class", "blast-zone")
            .attr("cx", d => this.projection(d.location)[0])
            .attr("cy", d => this.projection(d.location)[1])
            .attr("r", 0)
            .style("fill", "red")
            .style("opacity", 0.6)
            .transition()
            .duration(500)
            .attr("r", d => d.blastRadius * pixelsPerKm)
            .transition()
            .duration(10000) // Linger for 10 seconds
            .style("opacity", 0)
            .remove(); // Remove the element after the animation
    },

    /**
     * Removes all dynamic overlays like blast zones.
     */
    clearAllOverlays() {
        this.svg.selectAll(".blast-group").remove();
        this.highlightCountry(null); // De-highlight all
    }
};
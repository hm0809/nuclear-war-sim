async function main() {
    // Load all necessary data in parallel
    const [
        countryGeoData, 
        capitalGeoData, 
        simData, 
        definiteTargets, 
        probableTargets
    ] = await Promise.all([
        loadJSON('data/countries.geojson'),
        loadJSON('data/capitals.geojson'),
        loadJSON('data/countries.json'),
        loadJSON('data/definite_targets.json'),
        loadJSON('data/probable_targets.json')
    ]);

    // Check if critical data failed to load
    if (!countryGeoData || !capitalGeoData || !simData || !definiteTargets || !probableTargets) {
        const errorMsg = `Error: Could not load critical data. Please check the console and ensure all .json files are in the 'data' folder.`;
        document.getElementById('map-container').innerHTML = `<p style="color: red; text-align: center;">${errorMsg}</p>`;
        return;
    }
    
    // Initialize all modules with the loaded data
    MapHandler.init(countryGeoData, capitalGeoData);
    Simulation.init(simData, definiteTargets, probableTargets);
    UI.init();

    console.log("Application fully initialized and ready.");
}

// Run the main function when the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', main);

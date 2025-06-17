// The main object to hold the simulation's state and data
const Simulation = {
    // Static data loaded once
    simData: null,
    targetData: {
        definite: null,
        probable: null,
    },
    // Dynamic state of the simulation
    gameState: {
        isActive: false,
        isTargeting: false,
        firstStriker: null,
        day: 0,
        totalCasualties: 0,
        belligerents: [], // Array of country codes at war
        events: [],
    },

    /**
     * Initializes the simulation with all necessary data.
     * @param {object} simData - Data from countries.json
     * @param {object} definiteTargets - Data from definite_targets.json
     * @param {object} probableTargets - Data from probable_targets.json
     */
    init(simData, definiteTargets, probableTargets) {
        this.simData = simData;
        this.targetData.definite = definiteTargets;
        this.targetData.probable = probableTargets;
        console.log("Simulation Initialized with data.");
    },

    /**
     * Resets the simulation to its initial state.
     */
    reset() {
        this.gameState = {
            isActive: false,
            isTargeting: false,
            firstStriker: null,
            day: 0,
            totalCasualties: 0,
            belligerents: [],
            events: [],
        };
        UI.updateAllUI(this.gameState); // Update UI to reflect reset
        MapHandler.clearAllOverlays();
        console.log("Simulation Reset.");
    },

    /**
     * Begins the first strike process.
     * @param {string} countryCode - The 3-letter code of the initiating country.
     */
    beginFirstStrike(countryCode) {
        if (this.gameState.isActive) return;
        this.gameState.isTargeting = true;
        this.gameState.firstStriker = countryCode;
        UI.showNotification(`First Strike initiated by ${this.getCountryData(countryCode).name}. Select a target country.`);
    },

    /**
     * Executes the first strike against a target.
     * @param {string} targetCountryCode - The 3-letter code of the target country.
     */
    executeFirstStrike(targetCountryCode) {
        if (!this.gameState.isTargeting || this.gameState.firstStriker === targetCountryCode) {
            this.gameState.isTargeting = false;
            UI.showNotification("Targeting cancelled.");
            return;
        }

        const attacker = this.getCountryData(this.gameState.firstStriker);
        const target = this.getCountryData(targetCountryCode);
        
        this.gameState.isActive = true;
        this.gameState.isTargeting = false;
        this.addBelligerent(attacker.code);
        this.addBelligerent(target.code);
        
        const eventText = `${attacker.name} launches a first strike against ${target.name}.`;
        this.logEvent(1, eventText, 'major');
        UI.showNotification(eventText);
        
        this.advanceEpoch(); // Immediately run the first day's simulation
    },
    
    /**
     * Adds a country to the list of belligerents if not already present.
     * @param {string} countryCode - The 3-letter code of the country.
     */
    addBelligerent(countryCode){
        if(!this.gameState.belligerents.includes(countryCode)){
            this.gameState.belligerents.push(countryCode);
        }
    },

    /**
     * The main simulation loop for a single day (epoch).
     */
    advanceEpoch() {
        if (!this.gameState.isActive) {
            UI.showNotification("The simulation has not begun. Select a nuclear-capable country to initiate a first strike.");
            return;
        }

        this.gameState.day += 1;
        const day = this.gameState.day;
        this.logEvent(day, `--- Day ${day} Begins ---`, 'system');

        const attacksThisEpoch = [];
        const newBelligerents = [];

        // Determine initial attacks from existing belligerents
        for (const code of this.gameState.belligerents) {
            const country = this.getCountryData(code);
            if (country.is_nuclear_capable) {
                // For simplicity, every belligerent attacks every epoch
                const enemies = this.gameState.belligerents.filter(b => this.areEnemies(code, b));
                for(const enemyCode of enemies) {
                     attacksThisEpoch.push(...this.planAttacks(country, this.getCountryData(enemyCode)));
                }
            }
        }
        
        // Determine retaliation from newly attacked countries & allies
        const attackedCountriesThisEpoch = [...new Set(attacksThisEpoch.map(a => a.targetCountry.code))];

        for (const attackedCode of attackedCountriesThisEpoch) {
            const attackedCountry = this.getCountryData(attackedCode);
            // Check for direct retaliation
            if(attackedCountry.is_nuclear_capable && Math.random() < attackedCountry.retaliation_probability.default){
                this.logEvent(day, `${attackedCountry.name} is retaliating immediately!`, 'major');
                const enemies = this.gameState.belligerents.filter(b => this.areEnemies(attackedCode, b));
                 for(const enemyCode of enemies) {
                    attacksThisEpoch.push(...this.planAttacks(attackedCountry, this.getCountryData(enemyCode)));
                }
            }
            
            // Check for ally retaliation
            const allAllies = this.simData.flatMap(c => c.allies.includes(attackedCode) ? [{ally: c, attacked: attackedCountry}] : []);
            for(const {ally, attacked} of allAllies){
                if(ally.is_nuclear_capable && !this.gameState.belligerents.includes(ally.code)){
                    const retaliationProb = ally.retaliation_probability.on_ally_attack.find(p => p.ally_code === attacked.code);
                    if(retaliationProb && Math.random() < retaliationProb.probability){
                        this.logEvent(day, `${ally.name} joins the war to defend ${attacked.name}!`, 'major');
                        newBelligerents.push(ally.code);
                    }
                }
            }
        }

        // Add new countries who joined the war
        newBelligerents.forEach(code => this.addBelligerent(code));

        // Resolve all attacks
        this.resolveAttacks(attacksThisEpoch, day);

        UI.updateAllUI(this.gameState);
        UI.showNotification(`Day ${day} concluded. Check the log for details.`);
    },

    /**
     * Plans the nuclear strikes from one country to another.
     * @param {object} attacker - The attacking country's data object.
     * @param {object} target - The target country's data object.
     * @returns {Array<object>} - A list of planned attack objects.
     */
    planAttacks(attacker, target) {
        const plannedAttacks = [];
        const [minNukes, maxNukes] = attacker.nukes_per_epoch_range;
        const numNukes = Math.floor(Math.random() * (maxNukes - minNukes + 1)) + minNukes;

        if (numNukes === 0) return [];
        
        this.logEvent(this.gameState.day, `${attacker.name} launches ${numNukes} warhead(s) towards ${target.name}.`, 'normal');

        const definiteTargets = (this.targetData.definite[target.code] || []).slice();
        const probableTargets = (this.targetData.probable[target.code] || []).slice();

        for (let i = 0; i < numNukes; i++) {
            let chosenTarget = null;
            // Prioritize definite targets
            if (definiteTargets.length > 0) {
                chosenTarget = definiteTargets.splice(Math.floor(Math.random() * definiteTargets.length), 1)[0];
            } 
            // Then move to probable targets
            else if (probableTargets.length > 0) {
                const targetIndex = Math.floor(Math.random() * probableTargets.length);
                const potentialTarget = probableTargets[targetIndex];
                if (Math.random() < potentialTarget.probability) {
                    chosenTarget = probableTargets.splice(targetIndex, 1)[0];
                }
            } else {
                // No targets left
                break;
            }
            
            if (chosenTarget) {
                plannedAttacks.push({
                    attacker: attacker,
                    targetCountry: target,
                    targetSite: chosenTarget,
                });
            }
        }
        return plannedAttacks;
    },

    /**
     * Processes attacks, calculates casualties, and updates the map.
     * @param {Array<object>} attacks - A list of attack objects.
     * @param {number} day - The current simulation day.
     */
    resolveAttacks(attacks, day) {
        const detonations = [];
        for (const attack of attacks) {
            let casualties = 0;
            const targetType = attack.targetSite.type;

            // Simplified casualty calculation
            if (targetType.includes("Population & Economic Center") || targetType.includes("Capital")) {
                casualties = Math.floor(Math.random() * 8000000) + 2000000;
            } else if (targetType.includes("Naval Base") || targetType.includes("Major USAF Base")) {
                casualties = Math.floor(Math.random() * 500000) + 100000;
            } else {
                casualties = Math.floor(Math.random() * 100000) + 10000;
            }
            
            this.gameState.totalCasualties += casualties;
            
            this.logEvent(day, `Detonation over ${attack.targetSite.name}, ${attack.targetCountry.name}. Estimated ${casualties.toLocaleString()} casualties.`, 'impact');
            
            // Prepare data for map rendering
            detonations.push({
                location: attack.targetSite.location,
                blastRadius: attack.attacker.default_weapon.blast_radius_km.moderate_blast_damage_5psi
            });
        }
        MapHandler.drawBlastZones(detonations);
    },

    /**
     * Adds a new event to the simulation log.
     * @param {number} day - The day the event occurred.
     * @param {string} text - The description of the event.
     * @param {string} type - The type of event (e.g., 'major', 'normal', 'system').
     */
    logEvent(day, text, type = 'normal') {
        this.gameState.events.unshift({ day, text, type }); // Add to beginning of array
    },
    
    /**
     * Helper to get a country's data by its 3-letter code.
     * @param {string} code - The 3-letter country code.
     * @returns {object|null}
     */
    getCountryData(code) {
        return this.simData.find(c => c.code === code);
    },

    /**
     * Simple check to see if two countries are enemies.
     * For now, any two belligerents are considered enemies.
     * This could be expanded later with alliance checks.
     * @param {string} code1 
     * @param {string} code2 
     * @returns {boolean}
     */
    areEnemies(code1, code2){
        return code1 !== code2;
    }
};
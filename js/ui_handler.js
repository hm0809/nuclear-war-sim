const UI = {
    /**
     * Initializes all UI-related event listeners.
     */
    init() {
        // Stats panel toggle
        const statsToggleBtn = document.getElementById('stats-toggle-button');
        const statsContent = document.getElementById('stats-content');
        if (statsToggleBtn && statsContent) {
            statsToggleBtn.addEventListener('click', () => {
                statsContent.classList.toggle('collapsed');
                statsToggleBtn.innerHTML = statsContent.classList.contains('collapsed')
                    ? 'Simulation Log & Stats &#9650;'
                    : 'Simulation Log & Stats &#9660;';
            });
        }
        
        // Next Day button
        document.getElementById('next-day-btn').addEventListener('click', () => Simulation.advanceEpoch());
    },

    /**
     * Updates all parts of the UI based on the current game state.
     * @param {object} gameState - The current state of the simulation.
     */
    updateAllUI(gameState) {
        this.updateCounters(gameState.day, gameState.totalCasualties);
        this.updateEventLog(gameState.events);
    },

    /**
     * Displays detailed information for a selected country in the left panel.
     * @param {string} countryCode - The 3-letter code of the country.
     */
    displayCountryInfo(countryCode) {
        const country = Simulation.getCountryData(countryCode);
        const contentDiv = document.getElementById('country-info-content');
        document.getElementById('left-panel-placeholder').style.display = 'none';
        contentDiv.innerHTML = ''; // Clear previous content

        if (!country) {
            contentDiv.innerHTML = `<p>No simulation data available for this country.</p>`;
            return;
        }

        let alliesList = 'None';
        if (country.allies && country.allies.length > 0) {
            alliesList = country.allies.map(code => Simulation.getCountryData(code)?.name || code).join(', ');
        }
        
        let html = `
            <h3>${country.name}</h3>
            <p><strong>Population:</strong> ${country.population.toLocaleString()}</p>
            <p><strong>Allies:</strong> ${alliesList}</p>
            <p><strong>Nuclear Capable:</strong> ${country.is_nuclear_capable ? 'Yes' : 'No'}</p>
        `;

        if (country.is_nuclear_capable) {
            const weapon = country.default_weapon;
            html += `
                <h4>Default Weapon: ${weapon.name}</h4>
                <ul>
                    <li>Yield: ${weapon.yield_kt} kt</li>
                    <li>Moderate Blast Radius: ${weapon.blast_radius_km.moderate_blast_damage_5psi} km</li>
                </ul>
            `;
            // Add "Initiate Strike" button if simulation hasn't started
            if (!Simulation.gameState.isActive) {
                const button = document.createElement('button');
                button.id = 'initiate-strike-btn';
                button.className = 'sim-button';
                button.textContent = 'Initiate First Strike';
                button.onclick = () => Simulation.beginFirstStrike(country.code);
                contentDiv.innerHTML = html;
                contentDiv.appendChild(button);
            } else {
                 contentDiv.innerHTML = html;
            }
        } else {
            contentDiv.innerHTML = html;
        }
    },

    /**
     * Updates the day and casualty counters.
     * @param {number} day - The current day.
     * @param {number} casualties - The total casualty count.
     */
    updateCounters(day, casualties) {
        document.getElementById('day-counter').textContent = day;
        document.getElementById('total-casualties').textContent = casualties.toLocaleString();
    },

    /**
     * Updates the event log in the stats panel.
     * @param {Array<object>} events - The list of event objects.
     */
    updateEventLog(events) {
        const logList = document.getElementById('event-log');
        logList.innerHTML = ''; // Clear the list
        events.forEach(event => {
            const li = document.createElement('li');
            li.textContent = event.text;
            li.classList.add(`log-event-${event.type}`); // For styling
            logList.appendChild(li);
        });
    },

    /**
     * Shows a temporary notification message to the user.
     * @param {string} message - The message to display.
     */
    showNotification(message) {
        // A simple console log for now, can be replaced with a proper UI element
        console.info(`NOTIFICATION: ${message}`);
        // Example: update a specific notification bar
        const notifBar = document.getElementById('right-panel'); // Using right panel for now
        notifBar.querySelector('p').textContent = message;
    }
};
// Fetch data from the backend
async function fetchData(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`http://localhost:5500${endpoint}`, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, endpoint: ${endpoint}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        alert('An error occurred while fetching data. Check the console for details.');
        return []; // Return an empty array to avoid .map() errors
    }
}

// Load classes from classes.txt
async function loadClasses() {
    try {
        const response = await fetch('classes.txt');
        if (!response.ok) {
            throw new Error('Failed to load classes');
        }
        const text = await response.text();
        const classes = text.split('\n').filter(line => line.trim() !== '');

        // Populate the participant classes dropdown
        const participantClassesSelect = document.getElementById('participant-classes');
        participantClassesSelect.innerHTML = classes.map(cls => `
            <option value="${cls}">${cls}</option>
        `).join('');

        // Populate the class select dropdown for scoring
        const classSelect = document.getElementById('class-select-results');
        classSelect.innerHTML = classes.map(cls => `
            <option value="${cls}">${cls}</option>
        `).join('');

        // Add double-click event listener to the participant classes dropdown
        participantClassesSelect.addEventListener('dblclick', (event) => {
            const selectedClass = event.target.value;
            if (selectedClass) {
                addClassToSelected(selectedClass);
            }
        });
    } catch (error) {
        console.error('Error loading classes:', error);
        alert('Failed to load classes. Check the console for details.');
    }
}

// Array to store selected classes for the participant
let selectedClasses = [];

// Function to add a class to the "Selected Classes" section
function addClassToSelected(className) {
    if (selectedClasses.length >= 5) {
        alert('You can only select up to 5 classes.');
        return;
    }

    if (!selectedClasses.includes(className)) {
        selectedClasses.push(className);
        renderSelectedClasses();
    }
}

// Function to remove a class from the "Selected Classes" section
function removeClassFromSelected(className) {
    selectedClasses = selectedClasses.filter(cls => cls !== className);
    renderSelectedClasses();
}

// Function to render the selected classes
function renderSelectedClasses() {
    const classesSelectedDiv = document.getElementById('classes-selected');
    classesSelectedDiv.innerHTML = selectedClasses.map(cls => `
        <div class="card">
            <span>${cls}</span>
            <button onclick="removeClassFromSelected('${cls}')">-</button>
        </div>
    `).join('');
}

// Save Participant
async function saveParticipant() {
    const trialName = document.getElementById('trial-name').value;
    const trialDate = document.getElementById('trial-date').value;
    const callName = document.getElementById('call-name').value;
    const dogBreed = document.getElementById('dog-breed').value;
    const ratterId = document.getElementById('ratter-id').value;
    const firstName = document.getElementById('first-name').value;
    const lastName = document.getElementById('last-name').value;

    const data = {
        trialName,
        trialDate,
        callName,
        dogBreed,
        ratterId,
        firstName,
        lastName,
        selectedClasses,
        scores: [], // Initialize scores as empty
    };

    const result = await fetchData('/api/participants', 'POST', data);
    alert(result.message);
    
    document.getElementById('trial-name').value = '';
    document.getElementById('trial-date').value = '';
    document.getElementById('call-name').value = '';
    document.getElementById('dog-breed').value = '';
    document.getElementById('ratter-id').value = '';
    document.getElementById('first-name').value = '';
    document.getElementById('last-name').value = '';

    selectedClasses = []; // Clear selected classes after saving
    renderSelectedClasses(); // Refresh the selected classes section
    loadParticipants(); // Refresh the participants list
}

// Save Score
async function saveScore() {
    const classId = document.getElementById('class-select').value;
    const participantId = document.getElementById('participant-select').value;
    const score = document.getElementById('score').value;
    const time = document.getElementById('time').value;

    const data = { classId, score, time };
    const result = await fetchData(`/api/participants/${participantId}/scores`, 'POST', data);
    alert(result.message);
    loadParticipants(); // Refresh the participants list
}

// Calculate Results
async function calculateResults() {
    const classId = document.getElementById('class-select-results').value;
    const participants = await fetchData('/api/participants');

    // Filter participants who have scores for the selected class
    const results = participants
        .filter(participant => participant.scores.some(score => score.classId === classId))
        .map(participant => {
            const score = participant.scores.find(score => score.classId === classId);
            return {
                callName: participant.callName,
                score: score.score,
                time: score.time,
            };
        });

    // Display results in a table
    const resultsTable = document.getElementById('results-table');
    resultsTable.innerHTML = `
        <tr>
            <th>Call Name</th>
            <th>Score</th>
            <th>Time (seconds)</th>
        </tr>
        ${results.map(result => `
            <tr>
                <td>${result.callName}</td>
                <td>${result.score}</td>
                <td>${result.time}</td>
            </tr>
        `).join('')}
    `;
}

// Load and display participants
async function loadParticipants() {
    try {
        const response = await fetch('/api/participants');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const participants = await fetchData('/api/participants');
        console.log("🎯 Loaded Participants:", participants); // Debugging output

        const participantsList = document.getElementById('participants-list');
        const participantsSelect = document.getElementById('participants-select');

        if (participantsList) {
            if(participantsList.innerHTML = participants.length > 0)
            {
                participants.map(participant => `
                    <div class="card">
                        <h3>${participant.callName}</h3>
                        <p>Trial: ${participant.trialName} (${participant.trialDate})</p>
                        <p>Dog Breed: ${participant.dogBreed}</p>
                        <p>Ratter ID: ${participant.ratterId}</p>
                        <p>Name: ${participant.firstName} ${participant.lastName}</p>
                    </div>
                `).join('')
            }
            else   
                '<div class="card">No participants found.</div>';
        }

        if (participantsSelect) {
            participantsSelect.innerHTML = '<option value="">Select a Participant</option>';
            participants.forEach(participant => {
                const option = document.createElement('option');
                option.value = participant._id;  // Use MongoDB's ObjectId
                option.textContent = participant.callName.charAt(0).toUpperCase() + participant.callName.slice(1);
                participantsSelect.appendChild(option);
            });

            // Attach event listener correctly
            participantsSelect.addEventListener('change', fetchSelectedParticipant);
        }
    } catch (error) {
        console.error('❌ Error loading participants:', error);
    }
}


async function fetchSelectedParticipant() {
    const participantId = document.getElementById('participants-select').value;
    if (!participantId) return;

    try {
        const response = await fetch(`/api/participants/${participantId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const participant = await response.json();

        if (!participant) {
            console.error('❌ Participant not found.');
            return;
        }

        console.log("🎯 Participant Data:", participant); // Debugging output

        // Populate Selected Classes Section
        const classesSelectedDiv = document.getElementById('classes-selected');
        if (classesSelectedDiv) {
            classesSelectedDiv.innerHTML = participant.selectedClasses.length > 0
                ? participant.selectedClasses.map(cls => `
                    <div class="card">
                        <span>${cls}</span>
                    </div>
                `).join('')
                : '<p>No classes selected.</p>';
        }
    } catch (error) {
        console.error('❌ Error fetching participant:', error);
    }
}



// Load data when the page loads
window.onload = () => {
    if (document.getElementById('participant-classes')) {
        loadClasses();
    }
    if (document.getElementById('participants-list')) {
        loadParticipants();
    }
    if (document.getElementById('participants-select')) {
        loadParticipants();
    }
};

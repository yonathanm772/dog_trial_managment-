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
        /*const selectedClassElement = document.getElementById("classes-selected");
        const selectedClassId = selectedClassElement.value; // Ensure it saves the ID
        selectedClasses.push(selectedClassId); // Push ID, not name*/
        selectedClasses.push(className);
        renderSelectedClasses();
    }
}

// Function to remove a class from the "Selected Classes" section
function removeClassFromSelected(className) {
    selectedClasses = selectedClasses.filter(cls => cls.trim() !== className.trim());
    console.log("Updated classes:", selectedClasses); // Debugging output
    renderSelectedClasses();
}

// Function to render the selected classes
function renderSelectedClasses() {
    const classesSelectedDiv = document.getElementById('classes-selected');

    // Clear previous content
    classesSelectedDiv.innerHTML = "";

    selectedClasses.forEach(cls => {
        const div = document.createElement('div');
        div.classList.add('card');
        div.innerHTML = `
            <span>${cls}</span> 
            <button class="remove-class-btn" data-class="${cls}">-</button>
        `;
        classesSelectedDiv.appendChild(div);
    });
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
    /*let classId = '';
    console.log(classId);
    const classesSelected = document.getElementById('classes-selected');
    classesSelected.addEventListener('onclick', (event) => {
        classId = event.target.value;
        if (classId) {
            console.log(classId);
        }
    });*/

    const selectedElement = document.getElementById('classes-selected');
    const classId = selectedElement.options[selectedElement.selectedIndex].text; // This gives the name
    const participantId = document.getElementById('participants-select').value;
    const score = document.getElementById('score').value;
    const time = document.getElementById('time').value;

    const data = { classId, score, time };

    // Send the single score object to the backend
    const result = await fetchData(`/api/participants/${participantId}/scores`, 'PUT', data);
    alert(result.message);
    loadParticipants(); // Refresh the participants list
}


function placements(Scores){
    let first, second, third = '';
}
// Calculate Results
async function calculateResults() {
    const classId = document.getElementById('class-select-results').value;
    const participants = await fetchData('/api/participants');

    const results = participants.filter(participant => {
        console.log(`Checking Participant: ${participant.callName}`);
        
        if (!participant.scores || !Array.isArray(participant.scores)) {
            console.log(`❌ No scores found for ${participant.callName}`);
            return false;
        }
    
        return participant.scores.some(score => {
            console.log(`Comparing: score.classId (${score.classId}) === classId (${classId})`);
            console.log(`Data Types: ${typeof score.classId} vs ${typeof classId}`);
    
            return String(score.classId).trim() === String(classId).trim();
        });
    })
    .map(participant => {
        const score = participant.scores.find(score => String(score.classId).trim() === String(classId).trim());
    
        if (!score) {
            console.warn(`⚠️ No matching score found for classId: ${classId} in participant: ${participant.callName}`);
            return null; // Return null so that it can be filtered out later
        }
    
        console.log("✅ Matching Score Found:", score);
    
        return {
            callName: participant.callName,
            score: score.score,
            time: score.time,
        };
    }).filter(result => result !== null); // Remove null values
    console.log("Final Results:", results);

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
        const participants = await fetchData('/api/participants');

        
        console.log("🎯 Loaded Participants:", participants); // Debugging output

        const participantsList = document.getElementById('participants-list');
        const participantsSelect = document.getElementById('participants-select');

        if (participantsList) {
            if(participants.length > 0)
            {
                participantsList.innerHTML = participants.map(participant => `
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
            participantsList.innerHTML = '<div class="card">No participants found.</div>';
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
        const participant = await fetchData(`/api/participants/${participantId}`);

        if (!participant) {
            console.error('❌ Participant not found.');
            return;
        }

        console.log("🎯 Participant Data:", participant); // Debugging output

        // Populate Selected Classes Section
        const classesSelectedDiv = document.getElementById('classes-selected');
        if (classesSelectedDiv) {
            classesSelectedDiv.innerHTML = ""; // Clear previous entries
            if(participant.selectedClasses.length > 0) {
                participant.selectedClasses.forEach(cls=> {
                    const option = document.createElement('option');
                    option.value = participant._id;  // Uses MongoDB's ObjectId
                    option.textContent = cls;
                    classesSelectedDiv.appendChild(option);
                });
            }
            else
                classesSelectedDiv.innerHTML = '<p>No classes selected.</p>';
        }
    } catch (error) {
        console.error('❌ Error fetching participant:', error);
    }
}

async function removeClasses() {
    document.getElementById('classes-selected').addEventListener('click', function(event) {
        if (event.target.classList.contains('remove-class-btn')) {
            const className = event.target.getAttribute('data-class');
            removeClassFromSelected(className);
        }
    });
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
    if (document.getElementById('classes-selected')) {
        removeClasses();
    }
        // trying to make ids match for score saving and calculation( try to create your own function or just use class names)
        //when savin the scores for one class, either delete the class from UI, or tell the user the class has already been filled out
        // for calculate scores class selection, use similar format to selecting a class at the beginning 
        /** ERRORS TO HANDLE
         * not selecting the date
         */
};
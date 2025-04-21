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
        if(participantClassesSelect)
        {
            participantClassesSelect.innerHTML = classes.map(cls => `
                <option value="${cls}">${cls}</option>
            `).join('');
        }
        
        // Populate the class select dropdown for scoring
        const classSelect = document.getElementById('class-select-results');
       if(classSelect)
       {
            classSelect.innerHTML = classes.map(cls => `
                <option value="${cls}">${cls}</option>
            `).join('');
       }
        

        // Add double-click event listener to the participant classes dropdown
        if (participantClassesSelect)
        {
            participantClassesSelect.addEventListener('dblclick', (event) => {
                const selectedClass = event.target.value;
                if (selectedClass) {
                    addClassToSelected(selectedClass);
                }
            });
        }
        
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
    const gmail = document.getElementById('gmail').value;
    const data = {
        trialName,
        trialDate,
        callName,
        dogBreed,
        ratterId,
        firstName,
        lastName,
        gmail,
        selectedClasses,
        scores: [],// Initialize scores as empty
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
    document.getElementById('gmail').value = '';

    selectedClasses = []; // Clear selected classes after saving
    renderSelectedClasses(); // Refresh the selected classes section
    loadParticipants(); // Refresh the participants list
}

// Save Score
async function saveScore() {

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


// Calculate Results
async function calculateResults() {
    const classId = document.getElementById('class-select-results').value;
    const trialDate = document.getElementById('trial-date').value;
    

    if (!classId || !trialDate) {
        alert(" ❌ Please select a class and a trial date.");
        return;
    }
    const participants = await fetchData('/api/participants');

    const results = participants.filter(participant => {

        // Filter by both trialDate and classId within scores
        return participant.trialDate.trim() === trialDate.trim() && participant.scores.some(score => {
            return String(score.classId).trim() === String(classId).trim();
        });
    })
    .map(participant => {
        const score = participant.scores.find(score =>
            String(score.classId).trim() === String(classId).trim());
        if (!score) {
            console.warn(`⚠️ No matching score found for classId: ${classId} in participant: ${participant.callName}`);
            return null; // Return null so that it can be filtered out later
        }
    
        console.log("✅ Matching Score Found:", score);
    
        return {
            participant,
            score
        };
    }).filter(result => result !== null); // Remove null values
    console.log("Final Results:", results);

    results.sort((a, b) => b.score.score - a.score.score || a.score.time - b.score.time);


    let data = [];

    results.forEach((entry, index) => {
            if (index === 0) entry.score.placement = "🥇 1st Place";
        else if (index === 1) entry.score.placement = "🥈 2nd Place";
        else if (index === 2) entry.score.placement = "🥉 3rd Place";
        else entry.score.placement = `${index + 1}th Place`;


        participantId = entry.participant._id;
        placement = entry.score.placement;
        // Store each result as an object inside the array
        data.push({ participantId, classId, placement });

        
        // Send the single score object to the backend
        //alert("✅ Placements have been updated in the database!");*/
    });

    const flattenedData = data.flat(); 

    for (const entry of flattenedData) {
        const { participantId, classId, placement } = entry;
        if (!participantId) {
            console.warn("⚠️ Missing participantId for entry:", entry);
            continue; // Skip if participantId is missing
        }
    
        console.log(`🔄 Sending PUT request for:`, { participantId, classId, placement });
    
        // Send request
        const response = await fetchData(`/api/participants/${participantId}/scores/${classId}`, 'PUT', { placement });
    
        if (response) {
            console.log(`✅ Placement updated for ${participantId}`);
        } else {
            console.error(`❌ Failed to update placement for ${participantId}`);
        }
    }

    // Display results
    const resultsTable = document.getElementById('results-table');
    resultsTable.innerHTML = `
        <tr>
            <th>Placement</th>
            <th>Call Name</th>
            <th>Score</th>
            <th>Time (seconds)</th>
        </tr>
        ${results.map(result => `
            <tr>
                <td>${result.score.placement}</td>
                <td>${result.participant.callName}</td>
                <td>${result.score.score}</td>
                <td>${result.score.time}</td>
            </tr>
        `).join('')}
    `;
}

async function generateLabels() {
    const selectedDate = document.getElementById('trial-date').value;
    const labelsContainer = document.getElementById('labels-container');

    const participants = await fetchData('/api/participants'); // Fetch participant data
    labelsContainer.innerHTML = ''; // Clear previous labels

    const results = participants.filter(participant => participant.trialDate.trim() === selectedDate.trim());

    if (results.length === 0) {
        labelsContainer.innerHTML = "<p>No participants found for the selected date.</p>";
        return;
    }

    // Create a row container for label alignment
    const row = document.createElement("div");
    row.classList.add("label-row");

    results.forEach((entry) => {
        if (entry.scores.length > 0) {
            const label = document.createElement("div");
            label.classList.add("label");
            
            label.innerHTML = `
                <p><strong>${entry.trialDate} &nbsp;&nbsp;&nbsp; Competitive Edge</strong></p>
                <p>${entry.callName}</p>
                <p>${entry.scores[0].classId} &nbsp;&nbsp;${entry.scores[0].placement}</p>
                <p>Pts: ${entry.scores[0].score} &nbsp;&nbsp; Time: ${entry.scores[0].time}</p>
            `;

            row.appendChild(label);
        }
    });

    labelsContainer.appendChild(row);

    // Add a separator line below the labels
    const separator = document.createElement("div");
    separator.classList.add("separator");
    labelsContainer.appendChild(separator);
}

async function sendConfirmationEmailsForDate() {
    const selectedDate = document.getElementById("trial-date").value;

    if (!selectedDate) {
        alert("❌ Please select a date.");
        return;
    }

    try {
        const response = await fetch('/api/send-confirmation-emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ trialDate: selectedDate })
        });

        const data = await response.json();
        alert(data.message);
    } catch (error) {
        console.error('❌ Error sending emails:', error);
    }
}

async function fetchEmailsByDate() {
    const dateInput = document.getElementById("trial-date").value;
    
    if (!dateInput) {
        console.error("❌ No date selected!");
        return;
    }

    console.log(`📅 Fetching participants for date: ${dateInput}`);

    try {
        // Replace with your actual backend API URL
        let response = await fetch(`http://localhost:5500/api/participants?date=${dateInput}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        let participants = await response.json();
        displayEmails(participants);
    } catch (error) {
        console.error("❌ Error fetching emails:", error);
    }
}


function navigateToParticipants(action) {
    location.href = `participants.html?action=${action}`;
}

// Function to display the fetched emails
function displayEmails(participants) {
    const emailList = document.getElementById("email-list");
    emailList.innerHTML = "";

    if (participants.length === 0) {
        emailList.innerHTML = "<p>No participants found for this date.</p>";
        return;
    }

    participants.forEach(participant => {
        const emailItem = document.createElement("p");
        emailItem.textContent = `📧 ${participant.callName} - ${participant.firstName} ${participant.lastName} - ${participant.gmail}`;
        emailList.appendChild(emailItem);
    });
}

async function sendConfirmationEmails() {
    const dateInput = document.getElementById("trial-date").value;
    
    if (!dateInput) {
        alert("❌ No date selected!");
        return;
    }

    console.log(`📧 Sending confirmation emails for participants on: ${dateInput}`);

    try {
        let response = await fetch(`http://localhost:5500/api/send-confirmation-email?date=${dateInput}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });

        let result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || "Failed to send emails");
        }

        console.log("✅ Confirmation emails sent successfully!");
        alert("✅ Emails sent successfully!");

        // Refresh the participant list after sending emails
        fetchEmailsByDate();

    } catch (error) {
        console.error("❌ Error sending confirmation emails:", error);
        alert("❌ Error sending emails. Check console for details.");
    }
}

async function sendResultsEmails() {
    const dateInput = document.getElementById("trial-date").value;

    if (!dateInput) {
        alert("❌ No date selected!");
        return;
    }

    console.log(`📧 Sending results emails for participants on: ${dateInput}`);

    try {
        let response = await fetch(`http://localhost:5500/api/send-results-email?date=${dateInput}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });

        let result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to send results emails");
        }

        console.log("✅ Results emails sent successfully!");
        alert("✅ Results emails sent successfully!");

        // Optionally, refresh the participant list or perform other actions
        fetchEmailsByDate();

    } catch (error) {
        console.error("❌ Error sending results emails:", error);
        alert("❌ Error sending results emails. Check console for details.");
    }
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

// Function to handle actions based on the query parameter
async function handleAction() {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const participantId = params.get('participantId');

    const actionTitle = document.getElementById('action-title');
    const actionForm = document.getElementById('action-form');

    if (!actionTitle || !actionForm) {
        console.error('❌ Missing action-title or action-form elements.');
        return;
    }

    if (action === 'lookup') {
        actionTitle.textContent = 'Look Up Participant(s)';
        actionForm.innerHTML = `
            <label for="lookup-input">Enter Ratter ID or Gmail:</label>
            <input type="text" id="lookup-input" placeholder="Enter Ratter ID or Gmail">
            <button onclick="performLookup()">Search</button>
        `;
    }
    else if (action === 'modify' && participantId) {
        actionTitle.textContent = 'Modify Participant';

        try {
            // Fetch participant details
            const participant = await fetchData(`/api/participants/${participantId}`);

            if (!participant) {
                actionForm.innerHTML = '<p>❌ Participant not found.</p>';
                return;
            }

            // Display the form with participant details
            actionForm.innerHTML = `
                <h3>Modify Participant</h3>
                <label for="new-first-name">First Name:</label>
                <input type="text" id="new-first-name" value="${participant.firstName}">
                <label for="new-last-name">Last Name:</label>
                <input type="text" id="new-last-name" value="${participant.lastName}">
                <label for="new-dog-breed">Dog Breed:</label>
                <input type="text" id="new-dog-breed" value="${participant.dogBreed}">
                <button id="save-modify-btn">Save Changes</button>
                <button id="cancel-modify-btn">Cancel</button>
            `;

            // Handle save and cancel actions
            document.getElementById('save-modify-btn').addEventListener('click', async () => {
                const newFirstName = document.getElementById('new-first-name').value.trim();
                const newLastName = document.getElementById('new-last-name').value.trim();
                const newDogBreed = document.getElementById('new-dog-breed').value.trim();

                const updatedParticipant = {
                    ...participant,
                    firstName: newFirstName || participant.firstName,
                    lastName: newLastName || participant.lastName,
                    dogBreed: newDogBreed || participant.dogBreed,
                };

                try {
                    const result = await fetchData(`/api/participants/${participantId}`, 'PUT', updatedParticipant);
                    alert(result.message);
                    location.href = 'form.html'; // Redirect to home page after saving
                } catch (error) {
                    console.error('❌ Error saving participant:', error);
                    alert('❌ An error occurred while saving the participant.');
                }
            });

            document.getElementById('cancel-modify-btn').addEventListener('click', () => {
                location.href = 'form.html'; // Redirect to home page if canceled
            });
        } catch (error) {
            console.error('❌ Error fetching participant:', error);
            actionForm.innerHTML = '<p>❌ An error occurred while fetching the participant.</p>';
        }
    } else {
        actionTitle.textContent = 'Invalid Action';
        actionForm.innerHTML = '<p>❌ No valid action specified.</p>';
    }
}

async function performLookup() {
    const input = document.getElementById('lookup-input').value.trim();

    if (!input) {
        alert('❌ Please enter a Ratter ID or Gmail.');
        return;
    }

    try {
        const participants = await fetchData('/api/participants');
        const matchingParticipants = participants.filter(
            p => p.ratterId === input || p.gmail === input
        );

        if (matchingParticipants.length === 0) {
            alert('❌ No participants found.');
            return;
        }

        // Display results in a dedicated section instead of an alert
        const resultsContainer = document.getElementById('lookup-results');
        resultsContainer.innerHTML = matchingParticipants.map(participant => `
            <div class="participant-card">
                <p><strong>Name:</strong> ${participant.firstName} ${participant.lastName}</p>
                <p><strong>Dog Breed:</strong> ${participant.dogBreed}</p>
                <p><strong>Ratter ID:</strong> ${participant.ratterId}</p>
                <p><strong>Gmail:</strong> ${participant.gmail}</p>
                <button class="modify-btn" style="background-color: green; color: white; margin-top: 10px;" onclick="navigateToModify('${participant._id}')">Modify</button>
                <button class="delete-btn" style="background-color: red; color: white; margin-top: 5px;" onclick="performDelete('${participant._id}')">Delete</button>
            </div>
        `).join('');

        resultsContainer.style.display = 'block'; // Ensure the results section is visible
    } catch (error) {
        console.error('❌ Error looking up participants:', error);
        alert('❌ An error occurred while looking up the participants.');
    }

    // Clear the input field after the lookup
    document.getElementById('lookup-input').value = '';
}

function navigateToModify(participantId) {
    location.href = `participants.html?action=modify&participantId=${participantId}`;
}

// Function to perform modify
async function performModify(participantId) {
    try {
        const participant = await fetchData(`/api/participants/${participantId}`);

        if (!participant) {
            alert('❌ Participant not found.');
            return;
        }

        // Create a form dynamically to collect updated details
        const modifyForm = document.createElement('div');
        modifyForm.innerHTML = `
            <h3>Modify Participant</h3>
            <label for="new-first-name">First Name:</label>
            <input type="text" id="new-first-name" value="${participant.firstName}">
            <label for="new-last-name">Last Name:</label>
            <input type="text" id="new-last-name" value="${participant.lastName}">
            <label for="new-dog-breed">Dog Breed:</label>
            <input type="text" id="new-dog-breed" value="${participant.dogBreed}">
            <button id="save-modify-btn">Save Changes</button>
            <button id="cancel-modify-btn">Cancel</button>
        `;

        // Append the form to the body or a container
        document.body.appendChild(modifyForm);

        // Handle save and cancel actions
        document.getElementById('save-modify-btn').addEventListener('click', async () => {
            const newFirstName = document.getElementById('new-first-name').value.trim();
            const newLastName = document.getElementById('new-last-name').value.trim();
            const newDogBreed = document.getElementById('new-dog-breed').value.trim();

            const updatedParticipant = {
                ...participant,
                firstName: newFirstName || participant.firstName,
                lastName: newLastName || participant.lastName,
                dogBreed: newDogBreed || participant.dogBreed,
            };

            console.log('Updating participant:', updatedParticipant);

            try {
                const result = await fetchData(`/api/participants/${participantId}`, 'PUT', updatedParticipant);
                alert(result.message);
                document.body.removeChild(modifyForm); // Remove the form after saving
            } catch (error) {
                console.error('❌ Error saving participant:', error);
                alert('❌ An error occurred while saving the participant.');
            }
        });

        document.getElementById('cancel-modify-btn').addEventListener('click', () => {
            document.body.removeChild(modifyForm); // Remove the form if canceled
        });
    } catch (error) {
        console.error('❌ Error modifying participant:', error);
        alert('❌ An error occurred while modifying the participant.');
    }
}

// Function to perform delete
async function performDelete() {
    const input = document.getElementById('delete-input').value.trim();

    if (!input) {
        alert('❌ Please enter a Ratter ID or Gmail.');
        return;
    }

    try {
        const participants = await fetchData('/api/participants');
        const participant = participants.find(p => p.ratterId === input || p.gmail === input);

        if (!participant) {
            alert('❌ Participant not found.');
            return;
        }

        const confirmDelete = confirm(`Are you sure you want to delete participant: ${participant.firstName} ${participant.lastName}?`);
        if (!confirmDelete) return;

        const result = await fetchData(`/api/participants/${participant._id}`, 'DELETE');
        alert(result.message);
    } catch (error) {
        console.error('❌ Error deleting participant:', error);
        alert('❌ An error occurred while deleting the participant.');
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
    if (document.getElementById('class-select-results')) {
        loadClasses();
    }
    if (document.getElementById('labels-container'))
    {
        generateLabels();
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
    if (document.getElementById('action-title')) {
        handleAction()
    }
    
};

/*********** OPTIMIZATION *************
 * when the field is not selected, prompt the user to selected instead of crashing
 * improve labels
 * clear enter scores after
 * if there are no participants for that date, let the user know
 * 
 * need delete functionality for participants
 */
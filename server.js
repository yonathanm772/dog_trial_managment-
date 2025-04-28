const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const app = express();

app.use(bodyParser.json());
app.use(cors()); // Enable CORS

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/dog-trials', {
    //useNewUrlParser: true,
    //useUnifiedTopology: true,
});

// Handle MongoDB Connection Events
const db = mongoose.connection;
db.on('error', console.error.bind(console, '❌ MongoDB connection error:'));
db.once('open', () => console.log('✅ Connected to MongoDB'));

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'yonathanm772@gmail.com', // Replace with your Gmail
        pass: 'rrqv ypnp nppy qpdl' // Use an app password instead of your Gmail password
    }
});

// Define Schema
const ParticipantSchema = new mongoose.Schema({
    trialName: { type: String, required: true },
    trialDate: { type: String, required: true },
    callName: { type: String, required: true },
    dogBreed: { type: String, required: true },
    ratterId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    gmail: { type: String, required: true },
    selectedClasses: { type: [String], default: [] },
    scores: {
       type: [
            {
                classId: { type: String, required: true },
                score: { type: Number, required: true },
                time: { type: Number, required: true },
                placement: {type: String}
            }
        ],
    default: [],
    },
    confirmationEmailSent: {type: Boolean, default: false},
});

// Define Model
const Participant = mongoose.model('Participant', ParticipantSchema);

// API Endpoints

/** 
 * Save a New Participant 
 */
app.post('/api/participants', async (req, res) => {
    try {
        const { trialName, trialDate, callName, dogBreed, ratterId, firstName, lastName, gmail, selectedClasses, scores } = req.body;
        
        const newParticipant = new Participant({
            trialName,
            trialDate,
            callName,
            dogBreed,
            ratterId,
            firstName,
            lastName,
            gmail,
            selectedClasses,
            scores,
        });

        await newParticipant.save();
        res.status(201).json({ message: '✅ Participant saved successfully!', participant: newParticipant });

    } catch (error) {
        console.error('❌ Error saving participant:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});




app.put('/api/participants/:id/scores/:classId', async (req, res) => {
    try {
        const { classId } = req.params;
        const { placement } = req.body; // Extract placement data
        const participantId = req.params.id;


        // Ensure data is valid
        if (!placement) {
            return res.status(400).json({ message: "❌ Placement are required." });
        }

        console.log(`🔄 Updating placement for participant ${participantId}, class ${classId}, placement: ${placement}`);

        // Find and update the participant's score object
        const updatedParticipant = await Participant.findOneAndUpdate(
            { _id: participantId, "scores.classId": classId }, // Match participant & classId
            { $set: { "scores.$.placement": placement } }, // Update placement inside scores
            { new: true }
        );

        if (!updatedParticipant) {
            return res.status(404).json({ message: "❌ Participant not found!" });
        }

        res.json({ message: "✅ Score placement updated successfully!", participant: updatedParticipant });
    } catch (error) {
        console.error("❌ Error updating score placement:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

/** 
 * Get All Participants 
 */
/*app.put('/api/participants/:id/scores/:classId', async (req, res) => {
    try {
        const { classId } = req.params;
        const { score } = req.body;
        const participantId = req.params.id;

        if (!score) {
            return res.status(400).json({ message: "❌ placement is required." });
        }
``
        console.log(`🔄 Updating placement for participant ${participantId}, class ${classId}, score: ${score}`);

        const updatedParticipant = await Participant.findOneAndUpdate(
            { _id: participantId, "scores.classId": classId },
            { $set: { "scores.$.score": score } },
            { new: true }
        );

        if (!updatedParticipant) {
            console.error(`❌ Participant with ID ${participantId} or class ${classId} not found!`);
            return res.status(404).json({ message: "Participant or class not found!" });
        }
        console.log(`✅ Placement updated successfully for ${participantId}`);
        res.json({ message: "✅ Score updated!", participant: updatedParticipant });
    } catch (error) {
        console.error("❌ Error updating score:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
    
});*/

// Get scores
app.get('/api/participants/:id/scores', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: '❌ Invalid participant ID format' });
        }

        const participant = await Participant.findById(id);
        if (!participant) {
            return res.status(404).json({ message: '❌ Participant not found' });
        }

        res.json(participant.scores || []);
    } catch (error) {
        console.error('❌ Error fetching participant:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.get('/api/participants/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: '❌ Invalid participant ID format' });
        }

        const participant = await Participant.findById(id);
        if (!participant) {
            return res.status(404).json({ message: '❌ Participant not found' });
        }

        res.json(participant);
    } catch (error) {
        console.error('❌ Error fetching participant:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.get('/api/participants', async (req, res) => {
    try {
        const { date } = req.query; // Extract date from query parameters
        let query = {}; // Default: get all participants

        if (date) {
            const formattedDate = new Date(date).toISOString().split('T')[0];
            query.trialDate = formattedDate;
            query.confirmationEmailSent = false; // Only fetch participants who haven't been emailed
        }

        const participants = await Participant.find(query);

        if (!participants) {
            return res.status(404).json({ message: '❌ Participant not found' });
        }

        res.json(participants);
    } catch (error) {
        console.error("❌ Error fetching participants:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
/*app.get('/api/participants', async (req, res) => {
    try {
        const { date } = req.query; // Extract date from query parameters

        let query = {}; // Default: get all participants

        if (date) {
            const formattedDate = new Date(date).toISOString().split('T')[0];

            query = { trialDate: formattedDate }; // Filter by date
        }

        const participants = await Participant.find(query);

        if (participants.length === 0) {
            return res.status(404).json({ message: "❌ No participants found." });
        }

        res.json(participants);
    } catch (error) {
        console.error("❌ Error fetching participants:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});*/

/*// Get all Participants
app.get('/api/participants', async (req, res) => {
    try {
        const participants = await Participant.find();
        res.json(participants);
    } catch (error) {
        console.error('❌ Error fetching participants:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});*/
/** 
 * Update Scores for a Participant 
 */
app.put('/api/participants/:id/scores', async (req, res) => {
    try {
        const { id } = req.params;
        const { classId, score, time } = req.body; // Destructure the single score object

        // Validate participant ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: '❌ Invalid participant ID format' });
        }

        // Find the participant
        const participant = await Participant.findById(id);
        if (!participant) {
            return res.status(404).json({ message: '❌ Participant not found' });
        }
        
        // Append the new score to the existing scores
        participant.scores.push({ classId, score, time });
       // participant.scores = participant.scores.concat(scores);

        // Save the updated participant
        await participant.save();

        // Respond with success message and updated participant
        res.json({ message: '✅ Score added successfully!', participant });

    } catch (error) {
        console.error('❌ Error updating scores:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.put('/api/participants/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;

        // Validate MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: '❌ Invalid participant ID format' });
        }

        const updatedParticipant = await Participant.findByIdAndUpdate(id, updatedData, { new: true });
        if (!updatedParticipant) {
            return res.status(404).json({ message: '❌ Participant not found' });
        }

        res.json({ message: '✅ Participant updated successfully!', participant: updatedParticipant });
    } catch (error) {
        console.error('❌ Error updating participant:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/** 
 * Delete a Participant 
 */
app.delete('/api/participants/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: '❌ Invalid participant ID format' });
        }

        const deletedParticipant = await Participant.findByIdAndDelete(id);
        if (!deletedParticipant) {
            return res.status(404).json({ message: '❌ Participant not found' });
        }

        res.json({ message: '✅ Participant deleted successfully!' });

    } catch (error) {
        console.error('❌ Error deleting participant:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Sending Email
app.post("/api/send-confirmation-email", async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ message: "❌ Date query parameter is required." });
        }

        // Fetch participants who haven't received an email yet
        const participants = await Participant.find({ trialDate: date, confirmationEmailSent: { $ne: true } });

        if (!participants.length) {
            return res.status(404).json({ message: "❌ No participants found needing confirmation emails." });
        }

        // Setup Gmail transporter (replace with real credentials)
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "yonathanm772@gmail.com",
                pass: "rrqv ypnp nppy qpdl", // Use an App Password instead of real password
            },
        });

        // Send emails to each participant
        for (const participant of participants) {
            const emailBody = `Dear Sir or Madam,

            Your entry for the following dog was received before closing, and you have a spot in our Happy Ratter trial for ${participant.trialDate}.
            Please check all information listed below carefully and contact me with any discrepancies immediately.

            Dog Name: ${participant.callName}
            Classes:
                ${participant.selectedClasses.join("\n\t\t")}
            `;

            await transporter.sendMail({
                from: "yonathanm772@gmail.com",
                to: participant.gmail,
                subject: "Happy Ratter Trial Confirmation",
                text: emailBody,
            });

            // Mark participant as having received a confirmation email
            await Participant.updateOne({ _id: participant._id }, { confirmationEmailSent: true });
        }

        res.json({ message: "✅ Confirmation emails sent successfully!" });

    } catch (error) {
        console.error("❌ Error sending confirmation emails:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});


app.post("/api/send-results-email", async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ message: "❌ Date query parameter is required." });
        }

        // Fetch participants for the given date
        const participants = await Participant.find({ trialDate: date });

        if (!participants.length) {
            return res.status(404).json({ message: "❌ No participants found for the given date." });
        }

        // Setup Gmail transporter (replace with real credentials)
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "yonathanm772@gmail.com",
                pass: "rrqv ypnp nppy qpdl", // Use an App Password instead of real password
            },
        });

        // Group results by Gmail
        const resultsByGmail = participants.reduce((acc, participant) => {
            if (!participant.scores.length) {
                console.warn(`⚠️ No scores available for participant: ${participant.callName}`);
                return acc;
            }

            const emailBody = participant.scores.map(score =>
                `${participant.trialDate}\t${score.classId}\t${participant.callName}\t${participant.dogBreed}\t${participant.ratterId}\t${participant.firstName}\t${participant.lastName}\t${participant.gmail}\t${score.score}\t${score.time}\t${score.placement || ""}`
            ).join("\n");

            if (!acc[participant.gmail]) {
                acc[participant.gmail] = [];
            }
            acc[participant.gmail].push(emailBody);
            return acc;
        }, {});

        // Send one email per Gmail address
        for (const [gmail, results] of Object.entries(resultsByGmail)) {
            const emailBody = results.join("\n\n---\n\n"); // Separate results with a divider

            await transporter.sendMail({
                from: "yonathanm772@gmail.com",
                to: gmail,
                subject: "Happy Ratter Trial Results",
                text: emailBody,
            });

            console.log(`✅ Results email sent to: ${gmail}`);
        }

        res.json({ message: "✅ Results emails sent successfully!" });

    } catch (error) {
        console.error("❌ Error sending results emails:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

// Start the Server
const PORT = 5500;
let server;

try {
    server = app.listen(PORT, () => {
        console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
} catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
}

// Gracefully handle process termination
const shutdown = async () => {
    console.log('🛑 Shutting down server...');
    if (server) {
        server.close(() => {
            console.log('✅ Server closed.');
        });
    }

    // Close MongoDB connection
    try {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed.');
    } catch (error) {
        console.error('❌ Error closing MongoDB connection:', error);
    }

    // Forcefully exit the process
    process.exit(0);
};

// Handle termination signals
process.on('SIGINT', async () => {
    console.log('🔄 Received SIGINT (Ctrl+C). Cleaning up...');
    await shutdown();
});

process.on('SIGTERM', async () => {
    console.log('🔄 Received SIGTERM. Cleaning up...');
    await shutdown();
});
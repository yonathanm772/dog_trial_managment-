const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Enable CORS

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/dog-trials', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Handle MongoDB Connection Events
const db = mongoose.connection;
db.on('error', console.error.bind(console, '❌ MongoDB connection error:'));
db.once('open', () => console.log('✅ Connected to MongoDB'));

// Define Schema
const ParticipantSchema = new mongoose.Schema({
    trialName: { type: String, required: true },
    trialDate: { type: String, required: true },
    callName: { type: String, required: true },
    dogBreed: { type: String, required: true },
    ratterId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    selectedClasses: { type: [String], default: [] },
    scores: [
        {
            classId: { type: String, required: true },
            score: { type: Number, required: true },
            time: { type: Number, required: true }
        }
    ],
});

// Define Model
const Participant = mongoose.model('Participant', ParticipantSchema);

// API Endpoints

/** 
 * Save a New Participant 
 */
app.post('/api/participants', async (req, res) => {
    try {
        const { trialName, trialDate, callName, dogBreed, ratterId, firstName, lastName, selectedClasses, scores } = req.body;
        
        const newParticipant = new Participant({
            trialName,
            trialDate,
            callName,
            dogBreed,
            ratterId,
            firstName,
            lastName,
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

/** 
 * Get All Participants 
 */
app.get('/api/participants', async (req, res) => {
    try {
        const participants = await Participant.find();
        res.json(participants);
    } catch (error) {
        console.error('❌ Error fetching participants:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/** 
 * Get Participant by ID 
 */
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

/** 
 * Update Scores for a Participant 
 */
app.put('/api/participants/:id/scores', async (req, res) => {
    try {
        const { id } = req.params;
        const { scores } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: '❌ Invalid participant ID format' });
        }

        const participant = await Participant.findById(id);
        if (!participant) {
            return res.status(404).json({ message: '❌ Participant not found' });
        }

        participant.scores = scores;
        await participant.save();

        res.json({ message: '✅ Scores updated successfully!', participant });

    } catch (error) {
        console.error('❌ Error updating scores:', error);
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

// Start the Server
const PORT = 5500;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'dashboard-data.json'); // Match client's filename

// Add to server.js
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

app.use(express.json());

// Existing /update endpoint (optional)
app.post('/update', async (req, res) => {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2));
        res.status(200).json({ message: 'Data updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update data' });
    }
});

// New endpoint for the client's save request
app.post('/api/save-dashboard', async (req, res) => {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2));
        res.status(200).json({ message: 'Dashboard saved successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save dashboard' });
    }
});

// Serve static files (if needed)
app.use(express.static('public'));

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
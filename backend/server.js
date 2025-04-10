const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/csvUploadDb')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Models
const IFSCData = mongoose.model('IFSC', new mongoose.Schema({}, { strict: false }));

const RecentSearch = mongoose.model('RecentSearch', new mongoose.Schema({
  ifsc: String,
  searchedAt: { type: Date, default: Date.now }
}));

// Multer config
const storage = multer.diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    cb(null, 'IFSC.csv');
  },
});
const upload = multer({ storage });

// Upload CSV and save to MongoDB
app.post('/api/upload', upload.single('file'), async (req, res) => {
  const results = [];

  fs.createReadStream(path.join(__dirname, 'uploads', 'IFSC.csv'))
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        await IFSCData.deleteMany(); // Clear old data
        await IFSCData.insertMany(results);
        res.json({ message: 'Data uploaded and saved', count: results.length });
      } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Upload failed' });
      }
    });
});

// GET paginated and filterable IFSC data
app.get('/api/data', async (req, res) => {
    try {
      const page = parseInt(req.query.page || '1');
      const limit = parseInt(req.query.limit || '10');
  
      const query = {};
      if (req.query.ifsc) query.IFSC = req.query.ifsc.toUpperCase();
      if (req.query.bank_name) query.BANK = new RegExp(req.query.bank_name, 'i');
      if (req.query.city) query.CITY = new RegExp(req.query.city, 'i');
      if (req.query.branch) query.BRANCH = new RegExp(req.query.branch, 'i');
  
      const total = await IFSCData.countDocuments(query);
      const data = await IFSCData.find(query)
        .skip((page - 1) * limit)
        .limit(limit);
  
      res.json({ total, page, limit, data });
    } catch (err) {
      console.error('Fetch data error:', err);
      res.status(500).json({ error: 'Failed to fetch data' });
    }
  });

  
  

// POST save IFSC code to recent search
app.post('/api/search', async (req, res) => {
  const { ifsc } = req.body;

  if (!ifsc) return res.status(400).json({ error: 'IFSC code is required' });

  try {
    await RecentSearch.create({ ifsc });
    res.json({ success: true });
  } catch (err) {
    console.error('Search save error:', err);
    res.status(500).json({ error: 'Failed to save search' });
  }
});

app.listen(5000, () => console.log('Server running on http://localhost:5000'));

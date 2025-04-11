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


mongoose.connect('mongodb://localhost:27017/csvUploadDb')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));


const IFSCData = mongoose.model('IFSC', new mongoose.Schema({}, { strict: false }));

const RecentSearch = mongoose.model('RecentSearch', new mongoose.Schema({
  ifsc: String,
  searchedAt: { type: Date, default: Date.now }
}));


const storage = multer.diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    cb(null, 'IFSC.csv');
  },
});
const upload = multer({ storage });


app.post('/api/upload', upload.single('file'), async (req, res) => {
  const results = [];

  fs.createReadStream(path.join(__dirname, 'uploads', 'IFSC.csv'))
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        await IFSCData.deleteMany(); 
        await IFSCData.insertMany(results);
        res.json({ message: 'Data uploaded and saved', count: results.length });
      } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Upload failed' });
      }
    });
});


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

app.get('/api/recent-searches', async (req, res) => {
  try {
    const recent = await RecentSearch.find().sort({ searchedAt: -1 }).limit(5);
    res.json(recent);
  } catch (err) {
    console.error('Fetch recent search error:', err);
    res.status(500).json({ error: 'Failed to fetch recent searches' });
  }
});

app.listen(5000, () => console.log('Server running on http://localhost:5000'));

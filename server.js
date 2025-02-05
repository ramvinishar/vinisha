const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));


mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection.on('connected', () => {
  console.log('Successfully connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
  console.error('Error connecting to MongoDB Atlas:', err);
});

// Define Schemas
const userSchema = new mongoose.Schema({
  name: String,
  rollNumber: String,
  year: Number,
  department: String,
  phoneNumber: String,
  email: String,
});

const labSchema = new mongoose.Schema({
  lab: String,
  year: Number,
  department: String,
  skills: [String],
  resumePath: String,
});

// Models
const User = mongoose.model('User', userSchema);
const Lab = mongoose.model('Lab', labSchema);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/lab_register.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'lab_register.html'));
});



// File Upload Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage: storage });

// Department Registration Limits
const DEPARTMENT_LIMITS = {
  IT: 5,
  AIDS: 5,
  CSBS: 5,
  AIML: 5,
  CSE: 2,
  ECE: 2,
  EEE: 2,
  MECH: 2,
  CIVIL: 2,
};

// Check Lab Availability by Department
app.get('/checkLabAvailability', async (req, res) => {
  try {
    const { lab, year, department } = req.query;

    // Count current registrations for the department
    const departmentCount = await Lab.countDocuments({ lab, year: Number(year), department });
    const limit = DEPARTMENT_LIMITS[department.toUpperCase()] || 0;

    if (departmentCount >= limit) {
      res.json({ available: false, message: `The lab is full for ${department}` });
    } else {
      res.json({ available: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ available: false, error: 'Error checking lab availability' });
  }
});

// Save User Information Route
app.post('/saveUserInfo', async (req, res) => {
  try {
    const newUser = new User({
      name: req.body.name,
      rollNumber: req.body.rollNumber,
      year: req.body.year,
      department: req.body.department,
      phoneNumber: req.body.phoneNumber,
      email: req.body.email,
    });
    await newUser.save(); // Save user info in the database
    res.redirect('/lab_register.html');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error saving user info');
  }
});

// Save Lab Details Route
app.post('/saveLabDetails', upload.single('resume'), async (req, res) => {
  try {
    const { lab, year, department } = req.body;

    // Check if the department has reached its limit for the lab
    const departmentCount = await Lab.countDocuments({ lab, year: Number(year), department });
    const limit = DEPARTMENT_LIMITS[department.toUpperCase()] || 0;

    if (departmentCount >= limit) {
      return res.status(400).send(`This lab is full for ${department}.`);
    }

    // Save lab details if available
    const selectedSkills = [].concat(req.body.skills);
    const newLab = new Lab({
      lab,
      year: Number(year),
      department,
      skills: selectedSkills,
      resumePath: req.file.path,
    });

    await newLab.save();
    res.send('Lab Details Submitted Successfully!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error saving lab details');
  }
});

// Start Server
const PORT = process.env.PORT || 1000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));


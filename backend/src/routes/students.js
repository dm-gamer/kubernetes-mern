const express = require('express');
const Student = require('../models/Student');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /students
router.get('/students', auth, async (req, res) => {
  try {
    const students = await Student.find({ owner: req.userId }).sort({ createdAt: -1 });
    return res.json(students);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /students
router.post('/students', auth, async (req, res) => {
  try {
    const { name, age, course } = req.body;
    if (!name || !age || !course) {
      return res.status(400).json({ message: 'Name, age and course are required' });
    }

    const student = new Student({
      name,
      age,
      course,
      owner: req.userId,
    });

    await student.save();
    return res.status(201).json(student);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /students/:id
router.delete('/students/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findOneAndDelete({ _id: id, owner: req.userId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    return res.json({ message: 'Student deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


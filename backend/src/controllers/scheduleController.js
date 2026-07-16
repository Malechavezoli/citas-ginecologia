const Schedule = require('../models/Schedule');

const getSchedule = async (req, res) => {
  try {
    let schedule = await Schedule.findOne();
    if (!schedule) {
      schedule = await Schedule.create({});
    }
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSchedule = async (req, res) => {
  try {
    let schedule = await Schedule.findOne();
    if (!schedule) {
      schedule = new Schedule(req.body);
    } else {
      Object.assign(schedule, req.body);
    }
    await schedule.save();
    res.json(schedule);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { getSchedule, updateSchedule };

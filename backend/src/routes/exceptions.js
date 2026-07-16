const express = require('express');
const router = express.Router();
const {
  getExceptions,
  createException,
  deleteException,
} = require('../controllers/exceptionController');

router.get('/', getExceptions);
router.post('/', createException);
router.delete('/:id', deleteException);

module.exports = router;

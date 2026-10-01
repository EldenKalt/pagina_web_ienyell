const express = require('express');

const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { listPublic, listAdmin, createOption, updateOption } = require('../controllers/calculatorOptionsController');

const router = express.Router();

router.get('/', listPublic);
router.get('/admin', authenticateToken, authorizeRole('ADMIN'), listAdmin);
router.post('/', authenticateToken, authorizeRole('ADMIN'), createOption);
router.put('/:id', authenticateToken, authorizeRole('ADMIN'), updateOption);

module.exports = router;

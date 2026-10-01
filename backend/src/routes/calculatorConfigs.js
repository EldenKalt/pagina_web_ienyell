const express = require('express');

const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { listPublic, listAdmin, updateConfig } = require('../controllers/calculatorConfigsController');

const router = express.Router();

router.get('/', listPublic);
router.get('/admin', authenticateToken, authorizeRole('ADMIN'), listAdmin);
router.put('/:configId', authenticateToken, authorizeRole('ADMIN'), updateConfig);

module.exports = router;

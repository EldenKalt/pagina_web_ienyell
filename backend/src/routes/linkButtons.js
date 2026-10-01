const express = require('express');

const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { listPublic, listAdmin, updateSettings } = require('../controllers/linkButtonsController');

const router = express.Router();

router.get('/', listPublic);
router.get('/admin', authenticateToken, authorizeRole('ADMIN'), listAdmin);
router.put('/', authenticateToken, authorizeRole('ADMIN'), updateSettings);

module.exports = router;

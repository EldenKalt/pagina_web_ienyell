const express = require('express');

const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { listPublic, listAdmin, updateWizard } = require('../controllers/wizardFlowsController');

const router = express.Router();

router.get('/', listPublic);
router.get('/admin', authenticateToken, authorizeRole('ADMIN'), listAdmin);
router.put('/:wizardId', authenticateToken, authorizeRole('ADMIN'), updateWizard);

module.exports = router;

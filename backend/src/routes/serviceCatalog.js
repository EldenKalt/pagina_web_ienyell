const express = require('express');

const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { listPublic, listAdmin, updateCatalog } = require('../controllers/serviceCatalogController');

const router = express.Router();

router.get('/', listPublic);
router.get('/admin', authenticateToken, authorizeRole('ADMIN'), listAdmin);
router.put('/', authenticateToken, authorizeRole('ADMIN'), updateCatalog);

module.exports = router;

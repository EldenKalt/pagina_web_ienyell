const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const { updateNote, deleteNote } = require('../controllers/annotationController');
router.patch('/:id', authenticateToken, updateNote);
router.delete('/:id', authenticateToken, deleteNote);
module.exports = router;

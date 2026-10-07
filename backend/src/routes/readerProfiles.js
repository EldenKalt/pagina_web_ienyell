const router = require('express').Router();
const { authenticateOptional } = require('../middleware/auth');
const profile = require('../controllers/readerProfileController');

router.get('/:handle', authenticateOptional, profile.publicProfile);
router.get('/:handle/notes', authenticateOptional, profile.publicNotes);
router.get('/:handle/comments', authenticateOptional, profile.publicComments);

module.exports = router;

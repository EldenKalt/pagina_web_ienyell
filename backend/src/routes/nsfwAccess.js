const router = require("express").Router();
const { requestAccess, verifyAccess } = require("../controllers/nsfwAccessController");

router.post("/request", requestAccess);
router.get("/verify", verifyAccess);

module.exports = router;

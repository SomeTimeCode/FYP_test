const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllers')
const authMiddlewares = require('../middlewares/auth')


router.get("/", (req, res) => {
    res.status(200).json({ message: "Welcome to RayRay /api/auth." });
});

router.post("/login", authController.login)
router.get("/checkToken/:role", authMiddlewares.verifyToken, authController.checkToken)

module.exports = router
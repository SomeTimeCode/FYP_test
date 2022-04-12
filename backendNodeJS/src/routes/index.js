const express = require('express');
const router = express.Router();
const authRouter = require('./auth');
const adminRouter = require('./admin');
const studentRouter = require('./student');
const supervisorRouter = require('./supervisor');
const authMiddlewares = require('../middlewares/auth')

router.get("/", (req, res) => {
    res.status(200).json({ message: "Welcome to RayRay /api." });
});

router.use('/auth', authRouter);

// need to pass middleware to identify
router.use('/admin', authMiddlewares.verifyToken, authMiddlewares.verifyAdmin , adminRouter);
router.use('/student', authMiddlewares.verifyToken, authMiddlewares.verifyStudent, studentRouter)
router.use('/supervisor', authMiddlewares.verifyToken, authMiddlewares.verifySupervisor ,supervisorRouter);

module.exports = router
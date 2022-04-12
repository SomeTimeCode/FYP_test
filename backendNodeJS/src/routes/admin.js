const express = require('express')
const router = express.Router();
const fetch = require('node-fetch');
const {Headers} = require('node-fetch')
const multer = require("multer");
const upload = multer();
const adminController = require('../controllers/adminController')

router.get("/", (req, res) => {
    res.status(200).json({ message: "Welcome to RayRay /api/admin." });
});

// internal controller
// create account
router.post("/createAccounts", upload.single('avatar'), adminController.createAccounts)

// peer review form
router.post("/createPeerReview", adminController.createPeerReview)
router.get("/viewPeerReview", adminController.viewPeerReview)


// peer review question
router.post("/createPeerReviewQuestion", adminController.createPeerReviewQuestion)
router.get("/viewPeerReviewQuestion", adminController.viewPeerReviewQuestion)
router.get("/viewSpecificPeerReview/:id", adminController.viewSpecificPeerReview)
router.post("/editSpecificPeerReview", adminController.editSpecificPeerReview)
router.post("/deleteSpecificPeerReviewForm", adminController.deleteSpecificPeerReviewForm)

//recommendation
router.get("/viewRecommendation", adminController.viewRecommendation)
router.post("/updateRecommendation", upload.single('avatar'), adminController.updateRecommendation)
router.post("/updateRatingRecommendation", upload.single('avatar'), adminController.updateRatingRecommendation)

//group management
router.get("/viewGroups", adminController.viewGroups)
router.post("/updateGroup", adminController.updateGroup)

//scheduler -- Build Period
router.get("/viewSchedulePeriod", adminController.viewSchedulePeriod)
router.post("/createSchedulePeriod", adminController.createSchedulePeriod)
router.post("/deleteSchedulePeriod", adminController.deleteSchedulePeriod)

//scheduler -- Build Schedule
router.get("/viewSchedule", adminController.viewSchedule)
router.get("/viewSpecificSchedule/:id", adminController.viewSpecificSchedule)
router.post("/generateSpecificSchedule", adminController.generateSpecificSchedule)
router.post("/updateSpecificSchedule", adminController.updateSpecificSchedule)




// redirect to flask server 
router.get("/test", async (req, res) => {
    const requestOptions = {
        method: "POST",
        body: JSON.stringify({TEST: "test"}),
        headers: new Headers({
            "content-type": "application/json"
        })
    }
    const response = await fetch("http://localhost:5001/test", requestOptions).catch((err) => {throw err})
    var data = await response.json()
    console.log(data)
    res.status(200).json(data)
})




module.exports = router
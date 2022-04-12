const XLSX = require('xlsx')
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const Supervisor = require('../models/supervisorModel');
const Student = require('../models/studentModel');
const Question = require('../models/questionModel')
const PeerReviewForm = require('../models/peerReviewFormModel');
const studentPeerReviewResponse = require('../models/studentPeerReviewResponseModel');
const Recommendation = require('../models/recommendationModel');
const SchedulePeriod = require("../models/schedulePeriodModel");
const GroupSchedule = require("../models/groupScheduleModel");
const SupervisorSchedule = require("../models/supervisorScheduleModel")
const AdminSchedule = require("../models/adminScheduleModel")
const fetch = require('node-fetch');
const {Headers} = require('node-fetch');
const Group = require('../models/groupModel');


const createAccounts = async(req, res) =>{
    try{
        console.log(req.file)
        var workbook = XLSX.read(req.file.buffer, {type: 'buffer'})
        let hashMap = {}
        let data = {}
        let completeData = []
        const temp = XLSX.utils.sheet_to_json(workbook.Sheets["CreateUsers"] , {raw: false})
        for(var i = 0; i < temp.length; i++){
            let res = temp[i]
            if(res.username == null && res.role == null && res.password == null && res.contact == null){
                continue
            }
            if(hashMap[res.username] != undefined){
                res.status(400).json({message: `duplicated username in ${res.__EMPTY}. Please make adjustment`})
                return
            }
            data[res.__EMPTY] = {"username": res.username, "password": res.password, "contact": res.contact, "role": res.role, "message": null}
            if(res.username == null){
                if (data[res.__EMPTY].message == null){
                    data[res.__EMPTY].message = "Missing Username;"
                }else{
                    data[res.__EMPTY].message = data[res.__EMPTY].message + "Missing Username;"
                }
            }
            if(res.password == null){
                if (data[res.__EMPTY].message == null){
                    data[res.__EMPTY].message = "Missing Password;"
                }else{
                    data[res.__EMPTY].message = data[res.__EMPTY].message + "Missing Password;"
                }
            }
            if(res.contact == null){
                if (data[res.__EMPTY].message == null){
                    data[res.__EMPTY].message = "Missing Contact;"
                }else{
                    data[res.__EMPTY].message = data[res.__EMPTY].message + "Missing Contact;"
                }
            }
            if(res.role == null){
                if (data[res.__EMPTY].message == null){
                    data[res.__EMPTY].message = "Missing Role;"
                }else{
                    data[res.__EMPTY].message = data[res.__EMPTY].message + "Missing Role;"
                }
            }
            if(res.username != null && res.role != null && res.contact != null && res.password != null){
                completeData.push(res.username)
                hashMap[res.username] = res.__EMPTY
            }
        }
        console.log(completeData)
        console.log(hashMap)
        //check completeData username has exist in the database or not
        var users = await User.find({"username": {"$in": completeData}}).catch((err) => {throw err})
        let usersList = []
        for(var i = 0; i < users.length; i++){
            usersList.push(users[i].username)
            if(data[hashMap[users[i].username]].message != null){
                data[hashMap[users[i].username]].message = data[hashMap[users[i].username]].message + "Username already exist in database;"
            }else{
                data[hashMap[users[i].username]].message = "Username already exist in database;"
            }
        }
        console.log(usersList)
        //filter out the exist people in the completData
        completeData = completeData.filter(user => !usersList.includes(user));
        console.log(completeData)
        //add the username that does not exist in the database
        for(var i = 0; i < completeData.length; i++){
            console.log(data[hashMap[completeData[i]]].role)
            if(data[hashMap[completeData[i]]].role == "Student"){
                let password = await bcrypt.hash(data[hashMap[completeData[i]]].password, 10)
                var user = new User({
                    username: data[hashMap[completeData[i]]].username,
                    password: password,
                    contact: data[hashMap[completeData[i]]].contact,
                    role: 'Student'
                })
                await user.save().then((obj) => {console.log(obj._id)}).catch((err) => {throw err})
                var student = new Student({
                    user: user._id
                })
                await student.save().then((obj) => {console.log(obj._id)}).catch((err) => {throw err})
                data[hashMap[completeData[i]]].message = "Success create"
            }else if(data[hashMap[completeData[i]]].role == "Supervisor"){
                let password = await bcrypt.hash(data[hashMap[completeData[i]]].password, 10)
                var user = new User({
                    username: data[hashMap[completeData[i]]].username,
                    password: password,
                    contact: data[hashMap[completeData[i]]].contact,
                    role: 'Supervisor'
                })
                await user.save().then((obj) => {console.log(obj._id)}).catch((err) => {throw err})
                var supervisor = new Supervisor({
                    user: user._id
                })
                await supervisor.save().then((obj) => {console.log(obj._id)}).catch((err) => {throw err})
                data[hashMap[completeData[i]]].message = "Success create"
            }else{
                //unknown role
                if (data[hashMap[completeData[i]]].message == null){
                    data[hashMap[completeData[i]]].message = "Unknown Role;"
                }else{
                    data[hashMap[completeData[i]]].message = data[hashMap[completeData[i]]].message + "Unknown Role;"
                }
            }
        }
        Object.keys(data).forEach((value) => {
            data[value] = {username: data[value].username, message: data[value].message}
        })
        res.status(200).json({fileName: req.file.originalname, data})
    }catch(err){
        console.log("check")
        res.status(400).json({message: err})
    }
}

const viewSpecificPeerReview = async(req, res) =>{
    try{
        var peerReviewForm = await PeerReviewForm.findOne({_id: req.params.id}).catch((err) => {throw err})
        var question_list = await Question.find({}).catch((err) => {throw err})
        var questionSubmit = []
        var questionBank = []
        question_list.forEach((question) => {
            if(peerReviewForm.questions.includes((question._id))){
                questionSubmit.push(question)
            }else{
                questionBank.push(question)
            }
        })
        console.log(peerReviewForm.start_of_date)
        console.log(new Date(peerReviewForm.start_of_date).toISOString().slice(0,10))
        res.status(200).json({questionSubmit: questionSubmit, questionBank: questionBank, term: peerReviewForm.term, start_of_date: new Date(peerReviewForm.start_of_date).toISOString().slice(0,10), end_of_date: new Date(peerReviewForm.end_of_date).toISOString().slice(0,10)})
    }catch(err){
        res.status(400).json({message: "Unexpected Error in viewing specific peer review", error: err})
    }
}

const editSpecificPeerReview = async(req, res) =>{
    try{
        if(req.body.startDate != null && req.body.endDate != null && req.body.term && req.body.questionSubmit != null && req.body.questionSubmit.length != 0 && req.body._id != null){
            let peerReviewForm = await PeerReviewForm.findOne({_id: req.body._id}).catch((err)=>{throw err})
            if(!peerReviewForm){
                res.status(400).json({message: "Peer Review Form can't find"})
                return
            }
            var question_list = req.body.questionSubmit.map((question) => {
                return question._id
            })
            let temp_peerReviewForm = await PeerReviewForm.findOne({term: req.body.term, questions: question_list, start_of_date: req.body.startDate, end_of_date: req.body.endDate}).catch((err)=>{throw err})
            if(temp_peerReviewForm){
                res.status(400).json({message: "Peer Review Form exists"})
                return
            }
            console.log(temp_peerReviewForm)
            peerReviewForm.start_of_date = req.body.startDate
            peerReviewForm.end_of_date = req.body.endDate
            peerReviewForm.term = req.body.term
            peerReviewForm.questions = question_list
            peerReviewForm.save().catch((err)=>{throw err})
            res.status(200).json({message: "Complete update the Peer Review Form"})
        }else{
            res.status(400).json({message: "Required infromtation does not completeted"})
        }
    }catch(err){
        res.status(400).json({message: "Unexpected Error in editing specific peer review", error: err})
    }
}

const viewPeerReview = async(req, res) => {
    try{
        let peerReviewForm = await PeerReviewForm.find({}).catch((err) => {throw err})
        if(!peerReviewForm){
            res.status(200).json({})
        }else{
            peerReviewForm = peerReviewForm.map((form) => {
                return {_id: form._id, term: form.term, questions: form.questions.length, start_of_date: form.start_of_date, end_of_date: form.end_of_date}
            })
            res.status(200).json(peerReviewForm)
        }
    }catch(err){
        res.status(400).json({message: "Unexpeected Error in viewing Peer Reviews", error: err})
    }
}

const createPeerReview = async(req, res) => {
    try{
        console.log(req.body)
        if(req.body.startDate != null && req.body.endDate != null && req.body.term && req.body.questionSubmit != null && req.body.questionSubmit.length != 0){
            console.log("check")
            var question_list = req.body.questionSubmit.map((question) => {
                                    return question._id
                                })
            var peerReviewForm = new PeerReviewForm({
                term: req.body.term,
                questions: question_list,
                start_of_date: req.body.startDate,
                end_of_date: req.body.endDate
            })
            await peerReviewForm.save().then((obj) => {console.log(obj._id)}).catch((err) => {throw err})
            res.status(200).json({"_id": peerReviewForm._doc._id})
        }else{
            res.status(400).json({message: "Incomplete information provided"})
        }
    }catch(err){
        res.status(400).json({message: "Unexpected Error in creating Peer Review Form"})
    }
}

const deleteSpecificPeerReviewForm = async(req, res) => {
    try{
        if(req.body._id != null){
            await PeerReviewForm.deleteOne({ _id: req.body._id }).catch((err) => { throw err })
            await studentPeerReviewResponse.deleteMany({peerReviewForm: req.body._id}).catch((err) => { throw err })
            res.status(200).json({message: "Peer Review Form is successful deleted"})
        }else{
            res.status(400).json({message: "Incomplete Information provided"})
        }
    }catch(err){
        res.status(400).json({message: "Unexpected Error in deleting Peer Review Form", error: err})
    }
}

const createPeerReviewQuestion = async(req, res) => {
    try{
        console.log(req.body)
        if(req.body.question != null && req.body.question_type != null && req.body.question_to != null && req.body.question_required != null){
            if(req.body.question_required == 'True'){
                req.body.question_required = true
            }else if(req.body.question_required == 'False'){
                req.body.question_required = false
            }else{
                res.status(400).json({messgae: 'Unexpected question required restriction'})
                return
            }
            var question = await Question.findOne({question: req.body.question, question_to: req.body.question_to, question_type: req.body.question_type, question_required: req.body.question_required}).catch((err) => {throw err})
            if(question){
               res.status(409).json({message: "Question already exist"}) 
               return
            }
            question = new Question({
                question: req.body.question,
                question_to: req.body.question_to,
                question_type: req.body.question_type, 
                question_required: req.body.question_required
            })
            await question.save().then((obj) => {console.log(obj._id)}).catch((err) => {throw err})
            res.status(200).json({"_id": question._id, "question": req.body.question, "question_to": req.body.question_to, "question_type": req.body.question_type, "question_required": req.body.question_required})
        }else{
            res.status(400).json({message: "Required infromtation does not completeted"})
        }
    }catch(err){
        console.log(err)
        res.status(400).json({message: "Error in creating Peer Review Question", error: err})
    }
}

const viewPeerReviewQuestion = async(req, res) => {
    try{
        var questions_list = await Question.find({}).catch((err) => {throw err})
        questions_list = questions_list.map((data) => {
                            return {"_id": data._doc._id, "question_to": data._doc.question_to, "question": data._doc.question, "question_type": data._doc.question_type, "question_required": data._doc.question_required}
                        })
        res.status(200).json(questions_list)
    }catch(err){
        res.status(400).json({message: "Unexpected Error in viewing peer review questions", error: err})
    }
}

const viewRecommendation = async(req, res) => {
    try{
        //grap the lastest verstion of recommendation
        var recommendation = await Recommendation.find().limit(1).sort({$natural:-1}).catch((err) => {throw err})
        if(recommendation.length == 0){
            res.status(200).json({message: "No data"})
            return
        }
        if(!recommendation[0].ratingData){
            res.status(200).json({message: "Missing Rating", data: JSON.parse(recommendation[0].data), courselist: JSON.parse(recommendation[0].courselist)})
            return
        }
        if(!recommendation[0].data){
            res.status(200).json({message: "Missing Data", ratingData: JSON.parse(recommendation[0].ratingData), genrelist: JSON.parse(recommendation[0].genrelist)})
            return
        }
        res.status(200).json({message: "Have data", data: JSON.parse(recommendation[0].data), courselist: JSON.parse(recommendation[0].courselist), ratingData: JSON.parse(recommendation[0].ratingData), genrelist: JSON.parse(recommendation[0].genrelist)})
    }catch(err){
        res.status(400).json({message: "Unexpected Error in viewing past students choices"})
    } 
}

const updateRecommendation = async(req, res) => {
    try{
        if(req.file.buffer){
            var workbook = XLSX.read(req.file.buffer, {type: 'buffer'})
            let data = {}
            let courselist = []
            const temp = XLSX.utils.sheet_to_json(workbook.Sheets["Data"] , {raw: false})
            console.log(temp)
            // "check all keys is correct or not"
            courselist = Object.keys(temp[0]).slice(1)
            if(courselist[courselist.length - 2] != "Supervisor" && courselist[courselist.length - 1] != "FYP Genre"){
                res.status(400).json({message: "Missing supervisor or FYP Genre in the excel file"})
                return
            }
            temp.forEach((user) => {
                var input = Object.values(user)
                data[input[0]] = input.slice(1)
            })
            var recommendation = await Recommendation.find().limit(1).sort({$natural:-1}).catch((err) => {throw err})
            if(recommendation.length == 0){
                recommendation = new Recommendation({
                    data: JSON.stringify(data),
                    courselist: JSON.stringify(courselist)
                })
                await recommendation.save().then((obj) => {console.log(obj._id)}).catch((err) => {throw err})
                res.status(200).json({courselist: courselist, data: data})
                return
            }else{
                recommendation[0].data = JSON.stringify(data)
                recommendation[0].courselist = JSON.stringify(courselist)
                await recommendation[0].save().then((obj) => {console.log(obj._id)}).catch((err) => {throw err})
                res.status(200).json({courselist: courselist, data: data})
            }
        }else{
            res.status(400).json({message: "Missing input data to update."})
        }
    }catch(err){
        res.status(400).json({message: "Unexpected Error in updating past students choices"})
    }
}

const updateRatingRecommendation = async(req, res) => {
    try{
        if(req.file.buffer){
            var workbook = XLSX.read(req.file.buffer, {type: 'buffer'})
            let ratingData = {}
            let genrelist = []
            const temp = XLSX.utils.sheet_to_json(workbook.Sheets["Ratings"] , {raw: false})
            console.log(temp)
            // "check all keys is correct or not"
            genrelist = Object.keys(temp[0]).slice(1)
            temp.forEach((user) => {
                var input = Object.values(user)
                ratingData[input[0]] = input.slice(1)
            })
            var recommendation = await Recommendation.find().limit(1).sort({$natural:-1}).catch((err) => {throw err})
            if(recommendation.length == 0){
                recommendation = new Recommendation({
                    ratingData: JSON.stringify(ratingData),
                    genrelist: JSON.stringify(genrelist)
                })
                await recommendation.save().then((obj) => {console.log(obj._id)}).catch((err) => {throw err})
                res.status(200).json({genrelist: genrelist, ratingData: ratingData})
                return
            }else{
                recommendation[0].ratingData = JSON.stringify(ratingData)
                recommendation[0].genrelist = JSON.stringify(genrelist)
                await recommendation[0].save().then((obj) => {console.log(obj._id)}).catch((err) => {throw err})
                res.status(200).json({genrelist: genrelist, ratingData: ratingData})
            }
        }else{
            res.status(400).json({message: "Missing input data to update."})
        }
    }catch(err){
        res.status(400).json({message: "Unexpected Error in updating past students choices"})
    }
}

const viewSchedulePeriod = async(req, res) => {
    try{
        var schedulePeriod = await SchedulePeriod.find().catch((err) => {throw err})
        res.status(200).json(schedulePeriod)
    }catch(err){
        res.status(400).json({message: "Unexpected Error in viewing schedule period", error: err})
    }
}

const deleteSchedulePeriod = async(req, res) => {
    try{
        if(req.body._id == null){
            res.status(400).json({message: "Unexpected Error in deleting schedule period", error: "Missing delete schedule period's id"})
            return
        }else{
            await SchedulePeriod.deleteOne({_id: req.body._id}).catch((err) => {throw err})
            await SupervisorSchedule.deleteMany({schedulePeriod: req.body._id}).catch((err) => {throw err})
            await GroupSchedule.deleteMany({schedulePeriod: req.body._id}).catch((err) => {throw err})
            await AdminSchedule.deleteMany({schedulePeriod: req.body._id}).catch((err) => {throw err})
            var schedulePeriod = await SchedulePeriod.find().catch((err) => {throw err})
            res.status(200).json(schedulePeriod)
        }
    }catch(err){
        res.status(400).json({message: "Unexpected Error in deleting schedule period", error: err})
    }
}

const createSchedulePeriod = async(req, res) => {
    try{
        if(req.body.endOfChanging == null && req.body.startDate == null && req.body.endDate == null && req.body.term == null){
            console.log("test")
            res.status(400).json({message: "Unexpected Error in deleting schedule period", error: "Missing delete schedule period's id"})
            return
        }else{
            var schedulePeriod = await SchedulePeriod.findOne({term: req.body.term}).catch((err) => {throw err})
            if(schedulePeriod){
                res.status(400).json({message: "Term name existed. Please use another term name"})
                return
            }
            schedulePeriod = new SchedulePeriod({
                endOfChanging: req.body.endOfChanging,
                startDate: req.body.startDate,
                endDate: req.body.endDate,
                term: req.body.term
            })
            await schedulePeriod.save().then((obj) => {console.log(obj._id)}).catch((err) => {throw err})
            res.status(200).json({message: "Success delete requiredd schedule period"})
        }
    }catch(err){
        res.status(400).json({message: "Unexpected Error in creating schedule period", error: err})
    }
}

const viewSchedule = async(req, res) =>{
    try{
        var date = new Date()
        var query;
        if(date.getMonth > 8){
            query = { $gte: `${date.getFullYear()}-09-1`, $lte: `${date.getFullYear()+1}-06-1`}
        }else{
            query = { $gte: `${date.getFullYear()-1}-09-1`, $lte: `${date.getFullYear()}-06-1`}
        }
        var schedules = await SchedulePeriod.find({ endDate: query }).catch((err) => {throw err})
        // if group does not response then create new otherwise take old data
        var data = []
        for(var i = 0; i < schedules.length; i++){
            var admin_schedule = await AdminSchedule.findOne({schedulePeriod: schedules[i]._id}).catch((err) => {throw err})
            if(!admin_schedule){
                admin_schedule = new AdminSchedule({
                    schedulePeriod: schedules[i]._id,
                    data: ''
                })
                await admin_schedule.save().catch((err) => {throw err})
            }
            data.push({_id: admin_schedule._id, endOfChanging: schedules[i].endOfChanging, startDate: schedules[i].startDate, endDate: schedules[i].endDate, term: schedules[i].term})
        }
        res.status(200).json(data)
    }catch(err){
        console.log(err)
        res.status(400).json({message: "Unexpected Error in viewing schedules", error: err})
    }
}


const viewGroups = async(req, res) => {
    try{
        var groups = await Group.find().populate({path: 'examiner', populate:{path: 'user'}}).populate({path: 'supervisor', populate:{path: 'user'}}).catch((err) => {throw err})
        output = []
        for(var i = 0; i < groups.length; i++){
            if(groups[i].examiner == undefined){
                var obj = {_id: groups[i]._id, group_name: groups[i].group_name, status: groups[i].status, supervisor: groups[i].supervisor.user.username, examiner: null}
            }else{
                var obj = {_id: groups[i]._id, group_name: groups[i].group_name, status: groups[i].status, supervisor: groups[i].supervisor.user.username, examiner: groups[i].examiner.user.username}
            }
            output.push(obj)
        }
        res.status(200).json(output)
        return
    }catch(err){
        res.status(400).json({message: "Unexpected Error in viewing groups", error: err})
    }
}

const updateGroup = async(req, res) => {
    try{
        var examiner = await User.findOne({username: req.body.examiner}).catch((err) => {throw err})
        examiner = await Supervisor.findOne({user: examiner}).catch((err) => {throw err})
        var group = await Group.findOne({_id: req.body._id}).catch((err) => {throw err})
        if(!group){
            res.status(400).json({message: "Unexpected Error in updating group information",  error: "Group doesnot exist"})
        }
        console.log(examiner)
        if(examiner){
            group["status"] = req.body.status
            group["examiner"] = examiner
            await group.save().then((obj) => {console.log(obj._id)}).catch((err) => {throw err})
            res.status(200).json({message: "Update Success"})
        }else{
            res.status(400).json({message: "Unexpected Error in updating group information",  error: "Examiner not exist in the supervisor Group"})
        }
    }catch(err){
        res.status(400).json({message: "Unexpected Error in updating group information",  error: err})
    }
}



const viewSpecificSchedule = async(req, res) => {
    try{
        var admin_schedule = await AdminSchedule.findOne({_id: req.params.id}).populate("schedulePeriod").catch((err) => {throw err})
        if(admin_schedule){
            //Write Here
            if(admin_schedule.data == ''){
                const timeslot = ["9:00", "9:20", "9:40", "10:00", "10:20", "10:40", "11:00", "11:20", "11:40", "12:00", "12:20", "12:40", "13:00", "13:20", "13:40", "14:00", "14:20", "14:40", "15:00", "15:20", "15:40", "16:00", "16:20", "16:40","17:00", "17:20", "17:40"] 
                const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
                const months = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                date = []
                var startDate = new Date(admin_schedule.schedulePeriod.startDate)
                var endDate = new Date(admin_schedule.schedulePeriod.endDate)
                endDate.setDate(endDate.getDate() + 1)
                var countDate = startDate
                while(countDate < endDate){
                    if(countDate.getDay() !== 0 && countDate.getDay() !== 6){
                        var key = `${months[countDate.getMonth()]}${countDate.getDate()}-${days[countDate.getDay()]}`
                        date.push(key)
                    }
                    countDate.setDate(countDate.getDate() + 1)
                }
                // console.log(date)
                var default_time_slot = []
                var time_slot_hash = {}
                for(var i=0; i < date.length; i++){
                    for(var j = 0; j < timeslot.length; j++){
                        default_time_slot.push(j + i*27)
                        time_slot_hash[`${date[i]}-${timeslot[j]}`] = (j + i*27)
                    }
                }
                // console.log(default_time_slot)
                // get all supervisor_time
                const supervisors = await Supervisor.find().populate("user").catch((err)=>{throw err})
                const supervisor_schedules = await SupervisorSchedule.find({schedulePeriod: admin_schedule.schedulePeriod}).populate({path: 'supervisor', populate:{path: 'user'}}).catch((err)=>{throw err})
                var hash_supervisor_schedule = {}
                for(var i=0; i < supervisor_schedules.length; i++){
                    hash_supervisor_schedule[supervisor_schedules[i].supervisor.user.username] = supervisor_schedules[i]
                }
                var supervisor_time = {}
                for(var i=0 ; i < supervisors.length; i++){
                    if(hash_supervisor_schedule.hasOwnProperty[supervisors[i].user.username]){
                        var available_time_slot = []
                        var data = JSON.parse(hash_supervisor_schedule[supervisors[i].user.username].data)
                        for(var j = 0; j<date.length; j++){
                            for(var k=0; k<timeslot.length; k++){
                                if(data[date[j]][timeslot[k]].available === true){
                                    available_time_slot.push(k + j*27)
                                }
                            }
                        }
                        supervisor_time[supervisors[i].user.username] = available_time_slot
                    }else{
                        supervisor_time[supervisors[i].user.username] = [...default_time_slot]
                    }
                }
                // console.log(supervisor_time)
                // get all group_time
                const groups = await Group.find({status: "approve"}).populate({path: 'supervisor', populate:{path: 'user'}}).populate({path: 'examiner', populate:{path: 'user'}}).catch((err)=>{throw err})
                const group_schedule = await GroupSchedule.find({schedulePeriod: admin_schedule.schedulePeriod}).populate("group").catch((err)=>{throw err})
                var hash_group_schedule = {}
                for(var i=0; i < group_schedule.length; i++){
                    hash_group_schedule[group_schedule[i].group.group_name] = group_schedule[i]
                }
                groups_without_examiner = []
                groups_with_examiner = []
                for(var i =0; i<groups.length; i++){
                    if(groups[i].examiner){
                        groups_with_examiner.push(groups[i])
                    }else{
                        groups_without_examiner.push({_id: groups[i]._id, group_name: groups[i].group_name, supervisor: groups[i].supervisor.user.username})
                    }
                }
                var group_time = {}
                for(var i=0 ; i < groups_with_examiner.length; i++){
                    if(hash_group_schedule.hasOwnProperty[groups_with_examiner[i].group_name]){
                        var available_time_slot = []
                        data = JSON.parse(hash_group_schedule[groups_with_examiner[i].group_name].data)
                        for(var j = 0; j<date.length; j++){
                            for(var k=0; k<timeslot.length; k++){
                                if(data[date[j]][timeslot[k]].available === true){
                                    available_time_slot.push(k + j*27)
                                }
                            }
                        }
                        group_time[groups_with_examiner[i].group_name] = [groups_with_examiner[i].group_members.length, available_time_slot, groups_with_examiner[i].supervisor.user.username, groups_with_examiner[i].examiner.user.username]
                    }else{
                        group_time[groups_with_examiner[i].group_name] = [groups_with_examiner[i].group_members.length, [...default_time_slot], groups_with_examiner[i].supervisor.user.username, groups_with_examiner[i].examiner.user.username]
                    }
                }
                var data = {}
                data["presentation_time"] = null
                data["presentation_place"] = null
                console.log(admin_schedule.schedulePeriod)
                res.status(200).json({groups_without_examiner: groups_without_examiner, group_time: group_time, supervisor_time: supervisor_time, start_of_date: admin_schedule.schedulePeriod.startDate, end_of_date: admin_schedule.schedulePeriod.endDate, term: admin_schedule.schedulePeriod.term, time_slot_hash: time_slot_hash, data: data})
                return
            }else{
                const timeslot = ["9:00", "9:20", "9:40", "10:00", "10:20", "10:40", "11:00", "11:20", "11:40", "12:00", "12:20", "12:40", "13:00", "13:20", "13:40", "14:00", "14:20", "14:40", "15:00", "15:20", "15:40", "16:00", "16:20", "16:40","17:00", "17:20", "17:40"] 
                const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
                const months = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                date = []
                var startDate = new Date(admin_schedule.schedulePeriod.startDate)
                var endDate = new Date(admin_schedule.schedulePeriod.endDate)
                endDate.setDate(endDate.getDate() + 1)
                var countDate = startDate
                while(countDate < endDate){
                    if(countDate.getDay() !== 0 && countDate.getDay() !== 6){
                        var key = `${months[countDate.getMonth()]}${countDate.getDate()}-${days[countDate.getDay()]}`
                        date.push(key)
                    }
                    countDate.setDate(countDate.getDate() + 1)
                }
                // console.log(date)
                var default_time_slot = []
                var time_slot_hash = {}
                for(var i=0; i < date.length; i++){
                    for(var j = 0; j < timeslot.length; j++){
                        default_time_slot.push(j + i*27)
                        time_slot_hash[`${date[i]}-${timeslot[j]}`] = (j + i*27)
                    }
                }
                // console.log(default_time_slot)
                // get all supervisor_time
                const supervisors = await Supervisor.find().populate("user").catch((err)=>{throw err})
                const supervisor_schedules = await SupervisorSchedule.find({schedulePeriod: admin_schedule.schedulePeriod}).populate({path: 'supervisor', populate:{path: 'user'}}).catch((err)=>{throw err})
                var hash_supervisor_schedule = {}
                for(var i=0; i < supervisor_schedules.length; i++){
                    hash_supervisor_schedule[supervisor_schedules[i].supervisor.user.username] = supervisor_schedules[i]
                }
                var supervisor_time = {}
                for(var i=0 ; i < supervisors.length; i++){
                    if(hash_supervisor_schedule.hasOwnProperty[supervisors[i].user.username]){
                        var available_time_slot = []
                        var data = JSON.parse(hash_supervisor_schedule[supervisors[i].user.username].data)
                        for(var j = 0; j<date.length; j++){
                            for(var k=0; k<timeslot.length; k++){
                                if(data[date[j]][timeslot[k]].available === true){
                                    available_time_slot.push(k + j*27)
                                }
                            }
                        }
                        supervisor_time[supervisors[i].user.username] = available_time_slot
                    }else{
                        supervisor_time[supervisors[i].user.username] = [...default_time_slot]
                    }
                }
                // console.log(supervisor_time)
                // get all group_time
                const groups = await Group.find({status: "approve"}).populate({path: 'supervisor', populate:{path: 'user'}}).populate({path: 'examiner', populate:{path: 'user'}}).catch((err)=>{throw err})
                const group_schedule = await GroupSchedule.find({schedulePeriod: admin_schedule.schedulePeriod}).populate("group").catch((err)=>{throw err})
                var hash_group_schedule = {}
                for(var i=0; i < group_schedule.length; i++){
                    hash_group_schedule[group_schedule[i].group.group_name] = group_schedule[i]
                }
                groups_without_examiner = []
                groups_with_examiner = []
                for(var i =0; i<groups.length; i++){
                    if(groups[i].examiner){
                        groups_with_examiner.push(groups[i])
                    }else{
                        groups_without_examiner.push({_id: groups[i]._id, group_name: groups[i].group_name, supervisor: groups[i].supervisor.user.username})
                    }
                }
                var group_time = {}
                for(var i=0 ; i < groups_with_examiner.length; i++){
                    if(hash_group_schedule.hasOwnProperty[groups_with_examiner[i].group_name]){
                        var available_time_slot = []
                        data = JSON.parse(hash_group_schedule[groups_with_examiner[i].group_name].data)
                        for(var j = 0; j<date.length; j++){
                            for(var k=0; k<timeslot.length; k++){
                                if(data[date[j]][timeslot[k]].available === true){
                                    available_time_slot.push(k + j*27)
                                }
                            }
                        }
                        group_time[groups_with_examiner[i].group_name] = [groups_with_examiner[i].group_members.length, available_time_slot, groups_with_examiner[i].supervisor.user.username, groups_with_examiner[i].examiner.user.username]
                    }else{
                        group_time[groups_with_examiner[i].group_name] = [groups_with_examiner[i].group_members.length, [...default_time_slot], groups_with_examiner[i].supervisor.user.username, groups_with_examiner[i].examiner.user.username]
                    }
                }
                res.status(200).json({groups_without_examiner: groups_without_examiner, group_time: group_time, supervisor_time: supervisor_time, start_of_date: admin_schedule.schedulePeriod.startDate, end_of_date: admin_schedule.schedulePeriod.endDate, term: admin_schedule.schedulePeriod.term, time_slot_hash: time_slot_hash, data: JSON.parse(admin_schedule.data)})
                return
            }
            // generate the time and default time
            
        }else{
            res.status(400).json({message: "Unexpected Error in viewing admin's specific schedules", error: "Admin Schedule does not find"})
            return
        }
    }catch(err){
        res.status(400).json({message: "Unexpected Error in viewing admin's specific schedules", error: err})
    }
}

// not yet done
const updateSpecificSchedule = async(req, res) => {
    try{
        var admin_schedule = await AdminSchedule.findOne({_id: req.body.id}).populate("schedulePeriod").catch((err) => {throw err})
        if(!admin_schedule){
            res.status(400).json({message: "Missing required Group's Schedule"})
            return
        }
        //all date check
        // update data
        admin_schedule.data = JSON.stringify({presentation_place: req.body.presentationPlace, presentation_time: req.body.presentationTime})
        console.log(admin_schedule)
        await admin_schedule.save().catch((err) => {throw err})
        res.status(200).json({message: "Successfully Updated admin's Schedule"})
    }catch(err){
        res.status(400).json({message: "Unexpected Error in updating admin's specific schedules", error: err})
    }
}

const generateSpecificSchedule = async(req, res) => {
    try{
        const admin_schedule = await AdminSchedule.findOne({_id: req.body.id}).populate("schedulePeriod").catch((err)=>{throw err})
        // generate the time and default time
        const timeslot = ["9:00", "9:20", "9:40", "10:00", "10:20", "10:40", "11:00", "11:20", "11:40", "12:00", "12:20", "12:40", "13:00", "13:20", "13:40", "14:00", "14:20", "14:40", "15:00", "15:20", "15:40", "16:00", "16:20", "16:40","17:00", "17:20", "17:40"] 
        const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
        const months = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        date = []
        var startDate = new Date(admin_schedule.schedulePeriod.startDate)
        var endDate = new Date(admin_schedule.schedulePeriod.endDate)
        endDate.setDate(endDate.getDate() + 1)
        var countDate = startDate
        while(countDate < endDate){
            if(countDate.getDay() !== 0 && countDate.getDay() !== 6){
                var key = `${months[countDate.getMonth()]}${countDate.getDate()}-${days[countDate.getDay()]}`
                date.push(key)
            }
            countDate.setDate(countDate.getDate() + 1)
        }
        // console.log(date)
        var default_time_slot = []
        for(var i=0; i < date.length; i++){
            for(var j = 0; j < timeslot.length; j++){
                default_time_slot.push(j + i*27)
            }
        }
        // console.log(default_time_slot)
        // get all supervisor_time
        const supervisors = await Supervisor.find().populate("user").catch((err)=>{throw err})
        const supervisor_schedules = await SupervisorSchedule.find({schedulePeriod: admin_schedule.schedulePeriod}).populate({path: 'supervisor', populate:{path: 'user'}}).catch((err)=>{throw err})
        var hash_supervisor_schedule = {}
        for(var i=0; i < supervisor_schedules.length; i++){
            hash_supervisor_schedule[supervisor_schedules[i].supervisor.user.username] = supervisor_schedules[i]
        }
        var supervisor_time = {}
        for(var i=0 ; i < supervisors.length; i++){
            if(hash_supervisor_schedule.hasOwnProperty[supervisors[i].user.username]){
                var available_time_slot = []
                var data = JSON.parse(hash_supervisor_schedule[supervisors[i].user.username].data)
                for(var j = 0; j<date.length; j++){
                    for(var k=0; k<timeslot.length; k++){
                        if(data[date[j]][timeslot[k]].available === true){
                            available_time_slot.push(k + j*27)
                        }
                    }
                }
                supervisor_time[supervisors[i].user.username] = available_time_slot
            }else{
                supervisor_time[supervisors[i].user.username] = [...default_time_slot]
            }
        }
        // console.log(supervisor_time)
        // get all group_time
        const groups = await Group.find({status: "approve"}).populate({path: 'supervisor', populate:{path: 'user'}}).populate({path: 'examiner', populate:{path: 'user'}}).catch((err)=>{throw err})
        const group_schedule = await GroupSchedule.find({schedulePeriod: admin_schedule.schedulePeriod}).populate("group").catch((err)=>{throw err})
        var hash_group_schedule = {}
        for(var i=0; i < group_schedule.length; i++){
            hash_group_schedule[group_schedule[i].group.group_name] = group_schedule[i]
        }
        groups_without_examiner = []
        groups_with_examiner = []
        for(var i =0; i<groups.length; i++){
            if(groups[i].examiner){
                groups_with_examiner.push(groups[i])
            }else{
                groups_without_examiner.push({_id: groups[i]._id, group_name: groups[i].group_name, supervisor: groups[i].supervisor.user.username})
            }
        }
        var group_time = {}
        for(var i=0 ; i < groups_with_examiner.length; i++){
            if(hash_group_schedule.hasOwnProperty[groups_with_examiner[i].group_name]){
                var available_time_slot = []
                data = JSON.parse(hash_group_schedule[groups_with_examiner[i].group_name].data)
                for(var j = 0; j<date.length; j++){
                    for(var k=0; k<timeslot.length; k++){
                        if(data[date[j]][timeslot[k]].available === true){
                            available_time_slot.push(k + j*27)
                        }
                    }
                }
                group_time[groups_with_examiner[i].group_name] = [groups_with_examiner[i].group_members.length, available_time_slot, groups_with_examiner[i].supervisor.user.username, groups_with_examiner[i].examiner.user.username]
            }else{
                group_time[groups_with_examiner[i].group_name] = [groups_with_examiner[i].group_members.length, [...default_time_slot], groups_with_examiner[i].supervisor.user.username, groups_with_examiner[i].examiner.user.username]
            }
        }
        // console.log(group_time)
        // console.log(supervisor_time)
        // console.log(req.body.presentationTime)
        if(req.body.presentationTime){
            console.log("check")
            for(var [group_has_presentation_key, group_has_presentation_value] of Object.entries(req.body.presentationTime)){
                delete group_time[group_has_presentation_key]
                var update_supervisor = supervisor_time[group_has_presentation_value.supervisor]
                update_supervisor = update_supervisor.filter((elem) => !(group_has_presentation_value.timeslot.includes(elem)))
                supervisor_time[group_has_presentation_value.supervisor] = update_supervisor
                var update_examiner = supervisor_time[group_has_presentation_value.examiner]
                update_examiner = update_examiner.filter((elem) => !(group_has_presentation_value.timeslot.includes(elem)))
                supervisor_time[group_has_presentation_value.examiner] = update_examiner
            }
        }
        console.log("######")
        console.log(group_time)
        console.log(supervisor_time)
        const requestOptions = {
            method: "POST",
            body: JSON.stringify({group_time: group_time, supervisor_time: supervisor_time}),
            headers: new Headers({
                "content-type": "application/json"
            })
        }
        const response = await fetch("http://localhost:5001/scheduler", requestOptions).catch((err) => {throw err})
        var data = await response.json()
        console.log(data)
        if(response.status != 200){
            res.status(400).json({message: "Unexpected Error in generating admin's specific schedules", error: "Error in generating schedule"})
            return 
        }
        var no_schedule_group = []
        for(var i = 0; i < groups_with_examiner.length; i++){
            if(!(data.hasOwnProperty(groups_with_examiner[i].group_name))){
                no_schedule_group.push(groups_with_examiner[i].group_name)
            }
        }
        res.status(200).json({groups_without_examiner: groups_without_examiner, schedule: data.schedule, no_schedule_group: no_schedule_group, schedulePeriod: admin_schedule.schedulePeriod})
    }catch(err){
        res.status(400).json({message: "Unexpected Error in generating admin's specific schedules", error: err})
    }
}


module.exports = { createAccounts, 
                   viewPeerReview, createPeerReview, viewSpecificPeerReview, editSpecificPeerReview, deleteSpecificPeerReviewForm,
                   createPeerReviewQuestion, viewPeerReviewQuestion,
                   viewRecommendation, updateRecommendation, updateRatingRecommendation,
                   viewSchedulePeriod, createSchedulePeriod, deleteSchedulePeriod,
                   viewGroups, updateGroup,
                   viewSchedule, viewSpecificSchedule, updateSpecificSchedule, generateSpecificSchedule
                 }
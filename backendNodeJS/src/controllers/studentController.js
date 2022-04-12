const Topic = require('../models/topicModel')
const Group = require("../models/groupModel")
const Supervisor = require("../models/supervisorModel")
const Student = require("../models/studentModel")
const User = require("../models/userModel")
const Question = require('../models/questionModel')
const PeerReviewForm = require('../models/peerReviewFormModel')
const StudentPeerReviewResponse = require('../models/studentPeerReviewResponseModel')
const Recommendation = require('../models/recommendationModel')
const SchedulePeriod = require('../models/schedulePeriodModel')
const GroupSchedule = require('../models/groupScheduleModel')
const bcrypt = require('bcryptjs')
const fetch = require('node-fetch');
const {Headers} = require('node-fetch')


// view fyp topic
const viewTopic = async (req, res) => {
    // need to chagne the logic
    try{
        if(req.query.topic_name == ""){
            var topic_name = { $ne: null }
        }else{
            var topic_name = { $regex: req.query.topic_name , $options: 'i' }
        }
        if(req.query.genre == ""){
            var genre = { $ne: null }
        }else{
            var genre_list = req.query.genre.split(",")
            var genre = {"$in" : genre_list.map((item) => {return item.replace("%20", " ")})}
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit
        const total_topics = await Topic.countDocuments({topic_name: topic_name, genre: genre}).catch((err) => {throw err})
        const total_pages = Math.ceil(total_topics / limit)
        var last = false
        if(page > total_pages){
            res.status(404).json({message: "Out of pages"})
            return
        }else if(page == total_pages){
            last = true
        }
        var topic_list = await Topic.find({topic_name: topic_name, genre: genre}).sort('topic_name').skip(skip).limit(limit).catch((err) => {throw err})
        res.status(200).json({topic_list: topic_list, last: last})
        return
    }catch(err){
        console.log(err)
        console.log("Error in viewing topics")
        res.status(400).json({error: err, message: "Error in viewing topics"})
        return
    }
}

const viewSpecificTopic = async (req, res) =>{
    try{
        var topic = await Topic.findOne({_id: req.params.id}).catch((err) => {throw err})
        if(topic){
            var {supervisor, __v, ...rest} = topic._doc
            var supervisor = await Supervisor.findOne({_id: topic.supervisor}).populate("user").catch((err) => {throw err})
            var student = await Student.findOne({user: req.decoded._id}).catch((err) => {throw err})
            var group_list = await Group.find({_id: {$in: rest.group}}).catch((err) => {throw err})
            // public_list record the the group is public or not {group_id: public/private}
            // group_list record the group's group member {group_id: group_member}
            var obj = {}
            var obj2= {}
            for(var i = 0; i < group_list.length; i++){
                var key = group_list[i]._id
                obj[key] = group_list[i].group_members
                obj2[key] = group_list[i].public
            }
            group_list = obj
            public_list = obj2
            // build the hashMap for student id to {username, contact}
            var member_list = Object.values(group_list).flat()
            member_list = await Student.find({_id: {$in: member_list}}).populate("user").catch((err) => {throw err})
            obj = {}
            for(var i = 0; i < member_list.length; i++){
                var key = member_list[i]._id
                obj[key] = {username: member_list[i].user.username, contact: member_list[i].user.contact}
            }
            member_list = obj
            // build the hashMap for group id to list of {username, contact}
            for (var key of Object.keys(group_list)) {
                group_list[key] = {member: group_list[key].map((item) => {return member_list[item]}), public: public_list[key]}
            }
            rest.group = group_list
            // console.log(rest.group)
            res.status(200).json({topic: rest, supervisor: {name: supervisor.user.username, contact: supervisor.user.contact}, student: {group: student.group} })
            return
        }else{
            res.status(400).json({message: "Specifici topic does not found"})
            return
        }
    }catch(err){
        console.log(err)
        console.log("Error in specific topic")
        res.status(400).json({error: err, message: "Error in creating group"})
        return
    }
}

const createGroup = async (req, res) => {
    try{
        var topic = await Topic.findOne({_id: req.body.id}).catch((err) => {throw err})
        var student = await Student.findOne({user: req.decoded._id}).catch((err) => {throw err})
        if(topic.number_group == 0){
            res.status(400).json({message: "No open group available now"})
        }
        var public = true
        var password = req.body.password
        if(req.body.password){
            password = await bcrypt.hash(req.body.password, 10)
            public = false
        }
        var group = new Group({
            group_name: `${req.body.group_name}_Pending`, 
            topic: topic._id,
            group_members: [student._id],
            supervisor: topic.supervisor,
            password: password,
            public: public 
        })
        await group.save().catch((err) => {throw err})
        topic.number_group = topic.number_group - 1
        topic.group.push(group._id)
        await topic.save().catch((err) => {throw err})
        student.group = group._id
        student.save().catch((err) => {throw err})
        res.status(200).json({message: "Group has been created"})
        return
    }catch(err){
        console.log(err)
        console.log("Error in creating group")
        res.status(400).json({error: err, message: "Error in creating group"})
        return
    }
}

const joinGroup = async (req, res) =>{
    try{
        if(req.body.group_name == null && req.body._id == null){
            console.log("Missing group information")
            res.status(400).json({message: "Missing group information"})
            return
        }else{
            if(req.body.group_name){
                var query = {group_name: req.body.group_name}
            }else{
                var query = {_id: req.body._id}
            }
            var group = await Group.findOne(query).populate("topic").catch((err) => {throw err})
            if(group.topic.number_gorup_member <= group.group_members.length){
                res.status(400).json({message: 'The group was full'})
                return
            }
            var student = await Student.findOne({user: req.decoded._id}).catch((err) => {throw err})
            if(group.public){
                group.group_members.push(student._id)
                group.save().catch((err) => {throw err})
                student.group = group._id
                student.save().catch((err) => {throw err})
                res.status(200).json({message: `Successfully join the group`})
                return
            }else{
                if(bcrypt.compareSync(req.body.password, group.password)){
                    group.group_members.push(student._id)
                    group.save().catch((err) => {throw err})
                    student.group = group._id
                    student.save().catch((err) => {throw err})
                    res.status(200).json({message: `Successfully join the group`})
                    return
                }else{
                    console.log("Wrong password")
                    res.status(400).json({message: "Wrong group password"})
                    return
                }
            }
        }
    }catch(err){
        console.log(err)
        console.log("Error in joining Group")
        res.status(400).json({error: err, message: "Error in joining Group"})
    }
}

// peer review form
const viewPeerReviewForm = async (req, res) => {
    try{
        var date = new Date()
        var query;
        if(date.getMonth > 8){
            query = { $gte: `${date.getFullYear()}-09-1`, $lte: `${date.getFullYear()+1}-06-1`}
        }else{
            query = { $gte: `${date.getFullYear()-1}-09-1`, $lte: `${date.getFullYear()}-06-1`}
        }
        var forms = await PeerReviewForm.find({ start_of_date: query }).catch((err) => {throw err})
        var student = await Student.findOne({user: req.decoded._id}).catch((err) => {throw err})
        // if student does not response then create new otherwise take old data
        var data = []
        console.log(forms.length)
        for(var i = 0; i < forms.length; i++){
            console.log(forms[i]._id)
            var studentPeerReviewResponse = await StudentPeerReviewResponse.findOne({peerReviewForm: forms[i]._id, student: student._id}).catch((err) => {throw err})
            if(!studentPeerReviewResponse){
                studentPeerReviewResponse = new StudentPeerReviewResponse({
                    student: student._id,
                    peerReviewForm: forms[i]._id,
                    complete: false,
                    response: ''
                })
                await studentPeerReviewResponse.save().catch((err) => {throw err})
            }
            data.push({_id: studentPeerReviewResponse._id, start_of_date: forms[i].start_of_date, end_of_date: forms[i].end_of_date, term: forms[i].term, complete: studentPeerReviewResponse.complete})
        }
        res.status(200).json(data)
    }catch(err){
        res.status(400).json({message: "Unexpected Error in viewing peer review forms", error: err})
    }
}

const viewSpecificPeerReviewForm = async(req, res) => {
    try{
        var studentPeerReviewResponse = await StudentPeerReviewResponse.findOne({_id: req.params.id}).catch((err) => {throw err})
        console.log(studentPeerReviewResponse)
        var peerReviewForm = await PeerReviewForm.findOne({_id: studentPeerReviewResponse.peerReviewForm}).catch((err) => {throw err})
        var questionlist = await Question.find({_id: {$in: peerReviewForm.questions}}).catch((err) => {throw err})
        var student = await Student.findOne({user: req.decoded._id}).populate("user").catch((err) => {throw err})

        console.log(student)

        if(!student.group){
            res.status(400).json({message: "You don't have a approved group yet"})
            return
        }
        var group = await Group.findOne({_id: student.group}).catch((err) => {throw err})
        if(group.status === 'pending'){
            res.status(400).json({message: "You don't have a approved group yet"})
            return
        }
        var others = await Student.find({_id: {$in: group.group_members.filter(member=> !student._id.equals(member))}}).populate("user").catch((err) => {throw err})
        var questions = []
        for(var i = 0; i < questionlist.length; i++){
            if(questionlist[i].question_to == 'Self'){
                questions.push({_id: questionlist[i]._id, question: questionlist[i].question, question_type: questionlist[i].question_type, question_required: questionlist[i].question_required, question_to: questionlist[i].question_to})
            }else{
                questions.push({_id: questionlist[i]._id.toString() + "-" + student.user.username, question: questionlist[i].question, question_type: questionlist[i].question_type, question_required: questionlist[i].question_required, question_to: student.user.username})    
                for(var j = 0; j < others.length; j++){
                    questions.push({_id: questionlist[i]._id.toString() + "-" + others[j].user.username, question: questionlist[i].question, question_type: questionlist[i].question_type, question_required: questionlist[i].question_required, question_to: others[j].user.username})    
                }
            }
        }
        if(studentPeerReviewResponse.response == ''){
            var response = {}
        }else{
            var response = JSON.parse(studentPeerReviewResponse.response)
        }
        res.status(200).json({student_response: response, questions: questions, term: peerReviewForm.term, start_of_date: peerReviewForm.start_of_date, end_of_date: peerReviewForm.end_of_date, submitted_response: studentPeerReviewResponse.response})
    }catch(err){
        console.log(err)
        res.status(400).json({message: "Unexpected Error in viewing peer review forms", error: err})
    }
}

const editSpecificPeerReviewForm = async(req, res) => {
    try{
        if(req.body.id != null){
            //generate the questions list to check the form complete or not
            var studentPeerReviewResponse = await StudentPeerReviewResponse.findOne({_id: req.body.id}).catch((err) => {throw err})
            console.log(studentPeerReviewResponse)
            var peerReviewForm = await PeerReviewForm.findOne({_id: studentPeerReviewResponse.peerReviewForm}).catch((err) => {throw err})
            var questionlist = await Question.find({_id: {$in: peerReviewForm.questions}}).catch((err) => {throw err})
            var student = await Student.findOne({user: req.decoded._id}).catch((err) => {throw err})
            var group = await Group.findOne({_id: student.group}).catch((err) => {throw err})
            var others = await Student.find({_id: {$in: group.group_members.filter(member=> !student._id.equals(member))}}).populate("user").catch((err) => {throw err})
            var questions = []
            for(var i = 0; i < questionlist.length; i++){
                if(questionlist[i].question_to == 'Self'){
                    questions.push({_id: questionlist[i]._id, question: questionlist[i].question, question_type: questionlist[i].question_type, question_required: questionlist[i].question_required, question_to: questionlist[i].question_to})
                }else{
                    for(var j = 0; j < others.length; j++){
                        questions.push({_id: questionlist[i]._id.toString() + "-" + others[j].user.username, question: questionlist[i].question, question_type: questionlist[i].question_type, question_required: questionlist[i].question_required, question_to: others[j].user.username})    
                    }
                }
            }
            var complete = true
            for(var i = 0; i < questions.length; i++){
                if(questions[i].question_required == true){
                    if(req.body.response[questions[i]._id] == null || req.body.response[questions[i]._id] == undefined){
                        complete = false
                        break;
                    }
                }
            }
            studentPeerReviewResponse["complete"] = complete
            studentPeerReviewResponse["response"] = JSON.stringify(req.body.response)
            console.log(studentPeerReviewResponse)
            await studentPeerReviewResponse.save().catch((err) => {throw err})
            res.status(200).json({complete: complete})
        }else{
            res.status(400).json({message: "Missing Student Review Form Number"})
        }        
    }catch(err){
        res.status(400).json({message: "Unexpected Error in viewing peer review forms", error: err})
    }
}


const viewGenrePreferences = async(req, res) => {
    try{
        var student = await Student.findOne({user: req.decoded._id}).catch((err) => {throw err})
        if(!student.preferences){
            res.status(200).json({message: "No student's preferences found"})
            return
        }else{
            res.status(200).json({message: "Student's preferences found", preferences: JSON.parse(student.preferences)})
            return
        }
    }catch(err){
        res.status(400).json({message: "Unexpected Error in viewing student's genre preferences"})
    }
}

const updateGenrePreferences = async(req, res) => {
    try{
        var student = await Student.findOne({user: req.decoded._id}).catch((err) => {throw err})
        if(req.body.AI < 0 && req.body.Blockchains < 0 && req.body.Fintech < 0 && req.body['Web/Mobile Application'] < 0 && req.body['Game Development'] < 0){
            res.status(400).json({message: "Unexpected Value in the ratings"})
            return
        }
        student.preferences = JSON.stringify(req.body)
        await student.save().catch((err) => {throw err})
        res.status(200).json({message: "Update success"})
    }catch(err){
        res.status(400).json({message: "Unexpected Error in viewing student's genre preferences"})
    }
}

const getFYPTopicRecommendation = async(req, res) => {
    try{
        var recommendation = await Recommendation.find().limit(1).sort({$natural:-1}).catch((err) => {throw err})
        if(!recommendation){
            res.status(400).json({message: "Please ask admin to prepare the recommendation system"})
            return
        }else{
            recommendation = recommendation[0]
            if(!recommendation.data || !recommendation.courselist || !recommendation.ratingData || !recommendation.genrelist){
                res.status(400).json({message: "Please ask admin to prepare the recommendation system"})
                return
            }
        }
        var student = await Student.findOne({user: req.decoded._id}).catch((err) => {throw err})
        if(!student.preferences){
            res.status(400).json({message: "Please submit your preferences first"})
            return
        }
        var preferences = JSON.parse(student.preferences)
        var genrelist = JSON.parse(recommendation.genrelist)
        var student_rating_list = genrelist.map((genre) => {return parseInt(preferences[genre])})
        // console.log(student_rating_list)
        var courselist = JSON.parse(recommendation.courselist).slice(0, JSON.parse(recommendation.courselist).length - 2)
        var student_course_list = courselist.map((course) => {return (req.body[course] == undefined)? 0 : parseFloat(req.body[course])})
        // console.log(student_course_list)

        var data = JSON.parse(recommendation.data)
        var ratingData = JSON.parse(recommendation.ratingData)
        var pastStudentList = []
        var pastStudentData = []
        var pastStudentRatingData = []
        // console.log(data)
        // console.log(ratingData)
        Object.keys(data).forEach((user) => {
            if(ratingData[user] != undefined && data[user] != undefined){
                // console.log(ratingData[user].map((input) => {return parseInt(input)}))
                pastStudentList.push(user)
                pastStudentData.push(data[user].slice(0, data[user].length - 2).map((input) => {return parseFloat(input)}))
                pastStudentRatingData.push(ratingData[user].map((input) => {return parseInt(input)}))
            }
        })
        // console.log(pastStudentList)
        console.log("Sending data....")
        const requestOptions = {
            method: "POST",
            body: JSON.stringify({pastStudentList: pastStudentList, pastStudentData: pastStudentData, pastStudentRatingData: pastStudentRatingData, student_course_list: student_course_list, student_rating_list: student_rating_list}),
            headers: new Headers({
                "content-type": "application/json"
            })
        }
        const response = await fetch("http://localhost:5001/recommend", requestOptions).catch((err) => {throw err})
        var output = await response.json()
        output = output.similar_students.map((student) => {
            return [data[student][data[student].length - 2], data[student][data[student].length - 1]]
        })
        console.log(output)
        topic_list = {}
        //same supervisor same genre => same sueprvisor partialy same genre => same genre => partialy genre => same supervisor 
        for(var i = 0; i < output.length; i++){
            var user = await User.findOne({username: output[i][0]}).catch((err) => {throw err})
            if(user == null){
                continue
            }
            var supervisor = await Supervisor.findOne({user: user._id}).catch((err) => {throw err})
            if(supervisor == null){
                continue
            }
            var topic = await Topic.find({supervisor: supervisor._id, genre: output[i][1].split(",")}).catch((err) => {throw err})
            if(topic.length == 0){
                continue
            }
            topic.forEach((topic) => {
                topic_list[topic._id] = {topic_name: topic.topic_name, genre: topic.genre, supervisor: output[i][0]}
            })
        }
        // same supervisor partialy match genre
        if(Object.keys(topic_list).length < 5){
            var obj = {}
            for(var i = 0; i < output.length; i++){
                if(obj[output[i][0]] != undefined){
                    var genres = obj[output[i][0]]
                    genres = Array.from(new Set(genres.concat(output[i][1].split(","))))
                    obj[output[i][0]] = genres
                }else{
                    obj[output[i][0]] = output[i][1].split(",")
                }
            }
            var supervisor_list = Object.keys(obj)
            for(var i = 0; i < supervisor_list.length; i++){
                var user = await User.findOne({username: supervisor_list[i]}).catch((err) => {throw err})
                if(user == null){
                    continue
                }
                var supervisor = await Supervisor.findOne({user: user._id}).catch((err) => {throw err})
                if(supervisor == null){
                    continue
                }
                console.log(obj[supervisor_list[i]])
                var topic = await Topic.find({supervisor: supervisor._id, genre: {$in: obj[supervisor_list[i]]}}).populate({path: 'supervisor', populate:{path: 'user'}}).catch((err) => {throw err})
                if(topic.length == 0){
                    continue
                }
                topic.forEach((topic) => {
                    console.log(topic)
                    topic_list[topic._id] = {topic_name: topic.topic_name, genre: topic.genre, supervisor: topic.supervisor.user.username}
                })
            }
        }
        // same genre any supervisor
        if(Object.keys(topic_list).length < 5){
            for(var i = 0; i < output.length; i++){
                var topic = await Topic.find({supervisor: supervisor._id, genre: output[i][1].split(",")}).populate({path: 'supervisor', populate:{path: 'user'}}).catch((err) => {throw err})
                if(topic.length == 0){
                    continue
                }
                topic.forEach((topic) => {
                    topic_list[topic._id] = {topic_name: topic.topic_name, genre: topic.genre, supervisor: topic.supervisor.user.username}
                })
            }
        }
        if(Object.keys(topic_list).length < 5){
            for(var i = 0; i < output.length; i++){
                
                var topic = await Topic.findOne({$sortByCount: {"$match" : {"genre": {$in: output[i][1].split(",")}}}}).populate({path: 'supervisor', populate:{path: 'user'}}).catch((err) => {throw err})

                if(!topic){
                    continue
                }else{
                    topic_list[topic._id] = {topic_name: topic.topic_name, genre: topic.genre, supervisor: topic.supervisor.user.username}
                }
            }
        }
        //most common genre
        console.log(topic_list)
        res.status(200).json({topic_list})
    }catch(err){
        res.status(400).json({message: "Unexpected Error in viewing student's genre preferences"})
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
        var student = await Student.findOne({user: req.decoded._id}).populate('group').catch((err) => {throw err})
        console.log(student.group.status != "approve")
        if(student.group == undefined || student.group.status != "approve"){
            res.status(400).json({message: "Unexpected Error in viewing schedules", error: "Without an approved Group"})
            return
        }
        console.log(student)
        // if group does not response then create new otherwise take old data
        var data = []
        console.log(schedules)
        for(var i = 0; i < schedules.length; i++){
            var group_schedule = await GroupSchedule.findOne({schedulePeriod: schedules[i]._id, group: student.group}).catch((err) => {throw err})
            if(!group_schedule){
                group_schedule = new GroupSchedule({
                    schedulePeriod: schedules[i]._id,
                    group: student.group,
                    data: ''
                })
                await group_schedule.save().catch((err) => {throw err})
            }
            data.push({_id: group_schedule._id, endOfChanging: schedules[i].endOfChanging, startDate: schedules[i].startDate, endDate: schedules[i].endDate, term: schedules[i].term})
        }
        res.status(200).json(data)
    }catch(err){
        res.status(400).json({message: "Unexpected Error in viewing schedules", error: err})
    }
}

const viewSpecificSchedule = async(req, res) => {
    try{
        var group_schedule = await GroupSchedule.findOne({_id: req.params.id}).populate("schedulePeriod").catch((err) => {throw err})
        var student = await Student.findOne({user: req.decoded._id}).populate("user").catch((err) => {throw err})
        if(group_schedule){
            if(student.group.equals(group_schedule.group)){
                res.status(200).json({student: student.user.username, endOfChanging: group_schedule.schedulePeriod.endOfChanging , startDate: group_schedule.schedulePeriod.startDate , endDate: group_schedule.schedulePeriod.endDate, term: group_schedule.schedulePeriod.term, data: group_schedule.data})
                return
            }else{
                res.status(400).json({message: "Unexpected Error in viewing group's specific schedules", error: "student does not have prviliage to access to this schedule"})
                return
            }
        }else{
            res.status(400).json({message: "Unexpected Error in viewing group's specific schedules", error: "Group Schedule does not find"})
            return
        }
    }catch(err){
        res.status(400).json({message: "Unexpected Error in viewing group's specific schedules", error: err})
    }
}

const updateSpecificSchedule = async(req, res) => {
    try{
        var student = await Student.findOne({user: req.decoded._id}).catch((err) => {throw err})
        var group_schedule = await GroupSchedule.findOne({_id: req.body.id, group: student.group}).populate("schedulePeriod").catch((err) => {throw err})
        if(!group_schedule){
            res.status(400).json({message: "Missing required Group's Schedule"})
            return
        }
        //check update time 
        var endOfChanging = new Date(group_schedule.schedulePeriod.endOfChanging)
        endOfChanging.setDate(endOfChanging.getDate() + 1)
        var tdy = new Date()
        if(tdy > endOfChanging){
            res.status(400).json({message: "Unexpected Error in updating specific supervisor's schedules.", error: "No longer allow updating schedule"})
            return
        }
        //all date check
        const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
        const months = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        date = []
        var startDate = new Date(group_schedule.schedulePeriod.startDate)
        var endDate = new Date(group_schedule.schedulePeriod.endDate)
        endDate.setDate(endDate.getDate() + 1)
        var countDate = startDate
        while(countDate < endDate){
            if(countDate.getDay() !== 0 && countDate.getDay() !== 6){
                var key = `${months[countDate.getMonth()]}${countDate.getDate()}-${days[countDate.getDay()]}`
                date.push(key)
            }
            countDate.setDate(countDate.getDate() + 1)
        }
        if(!date.every(item => req.body.data.hasOwnProperty(item))){
            res.status(400).json({message: "Wrong data received"})
            return
        }
        //all timeslot check 
        const timeslot = ["9:00", "9:20", "9:40", "10:00", "10:20", "10:40", "11:00", "11:20", "11:40", "12:00", "12:20", "12:40", "13:00", "13:20", "13:40", "14:00", "14:20", "14:40", "15:00", "15:20", "15:40", "16:00", "16:20", "16:40","17:00", "17:20", "17:40"] 
        Object.keys(req.body.data).forEach((date) => {
            if(!timeslot.every(item => req.body.data[date].hasOwnProperty(item))){
                res.status(400).json({message: "Wrong data received"})
                return
            }
        })
        // update data
        group_schedule.data = JSON.stringify(req.body.data)
        await group_schedule.save().catch((err) => {throw err})
        res.status(200).json({message: "Successfully Updated Group's Schedule"})
    }catch(err){
        res.status(400).json({message: "Unexpected Error in updating specific groups's schedules", error: err})
    }
}





module.exports = { viewTopic, viewSpecificTopic, createGroup, joinGroup,
                   viewPeerReviewForm, viewSpecificPeerReviewForm, editSpecificPeerReviewForm,
                   viewGenrePreferences, updateGenrePreferences, getFYPTopicRecommendation,
                   viewSchedule, viewSpecificSchedule, updateSpecificSchedule
                 }
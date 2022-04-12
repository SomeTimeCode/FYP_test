const jwt = require('jsonwebtoken')
const User = require('../models/userModel')
const Admin = require('../models/adminModel')
const Supervisor = require('../models/supervisorModel')
const Student = require('../models/studentModel')


const verifyToken = (req, res, next) => {
    let token = req.headers['x-access-token'] || req.headers['authorization'] || '';

    if(token) {
        if (token.startsWith('Bearer ')) {
            // Remove Bearer from string
            token = token.slice(7, token.length); 
        }
        jwt.verify(token, process.env.jwt_secret, (err, decoded) => {
            if(err){
                res.status(401).json({message: "Unauthorized!"})
                return
            }
            req.decoded = decoded;
            next();
        })
        
    }else{
        return res.status(403).json({message: "Missing Authorize Token"})
    }
}

const verifyAdmin = async (req, res, next) => {
    var admin = await Admin.findOne({ user: req.decoded._id })
    if(admin){
        console.log('User is found in Admin')
        next()
    }else{
        console.log('User is not found in the Admin')
        res.status(401).json({message: "Access is denied. Only Admin is allowed"})
    }
}

const verifySupervisor = async (req, res, next) => {
    var supervisor = await Supervisor.findOne({ user: req.decoded._id })
    if(supervisor){
        console.log('User is found in Supervisor')
        next()
    }else{
        console.log('User is not found in the Supervisor')
        res.status(401).json({message: "Access is denied. Only Supervisor is allowed"})
    }
}

const verifyStudent = async (req, res, next) => {
    var student = await Student.findOne({ user: req.decoded._id })
    if(student){
        console.log('User is found in Student')
        next()
    }else{
        console.log('User is not found in the Student')
        res.status(401).json({message: "Access is denied. Only Student is allowed"})
    }
}

module.exports = { verifyToken, verifyAdmin, verifyStudent, verifySupervisor }
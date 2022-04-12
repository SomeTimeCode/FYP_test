const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');



const checkToken = async (req, res) => {
    try{
        var user = await User.findOne({ _id: req.decoded._id }).catch((err) => {throw err})
        if(user.role.toLowerCase() != req.params.role.toLowerCase()){
            console.log("Wrong token")
            res.status(400).json({message: "Wrong token or role"})
            return
        }else{
            res.status(200).json({message: "OK"})
            return
        }
    }catch(err){
        console.log("Fail to check token")
        res.status(400).json({error: err, message: "Fail to check token"})
        return
    }
}

const login = async (req, res) => {
    try{
        console.log(req.body)
        if(!(req.body.username && req.body.password)){
            res.status(400).json({message: "Missing username or password"})
            return
        }
        var user = await User.findOne({ username: req.body.username }).catch((err) => {
            throw err
        })
        if(!user){
            console.log("Wrong username")
            res.status(400).json({message: "Wrong username or password"})
            return
        }else{
            if(bcrypt.compareSync(req.body.password, user.password)){
                const {__v, password, ...rest} = user._doc    
                const token = jwt.sign(rest, process.env.jwt_secret, {expiresIn: '1d'});
                rest['token'] = token
                res.status(200).json(rest);
                return
            }else{
                console.log("Wrong password")
                res.status(400).json({message: "Wrong username or password"})
                return
            }
        }
    }catch(err){
        console.log("Fail to login")
        res.status(400).json({error: err, message: "Fail to login"})
        return
    }
}

module.exports = { login, checkToken }
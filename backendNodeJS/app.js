const express = require('express');
const morgan = require('morgan')
const mongoose = require('mongoose')
const cors = require('cors');
const bodyParser = require('body-parser')
const apiRouter = require('./src/routes/index')
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 5000;

app.use(morgan('dev'))

const corsOptions = {
    origin: "http://localhost:3000",
    methods: "GET,POST",
};
  
app.use(cors(corsOptions));


// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())


// setting the app routing

app.get("/", (req, res) => {
    res.status(200).json({ message: "Welcome to RayRay application." });
});

app.use("/api", apiRouter)



const main = async () => {
    await mongoose.connect(process.env.DB_URI, {useNewUrlParser: true}).then(() => console.log(`Connected to the DB`)).catch((err) => {throw err});
    await app.listen(PORT, () => {
        console.log(`NodeJS server is running in port ${PORT}`)
    });
}

process.on('SIGINT', () => {
    mongoose.disconnect().then(() =>{
        console.log('Disconnected to the DB due to the app termination');
        process.exit(0);
    });
})

main()
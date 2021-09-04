var express = require('express');
var mongoose = require('mongoose');
var dns = require('dns');
var app = express();
var normalizeUrl = require('normalize-url');

require('dotenv').config();

// Enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// So that API is remotely testable by FCC 
var cors = require('cors');
app.use(cors({optionsSuccessStatus: 200}));  // some legacy browsers choke on 204

// Connect to my Mongoose DB Atlas account
mongoose.connect(process.env.MONGO_URI, {
    useUnifiedTopology: true,
    useNewUrlParser: true
});

const { Schema } = mongoose;

// Create schema
const urlSchema = new Schema({
    number: {type: Number, required: true},
    url: {type: String, required: true},
    date: {type: Date, default: Date.now}
});

let Url = mongoose.model('Url', urlSchema);

// Mount the middleware to serve the style sheets in the public folder
app.use("/public", express.static(__dirname + "/public"));

// Mount the body parser as middleware
app.use(express.json());
app.use(express.urlencoded( {extended: true} ));

app.set('view engine', 'ejs');

// Display the index page for GET requests to the root path 
app.route('/').get((req, res) => {
    
    // If using index.html ...
    // res.sendFile(__dirname + "/views/index.html");

    // If using index.ejs ...
    Url.find({}, (error, data) => {
        if (error) return console.log(error);

        const database = data;
        //console.log(database);
        res.render('index', { database: database });
    });

});

app.get('/api/shorturl/:number', (req, res) => {

    // Get the number parameter from the subdirectory
    // There's no need to convert this to a Number
    // JS will convert the types automatically when comparing them
    // In JS, '1' == 1 evaluates to true whilte '1' === 1 evaluates to false
    var urlID = req.params.number;

    // Search for the url 
    Url.findOne({ number: urlID }, (error, data) => {
        if (error) {
            res.status(500).send(error);
            return console.log(error);
        }
        if (data) {
            res.redirect(data.url);
        }
        else {
            res.json({ "error" : "No short URL found for the given input" });
        }
    });

});

app.post('/api/shorturl', (req, res) => {

    // Get the "url" text from the form 
    var urlEntered = req.body.url;

    console.log(urlEntered);

    // Check if the url is blank
    if (!urlEntered) {
        res.json({ error: "Invalid URL" });
        return;
    }

    /*
        Is there a connection between the rrtype A and HTTP and the rrtype AAAA and HTTPS?

        var resourceRecordType = '';

        if (urlEntered.match(/^http:\/\//)) {
            resourceRecordType = 'A';
        } else if (urlEntered.match(/^https:\/\//)) {
            resourceRecordType = 'AAAA';
        } else {
            res.json({ error: "Invalid URL" });
            return;
        }
    */

    // There's no need to normalize the URL
    // Remove the http or https protocol of the url entered
    // const urlStripped = normalizeUrl(urlEntered, { stripProtocol: true });
    
    var urlParsed;

    // Parse the url entered 
    try {
        urlParsed = new URL(urlEntered);
    } catch (error) {
        res.json({ error: "Invalid URL" });
        console.log(error);
        return;
    }
    
    
    dns.resolve(urlParsed.protocol ? urlParsed.host : urlParsed.pathname, (error, value) => {
        if (error) {
            res.json({ error: "Invalid URL" });
            console.log(error.code);
            return;
        }

        // Optional change to force all links to have the protocol HTTP://
        // Normalize the URL forcing the link to being with http
        // By default, the stripWWW option is set to true
        // var urlNormalized = normalizeUrl(urlStripped, { forceHttp: true });

        console.log(value);

        // Attempt to find the normalized url in the Mongo DB
        Url.findOne({ url: urlEntered }, (error, data) => {
            if (error) {
                res.status(500).send(error);
                return console.log(error);
            }
            var results = data; // results will be null if no matches are found 

            if (!results) { // Add a Url object if no matches are found
                // Get the count of entries in the database
                Url.count({}, (error, data) => {
                    if (error) {
                        res.status(500).send(error);
                        return console.log(error);
                    }
                    
                    // Find the next id number available
                    var count = data;
                    var currentNumber = count + 1;

                    // Create new Url object for MongoDB
                    const newUrl = new Url({
                        number: currentNumber,
                        url: urlEntered
                    });
            
                    // Save the new Url object in the database
                    newUrl.save((err, data) => {
                        if (err) return console.log(err);
                        console.log(data);
                    });
            
                    // Send a json response
                    res.json({ original_url: urlEntered, short_url: currentNumber });

                });
            } else { // Return a JSON object with the already established short URL
                res.json({ original_url: data.url, short_url: data.number });
            }

        });
     });
});

app.get('/api/shorturls', (req, res) => {
    Url.find({}, (error, data) => {
        if (error) return console.log(error);
        console.log(data);
        res.json(data);
    });
})

// Get the port of the server or assign one of 3000
var port = process.env.PORT || 3000;

// Listen on the port found (or 3000)
app.listen(port, () => console.log(`Node is listening on port ${port}...`));
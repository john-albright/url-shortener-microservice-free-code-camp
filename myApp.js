var express = require('express');
var mongoose = require('mongoose');
var dns = require('dns');
var app = express();
var normalizeUrl = require('normalize-url');

require('dotenv').config();

// Connect to my Mongoose DB Atlas account
mongoose.connect(process.env.MONGO_URI, {
    useUnifiedTopology: true,
    useNewUrlParser: true
});

const { Schema } = mongoose;

const urlSchema = new Schema({
    number: {type: Number, required: true},
    url: {type: String, required: true},
    date: {type: Date, required: true}
});

let Url = mongoose.model('Url', urlSchema);

// Mount the middleware to serve the style sheets in the public folder
app.use("/public", express.static(__dirname + "/public"));

// Mount the body parser as middleware
app.use(express.json());
app.use(express.urlencoded( {extended: true} ));

// Display the index page for GET requests to the root path 
app.route('/').get((req, res) => {
    res.sendFile(__dirname + "/views/index.html");

    /*dns.resolve('//mongoosejs.com', (err, address, family) => {
        if (err) {
            console.log(err);
            return;
        }
        console.log(address, family);
    });

    console.log(normalizeUrl('htt://www.wikipedia.org', {stripProtocol: true}));

    console.log(normalizeUrl('http://www.wikipedia.org', { forceHttps: true }));

    Url.findOneAndUpdate({ number: 1 }, { url: normalizeUrl('duckduckgo.com', { forceHttps: true })}, (error, data) => {
        if (error) return console.log(error);
        console.log(data);
    })

    Url.remove({ number: 2 }, (error, data) => {
        if (error) return console.log(error);
        console.log(data);
    })*/

}).post((req, res) => {

    // Get the "url" text from the form 
    var urlEntered = req.body.url;

    // Remove the http or https protocol of the url entered
    var urlStripped = normalizeUrl(urlEntered, { stripProtocol: true })

    dns.resolve(urlStripped, (error, value) => {
        if (error) {
            res.json({ error: "invalid url" });
            console.log(error, value);
            console.log(error.code);
            return;
        }
        
        // Normalize the URL forcing the link to being with https 
        // By default, the stripWWW option is set to true
        var urlNormalized = normalizeUrl(urlStripped, { forceHttps: true });

        // Attempt to find the normalized url in the Mongo DB
        Url.findOne({ url: urlNormalized }, (error, data) => {
            if (error) return console.log(error);

            var results = data; // results will be null if no matches are found 

            if (!results) { // Add a Url object if no matches are found
                // Get the count of entries in the database
                Url.count({}, (error, data) => {
                    if (error) return console.log(error);
                    
                    // Find the next id number available
                    var count = data;
                    var currentNumber = count + 1;

                    // Create new Url object for MongoDB
                    const newUrl = new Url({
                        number: currentNumber,
                        url: urlNormalized,
                        date: new Date()
                    });
            
                    // Save the new Url object in the database
                    newUrl.save((err, data) => {
                        if (err) return console.log(err);
                        console.log(data);
                    });
            
                    // Send a json response
                    res.json({ original_url: urlNormalized, short_url: currentNumber });

                });
            } else { // Return a JSON object with the already established short URL
                res.json({original_url: data.url, short_url: data.number });
            }

        });
     });
});

app.get('/api/shorturl/:number', (req, res) => {

    // Get the number parameter from the subdirectory
    var urlID = new Number(req.params.number);

    // Search for the url 
    Url.findOne({ number: urlID }, (error, data) => {
        if (error) return console.log(error);

        res.redirect(data.url);
    });

});

app.get('/api/shorturl/', (req, res) => {
    Url.find({}, (error, data) => {
        if (error) return console.log(error);
        console.log(data);
        res.json(data);
    });
});

// Get the port of the server or assign one of 3000
var port = process.env.PORT || 3000;

// Listen on the port found (or 3000)
app.listen(port, () => console.log(`Node is listening on port ${port}...`));
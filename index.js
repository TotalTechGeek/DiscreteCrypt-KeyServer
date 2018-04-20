const express = require('express')
const app = express()
const config = require('./config.js').data
const compression = require('compression')
const bodyparser = require('body-parser')
const security = require('./security.js')(config)
const DataStore = require("nedb")
const PORT = config.port

var db = {}

db.contacts = new DataStore({ filename: 'file.nedb', autoload: true })


app.use(express.static(__dirname + '/public'))
app.use(compression())
app.use(bodyparser.json())
app.use(bodyparser.urlencoded({ extended: true }))

function alias(from, to)
{
    app.get(from, (req, res) =>
    {
        res.redirect(to)
    })
}

function grab(req, val)
{
    return req.body[val] || req.query[val]
}

alias('/', '/index.html')
alias('/list', '/contacts.html')

app.listen(PORT, () =>
{
    console.log(`Listening on ${PORT}`)
});


app.post('/contact/publish/request', (req, res) => 
{
    var contact = req.body.contact

    var trial = security.exchangeTrial(contact)

    trial.then(challenge =>
    {
        res.json(challenge)
    })
})


app.post('/contact/get/names', (req, res) =>
{
    db.contacts.find({}, {name: 1, "contact.person.identity" : 1, _id: 0}, (err, docs) =>
    {
        docs.forEach(i=>{
            let id = i.contact.person.identity
            delete i.contact
            i.identity = id
        })

        res.json(docs)
    })
})

app.post('/contact/get', (req, res) =>
{
    let name = grab(req, "name").trim()
    db.contacts.find({ name: name }, {_id: 0}, (err, docs) => { 
        res.json(docs)
    })
})

app.post('/contact/search/:name', (req, res) =>
{
    let name = req.params.name.trim()
    db.contacts.find({ name: new RegExp(name) }, {name: 1, _id: 0}, (err, docs) => { 
        res.json(docs.map(i=>i.name))
    })
})


// Todo: Provide a way to download binary contacts from the server. 

// Modify this to allow people to revoke their own keys from the server.
app.post('/contact/publish/confirm', (req, res) =>
{
    let response = req.body.response 
    let contact = req.body.contact
    let name = req.body.name.trim()

    if(typeof name !== "string")
    {
        res.json(false)
        return;
    }

    response = security.verifyHmac([response.data, JSON.stringify(contact)], response.hmac);

    if(response)
    {

        db.contacts.find({ name: name }, function(err, docs)
        {
            if(docs.length === 0)
            {
                db.contacts.insert({name: name, contact: contact})
                res.json(true)
            }
            else
            {
                res.json(false)
            }
                
        })
        
    }
    else res.json(false)
})
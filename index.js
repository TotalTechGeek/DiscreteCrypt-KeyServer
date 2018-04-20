const express = require('express')
const app = express()
const config = require('./config.js').data

if(process.env.SECRET_SECURITY_KEY)
{
    config.security.key = process.env.SECRET_KEY;
}

const compression = require('compression')
const bodyparser = require('body-parser')
const utilities = require('./utilities.js')
const security = require('./security.js')(config)
const DataStore = require("nedb")
const PORT = process.env.OPENSHIFT_NODEJS_PORT ||  process.env.OPENSHIFT_INTERNAL_PORT || process.env.PORT || config.port
const IP = process.env.OPENSHIFT_NODEJS_IP || process.env.OPENSHIFT_INTERNAL_IP || 'localhost'



let db = {}

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
alias('/create', '/create.html')

app.listen(PORT, IP, () =>
{
    console.log(`Listening on ${PORT}`)
});


app.post('/contact/publish/request', (req, res) => 
{
    let contact = req.body.contact
    let trial = security.exchangeTrial(contact)

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


function downloadBinaryContact(req, res)
{
    let name = grab(req, "name").trim()
    db.contacts.find({name: name}, {_id: 0}, (err, docs) =>
    {
        if(docs.length)
        {
            var data =  utilities.exportContact(docs[0].contact)
            res.header('Content-Type', 'application/octet-stream')
            res.header('Content-Length', data.length),
            res.header('Content-Disposition', 'attachment;filename=' + name + '.contact')
            res.end(data, 'binary')
        }
        else
        {
            res.json(false)   
        }
    })
}


// To-do: Provide a way to download binary contacts from the server. 
app.post('/contact/get/binary', downloadBinaryContact)
app.get('/contact/get/binary', downloadBinaryContact)

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
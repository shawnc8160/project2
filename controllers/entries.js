/*---------------------------------------------------
Dependencies
---------------------------------------------------*/
const express = require('express');
const entriesRouter = express.Router();
const Users = require('../models/users.js');
const Entries = require('../models/entries.js');

/*---------------------------------------------------
Route (GET) for new entry form
---------------------------------------------------*/
entriesRouter.get('/new', (req, res) => {
    if (req.session.currentUser) {
        res.render('./entries/new.ejs', {
            currentUser: req.session.currentUser
        });
    } else {
        res.send('You must login to create an entry')
    }
})

/*---------------------------------------------------
Route (POST) to create new entry
---------------------------------------------------*/
entriesRouter.post('/', (req, res) => {
    if (req.session.currentUser) {
        req.body.img = req.body.img.filter(Boolean);
        req.body.owner = req.session.currentUser._id
        Entries.create(req.body, (err, data) => {
            if (err) {
                res.send('Error creating entry: ' + err)
            } else {
                res.redirect('/users/' + req.session.currentUser.username);
            }
        })
    } else {
        res.send('You must login to create an entry');
    }
})

/*---------------------------------------------------
Route (GET) to edit entry page
---------------------------------------------------*/
entriesRouter.get('/:entryId/edit', (req, res) => {
    let currentUser = null;
    if (req.session.currentUser) {
        currentUser = req.session.currentUser;
    }
    Entries.findById(req.params.entryId, (err, result) => {
        res.render('./entries/edit.ejs', {
            currentUser: req.session.currentUser,
            currentEntry: result,
        });
    })
})

/*---------------------------------------------------
Route for entry update
---------------------------------------------------*/
entriesRouter.put('/:entryId', (req, res) => {
    // Retrieve entry so that we can get the owner id
    Entries.findById(req.params.entryId, (err, result) => {
        if (!err && result) {
            if(req.session.currentUser._id === result.owner) {
                Entries.findByIdAndUpdate(req.params.entryId, req.body, { new: true }, (err, res) => {
                    console.log('Updated entry', res);
                })
            }
        }
    })
    res.redirect('/entries/'+req.params.entryId);
    
})

/*---------------------------------------------------
Route for entry delete
---------------------------------------------------*/
entriesRouter.delete('/:entryId', (req, res) => {
    // Retrieve entry so that we can get the owner id
    Entries.findById(req.params.entryId, (err, result) => {
        if (!err && result) {
            // Check if logged in user is the owner
            if (req.session.currentUser._id === result.owner) {
                Entries.findByIdAndRemove(req.params.entryId, (err, result) => {
                    if (err) {
                        console.log('Error while deleting entry', err);
                    } else {
                        console.log('Removed entry: ', result);
                    }
                })
            }
        }
    })
    res.redirect('/users/'+req.session.currentUser.username);

})

/*---------------------------------------------------
Route (GET) to show entry detail page
---------------------------------------------------*/
entriesRouter.get('/:entryId', (req, res) => {
    let currentUser = null;
    if (req.session.currentUser) {
        currentUser = req.session.currentUser;
    } 
    let owner = false;
    Entries.findById(req.params.entryId, (err, result) => {
        if (req.session.currentUser && (result.owner === req.session.currentUser._id)) {
            owner = true;
        }
        res.render('./entries/show.ejs', {
            currentUser: req.session.currentUser,
            currentEntry: result,
            owner: owner
        });
    })
})

// Export entries router
module.exports = entriesRouter;
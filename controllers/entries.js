/*---------------------------------------------------
Dependencies
---------------------------------------------------*/
const express = require('express');
const entriesRouter = express.Router();
const Users = require('../models/users.js');
const Entries = require('../models/entries.js');
const moment = require('moment');

/*---------------------------------------------------
Route (GET) for index
---------------------------------------------------*/
entriesRouter.get('/', (req, res) => {
    // Get the latest entries
    Entries.find({}).sort({ date: -1 }).exec((err, result) => {
        if (!err && result) {
            res.render('./entries/index.ejs', {
                currentUser: req.session.currentUser,
                userEntries: result
            })
        }
    })
})

/*---------------------------------------------------
Route (GET) for new entry form
---------------------------------------------------*/
entriesRouter.get('/new', (req, res) => {
    if (req.session.currentUser) {
        res.render('./entries/new.ejs', {
            currentUser: req.session.currentUser
        });
    } else {
        res.send('You must login to create an entry');
    }
})

/*---------------------------------------------------
Route (POST) to create new entry
---------------------------------------------------*/
entriesRouter.post('/', (req, res) => {
    if (req.session.currentUser) {
        if (!req.body.img || req.body.img.length === 0) {
            req.body.img = ["http://via.placeholder.com/600x500"]
        } else {
            req.body.img = req.body.img.filter(Boolean);
        }
        req.body.owner = req.session.currentUser._id;
        req.body.favorited = 0;
        Entries.create(req.body, (err, data) => {
            if (err) {
                res.send('Error creating entry: ' + err);
            } else {
                res.redirect('/users/' + req.session.currentUser.username);
            }
        })
    } else {
        res.send('You must login to create an entry');
    }
})

/*---------------------------------------------------
Route (GET) to add favorite
---------------------------------------------------*/
entriesRouter.get('/:entryId/favorite', (req, res) => {
    if (req.session.currentUser) {
        Users.findOneAndUpdate({_id: req.session.currentUser._id}, 
            { $push: { favorites: req.params.entryId} }, 
            (err, result) => {
                if (!err && result) {
                    // Add to current session
                    if (req.session.currentUser.favorites) {
                        req.session.currentUser.favorites.push(req.params.entryId);
                    } else {
                        req.session.currentUser.favorites = [req.params.entryId];
                    }
                    
                    //Increment the counter
                    Entries.findByIdAndUpdate(req.params.entryId, 
                        {$inc: {favorited: 1}}, 
                        (err, result) => {
                            if (err) {
                                console.log('Error while trying to increment favorites', err);
                            }
                        }
                    )
                }
                res.redirect('/entries/' + req.params.entryId)
            }
        )
    }
})

/*---------------------------------------------------
Route (POST) to add comment
---------------------------------------------------*/
entriesRouter.post('/:entryId/message', (req, res) => {
    if (req.session.currentUser) {
        // format the comment object
        req.body.date = new Date();
        req.body.author = {id: req.session.currentUser._id, username: req.session.currentUser.username}
        // Push it onto the entries comment property
        Entries.findByIdAndUpdate(req.params.entryId, {$push: {messages: req.body}}, (err, result) => {
            if (err) {
                console.log('Error trying to update comment');
                
            } else {
                res.redirect('/entries/' + req.params.entryId)
            }
        })
    }
})

/*---------------------------------------------------
Route (DELETE) to remove favorite
---------------------------------------------------*/
entriesRouter.delete('/:entryId/favorite', (req, res) => {
    if (req.session.currentUser) {
        Users.findOneAndUpdate({ _id: req.session.currentUser._id },
            { $pull: { favorites: req.params.entryId } },
            (err, result) => {
                if (!err && result) {
                    // Remove from current session
                    console.log('favorite before removal - current session favorites', req.session.currentUser.favorites);
                    
                    
                    req.session.currentUser.favorites = req.session.currentUser.favorites.filter((fav) => {
                        console.log(fav !== req.params.entryId);
                        return fav !== req.params.entryId;
                    })
                    console.log('favorite after removal - current session favorites', req.session.currentUser.favorites);
                    //decrement the counter
                    Entries.findByIdAndUpdate(req.params.entryId,
                        { $inc: { favorited: -1 } },
                        (err, result) => {
                            if (err) {
                                console.log('Error while trying to increment favorites', err);
                            }
                        }
                    )
                    res.redirect('/entries/' + req.params.entryId)
                }
            }
        )
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
    req.body.img = req.body.img.filter(Boolean);
    // Retrieve entry so that we can get the owner id
    Entries.findById(req.params.entryId, (err, result) => {
        if (!err && result) {
            if(req.session.currentUser && (req.session.currentUser._id === result.owner)) {
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
    let owner = false;
    let foundFave = false;
    // Retrieve entry
    Entries.findById(req.params.entryId, (err, foundEntry) => {
        // Are they signed in?
        if (req.session.currentUser) {
            currentUser = req.session.currentUser;
            // Check if they're the owner
            if (foundEntry.owner === req.session.currentUser._id) {
                owner = true;
                res.render('./entries/show.ejs', {
                    currentUser: req.session.currentUser,
                    currentEntry: foundEntry,
                    owner: owner,
                    favorite: foundFave,
                    moment: moment
                });
            // Not owner and signed in, find if its been favorited by the user
            } else {
                //Check favorites property to see if entry is present
                for (let favorite of req.session.currentUser.favorites) {                        
                    if(favorite === req.params.entryId) {
                        console.log('They are a match');
                        foundFave = true;
                    }
                }
                // Check is finished, render the page
                res.render('./entries/show.ejs', {
                    currentUser: req.session.currentUser,
                    currentEntry: foundEntry,
                    owner: owner,
                    favorite: foundFave,
                    moment: moment
                });
            }
        // Not signed in, send them off to the page
        } else {
            res.render('./entries/show.ejs', {
                currentUser: currentUser,
                currentEntry: foundEntry,
                owner: owner,
                favorite: foundFave,
                moment: moment
            });
        }
    })
})

// Export entries router
module.exports = entriesRouter;
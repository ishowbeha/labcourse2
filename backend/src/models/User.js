// This file redirects to the new MySQL models
// For backward compatibility with existing code
const { User } = require('./mysql');
module.exports = User;

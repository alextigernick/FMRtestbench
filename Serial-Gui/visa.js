const visa = require('./ni-visa/ni-visa.js');
[status, sesn] = visa.viOpenDefaultRM();
module.exports = sesn;
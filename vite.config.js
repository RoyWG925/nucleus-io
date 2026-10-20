const fs = require('fs');

module.exports = {
    root: fs.realpathSync(process.cwd()),
};

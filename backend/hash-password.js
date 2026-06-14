const bcrypt = require('bcrypt');
bcrypt.hash('#JGAME2.0#', 10).then(h => console.log(h));
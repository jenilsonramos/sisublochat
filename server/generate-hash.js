import bcrypt from 'bcryptjs';

const password = '125714Ab#';
const saltRounds = 10;

bcrypt.hash(password, saltRounds).then(hash => {
    console.log(hash);
});

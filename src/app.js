const express = require('express');         // server
const bodyParser = require('body-parser');  // convert json file to object
const jwt = require('jsonwebtoken');      //to make tokan
const bcrypt = require('bcrypt');         // encript password
const middleware = require('./middleware');  // it is middleware
const cors = require('cors');                  

const db = require('./config/db');       

const app = express();
const PORT = 3002;

app.use(bodyParser.json());

app.use(cors());

app.get('/api/protected', middleware.checkTokenExpiration, async (req, res) => {
    try {
      res.json({ message: 'This is a protected route' });
    } catch (error) {
      console.error('Error in /api/protected:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });



  app.post('/api/signin', async (req, res) => {
    const { identifier, password, googleId } = req.body;
  
    if (googleId) {
      const user = await getUserByGoogleId(googleId);
  
      if (user) {
        const token = jwt.sign({ userId: user.id }, 'your_secret_key', { expiresIn: '30s' });
        const expirationTime = new Date().getTime() + 60000;
        await insertSession(user.id, token, expirationTime);
  
        return res.json({ token });
      }
    }
  
  const isEmail = isNaN(identifier); 
  const isNumber = !isNaN(identifier) && identifier.length === 10; 

  if (!isEmail && !isNumber) {
    return res.status(400).json({ message: 'Invalid email or number format' });
  }

  let user;

  if (isEmail) {
   
    user = await getUserByEmail(identifier);
  } else if (isNumber) {
   
    user = await getUserByNumber(identifier);
  }
  

  if (user && await bcrypt.compare(password, user.password)) {

    const token = jwt.sign({ userId: user.id }, 'your_secret_key', { expiresIn: '30s' });



    const expirationTime = new Date().getTime() + 60000; 
    await insertSession(user.id, token, expirationTime);

    return res.json({ token });
  } else {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  
  return res.status(401).json({ message: 'Invalid email, number, or password' });
  });
  
  async function getUserByGoogleId(googleId) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM Users WHERE google_id = ?', [googleId], (err, results) => {
        if (err) reject(err);
        resolve(results[0]);
      });
    });
  }

  


// app.post('/api/signin', async (req, res) => {
//   console.log(req)
//   const { identifier, password } = req.body;

//   const isEmail = isNaN(identifier); 
//   const isNumber = !isNaN(identifier) && identifier.length === 10; 

//   if (!isEmail && !isNumber) {
//     return res.status(400).json({ message: 'Invalid email or number format' });
//   }

//   let user;

//   if (isEmail) {
   
//     user = await getUserByEmail(identifier);
//   } else if (isNumber) {
   
//     user = await getUserByNumber(identifier);
//   }
  

//   if (user && await bcrypt.compare(password, user.password)) {

//     const token = jwt.sign({ userId: user.id }, 'your_secret_key', { expiresIn: '30s' });



//     const expirationTime = new Date().getTime() + 60000; 
//     await insertSession(user.id, token, expirationTime);

//     res.json({ token });
//   } else {
//     res.status(401).json({ message: 'Invalid email or password' });
//   }
// });


app.post('/api/signout', async (req, res) => {
  const token = req.headers.authorization;


  await deleteSession(token);

  res.json({ message: 'Sign-out successful' });
});


app.get('/api/timeout', async (req, res) => {
  const token = req.headers.authorization;


  const session = await getSessionByToken(token);

  if (session && session.expiration_time > new Date().getTime()) {
    res.json({ message: 'Session is valid' });
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});



async function getUserByEmail(identifier) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM Users WHERE email = ?', [identifier], (err, results) => {
      if (err) reject(err);
      resolve(results[0]);
    });
  });
}

async function getUserByNumber(identifier) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM Users WHERE number = ?', [identifier], (err, results) => {
      if (err) reject(err);
      resolve(results[0]);
    });
  });
}

async function insertSession(userId, token, expirationTime) {
  return new Promise((resolve, reject) => {
    db.query('INSERT INTO Sessions (user_id, token, expiration_time) VALUES (?, ?, ?)', [userId, token, expirationTime], (err) => {
      if (err) reject(err);
      resolve();
    });
  });
}


async function deleteSession(token) {
  token = token?.split(' ')[1];
    return new Promise((resolve, reject) => {
      db.query('DELETE FROM Sessions WHERE token = ?', [token], (err) => {
        if (err) {
          console.error('Error deleting session from the database:', err);
          reject(err); 
        } else {
          console.log('Session deleted successfully');
          resolve(); 
        }
      });
    });
  }
  
async function getSessionByToken(token) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM Sessions WHERE token = ?', [token], (err, results) => {
      if (err) reject(err);
      resolve(results[0]);
    });
  });
}

app.post('/api/register', async (req, res) => {
  const { email, number, password, name, googleId } = req.body;

  if (googleId) {
    const existingGoogleUser = await getUserByGoogleId(googleId);

    if (existingGoogleUser) {
      return res.status(400).json({ message: 'User with Google ID already registered' });
    }

    // Continue with Google registration logic
    await insertGoogleUser(email, name, googleId);

    return res.json({ message: 'Google registration successful' });
  }

  // Continue with existing logic for regular registration
  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    return res.status(400).json({ message: 'Email already registered' });
  }

  await insertUser(email, number, password, name);
  res.json({ message: 'Registration successful' });
});

async function getUserByGoogleId(googleId) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM Users WHERE google_id = ?', [googleId], (err, results) => {
      if (err) reject(err);
      resolve(results[0]);
    });
  });
}

async function insertGoogleUser(email, name, googleId) {
  return new Promise((resolve, reject) => {
    db.query(
      'INSERT INTO Users (email, name, google_id) VALUES (?, ?, ?)',
      [email, name, googleId],
      (err) => {
        if (err) {
          console.error('Error inserting Google user into the database:', err);
          reject(err);
        } else {
          console.log('Google user inserted successfully');
          resolve();
        }
      }
    );
  });
}


// app.post('/api/register', async (req, res) => {
//     const { email, number, password, name } = req.body;
//     const existingUser = await getUserByEmail(email);
  
//     if (existingUser) {
//       return res.status(400).json({ message: 'Email already registered' });
//     }
  
   
//     await insertUser(email, number, password, name);
//     res.json({ message: 'Registration successful' });
//   });


  async function insertUser(email, number, password, name) {
    return new Promise((resolve, reject) => {
      
    bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
        if (hashErr) {
          reject(hashErr);
          return;
        }
  
        db.query(
          'INSERT INTO Users (email, number, password, name) VALUES (?, ?, ?, ?)',
          [email, number, hashedPassword, name],
          (insertErr) => {
            if (insertErr) {
              reject(insertErr);
              return;
            }
            resolve();
          }
        );
      });
    });
  }
const db = require('./config/db');

const jwt = require('jsonwebtoken');


// function generateToken(userId) {
//   return jwt.sign({ userId }, 'your_secret_key',{ algorithm: 'HS256' }); 
// }


 function checkTokenExpiration(req, res, next) {
  const token = req.headers.authorization.split(' ')[1];;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }


jwt.verify(token, 'your_secret_key', { algorithm: 'HS256' }, async (err, decoded) => {
    if (err) {
      
      console.error('Token verification failed');
      return res.status(401).json({ message: 'Token Verificatin failed' });

     
    } else {
      try {
       
        const expirationTimeFromDatabase = await getExpirationTimeFromDatabase(decoded.userId,token);
  
        if (expirationTimeFromDatabase && expirationTimeFromDatabase > Date.now() / 1000) {
        
          console.log('Token is valid');
          return res.status(200).json({ message: 'Valid Token' });

        } else {
          
          console.log('Token has expired');
          return res.status(401).json({ message: 'Token is Expired' });

        }
      } catch (error) {
       
        console.error('Error fetching expiration time from the database:', error);
       
        return res.status(401).json({ message: 'Token verification error !' });

      }
    }
  
    console.log("end of verify");
  });
  


 

async function getExpirationTimeFromDatabase(userId, token) {
    return new Promise((resolve, reject) => {
      
      const query = 'SELECT expiration_time FROM Sessions WHERE user_id = ? AND token = ?';
  
      db.query(query, [userId, token], (err, results) => {
        if (err) {
          reject(err);
        } else {
          if (results.length > 0) {
            
            const expirationTimeFromDatabase = results[0].expiration_time;
            resolve(expirationTimeFromDatabase);
          } else {
           
            resolve(null);
          }
        }
      });
    });
  }
  
}

module.exports = {
  // generateToken,
  checkTokenExpiration,
};

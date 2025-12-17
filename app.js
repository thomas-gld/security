import express from 'express'
import prisma from './prisma.js'
import { sendMail } from './mail.mjs'
import { generateCode } from './generate_code.mjs'
import bcrypt from 'bcryptjs'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import helmet from 'helmet'
import 'dotenv/config'

//-------------------------------------------------------

const app = express()
const logger = (req, res, next) => {
   if (req?.cookies?.['session-token']) {
      const token = req.cookies['session-token'];
      try {
         const payload = jwt.verify(token, process.env.SECRET)
         req.user = payload.name
         next() 
      } catch(err) {
         res.render('login', {error_message : "Session invalide"})   
      }
   }
   else {
      res.render('login', {error_message : "Session invalide"}) 
   }
}
const email2code = {}
const saltRounds = 5

// ---------------------------------------------------------

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static('./assets'));
app.use(helmet());

app.set('view engine', 'ejs')


const db = await prisma.User.findMany()
console.log(db)

//-------------------------------------------------------

app.get('/', (req, res) => {
   res.render('login', {error_message : ""})
})

app.get('/login_verify', (req, res) => {
   res.render('login_verify', {error_message : "", attempts : 0, email : ""})
})

app.get('/register', (req, res) => {
   res.render('register', {error_message : ""})
})

app.get('/forgotten_password', (req, res) => {
   res.render('forgotten_password', {error_message : ""})
})

app.get('/forgotten_password_verify', (req, res) => {
   res.render('forgotten_password_verify', {error_message : "", email : "", attempts : ""})
})

app.get('/register_verify', (req, res) => {
   res.render('register_verify', {error_message : "", email : "", attempts : ""})
})

app.get('/set_name_password', (req, res) => {
   res.render('set_name_password', {error_message : "", email : ""})
})

app.get('/set_new_password', (req, res) => {
   res.render('set_new_password', {error_message : "", email : ""})
})


// --------------------------------------------------------------------------------------------------------------
// ------ LOGIN PATH ------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------
                                                                                                                     
// 1. 'login.ejs' --> email, password ==> post '/check_credentials'                                            

app.post('/check_credentials', async (req, res) => {
   const email = req.body.email.toLowerCase();
   const password = req.body.password;
   let attempts = 0
   // Users with this email in db
   const userList = await prisma.User.findMany({
      where : { email }
   });

   // No corresponding email in db
   if (userList.length === 0) {
      res.render('login', { error_message : "Aucun utilisateurs avec cette adresse mail" });
   } 
   else {
      // Compare password with hash from db
      const passCheck = await bcrypt.compare(password, userList[0].password);
      // Input password different than db
      if (passCheck === false) {
         res.render('login', { error_message : "Mot de passe incorrect" });
      } 
      else {
         // Email + password OK
         if (userList.length > 0 && passCheck === true) {
            // Send email with verification code
            const code = generateCode();
         //   await sendMail({
         //      from : 'buisson@enseeiht.fr',
         //      to : email,
         //      subject : 'Verification',
         //      text : `Votre code de connexion est : ${code}`
         //   });
            console.log(code)
            // Save {emailUser : correspondingCode}
            email2code[email] = code;
            // Give cookie for code duration 1 min
            res.cookie('code_wait', 'cookie code', { maxAge: 60000 });
            // --SUCCES-- Send to 'login_verify.ejs'
            res.render('login_verify', {
               email,
               error_message : "",
               attempts
            });
         }
      }
   }
});


// 2. 'login_verify.ejs' --> email, code, attempts ==> post '/login_verify_code'

app.post('/login_verify_code', async(req, res) => {
   const email = req.body.email
   const code = req.body.code
   let attempts = Number(req.body.attempts)
   
   // Input code corresponding with {emailUser : correspondingCode}
   if (email2code[email] === Number(code)) {
      // Cookie code duration ok
      if ('code_wait' in req.cookies) {
         const user = await prisma.User.findUnique({
            where : { email }
         });
         // Creation of token for user's session
         const token = jwt.sign({"sub" : user.id, "name" : user.name}, process.env.SECRET)
         // Give cookie with token
         res.cookie("session-token", token, {maxAge : 3600 * 1000})
         // Send to 'visit_list'
         res.render('visit_list', {user_name : user.name})}
      // Cookie code duration dead   
      else {
         // Send back to 'login.ejs'
         res.render('login', {email,
         error_message : "Code expiré"
      });  
      }
   }
   // Input code NOT corresponding with {emailUser : correspondingCode}
   else {
         // Increment number of failed attempts
         attempts ++
         // 3 failed attempts
         if (attempts === 3) {
            // Send back to 'login'
            res.render('login', {error_message : "3 tentatives incorrectes"})
         }
         else {
         res.render('login_verify', {email,
         error_message : "Code incorrect",
         attempts
      })};
   }
})

// --------------------------------------------------------------------
// ----------- REGISTER PATH ------------------------------------------
// --------------------------------------------------------------------

// 1. 'register.ejs' --> email ==> post '/check_register'

app.post('/check_register', async(req, res) => {
   const email = req.body.email.toLowerCase()
   let attempts = 0
   // Users with this email in db
   const userList = await prisma.User.findMany({
      where : {
         email
      }
   })

   // Input email already in db
   if (userList.length > 0) {
      res.render('register', {email,
         error_message : "email déja utilisé"
      });
   }
   // Input email not in db
   else {
      // Send email with verification code
      const code = generateCode()
      //await sendMail({from : 'buisson@enseeiht.fr',
      //   to : email,
      //   subject : 'Verification',
      //   text : `Votre code de création de compte est : ${code}`
      //})
      console.log(code); 
      // Save {emailUser : correspondingCode}
      email2code[email] = code
      // Give cookie for code duration 1 min
      res.cookie('code_wait', 'cookie code', {maxAge : 60000});
      // --SUCCES-- Send to ('register-verify')
      res.render('register_verify', {email,
         error_message : "",
         attempts   
      })
   }
})

// 2. 'register_verify.ejs' --> email, code, attempts ==> post '/register_verify_code'

app.post('/register_verify_code', async(req, res) => {
   const email = req.body.email
   const code = req.body.code
   let attempts = Number(req.body.attempts)
   
   // Input code corresponding with {emailUser : correspondingCode}
   if (email2code[email] === Number(code)) {
      // Cookie code duration ok
      if ('code_wait' in req.cookies) {
         // --SUCCES-- Send to 'set_name_password'
         res.render('set_name_password', {email, error_message : ""})}
      // Cookie code duration dead   
      else {
         // Send back to 'login.ejs'
         res.render('login', {email,
         error_message : "Code expiré"
      });  
      }
   }
   // Input code NOT corresponding with {emailUser : correspondingCode}
   else {
      // increment number of failed attemtps
      attempts ++
      if (attempts === 3) {
         // Send back to 'register"
         res.render('register', {
            error_message : "3 tentatives incorrectes"
         })
      }
      else {
      // Resend to 'register_verify'
      res.render('register_verify', {email,
         error_message : "Code incorrect",
         attempts
      })};
   }   
})

// 3. 'set_name_password.ejs' --> email, userName, password, passwordConfirm ==> post '/register_new_user'

app.post('/register_new_user', async(req, res) => {
   const email = req.body.email
   const userName = req.body.name
   const password = req.body.password
   const role = req.body.role
   console.log(role)
   const passwordConfirm = req.body.password_confirm
   
   // Input password and passwordConfirm are differents
   if (password != passwordConfirm) {
      res.render('set_name_password', {email, error_message : "Les mots de passe ne correspondent pas"})
   }
   // Input password and passwordConfirm are identicals
   else {
      // Hash password
      const passHashed = await bcrypt.hash(password, saltRounds)
      // Add new user in db
      await prisma.User.create({
         data: {
            email: email,
            password: passHashed,
            name: userName,
            role : role
         }
  });
      // --SUCCES-- Send to 'visit_list'
      res.render('login', {error_message : "Compte créé"})
   }
})

// ----------------------------------------------------------------------
// --------------FORGOTTEN PASSWORD PATH---------------------------------
// ----------------------------------------------------------------------

// 1. 'forgotten_password.ejs' --> email ==> post '/check_mail_forgotten_password'

app.post('/check_mail_forgotten_password', async(req, res) => {
   const email = req.body.email;
   let attempts = 0
   // Users in db with input email
   const userList = await prisma.User.findMany({
      where : {
         email
      }
   })

   // No users with input email in db
   if (userList.length === 0) {
      // Resend to 'forgotten_password'
      res.render('forgotten_password', {error_message : "Aucun compte associé à cette adresse mail"})
   }
   // Found corresponding user in db
   else {
      // Send email with verification code
      const code = generateCode()
      //await sendMail({from : 'buisson@enseeiht.fr',
      //   to : email,
      //   subject : 'Verification',
      //   text : `Votre code de connexion est : ${code}`
      //})
      console.log(code) 
      // Save {emailUser : correspondingCode} in email2code
      email2code[email] = code;
      // Give cookie for code duration 1 min
      res.cookie('code_wait', 'lala', {maxAge : 60000});
      // --SUCCES-- Send to 'forgotten_password_verify'
      res.render('forgotten_password_verify', {error_message : "", email, attempts})
   }
}) 

// 2. 'forgotten_password_verify.ejs' --> email, code, attempts ==> post '/forgotten_password_verify_code'

app.post('/forgotten_password_verify_code', async(req, res) => {
   const email = req.body.email
   const code = req.body.code
   let attempts = Number(req.body.attempts)
   
   // Input code corresponding with {emailUser : correspondingCode}
   if (email2code[email] === Number(code)) {
      // Cookie code OK
      if ('code_wait' in req.cookies) {
         // --SUCCES-- Send to set_new_password
         res.render('set_new_password', {error_message : "", email})}
      // Cookie code dead 
      else {
         // Send back to 'login'
         res.render('login', {email,
         error_message : "Code expiré"
      });  
      }
   }
   // Input code incorrect
   else {
      // Increment number of failed attempts
      attempts ++
      if (attempts === 3) {
         // Send back to 'register'
         res.render('register', {error_message : "3 tentatives incorrectes"})
      }
      else {
      // Resend to 'forgotten-password'
      res.render('forgotten_password_verify', {email,
         error_message : "Code incorrect", attempts
      })};
   }
})

// 3. 'set_new_password.ejs' --> email, password, passwordConfirm ==> post '/update_password'

app.post('/update_password', async(req, res) => {
   const email = req.body.email;
   const password = req.body.password;
   const passwordConfirm = req.body.password_confirm

   // Input password and passwordConfirm identics
   if (password === passwordConfirm) {
      // Hash password
      const passHashed = await bcrypt.hash(password, saltRounds)
      // Update db with new password
      await prisma.User.update({
         where: {
            email
         },
         data : {
            password : passHashed
         }
      })
      // --SUCCES-- Send back to login
      res.render('login', {error_message : "Mot de passe modifié"})
   }
   // Input password and passwordConfirm differents
   else {
      // Resend to 'new_password'
      res.render('set_new_password', {error_message : "Les mots de passe ne correspondent pas", email})
   }
})


app.get('/visit_list', (req, res) => {
   const token = req.cookies['session-token'];
   const payload = jwt.verify(token, process.env.SECRET)
   const user_name = payload.name
   console.log(payload, user_name)
   res.render('visit_list', {user_name})
})

app.use(logger)



const PORT = process.env.PORT 
app.listen(PORT, () => {
   console.log(`Server listening on port http://localhost:${PORT}`)
})


import express from 'express'
import prisma from './prisma.js'
import { sendMail } from './mail.mjs'
import { generateCode } from './generate_code.mjs'
import bcrypt from 'bcryptjs'
import cookieParser from 'cookie-parser'

//-------------------------------------------------------

const app = express()

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static('./assets'))

app.set('view engine', 'ejs')


const db = await prisma.User.findMany()
console.log(db)
const email2code = {}
const saltRounds = 5

//-------------------------------------------------------

app.get('/', (req, res) => {
   res.render('login', {error_message : ""})
})

app.get('/login_verify', (req, res) => {
   res.render('login_verify', {error_message : "", attempts : 0})
})

app.get('/register', (req, res) => {
   res.render('register', {error_message : ""})
})

app.get('/forgotten_password', (req, res) => {
   res.render('forgotten_password', {error_message : ""})
})

app.get('/forgotten_password_verify', (req, res) => {
   res.render('forgotten_password_verify', {error_message : ""})
})

app.get('/register_verify', (req, res) => {
   res.render('register_verify', {error_message : ""})
})

app.get('/set_name_password', (req, res) => {
   res.render('set_name_password', {error_message : "", email : ""})
})

app.get('/set_new_password', (req, res) => {
   res.render('set_new_password', {error_message : "", email : ""})
})

app.get('/accueil', (req, res) => {
   res.render('accueil', {user_name : req.cookies['user_name']})
})

// --------------------------------------------------------------------
// ------ LOGIN PATH --------------------------------------------------
// --------------------------------------------------------------------

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
            await sendMail({
               from : 'buisson@enseeiht.fr',
               to : email,
               subject : 'Verification',
               text : `Votre code de connexion est : ${code}`
            });
            // Save {emailUser : correspondingCode}
            email2code[email] = code;
            // Give cookie for code duration 1 min
            res.cookie('code_wait', 'cookie code', { maxAge: 60000 });
            // Give cookie with user's name
            res.cookie('user_name', userList[0].name, { maxAge: 24*60*60000 });
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
         // Send to 'home'
         res.render('accueil', {user_name : req.cookies['user_name']})}
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
      await sendMail({from : 'buisson@enseeiht.fr',
         to : email,
         subject : 'Verification',
         text : `Votre code de création de compte est : ${code}`
      }) 
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
            email: req.body.email,
            password: passHashed,
            name: userName
         }
  });
      // Give cookie with userName duration 1 day
      res.cookie('user_name', userName, {maxAge : 1000*60*60*24})
      // --SUCCES-- Send to 'home'
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
      await sendMail({from : 'buisson@enseeiht.fr',
         to : email,
         subject : 'Verification',
         text : `Votre code de connexion est : ${code}`
      }) 
      // Save {emailUser : correspondingCode}
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

























const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
   console.log(`Server listening on port http://localhost:${PORT}`)
})
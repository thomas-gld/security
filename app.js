import express from 'express'
import prisma from './prisma.js'
import { sendMail } from './mail.mjs'
import { generateCode } from './generate_code.mjs'
import cookieParser from 'cookie-parser'

const app = express()

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static('./assets'))

app.set('view engine', 'ejs')


const db = await prisma.User.findMany()
console.log(db)
const email2code = {}


app.get('/', (req, res) => {
   res.render('login', {error_message : ""})
})

app.get('/login_verify', (req, res) => {
   res.render('login_verify', {error_message : ""})
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
   res.render('accueil')
})

// ------ LOGIN PATH --------------------------------------------------


app.post('/check_credentials', async(req, res) => {
   const email = req.body.email.toLowerCase()

   const userList = await prisma.User.findMany({
      where : {
         email,
      }
   })

   if (userList.length === 0) {
      return res.render('login', {error_message : "Aucun utilisateurs avec cette adresse mail"})
   }

   if (userList[0].password != req.body.password) {
      return res.render('login', {error_message : "Mot de passe incorrect"})
   }
   
   if (userList.length > 0 && userList[0].password === req.body.password) {
      const code = generateCode()
      await sendMail({from : 'buisson@enseeiht.fr',
         to : email,
         subject : 'Verification',
         text : `Votre code de connexion est : ${code}`
      }) 

      email2code[email] = code;
      res.cookie('code_wait', 'lala', {maxAge : 60000});
      
      return res.render('login_verify', {email,
         error_message : ""
      });
   }
})


app.post('/login_verify_code', async(req, res) => {
   const email = req.body.email
   const code = req.body.code
   console.log(req.cookies)
   

   if (email2code[email] === Number(code)) {
      if ('code_wait' in req.cookies) {
       res.render('accueil')}
      else {
         res.render('login', {email,
         error_message : "Code expiré"
      });  
      }
   }
   else {
       res.render('login_verify', {email,
         error_message : "Code incorrect"
      });
   }
})

// ----------- REGISTER PATH -------------------------------------------------------



app.post('/check_register', async(req, res) => {
   const email = req.body.email.toLowerCase()
   const userList = await prisma.User.findMany({
      where : {
         email
      }
   })

   if (userList.length > 0) {
      res.render('register', {email,
         error_message : "email déja utilisé"
      });
   }

   else {
      const code = generateCode()
      await sendMail({from : 'buisson@enseeiht.fr',
         to : email,
         subject : 'Verification',
         text : `Votre code de création de compte est : ${code}`
      }) 

      email2code[email] = code
      res.render('register_verify', {email})
   }
})


app.post('/register_verify_code', async(req, res) => {
   const email = req.body.email
   const code = req.body.code
   console.log(email, code)
   console.log(email2code[email])

   if (email2code[email] === Number(code)) {
      res.render('set_name_password', {email})
   }
   else {
      res.send('<html>Code incorrect</html>')
   }   
})


app.post('/register_new_user', async(req, res) => {
   const userName = req.body.name
   const password = req.body.password
   const passwordConfirm = req.body.password_confirm

   if (password != passwordConfirm) {
      res.send("<html>Les mots de passe ne correspondent pas</html>")
   }

   else {
      await prisma.User.create({
         data: {
            email: req.body.email,
            password: password,
            name: userName
         }
  });
      res.render('accueil')
   }

   console.log(userName, password, passwordConfirm)
   
})


// --------------FORGOTTEN PASSWORD PATH---------------------------------


app.post('/check_mail_forgotten_password', async(req, res) => {
   const email = req.body.email;
   const userList = await prisma.User.findMany({
      where : {
         email
      }
   })

   if (userList.length === 0) {
      res.render('forgotten_password', {error_message : "Aucun compte associé à cette adresse mail"})
   }
   else {
      const code = generateCode()
      await sendMail({from : 'buisson@enseeiht.fr',
         to : email,
         subject : 'Verification',
         text : `Votre code de connexion est : ${code}`
      }) 

      email2code[email] = code;
      res.cookie('code_wait', 'lala', {maxAge : 60000});
      res.render('forgotten_password_verify', {error_message : "", email})
   }
}) 

app.post('/forgotten_password_verify_code', async(req, res) => {
   const email = req.body.email
   const code = req.body.code
   console.log(email, code)
   
   if (email2code[email] === Number(code)) {
      if ('code_wait' in req.cookies) {
         console.log("lalala", email)
       res.render('set_new_password'), {error_message : "", email : email}}
      else {
         res.render('login', {email,
         error_message : "Code expiré"
      });  
      }
   }
   else {
       res.render('forgotten_password_verify', {email,
         error_message : "Code incorrect"
      });
   }
})


app.post('/update_password', async(req, res) => {
   const email = req.body.email;
   const password = req.body.password;
   const passwordConfirm = req.body.password_confirm

   if (password === passwordConfirm) {
      await prisma.User.update({
         where: {
            email
         },
         data : {
            password : password
         }
      })
      res.render('login', {error_message : "Mot de passe modifié"})
   }
})

























const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
   console.log(`Server listening on port http://localhost:${PORT}`)
})
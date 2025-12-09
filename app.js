import express from 'express'
import prisma from './prisma.js'
import { sendMail } from './mail.mjs'
import { generateCode } from './generate_code.mjs'

const app = express()

app.use(express.urlencoded({ extended: true }));


const db = await prisma.User.findMany()
console.log(db)
const email2code = {}


app.use('/assets', express.static('./assets'))

app.set('view engine', 'ejs')

app.get('/', (req, res) => {
   
   res.render('login', {error_message : ""})
})

app.get('/verify_code', (req, res) => {
   res.render('verify_code')
})

app.get('/register', (req, res) => {
   res.render('register')
})

app.get('/forgotten_password', (req, res) => {
   res.render('forgotten_password')
})

app.get('/forgotten_password_verify', (req, res) => {
   res.render('forgotten_password_verify')
})

app.get('/register_verify', (req, res) => {
   res.render('register_verify')
})

app.get('/set_name_password', (req, res) => {
   res.render('set_name_password')
})

app.get('/set_new_password', (req, res) => {
   res.render('set_new_password')
})

app.get('/accueil', (req, res) => {
   res.render('accueil')
})

// ------ LOGIN PATH --------------------------------------------------

app.use(express.urlencoded({ extended: true }));

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

      email2code[email] = code
      return res.render('login_verify', {email});
   }

   console.log(email2code)   
}
)

app.use(express.urlencoded({ extended: true }));

app.post('/login_verify_code', async(req, res) => {
   const email = req.body.email
   const code = req.body.code
   console.log(email, code)
   console.log(email2code[email])

   if (email2code[email] === Number(code)) {
      res.render('accueil')
   }
   else {
      res.send('<html>Code incorrect</html>')
   }
})

// ----------- REGISTER PATH -------------------------------------------------------


app.use(express.urlencoded({ extended: true }));

app.post('/check_register', async(req, res) => {
   const email = req.body.email.toLowerCase()
   const userList = await prisma.User.findMany({
      where : {
         email
      }
   })

   if (userList.length > 0) {
      res.send("<html>Email déja utilisé ...</html>")
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

app.use(express.urlencoded({ extended: true }));

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

app.use(express.urlencoded({ extended: true }));

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




const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
   console.log(`Server listening on port http://localhost:${PORT}`)
})
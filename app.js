import express from 'express'
import prisma from './prisma.js'
import bcrypt from 'bcryptjs'
import nodemailer from 'nodemailer'
import { sendMail } from './mail.mjs'

const app = express()

const db = await prisma.User.findMany()
console.log(db)


app.use('/assets', express.static('./assets'))

app.set('view engine', 'ejs')

app.get('/', (req, res) => {
   res.render('login')
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

app.use(express.urlencoded({ extended: true }));

app.post('/check_credentials', async(req, res) => {
   const code = Math.floor(1000 + Math.random() * 8999);
   const textMail = `Votre code de verification est : ${code}`
   const email = req.body.email
   const password = req.body.password

   const userList = await prisma.User.findMany({
      where : {
         email,
      }
   })

   if (userList.length === 0) {
      res.send('<html>Aucun utilisateurs avec cette adresse mail</html>')
   }

   if (userList[0].password != password) {
      res.send('<html>Mot de passe incorrect</html>')
   }
   
   if (userList.length > 0 && userList[0].password === password) {
      await sendMail({from : 'buisson@enseeiht.fr',
         to : req.body.email.toLowerCase(),
         subject : 'Verification',
         text : textMail})  

      res.render('verify_code');}
}
)

app.use(express.urlencoded({ extended: true }));

app.post('/check_register', async(req, res) => {
   const email = req.body.email.toLowerCase()
   const userList = await prisma.User.findMany({
      where : {
         email
      }
   })
   
   console.log(userList);

   if (userList.length > 0) {
      res.send("<html>Email déja utilisé ...")
   }

   else {
      res.render('set_name_password')
   }
})




const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
   console.log(`Server listening on port http://localhost:${PORT}`)
})
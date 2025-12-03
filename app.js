import express from 'express'
import prisma from './prisma.js'
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

app.get('/set_password', (req, res) => {
   res.render('set_password')
})





const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
   console.log(`Server listening on port http://localhost:${PORT}`)
})
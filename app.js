import express from 'express'

const app = express()

app.use('/assets', express.static('./assets'))

app.set('view engine', 'ejs')

app.get('/', (req, res) => {
   res.render('login')
})

app.get('/verify_code', (req, res) => {
   res.render('verify_code')
})





const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
   console.log(`Server listening on port http://localhost:${PORT}`)
})
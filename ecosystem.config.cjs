module.exports = {
   apps : [
      //////////////////////////        ALPHA      //////////////////////////  
      {
         name: 'SECURIT',
         script: './app.js',
         watch: false,

         env: {
            DATABASE_URL: '...',
            APIKEY: '...',
         },
      }
   ]
}

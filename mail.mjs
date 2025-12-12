import nodemailer from 'nodemailer'

export async function sendMail({from, to, subject, text}) {
    const transporter = nodemailer.createTransport({
          host : 'smtp.sendgrid.net',
          port : '587',
          secure : false,
          auth : {
             user : 'apikey',
             pass : process.env.SENDGRID_PWD
          },
          name : 'infirmier.jcbuisson.fr'
          
       });
       await transporter.sendMail({
          from,
          to,
          subject,
          text
       })
}
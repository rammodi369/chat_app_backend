const nodemailer = require('nodemailer');
const { google }=require("googleapis");
// const sgMail = require('@sendgrid/mail');
// sgMail.setApiKey('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');

// Create a Nodemailer transporter


const client_Id="960725231169-6rp5jo8o9ifega4h00tp6raqcbjn0vk1.apps.googleusercontent.com"
const client_secret="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"
const Redirect_url="https://developers.google.com/oauthplayground"
const refresh_token="1//04A4stros5BShCgYIARAAGAQSNwF-L9Ir2fXvN1EaTJyxJUplYLlWEzrNlt3iyQXUkOnw5nyr_wJOXkwbqCShGxA4v5MIGZkP6Fg"


const oAuth2client=new google.auth.OAuth2(client_Id,client_secret,Redirect_url)
oAuth2client.setCredentials({refresh_token:refresh_token})




const sendSGMail = async ({
    to,
    subject,

    // * We can create our own html throught unlayer website
    html,
    text,
}) => {
    try {
        const accessToken=await oAuth2client.getAccessToken();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type:"OAuth2",
                user: 'rammodi0509@gmail.com',
                clientId:client_Id,
                clientSecret:client_secret,
                refreshToken:refresh_token, 
                accessToken:accessToken
            }
        });
        const msg = {
            from: "rammodi0509@gmail.com",
            to: to,
            subject: subject,
            html: html,
            text: text,
        }


       const result =await transporter.sendMail(msg, function (error, info) {
            if (error) {
                console.error(error);
                // Handle the error and provide feedback to the user
            } else {
                console.log('Email sent: ' + info.response);
                // Provide feedback to the user about the successful email sending
            }
        });

console.log(result);

    } catch (error) {
        console.log("Error:" + error)
    }
}
exports.sendEmail = async (args) => {
    if (process.env.NODE === "development") {

        return new Promise.resolve();
    } else {
        return sendSGMail(args);
    }

}
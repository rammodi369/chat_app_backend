const app=require("./app");
const dotenv=require("dotenv")
const mongoose=require("mongoose");
dotenv.config({path:"./config.env"})
process.on("uncaughtException",(err)=>{
    console.log(err);
    process.exit(1);
})

const http=require("http");
const server=http.createServer(app);
const DB=process.env.DBURL.replace("<PASSWORD>",process.env.DBPASSWORD);
mongoose.connect(DB, {
    useNewUrlParser: true
  }).then(async ( ) => {
    console.log("connection succesfull");
  }).catch((error)=>{
    console.log("givng an error",error)
  })

const port =process.env.PORT||8000;

server.listen(port,()=>{
    console.log(`app is running on port ${port} `);
});
process.on("unhandledRejection",(err)=>{
    console.log(err);
    server.close(()=>{
        process.exit(1);
    })
})
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    // دي الي بنحدد فيها الصور الي بتيجي وين تتحفظ
    destination: function (req,file,cb){
        cb(null,path.join(__dirname,"../images"));
        // كدا خددنا مكان تخزين الصور الي تيجي
    },
    // cbيعني  كول باك 
    // تخديد اسم الفايل الي يجي الصوره يعيي
    filename: function (req,file,cb){
        cb(null, new Date().toISOString().replace(/:/g, "-") + file.originalname);
    }
});
// بياخد كي وفايلو ولكن لو الاتنين نفس الاسم نكتبها مره وخلاص
const upload = multer({ storage });


// /api/upload
// الابلود دي ميدل وير والسينجل مكتوبه علشان تاخد صوره واحده بس
// الاسم الي جوا السيتجل دا الاسم الي هتتبعت بيه الصوره دا الكي يعني الي هنبعت عليه
router.post("/", upload.single("image"), (req,res) => {
    res.status(200).json({message: "image uploaded"});
})


module.exports = router;
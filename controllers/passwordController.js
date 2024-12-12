// استيراد المكتبات المطلوبة
const asyncHandler = require("express-async-handler"); // لتبسيط التعامل مع الأخطاء في الدوال غير المتزامنة.
const { User, validateChangePassword } = require("../models/User"); // استيراد نموذج المستخدم ودالة التحقق من صحة البيانات.
const jwt = require("jsonwebtoken"); // مكتبة لإنشاء والتحقق من الـ JSON Web Tokens.
const bcrypt = require("bcryptjs"); // مكتبة لتشفير كلمات المرور.
const nodemailer = require("nodemailer"); // مكتبة لإرسال رسائل البريد الإلكتروني.

/**
 *  @desc    Get Forgot Password View
 *  @route   /password/forgot-password
 *  @method  GET
 *  @access  public
 */
module.exports.getForgotPasswordView = asyncHandler((req, res) => {
  // يقوم بعرض صفحة إدخال البريد الإلكتروني لنسيان كلمة المرور.
  res.render("forgot-password");
});

/**
 *  @desc    Send Forgot Password Link
 *  @route   /password/forgot-password
 *  @method  POST
 *  @access  public
 */
module.exports.sendForgotPasswordLink = asyncHandler(async (req, res) => {
  // البحث عن المستخدم بناءً على البريد الإلكتروني الذي أدخله في الطلب.
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    // إذا لم يتم العثور على المستخدم، يتم إرسال استجابة خطأ.
    return res.status(404).json({ message: "user not found" });
  }

  // إنشاء مفتاح سرّي باستخدام كلمة المرور المخزنة.
  const secret = process.env.JWT_SECRET_KEY + user.password;

  // إنشاء توكن JWT يحتوي على البريد الإلكتروني ومعرّف المستخدم وصلاحيته لمدة 10 دقائق.
  const token = jwt.sign({ email: user.email, id: user.id }, secret, {
    expiresIn: "10m",
  });

  // إعداد رابط إعادة تعيين كلمة المرور يحتوي على معرّف المستخدم والتوكن.
  const link = `http://localhost:8000/password/reset-password/${user._id}/${token}`;

  // إعداد مزوّد خدمة البريد الإلكتروني باستخدام nodemailer.
  const transporter = nodemailer.createTransport({
    service: "gmail", // نوع الخدمة.
    auth: {
      user: process.env.USER_EMAIL, // البريد الإلكتروني المرسل.
      pass: process.env.USER_PASS, // كلمة المرور المرتبطة بالبريد الإلكتروني.
    },
  });

  // إعداد محتوى الرسالة التي سيتم إرسالها.
  const mailOptions = {
    from: process.env.USER_EMAIL, // عنوان المرسل.
    to: user.email, // عنوان المستلم.
    subject: "Reset Password", // عنوان الرسالة.
    html: `<div>
              <h4>Click on the link below to reset your password</h4>
              <p>${link}</p>
          </div>`, // محتوى الرسالة بصيغة HTML.
  };

  // إرسال البريد الإلكتروني باستخدام nodemailer.
  transporter.sendMail(mailOptions, function (error, success) {
    if (error) {
      // إذا حدث خطأ أثناء الإرسال.
      console.log(error);
      res.status(500).json({ message: "something went wrong" });
    } else {
      // إذا تم إرسال البريد الإلكتروني بنجاح.
      console.log("Email sent: " + success.response);
      res.render("link-send"); // عرض صفحة تؤكد إرسال الرابط.
    }
  });
});

/**
 *  @desc    Get Reset Password View
 *  @route   /password/reset-password/:userId/:token
 *  @method  GET
 *  @access  public
 */
module.exports.getResetPasswordView = asyncHandler(async (req, res) => {
  // البحث عن المستخدم بناءً على معرّف المستخدم في الرابط.
  const user = await User.findById(req.params.userId);
  if (!user) {
    // إذا لم يتم العثور على المستخدم.
    return res.status(404).json({ message: "user not found" });
  }

  // إنشاء المفتاح السري للتحقق من التوكن.
  const secret = process.env.JWT_SECRET_KEY + user.password;
  try {
    // التحقق من صحة التوكن.
    jwt.verify(req.params.token, secret);
    // إذا كان التوكن صالحًا، يتم عرض صفحة إعادة تعيين كلمة المرور.
    res.render("reset-password", { email: user.email });
  } catch (error) {
    // إذا كان هناك خطأ في التوكن.
    console.log(error);
    res.json({ message: "Error" });
  }
});

/**
 *  @desc    Reset The Password
 *  @route   /password/reset-password/:userId/:token
 *  @method  POST
 *  @access  public
 */
module.exports.resetThePassword = asyncHandler(async (req, res) => {
  // التحقق من صحة البيانات المدخلة (كلمة المرور الجديدة).
  const { error } = validateChangePassword(req.body);
  if (error) {
    // إذا كانت البيانات غير صحيحة، يتم إرسال رسالة خطأ.
    return res.status(400).json({ message: error.details[0].message });
  }

  // البحث عن المستخدم بناءً على معرّف المستخدم.
  const user = await User.findById(req.params.userId);
  if (!user) {
    // إذا لم يتم العثور على المستخدم.
    return res.status(404).json({ message: "user not found" });
  }

  // إنشاء المفتاح السري للتحقق من التوكن.
  const secret = process.env.JWT_SECRET_KEY + user.password;
  try {
    // التحقق من صحة التوكن.
    jwt.verify(req.params.token, secret);

    // إنشاء "Salt" لتشفير كلمة المرور الجديدة.
    const salt = await bcrypt.genSalt(10);
    req.body.password = await bcrypt.hash(req.body.password, salt);

    // تحديث كلمة مرور المستخدم في قاعدة البيانات.
    user.password = req.body.password;
    await user.save();

    // عرض صفحة تأكيد نجاح العملية.
    res.render("success-password");
  } catch (error) {
    // إذا حدث خطأ أثناء العملية.
    console.log(error);
    res.json({ message: "Error" });
  }
});

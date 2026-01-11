const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const flash = require('connect-flash');
require('./cron'); // Start cron jobs

dotenv.config();

const app = express();
const PORT = process.env.PORT || 9878;

// Middleware
app.use((req, res, next) => {
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdn.quilljs.com https://cdnjs.cloudflare.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.quilljs.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: http://localhost:*; " +
        "media-src 'self' data: blob: http://localhost:*; " +
        "connect-src 'self' http://localhost:* ws://localhost:* https://cdn.jsdelivr.net;"
    );
    next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session Setup
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

app.use(flash());

// Global Variables Middleware
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.currentPath = req.path;
    next();
});

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes (Placeholder for now)
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/warga', require('./routes/warga'));
app.use('/iuran', require('./routes/iuran'));
app.use('/ronda', require('./routes/ronda'));
app.use('/profile', require('./routes/profile'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/activity', require('./routes/activity'));
app.use('/keuangan', require('./routes/keuangan'));
app.use('/musyawarah', require('./routes/musyawarah'));
app.use('/share', require('./routes/share'));

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

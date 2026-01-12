const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const moment = require('moment');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));
app.use(flash());

// Global variables
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.session.user || null;
    res.locals.currentPath = req.path;
    next();
});

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
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

const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const moment = require('moment');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Proxy (for Nginx/Cloudflare/Heroku)
app.set('trust proxy', 1);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d', // Cache static assets for 1 day to improve performance
    etag: false
}));
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));
const passport = require('passport');
require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Global variables
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.session.user || null;
    res.locals.currentPath = req.path;
    res.locals.adminPhone = app.locals.adminPhone || '6281234567890';
    next();
});

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Profile Check & Activity Tracking Middleware
app.use(require('./middleware/checkProfile'));
app.use(require('./middleware/trackActivity'));
app.use(require('./middleware/trackFullActivity'));

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
app.use('/donasi', require('./routes/donasi'));
app.use('/share', require('./routes/share'));
app.use('/cctv', require('./routes/cctv'));
app.use('/pengaduan', require('./routes/pengaduan'));
app.use('/banjir', require('./routes/banjir'));
app.use('/monitoring', require('./routes/monitoring'));


// Run Migrations
require('./utils/googleAuthMigration')();
require('./utils/photoMigration')();
require('./utils/emailWargaMigration')();
require('./utils/fixRoleColumn')();
require('./utils/fixIuranStatus')();
require('./utils/updateIuranJenis')();
require('./utils/migrateOldKasData')();
require('./utils/addDibayarOlehCol')();
require('./utils/fixKasTanggalType')();
require('./utils/addTanggalKonfirmasiCol')();
require('./utils/houseBasedRondaMigration')();
require('./utils/activityTrackingMigration')();

// Fetch Admin Contact
const getAdminContact = require('./utils/getAdminContact');
getAdminContact().then(phone => {
    app.locals.adminPhone = phone;
    console.log('Admin phone loaded:', phone);
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

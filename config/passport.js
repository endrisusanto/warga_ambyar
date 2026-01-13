const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./db');
const bcrypt = require('bcrypt');

module.exports = function (passport) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: (process.env.BASE_URL ? process.env.BASE_URL : "") + "/auth/google/callback"
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Check if user exists by google_id
                const [rows] = await db.query('SELECT * FROM users WHERE google_id = ?', [profile.id]);

                if (rows.length > 0) {
                    // Update photo if changed
                    const photoUrl = (profile.photos && profile.photos.length > 0) ? profile.photos[0].value : null;
                    if (photoUrl && rows[0].profile_photo_url !== photoUrl) {
                        await db.query('UPDATE users SET profile_photo_url = ? WHERE id = ?', [photoUrl, rows[0].id]);
                        rows[0].profile_photo_url = photoUrl;
                    }
                    return done(null, rows[0]);
                }

                // Check if user exists by email
                if (profile.emails && profile.emails.length > 0) {
                    const email = profile.emails[0].value;
                    const photoUrl = (profile.photos && profile.photos.length > 0) ? profile.photos[0].value : null;

                    const [emailRows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

                    if (emailRows.length > 0) {
                        // Link account & Update Photo
                        await db.query('UPDATE users SET google_id = ?, profile_photo_url = ? WHERE id = ?', [profile.id, photoUrl, emailRows[0].id]);
                        return done(null, { ...emailRows[0], google_id: profile.id, profile_photo_url: photoUrl });
                    }

                    // Create new user
                    const newUser = {
                        username: profile.displayName,
                        email: email,
                        google_id: profile.id,
                        profile_photo_url: photoUrl,
                        role: 'warga' // Default role
                    };

                    // Handle duplicate username by appending random number
                    let username = newUser.username;
                    let isUnique = false;
                    while (!isUnique) {
                        const [check] = await db.query('SELECT 1 FROM users WHERE username = ?', [username]);
                        if (check.length === 0) isUnique = true;
                        else username = newUser.username + Math.floor(Math.random() * 1000);
                    }

                    const [result] = await db.query(
                        'INSERT INTO users (username, email, google_id, profile_photo_url, role, password) VALUES (?, ?, ?, ?, ?, ?)',
                        [username, email, profile.id, photoUrl, 'warga', null] // Password is null
                    );

                    newUser.id = result.insertId;
                    return done(null, newUser);
                }

                return done(new Error('No email found in Google profile'));

            } catch (err) {
                console.error(err);
                return done(err, null);
            }
        }));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
            done(null, rows[0]);
        } catch (err) {
            done(err, null);
        }
    });
};

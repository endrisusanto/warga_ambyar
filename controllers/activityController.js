const Kas = require('../models/Kas');
const moment = require('moment');

exports.timeline = async (req, res) => {
    try {
        const logs = await Kas.getAll();

        // Group logs by month/date for better timeline display if needed, 
        // or let the view handle it. Let's pass raw data.

        res.render('activity/timeline', {
            title: 'Cash Flow Timeline',
            user: req.session.user,
            logs: logs,
            currentPath: '/activity/timeline',
            moment: moment
        });
    } catch (error) {
        console.error('Error fetching timeline:', error);
        res.status(500).send('Internal Server Error');
    }
};

const { exec } = require('child_process');
const path = require('path');
const util = require('util');
const multer = require('multer');
const fs = require('fs');

const execPromise = util.promisify(exec);

exports.index = async (req, res) => {
    try {
        res.render('banjir/index', {
            title: 'Monitoring Risiko Banjir',
            user: req.session.user,
            path: '/banjir'
        });
    } catch (error) {
        console.error('Error rendering banjir page:', error);
        res.status(500).send('Server Error');
    }
};

exports.getData = async (req, res) => {
    try {
        const pythonScript = path.join(__dirname, '../python_services/water_level_fetcher.py');

        // Execute Python script to fetch water level data
        const { stdout, stderr } = await execPromise(`python3 ${pythonScript}`);

        if (stderr) {
            console.error('Python script stderr:', stderr);
        }

        // Parse JSON output from Python script
        const data = JSON.parse(stdout);

        res.json({
            success: true,
            data: data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching water level data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch water level data',
            message: error.message
        });
    }

};

// Share Image Logic
const shareDir = './public/uploads/shares/';
if (!fs.existsSync(shareDir)) {
    fs.mkdirSync(shareDir, { recursive: true });
}

const shareStorage = multer.diskStorage({
    destination: shareDir,
    filename: function (req, file, cb) {
        cb(null, 'banjir-share-' + Date.now() + path.extname(file.originalname));
    }
});
const uploadShare = multer({ storage: shareStorage }).single('image');

exports.uploadShareImage = (req, res) => {
    uploadShare(req, res, (err) => {
        if (err) return res.json({ success: false, error: err.message });
        if (!req.file) return res.json({ success: false, error: 'No file uploaded' });
        res.json({ success: true, filename: req.file.filename });
    });
};

exports.viewShare = async (req, res) => {
    const filename = req.params.filename;
    res.render('banjir/index', {
        title: 'Monitoring Risiko Banjir',
        user: req.session ? req.session.user : null,
        path: '/banjir',
        ogImage: '/uploads/shares/' + filename
    });
};

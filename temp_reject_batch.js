exports.rejectBatch = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.json({ success: false, message: 'No IDs provided' });
        }

        const placeholders = ids.map(() => '?').join(',');
        const [rows] = await db.query(`
            SELECT i.*, w.nama, w.no_hp 
            FROM iuran i 
            JOIN warga w ON i.warga_id = w.id 
            WHERE i.id IN (${placeholders})
        `, ids);

        if (rows.length === 0) return res.json({ success: false, message: 'Data not found' });

        // Update status to rejected and clear proof
        await db.query(`UPDATE iuran SET status = 'ditolak', bukti_bayar = NULL WHERE id IN (${placeholders})`, ids);

        const first = rows[0];
        let waUrl = null;
        if (first.no_hp) {
            const wargaPhone = first.no_hp.replace(/^0/, '62').replace(/\D/g, '');
            const totalAmount = rows.reduce((sum, item) => sum + parseInt(item.jumlah), 0);
            
            const message = `Halo ${first.nama}, pembayaran iuran sejumlah Rp ${totalAmount.toLocaleString('id-ID')} (${rows.length} item) DITOLAK karena bukti tidak valid. Mohon periksa dan upload ulang.`;
            waUrl = `https://wa.me/${wargaPhone}?text=${encodeURIComponent(message)}`;
        }

        res.json({ success: true, waUrl });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

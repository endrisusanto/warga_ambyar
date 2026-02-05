#!/bin/bash
set -e

echo "🔧 Running migration to add metode_pembayaran column..."

# Execute migration
docker compose exec db sh -c "mysql -u root -prootpassword rt_rw_db -e \"ALTER TABLE iuran ADD COLUMN IF NOT EXISTS metode_pembayaran ENUM('DANA', 'QRIS', 'Tunai') DEFAULT NULL AFTER bukti_bayar;\""

if [ $? -eq 0 ]; then
    echo "✅ Migration executed!"
    echo ""
    echo "Verifying column..."
    docker compose exec db sh -c "mysql -u root -prootpassword rt_rw_db -e 'DESCRIBE iuran;'" | grep metode_pembayaran
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ SUCCESS! Column 'metode_pembayaran' has been added to the database!"
        echo ""
        echo "Next steps:"
        echo "1. Restart the app: docker compose restart app"
        echo "2. Refresh your browser (Ctrl+Shift+R)"
        echo "3. Try submitting a payment"
    fi
else
    echo "❌ Migration failed!"
fi

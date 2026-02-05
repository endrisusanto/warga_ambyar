#!/bin/bash

# Migration Script for Docker Environment
# Adds metode_pembayaran column to iuran table

echo "🔧 Running database migration..."
echo "Adding metode_pembayaran column to iuran table..."

# Run migration
docker compose exec -T db mysql -u root -proot warga_ambyar <<EOF
ALTER TABLE iuran 
ADD COLUMN metode_pembayaran ENUM('DANA', 'QRIS', 'Tunai') DEFAULT NULL 
AFTER bukti_bayar;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Verifying column was added..."
    docker compose exec -T db mysql -u root -proot warga_ambyar -e "DESCRIBE iuran;" | grep metode_pembayaran
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Column 'metode_pembayaran' verified in database!"
        echo "🎉 You can now refresh your browser and try submitting a payment."
    else
        echo "⚠️  Column not found. Migration may have failed."
    fi
else
    echo "❌ Migration failed. Please check the error above."
    echo ""
    echo "Manual steps:"
    echo "1. docker compose exec db bash"
    echo "2. mysql -u root -proot warga_ambyar"
    echo "3. ALTER TABLE iuran ADD COLUMN metode_pembayaran ENUM('DANA', 'QRIS', 'Tunai') DEFAULT NULL AFTER bukti_bayar;"
fi

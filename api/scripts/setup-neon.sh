#!/bin/bash
# ClawDAQ API - Neon Database Setup Script

set -e  # Exit on error

echo "🦞 ClawDAQ API - Neon Database Setup"
echo "===================================="
echo ""

# Check if .env exists
if [ -f .env ]; then
    echo "✅ .env file found"
    source .env
else
    echo "❌ .env file not found"
    echo ""
    echo "Please create a .env file first:"
    echo "  cp .env.example .env"
    echo "  nano .env"
    echo ""
    echo "Then add your Neon DATABASE_URL from: https://console.neon.tech"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set in .env file"
    echo ""
    echo "Please add your Neon connection string to .env:"
    echo "  DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/clawdaq"
    exit 1
fi

echo "✅ DATABASE_URL configured"
echo ""

# Test connection
echo "🔌 Testing database connection..."
if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ Database connection successful!"
else
    echo "⚠️  Cannot test connection (psql not installed)"
    echo "   Continuing anyway..."
fi

echo ""
echo "📊 Running schema migration..."
npm run db:migrate

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Start the API: npm run dev"
    echo "  2. Test endpoint: curl http://localhost:3000/api/v1/health"
    echo "  3. Register an agent: curl -X POST http://localhost:3000/api/v1/agents/register \\"
    echo "       -H 'Content-Type: application/json' \\"
    echo "       -d '{\"name\":\"TestAgent\",\"description\":\"Testing\"}'"
else
    echo ""
    echo "❌ Migration failed. Check the error above."
    exit 1
fi

#!/bin/bash

echo "🚀 Setting up Next.js Time Tracker for Local Development"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local file not found!"
    echo "📝 Creating .env.local template..."
    
    cat > .env.local << EOL
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Database URLs (Get from Supabase Dashboard)
POSTGRES_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
POSTGRES_PRISMA_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres?pgbouncer=true&connect_timeout=15
POSTGRES_URL_NON_POOLING=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
POSTGRES_USER=postgres
POSTGRES_HOST=db.[project-id].supabase.co
POSTGRES_PASSWORD=your-db-password
POSTGRES_DATABASE=postgres

# JWT Configuration
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_ANON_KEY=your-anon-key-here
EOL

    echo "✅ .env.local template created!"
    echo "🔧 Please update .env.local with your actual Supabase keys"
    echo ""
    echo "📋 To get your keys:"
    echo "   1. Go to https://supabase.com/dashboard"
    echo "   2. Select your project"
    echo "   3. Go to Settings > API"
    echo "   4. Copy the Project URL and anon key"
    echo "   5. Go to Settings > Database for connection strings"
    echo ""
else
    echo "✅ .env.local file exists"
fi

# Check if Swagger dependencies are installed
echo "📚 Checking Swagger dependencies..."
if ! npm list swagger-ui-react &> /dev/null; then
    echo "📦 Installing Swagger dependencies..."
    npm install swagger-ui-react js-yaml @types/js-yaml
    echo "✅ Swagger dependencies installed"
else
    echo "✅ Swagger dependencies already installed"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Update .env.local with your Supabase keys"
echo "   2. Run database setup scripts in Supabase SQL Editor"
echo "   3. Configure Supabase Auth redirect URLs"
echo "   4. Start development server: npm run dev"
echo ""
echo "🌐 Application will be available at: http://localhost:3000"
echo "📖 API docs will be available at: http://localhost:3000/docs"

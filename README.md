# Baby Tracker

A Next.js application for tracking baby activities, milestones, and development.

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Prisma with SQLite
- TailwindCSS for styling

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Setup the database:
```bash
npm run prisma:generate
npm run prisma:migrate
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `/app` - Next.js app router pages and components
- `/db` - SQLite database and Prisma schema
- `/components` - Reusable UI components
- `/lib` - Utility functions and shared logic
- `/types` - TypeScript type definitions

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations

## Deployment

### Prerequisites

1. Configure the service name in `.env`:
```bash
SERVICE_NAME="baby-tracker"
```

2. Create and configure the systemd service
3. Ensure user has sudo privileges for service management
4. Make deployment scripts executable:
```bash
chmod +x Scripts/*.sh
```

### Deployment Scripts

The following deployment scripts are available in the `Scripts` directory:

- `service.sh {start|stop|restart|status}` - Manage the application service
- `backup.sh` - Create a backup of the application
- `update.sh` - Update application (git pull, prisma operations, build)
- `deployment.sh` - Full deployment process (backup + update)

### Running a Deployment

For a full deployment process:
```bash
./Scripts/deployment.sh
```

This will:
1. Create a backup of the current application
2. Pull latest changes from git
3. Run Prisma operations
4. Build the application
5. Manage service stop/start as needed

Each script can also be run independently for specific operations.

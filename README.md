# ALF Management Dashboard (NextN)

A comprehensive management dashboard built with Next.js 15, Firebase, and Tailwind CSS. This application is designed to manage members, roles, teams, and transactions for the ALF organization.

## Features

- **Member Management**: specific functionality to Add, Edit, and View member details.
- **Role Management**: Role-Based Access Control (RBAC) to manage user permissions.
- **Team Management**: Organize members into teams.
- **Transaction Tracking**: Record and monitor financial transactions.
- **Export Capabilities**: Export data to PDF and CSV formats.
- **Activity Logs**: Track system usage and user activities.
- **Authentication**: Secure login using Firebase Authentication.

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Radix UI](https://www.radix-ui.com/)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Firestore, Auth)
- **AI Integration**: [Genkit](https://firebase.google.com/docs/genkit)
- **Image Storage**: [Cloudinary](https://cloudinary.com/)
- **Forms**: React Hook Form & Zod
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd nextn
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up Environment Variables:
   Create a `.env.local` file in the root directory and add the following keys:

   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Cloudinary Configuration
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
   ```

4. Run the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Scripts

- `npm run dev`: Starts the development server with Turbopack.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the production server.
- `npm run lint`: Runs ESLint.
- `npm run typecheck`: Runs TypeScript compiler check.

## Project Structure

- `app/`: Next.js App Router pages and layouts.
- `components/`: Reusable UI components (Dashboard, UI elements, etc.).
- `lib/`: Utility functions and firebase configuration.
- `hooks/`: Custom React hooks.
- `public/`: Static assets.

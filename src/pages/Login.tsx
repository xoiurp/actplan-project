import React from 'react';
import { LoginForm } from '@/components/LoginForm'; // Import the newly created form
import { Link } from 'react-router-dom'; // Use Link for internal navigation if needed
import ActplanLogo from '/actplan-logo.png'; // Import your logo

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-gray-50 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 self-center font-medium mb-4">
          <img src={ActplanLogo} alt="Actplan Logo" className="h-10" /> {/* Adjust height as needed */}
        </Link>
        
        {/* Login Form Component */}
        <LoginForm />
      </div>
    </div>
  );
}

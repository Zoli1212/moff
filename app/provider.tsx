"use client";

import { AuthContext } from '@/context/AuthContext';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import React, { useContext, useEffect } from 'react';

function Provider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      createNewUser();
    }
  }, [user]);

  const createNewUser = async () => {
    try {
      await axios.post('/api/user');
    } catch (e) {
      console.error('Failed to create user:', e);
    }
  };

  return <>{children}</>;
}

// Custom hook to use auth
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export default Provider;

"use client";


import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import React, { useEffect } from 'react';

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


export default Provider;

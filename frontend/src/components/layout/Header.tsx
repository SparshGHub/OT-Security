'use client';
import React from 'react';
import { Button } from '../ui/button';
import { LogOut, User } from 'lucide-react';
import { useAppState } from '@/lib/context/AppStateContext';

const Header = () => {
  const { user, logout } = useAppState();

  return (
    <header className="flex items-center justify-between p-2 px-4 border-b border-border h-14">
      <div className="text-xl font-bold">DCS Attack Simulator</div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground"/>
            <span>{user?.name} ({user?.role})</span>
        </div>
        <Button variant="ghost" size="icon" onClick={logout}>
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};

export default Header;

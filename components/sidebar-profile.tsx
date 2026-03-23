'use client';

import * as React from 'react';
import Link from 'next/link';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

interface SidebarProfileProps {
    collapsed?: boolean;
}

export function SidebarProfile({ collapsed = false }: SidebarProfileProps) {
    const { profile, loading, isSuperAdmin } = useUserProfile();

    if (loading) {
        return (
            <div className={`flex items-center gap-3 p-2 ${collapsed ? 'justify-center' : ''}`}>
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                {!collapsed && (
                    <div className="flex flex-col gap-1 overflow-hidden w-full">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                )}
            </div>
        );
    }

    if (!profile) {
        return null;
    }

    const initials = profile.fullName
        ? profile.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
        : profile.email.substring(0, 2).toUpperCase();

    // User requested badge styling to match Radix UI existing patterns
    // We can use custom classes if generic variants don't match exactly, but let's stick to standard variants and extend with className.
    const badgeClasses = isSuperAdmin 
        ? "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200" 
        : "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200";

    const content = (
        <Link 
            href="/profile" 
            className={`flex items-center gap-3 p-2 rounded-md hover:bg-secondary w-full transition-colors ${collapsed ? 'justify-center' : ''}`}
            aria-label={collapsed ? (profile.fullName || profile.email || 'User Profile') : undefined}
        >
            <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                    {initials}
                </AvatarFallback>
            </Avatar>
            
            {!collapsed && (
                <div className="flex flex-col items-start overflow-hidden whitespace-nowrap">
                    <span className="text-sm font-medium leading-none truncate max-w-[150px]">
                        {profile.fullName || 'User'}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[150px] mt-1">
                        {profile.email}
                    </span>
                </div>
            )}
            {!collapsed && (
                <div className="ml-auto">
                    <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 ${badgeClasses}`}>
                        {profile.role === 'super_admin' ? 'Admin' : 'Team'}
                    </Badge>
                </div>
            )}
        </Link>
    );

    if (collapsed) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {content}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="flex flex-col gap-1">
                        <span className="font-semibold">{profile.fullName || 'User'}</span>
                        <Badge variant="outline" className={`w-fit ${badgeClasses} text-[10px] px-1 py-0 h-4`}>
                            {profile.role === 'super_admin' ? 'Super Admin' : 'Team Member'}
                        </Badge>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return content;
}

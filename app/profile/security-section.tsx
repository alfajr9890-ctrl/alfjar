'use client';

import { useState } from 'react';
import { 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  updatePassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { Eye, EyeOff, Loader2, Key } from 'lucide-react';

import { useFirebase } from '@/firebase/provider';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export function SecuritySection() {
    const { auth } = useFirebase();
    const { user } = useUserProfile();
    const { toast } = useToast();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isSendingReset, setIsSendingReset] = useState(false);
    
    const [error, setError] = useState<string | null>(null);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (newPassword.length < 8) {
            setError('Min 8 characters required');
            return;
        }
        if (!auth || !user?.email || !auth.currentUser) {
            setError('Authentication error');
            return;
        }

        setIsChangingPassword(true);
        try {
            const credential = EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, newPassword);
            
            toast({
                title: "Success",
                description: "Password updated successfully",
            });
            
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error('Password change error', error);
            if (error instanceof FirebaseError) {
                if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    setError('Current password is incorrect');
                } else if (error.code === 'auth/too-many-requests') {
                    setError('Too many attempts. Please try again later');
                } else {
                    setError(error.message || 'Failed to update password');
                }
            } else if (error instanceof Error) {
                setError(error.message || 'Failed to update password');
            } else {
                setError('Failed to update password');
            }
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!auth || !user?.email) return;

        setIsSendingReset(true);
        setError(null);
        try {
            await sendPasswordResetEmail(auth, user.email);
            toast({
                title: "Reset Email Sent",
                description: `Reset email sent to ${user.email}`,
            });
        } catch (error) {
            console.error('Reset password error', error);
            // We may not want to overwrite password change errors if they are operating independently,
            // but it's simpler to use the same error state or just the toast.
            if (error instanceof FirebaseError || error instanceof Error) {
                setError(error.message || 'Failed to send reset email');
            } else {
                setError('Failed to send reset email');
            }
        } finally {
            setIsSendingReset(false);
        }
    };

    if (!user) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Security
                </CardTitle>
                <CardDescription>
                    Update your password and secure your account.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2 relative">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                            <Input
                                id="currentPassword"
                                type={showCurrentPassword ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                disabled={isChangingPassword}
                                className="pr-10"
                                required
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                                {showCurrentPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2 relative">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                            <Input
                                id="newPassword"
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={isChangingPassword}
                                className="pr-10"
                                required
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                                {showNewPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2 relative">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isChangingPassword}
                                className="pr-10"
                                required
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm font-medium text-destructive mt-2">{error}</p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <Button 
                            type="submit" 
                            disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                        >
                            {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Password
                        </Button>
                        
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={handleForgotPassword}
                            disabled={isSendingReset || isChangingPassword}
                        >
                            {isSendingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Forgot Password?
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

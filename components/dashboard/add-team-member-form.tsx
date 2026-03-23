'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { collection } from 'firebase/firestore';

import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { addTeamMemberSchema, type AddTeamMemberSchema, type RoleSchema } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { createTeamMember } from '@/firebase/auth/admin-create-user';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

type Role = RoleSchema & { id: string };

export function AddTeamMemberForm() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rolesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'roles') : null, [firestore]);
  const { data: roles, isLoading: areRolesLoading } = useCollection<Role>(rolesCollection);

  const form = useForm<AddTeamMemberSchema>({
    resolver: zodResolver(addTeamMemberSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      roleId: undefined,
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    if (!firestore) {
        toast({ title: 'Error', description: 'Database not available.', variant: 'destructive'});
        return;
    }
    setIsSubmitting(true);

    try {
      await createTeamMember(firestore, data);

      toast({
        title: 'Success!',
        description: `Team member ${data.fullName} created successfully.`,
      });
      router.push('/dashboard/team');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
          errorMessage = 'An account with this email already exists.';
      } else if (error.message) {
          errorMessage = error.message;
      }
      toast({
        title: 'Error Creating Member',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="w-full space-y-6">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="e.g. john.doe@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="roleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={areRolesLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={areRolesLoading ? "Loading roles..." : "Select a role to assign"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {roles?.map(role => (
                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting || areRolesLoading}
            className="bg-accent hover:bg-accent/90"
          >
            {isSubmitting ? 'Creating User...' : 'Create User'}
            <UserPlus className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
}

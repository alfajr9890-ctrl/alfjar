'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';

import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useDoc as useDocHook } from '@/firebase/firestore/use-doc';
import { roleSchema, type RoleSchema } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '../ui/skeleton';

export function EditRoleForm({ roleId }: { roleId: string }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleDocRef = useMemoFirebase(() => {
    if (!firestore || !roleId) return null;
    return doc(firestore, 'roles', roleId);
  }, [firestore, roleId]);

  const { data: role, isLoading } = useDocHook<RoleSchema>(roleDocRef);

  const form = useForm<RoleSchema>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      permissions: {
        dashboard: { read: false },
        members: { create: false, read: false, update: false, delete: false },
        transactions: { create: false, read: false, update: false, delete: false },
        team: { create: false, read: false, update: false, delete: false },
      },
    },
  });

  useEffect(() => {
    if (role) {
      form.reset(role);
    }
  }, [role, form]);

  const onSubmit = form.handleSubmit(async (data) => {
    if (!roleDocRef) return;
    setIsSubmitting(true);

    try {
      await updateDoc(roleDocRef, data);
      toast({
        title: 'Success!',
        description: `Role "${data.name}" has been updated.`,
      });
      router.push(`/dashboard/roles/${roleId}`);
    } catch (error) {
      const isPermissionError = error instanceof FirestorePermissionError;
      if (!isPermissionError) {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: roleDocRef.path,
            operation: 'update',
            requestResourceData: data,
          })
        );
      }
      console.error("Error updating role:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update role.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  });
  
  if (isLoading) {
      return (
          <div className="space-y-6">
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-64 w-full" />
              <div className="flex justify-end">
                <Skeleton className="h-10 w-32" />
              </div>
          </div>
      )
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="w-full space-y-6">
        <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Role Name</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. Manager" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Resource</TableHead>
                        <TableHead className="text-center">View</TableHead>
                        <TableHead className="text-center">Create</TableHead>
                        <TableHead className="text-center">Edit</TableHead>
                        <TableHead className="text-center">Delete</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium">Dashboard</TableCell>
                            <TableCell className="text-center">
                                <FormField
                                    control={form.control}
                                    name="permissions.dashboard.read"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium">Members</TableCell>
                            {(['read', 'create', 'update', 'delete'] as const).map(p => (
                                <TableCell key={`m-${p}`} className="text-center">
                                     <FormField
                                        control={form.control}
                                        name={`permissions.members.${p}`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </TableCell>
                            ))}
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium">Transactions</TableCell>
                            {(['read', 'create', 'update', 'delete'] as const).map(p => (
                                <TableCell key={`t-${p}`} className="text-center">
                                     <FormField
                                        control={form.control}
                                        name={`permissions.transactions.${p}`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </TableCell>
                            ))}
                        </TableRow>
                         <TableRow>
                            <TableCell className="font-medium">Team</TableCell>
                            {(['read', 'create', 'update', 'delete'] as const).map(p => (
                                <TableCell key={`team-${p}`} className="text-center">
                                     <FormField
                                        control={form.control}
                                        name={`permissions.team.${p}`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <div className="flex justify-end">
            <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-accent hover:bg-accent/90"
            >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
                <Save className="ml-2 h-4 w-4" />
            </Button>
        </div>
      </form>
    </Form>
  );
}

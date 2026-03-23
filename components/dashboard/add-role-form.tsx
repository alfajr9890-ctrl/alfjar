'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, addDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';

import { useFirebase } from '@/firebase/provider';
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

export function AddRoleForm() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RoleSchema>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      permissions: {
        dashboard: { read: false },
        members: { create: false, read: false, update: false, delete: false },
        transactions: { create: false, read: false, update: false, delete: false },
        team: { create: false, read: false, update: false, delete: false },
      }
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    if (!firestore) return;
    setIsSubmitting(true);

    try {
      const rolesCollection = collection(firestore, 'roles');
      await addDoc(rolesCollection, data);
      
      toast({
        title: 'Success!',
        description: `Role "${data.name}" created successfully.`,
      });
      router.push('/dashboard/roles');
    } catch (error) {
      const isPermissionError = error instanceof FirestorePermissionError;
      if (!isPermissionError) {
        // This path is less likely for addDoc, but good practice.
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: 'roles', // No specific doc ID on create yet
            operation: 'create',
            requestResourceData: data,
          })
        );
      }
      console.error("Error creating role:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create role.';
      toast({
        title: 'Error',
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
                {isSubmitting ? 'Creating...' : 'Create Role'}
                <Save className="ml-2 h-4 w-4" />
            </Button>
        </div>
      </form>
    </Form>
  );
}

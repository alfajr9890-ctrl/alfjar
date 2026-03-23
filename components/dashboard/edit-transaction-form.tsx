'use client'

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Save } from 'lucide-react';
import { collection, doc, updateDoc } from 'firebase/firestore';

import { editTransactionSchema, type EditTransactionSchema } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection as useCollectionHook } from '@/firebase/firestore/use-collection';
import { useDoc as useDocHook } from '@/firebase/firestore/use-doc';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { createLog } from '@/lib/logger';
import { useUserProfile } from '@/firebase/auth/use-user-profile';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '../ui/skeleton';

interface Member {
    id: string;
    fullName: string;
}

export function EditTransactionForm({ transactionId }: { transactionId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { firestore, user } = useFirebase();
  const { profile } = useUserProfile();

  const transactionDocRef = useMemoFirebase(() => {
    if (!firestore || !transactionId) return null;
    return doc(firestore, 'transactions', transactionId);
  }, [firestore, transactionId]);

  const { data: transaction, isLoading: isTransactionLoading } = useDocHook<EditTransactionSchema>(transactionDocRef);

  const membersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'members') : null, [firestore]);
  const { data: members, isLoading: isLoadingMembers } = useCollectionHook<Member>(membersCollection);

  const form = useForm<EditTransactionSchema>({
    resolver: zodResolver(editTransactionSchema),
    defaultValues: {
      memberId: '',
      type: 'credit',
      amount: 0,
      description: '',
      date: new Date(),
    },
  });

  useEffect(() => {
    if (transaction) {
      form.reset({
        ...transaction,
        // Ensure values are not undefined to prevent uncontrolled -> controlled warning
        description: transaction.description || '',
        amount: transaction.amount || 0,
        date: new Date(transaction.date),
      });
    }
  }, [transaction, form]);

  const onSubmit = form.handleSubmit(async (data) => {
    if (!transactionDocRef || !user || !profile) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        date: data.date.toISOString(),
      };
      
      await updateDoc(transactionDocRef, payload);

      await createLog(
        firestore,
        { user, profile },
        {
          actionType: 'transaction_updated',
          entityType: 'transaction',
          entityId: transactionId,
        }
      );

      toast({
        title: 'Success!',
        description: 'Transaction updated successfully!',
      });
      router.push(`/dashboard/transactions/${transactionId}`);
    } catch (error) {
       const isPermissionError = error instanceof FirestorePermissionError;
       if (!isPermissionError) {
           errorEmitter.emit(
              'permission-error',
              new FirestorePermissionError({
                  path: transactionDocRef.path,
                  operation: 'update',
                  requestResourceData: { ...data, date: data.date.toISOString() },
              })
          );
       }
      const errorMessage = error instanceof Error ? error.message : 'Failed to update transaction.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  });

  if (isTransactionLoading) {
    return <EditFormSkeleton />;
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-8 gap-y-6">
          <FormField
            control={form.control}
            name="memberId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Member</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingMembers}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingMembers ? "Loading members..." : "Select a member"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {members?.map(member => (
                        <SelectItem key={member.id} value={member.id}>{member.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Transaction Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (₹)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0.00" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Transaction Type</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex items-center space-x-4"
                  >
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="credit" />
                      </FormControl>
                      <FormLabel className="font-normal">Credit</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="debit" />
                      </FormControl>
                      <FormLabel className="font-normal">Debit</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Describe the transaction..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || isLoadingMembers} className="bg-accent hover:bg-accent/90">
             {isSubmitting ? 'Saving...' : 'Save Changes'}
            <Save className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
}


function EditFormSkeleton() {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                 <div className="md:col-span-2 space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-20 w-full" /></div>
            </div>
            <div className="flex justify-end">
                <Skeleton className="h-10 w-32" />
            </div>
        </div>
    )
}

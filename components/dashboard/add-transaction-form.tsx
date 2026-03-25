'use client'

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, PlusCircle, Check, ChevronsUpDown } from 'lucide-react';
import { collection, doc, setDoc } from 'firebase/firestore';

import { addTransactionSchema, type AddTransactionSchema } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection as useCollectionHook } from '@/firebase/firestore/use-collection';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface Member {
    id: string;
    fullName: string;
}

export function AddTransactionForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const { toast } = useToast();
  const router = useRouter();
  const { firestore, user } = useFirebase();
  const { profile } = useUserProfile();

  const membersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'members') : null, [firestore]);
  const { data: members, isLoading: isLoadingMembers } = useCollectionHook<Member>(membersCollection);

  const form = useForm<AddTransactionSchema>({
    resolver: zodResolver(addTransactionSchema),
    defaultValues: {
      memberId: undefined,
      type: 'credit',
      amount: 0,
      description: '',
    },
  });

  useEffect(() => {
    form.setValue('date', new Date());
  }, [form]);

  const onSubmit = form.handleSubmit(async (data) => {
    if (!firestore || !user || !profile) {
        toast({ title: 'Error', description: 'Firebase not initialized.', variant: 'destructive' });
        return;
    }

    setIsSubmitting(true);
    const newTransactionRef = doc(collection(firestore, 'transactions'));
    try {
        const finalTransactionData = {
            ...data,
            date: data.date.toISOString(),
            creatorId: user.uid,
            creatorName: profile.fullName,
            creatorEmail: profile.email,
        };
        
        await setDoc(newTransactionRef, finalTransactionData);
        
        await createLog(
            firestore,
            { user, profile },
            {
                actionType: 'transaction_created',
                entityType: 'transaction',
                entityId: newTransactionRef.id,
            }
        );

        toast({
          title: 'Success!',
          description: 'Transaction added successfully!',
        });
        form.reset();
        router.push('/dashboard/transactions');

    } catch (error) {
        const isPermissionError = error instanceof FirestorePermissionError;
        if (!isPermissionError) {
             errorEmitter.emit(
                'permission-error',
                new FirestorePermissionError({
                    path: newTransactionRef.path,
                    operation: 'create',
                    requestResourceData: { ...data, date: data.date.toISOString(), creatorId: user.uid, },
                })
            );
        }
       
        const errorMessage = error instanceof Error ? error.message : 'Failed to add transaction.';
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
      <form onSubmit={onSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-8 gap-y-6">
          <FormField
            control={form.control}
            name="memberId"
            render={({ field }) => {
              const selectedMember = members?.find(m => m.id === field.value);
              const filteredMembers = members?.filter(m =>
                m.fullName.toLowerCase().includes(memberSearch.toLowerCase())
              );
              return (
                <FormItem className="flex flex-col">
                  <FormLabel>Member</FormLabel>
                  <Popover open={memberOpen} onOpenChange={setMemberOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={memberOpen}
                          disabled={isLoadingMembers}
                          className={cn(
                            'w-full justify-between font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {isLoadingMembers
                            ? 'Loading members...'
                            : selectedMember
                            ? selectedMember.fullName
                            : 'Select a member'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search member..."
                          value={memberSearch}
                          onValueChange={setMemberSearch}
                        />
                        <CommandList>
                          <CommandEmpty>No member found.</CommandEmpty>
                          <CommandGroup>
                            {filteredMembers?.map(member => (
                              <CommandItem
                                key={member.id}
                                value={member.id}
                                onMouseDown={e => e.preventDefault()}
                                onSelect={() => {
                                  field.onChange(member.id);
                                  setMemberSearch('');
                                  setMemberOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    field.value === member.id ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                {member.fullName}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              );
            }}
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
                    defaultValue={field.value}
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
             {isSubmitting ? 'Adding...' : 'Add Transaction'}
            <PlusCircle className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
}

    
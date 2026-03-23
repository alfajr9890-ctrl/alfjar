'use client'

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, UserPlus } from 'lucide-react';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';

import { addMemberSchema, type AddMemberSchema } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/provider';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { createLog } from '@/lib/logger';
import { useUserProfile } from '@/firebase/auth/use-user-profile';


import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export function AddMemberForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { firestore, user } = useFirebase();
  const { profile } = useUserProfile();

  const form = useForm<AddMemberSchema>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      fullName: '',
      mobileNumber: '',
      address: '',
      membershipType: undefined,
      status: 'active',
      openingBalance: 0,
      adharNumber: '',
      photo: undefined,
    },
  });

  // Set default date on client-side to prevent hydration error
  useEffect(() => {
    form.setValue('dateOfJoining', new Date());
  }, [form]);

  const onSubmit = form.handleSubmit(async (data) => {
    if (!firestore || !user || !profile) {
        toast({ title: 'Error', description: 'Firebase not initialized. Please try again.', variant: 'destructive' });
        return;
    }

    setIsSubmitting(true);
    const newMemberRef = doc(collection(firestore, 'members'));
    try {
        let photoUrl = '';
        let photoId = '';

        if (data.photo && data.photo.length > 0) {
            const file = data.photo[0];
            
            // Check file size (max 3MB)
            const MAX_SIZE = 3 * 1024 * 1024; // 3MB in bytes
            if (file.size > MAX_SIZE) {
                 toast({ title: 'File too large', description: 'Photo must be smaller than 3MB.', variant: 'destructive' });
                 setIsSubmitting(false);
                 return;
            }

            const uploadResponse = await uploadToCloudinary(file);
            photoUrl = uploadResponse.secure_url;
            photoId = uploadResponse.public_id;
        }

        // Explicitly construct payload to avoid potential issues with spread and undefined values
        // Explicitly construct payload to avoid potential issues with spread and undefined values
        // Explicitly construct payload to avoid potential issues with spread and undefined values
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const finalMemberData: any = {
            fullName: data.fullName,
            fullNameLowerCase: data.fullName.toLowerCase(),
            mobileNumber: data.mobileNumber || "0000000000",
            address: data.address || "Demo Address, Demo City",
            membershipType: data.membershipType,
            status: data.status,
            openingBalance: data.openingBalance,
            adharNumber: data.adharNumber || "000000000000",
            dateOfJoining: data.dateOfJoining.toISOString(),
            creatorId: user.uid,
            photoUrl: photoUrl || "",
            photoId: photoId || "",
        };
        
        await setDoc(newMemberRef, finalMemberData);

        // Explicit Verification: Check if document exists
        const verifySnapshot = await getDoc(newMemberRef);
        if (!verifySnapshot.exists()) {
             throw new Error("Verification failed: Member was not saved to database.");
        }
        
        await createLog(
            firestore,
            { user, profile },
            {
                actionType: 'member_created',
                entityType: 'member',
                entityId: newMemberRef.id,
            }
        );

        toast({
          title: 'Success!',
          description: 'Member added successfully!',
        });
        form.reset();
        router.push('/dashboard/members');

    } catch (error) {
        const isPermissionError = error instanceof FirestorePermissionError;
        if (!isPermissionError) {
             errorEmitter.emit(
                'permission-error',
                new FirestorePermissionError({
                    path: newMemberRef.path,
                    operation: 'create',
                    requestResourceData: { ...data, dateOfJoining: data.dateOfJoining.toISOString(), creatorId: user.uid, },
                })
            );
        }
       
        const errorMessage = error instanceof Error ? error.message : 'Failed to add member. Please try again.';
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
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mobileNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile Number (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="9876543210" type="tel" {...field} />
                </FormControl>
                <FormDescription className="text-xs">If left empty, a demo number will be used.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Address (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="123 Main St, Anytown..." {...field} />
                </FormControl>
                 <FormDescription className="text-xs">If left empty, a demo address will be used.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="membershipType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Membership Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a membership type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="lifetime">Lifetime</SelectItem>
                    <SelectItem value="half-yearly">Half-Yearly</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dateOfJoining"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date of Joining</FormLabel>
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
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
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
            name="adharNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Aadhaar Number</FormLabel>
                <FormControl>
                  <Input placeholder="Aadhaar Number (Optional)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="openingBalance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Opening Balance (₹)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0.00" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex items-center space-x-4"
                  >
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="active" />
                      </FormControl>
                      <FormLabel className="font-normal">Active</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="inactive" />
                      </FormControl>
                      <FormLabel className="font-normal">Inactive</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
              control={form.control}
              name="photo"
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              render={({ field: { value: _value, onChange: _onChange, ...rest } }) => (
                <FormItem>
                  <FormLabel>Member Photo</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        form.setValue("photo", e.target.files);
                      }}
                      {...rest}
                    />
                  </FormControl>
                  <FormDescription>Upload a picture of the member (optional, max 3MB).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting} className="bg-accent hover:bg-accent/90">
             {isSubmitting ? 'Adding...' : 'Add Member'}
            <UserPlus className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
}

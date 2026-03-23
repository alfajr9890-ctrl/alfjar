'use client'

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, UserCog } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';

import { editMemberSchema, type EditMemberSchema } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useDoc as useDocHook } from '@/firebase/firestore/use-doc';
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
import { Skeleton } from '../ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function EditMemberForm({ memberId }: { memberId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { firestore, user } = useFirebase();
  const { profile } = useUserProfile();

  const memberDocRef = useMemoFirebase(() => {
    if (!firestore || !memberId) return null;
    return doc(firestore, 'members', memberId);
  }, [firestore, memberId]);

  const { data: member, isLoading: isMemberLoading } = useDocHook<EditMemberSchema & { photoUrl?: string }>(memberDocRef);

  const form = useForm<EditMemberSchema>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      fullName: '',
      mobileNumber: '',
      address: '',
      membershipType: 'yearly',
      dateOfJoining: new Date(),
      status: 'active',
      openingBalance: 0,
      adharNumber: '',
      photo: undefined,
    },
  });

  useEffect(() => {
    if (member) {
      form.reset({
        fullName: member.fullName || '',
        mobileNumber: member.mobileNumber || '',
        address: member.address || '',
        membershipType: member.membershipType,
        dateOfJoining: new Date(member.dateOfJoining),
        status: member.status,
        openingBalance: member.openingBalance || 0,
        adharNumber: member.adharNumber || '',
        photo: undefined,
      });
      // Explicitly set value for the Select component to ensure UI update
      form.setValue('membershipType', member.membershipType);
    }
  }, [member, form]);

  const onSubmit = form.handleSubmit(async (data) => {
    if (!memberDocRef || !user || !profile) return;

    setIsSubmitting(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let payload: { [key: string]: any } = {};

    try {
      // Explicitly build the payload to ensure no 'undefined' fields are sent
      payload = {
        fullName: data.fullName,
        fullNameLowerCase: data.fullName.toLowerCase(),
        mobileNumber: data.mobileNumber || "0000000000",
        address: data.address || "Demo Address, Demo City",
        membershipType: data.membershipType,
        dateOfJoining: data.dateOfJoining.toISOString(),
        status: data.status,
        openingBalance: data.openingBalance,
        adharNumber: data.adharNumber || "000000000000",
      };
      
      if (data.photo && data.photo.length > 0) {
        const file = data.photo[0];
        const uploadResponse = await uploadToCloudinary(file);
        payload.photoUrl = uploadResponse.secure_url;
        payload.photoId = uploadResponse.public_id;
      }

      await updateDoc(memberDocRef, payload);
      
      await createLog(
        firestore,
        { user, profile },
        {
          actionType: 'member_updated',
          entityType: 'member',
          entityId: memberId,
        }
      );

      toast({
        title: 'Success!',
        description: 'Member updated successfully!',
      });
      router.push(`/dashboard/members/${memberId}`);
    } catch (error) {
       const isPermissionError = error instanceof FirestorePermissionError;
       if (!isPermissionError) {
           errorEmitter.emit(
              'permission-error',
              new FirestorePermissionError({
                  path: memberDocRef.path,
                  operation: 'update',
                  requestResourceData: payload,
              })
          );
       }
      const errorMessage = error instanceof Error ? error.message : 'Failed to update member. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  });

  if (isMemberLoading) {
    return <EditFormSkeleton />;
  }

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
                  <Input placeholder="12-digit number" {...field} />
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
                  <Input type="number" placeholder="0.00" {...field} onChange={e => field.onChange(Number(e.target.value))}/>
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
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  <FormLabel>Change Member Photo</FormLabel>
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
                  <FormDescription>
                    Upload a new photo to replace the current one. Leave empty to keep the existing photo.
                    {member?.photoUrl && (
                        <div className="mt-2">
                            <div className="text-sm font-medium">Current Photo:</div>
                            <img src={member.photoUrl} alt="Current member" className="h-20 w-20 rounded-md object-cover" />
                        </div>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting} className="bg-accent hover:bg-accent/90">
             {isSubmitting ? 'Saving...' : 'Save Changes'}
            <UserCog className="ml-2 h-4 w-4" />
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
                <div className="md:col-span-2 space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-20 w-full" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-1/ loung" /><Skeleton className="h-10 w-full" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
            </div>
            <div className="flex justify-end">
                <Skeleton className="h-10 w-32" />
            </div>
        </div>
    )
}

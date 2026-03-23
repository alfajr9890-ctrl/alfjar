import { z } from "zod";

export const loginSchema = z.object({
  fullName: z
    .string()
    .min(2, { message: "Full name must be at least 2 characters." })
    .optional(),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
});

export const addMemberSchema = z.object({
  fullName: z
    .string()
    .min(2, { message: "Full name must be at least 2 characters." }),
  mobileNumber: z.string().optional(),
  address: z.string().optional(),
  membershipType: z.enum(["yearly", "lifetime", "half-yearly"], {
    required_error: "Please select a membership type.",
  }),
  dateOfJoining: z.date({
    required_error: "A date of joining is required.",
  }),
  status: z.enum(["active", "inactive"]),
  openingBalance: z.coerce
    .number()
    .min(0, { message: "Opening balance cannot be negative." }),
  adharNumber: z
    .string()
    .max(20, { message: "Aadhaar number cannot exceed 20 characters." })
    .optional(),
  photo: z.any().optional(),
});

export type AddMemberSchema = z.infer<typeof addMemberSchema>;

export const editMemberSchema = addMemberSchema.extend({
  photo: z.any().optional(),
});

export type EditMemberSchema = z.infer<typeof editMemberSchema>;

export const addTransactionSchema = z.object({
  memberId: z
    .string({ required_error: "Please select a member." })
    .min(1, "Please select a member."),
  type: z.enum(["credit", "debit"]),
  amount: z.coerce
    .number()
    .positive({ message: "Amount must be a positive number." }),
  description: z.string().optional(),
  date: z.date({ required_error: "A transaction date is required." }),
});

export type AddTransactionSchema = z.infer<typeof addTransactionSchema>;

export const editTransactionSchema = addTransactionSchema;

export type EditTransactionSchema = z.infer<typeof editTransactionSchema>;

export const permissionsSchema = z.object({
  dashboard: z.object({
    read: z.boolean(),
  }),
  members: z.object({
    create: z.boolean(),
    read: z.boolean(),
    update: z.boolean(),
    delete: z.boolean(),
  }),
  transactions: z.object({
    create: z.boolean(),
    read: z.boolean(),
    update: z.boolean(),
    delete: z.boolean(),
  }),
  team: z.object({
    create: z.boolean(),
    read: z.boolean(),
    update: z.boolean(),
    delete: z.boolean(),
  }),
});
export type PermissionsSchema = z.infer<typeof permissionsSchema>;

export const roleSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Role name must be at least 2 characters." }),
  permissions: permissionsSchema,
});
export type RoleSchema = z.infer<typeof roleSchema>;

export const addTeamMemberSchema = z
  .object({
    fullName: z
      .string()
      .min(2, { message: "Full name must be at least 2 characters." }),
    email: z.string().email({ message: "Please enter a valid email." }),
    roleId: z
      .string({ required_error: "Please select a role." })
      .min(1, { message: "Please select a role." }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z
      .string()
      .min(6, { message: "Password must be at least 6 characters." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type AddTeamMemberSchema = z.infer<typeof addTeamMemberSchema>;

export const userProfileSchema = z.object({
  fullName: z.string(),
  email: z.string().email(),
  role: z.enum(["super_admin", "team_member"]),
  permissions: permissionsSchema,
  assignedRoleId: z.string().optional(),
  assignedRoleName: z.string().optional(),
});
export type UserProfileSchema = z.infer<typeof userProfileSchema>;

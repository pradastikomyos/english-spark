import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// Zod schema for form validation
const studentSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  student_id: z.string().min(3, { message: 'Student ID must be at least 3 characters.' }),
});

type StudentFormData = z.infer<typeof studentSchema>;

// Define the type for a student based on your database schema
interface Student {
  id: string;
  user_id: string; // Important for delete operation
  name: string;
  email: string;
  student_id: string;
  created_at: string;
}

// Fetch function to get all students
const fetchStudents = async (): Promise<Student[]> => {
  try {
    // First try to use RPC call for admin access
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_students_admin');
    
    if (!rpcError && rpcData) {
      return rpcData;
    }
    
    // Fallback to direct table query
    const { data, error } = await supabase
      .from('students')
      .select('id, user_id, name, email, student_id, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      // If it's an RLS policy error, provide a more helpful message
      if (error.message.includes('policy') || error.message.includes('recursion')) {
        throw new Error('Database access configuration issue. Please contact administrator.');
      }
      throw new Error(error.message);
    }
    
    return data || [];
  } catch (err: any) {
    throw new Error(err.message || 'Failed to fetch students');
  }
};

// Function to call the create RPC
const createStudent = async (studentData: StudentFormData) => {
  const { data, error } = await supabase.rpc('create_student_user', {
    p_name: studentData.name,
    p_email: studentData.email,
    p_student_id: studentData.student_id,
  });
  if (error) throw new Error(error.message);
  return data[0];
};

// Function to call the update RPC
const updateStudent = async (studentData: StudentFormData & { id: string }) => {
  const { error } = await supabase.rpc('update_student_details', {
    p_profile_id: studentData.id,
    p_name: studentData.name,
    p_email: studentData.email,
    p_student_id: studentData.student_id,
  });
  if (error) throw new Error(error.message);
};

export function StudentManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: { name: '', email: '', student_id: '' },
  });

  // Effect to reset form when edit dialog opens
  useEffect(() => {
    if (studentToEdit) {
      form.reset({
        name: studentToEdit.name,
        email: studentToEdit.email,
        student_id: studentToEdit.student_id,
      });
    } else {
      form.reset({ name: '', email: '', student_id: '' });
    }
  }, [studentToEdit, form]);

  const { data: students, isLoading, error } = useQuery<Student[]>({ 
    queryKey: ['students'], 
    queryFn: fetchStudents 
  });

  const createMutation = useMutation({
    mutationFn: createStudent,
    onSuccess: (data) => {
      toast({
        title: 'Student Created!',
        description: `Account for ${data.name} created. Password: ${data.temporary_password}`,
      });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateStudent,
    onSuccess: () => {
      toast({ title: 'Success', description: 'Student details have been updated.' });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setStudentToEdit(null);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('delete_student_user', { p_user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Student has been deleted.' });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setStudentToDelete(null);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setStudentToDelete(null);
    },
  });

  const onFormSubmit = (values: StudentFormData) => {
    if (studentToEdit) {
      updateMutation.mutate({ ...values, id: studentToEdit.id });
    } else {
      createMutation.mutate(values);
    }
  };

  if (isLoading) return <div>Loading students...</div>;
  if (error) return <div>Error fetching students: {error.message}</div>;

  return (
    <AlertDialog>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Student Management</h2>
        <Dialog open={isAddDialogOpen || !!studentToEdit} onOpenChange={(isOpen) => {
          if (!isOpen) {
            setIsAddDialogOpen(false);
            setStudentToEdit(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add New Student</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{studentToEdit ? 'Edit Student' : 'Add New Student'}</DialogTitle>
              <DialogDescription>
                {studentToEdit ? 'Update the student details below.' : 'Create a new student account. A temporary password will be generated.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Jane Doe" {...field} />
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
                        <Input placeholder="jane.doe@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="student_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student ID</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. STU001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (studentToEdit ? 'Save Changes' : 'Create Student')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students?.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{student.student_id}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setStudentToEdit(student)}>
                          Edit
                        </DropdownMenuItem>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            className="text-red-600"
                            onSelect={(e) => {
                              e.preventDefault();
                              setStudentToDelete(student);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {studentToDelete && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the account for <strong>{studentToDelete.name}</strong> and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStudentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(studentToDelete.user_id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Yes, delete student'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}

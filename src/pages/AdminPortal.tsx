import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TeacherManagement from '@/components/admin/TeacherManagement';
import AdminQuizManagement from '@/components/admin/QuizManagement';
import { StudentManagement } from '@/components/admin/StudentManagement';

import AdminMaterialManagement from '@/components/admin/MaterialManagement';
import AdminLayout from '@/components/admin/AdminLayout';

const AdminPortal: React.FC = () => {
  return (
    <AdminLayout>
      <Tabs defaultValue="teachers" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="teachers">Manage Teachers</TabsTrigger>
          <TabsTrigger value="students">Manage Students</TabsTrigger>
          <TabsTrigger value="quizzes">Manage Quizzes</TabsTrigger>
          <TabsTrigger value="materials">Manage Materials</TabsTrigger>
        </TabsList>
        
        <TabsContent value="teachers" className="mt-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <TeacherManagement />
          </div>
        </TabsContent>
        
        <TabsContent value="students" className="mt-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <StudentManagement />
          </div>
        </TabsContent>
        
        <TabsContent value="quizzes" className="mt-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <AdminQuizManagement />
          </div>
        </TabsContent>
        
        <TabsContent value="materials" className="mt-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <AdminMaterialManagement />
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminPortal;

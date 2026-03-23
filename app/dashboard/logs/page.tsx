'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LogList } from '@/components/dashboard/log-list';

export default function LogsPage() {
  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>Search, filter, and review all system activities.</CardDescription>
        </CardHeader>
        <CardContent>
          <LogList />
        </CardContent>
      </Card>
    </div>
  );
}

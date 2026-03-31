'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { IconDots } from '@tabler/icons-react';
import { ES } from '@/lib/spanish';

export type StaffUser = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  position: string | null;
  role: 'admin' | 'manager' | 'front_desk' | 'room_service' | 'housekeeping';
  tasks: string[];
  created_at: string;
};

const ROLE_LABELS: Record<StaffUser['role'], string> = {
  admin: ES.users.roleAdmin,
  manager: ES.users.roleManager,
  front_desk: ES.users.roleFrontDesk,
  room_service: ES.users.roleRoomService,
  housekeeping: ES.users.roleHousekeeping,
};

const ROLE_COLORS: Record<StaffUser['role'], string> = {
  admin: 'bg-red-100 text-red-800',
  manager: 'bg-purple-100 text-purple-800',
  front_desk: 'bg-blue-100 text-blue-800',
  room_service: 'bg-green-100 text-green-800',
  housekeeping: 'bg-yellow-100 text-yellow-800',
};

export const columns: ColumnDef<StaffUser>[] = [
  {
    accessorKey: 'first_name',
    header: ES.users.name,
    cell: ({ row }) => {
      const firstName = row.original.first_name || '';
      const lastName = row.original.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return <div className="font-medium">{fullName || '-'}</div>;
    },
  },
  {
    accessorKey: 'email',
    header: ES.auth.email,
    cell: ({ row }) => <div className="text-sm text-muted-foreground">{row.getValue('email')}</div>,
  },
  {
    accessorKey: 'phone',
    header: ES.users.phone,
    cell: ({ row }) => {
      const phone = row.original.phone;
      return <div className="text-sm">{phone || '-'}</div>;
    },
  },
  {
    accessorKey: 'position',
    header: ES.users.position,
    cell: ({ row }) => {
      const position = row.original.position;
      return <div className="text-sm">{position || '-'}</div>;
    },
  },
  {
    accessorKey: 'role',
    header: ES.users.role,
    cell: ({ row }) => {
      const role = row.getValue('role') as StaffUser['role'];
      return (
        <Badge className={ROLE_COLORS[role] || 'bg-gray-100 text-gray-800'}>
          {ROLE_LABELS[role] || role}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const user = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">{ES.common.openMenu}</span>
              <IconDots className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{ES.common.actions}</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                // Edit action - handled by parent component
                window.dispatchEvent(
                  new CustomEvent('edit-user', {
                    detail: user,
                  })
                );
              }}
            >
              {ES.common.edit}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                // Delete action - handled by parent component
                window.dispatchEvent(
                  new CustomEvent('delete-user', {
                    detail: user,
                  })
                );
              }}
            >
              {ES.common.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

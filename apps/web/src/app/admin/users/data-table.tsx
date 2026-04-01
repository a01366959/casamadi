'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { IconRefresh, IconUsers } from '@tabler/icons-react';
import { ES } from '@/lib/spanish';

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [selectedRole, setSelectedRole] = React.useState<string>('');
  const [selectedPosition, setSelectedPosition] = React.useState<string>('');

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  // Unique roles and positions for filter dropdowns
  const roles = React.useMemo(() => Array.from(new Set(data.map((u: any) => u.role))), [data]);
  const positions = React.useMemo(() => Array.from(new Set(data.map((u: any) => u.position).filter(Boolean))), [data]);

  // Filtering logic
  React.useEffect(() => {
    if (selectedRole) {
      table.getColumn('role')?.setFilterValue(selectedRole);
    } else {
      table.getColumn('role')?.setFilterValue(undefined);
    }
  }, [selectedRole]);
  React.useEffect(() => {
    if (selectedPosition) {
      table.getColumn('position')?.setFilterValue(selectedPosition);
    } else {
      table.getColumn('position')?.setFilterValue(undefined);
    }
  }, [selectedPosition]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={ES.users.searchPlaceholder}
          value={(table.getColumn('email')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('email')?.setFilterValue(event.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2">
          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
            className="rounded border px-2 py-1 text-sm text-muted-foreground"
            >
              <option value="">{ES.users.allRoles || 'All roles'}</option>
              {roles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <select
              value={selectedPosition}
              onChange={e => setSelectedPosition(e.target.value)}
              className="rounded border px-2 py-1 text-sm text-muted-foreground"
            >
              <option value="">{ES.users.allPositions || 'All positions'}</option>
              {positions.map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {ES.users.columns}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="ml-auto">
            {/* Nuevo usuario button will be rendered by parent (UserDrawer) */}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-white">
          <Table>
            <TableHeader className="bg-muted/40">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="py-2 px-3 text-xs font-semibold text-muted-foreground">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className={row.getIsSelected() ? 'bg-primary/5' : ''}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2 px-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-96 p-0">
                    <Empty className="h-full bg-muted/30">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <IconUsers />
                        </EmptyMedia>
                        <EmptyTitle>{ES.users.noUsers}</EmptyTitle>
                        <EmptyDescription className="max-w-xs text-pretty">
                          {ES.users.noUsersDesc}
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button
                          variant="outline"
                          onClick={() => window.location.reload()}
                        >
                          <IconRefresh />
                          {ES.common.refresh || 'Refresh'}
                        </Button>
                      </EmptyContent>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} {ES.users.usersTotal}
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => table.previousPage()}
                  className={!table.getCanPreviousPage() ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>

              {Array.from({ length: Math.min(5, table.getPageCount()) }).map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    isActive={table.getState().pagination.pageIndex === i}
                    onClick={() => table.setPageIndex(i)}
                    className="cursor-pointer"
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              {table.getPageCount() > 5 && (
                <>
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                </>
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() => table.nextPage()}
                  className={!table.getCanNextPage() ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    );
  }

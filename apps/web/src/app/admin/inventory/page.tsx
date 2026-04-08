'use client';

import { useAuth } from '@/lib/supabase/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { ES } from '@/lib/spanish';
import { useUserRole } from '@/lib/supabase/use-user-role';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import {
  ColumnDef,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { toast } from 'sonner';
import {
  ChevronDown,
  LayoutGrid,
  ListFilter,
  MoreHorizontal,
  PencilIcon,
  Plus,
  TrashIcon,
} from 'lucide-react';

interface BusyItem {
  cloudbeds_room_id?: string;
  room_number?: string;
  qty?: number;
  taken_at?: string;
  task_id?: string;
}

interface InventoryItem {
  id: string;
  hotel_id: string;
  name: string;
  description: string | null;
  total_qty: number;
  available_qty: number;
  busy_qty: number;
  reorder_threshold: number;
  is_active: boolean;
  busy_items?: BusyItem[];
}

const dashedFilterBtn =
  'h-9 rounded-lg border border-dashed text-muted-foreground hover:text-foreground';

function getInventoryColumnWidthClass(columnId: string): string {
  if (columnId === 'select') return 'w-10';
  if (columnId === 'name') return 'w-[26%]';
  if (columnId === 'stock') return 'w-36';
  if (columnId === 'busy_rooms') return 'w-[32%]';
  if (columnId === 'status') return 'w-40';
  if (columnId === 'actions') return 'w-24';
  return '';
}

export default function AdminInventoryPage() {
  const { user, loading: authLoading } = useAuth();
  const { role: currentRole, loading: roleLoading } = useUserRole();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'busy'>('all');

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    total_qty: '0',
    reorder_threshold: '5',
  });

  const [editItem, setEditItem] = useState({
    name: '',
    description: '',
    reorder_threshold: '5',
  });

  const isExplicitNonAdmin = currentRole !== null && currentRole !== 'admin';

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (!authLoading && !roleLoading && isExplicitNonAdmin) {
      router.push('/dashboard');
    }
  }, [authLoading, roleLoading, user, isExplicitNonAdmin, router]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/inventory', {
        method: 'GET',
        cache: 'no-store',
      });

      const data = (await response.json()) as {
        items?: InventoryItem[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo cargar inventario');
      }

      setItems(data.items || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.warning('No se pudo cargar inventario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && currentRole === 'admin') {
      void fetchInventory();
    }
  }, [user, currentRole]);

  const runAction = async (
    item: InventoryItem,
    action: 'toggle' | 'adjust' | 'delete',
    delta?: number
  ) => {
    const response = await fetch('/api/admin/inventory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: item.id,
        action,
        is_active: action === 'toggle' ? !item.is_active : undefined,
        delta,
      }),
    });

    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(data.error || 'No se pudo ejecutar la accion');
    }
  };

  const handleAction = async (
    item: InventoryItem,
    action: 'toggle' | 'adjust' | 'delete',
    delta?: number
  ) => {
    try {
      await runAction(item, action, delta);
      await fetchInventory();
      toast.success('Accion aplicada');
    } catch (error) {
      toast.warning(error instanceof Error ? error.message : 'No se pudo ejecutar la accion');
    }
  };

  const handleCreate = async () => {
    if (!newItem.name.trim()) {
      toast.warning('Nombre es obligatorio');
      return;
    }

    const total = Number(newItem.total_qty);
    const threshold = Number(newItem.reorder_threshold);

    if (!Number.isFinite(total) || total < 0 || !Number.isFinite(threshold) || threshold < 0) {
      toast.warning('Cantidad y umbral deben ser validos');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItem.name.trim(),
          description: newItem.description.trim() || null,
          total_qty: total,
          reorder_threshold: threshold,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo crear item');
      }

      setCreateOpen(false);
      setNewItem({
        name: '',
        description: '',
        total_qty: '0',
        reorder_threshold: '5',
      });
      await fetchInventory();
      toast.success('Item creado');
    } catch (error) {
      toast.warning(error instanceof Error ? error.message : 'No se pudo crear item');
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (item: InventoryItem) => {
    setEditingItem(item);
    setEditItem({
      name: item.name,
      description: item.description || '',
      reorder_threshold: String(item.reorder_threshold),
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingItem) {
      return;
    }

    const threshold = Number(editItem.reorder_threshold);
    if (!editItem.name.trim() || !Number.isFinite(threshold) || threshold < 0) {
      toast.warning('Campos invalidos para editar');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          action: 'edit',
          name: editItem.name.trim(),
          description: editItem.description.trim() || null,
          reorder_threshold: threshold,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo editar item');
      }

      setEditOpen(false);
      setEditingItem(null);
      await fetchInventory();
      toast.success('Item actualizado');
    } catch (error) {
      toast.warning(error instanceof Error ? error.message : 'No se pudo editar item');
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        q.length === 0 ||
        item.name.toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? item.is_active : !item.is_active);
      const isLow = item.available_qty < item.reorder_threshold;
      const hasBusy = (item.busy_qty || 0) > 0;
      const matchesStock = stockFilter === 'all' || (stockFilter === 'low' ? isLow : hasBusy);
      return matchesSearch && matchesStatus && matchesStock;
    });
  }, [items, search, statusFilter, stockFilter]);

  const columns: ColumnDef<InventoryItem>[] = [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Seleccionar pagina"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Seleccionar fila"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'name',
        header: 'Item',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="space-y-1">
              <p className="font-medium">{item.name}</p>
              <p className="max-w-[360px] truncate text-xs text-muted-foreground">
                {item.description || 'Sin descripcion'}
              </p>
            </div>
          );
        },
      },
      {
        id: 'stock',
        header: 'Stock',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="space-y-0.5 text-sm">
              <p className="tabular-nums">Total {item.total_qty}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                Disp. {item.available_qty} · Busy {item.busy_qty}
              </p>
            </div>
          );
        },
      },
      {
        id: 'busy_rooms',
        header: 'Busy por cuarto',
        cell: ({ row }) => {
          const item = row.original;
          const busyItems = Array.isArray(item.busy_items) ? item.busy_items : [];

          if (busyItems.length === 0) {
            return <span className="text-xs text-muted-foreground">Sin items ocupados</span>;
          }

          return (
            <div className="space-y-1 text-xs">
              {busyItems.slice(0, 3).map((busy, index) => (
                <p key={`${item.id}-busy-${index}`}>
                  Hab {busy.room_number || busy.cloudbeds_room_id || '-'} · Qty {busy.qty || 0}
                </p>
              ))}
              {busyItems.length > 3 ? (
                <p className="text-muted-foreground">+{busyItems.length - 3} mas</p>
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => {
          const item = row.original;
          const hasLowStock = item.available_qty < item.reorder_threshold;
          return (
            <div className="flex flex-wrap gap-1">
              <Badge variant={item.is_active ? 'default' : 'outline'}>
                {item.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
              {hasLowStock ? <Badge variant="destructive">Stock bajo</Badge> : null}
            </div>
          );
        },
      },
      {
        id: 'actions',
        enableHiding: false,
        header: () => <div className="text-right">Acciones</div>,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => openEditDialog(item)}>
                      <PencilIcon className="h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void handleAction(item, 'toggle')}>
                      {item.is_active ? 'Desactivar' : 'Activar'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void handleAction(item, 'adjust', 1)}>
                      +1 stock
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void handleAction(item, 'adjust', -1)}>
                      -1 stock
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => void handleAction(item, 'delete')}
                  >
                    <TrashIcon className="h-4 w-4" /> Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ];

  const table = useReactTable({
    data: filteredItems,
    columns,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const selectedItems = table.getSelectedRowModel().rows.map((row) => row.original);

  const runBulk = async (
    action: 'activate' | 'deactivate' | 'delete' | 'plus1' | 'minus1'
  ) => {
    if (selectedItems.length === 0) {
      return;
    }

    setSaving(true);
    try {
      for (const item of selectedItems) {
        if (action === 'activate' && !item.is_active) {
          await runAction(item, 'toggle');
        }
        if (action === 'deactivate' && item.is_active) {
          await runAction(item, 'toggle');
        }
        if (action === 'delete') {
          await runAction(item, 'delete');
        }
        if (action === 'plus1') {
          await runAction(item, 'adjust', 1);
        }
        if (action === 'minus1') {
          await runAction(item, 'adjust', -1);
        }
      }

      setRowSelection({});
      await fetchInventory();
      toast.success('Accion masiva aplicada');
    } catch (error) {
      toast.warning(error instanceof Error ? error.message : 'No se pudo aplicar accion masiva');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || roleLoading || loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Skeleton className="h-8 w-52" />
          </header>
          <div className="flex-1 p-4">
            <Skeleton className="h-80 w-full" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const selectedCount = selectedItems.length;
  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 flex shrink-0 items-center justify-between gap-2 border-b bg-background p-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/admin/users">{ES.nav.admin}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{ES.nav.inventory}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Filter tasks..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  table.setPageIndex(0);
                }}
                className="max-w-sm"
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(dashedFilterBtn, statusFilter !== 'all' ? 'border-solid text-foreground' : '')}
                  >
                    <ListFilter className="h-4 w-4" />
                    {statusFilter === 'all' ? 'Status' : `Status: ${statusFilter === 'active' ? 'Activo' : 'Inactivo'}`}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Filtrar por estado</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter(value as 'all' | 'active' | 'inactive');
                      table.setPageIndex(0);
                    }}
                  >
                    <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="active">Activos</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="inactive">Inactivos</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(dashedFilterBtn, stockFilter !== 'all' ? 'border-solid text-foreground' : '')}
                  >
                    <Plus className="h-4 w-4" />
                    {stockFilter === 'all'
                      ? 'Stock'
                      : stockFilter === 'low'
                        ? 'Stock bajo'
                        : 'Con busy'}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Filtrar por stock</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={stockFilter}
                    onValueChange={(value) => {
                      setStockFilter(value as 'all' | 'low' | 'busy');
                      table.setPageIndex(0);
                    }}
                  >
                    <DropdownMenuRadioItem value="all">Todo stock</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="low">Stock bajo</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="busy">Con items ocupados</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="ml-auto flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9">
                      <LayoutGrid className="h-4 w-4" /> View
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

                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                    <Button className="h-9">Agregar item</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nuevo item de inventario</DialogTitle>
                      <DialogDescription>
                        Agrega un item y su umbral de reposicion.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label>Nombre</Label>
                        <Input
                          value={newItem.name}
                          onChange={(e) => setNewItem((prev) => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Descripcion</Label>
                        <Input
                          value={newItem.description}
                          onChange={(e) =>
                            setNewItem((prev) => ({ ...prev, description: e.target.value }))
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min="0"
                          placeholder="Total"
                          value={newItem.total_qty}
                          onChange={(e) =>
                            setNewItem((prev) => ({ ...prev, total_qty: e.target.value }))
                          }
                        />
                        <Input
                          type="number"
                          min="0"
                          placeholder="Umbral"
                          value={newItem.reorder_threshold}
                          onChange={(e) =>
                            setNewItem((prev) => ({ ...prev, reorder_threshold: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCreateOpen(false)}>
                        Cancelar
                      </Button>
                      <Button disabled={saving} onClick={() => void handleCreate()}>
                        {saving ? 'Guardando...' : 'Guardar'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div
              className={cn(
                'fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-fit -translate-x-1/2 flex-wrap items-center gap-2 rounded-xl border bg-background/95 p-2 shadow-lg backdrop-blur transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                selectedCount > 0
                  ? 'translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-6 opacity-0'
              )}
            >
                <span className="text-sm text-muted-foreground">
                  {selectedCount} seleccionado(s)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => void runBulk('activate')}
                >
                  Activar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => void runBulk('deactivate')}
                >
                  Desactivar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => void runBulk('plus1')}
                >
                  +1 stock
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => void runBulk('minus1')}
                >
                  -1 stock
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={saving}
                  onClick={() => void runBulk('delete')}
                >
                  Eliminar
                </Button>
            </div>

            <div className="overflow-hidden rounded-xl bg-background">
              <Table className="table-fixed">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={getInventoryColumnWidthClass(header.column.id)}
                        >
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
                      <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              getInventoryColumnWidthClass(cell.column.id),
                              cell.column.id === 'actions' ? 'text-right' : ''
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                        Sin resultados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                {table.getFilteredRowModel().rows.length} item(s)
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Page {pageIndex + 1} of {Math.max(1, pageCount)}
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          table.previousPage();
                        }}
                        className={!table.getCanPreviousPage() ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(pageCount, 5) }).map((_, index) => (
                      <PaginationItem key={index}>
                        <PaginationLink
                          href="#"
                          isActive={pageIndex === index}
                          onClick={(e) => {
                            e.preventDefault();
                            table.setPageIndex(index);
                          }}
                        >
                          {index + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          table.nextPage();
                        }}
                        className={!table.getCanNextPage() ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          </div>
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar item</DialogTitle>
              <DialogDescription>Actualiza nombre, descripcion y umbral.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                value={editItem.name}
                onChange={(e) => setEditItem((prev) => ({ ...prev, name: e.target.value }))}
              />
              <Input
                value={editItem.description}
                onChange={(e) =>
                  setEditItem((prev) => ({ ...prev, description: e.target.value }))
                }
              />
              <Input
                type="number"
                min="0"
                value={editItem.reorder_threshold}
                onChange={(e) =>
                  setEditItem((prev) => ({ ...prev, reorder_threshold: e.target.value }))
                }
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button disabled={saving} onClick={() => void handleEdit()}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}

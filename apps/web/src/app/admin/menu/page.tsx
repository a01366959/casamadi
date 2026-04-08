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
import { Textarea } from '@/components/ui/textarea';
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
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
  Loader2,
  LayoutGrid,
  ListFilter,
  MoreHorizontal,
  PencilIcon,
  Plus,
  ShareIcon,
  TrashIcon,
  ImageIcon,
} from 'lucide-react';

interface MenuItem {
  id: string;
  hotel_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_mxn: number;
  section: 'desayuno' | 'comida_cena' | '24_7';
  prep_time_minutes: number;
  is_active: boolean;
  deactivated_until?: string | null;
}

const SECTION_LABEL: Record<MenuItem['section'], string> = {
  desayuno: 'Desayuno',
  comida_cena: 'Comida/Cena',
  '24_7': '24/7',
};

const dashedFilterBtn =
  'h-9 rounded-lg border border-dashed text-muted-foreground hover:text-foreground';

function getMenuColumnWidthClass(columnId: string): string {
  if (columnId === 'select') return 'w-10';
  if (columnId === 'image') return 'w-16';
  if (columnId === 'name') return 'w-[34%]';
  if (columnId === 'section') return 'w-32';
  if (columnId === 'price_mxn') return 'w-32';
  if (columnId === 'prep_time_minutes') return 'w-24';
  if (columnId === 'status') return 'w-40';
  if (columnId === 'actions') return 'w-24';
  return '';
}

export default function AdminMenuPage() {
  const { user, loading: authLoading } = useAuth();
  const { role: currentRole, loading: roleLoading } = useUserRole();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MenuItem[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sectionFilter, setSectionFilter] = useState<'all' | MenuItem['section']>('all');

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [rowUploadingImageId, setRowUploadingImageId] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    image_url: '',
    price_mxn: '',
    section: 'desayuno' as MenuItem['section'],
    prep_time_minutes: '15',
  });

  const [editItem, setEditItem] = useState({
    name: '',
    description: '',
    image_url: '',
    price_mxn: '',
    section: 'desayuno' as MenuItem['section'],
    prep_time_minutes: '15',
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

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/menu', {
        method: 'GET',
        cache: 'no-store',
      });

      const data = (await response.json()) as {
        items?: MenuItem[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron cargar los items del menu');
      }

      setItems(data.items || []);
    } catch (error) {
      console.error('Error fetching menu:', error);
      toast.warning('No se pudieron cargar los items del menu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && currentRole === 'admin') {
      void fetchMenu();
    }
  }, [user, currentRole]);

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/menu/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'No se pudo subir la imagen');
      }

      return data.url;
    } catch (error) {
      toast.warning(error instanceof Error ? error.message : 'Error subiendo imagen');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreate = async () => {
    if (!newItem.name.trim() || !newItem.price_mxn) {
      toast.warning('Nombre y precio son obligatorios');
      return;
    }

    const price = Number(newItem.price_mxn);
    const prep = Number(newItem.prep_time_minutes);

    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(prep) || prep <= 0) {
      toast.warning('Precio y tiempo de preparacion deben ser validos');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItem.name.trim(),
          description: newItem.description.trim() || null,
          image_url: newItem.image_url.trim() || null,
          price_mxn: price,
          section: newItem.section,
          prep_time_minutes: prep,
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
        image_url: '',
        price_mxn: '',
        section: 'desayuno',
        prep_time_minutes: '15',
      });
      await fetchMenu();
      toast.success('Item creado');
    } catch (error) {
      toast.warning(error instanceof Error ? error.message : 'No se pudo crear item');
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item);
    setEditItem({
      name: item.name,
      description: item.description || '',
      image_url: item.image_url || '',
      price_mxn: String(item.price_mxn),
      section: item.section,
      prep_time_minutes: String(item.prep_time_minutes),
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingItem) {
      return;
    }

    const price = Number(editItem.price_mxn);
    const prep = Number(editItem.prep_time_minutes);

    if (!editItem.name.trim() || !Number.isFinite(price) || !Number.isFinite(prep)) {
      toast.warning('Campos invalidos para editar');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          action: 'edit',
          name: editItem.name.trim(),
          description: editItem.description.trim() || null,
          image_url: editItem.image_url.trim() || null,
          price_mxn: price,
          section: editItem.section,
          prep_time_minutes: prep,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo editar item');
      }

      setEditOpen(false);
      setEditingItem(null);
      await fetchMenu();
      toast.success('Item actualizado');
    } catch (error) {
      toast.warning(error instanceof Error ? error.message : 'No se pudo editar item');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (
    item: MenuItem,
    action: 'toggle' | 'disable_week' | 'reactivate' | 'delete'
  ) => {
    const response = await fetch('/api/admin/menu', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: item.id,
        action,
        is_active: action === 'toggle' ? !item.is_active : undefined,
      }),
    });

    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(data.error || 'No se pudo ejecutar la accion');
    }
  };

  const handleAction = async (
    item: MenuItem,
    action: 'toggle' | 'disable_week' | 'reactivate' | 'delete'
  ) => {
    try {
      await runAction(item, action);
      await fetchMenu();
      toast.success('Accion aplicada');
    } catch (error) {
      toast.warning(error instanceof Error ? error.message : 'No se pudo ejecutar la accion');
    }
  };

  const handleInlineImageUpload = async (item: MenuItem, file: File) => {
    setRowUploadingImageId(item.id);
    try {
      const uploadedUrl = await uploadImage(file);
      if (!uploadedUrl) {
        return;
      }

      const response = await fetch('/api/admin/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          action: 'edit',
          image_url: uploadedUrl,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo guardar la imagen');
      }

      await fetchMenu();
      toast.success('Imagen actualizada');
    } catch (error) {
      toast.warning(error instanceof Error ? error.message : 'No se pudo actualizar imagen');
    } finally {
      setRowUploadingImageId(null);
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
      const matchesSection = sectionFilter === 'all' || item.section === sectionFilter;
      return matchesSearch && matchesStatus && matchesSection;
    });
  }, [items, search, statusFilter, sectionFilter]);

  const columns: ColumnDef<MenuItem>[] = [
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
        id: 'image',
        header: 'Imagen',
        cell: ({ row }) => {
          const item = row.original;
          const inputId = `menu-image-upload-${item.id}`;
          const isUploadingThisRow = rowUploadingImageId === item.id;

          if (!item.image_url) {
            return (
              <div className="flex items-center justify-center">
                <label
                  htmlFor={inputId}
                  className="flex size-10 cursor-pointer items-center justify-center rounded-md border border-dashed text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                  title="Subir imagen"
                >
                  {isUploadingThisRow ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                </label>
                <input
                  id={inputId}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isUploadingThisRow}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }
                    void handleInlineImageUpload(item, file);
                    event.currentTarget.value = '';
                  }}
                />
              </div>
            );
          }

          return (
            <div
              className="size-10 rounded-md bg-cover bg-center ring-1 ring-border"
              style={{ backgroundImage: `url(${item.image_url})` }}
              aria-label={`Imagen de ${item.name}`}
            />
          );
        },
      },
      {
        accessorKey: 'name',
        header: 'Nombre',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="space-y-1">
              <p className="font-medium">{item.name}</p>
              <p className="max-w-[400px] truncate text-xs text-muted-foreground">
                {item.description || 'Sin descripcion'}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: 'section',
        header: 'Seccion',
        cell: ({ row }) => {
          const item = row.original;
          return <Badge variant="outline">{SECTION_LABEL[item.section]}</Badge>;
        },
      },
      {
        accessorKey: 'price_mxn',
        header: 'Precio',
        cell: ({ row }) => {
          const item = row.original;
          return <span className="tabular-nums">${item.price_mxn.toFixed(0)} MXN</span>;
        },
      },
      {
        accessorKey: 'prep_time_minutes',
        header: 'Prep',
        cell: ({ row }) => {
          const item = row.original;
          return <span className="tabular-nums">{item.prep_time_minutes} min</span>;
        },
      },
      {
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex flex-wrap gap-1">
              <Badge variant={item.is_active ? 'default' : 'outline'}>
                {item.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
              {item.deactivated_until ? (
                <Badge variant="secondary">Hasta lunes</Badge>
              ) : null}
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
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => openEditDialog(item)}>
                      <PencilIcon className="h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void handleAction(item, 'toggle')}>
                      {item.is_active ? 'Desactivar' : 'Activar'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void handleAction(item, 'disable_week')}>
                      <ShareIcon className="h-4 w-4" /> Desactivar hasta lunes
                    </DropdownMenuItem>
                    {item.deactivated_until ? (
                      <DropdownMenuItem onClick={() => void handleAction(item, 'reactivate')}>
                        Reactivar hoy
                      </DropdownMenuItem>
                    ) : null}
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
    action: 'activate' | 'deactivate' | 'delete' | 'disable_week' | 'reactivate'
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
        if (action === 'disable_week') {
          await runAction(item, 'disable_week');
        }
        if (action === 'reactivate') {
          await runAction(item, 'reactivate');
        }
      }

      setRowSelection({});
      await fetchMenu();
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
                  <BreadcrumbPage>{ES.nav.menu}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Buscar por nombre o descripcion..."
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
                    className={cn(dashedFilterBtn, sectionFilter !== 'all' ? 'border-solid text-foreground' : '')}
                  >
                    <Plus className="h-4 w-4" />
                    {sectionFilter === 'all' ? 'Seccion' : SECTION_LABEL[sectionFilter]}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Filtrar por seccion</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={sectionFilter}
                    onValueChange={(value) => {
                      setSectionFilter(value as 'all' | MenuItem['section']);
                      table.setPageIndex(0);
                    }}
                  >
                    <DropdownMenuRadioItem value="all">Todas</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="desayuno">Desayuno</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="comida_cena">Comida/Cena</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="24_7">24/7</DropdownMenuRadioItem>
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
                      <DialogTitle>Nuevo item de menu</DialogTitle>
                      <DialogDescription>
                        Agrega una opcion y define disponibilidad.
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
                        <Textarea
                          rows={3}
                          value={newItem.description}
                          onChange={(e) =>
                            setNewItem((prev) => ({ ...prev, description: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Imagen (URL)</Label>
                        <Input
                          value={newItem.image_url}
                          onChange={(e) =>
                            setNewItem((prev) => ({ ...prev, image_url: e.target.value }))
                          }
                          placeholder="https://..."
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) {
                                return;
                              }
                              const uploaded = await uploadImage(file);
                              if (uploaded) {
                                setNewItem((prev) => ({ ...prev, image_url: uploaded }));
                                toast.success('Imagen subida');
                              }
                              e.currentTarget.value = '';
                            }}
                          />
                          <Button type="button" variant="outline" disabled={uploadingImage}>
                            {uploadingImage ? 'Subiendo...' : 'Subir'}
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          type="number"
                          placeholder="Precio MXN"
                          value={newItem.price_mxn}
                          onChange={(e) =>
                            setNewItem((prev) => ({ ...prev, price_mxn: e.target.value }))
                          }
                        />
                        <Input
                          type="number"
                          placeholder="Prep (min)"
                          value={newItem.prep_time_minutes}
                          onChange={(e) =>
                            setNewItem((prev) => ({ ...prev, prep_time_minutes: e.target.value }))
                          }
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="justify-between">
                              {SECTION_LABEL[newItem.section]}
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() =>
                                setNewItem((prev) => ({ ...prev, section: 'desayuno' }))
                              }
                            >
                              Desayuno
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setNewItem((prev) => ({ ...prev, section: 'comida_cena' }))
                              }
                            >
                              Comida/Cena
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setNewItem((prev) => ({ ...prev, section: '24_7' }))}
                            >
                              24/7
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                  onClick={() => void runBulk('disable_week')}
                >
                  Desactivar hasta lunes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => void runBulk('reactivate')}
                >
                  Reactivar
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
                          className={getMenuColumnWidthClass(header.column.id)}
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
                    table.getRowModel().rows.map((row) => {
                      const item = row.original;
                      return (
                        <ContextMenu key={row.id}>
                          <ContextMenuTrigger asChild>
                            <TableRow data-state={row.getIsSelected() && 'selected'}>
                              {row.getVisibleCells().map((cell) => (
                                <TableCell
                                  key={cell.id}
                                  className={cn(
                                    getMenuColumnWidthClass(cell.column.id),
                                    cell.column.id === 'actions' ? 'text-right' : ''
                                  )}
                                >
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                              ))}
                            </TableRow>
                          </ContextMenuTrigger>
                          <ContextMenuContent className="w-52">
                            <ContextMenuLabel>{item.name}</ContextMenuLabel>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={() => openEditDialog(item)}>
                              Editar
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => void handleAction(item, 'toggle')}>
                              {item.is_active ? 'Desactivar' : 'Activar'}
                            </ContextMenuItem>
                            <ContextMenuItem
                              onClick={() => void handleAction(item, 'disable_week')}
                            >
                              Desactivar hasta lunes
                            </ContextMenuItem>
                            {item.deactivated_until ? (
                              <ContextMenuItem
                                onClick={() => void handleAction(item, 'reactivate')}
                              >
                                Reactivar hoy
                              </ContextMenuItem>
                            ) : null}
                            <ContextMenuSeparator />
                            <ContextMenuItem
                              variant="destructive"
                              onClick={() => void handleAction(item, 'delete')}
                            >
                              Eliminar
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    })
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
              <DialogDescription>Actualiza la informacion del item de menu.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                value={editItem.name}
                onChange={(e) => setEditItem((prev) => ({ ...prev, name: e.target.value }))}
              />
              <Textarea
                rows={3}
                value={editItem.description}
                onChange={(e) =>
                  setEditItem((prev) => ({ ...prev, description: e.target.value }))
                }
              />
              <Input
                value={editItem.image_url}
                onChange={(e) =>
                  setEditItem((prev) => ({ ...prev, image_url: e.target.value }))
                }
                placeholder="https://..."
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={editItem.price_mxn}
                  onChange={(e) =>
                    setEditItem((prev) => ({ ...prev, price_mxn: e.target.value }))
                  }
                />
                <Input
                  type="number"
                  value={editItem.prep_time_minutes}
                  onChange={(e) =>
                    setEditItem((prev) => ({ ...prev, prep_time_minutes: e.target.value }))
                  }
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="justify-between">
                    {SECTION_LABEL[editItem.section]}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => setEditItem((prev) => ({ ...prev, section: 'desayuno' }))}
                  >
                    Desayuno
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      setEditItem((prev) => ({ ...prev, section: 'comida_cena' }))
                    }
                  >
                    Comida/Cena
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setEditItem((prev) => ({ ...prev, section: '24_7' }))}
                  >
                    24/7
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

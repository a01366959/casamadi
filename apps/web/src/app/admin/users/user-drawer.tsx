'use client';

import { useEffect, useState } from 'react';
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import {
  FieldLabel,
} from '@/components/ui/field';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { ES } from '@/lib/spanish';
import { StaffUser } from './columns';
import { createStaffUser, updateStaffUserRole } from './actions';

interface UserDrawerProps {
  trigger?: React.ReactNode | null;
  onUserSaved?: () => void;
  editingUser?: StaffUser | null;
}

const ROLES: StaffUser['role'][] = ['admin', 'manager', 'front_desk', 'room_service', 'housekeeping'];

const AVAILABLE_TASKS = [
  'taskCheckAvailability',
  'taskManageReservations',
  'taskProcessPayments',
  'taskManageOrders',
  'taskHandleEscalations',
  'taskAnswerInquiries',
  'taskCheckIn',
  'taskCheckOut',
  'taskManageHousekeeping',
] as const;

export function UserDrawer({
  trigger,
  onUserSaved,
  editingUser,
}: UserDrawerProps) {
  const isMobile = useIsMobile();
  const anchor = useComboboxAnchor();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [role, setRole] = useState<StaffUser['role']>('front_desk');
  const [tasks, setTasks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingUser) {
      setEmail(editingUser.email);
      setFirstName(editingUser.first_name || '');
      setLastName(editingUser.last_name || '');
      setPhone(editingUser.phone || '');
      setPosition(editingUser.position || '');
      setRole(editingUser.role);
      setTasks(editingUser.tasks || []);
      setOpen(true);
    }
  }, [editingUser]);

  const handleSave = async () => {
    if (!email || !role) {
      toast.warning(ES.users.fillAllFields);
      return;
    }

    setLoading(true);

    try {
      if (editingUser) {
        // Update existing user role and profile
        await updateStaffUserRole(editingUser.id, role, firstName, lastName, phone, position, tasks);
        toast.success(ES.users.userUpdatedSuccess);
      } else {
        // Create new user - password generated server-side
        await createStaffUser(email, role, firstName, lastName, phone, position, tasks);
        toast.success(ES.users.userCreatedSuccess);
      }

      // Reset form
      setEmail('');
      setFirstName('');
      setLastName('');
      setPhone('');
      setPosition('');
      setRole('front_desk');
      setTasks([]);
      setOpen(false);

      onUserSaved?.();
    } catch (err) {
      console.error('Error saving user:', err);
      const errorMessage = (err as any)?.message || (err as any)?.error_description || ES.users.errorSavingUser;
      toast.warning(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <div className="space-y-3">
      {/* Email */}
      <div className="space-y-1.5">
        <FieldLabel htmlFor="email">{ES.auth.email}</FieldLabel>
        <Input
          id="email"
          type="email"
          placeholder="usuario@hotel.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={editingUser ? true : false}
          autoComplete="off"
          className="h-9"
        />
      </div>

      {/* First Name & Last Name */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="firstName">{ES.users.firstName}</FieldLabel>
          <Input
            id="firstName"
            type="text"
            placeholder="Juan"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="lastName">{ES.users.lastName}</FieldLabel>
          <Input
            id="lastName"
            type="text"
            placeholder="García"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      {/* Phone & Position */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="phone">{ES.users.phone}</FieldLabel>
          <Input
            id="phone"
            type="tel"
            placeholder="+52 (123) 456-7890"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="position">{ES.users.position}</FieldLabel>
          <Input
            id="position"
            type="text"
            placeholder="Gerente"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      {/* Role */}
      <div className="space-y-1.5">
        <FieldLabel htmlFor="role">{ES.users.role}</FieldLabel>
        <Select value={role} onValueChange={(v) => setRole(v as StaffUser['role'])}>
          <SelectTrigger id="role" className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="admin">{ES.users.roleAdmin}</SelectItem>
              <SelectItem value="manager">{ES.users.roleManager}</SelectItem>
              <SelectItem value="front_desk">{ES.users.roleFrontDesk}</SelectItem>
              <SelectItem value="room_service">{ES.users.roleRoomService}</SelectItem>
              <SelectItem value="housekeeping">{ES.users.roleHousekeeping}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks */}
      <div className="space-y-1.5">
        <FieldLabel>{ES.users.tasks}</FieldLabel>
        <Combobox
          multiple
          autoHighlight
          items={AVAILABLE_TASKS}
          value={tasks}
          onValueChange={setTasks}
        >
          <ComboboxChips ref={anchor} className="w-full">
            <ComboboxValue>
              {(values) => (
                <React.Fragment>
                  {values.map((value: string) => (
                    <ComboboxChip key={value}>
                      {ES.users[value as keyof typeof ES.users] || value}
                    </ComboboxChip>
                  ))}
                  <ComboboxChipsInput placeholder="Tareas..." />
                </React.Fragment>
              )}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxContent anchor={anchor}>
            <ComboboxEmpty>Sin coincidencias</ComboboxEmpty>
            <ComboboxList>
              {(item) => (
                <ComboboxItem key={item} value={item}>
                  {ES.users[item as keyof typeof ES.users] || item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
    </div>
  );

  // Desktop: Dialog
  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {trigger !== null && (
          <DialogTrigger asChild>
            {trigger || <Button>{ES.users.addUser}</Button>}
          </DialogTrigger>
        )}
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? ES.users.editUser : ES.users.addUser}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? ES.users.editUserDesc : ES.users.addUserDesc}
            </DialogDescription>
          </DialogHeader>
          {formContent}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} size="sm">
              {ES.common.cancel}
            </Button>
            <Button onClick={handleSave} disabled={loading} size="sm">
              {loading ? ES.common.saving : ES.common.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Mobile: Drawer
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {trigger !== null && (
        <DrawerTrigger asChild>
          {trigger || <Button>{ES.users.addUser}</Button>}
        </DrawerTrigger>
      )}
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>
            {editingUser ? ES.users.editUser : ES.users.addUser}
          </DrawerTitle>
          <DrawerDescription>
            {editingUser ? ES.users.editUserDesc : ES.users.addUserDesc}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4">{formContent}</div>
        <DrawerFooter className="pt-2">
          <Button onClick={handleSave} disabled={loading} size="sm">
            {loading ? ES.common.saving : ES.common.save}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" size="sm">{ES.common.cancel}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

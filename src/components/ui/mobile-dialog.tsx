'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const MobileDialog = DialogPrimitive.Root;
const MobileDialogClose = DialogPrimitive.Close;

const MobileDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
MobileDialogOverlay.displayName = 'MobileDialogOverlay';

type MobileDialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  position?: 'bottom' | 'center';
};

const MobileDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  MobileDialogContentProps
>(({ className, children, position = 'bottom', ...props }, ref) => (
  <DialogPrimitive.Portal>
    <MobileDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 flex flex-col bg-[#FDF8F2] shadow-2xl',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'duration-300 ease-out',
        position === 'bottom'
          ? 'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-3xl data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom'
          : 'left-1/2 top-1/2 max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        // Desktop: centered modal (same for both)
        'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-full sm:max-w-2xl',
        'sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl',
        className
      )}
      {...props}
    >
      {/* Drag handle — bottom sheet only */}
      {position === 'bottom' && (
        <div className="mx-auto mb-1 mt-3 h-1 w-10 shrink-0 rounded-full bg-[#D4C9B8] sm:hidden" />
      )}
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1.5 text-[#9C8B7A] opacity-80 transition-opacity hover:opacity-100">
        <X size={18} />
        <span className="sr-only">Cerrar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
MobileDialogContent.displayName = 'MobileDialogContent';

const MobileDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('shrink-0 px-5 pb-3 pt-2', className)} {...props} />
);
MobileDialogHeader.displayName = 'MobileDialogHeader';

const MobileDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-bold text-[#2C2416]', className)}
    {...props}
  />
));
MobileDialogTitle.displayName = 'MobileDialogTitle';

const MobileDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'shrink-0 border-t border-[#E8E0D0] px-5 py-4',
      className
    )}
    {...props}
  />
);
MobileDialogFooter.displayName = 'MobileDialogFooter';

export {
  MobileDialog,
  MobileDialogClose,
  MobileDialogContent,
  MobileDialogHeader,
  MobileDialogTitle,
  MobileDialogFooter,
};

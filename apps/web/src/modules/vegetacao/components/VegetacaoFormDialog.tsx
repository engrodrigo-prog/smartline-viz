import type { ReactNode } from "react";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type VegetacaoFormDialogProps = {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function VegetacaoFormDialog({
  title,
  description,
  children,
  footer,
  className,
  bodyClassName,
}: VegetacaoFormDialogProps) {
  return (
    <DialogContent
      className={cn(
        "flex h-[min(92vh,980px)] w-[calc(100vw-1rem)] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-3rem)]",
        className,
      )}
    >
      <DialogHeader className="shrink-0 border-b bg-background px-4 py-4 pr-12 text-left sm:px-6">
        <DialogTitle className="text-base leading-tight sm:text-lg">{title}</DialogTitle>
        {description ? <DialogDescription className="mt-1">{description}</DialogDescription> : null}
      </DialogHeader>

      <ScrollArea className="min-h-0 flex-1">
        <div className={cn("space-y-5 px-4 py-4 sm:px-6 sm:py-5", bodyClassName)}>{children}</div>
      </ScrollArea>

      {footer ? (
        <div className="shrink-0 border-t bg-background/95 px-4 py-3 pr-12 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:px-6">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">{footer}</div>
        </div>
      ) : null}
    </DialogContent>
  );
}

export function VegetacaoFormSection({
  title,
  description,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-muted/20 p-4 sm:p-5", className)}>
      {title || description ? (
        <div className="mb-4 space-y-1">
          {title ? <h3 className="text-sm font-semibold text-foreground sm:text-base">{title}</h3> : null}
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
